package updates

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const defaultGitHubAPIBaseURL = "https://api.github.com"

type Service struct {
	repository       string
	currentVersion   string
	buildChannel     string
	httpClient       *http.Client
	githubAPIBaseURL string
}

type CheckResult struct {
	CheckedAt       string `json:"checkedAt"`
	CurrentVersion  string `json:"currentVersion"`
	LatestVersion   string `json:"latestVersion"`
	UpdateAvailable bool   `json:"updateAvailable"`
	ReleaseURL      string `json:"releaseUrl"`
	AssetURL        string `json:"assetUrl"`
	ReleaseNotes    string `json:"releaseNotes"`
	PreRelease      bool   `json:"preRelease"`
	Error           string `json:"error,omitempty"`
}

type githubRelease struct {
	TagName    string `json:"tag_name"`
	Name       string `json:"name"`
	HTMLURL    string `json:"html_url"`
	Body       string `json:"body"`
	Draft      bool   `json:"draft"`
	Prerelease bool   `json:"prerelease"`
	Assets     []struct {
		Name               string `json:"name"`
		BrowserDownloadURL string `json:"browser_download_url"`
	} `json:"assets"`
}

func NewService(repository string, currentVersion string, buildChannel string) *Service {
	return &Service{
		repository:     strings.TrimSpace(repository),
		currentVersion: strings.TrimSpace(currentVersion),
		buildChannel:   strings.TrimSpace(strings.ToLower(buildChannel)),
		httpClient: &http.Client{
			Timeout: 8 * time.Second,
		},
		githubAPIBaseURL: defaultGitHubAPIBaseURL,
	}
}

func (s *Service) CheckForUpdate(ctx context.Context) CheckResult {
	result := CheckResult{
		CheckedAt:      time.Now().UTC().Format(time.RFC3339),
		CurrentVersion: s.currentVersion,
	}

	if s.repository == "" {
		result.Error = "update repository is not configured"
		return result
	}

	latest, err := s.fetchLatestRelease(ctx)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	result.LatestVersion = normalizeVersion(latest.TagName)
	result.ReleaseURL = latest.HTMLURL
	result.ReleaseNotes = latest.Body
	result.PreRelease = latest.Prerelease
	if len(latest.Assets) > 0 {
		result.AssetURL = latest.Assets[0].BrowserDownloadURL
	}

	if isVersionGreater(result.LatestVersion, s.currentVersion) {
		result.UpdateAvailable = true
	}

	return result
}

func (s *Service) fetchLatestRelease(ctx context.Context) (githubRelease, error) {
	url := fmt.Sprintf("%s/repos/%s/releases", strings.TrimRight(s.githubAPIBaseURL, "/"), s.repository)
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return githubRelease{}, fmt.Errorf("create update request: %w", err)
	}
	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("User-Agent", "kairos-desktop-update-check")

	response, err := s.httpClient.Do(request)
	if err != nil {
		return githubRelease{}, fmt.Errorf("request update metadata: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return githubRelease{}, fmt.Errorf("update metadata request failed: %s %s", response.Status, strings.TrimSpace(string(body)))
	}

	var releases []githubRelease
	if decodeErr := json.NewDecoder(response.Body).Decode(&releases); decodeErr != nil {
		return githubRelease{}, fmt.Errorf("decode update metadata: %w", decodeErr)
	}
	if len(releases) == 0 {
		return githubRelease{}, fmt.Errorf("no releases found")
	}

	allowPreRelease := strings.Contains(s.buildChannel, "pre") || strings.Contains(s.buildChannel, "beta") || strings.Contains(s.buildChannel, "rc")
	for _, release := range releases {
		if release.Draft {
			continue
		}
		if !allowPreRelease && release.Prerelease {
			continue
		}
		return release, nil
	}

	return githubRelease{}, fmt.Errorf("no compatible release found")
}

func normalizeVersion(raw string) string {
	trimmed := strings.TrimSpace(raw)
	trimmed = strings.TrimPrefix(trimmed, "v")
	return trimmed
}

type semver struct {
	major      int
	minor      int
	patch      int
	preRelease string
	valid      bool
}

func parseSemver(raw string) semver {
	version := normalizeVersion(raw)
	if version == "" {
		return semver{}
	}

	main := version
	pre := ""
	if idx := strings.Index(main, "-"); idx >= 0 {
		pre = main[idx+1:]
		main = main[:idx]
	}

	parts := strings.Split(main, ".")
	if len(parts) < 3 {
		return semver{}
	}

	var values [3]int
	for i := 0; i < 3; i++ {
		parsed, ok := parsePositiveInt(parts[i])
		if !ok {
			return semver{}
		}
		values[i] = parsed
	}

	return semver{
		major:      values[0],
		minor:      values[1],
		patch:      values[2],
		preRelease: pre,
		valid:      true,
	}
}

func parsePositiveInt(raw string) (int, bool) {
	if raw == "" {
		return 0, false
	}
	total := 0
	for _, char := range raw {
		if char < '0' || char > '9' {
			return 0, false
		}
		total = total*10 + int(char-'0')
	}
	return total, true
}

func isVersionGreater(latest string, current string) bool {
	latestParsed := parseSemver(latest)
	currentParsed := parseSemver(current)
	if !latestParsed.valid || !currentParsed.valid {
		return false
	}

	if latestParsed.major != currentParsed.major {
		return latestParsed.major > currentParsed.major
	}
	if latestParsed.minor != currentParsed.minor {
		return latestParsed.minor > currentParsed.minor
	}
	if latestParsed.patch != currentParsed.patch {
		return latestParsed.patch > currentParsed.patch
	}

	// Stable release takes precedence over pre-release when base versions match.
	if latestParsed.preRelease == "" && currentParsed.preRelease != "" {
		return true
	}

	return false
}
