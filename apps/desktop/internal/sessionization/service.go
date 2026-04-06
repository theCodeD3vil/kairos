package sessionization

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

const (
	defaultIdleThresholdMinutes  = 5
	defaultMergeThresholdMinutes = 10
)

type Service interface {
	RebuildAllSessions(ctx context.Context) (contracts.SessionRebuildResult, error)
	RebuildSessionsForDate(ctx context.Context, date string) (contracts.SessionRebuildResult, error)
	RebuildSessionsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionRebuildResult, error)
	ListRecentSessions(ctx context.Context, limit int) ([]contracts.Session, error)
	ListSessionsForDate(ctx context.Context, date string) ([]contracts.Session, error)
	ListSessionsForRange(ctx context.Context, startDate string, endDate string) ([]contracts.Session, error)
	GetSessionStatsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionStats, error)
}

type ServiceImpl struct {
	store          *storage.Store
	now            func() time.Time
	idleThreshold  time.Duration
	mergeThreshold time.Duration
}

type sessionCandidate struct {
	machineID string
	date      string
	startAt   time.Time
	endAt     time.Time
	events    []contracts.ActivityEvent
}

func NewService(sqliteStore *storage.Store) *ServiceImpl {
	return &ServiceImpl{
		store:          sqliteStore,
		now:            time.Now,
		idleThreshold:  defaultIdleThresholdMinutes * time.Minute,
		mergeThreshold: defaultMergeThresholdMinutes * time.Minute,
	}
}

func (s *ServiceImpl) RebuildAllSessions(ctx context.Context) (contracts.SessionRebuildResult, error) {
	firstEventAt, err := s.store.GetFirstEventTimestamp(ctx)
	if err != nil {
		return contracts.SessionRebuildResult{}, err
	}
	lastEventAt, err := s.store.GetLastEventTimestamp(ctx)
	if err != nil {
		return contracts.SessionRebuildResult{}, err
	}
	if firstEventAt == "" || lastEventAt == "" {
		if err := s.store.DeleteAllSessions(ctx); err != nil {
			return contracts.SessionRebuildResult{}, err
		}
		return contracts.SessionRebuildResult{
			ProcessedEventCount: 0,
			CreatedSessionCount: 0,
			StartDate:           "",
			EndDate:             "",
			RebuiltAt:           s.now().UTC().Format(time.RFC3339),
		}, nil
	}

	return s.RebuildSessionsForRange(ctx, firstEventAt[:10], lastEventAt[:10])
}

func (s *ServiceImpl) RebuildSessionsForDate(ctx context.Context, date string) (contracts.SessionRebuildResult, error) {
	return s.RebuildSessionsForRange(ctx, date, date)
}

func (s *ServiceImpl) RebuildSessionsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionRebuildResult, error) {
	events, err := s.store.ListEventsForDateRange(ctx, startDate, endDate)
	if err != nil {
		return contracts.SessionRebuildResult{}, err
	}

	sessions, err := s.buildSessions(events)
	if err != nil {
		return contracts.SessionRebuildResult{}, err
	}

	recordedAt := s.now().UTC().Format(time.RFC3339)
	if err := s.store.ReplaceSessionsInDateRange(ctx, startDate, endDate, sessions, recordedAt); err != nil {
		return contracts.SessionRebuildResult{}, err
	}

	return contracts.SessionRebuildResult{
		ProcessedEventCount: len(events),
		CreatedSessionCount: len(sessions),
		StartDate:           startDate,
		EndDate:             endDate,
		RebuiltAt:           recordedAt,
	}, nil
}

func (s *ServiceImpl) ListRecentSessions(ctx context.Context, limit int) ([]contracts.Session, error) {
	return s.store.ListRecentSessions(ctx, limit)
}

func (s *ServiceImpl) ListSessionsForDate(ctx context.Context, date string) ([]contracts.Session, error) {
	return s.store.ListSessionsForDate(ctx, date)
}

func (s *ServiceImpl) ListSessionsForRange(ctx context.Context, startDate string, endDate string) ([]contracts.Session, error) {
	return s.store.ListSessionsForRange(ctx, startDate, endDate)
}

func (s *ServiceImpl) GetSessionStatsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionStats, error) {
	return s.store.GetSessionStatsForRange(ctx, startDate, endDate)
}

