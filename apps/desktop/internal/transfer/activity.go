package transfer

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

const (
	ActivityFormat        = "kairos.activity"
	ActivityFormatVersion = 1
	MaxImportFileBytes    = 100 * 1024 * 1024
)

type SessionRebuilder interface {
	RebuildSessionsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionRebuildResult, error)
}

type SourceInstance struct {
	DesktopInstanceID string `json:"desktopInstanceId,omitempty"`
	AppVersion        string `json:"appVersion,omitempty"`
}

type ActivityTransferSummary struct {
	MachineCount  int    `json:"machineCount"`
	EventCount    int    `json:"eventCount"`
	SessionCount  int    `json:"sessionCount"`
	StartDate     string `json:"startDate,omitempty"`
	EndDate       string `json:"endDate,omitempty"`
	ContentDigest string `json:"contentDigest,omitempty"`
}

type ActivityTransferFile struct {
	Format        string                    `json:"format,omitempty"`
	FormatVersion int                       `json:"formatVersion,omitempty"`
	ExportedAt    string                    `json:"exportedAt,omitempty"`
	AppVersion    string                    `json:"appVersion,omitempty"`
	Source        SourceInstance            `json:"sourceInstance,omitempty"`
	Machines      []contracts.MachineInfo   `json:"machines,omitempty"`
	Events        []contracts.ActivityEvent `json:"events"`
	Sessions      []contracts.Session       `json:"sessions,omitempty"`
	Summary       ActivityTransferSummary   `json:"summary,omitempty"`
}

type ExportResult struct {
	FilePath     string `json:"filePath,omitempty"`
	Cancelled    bool   `json:"cancelled"`
	MachineCount int    `json:"machineCount"`
	EventCount   int    `json:"eventCount"`
	SessionCount int    `json:"sessionCount"`
	StartDate    string `json:"startDate,omitempty"`
	EndDate      string `json:"endDate,omitempty"`
}

type ImportPreview struct {
	FilePath                string   `json:"filePath,omitempty"`
	Cancelled               bool     `json:"cancelled"`
	FormatVersion           int      `json:"formatVersion"`
	LegacyFormat            bool     `json:"legacyFormat"`
	ExportedAt              string   `json:"exportedAt,omitempty"`
	AppVersion              string   `json:"appVersion,omitempty"`
	SourceDesktopInstanceID string   `json:"sourceDesktopInstanceId,omitempty"`
	MachineCount            int      `json:"machineCount"`
	EventCount              int      `json:"eventCount"`
	ValidEventCount         int      `json:"validEventCount"`
	NewEventCount           int      `json:"newEventCount"`
	DuplicateEventCount     int      `json:"duplicateEventCount"`
	ConflictingEventCount   int      `json:"conflictingEventCount"`
	InvalidEventCount       int      `json:"invalidEventCount"`
	SessionCount            int      `json:"sessionCount"`
	NewSessionCount         int      `json:"newSessionCount"`
	DuplicateSessionCount   int      `json:"duplicateSessionCount"`
	ConflictingSessionCount int      `json:"conflictingSessionCount"`
	InvalidSessionCount     int      `json:"invalidSessionCount"`
	StartDate               string   `json:"startDate,omitempty"`
	EndDate                 string   `json:"endDate,omitempty"`
	AffectedStartDate       string   `json:"affectedStartDate,omitempty"`
	AffectedEndDate         string   `json:"affectedEndDate,omitempty"`
	CanImport               bool     `json:"canImport"`
	WillRebuildSessions     bool     `json:"willRebuildSessions"`
	WillUseSessionFallback  bool     `json:"willUseSessionFallback"`
	Warnings                []string `json:"warnings,omitempty"`
}

