package storage

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestMigrationsRunOnFreshDatabase(t *testing.T) {
	store := openTestStore(t)

	if count, err := countQuery(context.Background(), store.db, `SELECT COUNT(*) FROM schema_migrations`); err != nil {
		t.Fatalf("count migrations: %v", err)
	} else if count != 6 {
		t.Fatalf("expected 6 migrations, got %d", count)
	}

	status, err := store.GetMigrationStatus(context.Background())
	if err != nil {
		t.Fatalf("get migration status: %v", err)
	}
	if status.CurrentVersion != "006_extension_status_enrichment.sql" {
		t.Fatalf("expected latest migration version, got %q", status.CurrentVersion)
	}

	rows, err := store.db.QueryContext(context.Background(), `PRAGMA table_info(extension_status)`)
	if err != nil {
		t.Fatalf("read extension_status schema: %v", err)
	}
	t.Cleanup(func() {
		_ = rows.Close()
	})
	columns := map[string]bool{}
	for rows.Next() {
		var cid int
		var name string
		var columnType string
		var notNull int
		var defaultValue sql.NullString
		var pk int
		if err := rows.Scan(&cid, &name, &columnType, &notNull, &defaultValue, &pk); err != nil {
			t.Fatalf("scan extension_status schema row: %v", err)
		}
		columns[name] = true
	}
	for _, required := range []string{
		"editor_version",
		"pending_event_count",
		"oldest_pending_event_at",
		"quarantined_event_count",
		"outbox_size_bytes",
		"last_successful_sync_at",
		"desktop_instance_seen",
	} {
		if !columns[required] {
			t.Fatalf("expected extension_status column %q to exist after migration", required)
		}
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
	} else if count != 6 {
		t.Fatalf("expected 6 migration records after rerun, got %d", count)
	}
}

