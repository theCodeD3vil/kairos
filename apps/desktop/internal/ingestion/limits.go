package ingestion

import (
	"fmt"

	"github.com/michaelnji/kairos/apps/desktop/internal/config"
)

func trimAndClampOptional(value string, max int) (string, bool) {
	if len(value) <= max {
		return value, false
	}

	return value[:max], true
}

func validateRequiredLength(name, value string, max int) error {
	if len(value) > max {
		return fmt.Errorf("%s exceeds max length %d", name, max)
	}

	return nil
}

func clampRecentEventsLimit(limit int) int {
	return config.ClampRecentEventsLimit(limit)
}