type ImportResult struct {
	FilePath                string   `json:"filePath,omitempty"`
	Cancelled               bool     `json:"cancelled"`
	FormatVersion           int      `json:"formatVersion"`
	LegacyFormat            bool     `json:"legacyFormat"`
	UpsertedMachineCount    int      `json:"upsertedMachineCount"`
	InsertedEventCount      int      `json:"insertedEventCount"`
	DuplicateEventCount     int      `json:"duplicateEventCount"`
	ConflictingEventCount   int      `json:"conflictingEventCount"`
	InvalidEventCount       int      `json:"invalidEventCount"`
	InsertedSessionCount    int      `json:"insertedSessionCount"`
	DuplicateSessionCount   int      `json:"duplicateSessionCount"`
	ConflictingSessionCount int      `json:"conflictingSessionCount"`
	InvalidSessionCount     int      `json:"invalidSessionCount"`
	RebuiltSessionCount     int      `json:"rebuiltSessionCount"`
	AffectedStartDate       string   `json:"affectedStartDate,omitempty"`
	AffectedEndDate         string   `json:"affectedEndDate,omitempty"`
	Warnings                []string `json:"warnings,omitempty"`
}

type importAnalysis struct {
	preview          ImportPreview
	machinesToUpsert []contracts.MachineInfo
	eventsToInsert   []contracts.ActivityEvent
	sessionsToInsert []contracts.Session
}

func ExportActivityDataToFile(
	ctx context.Context,
	store *storage.Store,
	filePath string,
	appVersion string,
	now time.Time,
) (ExportResult, error) {
	payload, err := BuildActivityTransferFile(ctx, store, appVersion, now)
	if err != nil {
		return ExportResult{}, err
	}
	if err := writeJSONFileAtomically(filePath, payload); err != nil {
		return ExportResult{}, err
	}
	return ExportResult{
		FilePath:     filePath,
		MachineCount: payload.Summary.MachineCount,
		EventCount:   payload.Summary.EventCount,
		SessionCount: payload.Summary.SessionCount,
		StartDate:    payload.Summary.StartDate,
		EndDate:      payload.Summary.EndDate,
	}, nil
}

func BuildActivityTransferFile(
	ctx context.Context,
	store *storage.Store,
	appVersion string,
	now time.Time,
) (ActivityTransferFile, error) {
	machines, err := store.ListKnownMachines(ctx)
	if err != nil {
		return ActivityTransferFile{}, fmt.Errorf("list machines for export: %w", err)
	}
	events, err := store.ListEventsForDateRange(ctx, "0000-00-00", "9999-99-99")
	if err != nil {
		return ActivityTransferFile{}, fmt.Errorf("list events for export: %w", err)
	}
	sessions, err := store.ListSessionsForRange(ctx, "0000-00-00", "9999-99-99")
	if err != nil {
		return ActivityTransferFile{}, fmt.Errorf("list sessions for export: %w", err)
	}
	instanceID, err := store.GetOrCreateDesktopInstanceID(ctx)
	if err != nil {
		return ActivityTransferFile{}, fmt.Errorf("read desktop instance id: %w", err)
	}

	payload := ActivityTransferFile{
		Format:        ActivityFormat,
		FormatVersion: ActivityFormatVersion,
		ExportedAt:    now.UTC().Format(time.RFC3339),
		AppVersion:    appVersion,
		Source: SourceInstance{
			DesktopInstanceID: instanceID,
			AppVersion:        appVersion,
		},
		Machines: machines,
		Events:   events,
		Sessions: sessions,
	}
	payload.Summary = buildSummary(machines, events, sessions)
	payload.Summary.ContentDigest = computeContentDigest(machines, events, sessions)
	return payload, nil
}

func PreviewActivityImport(ctx context.Context, store *storage.Store, filePath string) (ImportPreview, error) {
	payload, legacy, err := ReadActivityTransferFile(filePath)
	if err != nil {
		return ImportPreview{}, err
	}
	analysis, err := analyzeImport(ctx, store, payload, filePath, legacy)
	if err != nil {
		return ImportPreview{}, err
	}
	return analysis.preview, nil
}

