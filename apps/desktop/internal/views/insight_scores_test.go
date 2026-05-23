package views

import (
	"math"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestBuildInsightScoresZeroActivity(t *testing.T) {
	period := testResolvedRange(t, "2026-04-01", "2026-04-07")
	summary := buildInsightScores(
		nil,
		period,
		nil,
		contracts.SessionKpiSummary{},
		contracts.ContextKpiSummary{},
		contracts.EventActivityKpiSummary{},
		contracts.ReliabilityKpiSummary{},
	)

	if summary.MomentumScore.Score != 0 {
		t.Fatalf("expected zero momentum score, got %.1f", summary.MomentumScore.Score)
	}
	if summary.FragmentationScore.Direction != scoreDirectionLower {
		t.Fatalf("expected fragmentation to be lower-is-better, got %q", summary.FragmentationScore.Direction)
	}
	if len(summary.ProjectInvestmentBreakdown) != 0 {
		t.Fatalf("expected no project investment breakdown, got %+v", summary.ProjectInvestmentBreakdown)
	}
	assertInsightScoreRange(t, summary)
}

func TestBuildInsightScoresCompositeInputs(t *testing.T) {
	period := testResolvedRange(t, "2026-04-01", "2026-04-07")
	previous := 180
	sessions := []contracts.Session{
		{ID: "s1", Date: "2026-04-01", StartTime: "2026-04-01T09:00:00Z", EndTime: "2026-04-01T11:00:00Z", DurationMinutes: 120, MachineID: "m1", ProjectName: "kairos", Language: "go"},
		{ID: "s2", Date: "2026-04-02", StartTime: "2026-04-02T09:00:00Z", EndTime: "2026-04-02T10:30:00Z", DurationMinutes: 90, MachineID: "m1", ProjectName: "kairos", Language: "go"},
		{ID: "s3", Date: "2026-04-03", StartTime: "2026-04-03T09:00:00Z", EndTime: "2026-04-03T09:30:00Z", DurationMinutes: 30, MachineID: "m1", ProjectName: "docs", Language: "markdown"},
	}
	sessionKpis := contracts.SessionKpiSummary{
		ActiveDays:                 3,
		CurrentStreakDays:          3,
		LongestStreakDays:          3,
		Rolling7DayAverageMinutes:  34,
		Rolling30DayAverageMinutes: 18,
		PreviousPeriodDeltaPercent: 33.3,
		DeepWorkMinutes:            210,
		FragmentationScore:         10,
		MedianBreakMinutes:         60,
		ConsistencyScore:           42.9,
	}
	contextKpis := contracts.ContextKpiSummary{
		ProjectSwitchRatePerDay:  0.3,
		LanguageSwitchRatePerDay: 0.3,
		ProjectFocusScore:        87.5,
		ProjectMomentum: []contracts.ContextMomentumPoint{
			{Name: "kairos", CurrentMinutes: 210, PreviousMinutes: 100, DeltaPercent: 110},
			{Name: "docs", CurrentMinutes: 30, PreviousMinutes: 80, DeltaPercent: -62.5},
		},
	}
	eventKpis := contracts.EventActivityKpiSummary{MedianReturnAfterIdleMinutes: 45}
	reliability := contracts.ReliabilityKpiSummary{
		Status:              "healthy",
		TotalAcceptedEvents: 240,
		SyncLatency:         contracts.SyncLatencyStats{SampleSize: 20, P90Seconds: 4},
	}

	summary := buildInsightScores(sessions, period, &previous, sessionKpis, contextKpis, eventKpis, reliability)

	if summary.MomentumScore.Score <= 50 {
		t.Fatalf("expected positive momentum score, got %.1f", summary.MomentumScore.Score)
	}
	if summary.FocusScore.Score <= 50 {
		t.Fatalf("expected focus score above midpoint, got %.1f", summary.FocusScore.Score)
	}
	if summary.TrackingHealthScore.Score != 100 {
		t.Fatalf("expected healthy tracking score, got %.1f", summary.TrackingHealthScore.Score)
	}
	if len(summary.ProjectInvestmentBreakdown) < 2 || summary.ProjectInvestmentBreakdown[0].ProjectName != "kairos" {
		t.Fatalf("expected kairos to lead project investment, got %+v", summary.ProjectInvestmentBreakdown)
	}
	if len(summary.ProjectInvestmentScore.Inputs) == 0 {
		t.Fatalf("expected project investment inputs")
	}
	assertInsightScoreRange(t, summary)
}

func TestBuildInsightScoresSparseHistoryStaysBounded(t *testing.T) {
	period := testResolvedRange(t, "2026-04-01", "2026-04-01")
	sessions := []contracts.Session{
		{ID: "s1", Date: "2026-04-01", StartTime: "2026-04-01T09:00:00Z", EndTime: "2026-04-01T09:20:00Z", DurationMinutes: 20, MachineID: "m1", ProjectName: "kairos", Language: "go"},
	}
	sessionKpis := contracts.SessionKpiSummary{
		ActiveDays:                 1,
		CurrentStreakDays:          1,
		LongestStreakDays:          1,
		Rolling7DayAverageMinutes:  3,
		Rolling30DayAverageMinutes: 1,
		PreviousPeriodDeltaPercent: 100,
		FragmentationScore:         100,
		ConsistencyScore:           100,
	}
	contextKpis := contracts.ContextKpiSummary{ProjectFocusScore: 100}
	reliability := contracts.ReliabilityKpiSummary{Status: "stale"}

	summary := buildInsightScores(sessions, period, nil, sessionKpis, contextKpis, contracts.EventActivityKpiSummary{}, reliability)

	assertInsightScoreRange(t, summary)
}

func assertInsightScoreRange(t *testing.T, summary contracts.InsightScoreSummary) {
	t.Helper()
	scores := []contracts.InsightScore{
		summary.MomentumScore,
		summary.FocusScore,
		summary.ConsistencyScore,
		summary.FragmentationScore,
		summary.RecoveryScore,
		summary.TrackingHealthScore,
		summary.ProjectInvestmentScore,
	}
	for _, score := range scores {
		if math.IsNaN(score.Score) || score.Score < 0 || score.Score > 100 {
			t.Fatalf("score out of range: %+v", score)
		}
		for _, input := range score.Inputs {
			if math.IsNaN(input.Score) || input.Score < 0 || input.Score > 100 {
				t.Fatalf("input score out of range: %+v", input)
			}
		}
	}
}

func testResolvedRange(t *testing.T, startDate string, endDate string) resolvedRange {
	t.Helper()
	start, err := time.Parse(dateLayout, startDate)
	if err != nil {
		t.Fatalf("parse start date: %v", err)
	}
	end, err := time.Parse(dateLayout, endDate)
	if err != nil {
		t.Fatalf("parse end date: %v", err)
	}
	return resolvedRange{
		label:     startDate + ".." + endDate,
		startDate: startDate,
		endDate:   endDate,
		start:     start,
		end:       end,
	}
}
