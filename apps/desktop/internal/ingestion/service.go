package ingestion

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

type Service interface {
	IngestEvents(ctx context.Context, request contracts.IngestEventsRequest) (contracts.IngestEventsResponse, error)
	HandshakeExtension(ctx context.Context, request contracts.ExtensionHandshakeRequest) (contracts.ExtensionHandshakeResponse, error)
	GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error)
	ListKnownMachines(ctx context.Context) ([]contracts.MachineInfo, error)
	ListRecentEvents(ctx context.Context, limit int) ([]contracts.ActivityEvent, error)
	GetIngestionStats(ctx context.Context) (contracts.IngestionStats, error)
}

type ServiceImpl struct {
	store    *storage.Store
	settings interface {
		GetSettingsData(ctx context.Context) (contracts.SettingsData, error)
		GetExtensionEffectiveSettings(ctx context.Context) (contracts.ExtensionEffectiveSettings, error)
	}
	sessions interface {
		RebuildSessionsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionRebuildResult, error)
	}
	now func() time.Time

	mu                 sync.Mutex
	runtimeRejectCount int
}

func NewService(sqliteStore *storage.Store, settingsProvider interface {
	GetSettingsData(ctx context.Context) (contracts.SettingsData, error)
	GetExtensionEffectiveSettings(ctx context.Context) (contracts.ExtensionEffectiveSettings, error)
}, sessionRebuilder interface {
	RebuildSessionsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionRebuildResult, error)
}) *ServiceImpl {
	return &ServiceImpl{
		store:    sqliteStore,
		settings: settingsProvider,
		sessions: sessionRebuilder,
		now:      time.Now,
	}
}

func (s *ServiceImpl) IngestEvents(ctx context.Context, request contracts.IngestEventsRequest) (contracts.IngestEventsResponse, error) {
	if err := validateRequest(request); err != nil {
		return contracts.IngestEventsResponse{}, err
	}

	serverTime := s.now().UTC().Format(time.RFC3339)
	machine, machineWarnings, err := sanitizeMachine(request.Machine)
	if err != nil {
		return contracts.IngestEventsResponse{}, err
	}
	extension, extensionWarnings, err := sanitizeExtension(request.Extension)
	if err != nil {
		return contracts.IngestEventsResponse{}, err
	}
	settingsData, err := s.resolveSettings(ctx)
	if err != nil {
		return contracts.IngestEventsResponse{}, err
	}

	accepted := make([]contracts.ActivityEvent, 0, len(request.Events))
	warnings := append([]string{}, machineWarnings...)
	warnings = append(warnings, extensionWarnings...)

	for index, rawEvent := range request.Events {
		event, eventWarnings, err := validateEvent(rawEvent, machine.MachineID)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("event[%d]: %s", index, err.Error()))
			continue
		}

		for _, warning := range eventWarnings {
			warnings = append(warnings, fmt.Sprintf("event[%d]: %s", index, warning))
		}

		event, runtimeWarnings, shouldAccept := applyRuntimeSettings(event, machine, settingsData)
		for _, warning := range runtimeWarnings {
			warnings = append(warnings, fmt.Sprintf("event[%d]: %s", index, warning))
		}
		if !settingsData.Tracking.TrackingEnabled || !shouldAccept {
			continue
		}

		accepted = append(accepted, event)
	}

	if !settingsData.Tracking.TrackingEnabled {
		warnings = append(warnings, "tracking is disabled by desktop settings")
	}

	persisted := accepted
	if len(accepted) > 0 {
		persistResult, err := s.store.PersistIngestionBatch(
			ctx,
			machine,
			buildExtensionStatus(extension, accepted, serverTime),
			accepted,
			serverTime,
		)
		if err != nil {
			log.Printf("ingestion: persist batch failed: %v", err)
			return contracts.IngestEventsResponse{}, err
		}
		persisted = persistResult.InsertedEvents
		warnings = append(warnings, persistResult.Warnings...)
		if len(persisted) > 0 {
			if rebuildWarnings, err := s.rebuildSessionsForAcceptedEvents(ctx, persisted); err != nil {
				log.Printf("ingestion: session rebuild failed: %v", err)
				return contracts.IngestEventsResponse{}, err
			} else {
				warnings = append(warnings, rebuildWarnings...)
			}
		}
	} else {
		if err := s.store.PersistEmptyIngestionHeartbeat(
			ctx,
			machine,
			buildExtensionStatus(extension, nil, serverTime),
			serverTime,
		); err != nil {
			log.Printf("ingestion: persist heartbeat metadata failed: %v", err)
			return contracts.IngestEventsResponse{}, err
		}
	}

	rejectedCount := len(request.Events) - len(persisted)
	if rejectedCount > 0 {
		s.mu.Lock()
		s.runtimeRejectCount += rejectedCount
		s.mu.Unlock()
	}

	response := contracts.IngestEventsResponse{
		AcceptedCount:   len(persisted),
		RejectedCount:   rejectedCount,
		ServerTimestamp: serverTime,
	}
	if len(warnings) > 0 {
		response.Warnings = warnings
	}

	return response, nil
}

