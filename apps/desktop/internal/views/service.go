package views

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

const (
	overviewRecentSessionsLimit     = 5
	analyticsRecentSessionsLimit    = 10
	topSummaryLimit                 = 5
	defaultDeepWorkThresholdMinutes = 60
	shortSessionThresholdMinutes    = 15
	dateLayout                      = "2006-01-02"
	monthLayout                     = "2006-01"
	noWorkspaceSentinel             = "no-workspace"
	legacyWorkspaceSentinel         = "untitled-workspace"
)

type Service interface {
	GetOverviewData(ctx context.Context) (contracts.OverviewData, error)
	GetAnalyticsData(ctx context.Context, rangeLabel string) (contracts.AnalyticsData, error)
	GetCalendarMonthData(ctx context.Context, month string) (contracts.CalendarMonthData, error)
	GetCalendarDayData(ctx context.Context, date string) (contracts.CalendarDayData, error)
	GetProjectsPageData(ctx context.Context, rangeLabel string) (contracts.ProjectsPageData, error)
	GetSessionsPageData(ctx context.Context, rangeLabel string) (contracts.SessionsPageData, error)
}

type ServiceImpl struct {
	store           *storage.Store
	settingsService desktopsettings.Service
	now             func() time.Time
}

type StubService struct{}

type resolvedRange struct {
	label     string
	startDate string
	endDate   string
	start     time.Time
	end       time.Time
}

type dailyAggregate struct {
	totalMinutes int
	sessionCount int
}

type projectAggregate struct {
	projectName  string
	totalMinutes int
	sessionCount int
	activeDays   map[string]struct{}
	lastActiveAt string
}

type languageAggregate struct {
	language     string
	totalMinutes int
	sessionCount int
	activeDays   map[string]struct{}
	lastActiveAt string
}

type machineAggregate struct {
	machineID    string
	machineName  string
	osPlatform   string
	totalMinutes int
	sessionCount int
	activeDays   map[string]struct{}
	lastActiveAt string
}

type workspaceContinuityAggregate struct {
	workspaceID  string
	projects     map[string]struct{}
	machines     map[string]struct{}
	eventCount   int
	lastActiveAt string
}

type branchTimeAggregate struct {
	name         string
	totalMinutes int
	eventCount   int
	lastActiveAt string
}

type projectBranchAggregate struct {
	projectName  string
	branchName   string
	totalMinutes int
	eventCount   int
}

func NewService(store *storage.Store, settingsService desktopsettings.Service) *ServiceImpl {
	return &ServiceImpl{
		store:           store,
		settingsService: settingsService,
		now:             time.Now,
	}
}

func NewStubService() *StubService {
	return &StubService{}
}

func (s *ServiceImpl) GetOverviewData(ctx context.Context) (contracts.OverviewData, error) {
	weekRange := resolveCurrentWeek(s.now())
	weekSessions, err := s.store.ListSessionsForRange(ctx, weekRange.startDate, weekRange.endDate)
	if err != nil {
		return contracts.OverviewData{}, fmt.Errorf("list overview sessions: %w", err)
	}

	machineIndex, err := s.machineIndex(ctx)
	if err != nil {
		return contracts.OverviewData{}, err
	}
	decoratedWeekSessions := decorateSessions(weekSessions, machineIndex)
	dayTotals := aggregateDailyTotals(decoratedWeekSessions)
	today := s.now().UTC().Format(dateLayout)

	settingsData, err := s.settingsService.GetSettingsData(ctx)
	if err != nil {
		return contracts.OverviewData{}, fmt.Errorf("get overview settings: %w", err)
	}

	recentSessions, err := s.store.ListRecentSessions(ctx, overviewRecentSessionsLimit)
	if err != nil {
		return contracts.OverviewData{}, fmt.Errorf("list recent overview sessions: %w", err)
	}
	recentSessions = decorateSessions(recentSessions, machineIndex)

	lastUpdatedAt := settingsData.DataStorage.LastProcessedAt
	if lastUpdatedAt == "" {
		lastUpdatedAt = settingsData.System.LastSeenAt
	}
	if lastUpdatedAt == "" {
		lastUpdatedAt = s.now().UTC().Format(time.RFC3339)
	}

	lastActiveAt, err := s.store.GetLastEventTimestamp(ctx)
	if err != nil {
		return contracts.OverviewData{}, fmt.Errorf("get last active event: %w", err)
	}
	if lastActiveAt == "" {
		lastActiveAt = latestSessionTimestamp(recentSessions)
	}

	return contracts.OverviewData{
		TodayMinutes:          dayTotals[today].totalMinutes,
		WeekMinutes:           totalMinutes(decoratedWeekSessions),
		SessionCount:          len(decoratedWeekSessions),
		AverageSessionMinutes: averageSessionMinutes(decoratedWeekSessions),
		CodingDaysThisWeek:    countActiveDays(dayTotals),
		LastActiveAt:          lastActiveAt,
		TopProjects:           limitProjectSummaries(buildProjectSummaries(decoratedWeekSessions), topSummaryLimit),
		TopLanguages:          limitLanguageSummaries(buildLanguageSummaries(decoratedWeekSessions), topSummaryLimit),
		RecentSessions:        recentSessions,
		WeeklyTrend:           buildWeeklyTrend(weekRange, dayTotals),
		ActiveHoursSummary:    summarizeActiveHours(decoratedWeekSessions),
		TrackingEnabled:       settingsData.Tracking.TrackingEnabled,
		LocalOnlyMode:         settingsData.Privacy.LocalOnlyMode,
		CurrentMachine:        systemInfoToMachineInfo(settingsData.System),
		LastUpdatedAt:         lastUpdatedAt,
	}, nil
}

func (s *ServiceImpl) GetAnalyticsData(ctx context.Context, rangeLabel string) (contracts.AnalyticsData, error) {
	period, err := s.resolveRange(ctx, rangeLabel, "last-30-days")
	if err != nil {
		return contracts.AnalyticsData{}, err
	}

	sessions, err := s.store.ListSessionsForRange(ctx, period.startDate, period.endDate)
	if err != nil {
		return contracts.AnalyticsData{}, fmt.Errorf("list analytics sessions: %w", err)
	}

	machineIndex, err := s.machineIndex(ctx)
	if err != nil {
		return contracts.AnalyticsData{}, err
	}
	sessions = decorateSessions(sessions, machineIndex)

	events, err := s.store.ListEventsForDateRange(ctx, period.startDate, period.endDate)
	if err != nil {
		return contracts.AnalyticsData{}, fmt.Errorf("list analytics events: %w", err)
	}

	daily := aggregateDailyTotals(sessions)
	recentSessions := sortSessionsNewestFirst(cloneSessions(sessions))
	if len(recentSessions) > analyticsRecentSessionsLimit {
		recentSessions = recentSessions[:analyticsRecentSessionsLimit]
	}

	previousPeriodMinutes, err := s.previousPeriodMinutes(ctx, period)
	if err != nil {
		return contracts.AnalyticsData{}, err
	}
	settingsData, err := s.settingsService.GetSettingsData(ctx)
	if err != nil {
		return contracts.AnalyticsData{}, fmt.Errorf("get analytics settings: %w", err)
	}
	sessionKpis := buildSessionKpis(sessions, period, previousPeriodMinutes, settingsData.Tracking.DeepWorkThresholdMinutes)
	contextKpis := buildContextKpis(sessions, events, period, machineIndex)
	eventKpis := buildEventActivityKpis(sessions, events, settingsData.Tracking, settingsData.Extension)
	fileKpis := buildFileActivityKpis(sessions, events, settingsData.Privacy, settingsData.Tracking)
	insightScores := buildInsightScores(sessions, period, previousPeriodMinutes, sessionKpis, contextKpis, eventKpis, settingsData.Reliability)

	return contracts.AnalyticsData{
		RangeLabel:            period.label,
		TotalMinutes:          totalMinutes(sessions),
		ActiveDays:            countActiveDays(daily),
		SessionCount:          len(sessions),
		AverageSessionMinutes: averageSessionMinutes(sessions),
		LongestDayMinutes:     longestDayMinutes(daily),
		PreviousPeriodMinutes: previousPeriodMinutes,
		DailyTotals:           buildDailyTotals(period, daily),
		ProjectSummaries:      buildProjectSummaries(sessions),
		LanguageSummaries:     buildLanguageSummaries(sessions),
		MachineSummaries:      buildMachineSummaries(sessions, machineIndex),
		RecentSessions:        recentSessions,
		SessionKpis:           sessionKpis,
		ContextKpis:           contextKpis,
		EventKpis:             eventKpis,
		FileKpis:              fileKpis,
		InsightScores:         insightScores,
	}, nil
}

