package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	wsEndpointPath   = "/v1/extension/ws"
	wsSubprotocol    = "kairos.v2"
	wsAuthPrefix     = "kairos.auth."
	wsProtocolVersion = 2
	wsTypeHandshake  = "handshake.request"
	wsTypeIngest     = "ingest.request"
	wsRespHandshake  = "handshake.response"
	wsRespIngest     = "ingest.response"
	wsRespError      = "error"
	requestTimeout   = 5 * time.Second
)

type wsEnvelope struct {
	ID              string          `json:"id"`
	ProtocolVersion int             `json:"protocolVersion"`
	Type            string          `json:"type"`
	Payload         json.RawMessage `json:"payload"`
}

type wsResponse struct {
	ID      string          `json:"id,omitempty"`
	Type    string          `json:"type,omitempty"`
	Payload json.RawMessage `json:"payload,omitempty"`
	Error   *wsError        `json:"error,omitempty"`
}

type wsError struct {
	Code    string `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
}

type handshakePayload struct {
	Machine   machineInfo   `json:"machine"`
	Extension extensionInfo `json:"extension"`
}

type machineInfo struct {
	MachineID   string `json:"machineId"`
	MachineName string `json:"machineName"`
	OSPlatform  string `json:"osPlatform"`
}

type extensionInfo struct {
	Editor           string `json:"editor"`
	EditorVersion    string `json:"editorVersion,omitempty"`
	ExtensionVersion string `json:"extensionVersion,omitempty"`
}

type ingestPayload struct {
	Machine   machineInfo       `json:"machine"`
	Extension extensionInfo     `json:"extension"`
	Events    []json.RawMessage `json:"events"`
}

type wsClient struct {
	identity *identity
	mu       sync.Mutex
	conn     *websocket.Conn
}

func newWSClient(id *identity) *wsClient {
	return &wsClient{identity: id}
}

// Connect tries each discovery candidate until one succeeds. The provided
// context controls the overall deadline (typically 3 s for short-lived use).
func (c *wsClient) Connect(ctx context.Context) error {
	candidates := buildCandidates()
	var lastErr error
	for _, ep := range candidates {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err := c.tryConnect(ctx, ep); err == nil {
			return nil
		} else {
			lastErr = err
		}
	}
	if lastErr != nil {
		return lastErr
	}
	return fmt.Errorf("no reachable Kairos Desktop found across %d candidates", len(candidates))
}

func (c *wsClient) tryConnect(ctx context.Context, ep endpointCandidate) error {
	wsURL := strings.Replace(ep.BaseURL, "http://", "ws://", 1)
	wsURL = strings.Replace(wsURL, "https://", "wss://", 1)
	wsURL += wsEndpointPath

	protocols := []string{wsSubprotocol}
	if ep.Token != "" {
		encoded := base64.RawURLEncoding.EncodeToString([]byte(ep.Token))
		protocols = append(protocols, wsAuthPrefix+encoded)
	}

	dialer := websocket.Dialer{
		HandshakeTimeout: 2 * time.Second,
		Subprotocols:     protocols,
	}
	conn, _, err := dialer.DialContext(ctx, wsURL, http.Header{})
	if err != nil {
		return err
	}
	if err := c.handshake(ctx, conn); err != nil {
		conn.Close()
		return fmt.Errorf("handshake: %w", err)
	}
	c.mu.Lock()
	c.conn = conn
	c.mu.Unlock()
	return nil
}

func (c *wsClient) handshake(ctx context.Context, conn *websocket.Conn) error {
	payload := handshakePayload{
		Machine: machineInfo{
			MachineID:   c.identity.MachineID,
			MachineName: c.identity.MachineName,
			OSPlatform:  runtime.GOOS,
		},
		Extension: extensionInfo{
			Editor:           editorKind,
			EditorVersion:    editorVersion,
			ExtensionVersion: version,
		},
	}
	raw, _ := json.Marshal(payload)
	env := wsEnvelope{
		ID:              uuid.New().String(),
		ProtocolVersion: wsProtocolVersion,
		Type:            wsTypeHandshake,
		Payload:         raw,
	}
	msg, _ := json.Marshal(env)

	_ = conn.SetWriteDeadline(time.Now().Add(requestTimeout))
	if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
		return err
	}
	_ = conn.SetReadDeadline(time.Now().Add(requestTimeout))
	_, reply, err := conn.ReadMessage()
	_ = conn.SetReadDeadline(time.Time{})
	_ = conn.SetWriteDeadline(time.Time{})
	if err != nil {
		return err
	}
	var resp wsResponse
	if err := json.Unmarshal(reply, &resp); err != nil {
		return err
	}
	if resp.Type == wsRespError {
		code := ""
		if resp.Error != nil {
			code = resp.Error.Code + ": " + resp.Error.Message
		}
		return fmt.Errorf("rejected: %s", code)
	}
	if resp.Type != wsRespHandshake {
		return fmt.Errorf("unexpected response type %q", resp.Type)
	}
	return nil
}

// Send wraps a single raw event in an ingest.request and writes it.
// It does NOT wait for a response — fire-and-forget is sufficient for
// short-lived invocations where the desktop accepts every valid event.
func (c *wsClient) Send(ctx context.Context, event json.RawMessage) error {
	c.mu.Lock()
	conn := c.conn
	c.mu.Unlock()
	if conn == nil {
		return fmt.Errorf("not connected")
	}

	payload := ingestPayload{
		Machine: machineInfo{
			MachineID:   c.identity.MachineID,
			MachineName: c.identity.MachineName,
			OSPlatform:  runtime.GOOS,
		},
		Extension: extensionInfo{
			Editor:           editorKind,
			EditorVersion:    editorVersion,
			ExtensionVersion: version,
		},
		Events: []json.RawMessage{event},
	}
	raw, _ := json.Marshal(payload)
	env := wsEnvelope{
		ID:              uuid.New().String(),
		ProtocolVersion: wsProtocolVersion,
		Type:            wsTypeIngest,
		Payload:         raw,
	}
	msg, _ := json.Marshal(env)

	_ = conn.SetWriteDeadline(time.Now().Add(requestTimeout))
	err := conn.WriteMessage(websocket.TextMessage, msg)
	_ = conn.SetWriteDeadline(time.Time{})
	return err
}

// Disconnect closes the WebSocket connection cleanly.
func (c *wsClient) Disconnect() {
	c.mu.Lock()
	conn := c.conn
	c.conn = nil
	c.mu.Unlock()
	if conn != nil {
		_ = conn.WriteMessage(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""),
		)
		conn.Close()
	}
}

// IsConnected reports whether a connection is open.
func (c *wsClient) IsConnected() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn != nil
}
