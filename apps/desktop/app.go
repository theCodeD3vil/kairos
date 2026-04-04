package main

import "context"

// App is the root Wails binding for desktop lifecycle wiring.
type App struct {
	ctx context.Context
}

// NewApp creates the app scaffold.
func NewApp() *App {
	return &App{}
}

// startup stores the application context.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Ping is a placeholder method for future desktop bindings.
func (a *App) Ping() string {
	return "kairos desktop scaffold"
}
