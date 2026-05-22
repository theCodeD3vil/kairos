package transfer

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/sessionization"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestExportActivityDataWritesVersionedPayloadWithMachines(t *testing.T) {
	ctx := context.Background()
	store := openTransferTestStore(t)
	seedMachine(t, store, "linux-1", "Kairos Linux", "linux")
	seedEvents(t, store, []contracts.ActivityEvent{
		{
			ID:          "evt-1",
			Timestamp:   "2026-04-06T09:00:00Z",
			EventType:   "edit",
			MachineID:   "linux-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "go",
			FilePath:    "/home/michael/kairos/main.go",
		},
	})
	rebuilder := sessionization.NewService(store, desktopsettings.NewService(store))
	if _, err := rebuilder.RebuildSessionsForRange(ctx, "2026-04-06", "2026-04-06"); err != nil {
		t.Fatalf("rebuild sessions: %v", err)
	}

	exportPath := filepath.Join(t.TempDir(), "kairos-export.json")
	result, err := ExportActivityDataToFile(ctx, store, exportPath, "9.9.9-test", time.Date(2026, 4, 7, 12, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("export activity data: %v", err)
	}
	if result.MachineCount != 1 || result.EventCount != 1 || result.SessionCount == 0 {
		t.Fatalf("unexpected export summary: %+v", result)
	}

	payload, legacy, err := ReadActivityTransferFile(exportPath)
	if err != nil {
		t.Fatalf("read exported payload: %v", err)
	}
	if legacy {
		t.Fatal("expected versioned payload")
	}
	if payload.Format != ActivityFormat || payload.FormatVersion != ActivityFormatVersion {
		t.Fatalf("unexpected export format: %+v", payload)
	}
	if payload.Summary.ContentDigest == "" {
		t.Fatal("expected content digest")
	}
	if len(payload.Machines) != 1 || payload.Machines[0].MachineName != "Kairos Linux" {
		t.Fatalf("expected exported machine metadata, got %+v", payload.Machines)
	}
}

