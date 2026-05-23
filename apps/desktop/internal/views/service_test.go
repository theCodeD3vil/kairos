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
	if data.SessionKpis.CurrentStreakDays != 3 || data.SessionKpis.LongestStreakDays != 3 {
		t.Fatalf("unexpected streak kpis: %+v", data.SessionKpis)
	}
	if data.SessionKpis.Rolling7DayAverageMinutes != 24 || data.SessionKpis.Rolling30DayAverageMinutes != 24 {
		t.Fatalf("unexpected rolling averages: %+v", data.SessionKpis)
	}
	if data.SessionKpis.PreviousPeriodDeltaPercent != 100 {
		t.Fatalf("expected previous period delta 100, got %f", data.SessionKpis.PreviousPeriodDeltaPercent)
	}
	if data.SessionKpis.BestDay.Date != "2026-04-07" || data.SessionKpis.BestDay.TotalMinutes != 90 {
		t.Fatalf("unexpected best day: %+v", data.SessionKpis.BestDay)
	}
	if data.SessionKpis.BestWeek.Date != "2026-04-06" || data.SessionKpis.BestWeek.TotalMinutes != 165 {
		t.Fatalf("unexpected best week: %+v", data.SessionKpis.BestWeek)
	}
	if data.SessionKpis.BestMonth.Date != "2026-04" || data.SessionKpis.BestMonth.TotalMinutes != 165 {
		t.Fatalf("unexpected best month: %+v", data.SessionKpis.BestMonth)
	}
	if data.SessionKpis.Duration.MedianMinutes != 38 || data.SessionKpis.Duration.P90Minutes != 60 {
		t.Fatalf("unexpected session duration distribution: %+v", data.SessionKpis.Duration)
	}
	if data.SessionKpis.DeepWorkMinutes != 60 || data.SessionKpis.DeepWorkBlockCount != 1 {
		t.Fatalf("unexpected deep work kpis: %+v", data.SessionKpis)
	}
	if data.SessionKpis.DeepWorkThresholdMinutes != 60 {
		t.Fatalf("expected deep work threshold 60, got %d", data.SessionKpis.DeepWorkThresholdMinutes)
	}
	if data.SessionKpis.LongestBreakMinutes != 30 || data.SessionKpis.MedianBreakMinutes != 30 {
		t.Fatalf("unexpected break metrics: %+v", data.SessionKpis)
	}
	if data.SessionKpis.FocusWindowStart != "08:30" || data.SessionKpis.FocusWindowEnd != "12:00" {
		t.Fatalf("unexpected focus window: %+v", data.SessionKpis)
	}
	if len(data.SessionKpis.WeekdayHeatmap) != 7 || data.SessionKpis.WeekdayHeatmap[0].TotalMinutes != 45 || data.SessionKpis.WeekdayHeatmap[1].TotalMinutes != 90 {
		t.Fatalf("unexpected weekday heatmap: %+v", data.SessionKpis.WeekdayHeatmap)
	}
	if len(data.SessionKpis.HourlyHeatmap) != 24 || data.SessionKpis.HourlyHeatmap[8].TotalMinutes != 30 || data.SessionKpis.HourlyHeatmap[11].TotalMinutes != 60 {
		t.Fatalf("unexpected hourly heatmap: %+v", data.SessionKpis.HourlyHeatmap)
	}
	if data.SessionKpis.ConsistencyScore != 42.9 {
		t.Fatalf("expected consistency score 42.9, got %f", data.SessionKpis.ConsistencyScore)
	}
	if data.ContextKpis.ProjectSwitchCount != 2 || data.ContextKpis.ProjectSwitchRatePerDay != 0.7 {
		t.Fatalf("unexpected project switch metrics: %+v", data.ContextKpis)
	}
	if data.ContextKpis.LanguageSwitchCount != 2 || data.ContextKpis.LanguageSwitchRatePerDay != 0.7 {
		t.Fatalf("unexpected language switch metrics: %+v", data.ContextKpis)
	}
	if data.ContextKpis.ProjectFocusScore != 63.6 || data.ContextKpis.TopProjectByTime.Name != "kairos-desktop" {
		t.Fatalf("unexpected project focus metrics: %+v", data.ContextKpis)
	}
	if len(data.ContextKpis.ProjectMomentum) == 0 || data.ContextKpis.ProjectMomentum[0].Name != "kairos-desktop" {
		t.Fatalf("unexpected project momentum: %+v", data.ContextKpis.ProjectMomentum)
	}
	if len(data.ContextKpis.MachineTimeSplit) != 2 || data.ContextKpis.MachineTimeSplit[0].MachineName != "Kairos Mac" {
		t.Fatalf("unexpected machine split: %+v", data.ContextKpis.MachineTimeSplit)
	}
	if data.ContextKpis.BranchSwitchCount != 3 || data.ContextKpis.BranchSwitchRatePerDay != 1 {
		t.Fatalf("unexpected branch switching metrics: %+v", data.ContextKpis)
	}
	if len(data.ContextKpis.BranchTime) == 0 || data.ContextKpis.BranchTime[0].BranchName != "main" || data.ContextKpis.BranchTime[0].TotalMinutes != 105 {
		t.Fatalf("unexpected branch time: %+v", data.ContextKpis.BranchTime)
	}
	if len(data.ContextKpis.WorkspaceContinuity) != 2 || data.ContextKpis.WorkspaceContinuity[0].WorkspaceID != "workspace-1" {
		t.Fatalf("unexpected workspace continuity: %+v", data.ContextKpis.WorkspaceContinuity)
	}
}