func (s *ServiceImpl) GetCalendarMonthData(ctx context.Context, month string) (contracts.CalendarMonthData, error) {
	monthStart, err := parseMonth(month, s.now)
	if err != nil {
		return contracts.CalendarMonthData{}, err
	}

	rangeForMonth := resolvedRange{
		label:     monthStart.Format(monthLayout),
		start:     monthStart,
		end:       monthStart.AddDate(0, 1, -1),
		startDate: monthStart.Format(dateLayout),
		endDate:   monthStart.AddDate(0, 1, -1).Format(dateLayout),
	}

	sessions, err := s.store.ListSessionsForRange(ctx, rangeForMonth.startDate, rangeForMonth.endDate)
	if err != nil {
		return contracts.CalendarMonthData{}, fmt.Errorf("list month sessions: %w", err)
	}

	daySessions := groupSessionsByDate(sessions)
	daysInMonth := rangeForMonth.end.Day()
	days := make([]contracts.CalendarDaySummary, 0, daysInMonth)
	for day := 0; day < daysInMonth; day++ {
		current := rangeForMonth.start.AddDate(0, 0, day)
		dateKey := current.Format(dateLayout)
		dailySessions := daySessions[dateKey]
		projectSummaries := buildProjectSummaries(dailySessions)
		languageSummaries := buildLanguageSummaries(dailySessions)
		machineCount := len(uniqueMachineIDs(dailySessions))
		days = append(days, contracts.CalendarDaySummary{
			Date:         dateKey,
			TotalMinutes: totalMinutes(dailySessions),
			SessionCount: len(dailySessions),
			TopProject:   firstProjectName(projectSummaries),
			TopLanguage:  firstLanguageName(languageSummaries),
			MachineCount: machineCount,
			HadActivity:  len(dailySessions) > 0,
		})
	}

	return contracts.CalendarMonthData{
		Month:      rangeForMonth.label,
		MonthLabel: rangeForMonth.start.Format("January 2006"),
		Days:       days,
	}, nil
}

func (s *ServiceImpl) GetCalendarDayData(ctx context.Context, date string) (contracts.CalendarDayData, error) {
	target, err := parseDate(date, s.now)
	if err != nil {
		return contracts.CalendarDayData{}, err
	}

	dateKey := target.Format(dateLayout)
	sessions, err := s.store.ListSessionsForDate(ctx, dateKey)
	if err != nil {
		return contracts.CalendarDayData{}, fmt.Errorf("list day sessions: %w", err)
	}

	machineIndex, err := s.machineIndex(ctx)
	if err != nil {
		return contracts.CalendarDayData{}, err
	}
	sessions = decorateSessions(sessions, machineIndex)

	events, err := s.store.ListEventsForDateRange(ctx, dateKey, dateKey)
	if err != nil {
		return contracts.CalendarDayData{}, fmt.Errorf("list day events: %w", err)
	}

	projectBreakdown := buildProjectSummaries(sessions)
	machineBreakdown := buildMachineSummaries(sessions, machineIndex)

	return contracts.CalendarDayData{
		Date:                  dateKey,
		TotalMinutes:          totalMinutes(sessions),
		SessionCount:          len(sessions),
		AverageSessionMinutes: averageSessionMinutes(sessions),
		FirstActiveAt:         firstActivityAt(events, sessions),
		LastActiveAt:          lastActivityAt(events, sessions),
		TopProject:            firstProjectName(projectBreakdown),
		TopLanguage:           firstLanguageName(buildLanguageSummaries(sessions)),
		ProjectBreakdown:      projectBreakdown,
		MachineBreakdown:      machineBreakdown,
		Sessions:              sortSessionsNewestFirst(cloneSessions(sessions)),
		HadActivity:           len(sessions) > 0,
	}, nil
}

func (s *ServiceImpl) GetProjectsPageData(ctx context.Context, rangeLabel string) (contracts.ProjectsPageData, error) {
	period, err := s.resolveRange(ctx, rangeLabel, "last-30-days")
	if err != nil {
		return contracts.ProjectsPageData{}, err
	}

	sessions, err := s.store.ListSessionsForRange(ctx, period.startDate, period.endDate)
	if err != nil {
		return contracts.ProjectsPageData{}, fmt.Errorf("list project sessions: %w", err)
	}

	return contracts.ProjectsPageData{
		RangeLabel: period.label,
		Projects:   buildProjectSummaries(sessions),
	}, nil
}

func (s *ServiceImpl) GetSessionsPageData(ctx context.Context, rangeLabel string) (contracts.SessionsPageData, error) {
	period, err := s.resolveRange(ctx, rangeLabel, "last-30-days")
	if err != nil {
		return contracts.SessionsPageData{}, err
	}

	sessions, err := s.store.ListSessionsForRange(ctx, period.startDate, period.endDate)
	if err != nil {
		return contracts.SessionsPageData{}, fmt.Errorf("list sessions page data: %w", err)
	}

	machineIndex, err := s.machineIndex(ctx)
	if err != nil {
		return contracts.SessionsPageData{}, err
	}
	sessions = sortSessionsNewestFirst(decorateSessions(sessions, machineIndex))

	return contracts.SessionsPageData{
		RangeLabel:            period.label,
		TotalSessions:         len(sessions),
		AverageSessionMinutes: averageSessionMinutes(sessions),
		LongestSessionMinutes: longestSessionMinutes(sessions),
		Sessions:              sessions,
	}, nil
}

func (s *ServiceImpl) resolveRange(ctx context.Context, rangeLabel string, fallback string) (resolvedRange, error) {
	normalized := strings.TrimSpace(strings.ToLower(rangeLabel))
	if normalized == "" {
		normalized = fallback
	}

	if strings.Contains(normalized, "..") {
		parts := strings.SplitN(normalized, "..", 2)
		if len(parts) != 2 {
			return resolvedRange{}, fmt.Errorf("invalid date range %q", rangeLabel)
		}
		start, err := parseDate(parts[0], s.now)
		if err != nil {
			return resolvedRange{}, err
		}
		end, err := parseDate(parts[1], s.now)
		if err != nil {
			return resolvedRange{}, err
		}
		if end.Before(start) {
			return resolvedRange{}, fmt.Errorf("invalid date range %q: end before start", rangeLabel)
		}
		return buildResolvedRange(fmt.Sprintf("%s..%s", start.Format(dateLayout), end.Format(dateLayout)), start, end), nil
	}

	now := s.now()
	switch normalized {
	case "today":
		today := startOfDayUTC(now)
		return buildResolvedRange("today", today, today), nil
	case "week":
		return resolveCurrentWeek(now), nil
	case "month":
		start := time.Date(now.UTC().Year(), now.UTC().Month(), 1, 0, 0, 0, 0, time.UTC)
		end := start.AddDate(0, 1, -1)
		return buildResolvedRange("month", start, end), nil
	case "last-7-days":
		end := startOfDayUTC(now)
		start := end.AddDate(0, 0, -6)
		return buildResolvedRange("last-7-days", start, end), nil
	case "last-30-days":
		end := startOfDayUTC(now)
		start := end.AddDate(0, 0, -29)
		return buildResolvedRange("last-30-days", start, end), nil
	case "all-time":
		firstEventAt, err := s.store.GetFirstEventTimestamp(ctx)
		if err != nil {
			return resolvedRange{}, fmt.Errorf("resolve all-time range: %w", err)
		}
		if firstEventAt == "" {
			today := startOfDayUTC(now)
			return buildResolvedRange("all-time", today, today), nil
		}
		firstEvent, err := parseTimestamp(firstEventAt)
		if err != nil {
			return resolvedRange{}, fmt.Errorf("parse first event timestamp %q: %w", firstEventAt, err)
		}
		return buildResolvedRange("all-time", startOfDayUTC(firstEvent), startOfDayUTC(now)), nil
	default:
		return resolvedRange{}, fmt.Errorf("unsupported range label %q", rangeLabel)
	}
}

func (s *ServiceImpl) previousPeriodMinutes(ctx context.Context, period resolvedRange) (*int, error) {
	dayCount := inclusiveDayCount(period.start, period.end)
	if dayCount <= 0 {
		return nil, nil
	}

	prevEnd := period.start.AddDate(0, 0, -1)
	prevStart := prevEnd.AddDate(0, 0, -(dayCount - 1))
	prevSessions, err := s.store.ListSessionsForRange(ctx, prevStart.Format(dateLayout), prevEnd.Format(dateLayout))
	if err != nil {
		return nil, fmt.Errorf("list previous period sessions: %w", err)
	}
	total := totalMinutes(prevSessions)
	return &total, nil
}

func (s *ServiceImpl) machineIndex(ctx context.Context) (map[string]contracts.MachineInfo, error) {
	machines, err := s.store.ListKnownMachines(ctx)
	if err != nil {
		return nil, fmt.Errorf("list known machines: %w", err)
	}

	index := make(map[string]contracts.MachineInfo, len(machines))
	for _, machine := range machines {
		index[machine.MachineID] = machine
	}

	return index, nil
}

