package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

type Service interface {
	GetSettingsData(ctx context.Context) (contracts.SettingsData, error)
	UpdateSettingsData(ctx context.Context, data contracts.SettingsData) (contracts.SettingsData, error)
	UpdateGeneralSettings(ctx context.Context, data contracts.GeneralSettings) (contracts.GeneralSettings, error)
	UpdatePrivacySettings(ctx context.Context, data contracts.PrivacySettings) (contracts.PrivacySettings, error)
	UpdateTrackingSettings(ctx context.Context, data contracts.TrackingSettings) (contracts.TrackingSettings, error)
	UpdateExclusionsSettings(ctx context.Context, data contracts.ExclusionsSettings) (contracts.ExclusionsSettings, error)
	UpdateExtensionSettings(ctx context.Context, data contracts.ExtensionSettings) (contracts.ExtensionSettings, error)
	UpdateAppBehaviorSettings(ctx context.Context, data contracts.AppBehaviorSettings) (contracts.AppBehaviorSettings, error)
	ResetSettingsSection(ctx context.Context, section string) (contracts.SettingsData, error)
	GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error)
	GetSystemInfo(ctx context.Context) (contracts.SystemInfo, error)
	GetExtensionEffectiveSettings(ctx context.Context) (contracts.ExtensionEffectiveSettings, error)
}

type ServiceImpl struct {
	store          *storage.Store
	now            func() time.Time
	databaseStatus string
}

func NewService(store *storage.Store) *ServiceImpl {
	status := "not-configured"
	if store != nil {
		status = "ready"
	}
	return &ServiceImpl{
		store:          store,
		now:            time.Now,
		databaseStatus: status,
	}
}

func (s *ServiceImpl) GetSettingsData(ctx context.Context) (contracts.SettingsData, error) {
	defaults := defaultEditableSettings()

	general, err := s.loadGeneral(ctx, defaults.General)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	privacy, err := s.loadPrivacy(ctx, defaults.Privacy)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	tracking, err := s.loadTracking(ctx, defaults.Tracking)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	exclusions, err := s.loadExclusions(ctx, defaults.Exclusions)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	extension, err := s.loadExtension(ctx, defaults.Extension)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	appBehavior, err := s.loadAppBehavior(ctx, defaults.AppBehavior)
	if err != nil {
		return contracts.SettingsData{}, err
	}

	extensionStatus, err := s.GetExtensionStatus(ctx)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	systemInfo, err := s.GetSystemInfo(ctx)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	systemInfo.MachineName = general.MachineDisplayName
	systemInfo.ExtensionVersion = extensionStatus.ExtensionVersion

	dataStorage, err := s.buildDataStorageInfo(ctx, extensionStatus)
	if err != nil {
		return contracts.SettingsData{}, err
	}
	about := defaultAboutInfo()
	about.ExtensionVersion = extensionStatus.ExtensionVersion

	return contracts.SettingsData{
		General:         general,
		Privacy:         privacy,
		Tracking:        tracking,
		Exclusions:      exclusions,
		Extension:       extension,
		ExtensionStatus: extensionStatus,
		System:          systemInfo,
		AppBehavior:     appBehavior,
		DataStorage:     dataStorage,
		About:           about,
	}, nil
}

func (s *ServiceImpl) UpdateSettingsData(ctx context.Context, data contracts.SettingsData) (contracts.SettingsData, error) {
	if _, err := s.UpdateGeneralSettings(ctx, data.General); err != nil {
		return contracts.SettingsData{}, err
	}
	if _, err := s.UpdatePrivacySettings(ctx, data.Privacy); err != nil {
		return contracts.SettingsData{}, err
	}
	if _, err := s.UpdateTrackingSettings(ctx, data.Tracking); err != nil {
		return contracts.SettingsData{}, err
	}
	if _, err := s.UpdateExclusionsSettings(ctx, data.Exclusions); err != nil {
		return contracts.SettingsData{}, err
	}
	if _, err := s.UpdateExtensionSettings(ctx, data.Extension); err != nil {
		return contracts.SettingsData{}, err
	}
	if _, err := s.UpdateAppBehaviorSettings(ctx, data.AppBehavior); err != nil {
		return contracts.SettingsData{}, err
	}

	return s.GetSettingsData(ctx)
}

func (s *ServiceImpl) UpdateGeneralSettings(ctx context.Context, data contracts.GeneralSettings) (contracts.GeneralSettings, error) {
	validated, err := validateGeneral(data)
	if err != nil {
		return contracts.GeneralSettings{}, err
	}
	if err := s.persistSection(ctx, SectionGeneral, validated); err != nil {
		return contracts.GeneralSettings{}, err
	}
	return validated, nil
}