func (s *ServiceImpl) buildSessions(events []contracts.ActivityEvent) ([]contracts.Session, error) {
	if len(events) == 0 {
		return []contracts.Session{}, nil
	}

	candidates := make([]sessionCandidate, 0)
	var current *sessionCandidate

	for _, event := range events {
		eventTime, err := time.Parse(time.RFC3339, event.Timestamp)
		if err != nil {
			return nil, fmt.Errorf("parse persisted event timestamp %s: %w", event.ID, err)
		}
		eventDate := eventTime.Format("2006-01-02")

		if current == nil || shouldSplitSession(*current, event, eventTime, eventDate, s.idleThreshold) {
			if current != nil {
				candidates = append(candidates, *current)
			}
			current = &sessionCandidate{
				machineID: event.MachineID,
				date:      eventDate,
				startAt:   eventTime,
				endAt:     eventTime,
				events:    []contracts.ActivityEvent{event},
			}
			continue
		}

		current.endAt = eventTime
		current.events = append(current.events, event)
	}

	if current != nil {
		candidates = append(candidates, *current)
	}

	merged := mergeAdjacentSessions(candidates, s.mergeThreshold)
	sessions := make([]contracts.Session, 0, len(merged))
	for _, candidate := range merged {
		sessions = append(sessions, buildSession(candidate))
	}

	sort.SliceStable(sessions, func(i, j int) bool {
		if sessions[i].StartTime == sessions[j].StartTime {
			return sessions[i].ID < sessions[j].ID
		}
		return sessions[i].StartTime < sessions[j].StartTime
	})

	return sessions, nil
}

func shouldSplitSession(current sessionCandidate, event contracts.ActivityEvent, eventTime time.Time, eventDate string, idleThreshold time.Duration) bool {
	if current.machineID != event.MachineID {
		return true
	}
	if current.date != eventDate {
		return true
	}
	return eventTime.Sub(current.endAt) > idleThreshold
}

func mergeAdjacentSessions(candidates []sessionCandidate, mergeThreshold time.Duration) []sessionCandidate {
	if len(candidates) == 0 {
		return candidates
	}

	merged := make([]sessionCandidate, 0, len(candidates))
	current := candidates[0]
	for _, next := range candidates[1:] {
		if canMergeSessions(current, next, mergeThreshold) {
			current.endAt = next.endAt
			current.events = append(current.events, next.events...)
			continue
		}
		merged = append(merged, current)
		current = next
	}
	merged = append(merged, current)

	return merged
}

func canMergeSessions(left sessionCandidate, right sessionCandidate, mergeThreshold time.Duration) bool {
	if left.machineID != right.machineID || left.date != right.date {
		return false
	}
	gap := right.startAt.Sub(left.endAt)
	return gap > 0 && gap <= mergeThreshold
}

func buildSession(candidate sessionCandidate) contracts.Session {
	projectName := dominantValue(candidate.events, func(event contracts.ActivityEvent) string {
		return event.ProjectName
	})
	language := dominantValue(candidate.events, func(event contracts.ActivityEvent) string {
		return event.Language
	})
	durationMinutes := int(math.Ceil(candidate.endAt.Sub(candidate.startAt).Minutes()))
	if durationMinutes < 1 {
		durationMinutes = 1
	}

	idSeed := fmt.Sprintf("%s|%s|%s|%s|%s|%d",
		candidate.machineID,
		candidate.date,
		candidate.startAt.UTC().Format(time.RFC3339),
		candidate.endAt.UTC().Format(time.RFC3339),
		projectName+"|"+language,
		len(candidate.events),
	)
	sum := sha1.Sum([]byte(idSeed))

	return contracts.Session{
		ID:               hex.EncodeToString(sum[:]),
		Date:             candidate.date,
		StartTime:        candidate.startAt.UTC().Format(time.RFC3339),
		EndTime:          candidate.endAt.UTC().Format(time.RFC3339),
		DurationMinutes:  durationMinutes,
		ProjectName:      projectName,
		Language:         language,
		MachineID:        candidate.machineID,
		SourceEventCount: len(candidate.events),
	}
}

func dominantValue(events []contracts.ActivityEvent, selector func(contracts.ActivityEvent) string) string {
	counts := make(map[string]int)
	values := make([]string, 0)
	for _, event := range events {
		value := selector(event)
		if _, exists := counts[value]; !exists {
			values = append(values, value)
		}
		counts[value]++
	}

	sort.Strings(values)
	bestValue := ""
	bestCount := -1
	for _, value := range values {
		if counts[value] > bestCount {
			bestValue = value
			bestCount = counts[value]
		}
	}

	return bestValue
}
