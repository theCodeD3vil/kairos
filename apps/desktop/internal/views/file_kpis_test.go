package views

import (
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestClassifyFilePathTable(t *testing.T) {
	cases := []struct {
		path     string
		expected string
	}{
		{"apps/desktop/internal/storage/sqlite.go", fileCategorySource},
		{"apps/desktop/frontend/src/components/Button.tsx", fileCategorySource},
		{"apps/desktop/internal/views/service_test.go", fileCategoryTest},
		{"apps/desktop/frontend/src/lib/file.test.ts", fileCategoryTest},
		{"apps/desktop/frontend/src/__tests__/snapshot.ts", fileCategoryTest},
		{"docs/architecture.md", fileCategoryDocs},
		{"README.md", fileCategoryDocs},
		{"package.json", fileCategoryConfig},
		{"tsconfig.base.json", fileCategoryConfig},
		{".prettierrc", fileCategoryConfig},
		{"node_modules/react/index.js", fileCategoryBuild},
		{"apps/desktop/build/output.js", fileCategoryBuild},
		{"infra/terraform/main.tf", fileCategoryInfrastructure},
		{"Dockerfile", fileCategoryInfrastructure},
		{"docker-compose.yaml", fileCategoryInfrastructure},
		{".github/workflows/ci.yml", fileCategoryInfrastructure},
		{"Makefile", fileCategoryInfrastructure},
		{"src/proto/messages.pb.go", fileCategoryGenerated},
		{"src/generated/api.ts", fileCategoryGenerated},
		{"src/icons.generated.ts", fileCategoryGenerated},
		{"unknown.binary", fileCategoryOther},
	}
	for _, tc := range cases {
		got := classifyFilePath(tc.path)
		if got != tc.expected {
			t.Errorf("classifyFilePath(%q) = %q, want %q", tc.path, got, tc.expected)
		}
	}
}

func TestBuildFileActivityKpisOptInOffReturnsEmpty(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:00:00Z", "kairos", "go", "m1", "Host A", 60),
	}
	events := []contracts.ActivityEvent{
		buildEventWithPath("e1", "2026-04-05T09:00:30Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
	}

	summary := buildFileActivityKpis(sessions, events, contracts.PrivacySettings{
		FileMetricsEnabled: false,
		FilePathMode:       "full",
	}, contracts.TrackingSettings{IdleTimeoutMinutes: 5})

	if summary.OptInEnabled {
		t.Fatalf("expected opt-in flag false")
	}
	if !summary.FilePathsAvailable {
		t.Fatalf("expected file paths available when filePathMode=full")
	}
	if summary.UniqueFileCount != 0 {
		t.Fatalf("expected zero files when opt-in disabled, got %d", summary.UniqueFileCount)
	}
	if len(summary.TopFiles) != 0 {
		t.Fatalf("expected no top files, got %d", len(summary.TopFiles))
	}
}

func TestBuildFileActivityKpisPathsHiddenReturnsEmpty(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:00:00Z", "kairos", "go", "m1", "Host A", 60),
	}
	events := []contracts.ActivityEvent{
		buildEventWithPath("e1", "2026-04-05T09:00:30Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
	}

	summary := buildFileActivityKpis(sessions, events, contracts.PrivacySettings{
		FileMetricsEnabled: true,
		FilePathMode:       "hidden",
	}, contracts.TrackingSettings{IdleTimeoutMinutes: 5})

	if summary.FilePathsAvailable {
		t.Fatalf("expected file paths unavailable when filePathMode=hidden")
	}
	if summary.UniqueFileCount != 0 {
		t.Fatalf("expected zero files when paths hidden, got %d", summary.UniqueFileCount)
	}
}

func TestBuildFileActivityKpisAggregatesCategoriesAndHotspots(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:00:00Z", "kairos", "go", "m1", "Host A", 60),
	}
	events := []contracts.ActivityEvent{
		buildEventWithPath("e1", "2026-04-05T09:00:30Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e2", "2026-04-05T09:01:00Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e3", "2026-04-05T09:01:30Z", "m1", "kairos", "go", "save", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e4", "2026-04-05T09:05:00Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite_test.go"),
		buildEventWithPath("e5", "2026-04-05T09:10:00Z", "m1", "kairos", "go", "edit", "docs/architecture.md"),
	}

	summary := buildFileActivityKpis(sessions, events, contracts.PrivacySettings{
		FileMetricsEnabled: true,
		FilePathMode:       "full",
	}, contracts.TrackingSettings{IdleTimeoutMinutes: 5})

	if summary.UniqueFileCount != 3 {
		t.Fatalf("expected 3 unique files, got %d", summary.UniqueFileCount)
	}
	if summary.TotalAttributedMinutes <= 0 {
		t.Fatalf("expected positive attributed minutes, got %d", summary.TotalAttributedMinutes)
	}
	if summary.TopFiles[0].FilePath != "apps/desktop/internal/storage/sqlite.go" {
		t.Fatalf("expected top file sqlite.go, got %q", summary.TopFiles[0].FilePath)
	}

	categoryByName := make(map[string]contracts.FileCategoryBreakdown)
	for _, entry := range summary.CategoryBreakdown {
		categoryByName[entry.Category] = entry
	}
	if _, ok := categoryByName[fileCategorySource]; !ok {
		t.Fatalf("expected source bucket present")
	}
	if _, ok := categoryByName[fileCategoryTest]; !ok {
		t.Fatalf("expected test bucket present")
	}
	if _, ok := categoryByName[fileCategoryDocs]; !ok {
		t.Fatalf("expected docs bucket present")
	}
	if summary.TestVsSource.SourceMinutes <= 0 {
		t.Fatalf("expected positive source minutes, got %d", summary.TestVsSource.SourceMinutes)
	}
	if summary.TestVsSource.TestShareOfCode <= 0 {
		t.Fatalf("expected positive test share, got %f", summary.TestVsSource.TestShareOfCode)
	}
	churn := summary.FileChurnLeaders[0]
	if churn.EditCount+churn.SaveCount == 0 {
		t.Fatalf("expected churn leader with edits+saves, got %+v", churn)
	}
}

func TestBuildFileActivityKpisLongRunningFocusBlocks(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:30:00Z", "kairos", "go", "m1", "Host A", 90),
	}
	events := []contracts.ActivityEvent{
		buildEventWithPath("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e2", "2026-04-05T09:05:00Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e3", "2026-04-05T09:10:00Z", "m1", "kairos", "go", "save", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e4", "2026-04-05T09:15:30Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e5", "2026-04-05T09:20:00Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
		buildEventWithPath("e6", "2026-04-05T09:55:00Z", "m1", "kairos", "go", "edit", "apps/desktop/internal/storage/sqlite.go"),
	}

	summary := buildFileActivityKpis(sessions, events, contracts.PrivacySettings{
		FileMetricsEnabled: true,
		FilePathMode:       "full",
	}, contracts.TrackingSettings{IdleTimeoutMinutes: 10})

	if len(summary.LongRunningFocusBlocks) == 0 {
		t.Fatalf("expected at least one long-running focus block, got 0")
	}
	block := summary.LongRunningFocusBlocks[0]
	if block.DurationMinutes < longRunningFocusBlockMinMinutes {
		t.Fatalf("expected duration ≥ %d, got %d", longRunningFocusBlockMinMinutes, block.DurationMinutes)
	}
	if block.FilePath != "apps/desktop/internal/storage/sqlite.go" {
		t.Fatalf("expected sqlite.go focus block, got %q", block.FilePath)
	}
}

func TestBuildFileActivityKpisMaskedPathsFlag(t *testing.T) {
	summary := buildFileActivityKpis(nil, nil, contracts.PrivacySettings{
		FileMetricsEnabled: true,
		FilePathMode:       "masked",
	}, contracts.TrackingSettings{})
	if !summary.PathsMasked {
		t.Fatalf("expected pathsMasked=true when filePathMode=masked")
	}
}

func buildEventWithPath(id string, timestamp string, machineID string, project string, language string, eventType string, filePath string) contracts.ActivityEvent {
	return contracts.ActivityEvent{
		ID:          id,
		Timestamp:   timestamp,
		EventType:   eventType,
		MachineID:   machineID,
		WorkspaceID: "workspace-1",
		ProjectName: project,
		Language:    language,
		FilePath:    filePath,
	}
}
