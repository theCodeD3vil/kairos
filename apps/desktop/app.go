package main

import (
	"context"
	"fmt"
	"log"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/ingestion"
	desktopserver "github.com/michaelnji/kairos/apps/desktop/internal/server"
	"github.com/michaelnji/kairos/apps/desktop/internal/sessionization"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
	"github.com/michaelnji/kairos/apps/desktop/internal/views"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const dataChangedEventName = "kairos:data-changed"

// App is the root Wails binding for desktop lifecycle wiring.
type App struct {
	ctx              context.Context
	initErr          error
	sqliteStore      *storage.Store
	localServer      *desktopserver.LocalServer
	ingestionService ingestion.Service
	sessionService   sessionization.Service
	viewService      views.Service
	settingsService  desktopsettings.Service
}

// NewApp creates the app scaffold.
func NewApp() *App {
	settingsService := desktopsettings.NewService(nil)
	app := &App{
		settingsService: settingsService,
	}
	sqliteStore, err := storage.OpenDefault(context.Background())
	if err != nil {
		log.Printf("app: backend initialization failed: %v", err)
		return &App{
			initErr:         fmt.Errorf("initialize sqlite store: %w", err),
			viewService:     views.NewStubService(),
			settingsService: settingsService,
		}
	}

	settingsService = desktopsettings.NewService(sqliteStore)
	settingsService.SetDataStorageInfo(sqliteStore.Path(), "ready")
	viewService := views.NewService(sqliteStore, settingsService)
	sessionService := sessionization.NewService(sqliteStore, settingsService)
	if err := ensureSessionsCurrent(context.Background(), sqliteStore, sessionService); err != nil {
		log.Printf("app: session warm-up failed: %v", err)
		_ = sqliteStore.Close()
		return &App{
			initErr:         fmt.Errorf("initialize session state: %w", err),
			viewService:     views.NewStubService(),
			settingsService: settingsService,
		}
	}
	ingestionService := ingestion.NewService(sqliteStore, settingsService, sessionService, func(kind string) {
		app.emitDataChanged(kind)
	})
	localServer, err := desktopserver.NewLocalServer(desktopserver.DefaultConfig(), ingestionService)
	if err != nil {
		log.Printf("app: local extension server initialization failed: %v", err)
		_ = sqliteStore.Close()
		return &App{
			initErr:         fmt.Errorf("initialize local extension server: %w", err),
			viewService:     views.NewStubService(),
			settingsService: settingsService,
		}
	}
	localServer.Start()

	app.sqliteStore = sqliteStore
	app.localServer = localServer
	app.ingestionService = ingestionService
	app.sessionService = sessionService
	app.viewService = viewService
	app.settingsService = settingsService

	return app
}

func ensureSessionsCurrent(ctx context.Context, sqliteStore *storage.Store, sessionService sessionization.Service) error {
	totalEvents, err := sqliteStore.CountAcceptedEvents(ctx)
	if err != nil {
		return fmt.Errorf("count accepted events: %w", err)
	}
	if totalEvents == 0 {
		return nil
	}

	totalSessions, err := sqliteStore.CountAllSessions(ctx)
	if err != nil {
		return fmt.Errorf("count sessions: %w", err)
	}
	if totalSessions == 0 {
		_, err := sessionService.RebuildAllSessions(ctx)
		if err != nil {
			return fmt.Errorf("rebuild all sessions from empty session store: %w", err)
		}
		return nil
	}

	lastEventAt, err := sqliteStore.GetLastEventTimestamp(ctx)
	if err != nil {
		return fmt.Errorf("get last event timestamp: %w", err)
	}
	lastSessionEndAt, err := sqliteStore.GetLastSessionEndTime(ctx)
	if err != nil {
		return fmt.Errorf("get last session end time: %w", err)
	}
	if lastEventAt == "" || lastSessionEndAt == "" || lastEventAt <= lastSessionEndAt {
		return nil
	}

	startDate := lastSessionEndAt[:10]
	endDate := lastEventAt[:10]
	_, err = sessionService.RebuildSessionsForRange(ctx, startDate, endDate)
	if err != nil {
		return fmt.Errorf("rebuild stale sessions for %s..%s: %w", startDate, endDate, err)
	}

	return nil
}

// startup stores the application context.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) shutdown(_ context.Context) {
	if a.localServer != nil {
		if err := a.localServer.Close(context.Background()); err != nil {
			log.Printf("app: local server shutdown error: %v", err)
		}
	}
	if a.sqliteStore != nil {
		if err := a.sqliteStore.Close(); err != nil {
			log.Printf("app: sqlite shutdown error: %v", err)
		}
	}
}

