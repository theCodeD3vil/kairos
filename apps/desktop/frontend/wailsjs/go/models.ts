export namespace contracts {
	
	export class AboutInfo {
	    appName: string;
	    appVersion: string;
	    environment: string;
	    buildChannel: string;
	    desktopVersion: string;
	    extensionVersion?: string;
	    licenseSummary: string;
	    repositoryUrl?: string;
	
	    static createFrom(source: any = {}) {
	        return new AboutInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.appName = source["appName"];
	        this.appVersion = source["appVersion"];
	        this.environment = source["environment"];
	        this.buildChannel = source["buildChannel"];
	        this.desktopVersion = source["desktopVersion"];
	        this.extensionVersion = source["extensionVersion"];
	        this.licenseSummary = source["licenseSummary"];
	        this.repositoryUrl = source["repositoryUrl"];
	    }
	}
	export class AcceptedEventTrendPoint {
	    date: string;
	    acceptedCount: number;
	
	    static createFrom(source: any = {}) {
	        return new AcceptedEventTrendPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.acceptedCount = source["acceptedCount"];
	    }
	}
	export class ActivityEvent {
	    id: string;
	    timestamp: string;
	    eventType: string;
	    machineId: string;
	    workspaceId: string;
	    projectName: string;
	    language: string;
	    filePath?: string;
	    gitBranch?: string;
	
	    static createFrom(source: any = {}) {
	        return new ActivityEvent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.timestamp = source["timestamp"];
	        this.eventType = source["eventType"];
	        this.machineId = source["machineId"];
	        this.workspaceId = source["workspaceId"];
	        this.projectName = source["projectName"];
	        this.language = source["language"];
	        this.filePath = source["filePath"];
	        this.gitBranch = source["gitBranch"];
	    }
	}
	export class ProjectInvestmentScore {
	    projectName: string;
	    score: number;
	    totalMinutes: number;
	    activeDays: number;
	    momentumPercent: number;
	    shareOfTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new ProjectInvestmentScore(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectName = source["projectName"];
	        this.score = source["score"];
	        this.totalMinutes = source["totalMinutes"];
	        this.activeDays = source["activeDays"];
	        this.momentumPercent = source["momentumPercent"];
	        this.shareOfTotal = source["shareOfTotal"];
	    }
	}
	export class InsightScoreInput {
	    label: string;
	    value: number;
	    score: number;
	    weight: number;
	
	    static createFrom(source: any = {}) {
	        return new InsightScoreInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.value = source["value"];
	        this.score = source["score"];
	        this.weight = source["weight"];
	    }
	}
	export class InsightScore {
	    score: number;
	    direction: string;
	    inputs: InsightScoreInput[];
	
	    static createFrom(source: any = {}) {
	        return new InsightScore(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.score = source["score"];
	        this.direction = source["direction"];
	        this.inputs = this.convertValues(source["inputs"], InsightScoreInput);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class InsightScoreSummary {
	    momentumScore: InsightScore;
	    focusScore: InsightScore;
	    consistencyScore: InsightScore;
	    fragmentationScore: InsightScore;
	    recoveryScore: InsightScore;
	    trackingHealthScore: InsightScore;
	    projectInvestmentScore: InsightScore;
	    projectInvestmentBreakdown: ProjectInvestmentScore[];
	
	    static createFrom(source: any = {}) {
	        return new InsightScoreSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.momentumScore = this.convertValues(source["momentumScore"], InsightScore);
	        this.focusScore = this.convertValues(source["focusScore"], InsightScore);
	        this.consistencyScore = this.convertValues(source["consistencyScore"], InsightScore);
	        this.fragmentationScore = this.convertValues(source["fragmentationScore"], InsightScore);
	        this.recoveryScore = this.convertValues(source["recoveryScore"], InsightScore);
	        this.trackingHealthScore = this.convertValues(source["trackingHealthScore"], InsightScore);
	        this.projectInvestmentScore = this.convertValues(source["projectInvestmentScore"], InsightScore);
	        this.projectInvestmentBreakdown = this.convertValues(source["projectInvestmentBreakdown"], ProjectInvestmentScore);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProjectAreaBreakdown {
	    projectName: string;
	    area: string;
	    totalMinutes: number;
	    eventCount: number;
	    shareOfTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new ProjectAreaBreakdown(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectName = source["projectName"];
	        this.area = source["area"];
	        this.totalMinutes = source["totalMinutes"];
	        this.eventCount = source["eventCount"];
	        this.shareOfTotal = source["shareOfTotal"];
	    }
	}
	export class FileFocusBlock {
	    filePath: string;
	    fileName: string;
	    startTime: string;
	    endTime: string;
	    durationMinutes: number;
	    eventCount: number;
	
	    static createFrom(source: any = {}) {
	        return new FileFocusBlock(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.fileName = source["fileName"];
	        this.startTime = source["startTime"];
	        this.endTime = source["endTime"];
	        this.durationMinutes = source["durationMinutes"];
	        this.eventCount = source["eventCount"];
	    }
	}
	export class FileTestVsSource {
	    testMinutes: number;
	    sourceMinutes: number;
	    testShareOfCode: number;
	
	    static createFrom(source: any = {}) {
	        return new FileTestVsSource(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.testMinutes = source["testMinutes"];
	        this.sourceMinutes = source["sourceMinutes"];
	        this.testShareOfCode = source["testShareOfCode"];
	    }
	}
	export class FileCategoryBreakdown {
	    category: string;
	    totalMinutes: number;
	    eventCount: number;
	    fileCount: number;
	    shareOfTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new FileCategoryBreakdown(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.category = source["category"];
	        this.totalMinutes = source["totalMinutes"];
	        this.eventCount = source["eventCount"];
	        this.fileCount = source["fileCount"];
	        this.shareOfTotal = source["shareOfTotal"];
	    }
	}
	export class FileHotspot {
	    filePath: string;
	    fileName: string;
	    category: string;
	    totalMinutes: number;
	    eventCount: number;
	    editCount: number;
	    saveCount: number;
	    shareOfTotal: number;
	    lastActiveAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new FileHotspot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.fileName = source["fileName"];
	        this.category = source["category"];
	        this.totalMinutes = source["totalMinutes"];
	        this.eventCount = source["eventCount"];
	        this.editCount = source["editCount"];
	        this.saveCount = source["saveCount"];
	        this.shareOfTotal = source["shareOfTotal"];
	        this.lastActiveAt = source["lastActiveAt"];
	    }
	}
	export class FileKpiSummary {
	    optInEnabled: boolean;
	    filePathsAvailable: boolean;
	    pathsMasked: boolean;
	    uniqueFileCount: number;
	    averageUniqueFilesPerSession: number;
	    totalAttributedMinutes: number;
	    topFiles: FileHotspot[];
	    mostRevisitedFiles: FileHotspot[];
	    categoryBreakdown: FileCategoryBreakdown[];
	    testVsSource: FileTestVsSource;
	    documentationMinutes: number;
	    configMinutes: number;
	    infrastructureMinutes: number;
	    fileChurnLeaders: FileHotspot[];
	    longRunningFocusBlocks: FileFocusBlock[];
	    projectAreaBreakdown: ProjectAreaBreakdown[];
	
	    static createFrom(source: any = {}) {
	        return new FileKpiSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.optInEnabled = source["optInEnabled"];
	        this.filePathsAvailable = source["filePathsAvailable"];
	        this.pathsMasked = source["pathsMasked"];
	        this.uniqueFileCount = source["uniqueFileCount"];
	        this.averageUniqueFilesPerSession = source["averageUniqueFilesPerSession"];
	        this.totalAttributedMinutes = source["totalAttributedMinutes"];
	        this.topFiles = this.convertValues(source["topFiles"], FileHotspot);
	        this.mostRevisitedFiles = this.convertValues(source["mostRevisitedFiles"], FileHotspot);
	        this.categoryBreakdown = this.convertValues(source["categoryBreakdown"], FileCategoryBreakdown);
	        this.testVsSource = this.convertValues(source["testVsSource"], FileTestVsSource);
	        this.documentationMinutes = source["documentationMinutes"];
	        this.configMinutes = source["configMinutes"];
	        this.infrastructureMinutes = source["infrastructureMinutes"];
	        this.fileChurnLeaders = this.convertValues(source["fileChurnLeaders"], FileHotspot);
	        this.longRunningFocusBlocks = this.convertValues(source["longRunningFocusBlocks"], FileFocusBlock);
	        this.projectAreaBreakdown = this.convertValues(source["projectAreaBreakdown"], ProjectAreaBreakdown);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class EventTypeMixBucket {
	    name: string;
	    totalEvents: number;
	    editCount: number;
	    saveCount: number;
	    openCount: number;
	    heartbeatCount: number;
	    focusCount: number;
	    blurCount: number;
	
	    static createFrom(source: any = {}) {
	        return new EventTypeMixBucket(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.totalEvents = source["totalEvents"];
	        this.editCount = source["editCount"];
	        this.saveCount = source["saveCount"];
	        this.openCount = source["openCount"];
	        this.heartbeatCount = source["heartbeatCount"];
	        this.focusCount = source["focusCount"];
	        this.blurCount = source["blurCount"];
	    }
	}
	export class EventActivityKpiSummary {
	    totalEvents: number;
	    eventsInSessions: number;
	    editCount: number;
	    saveCount: number;
	    openCount: number;
	    heartbeatCount: number;
	    focusCount: number;
	    blurCount: number;
	    activeEventCount: number;
	    passiveEventCount: number;
	    neutralEventCount: number;
	    activeShare: number;
	    passiveShare: number;
	    neutralShare: number;
	    eventDensityPerMinute: number;
	    editSaveRatio: number;
	    medianFirstOpenToFirstEditSeconds: number;
	    medianEditToSaveSeconds: number;
	    medianSessionWarmupSeconds: number;
	    warmupQualifyingSessionCount: number;
	    medianReturnAfterIdleMinutes: number;
	    activityBurstCount: number;
	    heartbeatOnlySessionCount: number;
	    heartbeatOnlySessionShare: number;
	    trackEditEvents: boolean;
	    trackSaveEvents: boolean;
	    trackFileOpenEvents: boolean;
	    eventTypeMixByProject: EventTypeMixBucket[];
	    eventTypeMixByLanguage: EventTypeMixBucket[];
	    eventTypeMixByMachine: EventTypeMixBucket[];
	
	    static createFrom(source: any = {}) {
	        return new EventActivityKpiSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalEvents = source["totalEvents"];
	        this.eventsInSessions = source["eventsInSessions"];
	        this.editCount = source["editCount"];
	        this.saveCount = source["saveCount"];
	        this.openCount = source["openCount"];
	        this.heartbeatCount = source["heartbeatCount"];
	        this.focusCount = source["focusCount"];
	        this.blurCount = source["blurCount"];
	        this.activeEventCount = source["activeEventCount"];
	        this.passiveEventCount = source["passiveEventCount"];
	        this.neutralEventCount = source["neutralEventCount"];
	        this.activeShare = source["activeShare"];
	        this.passiveShare = source["passiveShare"];
	        this.neutralShare = source["neutralShare"];
	        this.eventDensityPerMinute = source["eventDensityPerMinute"];
	        this.editSaveRatio = source["editSaveRatio"];
	        this.medianFirstOpenToFirstEditSeconds = source["medianFirstOpenToFirstEditSeconds"];
	        this.medianEditToSaveSeconds = source["medianEditToSaveSeconds"];
	        this.medianSessionWarmupSeconds = source["medianSessionWarmupSeconds"];
	        this.warmupQualifyingSessionCount = source["warmupQualifyingSessionCount"];
	        this.medianReturnAfterIdleMinutes = source["medianReturnAfterIdleMinutes"];
	        this.activityBurstCount = source["activityBurstCount"];
	        this.heartbeatOnlySessionCount = source["heartbeatOnlySessionCount"];
	        this.heartbeatOnlySessionShare = source["heartbeatOnlySessionShare"];
	        this.trackEditEvents = source["trackEditEvents"];
	        this.trackSaveEvents = source["trackSaveEvents"];
	        this.trackFileOpenEvents = source["trackFileOpenEvents"];
	        this.eventTypeMixByProject = this.convertValues(source["eventTypeMixByProject"], EventTypeMixBucket);
	        this.eventTypeMixByLanguage = this.convertValues(source["eventTypeMixByLanguage"], EventTypeMixBucket);
	        this.eventTypeMixByMachine = this.convertValues(source["eventTypeMixByMachine"], EventTypeMixBucket);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProjectBranchTimePoint {
	    projectName: string;
	    branchName: string;
	    totalMinutes: number;
	    eventCount: number;
	    shareOfTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new ProjectBranchTimePoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectName = source["projectName"];
	        this.branchName = source["branchName"];
	        this.totalMinutes = source["totalMinutes"];
	        this.eventCount = source["eventCount"];
	        this.shareOfTotal = source["shareOfTotal"];
	    }
	}
	export class BranchTimePoint {
	    branchName: string;
	    totalMinutes: number;
	    eventCount: number;
	    shareOfTotal: number;
	    lastActiveAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new BranchTimePoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.branchName = source["branchName"];
	        this.totalMinutes = source["totalMinutes"];
	        this.eventCount = source["eventCount"];
	        this.shareOfTotal = source["shareOfTotal"];
	        this.lastActiveAt = source["lastActiveAt"];
	    }
	}
	export class WorkspaceContinuityPoint {
	    workspaceId: string;
	    projectCount: number;
	    machineCount: number;
	    eventCount: number;
	    lastActiveAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new WorkspaceContinuityPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.workspaceId = source["workspaceId"];
	        this.projectCount = source["projectCount"];
	        this.machineCount = source["machineCount"];
	        this.eventCount = source["eventCount"];
	        this.lastActiveAt = source["lastActiveAt"];
	    }
	}
	export class MachineTimeSplitPoint {
	    machineId: string;
	    machineName: string;
	    totalMinutes: number;
	    shareOfTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new MachineTimeSplitPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machineId = source["machineId"];
	        this.machineName = source["machineName"];
	        this.totalMinutes = source["totalMinutes"];
	        this.shareOfTotal = source["shareOfTotal"];
	    }
	}
	export class ContextMomentumPoint {
	    name: string;
	    currentMinutes: number;
	    previousMinutes: number;
	    deltaPercent: number;
	
	    static createFrom(source: any = {}) {
	        return new ContextMomentumPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.currentMinutes = source["currentMinutes"];
	        this.previousMinutes = source["previousMinutes"];
	        this.deltaPercent = source["deltaPercent"];
	    }
	}
	export class ContextLeaderKpi {
	    name: string;
	    totalMinutes: number;
	    sessionCount: number;
	    activeDays: number;
	    shareOfTotal: number;
	
	    static createFrom(source: any = {}) {
	        return new ContextLeaderKpi(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.totalMinutes = source["totalMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.activeDays = source["activeDays"];
	        this.shareOfTotal = source["shareOfTotal"];
	    }
	}
	export class ContextKpiSummary {
	    projectSwitchCount: number;
	    projectSwitchRatePerDay: number;
	    languageSwitchCount: number;
	    languageSwitchRatePerDay: number;
	    branchSwitchCount: number;
	    branchSwitchRatePerDay: number;
	    projectFocusScore: number;
	    languageFocusScore: number;
	    topProjectByTime: ContextLeaderKpi;
	    topProjectBySessions: ContextLeaderKpi;
	    topProjectByActiveDays: ContextLeaderKpi;
	    topLanguageByTime: ContextLeaderKpi;
	    topLanguageBySessions: ContextLeaderKpi;
	    topLanguageByActiveDays: ContextLeaderKpi;
	    projectMomentum: ContextMomentumPoint[];
	    languageMomentum: ContextMomentumPoint[];
	    machineTimeSplit: MachineTimeSplitPoint[];
	    crossMachineResumeCount: number;
	    crossMachineResumeRate: number;
	    workspaceContinuity: WorkspaceContinuityPoint[];
	    branchTime: BranchTimePoint[];
	    projectBranchBreakdown: ProjectBranchTimePoint[];
	
	    static createFrom(source: any = {}) {
	        return new ContextKpiSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectSwitchCount = source["projectSwitchCount"];
	        this.projectSwitchRatePerDay = source["projectSwitchRatePerDay"];
	        this.languageSwitchCount = source["languageSwitchCount"];
	        this.languageSwitchRatePerDay = source["languageSwitchRatePerDay"];
	        this.branchSwitchCount = source["branchSwitchCount"];
	        this.branchSwitchRatePerDay = source["branchSwitchRatePerDay"];
	        this.projectFocusScore = source["projectFocusScore"];
	        this.languageFocusScore = source["languageFocusScore"];
	        this.topProjectByTime = this.convertValues(source["topProjectByTime"], ContextLeaderKpi);
	        this.topProjectBySessions = this.convertValues(source["topProjectBySessions"], ContextLeaderKpi);
	        this.topProjectByActiveDays = this.convertValues(source["topProjectByActiveDays"], ContextLeaderKpi);
	        this.topLanguageByTime = this.convertValues(source["topLanguageByTime"], ContextLeaderKpi);
	        this.topLanguageBySessions = this.convertValues(source["topLanguageBySessions"], ContextLeaderKpi);
	        this.topLanguageByActiveDays = this.convertValues(source["topLanguageByActiveDays"], ContextLeaderKpi);
	        this.projectMomentum = this.convertValues(source["projectMomentum"], ContextMomentumPoint);
	        this.languageMomentum = this.convertValues(source["languageMomentum"], ContextMomentumPoint);
	        this.machineTimeSplit = this.convertValues(source["machineTimeSplit"], MachineTimeSplitPoint);
	        this.crossMachineResumeCount = source["crossMachineResumeCount"];
	        this.crossMachineResumeRate = source["crossMachineResumeRate"];
	        this.workspaceContinuity = this.convertValues(source["workspaceContinuity"], WorkspaceContinuityPoint);
	        this.branchTime = this.convertValues(source["branchTime"], BranchTimePoint);
	        this.projectBranchBreakdown = this.convertValues(source["projectBranchBreakdown"], ProjectBranchTimePoint);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HeatmapKpiPoint {
	    index: number;
	    label: string;
	    totalMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new HeatmapKpiPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.label = source["label"];
	        this.totalMinutes = source["totalMinutes"];
	    }
	}
	export class SessionDurationKpis {
	    averageMinutes: number;
	    medianMinutes: number;
	    p90Minutes: number;
	    longestMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new SessionDurationKpis(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.averageMinutes = source["averageMinutes"];
	        this.medianMinutes = source["medianMinutes"];
	        this.p90Minutes = source["p90Minutes"];
	        this.longestMinutes = source["longestMinutes"];
	    }
	}
	export class TimeKpiPoint {
	    label: string;
	    date: string;
	    totalMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new TimeKpiPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.label = source["label"];
	        this.date = source["date"];
	        this.totalMinutes = source["totalMinutes"];
	    }
	}
	export class SessionKpiSummary {
	    activeDays: number;
	    currentStreakDays: number;
	    longestStreakDays: number;
	    rolling7DayAverageMinutes: number;
	    rolling30DayAverageMinutes: number;
	    previousPeriodDeltaPercent: number;
	    bestDay: TimeKpiPoint;
	    bestWeek: TimeKpiPoint;
	    bestMonth: TimeKpiPoint;
	    duration: SessionDurationKpis;
	    deepWorkThresholdMinutes: number;
	    deepWorkMinutes: number;
	    deepWorkBlockCount: number;
	    shortSessionThresholdMinutes: number;
	    shortSessionCount: number;
	    fragmentationScore: number;
	    longestBreakMinutes: number;
	    medianBreakMinutes: number;
	    firstActiveAt?: string;
	    lastActiveAt?: string;
	    focusWindowStart?: string;
	    focusWindowEnd?: string;
	    weekdayHeatmap: HeatmapKpiPoint[];
	    hourlyHeatmap: HeatmapKpiPoint[];
	    consistencyScore: number;
	
	    static createFrom(source: any = {}) {
	        return new SessionKpiSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.activeDays = source["activeDays"];
	        this.currentStreakDays = source["currentStreakDays"];
	        this.longestStreakDays = source["longestStreakDays"];
	        this.rolling7DayAverageMinutes = source["rolling7DayAverageMinutes"];
	        this.rolling30DayAverageMinutes = source["rolling30DayAverageMinutes"];
	        this.previousPeriodDeltaPercent = source["previousPeriodDeltaPercent"];
	        this.bestDay = this.convertValues(source["bestDay"], TimeKpiPoint);
	        this.bestWeek = this.convertValues(source["bestWeek"], TimeKpiPoint);
	        this.bestMonth = this.convertValues(source["bestMonth"], TimeKpiPoint);
	        this.duration = this.convertValues(source["duration"], SessionDurationKpis);
	        this.deepWorkThresholdMinutes = source["deepWorkThresholdMinutes"];
	        this.deepWorkMinutes = source["deepWorkMinutes"];
	        this.deepWorkBlockCount = source["deepWorkBlockCount"];
	        this.shortSessionThresholdMinutes = source["shortSessionThresholdMinutes"];
	        this.shortSessionCount = source["shortSessionCount"];
	        this.fragmentationScore = source["fragmentationScore"];
	        this.longestBreakMinutes = source["longestBreakMinutes"];
	        this.medianBreakMinutes = source["medianBreakMinutes"];
	        this.firstActiveAt = source["firstActiveAt"];
	        this.lastActiveAt = source["lastActiveAt"];
	        this.focusWindowStart = source["focusWindowStart"];
	        this.focusWindowEnd = source["focusWindowEnd"];
	        this.weekdayHeatmap = this.convertValues(source["weekdayHeatmap"], HeatmapKpiPoint);
	        this.hourlyHeatmap = this.convertValues(source["hourlyHeatmap"], HeatmapKpiPoint);
	        this.consistencyScore = source["consistencyScore"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Session {
	    id: string;
	    date: string;
	    startTime: string;
	    endTime: string;
	    durationMinutes: number;
	    projectName: string;
	    language: string;
	    machineId: string;
	    machineName?: string;
	    sourceEventCount?: number;
	
	    static createFrom(source: any = {}) {
	        return new Session(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.date = source["date"];
	        this.startTime = source["startTime"];
	        this.endTime = source["endTime"];
	        this.durationMinutes = source["durationMinutes"];
	        this.projectName = source["projectName"];
	        this.language = source["language"];
	        this.machineId = source["machineId"];
	        this.machineName = source["machineName"];
	        this.sourceEventCount = source["sourceEventCount"];
	    }
	}
	export class MachineSummary {
	    machineId: string;
	    machineName: string;
	    osPlatform?: string;
	    totalMinutes: number;
	    sessionCount: number;
	    activeDays: number;
	    lastActiveAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new MachineSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machineId = source["machineId"];
	        this.machineName = source["machineName"];
	        this.osPlatform = source["osPlatform"];
	        this.totalMinutes = source["totalMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.activeDays = source["activeDays"];
	        this.lastActiveAt = source["lastActiveAt"];
	    }
	}
	export class LanguageSummary {
	    language: string;
	    totalMinutes: number;
	    sessionCount: number;
	    activeDays: number;
	    shareOfTotal: number;
	    lastActiveAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new LanguageSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.language = source["language"];
	        this.totalMinutes = source["totalMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.activeDays = source["activeDays"];
	        this.shareOfTotal = source["shareOfTotal"];
	        this.lastActiveAt = source["lastActiveAt"];
	    }
	}
	export class ProjectSummary {
	    projectName: string;
	    totalMinutes: number;
	    sessionCount: number;
	    activeDays: number;
	    shareOfTotal: number;
	    lastActiveAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new ProjectSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projectName = source["projectName"];
	        this.totalMinutes = source["totalMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.activeDays = source["activeDays"];
	        this.shareOfTotal = source["shareOfTotal"];
	        this.lastActiveAt = source["lastActiveAt"];
	    }
	}
	export class DailyTotalPoint {
	    date: string;
	    totalMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new DailyTotalPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.totalMinutes = source["totalMinutes"];
	    }
	}
	export class AnalyticsData {
	    rangeLabel: string;
	    totalMinutes: number;
	    activeDays: number;
	    sessionCount: number;
	    averageSessionMinutes: number;
	    longestDayMinutes: number;
	    previousPeriodMinutes?: number;
	    dailyTotals: DailyTotalPoint[];
	    projectSummaries: ProjectSummary[];
	    languageSummaries: LanguageSummary[];
	    machineSummaries: MachineSummary[];
	    recentSessions: Session[];
	    sessionKpis: SessionKpiSummary;
	    contextKpis: ContextKpiSummary;
	    eventKpis: EventActivityKpiSummary;
	    fileKpis: FileKpiSummary;
	    insightScores: InsightScoreSummary;
	
	    static createFrom(source: any = {}) {
	        return new AnalyticsData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rangeLabel = source["rangeLabel"];
	        this.totalMinutes = source["totalMinutes"];
	        this.activeDays = source["activeDays"];
	        this.sessionCount = source["sessionCount"];
	        this.averageSessionMinutes = source["averageSessionMinutes"];
	        this.longestDayMinutes = source["longestDayMinutes"];
	        this.previousPeriodMinutes = source["previousPeriodMinutes"];
	        this.dailyTotals = this.convertValues(source["dailyTotals"], DailyTotalPoint);
	        this.projectSummaries = this.convertValues(source["projectSummaries"], ProjectSummary);
	        this.languageSummaries = this.convertValues(source["languageSummaries"], LanguageSummary);
	        this.machineSummaries = this.convertValues(source["machineSummaries"], MachineSummary);
	        this.recentSessions = this.convertValues(source["recentSessions"], Session);
	        this.sessionKpis = this.convertValues(source["sessionKpis"], SessionKpiSummary);
	        this.contextKpis = this.convertValues(source["contextKpis"], ContextKpiSummary);
	        this.eventKpis = this.convertValues(source["eventKpis"], EventActivityKpiSummary);
	        this.fileKpis = this.convertValues(source["fileKpis"], FileKpiSummary);
	        this.insightScores = this.convertValues(source["insightScores"], InsightScoreSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AppBehaviorSettings {
	    launchOnStartup: boolean;
	    startMinimized: boolean;
	    minimizeToTray: boolean;
	    openOnSystemLogin: boolean;
	    enableMenubar: boolean;
	    menubarPreset: string;
	    showMenubarTimeline: boolean;
	    showMenubarSession: boolean;
	    loginLaunchMode: string;
	    rememberLastPage: boolean;
	    restoreLastDateRange: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AppBehaviorSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.launchOnStartup = source["launchOnStartup"];
	        this.startMinimized = source["startMinimized"];
	        this.minimizeToTray = source["minimizeToTray"];
	        this.openOnSystemLogin = source["openOnSystemLogin"];
	        this.enableMenubar = source["enableMenubar"];
	        this.menubarPreset = source["menubarPreset"];
	        this.showMenubarTimeline = source["showMenubarTimeline"];
	        this.showMenubarSession = source["showMenubarSession"];
	        this.loginLaunchMode = source["loginLaunchMode"];
	        this.rememberLastPage = source["rememberLastPage"];
	        this.restoreLastDateRange = source["restoreLastDateRange"];
	    }
	}
	
	export class CalendarDayData {
	    date: string;
	    totalMinutes: number;
	    sessionCount: number;
	    averageSessionMinutes: number;
	    firstActiveAt?: string;
	    lastActiveAt?: string;
	    topProject?: string;
	    topLanguage?: string;
	    projectBreakdown: ProjectSummary[];
	    machineBreakdown: MachineSummary[];
	    sessions: Session[];
	    hadActivity: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CalendarDayData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.totalMinutes = source["totalMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.averageSessionMinutes = source["averageSessionMinutes"];
	        this.firstActiveAt = source["firstActiveAt"];
	        this.lastActiveAt = source["lastActiveAt"];
	        this.topProject = source["topProject"];
	        this.topLanguage = source["topLanguage"];
	        this.projectBreakdown = this.convertValues(source["projectBreakdown"], ProjectSummary);
	        this.machineBreakdown = this.convertValues(source["machineBreakdown"], MachineSummary);
	        this.sessions = this.convertValues(source["sessions"], Session);
	        this.hadActivity = source["hadActivity"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CalendarDaySummary {
	    date: string;
	    totalMinutes: number;
	    sessionCount: number;
	    topProject?: string;
	    topLanguage?: string;
	    machineCount: number;
	    hadActivity: boolean;
	
	    static createFrom(source: any = {}) {
	        return new CalendarDaySummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.totalMinutes = source["totalMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.topProject = source["topProject"];
	        this.topLanguage = source["topLanguage"];
	        this.machineCount = source["machineCount"];
	        this.hadActivity = source["hadActivity"];
	    }
	}
	export class CalendarMonthData {
	    month: string;
	    monthLabel: string;
	    days: CalendarDaySummary[];
	
	    static createFrom(source: any = {}) {
	        return new CalendarMonthData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.month = source["month"];
	        this.monthLabel = source["monthLabel"];
	        this.days = this.convertValues(source["days"], CalendarDaySummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	export class DataStorageInfo {
	    localDataPath: string;
	    databaseStatus: string;
	    lastProcessedAt?: string;
	    pendingEventCount?: number;
	
	    static createFrom(source: any = {}) {
	        return new DataStorageInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.localDataPath = source["localDataPath"];
	        this.databaseStatus = source["databaseStatus"];
	        this.lastProcessedAt = source["lastProcessedAt"];
	        this.pendingEventCount = source["pendingEventCount"];
	    }
	}
	
	
	export class ExclusionsSettings {
	    folders: string[];
	    projectNames: string[];
	    workspacePatterns: string[];
	    fileExtensions: string[];
	    machines: string[];
	
	    static createFrom(source: any = {}) {
	        return new ExclusionsSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.folders = source["folders"];
	        this.projectNames = source["projectNames"];
	        this.workspacePatterns = source["workspacePatterns"];
	        this.fileExtensions = source["fileExtensions"];
	        this.machines = source["machines"];
	    }
	}
	export class ExtensionEffectiveSettings {
	    trackingEnabled: boolean;
	    idleDetectionEnabled: boolean;
	    idleTimeoutMinutes: number;
	    sessionMergeThresholdMinutes: number;
	    localOnlyMode: boolean;
	    filePathMode: string;
	    exclusions: ExclusionsSettings;
	    autoConnect: boolean;
	    sendHeartbeatEvents: boolean;
	    heartbeatIntervalSeconds: number;
	    sendProjectMetadata: boolean;
	    sendLanguageMetadata: boolean;
	    sendMachineAttribution: boolean;
	    respectDesktopExclusions: boolean;
	    bufferEventsWhenOffline: boolean;
	    retryConnectionAutomatically: boolean;
	    trackOnlyWhenFocused: boolean;
	    trackFileOpenEvents: boolean;
	    trackSaveEvents: boolean;
	    trackEditEvents: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ExtensionEffectiveSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.trackingEnabled = source["trackingEnabled"];
	        this.idleDetectionEnabled = source["idleDetectionEnabled"];
	        this.idleTimeoutMinutes = source["idleTimeoutMinutes"];
	        this.sessionMergeThresholdMinutes = source["sessionMergeThresholdMinutes"];
	        this.localOnlyMode = source["localOnlyMode"];
	        this.filePathMode = source["filePathMode"];
	        this.exclusions = this.convertValues(source["exclusions"], ExclusionsSettings);
	        this.autoConnect = source["autoConnect"];
	        this.sendHeartbeatEvents = source["sendHeartbeatEvents"];
	        this.heartbeatIntervalSeconds = source["heartbeatIntervalSeconds"];
	        this.sendProjectMetadata = source["sendProjectMetadata"];
	        this.sendLanguageMetadata = source["sendLanguageMetadata"];
	        this.sendMachineAttribution = source["sendMachineAttribution"];
	        this.respectDesktopExclusions = source["respectDesktopExclusions"];
	        this.bufferEventsWhenOffline = source["bufferEventsWhenOffline"];
	        this.retryConnectionAutomatically = source["retryConnectionAutomatically"];
	        this.trackOnlyWhenFocused = source["trackOnlyWhenFocused"];
	        this.trackFileOpenEvents = source["trackFileOpenEvents"];
	        this.trackSaveEvents = source["trackSaveEvents"];
	        this.trackEditEvents = source["trackEditEvents"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExtensionStatusReport {
	    pendingEventCount?: number;
	    oldestPendingEventAt?: string;
	    quarantinedEventCount?: number;
	    outboxSizeBytes?: number;
	    lastSuccessfulSyncAt?: string;
	    desktopInstanceSeen?: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtensionStatusReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pendingEventCount = source["pendingEventCount"];
	        this.oldestPendingEventAt = source["oldestPendingEventAt"];
	        this.quarantinedEventCount = source["quarantinedEventCount"];
	        this.outboxSizeBytes = source["outboxSizeBytes"];
	        this.lastSuccessfulSyncAt = source["lastSuccessfulSyncAt"];
	        this.desktopInstanceSeen = source["desktopInstanceSeen"];
	    }
	}
	export class ExtensionInfo {
	    editor: string;
	    editorVersion?: string;
	    extensionVersion?: string;
	    statusReport?: ExtensionStatusReport;
	
	    static createFrom(source: any = {}) {
	        return new ExtensionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.editor = source["editor"];
	        this.editorVersion = source["editorVersion"];
	        this.extensionVersion = source["extensionVersion"];
	        this.statusReport = this.convertValues(source["statusReport"], ExtensionStatusReport);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExtensionSettings {
	    autoConnect: boolean;
	    sendHeartbeatEvents: boolean;
	    heartbeatIntervalSeconds: number;
	    sendProjectMetadata: boolean;
	    sendLanguageMetadata: boolean;
	    sendMachineAttribution: boolean;
	    respectDesktopExclusions: boolean;
	    bufferEventsWhenOffline: boolean;
	    retryConnectionAutomatically: boolean;
	    trackOnlyWhenFocused: boolean;
	    trackFileOpenEvents: boolean;
	    trackSaveEvents: boolean;
	    trackEditEvents: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ExtensionSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.autoConnect = source["autoConnect"];
	        this.sendHeartbeatEvents = source["sendHeartbeatEvents"];
	        this.heartbeatIntervalSeconds = source["heartbeatIntervalSeconds"];
	        this.sendProjectMetadata = source["sendProjectMetadata"];
	        this.sendLanguageMetadata = source["sendLanguageMetadata"];
	        this.sendMachineAttribution = source["sendMachineAttribution"];
	        this.respectDesktopExclusions = source["respectDesktopExclusions"];
	        this.bufferEventsWhenOffline = source["bufferEventsWhenOffline"];
	        this.retryConnectionAutomatically = source["retryConnectionAutomatically"];
	        this.trackOnlyWhenFocused = source["trackOnlyWhenFocused"];
	        this.trackFileOpenEvents = source["trackFileOpenEvents"];
	        this.trackSaveEvents = source["trackSaveEvents"];
	        this.trackEditEvents = source["trackEditEvents"];
	    }
	}
	export class ExtensionStatus {
	    installed: boolean;
	    connected: boolean;
	    editor: string;
	    editorVersion?: string;
	    extensionVersion?: string;
	    lastEventAt?: string;
	    lastHandshakeAt?: string;
	    pendingEventCount?: number;
	    oldestPendingEventAt?: string;
	    quarantinedEventCount?: number;
	    outboxSizeBytes?: number;
	    lastSuccessfulSyncAt?: string;
	    desktopInstanceSeen?: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtensionStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.installed = source["installed"];
	        this.connected = source["connected"];
	        this.editor = source["editor"];
	        this.editorVersion = source["editorVersion"];
	        this.extensionVersion = source["extensionVersion"];
	        this.lastEventAt = source["lastEventAt"];
	        this.lastHandshakeAt = source["lastHandshakeAt"];
	        this.pendingEventCount = source["pendingEventCount"];
	        this.oldestPendingEventAt = source["oldestPendingEventAt"];
	        this.quarantinedEventCount = source["quarantinedEventCount"];
	        this.outboxSizeBytes = source["outboxSizeBytes"];
	        this.lastSuccessfulSyncAt = source["lastSuccessfulSyncAt"];
	        this.desktopInstanceSeen = source["desktopInstanceSeen"];
	    }
	}
	
	
	
	
	
	
	export class GeneralSettings {
	    machineDisplayName: string;
	    defaultDateRange: string;
	    timeFormat: string;
	    themeMode: string;
	    weekStartsOn: string;
	    preferredLandingPage: string;
	
	    static createFrom(source: any = {}) {
	        return new GeneralSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machineDisplayName = source["machineDisplayName"];
	        this.defaultDateRange = source["defaultDateRange"];
	        this.timeFormat = source["timeFormat"];
	        this.themeMode = source["themeMode"];
	        this.weekStartsOn = source["weekStartsOn"];
	        this.preferredLandingPage = source["preferredLandingPage"];
	    }
	}
	
	export class IngestEventResult {
	    eventId: string;
	    status: string;
	    code: string;
	    message?: string;
	
	    static createFrom(source: any = {}) {
	        return new IngestEventResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.eventId = source["eventId"];
	        this.status = source["status"];
	        this.code = source["code"];
	        this.message = source["message"];
	    }
	}
	export class MachineInfo {
	    machineId: string;
	    machineName: string;
	    hostname?: string;
	    osPlatform: string;
	    osVersion?: string;
	    arch?: string;
	
	    static createFrom(source: any = {}) {
	        return new MachineInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machineId = source["machineId"];
	        this.machineName = source["machineName"];
	        this.hostname = source["hostname"];
	        this.osPlatform = source["osPlatform"];
	        this.osVersion = source["osVersion"];
	        this.arch = source["arch"];
	    }
	}
	export class IngestEventsRequest {
	    machine: MachineInfo;
	    extension: ExtensionInfo;
	    events: ActivityEvent[];
	
	    static createFrom(source: any = {}) {
	        return new IngestEventsRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machine = this.convertValues(source["machine"], MachineInfo);
	        this.extension = this.convertValues(source["extension"], ExtensionInfo);
	        this.events = this.convertValues(source["events"], ActivityEvent);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IngestEventsResponse {
	    acceptedCount: number;
	    rejectedCount: number;
	    warnings?: string[];
	    results: IngestEventResult[];
	    serverTimestamp: string;
	
	    static createFrom(source: any = {}) {
	        return new IngestEventsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.acceptedCount = source["acceptedCount"];
	        this.rejectedCount = source["rejectedCount"];
	        this.warnings = source["warnings"];
	        this.results = this.convertValues(source["results"], IngestEventResult);
	        this.serverTimestamp = source["serverTimestamp"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class IngestionStats {
	    totalAcceptedEvents: number;
	    totalRejectedEvents: number;
	    knownMachineCount: number;
	    lastIngestedAt?: string;
	    lastEventAt?: string;
	    lastMachineSeen?: string;
	
	    static createFrom(source: any = {}) {
	        return new IngestionStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalAcceptedEvents = source["totalAcceptedEvents"];
	        this.totalRejectedEvents = source["totalRejectedEvents"];
	        this.knownMachineCount = source["knownMachineCount"];
	        this.lastIngestedAt = source["lastIngestedAt"];
	        this.lastEventAt = source["lastEventAt"];
	        this.lastMachineSeen = source["lastMachineSeen"];
	    }
	}
	
	
	
	
	export class MachineFreshnessBucket {
	    bucket: string;
	    machineCount: number;
	
	    static createFrom(source: any = {}) {
	        return new MachineFreshnessBucket(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bucket = source["bucket"];
	        this.machineCount = source["machineCount"];
	    }
	}
	
	
	
	export class WeeklyTrendPoint {
	    date: string;
	    totalMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new WeeklyTrendPoint(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.totalMinutes = source["totalMinutes"];
	    }
	}
	export class OverviewData {
	    todayMinutes: number;
	    weekMinutes: number;
	    sessionCount: number;
	    averageSessionMinutes: number;
	    codingDaysThisWeek: number;
	    lastActiveAt?: string;
	    topProjects: ProjectSummary[];
	    topLanguages: LanguageSummary[];
	    recentSessions: Session[];
	    weeklyTrend: WeeklyTrendPoint[];
	    activeHoursSummary: string;
	    trackingEnabled: boolean;
	    localOnlyMode: boolean;
	    currentMachine?: MachineInfo;
	    lastUpdatedAt: string;
	
	    static createFrom(source: any = {}) {
	        return new OverviewData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.todayMinutes = source["todayMinutes"];
	        this.weekMinutes = source["weekMinutes"];
	        this.sessionCount = source["sessionCount"];
	        this.averageSessionMinutes = source["averageSessionMinutes"];
	        this.codingDaysThisWeek = source["codingDaysThisWeek"];
	        this.lastActiveAt = source["lastActiveAt"];
	        this.topProjects = this.convertValues(source["topProjects"], ProjectSummary);
	        this.topLanguages = this.convertValues(source["topLanguages"], LanguageSummary);
	        this.recentSessions = this.convertValues(source["recentSessions"], Session);
	        this.weeklyTrend = this.convertValues(source["weeklyTrend"], WeeklyTrendPoint);
	        this.activeHoursSummary = source["activeHoursSummary"];
	        this.trackingEnabled = source["trackingEnabled"];
	        this.localOnlyMode = source["localOnlyMode"];
	        this.currentMachine = this.convertValues(source["currentMachine"], MachineInfo);
	        this.lastUpdatedAt = source["lastUpdatedAt"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PrivacySettings {
	    localOnlyMode: boolean;
	    filePathMode: string;
	    showMachineNames: boolean;
	    showHostname: boolean;
	    obfuscateProjectNames: boolean;
	    sensitiveProjectNames: string[];
	    minimizeExtensionMetadata: boolean;
	    fileMetricsEnabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new PrivacySettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.localOnlyMode = source["localOnlyMode"];
	        this.filePathMode = source["filePathMode"];
	        this.showMachineNames = source["showMachineNames"];
	        this.showHostname = source["showHostname"];
	        this.obfuscateProjectNames = source["obfuscateProjectNames"];
	        this.sensitiveProjectNames = source["sensitiveProjectNames"];
	        this.minimizeExtensionMetadata = source["minimizeExtensionMetadata"];
	        this.fileMetricsEnabled = source["fileMetricsEnabled"];
	    }
	}
	
	
	
	
	export class ProjectsPageData {
	    rangeLabel: string;
	    projects: ProjectSummary[];
	
	    static createFrom(source: any = {}) {
	        return new ProjectsPageData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rangeLabel = source["rangeLabel"];
	        this.projects = this.convertValues(source["projects"], ProjectSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class TrackingCoverageGap {
	    startDate: string;
	    endDate: string;
	    durationDays: number;
	
	    static createFrom(source: any = {}) {
	        return new TrackingCoverageGap(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	        this.durationDays = source["durationDays"];
	    }
	}
	export class SyncLatencyStats {
	    sampleSize: number;
	    medianSeconds: number;
	    p90Seconds: number;
	
	    static createFrom(source: any = {}) {
	        return new SyncLatencyStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sampleSize = source["sampleSize"];
	        this.medianSeconds = source["medianSeconds"];
	        this.p90Seconds = source["p90Seconds"];
	    }
	}
	export class ReliabilityKpiSummary {
	    status: string;
	    pendingEventCount: number;
	    bufferedTimeWindowMinutes: number;
	    oldestPendingEventAt?: string;
	    quarantinedEventCount: number;
	    runtimeRejectedEventCount: number;
	    duplicateEventCount: number;
	    duplicateCountAvailable: boolean;
	    duplicateEventRate: number;
	    rejectedEventRate: number;
	    totalAcceptedEvents: number;
	    syncLatency: SyncLatencyStats;
	    acceptedEventTrend: AcceptedEventTrendPoint[];
	    trackingCoverageGaps: TrackingCoverageGap[];
	    lastIngestedAt?: string;
	    lastSuccessfulSyncAt?: string;
	    lastHandshakeAt?: string;
	    lastEventAt?: string;
	    lastSessionRebuildAt?: string;
	    machineFreshness: MachineFreshnessBucket[];
	
	    static createFrom(source: any = {}) {
	        return new ReliabilityKpiSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.pendingEventCount = source["pendingEventCount"];
	        this.bufferedTimeWindowMinutes = source["bufferedTimeWindowMinutes"];
	        this.oldestPendingEventAt = source["oldestPendingEventAt"];
	        this.quarantinedEventCount = source["quarantinedEventCount"];
	        this.runtimeRejectedEventCount = source["runtimeRejectedEventCount"];
	        this.duplicateEventCount = source["duplicateEventCount"];
	        this.duplicateCountAvailable = source["duplicateCountAvailable"];
	        this.duplicateEventRate = source["duplicateEventRate"];
	        this.rejectedEventRate = source["rejectedEventRate"];
	        this.totalAcceptedEvents = source["totalAcceptedEvents"];
	        this.syncLatency = this.convertValues(source["syncLatency"], SyncLatencyStats);
	        this.acceptedEventTrend = this.convertValues(source["acceptedEventTrend"], AcceptedEventTrendPoint);
	        this.trackingCoverageGaps = this.convertValues(source["trackingCoverageGaps"], TrackingCoverageGap);
	        this.lastIngestedAt = source["lastIngestedAt"];
	        this.lastSuccessfulSyncAt = source["lastSuccessfulSyncAt"];
	        this.lastHandshakeAt = source["lastHandshakeAt"];
	        this.lastEventAt = source["lastEventAt"];
	        this.lastSessionRebuildAt = source["lastSessionRebuildAt"];
	        this.machineFreshness = this.convertValues(source["machineFreshness"], MachineFreshnessBucket);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	export class SessionRebuildResult {
	    processedEventCount: number;
	    createdSessionCount: number;
	    startDate: string;
	    endDate: string;
	    rebuiltAt: string;
	
	    static createFrom(source: any = {}) {
	        return new SessionRebuildResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.processedEventCount = source["processedEventCount"];
	        this.createdSessionCount = source["createdSessionCount"];
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	        this.rebuiltAt = source["rebuiltAt"];
	    }
	}
	export class SessionStats {
	    totalSessions: number;
	    averageSessionMinutes: number;
	    longestSessionMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new SessionStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalSessions = source["totalSessions"];
	        this.averageSessionMinutes = source["averageSessionMinutes"];
	        this.longestSessionMinutes = source["longestSessionMinutes"];
	    }
	}
	export class SessionsPageData {
	    rangeLabel: string;
	    totalSessions: number;
	    averageSessionMinutes: number;
	    longestSessionMinutes: number;
	    sessions: Session[];
	
	    static createFrom(source: any = {}) {
	        return new SessionsPageData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.rangeLabel = source["rangeLabel"];
	        this.totalSessions = source["totalSessions"];
	        this.averageSessionMinutes = source["averageSessionMinutes"];
	        this.longestSessionMinutes = source["longestSessionMinutes"];
	        this.sessions = this.convertValues(source["sessions"], Session);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SystemInfo {
	    machineId: string;
	    machineName: string;
	    hostname?: string;
	    osPlatform: string;
	    osVersion?: string;
	    arch?: string;
	    editor: string;
	    editorVersion?: string;
	    appVersion?: string;
	    extensionVersion?: string;
	    lastSeenAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new SystemInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.machineId = source["machineId"];
	        this.machineName = source["machineName"];
	        this.hostname = source["hostname"];
	        this.osPlatform = source["osPlatform"];
	        this.osVersion = source["osVersion"];
	        this.arch = source["arch"];
	        this.editor = source["editor"];
	        this.editorVersion = source["editorVersion"];
	        this.appVersion = source["appVersion"];
	        this.extensionVersion = source["extensionVersion"];
	        this.lastSeenAt = source["lastSeenAt"];
	    }
	}
	export class TrackingSettings {
	    trackingEnabled: boolean;
	    idleDetectionEnabled: boolean;
	    trackProjectActivity: boolean;
	    trackLanguageActivity: boolean;
	    trackMachineAttribution: boolean;
	    trackSessionBoundaries: boolean;
	    idleTimeoutMinutes: number;
	    sessionMergeThresholdMinutes: number;
	    deepWorkThresholdMinutes: number;
	
	    static createFrom(source: any = {}) {
	        return new TrackingSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.trackingEnabled = source["trackingEnabled"];
	        this.idleDetectionEnabled = source["idleDetectionEnabled"];
	        this.trackProjectActivity = source["trackProjectActivity"];
	        this.trackLanguageActivity = source["trackLanguageActivity"];
	        this.trackMachineAttribution = source["trackMachineAttribution"];
	        this.trackSessionBoundaries = source["trackSessionBoundaries"];
	        this.idleTimeoutMinutes = source["idleTimeoutMinutes"];
	        this.sessionMergeThresholdMinutes = source["sessionMergeThresholdMinutes"];
	        this.deepWorkThresholdMinutes = source["deepWorkThresholdMinutes"];
	    }
	}
	export class SettingsData {
	    general: GeneralSettings;
	    privacy: PrivacySettings;
	    tracking: TrackingSettings;
	    exclusions: ExclusionsSettings;
	    extension: ExtensionSettings;
	    extensionStatus: ExtensionStatus;
	    extensionStatuses: ExtensionStatus[];
	    system: SystemInfo;
	    appBehavior: AppBehaviorSettings;
	    dataStorage: DataStorageInfo;
	    about: AboutInfo;
	    reliability: ReliabilityKpiSummary;
	
	    static createFrom(source: any = {}) {
	        return new SettingsData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.general = this.convertValues(source["general"], GeneralSettings);
	        this.privacy = this.convertValues(source["privacy"], PrivacySettings);
	        this.tracking = this.convertValues(source["tracking"], TrackingSettings);
	        this.exclusions = this.convertValues(source["exclusions"], ExclusionsSettings);
	        this.extension = this.convertValues(source["extension"], ExtensionSettings);
	        this.extensionStatus = this.convertValues(source["extensionStatus"], ExtensionStatus);
	        this.extensionStatuses = this.convertValues(source["extensionStatuses"], ExtensionStatus);
	        this.system = this.convertValues(source["system"], SystemInfo);
	        this.appBehavior = this.convertValues(source["appBehavior"], AppBehaviorSettings);
	        this.dataStorage = this.convertValues(source["dataStorage"], DataStorageInfo);
	        this.about = this.convertValues(source["about"], AboutInfo);
	        this.reliability = this.convertValues(source["reliability"], ReliabilityKpiSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	
	
	
	

}

export namespace main {
	
	export class FreshInstallStatus {
	    bridgeInstalled: boolean;
	    bridgePath?: string;
	    pluginInstalled: boolean;
	    pluginPath?: string;
	    pluginVersion: string;
	    bridgeVersion: string;
	
	    static createFrom(source: any = {}) {
	        return new FreshInstallStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.bridgeInstalled = source["bridgeInstalled"];
	        this.bridgePath = source["bridgePath"];
	        this.pluginInstalled = source["pluginInstalled"];
	        this.pluginPath = source["pluginPath"];
	        this.pluginVersion = source["pluginVersion"];
	        this.bridgeVersion = source["bridgeVersion"];
	    }
	}
	export class autostartRegistrationStatus {
	    enabled: boolean;
	    platform: string;
	    mechanism: string;
	    location: string;
	
	    static createFrom(source: any = {}) {
	        return new autostartRegistrationStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.platform = source["platform"];
	        this.mechanism = source["mechanism"];
	        this.location = source["location"];
	    }
	}

}

export namespace storage {
	
	export class MigrationStatus {
	    currentVersion: string;
	    appliedMigrationCount: number;
	    pendingMigrationCount: number;
	    appliedVersions: string[];
	
	    static createFrom(source: any = {}) {
	        return new MigrationStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.currentVersion = source["currentVersion"];
	        this.appliedMigrationCount = source["appliedMigrationCount"];
	        this.pendingMigrationCount = source["pendingMigrationCount"];
	        this.appliedVersions = source["appliedVersions"];
	    }
	}

}

export namespace transfer {
	
	export class ExportResult {
	    filePath?: string;
	    cancelled: boolean;
	    machineCount: number;
	    eventCount: number;
	    sessionCount: number;
	    startDate?: string;
	    endDate?: string;
	
	    static createFrom(source: any = {}) {
	        return new ExportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.cancelled = source["cancelled"];
	        this.machineCount = source["machineCount"];
	        this.eventCount = source["eventCount"];
	        this.sessionCount = source["sessionCount"];
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	    }
	}
	export class ImportPreview {
	    filePath?: string;
	    cancelled: boolean;
	    formatVersion: number;
	    legacyFormat: boolean;
	    exportedAt?: string;
	    appVersion?: string;
	    sourceDesktopInstanceId?: string;
	    machineCount: number;
	    eventCount: number;
	    validEventCount: number;
	    newEventCount: number;
	    duplicateEventCount: number;
	    conflictingEventCount: number;
	    invalidEventCount: number;
	    sessionCount: number;
	    newSessionCount: number;
	    duplicateSessionCount: number;
	    conflictingSessionCount: number;
	    invalidSessionCount: number;
	    startDate?: string;
	    endDate?: string;
	    affectedStartDate?: string;
	    affectedEndDate?: string;
	    canImport: boolean;
	    willRebuildSessions: boolean;
	    willUseSessionFallback: boolean;
	    warnings?: string[];
	
	    static createFrom(source: any = {}) {
	        return new ImportPreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.cancelled = source["cancelled"];
	        this.formatVersion = source["formatVersion"];
	        this.legacyFormat = source["legacyFormat"];
	        this.exportedAt = source["exportedAt"];
	        this.appVersion = source["appVersion"];
	        this.sourceDesktopInstanceId = source["sourceDesktopInstanceId"];
	        this.machineCount = source["machineCount"];
	        this.eventCount = source["eventCount"];
	        this.validEventCount = source["validEventCount"];
	        this.newEventCount = source["newEventCount"];
	        this.duplicateEventCount = source["duplicateEventCount"];
	        this.conflictingEventCount = source["conflictingEventCount"];
	        this.invalidEventCount = source["invalidEventCount"];
	        this.sessionCount = source["sessionCount"];
	        this.newSessionCount = source["newSessionCount"];
	        this.duplicateSessionCount = source["duplicateSessionCount"];
	        this.conflictingSessionCount = source["conflictingSessionCount"];
	        this.invalidSessionCount = source["invalidSessionCount"];
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	        this.affectedStartDate = source["affectedStartDate"];
	        this.affectedEndDate = source["affectedEndDate"];
	        this.canImport = source["canImport"];
	        this.willRebuildSessions = source["willRebuildSessions"];
	        this.willUseSessionFallback = source["willUseSessionFallback"];
	        this.warnings = source["warnings"];
	    }
	}
	export class ImportResult {
	    filePath?: string;
	    cancelled: boolean;
	    formatVersion: number;
	    legacyFormat: boolean;
	    upsertedMachineCount: number;
	    insertedEventCount: number;
	    duplicateEventCount: number;
	    conflictingEventCount: number;
	    invalidEventCount: number;
	    insertedSessionCount: number;
	    duplicateSessionCount: number;
	    conflictingSessionCount: number;
	    invalidSessionCount: number;
	    rebuiltSessionCount: number;
	    affectedStartDate?: string;
	    affectedEndDate?: string;
	    warnings?: string[];
	
	    static createFrom(source: any = {}) {
	        return new ImportResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.cancelled = source["cancelled"];
	        this.formatVersion = source["formatVersion"];
	        this.legacyFormat = source["legacyFormat"];
	        this.upsertedMachineCount = source["upsertedMachineCount"];
	        this.insertedEventCount = source["insertedEventCount"];
	        this.duplicateEventCount = source["duplicateEventCount"];
	        this.conflictingEventCount = source["conflictingEventCount"];
	        this.invalidEventCount = source["invalidEventCount"];
	        this.insertedSessionCount = source["insertedSessionCount"];
	        this.duplicateSessionCount = source["duplicateSessionCount"];
	        this.conflictingSessionCount = source["conflictingSessionCount"];
	        this.invalidSessionCount = source["invalidSessionCount"];
	        this.rebuiltSessionCount = source["rebuiltSessionCount"];
	        this.affectedStartDate = source["affectedStartDate"];
	        this.affectedEndDate = source["affectedEndDate"];
	        this.warnings = source["warnings"];
	    }
	}

}

export namespace updates {
	
	export class CheckResult {
	    checkedAt: string;
	    currentVersion: string;
	    latestVersion: string;
	    updateAvailable: boolean;
	    releaseUrl: string;
	    assetUrl: string;
	    releaseNotes: string;
	    preRelease: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new CheckResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.checkedAt = source["checkedAt"];
	        this.currentVersion = source["currentVersion"];
	        this.latestVersion = source["latestVersion"];
	        this.updateAvailable = source["updateAvailable"];
	        this.releaseUrl = source["releaseUrl"];
	        this.assetUrl = source["assetUrl"];
	        this.releaseNotes = source["releaseNotes"];
	        this.preRelease = source["preRelease"];
	        this.error = source["error"];
	    }
	}

}