func (s *StubService) GetOverviewData(_ context.Context) (contracts.OverviewData, error) {
	return contracts.OverviewData{
		TopProjects:        []contracts.ProjectSummary{},
		TopLanguages:       []contracts.LanguageSummary{},
		RecentSessions:     []contracts.Session{},
		WeeklyTrend:        []contracts.WeeklyTrendPoint{},
		ActiveHoursSummary: "No activity processed yet",
		TrackingEnabled:    true,
		LocalOnlyMode:      true,
		LastUpdatedAt:      time.Now().UTC().Format(time.RFC3339),
	}, nil
}

func (s *StubService) GetAnalyticsData(_ context.Context, rangeLabel string) (contracts.AnalyticsData, error) {
	return contracts.AnalyticsData{
		RangeLabel:        rangeLabelOrDefault(rangeLabel),
		DailyTotals:       []contracts.DailyTotalPoint{},
		ProjectSummaries:  []contracts.ProjectSummary{},
		LanguageSummaries: []contracts.LanguageSummary{},
		MachineSummaries:  []contracts.MachineSummary{},
		RecentSessions:    []contracts.Session{},
		SessionKpis:       buildSessionKpis(nil, emptyResolvedRange(rangeLabelOrDefault(rangeLabel)), nil, defaultDeepWorkThresholdMinutes),
		ContextKpis:       buildContextKpis(nil, nil, emptyResolvedRange(rangeLabelOrDefault(rangeLabel)), nil),
		EventKpis:         buildEventActivityKpis(nil, nil, contracts.TrackingSettings{}, contracts.ExtensionSettings{}),
		FileKpis:          buildFileActivityKpis(nil, nil, contracts.PrivacySettings{}, contracts.TrackingSettings{}),
	}, nil
}

func (s *StubService) GetCalendarMonthData(_ context.Context, month string) (contracts.CalendarMonthData, error) {
	return contracts.CalendarMonthData{
		Month:      month,
		MonthLabel: monthLabelOrDefault(month),
		Days:       []contracts.CalendarDaySummary{},
	}, nil
}

func (s *StubService) GetCalendarDayData(_ context.Context, date string) (contracts.CalendarDayData, error) {
	return contracts.CalendarDayData{
		Date:             date,
		ProjectBreakdown: []contracts.ProjectSummary{},
		MachineBreakdown: []contracts.MachineSummary{},
		Sessions:         []contracts.Session{},
		HadActivity:      false,
	}, nil
}

func (s *StubService) GetProjectsPageData(_ context.Context, rangeLabel string) (contracts.ProjectsPageData, error) {
	return contracts.ProjectsPageData{
		RangeLabel: rangeLabelOrDefault(rangeLabel),
		Projects:   []contracts.ProjectSummary{},
	}, nil
}

func (s *StubService) GetSessionsPageData(_ context.Context, rangeLabel string) (contracts.SessionsPageData, error) {
	return contracts.SessionsPageData{
		RangeLabel: rangeLabelOrDefault(rangeLabel),
		Sessions:   []contracts.Session{},
	}, nil
}

func resolveCurrentWeek(now time.Time) resolvedRange {
	start := startOfWeekUTC(now)
	end := start.AddDate(0, 0, 6)
	return buildResolvedRange("week", start, end)
}

func startOfWeekUTC(input time.Time) time.Time {
	current := startOfDayUTC(input)
	offset := int(current.Weekday()) - int(time.Monday)
	if offset < 0 {
		offset += 7
	}
	return current.AddDate(0, 0, -offset)
}

func buildResolvedRange(label string, start time.Time, end time.Time) resolvedRange {
	return resolvedRange{
		label:     label,
		start:     startOfDayUTC(start),
		end:       startOfDayUTC(end),
		startDate: startOfDayUTC(start).Format(dateLayout),
		endDate:   startOfDayUTC(end).Format(dateLayout),
	}
}

func startOfDayUTC(input time.Time) time.Time {
	utc := input.UTC()
	return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
}

func parseMonth(value string, now func() time.Time) (time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		current := now().UTC()
		return time.Date(current.Year(), current.Month(), 1, 0, 0, 0, 0, time.UTC), nil
	}

	parsed, err := time.Parse(monthLayout, trimmed)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid month %q: %w", value, err)
	}

	return parsed.UTC(), nil
}

func parseDate(value string, now func() time.Time) (time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return startOfDayUTC(now()), nil
	}

	parsed, err := time.Parse(dateLayout, trimmed)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid date %q: %w", value, err)
	}

	return parsed.UTC(), nil
}

func parseTimestamp(value string) (time.Time, error) {
	return time.Parse(time.RFC3339, value)
}

func buildWeeklyTrend(period resolvedRange, totals map[string]dailyAggregate) []contracts.WeeklyTrendPoint {
	points := make([]contracts.WeeklyTrendPoint, 0, 7)
	for day := 0; day < 7; day++ {
		current := period.start.AddDate(0, 0, day)
		dateKey := current.Format(dateLayout)
		points = append(points, contracts.WeeklyTrendPoint{
			Date:         dateKey,
			TotalMinutes: totals[dateKey].totalMinutes,
		})
	}
	return points
}

func buildDailyTotals(period resolvedRange, totals map[string]dailyAggregate) []contracts.DailyTotalPoint {
	points := make([]contracts.DailyTotalPoint, 0, inclusiveDayCount(period.start, period.end))
	for current := period.start; !current.After(period.end); current = current.AddDate(0, 0, 1) {
		dateKey := current.Format(dateLayout)
		points = append(points, contracts.DailyTotalPoint{
			Date:         dateKey,
			TotalMinutes: totals[dateKey].totalMinutes,
		})
	}
	return points
}

func aggregateDailyTotals(sessions []contracts.Session) map[string]dailyAggregate {
	totals := make(map[string]dailyAggregate)
	for _, session := range sessions {
		entry := totals[session.Date]
		entry.totalMinutes += session.DurationMinutes
		entry.sessionCount++
		totals[session.Date] = entry
	}
	return totals
}

// Session KPI formulas intentionally use only persisted sessions here: streaks
// count active calendar days, rolling averages divide by calendar days in the
// visible range, fragmentation is short sessions / total sessions, and
// consistency is active days / available days.
func buildSessionKpis(
	sessions []contracts.Session,
	period resolvedRange,
	previousPeriodMinutes *int,
	deepWorkThresholdMinutes int,
) contracts.SessionKpiSummary {
	period = normalizeKpiPeriod(period, sessions)
	if deepWorkThresholdMinutes <= 0 {
		deepWorkThresholdMinutes = defaultDeepWorkThresholdMinutes
	}
	daily := aggregateDailyTotals(sessions)
	total := totalMinutes(sessions)
	previous := 0
	if previousPeriodMinutes != nil {
		previous = *previousPeriodMinutes
	}

	firstActiveAt, lastActiveAt, focusWindowStart, focusWindowEnd := sessionActivityBounds(sessions)
	deepWorkMinutes := 0
	deepWorkBlockCount := 0
	shortSessionCount := 0
	for _, session := range sessions {
		if session.DurationMinutes >= deepWorkThresholdMinutes {
			deepWorkMinutes += session.DurationMinutes
			deepWorkBlockCount++
		}
		if session.DurationMinutes > 0 && session.DurationMinutes < shortSessionThresholdMinutes {
			shortSessionCount++
		}
	}

	longestBreakMinutes, medianBreakMinutes := sessionBreakMetrics(sessions)

	return contracts.SessionKpiSummary{
		ActiveDays:                   countActiveDays(daily),
		CurrentStreakDays:            currentStreakDays(daily, period),
		LongestStreakDays:            longestStreakDays(daily, period),
		Rolling7DayAverageMinutes:    rollingAverageMinutes(daily, period, 7),
		Rolling30DayAverageMinutes:   rollingAverageMinutes(daily, period, 30),
		PreviousPeriodDeltaPercent:   percentDelta(total, previous),
		BestDay:                      bestDayKpi(daily),
		BestWeek:                     bestWeekKpi(sessions),
		BestMonth:                    bestMonthKpi(sessions),
		Duration:                     buildSessionDurationKpis(sessions),
		DeepWorkThresholdMinutes:     deepWorkThresholdMinutes,
		DeepWorkMinutes:              deepWorkMinutes,
		DeepWorkBlockCount:           deepWorkBlockCount,
		ShortSessionThresholdMinutes: shortSessionThresholdMinutes,
		ShortSessionCount:            shortSessionCount,
		FragmentationScore:           percentOfTotal(shortSessionCount, len(sessions)),
		LongestBreakMinutes:          longestBreakMinutes,
		MedianBreakMinutes:           medianBreakMinutes,
		FirstActiveAt:                firstActiveAt,
		LastActiveAt:                 lastActiveAt,
		FocusWindowStart:             focusWindowStart,
		FocusWindowEnd:               focusWindowEnd,
		WeekdayHeatmap:               buildWeekdayHeatmap(sessions),
		HourlyHeatmap:                buildHourlyHeatmap(sessions),
		ConsistencyScore:             percentOfTotal(countActiveDays(daily), inclusiveDayCount(period.start, period.end)),
	}
}

