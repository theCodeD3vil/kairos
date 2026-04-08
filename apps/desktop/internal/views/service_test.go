package views

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestGetOverviewDataAssemblesFromPersistedState(t *testing.T) {
	service, _ := newTestViewService(t)

	data, err := service.GetOverviewData(context.Background())
	if err != nil {
		t.Fatalf("GetOverviewData failed: %v", err)
	}

	if data.TodayMinutes != 30 {
		t.Fatalf("expected today minutes 30, got %d", data.TodayMinutes)
	}
	if data.WeekMinutes != 165 {
		t.Fatalf("expected week minutes 165, got %d", data.WeekMinutes)
	}
	if data.SessionCount != 4 {
		t.Fatalf("expected 4 sessions, got %d", data.SessionCount)
	}
	if data.CodingDaysThisWeek != 3 {
		t.Fatalf("expected 3 coding days, got %d", data.CodingDaysThisWeek)
	}
	if len(data.TopProjects) == 0 || data.TopProjects[0].ProjectName != "kairos-desktop" {
		t.Fatalf("expected kairos-desktop as top project, got %+v", data.TopProjects)
	}
	if len(data.TopLanguages) == 0 || data.TopLanguages[0].Language != "typescript" {
		t.Fatalf("expected typescript as top language, got %+v", data.TopLanguages)
	}
	if len(data.RecentSessions) == 0 || data.RecentSessions[0].MachineName != "Kairos Mac" {
		t.Fatalf("expected decorated recent sessions, got %+v", data.RecentSessions)
	}
	if len(data.WeeklyTrend) != 7 {
		t.Fatalf("expected 7 weekly trend points, got %d", len(data.WeeklyTrend))
	}
	if data.WeeklyTrend[0].Date != "2026-04-06" || data.WeeklyTrend[0].TotalMinutes != 45 {
		t.Fatalf("unexpected first weekly trend point: %+v", data.WeeklyTrend[0])
	}
	if data.ActiveHoursSummary != "08:30 - 12:00" {
		t.Fatalf("expected active hours summary 08:30 - 12:00, got %q", data.ActiveHoursSummary)
	}
	if data.CurrentMachine == nil || data.CurrentMachine.MachineName == "" {
		t.Fatalf("expected current machine info, got %+v", data.CurrentMachine)
	}
}

func TestGetCalendarMonthDataIncludesActiveAndInactiveDays(t *testing.T) {
	service, _ := newTestViewService(t)

	data, err := service.GetCalendarMonthData(context.Background(), "2026-04")
	if err != nil {
		t.Fatalf("GetCalendarMonthData failed: %v", err)
	}

	if len(data.Days) != 30 {
		t.Fatalf("expected 30 day summaries, got %d", len(data.Days))
	}
	if data.Days[0].Date != "2026-04-01" || data.Days[0].HadActivity {
		t.Fatalf("expected inactive first day, got %+v", data.Days[0])
	}
	if data.Days[6].Date != "2026-04-07" || !data.Days[6].HadActivity || data.Days[6].TotalMinutes != 90 {
		t.Fatalf("unexpected active day summary: %+v", data.Days[6])
	}
}

func TestGetCalendarDayDataHandlesActiveAndInactiveDates(t *testing.T) {
	service, _ := newTestViewService(t)

	active, err := service.GetCalendarDayData(context.Background(), "2026-04-07")
	if err != nil {
		t.Fatalf("GetCalendarDayData active failed: %v", err)
	}
	if !active.HadActivity || active.TotalMinutes != 90 || active.SessionCount != 2 {
		t.Fatalf("unexpected active day payload: %+v", active)
	}
	if active.FirstActiveAt != "2026-04-07T10:00:00Z" || active.LastActiveAt != "2026-04-07T11:55:00Z" {
		t.Fatalf("unexpected active time window: first=%q last=%q", active.FirstActiveAt, active.LastActiveAt)
	}
	if active.TopProject != "api" || active.TopLanguage != "go" {
		t.Fatalf("unexpected active day top breakdown: %+v", active)
	}

	inactive, err := service.GetCalendarDayData(context.Background(), "2026-04-10")
	if err != nil {
		t.Fatalf("GetCalendarDayData inactive failed: %v", err)
	}
	if inactive.HadActivity || inactive.TotalMinutes != 0 || len(inactive.Sessions) != 0 {
		t.Fatalf("unexpected inactive day payload: %+v", inactive)
	}
}

func TestGetSessionsPageDataReturnsStatsAndNewestFirst(t *testing.T) {
	service, _ := newTestViewService(t)

	data, err := service.GetSessionsPageData(context.Background(), "week")
	if err != nil {
		t.Fatalf("GetSessionsPageData failed: %v", err)
	}

	if data.TotalSessions != 4 {
		t.Fatalf("expected 4 sessions, got %d", data.TotalSessions)
	}
	if data.AverageSessionMinutes != 41 {
		t.Fatalf("expected average 41, got %d", data.AverageSessionMinutes)
	}
	if data.LongestSessionMinutes != 60 {
		t.Fatalf("expected longest 60, got %d", data.LongestSessionMinutes)
	}
	if len(data.Sessions) == 0 || data.Sessions[0].ID != "s4" {
		t.Fatalf("expected newest session first, got %+v", data.Sessions)
	}
}

