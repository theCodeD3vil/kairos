package contracts

type WeeklyTrendPoint struct {
	Date         string `json:"date"`
	TotalMinutes int    `json:"totalMinutes"`
}

type DailyTotalPoint struct {
	Date         string `json:"date"`
	TotalMinutes int    `json:"totalMinutes"`
}

type TimeKpiPoint struct {
	Label        string `json:"label"`
	Date         string `json:"date"`
	TotalMinutes int    `json:"totalMinutes"`
}

type HeatmapKpiPoint struct {
	Index        int    `json:"index"`
	Label        string `json:"label"`
	TotalMinutes int    `json:"totalMinutes"`
}

type SessionDurationKpis struct {
	AverageMinutes int `json:"averageMinutes"`
	MedianMinutes  int `json:"medianMinutes"`
	P90Minutes     int `json:"p90Minutes"`
	LongestMinutes int `json:"longestMinutes"`
}

type SessionKpiSummary struct {
	ActiveDays                   int                 `json:"activeDays"`
	CurrentStreakDays            int                 `json:"currentStreakDays"`
	LongestStreakDays            int                 `json:"longestStreakDays"`
	Rolling7DayAverageMinutes    int                 `json:"rolling7DayAverageMinutes"`
	Rolling30DayAverageMinutes   int                 `json:"rolling30DayAverageMinutes"`
	PreviousPeriodDeltaPercent   float64             `json:"previousPeriodDeltaPercent"`
	BestDay                      TimeKpiPoint        `json:"bestDay"`
	BestWeek                     TimeKpiPoint        `json:"bestWeek"`
	BestMonth                    TimeKpiPoint        `json:"bestMonth"`
	Duration                     SessionDurationKpis `json:"duration"`
	DeepWorkThresholdMinutes     int                 `json:"deepWorkThresholdMinutes"`
	DeepWorkMinutes              int                 `json:"deepWorkMinutes"`
	DeepWorkBlockCount           int                 `json:"deepWorkBlockCount"`
	ShortSessionThresholdMinutes int                 `json:"shortSessionThresholdMinutes"`
	ShortSessionCount            int                 `json:"shortSessionCount"`
	FragmentationScore           float64             `json:"fragmentationScore"`
	LongestBreakMinutes          int                 `json:"longestBreakMinutes"`
	MedianBreakMinutes           int                 `json:"medianBreakMinutes"`
	FirstActiveAt                string              `json:"firstActiveAt,omitempty"`
	LastActiveAt                 string              `json:"lastActiveAt,omitempty"`
	FocusWindowStart             string              `json:"focusWindowStart,omitempty"`
	FocusWindowEnd               string              `json:"focusWindowEnd,omitempty"`
	WeekdayHeatmap               []HeatmapKpiPoint   `json:"weekdayHeatmap"`
	HourlyHeatmap                []HeatmapKpiPoint   `json:"hourlyHeatmap"`
	ConsistencyScore             float64             `json:"consistencyScore"`
}

type ContextLeaderKpi struct {
	Name         string  `json:"name"`
	TotalMinutes int     `json:"totalMinutes"`
	SessionCount int     `json:"sessionCount"`
	ActiveDays   int     `json:"activeDays"`
	ShareOfTotal float64 `json:"shareOfTotal"`
}

type ContextMomentumPoint struct {
	Name            string  `json:"name"`
	CurrentMinutes  int     `json:"currentMinutes"`
	PreviousMinutes int     `json:"previousMinutes"`
	DeltaPercent    float64 `json:"deltaPercent"`
}

type MachineTimeSplitPoint struct {
	MachineID    string  `json:"machineId"`
	MachineName  string  `json:"machineName"`
	TotalMinutes int     `json:"totalMinutes"`
	ShareOfTotal float64 `json:"shareOfTotal"`
}

type WorkspaceContinuityPoint struct {
	WorkspaceID  string `json:"workspaceId"`
	ProjectCount int    `json:"projectCount"`
	MachineCount int    `json:"machineCount"`
	EventCount   int    `json:"eventCount"`
	LastActiveAt string `json:"lastActiveAt,omitempty"`
}

