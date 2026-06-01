package main

import (
	"encoding/json"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	desktopPortRangeStart  = 42137
	desktopPortRangeEnd    = 42157
	bridgeDiscoveryFileEnv = "KAIROS_BRIDGE_DISCOVERY_FILE"
	desktopURLEnv          = "KAIROS_DESKTOP_URL"
	desktopTokenEnv        = "KAIROS_DESKTOP_TOKEN"
)

type endpointCandidate struct {
	BaseURL string
	Token   string
}

type bridgeDiscoveryRecord struct {
	DesktopServerURL   string `json:"desktopServerUrl"`
	DesktopServerHost  string `json:"desktopServerHost"`
	DesktopServerPort  int    `json:"desktopServerPort"`
	DesktopServerToken string `json:"desktopServerToken"`
}

func discoveryFilePath() string {
	if override := strings.TrimSpace(os.Getenv(bridgeDiscoveryFileEnv)); override != "" {
		return override
	}
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".kairos", "desktop-bridge.json")
}

func readDiscoveryCandidate(token string) *endpointCandidate {
	data, err := os.ReadFile(discoveryFilePath())
	if err != nil {
		return nil
	}
	var rec bridgeDiscoveryRecord
	if err := json.Unmarshal(data, &rec); err != nil {
		return nil
	}
	tok := rec.DesktopServerToken
	if tok == "" {
		tok = token
	}
	if rec.DesktopServerURL != "" {
		if u := parseLoopbackURL(rec.DesktopServerURL); u != "" {
			return &endpointCandidate{BaseURL: u, Token: tok}
		}
	}
	if rec.DesktopServerHost != "" && rec.DesktopServerPort > 0 {
		host := rec.DesktopServerHost
		port := rec.DesktopServerPort
		if isLoopbackHost(host) && port > 0 && port <= 65535 {
			return &endpointCandidate{BaseURL: formatBaseURL(host, port), Token: tok}
		}
	}
	return nil
}

func buildCandidates() []endpointCandidate {
	token := strings.TrimSpace(os.Getenv(desktopTokenEnv))
	var candidates []endpointCandidate

	add := func(c *endpointCandidate) {
		if c == nil || c.BaseURL == "" {
			return
		}
		for _, existing := range candidates {
			if existing.BaseURL == c.BaseURL {
				return
			}
		}
		candidates = append(candidates, *c)
	}

	if envURL := strings.TrimSpace(os.Getenv(desktopURLEnv)); envURL != "" {
		add(&endpointCandidate{BaseURL: envURL, Token: token})
	}
	add(readDiscoveryCandidate(token))
	add(&endpointCandidate{BaseURL: "http://127.0.0.1:42137", Token: token})

	for port := desktopPortRangeStart; port <= desktopPortRangeEnd; port++ {
		add(&endpointCandidate{BaseURL: formatBaseURL("127.0.0.1", port), Token: token})
	}
	return candidates
}

func parseLoopbackURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return ""
	}
	if !isLoopbackHost(u.Hostname()) {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func isLoopbackHost(host string) bool {
	h := strings.TrimSpace(strings.ToLower(host))
	h = strings.TrimPrefix(strings.TrimSuffix(h, "]"), "[")
	if h == "localhost" || h == "::1" {
		return true
	}
	ip := net.ParseIP(h)
	return ip != nil && ip.IsLoopback()
}

func formatBaseURL(host string, port int) string {
	if strings.Contains(host, ":") && !strings.HasPrefix(host, "[") {
		return "http://[" + host + "]:" + strconv.Itoa(port)
	}
	return "http://" + host + ":" + strconv.Itoa(port)
}
