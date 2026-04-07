package contracts

type GeneralSettings struct {
	MachineDisplayName   string `json:"machineDisplayName"`
	DefaultDateRange     string `json:"defaultDateRange"`
	TimeFormat           string `json:"timeFormat"`
	WeekStartsOn         string `json:"weekStartsOn"`
	PreferredLandingPage string `json:"preferredLandingPage"`
}

type PrivacySettings struct {
	LocalOnlyMode             bool     `json:"localOnlyMode"`
	FilePathMode              string   `json:"filePathMode"`
	ShowMachineNames          bool     `json:"showMachineNames"`
	ShowHostname              bool     `json:"showHostname"`
	ObfuscateProjectNames     bool     `json:"obfuscateProjectNames"`
	SensitiveProjectNames     []string `json:"sensitiveProjectNames"`
	MinimizeExtensionMetadata bool     `json:"minimizeExtensionMetadata"`
}

type TrackingSettings struct {
	TrackingEnabled              bool `json:"trackingEnabled"`
	IdleDetectionEnabled         bool `json:"idleDetectionEnabled"`
	TrackProjectActivity         bool `json:"trackProjectActivity"`
	TrackLanguageActivity        bool `json:"trackLanguageActivity"`
	TrackMachineAttribution      bool `json:"trackMachineAttribution"`
	TrackSessionBoundaries       bool `json:"trackSessionBoundaries"`
	IdleTimeoutMinutes           int  `json:"idleTimeoutMinutes"`
	SessionMergeThresholdMinutes int  `json:"sessionMergeThresholdMinutes"`
}

type ExclusionsSettings struct {
	Folders           []string `json:"folders"`
	ProjectNames      []string `json:"projectNames"`
	WorkspacePatterns []string `json:"workspacePatterns"`
	FileExtensions    []string `json:"fileExtensions"`
	Machines          []string `json:"machines"`
}

type ExtensionSettings struct {
	AutoConnect                  bool `json:"autoConnect"`
	SendHeartbeatEvents          bool `json:"sendHeartbeatEvents"`
	HeartbeatIntervalSeconds     int  `json:"heartbeatIntervalSeconds"`
	SendProjectMetadata          bool `json:"sendProjectMetadata"`
	SendLanguageMetadata         bool `json:"sendLanguageMetadata"`
	SendMachineAttribution       bool `json:"sendMachineAttribution"`
	RespectDesktopExclusions     bool `json:"respectDesktopExclusions"`
	BufferEventsWhenOffline      bool `json:"bufferEventsWhenOffline"`
	RetryConnectionAutomatically bool `json:"retryConnectionAutomatically"`
	TrackOnlyWhenFocused         bool `json:"trackOnlyWhenFocused"`
	TrackFileOpenEvents          bool `json:"trackFileOpenEvents"`
	TrackSaveEvents              bool `json:"trackSaveEvents"`
	TrackEditEvents              bool `json:"trackEditEvents"`
}

type ExtensionEffectiveSettings struct {
	TrackingEnabled              bool               `json:"trackingEnabled"`
	IdleDetectionEnabled         bool               `json:"idleDetectionEnabled"`
	IdleTimeoutMinutes           int                `json:"idleTimeoutMinutes"`
	SessionMergeThresholdMinutes int                `json:"sessionMergeThresholdMinutes"`
	LocalOnlyMode                bool               `json:"localOnlyMode"`
	FilePathMode                 string             `json:"filePathMode"`
	Exclusions                   ExclusionsSettings `json:"exclusions"`
	AutoConnect                  bool               `json:"autoConnect"`
	SendHeartbeatEvents          bool               `json:"sendHeartbeatEvents"`
	HeartbeatIntervalSeconds     int                `json:"heartbeatIntervalSeconds"`
	SendProjectMetadata          bool               `json:"sendProjectMetadata"`
	SendLanguageMetadata         bool               `json:"sendLanguageMetadata"`
	SendMachineAttribution       bool               `json:"sendMachineAttribution"`
	RespectDesktopExclusions     bool               `json:"respectDesktopExclusions"`
	BufferEventsWhenOffline      bool               `json:"bufferEventsWhenOffline"`
	RetryConnectionAutomatically bool               `json:"retryConnectionAutomatically"`
	TrackOnlyWhenFocused         bool               `json:"trackOnlyWhenFocused"`
	TrackFileOpenEvents          bool               `json:"trackFileOpenEvents"`
	TrackSaveEvents              bool               `json:"trackSaveEvents"`
	TrackEditEvents              bool               `json:"trackEditEvents"`
}