// Context KPI formulas combine session context with event-only fields. Project,
// language, and machine metrics use sessions because they carry duration.
// Workspace, branch, and project-branch metrics use raw events and only estimate
// branch minutes when branch-tagged events can be matched back to a session.
func buildContextKpis(
	sessions []contracts.Session,
	events []contracts.ActivityEvent,
	period resolvedRange,
	machineIndex map[string]contracts.MachineInfo,
) contracts.ContextKpiSummary {
	period = normalizeKpiPeriod(period, sessions)
	daily := aggregateDailyTotals(sessions)
	activeDays := countActiveDays(daily)
	projectSummaries := buildProjectSummaries(sessions)
	languageSummaries := buildLanguageSummaries(sessions)
	machineSummaries := buildMachineSummaries(sessions, machineIndex)

	projectSwitchCount := contextSwitchCount(sessions, func(session contracts.Session) string {
		return normalizeProjectName(session.ProjectName)
	})
	languageSwitchCount := contextSwitchCount(sessions, func(session contracts.Session) string {
		return strings.TrimSpace(session.Language)
	})
	branchSwitchCount, branchActiveDays := branchSwitchMetrics(events)
	branchTime, projectBranchBreakdown := buildBranchTimeBreakdowns(sessions, events)

	return contracts.ContextKpiSummary{
		ProjectSwitchCount:       projectSwitchCount,
		ProjectSwitchRatePerDay:  ratePerDay(projectSwitchCount, activeDays),
		LanguageSwitchCount:      languageSwitchCount,
		LanguageSwitchRatePerDay: ratePerDay(languageSwitchCount, activeDays),
		BranchSwitchCount:        branchSwitchCount,
		BranchSwitchRatePerDay:   ratePerDay(branchSwitchCount, branchActiveDays),
		ProjectFocusScore:        focusScoreFromProjectSummaries(projectSummaries),
		LanguageFocusScore:       focusScoreFromLanguageSummaries(languageSummaries),
		TopProjectByTime:         projectLeaderByTime(projectSummaries),
		TopProjectBySessions:     projectLeaderBySessions(projectSummaries),
		TopProjectByActiveDays:   projectLeaderByActiveDays(projectSummaries),
		TopLanguageByTime:        languageLeaderByTime(languageSummaries),
		TopLanguageBySessions:    languageLeaderBySessions(languageSummaries),
		TopLanguageByActiveDays:  languageLeaderByActiveDays(languageSummaries),
		ProjectMomentum: buildContextMomentum(sessions, period, func(session contracts.Session) string {
			return normalizeProjectName(session.ProjectName)
		}),
		LanguageMomentum: buildContextMomentum(sessions, period, func(session contracts.Session) string {
			return strings.TrimSpace(session.Language)
		}),
		MachineTimeSplit:        buildMachineTimeSplit(machineSummaries),
		CrossMachineResumeCount: crossMachineResumeCount(sessions),
		CrossMachineResumeRate:  crossMachineResumeRate(sessions),
		WorkspaceContinuity:     buildWorkspaceContinuity(events),
		BranchTime:              branchTime,
		ProjectBranchBreakdown:  projectBranchBreakdown,
	}
}

func contextSwitchCount(sessions []contracts.Session, valueFor func(contracts.Session) string) int {
	ordered := cloneSessions(sessions)
	sort.SliceStable(ordered, func(i int, j int) bool {
		if ordered[i].StartTime != ordered[j].StartTime {
			return ordered[i].StartTime < ordered[j].StartTime
		}
		return ordered[i].ID < ordered[j].ID
	})

	switches := 0
	previous := ""
	for _, session := range ordered {
		current := strings.TrimSpace(valueFor(session))
		if current == "" {
			continue
		}
		if previous != "" && current != previous {
			switches++
		}
		previous = current
	}
	return switches
}

func ratePerDay(count int, dayCount int) float64 {
	if count <= 0 || dayCount <= 0 {
		return 0
	}
	return roundOneDecimal(float64(count) / float64(dayCount))
}

func focusScoreFromProjectSummaries(summaries []contracts.ProjectSummary) float64 {
	if len(summaries) == 0 {
		return 0
	}
	return roundOneDecimal(summaries[0].ShareOfTotal * 100)
}

func focusScoreFromLanguageSummaries(summaries []contracts.LanguageSummary) float64 {
	if len(summaries) == 0 {
		return 0
	}
	return roundOneDecimal(summaries[0].ShareOfTotal * 100)
}

func projectLeaderByTime(summaries []contracts.ProjectSummary) contracts.ContextLeaderKpi {
	if len(summaries) == 0 {
		return contracts.ContextLeaderKpi{}
	}
	return projectSummaryToLeader(summaries[0])
}

func projectLeaderBySessions(summaries []contracts.ProjectSummary) contracts.ContextLeaderKpi {
	return projectLeaderBy(summaries, func(left contracts.ProjectSummary, right contracts.ProjectSummary) bool {
		if left.SessionCount != right.SessionCount {
			return left.SessionCount > right.SessionCount
		}
		if left.TotalMinutes != right.TotalMinutes {
			return left.TotalMinutes > right.TotalMinutes
		}
		return left.ProjectName < right.ProjectName
	})
}

func projectLeaderByActiveDays(summaries []contracts.ProjectSummary) contracts.ContextLeaderKpi {
	return projectLeaderBy(summaries, func(left contracts.ProjectSummary, right contracts.ProjectSummary) bool {
		if left.ActiveDays != right.ActiveDays {
			return left.ActiveDays > right.ActiveDays
		}
		if left.TotalMinutes != right.TotalMinutes {
			return left.TotalMinutes > right.TotalMinutes
		}
		return left.ProjectName < right.ProjectName
	})
}

func projectLeaderBy(summaries []contracts.ProjectSummary, less func(contracts.ProjectSummary, contracts.ProjectSummary) bool) contracts.ContextLeaderKpi {
	if len(summaries) == 0 {
		return contracts.ContextLeaderKpi{}
	}
	ordered := append([]contracts.ProjectSummary(nil), summaries...)
	sort.SliceStable(ordered, func(i int, j int) bool {
		return less(ordered[i], ordered[j])
	})
	return projectSummaryToLeader(ordered[0])
}

func projectSummaryToLeader(summary contracts.ProjectSummary) contracts.ContextLeaderKpi {
	return contracts.ContextLeaderKpi{
		Name:         summary.ProjectName,
		TotalMinutes: summary.TotalMinutes,
		SessionCount: summary.SessionCount,
		ActiveDays:   summary.ActiveDays,
		ShareOfTotal: roundOneDecimal(summary.ShareOfTotal * 100),
	}
}

func languageLeaderByTime(summaries []contracts.LanguageSummary) contracts.ContextLeaderKpi {
	if len(summaries) == 0 {
		return contracts.ContextLeaderKpi{}
	}
	return languageSummaryToLeader(summaries[0])
}

func languageLeaderBySessions(summaries []contracts.LanguageSummary) contracts.ContextLeaderKpi {
	return languageLeaderBy(summaries, func(left contracts.LanguageSummary, right contracts.LanguageSummary) bool {
		if left.SessionCount != right.SessionCount {
			return left.SessionCount > right.SessionCount
		}
		if left.TotalMinutes != right.TotalMinutes {
			return left.TotalMinutes > right.TotalMinutes
		}
		return left.Language < right.Language
	})
}

func languageLeaderByActiveDays(summaries []contracts.LanguageSummary) contracts.ContextLeaderKpi {
	return languageLeaderBy(summaries, func(left contracts.LanguageSummary, right contracts.LanguageSummary) bool {
		if left.ActiveDays != right.ActiveDays {
			return left.ActiveDays > right.ActiveDays
		}
		if left.TotalMinutes != right.TotalMinutes {
			return left.TotalMinutes > right.TotalMinutes
		}
		return left.Language < right.Language
	})
}

func languageLeaderBy(summaries []contracts.LanguageSummary, less func(contracts.LanguageSummary, contracts.LanguageSummary) bool) contracts.ContextLeaderKpi {
	if len(summaries) == 0 {
		return contracts.ContextLeaderKpi{}
	}
	ordered := append([]contracts.LanguageSummary(nil), summaries...)
	sort.SliceStable(ordered, func(i int, j int) bool {
		return less(ordered[i], ordered[j])
	})
	return languageSummaryToLeader(ordered[0])
}

