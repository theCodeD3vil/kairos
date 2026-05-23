package views

import (
	"sort"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

const (
	scoreDirectionHigher = "higher-is-better"
	scoreDirectionLower  = "lower-is-better"
)

// Insight scores intentionally compose already-visible KPI inputs. Each score
// returns the normalized inputs used to calculate it so the UI can show why the
// number moved without adding opaque model logic.
func buildInsightScores(
	sessions []contracts.Session,
	period resolvedRange,
	previousPeriodMinutes *int,
	sessionKpis contracts.SessionKpiSummary,
	contextKpis contracts.ContextKpiSummary,
	eventKpis contracts.EventActivityKpiSummary,
	reliability contracts.ReliabilityKpiSummary,
) contracts.InsightScoreSummary {
	total := totalMinutes(sessions)
	projectInvestmentScore, projectInvestmentBreakdown := buildProjectInvestmentScore(sessions, sessionKpis, contextKpis)

	return contracts.InsightScoreSummary{
		MomentumScore:              buildMomentumScore(total, previousPeriodMinutes, sessionKpis),
		FocusScore:                 buildFocusScore(total, sessionKpis, contextKpis),
		ConsistencyScore:           buildConsistencyScore(period, sessionKpis),
		FragmentationScore:         buildFragmentationScore(sessionKpis, contextKpis),
		RecoveryScore:              buildRecoveryScore(sessionKpis, eventKpis),
		TrackingHealthScore:        buildTrackingHealthScore(reliability),
		ProjectInvestmentScore:     projectInvestmentScore,
		ProjectInvestmentBreakdown: projectInvestmentBreakdown,
	}
}

func buildMomentumScore(
	totalMinutes int,
	previousPeriodMinutes *int,
	sessionKpis contracts.SessionKpiSummary,
) contracts.InsightScore {
	previous := 0
	if previousPeriodMinutes != nil {
		previous = *previousPeriodMinutes
	}
	if totalMinutes == 0 && previous == 0 {
		return emptyInsightScore(scoreDirectionHigher)
	}
	rollingDelta := percentDelta(sessionKpis.Rolling7DayAverageMinutes, sessionKpis.Rolling30DayAverageMinutes)
	periodDelta := sessionKpis.PreviousPeriodDeltaPercent
	return weightedInsightScore(scoreDirectionHigher, []contracts.InsightScoreInput{
		{Label: "7d vs 30d average", Value: rollingDelta, Score: deltaToScore(rollingDelta), Weight: 0.45},
		{Label: "Current vs previous period", Value: periodDelta, Score: deltaToScore(periodDelta), Weight: 0.55},
	})
}

func buildFocusScore(
	totalMinutes int,
	sessionKpis contracts.SessionKpiSummary,
	contextKpis contracts.ContextKpiSummary,
) contracts.InsightScore {
	if totalMinutes <= 0 {
		return emptyInsightScore(scoreDirectionHigher)
	}
	deepWorkShare := percentOfTotal(sessionKpis.DeepWorkMinutes, totalMinutes)
	switchPressure := contextKpis.ProjectSwitchRatePerDay + contextKpis.LanguageSwitchRatePerDay
	switchScore := clampScore(100 - switchPressure*25)
	topProjectScore := clampScore(contextKpis.ProjectFocusScore)
	return weightedInsightScore(scoreDirectionHigher, []contracts.InsightScoreInput{
		{Label: "Deep work share", Value: deepWorkShare, Score: deepWorkShare, Weight: 0.4},
		{Label: "Top project concentration", Value: topProjectScore, Score: topProjectScore, Weight: 0.35},
		{Label: "Low switching", Value: switchPressure, Score: switchScore, Weight: 0.25},
	})
}

func buildConsistencyScore(period resolvedRange, sessionKpis contracts.SessionKpiSummary) contracts.InsightScore {
	periodDays := inclusiveDayCount(period.start, period.end)
	if periodDays <= 0 || sessionKpis.ActiveDays == 0 {
		return emptyInsightScore(scoreDirectionHigher)
	}
	streakTarget := minInt(7, periodDays)
	longestStreakTarget := minInt(periodDays, 30)
	currentStreakScore := percentOfTotal(minInt(sessionKpis.CurrentStreakDays, streakTarget), streakTarget)
	longestStreakScore := percentOfTotal(minInt(sessionKpis.LongestStreakDays, longestStreakTarget), longestStreakTarget)
	return weightedInsightScore(scoreDirectionHigher, []contracts.InsightScoreInput{
		{Label: "Active-day coverage", Value: sessionKpis.ConsistencyScore, Score: clampScore(sessionKpis.ConsistencyScore), Weight: 0.6},
		{Label: "Current streak", Value: float64(sessionKpis.CurrentStreakDays), Score: currentStreakScore, Weight: 0.25},
		{Label: "Longest streak", Value: float64(sessionKpis.LongestStreakDays), Score: longestStreakScore, Weight: 0.15},
	})
}

func buildFragmentationScore(
	sessionKpis contracts.SessionKpiSummary,
	contextKpis contracts.ContextKpiSummary,
) contracts.InsightScore {
	switchPressure := clampScore((contextKpis.ProjectSwitchRatePerDay + contextKpis.LanguageSwitchRatePerDay) * 25)
	breakPressure := breakFragmentationPressure(sessionKpis.MedianBreakMinutes)
	return weightedInsightScore(scoreDirectionLower, []contracts.InsightScoreInput{
		{Label: "Short-session share", Value: sessionKpis.FragmentationScore, Score: clampScore(sessionKpis.FragmentationScore), Weight: 0.5},
		{Label: "Switching pressure", Value: contextKpis.ProjectSwitchRatePerDay + contextKpis.LanguageSwitchRatePerDay, Score: switchPressure, Weight: 0.3},
		{Label: "Break-gap pressure", Value: float64(sessionKpis.MedianBreakMinutes), Score: breakPressure, Weight: 0.2},
	})
}

func buildRecoveryScore(
	sessionKpis contracts.SessionKpiSummary,
	eventKpis contracts.EventActivityKpiSummary,
) contracts.InsightScore {
	returnAfterIdle := eventKpis.MedianReturnAfterIdleMinutes
	if returnAfterIdle == 0 {
		returnAfterIdle = sessionKpis.MedianBreakMinutes
	}
	if returnAfterIdle == 0 && sessionKpis.MedianBreakMinutes == 0 {
		return emptyInsightScore(scoreDirectionHigher)
	}
	breakScore := recoveryIntervalScore(sessionKpis.MedianBreakMinutes)
	returnScore := recoveryIntervalScore(returnAfterIdle)
	continuityScore := clampScore(100 - sessionKpis.FragmentationScore)
	return weightedInsightScore(scoreDirectionHigher, []contracts.InsightScoreInput{
		{Label: "Return after idle", Value: float64(returnAfterIdle), Score: returnScore, Weight: 0.5},
		{Label: "Median break", Value: float64(sessionKpis.MedianBreakMinutes), Score: breakScore, Weight: 0.3},
		{Label: "Session continuity", Value: sessionKpis.FragmentationScore, Score: continuityScore, Weight: 0.2},
	})
}

func buildTrackingHealthScore(reliability contracts.ReliabilityKpiSummary) contracts.InsightScore {
	statusScore := reliabilityStatusScore(reliability.Status)
	if reliability.Status == "" || reliability.Status == "no-data" {
		return weightedInsightScore(scoreDirectionHigher, []contracts.InsightScoreInput{
			{Label: "Tracking status", Value: statusScore, Score: statusScore, Weight: 1},
		})
	}
	latencyScore := syncLatencyHealthScore(reliability.SyncLatency)
	pendingScore := clampScore(100 - float64(reliability.PendingEventCount)*10)
	rejectedScore := clampScore(100 - reliability.RejectedEventRate*10)
	return weightedInsightScore(scoreDirectionHigher, []contracts.InsightScoreInput{
		{Label: "Tracking status", Value: statusScore, Score: statusScore, Weight: 0.4},
		{Label: "Sync latency p90", Value: float64(reliability.SyncLatency.P90Seconds), Score: latencyScore, Weight: 0.25},
		{Label: "Pending event count", Value: float64(reliability.PendingEventCount), Score: pendingScore, Weight: 0.2},
		{Label: "Rejected event rate", Value: reliability.RejectedEventRate, Score: rejectedScore, Weight: 0.15},
	})
}

func buildProjectInvestmentScore(
	sessions []contracts.Session,
	sessionKpis contracts.SessionKpiSummary,
	contextKpis contracts.ContextKpiSummary,
) (contracts.InsightScore, []contracts.ProjectInvestmentScore) {
	summaries := buildProjectSummaries(sessions)
	if len(summaries) == 0 {
		return emptyInsightScore(scoreDirectionHigher), []contracts.ProjectInvestmentScore{}
	}

	momentumByProject := make(map[string]float64, len(contextKpis.ProjectMomentum))
	for _, point := range contextKpis.ProjectMomentum {
		momentumByProject[point.Name] = point.DeltaPercent
	}

	breakdown := make([]contracts.ProjectInvestmentScore, 0, len(summaries))
	for _, summary := range summaries {
		timeShareScore := clampScore(summary.ShareOfTotal * 100)
		activeDayScore := percentOfTotal(summary.ActiveDays, sessionKpis.ActiveDays)
		momentumPercent := momentumByProject[summary.ProjectName]
		momentumScore := deltaToScore(momentumPercent)
		score := weightedScore([]contracts.InsightScoreInput{
			{Score: timeShareScore, Weight: 0.5},
			{Score: activeDayScore, Weight: 0.3},
			{Score: momentumScore, Weight: 0.2},
		})
		breakdown = append(breakdown, contracts.ProjectInvestmentScore{
			ProjectName:     summary.ProjectName,
			Score:           score,
			TotalMinutes:    summary.TotalMinutes,
			ActiveDays:      summary.ActiveDays,
			MomentumPercent: momentumPercent,
			ShareOfTotal:    roundOneDecimal(summary.ShareOfTotal * 100),
		})
	}

	sort.SliceStable(breakdown, func(i int, j int) bool {
		if breakdown[i].Score != breakdown[j].Score {
			return breakdown[i].Score > breakdown[j].Score
		}
		return breakdown[i].ProjectName < breakdown[j].ProjectName
	})
	if len(breakdown) > topSummaryLimit {
		breakdown = breakdown[:topSummaryLimit]
	}

	top := breakdown[0]
	topScore := weightedInsightScore(scoreDirectionHigher, []contracts.InsightScoreInput{
		{Label: "Top project time share", Value: top.ShareOfTotal, Score: top.ShareOfTotal, Weight: 0.5},
		{Label: "Top project active days", Value: float64(top.ActiveDays), Score: percentOfTotal(top.ActiveDays, sessionKpis.ActiveDays), Weight: 0.3},
		{Label: "Top project momentum", Value: top.MomentumPercent, Score: deltaToScore(top.MomentumPercent), Weight: 0.2},
	})
	return topScore, breakdown
}

func emptyInsightScore(direction string) contracts.InsightScore {
	return contracts.InsightScore{
		Score:     0,
		Direction: direction,
		Inputs:    []contracts.InsightScoreInput{},
	}
}

func weightedInsightScore(direction string, inputs []contracts.InsightScoreInput) contracts.InsightScore {
	out := make([]contracts.InsightScoreInput, 0, len(inputs))
	for _, input := range inputs {
		input.Score = clampScore(input.Score)
		out = append(out, input)
	}
	return contracts.InsightScore{
		Score:     weightedScore(out),
		Direction: direction,
		Inputs:    out,
	}
}

func weightedScore(inputs []contracts.InsightScoreInput) float64 {
	totalWeight := 0.0
	weightedTotal := 0.0
	for _, input := range inputs {
		if input.Weight <= 0 {
			continue
		}
		totalWeight += input.Weight
		weightedTotal += clampScore(input.Score) * input.Weight
	}
	if totalWeight == 0 {
		return 0
	}
	return roundOneDecimal(weightedTotal / totalWeight)
}

func deltaToScore(delta float64) float64 {
	return clampScore(50 + clampFloat(delta, -100, 100)/2)
}

func breakFragmentationPressure(minutes int) float64 {
	switch {
	case minutes <= 0:
		return 0
	case minutes <= 30:
		return 20
	case minutes <= 120:
		return 50
	default:
		return clampScore(50 + float64(minutes-120)/6)
	}
}

func recoveryIntervalScore(minutes int) float64 {
	switch {
	case minutes <= 0:
		return 0
	case minutes < 10:
		return roundOneDecimal(float64(minutes) * 5)
	case minutes <= 120:
		return 100
	case minutes <= 360:
		return roundOneDecimal(100 - (float64(minutes-120) / 240 * 40))
	default:
		return 40
	}
}

func reliabilityStatusScore(status string) float64 {
	switch status {
	case "healthy":
		return 100
	case "buffered":
		return 75
	case "degraded":
		return 45
	case "stale":
		return 35
	case "no-data":
		return 0
	default:
		return 0
	}
}

func syncLatencyHealthScore(stats contracts.SyncLatencyStats) float64 {
	if stats.SampleSize == 0 {
		return 0
	}
	p90 := stats.P90Seconds
	switch {
	case p90 <= 5:
		return 100
	case p90 <= 60:
		return roundOneDecimal(100 - (float64(p90-5) / 55 * 40))
	case p90 <= 300:
		return roundOneDecimal(60 - (float64(p90-60) / 240 * 40))
	default:
		return 20
	}
}

func clampScore(value float64) float64 {
	return roundOneDecimal(clampFloat(value, 0, 100))
}

func clampFloat(value float64, min float64, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func minInt(left int, right int) int {
	if left < right {
		return left
	}
	return right
}