func TestGetAnalyticsDataSummarizesCurrentAndPreviousPeriod(t *testing.T) {
	service, _ := newTestViewService(t)

	data, err := service.GetAnalyticsData(context.Background(), "last-7-days")
	if err != nil {
		t.Fatalf("GetAnalyticsData failed: %v", err)
	}

	if data.TotalMinutes != 165 {
		t.Fatalf("expected total minutes 165, got %d", data.TotalMinutes)
	}
	if data.ActiveDays != 3 {
		t.Fatalf("expected 3 active days, got %d", data.ActiveDays)
	}
	if data.LongestDayMinutes != 90 {
		t.Fatalf("expected longest day 90, got %d", data.LongestDayMinutes)
	}
	if data.PreviousPeriodMinutes == nil || *data.PreviousPeriodMinutes != 0 {
		t.Fatalf("expected previous period minutes 0, got %+v", data.PreviousPeriodMinutes)
	}
	if len(data.ProjectSummaries) == 0 || data.ProjectSummaries[0].ProjectName != "kairos-desktop" {
		t.Fatalf("unexpected project summaries: %+v", data.ProjectSummaries)
	}
	if len(data.MachineSummaries) != 2 {
		t.Fatalf("expected 2 machine summaries, got %d", len(data.MachineSummaries))
	}
}

func TestProjectNameNormalizationCollapsesWorkspaceSentinels(t *testing.T) {
	sessions := []contracts.Session{
		{
			ID:              "a",
			Date:            "2026-04-01",
			EndTime:         "2026-04-01T10:00:00Z",
			DurationMinutes: 10,
			ProjectName:     "untitled-workspace",
		},
		{
			ID:              "b",
			Date:            "2026-04-02",
			EndTime:         "2026-04-02T10:00:00Z",
			DurationMinutes: 20,
			ProjectName:     " no-workspace ",
		},
		{
			ID:              "c",
			Date:            "2026-04-03",
			EndTime:         "2026-04-03T10:00:00Z",
			DurationMinutes: 30,
			ProjectName:     "kairos-desktop",
		},
	}

	summaries := buildProjectSummaries(sessions)
	if len(summaries) != 2 {
		t.Fatalf("expected 2 summary buckets after normalization, got %+v", summaries)
	}
	if summaries[0].ProjectName != noWorkspaceSentinel {
		t.Fatalf("expected merged sentinel bucket %q, got %+v", noWorkspaceSentinel, summaries)
	}
	if summaries[0].TotalMinutes != 30 {
		t.Fatalf("expected merged sentinel minutes 30, got %+v", summaries[0])
	}

	decorated := decorateSessions(sessions, map[string]contracts.MachineInfo{})
	if decorated[0].ProjectName != noWorkspaceSentinel {
		t.Fatalf("expected legacy sentinel to normalize, got %+v", decorated[0])
	}
	if decorated[1].ProjectName != noWorkspaceSentinel {
		t.Fatalf("expected whitespace sentinel to normalize, got %+v", decorated[1])
	}
	if decorated[2].ProjectName != "kairos-desktop" {
		t.Fatalf("expected regular project name unchanged, got %+v", decorated[2])
	}
}

func TestViewMethodsReturnCoherentEmptyStates(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos-empty.sqlite3")
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
		return time.Date(2026, time.April, 8, 12, 0, 0, 0, time.UTC)
	}

	overview, err := service.GetOverviewData(context.Background())
	if err != nil {
		t.Fatalf("GetOverviewData failed: %v", err)
	}
	if overview.TodayMinutes != 0 || overview.WeekMinutes != 0 || len(overview.RecentSessions) != 0 {
		t.Fatalf("expected empty overview payload, got %+v", overview)
	}

	analytics, err := service.GetAnalyticsData(context.Background(), "last-7-days")
	if err != nil {
		t.Fatalf("GetAnalyticsData failed: %v", err)
	}
	if analytics.TotalMinutes != 0 || analytics.SessionCount != 0 {
		t.Fatalf("expected empty analytics payload, got %+v", analytics)
	}
	if len(analytics.DailyTotals) != 7 {
		t.Fatalf("expected zero-filled daily totals, got %+v", analytics.DailyTotals)
	}
	for _, total := range analytics.DailyTotals {
		if total.TotalMinutes != 0 {
			t.Fatalf("expected zero-minute daily total, got %+v", total)
		}
	}

	sessions, err := service.GetSessionsPageData(context.Background(), "week")
	if err != nil {
		t.Fatalf("GetSessionsPageData failed: %v", err)
	}
	if sessions.TotalSessions != 0 || len(sessions.Sessions) != 0 {
		t.Fatalf("expected empty sessions payload, got %+v", sessions)
	}

	month, err := service.GetCalendarMonthData(context.Background(), "2026-04")
	if err != nil {
		t.Fatalf("GetCalendarMonthData failed: %v", err)
	}
	if len(month.Days) != 30 {
		t.Fatalf("expected full month grid for empty calendar, got %d days", len(month.Days))
	}
	if month.Days[0].HadActivity {
		t.Fatalf("expected first day to be inactive, got %+v", month.Days[0])
	}

	day, err := service.GetCalendarDayData(context.Background(), "2026-04-08")
	if err != nil {
		t.Fatalf("GetCalendarDayData failed: %v", err)
	}
	if day.HadActivity || day.TotalMinutes != 0 || len(day.Sessions) != 0 {
		t.Fatalf("expected empty day payload, got %+v", day)
	}
}

