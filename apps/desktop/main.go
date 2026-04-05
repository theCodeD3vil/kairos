package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	if app.initErr != nil {
		log.Fatalf("kairos backend initialization failed: %v", app.initErr)
	}

	err := wails.Run(&options.App{
		Title:         "Kairos",
		Width:         1200,
		Height:        800,
		MinWidth:      1200,
		MinHeight:     800,
		DisableResize: false,
		AssetServer: &assetserver.Options{
			Assets: assets,
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
