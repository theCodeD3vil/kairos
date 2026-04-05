package store

import (
	"sort"
	"sync"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

type machineRecord struct {
	info       contracts.MachineInfo
	lastSeenAt string
}

type MemoryStore struct {
	mu              sync.RWMutex
	events          []contracts.ActivityEvent
	machines        map[string]machineRecord
	extensionStatus contracts.ExtensionStatus
	stats           contracts.IngestionStats
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		events:   make([]contracts.ActivityEvent, 0),
		machines: make(map[string]machineRecord),
		extensionStatus: contracts.ExtensionStatus{
			Installed: false,
			Connected: false,
			Editor:    "vscode",
		},
	}
}

func (s *MemoryStore) AppendEvents(events []contracts.ActivityEvent) {
	if len(events) == 0 {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	s.events = append(s.events, events...)
	s.stats.TotalAcceptedEvents += len(events)
}

func (s *MemoryStore) UpsertMachine(machine contracts.MachineInfo, lastSeenAt string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, ok := s.machines[machine.MachineID]
	if ok {
		if machine.MachineName == "" {
			machine.MachineName = existing.info.MachineName
		}
		if machine.Hostname == "" {
			machine.Hostname = existing.info.Hostname
		}
		if machine.OSPlatform == "" {
			machine.OSPlatform = existing.info.OSPlatform
		}
		if machine.OSVersion == "" {
			machine.OSVersion = existing.info.OSVersion
		}
		if machine.Arch == "" {
			machine.Arch = existing.info.Arch
		}
	}

	s.machines[machine.MachineID] = machineRecord{
		info:       machine,
		lastSeenAt: lastSeenAt,
	}
	s.stats.KnownMachineCount = len(s.machines)
	s.stats.LastMachineSeen = machine.MachineID
}

func (s *MemoryStore) SetExtensionStatus(status contracts.ExtensionStatus) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.extensionStatus = status
}

func (s *MemoryStore) AddRejected(count int) {
	if count <= 0 {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.stats.TotalRejectedEvents += count
}

func (s *MemoryStore) SetLastIngestedAt(timestamp string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.stats.LastIngestedAt = timestamp
}

func (s *MemoryStore) SetLastEventAt(timestamp string) {
	if timestamp == "" {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	s.stats.LastEventAt = timestamp
}

func (s *MemoryStore) GetExtensionStatus() contracts.ExtensionStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.extensionStatus
}

func (s *MemoryStore) ListKnownMachines() []contracts.MachineInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	machines := make([]contracts.MachineInfo, 0, len(s.machines))
	for _, record := range s.machines {
		machines = append(machines, record.info)
	}

	sort.Slice(machines, func(i, j int) bool {
		return machines[i].MachineID < machines[j].MachineID
	})

	return machines
}

func (s *MemoryStore) ListRecentEvents(limit int) []contracts.ActivityEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 {
		limit = 20
	}

	events := append([]contracts.ActivityEvent(nil), s.events...)
	sort.SliceStable(events, func(i, j int) bool {
		return events[i].Timestamp > events[j].Timestamp
	})

	if len(events) > limit {
		events = events[:limit]
	}

	return events
}

func (s *MemoryStore) GetIngestionStats() contracts.IngestionStats {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.stats
}
