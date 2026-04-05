package settings

import (
	"context"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

type Service interface {
	GetSettingsData(ctx context.Context) (contracts.SettingsData, error)
	UpdateSettingsData(ctx context.Context, data contracts.SettingsData) (contracts.SettingsData, error)
	GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error)
	GetSystemInfo(ctx context.Context) (contracts.SystemInfo, error)
}

type StubService struct {
	settings contracts.SettingsData
}

func NewStubService() *StubService {
	pendingEventCount := 0

	defaults := contracts.SettingsData{
		General: contracts.GeneralSettings{
			MachineDisplayName:   "Kairos Desktop",
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
			Installed: true,
			Connected: false,
			Editor:    "vscode",
		},
		System: contracts.SystemInfo{
			MachineID:   "desktop-dev-machine",
			MachineName: "Kairos Desktop",
			OSPlatform:  "darwin",
			Arch:        "arm64",
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

	return &StubService{settings: defaults}
}

func (s *StubService) GetSettingsData(_ context.Context) (contracts.SettingsData, error) {
	return s.settings, nil
}

func (s *StubService) UpdateSettingsData(_ context.Context, data contracts.SettingsData) (contracts.SettingsData, error) {
	s.settings = data
	return s.settings, nil
}

func (s *StubService) GetExtensionStatus(_ context.Context) (contracts.ExtensionStatus, error) {
	return s.settings.ExtensionStatus, nil
}

func (s *StubService) GetSystemInfo(_ context.Context) (contracts.SystemInfo, error) {
	return s.settings.System, nil
}

func (s *StubService) SetDataStorageInfo(localDataPath string, databaseStatus string) {
	s.settings.DataStorage.LocalDataPath = localDataPath
	s.settings.DataStorage.DatabaseStatus = databaseStatus
}
