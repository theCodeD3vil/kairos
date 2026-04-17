package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	stdruntime "runtime"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/michaelnji/kairos/apps/desktop/internal/buildinfo"
	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/ingestion"
	desktopserver "github.com/michaelnji/kairos/apps/desktop/internal/server"
	"github.com/michaelnji/kairos/apps/desktop/internal/sessionization"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
	"github.com/michaelnji/kairos/apps/desktop/internal/updates"
	"github.com/michaelnji/kairos/apps/desktop/internal/views"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const dataChangedEventName = "kairos:data-changed"
const launchAgentLabel = "com.kairos.desktop"
const windowsStartupRegistryPath = `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
const windowsStartupRegistryValueName = "KairosDesktop"
const disableLocalServerEnvVar = "KAIROS_DISABLE_LOCAL_SERVER"
const bridgeDiscoveryFileEnvVar = "KAIROS_BRIDGE_DISCOVERY_FILE"
const fallbackPortRangeStart = 42137
const fallbackPortRangeEnd = 42157

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
	updateService    *updates.Service
	dataRevision     uint64
}

type dataChangedEventPayload struct {
	Kind      string `json:"kind"`
	Revision  uint64 `json:"revision"`
	EmittedAt string `json:"emittedAt"`
}

type launchBehaviorOptions struct {
	launchOnStartup   bool
	openOnSystemLogin bool
	startMinimized    bool
	minimizeToTray    bool
}

type autostartRegistrationStatus struct {
	Enabled   bool   `json:"enabled"`
	Platform  string `json:"platform"`
	Mechanism string `json:"mechanism"`
	Location  string `json:"location"`
}

// NewApp creates the app scaffold.
func NewApp() *App {
	settingsService := desktopsettings.NewService(nil)
	app := &App{
		settingsService: settingsService,
		updateService:   updates.NewService(buildinfo.UpdateRepository, buildinfo.DesktopVersion, buildinfo.BuildChannel),
	}
	sqliteStore, err := storage.OpenDefault(context.Background())
	if err != nil {
		log.Printf("app: backend initialization failed: %v", err)
		return &App{
			initErr:         fmt.Errorf("initialize sqlite store: %w", err),
			viewService:     views.NewStubService(),
			settingsService: settingsService,
			updateService:   updates.NewService(buildinfo.UpdateRepository, buildinfo.DesktopVersion, buildinfo.BuildChannel),
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
			updateService:   updates.NewService(buildinfo.UpdateRepository, buildinfo.DesktopVersion, buildinfo.BuildChannel),
		}
	}
	ingestionService := ingestion.NewService(sqliteStore, settingsService, sessionService, func(kind string) {
		app.emitDataChanged(kind)
	})
	if err := ingestionService.MarkExtensionDisconnected(context.Background(), "vscode"); err != nil {
		log.Printf("app: unable to reset extension connection status at startup: %v", err)
	}
	if isLocalServerDisabled() {
		log.Printf("app: local extension server startup disabled by %s", disableLocalServerEnvVar)
		clearDesktopBridgeDiscovery()
		app.sqliteStore = sqliteStore
		app.ingestionService = ingestionService
		app.sessionService = sessionService
		app.viewService = viewService
		app.settingsService = settingsService
		app.updateService = updates.NewService(buildinfo.UpdateRepository, buildinfo.DesktopVersion, buildinfo.BuildChannel)
		return app
	}

	bridgeToken := uuid.NewString()
	localServer, err := startLocalServerWithFallback(ingestionService, bridgeToken)
	if err != nil {
		// The desktop app should stay usable even if the local extension bridge port is occupied.
		log.Printf("app: local extension server initialization failed (continuing without bridge): %v", err)
		clearDesktopBridgeDiscovery()
		app.sqliteStore = sqliteStore
		app.ingestionService = ingestionService
		app.sessionService = sessionService
		app.viewService = viewService
		app.settingsService = settingsService
		app.updateService = updates.NewService(buildinfo.UpdateRepository, buildinfo.DesktopVersion, buildinfo.BuildChannel)
		return app
	}
	localServer.Start()
	if err := writeDesktopBridgeDiscovery(localServer.Address(), bridgeToken); err != nil {
		log.Printf("app: unable to write desktop bridge discovery file: %v", err)
	}

	app.sqliteStore = sqliteStore
	app.localServer = localServer
	app.ingestionService = ingestionService
	app.sessionService = sessionService
	app.viewService = viewService
	app.settingsService = settingsService
	app.updateService = updates.NewService(buildinfo.UpdateRepository, buildinfo.DesktopVersion, buildinfo.BuildChannel)

	return app
}

func startLocalServerWithFallback(ingestionService ingestion.Service, bridgeToken string) (*desktopserver.LocalServer, error) {
	config := desktopserver.DefaultConfig()
	if strings.TrimSpace(bridgeToken) != "" {
		config.BridgeToken = strings.TrimSpace(bridgeToken)
	}
	server, err := desktopserver.NewLocalServer(config, ingestionService)
	if err == nil {
		return server, nil
	}
	if !isAddressInUse(err) {
		return nil, err
	}

	candidates := make([]int, 0, fallbackPortRangeEnd-fallbackPortRangeStart+1)
	for port := fallbackPortRangeStart; port <= fallbackPortRangeEnd; port += 1 {
		if port == config.Port {
			continue
		}
		candidates = append(candidates, port)
	}
	if config.Port >= 0 && config.Port <= 65535 && (config.Port < fallbackPortRangeStart || config.Port > fallbackPortRangeEnd) {
		candidates = append(candidates, config.Port)
	}

	lastErr := err
	for _, port := range candidates {
		next := config
		next.Port = port
		server, nextErr := desktopserver.NewLocalServer(next, ingestionService)
		if nextErr == nil {
			log.Printf("app: local extension server fallback engaged: %d -> %d", config.Port, port)
			return server, nil
		}
		lastErr = nextErr
		if !isAddressInUse(nextErr) {
			return nil, nextErr
		}
	}

	return nil, lastErr
}

func isAddressInUse(err error) bool {
	if err == nil {
		return false
	}
	lower := strings.ToLower(err.Error())
	return strings.Contains(lower, "address already in use")
}

func writeDesktopBridgeDiscovery(address string, bridgeToken string) error {
	host, portText, err := net.SplitHostPort(address)
	if err != nil {
		return fmt.Errorf("parse local server address %q: %w", address, err)
	}
	port, err := strconv.Atoi(portText)
	if err != nil {
		return fmt.Errorf("parse local server port %q: %w", portText, err)
	}

	path, err := desktopBridgeDiscoveryPath()
	if err != nil {
		return err
	}
	if err := createPrivateDirectory(filepath.Dir(path)); err != nil {
		return fmt.Errorf("create discovery directory: %w", err)
	}

	payload := struct {
		DesktopServerURL   string `json:"desktopServerUrl"`
		DesktopServerHost  string `json:"desktopServerHost"`
		DesktopServerPort  int    `json:"desktopServerPort"`
		DesktopServerToken string `json:"desktopServerToken,omitempty"`
		UpdatedAt          string `json:"updatedAt"`
		Version            int    `json:"version"`
	}{
		DesktopServerURL:   fmt.Sprintf("http://%s:%d", host, port),
		DesktopServerHost:  host,
		DesktopServerPort:  port,
		DesktopServerToken: strings.TrimSpace(bridgeToken),
		UpdatedAt:          time.Now().UTC().Format(time.RFC3339),
		Version:            1,
	}

	bytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal discovery payload: %w", err)
	}
	if err := writePrivateFile(path, append(bytes, '\n')); err != nil {
		return fmt.Errorf("write discovery file: %w", err)
	}
	return nil
}

func clearDesktopBridgeDiscovery() {
	path, err := desktopBridgeDiscoveryPath()
	if err != nil {
		return
	}
	if removeErr := os.Remove(path); removeErr != nil && !os.IsNotExist(removeErr) {
		log.Printf("app: unable to remove desktop bridge discovery file: %v", removeErr)
	}
}

func createPrivateDirectory(path string) error {
	if err := os.MkdirAll(path, 0o700); err != nil {
		return err
	}
	if err := os.Chmod(path, 0o700); err != nil {
		return err
	}
	return nil
}

func writePrivateFile(path string, content []byte) error {
	file, err := os.OpenFile(path, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	defer file.Close()

	if err := file.Chmod(0o600); err != nil {
		return err
	}
	if _, err := file.Write(content); err != nil {
		return err
	}
	if err := file.Sync(); err != nil {
		return err
	}
	return nil
}

func desktopBridgeDiscoveryPath() (string, error) {
	override := strings.TrimSpace(os.Getenv(bridgeDiscoveryFileEnvVar))
	if override != "" {
		return override, nil
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve home directory for bridge discovery: %w", err)
	}
	return filepath.Join(home, ".kairos", "desktop-bridge.json"), nil
}

func isLocalServerDisabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(disableLocalServerEnvVar)))
	switch value {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
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
	setupMacMenubar(a)
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
		if applyErr := a.applyStartupBehavior(a.requestContext(), updated); applyErr != nil {
			return contracts.AppBehaviorSettings{}, applyErr
		}
	}
	if err == nil {
		a.emitDataChanged("settings")
	}
	return updated, err
}

func (a *App) GetAutostartRegistrationStatus() (autostartRegistrationStatus, error) {
	if a.initErr != nil {
		return autostartRegistrationStatus{}, a.initErr
	}
	return currentAutostartRegistrationStatus()
}

func (a *App) CheckForDesktopUpdate() (updates.CheckResult, error) {
	if a.initErr != nil {
		return updates.CheckResult{}, a.initErr
	}
	if a.updateService == nil {
		return updates.CheckResult{}, nil
	}
	return a.updateService.CheckForUpdate(a.requestContext()), nil
}

func (a *App) ClearLocalData() error {
	if a.initErr != nil {
		return a.initErr
	}
	err := a.sqliteStore.ClearLocalData(a.requestContext())
	if err == nil {
		a.emitDataChanged("sessions")
		a.emitDataChanged("events")
	}
	return err
}

func (a *App) ExportLocalDataToDisk() error {
	if a.initErr != nil {
		return a.initErr
	}

	ctx := a.requestContext()

	homeDir, _ := os.UserHomeDir()
	exportPath, err := wailsruntime.SaveFileDialog(a.ctx, wailsruntime.SaveDialogOptions{
		Title:            "Export Kairos Data",
		DefaultDirectory: filepath.Join(homeDir, "Downloads"),
		DefaultFilename:  fmt.Sprintf("kairos_export_%s.json", time.Now().Format("2006-01-02")),
		Filters: []wailsruntime.FileFilter{{
			DisplayName: "JSON Files (*.json)",
			Pattern:     "*.json",
		}},
	})
	if err != nil {
		return fmt.Errorf("failed to open save dialog: %w", err)
	}
	if exportPath == "" {
		return nil
	}

	events, err := a.sqliteStore.ListEventsForDateRange(ctx, "0000-00-00", "9999-99-99")
	if err != nil {
		return fmt.Errorf("failed to fetch events for export: %w", err)
	}

	sessions, err := a.sqliteStore.ListSessionsForRange(ctx, "0000-00-00", "9999-99-99")
	if err != nil {
		return fmt.Errorf("failed to fetch sessions for export: %w", err)
	}

	file, err := os.Create(exportPath)
	if err != nil {
		return fmt.Errorf("failed to create export file: %w", err)
	}
	defer file.Close()

	payload := struct {
		Events   []contracts.ActivityEvent `json:"events"`
		Sessions []contracts.Session       `json:"sessions"`
	}{
		Events:   events,
		Sessions: sessions,
	}

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(payload); err != nil {
		return fmt.Errorf("failed to encode export data: %w", err)
	}

	return nil
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
	return a.settingsService.GetExtensionStatus(a.requestContext())
}

func (a *App) GetVSCodeBridgeHealth() (bool, error) {
	if a.initErr != nil {
		return false, a.initErr
	}
	status, err := a.settingsService.GetExtensionStatus(a.requestContext())
	if err != nil {
		return false, err
	}
	return status.Connected, nil
}

func (a *App) RefreshVSCodeExtensionStatus() (contracts.ExtensionStatus, error) {
	if a.initErr != nil {
		return contracts.ExtensionStatus{}, a.initErr
	}
	return a.settingsService.GetExtensionStatus(a.requestContext())
}

func (a *App) ReconnectVSCodeExtension() (contracts.ExtensionStatus, error) {
	if a.initErr != nil {
		return contracts.ExtensionStatus{}, a.initErr
	}
	return a.settingsService.GetExtensionStatus(a.requestContext())
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

func (a *App) launchBehaviorOptions(ctx context.Context) launchBehaviorOptions {
	if a.settingsService == nil {
		return launchBehaviorOptions{}
	}

	data, err := a.settingsService.GetSettingsData(ctx)
	if err != nil {
		log.Printf("app: unable to load app behavior settings for launch options: %v", err)
		return launchBehaviorOptions{}
	}

	behavior := launchBehaviorOptions{
		launchOnStartup:   data.AppBehavior.LaunchOnStartup,
		openOnSystemLogin: data.AppBehavior.OpenOnSystemLogin,
		startMinimized:    data.AppBehavior.StartMinimized,
		minimizeToTray:    data.AppBehavior.MinimizeToTray,
	}

	// Linux desktop environments (especially Wayland sessions) can become
	// inaccessible when startup is hidden to tray/minimized.
	if stdruntime.GOOS == "linux" {
		behavior.startMinimized = false
		behavior.minimizeToTray = false
	}

	return behavior
}

func (a *App) applyCurrentStartupBehavior(ctx context.Context) error {
	behavior := a.launchBehaviorOptions(ctx)
	return a.applyStartupBehavior(ctx, contracts.AppBehaviorSettings{
		LaunchOnStartup:   behavior.launchOnStartup,
		OpenOnSystemLogin: behavior.openOnSystemLogin,
	})
}

func (a *App) applyStartupBehavior(ctx context.Context, behavior contracts.AppBehaviorSettings) error {
	enabled := behavior.LaunchOnStartup || behavior.OpenOnSystemLogin
	return ensureAutostart(enabled)
}

func ensureAutostart(enabled bool) error {
	switch stdruntime.GOOS {
	case "darwin":
		return ensureMacLaunchAgent(enabled)
	case "linux":
		return ensureLinuxAutostartDesktopEntry(enabled)
	case "windows":
		return ensureWindowsStartupRegistry(enabled)
	default:
		return nil
	}
}

func ensureMacLaunchAgent(enabled bool) error {
	agentPath, err := launchAgentPlistPath()
	if err != nil {
		return err
	}

	if !enabled {
		if err := os.Remove(agentPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("remove launch agent: %w", err)
		}
		return nil
	}

	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable path: %w", err)
	}
	programArguments := macLaunchProgramArguments(executablePath)

	if err := os.MkdirAll(filepath.Dir(agentPath), 0o755); err != nil {
		return fmt.Errorf("create launch agents directory: %w", err)
	}

	plist, err := renderLaunchAgentPlist(programArguments)
	if err != nil {
		return err
	}

	if writeErr := os.WriteFile(agentPath, plist, 0o644); writeErr != nil {
		return fmt.Errorf("write launch agent plist: %w", writeErr)
	}

	return nil
}

func ensureLinuxAutostartDesktopEntry(enabled bool) error {
	desktopPath, err := linuxAutostartDesktopFilePath()
	if err != nil {
		return err
	}

	if !enabled {
		if err := os.Remove(desktopPath); err != nil && !os.IsNotExist(err) {
			return fmt.Errorf("remove linux autostart desktop file: %w", err)
		}
		return nil
	}

	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable path: %w", err)
	}

	if err := os.MkdirAll(filepath.Dir(desktopPath), 0o755); err != nil {
		return fmt.Errorf("create linux autostart directory: %w", err)
	}

	content := []byte(renderLinuxDesktopEntry(executablePath))
	if writeErr := os.WriteFile(desktopPath, content, 0o644); writeErr != nil {
		return fmt.Errorf("write linux autostart desktop file: %w", writeErr)
	}

	return nil
}

func ensureWindowsStartupRegistry(enabled bool) error {
	if !enabled {
		err := exec.Command("reg", "delete", windowsStartupRegistryPath, "/v", windowsStartupRegistryValueName, "/f").Run()
		if err == nil {
			return nil
		}
		queryErr := exec.Command("reg", "query", windowsStartupRegistryPath, "/v", windowsStartupRegistryValueName).Run()
		if queryErr != nil {
			return nil
		}
		return fmt.Errorf("remove windows startup registry value: %w", err)
	}

	executablePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve executable path: %w", err)
	}

	regValue := fmt.Sprintf(`"%s"`, executablePath)
	if addErr := exec.Command(
		"reg",
		"add",
		windowsStartupRegistryPath,
		"/v",
		windowsStartupRegistryValueName,
		"/t",
		"REG_SZ",
		"/d",
		regValue,
		"/f",
	).Run(); addErr != nil {
		return fmt.Errorf("set windows startup registry value: %w", addErr)
	}

	return nil
}

func currentAutostartRegistrationStatus() (autostartRegistrationStatus, error) {
	switch stdruntime.GOOS {
	case "darwin":
		path, err := launchAgentPlistPath()
		if err != nil {
			return autostartRegistrationStatus{}, err
		}
		enabled, err := fileExists(path)
		if err != nil {
			return autostartRegistrationStatus{}, err
		}
		return autostartRegistrationStatus{
			Enabled:   enabled,
			Platform:  "macOS",
			Mechanism: "LaunchAgent",
			Location:  path,
		}, nil
	case "linux":
		path, err := linuxAutostartDesktopFilePath()
		if err != nil {
			return autostartRegistrationStatus{}, err
		}
		enabled, err := fileExists(path)
		if err != nil {
			return autostartRegistrationStatus{}, err
		}
		return autostartRegistrationStatus{
			Enabled:   enabled,
			Platform:  "Linux",
			Mechanism: "XDG autostart",
			Location:  path,
		}, nil
	case "windows":
		enabled, err := isWindowsStartupRegistryEnabled()
		if err != nil {
			return autostartRegistrationStatus{}, err
		}
		return autostartRegistrationStatus{
			Enabled:   enabled,
			Platform:  "Windows",
			Mechanism: "Registry Run key",
			Location:  windowsStartupRegistryPath + `\` + windowsStartupRegistryValueName,
		}, nil
	default:
		return autostartRegistrationStatus{
			Enabled:   false,
			Platform:  stdruntime.GOOS,
			Mechanism: "Unsupported",
			Location:  "N/A",
		}, nil
	}
}

func isWindowsStartupRegistryEnabled() (bool, error) {
	err := exec.Command("reg", "query", windowsStartupRegistryPath, "/v", windowsStartupRegistryValueName).Run()
	if err == nil {
		return true, nil
	}

	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) && exitErr.ExitCode() == 1 {
		return false, nil
	}

	return false, fmt.Errorf("query windows startup registry value: %w", err)
}

func fileExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	return false, fmt.Errorf("stat %q: %w", path, err)
}

func launchAgentPlistPath() (string, error) {
	homeDir, err := resolveCurrentUserHomeDir()
	if err != nil {
		return "", err
	}

	return filepath.Join(homeDir, "Library", "LaunchAgents", launchAgentLabel+".plist"), nil
}

func linuxAutostartDesktopFilePath() (string, error) {
	homeDir, err := resolveCurrentUserHomeDir()
	if err != nil {
		return "", err
	}

	return filepath.Join(homeDir, ".config", "autostart", launchAgentLabel+".desktop"), nil
}

func resolveCurrentUserHomeDir() (string, error) {
	if homeDir, err := os.UserHomeDir(); err == nil {
		trimmed := strings.TrimSpace(homeDir)
		if trimmed != "" {
			return trimmed, nil
		}
	}

	currentUser, err := user.Current()
	if err != nil {
		return "", fmt.Errorf("resolve current user home directory: %w", err)
	}
	trimmed := strings.TrimSpace(currentUser.HomeDir)
	if trimmed == "" {
		return "", fmt.Errorf("current user home directory is unavailable")
	}

	return trimmed, nil
}

func macLaunchProgramArguments(executablePath string) []string {
	if appBundlePath, ok := macAppBundlePathFromExecutable(executablePath); ok {
		return []string{"/usr/bin/open", appBundlePath}
	}

	return []string{executablePath}
}

func macAppBundlePathFromExecutable(executablePath string) (string, bool) {
	cleanPath := filepath.Clean(executablePath)
	marker := filepath.Join("Contents", "MacOS") + string(filepath.Separator)
	markerIndex := strings.LastIndex(cleanPath, marker)
	if markerIndex <= 0 {
		return "", false
	}

	bundlePath := strings.TrimRight(cleanPath[:markerIndex], string(filepath.Separator))
	if !strings.HasSuffix(strings.ToLower(bundlePath), ".app") {
		return "", false
	}

	return bundlePath, true
}

func renderLaunchAgentPlist(programArguments []string) ([]byte, error) {
	if len(programArguments) == 0 {
		return nil, fmt.Errorf("launch agent program arguments are required")
	}

	tpl := `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{{.Label}}</string>
  <key>ProgramArguments</key>
  <array>
{{- range .ProgramArguments }}
    <string>{{.}}</string>
{{- end }}
  </array>
  <key>LimitLoadToSessionType</key>
  <array>
    <string>Aqua</string>
  </array>
  <key>ProcessType</key>
  <string>Interactive</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>