func languageSummaryToLeader(summary contracts.LanguageSummary) contracts.ContextLeaderKpi {
	return contracts.ContextLeaderKpi{
		Name:         summary.Language,
		TotalMinutes: summary.TotalMinutes,
		SessionCount: summary.SessionCount,
		ActiveDays:   summary.ActiveDays,
		ShareOfTotal: roundOneDecimal(summary.ShareOfTotal * 100),
	}
}

func buildContextMomentum(
	sessions []contracts.Session,
	period resolvedRange,
	valueFor func(contracts.Session) string,
) []contracts.ContextMomentumPoint {
	currentStart := period.end.AddDate(0, 0, -6)
	previousEnd := currentStart.AddDate(0, 0, -1)
	previousStart := previousEnd.AddDate(0, 0, -6)
	currentTotals := make(map[string]int)
	previousTotals := make(map[string]int)

	for _, session := range sessions {
		name := strings.TrimSpace(valueFor(session))
		if name == "" {
			continue
		}
		day, err := time.Parse(dateLayout, session.Date)
		if err != nil {
			continue
		}
		switch {
		case !day.Before(currentStart) && !day.After(period.end):
			currentTotals[name] += session.DurationMinutes
		case !day.Before(previousStart) && !day.After(previousEnd):
			previousTotals[name] += session.DurationMinutes
		}
	}

	names := make(map[string]struct{})
	for name := range currentTotals {
		names[name] = struct{}{}
	}
	for name := range previousTotals {
		names[name] = struct{}{}
	}

	points := make([]contracts.ContextMomentumPoint, 0, len(names))
	for name := range names {
		current := currentTotals[name]
		previous := previousTotals[name]
		points = append(points, contracts.ContextMomentumPoint{
			Name:            name,
			CurrentMinutes:  current,
			PreviousMinutes: previous,
			DeltaPercent:    percentDelta(current, previous),
		})
	}

	sort.SliceStable(points, func(i int, j int) bool {
		if points[i].CurrentMinutes != points[j].CurrentMinutes {
			return points[i].CurrentMinutes > points[j].CurrentMinutes
		}
		if points[i].PreviousMinutes != points[j].PreviousMinutes {
			return points[i].PreviousMinutes > points[j].PreviousMinutes
		}
		return points[i].Name < points[j].Name
	})
	if len(points) > topSummaryLimit {
		return points[:topSummaryLimit]
	}
	return points
}

func buildMachineTimeSplit(summaries []contracts.MachineSummary) []contracts.MachineTimeSplitPoint {
	total := 0
	for _, summary := range summaries {
		total += summary.TotalMinutes
	}

	points := make([]contracts.MachineTimeSplitPoint, 0, len(summaries))
	for _, summary := range summaries {
		points = append(points, contracts.MachineTimeSplitPoint{
			MachineID:    summary.MachineID,
			MachineName:  summary.MachineName,
			TotalMinutes: summary.TotalMinutes,
			ShareOfTotal: percentOfTotal(summary.TotalMinutes, total),
		})
	}
	return points
}

func crossMachineResumeCount(sessions []contracts.Session) int {
	ordered := cloneSessions(sessions)
	sort.SliceStable(ordered, func(i int, j int) bool {
		if ordered[i].StartTime != ordered[j].StartTime {
			return ordered[i].StartTime < ordered[j].StartTime
		}
		return ordered[i].ID < ordered[j].ID
	})

	count := 0
	for index := 1; index < len(ordered); index++ {
		previous := ordered[index-1]
		current := ordered[index]
		if normalizeProjectName(previous.ProjectName) == "" || normalizeProjectName(previous.ProjectName) != normalizeProjectName(current.ProjectName) {
			continue
		}
		if previous.MachineID == "" || current.MachineID == "" || previous.MachineID == current.MachineID {
			continue
		}
		previousEnd, err := parseTimestamp(previous.EndTime)
		if err != nil {
			continue
		}
		currentStart, err := parseTimestamp(current.StartTime)
		if err != nil {
			continue
		}
		gap := currentStart.Sub(previousEnd)
		if gap >= 0 && gap <= 24*time.Hour {
			count++
		}
	}
	return count
}

func crossMachineResumeRate(sessions []contracts.Session) float64 {
	if len(sessions) < 2 {
		return 0
	}
	return percentOfTotal(crossMachineResumeCount(sessions), len(sessions)-1)
}

func buildWorkspaceContinuity(events []contracts.ActivityEvent) []contracts.WorkspaceContinuityPoint {
	aggregates := make(map[string]*workspaceContinuityAggregate)
	for _, event := range events {
		workspaceID := strings.TrimSpace(event.WorkspaceID)
		if workspaceID == "" {
			continue
		}
		entry, ok := aggregates[workspaceID]
		if !ok {
			entry = &workspaceContinuityAggregate{
				workspaceID: workspaceID,
				projects:    make(map[string]struct{}),
				machines:    make(map[string]struct{}),
			}
			aggregates[workspaceID] = entry
		}
		projectName := strings.TrimSpace(normalizeProjectName(event.ProjectName))
		if projectName != "" {
			entry.projects[projectName] = struct{}{}
		}
		if strings.TrimSpace(event.MachineID) != "" {
			entry.machines[event.MachineID] = struct{}{}
		}
		entry.eventCount++
		if event.Timestamp > entry.lastActiveAt {
			entry.lastActiveAt = event.Timestamp
		}
	}

	points := make([]contracts.WorkspaceContinuityPoint, 0, len(aggregates))
	for _, entry := range aggregates {
		points = append(points, contracts.WorkspaceContinuityPoint{
			WorkspaceID:  entry.workspaceID,
			ProjectCount: len(entry.projects),
			MachineCount: len(entry.machines),
			EventCount:   entry.eventCount,
			LastActiveAt: entry.lastActiveAt,
		})
	}
	sort.SliceStable(points, func(i int, j int) bool {
		if points[i].EventCount != points[j].EventCount {
			return points[i].EventCount > points[j].EventCount
		}
		return points[i].WorkspaceID < points[j].WorkspaceID
	})
	if len(points) > topSummaryLimit {
		return points[:topSummaryLimit]
	}
	return points
}

func branchSwitchMetrics(events []contracts.ActivityEvent) (int, int) {
	ordered := append([]contracts.ActivityEvent(nil), events...)
	sort.SliceStable(ordered, func(i int, j int) bool {
		if ordered[i].Timestamp != ordered[j].Timestamp {
			return ordered[i].Timestamp < ordered[j].Timestamp
		}
		return ordered[i].ID < ordered[j].ID
	})

	switches := 0
	previous := ""
	activeDays := make(map[string]struct{})
	for _, event := range ordered {
		branch := strings.TrimSpace(event.GitBranch)
		if branch == "" {
			continue
		}
		if len(event.Timestamp) >= len(dateLayout) {
			activeDays[event.Timestamp[:len(dateLayout)]] = struct{}{}
		}
		if previous != "" && branch != previous {
			switches++
		}
		previous = branch
	}
	return switches, len(activeDays)
}

