package storage

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

const defaultDatabaseFileName = "kairos.sqlite3"
const databasePathEnvVar = "KAIROS_DATABASE_PATH"

type Store struct {
	db   *sql.DB
	path string
}

func OpenDefault(ctx context.Context) (*Store, error) {
	dbPath, err := DefaultDatabasePath()
	if err != nil {
		return nil, err
	}

	return Open(ctx, dbPath)
}

func DefaultDatabasePath() (string, error) {
	if override := os.Getenv(databasePathEnvVar); override != "" {
		return override, nil
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve user config dir: %w", err)
	}

	return filepath.Join(configDir, "Kairos", defaultDatabaseFileName), nil
}

func Open(ctx context.Context, dbPath string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		return nil, fmt.Errorf("create db directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}

	if _, err := db.ExecContext(ctx, `PRAGMA foreign_keys = ON;`); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("enable foreign keys: %w", err)
	}

	if _, err := db.ExecContext(ctx, `PRAGMA journal_mode = WAL;`); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("enable WAL mode: %w", err)
	}
	if _, err := db.ExecContext(ctx, `PRAGMA busy_timeout = 5000;`); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("configure busy timeout: %w", err)
	}
	if _, err := db.ExecContext(ctx, `PRAGMA synchronous = NORMAL;`); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("configure synchronous mode: %w", err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	store := &Store{
		db:   db,
		path: dbPath,
	}

	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite database: %w", err)
	}

	if err := store.RunMigrations(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	log.Printf("storage: sqlite ready")

	return store, nil
}

func (s *Store) Close() error {
	if s == nil || s.db == nil {
		return nil
	}

	return s.db.Close()
}

func (s *Store) Path() string {
	if s == nil {
		return ""
	}

	return s.path
}
