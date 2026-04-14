package server

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestLegacyHTTPIngestionEndpointsAreUnavailable(t *testing.T) {
	service := &stubIngestionService{
		handshakeResponse: contracts.ExtensionHandshakeResponse{
			DesktopInstanceID: "desktop-instance-1",
			ProtocolVersion:   2,
			Capabilities: contracts.ExtensionCapabilities{
				PerEventIngestionResults: true,
				SettingsSnapshotMirror:   true,
			},
			Limits: contracts.ExtensionProtocolLimits{
				MaxBatchEvents:  500,
				MaxRequestBytes: 1 << 20,
			},
			Settings: contracts.ExtensionEffectiveSettings{
				TrackingEnabled:          true,
				SendHeartbeatEvents:      true,
				HeartbeatIntervalSeconds: 30,
			},
			SettingsVersion:   "settings-hash",
			SettingsUpdatedAt: "2026-04-06T09:59:00Z",
			ServerTimestamp:   "2026-04-06T10:00:00Z",
		},
	}

	cases := []struct {
		method string
		path   string
	}{
		{method: http.MethodPost, path: "/v1/extension/handshake"},
		{method: http.MethodPost, path: "/v1/ingestion/events"},
		{method: http.MethodGet, path: "/v1/extension/handshake"},
		{method: http.MethodGet, path: "/v1/ingestion/events"},
	}

	for _, tc := range cases {
		request := httptest.NewRequest(tc.method, tc.path, nil)
		recorder := httptest.NewRecorder()

		NewHandler(service, DefaultConfig()).ServeHTTP(recorder, request)

		if recorder.Code != http.StatusNotFound {
			t.Fatalf("expected legacy endpoint %s %s to be unavailable with 404, got %d", tc.method, tc.path, recorder.Code)
		}
	}
}

func TestWebSocketEndpointSupportsHandshakeAndIngestRequests(t *testing.T) {
	service := &stubIngestionService{
		handshakeResponse: contracts.ExtensionHandshakeResponse{
			DesktopInstanceID: "desktop-instance-1",
			ProtocolVersion:   2,
			Capabilities: contracts.ExtensionCapabilities{
				PerEventIngestionResults: true,
				SettingsSnapshotMirror:   true,
			},
			Limits: contracts.ExtensionProtocolLimits{
				MaxBatchEvents:  500,
				MaxRequestBytes: 1 << 20,
			},
			Settings: contracts.ExtensionEffectiveSettings{
				TrackingEnabled: true,
			},
			SettingsVersion:   "settings-hash",
			SettingsUpdatedAt: "2026-04-06T09:59:00Z",
			ServerTimestamp:   "2026-04-06T10:00:00Z",
		},
		ingestResponse: contracts.IngestEventsResponse{
			AcceptedCount:   1,
			RejectedCount:   0,
			ServerTimestamp: "2026-04-06T10:00:01Z",
		},
	}

	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on loopback for websocket test: %v", err)
	}
	httpServer := &http.Server{
		Handler: NewHandler(service, DefaultConfig()),
	}
	go func() {
		_ = httpServer.Serve(listener)
	}()
	defer func() {
		_ = httpServer.Shutdown(context.Background())
	}()

	wsURL := "ws://" + listener.Addr().String() + extensionWebSocketPath
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}

	handshakePayload := contracts.ExtensionHandshakeRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos",
			OSPlatform:  "darwin",
		},
		Extension: contracts.ExtensionInfo{
			Editor: "vscode",
		},
	}
	if err := conn.WriteJSON(wsRequestEnvelope{
		ID:              "h-1",
		ProtocolVersion: wsProtocolVersion,
		Type:            wsRequestTypeHandshake,
		Payload:         mustMarshalRawJSON(t, handshakePayload),
	}); err != nil {
		t.Fatalf("write handshake request: %v", err)
	}

	var handshakeResponse wsResponseEnvelope
	if err := conn.ReadJSON(&handshakeResponse); err != nil {
		t.Fatalf("read handshake response: %v", err)
	}
	if handshakeResponse.Type != wsResponseTypeHandshake || handshakeResponse.ID != "h-1" {
		t.Fatalf("unexpected handshake response envelope: %+v", handshakeResponse)
	}
	if service.handshakeCallCount() != 1 {
		t.Fatalf("expected handshake call count 1, got %d", service.handshakeCallCount())
	}

	ingestPayload := contracts.IngestEventsRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos",
			OSPlatform:  "darwin",
		},
		Extension: contracts.ExtensionInfo{
			Editor: "vscode",
		},
		Events: []contracts.ActivityEvent{
			{
				ID:          "evt-1",
				Timestamp:   "2026-04-06T10:00:00Z",
				EventType:   "edit",
				MachineID:   "machine-1",
				WorkspaceID: "workspace-1",
				ProjectName: "kairos",
				Language:    "typescript",
			},
		},
	}
	if err := conn.WriteJSON(wsRequestEnvelope{
		ID:              "i-1",
		ProtocolVersion: wsProtocolVersion,
		Type:            wsRequestTypeIngest,
		Payload:         mustMarshalRawJSON(t, ingestPayload),
	}); err != nil {
		t.Fatalf("write ingestion request: %v", err)
	}

	var ingestResponse wsResponseEnvelope
	if err := conn.ReadJSON(&ingestResponse); err != nil {
		t.Fatalf("read ingestion response: %v", err)
	}
	if ingestResponse.Type != wsResponseTypeIngest || ingestResponse.ID != "i-1" {
		t.Fatalf("unexpected ingestion response envelope: %+v", ingestResponse)
	}

	if err := conn.Close(); err != nil {
		t.Fatalf("close websocket connection: %v", err)
	}

	deadline := time.Now().Add(2 * time.Second)
	for service.disconnectCalls() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if service.disconnectCalls() == 0 {
		t.Fatal("expected websocket close to mark extension disconnected")
	}
}

