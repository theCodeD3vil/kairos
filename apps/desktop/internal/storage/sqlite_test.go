package storage

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestMigrationsRunOnFreshDatabase(t *testing.T) {
	store := openTestStore(t)

	if count, err := countQuery(context.Background(), store.db, `SELECT COUNT(*) FROM schema_migrations`); err != nil {
		t.Fatalf("count migrations: %v", err)
	} else if count != 1 {
		t.Fatalf("expected 1 migration, got %d", count)
	}
}

func TestMigrationsDoNotFailOnRerun(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "rerun.sqlite3")

	first, err := Open(ctx, dbPath)
	if err != nil {
		t.Fatalf("first open failed: %v", err)
	}
	_ = first.Close()

	second, err := Open(ctx, dbPath)
	if err != nil {
		t.Fatalf("second open failed: %v", err)
	}
	t.Cleanup(func() {
		_ = second.Close()
	})

	if count, err := countQuery(ctx, second.db, `SELECT COUNT(*) FROM schema_migrations`); err != nil {
		t.Fatalf("count migrations: %v", err)
	} else if count != 1 {
		t.Fatalf("expected 1 migration record after rerun, got %d", count)
	}
}

func TestEventInsertAndRecentReadWork(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	events := []contracts.ActivityEvent{
		{ID: "e1", Timestamp: "2026-04-05T09:00:00Z", EventType: "open", MachineID: "m1", WorkspaceID: "w1", ProjectName: "kairos", Language: "go"},
		{ID: "e2", Timestamp: "2026-04-05T10:00:00Z", EventType: "edit", MachineID: "m1", WorkspaceID: "w1", ProjectName: "kairos", Language: "typescript"},
	}

	if _, warnings, err := store.InsertEvents(ctx, events, "2026-04-05T10:30:00Z"); err != nil {
		t.Fatalf("insert events failed: %v", err)
	} else if len(warnings) != 0 {
		t.Fatalf("expected no warnings, got %+v", warnings)
	}

	recent, err := store.ListRecentEvents(ctx, 10)
	if err != nil {
		t.Fatalf("list recent events failed: %v", err)
	}

	if len(recent) != 2 {
		t.Fatalf("expected 2 recent events, got %d", len(recent))
	}

	if recent[0].ID != "e2" || recent[1].ID != "e1" {
		t.Fatalf("expected newest-first ordering, got %+v", recent)
	}
}

func TestMachineUpsertWorks(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	machine := contracts.MachineInfo{
		MachineID:   "m1",
		MachineName: "Kairos Mac",
		Hostname:    "kairos.local",
		OSPlatform:  "darwin",
		OSVersion:   "14.6",
		Arch:        "arm64",
	}
	if err := store.UpsertMachine(ctx, machine, "2026-04-05T10:00:00Z"); err != nil {
		t.Fatalf("first upsert failed: %v", err)
	}

	machine.MachineName = "Kairos Renamed"
	machine.Hostname = ""
	if err := store.UpsertMachine(ctx, machine, "2026-04-05T11:00:00Z"); err != nil {
		t.Fatalf("second upsert failed: %v", err)
	}

	found, ok, err := store.GetMachine(ctx, "m1")
	if err != nil {
		t.Fatalf("get machine failed: %v", err)
	}
	if !ok {
		t.Fatal("expected machine to exist")
	}
	if found.MachineName != "Kairos Renamed" {
		t.Fatalf("expected machine name update, got %q", found.MachineName)
	}
	if found.Hostname != "kairos.local" {
		t.Fatalf("expected hostname preserved, got %q", found.Hostname)
	}
}

func TestExtensionStatusUpsertAndReadWorks(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	status := contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           "vscode",
		ExtensionVersion: "0.1.0",
		LastEventAt:      "2026-04-05T10:00:00Z",
		LastHandshakeAt:  "2026-04-05T10:30:00Z",
	}
	if err := store.UpsertExtensionStatus(ctx, status, "2026-04-05T10:30:00Z"); err != nil {
		t.Fatalf("upsert extension status failed: %v", err)
	}

	found, err := store.GetExtensionStatus(ctx, "vscode")
	if err != nil {
		t.Fatalf("get extension status failed: %v", err)
	}

	if !found.Installed || !found.Connected {
		t.Fatalf("expected installed and connected, got %+v", found)
	}
	if found.ExtensionVersion != "0.1.0" {
		t.Fatalf("expected version 0.1.0, got %q", found.ExtensionVersion)
	}
}

func TestListAndCountMethodsReturnExpectedValues(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	if err := store.UpsertMachine(ctx, contracts.MachineInfo{
		MachineID: "m1", MachineName: "Kairos Mac", OSPlatform: "darwin",
	}, "2026-04-05T10:00:00Z"); err != nil {
		t.Fatalf("upsert machine failed: %v", err)
	}
	if _, warnings, err := store.InsertEvents(ctx, []contracts.ActivityEvent{
		{ID: "e1", Timestamp: "2026-04-05T09:00:00Z", EventType: "open", MachineID: "m1", WorkspaceID: "w1", ProjectName: "kairos", Language: "go"},
	}, "2026-04-05T09:05:00Z"); err != nil {
		t.Fatalf("insert events failed: %v", err)
	} else if len(warnings) != 0 {
		t.Fatalf("expected no warnings, got %+v", warnings)
	}

	totalAccepted, err := store.CountAcceptedEvents(ctx)
	if err != nil {
		t.Fatalf("count events failed: %v", err)
	}
	if totalAccepted != 1 {
		t.Fatalf("expected 1 accepted event, got %d", totalAccepted)
	}

	totalMachines, err := store.CountKnownMachines(ctx)
	if err != nil {
		t.Fatalf("count machines failed: %v", err)
	}
	if totalMachines != 1 {
		t.Fatalf("expected 1 known machine, got %d", totalMachines)
	}

	lastEventAt, err := store.GetLastEventTimestamp(ctx)
	if err != nil {
		t.Fatalf("get last event failed: %v", err)
	}
	if lastEventAt != "2026-04-05T09:00:00Z" {
		t.Fatalf("expected last event timestamp, got %q", lastEventAt)
	}

	lastIngestedAt, err := store.GetLastIngestedAt(ctx)
	if err != nil {
		t.Fatalf("get last ingested at failed: %v", err)
	}
	if lastIngestedAt != "2026-04-05T09:05:00Z" {
		t.Fatalf("expected last ingested timestamp, got %q", lastIngestedAt)
	}
}

func openTestStore(t *testing.T) *Store {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "kairos-test.sqlite3")
	store, err := Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open test store: %v", err)
	}

	t.Cleanup(func() {
		_ = store.Close()
	})

	return store
}
