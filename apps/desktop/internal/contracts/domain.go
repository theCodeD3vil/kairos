package contracts

type Session struct {
	ID              string `json:"id"`
	Date            string `json:"date"`
	StartTime       string `json:"startTime"`
	EndTime         string `json:"endTime"`
	DurationMinutes int    `json:"durationMinutes"`
	ProjectName     string `json:"projectName"`
	Language        string `json:"language"`
	MachineID       string `json:"machineId"`
	MachineName     string `json:"machineName,omitempty"`
	SourceEventCount int   `json:"sourceEventCount,omitempty"`
}

type SessionStats struct {
	TotalSessions         int `json:"totalSessions"`
	AverageSessionMinutes int `json:"averageSessionMinutes"`
	LongestSessionMinutes int `json:"longestSessionMinutes"`
}

type SessionRebuildResult struct {
	ProcessedEventCount int    `json:"processedEventCount"`
	CreatedSessionCount int    `json:"createdSessionCount"`
	StartDate           string `json:"startDate"`
	EndDate             string `json:"endDate"`
	RebuiltAt           string `json:"rebuiltAt"`
}

type DailySummary struct {
	Date                  string `json:"date"`
	TotalMinutes          int    `json:"totalMinutes"`
	SessionCount          int    `json:"sessionCount"`
	AverageSessionMinutes int    `json:"averageSessionMinutes"`
	LongestSessionMinutes int    `json:"longestSessionMinutes"`
	FirstActiveAt         string `json:"firstActiveAt,omitempty"`
	LastActiveAt          string `json:"lastActiveAt,omitempty"`
	TopProject            string `json:"topProject,omitempty"`
	TopLanguage           string `json:"topLanguage,omitempty"`
	MachineCount          int    `json:"machineCount"`
	HadActivity           bool   `json:"hadActivity"`
}

type ProjectSummary struct {
	ProjectName  string  `json:"projectName"`
	TotalMinutes int     `json:"totalMinutes"`
	SessionCount int     `json:"sessionCount"`
	ActiveDays   int     `json:"activeDays"`
	ShareOfTotal float64 `json:"shareOfTotal"`
	LastActiveAt string  `json:"lastActiveAt,omitempty"`
}

type LanguageSummary struct {
	Language     string  `json:"language"`
	TotalMinutes int     `json:"totalMinutes"`
	SessionCount int     `json:"sessionCount"`
	ActiveDays   int     `json:"activeDays"`
	ShareOfTotal float64 `json:"shareOfTotal"`
	LastActiveAt string  `json:"lastActiveAt,omitempty"`
}

type MachineSummary struct {
	MachineID    string  `json:"machineId"`
	MachineName  string  `json:"machineName"`
	OSPlatform   string  `json:"osPlatform,omitempty"`
	TotalMinutes int     `json:"totalMinutes"`
	SessionCount int     `json:"sessionCount"`
	ActiveDays   int     `json:"activeDays"`
	LastActiveAt string  `json:"lastActiveAt,omitempty"`
}
