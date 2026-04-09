package contracts

type ActivityEvent struct {
	ID          string `json:"id"`
	Timestamp   string `json:"timestamp"`
	EventType   string `json:"eventType"`
	MachineID   string `json:"machineId"`
	WorkspaceID string `json:"workspaceId"`
	ProjectName string `json:"projectName"`
	Language    string `json:"language"`
	FilePath    string `json:"filePath,omitempty"`
	GitBranch   string `json:"gitBranch,omitempty"`
}

type MachineInfo struct {
	MachineID   string `json:"machineId"`
	MachineName string `json:"machineName"`
	Hostname    string `json:"hostname,omitempty"`
	OSPlatform  string `json:"osPlatform"`
	OSVersion   string `json:"osVersion,omitempty"`
	Arch        string `json:"arch,omitempty"`
}

type ExtensionInfo struct {
	Editor           string `json:"editor"`
	EditorVersion    string `json:"editorVersion,omitempty"`
	ExtensionVersion string `json:"extensionVersion,omitempty"`
}

type IngestEventsRequest struct {
	Machine   MachineInfo     `json:"machine"`
	Extension ExtensionInfo   `json:"extension"`
	Events    []ActivityEvent `json:"events"`
}

type IngestEventsResponse struct {
	AcceptedCount   int                 `json:"acceptedCount"`
	RejectedCount   int                 `json:"rejectedCount"`
	Warnings        []string            `json:"warnings,omitempty"`
	Results         []IngestEventResult `json:"results"`
	ServerTimestamp string              `json:"serverTimestamp"`
}

type IngestEventStatus string

const (
	IngestEventStatusAccepted          IngestEventStatus = "accepted"
	IngestEventStatusDuplicate         IngestEventStatus = "duplicate"
	IngestEventStatusRejectedTemporary IngestEventStatus = "rejected_temporary"
	IngestEventStatusRejectedPermanent IngestEventStatus = "rejected_permanent"
)

type IngestEventResult struct {
	EventID string            `json:"eventId"`
	Status  IngestEventStatus `json:"status"`
	Code    string            `json:"code"`
	Message string            `json:"message,omitempty"`
}

type IngestionStats struct {
	TotalAcceptedEvents int    `json:"totalAcceptedEvents"`
	TotalRejectedEvents int    `json:"totalRejectedEvents"`
	KnownMachineCount   int    `json:"knownMachineCount"`
	LastIngestedAt      string `json:"lastIngestedAt,omitempty"`
	LastEventAt         string `json:"lastEventAt,omitempty"`
	LastMachineSeen     string `json:"lastMachineSeen,omitempty"`
}
