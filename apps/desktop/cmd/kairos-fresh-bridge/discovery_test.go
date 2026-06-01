package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestBuildCandidates_defaultIncluded(t *testing.T) {
	t.Setenv(desktopURLEnv, "")
	t.Setenv(desktopTokenEnv, "")
	t.Setenv(bridgeDiscoveryFileEnv, "/nonexistent/path")

	candidates := buildCandidates()
	if len(candidates) == 0 {
		t.Fatal("expected at least one candidate")
	}

	defaultURL := "http://127.0.0.1:42137"
	found := false
	for _, c := range candidates {
		if c.BaseURL == defaultURL {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("default base URL %q not in candidates", defaultURL)
	}
}

func TestBuildCandidates_envURLFirst(t *testing.T) {
	t.Setenv(desktopURLEnv, "http://127.0.0.1:9999")
	t.Setenv(desktopTokenEnv, "tok")
	t.Setenv(bridgeDiscoveryFileEnv, "/nonexistent/path")

	candidates := buildCandidates()
	if len(candidates) == 0 {
		t.Fatal("expected candidates")
	}
	if candidates[0].BaseURL != "http://127.0.0.1:9999" {
		t.Errorf("env URL should be first, got %q", candidates[0].BaseURL)
	}
	if candidates[0].Token != "tok" {
		t.Errorf("token should propagate, got %q", candidates[0].Token)
	}
}

func TestBuildCandidates_portRange(t *testing.T) {
	t.Setenv(desktopURLEnv, "")
	t.Setenv(desktopTokenEnv, "")
	t.Setenv(bridgeDiscoveryFileEnv, "/nonexistent/path")

	candidates := buildCandidates()

	startURL := formatBaseURL("127.0.0.1", desktopPortRangeStart)
	endURL := formatBaseURL("127.0.0.1", desktopPortRangeEnd)
	foundStart, foundEnd := false, false
	for _, c := range candidates {
		if c.BaseURL == startURL {
			foundStart = true
		}
		if c.BaseURL == endURL {
			foundEnd = true
		}
	}
	if !foundStart {
		t.Errorf("port range start %q not found", startURL)
	}
	if !foundEnd {
		t.Errorf("port range end %q not found", endURL)
	}
}

func TestBuildCandidates_discoveryFile(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "desktop-bridge.json")

	rec := bridgeDiscoveryRecord{
		DesktopServerURL:   "http://127.0.0.1:55555",
		DesktopServerToken: "bridge-tok",
	}
	data, _ := json.Marshal(rec)
	if err := os.WriteFile(f, data, 0o600); err != nil {
		t.Fatal(err)
	}

	t.Setenv(bridgeDiscoveryFileEnv, f)
	t.Setenv(desktopURLEnv, "")
	t.Setenv(desktopTokenEnv, "")

	candidates := buildCandidates()
	if len(candidates) == 0 {
		t.Fatal("expected candidates")
	}
	if candidates[0].BaseURL != "http://127.0.0.1:55555" {
		t.Errorf("discovery file URL should be first, got %q", candidates[0].BaseURL)
	}
	if candidates[0].Token != "bridge-tok" {
		t.Errorf("discovery token mismatch: %q", candidates[0].Token)
	}
}

func TestBuildCandidates_noDuplicates(t *testing.T) {
	t.Setenv(desktopURLEnv, "http://127.0.0.1:42137")
	t.Setenv(desktopTokenEnv, "")
	t.Setenv(bridgeDiscoveryFileEnv, "/nonexistent/path")

	candidates := buildCandidates()
	seen := make(map[string]int)
	for _, c := range candidates {
		seen[c.BaseURL]++
	}
	for url, count := range seen {
		if count > 1 {
			t.Errorf("duplicate candidate %q (appeared %d times)", url, count)
		}
	}
}

func TestIsLoopbackHost(t *testing.T) {
	cases := []struct {
		host string
		want bool
	}{
		{"localhost", true},
		{"127.0.0.1", true},
		{"127.1.2.3", true},
		{"::1", true},
		{"[::1]", true},
		{"0.0.0.0", false},
		{"example.com", false},
		{"192.168.1.1", false},
	}
	for _, tc := range cases {
		got := isLoopbackHost(tc.host)
		if got != tc.want {
			t.Errorf("isLoopbackHost(%q) = %v, want %v", tc.host, got, tc.want)
		}
	}
}
