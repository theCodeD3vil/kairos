package server

import (
	"bytes"
	"context"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/ingestion"
)

type LocalServer struct {
	config   Config
	listener net.Listener
	server   *http.Server
}

func NewLocalServer(config Config, ingestionService ingestion.Service) (*LocalServer, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}

	handler := NewHandler(ingestionService, config)
	listener, err := net.Listen("tcp", config.Address())
	if err != nil {
		return nil, fmt.Errorf("listen on %s: %w", config.Address(), err)
	}

	httpServer := &http.Server{
		Handler: handler,
	}

	return &LocalServer{
		config:   config,
		listener: listener,
		server:   httpServer,
	}, nil
}

func (s *LocalServer) Start() {
	go func() {
		if err := s.server.Serve(s.listener); err != nil && err != http.ErrServerClosed {
			log.Printf("server: local extension server stopped unexpectedly: %v", err)
		}
	}()
}

func (s *LocalServer) Close(ctx context.Context) error {
	if s == nil || s.server == nil {
		return nil
	}
	return s.server.Shutdown(ctx)
}

func (s *LocalServer) Address() string {
	if s == nil || s.listener == nil {
		return ""
	}
	return s.listener.Addr().String()
}

type errorResponse struct {
	Error string `json:"error"`
}

const (
	extensionWebSocketPath    = "/v1/extension/ws"
	wsProtocolVersion         = 2
	wsRequestTypeHandshake    = "handshake.request"
	wsRequestTypeIngest       = "ingest.request"
	wsResponseTypeHandshake   = "handshake.response"
	wsResponseTypeIngest      = "ingest.response"
	wsResponseTypeError       = "error"
	wsErrorCodeInvalidRequest = "invalid_request"
	wsErrorCodeInternal       = "internal_error"
	wsErrorCodeUnauthorized   = "unauthorized"
	wsErrorCodeProtocol       = "unsupported_protocol_version"
	wsErrorCodeHandshake      = "handshake_required"
	wsTransportSubprotocol    = "kairos.v2"
	wsBridgeTokenPrefix       = "kairos.auth."
	wsDisconnectTimeout       = 2 * time.Second
)

var (
	wsPingInterval        = 15 * time.Second
	wsPongWait            = 45 * time.Second
	wsControlWriteTimeout = 5 * time.Second
	wsKeepAliveSettingsMu sync.RWMutex
)

func webSocketKeepAliveSettings() (time.Duration, time.Duration, time.Duration) {
	wsKeepAliveSettingsMu.RLock()
	defer wsKeepAliveSettingsMu.RUnlock()
	return wsPingInterval, wsPongWait, wsControlWriteTimeout
}

func setWebSocketKeepAliveSettingsForTest(pingInterval time.Duration, pongWait time.Duration, controlWriteTimeout time.Duration) func() {
	wsKeepAliveSettingsMu.Lock()
	previousPingInterval := wsPingInterval
	previousPongWait := wsPongWait
	previousControlWriteTimeout := wsControlWriteTimeout
	wsPingInterval = pingInterval
	wsPongWait = pongWait
	wsControlWriteTimeout = controlWriteTimeout
	wsKeepAliveSettingsMu.Unlock()

	return func() {
		wsKeepAliveSettingsMu.Lock()
		wsPingInterval = previousPingInterval
		wsPongWait = previousPongWait
		wsControlWriteTimeout = previousControlWriteTimeout
		wsKeepAliveSettingsMu.Unlock()
	}
}

type wsRequestEnvelope struct {
	ID              string          `json:"id"`
	ProtocolVersion int             `json:"protocolVersion"`
	Type            string          `json:"type"`
	Payload         json.RawMessage `json:"payload,omitempty"`
}

type wsErrorPayload struct {
	Code    string `json:"code,omitempty"`
	Message string `json:"message"`
}

type wsResponseEnvelope struct {
	ID      string          `json:"id,omitempty"`
	Type    string          `json:"type"`
	Payload any             `json:"payload,omitempty"`
	Error   *wsErrorPayload `json:"error,omitempty"`
}

type extensionConnectionTracker struct {
	mu      sync.Mutex
	active  int
	service ingestion.Service
}

