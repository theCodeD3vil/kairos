package storage

import (
	"context"
	"database/sql"
	"fmt"
)

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}

	return value
}

func boolToInt(value bool) int {
	if value {
		return 1
	}

	return 0
}

func countQuery(ctx context.Context, db *sql.DB, query string) (int, error) {
	var count int
	if err := db.QueryRowContext(ctx, query).Scan(&count); err != nil {
		return 0, fmt.Errorf("count query failed: %w", err)
	}

	return count, nil
}

func nullableStringQuery(ctx context.Context, db *sql.DB, query string) (string, error) {
	var value sql.NullString
	if err := db.QueryRowContext(ctx, query).Scan(&value); err != nil {
		return "", fmt.Errorf("string query failed: %w", err)
	}
	if !value.Valid {
		return "", nil
	}

	return value.String, nil
}
