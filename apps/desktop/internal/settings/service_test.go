package settings

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestGetSettingsDataReturnsRuntimeAndStorageState(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos-settings.sqlite3")
	store, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite store: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})

	recordedAt := "2026-04-08T12:00:00Z"
	if err := store.UpsertExtensionStatus(context.Background(), contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           "vscode",
		ExtensionVersion: "1.2.3",
		LastEventAt:      "2026-04-08T09:00:00Z",
		LastHandshakeAt:  recordedAt,
	}, recordedAt); err != nil {
		t.Fatalf("upsert extension status failed: %v", err)
	}

	if _, warnings, err := store.InsertEvents(context.Background(), []contracts.ActivityEvent{
		{
			ID:          "e1",
			Timestamp:   "2026-04-08T09:00:00Z",
			EventType:   "edit",
			MachineID:   "m1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos-desktop",
			Language:    "typescript",
		},
	}, recordedAt); err != nil {
		t.Fatalf("insert events failed: %v", err)
	} else if len(warnings) != 0 {
		t.Fatalf("unexpected warnings: %+v", warnings)
	}

	service := NewService(store)
	service.SetDataStorageInfo(store.Path(), "ready")

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}

	if data.ExtensionStatus.Editor != "vscode" || !data.ExtensionStatus.Connected {
		t.Fatalf("expected persisted extension status, got %+v", data.ExtensionStatus)
	}
	if data.DataStorage.LocalDataPath != store.Path() || data.DataStorage.DatabaseStatus != "ready" {
		t.Fatalf("expected populated storage info, got %+v", data.DataStorage)
	}
	if data.DataStorage.LastProcessedAt != recordedAt {
		t.Fatalf("expected last processed at %q, got %q", recordedAt, data.DataStorage.LastProcessedAt)
	}
	if data.System.MachineID == "" || data.System.MachineName == "" {
		t.Fatalf("expected system machine identity, got %+v", data.System)
	}
}