func newExtensionConnectionTracker(service ingestion.Service) *extensionConnectionTracker {
	return &extensionConnectionTracker{service: service}
}

func (t *extensionConnectionTracker) onConnect() {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.active++
}

func (t *extensionConnectionTracker) onDisconnect() {
	t.mu.Lock()
	if t.active > 0 {
		t.active--
	}
	shouldMarkDisconnected := t.active == 0
	t.mu.Unlock()

	if !shouldMarkDisconnected {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), wsDisconnectTimeout)
	defer cancel()
	if err := t.service.MarkExtensionDisconnected(ctx, "vscode"); err != nil {
		log.Printf("server: mark extension disconnected failed: %v", err)
	}
}

func (t *extensionConnectionTracker) activeConnections() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.active
}

func NewHandler(ingestionService ingestion.Service, config Config) http.Handler {
	mux := http.NewServeMux()
	connectionTracker := newExtensionConnectionTracker(ingestionService)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":            "ok",
			"transport":         "websocket",
			"protocolVersion":   wsProtocolVersion,
			"activeConnections": connectionTracker.activeConnections(),
		})
	})
	mux.HandleFunc(extensionWebSocketPath, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeJSON(w, http.StatusMethodNotAllowed, errorResponse{Error: fmt.Sprintf("unsupported method %q", r.Method)})
			return
		}
		if config.BridgeToken != "" {
			token, err := resolveBridgeToken(r)
			if err != nil || subtle.ConstantTimeCompare([]byte(token), []byte(config.BridgeToken)) != 1 {
				writeJSON(w, http.StatusUnauthorized, errorResponse{Error: wsErrorCodeUnauthorized})
				return
			}
		}

		upgrader := websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			Subprotocols:    []string{wsTransportSubprotocol},
			CheckOrigin: func(request *http.Request) bool {
				return isAllowedWebSocketOrigin(request.Header.Get("Origin"))
			},
		}
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("server: websocket upgrade failed: %v", err)
			return
		}
		_, pongWait, _ := webSocketKeepAliveSettings()
		conn.SetReadLimit(config.MaxRequestBodyBytes + 4096)
		_ = conn.SetReadDeadline(time.Now().Add(pongWait))
		conn.SetPongHandler(func(string) error {
			_, pongWaitForPong, _ := webSocketKeepAliveSettings()
			return conn.SetReadDeadline(time.Now().Add(pongWaitForPong))
		})
		pingDone := make(chan struct{})
		go runWebSocketKeepAlive(conn, pingDone)
		handshakeCompleted := false
		connectionCounted := false
		defer func() {
			close(pingDone)
			if connectionCounted {
				connectionTracker.onDisconnect()
			}
			_ = conn.Close()
		}()

		for {
			var envelope wsRequestEnvelope
			if err := conn.ReadJSON(&envelope); err != nil {
				break
			}
			_, pongWaitForRead, _ := webSocketKeepAliveSettings()
			_ = conn.SetReadDeadline(time.Now().Add(pongWaitForRead))
			if envelope.ProtocolVersion != wsProtocolVersion {
				writeWebSocketError(
					conn,
					envelope.ID,
					wsErrorCodeProtocol,
					fmt.Sprintf("unsupported protocol version %d", envelope.ProtocolVersion),
				)
				continue
			}

			if strings.TrimSpace(envelope.ID) == "" {
				writeWebSocketError(conn, "", wsErrorCodeInvalidRequest, "request id is required")
				continue
			}

			switch envelope.Type {
			case wsRequestTypeHandshake:
				var request contracts.ExtensionHandshakeRequest
				if err := decodeStrictRawJSON(envelope.Payload, &request); err != nil {
					writeWebSocketError(conn, envelope.ID, wsErrorCodeInvalidRequest, "invalid handshake payload")
					continue
				}
				response, err := ingestionService.HandshakeExtension(r.Context(), request)
				if err != nil {
					writeWebSocketServiceError(conn, envelope.ID, err)
					continue
				}
				if err := writeWebSocketEnvelope(conn, wsResponseEnvelope{ID: envelope.ID, Type: wsResponseTypeHandshake, Payload: response}); err != nil {
					break
				}
				handshakeCompleted = true
				if !connectionCounted {
					connectionTracker.onConnect()
					connectionCounted = true
				}
			case wsRequestTypeIngest:
				if !handshakeCompleted {
					writeWebSocketError(conn, envelope.ID, wsErrorCodeHandshake, "handshake request must complete before ingestion")
					continue
				}
				var request contracts.IngestEventsRequest
				if err := decodeStrictRawJSON(envelope.Payload, &request); err != nil {
					writeWebSocketError(conn, envelope.ID, wsErrorCodeInvalidRequest, "invalid ingestion payload")
					continue
				}
				response, err := ingestionService.IngestEvents(r.Context(), request)
				if err != nil {
					writeWebSocketServiceError(conn, envelope.ID, err)
					continue
				}
				if err := writeWebSocketEnvelope(conn, wsResponseEnvelope{ID: envelope.ID, Type: wsResponseTypeIngest, Payload: response}); err != nil {
					break
				}
			default:
				writeWebSocketError(conn, envelope.ID, wsErrorCodeInvalidRequest, fmt.Sprintf("unsupported request type %q", envelope.Type))
			}
		}
	})

	return mux
}

