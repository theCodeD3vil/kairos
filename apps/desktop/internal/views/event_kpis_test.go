package views

import (
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func TestBuildEventActivityKpisEmptyInputs(t *testing.T) {
	summary := buildEventActivityKpis(nil, nil, contracts.TrackingSettings{}, contracts.ExtensionSettings{})

	if summary.TotalEvents != 0 {
		t.Fatalf("expected zero total events, got %d", summary.TotalEvents)
	}
	if summary.EventDensityPerMinute != 0 {
		t.Fatalf("expected zero density, got %f", summary.EventDensityPerMinute)
	}
	if summary.EditSaveRatio != 0 {
		t.Fatalf("expected zero edit/save ratio, got %f", summary.EditSaveRatio)
	}
	if summary.HeartbeatOnlySessionShare != 0 {
		t.Fatalf("expected zero heartbeat-only share, got %f", summary.HeartbeatOnlySessionShare)
	}
	if len(summary.EventTypeMixByProject) != 0 {
		t.Fatalf("expected empty project mix, got %d entries", len(summary.EventTypeMixByProject))
	}
}

func TestBuildEventActivityKpisCountsByCategory(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:00:00Z", "kairos", "go", "m1", "Host A", 60),
	}
	events := []contracts.ActivityEvent{
		buildEvent("e1", "2026-04-05T09:00:30Z", "m1", "kairos", "go", "open"),
		buildEvent("e2", "2026-04-05T09:01:00Z", "m1", "kairos", "go", "edit"),
		buildEvent("e3", "2026-04-05T09:02:00Z", "m1", "kairos", "go", "edit"),
		buildEvent("e4", "2026-04-05T09:03:30Z", "m1", "kairos", "go", "save"),
		buildEvent("e5", "2026-04-05T09:05:00Z", "m1", "kairos", "go", "heartbeat"),
		buildEvent("e6", "2026-04-05T09:09:00Z", "m1", "kairos", "go", "focus"),
		buildEvent("e7", "2026-04-05T09:10:00Z", "m1", "kairos", "go", "blur"),
	}

	summary := buildEventActivityKpis(
		sessions,
		events,
		contracts.TrackingSettings{IdleTimeoutMinutes: 5},
		contracts.ExtensionSettings{TrackEditEvents: true, TrackSaveEvents: true, TrackFileOpenEvents: true},
	)

	if summary.TotalEvents != 7 {
		t.Fatalf("expected 7 total events, got %d", summary.TotalEvents)
	}
	if summary.EventsInSessions != 7 {
		t.Fatalf("expected 7 events in sessions, got %d", summary.EventsInSessions)
	}
	if summary.EditCount != 2 {
		t.Fatalf("expected 2 edits, got %d", summary.EditCount)
	}
	if summary.SaveCount != 1 {
		t.Fatalf("expected 1 save, got %d", summary.SaveCount)
	}
	if summary.OpenCount != 1 {
		t.Fatalf("expected 1 open, got %d", summary.OpenCount)
	}
	if summary.HeartbeatCount != 1 {
		t.Fatalf("expected 1 heartbeat, got %d", summary.HeartbeatCount)
	}
	if summary.ActiveEventCount != 3 {
		t.Fatalf("expected active count 3 (edits+saves), got %d", summary.ActiveEventCount)
	}
	if summary.PassiveEventCount != 3 {
		t.Fatalf("expected passive count 3 (heartbeat+focus+blur), got %d", summary.PassiveEventCount)
	}
	if summary.NeutralEventCount != 1 {
		t.Fatalf("expected neutral count 1 (open), got %d", summary.NeutralEventCount)
	}
	if summary.EditSaveRatio != 2.0 {
		t.Fatalf("expected edit/save ratio 2.0, got %f", summary.EditSaveRatio)
	}
	if summary.EventDensityPerMinute <= 0 {
		t.Fatalf("expected positive event density, got %f", summary.EventDensityPerMinute)
	}
	if summary.MedianFirstOpenToFirstEditSeconds != 30 {
		t.Fatalf("expected 30s first-open to first-edit, got %d", summary.MedianFirstOpenToFirstEditSeconds)
	}
	if !summary.TrackEditEvents || !summary.TrackSaveEvents || !summary.TrackFileOpenEvents {
		t.Fatalf("expected tracking flags to flow through")
	}
}