type BranchTimePoint struct {
	BranchName   string  `json:"branchName"`
	TotalMinutes int     `json:"totalMinutes"`
	EventCount   int     `json:"eventCount"`
	ShareOfTotal float64 `json:"shareOfTotal"`
	LastActiveAt string  `json:"lastActiveAt,omitempty"`
}

type ProjectBranchTimePoint struct {
	ProjectName  string  `json:"projectName"`
	BranchName   string  `json:"branchName"`
	TotalMinutes int     `json:"totalMinutes"`
	EventCount   int     `json:"eventCount"`
	ShareOfTotal float64 `json:"shareOfTotal"`
}

type EventTypeMixBucket struct {
	Name           string `json:"name"`
	TotalEvents    int    `json:"totalEvents"`
	EditCount      int    `json:"editCount"`
	SaveCount      int    `json:"saveCount"`
	OpenCount      int    `json:"openCount"`
	HeartbeatCount int    `json:"heartbeatCount"`
	FocusCount     int    `json:"focusCount"`
	BlurCount      int    `json:"blurCount"`
}

type EventActivityKpiSummary struct {
	TotalEvents                       int                  `json:"totalEvents"`
	EventsInSessions                  int                  `json:"eventsInSessions"`
	EditCount                         int                  `json:"editCount"`
	SaveCount                         int                  `json:"saveCount"`
	OpenCount                         int                  `json:"openCount"`
	HeartbeatCount                    int                  `json:"heartbeatCount"`
	FocusCount                        int                  `json:"focusCount"`
	BlurCount                         int                  `json:"blurCount"`
	ActiveEventCount                  int                  `json:"activeEventCount"`
	PassiveEventCount                 int                  `json:"passiveEventCount"`
	NeutralEventCount                 int                  `json:"neutralEventCount"`
	ActiveShare                       float64              `json:"activeShare"`
	PassiveShare                      float64              `json:"passiveShare"`
	NeutralShare                      float64              `json:"neutralShare"`
	EventDensityPerMinute             float64              `json:"eventDensityPerMinute"`
	EditSaveRatio                     float64              `json:"editSaveRatio"`
	MedianFirstOpenToFirstEditSeconds int                  `json:"medianFirstOpenToFirstEditSeconds"`
	MedianEditToSaveSeconds           int                  `json:"medianEditToSaveSeconds"`
	MedianSessionWarmupSeconds        int                  `json:"medianSessionWarmupSeconds"`
	WarmupQualifyingSessionCount      int                  `json:"warmupQualifyingSessionCount"`
	MedianReturnAfterIdleMinutes      int                  `json:"medianReturnAfterIdleMinutes"`
	ActivityBurstCount                int                  `json:"activityBurstCount"`
	HeartbeatOnlySessionCount         int                  `json:"heartbeatOnlySessionCount"`
	HeartbeatOnlySessionShare         float64              `json:"heartbeatOnlySessionShare"`
	TrackEditEvents                   bool                 `json:"trackEditEvents"`
	TrackSaveEvents                   bool                 `json:"trackSaveEvents"`
	TrackFileOpenEvents               bool                 `json:"trackFileOpenEvents"`
	EventTypeMixByProject             []EventTypeMixBucket `json:"eventTypeMixByProject"`
	EventTypeMixByLanguage            []EventTypeMixBucket `json:"eventTypeMixByLanguage"`
	EventTypeMixByMachine             []EventTypeMixBucket `json:"eventTypeMixByMachine"`
}

type FileHotspot struct {
	FilePath     string  `json:"filePath"`
	FileName     string  `json:"fileName"`
	Category     string  `json:"category"`
	TotalMinutes int     `json:"totalMinutes"`
	EventCount   int     `json:"eventCount"`
	EditCount    int     `json:"editCount"`
	SaveCount    int     `json:"saveCount"`
	ShareOfTotal float64 `json:"shareOfTotal"`
	LastActiveAt string  `json:"lastActiveAt,omitempty"`
}