func newTestViewService(t *testing.T) (*ServiceImpl, *storage.Store) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "kairos-views.sqlite3")
	sqliteStore, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite store: %v", err)
	}
	t.Cleanup(func() {
		_ = sqliteStore.Close()
	})

	seedViewTestStore(t, sqliteStore)

	settingsService := desktopsettings.NewService(sqliteStore)
	settingsService.SetDataStorageInfo(sqliteStore.Path(), "ready")

	service := NewService(sqliteStore, settingsService)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 8, 12, 0, 0, 0, time.UTC)
	}

	return service, sqliteStore
}

func seedViewTestStore(t *testing.T, store *storage.Store) {
	t.Helper()

	ctx := context.Background()
	recordedAt := "2026-04-08T12:00:00Z"

	machines := []contracts.MachineInfo{
		{
			MachineID:   "m1",
			MachineName: "Kairos Mac",
			Hostname:    "kairos-mac.local",
			OSPlatform:  "darwin",
			OSVersion:   "14.6",
			Arch:        "arm64",
		},
		{
			MachineID:   "m2",
			MachineName: "Dev Box",
			Hostname:    "dev-box.local",
			OSPlatform:  "linux",
			OSVersion:   "24.04",
			Arch:        "x86_64",
		},
	}
	for _, machine := range machines {
		if err := store.UpsertMachine(ctx, machine, recordedAt); err != nil {
			t.Fatalf("upsert machine failed: %v", err)
		}
	}

	if err := store.UpsertExtensionStatus(ctx, contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           "vscode",
		ExtensionVersion: "1.2.3",
		LastEventAt:      "2026-04-08T09:00:00Z",
		LastHandshakeAt:  recordedAt,
	}, recordedAt); err != nil {
		t.Fatalf("upsert extension status failed: %v", err)
	}

	events := []contracts.ActivityEvent{
		event("e1", "2026-04-06T09:00:00Z", "m1", "kairos-desktop", "typescript"),
		event("e2", "2026-04-06T09:45:00Z", "m1", "kairos-desktop", "typescript"),
		event("e3", "2026-04-07T10:00:00Z", "m1", "kairos-desktop", "typescript"),
		event("e4", "2026-04-07T11:00:00Z", "m2", "api", "go"),
		event("e5", "2026-04-07T11:55:00Z", "m2", "api", "go"),
		event("e6", "2026-04-08T09:00:00Z", "m1", "kairos-desktop", "typescript"),
	}
	if _, warnings, err := store.InsertEvents(ctx, events, recordedAt); err != nil {
		t.Fatalf("insert events failed: %v", err)
	} else if len(warnings) != 0 {
		t.Fatalf("unexpected warnings: %+v", warnings)
	}

	sessions := []contracts.Session{
		{
			ID:               "s1",
			Date:             "2026-04-06",
			StartTime:        "2026-04-06T09:00:00Z",
			EndTime:          "2026-04-06T09:45:00Z",
			DurationMinutes:  45,
			ProjectName:      "kairos-desktop",
			Language:         "typescript",
			MachineID:        "m1",
			SourceEventCount: 2,
		},
		{
			ID:               "s2",
			Date:             "2026-04-07",
			StartTime:        "2026-04-07T10:00:00Z",
			EndTime:          "2026-04-07T10:30:00Z",
			DurationMinutes:  30,
			ProjectName:      "kairos-desktop",
			Language:         "typescript",
			MachineID:        "m1",
			SourceEventCount: 1,
		},
		{
			ID:               "s3",
			Date:             "2026-04-07",
			StartTime:        "2026-04-07T11:00:00Z",
			EndTime:          "2026-04-07T12:00:00Z",
			DurationMinutes:  60,
			ProjectName:      "api",
			Language:         "go",
			MachineID:        "m2",
			SourceEventCount: 2,
		},
		{
			ID:               "s4",
			Date:             "2026-04-08",
			StartTime:        "2026-04-08T08:30:00Z",
			EndTime:          "2026-04-08T09:00:00Z",
			DurationMinutes:  30,
			ProjectName:      "kairos-desktop",
			Language:         "typescript",
			MachineID:        "m1",
			SourceEventCount: 1,
		},
	}
	if err := store.InsertSessions(ctx, sessions, recordedAt); err != nil {
		t.Fatalf("insert sessions failed: %v", err)
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