`

	var buffer bytes.Buffer
	parsed, err := template.New("launch-agent").Parse(tpl)
	if err != nil {
		return nil, fmt.Errorf("parse launch agent template: %w", err)
	}
	if executeErr := parsed.Execute(&buffer, struct {
		Label            string
		ProgramArguments []string
	}{
		Label:            launchAgentLabel,
		ProgramArguments: programArguments,
	}); executeErr != nil {
		return nil, fmt.Errorf("render launch agent template: %w", executeErr)
	}
	return buffer.Bytes(), nil
}

func renderLinuxDesktopEntry(executablePath string) string {
	escaped := strings.ReplaceAll(executablePath, " ", `\ `)
	return fmt.Sprintf(`[Desktop Entry]
Type=Application
Version=1.0
Name=Kairos
Comment=Kairos Desktop
Exec=%s
Terminal=false
X-GNOME-Autostart-enabled=true
`, escaped)
}

func (a *App) emitDataChanged(kind string) {
	if a.ctx == nil {
		return
	}

	revision := atomic.AddUint64(&a.dataRevision, 1)
	payload := dataChangedEventPayload{
		Kind:      kind,
		Revision:  revision,
		EmittedAt: time.Now().UTC().Format(time.RFC3339Nano),
	}

	// Keep "kind" as the first argument for backwards compatibility with older frontend listeners.
	wailsruntime.EventsEmit(a.ctx, dataChangedEventName, kind, payload)
}
