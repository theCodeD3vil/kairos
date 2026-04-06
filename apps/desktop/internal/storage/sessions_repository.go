package storage

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func (s *Store) InsertSession(ctx context.Context, session contracts.Session, recordedAt string) error {
	return s.InsertSessions(ctx, []contracts.Session{session}, recordedAt)
}

func (s *Store) InsertSessions(ctx context.Context, sessions []contracts.Session, recordedAt string) error {
	if len(sessions) == 0 {
		return nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin insert sessions tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if err := insertSessionsTx(ctx, tx, sessions, recordedAt); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit insert sessions tx: %w", err)
	}

	return nil
}

func (s *Store) ReplaceSessionsInDateRange(ctx context.Context, startDate string, endDate string, sessions []contracts.Session, recordedAt string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin replace sessions tx: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM sessions
		WHERE date >= ? AND date <= ?
	`, startDate, endDate); err != nil {
		return fmt.Errorf("delete sessions in date range: %w", err)
	}

	if err := insertSessionsTx(ctx, tx, sessions, recordedAt); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit replace sessions tx: %w", err)
	}

	return nil
}

func insertSessionsTx(ctx context.Context, tx *sql.Tx, sessions []contracts.Session, recordedAt string) error {
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO sessions (
			id, date, start_time, end_time, duration_minutes, machine_id, project_name, language, source_event_count, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return fmt.Errorf("prepare insert sessions: %w", err)
	}
	defer stmt.Close()

	for _, session := range sessions {
		if _, err := stmt.ExecContext(
			ctx,
			session.ID,
			session.Date,
			session.StartTime,
			session.EndTime,
			session.DurationMinutes,
			session.MachineID,
			session.ProjectName,
			session.Language,
			session.SourceEventCount,
			recordedAt,
			recordedAt,
		); err != nil {
			return fmt.Errorf("insert session %s: %w", session.ID, err)
		}
	}

	return nil
}

func (s *Store) DeleteAllSessions(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM sessions`)
	if err != nil {
		return fmt.Errorf("delete all sessions: %w", err)
	}

	return nil
}

func (s *Store) DeleteSessionsInDateRange(ctx context.Context, startDate string, endDate string) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM sessions
		WHERE date >= ? AND date <= ?
	`, startDate, endDate)
	if err != nil {
		return fmt.Errorf("delete sessions in date range: %w", err)
	}

	return nil
}

func (s *Store) ListSessionsForDate(ctx context.Context, date string) ([]contracts.Session, error) {
	return s.listSessions(ctx, `
		SELECT id, date, start_time, end_time, duration_minutes, machine_id, project_name, language, source_event_count
		FROM sessions
		WHERE date = ?
		ORDER BY start_time ASC, id ASC
	`, date)
}

func (s *Store) ListSessionsForRange(ctx context.Context, startDate string, endDate string) ([]contracts.Session, error) {
	return s.listSessions(ctx, `
		SELECT id, date, start_time, end_time, duration_minutes, machine_id, project_name, language, source_event_count
		FROM sessions
		WHERE date >= ? AND date <= ?
		ORDER BY start_time ASC, id ASC
	`, startDate, endDate)
}

func (s *Store) ListRecentSessions(ctx context.Context, limit int) ([]contracts.Session, error) {
	limit = config.ClampRecentEventsLimit(limit)

	return s.listSessions(ctx, `
		SELECT id, date, start_time, end_time, duration_minutes, machine_id, project_name, language, source_event_count
		FROM sessions
		ORDER BY start_time DESC, id DESC
		LIMIT ?
	`, limit)
}

func (s *Store) CountSessionsInRange(ctx context.Context, startDate string, endDate string) (int, error) {
	return countQueryWithArgs(ctx, s.db, `
		SELECT COUNT(*)
		FROM sessions
		WHERE date >= ? AND date <= ?
	`, startDate, endDate)
}

func (s *Store) GetLongestSessionMinutesInRange(ctx context.Context, startDate string, endDate string) (int, error) {
	return intQueryWithArgs(ctx, s.db, `
		SELECT COALESCE(MAX(duration_minutes), 0)
		FROM sessions
		WHERE date >= ? AND date <= ?
	`, startDate, endDate)
}

func (s *Store) GetAverageSessionMinutesInRange(ctx context.Context, startDate string, endDate string) (int, error) {
	return intQueryWithArgs(ctx, s.db, `
		SELECT COALESCE(CAST(ROUND(AVG(duration_minutes)) AS INTEGER), 0)
		FROM sessions
		WHERE date >= ? AND date <= ?
	`, startDate, endDate)
}

func (s *Store) GetSessionStatsForRange(ctx context.Context, startDate string, endDate string) (contracts.SessionStats, error) {
	totalSessions, err := s.CountSessionsInRange(ctx, startDate, endDate)
	if err != nil {
		return contracts.SessionStats{}, err
	}
	averageSessionMinutes, err := s.GetAverageSessionMinutesInRange(ctx, startDate, endDate)
	if err != nil {
		return contracts.SessionStats{}, err
	}
	longestSessionMinutes, err := s.GetLongestSessionMinutesInRange(ctx, startDate, endDate)
	if err != nil {
		return contracts.SessionStats{}, err
	}

	return contracts.SessionStats{
		TotalSessions:         totalSessions,
		AverageSessionMinutes: averageSessionMinutes,
		LongestSessionMinutes: longestSessionMinutes,
	}, nil
}

func (s *Store) listSessions(ctx context.Context, query string, args ...any) ([]contracts.Session, error) {
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	sessions := make([]contracts.Session, 0)
	for rows.Next() {
		var session contracts.Session
		if err := rows.Scan(
			&session.ID,
			&session.Date,
			&session.StartTime,
			&session.EndTime,
			&session.DurationMinutes,
			&session.MachineID,
			&session.ProjectName,
			&session.Language,
			&session.SourceEventCount,
		); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, session)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sessions: %w", err)
	}

	return sessions, nil
}