func ImportActivityData(
	ctx context.Context,
	store *storage.Store,
	rebuilder SessionRebuilder,
	filePath string,
	now time.Time,
) (ImportResult, error) {
	payload, legacy, err := ReadActivityTransferFile(filePath)
	if err != nil {
		return ImportResult{}, err
	}
	analysis, err := analyzeImport(ctx, store, payload, filePath, legacy)
	if err != nil {
		return ImportResult{}, err
	}
	preview := analysis.preview
	result := ImportResult{
		FilePath:                filePath,
		FormatVersion:           preview.FormatVersion,
		LegacyFormat:            preview.LegacyFormat,
		DuplicateEventCount:     preview.DuplicateEventCount,
		ConflictingEventCount:   preview.ConflictingEventCount,
		InvalidEventCount:       preview.InvalidEventCount,
		DuplicateSessionCount:   preview.DuplicateSessionCount,
		ConflictingSessionCount: preview.ConflictingSessionCount,
		InvalidSessionCount:     preview.InvalidSessionCount,
		AffectedStartDate:       preview.AffectedStartDate,
		AffectedEndDate:         preview.AffectedEndDate,
		Warnings:                append([]string{}, preview.Warnings...),
	}
	if !preview.CanImport {
		return result, nil
	}

	recordedAt := now.UTC().Format(time.RFC3339)
	for _, machine := range analysis.machinesToUpsert {
		if err := store.UpsertMachine(ctx, machine, recordedAt); err != nil {
			return ImportResult{}, fmt.Errorf("upsert imported machine %s: %w", machine.MachineID, err)
		}
		result.UpsertedMachineCount++
	}

	if len(analysis.eventsToInsert) > 0 {
		inserted, warnings, err := store.InsertEvents(ctx, analysis.eventsToInsert, recordedAt)
		if err != nil {
			return ImportResult{}, fmt.Errorf("insert imported events: %w", err)
		}
		result.InsertedEventCount = len(inserted)
		result.Warnings = append(result.Warnings, warnings...)
		if result.InsertedEventCount > 0 && rebuilder != nil {
			rebuild, err := rebuilder.RebuildSessionsForRange(ctx, preview.AffectedStartDate, preview.AffectedEndDate)
			if err != nil {
				return result, fmt.Errorf("rebuild sessions after import: %w", err)
			}
			result.RebuiltSessionCount = rebuild.CreatedSessionCount
		}
	}

	if len(analysis.sessionsToInsert) > 0 {
		if err := store.InsertSessions(ctx, analysis.sessionsToInsert, recordedAt); err != nil {
			return ImportResult{}, fmt.Errorf("insert imported sessions: %w", err)
		}
		result.InsertedSessionCount = len(analysis.sessionsToInsert)
	}

	return result, nil
}

func ReadActivityTransferFile(filePath string) (ActivityTransferFile, bool, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return ActivityTransferFile{}, false, fmt.Errorf("open import file: %w", err)
	}
	defer file.Close()

	limited := io.LimitReader(file, MaxImportFileBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return ActivityTransferFile{}, false, fmt.Errorf("read import file: %w", err)
	}
	if len(data) > MaxImportFileBytes {
		return ActivityTransferFile{}, false, fmt.Errorf("import file is larger than %d bytes", MaxImportFileBytes)
	}

	var payload ActivityTransferFile
	if err := json.Unmarshal(data, &payload); err != nil {
		return ActivityTransferFile{}, false, fmt.Errorf("parse import file: %w", err)
	}

	legacy := payload.FormatVersion == 0 && payload.Format == ""
	if !legacy {
		if payload.Format != ActivityFormat {
			return ActivityTransferFile{}, false, fmt.Errorf("unsupported import format %q", payload.Format)
		}
		if payload.FormatVersion > ActivityFormatVersion {
			return ActivityTransferFile{}, false, fmt.Errorf("unsupported import format version %d", payload.FormatVersion)
		}
		if payload.Summary.ContentDigest != "" {
			expected := computeContentDigest(payload.Machines, payload.Events, payload.Sessions)
			if !strings.EqualFold(payload.Summary.ContentDigest, expected) {
				return ActivityTransferFile{}, false, errors.New("import file content digest does not match")
			}
		}
	}
	if payload.Events == nil && payload.Sessions == nil {
		return ActivityTransferFile{}, false, errors.New("import file does not contain activity data")
	}
	if legacy {
		payload.FormatVersion = 0
	}
	return payload, legacy, nil
}

