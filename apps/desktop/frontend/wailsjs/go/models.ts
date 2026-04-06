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
	export class ExtensionInfo {
	    editor: string;
	    editorVersion?: string;
	    extensionVersion?: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtensionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.editor = source["editor"];
	        this.editorVersion = source["editorVersion"];
	        this.extensionVersion = source["extensionVersion"];
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
	    extensionVersion?: string;
	    lastEventAt?: string;
	    lastHandshakeAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new ExtensionStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.installed = source["installed"];
	        this.connected = source["connected"];
	        this.editor = source["editor"];
	        this.extensionVersion = source["extensionVersion"];
	        this.lastEventAt = source["lastEventAt"];
	        this.lastHandshakeAt = source["lastHandshakeAt"];
	    }
	}
	export class GeneralSettings {
	    machineDisplayName: string;
	    defaultDateRange: string;
	    timeFormat: string;
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
	        this.weekStartsOn = source["weekStartsOn"];
	        this.preferredLandingPage = source["preferredLandingPage"];
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
	    serverTimestamp: string;
	
	    static createFrom(source: any = {}) {
	        return new IngestEventsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.acceptedCount = source["acceptedCount"];
	        this.rejectedCount = source["rejectedCount"];
	        this.warnings = source["warnings"];
	        this.serverTimestamp = source["serverTimestamp"];
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
	    minimizeExtensionMetadata: boolean;
	
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
	        this.minimizeExtensionMetadata = source["minimizeExtensionMetadata"];
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
	    }
	}
	export class SettingsData {
	    general: GeneralSettings;
	    privacy: PrivacySettings;
	    tracking: TrackingSettings;
	    exclusions: ExclusionsSettings;
	    extension: ExtensionSettings;
	    extensionStatus: ExtensionStatus;
	    system: SystemInfo;
	    appBehavior: AppBehaviorSettings;
	    dataStorage: DataStorageInfo;
	    about: AboutInfo;
	
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
	        this.system = this.convertValues(source["system"], SystemInfo);
	        this.appBehavior = this.convertValues(source["appBehavior"], AppBehaviorSettings);
	        this.dataStorage = this.convertValues(source["dataStorage"], DataStorageInfo);
	        this.about = this.convertValues(source["about"], AboutInfo);
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