func TestImportActivityDataMergesEventsAndRebuildsSessions(t *testing.T) {
	ctx := context.Background()
	store := openTransferTestStore(t)
	seedMachine(t, store, "linux-1", "Kairos Linux", "linux")
	seedEvents(t, store, []contracts.ActivityEvent{
		{
			ID:          "evt-duplicate",
			Timestamp:   "2026-04-06T09:00:00Z",
			EventType:   "edit",
			MachineID:   "linux-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "go",
			FilePath:    "/home/michael/kairos/main.go",
		},
		{
			ID:          "evt-conflict",
			Timestamp:   "2026-04-06T10:00:00Z",
			EventType:   "edit",
			MachineID:   "linux-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "go",
		},
	})
	importPath := writeTransferPayload(t, ActivityTransferFile{
		Format:        ActivityFormat,
		FormatVersion: ActivityFormatVersion,
		ExportedAt:    "2026-04-07T12:00:00Z",
		AppVersion:    "9.9.9-test",
		Machines: []contracts.MachineInfo{
			{MachineID: "linux-1", MachineName: "Kairos Linux", OSPlatform: "linux"},
		},
		Events: []contracts.ActivityEvent{
			{
				ID:          "evt-duplicate",
				Timestamp:   "2026-04-06T09:00:00Z",
				EventType:   "edit",
				MachineID:   "linux-1",
				WorkspaceID: "workspace-1",
				ProjectName: "kairos",
				Language:    "go",
				FilePath:    "/home/michael/kairos/main.go",
			},
			{
				ID:          "evt-new",
				Timestamp:   "2026-04-06T09:05:00Z",
				EventType:   "edit",
				MachineID:   "linux-1",
				WorkspaceID: "workspace-1",
				ProjectName: "kairos",
				Language:    "go",
				FilePath:    "/home/michael/kairos/imported.go",
			},
			{
				ID:          "evt-conflict",
				Timestamp:   "2026-04-06T10:00:00Z",
				EventType:   "edit",
				MachineID:   "linux-1",
				WorkspaceID: "workspace-1",
				ProjectName: "kairos",
				Language:    "typescript",
			},
		},
	})

	preview, err := PreviewActivityImport(ctx, store, importPath)
	if err != nil {
		t.Fatalf("preview import: %v", err)
	}
	if !preview.CanImport || preview.NewEventCount != 1 || preview.DuplicateEventCount != 1 || preview.ConflictingEventCount != 1 {
		t.Fatalf("unexpected import preview: %+v", preview)
	}

	rebuilder := sessionization.NewService(store, desktopsettings.NewService(store))
	result, err := ImportActivityData(ctx, store, rebuilder, importPath, time.Date(2026, 4, 7, 12, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("import activity data: %v", err)
	}
	if result.InsertedEventCount != 1 || result.RebuiltSessionCount == 0 {
		t.Fatalf("unexpected import result: %+v", result)
	}

	events, err := store.ListEventsForDateRange(ctx, "2026-04-06", "2026-04-06")
	if err != nil {
		t.Fatalf("list imported events: %v", err)
	}
	if len(events) != 3 {
		t.Fatalf("expected 3 total events after import, got %d", len(events))
	}

	second, err := PreviewActivityImport(ctx, store, importPath)
	if err != nil {
		t.Fatalf("second preview import: %v", err)
	}
	if second.NewEventCount != 0 || second.DuplicateEventCount != 2 || second.ConflictingEventCount != 1 {
		t.Fatalf("expected idempotent duplicate classification, got %+v", second)
	}
}

func TestLegacySessionOnlyImportUsesSessionFallback(t *testing.T) {
	ctx := context.Background()
	store := openTransferTestStore(t)
	importPath := writeLegacyPayload(t, []contracts.Session{
		{
			ID:               "session-1",
			Date:             "2026-04-06",
			StartTime:        "2026-04-06T09:00:00Z",
			EndTime:          "2026-04-06T09:25:00Z",
			DurationMinutes:  25,
			MachineID:        "legacy-linux",
			ProjectName:      "kairos",
			Language:         "go",
			SourceEventCount: 2,
		},
	})

	preview, err := PreviewActivityImport(ctx, store, importPath)
	if err != nil {
		t.Fatalf("preview legacy import: %v", err)
	}
	if !preview.LegacyFormat || !preview.WillUseSessionFallback || preview.NewSessionCount != 1 {
		t.Fatalf("unexpected legacy preview: %+v", preview)
	}

	result, err := ImportActivityData(ctx, store, nil, importPath, time.Date(2026, 4, 7, 12, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatalf("import legacy sessions: %v", err)
	}
	if result.InsertedSessionCount != 1 {
		t.Fatalf("expected one inserted session, got %+v", result)
	}
}

func openTransferTestStore(t *testing.T) *storage.Store {
	t.Helper()
	store, err := storage.Open(context.Background(), filepath.Join(t.TempDir(), "kairos.sqlite3"))
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})
	return store
}

func seedMachine(t *testing.T, store *storage.Store, id string, name string, platform string) {
	t.Helper()
	if err := store.UpsertMachine(context.Background(), contracts.MachineInfo{
		MachineID:   id,
		MachineName: name,
		OSPlatform:  platform,
	}, "2026-04-06T09:00:00Z"); err != nil {
		t.Fatalf("seed machine: %v", err)
	}
}

func seedEvents(t *testing.T, store *storage.Store, events []contracts.ActivityEvent) {
	t.Helper()
	if _, warnings, err := store.InsertEvents(context.Background(), events, "2026-04-06T09:00:00Z"); err != nil {
		t.Fatalf("seed events: %v", err)
	} else if len(warnings) != 0 {
		t.Fatalf("unexpected seed warnings: %+v", warnings)
	}
}

func writeTransferPayload(t *testing.T, payload ActivityTransferFile) string {
	t.Helper()
	payload.Summary = buildSummary(payload.Machines, payload.Events, payload.Sessions)
	payload.Summary.ContentDigest = computeContentDigest(payload.Machines, payload.Events, payload.Sessions)
	path := filepath.Join(t.TempDir(), "kairos-import.json")
	body, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	if err := os.WriteFile(path, body, 0o600); err != nil {
		t.Fatalf("write payload: %v", err)
	}
	return path
}

func writeLegacyPayload(t *testing.T, sessions []contracts.Session) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "kairos-legacy-import.json")
	body, err := json.MarshalIndent(struct {
		Events   []contracts.ActivityEvent `json:"events"`
		Sessions []contracts.Session       `json:"sessions"`
	}{Events: []contracts.ActivityEvent{}, Sessions: sessions}, "", "  ")
	if err != nil {
		t.Fatalf("marshal legacy payload: %v", err)
	}
	if err := os.WriteFile(path, body, 0o600); err != nil {
		t.Fatalf("write legacy payload: %v", err)
	}
	return path
}
