package storage

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"io/fs"
	"log"
	"path"
	"sort"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

type MigrationStatus struct {
	CurrentVersion        string   `json:"currentVersion"`
	AppliedMigrationCount int      `json:"appliedMigrationCount"`
	PendingMigrationCount int      `json:"pendingMigrationCount"`
	AppliedVersions       []string `json:"appliedVersions"`
}

type migrationDefinition struct {
	Version string
	SQL     string
}

func (s *Store) RunMigrations(ctx context.Context) error {
	migrations, err := loadMigrations(migrationFiles)
	if err != nil {
		return err
	}

	return s.runMigrations(ctx, migrations)
}

func (s *Store) runMigrations(ctx context.Context, migrations []migrationDefinition) error {
	if _, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TEXT NOT NULL
		);
	`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	for _, migration := range migrations {
		applied, err := s.migrationApplied(ctx, migration.Version)
		if err != nil {
			return err
		}
		if applied {
			continue
		}

		log.Printf("storage: applying migration %s", migration.Version)
		if err := s.applyMigration(ctx, migration.Version, migration.SQL); err != nil {
			return err
		}
	}

	return nil
}

func (s *Store) migrationApplied(ctx context.Context, version string) (bool, error) {
	var exists int
	err := s.db.QueryRowContext(
		ctx,
		`SELECT 1 FROM schema_migrations WHERE version = ? LIMIT 1`,
		version,
	).Scan(&exists)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check migration %s: %w", version, err)
	}

	return true, nil
}

func (s *Store) applyMigration(ctx context.Context, version string, sqlText string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin migration %s: %w", version, err)
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(ctx, sqlText); err != nil {
		return fmt.Errorf("execute migration %s: %w", version, err)
	}

	if _, err := tx.ExecContext(
		ctx,
		`INSERT INTO schema_migrations(version, applied_at) VALUES (?, CURRENT_TIMESTAMP)`,
		version,
	); err != nil {
		return fmt.Errorf("record migration %s: %w", version, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit migration %s: %w", version, err)
	}

	log.Printf("storage: applied migration %s", version)

	return nil
}

func (s *Store) GetMigrationStatus(ctx context.Context) (MigrationStatus, error) {
	migrations, err := loadMigrations(migrationFiles)
	if err != nil {
		return MigrationStatus{}, err
	}

	rows, err := s.db.QueryContext(ctx, `SELECT version FROM schema_migrations ORDER BY version ASC`)
	if err != nil {
		return MigrationStatus{}, fmt.Errorf("query migration status: %w", err)
	}
	defer rows.Close()

	applied := make([]string, 0)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return MigrationStatus{}, fmt.Errorf("scan migration status: %w", err)
		}
		applied = append(applied, version)
	}
	if err := rows.Err(); err != nil {
		return MigrationStatus{}, fmt.Errorf("iterate migration status: %w", err)
	}

	current := ""
	if len(applied) > 0 {
		current = applied[len(applied)-1]
	}

	return MigrationStatus{
		CurrentVersion:        current,
		AppliedMigrationCount: len(applied),
		PendingMigrationCount: maxInt(len(migrations)-len(applied), 0),
		AppliedVersions:       applied,
	}, nil
}

func loadMigrations(migrationsFS fs.ReadFileFS) ([]migrationDefinition, error) {
	readDirFS, ok := migrationsFS.(fs.ReadDirFS)
	if !ok {
		return nil, fmt.Errorf("migration filesystem does not support directory reads")
	}

	entries, err := readDirFS.ReadDir("migrations")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	names := make([]string, 0, len(entries))
	for _, entry := range entries {
		if !entry.IsDir() {
			names = append(names, entry.Name())
		}
	}
	sort.Strings(names)

	migrations := make([]migrationDefinition, 0, len(names))
	for _, name := range names {
		contents, err := migrationsFS.ReadFile(path.Join("migrations", name))
		if err != nil {
			return nil, fmt.Errorf("read migration %s: %w", name, err)
		}
		migrations = append(migrations, migrationDefinition{
			Version: name,
			SQL:     string(contents),
		})
	}

	return migrations, nil
}

func maxInt(value int, minimum int) int {
	if value < minimum {
		return minimum
	}

	return value
}
