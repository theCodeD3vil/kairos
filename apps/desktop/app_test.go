package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestNewAppInitializesWithExistingDatabase(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos.sqlite3")
	t.Setenv("KAIROS_DATABASE_PATH", dbPath)
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", "0")

	store, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open seeded sqlite store: %v", err)
	}
	if err := store.UpsertMachine(context.Background(), contracts.MachineInfo{
		MachineID:   "machine-1",
		MachineName: "Kairos Mac",
		OSPlatform:  "darwin",
	}, "2026-04-06T10:00:00Z"); err != nil {
		t.Fatalf("seed machine: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close seeded sqlite store: %v", err)
	}

	app := NewApp()
	if app.initErr != nil {
		t.Fatalf("expected app initialization to succeed, got %v", app.initErr)
	}
	if app.sqliteStore == nil {
		t.Fatalf("expected sqlite store to be initialized")
	}
	if app.localServer == nil || app.localServer.Address() == "" {
		t.Fatalf("expected local server to be initialized")
	}

	app.shutdown(context.Background())
}

func TestNewAppRebuildsSessionsWhenEventsExistButSessionsAreMissing(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos.sqlite3")
	t.Setenv("KAIROS_DATABASE_PATH", dbPath)
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", "0")

	store, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open seeded sqlite store: %v", err)
	}
	machine := contracts.MachineInfo{
		MachineID:   "machine-1",
		MachineName: "Kairos Mac",
		OSPlatform:  "darwin",
	}
	status := contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           "vscode",
		ExtensionVersion: "0.1.1",
		LastEventAt:      "2026-04-06T10:05:00Z",
		LastHandshakeAt:  "2026-04-06T10:05:00Z",
	}
	events := []contracts.ActivityEvent{
		{
			ID:          "evt-1",
			Timestamp:   "2026-04-06T10:00:00Z",
			EventType:   "open",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "typescript",
			FilePath:    "/workspace-1/README.md",
		},
		{
			ID:          "evt-2",
			Timestamp:   "2026-04-06T10:05:00Z",
			EventType:   "edit",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "typescript",
			FilePath:    "/workspace-1/main.ts",
		},
	}
	if _, err := store.PersistIngestionBatch(context.Background(), machine, status, events, "2026-04-06T10:05:00Z"); err != nil {
		t.Fatalf("seed ingestion batch: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close seeded sqlite store: %v", err)
	}

	app := NewApp()
	if app.initErr != nil {
		t.Fatalf("expected app initialization to succeed, got %v", app.initErr)
	}

	sessions, err := app.sqliteStore.ListSessionsForDate(context.Background(), "2026-04-06")
	if err != nil {
		t.Fatalf("list rebuilt sessions: %v", err)
	}
	if len(sessions) == 0 {
		t.Fatal("expected startup to rebuild missing sessions")
	}

	app.shutdown(context.Background())
}

func TestNewAppFailsClearlyWhenDatabaseInitializationFails(t *testing.T) {
	base := t.TempDir()
	blockingFile := filepath.Join(base, "not-a-directory")
	if err := os.WriteFile(blockingFile, []byte("block"), 0o644); err != nil {
		t.Fatalf("write blocking file: %v", err)
	}

	t.Setenv("KAIROS_DATABASE_PATH", filepath.Join(blockingFile, "kairos.sqlite3"))
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", "0")

	app := NewApp()
	if app.initErr == nil {
		t.Fatalf("expected app initialization to fail")
	}
	if !strings.Contains(app.initErr.Error(), "initialize sqlite store") {
		t.Fatalf("expected sqlite init failure, got %v", app.initErr)
	}
}
