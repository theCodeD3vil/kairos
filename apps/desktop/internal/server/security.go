package server

import (
	"fmt"
	"net"
	"strings"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
)

const jsonContentType = "application/json"

type Config struct {
	Host                string
	Port                int
	MaxRequestBodyBytes int64
}

func DefaultConfig() Config {
	return Config{
		Host:                "127.0.0.1",
		Port:                0,
		MaxRequestBodyBytes: config.MaxRequestBodyBytes,
	}
}

func (c Config) Address() string {
	return net.JoinHostPort(c.Host, fmt.Sprintf("%d", c.Port))
}

func (c Config) Validate() error {
	if !isLoopbackHost(c.Host) {
		return fmt.Errorf("server host must be loopback-only, got %q", c.Host)
	}
	if c.MaxRequestBodyBytes <= 0 {
		return fmt.Errorf("server max request body bytes must be positive")
	}

	return nil
}

func ValidateIngestionMethod(method string) error {
	if method != "POST" {
		return fmt.Errorf("unsupported method %q", method)
	}

	return nil
}

func ValidateJSONContentType(contentType string) error {
	normalized := strings.ToLower(strings.TrimSpace(contentType))
	if normalized == "" {
		return fmt.Errorf("missing content type")
	}
	if normalized == jsonContentType || strings.HasPrefix(normalized, jsonContentType+";") {
		return nil
	}

	return fmt.Errorf("unsupported content type %q", contentType)
}

func isLoopbackHost(host string) bool {
	switch host {
	case "localhost":
		return true
	}

	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
