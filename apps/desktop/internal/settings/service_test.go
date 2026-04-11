package settings

import (
	"context"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestDefaultsLoadCorrectlyOnEmptyDB(t *testing.T) {
	service, store := newTestSettingsService(t)

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}

	if !data.Tracking.TrackingEnabled {
		t.Fatal("expected tracking enabled by default")
	}
	if !data.Privacy.LocalOnlyMode {
		t.Fatal("expected local only mode enabled by default")
	}
	if data.Extension.HeartbeatIntervalSeconds != 30 {
		t.Fatalf("expected default heartbeat interval 30, got %d", data.Extension.HeartbeatIntervalSeconds)
	}
	if data.DataStorage.LocalDataPath != store.Path() {
		t.Fatalf("expected local data path %q, got %q", store.Path(), data.DataStorage.LocalDataPath)
	}
	if runtime.GOOS == "linux" {
		if data.AppBehavior.MinimizeToTray {
			t.Fatal("expected minimizeToTray disabled by default on linux")
		}
	} else {
		if !data.AppBehavior.MinimizeToTray {
			t.Fatal("expected minimizeToTray enabled by default on non-linux platforms")
		}
	}
}

func TestPersistedSettingsOverrideDefaultsAndMissingSectionsFallback(t *testing.T) {
	service, _ := newTestSettingsService(t)

	updatedGeneral, err := service.UpdateGeneralSettings(context.Background(), contracts.GeneralSettings{
		MachineDisplayName:   "Focused Machine",
		DefaultDateRange:     "today",
		TimeFormat:           "12h",
		ThemeMode:            "dark",
		WeekStartsOn:         "sunday",
		PreferredLandingPage: "analytics",
	})
	if err != nil {
		t.Fatalf("UpdateGeneralSettings failed: %v", err)
	}
	if updatedGeneral.MachineDisplayName != "Focused Machine" {
		t.Fatalf("unexpected updated general section: %+v", updatedGeneral)
	}

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}

	if data.General.MachineDisplayName != "Focused Machine" {
		t.Fatalf("expected persisted general override, got %+v", data.General)
	}
	if data.General.ThemeMode != "dark" {
		t.Fatalf("expected persisted theme mode, got %q", data.General.ThemeMode)
	}
	if data.Extension.HeartbeatIntervalSeconds != 30 {
		t.Fatalf("expected missing extension section to fall back to default, got %+v", data.Extension)
	}
}

func TestUpdateGeneralSettingsRejectsInvalidThemeMode(t *testing.T) {
	service, _ := newTestSettingsService(t)

	_, err := service.UpdateGeneralSettings(context.Background(), contracts.GeneralSettings{
		MachineDisplayName:   "Focused Machine",
		DefaultDateRange:     "today",
		TimeFormat:           "12h",
		ThemeMode:            "nope",
		WeekStartsOn:         "sunday",
		PreferredLandingPage: "analytics",
	})
	if err == nil {
		t.Fatal("expected validation error for invalid theme mode")
	}
}

func TestGeneralSettingsWithoutThemeModeBackfillsLightForCompatibility(t *testing.T) {
	service, store := newTestSettingsService(t)

	if err := store.SetSettingsSection(context.Background(), SectionGeneral, `{"machineDisplayName":"Existing Machine","defaultDateRange":"week","timeFormat":"24h","weekStartsOn":"monday","preferredLandingPage":"overview"}`, "2026-04-08T12:00:00Z"); err != nil {
		t.Fatalf("seed general section failed: %v", err)
	}

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}

	if data.General.MachineDisplayName != "Existing Machine" {
		t.Fatalf("expected existing machine display name, got %q", data.General.MachineDisplayName)
	}
	if data.General.ThemeMode != "light" {
		t.Fatalf("expected backfilled light theme mode, got %q", data.General.ThemeMode)
	}
}

