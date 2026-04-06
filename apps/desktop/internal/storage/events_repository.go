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

	inserted, warnings, err := insertEventsTx(ctx, tx, events, ingestedAt)
	if err != nil {
		return nil, nil, err
	}

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
