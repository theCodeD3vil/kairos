package storage

import (
	"context"
	"database/sql"
	"fmt"
)

func (s *Store) GetSettingsSection(ctx context.Context, section string) (string, bool, error) {
	var payload string
	err := s.db.QueryRowContext(ctx, `
		SELECT payload
		FROM settings_sections
		WHERE section = ?
	`, section).Scan(&payload)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, fmt.Errorf("get settings section %s: %w", section, err)
	}

	return payload, true, nil
}

func (s *Store) SetSettingsSection(ctx context.Context, section string, payload string, updatedAt string) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO settings_sections (section, payload, updated_at)
		VALUES (?, ?, ?)
		ON CONFLICT(section) DO UPDATE SET
			payload = excluded.payload,
			updated_at = excluded.updated_at
	`, section, payload, updatedAt)
	if err != nil {
		return fmt.Errorf("set settings section %s: %w", section, err)
	}

	return nil
}

func (s *Store) DeleteSettingsSection(ctx context.Context, section string) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM settings_sections
		WHERE section = ?
	`, section)
	if err != nil {
		return fmt.Errorf("delete settings section %s: %w", section, err)
	}

	return nil
}

func (s *Store) ListSettingsSections(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT section
		FROM settings_sections
		ORDER BY section ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list settings sections: %w", err)
	}
	defer rows.Close()

	sections := make([]string, 0)
	for rows.Next() {
		var section string
		if err := rows.Scan(&section); err != nil {
			return nil, fmt.Errorf("scan settings section: %w", err)
		}
		sections = append(sections, section)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate settings sections: %w", err)
	}

	return sections, nil
}

func (s *Store) GetLatestSettingsUpdatedAt(ctx context.Context) (string, error) {
	return nullableStringQuery(ctx, s.db, `
		SELECT MAX(updated_at)
		FROM settings_sections
	`)
}
