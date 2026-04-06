package settings

import (
	"context"
	"os"
	"runtime"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

type Service interface {
	GetSettingsData(ctx context.Context) (contracts.SettingsData, error)
	UpdateSettingsData(ctx context.Context, data contracts.SettingsData) (contracts.SettingsData, error)
	GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error)
	GetSystemInfo(ctx context.Context) (contracts.SystemInfo, error)
}

type ServiceImpl struct {
	store    *storage.Store
	settings contracts.SettingsData
	now      func() time.Time
}

func NewService(store *storage.Store) *ServiceImpl {
	pendingEventCount := 0
	hostname, _ := os.Hostname()

	defaults := contracts.SettingsData{
		General: contracts.GeneralSettings{
			MachineDisplayName:   hostnameOrFallback(hostname, "Kairos Desktop"),
			DefaultDateRange:     "week",
			TimeFormat:           "24h",
			WeekStartsOn:         "monday",
			PreferredLandingPage: "overview",
		},
		Privacy: contracts.PrivacySettings{
			LocalOnlyMode:             true,
			FilePathMode:              "masked",
			ShowMachineNames:          true,
			ShowHostname:              false,
			ObfuscateProjectNames:     false,
			MinimizeExtensionMetadata: true,
		},
		Tracking: contracts.TrackingSettings{
			TrackingEnabled:              true,
			IdleDetectionEnabled:         true,
			TrackProjectActivity:         true,
			TrackLanguageActivity:        true,
			TrackMachineAttribution:      true,
			TrackSessionBoundaries:       true,
			IdleTimeoutMinutes:           5,
			SessionMergeThresholdMinutes: 10,
		},
		Exclusions: contracts.ExclusionsSettings{
			Folders:           []string{},
			ProjectNames:      []string{},
			WorkspacePatterns: []string{},
			FileExtensions:    []string{},
			Machines:          []string{},
		},
		Extension: contracts.ExtensionSettings{
			AutoConnect:                  true,
			SendHeartbeatEvents:          true,
			HeartbeatIntervalSeconds:     30,
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
		},
		ExtensionStatus: contracts.ExtensionStatus{
			Installed: false,
			Connected: false,
			Editor:    "vscode",
		},
		System: contracts.SystemInfo{
			MachineID:   hostnameOrFallback(hostname, "kairos-desktop"),
			MachineName: hostnameOrFallback(hostname, "Kairos Desktop"),
			Hostname:    hostname,
			OSPlatform:  runtime.GOOS,
			Arch:        runtime.GOARCH,
			Editor:      "vscode",
		},
		AppBehavior: contracts.AppBehaviorSettings{
			LaunchOnStartup:      false,
			StartMinimized:       false,
			MinimizeToTray:       true,
			OpenOnSystemLogin:    false,
			RememberLastPage:     true,
			RestoreLastDateRange: true,
		},
		DataStorage: contracts.DataStorageInfo{
			LocalDataPath:     "",
			DatabaseStatus:    "not-configured",
			PendingEventCount: &pendingEventCount,
		},
		About: contracts.AboutInfo{
			AppName:        "Kairos",
			AppVersion:     "0.0.0",
			Environment:    "desktop",
			BuildChannel:   "local",
			DesktopVersion: "0.0.0",
			LicenseSummary: "License metadata pending",
		},
	}

	service := &ServiceImpl{
		store:    store,
		settings: defaults,
		now:      time.Now,
	}
	service.updateStorageMetadata()

	return service
}

func (s *ServiceImpl) GetSettingsData(ctx context.Context) (contracts.SettingsData, error) {
	s.updateStorageMetadata()

	if s.store != nil {
		extensionStatus, err := s.store.GetExtensionStatus(ctx, "vscode")
		if err != nil {
			return contracts.SettingsData{}, err
		}
		s.settings.ExtensionStatus = extensionStatus
		s.settings.System.ExtensionVersion = extensionStatus.ExtensionVersion

		lastIngestedAt, err := s.store.GetLastIngestedAt(ctx)
		if err == nil && lastIngestedAt != "" {
			s.settings.DataStorage.LastProcessedAt = lastIngestedAt
		}
	}

	s.settings.System.LastSeenAt = s.now().UTC().Format(time.RFC3339)
	return s.settings, nil
}

func (s *ServiceImpl) UpdateSettingsData(_ context.Context, data contracts.SettingsData) (contracts.SettingsData, error) {
	s.settings = data
	s.updateStorageMetadata()
	return s.settings, nil
}

func (s *ServiceImpl) GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error) {
	if s.store == nil {
		return s.settings.ExtensionStatus, nil
	}

	status, err := s.store.GetExtensionStatus(ctx, "vscode")
	if err != nil {
		return contracts.ExtensionStatus{}, err
	}
	s.settings.ExtensionStatus = status
	return status, nil
}

func (s *ServiceImpl) GetSystemInfo(_ context.Context) (contracts.SystemInfo, error) {
	s.settings.System.LastSeenAt = s.now().UTC().Format(time.RFC3339)
	return s.settings.System, nil
}

func (s *ServiceImpl) SetDataStorageInfo(localDataPath string, databaseStatus string) {
	s.settings.DataStorage.LocalDataPath = localDataPath
	s.settings.DataStorage.DatabaseStatus = databaseStatus
}

func (s *ServiceImpl) updateStorageMetadata() {
	if s.store == nil {
		return
	}

	s.settings.DataStorage.LocalDataPath = s.store.Path()
	s.settings.DataStorage.DatabaseStatus = "ready"
}

func hostnameOrFallback(value string, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
