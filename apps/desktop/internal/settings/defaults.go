package settings

import (
	"os"
	"runtime"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

type editableDefaults struct {
	General     contracts.GeneralSettings
	Privacy     contracts.PrivacySettings
	Tracking    contracts.TrackingSettings
	Exclusions  contracts.ExclusionsSettings
	Extension   contracts.ExtensionSettings
	AppBehavior contracts.AppBehaviorSettings
}

func defaultEditableSettings() editableDefaults {
	hostname, _ := os.Hostname()
	machineDisplayName := hostnameOrFallback(hostname, "Kairos Desktop")

	return editableDefaults{
		General: contracts.GeneralSettings{
			MachineDisplayName:   machineDisplayName,
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
		AppBehavior: contracts.AppBehaviorSettings{
			LaunchOnStartup:      false,
			StartMinimized:       false,
			MinimizeToTray:       true,
			OpenOnSystemLogin:    false,
			RememberLastPage:     true,
			RestoreLastDateRange: true,
		},
	}
}

func defaultSystemInfo() contracts.SystemInfo {
	hostname, _ := os.Hostname()

	return contracts.SystemInfo{
		MachineID:   hostnameOrFallback(hostname, "kairos-desktop"),
		MachineName: hostnameOrFallback(hostname, "Kairos Desktop"),
		Hostname:    hostname,
		OSPlatform:  runtime.GOOS,
		OSVersion:   "",
		Arch:        runtime.GOARCH,
		Editor:      "vscode",
	}
}

func defaultAboutInfo() contracts.AboutInfo {
	return contracts.AboutInfo{
		AppName:        "Kairos",
		AppVersion:     "0.0.0",
		Environment:    "desktop",
		BuildChannel:   "local",
		DesktopVersion: "0.0.0",
		LicenseSummary: "License metadata pending",
		RepositoryURL:  "https://github.com/michaelnji/kairos",
	}
}
