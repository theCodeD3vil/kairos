package storage

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

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
	if shouldManageFilesystemPermissions(dbPath) {
		if err := os.MkdirAll(filepath.Dir(dbPath), 0o700); err != nil {
			return nil, fmt.Errorf("create db directory: %w", err)
		}
		if err := os.Chmod(filepath.Dir(dbPath), 0o700); err != nil {
			return nil, fmt.Errorf("secure db directory permissions: %w", err)
		}
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
	if err := store.tightenSQLiteFilePermissions(); err != nil {
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

func shouldManageFilesystemPermissions(dbPath string) bool {
	trimmed := strings.TrimSpace(dbPath)
	if trimmed == "" || trimmed == ":memory:" {
		return false
	}
	return !strings.HasPrefix(trimmed, "file:")
}

func (s *Store) tightenSQLiteFilePermissions() error {
	if s == nil || !shouldManageFilesystemPermissions(s.path) {
		return nil
	}

	if err := chmodIfPresent(s.path, 0o600); err != nil {
		return fmt.Errorf("secure sqlite file permissions: %w", err)
	}
	if err := chmodIfPresent(s.path+"-wal", 0o600); err != nil {
		return fmt.Errorf("secure sqlite wal file permissions: %w", err)
	}
	if err := chmodIfPresent(s.path+"-shm", 0o600); err != nil {
		return fmt.Errorf("secure sqlite shm file permissions: %w", err)
	}
	return nil
}

func chmodIfPresent(path string, mode os.FileMode) error {
	_, err := os.Stat(path)
	if os.IsNotExist(err) {
		return nil
	}
	if err != nil {
		return err
	}
	return os.Chmod(path, mode)
}

func (s *Store) Path() string {
	if s == nil {
		return ""
	}

	return s.path
}

func (s *Store) ClearLocalData(ctx context.Context) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin clear data tx: %w", err)
	}

	defer func() {
		_ = tx.Rollback()
	}()

	if _, err := tx.ExecContext(ctx, `DELETE FROM events;`); err != nil {
		return fmt.Errorf("delete events: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM sessions;`); err != nil {
		return fmt.Errorf("delete sessions: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit clear data tx: %w", err)
	}

	// Reclaim space natively after a clear
	if _, err := s.db.ExecContext(ctx, `VACUUM;`); err != nil {
		log.Printf("storage: vacuum after clear data failed (non-fatal): %v", err)
	}

	return nil
}