func TestInvalidPersistedValuesFailSafely(t *testing.T) {
	service, store := newTestSettingsService(t)

	if err := store.SetSettingsSection(context.Background(), SectionTracking, `{"idleTimeoutMinutes":0,"sessionMergeThresholdMinutes":10}`, "2026-04-08T12:00:00Z"); err != nil {
		t.Fatalf("seed invalid tracking section failed: %v", err)
	}
	if err := store.SetSettingsSection(context.Background(), SectionPrivacy, `{"filePathMode":"explode"}`, "2026-04-08T12:00:00Z"); err != nil {
		t.Fatalf("seed invalid privacy section failed: %v", err)
	}

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}

	if data.Tracking.IdleTimeoutMinutes != 5 {
		t.Fatalf("expected invalid tracking section to fall back to defaults, got %+v", data.Tracking)
	}
	if data.Privacy.FilePathMode != "masked" {
		t.Fatalf("expected invalid privacy section to fall back to defaults, got %+v", data.Privacy)
	}
}

func TestUpdateAndResetSettingsSectionPersistCorrectly(t *testing.T) {
	service, _ := newTestSettingsService(t)

	if _, err := service.UpdateExtensionSettings(context.Background(), contracts.ExtensionSettings{
		AutoConnect:                  true,
		SendHeartbeatEvents:          true,
		HeartbeatIntervalSeconds:     45,
		SendProjectMetadata:          true,
		SendLanguageMetadata:         true,
		SendMachineAttribution:       true,
		RespectDesktopExclusions:     false,
		BufferEventsWhenOffline:      true,
		RetryConnectionAutomatically: true,
		TrackOnlyWhenFocused:         false,
		TrackFileOpenEvents:          true,
		TrackSaveEvents:              false,
		TrackEditEvents:              true,
	}); err != nil {
		t.Fatalf("UpdateExtensionSettings failed: %v", err)
	}

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}
	if data.Extension.HeartbeatIntervalSeconds != 45 || data.Extension.TrackSaveEvents {
		t.Fatalf("expected persisted extension settings, got %+v", data.Extension)
	}

	reset, err := service.ResetSettingsSection(context.Background(), SectionExtension)
	if err != nil {
		t.Fatalf("ResetSettingsSection failed: %v", err)
	}
	if reset.Extension.HeartbeatIntervalSeconds != 30 || reset.Extension.SendHeartbeatEvents || reset.Extension.TrackFileOpenEvents || reset.Extension.TrackSaveEvents {
		t.Fatalf("expected extension section reset to defaults, got %+v", reset.Extension)
	}
}

func TestUpdateExtensionSettingsAllowsLowHeartbeatIntervals(t *testing.T) {
	service, _ := newTestSettingsService(t)

	updated, err := service.UpdateExtensionSettings(context.Background(), contracts.ExtensionSettings{
		AutoConnect:                  true,
		SendHeartbeatEvents:          true,
		HeartbeatIntervalSeconds:     1,
		SendProjectMetadata:          true,
		SendLanguageMetadata:         true,
		SendMachineAttribution:       true,
		RespectDesktopExclusions:     true,
		BufferEventsWhenOffline:      true,
		RetryConnectionAutomatically: true,
		TrackOnlyWhenFocused:         true,
		TrackFileOpenEvents:          true,
		TrackSaveEvents:              true,
		TrackEditEvents:              true,
	})
	if err != nil {
		t.Fatalf("UpdateExtensionSettings failed: %v", err)
	}
	if updated.HeartbeatIntervalSeconds != 1 {
		t.Fatalf("expected heartbeat interval 1, got %d", updated.HeartbeatIntervalSeconds)
	}
}

func TestUpdateAppBehaviorSettingsSanitizesHiddenStartupOnLinux(t *testing.T) {
	service, _ := newTestSettingsService(t)

	updated, err := service.UpdateAppBehaviorSettings(context.Background(), contracts.AppBehaviorSettings{
		LaunchOnStartup:      true,
		OpenOnSystemLogin:    true,
		StartMinimized:       true,
		MinimizeToTray:       true,
		RememberLastPage:     true,
		RestoreLastDateRange: true,
	})
	if err != nil {
		t.Fatalf("UpdateAppBehaviorSettings failed: %v", err)
	}

	if runtime.GOOS == "linux" {
		if updated.StartMinimized {
			t.Fatal("expected startMinimized false on linux")
		}
		if updated.MinimizeToTray {
			t.Fatal("expected minimizeToTray false on linux")
		}
	} else {
		if !updated.StartMinimized {
			t.Fatal("expected startMinimized true on non-linux platforms")
		}
		if !updated.MinimizeToTray {
			t.Fatal("expected minimizeToTray true on non-linux platforms")
		}
	}
}

