package main

import (
	"context"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestE2EIngestionFlowRespectsEditOnlyTracking(t *testing.T) {
	dbPath := t.TempDir() + "/kairos-e2e.sqlite3"
	t.Setenv("KAIROS_DATABASE_PATH", dbPath)
	t.Setenv("KAIROS_DISABLE_LOCAL_SERVER", "1")

	app := NewApp()
	if app.initErr != nil {
		t.Fatalf("expected app initialization to succeed, got %v", app.initErr)
	}
	defer app.shutdown(context.Background())

	now := time.Now().UTC().Truncate(time.Second)
	date := now.Format("2006-01-02")

	request := contracts.IngestEventsRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-e2e",
			MachineName: "Kairos E2E",
			OSPlatform:  "darwin",
			Hostname:    "kairos-e2e.local",
			OSVersion:   "14.0",
			Arch:        "arm64",
		},
		Extension: contracts.ExtensionInfo{
			Editor:           "vscode",
			EditorVersion:    "1.100.0",
			ExtensionVersion: "1.0.5",
		},
		Events: []contracts.ActivityEvent{
			{
				ID:          "e2e-edit-1",
				Timestamp:   now.Add(-2 * time.Minute).Format(time.RFC3339),
				EventType:   "edit",
				MachineID:   "machine-e2e",
				WorkspaceID: "/workspace/kairos",
				ProjectName: "kairos",
				Language:    "go",
				FilePath:    "/workspace/kairos/main.go",
			},
			{
				ID:          "e2e-edit-2",
				Timestamp:   now.Add(-1 * time.Minute).Format(time.RFC3339),
				EventType:   "edit",
				MachineID:   "machine-e2e",
				WorkspaceID: "/workspace/kairos",
				ProjectName: "kairos",
				Language:    "go",
				FilePath:    "/workspace/kairos/app.go",
			},
		},
	}

	firstIngest, err := app.IngestEvents(request)
	if err != nil {
		t.Fatalf("expected ingest to succeed, got %v", err)
	}
	if firstIngest.AcceptedCount != 2 || firstIngest.RejectedCount != 0 {
		t.Fatalf("expected 2 accepted / 0 rejected, got %+v", firstIngest)
	}

	sessions, err := app.ListSessionsForDate(date)
	if err != nil {
		t.Fatalf("expected sessions to be queryable, got %v", err)
	}
	if len(sessions) == 0 {
		t.Fatal("expected at least one session after accepted edit events")
	}

	settingsData, err := app.GetSettingsData()
	if err != nil {
		t.Fatalf("expected settings to load, got %v", err)
	}
	extensionSettings := settingsData.Extension
	extensionSettings.TrackEditEvents = false

	if _, err := app.UpdateExtensionSettings(extensionSettings); err != nil {
		t.Fatalf("expected extension settings update to succeed, got %v", err)
	}

	secondIngest, err := app.IngestEvents(contracts.IngestEventsRequest{
		Machine:   request.Machine,
		Extension: request.Extension,
		Events: []contracts.ActivityEvent{
			{
				ID:          "e2e-edit-3",
				Timestamp:   now.Format(time.RFC3339),
				EventType:   "edit",
				MachineID:   "machine-e2e",
				WorkspaceID: "/workspace/kairos",
				ProjectName: "kairos",
				Language:    "go",
				FilePath:    "/workspace/kairos/blocked.go",
			},
		},
	})
	if err != nil {
		t.Fatalf("expected second ingest to return partial result without fatal error, got %v", err)
	}
	if secondIngest.AcceptedCount != 0 || secondIngest.RejectedCount != 1 {
		t.Fatalf("expected 0 accepted / 1 rejected when edit tracking is disabled, got %+v", secondIngest)
	}
}

