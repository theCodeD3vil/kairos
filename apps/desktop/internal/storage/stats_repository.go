package storage

import (
	"context"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func (s *Store) GetIngestionStats(ctx context.Context, runtimeRejectedEvents int) (contracts.IngestionStats, error) {
	totalAcceptedEvents, err := s.CountAcceptedEvents(ctx)
	if err != nil {
		return contracts.IngestionStats{}, err
	}

	knownMachineCount, err := s.CountKnownMachines(ctx)
	if err != nil {
		return contracts.IngestionStats{}, err
	}

	lastIngestedAt, err := s.GetLastIngestedAt(ctx)
	if err != nil {
		return contracts.IngestionStats{}, err
	}

	lastEventAt, err := s.GetLastEventTimestamp(ctx)
	if err != nil {
		return contracts.IngestionStats{}, err
	}

	lastMachineSeen, err := s.GetLastSeenMachineID(ctx)
	if err != nil {
		return contracts.IngestionStats{}, err
	}

	return contracts.IngestionStats{
		TotalAcceptedEvents: totalAcceptedEvents,
		TotalRejectedEvents: runtimeRejectedEvents,
		KnownMachineCount:   knownMachineCount,
		LastIngestedAt:      lastIngestedAt,
		LastEventAt:         lastEventAt,
		LastMachineSeen:     lastMachineSeen,
	}, nil
}
