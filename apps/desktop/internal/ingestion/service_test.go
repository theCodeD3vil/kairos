package ingestion

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/sessionization"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestIngestEventsAcceptsValidBatch(t *testing.T) {
	service := newTestService(t)
	request := validRequest()

	response, err := service.IngestEvents(context.Background(), request)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if response.AcceptedCount != 2 {
		t.Fatalf("expected 2 accepted events, got %d", response.AcceptedCount)
	}

	if response.RejectedCount != 0 {
		t.Fatalf("expected 0 rejected events, got %d", response.RejectedCount)
	}
}

func TestIngestEventsPartiallyRejectsInvalidBatch(t *testing.T) {
	service := newTestService(t)
	request := validRequest()
	request.Events = append(request.Events, contracts.ActivityEvent{
		ID:          "evt-3",
		Timestamp:   "not-a-timestamp",
		EventType:   "edit",
		MachineID:   "machine-1",
		WorkspaceID: "workspace-1",
		ProjectName: "kairos",
		Language:    "go",
	})

	response, err := service.IngestEvents(context.Background(), request)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if response.AcceptedCount != 2 || response.RejectedCount != 1 {
		t.Fatalf("expected 2 accepted and 1 rejected event, got %d and %d", response.AcceptedCount, response.RejectedCount)
	}

	if len(response.Warnings) == 0 {
		t.Fatal("expected warnings for rejected event")
	}
}

func TestIngestEventsRejectsOversizedBatch(t *testing.T) {
	service := newTestService(t)
	request := validRequest()
	request.Events = make([]contracts.ActivityEvent, config.MaxEventsPerBatch+1)
	for i := range request.Events {
		request.Events[i] = contracts.ActivityEvent{
			ID:          "evt-" + strings.Repeat("x", 1),
			Timestamp:   "2026-04-05T09:00:00Z",
			EventType:   "open",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "go",
		}
	}

	_, err := service.IngestEvents(context.Background(), request)
	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		t.Fatalf("expected validation error, got %v", err)
	}
}

func TestMachineUpsertPreservesExistingOptionalFields(t *testing.T) {
	service := newTestService(t)
	request := validRequest()

	if _, err := service.IngestEvents(context.Background(), request); err != nil {
		t.Fatalf("first ingest failed: %v", err)
	}

	request.Machine.MachineName = "Kairos Renamed"
	request.Machine.Hostname = ""
	if _, err := service.IngestEvents(context.Background(), request); err != nil {
		t.Fatalf("second ingest failed: %v", err)
	}

	machines, err := service.ListKnownMachines(context.Background())
	if err != nil {
		t.Fatalf("list machines failed: %v", err)
	}

	if len(machines) != 1 {
		t.Fatalf("expected 1 machine, got %d", len(machines))
	}

	if machines[0].MachineName != "Kairos Renamed" {
		t.Fatalf("expected updated machine name, got %q", machines[0].MachineName)
	}

	if machines[0].Hostname != "kairos.local" {
		t.Fatalf("expected hostname to be preserved, got %q", machines[0].Hostname)
	}
}

func TestExtensionStatusUpdatesAfterIngestion(t *testing.T) {
	service := newTestService(t)

	if _, err := service.IngestEvents(context.Background(), validRequest()); err != nil {
		t.Fatalf("ingest failed: %v", err)
	}

	status, err := service.GetExtensionStatus(context.Background())
	if err != nil {
		t.Fatalf("status failed: %v", err)
	}

	if !status.Connected || !status.Installed {
		t.Fatalf("expected extension to be connected and installed, got %+v", status)
	}

	if status.LastEventAt != "2026-04-05T10:30:00Z" {
		t.Fatalf("expected last event at latest timestamp, got %q", status.LastEventAt)
	}
}

func TestMachineIDMismatchIsRejected(t *testing.T) {
	service := newTestService(t)
	request := validRequest()
	request.Events[0].MachineID = "other-machine"

	response, err := service.IngestEvents(context.Background(), request)
	if err != nil {
		t.Fatalf("expected no fatal error, got %v", err)
	}
	if response.AcceptedCount != 1 || response.RejectedCount != 1 {
		t.Fatalf("expected one accepted and one rejected event, got %d and %d", response.AcceptedCount, response.RejectedCount)
	}
}