func analyzeImport(ctx context.Context, store *storage.Store, payload ActivityTransferFile, filePath string, legacy bool) (importAnalysis, error) {
	analysis := importAnalysis{}
	preview := ImportPreview{
		FilePath:                filePath,
		FormatVersion:           payload.FormatVersion,
		LegacyFormat:            legacy,
		ExportedAt:              payload.ExportedAt,
		AppVersion:              payload.AppVersion,
		SourceDesktopInstanceID: payload.Source.DesktopInstanceID,
		MachineCount:            len(payload.Machines),
		EventCount:              len(payload.Events),
		SessionCount:            len(payload.Sessions),
		Warnings:                make([]string, 0),
	}

	validMachines := validMachinesFromPayload(payload.Machines, &preview)
	validEvents := make([]contracts.ActivityEvent, 0, len(payload.Events))
	seenEvents := make(map[string]contracts.ActivityEvent, len(payload.Events))
	for _, event := range payload.Events {
		if warning := validateActivityEvent(event); warning != "" {
			preview.InvalidEventCount++
			appendCappedWarning(&preview.Warnings, warning)
			continue
		}
		if existing, ok := seenEvents[event.ID]; ok {
			if activityEventsEqual(existing, event) {
				preview.DuplicateEventCount++
				continue
			}
			preview.ConflictingEventCount++
			appendCappedWarning(&preview.Warnings, fmt.Sprintf("event id %q appears more than once with different values", event.ID))
			continue
		}
		seenEvents[event.ID] = event
		preview.ValidEventCount++
		validEvents = append(validEvents, event)
		expandDateRange(&preview.StartDate, &preview.EndDate, event.Timestamp[:10])
		validMachines = ensureMachineForID(validMachines, event.MachineID)
	}

	for _, event := range validEvents {
		existing, found, err := store.GetEvent(ctx, event.ID)
		if err != nil {
			return importAnalysis{}, err
		}
		if found {
			if activityEventsEqual(existing, event) {
				preview.DuplicateEventCount++
			} else {
				preview.ConflictingEventCount++
				appendCappedWarning(&preview.Warnings, fmt.Sprintf("event id %q already exists with different values", event.ID))
			}
			continue
		}
		analysis.eventsToInsert = append(analysis.eventsToInsert, event)
		preview.NewEventCount++
		expandDateRange(&preview.AffectedStartDate, &preview.AffectedEndDate, event.Timestamp[:10])
	}

	if len(payload.Events) == 0 && legacy && len(payload.Sessions) > 0 {
		analyzeLegacySessionFallback(ctx, store, payload.Sessions, validMachines, &analysis, &preview)
	}

	analysis.machinesToUpsert = mapValuesSorted(validMachines)
	preview.WillRebuildSessions = preview.NewEventCount > 0
	preview.WillUseSessionFallback = len(analysis.sessionsToInsert) > 0
	preview.CanImport = preview.NewEventCount > 0 || len(analysis.sessionsToInsert) > 0 || len(analysis.machinesToUpsert) > 0
	if len(payload.Events) == 0 && len(payload.Sessions) == 0 {
		preview.CanImport = false
		appendCappedWarning(&preview.Warnings, "import file has no events or sessions")
	}

	analysis.preview = preview
	return analysis, nil
}