func (s *ServiceImpl) UpdatePrivacySettings(ctx context.Context, data contracts.PrivacySettings) (contracts.PrivacySettings, error) {
	validated, err := validatePrivacy(data)
	if err != nil {
		return contracts.PrivacySettings{}, err
	}
	if err := s.persistSection(ctx, SectionPrivacy, validated); err != nil {
		return contracts.PrivacySettings{}, err
	}
	return validated, nil
}

func (s *ServiceImpl) UpdateTrackingSettings(ctx context.Context, data contracts.TrackingSettings) (contracts.TrackingSettings, error) {
	validated, err := validateTracking(data)
	if err != nil {
		return contracts.TrackingSettings{}, err
	}
	if err := s.persistSection(ctx, SectionTracking, validated); err != nil {
		return contracts.TrackingSettings{}, err
	}
	return validated, nil
}

func (s *ServiceImpl) UpdateExclusionsSettings(ctx context.Context, data contracts.ExclusionsSettings) (contracts.ExclusionsSettings, error) {
	validated := validateExclusions(data)
	if err := s.persistSection(ctx, SectionExclusions, validated); err != nil {
		return contracts.ExclusionsSettings{}, err
	}
	return validated, nil
}

func (s *ServiceImpl) UpdateExtensionSettings(ctx context.Context, data contracts.ExtensionSettings) (contracts.ExtensionSettings, error) {
	validated, err := validateExtension(data)
	if err != nil {
		return contracts.ExtensionSettings{}, err
	}
	if err := s.persistSection(ctx, SectionExtension, validated); err != nil {
		return contracts.ExtensionSettings{}, err
	}
	return validated, nil
}

func (s *ServiceImpl) UpdateAppBehaviorSettings(ctx context.Context, data contracts.AppBehaviorSettings) (contracts.AppBehaviorSettings, error) {
	validated := validateAppBehavior(data)
	if err := s.persistSection(ctx, SectionAppBehavior, validated); err != nil {
		return contracts.AppBehaviorSettings{}, err
	}
	return validated, nil
}

func (s *ServiceImpl) ResetSettingsSection(ctx context.Context, section string) (contracts.SettingsData, error) {
	normalized := strings.TrimSpace(section)
	switch normalized {
	case SectionGeneral, SectionPrivacy, SectionTracking, SectionExclusions, SectionExtension, SectionAppBehavior:
	default:
		return contracts.SettingsData{}, fmt.Errorf("unknown settings section %q", section)
	}

	if s.store != nil {
		if err := s.store.DeleteSettingsSection(ctx, normalized); err != nil {
			return contracts.SettingsData{}, err
		}
	}

	return s.GetSettingsData(ctx)
}

func (s *ServiceImpl) GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error) {
	if s.store == nil {
		return contracts.ExtensionStatus{
			Installed: false,
			Connected: false,
			Editor:    "vscode",
		}, nil
	}

	status, err := s.store.GetExtensionStatus(ctx, "vscode")
	if err != nil {
		return contracts.ExtensionStatus{}, err
	}
	return status, nil
}

func (s *ServiceImpl) GetSystemInfo(_ context.Context) (contracts.SystemInfo, error) {
	systemInfo := defaultSystemInfo()
	systemInfo.LastSeenAt = s.now().UTC().Format(time.RFC3339)
	return systemInfo, nil
}

func (s *ServiceImpl) GetExtensionEffectiveSettings(ctx context.Context) (contracts.ExtensionEffectiveSettings, error) {
	data, err := s.GetSettingsData(ctx)
	if err != nil {
		return contracts.ExtensionEffectiveSettings{}, err
	}

	return contracts.ExtensionEffectiveSettings{
		TrackingEnabled:              data.Tracking.TrackingEnabled,
		IdleDetectionEnabled:         data.Tracking.IdleDetectionEnabled,
		IdleTimeoutMinutes:           data.Tracking.IdleTimeoutMinutes,
		SessionMergeThresholdMinutes: data.Tracking.SessionMergeThresholdMinutes,
		LocalOnlyMode:                data.Privacy.LocalOnlyMode,
		FilePathMode:                 data.Privacy.FilePathMode,
		Exclusions:                   data.Exclusions,
		AutoConnect:                  data.Extension.AutoConnect,
		SendHeartbeatEvents:          data.Extension.SendHeartbeatEvents,
		HeartbeatIntervalSeconds:     data.Extension.HeartbeatIntervalSeconds,
		SendProjectMetadata:          data.Extension.SendProjectMetadata,
		SendLanguageMetadata:         data.Extension.SendLanguageMetadata,
		SendMachineAttribution:       data.Extension.SendMachineAttribution,
		RespectDesktopExclusions:     data.Extension.RespectDesktopExclusions,
		BufferEventsWhenOffline:      data.Extension.BufferEventsWhenOffline,
		RetryConnectionAutomatically: data.Extension.RetryConnectionAutomatically,
		TrackOnlyWhenFocused:         data.Extension.TrackOnlyWhenFocused,
		TrackFileOpenEvents:          data.Extension.TrackFileOpenEvents,
		TrackSaveEvents:              data.Extension.TrackSaveEvents,
		TrackEditEvents:              data.Extension.TrackEditEvents,
	}, nil
}

