package server

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestDecodeStrictRawJSONRejectsMissingUnknownAndTrailingPayload(t *testing.T) {
	validPayload := json.RawMessage(`{
		"machine":{"machineId":"machine-1","machineName":"Kairos","osPlatform":"darwin"},
		"extension":{"editor":"vscode"}
	}`)
	unknownFieldPayload := json.RawMessage(`{
		"machine":{"machineId":"machine-1","machineName":"Kairos","osPlatform":"darwin"},
		"extension":{"editor":"vscode"},
		"unexpected": true
	}`)
	trailingPayload := json.RawMessage(`{
		"machine":{"machineId":"machine-1","machineName":"Kairos","osPlatform":"darwin"},
		"extension":{"editor":"vscode"}
	}{"extra":true}`)

	var request contracts.ExtensionHandshakeRequest
	if err := decodeStrictRawJSON(validPayload, &request); err != nil {
		t.Fatalf("expected valid payload to decode, got %v", err)
	}
	if request.Machine.MachineID != "machine-1" {
		t.Fatalf("decoded payload missing machine id: %+v", request)
	}

	if err := decodeStrictRawJSON(nil, &request); err == nil {
		t.Fatal("expected missing payload to be rejected")
	}

	if err := decodeStrictRawJSON(unknownFieldPayload, &request); err == nil {
		t.Fatal("expected unknown fields to be rejected")
	}

	if err := decodeStrictRawJSON(trailingPayload, &request); err == nil {
		t.Fatal("expected trailing payload data to be rejected")
	}
}

func TestResolveBridgeTokenParsesAndValidatesSubprotocolToken(t *testing.T) {
	validToken := "token-123"
	validEncoded := base64.RawURLEncoding.EncodeToString([]byte(validToken))

	request := httptest.NewRequest(http.MethodGet, extensionWebSocketPath, nil)
	request.Header.Set("Sec-WebSocket-Protocol", strings.Join([]string{
		wsTransportSubprotocol,
		wsBridgeTokenPrefix + validEncoded,
	}, ","))

	token, err := resolveBridgeToken(request)
	if err != nil {
		t.Fatalf("expected valid token to decode, got %v", err)
	}
	if token != validToken {
		t.Fatalf("expected token %q, got %q", validToken, token)
	}

	invalid := httptest.NewRequest(http.MethodGet, extensionWebSocketPath, nil)
	invalid.Header.Set("Sec-WebSocket-Protocol", wsBridgeTokenPrefix+"not+base64??")
	if _, err := resolveBridgeToken(invalid); err == nil {
		t.Fatal("expected invalid token encoding to be rejected")
	}

	empty := httptest.NewRequest(http.MethodGet, extensionWebSocketPath, nil)
	empty.Header.Set("Sec-WebSocket-Protocol", wsBridgeTokenPrefix)
	if _, err := resolveBridgeToken(empty); err == nil {
		t.Fatal("expected empty token payload to be rejected")
	}

	missing := httptest.NewRequest(http.MethodGet, extensionWebSocketPath, nil)
	if _, err := resolveBridgeToken(missing); err == nil {
		t.Fatal("expected missing token to be rejected")
	}
}
