package settings

import (
	"context"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

const (
	reliabilityStatusNoData    = "no-data"
	reliabilityStatusHealthy   = "healthy"
	reliabilityStatusBuffered  = "buffered"
	reliabilityStatusDegraded  = "degraded"
	reliabilityStatusStale     = "stale"
	syncLatencySampleSize      = 500
	acceptedTrendDays          = 14
	healthyIngestWindow        = 5 * time.Minute
	bufferedOldestPendingLimit = time.Hour
	staleIngestWindow          = 24 * time.Hour
	degradedSyncLatencyP90     = 60
	freshLastSeenWindow        = 24 * time.Hour
	staleLastSeenWindow        = 7 * 24 * time.Hour
	minCoverageGapDays         = 2
	coverageGapsLimit          = 5
)

// buildReliabilitySummary assembles the reliability KPI block from the
// extension status row, store-backed queries, and the runtime rejected event
// counter. The settings service already holds these inputs, so the helper
// stays in this package to avoid pulling settings into views.
func buildReliabilitySummary(
	ctx context.Context,
	store *storage.Store,
	status contracts.ExtensionStatus,
	tracking contracts.TrackingSettings,
	runtimeRejectedEvents int,
	now time.Time,
) (contracts.ReliabilityKpiSummary, error) {
	summary := contracts.ReliabilityKpiSummary{
		Status:               reliabilityStatusNoData,
		AcceptedEventTrend:   []contracts.AcceptedEventTrendPoint{},
		TrackingCoverageGaps: []contracts.TrackingCoverageGap{},
		MachineFreshness:     []contracts.MachineFreshnessBucket{},
		LastSuccessfulSyncAt: status.LastSuccessfulSyncAt,
		LastHandshakeAt:      status.LastHandshakeAt,
		LastEventAt:          status.LastEventAt,
		OldestPendingEventAt: status.OldestPendingEventAt,
		// Duplicate-event totals are not persisted today; surface zero with the
		// availability flag false so the UI can label it accordingly.
		DuplicateCountAvailable: false,
	}
	if status.PendingEventCount != nil {
		summary.PendingEventCount = *status.PendingEventCount
	}
	if status.QuarantinedEventCount != nil {
		summary.QuarantinedEventCount = *status.QuarantinedEventCount
	}
	summary.RuntimeRejectedEventCount = runtimeRejectedEvents

	if store == nil {
		applyReliabilityRates(&summary)
		summary.Status = reliabilityForState(summary, tracking.TrackingEnabled, now, "")
		return summary, nil
	}

	totalAccepted, err := store.CountAcceptedEvents(ctx)
	if err != nil {
		return contracts.ReliabilityKpiSummary{}, err
	}
	summary.TotalAcceptedEvents = totalAccepted
	applyReliabilityRates(&summary)

	lastIngestedAt, err := store.GetLastIngestedAt(ctx)
	if err != nil {
		return contracts.ReliabilityKpiSummary{}, err
	}
	summary.LastIngestedAt = lastIngestedAt

	lastSessionRebuildAt, err := store.GetLastSessionUpdate(ctx)
	if err != nil {
		return contracts.ReliabilityKpiSummary{}, err
	}
	summary.LastSessionRebuildAt = lastSessionRebuildAt

	latencySamples, err := store.GetRecentSyncLatencySamples(ctx, syncLatencySampleSize)
	if err != nil {
		return contracts.ReliabilityKpiSummary{}, err
	}
	summary.SyncLatency = summarizeSyncLatency(latencySamples)

	summary.AcceptedEventTrend, err = loadAcceptedEventTrend(ctx, store, now, acceptedTrendDays)
	if err != nil {
		return contracts.ReliabilityKpiSummary{}, err
	}

	summary.TrackingCoverageGaps = coverageGapsFromTrend(summary.AcceptedEventTrend, minCoverageGapDays, coverageGapsLimit)

	machineLastSeen, err := store.ListMachineLastSeen(ctx)
	if err != nil {
		return contracts.ReliabilityKpiSummary{}, err
	}
	summary.MachineFreshness = bucketMachineFreshness(machineLastSeen, now)

	summary.BufferedTimeWindowMinutes = bufferedWindowMinutes(status.OldestPendingEventAt, now)
	summary.Status = reliabilityForState(summary, tracking.TrackingEnabled, now, lastIngestedAt)
	return summary, nil
}

func applyReliabilityRates(summary *contracts.ReliabilityKpiSummary) {
	if summary == nil {
		return
	}
	summary.RejectedEventRate = eventIssueRate(summary.RuntimeRejectedEventCount, summary.TotalAcceptedEvents)
	if summary.DuplicateCountAvailable {
		summary.DuplicateEventRate = eventIssueRate(summary.DuplicateEventCount, summary.TotalAcceptedEvents)
		return
	}
	summary.DuplicateEventRate = 0
}

func eventIssueRate(issueCount int, accepted int) float64 {
	if issueCount <= 0 {
		return 0
	}
	total := issueCount + accepted
	if total <= 0 {
		return 0
	}
	return roundOneDecimal(float64(issueCount) * 100 / float64(total))
}

func roundOneDecimal(value float64) float64 {
	return math.Round(value*10) / 10
}

func summarizeSyncLatency(samples []int) contracts.SyncLatencyStats {
	stats := contracts.SyncLatencyStats{SampleSize: len(samples)}
	if len(samples) == 0 {
		return stats
	}
	sorted := append([]int(nil), samples...)
	sort.Ints(sorted)
	stats.MedianSeconds = medianIntSorted(sorted)
	stats.P90Seconds = percentileIntSorted(sorted, 0.9)
	return stats
}

func medianIntSorted(values []int) int {
	count := len(values)
	if count == 0 {
		return 0
	}
	mid := count / 2
	if count%2 == 1 {
		return values[mid]
	}
	return int(math.Round(float64(values[mid-1]+values[mid]) / 2))
}

func percentileIntSorted(values []int, percentile float64) int {
	if len(values) == 0 {
		return 0
	}
	index := int(math.Ceil(percentile*float64(len(values)))) - 1
	if index < 0 {
		index = 0
	}
	if index >= len(values) {
		index = len(values) - 1
	}
	return values[index]
}

func loadAcceptedEventTrend(
	ctx context.Context,
	store *storage.Store,
	now time.Time,
	days int,
) ([]contracts.AcceptedEventTrendPoint, error) {
	end := now.UTC()
	start := end.AddDate(0, 0, -(days - 1))
	startDate := start.Format("2006-01-02")
	endDate := end.Format("2006-01-02")
	totals, err := store.GetAcceptedEventDailyTrend(ctx, startDate, endDate)
	if err != nil {
		return nil, err
	}
	out := make([]contracts.AcceptedEventTrendPoint, 0, days)
	for offset := 0; offset < days; offset++ {
		date := start.AddDate(0, 0, offset).Format("2006-01-02")
		out = append(out, contracts.AcceptedEventTrendPoint{
			Date:          date,
			AcceptedCount: totals[date],
		})
	}
	return out, nil
}

func coverageGapsFromTrend(
	trend []contracts.AcceptedEventTrendPoint,
	minDays int,
	limit int,
) []contracts.TrackingCoverageGap {
	gaps := make([]contracts.TrackingCoverageGap, 0)
	lastActiveIndex := -1
	for i, point := range trend {
		if point.AcceptedCount > 0 {
			if lastActiveIndex >= 0 && i-lastActiveIndex > 1 {
				gapStartIndex := lastActiveIndex + 1
				gapEndIndex := i - 1
				duration := gapEndIndex - gapStartIndex + 1
				if duration >= minDays {
					gaps = append(gaps, contracts.TrackingCoverageGap{
						StartDate:    trend[gapStartIndex].Date,
						EndDate:      trend[gapEndIndex].Date,
						DurationDays: duration,
					})
				}
			}
			lastActiveIndex = i
		}
	}
	sort.SliceStable(gaps, func(i int, j int) bool {
		if gaps[i].DurationDays != gaps[j].DurationDays {
			return gaps[i].DurationDays > gaps[j].DurationDays
		}
		return gaps[i].StartDate < gaps[j].StartDate
	})
	if len(gaps) > limit {
		gaps = gaps[:limit]
	}
	return gaps
}

func bucketMachineFreshness(lastSeenValues []string, now time.Time) []contracts.MachineFreshnessBucket {
	buckets := map[string]int{
		"fresh":       0,
		"stale":       0,
		"dormant":     0,
		"no-activity": 0,
	}
	for _, value := range lastSeenValues {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			buckets["no-activity"]++
			continue
		}
		seenAt, err := time.Parse(time.RFC3339, trimmed)
		if err != nil {
			buckets["no-activity"]++
			continue
		}
		age := now.Sub(seenAt)
		switch {
		case age <= freshLastSeenWindow:
			buckets["fresh"]++
		case age <= staleLastSeenWindow:
			buckets["stale"]++
		default:
			buckets["dormant"]++
		}
	}
	order := []string{"fresh", "stale", "dormant", "no-activity"}
	out := make([]contracts.MachineFreshnessBucket, 0, len(order))
	for _, bucket := range order {
		out = append(out, contracts.MachineFreshnessBucket{
			Bucket:       bucket,
			MachineCount: buckets[bucket],
		})
	}
	return out
}

