package settings

import (
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestSummarizeSyncLatencyMedianAndP90(t *testing.T) {
	samples := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 100}
	stats := summarizeSyncLatency(samples)
	if stats.SampleSize != 10 {
		t.Fatalf("expected sample size 10, got %d", stats.SampleSize)
	}
	if stats.MedianSeconds != 6 {
		t.Fatalf("expected median 6, got %d", stats.MedianSeconds)
	}
	if stats.P90Seconds != 9 {
		t.Fatalf("expected p90 9, got %d", stats.P90Seconds)
	}
}

func TestSummarizeSyncLatencyEmpty(t *testing.T) {
	stats := summarizeSyncLatency(nil)
	if stats.SampleSize != 0 || stats.MedianSeconds != 0 || stats.P90Seconds != 0 {
		t.Fatalf("expected zero stats, got %+v", stats)
	}
}

func TestBucketMachineFreshnessClassifiesByAge(t *testing.T) {
	now := mustTime(t, "2026-04-10T12:00:00Z")
	lastSeen := []string{
		"2026-04-10T11:30:00Z", // fresh
		"2026-04-09T13:00:00Z", // fresh (within 24h)
		"2026-04-05T08:00:00Z", // stale (4 days ago)
		"2026-03-15T08:00:00Z", // dormant (>7d)
		"",                     // no-activity
		"not-a-date",           // no-activity
	}
	buckets := bucketMachineFreshness(lastSeen, now)
	counts := bucketsByName(buckets)
	if counts["fresh"] != 2 {
		t.Errorf("fresh = %d, want 2", counts["fresh"])
	}
	if counts["stale"] != 1 {
		t.Errorf("stale = %d, want 1", counts["stale"])
	}
	if counts["dormant"] != 1 {
		t.Errorf("dormant = %d, want 1", counts["dormant"])
	}
	if counts["no-activity"] != 2 {
		t.Errorf("no-activity = %d, want 2", counts["no-activity"])
	}
}

func TestCoverageGapsFromTrendIdentifiesGaps(t *testing.T) {
	trend := []contracts.AcceptedEventTrendPoint{
		{Date: "2026-04-01", AcceptedCount: 5},
		{Date: "2026-04-02", AcceptedCount: 0},
		{Date: "2026-04-03", AcceptedCount: 0},
		{Date: "2026-04-04", AcceptedCount: 0},
		{Date: "2026-04-05", AcceptedCount: 4},
		{Date: "2026-04-06", AcceptedCount: 0},
		{Date: "2026-04-07", AcceptedCount: 0},
		{Date: "2026-04-08", AcceptedCount: 1},
	}
	gaps := coverageGapsFromTrend(trend, 2, 5)
	if len(gaps) != 2 {
		t.Fatalf("expected 2 gaps, got %d", len(gaps))
	}
	if gaps[0].StartDate != "2026-04-02" || gaps[0].EndDate != "2026-04-04" || gaps[0].DurationDays != 3 {
		t.Errorf("longest gap mismatched: %+v", gaps[0])
	}
	if gaps[1].StartDate != "2026-04-06" || gaps[1].EndDate != "2026-04-07" || gaps[1].DurationDays != 2 {
		t.Errorf("second gap mismatched: %+v", gaps[1])
	}
}

func TestReliabilityForStateNoDataWhenLastIngestEmpty(t *testing.T) {
	state := reliabilityForState(contracts.ReliabilityKpiSummary{}, true, time.Now(), "")
	if state != reliabilityStatusNoData {
		t.Fatalf("expected no-data, got %s", state)
	}
}

func TestReliabilityForStateStaleWhenIngestTooOld(t *testing.T) {
	now := mustTime(t, "2026-04-10T12:00:00Z")
	state := reliabilityForState(contracts.ReliabilityKpiSummary{}, true, now, "2026-04-08T11:00:00Z")
	if state != reliabilityStatusStale {
		t.Fatalf("expected stale, got %s", state)
	}
}