type FileCategoryBreakdown struct {
	Category     string  `json:"category"`
	TotalMinutes int     `json:"totalMinutes"`
	EventCount   int     `json:"eventCount"`
	FileCount    int     `json:"fileCount"`
	ShareOfTotal float64 `json:"shareOfTotal"`
}

type ProjectAreaBreakdown struct {
	ProjectName  string  `json:"projectName"`
	Area         string  `json:"area"`
	TotalMinutes int     `json:"totalMinutes"`
	EventCount   int     `json:"eventCount"`
	ShareOfTotal float64 `json:"shareOfTotal"`
}

type FileFocusBlock struct {
	FilePath        string `json:"filePath"`
	FileName        string `json:"fileName"`
	StartTime       string `json:"startTime"`
	EndTime         string `json:"endTime"`
	DurationMinutes int    `json:"durationMinutes"`
	EventCount      int    `json:"eventCount"`
}

type FileTestVsSource struct {
	TestMinutes     int     `json:"testMinutes"`
	SourceMinutes   int     `json:"sourceMinutes"`
	TestShareOfCode float64 `json:"testShareOfCode"`
}

type FileKpiSummary struct {
	OptInEnabled                 bool                    `json:"optInEnabled"`
	FilePathsAvailable           bool                    `json:"filePathsAvailable"`
	PathsMasked                  bool                    `json:"pathsMasked"`
	UniqueFileCount              int                     `json:"uniqueFileCount"`
	AverageUniqueFilesPerSession float64                 `json:"averageUniqueFilesPerSession"`
	TotalAttributedMinutes       int                     `json:"totalAttributedMinutes"`
	TopFiles                     []FileHotspot           `json:"topFiles"`
	MostRevisitedFiles           []FileHotspot           `json:"mostRevisitedFiles"`
	CategoryBreakdown            []FileCategoryBreakdown `json:"categoryBreakdown"`
	TestVsSource                 FileTestVsSource        `json:"testVsSource"`
	DocumentationMinutes         int                     `json:"documentationMinutes"`
	ConfigMinutes                int                     `json:"configMinutes"`
	InfrastructureMinutes        int                     `json:"infrastructureMinutes"`
	FileChurnLeaders             []FileHotspot           `json:"fileChurnLeaders"`
	LongRunningFocusBlocks       []FileFocusBlock        `json:"longRunningFocusBlocks"`
	ProjectAreaBreakdown         []ProjectAreaBreakdown  `json:"projectAreaBreakdown"`
}

type InsightScoreInput struct {
	Label  string  `json:"label"`
	Value  float64 `json:"value"`
	Score  float64 `json:"score"`
	Weight float64 `json:"weight"`
}

type InsightScore struct {
	Score     float64             `json:"score"`
	Direction string              `json:"direction"`
	Inputs    []InsightScoreInput `json:"inputs"`
}

type ProjectInvestmentScore struct {
	ProjectName     string  `json:"projectName"`
	Score           float64 `json:"score"`
	TotalMinutes    int     `json:"totalMinutes"`
	ActiveDays      int     `json:"activeDays"`
	MomentumPercent float64 `json:"momentumPercent"`
	ShareOfTotal    float64 `json:"shareOfTotal"`
}

type InsightScoreSummary struct {
	MomentumScore              InsightScore             `json:"momentumScore"`
	FocusScore                 InsightScore             `json:"focusScore"`
	ConsistencyScore           InsightScore             `json:"consistencyScore"`
	FragmentationScore         InsightScore             `json:"fragmentationScore"`
	RecoveryScore              InsightScore             `json:"recoveryScore"`
	TrackingHealthScore        InsightScore             `json:"trackingHealthScore"`
	ProjectInvestmentScore     InsightScore             `json:"projectInvestmentScore"`
	ProjectInvestmentBreakdown []ProjectInvestmentScore `json:"projectInvestmentBreakdown"`
}

