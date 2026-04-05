package storage

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

func (s *Store) UpsertMachine(ctx context.Context, machine contracts.MachineInfo, lastSeenAt string) error {
	_, err := s.db.ExecContext(ctx, `
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

func (s *Store) ListKnownMachines(ctx context.Context) ([]contracts.MachineInfo, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT machine_id, machine_name, hostname, os_platform, os_version, arch
		FROM machines
		ORDER BY machine_id ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list known machines: %w", err)
	}
	defer rows.Close()

	machines := make([]contracts.MachineInfo, 0)
	for rows.Next() {
		var machine contracts.MachineInfo
		var hostname sql.NullString
		var osVersion sql.NullString
		var arch sql.NullString
		if err := rows.Scan(
			&machine.MachineID,
			&machine.MachineName,
			&hostname,
			&machine.OSPlatform,
			&osVersion,
			&arch,
		); err != nil {
			return nil, fmt.Errorf("scan machine: %w", err)
		}
		if hostname.Valid {
			machine.Hostname = hostname.String
		}
		if osVersion.Valid {
			machine.OSVersion = osVersion.String
		}
		if arch.Valid {
			machine.Arch = arch.String
		}
		machines = append(machines, machine)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate machines: %w", err)
	}

	return machines, nil
}

func (s *Store) GetMachine(ctx context.Context, machineID string) (contracts.MachineInfo, bool, error) {
	var machine contracts.MachineInfo
	var hostname sql.NullString
	var osVersion sql.NullString
	var arch sql.NullString
	err := s.db.QueryRowContext(ctx, `
		SELECT machine_id, machine_name, hostname, os_platform, os_version, arch
		FROM machines
		WHERE machine_id = ?
	`, machineID).Scan(
		&machine.MachineID,
		&machine.MachineName,
		&hostname,
		&machine.OSPlatform,
		&osVersion,
		&arch,
	)
	if err == sql.ErrNoRows {
		return contracts.MachineInfo{}, false, nil
	}
	if err != nil {
		return contracts.MachineInfo{}, false, fmt.Errorf("get machine %s: %w", machineID, err)
	}
	if hostname.Valid {
		machine.Hostname = hostname.String
	}
	if osVersion.Valid {
		machine.OSVersion = osVersion.String
	}
	if arch.Valid {
		machine.Arch = arch.String
	}

	return machine, true, nil
}

func (s *Store) CountKnownMachines(ctx context.Context) (int, error) {
	return countQuery(ctx, s.db, `SELECT COUNT(*) FROM machines`)
}

func (s *Store) GetLastSeenMachineID(ctx context.Context) (string, error) {
	return nullableStringQuery(ctx, s.db, `
		SELECT machine_id
		FROM machines
		ORDER BY last_seen_at DESC, machine_id DESC
		LIMIT 1
	`)
}
