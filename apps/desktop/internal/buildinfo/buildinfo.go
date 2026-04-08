package buildinfo

// These values are overridden at build/release time via -ldflags.
var (
	DesktopVersion   = "1.0.5-dev"
	BuildChannel     = "dev"
	GitCommit        = "unknown"
	BuildDate        = "unknown"
	RepositoryURL    = "https://github.com/theCodeD3vil/kairos"
	UpdateRepository = "theCodeD3vil/kairos"
)