type ContextKpiSummary struct {
	ProjectSwitchCount       int                        `json:"projectSwitchCount"`
	ProjectSwitchRatePerDay  float64                    `json:"projectSwitchRatePerDay"`
	LanguageSwitchCount      int                        `json:"languageSwitchCount"`
	LanguageSwitchRatePerDay float64                    `json:"languageSwitchRatePerDay"`
	BranchSwitchCount        int                        `json:"branchSwitchCount"`
	BranchSwitchRatePerDay   float64                    `json:"branchSwitchRatePerDay"`
	ProjectFocusScore        float64                    `json:"projectFocusScore"`
	LanguageFocusScore       float64                    `json:"languageFocusScore"`
	TopProjectByTime         ContextLeaderKpi           `json:"topProjectByTime"`
	TopProjectBySessions     ContextLeaderKpi           `json:"topProjectBySessions"`
	TopProjectByActiveDays   ContextLeaderKpi           `json:"topProjectByActiveDays"`
	TopLanguageByTime        ContextLeaderKpi           `json:"topLanguageByTime"`
	TopLanguageBySessions    ContextLeaderKpi           `json:"topLanguageBySessions"`
	TopLanguageByActiveDays  ContextLeaderKpi           `json:"topLanguageByActiveDays"`
	ProjectMomentum          []ContextMomentumPoint     `json:"projectMomentum"`
	LanguageMomentum         []ContextMomentumPoint     `json:"languageMomentum"`
	MachineTimeSplit         []MachineTimeSplitPoint    `json:"machineTimeSplit"`
	CrossMachineResumeCount  int                        `json:"crossMachineResumeCount"`
	CrossMachineResumeRate   float64                    `json:"crossMachineResumeRate"`
	WorkspaceContinuity      []WorkspaceContinuityPoint `json:"workspaceContinuity"`
	BranchTime               []BranchTimePoint          `json:"branchTime"`
	ProjectBranchBreakdown   []ProjectBranchTimePoint   `json:"projectBranchBreakdown"`
}

type OverviewData struct {
	TodayMinutes          int                `json:"todayMinutes"`
	WeekMinutes           int                `json:"weekMinutes"`
	SessionCount          int                `json:"sessionCount"`
	AverageSessionMinutes int                `json:"averageSessionMinutes"`
	CodingDaysThisWeek    int                `json:"codingDaysThisWeek"`
	LastActiveAt          string             `json:"lastActiveAt,omitempty"`
	TopProjects           []ProjectSummary   `json:"topProjects"`
	TopLanguages          []LanguageSummary  `json:"topLanguages"`
	RecentSessions        []Session          `json:"recentSessions"`
	WeeklyTrend           []WeeklyTrendPoint `json:"weeklyTrend"`
	ActiveHoursSummary    string             `json:"activeHoursSummary"`
	TrackingEnabled       bool               `json:"trackingEnabled"`
	LocalOnlyMode         bool               `json:"localOnlyMode"`
	CurrentMachine        *MachineInfo       `json:"currentMachine,omitempty"`
	LastUpdatedAt         string             `json:"lastUpdatedAt"`
}

type AnalyticsData struct {
	RangeLabel            string                  `json:"rangeLabel"`
	TotalMinutes          int                     `json:"totalMinutes"`
	ActiveDays            int                     `json:"activeDays"`
	SessionCount          int                     `json:"sessionCount"`
	AverageSessionMinutes int                     `json:"averageSessionMinutes"`
	LongestDayMinutes     int                     `json:"longestDayMinutes"`
	PreviousPeriodMinutes *int                    `json:"previousPeriodMinutes,omitempty"`
	DailyTotals           []DailyTotalPoint       `json:"dailyTotals"`
	ProjectSummaries      []ProjectSummary        `json:"projectSummaries"`
	LanguageSummaries     []LanguageSummary       `json:"languageSummaries"`
	MachineSummaries      []MachineSummary        `json:"machineSummaries"`
	RecentSessions        []Session               `json:"recentSessions"`
	SessionKpis           SessionKpiSummary       `json:"sessionKpis"`
	ContextKpis           ContextKpiSummary       `json:"contextKpis"`
	EventKpis             EventActivityKpiSummary `json:"eventKpis"`
	FileKpis              FileKpiSummary          `json:"fileKpis"`
	InsightScores         InsightScoreSummary     `json:"insightScores"`
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
