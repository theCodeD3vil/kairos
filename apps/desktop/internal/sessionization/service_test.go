package sessionization

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
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

func TestSessionsBeyondMergeThresholdDoNotMerge(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:04:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:20:00Z", "m1", "kairos", "go"),
		event("e4", "2026-04-05T09:22:00Z", "m1", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 2 {
		t.Fatalf("expected sessions beyond merge threshold to remain split, got %d", result.CreatedSessionCount)
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

func TestSessionsDoNotMergeAcrossDates(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T23:58:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-06T00:02:00Z", "m1", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForRange(context.Background(), "2026-04-05", "2026-04-06")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 2 {
		t.Fatalf("expected 2 date-separated sessions, got %d", result.CreatedSessionCount)
	}
}

func TestSessionsDoNotMergeAcrossProjects(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:04:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:12:00Z", "m1", "website", "go"),
		event("e4", "2026-04-05T09:14:00Z", "m1", "website", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 2 {
		t.Fatalf("expected project-separated sessions to remain split, got %d", result.CreatedSessionCount)
	}
}

func TestSessionsDoNotMergeAcrossWorkspacesEvenWhenProjectMatches(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		eventWith("e1", "2026-04-05T09:00:00Z", "m1", "workspace-1", "kairos", "go", "edit", "/workspace-1/main.go"),
		eventWith("e2", "2026-04-05T09:03:00Z", "m1", "workspace-2", "kairos", "go", "edit", "/workspace-2/main.go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 2 {
		t.Fatalf("expected workspace-separated sessions to remain split, got %d", result.CreatedSessionCount)
	}
}

func TestSessionsAreCreatedWithoutFilePath(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		eventWith("e1", "2026-04-05T09:00:00Z", "m1", "workspace-1", "kairos", "go", "edit", ""),
		eventWith("e2", "2026-04-05T09:03:00Z", "m1", "workspace-1", "kairos", "go", "save", ""),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 1 {
		t.Fatalf("expected one session without file paths, got %d", result.CreatedSessionCount)
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

func TestMergedDurationAndSourceEventCountAreRecomputed(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:02:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:10:00Z", "m1", "kairos", "go"),
		event("e4", "2026-04-05T09:12:00Z", "m1", "kairos", "go"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	sessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list sessions failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected 1 merged session, got %d", len(sessions))
	}
	if sessions[0].DurationMinutes != 12 {
		t.Fatalf("expected merged duration 12, got %d", sessions[0].DurationMinutes)
	}
	if sessions[0].SourceEventCount != 4 {
		t.Fatalf("expected merged source event count 4, got %d", sessions[0].SourceEventCount)
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

func TestRebuildPersistsMergedSessionsNotFragments(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:03:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:12:00Z", "m1", "kairos", "go"),
		event("e4", "2026-04-05T09:14:00Z", "m1", "kairos", "go"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}

	sessions, err := store.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list persisted sessions failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected persisted merged session only, got %d", len(sessions))
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

func TestTrackingThresholdSettingsAreApplied(t *testing.T) {
	service, store := newTestService(t)
	settingsService, ok := service.settings.(*desktopsettings.ServiceImpl)
	if !ok {
		t.Fatal("expected concrete settings service")
	}
	if _, err := settingsService.UpdateTrackingSettings(context.Background(), contracts.TrackingSettings{
		TrackingEnabled:              true,
		IdleDetectionEnabled:         true,
		TrackProjectActivity:         true,
		TrackLanguageActivity:        true,
		TrackMachineAttribution:      true,
		TrackSessionBoundaries:       true,
		IdleTimeoutMinutes:           20,
		SessionMergeThresholdMinutes: 0,
	}); err != nil {
		t.Fatalf("update tracking settings failed: %v", err)
	}

	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:12:00Z", "m1", "kairos", "go"),
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 1 {
		t.Fatalf("expected one session with expanded idle threshold, got %d", result.CreatedSessionCount)
	}
}

func TestLanguageSelectionAfterMergeIsDeterministic(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:02:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:10:00Z", "m1", "kairos", "typescript"),
		event("e4", "2026-04-05T09:12:00Z", "m1", "kairos", "typescript"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	sessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list sessions failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected merged session, got %d", len(sessions))
	}
	if sessions[0].Language != "go" {
		t.Fatalf("expected lexical tie-break to keep deterministic merged language 'go', got %q", sessions[0].Language)
	}
}

func TestMixedEventTypeContributionBehavior(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		eventWith("e1", "2026-04-05T09:00:00Z", "m1", "workspace-1", "kairos", "go", "edit", ""),
		eventWith("e2", "2026-04-05T09:02:00Z", "m1", "workspace-1", "kairos", "go", "save", ""),
		eventWith("e3", "2026-04-05T09:04:00Z", "m1", "workspace-1", "kairos", "go", "heartbeat", ""),
		eventWith("e4", "2026-04-05T09:06:00Z", "m1", "workspace-1", "kairos", "go", "open", ""),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	sessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list sessions failed: %v", err)
	}
	if len(sessions) != 1 {
		t.Fatalf("expected one mixed-event session, got %d", len(sessions))
	}
	if sessions[0].SourceEventCount != 3 {
		t.Fatalf("expected edit/save/heartbeat only to contribute, got %d", sessions[0].SourceEventCount)
	}
	if sessions[0].DurationMinutes != 4 {
		t.Fatalf("expected open event not to extend session duration, got %d", sessions[0].DurationMinutes)
	}
}

func TestPrivacyMaskedAndHiddenFilePathCasesStillCreateSessions(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		eventWith("e1", "2026-04-05T09:00:00Z", "m1", "workspace-1", "kairos", "go", "edit", "main.go"), // masked path
		eventWith("e2", "2026-04-05T09:03:00Z", "m1", "workspace-1", "kairos", "go", "edit", ""),        // hidden path
	})

	result, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("rebuild failed: %v", err)
	}
	if result.CreatedSessionCount != 1 {
		t.Fatalf("expected one session for masked/hidden file path mix, got %d", result.CreatedSessionCount)
	}
}

func TestRunningRebuildTwiceIsDeterministic(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		event("e1", "2026-04-05T09:00:00Z", "m1", "kairos", "go"),
		event("e2", "2026-04-05T09:04:00Z", "m1", "kairos", "go"),
		event("e3", "2026-04-05T09:12:00Z", "m1", "kairos", "typescript"),
		event("e4", "2026-04-05T09:14:00Z", "m1", "kairos", "typescript"),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("first rebuild failed: %v", err)
	}
	firstSessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list first rebuild sessions failed: %v", err)
	}

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("second rebuild failed: %v", err)
	}
	secondSessions, err := store.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list second rebuild sessions failed: %v", err)
	}

	if len(firstSessions) != len(secondSessions) {
		t.Fatalf("expected same session count across rebuilds, got %d and %d", len(firstSessions), len(secondSessions))
	}
	for index := range firstSessions {
		if firstSessions[index] != secondSessions[index] {
			t.Fatalf("expected deterministic rebuild output, got %+v and %+v", firstSessions[index], secondSessions[index])
		}
	}
}

