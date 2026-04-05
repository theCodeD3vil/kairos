package contracts

type WeeklyTrendPoint struct {
	Date         string `json:"date"`
	TotalMinutes int    `json:"totalMinutes"`
}

type DailyTotalPoint struct {
	Date         string `json:"date"`
	TotalMinutes int    `json:"totalMinutes"`
}

type OverviewData struct {
	TodayMinutes           int              `json:"todayMinutes"`
	WeekMinutes            int              `json:"weekMinutes"`
	SessionCount           int              `json:"sessionCount"`
	AverageSessionMinutes  int              `json:"averageSessionMinutes"`
	CodingDaysThisWeek     int              `json:"codingDaysThisWeek"`
	LastActiveAt           string           `json:"lastActiveAt,omitempty"`
	TopProjects            []ProjectSummary `json:"topProjects"`
	TopLanguages           []LanguageSummary `json:"topLanguages"`
	RecentSessions         []Session        `json:"recentSessions"`
	WeeklyTrend            []WeeklyTrendPoint `json:"weeklyTrend"`
	ActiveHoursSummary     string           `json:"activeHoursSummary"`
	TrackingEnabled        bool             `json:"trackingEnabled"`
	LocalOnlyMode          bool             `json:"localOnlyMode"`
	CurrentMachine         *MachineInfo     `json:"currentMachine,omitempty"`
	LastUpdatedAt          string           `json:"lastUpdatedAt"`
}

type AnalyticsData struct {
	RangeLabel            string           `json:"rangeLabel"`
	TotalMinutes          int              `json:"totalMinutes"`
	ActiveDays            int              `json:"activeDays"`
	SessionCount          int              `json:"sessionCount"`
	AverageSessionMinutes int              `json:"averageSessionMinutes"`
	LongestDayMinutes     int              `json:"longestDayMinutes"`
	PreviousPeriodMinutes *int             `json:"previousPeriodMinutes,omitempty"`
	DailyTotals           []DailyTotalPoint `json:"dailyTotals"`
	ProjectSummaries      []ProjectSummary `json:"projectSummaries"`
	LanguageSummaries     []LanguageSummary `json:"languageSummaries"`
	MachineSummaries      []MachineSummary `json:"machineSummaries"`
	RecentSessions        []Session        `json:"recentSessions"`
}

type CalendarDaySummary struct {
	Date         string `json:"date"`
	TotalMinutes int    `json:"totalMinutes"`
	SessionCount int    `json:"sessionCount"`
	TopProject   string `json:"topProject,omitempty"`
	TopLanguage  string `json:"topLanguage,omitempty"`
	MachineCount int    `json:"machineCount"`
	HadActivity  bool   `json:"hadActivity"`
}

type CalendarMonthData struct {
	Month      string               `json:"month"`
	MonthLabel string               `json:"monthLabel"`
	Days       []CalendarDaySummary `json:"days"`
}

type CalendarDayData struct {
	Date                  string           `json:"date"`
	TotalMinutes          int              `json:"totalMinutes"`
	SessionCount          int              `json:"sessionCount"`
	AverageSessionMinutes int              `json:"averageSessionMinutes"`
	FirstActiveAt         string           `json:"firstActiveAt,omitempty"`
	LastActiveAt          string           `json:"lastActiveAt,omitempty"`
	TopProject            string           `json:"topProject,omitempty"`
	TopLanguage           string           `json:"topLanguage,omitempty"`
	ProjectBreakdown      []ProjectSummary `json:"projectBreakdown"`
	MachineBreakdown      []MachineSummary `json:"machineBreakdown"`
	Sessions              []Session        `json:"sessions"`
	HadActivity           bool             `json:"hadActivity"`
}

type ProjectsPageData struct {
	RangeLabel string           `json:"rangeLabel"`
	Projects   []ProjectSummary `json:"projects"`
}

type SessionsPageData struct {
	RangeLabel            string    `json:"rangeLabel"`
	TotalSessions         int       `json:"totalSessions"`
	AverageSessionMinutes int       `json:"averageSessionMinutes"`
	LongestSessionMinutes int       `json:"longestSessionMinutes"`
	Sessions              []Session `json:"sessions"`
}
