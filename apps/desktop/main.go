package main

import (
	"context"
	"embed"
	"log"
	"os"
	"runtime"
	"strings"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	if app.initErr != nil {
		log.Fatalf("kairos backend initialization failed: %v", app.initErr)
	}

	behavior := app.launchBehaviorOptions(context.Background())
	if err := app.applyCurrentStartupBehavior(context.Background()); err != nil {
		log.Printf("app: unable to apply startup behavior: %v", err)
	}
	loginLaunch := isLoginLaunchInvocation(os.Args[1:])
	startMinimized := behavior.startMinimized || (loginLaunch && behavior.loginLaunchMode == "menubar")
	startState := options.Normal
	if startMinimized {
		startState = options.Minimised
	}

	appOptions := &options.App{
		Title:             "Kairos",
		Width:             1200,
		Height:            800,
		MinWidth:          900,
		MinHeight:         600,
		DisableResize:     false,
		WindowStartState:  startState,
		StartHidden:       startMinimized,
		HideWindowOnClose: behavior.minimizeToTray,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
	}

	// Keep desktop menu/mac options scoped to macOS to avoid cross-platform startup regressions.
	if runtime.GOOS == "darwin" {
		appOptions.Menu = menu.NewMenuFromItems(
			menu.AppMenu(),
			menu.EditMenu(),
			menu.WindowMenu(),
		)
		appOptions.Mac = &mac.Options{
			TitleBar:             mac.TitleBarDefault(),
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		}
	}

	err := wails.Run(appOptions)
	if err != nil {
		log.Fatal(err)
	}
}

func isLoginLaunchInvocation(args []string) bool {
	for _, arg := range args {
		if strings.EqualFold(strings.TrimSpace(arg), "--login-launch") {
			return true
		}
	}
	return false
}
