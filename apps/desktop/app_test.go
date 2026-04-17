package main

import (
	"context"
	"encoding/json"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"testing"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	"github.com/michaelnji/kairos/apps/desktop/internal/storage"
)

func TestNewAppInitializesWithExistingDatabase(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos.sqlite3")
	t.Setenv("KAIROS_DATABASE_PATH", dbPath)
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", "0")

	store, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open seeded sqlite store: %v", err)
	}
	if err := store.UpsertMachine(context.Background(), contracts.MachineInfo{
		MachineID:   "machine-1",
		MachineName: "Kairos Mac",
		OSPlatform:  "darwin",
	}, "2026-04-06T10:00:00Z"); err != nil {
		t.Fatalf("seed machine: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close seeded sqlite store: %v", err)
	}

	app := NewApp()
	if app.initErr != nil {
		t.Fatalf("expected app initialization to succeed, got %v", app.initErr)
	}
	if app.sqliteStore == nil {
		t.Fatalf("expected sqlite store to be initialized")
	}
	if app.localServer == nil || app.localServer.Address() == "" {
		t.Fatalf("expected local server to be initialized")
	}

	app.shutdown(context.Background())
}

func TestNewAppRebuildsSessionsWhenEventsExistButSessionsAreMissing(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos.sqlite3")
	t.Setenv("KAIROS_DATABASE_PATH", dbPath)
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", "0")

	store, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open seeded sqlite store: %v", err)
	}
	machine := contracts.MachineInfo{
		MachineID:   "machine-1",
		MachineName: "Kairos Mac",
		OSPlatform:  "darwin",
	}
	status := contracts.ExtensionStatus{
		Installed:        true,
		Connected:        true,
		Editor:           "vscode",
		ExtensionVersion: "0.1.1",
		LastEventAt:      "2026-04-06T10:05:00Z",
		LastHandshakeAt:  "2026-04-06T10:05:00Z",
	}
	events := []contracts.ActivityEvent{
		{
			ID:          "evt-1",
			Timestamp:   "2026-04-06T10:00:00Z",
			EventType:   "open",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "typescript",
			FilePath:    "/workspace-1/README.md",
		},
		{
			ID:          "evt-2",
			Timestamp:   "2026-04-06T10:05:00Z",
			EventType:   "edit",
			MachineID:   "machine-1",
			WorkspaceID: "workspace-1",
			ProjectName: "kairos",
			Language:    "typescript",
			FilePath:    "/workspace-1/main.ts",
		},
	}
	if _, err := store.PersistIngestionBatch(context.Background(), machine, status, events, "2026-04-06T10:05:00Z"); err != nil {
		t.Fatalf("seed ingestion batch: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close seeded sqlite store: %v", err)
	}

	app := NewApp()
	if app.initErr != nil {
		t.Fatalf("expected app initialization to succeed, got %v", app.initErr)
	}

	sessions, err := app.sqliteStore.ListSessionsForDate(context.Background(), "2026-04-06")
	if err != nil {
		t.Fatalf("list rebuilt sessions: %v", err)
	}
	if len(sessions) == 0 {
		t.Fatal("expected startup to rebuild missing sessions")
	}

	app.shutdown(context.Background())
}

func TestNewAppFailsClearlyWhenDatabaseInitializationFails(t *testing.T) {
	base := t.TempDir()
	blockingFile := filepath.Join(base, "not-a-directory")
	if err := os.WriteFile(blockingFile, []byte("block"), 0o644); err != nil {
		t.Fatalf("write blocking file: %v", err)
	}

	t.Setenv("KAIROS_DATABASE_PATH", filepath.Join(blockingFile, "kairos.sqlite3"))
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", "0")

	app := NewApp()
	if app.initErr == nil {
		t.Fatalf("expected app initialization to fail")
	}
	if !strings.Contains(app.initErr.Error(), "initialize sqlite store") {
		t.Fatalf("expected sqlite init failure, got %v", app.initErr)
	}
}

