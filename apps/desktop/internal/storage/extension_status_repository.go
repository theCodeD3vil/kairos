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
			editor, connected, extension_version, editor_version, last_event_at, last_handshake_at,
			pending_event_count, oldest_pending_event_at, quarantined_event_count, outbox_size_bytes,
			last_successful_sync_at, desktop_instance_seen, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(editor) DO UPDATE SET
			connected = excluded.connected,
			extension_version = COALESCE(excluded.extension_version, extension_status.extension_version),
			editor_version = COALESCE(excluded.editor_version, extension_status.editor_version),
			last_event_at = COALESCE(excluded.last_event_at, extension_status.last_event_at),
			last_handshake_at = COALESCE(excluded.last_handshake_at, extension_status.last_handshake_at),
			pending_event_count = COALESCE(excluded.pending_event_count, extension_status.pending_event_count),
			oldest_pending_event_at = COALESCE(excluded.oldest_pending_event_at, extension_status.oldest_pending_event_at),
			quarantined_event_count = COALESCE(excluded.quarantined_event_count, extension_status.quarantined_event_count),
			outbox_size_bytes = COALESCE(excluded.outbox_size_bytes, extension_status.outbox_size_bytes),
			last_successful_sync_at = COALESCE(excluded.last_successful_sync_at, extension_status.last_successful_sync_at),
			desktop_instance_seen = COALESCE(excluded.desktop_instance_seen, extension_status.desktop_instance_seen),
			updated_at = excluded.updated_at
	`,
		status.Editor,
		boolToInt(status.Connected),
		nullIfEmpty(status.ExtensionVersion),
		nullIfEmpty(status.EditorVersion),
		nullIfEmpty(status.LastEventAt),
		nullIfEmpty(status.LastHandshakeAt),
		nullIfNilInt(status.PendingEventCount),
		nullIfEmpty(status.OldestPendingEventAt),
		nullIfNilInt(status.QuarantinedEventCount),
		nullIfNilInt64(status.OutboxSizeBytes),
		nullIfEmpty(status.LastSuccessfulSyncAt),
		nullIfEmpty(status.DesktopInstanceSeen),
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
	var editorVersion sql.NullString
	var lastEventAt sql.NullString
	var lastHandshakeAt sql.NullString
	var pendingEventCount sql.NullInt64
	var oldestPendingEventAt sql.NullString
	var quarantinedEventCount sql.NullInt64
	var outboxSizeBytes sql.NullInt64
	var lastSuccessfulSyncAt sql.NullString
	var desktopInstanceSeen sql.NullString

	err := s.db.QueryRowContext(ctx, `
		SELECT
			editor, connected, extension_version, editor_version, last_event_at, last_handshake_at,
			pending_event_count, oldest_pending_event_at, quarantined_event_count, outbox_size_bytes,
			last_successful_sync_at, desktop_instance_seen
		FROM extension_status
		WHERE editor = ?
	`, editor).Scan(
		&status.Editor,
		&connected,
		&extensionVersion,
		&editorVersion,
		&lastEventAt,
		&lastHandshakeAt,
		&pendingEventCount,
		&oldestPendingEventAt,
		&quarantinedEventCount,
		&outboxSizeBytes,
		&lastSuccessfulSyncAt,
		&desktopInstanceSeen,
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
	if editorVersion.Valid {
		status.EditorVersion = editorVersion.String
	}
	if lastEventAt.Valid {
		status.LastEventAt = lastEventAt.String
	}
	if lastHandshakeAt.Valid {
		status.LastHandshakeAt = lastHandshakeAt.String
	}
	if pendingEventCount.Valid {
		value := int(pendingEventCount.Int64)
		status.PendingEventCount = &value
	}
	if oldestPendingEventAt.Valid {
		status.OldestPendingEventAt = oldestPendingEventAt.String
	}
	if quarantinedEventCount.Valid {
		value := int(quarantinedEventCount.Int64)
		status.QuarantinedEventCount = &value
	}
	if outboxSizeBytes.Valid {
		value := outboxSizeBytes.Int64
		status.OutboxSizeBytes = &value
	}
	if lastSuccessfulSyncAt.Valid {
		status.LastSuccessfulSyncAt = lastSuccessfulSyncAt.String
	}
	if desktopInstanceSeen.Valid {
		status.DesktopInstanceSeen = desktopInstanceSeen.String
	}

	return status, nil
}
