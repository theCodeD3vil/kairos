package storage

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestMigrationsRunOnFreshDatabase(t *testing.T) {
	store := openTestStore(t)

	if count, err := countQuery(context.Background(), store.db, `SELECT COUNT(*) FROM schema_migrations`); err != nil {
		t.Fatalf("count migrations: %v", err)
	} else if count != 4 {
		t.Fatalf("expected 4 migrations, got %d", count)
	}

	status, err := store.GetMigrationStatus(context.Background())
	if err != nil {
		t.Fatalf("get migration status: %v", err)
	}
	if status.CurrentVersion != "004_settings.sql" {
		t.Fatalf("expected latest migration version, got %q", status.CurrentVersion)
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
	} else if count != 4 {
		t.Fatalf("expected 4 migration records after rerun, got %d", count)
	}
}

func TestMigrationFailureStopsCleanly(t *testing.T) {
	store := openTestStore(t)
	err := store.runMigrations(context.Background(), []migrationDefinition{
		{Version: "999_bad.sql", SQL: "THIS IS NOT SQL;"},
	})
	if err == nil {
		t.Fatal("expected invalid migration to fail")
	}
	if !strings.Contains(err.Error(), "999_bad.sql") {
		t.Fatalf("expected migration version in error, got %v", err)
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

func TestSessionsRepositoryReadsReturnCorrectOrderingAndCounts(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	sessions := []contracts.Session{
		{ID: "s1", Date: "2026-04-05", StartTime: "2026-04-05T09:00:00Z", EndTime: "2026-04-05T09:10:00Z", DurationMinutes: 10, MachineID: "m1", ProjectName: "kairos", Language: "go", SourceEventCount: 3},
		{ID: "s2", Date: "2026-04-06", StartTime: "2026-04-06T11:00:00Z", EndTime: "2026-04-06T11:30:00Z", DurationMinutes: 30, MachineID: "m1", ProjectName: "kairos", Language: "typescript", SourceEventCount: 5},
	}
	if err := store.InsertSessions(ctx, sessions, "2026-04-07T12:00:00Z"); err != nil {
		t.Fatalf("insert sessions failed: %v", err)
	}

	recent, err := store.ListRecentSessions(ctx, 10)
	if err != nil {
		t.Fatalf("list recent sessions failed: %v", err)
	}
	if len(recent) != 2 || recent[0].ID != "s2" || recent[1].ID != "s1" {
		t.Fatalf("unexpected recent sessions ordering: %+v", recent)
	}

	stats, err := store.GetSessionStatsForRange(ctx, "2026-04-05", "2026-04-06")
	if err != nil {
		t.Fatalf("get session stats failed: %v", err)
	}
	if stats.TotalSessions != 2 || stats.LongestSessionMinutes != 30 || stats.AverageSessionMinutes != 20 {
		t.Fatalf("unexpected session stats: %+v", stats)
	}
}

func TestSettingsRepositoryCRUDWorks(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	if err := store.SetSettingsSection(ctx, "general", `{"machineDisplayName":"Kairos"}`, "2026-04-07T12:00:00Z"); err != nil {
		t.Fatalf("set settings section failed: %v", err)
	}

	payload, found, err := store.GetSettingsSection(ctx, "general")
	if err != nil {
		t.Fatalf("get settings section failed: %v", err)
	}
	if !found || payload == "" {
		t.Fatalf("expected stored section payload, got found=%v payload=%q", found, payload)
	}

	sections, err := store.ListSettingsSections(ctx)
	if err != nil {
		t.Fatalf("list settings sections failed: %v", err)
	}
	if len(sections) != 1 || sections[0] != "general" {
		t.Fatalf("unexpected settings sections: %+v", sections)
	}

	if err := store.DeleteSettingsSection(ctx, "general"); err != nil {
		t.Fatalf("delete settings section failed: %v", err)
	}
	if _, found, err := store.GetSettingsSection(ctx, "general"); err != nil {
		t.Fatalf("get deleted section failed: %v", err)
	} else if found {
		t.Fatal("expected deleted section to be absent")
	}
}

func TestOpenFailsClearlyForInvalidPath(t *testing.T) {
	_, err := Open(context.Background(), t.TempDir())
	if err == nil {
		t.Fatal("expected opening a directory as sqlite database to fail")
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