func analyzeLegacySessionFallback(
	ctx context.Context,
	store *storage.Store,
	sessions []contracts.Session,
	validMachines map[string]contracts.MachineInfo,
	analysis *importAnalysis,
	preview *ImportPreview,
) {
	validSessions := make([]contracts.Session, 0, len(sessions))
	seenSessions := make(map[string]contracts.Session, len(sessions))
	startDate := ""
	endDate := ""
	for _, session := range sessions {
		if warning := validateSession(session); warning != "" {
			preview.InvalidSessionCount++
			appendCappedWarning(&preview.Warnings, warning)
			continue
		}
		if existing, ok := seenSessions[session.ID]; ok {
			if sessionsEqual(existing, session) {
				preview.DuplicateSessionCount++
				continue
			}
			preview.ConflictingSessionCount++
			appendCappedWarning(&preview.Warnings, fmt.Sprintf("session id %q appears more than once with different values", session.ID))
			continue
		}
		seenSessions[session.ID] = session
		validSessions = append(validSessions, session)
		validMachines = ensureMachineForID(validMachines, session.MachineID)
		expandDateRange(&startDate, &endDate, session.Date)
		expandDateRange(&preview.StartDate, &preview.EndDate, session.Date)
	}
	if startDate == "" || endDate == "" {
		return
	}

	existingSessions, err := store.ListSessionsForRange(ctx, startDate, endDate)
	if err != nil {
		appendCappedWarning(&preview.Warnings, fmt.Sprintf("could not inspect existing sessions: %v", err))
		return
	}
	existingByID := make(map[string]contracts.Session, len(existingSessions))
	for _, session := range existingSessions {
		existingByID[session.ID] = session
	}
	for _, session := range validSessions {
		if existing, ok := existingByID[session.ID]; ok {
			if sessionsEqual(existing, session) {
				preview.DuplicateSessionCount++
			} else {
				preview.ConflictingSessionCount++
				appendCappedWarning(&preview.Warnings, fmt.Sprintf("session id %q already exists with different values", session.ID))
			}
			continue
		}
		analysis.sessionsToInsert = append(analysis.sessionsToInsert, session)
		preview.NewSessionCount++
		expandDateRange(&preview.AffectedStartDate, &preview.AffectedEndDate, session.Date)
	}
}

func validMachinesFromPayload(machines []contracts.MachineInfo, preview *ImportPreview) map[string]contracts.MachineInfo {
	valid := make(map[string]contracts.MachineInfo, len(machines))
	for _, machine := range machines {
		if warning := validateMachine(machine); warning != "" {
			appendCappedWarning(&preview.Warnings, warning)
			continue
		}
		valid[machine.MachineID] = machine
	}
	return valid
}

func validateActivityEvent(event contracts.ActivityEvent) string {
	switch {
	case strings.TrimSpace(event.ID) == "":
		return "event missing id"
	case strings.TrimSpace(event.Timestamp) == "":
		return fmt.Sprintf("event %q missing timestamp", event.ID)
	case strings.TrimSpace(event.EventType) == "":
		return fmt.Sprintf("event %q missing eventType", event.ID)
	case strings.TrimSpace(event.MachineID) == "":
		return fmt.Sprintf("event %q missing machineId", event.ID)
	case strings.TrimSpace(event.WorkspaceID) == "":
		return fmt.Sprintf("event %q missing workspaceId", event.ID)
	case strings.TrimSpace(event.ProjectName) == "":
		return fmt.Sprintf("event %q missing projectName", event.ID)
	case strings.TrimSpace(event.Language) == "":
		return fmt.Sprintf("event %q missing language", event.ID)
	}
	if !isSupportedEventType(event.EventType) {
		return fmt.Sprintf("event %q has unsupported eventType %q", event.ID, event.EventType)
	}
	if _, err := time.Parse(time.RFC3339, event.Timestamp); err != nil {
		return fmt.Sprintf("event %q has invalid timestamp", event.ID)
	}
	if tooLong(event.ID, config.MaxEventIDLength) ||
		tooLong(event.EventType, config.MaxEventTypeLength) ||
		tooLong(event.MachineID, config.MaxMachineIDLength) ||
		tooLong(event.WorkspaceID, config.MaxWorkspaceIDLength) ||
		tooLong(event.ProjectName, config.MaxProjectNameLength) ||
		tooLong(event.Language, config.MaxLanguageLength) ||
		tooLong(event.FilePath, config.MaxFilePathLength) ||
		tooLong(event.GitBranch, config.MaxGitBranchLength) {
		return fmt.Sprintf("event %q exceeds supported field length", event.ID)
	}
	return ""
}