func buildBranchTimeBreakdowns(
	sessions []contracts.Session,
	events []contracts.ActivityEvent,
) ([]contracts.BranchTimePoint, []contracts.ProjectBranchTimePoint) {
	branchAggregates := make(map[string]*branchTimeAggregate)
	projectBranchAggregates := make(map[string]*projectBranchAggregate)
	for _, session := range sessions {
		sessionBranchCounts := branchEventCountsForSession(session, events)
		if len(sessionBranchCounts) == 0 {
			continue
		}
		totalBranchEvents := 0
		for _, count := range sessionBranchCounts {
			totalBranchEvents += count
		}
		if totalBranchEvents == 0 {
			continue
		}
		for branchName, eventCount := range sessionBranchCounts {
			minutes := int(math.Round(float64(session.DurationMinutes) * (float64(eventCount) / float64(totalBranchEvents))))
			branchEntry, ok := branchAggregates[branchName]
			if !ok {
				branchEntry = &branchTimeAggregate{name: branchName}
				branchAggregates[branchName] = branchEntry
			}
			branchEntry.totalMinutes += minutes
			branchEntry.eventCount += eventCount
			if session.EndTime > branchEntry.lastActiveAt {
				branchEntry.lastActiveAt = session.EndTime
			}

			projectName := normalizeProjectName(session.ProjectName)
			projectBranchKey := projectName + "\x00" + branchName
			projectBranchEntry, ok := projectBranchAggregates[projectBranchKey]
			if !ok {
				projectBranchEntry = &projectBranchAggregate{
					projectName: projectName,
					branchName:  branchName,
				}
				projectBranchAggregates[projectBranchKey] = projectBranchEntry
			}
			projectBranchEntry.totalMinutes += minutes
			projectBranchEntry.eventCount += eventCount
		}
	}

	totalBranchMinutes := 0
	for _, entry := range branchAggregates {
		totalBranchMinutes += entry.totalMinutes
	}
	branchPoints := make([]contracts.BranchTimePoint, 0, len(branchAggregates))
	for _, entry := range branchAggregates {
		branchPoints = append(branchPoints, contracts.BranchTimePoint{
			BranchName:   entry.name,
			TotalMinutes: entry.totalMinutes,
			EventCount:   entry.eventCount,
			ShareOfTotal: percentOfTotal(entry.totalMinutes, totalBranchMinutes),
			LastActiveAt: entry.lastActiveAt,
		})
	}
	sort.SliceStable(branchPoints, func(i int, j int) bool {
		if branchPoints[i].TotalMinutes != branchPoints[j].TotalMinutes {
			return branchPoints[i].TotalMinutes > branchPoints[j].TotalMinutes
		}
		return branchPoints[i].BranchName < branchPoints[j].BranchName
	})
	if len(branchPoints) > topSummaryLimit {
		branchPoints = branchPoints[:topSummaryLimit]
	}

	projectBranchPoints := make([]contracts.ProjectBranchTimePoint, 0, len(projectBranchAggregates))
	for _, entry := range projectBranchAggregates {
		projectBranchPoints = append(projectBranchPoints, contracts.ProjectBranchTimePoint{
			ProjectName:  entry.projectName,
			BranchName:   entry.branchName,
			TotalMinutes: entry.totalMinutes,
			EventCount:   entry.eventCount,
			ShareOfTotal: percentOfTotal(entry.totalMinutes, totalBranchMinutes),
		})
	}
	sort.SliceStable(projectBranchPoints, func(i int, j int) bool {
		if projectBranchPoints[i].TotalMinutes != projectBranchPoints[j].TotalMinutes {
			return projectBranchPoints[i].TotalMinutes > projectBranchPoints[j].TotalMinutes
		}
		if projectBranchPoints[i].ProjectName != projectBranchPoints[j].ProjectName {
			return projectBranchPoints[i].ProjectName < projectBranchPoints[j].ProjectName
		}
		return projectBranchPoints[i].BranchName < projectBranchPoints[j].BranchName
	})
	if len(projectBranchPoints) > topSummaryLimit {
		projectBranchPoints = projectBranchPoints[:topSummaryLimit]
	}
	return branchPoints, projectBranchPoints
}

func branchEventCountsForSession(session contracts.Session, events []contracts.ActivityEvent) map[string]int {
	start, err := parseTimestamp(session.StartTime)
	if err != nil {
		return nil
	}
	end, err := parseTimestamp(session.EndTime)
	if err != nil {
		return nil
	}
	counts := make(map[string]int)
	for _, event := range events {
		branch := strings.TrimSpace(event.GitBranch)
		if branch == "" {
			continue
		}
		if event.MachineID != session.MachineID || normalizeProjectName(event.ProjectName) != normalizeProjectName(session.ProjectName) {
			continue
		}
		eventTime, err := parseTimestamp(event.Timestamp)
		if err != nil {
			continue
		}
		if eventTime.Before(start) || eventTime.After(end) {
			continue
		}
		counts[branch]++
	}
	return counts
}

func normalizeKpiPeriod(period resolvedRange, sessions []contracts.Session) resolvedRange {
	if !period.start.IsZero() && !period.end.IsZero() {
		return period
	}

	if len(sessions) == 0 {
		empty := time.Date(1970, time.January, 1, 0, 0, 0, 0, time.UTC)
		return buildResolvedRange(period.label, empty, empty)
	}

	start := sessions[0].Date
	end := sessions[0].Date
	for _, session := range sessions[1:] {
		if session.Date < start {
			start = session.Date
		}
		if session.Date > end {
			end = session.Date
		}
	}

	parsedStart, err := time.Parse(dateLayout, start)
	if err != nil {
		parsedStart = time.Date(1970, time.January, 1, 0, 0, 0, 0, time.UTC)
	}
	parsedEnd, err := time.Parse(dateLayout, end)
	if err != nil {
		parsedEnd = parsedStart
	}
	return buildResolvedRange(period.label, parsedStart, parsedEnd)
}

func emptyResolvedRange(label string) resolvedRange {
	empty := time.Date(1970, time.January, 1, 0, 0, 0, 0, time.UTC)
	return buildResolvedRange(label, empty, empty)
}

func currentStreakDays(totals map[string]dailyAggregate, period resolvedRange) int {
	streak := 0
	for current := period.end; !current.Before(period.start); current = current.AddDate(0, 0, -1) {
		if totals[current.Format(dateLayout)].totalMinutes <= 0 {
			if streak == 0 {
				return 0
			}
			break
		}
		streak++
	}
	return streak
}

func longestStreakDays(totals map[string]dailyAggregate, period resolvedRange) int {
	longest := 0
	currentStreak := 0
	for current := period.start; !current.After(period.end); current = current.AddDate(0, 0, 1) {
		if totals[current.Format(dateLayout)].totalMinutes > 0 {
			currentStreak++
			if currentStreak > longest {
				longest = currentStreak
			}
			continue
		}
		currentStreak = 0
	}
	return longest
}

func rollingAverageMinutes(totals map[string]dailyAggregate, period resolvedRange, days int) int {
	if days <= 0 {
		return 0
	}
	start := period.end.AddDate(0, 0, -(days - 1))
	if start.Before(period.start) {
		start = period.start
	}
	dayCount := inclusiveDayCount(start, period.end)
	if dayCount <= 0 {
		return 0
	}
	total := 0
	for current := start; !current.After(period.end); current = current.AddDate(0, 0, 1) {
		total += totals[current.Format(dateLayout)].totalMinutes
	}
	return int(math.Round(float64(total) / float64(dayCount)))
}

func bestDayKpi(totals map[string]dailyAggregate) contracts.TimeKpiPoint {
	best := contracts.TimeKpiPoint{}
	for date, total := range totals {
		if total.totalMinutes == 0 {
			continue
		}
		if total.totalMinutes > best.TotalMinutes || (total.totalMinutes == best.TotalMinutes && (best.Date == "" || date < best.Date)) {
			best = contracts.TimeKpiPoint{
				Label:        date,
				Date:         date,
				TotalMinutes: total.totalMinutes,
			}
		}
	}
	return best
}

func bestWeekKpi(sessions []contracts.Session) contracts.TimeKpiPoint {
	totals := make(map[string]int)
	for _, session := range sessions {
		day, err := time.Parse(dateLayout, session.Date)
		if err != nil {
			continue
		}
		weekStart := startOfWeekUTC(day).Format(dateLayout)
		totals[weekStart] += session.DurationMinutes
	}
	return bestBucketKpi(totals)
}

func bestMonthKpi(sessions []contracts.Session) contracts.TimeKpiPoint {
	totals := make(map[string]int)
	for _, session := range sessions {
		if len(session.Date) < len(monthLayout) {
			continue
		}
		month := session.Date[:len(monthLayout)]
		totals[month] += session.DurationMinutes
	}
	return bestBucketKpi(totals)
}

func bestBucketKpi(totals map[string]int) contracts.TimeKpiPoint {
	best := contracts.TimeKpiPoint{}
	for date, total := range totals {
		if total == 0 {
			continue
		}
		if total > best.TotalMinutes || (total == best.TotalMinutes && (best.Date == "" || date < best.Date)) {
			best = contracts.TimeKpiPoint{
				Label:        date,
				Date:         date,
				TotalMinutes: total,
			}
		}
	}
	return best
}

func buildSessionDurationKpis(sessions []contracts.Session) contracts.SessionDurationKpis {
	durations := make([]int, 0, len(sessions))
	for _, session := range sessions {
		if session.DurationMinutes > 0 {
			durations = append(durations, session.DurationMinutes)
		}
	}
	if len(durations) == 0 {
		return contracts.SessionDurationKpis{}
	}

	sort.Ints(durations)
	return contracts.SessionDurationKpis{
		AverageMinutes: int(math.Round(float64(sumInts(durations)) / float64(len(durations)))),
		MedianMinutes:  medianInt(durations),
		P90Minutes:     percentileNearestRank(durations, 0.9),
		LongestMinutes: durations[len(durations)-1],
	}
}

func sumInts(values []int) int {
	total := 0
	for _, value := range values {
		total += value
	}
	return total
}

func medianInt(sortedValues []int) int {
	count := len(sortedValues)
	if count == 0 {
		return 0
	}
	mid := count / 2
	if count%2 == 1 {
		return sortedValues[mid]
	}
	return int(math.Round(float64(sortedValues[mid-1]+sortedValues[mid]) / 2))
}