func (s *ServiceImpl) SetDataStorageInfo(localDataPath string, databaseStatus string) {
	s.databaseStatus = databaseStatus
}

func (s *ServiceImpl) persistSection(ctx context.Context, section string, value any) error {
	if s.store == nil {
		return nil
	}

	payload, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal settings section %s: %w", section, err)
	}
	if err := s.store.SetSettingsSection(ctx, section, string(payload), s.now().UTC().Format(time.RFC3339)); err != nil {
		return err
	}
	return nil
}

func (s *ServiceImpl) loadGeneral(ctx context.Context, fallback contracts.GeneralSettings) (contracts.GeneralSettings, error) {
	return loadSection(ctx, s.store, SectionGeneral, fallback, validateGeneral)
}

func (s *ServiceImpl) loadPrivacy(ctx context.Context, fallback contracts.PrivacySettings) (contracts.PrivacySettings, error) {
	return loadSection(ctx, s.store, SectionPrivacy, fallback, validatePrivacy)
}

func (s *ServiceImpl) loadTracking(ctx context.Context, fallback contracts.TrackingSettings) (contracts.TrackingSettings, error) {
	return loadSection(ctx, s.store, SectionTracking, fallback, validateTracking)
}

func (s *ServiceImpl) loadExclusions(ctx context.Context, fallback contracts.ExclusionsSettings) (contracts.ExclusionsSettings, error) {
	return loadSection(ctx, s.store, SectionExclusions, fallback, func(input contracts.ExclusionsSettings) (contracts.ExclusionsSettings, error) {
		return validateExclusions(input), nil
	})
}

func (s *ServiceImpl) loadExtension(ctx context.Context, fallback contracts.ExtensionSettings) (contracts.ExtensionSettings, error) {
	return loadSection(ctx, s.store, SectionExtension, fallback, validateExtension)
}

func (s *ServiceImpl) loadAppBehavior(ctx context.Context, fallback contracts.AppBehaviorSettings) (contracts.AppBehaviorSettings, error) {
	return loadSection(ctx, s.store, SectionAppBehavior, fallback, func(input contracts.AppBehaviorSettings) (contracts.AppBehaviorSettings, error) {
		return validateAppBehavior(input), nil
	})
}

func (s *ServiceImpl) buildDataStorageInfo(ctx context.Context, extensionStatus contracts.ExtensionStatus) (contracts.DataStorageInfo, error) {
	info := contracts.DataStorageInfo{
		LocalDataPath:  "",
		DatabaseStatus: s.databaseStatus,
	}
	if extensionStatus.PendingEventCount != nil {
		value := *extensionStatus.PendingEventCount
		info.PendingEventCount = &value
	}

	if s.store == nil {
		return info, nil
	}

	info.LocalDataPath = s.store.Path()
	if info.DatabaseStatus == "" {
		info.DatabaseStatus = "ready"
	}

	lastProcessedAt, err := s.store.GetLastIngestedAt(ctx)
	if err != nil {
		return contracts.DataStorageInfo{}, err
	}
	info.LastProcessedAt = lastProcessedAt

	return info, nil
}

func loadSection[T any](ctx context.Context, store *storage.Store, section string, fallback T, validate func(T) (T, error)) (T, error) {
	if store == nil {
		return fallback, nil
	}

	payload, found, err := store.GetSettingsSection(ctx, section)
	if err != nil {
		return fallback, err
	}
	if !found {
		return fallback, nil
	}

	var decoded T
	if err := json.Unmarshal([]byte(payload), &decoded); err != nil {
		log.Printf("settings: invalid persisted %s section, using defaults: %v", section, err)
		return fallback, nil
	}
	validated, err := validate(decoded)
	if err != nil {
		log.Printf("settings: invalid persisted %s section, using defaults: %v", section, err)
		return fallback, nil
	}

	return validated, nil
}

func hostnameOrFallback(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}
