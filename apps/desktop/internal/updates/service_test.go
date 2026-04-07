package updates

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestIsVersionGreater(t *testing.T) {
	testCases := []struct {
		name    string
		latest  string
		current string
		want    bool
	}{
		{name: "patch upgrade", latest: "1.2.4", current: "1.2.3", want: true},
		{name: "minor upgrade", latest: "1.3.0", current: "1.2.9", want: true},
		{name: "major upgrade", latest: "2.0.0", current: "1.9.9", want: true},
		{name: "same version", latest: "1.2.3", current: "1.2.3", want: false},
		{name: "lower latest", latest: "1.2.2", current: "1.2.3", want: false},
		{name: "stable beats prerelease", latest: "1.2.3", current: "1.2.3-rc.1", want: true},
		{name: "invalid versions are ignored", latest: "latest", current: "1.2.3", want: false},
		{name: "v-prefixed versions", latest: "v1.2.4", current: "v1.2.3", want: true},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			if got := isVersionGreater(testCase.latest, testCase.current); got != testCase.want {
				t.Fatalf("isVersionGreater(%q,%q)=%v want %v", testCase.latest, testCase.current, got, testCase.want)
			}
		})
	}
}

func TestCheckForUpdateHandlesErrorsSafely(t *testing.T) {
	service := NewService("michaelnji/kairos", "1.0.0", "stable")
	service.githubAPIBaseURL = "http://127.0.0.1:1"
	result := service.CheckForUpdate(context.Background())
	if result.Error == "" {
		t.Fatal("expected safe error when GitHub endpoint is unavailable")
	}
	if result.UpdateAvailable {
		t.Fatal("did not expect update availability on transport error")
	}
}

func TestCheckForUpdateParsesGitHubReleases(t *testing.T) {
	service := NewService("michaelnji/kairos", "1.1.0", "stable")
	service.httpClient = &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body: io.NopCloser(strings.NewReader(`[
  {"tag_name":"v1.2.0","name":"Kairos 1.2.0","html_url":"https://github.com/michaelnji/kairos/releases/tag/v1.2.0","body":"notes","draft":false,"prerelease":false,"assets":[{"name":"Kairos-macos.zip","browser_download_url":"https://example.com/kairos.zip"}]}
]`)),
				Header: make(http.Header),
			}, nil
		}),
	}
	result := service.CheckForUpdate(context.Background())

	if result.Error != "" {
		t.Fatalf("unexpected update check error: %s", result.Error)
	}
	if !result.UpdateAvailable {
		t.Fatal("expected update to be available")
	}
	if result.LatestVersion != "1.2.0" {
		t.Fatalf("expected latest 1.2.0, got %q", result.LatestVersion)
	}
	if result.ReleaseURL == "" || result.AssetURL == "" {
		t.Fatal("expected release and asset urls to be populated")
	}
}

func TestStableBuildSkipsPrereleaseWhenStableExists(t *testing.T) {
	service := NewService("michaelnji/kairos", "1.1.0", "stable")
	service.httpClient = &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body: io.NopCloser(strings.NewReader(`[
  {"tag_name":"v1.3.0-rc.1","name":"Kairos 1.3.0-rc.1","html_url":"https://example.com/prerelease","body":"prerelease","draft":false,"prerelease":true,"assets":[]},
  {"tag_name":"v1.2.0","name":"Kairos 1.2.0","html_url":"https://example.com/stable","body":"stable","draft":false,"prerelease":false,"assets":[]}
]`)),
				Header: make(http.Header),
			}, nil
		}),
	}

	result := service.CheckForUpdate(context.Background())
	if result.Error != "" {
		t.Fatalf("unexpected update check error: %s", result.Error)
	}
	if result.PreRelease {
		t.Fatal("did not expect prerelease to be selected for stable build channel")
	}
	if result.LatestVersion != "1.2.0" {
		t.Fatalf("expected stable release v1.2.0, got %q", result.LatestVersion)
	}
}

func TestPrereleaseBuildCanConsumePrerelease(t *testing.T) {
	service := NewService("michaelnji/kairos", "1.1.0", "prerelease")
	service.httpClient = &http.Client{
		Transport: roundTripFunc(func(request *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body: io.NopCloser(strings.NewReader(`[
  {"tag_name":"v1.3.0-rc.1","name":"Kairos 1.3.0-rc.1","html_url":"https://example.com/prerelease","body":"prerelease","draft":false,"prerelease":true,"assets":[]},
  {"tag_name":"v1.2.0","name":"Kairos 1.2.0","html_url":"https://example.com/stable","body":"stable","draft":false,"prerelease":false,"assets":[]}
]`)),
				Header: make(http.Header),
			}, nil
		}),
	}

	result := service.CheckForUpdate(context.Background())
	if result.Error != "" {
		t.Fatalf("unexpected update check error: %s", result.Error)
	}
	if !result.PreRelease {
		t.Fatal("expected prerelease to be selected for prerelease build channel")
	}
	if result.LatestVersion != "1.3.0-rc.1" {
		t.Fatalf("expected prerelease v1.3.0-rc.1, got %q", result.LatestVersion)
	}
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (function roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) {
	return function(request)
}