func TestPersistedAppBehaviorHiddenFlagsSanitizedOnLinux(t *testing.T) {
	service, store := newTestSettingsService(t)

	if err := store.SetSettingsSection(
		context.Background(),
		SectionAppBehavior,
		`{"launchOnStartup":false,"startMinimized":true,"minimizeToTray":true,"openOnSystemLogin":false,"rememberLastPage":true,"restoreLastDateRange":true}`,
		"2026-04-10T09:45:00Z",
	); err != nil {
		t.Fatalf("seed app behavior section failed: %v", err)
	}

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}

	if runtime.GOOS == "linux" {
		if data.AppBehavior.StartMinimized {
			t.Fatal("expected persisted startMinimized sanitized to false on linux")
		}
		if data.AppBehavior.MinimizeToTray {
			t.Fatal("expected persisted minimizeToTray sanitized to false on linux")
		}
		return
	}

	if !data.AppBehavior.StartMinimized {
		t.Fatal("expected persisted startMinimized retained on non-linux")
	}
	if !data.AppBehavior.MinimizeToTray {
		t.Fatal("expected persisted minimizeToTray retained on non-linux")
	}
}

func TestGetExtensionEffectiveSettingsReturnsCanonicalPayload(t *testing.T) {
	service, _ := newTestSettingsService(t)

	if _, err := service.UpdateTrackingSettings(context.Background(), contracts.TrackingSettings{
		TrackingEnabled:              false,
		IdleDetectionEnabled:         true,
		TrackProjectActivity:         true,
		TrackLanguageActivity:        true,
		TrackMachineAttribution:      true,
		TrackSessionBoundaries:       true,
		IdleTimeoutMinutes:           9,
		SessionMergeThresholdMinutes: 14,
	}); err != nil {
		t.Fatalf("UpdateTrackingSettings failed: %v", err)
	}
	if _, err := service.UpdatePrivacySettings(context.Background(), contracts.PrivacySettings{
		LocalOnlyMode:             true,
		FilePathMode:              "hidden",
		ShowMachineNames:          false,
		ShowHostname:              false,
		ObfuscateProjectNames:     false,
		MinimizeExtensionMetadata: true,
	}); err != nil {
		t.Fatalf("UpdatePrivacySettings failed: %v", err)
	}

	payload, err := service.GetExtensionEffectiveSettings(context.Background())
	if err != nil {
		t.Fatalf("GetExtensionEffectiveSettings failed: %v", err)
	}

	if payload.TrackingEnabled {
		t.Fatal("expected tracking disabled in extension-effective payload")
	}
	if payload.FilePathMode != "hidden" {
		t.Fatalf("expected hidden file path mode, got %q", payload.FilePathMode)
	}
	if payload.IdleTimeoutMinutes != 9 || payload.SessionMergeThresholdMinutes != 14 {
		t.Fatalf("unexpected threshold payload: %+v", payload)
	}
}