func percentileNearestRank(sortedValues []int, percentile float64) int {
	if len(sortedValues) == 0 {
		return 0
	}
	index := int(math.Ceil(percentile*float64(len(sortedValues)))) - 1
	if index < 0 {
		index = 0
	}
	if index >= len(sortedValues) {
		index = len(sortedValues) - 1
	}
	return sortedValues[index]
}

func sessionBreakMetrics(sessions []contracts.Session) (int, int) {
	ordered := cloneSessions(sessions)
	sort.SliceStable(ordered, func(i int, j int) bool {
		if ordered[i].StartTime != ordered[j].StartTime {
			return ordered[i].StartTime < ordered[j].StartTime
		}
		return ordered[i].ID < ordered[j].ID
	})

	gaps := make([]int, 0)
	for index := 1; index < len(ordered); index++ {
		previous := ordered[index-1]
		current := ordered[index]
		if previous.Date != current.Date {
			continue
		}
		previousEnd, err := parseTimestamp(previous.EndTime)
		if err != nil {
			continue
		}
		currentStart, err := parseTimestamp(current.StartTime)
		if err != nil {
			continue
		}
		gap := currentStart.Sub(previousEnd)
		if gap <= 0 {
			continue
		}
		gaps = append(gaps, int(math.Ceil(gap.Minutes())))
	}
	if len(gaps) == 0 {
		return 0, 0
	}

	sort.Ints(gaps)
	return gaps[len(gaps)-1], medianInt(gaps)
}

func sessionActivityBounds(sessions []contracts.Session) (string, string, string, string) {
	firstActiveAt := ""
	lastActiveAt := ""
	earliestMinute := 0
	latestMinute := 0
	foundClock := false
	for _, session := range sessions {
		start, err := parseTimestamp(session.StartTime)
		if err != nil {
			continue
		}
		end, err := parseTimestamp(session.EndTime)
		if err != nil {
			continue
		}
		if firstActiveAt == "" || session.StartTime < firstActiveAt {
			firstActiveAt = session.StartTime
		}
		if lastActiveAt == "" || session.EndTime > lastActiveAt {
			lastActiveAt = session.EndTime
		}
		startMinute := start.UTC().Hour()*60 + start.UTC().Minute()
		endMinute := end.UTC().Hour()*60 + end.UTC().Minute()
		if !foundClock || startMinute < earliestMinute {
			earliestMinute = startMinute
		}
		if !foundClock || endMinute > latestMinute {
			latestMinute = endMinute
		}
		foundClock = true
	}
	if !foundClock {
		return firstActiveAt, lastActiveAt, "", ""
	}
	return firstActiveAt, lastActiveAt, formatClockMinutes(earliestMinute), formatClockMinutes(latestMinute)
}

func buildWeekdayHeatmap(sessions []contracts.Session) []contracts.HeatmapKpiPoint {
	labels := []string{"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
	totals := make([]int, len(labels))
	for _, session := range sessions {
		day, err := time.Parse(dateLayout, session.Date)
		if err != nil {
			continue
		}
		index := (int(day.Weekday()) + 6) % 7
		totals[index] += session.DurationMinutes
	}
	points := make([]contracts.HeatmapKpiPoint, 0, len(labels))
	for index, label := range labels {
		points = append(points, contracts.HeatmapKpiPoint{
			Index:        index,
			Label:        label,
			TotalMinutes: totals[index],
		})
	}
	return points
}

func buildHourlyHeatmap(sessions []contracts.Session) []contracts.HeatmapKpiPoint {
	totals := make([]int, 24)
	for _, session := range sessions {
		start, err := parseTimestamp(session.StartTime)
		if err != nil {
			continue
		}
		remaining := session.DurationMinutes
		current := start.UTC()
		for remaining > 0 {
			nextHour := time.Date(current.Year(), current.Month(), current.Day(), current.Hour()+1, 0, 0, 0, time.UTC)
			minutesUntilHour := int(math.Ceil(nextHour.Sub(current).Minutes()))
			if minutesUntilHour <= 0 {
				minutesUntilHour = 60
			}
			allocated := remaining
			if allocated > minutesUntilHour {
				allocated = minutesUntilHour
			}
			totals[current.Hour()] += allocated
			remaining -= allocated
			current = current.Add(time.Duration(allocated) * time.Minute)
		}
	}

	points := make([]contracts.HeatmapKpiPoint, 0, 24)
	for hour, total := range totals {
		points = append(points, contracts.HeatmapKpiPoint{
			Index:        hour,
			Label:        fmt.Sprintf("%02d:00", hour),
			TotalMinutes: total,
		})
	}
	return points
}

func percentDelta(current int, previous int) float64 {
	if previous == 0 {
		if current == 0 {
			return 0
		}
		return 100
	}
	return roundOneDecimal(((float64(current) - float64(previous)) / float64(previous)) * 100)
}

func percentOfTotal(value int, total int) float64 {
	if total <= 0 {
		return 0
	}
	return roundOneDecimal((float64(value) / float64(total)) * 100)
}

func roundOneDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}

func groupSessionsByDate(sessions []contracts.Session) map[string][]contracts.Session {
	grouped := make(map[string][]contracts.Session)
	for _, session := range sessions {
		grouped[session.Date] = append(grouped[session.Date], session)
	}
	return grouped
}

func buildProjectSummaries(sessions []contracts.Session) []contracts.ProjectSummary {
	total := totalMinutes(sessions)
	aggregates := make(map[string]*projectAggregate)
	for _, session := range sessions {
		projectName := normalizeProjectName(session.ProjectName)
		entry, ok := aggregates[projectName]
		if !ok {
			entry = &projectAggregate{
				projectName: projectName,
				activeDays:  make(map[string]struct{}),
			}
			aggregates[projectName] = entry
		}
		entry.totalMinutes += session.DurationMinutes
		entry.sessionCount++
		entry.activeDays[session.Date] = struct{}{}
		if session.EndTime > entry.lastActiveAt {
			entry.lastActiveAt = session.EndTime
		}
	}

	summaries := make([]contracts.ProjectSummary, 0, len(aggregates))
	for _, entry := range aggregates {
		summaries = append(summaries, contracts.ProjectSummary{
			ProjectName:  entry.projectName,
			TotalMinutes: entry.totalMinutes,
			SessionCount: entry.sessionCount,
			ActiveDays:   len(entry.activeDays),
			ShareOfTotal: shareOfTotal(entry.totalMinutes, total),
			LastActiveAt: entry.lastActiveAt,
		})
	}

	sort.SliceStable(summaries, func(i int, j int) bool {
		if summaries[i].TotalMinutes != summaries[j].TotalMinutes {
			return summaries[i].TotalMinutes > summaries[j].TotalMinutes
		}
		if summaries[i].SessionCount != summaries[j].SessionCount {
			return summaries[i].SessionCount > summaries[j].SessionCount
		}
		return summaries[i].ProjectName < summaries[j].ProjectName
	})

	return summaries
}

func buildLanguageSummaries(sessions []contracts.Session) []contracts.LanguageSummary {
	total := totalMinutes(sessions)
	aggregates := make(map[string]*languageAggregate)
	for _, session := range sessions {
		entry, ok := aggregates[session.Language]
		if !ok {
			entry = &languageAggregate{
				language:   session.Language,
				activeDays: make(map[string]struct{}),
			}
			aggregates[session.Language] = entry
		}
		entry.totalMinutes += session.DurationMinutes
		entry.sessionCount++
		entry.activeDays[session.Date] = struct{}{}
		if session.EndTime > entry.lastActiveAt {
			entry.lastActiveAt = session.EndTime
		}
	}

	summaries := make([]contracts.LanguageSummary, 0, len(aggregates))
	for _, entry := range aggregates {
		summaries = append(summaries, contracts.LanguageSummary{
			Language:     entry.language,
			TotalMinutes: entry.totalMinutes,
			SessionCount: entry.sessionCount,
			ActiveDays:   len(entry.activeDays),
			ShareOfTotal: shareOfTotal(entry.totalMinutes, total),
			LastActiveAt: entry.lastActiveAt,
		})
	}

	sort.SliceStable(summaries, func(i int, j int) bool {
		if summaries[i].TotalMinutes != summaries[j].TotalMinutes {
			return summaries[i].TotalMinutes > summaries[j].TotalMinutes
		}
		if summaries[i].SessionCount != summaries[j].SessionCount {
			return summaries[i].SessionCount > summaries[j].SessionCount
		}
		return summaries[i].Language < summaries[j].Language
	})

	return summaries
}

