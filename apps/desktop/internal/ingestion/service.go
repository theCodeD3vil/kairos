package ingestion

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

type Service interface {
	IngestEvents(ctx context.Context, request contracts.IngestEventsRequest) (contracts.IngestEventsResponse, error)
	GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error)
	ListKnownMachines(ctx context.Context) ([]contracts.MachineInfo, error)
	ListRecentEvents(ctx context.Context, limit int) ([]contracts.ActivityEvent, error)
	GetIngestionStats(ctx context.Context) (contracts.IngestionStats, error)
}

type ServiceImpl struct {
	store *storage.Store
	now   func() time.Time

	mu                 sync.Mutex
	runtimeRejectCount int
}

func NewService(sqliteStore *storage.Store) *ServiceImpl {
	return &ServiceImpl{
		store: sqliteStore,
		now:   time.Now,
	}
}

func (s *ServiceImpl) IngestEvents(ctx context.Context, request contracts.IngestEventsRequest) (contracts.IngestEventsResponse, error) {
	if err := validateRequest(request); err != nil {
		return contracts.IngestEventsResponse{}, err
	}

	serverTime := s.now().UTC().Format(time.RFC3339)
	machine := mergeMachine(request.Machine)

	accepted := make([]contracts.ActivityEvent, 0, len(request.Events))
	warnings := make([]string, 0)

	for index, rawEvent := range request.Events {
		event, eventWarnings, err := validateEvent(rawEvent, machine.MachineID)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("event[%d]: %s", index, err.Error()))
			continue
		}

		for _, warning := range eventWarnings {
			warnings = append(warnings, fmt.Sprintf("event[%d]: %s", index, warning))
		}

		accepted = append(accepted, event)
	}

	persisted := accepted
	if len(accepted) > 0 {
		insertedEvents, insertWarnings, err := s.store.InsertEvents(ctx, accepted, serverTime)
		if err != nil {
			return contracts.IngestEventsResponse{}, err
		}
		persisted = insertedEvents
		warnings = append(warnings, insertWarnings...)
	}

	if err := s.store.UpsertMachine(ctx, machine, serverTime); err != nil {
		return contracts.IngestEventsResponse{}, err
	}

	if err := s.store.UpsertExtensionStatus(
		ctx,
		buildExtensionStatus(request.Extension, persisted, serverTime),
		serverTime,
	); err != nil {
		return contracts.IngestEventsResponse{}, err
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

func (s *ServiceImpl) GetExtensionStatus(ctx context.Context) (contracts.ExtensionStatus, error) {
	return s.store.GetExtensionStatus(ctx, "vscode")
}

func (s *ServiceImpl) ListKnownMachines(ctx context.Context) ([]contracts.MachineInfo, error) {
	return s.store.ListKnownMachines(ctx)
}

func (s *ServiceImpl) ListRecentEvents(ctx context.Context, limit int) ([]contracts.ActivityEvent, error) {
	return s.store.ListRecentEvents(ctx, limit)
}

func (s *ServiceImpl) GetIngestionStats(ctx context.Context) (contracts.IngestionStats, error) {
	s.mu.Lock()
	rejected := s.runtimeRejectCount
	s.mu.Unlock()

	return s.store.GetIngestionStats(ctx, rejected)
}

func validateRequest(request contracts.IngestEventsRequest) error {
	request.Machine = mergeMachine(request.Machine)

	switch {
	case request.Machine.MachineID == "":
		return fmt.Errorf("invalid ingest request: missing machine.machineId")
	case request.Extension.Editor == "":
		return fmt.Errorf("invalid ingest request: missing extension.editor")
	case request.Events == nil:
		return fmt.Errorf("invalid ingest request: missing events array")
	default:
		return nil
	}
}

func validateEvent(event contracts.ActivityEvent, requestMachineID string) (contracts.ActivityEvent, []string, error) {
	clean := sanitizeEvent(event)

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

	return clean, nil, nil
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

func buildExtensionStatus(extension contracts.ExtensionInfo, accepted []contracts.ActivityEvent, serverTime string) contracts.ExtensionStatus {
	status := contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           strings.TrimSpace(extension.Editor),
		ExtensionVersion: strings.TrimSpace(extension.ExtensionVersion),
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