func TestListRecentEventsReturnsNewestFirst(t *testing.T) {
	service := newTestService(t)
	request := validRequest()
	request.Events = []contracts.ActivityEvent{
		{
			ID:          "evt-1",
			Timestamp:   "2026-04-05T08:00:00Z",
			EventType:   "open",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "go",
		},
		{
			ID:          "evt-2",
			Timestamp:   "2026-04-05T11:00:00Z",
			EventType:   "edit",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "go",
		},
		{
			ID:          "evt-3",
			Timestamp:   "2026-04-05T09:00:00Z",
			EventType:   "save",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "go",
		},
	}

	if _, err := service.IngestEvents(context.Background(), request); err != nil {
		t.Fatalf("ingest failed: %v", err)
	}

	events, err := service.ListRecentEvents(context.Background(), 2)
	if err != nil {
		t.Fatalf("list recent events failed: %v", err)
	}

	if len(events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(events))
	}

	if events[0].ID != "evt-2" || events[1].ID != "evt-3" {
		t.Fatalf("expected newest-first ordering, got %+v", events)
	}
}

func TestIngestionStatsUpdateCorrectly(t *testing.T) {
	service := newTestService(t)
	request := validRequest()
	request.Events = append(request.Events, contracts.ActivityEvent{
		ID:          "",
		Timestamp:   "2026-04-05T12:00:00Z",
		EventType:   "edit",
		MachineID:   "machine-1",
		WorkspaceID: "workspace-1",
		ProjectName: "kairos",
		Language:    "go",
	})

	if _, err := service.IngestEvents(context.Background(), request); err != nil {
		t.Fatalf("ingest failed: %v", err)
	}

	stats, err := service.GetIngestionStats(context.Background())
	if err != nil {
		t.Fatalf("stats failed: %v", err)
	}

	if stats.TotalAcceptedEvents != 2 {
		t.Fatalf("expected 2 accepted events, got %d", stats.TotalAcceptedEvents)
	}

	if stats.TotalRejectedEvents != 1 {
		t.Fatalf("expected 1 rejected event, got %d", stats.TotalRejectedEvents)
	}

	if stats.KnownMachineCount != 1 {
		t.Fatalf("expected 1 known machine, got %d", stats.KnownMachineCount)
	}

	if stats.LastMachineSeen != "machine-1" {
		t.Fatalf("expected last machine seen to be machine-1, got %q", stats.LastMachineSeen)
	}

	if stats.LastEventAt != "2026-04-05T10:30:00Z" {
		t.Fatalf("expected last event at latest accepted event, got %q", stats.LastEventAt)
	}
}

func TestIngestEventsRebuildsSessionsForAcceptedEvents(t *testing.T) {
	service := newTestService(t)

	if _, err := service.IngestEvents(context.Background(), validRequest()); err != nil {
		t.Fatalf("ingest failed: %v", err)
	}

	sessions, err := service.store.ListSessionsForDate(context.Background(), "2026-04-05")
	if err != nil {
		t.Fatalf("list rebuilt sessions failed: %v", err)
	}
	if len(sessions) == 0 {
		t.Fatal("expected sessions to be rebuilt from accepted events")
	}
}

func TestOptionalFieldLengthLimitsAreTruncated(t *testing.T) {
	service := newTestService(t)
	request := validRequest()
	request.Machine.Hostname = strings.Repeat("h", config.MaxHostnameLength+10)
	request.Events[0].FilePath = strings.Repeat("/", config.MaxFilePathLength+50)

	response, err := service.IngestEvents(context.Background(), request)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if response.AcceptedCount != 2 {
		t.Fatalf("expected accepted batch, got %d accepted", response.AcceptedCount)
	}
	if len(response.Warnings) == 0 {
		t.Fatal("expected truncation warnings")
	}
}

func TestTrackingDisabledRejectsProcessing(t *testing.T) {
	service, settingsService := newTestServiceWithSettings(t)
	if _, err := settingsService.UpdateTrackingSettings(context.Background(), contracts.TrackingSettings{
		TrackingEnabled:              false,
		IdleDetectionEnabled:         true,
		TrackProjectActivity:         true,
		TrackLanguageActivity:        true,
		TrackMachineAttribution:      true,
		TrackSessionBoundaries:       true,
		IdleTimeoutMinutes:           5,
		SessionMergeThresholdMinutes: 10,
	}); err != nil {
		t.Fatalf("update tracking settings failed: %v", err)
	}

	response, err := service.IngestEvents(context.Background(), validRequest())
	if err != nil {
		t.Fatalf("expected no fatal error, got %v", err)
	}
	if response.AcceptedCount != 0 || response.RejectedCount != 2 {
		t.Fatalf("expected tracking-disabled batch to reject processing, got %+v", response)
	}

	stats, err := service.GetIngestionStats(context.Background())
	if err != nil {
		t.Fatalf("stats failed: %v", err)
	}
	if stats.TotalAcceptedEvents != 0 {
		t.Fatalf("expected no accepted persisted events, got %d", stats.TotalAcceptedEvents)
	}
}