func (s *ServiceImpl) rebuildSessionsForAcceptedEvents(ctx context.Context, events []contracts.ActivityEvent) ([]string, error) {
	if s.sessions == nil || len(events) == 0 {
		return nil, nil
	}

	startDate := ""
	endDate := ""
	for _, event := range events {
		if len(event.Timestamp) < 10 {
			continue
		}
		date := event.Timestamp[:10]
		if startDate == "" || date < startDate {
			startDate = date
		}
		if endDate == "" || date > endDate {
			endDate = date
		}
	}

	if startDate == "" || endDate == "" {
		return []string{"session rebuild skipped because accepted events had invalid timestamps"}, nil
	}

	if _, err := s.sessions.RebuildSessionsForRange(ctx, startDate, endDate); err != nil {
		return nil, fmt.Errorf("rebuild sessions for %s..%s: %w", startDate, endDate, err)
	}

	return nil, nil
}

func (s *ServiceImpl) HandshakeExtension(ctx context.Context, request contracts.ExtensionHandshakeRequest) (contracts.ExtensionHandshakeResponse, error) {
	serverTime := s.now().UTC().Format(time.RFC3339)
	machine, _, err := sanitizeMachine(request.Machine)
	if err != nil {
		return contracts.ExtensionHandshakeResponse{}, err
	}
	extension, _, err := sanitizeExtension(request.Extension)
	if err != nil {
		return contracts.ExtensionHandshakeResponse{}, err
	}

	if err := s.store.PersistEmptyIngestionHeartbeat(
		ctx,
		machine,
		buildExtensionStatus(extension, nil, serverTime),
		serverTime,
	); err != nil {
		log.Printf("ingestion: extension handshake persist failed: %v", err)
		return contracts.ExtensionHandshakeResponse{}, err
	}

	if s.settings == nil {
		return contracts.ExtensionHandshakeResponse{}, fmt.Errorf("settings provider unavailable")
	}

	settingsPayload, err := s.settings.GetExtensionEffectiveSettings(ctx)
	if err != nil {
		return contracts.ExtensionHandshakeResponse{}, err
	}

	return contracts.ExtensionHandshakeResponse{
		Settings:        settingsPayload,
		ServerTimestamp: serverTime,
	}, nil
}

func (s *ServiceImpl) GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error) {
	return s.store.GetExtensionStatus(ctx, "vscode")
}

func (s *ServiceImpl) ListKnownMachines(ctx context.Context) ([]contracts.MachineInfo, error) {
	return s.store.ListKnownMachines(ctx)
}

func (s *ServiceImpl) ListRecentEvents(ctx context.Context, limit int) ([]contracts.ActivityEvent, error) {
	return s.store.ListRecentEvents(ctx, clampRecentEventsLimit(limit))
}

func (s *ServiceImpl) GetIngestionStats(ctx context.Context) (contracts.IngestionStats, error) {
	s.mu.Lock()
	rejected := s.runtimeRejectCount
	s.mu.Unlock()

	return s.store.GetIngestionStats(ctx, rejected)
}

func (s *ServiceImpl) resolveSettings(ctx context.Context) (contracts.SettingsData, error) {
	if s.settings == nil {
		return contracts.SettingsData{
			Privacy: contracts.PrivacySettings{FilePathMode: "masked"},
			Tracking: contracts.TrackingSettings{
				TrackingEnabled:         true,
				TrackProjectActivity:    true,
				TrackLanguageActivity:   true,
				TrackMachineAttribution: true,
			},
			Extension: contracts.ExtensionSettings{
				TrackFileOpenEvents: true,
				TrackSaveEvents:     true,
				TrackEditEvents:     true,
			},
		}, nil
	}
	return s.settings.GetSettingsData(ctx)
}