func TestWebSocketEndpointRequiresHandshakeBeforeIngest(t *testing.T) {
	service := &stubIngestionService{}

	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on loopback for websocket test: %v", err)
	}
	httpServer := &http.Server{
		Handler: NewHandler(service, DefaultConfig()),
	}
	go func() {
		_ = httpServer.Serve(listener)
	}()
	defer func() {
		_ = httpServer.Shutdown(context.Background())
	}()

	wsURL := "ws://" + listener.Addr().String() + extensionWebSocketPath
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close()

	ingestPayload := contracts.IngestEventsRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos",
			OSPlatform:  "darwin",
		},
		Extension: contracts.ExtensionInfo{Editor: "vscode"},
		Events: []contracts.ActivityEvent{{
			ID:          "evt-1",
			Timestamp:   "2026-04-06T10:00:00Z",
			EventType:   "edit",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "typescript",
		}},
	}

	if err := conn.WriteJSON(wsRequestEnvelope{
		ID:              "i-1",
		ProtocolVersion: wsProtocolVersion,
		Type:            wsRequestTypeIngest,
		Payload:         mustMarshalRawJSON(t, ingestPayload),
	}); err != nil {
		t.Fatalf("write ingestion request: %v", err)
	}

	var response wsResponseEnvelope
	if err := conn.ReadJSON(&response); err != nil {
		t.Fatalf("read websocket response: %v", err)
	}
	if response.Type != wsResponseTypeError {
		t.Fatalf("expected websocket error response, got %+v", response)
	}
	if response.Error == nil || response.Error.Code != wsErrorCodeHandshake {
		t.Fatalf("expected handshake-required error, got %+v", response.Error)
	}
}