func TestReliabilityForStateBufferedWhenPendingRecent(t *testing.T) {
	now := mustTime(t, "2026-04-10T12:00:00Z")
	summary := contracts.ReliabilityKpiSummary{
		PendingEventCount:         3,
		BufferedTimeWindowMinutes: 10,
	}
	state := reliabilityForState(summary, true, now, "2026-04-10T11:58:00Z")
	if state != reliabilityStatusBuffered {
		t.Fatalf("expected buffered, got %s", state)
	}
}

func TestReliabilityForStateDegradedWhenPendingOldOrQuarantined(t *testing.T) {
	now := mustTime(t, "2026-04-10T12:00:00Z")
	summaryOld := contracts.ReliabilityKpiSummary{
		PendingEventCount:         5,
		BufferedTimeWindowMinutes: 120,
	}
	if state := reliabilityForState(summaryOld, true, now, "2026-04-10T11:58:00Z"); state != reliabilityStatusDegraded {
		t.Fatalf("expected degraded for old pending, got %s", state)
	}
	summaryQuarantined := contracts.ReliabilityKpiSummary{
		QuarantinedEventCount: 2,
	}
	if state := reliabilityForState(summaryQuarantined, true, now, "2026-04-10T11:58:00Z"); state != reliabilityStatusDegraded {
		t.Fatalf("expected degraded for quarantined, got %s", state)
	}
	summaryLatency := contracts.ReliabilityKpiSummary{
		SyncLatency: contracts.SyncLatencyStats{SampleSize: 10, P90Seconds: 120},
	}
	if state := reliabilityForState(summaryLatency, true, now, "2026-04-10T11:58:00Z"); state != reliabilityStatusDegraded {
		t.Fatalf("expected degraded for high latency, got %s", state)
	}
}

func TestReliabilityForStateHealthyWhenRecent(t *testing.T) {
	now := mustTime(t, "2026-04-10T12:00:00Z")
	state := reliabilityForState(contracts.ReliabilityKpiSummary{}, true, now, "2026-04-10T11:58:00Z")
	if state != reliabilityStatusHealthy {
		t.Fatalf("expected healthy, got %s", state)
	}
}

func TestBufferedWindowMinutesHandlesMissingAndBadInput(t *testing.T) {
	now := mustTime(t, "2026-04-10T12:00:00Z")
	if bufferedWindowMinutes("", now) != 0 {
		t.Fatalf("expected zero minutes for empty input")
	}
	if bufferedWindowMinutes("not-a-time", now) != 0 {
		t.Fatalf("expected zero minutes for invalid input")
	}
	if got := bufferedWindowMinutes("2026-04-10T11:30:00Z", now); got != 30 {
		t.Fatalf("expected 30 minutes, got %d", got)
	}
}

func TestApplyReliabilityRates(t *testing.T) {
	summary := contracts.ReliabilityKpiSummary{
		RuntimeRejectedEventCount: 5,
		DuplicateEventCount:       10,
		DuplicateCountAvailable:   true,
		TotalAcceptedEvents:       95,
	}
	applyReliabilityRates(&summary)

	if summary.RejectedEventRate != 5 {
		t.Fatalf("expected rejected rate 5, got %.1f", summary.RejectedEventRate)
	}
	if summary.DuplicateEventRate != 9.5 {
		t.Fatalf("expected duplicate rate 9.5, got %.1f", summary.DuplicateEventRate)
	}
}

func TestApplyReliabilityRatesLeavesDuplicateRateUnavailable(t *testing.T) {
	summary := contracts.ReliabilityKpiSummary{
		DuplicateEventCount:     10,
		TotalAcceptedEvents:     90,
		DuplicateCountAvailable: false,
	}
	applyReliabilityRates(&summary)

	if summary.DuplicateEventRate != 0 {
		t.Fatalf("expected duplicate rate zero when unavailable, got %.1f", summary.DuplicateEventRate)
	}
}

func bucketsByName(buckets []contracts.MachineFreshnessBucket) map[string]int {
	out := make(map[string]int, len(buckets))
	for _, bucket := range buckets {
		out[bucket.Bucket] = bucket.MachineCount
	}
	return out
}

func mustTime(t *testing.T, value string) time.Time {
	t.Helper()
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		t.Fatalf("parse time %q: %v", value, err)
	}
	return parsed
}
