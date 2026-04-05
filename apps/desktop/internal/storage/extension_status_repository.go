package storage

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func (s *Store) UpsertExtensionStatus(ctx context.Context, status contracts.ExtensionStatus, updatedAt string) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO extension_status (
			editor, connected, extension_version, last_event_at, last_handshake_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(editor) DO UPDATE SET
			connected = excluded.connected,
			extension_version = excluded.extension_version,
			last_event_at = excluded.last_event_at,
			last_handshake_at = excluded.last_handshake_at,
			updated_at = excluded.updated_at
	`,
		status.Editor,
		boolToInt(status.Connected),
		nullIfEmpty(status.ExtensionVersion),
		nullIfEmpty(status.LastEventAt),
		nullIfEmpty(status.LastHandshakeAt),
		updatedAt,
	)
	if err != nil {
		return fmt.Errorf("upsert extension status for %s: %w", status.Editor, err)
	}

	return nil
}

func (s *Store) GetExtensionStatus(ctx context.Context, editor string) (contracts.ExtensionStatus, error) {
	var status contracts.ExtensionStatus
	var connected int
	var extensionVersion sql.NullString
	var lastEventAt sql.NullString
	var lastHandshakeAt sql.NullString

	err := s.db.QueryRowContext(ctx, `
		SELECT editor, connected, extension_version, last_event_at, last_handshake_at
		FROM extension_status
		WHERE editor = ?
	`, editor).Scan(
		&status.Editor,
		&connected,
		&extensionVersion,
		&lastEventAt,
		&lastHandshakeAt,
	)
	if err == sql.ErrNoRows {
		return contracts.ExtensionStatus{
			Installed: false,
			Connected: false,
			Editor:    editor,
		}, nil
	}
	if err != nil {
		return contracts.ExtensionStatus{}, fmt.Errorf("get extension status for %s: %w", editor, err)
	}

	status.Installed = true
	status.Connected = connected == 1
	if extensionVersion.Valid {
		status.ExtensionVersion = extensionVersion.String
	}
	if lastEventAt.Valid {
		status.LastEventAt = lastEventAt.String
	}
	if lastHandshakeAt.Valid {
		status.LastHandshakeAt = lastHandshakeAt.String
	}

	return status, nil
}