func TestBuildEventActivityKpisHeartbeatOnlySession(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T09:30:00Z", "kairos", "go", "m1", "Host A", 30),
	}
	events := []contracts.ActivityEvent{
		buildEvent("e1", "2026-04-05T09:00:10Z", "m1", "kairos", "go", "heartbeat"),
		buildEvent("e2", "2026-04-05T09:10:00Z", "m1", "kairos", "go", "heartbeat"),
		buildEvent("e3", "2026-04-05T09:20:00Z", "m1", "kairos", "go", "focus"),
	}

	summary := buildEventActivityKpis(sessions, events, contracts.TrackingSettings{}, contracts.ExtensionSettings{})

	if summary.HeartbeatOnlySessionCount != 1 {
		t.Fatalf("expected 1 heartbeat-only session, got %d", summary.HeartbeatOnlySessionCount)
	}
	if summary.HeartbeatOnlySessionShare != 100 {
		t.Fatalf("expected 100%% heartbeat-only share, got %f", summary.HeartbeatOnlySessionShare)
	}
	if summary.EditCount != 0 || summary.SaveCount != 0 {
		t.Fatalf("expected no edits/saves, got edit=%d save=%d", summary.EditCount, summary.SaveCount)
	}
	if summary.EditSaveRatio != 0 {
		t.Fatalf("expected zero edit/save ratio with no saves, got %f", summary.EditSaveRatio)
	}
}

func TestBuildEventActivityKpisDisabledEditTrackingFlagsCarry(t *testing.T) {
	summary := buildEventActivityKpis(nil, nil, contracts.TrackingSettings{}, contracts.ExtensionSettings{
		TrackEditEvents:     false,
		TrackSaveEvents:     true,
		TrackFileOpenEvents: false,
	})

	if summary.TrackEditEvents {
		t.Fatalf("expected TrackEditEvents=false to flow through")
	}
	if !summary.TrackSaveEvents {
		t.Fatalf("expected TrackSaveEvents=true to flow through")
	}
	if summary.TrackFileOpenEvents {
		t.Fatalf("expected TrackFileOpenEvents=false to flow through")
	}
}

func TestBuildEventActivityKpisEditToSaveMedianAndWarmup(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:00:00Z", "kairos", "go", "m1", "Host A", 60),
	}
	events := []contracts.ActivityEvent{
		buildEvent("e0", "2026-04-05T09:00:05Z", "m1", "kairos", "go", "open"),
		buildEvent("e1", "2026-04-05T09:00:15Z", "m1", "kairos", "go", "edit"),
		buildEvent("e2", "2026-04-05T09:00:30Z", "m1", "kairos", "go", "save"),
		buildEvent("e3", "2026-04-05T09:01:00Z", "m1", "kairos", "go", "edit"),
		buildEvent("e4", "2026-04-05T09:01:10Z", "m1", "kairos", "go", "save"),
	}

	summary := buildEventActivityKpis(sessions, events, contracts.TrackingSettings{}, contracts.ExtensionSettings{})

	if summary.MedianEditToSaveSeconds <= 0 {
		t.Fatalf("expected positive median edit→save seconds, got %d", summary.MedianEditToSaveSeconds)
	}
	if summary.WarmupQualifyingSessionCount != 1 {
		t.Fatalf("expected 1 warmup-qualifying session (2 edits within 5min), got %d", summary.WarmupQualifyingSessionCount)
	}
	if summary.MedianSessionWarmupSeconds != 10 {
		t.Fatalf("expected warmup 10s (first event 09:00:05 → first sustained-edit start 09:00:15), got %d", summary.MedianSessionWarmupSeconds)
	}
}

func TestBuildEventActivityKpisActivityBurstsRequireDeepWorkSession(t *testing.T) {
	deepWorkSession := newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:30:00Z", "kairos", "go", "m1", "Host A", 90)
	shortSession := newTestSession("s2", "2026-04-05", "2026-04-05T11:00:00Z", "2026-04-05T11:20:00Z", "kairos", "go", "m1", "Host A", 20)
	events := []contracts.ActivityEvent{
		buildEvent("e1", "2026-04-05T09:00:30Z", "m1", "kairos", "go", "edit"),
		buildEvent("e2", "2026-04-05T09:01:00Z", "m1", "kairos", "go", "edit"),
		buildEvent("e3", "2026-04-05T09:01:30Z", "m1", "kairos", "go", "edit"),
		buildEvent("e4", "2026-04-05T09:02:00Z", "m1", "kairos", "go", "edit"),
		buildEvent("e5", "2026-04-05T09:02:30Z", "m1", "kairos", "go", "edit"),
		buildEvent("e6", "2026-04-05T11:00:30Z", "m1", "kairos", "go", "edit"),
		buildEvent("e7", "2026-04-05T11:01:00Z", "m1", "kairos", "go", "edit"),
		buildEvent("e8", "2026-04-05T11:01:30Z", "m1", "kairos", "go", "edit"),
		buildEvent("e9", "2026-04-05T11:02:00Z", "m1", "kairos", "go", "edit"),
		buildEvent("e10", "2026-04-05T11:02:30Z", "m1", "kairos", "go", "edit"),
	}

	summary := buildEventActivityKpis(
		[]contracts.Session{deepWorkSession, shortSession},
		events,
		contracts.TrackingSettings{},
		contracts.ExtensionSettings{},
	)

	if summary.ActivityBurstCount == 0 {
		t.Fatalf("expected burst count > 0 for deep work session, got %d", summary.ActivityBurstCount)
	}
}

