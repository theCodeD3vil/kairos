package views

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

const (
	overviewRecentSessionsLimit  = 5
	analyticsRecentSessionsLimit = 10
	topSummaryLimit              = 5
	dateLayout                   = "2006-01-02"
	monthLayout                  = "2006-01"
	noWorkspaceSentinel          = "no-workspace"
	legacyWorkspaceSentinel      = "untitled-workspace"
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

	daily := aggregateDailyTotals(sessions)
	recentSessions := sortSessionsNewestFirst(cloneSessions(sessions))
	if len(recentSessions) > analyticsRecentSessionsLimit {
		recentSessions = recentSessions[:analyticsRecentSessionsLimit]
	}

	previousPeriodMinutes, err := s.previousPeriodMinutes(ctx, period)
	if err != nil {
		return contracts.AnalyticsData{}, err
	}

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
	current := startOfDayUTC(now)
	offset := int(current.Weekday()) - int(time.Monday)
	if offset < 0 {
		offset += 7
	}
	start := current.AddDate(0, 0, -offset)
	end := start.AddDate(0, 0, 6)
	return buildResolvedRange("week", start, end)
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
