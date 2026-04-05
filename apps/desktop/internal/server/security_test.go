package server

import "testing"

func TestDefaultConfigIsLoopbackOnly(t *testing.T) {
	cfg := DefaultConfig()
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected default config to validate, got %v", err)
	}
	if cfg.Host != "127.0.0.1" {
		t.Fatalf("expected loopback host, got %q", cfg.Host)
	}
}

func TestConfigRejectsNonLoopbackHost(t *testing.T) {
	cfg := DefaultConfig()
	cfg.Host = "0.0.0.0"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected non-loopback host to be rejected")
	}
}

func TestValidateIngestionMethod(t *testing.T) {
	if err := ValidateIngestionMethod("POST"); err != nil {
		t.Fatalf("expected POST to be accepted, got %v", err)
	}
	if err := ValidateIngestionMethod("GET"); err == nil {
		t.Fatal("expected GET to be rejected")
	}
}

func TestValidateJSONContentType(t *testing.T) {
	if err := ValidateJSONContentType("application/json; charset=utf-8"); err != nil {
		t.Fatalf("expected json content type to be accepted, got %v", err)
	}
	if err := ValidateJSONContentType("text/plain"); err == nil {
		t.Fatal("expected text/plain to be rejected")
	}
}
