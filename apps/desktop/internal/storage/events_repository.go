package storage

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func (s *Store) InsertEvents(ctx context.Context, events []contracts.ActivityEvent, ingestedAt string) ([]contracts.ActivityEvent, []string, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("begin insert events tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	outcomes, warnings, err := insertEventsTx(ctx, tx, events, ingestedAt)
	if err != nil {
		return nil, nil, err
	}
	inserted := insertedEventsFromOutcomes(outcomes)

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("commit insert events: %w", err)
	}

	return inserted, warnings, nil
}

func (s *Store) ListRecentEvents(ctx context.Context, limit int) ([]contracts.ActivityEvent, error) {
	limit = config.ClampRecentEventsLimit(limit)

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, timestamp, event_type, machine_id, workspace_id, project_name, language, file_path, git_branch
		FROM events
		ORDER BY timestamp DESC, id DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("list recent events: %w", err)
	}
	defer rows.Close()

	events := make([]contracts.ActivityEvent, 0, limit)
	for rows.Next() {
		var event contracts.ActivityEvent
		var filePath sql.NullString
		var gitBranch sql.NullString
		if err := rows.Scan(
			&event.ID,
			&event.Timestamp,
			&event.EventType,
			&event.MachineID,
			&event.WorkspaceID,
			&event.ProjectName,
			&event.Language,
			&filePath,
			&gitBranch,
		); err != nil {
			return nil, fmt.Errorf("scan recent event: %w", err)
		}
		if filePath.Valid {
			event.FilePath = filePath.String
		}
		if gitBranch.Valid {
			event.GitBranch = gitBranch.String
		}
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent events: %w", err)
	}

	return events, nil
}

func (s *Store) GetEvent(ctx context.Context, eventID string) (contracts.ActivityEvent, bool, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT id, timestamp, event_type, machine_id, workspace_id, project_name, language, file_path, git_branch
		FROM events
		WHERE id = ?
	`, eventID)

	var event contracts.ActivityEvent
	var filePath sql.NullString
	var gitBranch sql.NullString
	if err := row.Scan(
		&event.ID,
		&event.Timestamp,
		&event.EventType,
		&event.MachineID,
		&event.WorkspaceID,
		&event.ProjectName,
		&event.Language,
		&filePath,
		&gitBranch,
	); err != nil {
		if err == sql.ErrNoRows {
			return contracts.ActivityEvent{}, false, nil
		}
		return contracts.ActivityEvent{}, false, fmt.Errorf("get event %s: %w", eventID, err)
	}
	if filePath.Valid {
		event.FilePath = filePath.String
	}
	if gitBranch.Valid {
		event.GitBranch = gitBranch.String
	}

	return event, true, nil
}

func (s *Store) CountAcceptedEvents(ctx context.Context) (int, error) {
	return countQuery(ctx, s.db, `SELECT COUNT(*) FROM events`)
}

func (s *Store) GetLastEventTimestamp(ctx context.Context) (string, error) {
	return nullableStringQuery(ctx, s.db, `SELECT MAX(timestamp) FROM events`)
}

func (s *Store) GetFirstEventTimestamp(ctx context.Context) (string, error) {
	return nullableStringQuery(ctx, s.db, `SELECT MIN(timestamp) FROM events`)
}

func (s *Store) GetLastIngestedAt(ctx context.Context) (string, error) {
	return nullableStringQuery(ctx, s.db, `SELECT MAX(ingested_at) FROM events`)
}

func (s *Store) GetRecentSyncLatencySamples(ctx context.Context, limit int) ([]int, error) {
	if limit <= 0 {
		limit = 500
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT CAST(strftime('%s', ingested_at) AS INTEGER) - CAST(strftime('%s', timestamp) AS INTEGER) AS latency_seconds
		FROM events
		WHERE ingested_at IS NOT NULL AND timestamp IS NOT NULL
		ORDER BY ingested_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("query sync latency samples: %w", err)
	}
	defer rows.Close()

	samples := make([]int, 0)
	for rows.Next() {
		var seconds int
		if err := rows.Scan(&seconds); err != nil {
			return nil, fmt.Errorf("scan sync latency sample: %w", err)
		}
		if seconds < 0 {
			seconds = 0
		}
		samples = append(samples, seconds)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sync latency samples: %w", err)
	}
	return samples, nil
}

func (s *Store) GetAcceptedEventDailyTrend(ctx context.Context, startDate string, endDate string) (map[string]int, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT substr(ingested_at, 1, 10) AS ingestion_date, COUNT(*) AS accepted_count
		FROM events
		WHERE ingested_at IS NOT NULL
			AND substr(ingested_at, 1, 10) >= ?
			AND substr(ingested_at, 1, 10) <= ?
		GROUP BY ingestion_date
	`, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("query accepted event trend: %w", err)
	}
	defer rows.Close()

	out := make(map[string]int)
	for rows.Next() {
		var date string
		var count int
		if err := rows.Scan(&date, &count); err != nil {
			return nil, fmt.Errorf("scan accepted event trend: %w", err)
		}
		out[date] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate accepted event trend: %w", err)
	}
	return out, nil
}

func (s *Store) ListEventsForDateRange(ctx context.Context, startDate string, endDate string) ([]contracts.ActivityEvent, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, timestamp, event_type, machine_id, workspace_id, project_name, language, file_path, git_branch
		FROM events
		WHERE substr(timestamp, 1, 10) >= ? AND substr(timestamp, 1, 10) <= ?
		ORDER BY machine_id ASC, timestamp ASC, id ASC
	`, startDate, endDate)
	if err != nil {
		return nil, fmt.Errorf("list events for date range: %w", err)
	}
	defer rows.Close()

	events := make([]contracts.ActivityEvent, 0)
	for rows.Next() {
		var event contracts.ActivityEvent
		var filePath sql.NullString
		var gitBranch sql.NullString
		if err := rows.Scan(
			&event.ID,
			&event.Timestamp,
			&event.EventType,
			&event.MachineID,
			&event.WorkspaceID,
			&event.ProjectName,
			&event.Language,
			&filePath,
			&gitBranch,
		); err != nil {
			return nil, fmt.Errorf("scan ranged event: %w", err)
		}
		if filePath.Valid {
			event.FilePath = filePath.String
		}
		if gitBranch.Valid {
			event.GitBranch = gitBranch.String
		}
		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate ranged events: %w", err)
	}

	return events, nil
}

func (s *Store) CountEventsForDateRange(ctx context.Context, startDate string, endDate string) (int, error) {
	return countQueryWithArgs(ctx, s.db, `
		SELECT COUNT(*)
		FROM events
		WHERE substr(timestamp, 1, 10) >= ? AND substr(timestamp, 1, 10) <= ?
	`, startDate, endDate)
}
