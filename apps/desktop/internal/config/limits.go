package config

const (
	MaxRequestBodyBytes      = 1 << 20
	MaxEventsPerBatch        = 500
	DefaultRecentEventsLimit = 20
	MaxRecentEventsLimit     = 200

	MaxEventIDLength          = 128
	MaxEventTypeLength        = 24
	MaxMachineIDLength        = 128
	MaxWorkspaceIDLength      = 256
	MaxProjectNameLength      = 256
	MaxLanguageLength         = 64
	MaxFilePathLength         = 1024
	MaxGitBranchLength        = 256
	MaxMachineNameLength      = 128
	MaxHostnameLength         = 255
	MaxOSPlatformLength       = 32
	MaxOSVersionLength        = 128
	MaxArchLength             = 64
	MaxEditorLength           = 32
	MaxEditorVersionLength    = 64
	MaxExtensionVersionLength = 64
)

func ClampRecentEventsLimit(limit int) int {
	if limit <= 0 {
		return DefaultRecentEventsLimit
	}
	if limit > MaxRecentEventsLimit {
		return MaxRecentEventsLimit
	}

	return limit
}