func TestBuildEventActivityKpisReturnAfterIdle(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:00:00Z", "kairos", "go", "m1", "Host A", 60),
		newTestSession("s2", "2026-04-05", "2026-04-05T10:30:00Z", "2026-04-05T11:00:00Z", "kairos", "go", "m1", "Host A", 30),
		newTestSession("s3", "2026-04-05", "2026-04-05T12:00:00Z", "2026-04-05T12:30:00Z", "kairos", "go", "m1", "Host A", 30),
	}

	summary := buildEventActivityKpis(sessions, nil, contracts.TrackingSettings{IdleTimeoutMinutes: 5}, contracts.ExtensionSettings{})

	if summary.MedianReturnAfterIdleMinutes != 45 {
		t.Fatalf("expected median return-after-idle 45min (avg of 30 and 60), got %d", summary.MedianReturnAfterIdleMinutes)
	}
}

func TestBuildEventActivityKpisEventTypeMixByProjectKeepsTopBuckets(t *testing.T) {
	sessions := []contracts.Session{
		newTestSession("s1", "2026-04-05", "2026-04-05T09:00:00Z", "2026-04-05T10:00:00Z", "kairos", "go", "m1", "Host A", 60),
		newTestSession("s2", "2026-04-05", "2026-04-05T10:00:00Z", "2026-04-05T11:00:00Z", "api", "go", "m1", "Host A", 60),
	}
	events := []contracts.ActivityEvent{
		buildEvent("e1", "2026-04-05T09:00:10Z", "m1", "kairos", "go", "edit"),
		buildEvent("e2", "2026-04-05T09:00:20Z", "m1", "kairos", "go", "edit"),
		buildEvent("e3", "2026-04-05T09:00:30Z", "m1", "kairos", "go", "save"),
		buildEvent("e4", "2026-04-05T10:00:10Z", "m1", "api", "go", "edit"),
	}

	summary := buildEventActivityKpis(sessions, events, contracts.TrackingSettings{}, contracts.ExtensionSettings{})

	if len(summary.EventTypeMixByProject) != 2 {
		t.Fatalf("expected 2 project buckets, got %d", len(summary.EventTypeMixByProject))
	}
	if summary.EventTypeMixByProject[0].Name != "kairos" {
		t.Fatalf("expected kairos as top project, got %s", summary.EventTypeMixByProject[0].Name)
	}
	if summary.EventTypeMixByProject[0].EditCount != 2 || summary.EventTypeMixByProject[0].SaveCount != 1 {
		t.Fatalf("expected kairos counts edit=2 save=1, got edit=%d save=%d", summary.EventTypeMixByProject[0].EditCount, summary.EventTypeMixByProject[0].SaveCount)
	}
}

func newTestSession(id string, date string, start string, end string, project string, language string, machineID string, machineName string, durationMinutes int) contracts.Session {
	return contracts.Session{
		ID:               id,
		Date:             date,
		StartTime:        start,
		EndTime:          end,
		DurationMinutes:  durationMinutes,
		ProjectName:      project,
		Language:         language,
		MachineID:        machineID,
		MachineName:      machineName,
		SourceEventCount: 0,
	}
}

func buildEvent(id string, timestamp string, machineID string, project string, language string, eventType string) contracts.ActivityEvent {
	return contracts.ActivityEvent{
		ID:          id,
		Timestamp:   timestamp,
		EventType:   eventType,
		MachineID:   machineID,
		WorkspaceID: "workspace-1",
		ProjectName: project,
		Language:    language,
	}
}
