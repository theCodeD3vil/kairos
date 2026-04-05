package views

import (
	"context"
	"fmt"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

type Service interface {
	GetOverviewData(ctx context.Context) (contracts.OverviewData, error)
	GetAnalyticsData(ctx context.Context, rangeLabel string) (contracts.AnalyticsData, error)
	GetCalendarMonthData(ctx context.Context, month string) (contracts.CalendarMonthData, error)
	GetCalendarDayData(ctx context.Context, date string) (contracts.CalendarDayData, error)
	GetProjectsPageData(ctx context.Context, rangeLabel string) (contracts.ProjectsPageData, error)
	GetSessionsPageData(ctx context.Context, rangeLabel string) (contracts.SessionsPageData, error)
}

type StubService struct{}

func NewStubService() *StubService {
	return &StubService{}
}

func (s *StubService) GetOverviewData(_ context.Context) (contracts.OverviewData, error) {
	return contracts.OverviewData{
		TopProjects:       []contracts.ProjectSummary{},
		TopLanguages:      []contracts.LanguageSummary{},
		RecentSessions:    []contracts.Session{},
		WeeklyTrend:       []contracts.WeeklyTrendPoint{},
		ActiveHoursSummary: "No activity processed yet",
		TrackingEnabled:   true,
		LocalOnlyMode:     true,
		LastUpdatedAt:     time.Now().UTC().Format(time.RFC3339),
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

func rangeLabelOrDefault(rangeLabel string) string {
	if rangeLabel == "" {
		return "all-time"
	}

	return rangeLabel
}

func monthLabelOrDefault(month string) string {
	if month == "" {
		return time.Now().UTC().Format("2006-01")
	}

	parsed, err := time.Parse("2006-01", month)
	if err != nil {
		return fmt.Sprintf("Invalid month: %s", month)
	}

	return parsed.Format("January 2006")
}