// Ping is a placeholder method for future desktop bindings.
func (a *App) Ping() string {
	return "kairos desktop scaffold"
}

func (a *App) IngestEvents(request contracts.IngestEventsRequest) (contracts.IngestEventsResponse, error) {
	if a.initErr != nil {
		return contracts.IngestEventsResponse{}, a.initErr
	}
	return a.ingestionService.IngestEvents(a.requestContext(), request)
}

func (a *App) GetOverviewData() (contracts.OverviewData, error) {
	if a.initErr != nil {
		return contracts.OverviewData{}, a.initErr
	}
	return a.viewService.GetOverviewData(a.requestContext())
}

func (a *App) GetAnalyticsData(rangeLabel string) (contracts.AnalyticsData, error) {
	if a.initErr != nil {
		return contracts.AnalyticsData{}, a.initErr
	}
	return a.viewService.GetAnalyticsData(a.requestContext(), rangeLabel)
}

func (a *App) GetCalendarMonthData(month string) (contracts.CalendarMonthData, error) {
	if a.initErr != nil {
		return contracts.CalendarMonthData{}, a.initErr
	}
	return a.viewService.GetCalendarMonthData(a.requestContext(), month)
}

func (a *App) GetCalendarDayData(date string) (contracts.CalendarDayData, error) {
	if a.initErr != nil {
		return contracts.CalendarDayData{}, a.initErr
	}
	return a.viewService.GetCalendarDayData(a.requestContext(), date)
}

func (a *App) GetProjectsPageData(rangeLabel string) (contracts.ProjectsPageData, error) {
	if a.initErr != nil {
		return contracts.ProjectsPageData{}, a.initErr
	}
	return a.viewService.GetProjectsPageData(a.requestContext(), rangeLabel)
}

func (a *App) GetSessionsPageData(rangeLabel string) (contracts.SessionsPageData, error) {
	if a.initErr != nil {
		return contracts.SessionsPageData{}, a.initErr
	}
	return a.viewService.GetSessionsPageData(a.requestContext(), rangeLabel)
}

func (a *App) GetSettingsData() (contracts.SettingsData, error) {
	if a.initErr != nil {
		return contracts.SettingsData{}, a.initErr
	}
	return a.settingsService.GetSettingsData(a.requestContext())
}

func (a *App) UpdateSettingsData(data contracts.SettingsData) (contracts.SettingsData, error) {
	if a.initErr != nil {
		return contracts.SettingsData{}, a.initErr
	}
	updated, err := a.settingsService.UpdateSettingsData(a.requestContext(), data)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) UpdateGeneralSettings(data contracts.GeneralSettings) (contracts.GeneralSettings, error) {
	if a.initErr != nil {
		return contracts.GeneralSettings{}, a.initErr
	}
	updated, err := a.settingsService.UpdateGeneralSettings(a.requestContext(), data)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) UpdatePrivacySettings(data contracts.PrivacySettings) (contracts.PrivacySettings, error) {
	if a.initErr != nil {
		return contracts.PrivacySettings{}, a.initErr
	}
	updated, err := a.settingsService.UpdatePrivacySettings(a.requestContext(), data)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) UpdateTrackingSettings(data contracts.TrackingSettings) (contracts.TrackingSettings, error) {
	if a.initErr != nil {
		return contracts.TrackingSettings{}, a.initErr
	}
	updated, err := a.settingsService.UpdateTrackingSettings(a.requestContext(), data)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) UpdateExclusionsSettings(data contracts.ExclusionsSettings) (contracts.ExclusionsSettings, error) {
	if a.initErr != nil {
		return contracts.ExclusionsSettings{}, a.initErr
	}
	updated, err := a.settingsService.UpdateExclusionsSettings(a.requestContext(), data)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) UpdateExtensionSettings(data contracts.ExtensionSettings) (contracts.ExtensionSettings, error) {
	if a.initErr != nil {
		return contracts.ExtensionSettings{}, a.initErr
	}
	updated, err := a.settingsService.UpdateExtensionSettings(a.requestContext(), data)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) UpdateAppBehaviorSettings(data contracts.AppBehaviorSettings) (contracts.AppBehaviorSettings, error) {
	if a.initErr != nil {
		return contracts.AppBehaviorSettings{}, a.initErr
	}
	updated, err := a.settingsService.UpdateAppBehaviorSettings(a.requestContext(), data)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) ResetSettingsSection(section string) (contracts.SettingsData, error) {
	if a.initErr != nil {
		return contracts.SettingsData{}, a.initErr
	}
	updated, err := a.settingsService.ResetSettingsSection(a.requestContext(), section)
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) GetExtensionEffectiveSettings() (contracts.ExtensionEffectiveSettings, error) {
	if a.initErr != nil {
		return contracts.ExtensionEffectiveSettings{}, a.initErr
	}
	return a.settingsService.GetExtensionEffectiveSettings(a.requestContext())
}

