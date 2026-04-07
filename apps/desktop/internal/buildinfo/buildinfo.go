package buildinfo

// These values are overridden at build/release time via -ldflags.
var (
	DesktopVersion   = "0.1.1-dev"
	BuildChannel     = "dev"
	GitCommit        = "unknown"
	BuildDate        = "unknown"
	RepositoryURL    = "https://github.com/michaelnji/kairos"
	UpdateRepository = "michaelnji/kairos"
)