func TestGetAnalyticsDataUsesConfiguredDeepWorkThreshold(t *testing.T) {
	service, _ := newTestViewService(t)

	if _, err := service.settingsService.UpdateTrackingSettings(context.Background(), contracts.TrackingSettings{
		TrackingEnabled:              true,
		IdleDetectionEnabled:         true,
		TrackProjectActivity:         true,
		TrackLanguageActivity:        true,
		TrackMachineAttribution:      true,
		TrackSessionBoundaries:       true,
		IdleTimeoutMinutes:           5,
		SessionMergeThresholdMinutes: 10,
		DeepWorkThresholdMinutes:     45,
	}); err != nil {
		t.Fatalf("UpdateTrackingSettings failed: %v", err)
	}

	data, err := service.GetAnalyticsData(context.Background(), "last-7-days")
	if err != nil {
		t.Fatalf("GetAnalyticsData failed: %v", err)
	}

	if data.SessionKpis.DeepWorkThresholdMinutes != 45 {
		t.Fatalf("expected configured threshold 45, got %d", data.SessionKpis.DeepWorkThresholdMinutes)
	}
	if data.SessionKpis.DeepWorkMinutes != 105 || data.SessionKpis.DeepWorkBlockCount != 2 {
		t.Fatalf("unexpected configured deep work kpis: %+v", data.SessionKpis)
	}
}

func TestContextKpisHandleMissingEventMetadata(t *testing.T) {
	sessions := []contracts.Session{
		{
			ID:              "s1",
			Date:            "2026-04-06",
			StartTime:       "2026-04-06T09:00:00Z",
			EndTime:         "2026-04-06T09:30:00Z",
			DurationMinutes: 30,
			ProjectName:     "kairos",
			Language:        "typescript",
			MachineID:       "m1",
		},
	}
	events := []contracts.ActivityEvent{
		{
			ID:          "e1",
			Timestamp:   "2026-04-06T09:00:00Z",
			EventType:   "edit",
			MachineID:   "m1",
			ProjectName: "kairos",
			Language:    "typescript",
		},
	}

	kpis := buildContextKpis(sessions, events, buildResolvedRange("test", time.Date(2026, time.April, 6, 0, 0, 0, 0, time.UTC), time.Date(2026, time.April, 6, 0, 0, 0, 0, time.UTC)), nil)

	if kpis.BranchSwitchCount != 0 || len(kpis.BranchTime) != 0 || len(kpis.ProjectBranchBreakdown) != 0 {
		t.Fatalf("expected missing branch data to degrade cleanly, got %+v", kpis)
	}
	if len(kpis.WorkspaceContinuity) != 0 {
		t.Fatalf("expected missing workspace data to be omitted, got %+v", kpis.WorkspaceContinuity)
	}
	if kpis.ProjectFocusScore != 100 || kpis.LanguageFocusScore != 100 {
		t.Fatalf("expected available session context to remain usable, got %+v", kpis)
	}
}