func TestWebSocketEndpointMarksDisconnectedWhenClientStopsRespondingToPing(t *testing.T) {
	previousPingInterval := wsPingInterval
	previousPongWait := wsPongWait
	previousControlWriteTimeout := wsControlWriteTimeout
	wsPingInterval = 20 * time.Millisecond
	wsPongWait = 90 * time.Millisecond
	wsControlWriteTimeout = 20 * time.Millisecond
	t.Cleanup(func() {
		wsPingInterval = previousPingInterval
		wsPongWait = previousPongWait
		wsControlWriteTimeout = previousControlWriteTimeout
	})

	service := &stubIngestionService{
		handshakeResponse: contracts.ExtensionHandshakeResponse{
			DesktopInstanceID: "desktop-instance-1",
			ProtocolVersion:   wsProtocolVersion,
		},
	}

	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on loopback for websocket test: %v", err)
	}
	httpServer := &http.Server{
		Handler: NewHandler(service, DefaultConfig()),
	}
	go func() {
		_ = httpServer.Serve(listener)
	}()
	defer func() {
		_ = httpServer.Shutdown(context.Background())
	}()

	wsURL := "ws://" + listener.Addr().String() + extensionWebSocketPath
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close()

	conn.SetPingHandler(func(_ string) error {
		// Disable automatic pong responses so server keepalive can detect a dead peer.
		return nil
	})

	handshakePayload := contracts.ExtensionHandshakeRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos",
			OSPlatform:  "darwin",
		},
		Extension: contracts.ExtensionInfo{Editor: "vscode"},
	}
	if err := conn.WriteJSON(wsRequestEnvelope{
		ID:              "h-1",
		ProtocolVersion: wsProtocolVersion,
		Type:            wsRequestTypeHandshake,
		Payload:         mustMarshalRawJSON(t, handshakePayload),
	}); err != nil {
		t.Fatalf("write handshake request: %v", err)
	}

	var response wsResponseEnvelope
	if err := conn.ReadJSON(&response); err != nil {
		t.Fatalf("read handshake response: %v", err)
	}
	if response.Type != wsResponseTypeHandshake {
		t.Fatalf("expected handshake response type, got %+v", response)
	}

	deadline := time.Now().Add(2 * time.Second)
	for service.disconnectCalls() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if service.disconnectCalls() == 0 {
		t.Fatal("expected keepalive timeout to mark extension disconnected")
	}
}

func TestWebSocketEndpointRejectsMissingTokenWhenConfigured(t *testing.T) {
	service := &stubIngestionService{}
	config := DefaultConfig()
	config.BridgeToken = "token-123"

	request := httptest.NewRequest(http.MethodGet, extensionWebSocketPath, nil)
	recorder := httptest.NewRecorder()

	NewHandler(service, config).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 unauthorized for missing token, got %d", recorder.Code)
	}
}

func TestWebSocketEndpointAcceptsTokenFromSubprotocolWhenConfigured(t *testing.T) {
	service := &stubIngestionService{
		handshakeResponse: contracts.ExtensionHandshakeResponse{
			DesktopInstanceID: "desktop-instance-1",
			ProtocolVersion:   wsProtocolVersion,
		},
	}
	config := DefaultConfig()
	config.BridgeToken = "token-123"

	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on loopback for websocket test: %v", err)
	}
	httpServer := &http.Server{
		Handler: NewHandler(service, config),
	}
	go func() {
		_ = httpServer.Serve(listener)
	}()
	defer func() {
		_ = httpServer.Shutdown(context.Background())
	}()

	dialer := websocket.Dialer{
		Subprotocols: websocketAuthSubprotocols(config.BridgeToken),
	}
	wsURL := "ws://" + listener.Addr().String() + extensionWebSocketPath
	conn, _, err := dialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket with token subprotocol: %v", err)
	}
	defer conn.Close()

	handshakePayload := contracts.ExtensionHandshakeRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos",
			OSPlatform:  "darwin",
		},
		Extension: contracts.ExtensionInfo{Editor: "vscode"},
	}
	if err := conn.WriteJSON(wsRequestEnvelope{
		ID:              "h-1",
		ProtocolVersion: wsProtocolVersion,
		Type:            wsRequestTypeHandshake,
		Payload:         mustMarshalRawJSON(t, handshakePayload),
	}); err != nil {
		t.Fatalf("write handshake request: %v", err)
	}

	var response wsResponseEnvelope
	if err := conn.ReadJSON(&response); err != nil {
		t.Fatalf("read handshake response: %v", err)
	}
	if response.Type != wsResponseTypeHandshake {
		t.Fatalf("expected handshake response type, got %+v", response)
	}
}

