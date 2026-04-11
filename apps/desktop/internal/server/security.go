package server

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
)

const jsonContentType = "application/json"
const DefaultPort = 42137
const (
	localServerHostEnvVar  = "KAIROS_LOCAL_SERVER_HOST"
	localServerPortEnvVar  = "KAIROS_LOCAL_SERVER_PORT"
	localServerTokenEnvVar = "KAIROS_LOCAL_SERVER_TOKEN"
)

type Config struct {
	Host                string
	Port                int
	MaxRequestBodyBytes int64
	BridgeToken         string
}

func DefaultConfig() Config {
	host := "127.0.0.1"
	if override := strings.TrimSpace(os.Getenv(localServerHostEnvVar)); override != "" {
		host = override
	}

	port := DefaultPort
	if override := strings.TrimSpace(os.Getenv(localServerPortEnvVar)); override != "" {
		if parsed, err := strconv.Atoi(override); err == nil {
			port = parsed
		}
	}

	return Config{
		Host:                host,
		Port:                port,
		MaxRequestBodyBytes: config.MaxRequestBodyBytes,
		BridgeToken:         strings.TrimSpace(os.Getenv(localServerTokenEnvVar)),
	}
}

func (c Config) Address() string {
	return net.JoinHostPort(c.Host, fmt.Sprintf("%d", c.Port))
}

func (c Config) Validate() error {
	if !isLoopbackHost(c.Host) {
		return fmt.Errorf("server host must be loopback-only, got %q", c.Host)
	}
	if c.Port < 0 || c.Port > 65535 {
		return fmt.Errorf("server port must be between 0 and 65535")
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