func buildMachineSummaries(sessions []contracts.Session, machineIndex map[string]contracts.MachineInfo) []contracts.MachineSummary {
	aggregates := make(map[string]*machineAggregate)
	for _, session := range sessions {
		entry, ok := aggregates[session.MachineID]
		if !ok {
			machine := machineIndex[session.MachineID]
			name := machine.MachineName
			if name == "" {
				name = fallbackMachineName(session)
			}
			entry = &machineAggregate{
				machineID:   session.MachineID,
				machineName: name,
				osPlatform:  machine.OSPlatform,
				activeDays:  make(map[string]struct{}),
			}
			aggregates[session.MachineID] = entry
		}
		entry.totalMinutes += session.DurationMinutes
		entry.sessionCount++
		entry.activeDays[session.Date] = struct{}{}
		if session.EndTime > entry.lastActiveAt {
			entry.lastActiveAt = session.EndTime
		}
	}

	summaries := make([]contracts.MachineSummary, 0, len(aggregates))
	for _, entry := range aggregates {
		summaries = append(summaries, contracts.MachineSummary{
			MachineID:    entry.machineID,
			MachineName:  entry.machineName,
			OSPlatform:   entry.osPlatform,
			TotalMinutes: entry.totalMinutes,
			SessionCount: entry.sessionCount,
			ActiveDays:   len(entry.activeDays),
			LastActiveAt: entry.lastActiveAt,
		})
	}

	sort.SliceStable(summaries, func(i int, j int) bool {
		if summaries[i].TotalMinutes != summaries[j].TotalMinutes {
			return summaries[i].TotalMinutes > summaries[j].TotalMinutes
		}
		if summaries[i].SessionCount != summaries[j].SessionCount {
			return summaries[i].SessionCount > summaries[j].SessionCount
		}
		return summaries[i].MachineName < summaries[j].MachineName
	})

	return summaries
}

func decorateSessions(sessions []contracts.Session, machineIndex map[string]contracts.MachineInfo) []contracts.Session {
	decorated := cloneSessions(sessions)
	for idx := range decorated {
		decorated[idx].ProjectName = normalizeProjectName(decorated[idx].ProjectName)
		if machine, ok := machineIndex[decorated[idx].MachineID]; ok && machine.MachineName != "" {
			decorated[idx].MachineName = machine.MachineName
		}
	}
	return decorated
}

func normalizeProjectName(projectName string) string {
	trimmed := strings.TrimSpace(projectName)
	if strings.EqualFold(trimmed, noWorkspaceSentinel) || strings.EqualFold(trimmed, legacyWorkspaceSentinel) {
		return noWorkspaceSentinel
	}
	return projectName
}

func cloneSessions(sessions []contracts.Session) []contracts.Session {
	cloned := make([]contracts.Session, len(sessions))
	copy(cloned, sessions)
	return cloned
}

func sortSessionsNewestFirst(sessions []contracts.Session) []contracts.Session {
	sort.SliceStable(sessions, func(i int, j int) bool {
		if sessions[i].StartTime != sessions[j].StartTime {
			return sessions[i].StartTime > sessions[j].StartTime
		}
		return sessions[i].ID > sessions[j].ID
	})
	return sessions
}

func totalMinutes(sessions []contracts.Session) int {
	total := 0
	for _, session := range sessions {
		total += session.DurationMinutes
	}
	return total
}

func averageSessionMinutes(sessions []contracts.Session) int {
	if len(sessions) == 0 {
		return 0
	}
	return int(float64(totalMinutes(sessions))/float64(len(sessions)) + 0.5)
}

func longestSessionMinutes(sessions []contracts.Session) int {
	longest := 0
	for _, session := range sessions {
		if session.DurationMinutes > longest {
			longest = session.DurationMinutes
		}
	}
	return longest
}

func longestDayMinutes(totals map[string]dailyAggregate) int {
	longest := 0
	for _, total := range totals {
		if total.totalMinutes > longest {
			longest = total.totalMinutes
		}
	}
	return longest
}

func countActiveDays(totals map[string]dailyAggregate) int {
	count := 0
	for _, entry := range totals {
		if entry.totalMinutes > 0 {
			count++
		}
	}
	return count
}

func inclusiveDayCount(start time.Time, end time.Time) int {
	return int(end.Sub(start).Hours()/24) + 1
}

func shareOfTotal(value int, total int) float64 {
	if total == 0 {
		return 0
	}
	return float64(value) / float64(total)
}

func summarizeActiveHours(sessions []contracts.Session) string {
	if len(sessions) == 0 {
		return "No activity recorded yet"
	}

	var earliestMinutes int
	var latestMinutes int
	found := false
	for _, session := range sessions {
		start, err := parseTimestamp(session.StartTime)
		if err != nil {
			continue
		}
		end, err := parseTimestamp(session.EndTime)
		if err != nil {
			continue
		}
		startOfDayMinutes := start.UTC().Hour()*60 + start.UTC().Minute()
		endOfDayMinutes := end.UTC().Hour()*60 + end.UTC().Minute()
		if !found || startOfDayMinutes < earliestMinutes {
			earliestMinutes = startOfDayMinutes
		}
		if !found || endOfDayMinutes > latestMinutes {
			latestMinutes = endOfDayMinutes
		}
		found = true
	}

	if !found {
		return "No activity recorded yet"
	}

	return fmt.Sprintf("%s - %s", formatClockMinutes(earliestMinutes), formatClockMinutes(latestMinutes))
}

func uniqueMachineIDs(sessions []contracts.Session) map[string]struct{} {
	seen := make(map[string]struct{})
	for _, session := range sessions {
		seen[session.MachineID] = struct{}{}
	}
	return seen
}

func firstProjectName(summaries []contracts.ProjectSummary) string {
	if len(summaries) == 0 {
		return ""
	}
	return summaries[0].ProjectName
}

func firstLanguageName(summaries []contracts.LanguageSummary) string {
	if len(summaries) == 0 {
		return ""
	}
	return summaries[0].Language
}

func firstActivityAt(events []contracts.ActivityEvent, sessions []contracts.Session) string {
	if len(events) > 0 {
		earliest := events[0].Timestamp
		for _, event := range events[1:] {
			if event.Timestamp < earliest {
				earliest = event.Timestamp
			}
		}
		return earliest
	}
	if len(sessions) > 0 {
		earliest := sessions[0].StartTime
		for _, session := range sessions[1:] {
			if session.StartTime < earliest {
				earliest = session.StartTime
			}
		}
		return earliest
	}
	return ""
}

func lastActivityAt(events []contracts.ActivityEvent, sessions []contracts.Session) string {
	if len(events) > 0 {
		latest := events[0].Timestamp
		for _, event := range events[1:] {
			if event.Timestamp > latest {
				latest = event.Timestamp
			}
		}
		return latest
	}
	if len(sessions) == 0 {
		return ""
	}
	latest := sessions[0].EndTime
	for _, session := range sessions[1:] {
		if session.EndTime > latest {
			latest = session.EndTime
		}
	}
	return latest
}

func latestSessionTimestamp(sessions []contracts.Session) string {
	latest := ""
	for _, session := range sessions {
		if session.EndTime > latest {
			latest = session.EndTime
		}
	}
	return latest
}

func fallbackMachineName(session contracts.Session) string {
	if session.MachineName != "" {
		return session.MachineName
	}
	if session.MachineID != "" {
		return session.MachineID
	}
	return "Unknown machine"
}

func formatClockMinutes(totalMinutes int) string {
	hours := totalMinutes / 60
	minutes := totalMinutes % 60
	return fmt.Sprintf("%02d:%02d", hours, minutes)
}

func systemInfoToMachineInfo(system contracts.SystemInfo) *contracts.MachineInfo {
	if system.MachineID == "" && system.MachineName == "" {
		return nil
	}

	return &contracts.MachineInfo{
		MachineID:   system.MachineID,
		MachineName: system.MachineName,
		Hostname:    system.Hostname,
		OSPlatform:  system.OSPlatform,
		OSVersion:   system.OSVersion,
		Arch:        system.Arch,
	}
}

func limitProjectSummaries(summaries []contracts.ProjectSummary, limit int) []contracts.ProjectSummary {
	if len(summaries) <= limit {
		return summaries
	}
	return summaries[:limit]
}

func limitLanguageSummaries(summaries []contracts.LanguageSummary, limit int) []contracts.LanguageSummary {
	if len(summaries) <= limit {
		return summaries
	}
	return summaries[:limit]
}

func rangeLabelOrDefault(rangeLabel string) string {
	if rangeLabel == "" {
		return "all-time"
	}

	return rangeLabel
}

func monthLabelOrDefault(month string) string {
	if month == "" {
		return time.Now().UTC().Format(monthLayout)
	}

	parsed, err := time.Parse(monthLayout, month)
	if err != nil {
		return fmt.Sprintf("Invalid month: %s", month)
	}

	return parsed.Format("January 2006")
}