func writeServiceError(w http.ResponseWriter, err error) {
	var validationErr *ingestion.ValidationError
	if errors.As(err, &validationErr) {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: validationErr.Error()})
		return
	}

	writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal server error"})
}

func decodeJSONBody(w http.ResponseWriter, r *http.Request, limit int64, target any) error {
	defer r.Body.Close()
	reader := http.MaxBytesReader(w, r.Body, limit)
	decoder := json.NewDecoder(reader)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("invalid json body")
	}
	return nil
}

func decodeStrictRawJSON(payload json.RawMessage, target any) error {
	if len(payload) == 0 {
		return fmt.Errorf("missing payload")
	}

	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if decoder.More() {
		return fmt.Errorf("unexpected trailing data")
	}
	return nil
}

func writeWebSocketServiceError(conn *websocket.Conn, requestID string, err error) {
	var validationErr *ingestion.ValidationError
	if errors.As(err, &validationErr) {
		writeWebSocketError(conn, requestID, wsErrorCodeInvalidRequest, validationErr.Error())
		return
	}
	writeWebSocketError(conn, requestID, wsErrorCodeInternal, "internal server error")
}

func writeWebSocketError(conn *websocket.Conn, requestID string, code string, message string) {
	if err := writeWebSocketEnvelope(conn, wsResponseEnvelope{
		ID:   requestID,
		Type: wsResponseTypeError,
		Error: &wsErrorPayload{
			Code:    code,
			Message: message,
		},
	}); err != nil {
		log.Printf("server: websocket error response write failed: %v", err)
	}
}

func writeWebSocketEnvelope(conn *websocket.Conn, envelope wsResponseEnvelope) error {
	return conn.WriteJSON(envelope)
}

func runWebSocketKeepAlive(conn *websocket.Conn, done <-chan struct{}) {
	pingInterval, _, controlWriteTimeout := webSocketKeepAliveSettings()
	ticker := time.NewTicker(pingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			if err := conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(controlWriteTimeout)); err != nil {
				_ = conn.Close()
				return
			}
		}
	}
}

func resolveBridgeToken(r *http.Request) (string, error) {
	for _, protocol := range websocket.Subprotocols(r) {
		trimmed := strings.TrimSpace(protocol)
		if !strings.HasPrefix(trimmed, wsBridgeTokenPrefix) {
			continue
		}

		encoded := strings.TrimPrefix(trimmed, wsBridgeTokenPrefix)
		if strings.TrimSpace(encoded) == "" {
			break
		}

		decoded, err := base64.RawURLEncoding.DecodeString(encoded)
		if err != nil {
			return "", fmt.Errorf("invalid bridge token encoding")
		}
		return string(decoded), nil
	}

	return "", fmt.Errorf("missing bridge token")
}

func isAllowedWebSocketOrigin(origin string) bool {
	trimmed := strings.TrimSpace(origin)
	if trimmed == "" {
		return true
	}

	parsed, err := url.Parse(trimmed)
	if err != nil {
		return false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	return isLoopbackHost(parsed.Hostname())
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", jsonContentType)
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("server: encode json response failed: %v", err)
	}
}
