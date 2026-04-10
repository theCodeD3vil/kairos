package storage

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

type PersistResult struct {
	EventOutcomes  []EventPersistOutcome
	InsertedEvents []contracts.ActivityEvent
	Warnings       []string
}

type EventPersistOutcome struct {
	Event    contracts.ActivityEvent
	Inserted bool
}

func (s *Store) PersistIngestionBatch(
	ctx context.Context,
	machine contracts.MachineInfo,
	extensionStatus contracts.ExtensionStatus,
	events []contracts.ActivityEvent,
	ingestedAt string,
) (PersistResult, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return PersistResult{}, fmt.Errorf("begin ingestion transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	eventOutcomes, warnings, err := insertEventsTx(ctx, tx, events, ingestedAt)
	if err != nil {
		return PersistResult{}, err
	}
	insertedEvents := insertedEventsFromOutcomes(eventOutcomes)
	if err := upsertMachineTx(ctx, tx, machine, ingestedAt); err != nil {
		return PersistResult{}, err
	}
	if err := upsertExtensionStatusTx(ctx, tx, extensionStatus, ingestedAt); err != nil {
		return PersistResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return PersistResult{}, fmt.Errorf("commit ingestion transaction: %w", err)
	}

	return PersistResult{
		EventOutcomes:  eventOutcomes,
		InsertedEvents: insertedEvents,
		Warnings:       warnings,
	}, nil
}

func (s *Store) PersistEmptyIngestionHeartbeat(
	ctx context.Context,
	machine contracts.MachineInfo,
	extensionStatus contracts.ExtensionStatus,
	recordedAt string,
) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin empty ingestion transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if err := upsertMachineTx(ctx, tx, machine, recordedAt); err != nil {
		return err
	}
	if err := upsertExtensionStatusTx(ctx, tx, extensionStatus, recordedAt); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit empty ingestion transaction: %w", err)
	}

	return nil
}

func insertEventsTx(ctx context.Context, tx *sql.Tx, events []contracts.ActivityEvent, ingestedAt string) ([]EventPersistOutcome, []string, error) {
	if len(events) == 0 {
		return nil, nil, nil
	}

	stmt, err := tx.PrepareContext(ctx, `
		INSERT OR IGNORE INTO events (
			id, timestamp, event_type, machine_id, workspace_id, project_name, language, file_path, git_branch, ingested_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return nil, nil, fmt.Errorf("prepare insert events: %w", err)
	}
	defer stmt.Close()

	outcomes := make([]EventPersistOutcome, 0, len(events))
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
			outcomes = append(outcomes, EventPersistOutcome{
				Event:    event,
				Inserted: false,
			})
			warnings = append(warnings, fmt.Sprintf("duplicate event id %q ignored", event.ID))
			continue
		}

		outcomes = append(outcomes, EventPersistOutcome{
			Event:    event,
			Inserted: true,
		})
	}

	return outcomes, warnings, nil
}

func upsertMachineTx(ctx context.Context, tx *sql.Tx, machine contracts.MachineInfo, lastSeenAt string) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO machines (
			machine_id, machine_name, hostname, os_platform, os_version, arch, last_seen_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(machine_id) DO UPDATE SET
			machine_name = CASE
				WHEN excluded.machine_name <> '' THEN excluded.machine_name
				ELSE machines.machine_name
			END,
			hostname = CASE
				WHEN excluded.hostname IS NOT NULL AND excluded.hostname <> '' THEN excluded.hostname
				ELSE machines.hostname
			END,
			os_platform = CASE
				WHEN excluded.os_platform <> '' THEN excluded.os_platform
				ELSE machines.os_platform
			END,
			os_version = CASE
				WHEN excluded.os_version IS NOT NULL AND excluded.os_version <> '' THEN excluded.os_version
				ELSE machines.os_version
			END,
			arch = CASE
				WHEN excluded.arch IS NOT NULL AND excluded.arch <> '' THEN excluded.arch
				ELSE machines.arch
			END,
			last_seen_at = excluded.last_seen_at,
			updated_at = excluded.updated_at
	`,
		machine.MachineID,
		machine.MachineName,
		nullIfEmpty(machine.Hostname),
		machine.OSPlatform,
		nullIfEmpty(machine.OSVersion),
		nullIfEmpty(machine.Arch),
		lastSeenAt,
		lastSeenAt,
	)
	if err != nil {
		return fmt.Errorf("upsert machine %s: %w", machine.MachineID, err)
	}

	return nil
}

func insertedEventsFromOutcomes(outcomes []EventPersistOutcome) []contracts.ActivityEvent {
	inserted := make([]contracts.ActivityEvent, 0, len(outcomes))
	for _, outcome := range outcomes {
		if !outcome.Inserted {
			continue
		}
		inserted = append(inserted, outcome.Event)
	}

	return inserted
}

func upsertExtensionStatusTx(ctx context.Context, tx *sql.Tx, status contracts.ExtensionStatus, updatedAt string) error {
	_, err := tx.ExecContext(ctx, `
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
