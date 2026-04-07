package settings

import (
	"fmt"
	"strings"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func validateGeneral(input contracts.GeneralSettings) (contracts.GeneralSettings, error) {
	input.MachineDisplayName = strings.TrimSpace(input.MachineDisplayName)
	input.DefaultDateRange = strings.TrimSpace(strings.ToLower(input.DefaultDateRange))
	input.TimeFormat = strings.TrimSpace(strings.ToLower(input.TimeFormat))
	input.WeekStartsOn = strings.TrimSpace(strings.ToLower(input.WeekStartsOn))
	input.PreferredLandingPage = strings.TrimSpace(strings.ToLower(input.PreferredLandingPage))

	if input.MachineDisplayName == "" {
		return contracts.GeneralSettings{}, fmt.Errorf("machineDisplayName is required")
	}
	switch input.TimeFormat {
	case "12h", "24h":
	default:
		return contracts.GeneralSettings{}, fmt.Errorf("timeFormat must be 12h or 24h")
	}
	switch input.WeekStartsOn {
	case "monday", "sunday":
	default:
		return contracts.GeneralSettings{}, fmt.Errorf("weekStartsOn must be monday or sunday")
	}
	switch input.PreferredLandingPage {
	case "overview", "analytics", "calendar", "sessions", "settings":
	default:
		return contracts.GeneralSettings{}, fmt.Errorf("preferredLandingPage is invalid")
	}
	switch input.DefaultDateRange {
	case "today", "week", "month", "last-7-days", "last-30-days", "all-time":
	default:
		return contracts.GeneralSettings{}, fmt.Errorf("defaultDateRange is invalid")
	}

	return input, nil
}

func validatePrivacy(input contracts.PrivacySettings) (contracts.PrivacySettings, error) {
	input.FilePathMode = strings.TrimSpace(strings.ToLower(input.FilePathMode))
	input.SensitiveProjectNames = normalizeStringList(input.SensitiveProjectNames)
	switch input.FilePathMode {
	case "full", "masked", "hidden":
	default:
		return contracts.PrivacySettings{}, fmt.Errorf("filePathMode must be full, masked, or hidden")
	}
	return input, nil
}

func validateTracking(input contracts.TrackingSettings) (contracts.TrackingSettings, error) {
	if input.IdleTimeoutMinutes < 5 || input.IdleTimeoutMinutes > 180 {
		return contracts.TrackingSettings{}, fmt.Errorf("idleTimeoutMinutes must be between 5 and 180")
	}
	if input.SessionMergeThresholdMinutes < 0 || input.SessionMergeThresholdMinutes > 180 {
		return contracts.TrackingSettings{}, fmt.Errorf("sessionMergeThresholdMinutes must be between 0 and 180")
	}
	return input, nil
}

func validateExclusions(input contracts.ExclusionsSettings) contracts.ExclusionsSettings {
	input.Folders = normalizeStringList(input.Folders)
	input.ProjectNames = normalizeStringList(input.ProjectNames)
	input.WorkspacePatterns = normalizeStringList(input.WorkspacePatterns)
	input.FileExtensions = normalizeStringList(input.FileExtensions)
	input.Machines = normalizeStringList(input.Machines)
	return input
}

func validateExtension(input contracts.ExtensionSettings) (contracts.ExtensionSettings, error) {
	if input.HeartbeatIntervalSeconds < 1 {
		return contracts.ExtensionSettings{}, fmt.Errorf("heartbeatIntervalSeconds must be at least 1")
	}
	return input, nil
}

func validateAppBehavior(input contracts.AppBehaviorSettings) contracts.AppBehaviorSettings {
	enabled := input.LaunchOnStartup || input.OpenOnSystemLogin
	input.LaunchOnStartup = enabled
	input.OpenOnSystemLogin = enabled
	return input
}

func normalizeStringList(items []string) []string {
	seen := make(map[string]struct{}, len(items))
	normalized := make([]string, 0, len(items))
	for _, item := range items {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			continue
		}
		if _, ok := seen[trimmed]; ok {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	return normalized
}