type ExtensionHandshakeRequest struct {
	Machine   MachineInfo   `json:"machine"`
	Extension ExtensionInfo `json:"extension"`
}

type ExtensionHandshakeResponse struct {
	Settings        ExtensionEffectiveSettings `json:"settings"`
	ServerTimestamp string                     `json:"serverTimestamp"`
}

type ExtensionStatus struct {
	Installed        bool   `json:"installed"`
	Connected        bool   `json:"connected"`
	Editor           string `json:"editor"`
	ExtensionVersion string `json:"extensionVersion,omitempty"`
	LastEventAt      string `json:"lastEventAt,omitempty"`
	LastHandshakeAt  string `json:"lastHandshakeAt,omitempty"`
}

type SystemInfo struct {
	MachineID        string `json:"machineId"`
	MachineName      string `json:"machineName"`
	Hostname         string `json:"hostname,omitempty"`
	OSPlatform       string `json:"osPlatform"`
	OSVersion        string `json:"osVersion,omitempty"`
	Arch             string `json:"arch,omitempty"`
	Editor           string `json:"editor"`
	EditorVersion    string `json:"editorVersion,omitempty"`
	AppVersion       string `json:"appVersion,omitempty"`
	ExtensionVersion string `json:"extensionVersion,omitempty"`
	LastSeenAt       string `json:"lastSeenAt,omitempty"`
}

type AppBehaviorSettings struct {
	LaunchOnStartup      bool `json:"launchOnStartup"`
	StartMinimized       bool `json:"startMinimized"`
	MinimizeToTray       bool `json:"minimizeToTray"`
	OpenOnSystemLogin    bool `json:"openOnSystemLogin"`
	RememberLastPage     bool `json:"rememberLastPage"`
	RestoreLastDateRange bool `json:"restoreLastDateRange"`
}

type DataStorageInfo struct {
	LocalDataPath     string `json:"localDataPath"`
	DatabaseStatus    string `json:"databaseStatus"`
	LastProcessedAt   string `json:"lastProcessedAt,omitempty"`
	PendingEventCount *int   `json:"pendingEventCount,omitempty"`
}

type AboutInfo struct {
	AppName          string `json:"appName"`
	AppVersion       string `json:"appVersion"`
	Environment      string `json:"environment"`
	BuildChannel     string `json:"buildChannel"`
	DesktopVersion   string `json:"desktopVersion"`
	ExtensionVersion string `json:"extensionVersion,omitempty"`
	LicenseSummary   string `json:"licenseSummary"`
	RepositoryURL    string `json:"repositoryUrl,omitempty"`
}

type SettingsData struct {
	General         GeneralSettings     `json:"general"`
	Privacy         PrivacySettings     `json:"privacy"`
	Tracking        TrackingSettings    `json:"tracking"`
	Exclusions      ExclusionsSettings  `json:"exclusions"`
	Extension       ExtensionSettings   `json:"extension"`
	ExtensionStatus ExtensionStatus     `json:"extensionStatus"`
	System          SystemInfo          `json:"system"`
	AppBehavior     AppBehaviorSettings `json:"appBehavior"`
	DataStorage     DataStorageInfo     `json:"dataStorage"`
	About           AboutInfo           `json:"about"`
}
