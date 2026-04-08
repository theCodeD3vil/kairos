package main

import (
	"context"
	"embed"
	"log"

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
	startState := options.Normal
	if behavior.startMinimized {
		startState = options.Minimised
	}

	err := wails.Run(&options.App{
		Title:             "Kairos",
		Width:             1200,
		Height:            800,
		MinWidth:          900,
		MinHeight:         600,
		DisableResize:     false,
		WindowStartState:  startState,
		StartHidden:       behavior.startMinimized,
		HideWindowOnClose: behavior.minimizeToTray,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		Menu: menu.NewMenuFromItems(
			menu.AppMenu(),
			menu.EditMenu(),
			menu.WindowMenu(),
		),
		Mac: &mac.Options{
			TitleBar:             mac.TitleBarDefault(),
			WebviewIsTransparent: false,
			WindowIsTranslucent:  false,
		},
		OnStartup:  app.startup,
		OnShutdown: app.shutdown,
		Bind: []interface{}{
			app,
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
