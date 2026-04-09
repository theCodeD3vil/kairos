package storage

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

const desktopMetadataInstanceIDKey = "instance_id"

func (s *Store) GetOrCreateDesktopInstanceID(ctx context.Context) (string, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("begin desktop metadata transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback()
	}()

	createdAt := time.Now().UTC().Format(time.RFC3339)
	candidateID := uuid.NewString()
	if _, err := tx.ExecContext(ctx, `
		INSERT OR IGNORE INTO desktop_metadata (key, value, updated_at)
		VALUES (?, ?, ?)
	`, desktopMetadataInstanceIDKey, candidateID, createdAt); err != nil {
		return "", fmt.Errorf("insert desktop metadata %s: %w", desktopMetadataInstanceIDKey, err)
	}

	var instanceID string
	if err := tx.QueryRowContext(ctx, `
		SELECT value
		FROM desktop_metadata
		WHERE key = ?
	`, desktopMetadataInstanceIDKey).Scan(&instanceID); err != nil {
		if err == sql.ErrNoRows {
			return "", fmt.Errorf("desktop metadata %s missing after upsert", desktopMetadataInstanceIDKey)
		}
		return "", fmt.Errorf("read desktop metadata %s: %w", desktopMetadataInstanceIDKey, err)
	}

	if err := tx.Commit(); err != nil {
		return "", fmt.Errorf("commit desktop metadata transaction: %w", err)
	}

	return instanceID, nil
}