func TestGetSettingsDataReturnsRuntimeAndStorageState(t *testing.T) {
	service, store := newTestSettingsService(t)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 8, 12, 0, 20, 0, time.UTC)
	}

	recordedAt := "2026-04-08T12:00:00Z"
	pendingEventCount := 7
	quarantinedEventCount := 2
	outboxSizeBytes := int64(4096)
	if err := store.UpsertExtensionStatus(context.Background(), contracts.ExtensionStatus{
		Installed:             true,
		Connected:             true,
		Editor:                "vscode",
		EditorVersion:         "1.99.0",
		ExtensionVersion:      "1.2.3",
		LastEventAt:           "2026-04-08T09:00:00Z",
		LastHandshakeAt:       recordedAt,
		PendingEventCount:     &pendingEventCount,
		OldestPendingEventAt:  "2026-04-08T08:40:00Z",
		QuarantinedEventCount: &quarantinedEventCount,
		OutboxSizeBytes:       &outboxSizeBytes,
		LastSuccessfulSyncAt:  "2026-04-08T11:59:00Z",
		DesktopInstanceSeen:   "desktop-instance-1",
	}, recordedAt); err != nil {
		t.Fatalf("upsert extension status failed: %v", err)
	}

	if _, warnings, err := store.InsertEvents(context.Background(), []contracts.ActivityEvent{
		{
			ID:          "e1",
			Timestamp:   "2026-04-08T09:00:00Z",
			EventType:   "edit",
			MachineID:   "m1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos-desktop",
			Language:    "typescript",
		},
	}, recordedAt); err != nil {
		t.Fatalf("insert events failed: %v", err)
	} else if len(warnings) != 0 {
		t.Fatalf("unexpected warnings: %+v", warnings)
	}

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}

	if data.ExtensionStatus.Editor != "vscode" || !data.ExtensionStatus.Connected {
		t.Fatalf("expected persisted extension status, got %+v", data.ExtensionStatus)
	}
	if data.ExtensionStatus.EditorVersion != "1.99.0" || data.ExtensionStatus.PendingEventCount == nil || *data.ExtensionStatus.PendingEventCount != 7 {
		t.Fatalf("expected enriched extension status values, got %+v", data.ExtensionStatus)
	}
	if data.DataStorage.LocalDataPath != store.Path() || data.DataStorage.DatabaseStatus != "ready" {
		t.Fatalf("expected populated storage info, got %+v", data.DataStorage)
	}
	if data.DataStorage.PendingEventCount == nil || *data.DataStorage.PendingEventCount != pendingEventCount {
		t.Fatalf("expected data storage pending count from extension status, got %+v", data.DataStorage)
	}
	if data.DataStorage.LastProcessedAt != recordedAt {
		t.Fatalf("expected last processed at %q, got %q", recordedAt, data.DataStorage.LastProcessedAt)
	}
	if data.System.MachineID == "" || data.System.MachineName == "" {
		t.Fatalf("expected system machine identity, got %+v", data.System)
	}
}

func TestGetSettingsDataLeavesPendingCountUnsetWithoutReportedBacklog(t *testing.T) {
	service, _ := newTestSettingsService(t)

	data, err := service.GetSettingsData(context.Background())
	if err != nil {
		t.Fatalf("GetSettingsData failed: %v", err)
	}
	if data.DataStorage.PendingEventCount != nil {
		t.Fatalf("expected pending event count to remain unset without extension report, got %+v", data.DataStorage)
	}
}

func TestGetExtensionStatusPreservesPersistedConnectedState(t *testing.T) {
	service, store := newTestSettingsService(t)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 8, 12, 10, 0, 0, time.UTC)
	}

	if err := store.UpsertExtensionStatus(context.Background(), contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           "vscode",
		ExtensionVersion: "1.2.3",
		LastHandshakeAt:  "2026-04-08T12:00:00Z",
	}, "2026-04-08T12:00:00Z"); err != nil {
		t.Fatalf("upsert extension status failed: %v", err)
	}

	status, err := service.GetExtensionStatus(context.Background())
	if err != nil {
		t.Fatalf("GetExtensionStatus failed: %v", err)
	}
	if !status.Connected {
		t.Fatalf("expected connected extension status to stay connected, got %+v", status)
	}
}

func TestGetExtensionStatusPreservesPersistedDisconnectedState(t *testing.T) {
	service, store := newTestSettingsService(t)
	service.now = func() time.Time {
		return time.Date(2026, time.April, 8, 12, 0, 20, 0, time.UTC)
	}

	if err := store.UpsertExtensionStatus(context.Background(), contracts.ExtensionStatus{
		Installed:        true,
		Connected:        false,
		Editor:           "vscode",
		ExtensionVersion: "1.2.3",
		LastEventAt:      "2026-04-08T12:00:00Z",
	}, "2026-04-08T12:00:00Z"); err != nil {
		t.Fatalf("upsert extension status failed: %v", err)
	}

	status, err := service.GetExtensionStatus(context.Background())
	if err != nil {
		t.Fatalf("GetExtensionStatus failed: %v", err)
	}
	if status.Connected {
		t.Fatalf("expected disconnected extension status to stay disconnected, got %+v", status)
	}
}

func newTestSettingsService(t *testing.T) (*ServiceImpl, *storage.Store) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "kairos-settings.sqlite3")
	store, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite store: %v", err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})

	service := NewService(store)
	service.SetDataStorageInfo(store.Path(), "ready")

	return service, store
}