func TestOpenSecuresDatabaseFilesystemPermissions(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("permission bits are platform specific on windows")
	}

	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "secure.sqlite3")

	store, err := Open(ctx, dbPath)
	if err != nil {
		t.Fatalf("open secure sqlite store: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})

	info, err := os.Stat(dbPath)
	if err != nil {
		t.Fatalf("stat sqlite file: %v", err)
	}
	if perms := info.Mode().Perm(); perms != 0o600 {
		t.Fatalf("expected sqlite file permissions 0600, got %o", perms)
	}

	dirInfo, err := os.Stat(filepath.Dir(dbPath))
	if err != nil {
		t.Fatalf("stat sqlite directory: %v", err)
	}
	if perms := dirInfo.Mode().Perm(); perms != 0o700 {
		t.Fatalf("expected sqlite directory permissions 0700, got %o", perms)
	}
}

func TestMigrationsUpgradeFromLegacyVersionOnReopen(t *testing.T) {
	ctx := context.Background()
	dbPath := filepath.Join(t.TempDir(), "legacy-upgrade.sqlite3")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open legacy sqlite database: %v", err)
	}
	store := &Store{
		db:   db,
		path: dbPath,
	}

	migrations, err := loadMigrations(migrationFiles)
	if err != nil {
		t.Fatalf("load migrations: %v", err)
	}
	if len(migrations) < 6 {
		t.Fatalf("expected at least 6 migrations, got %d", len(migrations))
	}
	if err := store.runMigrations(ctx, migrations[:5]); err != nil {
		t.Fatalf("apply legacy migrations failed: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close legacy store failed: %v", err)
	}

	upgraded, err := Open(ctx, dbPath)
	if err != nil {
		t.Fatalf("open upgraded store failed: %v", err)
	}
	t.Cleanup(func() {
		_ = upgraded.Close()
	})

	status, err := upgraded.GetMigrationStatus(ctx)
	if err != nil {
		t.Fatalf("get migration status after upgrade: %v", err)
	}
	if status.CurrentVersion != "006_extension_status_enrichment.sql" {
		t.Fatalf("expected latest migration after upgrade, got %q", status.CurrentVersion)
	}
	if status.AppliedMigrationCount != 6 {
		t.Fatalf("expected 6 applied migrations after upgrade, got %d", status.AppliedMigrationCount)
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

	pendingCount := 12
	quarantinedCount := 3
	outboxSizeBytes := int64(32768)
	status := contracts.ExtensionStatus{
		Installed:             true,
		Connected:             true,
		Editor:                "vscode",
		EditorVersion:         "1.99.0",
		ExtensionVersion:      "0.1.0",
		LastEventAt:           "2026-04-05T10:00:00Z",
		LastHandshakeAt:       "2026-04-05T10:30:00Z",
		PendingEventCount:     &pendingCount,
		OldestPendingEventAt:  "2026-04-05T09:59:00Z",
		QuarantinedEventCount: &quarantinedCount,
		OutboxSizeBytes:       &outboxSizeBytes,
		LastSuccessfulSyncAt:  "2026-04-05T10:25:00Z",
		DesktopInstanceSeen:   "desktop-instance-1",
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
	if found.EditorVersion != "1.99.0" || found.PendingEventCount == nil || *found.PendingEventCount != pendingCount {
		t.Fatalf("expected enriched extension status persistence, got %+v", found)
	}
	if found.QuarantinedEventCount == nil || *found.QuarantinedEventCount != quarantinedCount {
		t.Fatalf("expected quarantined count %d, got %+v", quarantinedCount, found)
	}
	if found.OutboxSizeBytes == nil || *found.OutboxSizeBytes != outboxSizeBytes {
		t.Fatalf("expected outbox size bytes %d, got %+v", outboxSizeBytes, found)
	}

	// Backward-compatible partial updates should not clear previously reported optional metrics.
	if err := store.UpsertExtensionStatus(ctx, contracts.ExtensionStatus{
		Installed: true,
		Connected: true,
		Editor:    "vscode",
	}, "2026-04-05T11:00:00Z"); err != nil {
		t.Fatalf("partial upsert extension status failed: %v", err)
	}
	updated, err := store.GetExtensionStatus(ctx, "vscode")
	if err != nil {
		t.Fatalf("get updated extension status failed: %v", err)
	}
	if updated.PendingEventCount == nil || *updated.PendingEventCount != pendingCount {
		t.Fatalf("expected pending count to be retained on partial update, got %+v", updated)
	}
	if updated.OutboxSizeBytes == nil || *updated.OutboxSizeBytes != outboxSizeBytes {
		t.Fatalf("expected outbox size to be retained on partial update, got %+v", updated)
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

func TestGetOrCreateDesktopInstanceIDIsStable(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	first, err := store.GetOrCreateDesktopInstanceID(ctx)
	if err != nil {
		t.Fatalf("get or create desktop instance id failed: %v", err)
	}
	if first == "" {
		t.Fatal("expected non-empty desktop instance id")
	}

	second, err := store.GetOrCreateDesktopInstanceID(ctx)
	if err != nil {
		t.Fatalf("second get or create desktop instance id failed: %v", err)
	}
	if second != first {
		t.Fatalf("expected stable desktop instance id, got %q and %q", first, second)
	}
}

func TestGetLatestSettingsUpdatedAtHandlesEmptyAndFilledState(t *testing.T) {
	store := openTestStore(t)
	ctx := context.Background()

	empty, err := store.GetLatestSettingsUpdatedAt(ctx)
	if err != nil {
		t.Fatalf("get latest settings updated at on empty store failed: %v", err)
	}
	if empty != "" {
		t.Fatalf("expected empty updated_at for empty settings sections, got %q", empty)
	}

	if err := store.SetSettingsSection(ctx, "general", `{"machineDisplayName":"Kairos"}`, "2026-04-07T12:00:00Z"); err != nil {
		t.Fatalf("set general settings section failed: %v", err)
	}
	if err := store.SetSettingsSection(ctx, "tracking", `{"trackingEnabled":true}`, "2026-04-07T12:30:00Z"); err != nil {
		t.Fatalf("set tracking settings section failed: %v", err)
	}

	latest, err := store.GetLatestSettingsUpdatedAt(ctx)
	if err != nil {
		t.Fatalf("get latest settings updated at failed: %v", err)
	}
	if latest != "2026-04-07T12:30:00Z" {
		t.Fatalf("expected latest updated_at to be 2026-04-07T12:30:00Z, got %q", latest)
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