func validateMachine(machine contracts.MachineInfo) string {
	switch {
	case strings.TrimSpace(machine.MachineID) == "":
		return "machine missing machineId"
	case strings.TrimSpace(machine.MachineName) == "":
		return fmt.Sprintf("machine %q missing machineName", machine.MachineID)
	case strings.TrimSpace(machine.OSPlatform) == "":
		return fmt.Sprintf("machine %q missing osPlatform", machine.MachineID)
	}
	if tooLong(machine.MachineID, config.MaxMachineIDLength) ||
		tooLong(machine.MachineName, config.MaxMachineNameLength) ||
		tooLong(machine.Hostname, config.MaxHostnameLength) ||
		tooLong(machine.OSPlatform, config.MaxOSPlatformLength) ||
		tooLong(machine.OSVersion, config.MaxOSVersionLength) ||
		tooLong(machine.Arch, config.MaxArchLength) {
		return fmt.Sprintf("machine %q exceeds supported field length", machine.MachineID)
	}
	return ""
}

func validateSession(session contracts.Session) string {
	switch {
	case strings.TrimSpace(session.ID) == "":
		return "session missing id"
	case strings.TrimSpace(session.Date) == "":
		return fmt.Sprintf("session %q missing date", session.ID)
	case strings.TrimSpace(session.StartTime) == "":
		return fmt.Sprintf("session %q missing startTime", session.ID)
	case strings.TrimSpace(session.EndTime) == "":
		return fmt.Sprintf("session %q missing endTime", session.ID)
	case strings.TrimSpace(session.MachineID) == "":
		return fmt.Sprintf("session %q missing machineId", session.ID)
	case strings.TrimSpace(session.ProjectName) == "":
		return fmt.Sprintf("session %q missing projectName", session.ID)
	case strings.TrimSpace(session.Language) == "":
		return fmt.Sprintf("session %q missing language", session.ID)
	case session.DurationMinutes < 0:
		return fmt.Sprintf("session %q has invalid duration", session.ID)
	}
	if _, err := time.Parse("2006-01-02", session.Date); err != nil {
		return fmt.Sprintf("session %q has invalid date", session.ID)
	}
	start, startErr := time.Parse(time.RFC3339, session.StartTime)
	end, endErr := time.Parse(time.RFC3339, session.EndTime)
	if startErr != nil || endErr != nil || end.Before(start) {
		return fmt.Sprintf("session %q has invalid time range", session.ID)
	}
	return ""
}