func TestRebuildDeterministicWithReplayStyleMixedEventHistory(t *testing.T) {
	service, store := newTestService(t)
	mustInsertEvents(t, store, []contracts.ActivityEvent{
		eventWith("e3", "2026-04-05T09:02:00Z", "m1", "workspace-1", "kairos", "go", "save", ""),
		eventWith("e1", "2026-04-05T09:00:00Z", "m1", "workspace-1", "kairos", "go", "heartbeat", ""),
		eventWith("e2", "2026-04-05T09:00:00Z", "m1", "workspace-1", "kairos", "go", "edit", ""),
		eventWith("e4", "2026-04-05T09:04:00Z", "m1", "workspace-1", "kairos", "go", "open", ""),
	})

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("first rebuild failed: %v", err)
	}
	firstSessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list first rebuild sessions failed: %v", err)
	}

	if _, err := service.RebuildSessionsForDate(context.Background(), "2026-04-05"); err != nil {
		t.Fatalf("second rebuild failed: %v", err)
	}
	secondSessions, err := service.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list second rebuild sessions failed: %v", err)
	}

	if len(firstSessions) != len(secondSessions) {
		t.Fatalf("expected same session count across replay rebuilds, got %d and %d", len(firstSessions), len(secondSessions))
	}
	for index := range firstSessions {
		if firstSessions[index] != secondSessions[index] {
			t.Fatalf("expected deterministic replay rebuild output, got %+v and %+v", firstSessions[index], secondSessions[index])
		}
	}
}

func TestFilterSessionEventsKeepsConfiguredContributingEventTypes(t *testing.T) {
	events := []contracts.ActivityEvent{
		{ID: "e1", EventType: "edit", FilePath: "/workspace/main.go"},
		{ID: "e2", EventType: "edit", FilePath: ""},
		{ID: "e3", EventType: "save", FilePath: ""},
		{ID: "e4", EventType: "heartbeat", FilePath: ""},
		{ID: "e5", EventType: "open", FilePath: "/workspace/app.go"},
	}

	filtered := filterSessionEvents(events)
	if len(filtered) != 4 {
		t.Fatalf("expected 4 session events, got %d", len(filtered))
	}
	if filtered[0].ID != "e1" || filtered[1].ID != "e2" || filtered[2].ID != "e3" || filtered[3].ID != "e4" {
		t.Fatalf("unexpected filtered event IDs: %+v", filtered)
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

	settingsService := desktopsettings.NewService(sqliteStore)
	settingsService.SetDataStorageInfo(sqliteStore.Path(), "ready")

	service := NewService(sqliteStore, settingsService)
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
	return eventWith(id, timestamp, machineID, "workspace-1", project, language, "edit", "/workspace-1/main.go")
}

func eventWith(
	id string,
	timestamp string,
	machineID string,
	workspaceID string,
	project string,
	language string,
	eventType string,
	filePath string,
) contracts.ActivityEvent {
	return contracts.ActivityEvent{
		ID:          id,
		Timestamp:   timestamp,
		EventType:   eventType,
		MachineID:   machineID,
		WorkspaceID: workspaceID,
		ProjectName: project,
		Language:    language,
		FilePath:    filePath,
	}
}