func bufferedWindowMinutes(oldestPendingAt string, now time.Time) int {
	trimmed := strings.TrimSpace(oldestPendingAt)
	if trimmed == "" {
		return 0
	}
	pendingAt, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return 0
	}
	minutes := int(math.Round(now.Sub(pendingAt).Minutes()))
	if minutes < 0 {
		return 0
	}
	return minutes
}

func reliabilityForState(
	summary contracts.ReliabilityKpiSummary,
	trackingEnabled bool,
	now time.Time,
	lastIngestedAt string,
) string {
	if strings.TrimSpace(lastIngestedAt) == "" {
		return reliabilityStatusNoData
	}
	lastIngest, err := time.Parse(time.RFC3339, lastIngestedAt)
	if err != nil {
		return reliabilityStatusNoData
	}

	ingestAge := now.Sub(lastIngest)
	if trackingEnabled && ingestAge > staleIngestWindow {
		return reliabilityStatusStale
	}
	if summary.QuarantinedEventCount > 0 {
		return reliabilityStatusDegraded
	}
	if summary.SyncLatency.SampleSize > 0 && summary.SyncLatency.P90Seconds > degradedSyncLatencyP90 {
		return reliabilityStatusDegraded
	}
	if summary.PendingEventCount > 0 {
		oldestAge := time.Duration(summary.BufferedTimeWindowMinutes) * time.Minute
		if oldestAge > bufferedOldestPendingLimit {
			return reliabilityStatusDegraded
		}
		return reliabilityStatusBuffered
	}
	if ingestAge <= healthyIngestWindow {
		return reliabilityStatusHealthy
	}
	return reliabilityStatusHealthy
}