func validateRequest(request contracts.IngestEventsRequest) error {
	request.Machine = mergeMachine(request.Machine)

	switch {
	case request.Machine.MachineID == "":
		return &ValidationError{Message: "invalid ingest request: missing machine.machineId"}
	case request.Extension.Editor == "":
		return &ValidationError{Message: "invalid ingest request: missing extension.editor"}
	case request.Events == nil:
		return &ValidationError{Message: "invalid ingest request: missing events array"}
	case len(request.Events) == 0:
		return &ValidationError{Message: "invalid ingest request: events array cannot be empty"}
	case len(request.Events) > config.MaxEventsPerBatch:
		return &ValidationError{Message: fmt.Sprintf("invalid ingest request: events array exceeds max batch size %d", config.MaxEventsPerBatch)}
	default:
		return nil
	}
}

func validateEvent(event contracts.ActivityEvent, requestMachineID string) (contracts.ActivityEvent, []string, error) {
	clean := sanitizeEvent(event)
	warnings := make([]string, 0)

	switch {
	case clean.ID == "":
		return contracts.ActivityEvent{}, nil, fmt.Errorf("missing id")
	case clean.Timestamp == "":
		return contracts.ActivityEvent{}, nil, fmt.Errorf("missing timestamp")
	case clean.EventType == "":
		return contracts.ActivityEvent{}, nil, fmt.Errorf("missing eventType")
	case clean.MachineID == "":
		return contracts.ActivityEvent{}, nil, fmt.Errorf("missing machineId")
	case clean.WorkspaceID == "":
		return contracts.ActivityEvent{}, nil, fmt.Errorf("missing workspaceId")
	case clean.ProjectName == "":
		return contracts.ActivityEvent{}, nil, fmt.Errorf("missing projectName")
	case clean.Language == "":
		return contracts.ActivityEvent{}, nil, fmt.Errorf("missing language")
	case clean.MachineID != requestMachineID:
		return contracts.ActivityEvent{}, nil, fmt.Errorf("machineId mismatch")
	}

	if !isSupportedEventType(clean.EventType) {
		return contracts.ActivityEvent{}, nil, fmt.Errorf("unsupported eventType %q", clean.EventType)
	}

	if _, err := time.Parse(time.RFC3339, clean.Timestamp); err != nil {
		return contracts.ActivityEvent{}, nil, fmt.Errorf("invalid timestamp")
	}

	if err := validateRequiredLength("id", clean.ID, config.MaxEventIDLength); err != nil {
		return contracts.ActivityEvent{}, nil, err
	}
	if err := validateRequiredLength("eventType", clean.EventType, config.MaxEventTypeLength); err != nil {
		return contracts.ActivityEvent{}, nil, err
	}
	if err := validateRequiredLength("machineId", clean.MachineID, config.MaxMachineIDLength); err != nil {
		return contracts.ActivityEvent{}, nil, err
	}
	if err := validateRequiredLength("workspaceId", clean.WorkspaceID, config.MaxWorkspaceIDLength); err != nil {
		return contracts.ActivityEvent{}, nil, err
	}
	if err := validateRequiredLength("projectName", clean.ProjectName, config.MaxProjectNameLength); err != nil {
		return contracts.ActivityEvent{}, nil, err
	}
	if err := validateRequiredLength("language", clean.Language, config.MaxLanguageLength); err != nil {
		return contracts.ActivityEvent{}, nil, err
	}

	if truncated, didTruncate := trimAndClampOptional(clean.FilePath, config.MaxFilePathLength); didTruncate {
		clean.FilePath = truncated
		warnings = append(warnings, "filePath truncated to max allowed length")
	}
	if truncated, didTruncate := trimAndClampOptional(clean.GitBranch, config.MaxGitBranchLength); didTruncate {
		clean.GitBranch = truncated
		warnings = append(warnings, "gitBranch truncated to max allowed length")
	}

	return clean, warnings, nil
}