func TestWebSocketEndpointRejectsUnsupportedProtocolVersion(t *testing.T) {
	service := &stubIngestionService{}

	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen on loopback for websocket test: %v", err)
	}
	httpServer := &http.Server{
		Handler: NewHandler(service, DefaultConfig()),
	}
	go func() {
		_ = httpServer.Serve(listener)
	}()
	defer func() {
		_ = httpServer.Shutdown(context.Background())
	}()

	wsURL := "ws://" + listener.Addr().String() + extensionWebSocketPath
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("dial websocket: %v", err)
	}
	defer conn.Close()

	handshakePayload := contracts.ExtensionHandshakeRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos",
			OSPlatform:  "darwin",
		},
		Extension: contracts.ExtensionInfo{Editor: "vscode"},
	}
	if err := conn.WriteJSON(wsRequestEnvelope{
		ID:              "h-1",
		ProtocolVersion: wsProtocolVersion + 1,
		Type:            wsRequestTypeHandshake,
		Payload:         mustMarshalRawJSON(t, handshakePayload),
	}); err != nil {
		t.Fatalf("write handshake request: %v", err)
	}

	var response wsResponseEnvelope
	if err := conn.ReadJSON(&response); err != nil {
		t.Fatalf("read websocket response: %v", err)
	}
	if response.Type != wsResponseTypeError {
		t.Fatalf("expected websocket error response, got %+v", response)
	}
	if response.Error == nil || response.Error.Code != wsErrorCodeProtocol {
		t.Fatalf("expected protocol-version error, got %+v", response.Error)
	}
}

func TestIsAllowedWebSocketOrigin(t *testing.T) {
	if !isAllowedWebSocketOrigin("") {
		t.Fatal("expected empty origin to be allowed for extension host")
	}
	if !isAllowedWebSocketOrigin("https://localhost:3000") {
		t.Fatal("expected loopback origin to be allowed")
	}
	if !isAllowedWebSocketOrigin("http://127.0.0.1:5173") {
		t.Fatal("expected loopback ip origin to be allowed")
	}
	if isAllowedWebSocketOrigin("https://example.com") {
		t.Fatal("expected non-loopback origin to be rejected")
	}
}

func mustMarshalRawJSON(t *testing.T, value any) json.RawMessage {
	t.Helper()

	payload, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	return payload
}

func websocketAuthSubprotocols(token string) []string {
	encoded := base64.RawURLEncoding.EncodeToString([]byte(token))
	return []string{
		wsTransportSubprotocol,
		wsBridgeTokenPrefix + encoded,
	}
}

type stubIngestionService struct {
	mu                sync.Mutex
	handshakeCalls    int
	markDisconnected  int
	handshakeResponse contracts.ExtensionHandshakeResponse
	handshakeError    error
	ingestResponse    contracts.IngestEventsResponse
	ingestError       error
}

func (s *stubIngestionService) IngestEvents(_ context.Context, _ contracts.IngestEventsRequest) (contracts.IngestEventsResponse, error) {
	return s.ingestResponse, s.ingestError
}

func (s *stubIngestionService) HandshakeExtension(_ context.Context, _ contracts.ExtensionHandshakeRequest) (contracts.ExtensionHandshakeResponse, error) {
	s.mu.Lock()
	s.handshakeCalls++
	s.mu.Unlock()
	return s.handshakeResponse, s.handshakeError
}

func (s *stubIngestionService) GetExtensionStatus(_ context.Context) (contracts.ExtensionStatus, error) {
	return contracts.ExtensionStatus{}, nil
}

func (s *stubIngestionService) MarkExtensionDisconnected(_ context.Context, _ string) error {
	s.mu.Lock()
	s.markDisconnected++
	s.mu.Unlock()
	return nil
}

func (s *stubIngestionService) disconnectCalls() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.markDisconnected
}

func (s *stubIngestionService) handshakeCallCount() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.handshakeCalls
}

func (s *stubIngestionService) ListKnownMachines(_ context.Context) ([]contracts.MachineInfo, error) {
	return nil, nil
}

func (s *stubIngestionService) ListRecentEvents(_ context.Context, _ int) ([]contracts.ActivityEvent, error) {
	return nil, nil
}

func (s *stubIngestionService) GetIngestionStats(_ context.Context) (contracts.IngestionStats, error) {
	return contracts.IngestionStats{}, nil
}