func TestNewAppFallsBackWhenPreferredPortIsOccupied(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos.sqlite3")
	discoveryPath := filepath.Join(t.TempDir(), "desktop-bridge.json")
	t.Setenv("KAIROS_DATABASE_PATH", dbPath)
	t.Setenv("KAIROS_BRIDGE_DISCOVERY_FILE", discoveryPath)

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("reserve preferred local server port: %v", err)
	}
	defer listener.Close()
	_, occupiedPortText, err := net.SplitHostPort(listener.Addr().String())
	if err != nil {
		t.Fatalf("split occupied local server address: %v", err)
	}
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", occupiedPortText)

	app := NewApp()
	if app.initErr != nil {
		t.Fatalf("expected app initialization to succeed with fallback local bridge, got %v", app.initErr)
	}
	if app.sqliteStore == nil {
		t.Fatal("expected sqlite store to be initialized")
	}
	if app.localServer == nil || app.localServer.Address() == "" {
		t.Fatal("expected local server to start on a fallback port")
	}
	_, activePortText, err := net.SplitHostPort(app.localServer.Address())
	if err != nil {
		t.Fatalf("split fallback local server address: %v", err)
	}
	activePort, err := strconv.Atoi(activePortText)
	if err != nil {
		t.Fatalf("parse fallback local server port: %v", err)
	}
	occupiedPort, err := strconv.Atoi(occupiedPortText)
	if err != nil {
		t.Fatalf("parse occupied local server port: %v", err)
	}
	if activePort == occupiedPort {
		t.Fatalf("expected fallback local server port to differ from occupied port %d", occupiedPort)
	}

	discoveryBytes, err := os.ReadFile(discoveryPath)
	if err != nil {
		t.Fatalf("read discovery file: %v", err)
	}
	var discovery struct {
		DesktopServerURL  string `json:"desktopServerUrl"`
		DesktopServerHost string `json:"desktopServerHost"`
		DesktopServerPort int    `json:"desktopServerPort"`
	}
	if err := json.Unmarshal(discoveryBytes, &discovery); err != nil {
		t.Fatalf("decode discovery file: %v", err)
	}
	if discovery.DesktopServerPort != activePort {
		t.Fatalf("expected discovery port %d to match active server port %d", discovery.DesktopServerPort, activePort)
	}
	if runtime.GOOS != "windows" {
		info, err := os.Stat(discoveryPath)
		if err != nil {
			t.Fatalf("stat discovery file: %v", err)
		}
		if perms := info.Mode().Perm(); perms != 0o600 {
			t.Fatalf("expected discovery file permissions 0600, got %o", perms)
		}
		dirInfo, err := os.Stat(filepath.Dir(discoveryPath))
		if err != nil {
			t.Fatalf("stat discovery directory: %v", err)
		}
		if perms := dirInfo.Mode().Perm(); perms != 0o700 {
			t.Fatalf("expected discovery directory permissions 0700, got %o", perms)
		}
	}

	app.shutdown(context.Background())
}

func TestLaunchBehaviorOptionsIgnoreHiddenStartupFlagsOnLinux(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "kairos.sqlite3")
	t.Setenv("KAIROS_DATABASE_PATH", dbPath)
	t.Setenv("KAIROS_LOCAL_SERVER_PORT", "0")

	store, err := storage.Open(context.Background(), dbPath)
	if err != nil {
		t.Fatalf("open sqlite store: %v", err)
	}
	if err := store.SetSettingsSection(
		context.Background(),
		"appBehavior",
		`{"launchOnStartup":false,"startMinimized":true,"minimizeToTray":true,"openOnSystemLogin":false,"rememberLastPage":true,"restoreLastDateRange":true}`,
		"2026-04-10T09:30:00Z",
	); err != nil {
		t.Fatalf("seed app behavior settings: %v", err)
	}
	if err := store.Close(); err != nil {
		t.Fatalf("close sqlite store: %v", err)
	}

	app := NewApp()
	if app.initErr != nil {
		t.Fatalf("app initialization failed: %v", app.initErr)
	}
	defer app.shutdown(context.Background())

	behavior := app.launchBehaviorOptions(context.Background())
	if runtime.GOOS == "linux" {
		if behavior.startMinimized {
			t.Fatal("expected startMinimized disabled on linux")
		}
		if behavior.minimizeToTray {
			t.Fatal("expected minimizeToTray disabled on linux")
		}
		return
	}

	if !behavior.startMinimized {
		t.Fatal("expected startMinimized retained on non-linux")
	}
	if !behavior.minimizeToTray {
		t.Fatal("expected minimizeToTray retained on non-linux")
	}
}

func TestMacAppBundlePathFromExecutable(t *testing.T) {
	path, ok := macAppBundlePathFromExecutable("/Applications/Kairos.app/Contents/MacOS/Kairos")
	if !ok {
		t.Fatal("expected to derive app bundle path")
	}
	if path != "/Applications/Kairos.app" {
		t.Fatalf("expected /Applications/Kairos.app, got %s", path)
	}

	_, ok = macAppBundlePathFromExecutable("/usr/local/bin/kairos")
	if ok {
		t.Fatal("expected non-app executable path to return no app bundle")
	}
}

func TestMacLaunchProgramArgumentsFromAppBundle(t *testing.T) {
	arguments := macLaunchProgramArguments("/Applications/Kairos.app/Contents/MacOS/Kairos")
	if len(arguments) != 2 {
		t.Fatalf("expected open command args, got %v", arguments)
	}
	if arguments[0] != "/usr/bin/open" {
		t.Fatalf("expected /usr/bin/open launcher, got %s", arguments[0])
	}
	if arguments[1] != "/Applications/Kairos.app" {
		t.Fatalf("expected app bundle launch target, got %s", arguments[1])
	}
}

func TestRenderLaunchAgentPlistIncludesProgramArguments(t *testing.T) {
	plist, err := renderLaunchAgentPlist([]string{"/usr/bin/open", "/Applications/Kairos.app"})
	if err != nil {
		t.Fatalf("render launch agent plist: %v", err)
	}
	content := string(plist)
	if !strings.Contains(content, "<string>/usr/bin/open</string>") {
		t.Fatalf("expected launcher program in plist, got %s", content)
	}
	if !strings.Contains(content, "<string>/Applications/Kairos.app</string>") {
		t.Fatalf("expected app bundle target in plist, got %s", content)
	}
	if !strings.Contains(content, "<string>Aqua</string>") {
		t.Fatalf("expected Aqua session type in plist, got %s", content)
	}
	if !strings.Contains(content, "<string>Interactive</string>") {
		t.Fatalf("expected interactive process type in plist, got %s", content)
	}
}