func writeJSONFileAtomically(filePath string, payload ActivityTransferFile) error {
	dir := filepath.Dir(filePath)
	base := filepath.Base(filePath)
	tmp, err := os.CreateTemp(dir, "."+base+".*.tmp")
	if err != nil {
		return fmt.Errorf("create temporary export file: %w", err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	_ = tmp.Chmod(0o600)
	encoder := json.NewEncoder(tmp)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(payload); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("encode export data: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temporary export file: %w", err)
	}

	if err := os.Rename(tmpPath, filePath); err != nil {
		if runtime.GOOS == "windows" {
			_ = os.Remove(filePath)
			if renameErr := os.Rename(tmpPath, filePath); renameErr == nil {
				return nil
			}
		}
		return fmt.Errorf("replace export file: %w", err)
	}
	return nil
}

func buildSummary(machines []contracts.MachineInfo, events []contracts.ActivityEvent, sessions []contracts.Session) ActivityTransferSummary {
	summary := ActivityTransferSummary{
		MachineCount: len(machines),
		EventCount:   len(events),
		SessionCount: len(sessions),
	}
	for _, event := range events {
		if len(event.Timestamp) >= 10 {
			expandDateRange(&summary.StartDate, &summary.EndDate, event.Timestamp[:10])
		}
	}
	if summary.StartDate == "" {
		for _, session := range sessions {
			expandDateRange(&summary.StartDate, &summary.EndDate, session.Date)
		}
	}
	return summary
}

func computeContentDigest(machines []contracts.MachineInfo, events []contracts.ActivityEvent, sessions []contracts.Session) string {
	body, err := json.Marshal(struct {
		Machines []contracts.MachineInfo   `json:"machines"`
		Events   []contracts.ActivityEvent `json:"events"`
		Sessions []contracts.Session       `json:"sessions"`
	}{Machines: machines, Events: events, Sessions: sessions})
	if err != nil {
		return ""
	}
	sum := sha256.Sum256(body)
	return "sha256:" + hex.EncodeToString(sum[:])
}

func ensureMachineForID(machines map[string]contracts.MachineInfo, machineID string) map[string]contracts.MachineInfo {
	if _, ok := machines[machineID]; ok || strings.TrimSpace(machineID) == "" {
		return machines
	}
	machines[machineID] = contracts.MachineInfo{
		MachineID:   machineID,
		MachineName: machineID,
		OSPlatform:  "unknown",
	}
	return machines
}

func expandDateRange(start *string, end *string, date string) {
	if date == "" {
		return
	}
	if *start == "" || date < *start {
		*start = date
	}
	if *end == "" || date > *end {
		*end = date
	}
}

func appendCappedWarning(warnings *[]string, warning string) {
	const maxWarnings = 20
	if warning == "" || len(*warnings) >= maxWarnings {
		return
	}
	*warnings = append(*warnings, warning)
}

func mapValuesSorted(values map[string]contracts.MachineInfo) []contracts.MachineInfo {
	result := make([]contracts.MachineInfo, 0, len(values))
	for _, value := range values {
		result = append(result, value)
	}
	sort.Slice(result, func(i int, j int) bool {
		return result[i].MachineID < result[j].MachineID
	})
	return result
}

func tooLong(value string, max int) bool {
	return len(value) > max
}

func isSupportedEventType(eventType string) bool {
	switch eventType {
	case "heartbeat", "edit", "save", "open", "focus", "blur":
		return true
	default:
		return false
	}
}

func activityEventsEqual(left contracts.ActivityEvent, right contracts.ActivityEvent) bool {
	return left.ID == right.ID &&
		left.Timestamp == right.Timestamp &&
		left.EventType == right.EventType &&
		left.MachineID == right.MachineID &&
		left.WorkspaceID == right.WorkspaceID &&
		left.ProjectName == right.ProjectName &&
		left.Language == right.Language &&
		left.FilePath == right.FilePath &&
		left.GitBranch == right.GitBranch
}

func sessionsEqual(left contracts.Session, right contracts.Session) bool {
	return left.ID == right.ID &&
		left.Date == right.Date &&
		left.StartTime == right.StartTime &&
		left.EndTime == right.EndTime &&
		left.DurationMinutes == right.DurationMinutes &&
		left.MachineID == right.MachineID &&
		left.ProjectName == right.ProjectName &&
		left.Language == right.Language &&
		left.SourceEventCount == right.SourceEventCount
}