func TestFilePathPrivacyAndExclusionsAreApplied(t *testing.T) {
	service, settingsService := newTestServiceWithSettings(t)
	if _, err := settingsService.UpdatePrivacySettings(context.Background(), contracts.PrivacySettings{
		LocalOnlyMode:             true,
		FilePathMode:              "hidden",
		ShowMachineNames:          true,
		ShowHostname:              false,
		ObfuscateProjectNames:     false,
		MinimizeExtensionMetadata: true,
	}); err != nil {
		t.Fatalf("update privacy settings failed: %v", err)
	}
	if _, err := settingsService.UpdateExclusionsSettings(context.Background(), contracts.ExclusionsSettings{
		ProjectNames: []string{"ignore-me"},
	}); err != nil {
		t.Fatalf("update exclusions failed: %v", err)
	}

	request := validRequest()
	request.Events[0].FilePath = "/Users/me/Projects/kairos/main.go"
	request.Events[0].ProjectName = "ignore-me"
	request.Events[1].FilePath = "/Users/me/Projects/kairos/service.go"

	response, err := service.IngestEvents(context.Background(), request)
	if err != nil {
		t.Fatalf("expected no fatal error, got %v", err)
	}
	if response.AcceptedCount != 1 || response.RejectedCount != 1 {
		t.Fatalf("expected excluded event to be dropped, got %+v", response)
	}

	events, err := service.ListRecentEvents(context.Background(), 10)
	if err != nil {
		t.Fatalf("list recent events failed: %v", err)
	}
	if len(events) != 1 || events[0].FilePath != "" {
		t.Fatalf("expected hidden file path persisted, got %+v", events)
	}
}

func TestRequiredFieldLengthLimitIsRejected(t *testing.T) {
	service := newTestService(t)
	request := validRequest()
	request.Events[0].ProjectName = strings.Repeat("p", config.MaxProjectNameLength+1)

	response, err := service.IngestEvents(context.Background(), request)
	if err != nil {
		t.Fatalf("expected partial success, got %v", err)
	}
	if response.AcceptedCount != 1 || response.RejectedCount != 1 {
		t.Fatalf("expected one accepted and one rejected event, got %d and %d", response.AcceptedCount, response.RejectedCount)
	}
}

func newTestService(t *testing.T) *ServiceImpl {
	service, _ := newTestServiceWithSettings(t)
	return service
}

func newTestServiceWithSettings(t *testing.T) (*ServiceImpl, *desktopsettings.ServiceImpl) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "kairos-test.sqlite3")
	sqliteStore, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite store: %v", err)
	}
	t.Cleanup(func() {
		_ = sqliteStore.Close()
	})

	settingsService := desktopsettings.NewService(sqliteStore)
	settingsService.SetDataStorageInfo(sqliteStore.Path(), "ready")
	sessionService := sessionization.NewService(sqliteStore, settingsService)

	service := NewService(sqliteStore, settingsService, sessionService, nil)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 5, 12, 45, 0, 0, time.UTC)
	}
	return service, settingsService
}

func validRequest() contracts.IngestEventsRequest {
	return contracts.IngestEventsRequest{
		Machine: contracts.MachineInfo{
			MachineID:   "machine-1",
			MachineName: "Kairos Mac",
			Hostname:    "kairos.local",
			OSPlatform:  "darwin",
			OSVersion:   "14.6",
			Arch:        "arm64",
		},
		Extension: contracts.ExtensionInfo{
			Editor:           "vscode",
			EditorVersion:    "1.99.0",
			ExtensionVersion: "0.1.0",
		},
		Events: []contracts.ActivityEvent{
			{
				ID:          "evt-1",
				Timestamp:   "2026-04-05T09:00:00Z",
				EventType:   "open",
				MachineID:   "machine-1",
				WorkspaceID: "workspace-1",
				ProjectName: "kairos",
				Language:    "go",
			},
			{
				ID:          "evt-2",
				Timestamp:   "2026-04-05T10:30:00Z",
				EventType:   "edit",
				MachineID:   "machine-1",
				WorkspaceID: "workspace-1",
				ProjectName: "kairos",
				Language:    "typescript",
			},
		},
	}
}
