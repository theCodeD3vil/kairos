package server

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/ingestion"
)

func TestHandshakeEndpointReturnsSettings(t *testing.T) {
	service := &stubIngestionService{
		handshakeResponse: contracts.ExtensionHandshakeResponse{
			Settings: contracts.ExtensionEffectiveSettings{
				TrackingEnabled:          true,
				SendHeartbeatEvents:      true,
				HeartbeatIntervalSeconds: 30,
			},
			ServerTimestamp: "2026-04-06T10:00:00Z",
		},
	}

	body, err := json.Marshal(contracts.ExtensionHandshakeRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos",
			OSPlatform:  "darwin",
		},
		Extension: contracts.ExtensionInfo{
			Editor: "vscode",
		},
	})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}

	request := httptest.NewRequest(http.MethodPost, "/v1/extension/handshake", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	NewHandler(service, DefaultConfig()).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	if service.handshakeCalls != 1 {
		t.Fatalf("expected handshake to be called once, got %d", service.handshakeCalls)
	}
}

func TestHandshakeEndpointReturnsBadRequestForValidationError(t *testing.T) {
	service := &stubIngestionService{
		handshakeError: &ingestion.ValidationError{Message: "invalid request"},
	}

	body := []byte(`{"machine":{"machineId":"machine-1","machineName":"Kairos","osPlatform":"darwin"},"extension":{"editor":"vscode"}}`)
	request := httptest.NewRequest(http.MethodPost, "/v1/extension/handshake", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	NewHandler(service, DefaultConfig()).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", recorder.Code)
	}
}

func TestIngestionEndpointReturnsInternalServerErrorForUnexpectedFailure(t *testing.T) {
	service := &stubIngestionService{
		ingestError: context.DeadlineExceeded,
	}

	body := []byte(`{"machine":{"machineId":"machine-1","machineName":"Kairos","osPlatform":"darwin"},"extension":{"editor":"vscode"},"events":[{"id":"evt-1","timestamp":"2026-04-06T10:00:00Z","eventType":"edit","machineId":"machine-1","workspaceId":"workspace","projectName":"kairos","language":"typescript"}]}`)
	request := httptest.NewRequest(http.MethodPost, "/v1/ingestion/events", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	NewHandler(service, DefaultConfig()).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}
}

type stubIngestionService struct {
	handshakeCalls    int
	handshakeResponse contracts.ExtensionHandshakeResponse
	handshakeError    error
	ingestResponse    contracts.IngestEventsResponse
	ingestError       error
}

func (s *stubIngestionService) IngestEvents(_ context.Context, _ contracts.IngestEventsRequest) (contracts.IngestEventsResponse, error) {
	return s.ingestResponse, s.ingestError
}

func (s *stubIngestionService) HandshakeExtension(_ context.Context, _ contracts.ExtensionHandshakeRequest) (contracts.ExtensionHandshakeResponse, error) {
	s.handshakeCalls++
	return s.handshakeResponse, s.handshakeError
}

func (s *stubIngestionService) GetExtensionStatus(_ context.Context) (contracts.ExtensionStatus, error) {
	return contracts.ExtensionStatus{}, nil
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