func applyRuntimeSettings(event contracts.ActivityEvent, machine contracts.MachineInfo, settingsData contracts.SettingsData) (contracts.ActivityEvent, []string, bool) {
	warnings := make([]string, 0)

	if isExcludedEvent(event, machine, settingsData.Exclusions) {
		warnings = append(warnings, "excluded by desktop settings")
		return contracts.ActivityEvent{}, warnings, false
	}

	switch event.EventType {
	case "open":
		if !settingsData.Extension.TrackFileOpenEvents {
			return contracts.ActivityEvent{}, warnings, false
		}
	case "save":
		if !settingsData.Extension.TrackSaveEvents {
			return contracts.ActivityEvent{}, warnings, false
		}
	case "edit":
		if !settingsData.Extension.TrackEditEvents {
			return contracts.ActivityEvent{}, warnings, false
		}
	}

	switch settingsData.Privacy.FilePathMode {
	case "hidden":
		if event.FilePath != "" {
			warnings = append(warnings, "filePath removed by privacy settings")
		}
		event.FilePath = ""
	case "masked":
		if event.FilePath != "" {
			event.FilePath = filepath.Base(event.FilePath)
		}
	}

	return event, warnings, true
}

func sanitizeEvent(event contracts.ActivityEvent) contracts.ActivityEvent {
	event.ID = strings.TrimSpace(event.ID)
	event.Timestamp = strings.TrimSpace(event.Timestamp)
	event.EventType = strings.TrimSpace(event.EventType)
	event.MachineID = strings.TrimSpace(event.MachineID)
	event.WorkspaceID = strings.TrimSpace(event.WorkspaceID)
	event.ProjectName = strings.TrimSpace(event.ProjectName)
	event.Language = strings.TrimSpace(event.Language)
	event.FilePath = strings.TrimSpace(event.FilePath)
	event.GitBranch = strings.TrimSpace(event.GitBranch)
	return event
}

func isExcludedEvent(event contracts.ActivityEvent, machine contracts.MachineInfo, exclusions contracts.ExclusionsSettings) bool {
	projectName := strings.ToLower(strings.TrimSpace(event.ProjectName))
	for _, excludedProject := range exclusions.ProjectNames {
		if strings.EqualFold(strings.TrimSpace(excludedProject), projectName) {
			return true
		}
	}

	for _, excludedMachine := range exclusions.Machines {
		trimmed := strings.TrimSpace(excludedMachine)
		if trimmed == "" {
			continue
		}
		if strings.EqualFold(trimmed, machine.MachineName) || strings.EqualFold(trimmed, machine.MachineID) {
			return true
		}
	}

	if event.FilePath != "" {
		lowerPath := strings.ToLower(event.FilePath)
		for _, folder := range exclusions.Folders {
			folder = strings.ToLower(strings.TrimSpace(folder))
			if folder != "" && strings.Contains(lowerPath, folder) {
				return true
			}
		}
		for _, extension := range exclusions.FileExtensions {
			extension = strings.ToLower(strings.TrimSpace(extension))
			if extension != "" && strings.HasSuffix(lowerPath, extension) {
				return true
			}
		}
	}

	for _, pattern := range exclusions.WorkspacePatterns {
		pattern = strings.TrimSpace(pattern)
		if pattern == "" {
			continue
		}
		matched, err := filepath.Match(pattern, event.WorkspaceID)
		if err == nil && matched {
			return true
		}
	}

	return false
}

func mergeMachine(machine contracts.MachineInfo) contracts.MachineInfo {
	machine.MachineID = strings.TrimSpace(machine.MachineID)
	machine.MachineName = strings.TrimSpace(machine.MachineName)
	machine.Hostname = strings.TrimSpace(machine.Hostname)
	machine.OSPlatform = strings.TrimSpace(machine.OSPlatform)
	machine.OSVersion = strings.TrimSpace(machine.OSVersion)
	machine.Arch = strings.TrimSpace(machine.Arch)

	if machine.MachineName == "" {
		machine.MachineName = machine.MachineID
	}

	return machine
}

