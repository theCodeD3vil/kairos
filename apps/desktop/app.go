package main

import (
	"context"
	"fmt"
	"log"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/ingestion"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
	"github.com/michaelnji/kairos/apps/desktop/internal/views"
)

// App is the root Wails binding for desktop lifecycle wiring.
type App struct {
	ctx              context.Context
	initErr          error
	sqliteStore      *storage.Store
	ingestionService ingestion.Service
	viewService      views.Service
	settingsService  desktopsettings.Service
}

// NewApp creates the app scaffold.
func NewApp() *App {
	settingsService := desktopsettings.NewStubService()
	sqliteStore, err := storage.OpenDefault(context.Background())
	if err != nil {
		log.Printf("app: backend initialization failed: %v", err)
		return &App{
			initErr:         fmt.Errorf("initialize sqlite store: %w", err),
			viewService:     views.NewStubService(),
			settingsService: settingsService,
		}
	}

	settingsService.SetDataStorageInfo(sqliteStore.Path(), "ready")

	return &App{
		sqliteStore:      sqliteStore,
		ingestionService: ingestion.NewService(sqliteStore),
		viewService:      views.NewStubService(),
		settingsService:  settingsService,
	}
}

// startup stores the application context.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) shutdown(_ context.Context) {
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
	return a.viewService.GetOverviewData(a.requestContext())
}

func (a *App) GetAnalyticsData(rangeLabel string) (contracts.AnalyticsData, error) {
	return a.viewService.GetAnalyticsData(a.requestContext(), rangeLabel)
}

func (a *App) GetCalendarMonthData(month string) (contracts.CalendarMonthData, error) {
	return a.viewService.GetCalendarMonthData(a.requestContext(), month)
}

func (a *App) GetCalendarDayData(date string) (contracts.CalendarDayData, error) {
	return a.viewService.GetCalendarDayData(a.requestContext(), date)
}

func (a *App) GetProjectsPageData(rangeLabel string) (contracts.ProjectsPageData, error) {
	return a.viewService.GetProjectsPageData(a.requestContext(), rangeLabel)
}

func (a *App) GetSessionsPageData(rangeLabel string) (contracts.SessionsPageData, error) {
	return a.viewService.GetSessionsPageData(a.requestContext(), rangeLabel)
}

func (a *App) GetSettingsData() (contracts.SettingsData, error) {
	return a.settingsService.GetSettingsData(a.requestContext())
}

func (a *App) UpdateSettingsData(data contracts.SettingsData) (contracts.SettingsData, error) {
	return a.settingsService.UpdateSettingsData(a.requestContext(), data)
}

func (a *App) GetExtensionStatus() (contracts.ExtensionStatus, error) {
	if a.initErr != nil {
		return contracts.ExtensionStatus{}, a.initErr
	}
	return a.ingestionService.GetExtensionStatus(a.requestContext())
}

func (a *App) GetSystemInfo() (contracts.SystemInfo, error) {
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

func (a *App) requestContext() context.Context {
	if a.ctx != nil {
		return a.ctx
	}

	return context.Background()
}
