package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/user"
	"path/filepath"
	stdruntime "runtime"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/ingestion"
	desktopserver "github.com/michaelnji/kairos/apps/desktop/internal/server"
	"github.com/michaelnji/kairos/apps/desktop/internal/sessionization"
	desktopsettings "github.com/michaelnji/kairos/apps/desktop/internal/settings"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
	"github.com/michaelnji/kairos/apps/desktop/internal/views"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const dataChangedEventName = "kairos:data-changed"
const extensionBridgeBaseURL = "http://127.0.0.1:42138"
const launchAgentLabel = "com.kairos.desktop"
const windowsStartupRegistryPath = `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
const windowsStartupRegistryValueName = "KairosDesktop"

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
	_, err := a.requestExtensionBridge(http.MethodGet, "/health")
	if err != nil {
		return false, err
	}
	return true, nil
}

func (a *App) RefreshVSCodeExtensionStatus() (contracts.ExtensionStatus, error) {
	if a.initErr != nil {
		return contracts.ExtensionStatus{}, a.initErr
	}
	return a.probeVSCodeExtension("GET", "/health")
}

func (a *App) ReconnectVSCodeExtension() (contracts.ExtensionStatus, error) {
	if a.initErr != nil {
		return contracts.ExtensionStatus{}, a.initErr
	}
	return a.probeVSCodeExtension("POST", "/reconnect")
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

	return launchBehaviorOptions{
		launchOnStartup:   data.AppBehavior.LaunchOnStartup,
		openOnSystemLogin: data.AppBehavior.OpenOnSystemLogin,
		startMinimized:    data.AppBehavior.StartMinimized,
		minimizeToTray:    data.AppBehavior.MinimizeToTray,
	}
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

	if err := os.MkdirAll(filepath.Dir(agentPath), 0o755); err != nil {
		return fmt.Errorf("create launch agents directory: %w", err)
	}

	plist, err := renderLaunchAgentPlist(executablePath)
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
	currentUser, err := user.Current()
	if err != nil {
		return "", fmt.Errorf("resolve current user: %w", err)
	}
	if strings.TrimSpace(currentUser.HomeDir) == "" {
		return "", fmt.Errorf("current user home directory is unavailable")
	}

	return filepath.Join(currentUser.HomeDir, "Library", "LaunchAgents", launchAgentLabel+".plist"), nil
}

func linuxAutostartDesktopFilePath() (string, error) {
	currentUser, err := user.Current()
	if err != nil {
		return "", fmt.Errorf("resolve current user: %w", err)
	}
	if strings.TrimSpace(currentUser.HomeDir) == "" {
		return "", fmt.Errorf("current user home directory is unavailable")
	}

	return filepath.Join(currentUser.HomeDir, ".config", "autostart", launchAgentLabel+".desktop"), nil
}

func renderLaunchAgentPlist(executablePath string) ([]byte, error) {
	tpl := `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{{.Label}}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{{.ExecutablePath}}</string>
  </array>
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
		Label          string
		ExecutablePath string
	}{
		Label:          launchAgentLabel,
		ExecutablePath: executablePath,
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

	wailsruntime.EventsEmit(a.ctx, dataChangedEventName, kind)
}

type extensionBridgeStatusResponse struct {
	ConnectionState  string `json:"connectionState"`
	ExtensionVersion string `json:"extensionVersion"`
	LastHandshakeAt  string `json:"lastHandshakeAt"`
	LastSuccessfulAt string `json:"lastSuccessfulSendAt"`
	LastEventAt      string `json:"lastEventAt"`
}

func (a *App) probeVSCodeExtension(method string, path string) (contracts.ExtensionStatus, error) {
	current, err := a.settingsService.GetExtensionStatus(a.requestContext())
	if err != nil {
		return contracts.ExtensionStatus{}, err
	}

	response, requestErr := a.requestExtensionBridge(method, path)
	if requestErr != nil {
		offline := current
		offline.Connected = false
		if offline.Editor == "" {
			offline.Editor = "vscode"
		}
		_ = a.persistExtensionStatus(offline)
		a.emitDataChanged("extension-status")
		return offline, requestErr
	}

	next := contracts.ExtensionStatus{
		Installed:        true,
		Connected:        strings.EqualFold(response.ConnectionState, "connected"),
		Editor:           "vscode",
		ExtensionVersion: coalesceString(response.ExtensionVersion, current.ExtensionVersion),
		LastHandshakeAt:  coalesceString(response.LastHandshakeAt, current.LastHandshakeAt),
		LastEventAt:      coalesceString(response.LastEventAt, coalesceString(response.LastSuccessfulAt, current.LastEventAt)),
	}

	if err := a.persistExtensionStatus(next); err != nil {
		return contracts.ExtensionStatus{}, err
	}
	a.emitDataChanged("extension-status")

	return a.settingsService.GetExtensionStatus(a.requestContext())
}

func (a *App) requestExtensionBridge(method string, path string) (extensionBridgeStatusResponse, error) {
	ctx, cancel := context.WithTimeout(a.requestContext(), 3*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, method, extensionBridgeBaseURL+path, nil)
	if err != nil {
		return extensionBridgeStatusResponse{}, fmt.Errorf("build extension probe request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	response, err := http.DefaultClient.Do(req)
	if err != nil {
		return extensionBridgeStatusResponse{}, fmt.Errorf("contact extension bridge: %w", err)
	}
	defer response.Body.Close()

	body, readErr := io.ReadAll(response.Body)
	if readErr != nil {
		return extensionBridgeStatusResponse{}, fmt.Errorf("read extension bridge response: %w", readErr)
	}

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		message := strings.TrimSpace(string(body))
		if message == "" {
			message = response.Status
		}
		return extensionBridgeStatusResponse{}, fmt.Errorf("extension bridge returned %s: %s", response.Status, message)
	}

	var payload extensionBridgeStatusResponse
	if err := json.Unmarshal(body, &payload); err != nil {
		return extensionBridgeStatusResponse{}, fmt.Errorf("decode extension bridge response: %w", err)
	}

	return payload, nil
}

func (a *App) persistExtensionStatus(status contracts.ExtensionStatus) error {
	if a.sqliteStore == nil {
		return nil
	}
	return a.sqliteStore.UpsertExtensionStatus(a.requestContext(), status, time.Now().UTC().Format(time.RFC3339))
}

func coalesceString(primary string, fallback string) string {
	if strings.TrimSpace(primary) != "" {
		return primary
	}
	return fallback
}