func TestGetAnalyticsDataMonthRangeReturnsDailyBucketsForFullMonth(t *testing.T) {
	service, _ := newTestViewService(t)

	data, err := service.GetAnalyticsData(context.Background(), "month")
	if err != nil {
		t.Fatalf("GetAnalyticsData month failed: %v", err)
	}

	if data.RangeLabel != "month" {
		t.Fatalf("expected range label month, got %q", data.RangeLabel)
	}
	if len(data.DailyTotals) != 30 {
		t.Fatalf("expected 30 daily buckets for April 2026, got %d", len(data.DailyTotals))
	}
	if data.DailyTotals[0].Date != "2026-04-01" {
		t.Fatalf("expected first month bucket 2026-04-01, got %+v", data.DailyTotals[0])
	}
	if data.DailyTotals[len(data.DailyTotals)-1].Date != "2026-04-30" {
		t.Fatalf("expected last month bucket 2026-04-30, got %+v", data.DailyTotals[len(data.DailyTotals)-1])
	}

	byDate := make(map[string]int, len(data.DailyTotals))
	for _, point := range data.DailyTotals {
		byDate[point.Date] = point.TotalMinutes
	}
	if byDate["2026-04-06"] != 45 || byDate["2026-04-07"] != 90 || byDate["2026-04-08"] != 30 {
		t.Fatalf("unexpected month daily totals for active dates: %+v", byDate)
	}
}

func TestResolveRangeCustomValidatesAndNormalizesDates(t *testing.T) {
	service, _ := newTestViewService(t)

	period, err := service.resolveRange(context.Background(), " 2026-04-06 .. 2026-04-08 ", "last-30-days")
	if err != nil {
		t.Fatalf("expected trimmed custom range to resolve, got %v", err)
	}
	if period.startDate != "2026-04-06" || period.endDate != "2026-04-08" {
		t.Fatalf("unexpected normalized custom range: %+v", period)
	}
	if period.label != "2026-04-06..2026-04-08" {
		t.Fatalf("unexpected custom range label %q", period.label)
	}

	if _, err := service.resolveRange(context.Background(), "2026-04-08..2026-04-06", "last-30-days"); err == nil {
		t.Fatal("expected end-before-start custom range to fail")
	}
}

func TestResolveRangeMonthUsesCalendarBoundaries(t *testing.T) {
	service := &ServiceImpl{
		now: func() time.Time {
			return time.Date(2024, time.February, 29, 15, 45, 0, 0, time.UTC)
		},
	}

	period, err := service.resolveRange(context.Background(), "month", "last-30-days")
	if err != nil {
		t.Fatalf("resolveRange month failed: %v", err)
	}
	if period.startDate != "2024-02-01" || period.endDate != "2024-02-29" {
		t.Fatalf("expected leap-year month boundaries, got %+v", period)
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
	if analytics.SessionKpis.ActiveDays != 0 || analytics.SessionKpis.Duration.LongestMinutes != 0 {
		t.Fatalf("expected empty analytics kpis, got %+v", analytics.SessionKpis)
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

func TestGetCalendarMonthDataSupportsLeapYearFebruary(t *testing.T) {
	service, _ := newTestViewService(t)

	data, err := service.GetCalendarMonthData(context.Background(), "2024-02")
	if err != nil {
		t.Fatalf("GetCalendarMonthData failed: %v", err)
	}

	if len(data.Days) != 29 {
		t.Fatalf("expected 29 days for February 2024, got %d", len(data.Days))
	}
	if data.Days[0].Date != "2024-02-01" {
		t.Fatalf("unexpected first day %+v", data.Days[0])
	}
	if data.Days[len(data.Days)-1].Date != "2024-02-29" {
		t.Fatalf("unexpected last day %+v", data.Days[len(data.Days)-1])
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
		eventWithContext("e1", "2026-04-06T09:00:00Z", "m1", "workspace-1", "kairos-desktop", "typescript", "main"),
		eventWithContext("e2", "2026-04-06T09:45:00Z", "m1", "workspace-1", "kairos-desktop", "typescript", "main"),
		eventWithContext("e3", "2026-04-07T10:00:00Z", "m1", "workspace-1", "kairos-desktop", "typescript", "feature/analytics"),
		eventWithContext("e4", "2026-04-07T11:00:00Z", "m2", "workspace-2", "api", "go", "main"),
		eventWithContext("e5", "2026-04-07T11:55:00Z", "m2", "workspace-2", "api", "go", "main"),
		eventWithContext("e6", "2026-04-08T09:00:00Z", "m1", "workspace-1", "kairos-desktop", "typescript", "feature/analytics"),
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
	return eventWithContext(id, timestamp, machineID, "workspace-1", project, language, "")
}

func eventWithContext(id string, timestamp string, machineID string, workspaceID string, project string, language string, branch string) contracts.ActivityEvent {
	return contracts.ActivityEvent{
		ID:          id,
		Timestamp:   timestamp,
		EventType:   "edit",
		MachineID:   machineID,
		WorkspaceID: workspaceID,
		ProjectName: project,
		Language:    language,
		GitBranch:   branch,
	}
}
