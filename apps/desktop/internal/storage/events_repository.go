package storage

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func (s *Store) InsertEvents(ctx context.Context, events []contracts.ActivityEvent, ingestedAt string) ([]contracts.ActivityEvent, []string, error) {
	if len(events) == 0 {
		return nil, nil, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, fmt.Errorf("begin insert events tx: %w", err)
	}

	defer func() {
		_ = tx.Rollback()
	}()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT OR IGNORE INTO events (
			id, timestamp, event_type, machine_id, workspace_id, project_name, language, file_path, git_branch, ingested_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare insert events: %w", err)
	}
	defer stmt.Close()

	inserted := make([]contracts.ActivityEvent, 0, len(events))
	warnings := make([]string, 0)
	for _, event := range events {
		result, err := stmt.ExecContext(
			ctx,
			event.ID,
			event.Timestamp,
			event.EventType,
			event.MachineID,
			event.WorkspaceID,
			event.ProjectName,
			event.Language,
			nullIfEmpty(event.FilePath),
			nullIfEmpty(event.GitBranch),
			ingestedAt,
		)
		if err != nil {
			return nil, nil, fmt.Errorf("insert event %s: %w", event.ID, err)
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return nil, nil, fmt.Errorf("read rows affected for event %s: %w", event.ID, err)
		}
		if rowsAffected == 0 {
			warnings = append(warnings, fmt.Sprintf("duplicate event id %q ignored", event.ID))
			continue
		}

		inserted = append(inserted, event)
	}

	if err := tx.Commit(); err != nil {
		return nil, nil, fmt.Errorf("commit insert events: %w", err)
	}

	return inserted, warnings, nil
}

func (s *Store) ListRecentEvents(ctx context.Context, limit int) ([]contracts.ActivityEvent, error) {
	if limit <= 0 {
		limit = 20
	}

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

func (s *Store) GetLastIngestedAt(ctx context.Context) (string, error) {
	return nullableStringQuery(ctx, s.db, `SELECT MAX(ingested_at) FROM events`)
}