func (a *App) GetExtensionStatus() (contracts.ExtensionStatus, error) {
	if a.initErr != nil {
		return contracts.ExtensionStatus{}, a.initErr
	}
	return a.ingestionService.GetExtensionStatus(a.requestContext())
}

func (a *App) GetSystemInfo() (contracts.SystemInfo, error) {
	if a.initErr != nil {
		return contracts.SystemInfo{}, a.initErr
	}
	return a.settingsService.GetSystemInfo(a.requestContext())
}

func (a *App) ListKnownMachines() ([]contracts.MachineInfo, error) {
	if a.initErr != nil {
		return nil, a.initErr
	}
	return a.ingestionService.ListKnownMachines(a.requestContext())
}

func (a *App) ListRecentEvents(limit int) ([]contracts.ActivityEvent, error) {
	if a.initErr != nil {
		return nil, a.initErr
	}
	return a.ingestionService.ListRecentEvents(a.requestContext(), limit)
}

func (a *App) GetIngestionStats() (contracts.IngestionStats, error) {
	if a.initErr != nil {
		return contracts.IngestionStats{}, a.initErr
	}
	return a.ingestionService.GetIngestionStats(a.requestContext())
}

func (a *App) GetMigrationStatus() (storage.MigrationStatus, error) {
	if a.initErr != nil {
		return storage.MigrationStatus{}, a.initErr
	}
	return a.sqliteStore.GetMigrationStatus(a.requestContext())
}

func (a *App) RebuildAllSessions() (contracts.SessionRebuildResult, error) {
	if a.initErr != nil {
		return contracts.SessionRebuildResult{}, a.initErr
	}
	result, err := a.sessionService.RebuildAllSessions(a.requestContext())
	if err == nil {
		a.emitDataChanged("sessions")
	}
	return result, err
}

func (a *App) RebuildSessionsForDate(date string) (contracts.SessionRebuildResult, error) {
	if a.initErr != nil {
		return contracts.SessionRebuildResult{}, a.initErr
	}
	result, err := a.sessionService.RebuildSessionsForDate(a.requestContext(), date)
	if err == nil {
		a.emitDataChanged("sessions")
	}
	return result, err
}

func (a *App) RebuildSessionsForRange(startDate string, endDate string) (contracts.SessionRebuildResult, error) {
	if a.initErr != nil {
		return contracts.SessionRebuildResult{}, a.initErr
	}
	result, err := a.sessionService.RebuildSessionsForRange(a.requestContext(), startDate, endDate)
	if err == nil {
		a.emitDataChanged("sessions")
	}
	return result, err
}

func (a *App) ListRecentSessions(limit int) ([]contracts.Session, error) {
	if a.initErr != nil {
		return nil, a.initErr
	}
	return a.sessionService.ListRecentSessions(a.requestContext(), limit)
}

func (a *App) ListSessionsForDate(date string) ([]contracts.Session, error) {
	if a.initErr != nil {
		return nil, a.initErr
	}
	return a.sessionService.ListSessionsForDate(a.requestContext(), date)
}

func (a *App) ListSessionsForRange(startDate string, endDate string) ([]contracts.Session, error) {
	if a.initErr != nil {
		return nil, a.initErr
	}
	return a.sessionService.ListSessionsForRange(a.requestContext(), startDate, endDate)
}

func (a *App) GetSessionStatsForRange(startDate string, endDate string) (contracts.SessionStats, error) {
	if a.initErr != nil {
		return contracts.SessionStats{}, a.initErr
	}
	return a.sessionService.GetSessionStatsForRange(a.requestContext(), startDate, endDate)
}

func (a *App) requestContext() context.Context {
	if a.ctx != nil {
		return a.ctx
	}

	return context.Background()
}

func (a *App) emitDataChanged(kind string) {
	if a.ctx == nil {
		return
	}

	runtime.EventsEmit(a.ctx, dataChangedEventName, kind)
}
