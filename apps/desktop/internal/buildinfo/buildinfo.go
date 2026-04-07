package buildinfo

// These values are overridden at build/release time via -ldflags.
var (
	DesktopVersion   = "1.0.0-dev"
	BuildChannel     = "dev"
	GitCommit        = "unknown"
	BuildDate        = "unknown"
	RepositoryURL    = "https://github.com/michaelnji/kairos"
	UpdateRepository = "michaelnji/kairos"
)
