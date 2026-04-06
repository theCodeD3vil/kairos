package sessionization

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestContiguousEventsBecomeOneSession(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:03:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:04:00Z", "m1", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 1 {
		t.Fatalf("expected 1 session, got %d", result.CreatedSessionCount)
	}
}

func TestIdleThresholdSplitsSessions(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:04:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:20:00Z", "m1", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 2 {
		t.Fatalf("expected 2 sessions, got %d", result.CreatedSessionCount)
	}
}

func TestMergeThresholdMergesNearbySessions(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:04:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:12:00Z", "m1", "kairos", "go"),
		event("e4", "2026-04-05T09:14:00Z", "m1", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 1 {
		t.Fatalf("expected merge-threshold session collapse to 1 session, got %d", result.CreatedSessionCount)
	}
}

func TestSessionsDoNotMergeAcrossMachines(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:02:00Z", "m2", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 2 {
		t.Fatalf("expected 2 sessions, got %d", result.CreatedSessionCount)
	}
}

func TestDominantProjectSelectionWorks(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:01:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:02:00Z", "m1", "cli", "go"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	sessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list sessions failed: %v", err)
	}
	if sessions[0].ProjectName != "kairos" {
		t.Fatalf("expected dominant project kairos, got %q", sessions[0].ProjectName)
	}
}

func TestDominantLanguageSelectionWorks(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:01:00Z", "m1", "kairos", "typescript"),
		event("e3", "2026-04-05T09:02:00Z", "m1", "kairos", "typescript"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	sessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list sessions failed: %v", err)
	}
	if sessions[0].Language != "typescript" {
		t.Fatalf("expected dominant language typescript, got %q", sessions[0].Language)
	}
}

func TestDurationCalculationIsConsistent(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:06:00Z", "m1", "kairos", "go"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	sessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list sessions failed: %v", err)
	}
	if sessions[0].DurationMinutes != 6 {
		t.Fatalf("expected duration 6 minutes, got %d", sessions[0].DurationMinutes)
	}
}

func TestRebuildRangeDeletesAndRecreatesSessions(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-06T09:00:00Z", "m1", "kairos", "go"),
	})

	if _, err := service.RebuildSessionsForRange(context.Background(), "2026-04-05", "2026-04-06"); err != nil {
		t.Fatalf("initial rebuild failed: %v", err)
	}

	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e3", "2026-04-05T09:03:00Z", "m1", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("second rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 1 {
		t.Fatalf("expected rebuilt day to still have 1 session, got %d", result.CreatedSessionCount)
	}

	sessions, err := service.ListSessionsForRange(context.Background(), "2026-04-05", "2026-04-06")
	if err != nil {
		t.Fatalf("list sessions failed: %v", err)
	}
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions in range, got %d", len(sessions))
	}
	if sessions[0].SourceEventCount != 2 {
		t.Fatalf("expected rebuilt day session to include 2 events, got %d", sessions[0].SourceEventCount)
	}
}

func TestSessionRepositoryReadsReturnCorrectStats(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:02:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T10:00:00Z", "m1", "kairos", "go"),
		event("e4", "2026-04-05T10:04:00Z", "m1", "kairos", "go"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}

	stats, err := service.GetSessionStatsForRange(context.Background(), "2026-04-05", "2026-04-05")
	if err != nil {
		t.Fatalf("stats failed: %v", err)
	}
	if stats.TotalSessions != 2 {
		t.Fatalf("expected 2 sessions, got %d", stats.TotalSessions)
	}
	if stats.LongestSessionMinutes != 4 {
		t.Fatalf("expected longest session 4, got %d", stats.LongestSessionMinutes)
	}
}

func newTestService(t *testing.T) (*ServiceImpl, *storage.Store) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "kairos-sessions.sqlite3")
	sqliteStore, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite store: %v", err)
	}
	t.Cleanup(func() {
		_ = sqliteStore.Close()
	})

	service := NewService(sqliteStore)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 7, 12, 0, 0, 0, time.UTC)
	}
	return service, sqliteStore
}

func mustInsertEvents(t *testing.T, store *storage.Store, events []contracts.ActivityEvent) {
	t.Helper()
	if _, warnings, err := store.InsertEvents(context.Background(), events, "2026-04-07T12:00:00Z"); err != nil {
		t.Fatalf("insert events failed: %v", err)
	} else if len(warnings) != 0 {
		t.Fatalf("unexpected warnings: %+v", warnings)
	}
}

func event(id string, timestamp string, machineID string, project string, language string) contracts.ActivityEvent {
	return contracts.ActivityEvent{
		ID:          id,
		Timestamp:   timestamp,
		EventType:   "edit",
		MachineID:   machineID,
		WorkspaceID: "workspace-1",
		ProjectName: project,
		Language:    language,
	}
}