func sanitizeMachine(machine contracts.MachineInfo) (contracts.MachineInfo, []string, error) {
	clean := mergeMachine(machine)
	warnings := make([]string, 0)

	if err := validateRequiredLength("machineId", clean.MachineID, config.MaxMachineIDLength); err != nil {
		return contracts.MachineInfo{}, nil, &ValidationError{Message: fmt.Sprintf("invalid ingest request: %s", err.Error())}
	}
	if clean.MachineName == "" {
		return contracts.MachineInfo{}, nil, &ValidationError{Message: "invalid ingest request: missing machine.machineName"}
	}
	if err := validateRequiredLength("machineName", clean.MachineName, config.MaxMachineNameLength); err != nil {
		return contracts.MachineInfo{}, nil, &ValidationError{Message: fmt.Sprintf("invalid ingest request: %s", err.Error())}
	}
	if clean.OSPlatform == "" {
		return contracts.MachineInfo{}, nil, &ValidationError{Message: "invalid ingest request: missing machine.osPlatform"}
	}
	if err := validateRequiredLength("osPlatform", clean.OSPlatform, config.MaxOSPlatformLength); err != nil {
		return contracts.MachineInfo{}, nil, &ValidationError{Message: fmt.Sprintf("invalid ingest request: %s", err.Error())}
	}

	if truncated, didTruncate := trimAndClampOptional(clean.Hostname, config.MaxHostnameLength); didTruncate {
		clean.Hostname = truncated
		warnings = append(warnings, "machine.hostname truncated to max allowed length")
	}
	if truncated, didTruncate := trimAndClampOptional(clean.OSVersion, config.MaxOSVersionLength); didTruncate {
		clean.OSVersion = truncated
		warnings = append(warnings, "machine.osVersion truncated to max allowed length")
	}
	if truncated, didTruncate := trimAndClampOptional(clean.Arch, config.MaxArchLength); didTruncate {
		clean.Arch = truncated
		warnings = append(warnings, "machine.arch truncated to max allowed length")
	}

	return clean, warnings, nil
}

func sanitizeExtension(extension contracts.ExtensionInfo) (contracts.ExtensionInfo, []string, error) {
	clean := contracts.ExtensionInfo{
		Editor:           strings.TrimSpace(extension.Editor),
		EditorVersion:    strings.TrimSpace(extension.EditorVersion),
		ExtensionVersion: strings.TrimSpace(extension.ExtensionVersion),
	}
	warnings := make([]string, 0)

	if clean.Editor == "" {
		return contracts.ExtensionInfo{}, nil, &ValidationError{Message: "invalid ingest request: missing extension.editor"}
	}
	if err := validateRequiredLength("editor", clean.Editor, config.MaxEditorLength); err != nil {
		return contracts.ExtensionInfo{}, nil, &ValidationError{Message: fmt.Sprintf("invalid ingest request: %s", err.Error())}
	}
	if truncated, didTruncate := trimAndClampOptional(clean.EditorVersion, config.MaxEditorVersionLength); didTruncate {
		clean.EditorVersion = truncated
		warnings = append(warnings, "extension.editorVersion truncated to max allowed length")
	}
	if truncated, didTruncate := trimAndClampOptional(clean.ExtensionVersion, config.MaxExtensionVersionLength); didTruncate {
		clean.ExtensionVersion = truncated
		warnings = append(warnings, "extension.extensionVersion truncated to max allowed length")
	}

	return clean, warnings, nil
}

func buildExtensionStatus(extension contracts.ExtensionInfo, accepted []contracts.ActivityEvent, serverTime string) contracts.ExtensionStatus {
	status := contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           clampRequiredString(strings.TrimSpace(extension.Editor), config.MaxEditorLength),
		ExtensionVersion: clampOptionalString(strings.TrimSpace(extension.ExtensionVersion), config.MaxExtensionVersionLength),
		LastHandshakeAt:  serverTime,
	}

	if len(accepted) > 0 {
		status.LastEventAt = latestEventTimestamp(accepted)
	}

	return status
}

func latestEventTimestamp(events []contracts.ActivityEvent) string {
	if len(events) == 0 {
		return ""
	}

	ordered := append([]contracts.ActivityEvent(nil), events...)
	sort.SliceStable(ordered, func(i, j int) bool {
		return ordered[i].Timestamp > ordered[j].Timestamp
	})

	return ordered[0].Timestamp
}

func isSupportedEventType(eventType string) bool {
	switch eventType {
	case "heartbeat", "edit", "save", "open", "focus", "blur":
		return true
	default:
		return false
	}
}

func clampRequiredString(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func clampOptionalString(value string, max int) string {
	if value == "" || len(value) <= max {
		return value
	}
	return value[:max]
}
