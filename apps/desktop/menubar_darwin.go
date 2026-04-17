//go:build darwin

package main

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
void kairosInstallMenubar(void);
*/
import "C"

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"
	"unsafe"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

var (
	macMenubarApp     *App
	macMenubarAppLock sync.RWMutex
)

func setupMacMenubar(app *App) {
	macMenubarAppLock.Lock()
	macMenubarApp = app
	macMenubarAppLock.Unlock()
	C.kairosInstallMenubar()
}

func currentMacMenubarApp() *App {
	macMenubarAppLock.RLock()
	defer macMenubarAppLock.RUnlock()
	return macMenubarApp
}

//export kairosMenubarShow
func kairosMenubarShow() {
	app := currentMacMenubarApp()
	if app == nil || app.ctx == nil {
		return
	}
	wailsruntime.Show(app.ctx)
	wailsruntime.WindowUnminimise(app.ctx)
	wailsruntime.WindowShow(app.ctx)
}

//export kairosMenubarQuit
func kairosMenubarQuit() {
	app := currentMacMenubarApp()
	if app == nil || app.ctx == nil {
		return
	}
	wailsruntime.Quit(app.ctx)
}

type menubarSnapshot struct {
	Now            string                 `json:"now"`
	ThemeMode      string                 `json:"themeMode"`
	TodayLabel     string                 `json:"todayLabel"`
	WeekLabel      string                 `json:"weekLabel"`
	SessionCount   int                    `json:"sessionCount"`
	AverageLabel   string                 `json:"averageLabel"`
	CurrentSession *menubarCurrentSession `json:"currentSession,omitempty"`
	Timeline       []menubarTimelinePoint `json:"timeline"`
}

type menubarCurrentSession struct {
	Project       string `json:"project"`
	Language      string `json:"language"`
	DurationLabel string `json:"durationLabel"`
	StartLabel    string `json:"startLabel"`
	EndLabel      string `json:"endLabel"`
}

type menubarTimelinePoint struct {
	Label   string `json:"label"`
	Minutes int    `json:"minutes"`
}

//export kairosMenubarSnapshotJSON
func kairosMenubarSnapshotJSON() *C.char {
	app := currentMacMenubarApp()
	snapshot := menubarSnapshot{
		Now:          time.Now().Format("15:04"),
		ThemeMode:    "system",
		TodayLabel:   "0m",
		WeekLabel:    "0m",
		SessionCount: 0,
		AverageLabel: "0m",
		Timeline:     make([]menubarTimelinePoint, 0),
	}
	if app == nil || app.viewService == nil {
		return marshalMenubarSnapshot(snapshot)
	}

	ctx := app.requestContext()
	if app.settingsService != nil {
		if settingsData, settingsErr := app.settingsService.GetSettingsData(ctx); settingsErr == nil {
			if settingsData.General.ThemeMode != "" {
				snapshot.ThemeMode = settingsData.General.ThemeMode
			}
		}
	}

	overview, err := app.viewService.GetOverviewData(ctx)
	if err == nil {
		snapshot.TodayLabel = formatDurationLabel(overview.TodayMinutes)
		snapshot.WeekLabel = formatDurationLabel(overview.WeekMinutes)
		snapshot.SessionCount = overview.SessionCount
		snapshot.AverageLabel = formatDurationLabel(overview.AverageSessionMinutes)
		snapshot.Timeline = buildMenubarTimeline(overview.WeeklyTrend)
	}

	todaySessions, err := app.viewService.GetSessionsPageData(ctx, "today")
	if err == nil && len(todaySessions.Sessions) > 0 {
		latest := todaySessions.Sessions[0]
		snapshot.CurrentSession = &menubarCurrentSession{
			Project:       defaultString(latest.ProjectName, "Unknown Project"),
			Language:      defaultString(latest.Language, "Unknown Language"),
			DurationLabel: formatDurationLabel(latest.DurationMinutes),
			StartLabel:    formatSessionTimeLabel(latest.StartTime),
			EndLabel:      formatSessionTimeLabel(latest.EndTime),
		}
	}

	return marshalMenubarSnapshot(snapshot)
}

//export kairosMenubarFreeCString
func kairosMenubarFreeCString(value *C.char) {
	if value == nil {
		return
	}
	C.free(unsafe.Pointer(value))
}

func marshalMenubarSnapshot(snapshot menubarSnapshot) *C.char {
	payload, err := json.Marshal(snapshot)
	if err != nil {
		return C.CString(`{"now":"--:--","themeMode":"system","todayLabel":"0m","weekLabel":"0m","sessionCount":0,"averageLabel":"0m","timeline":[]}`)
	}
	return C.CString(string(payload))
}

func buildMenubarTimeline(points []contracts.WeeklyTrendPoint) []menubarTimelinePoint {
	if len(points) == 0 {
		return []menubarTimelinePoint{}
	}

	result := make([]menubarTimelinePoint, 0, len(points))
	for _, point := range points {
		label := point.Date
		if parsed, err := time.Parse("2006-01-02", point.Date); err == nil {
			label = parsed.Format("Jan 2")
		}
		result = append(result, menubarTimelinePoint{
			Label:   label,
			Minutes: point.TotalMinutes,
		})
	}
	return result
}

func formatSessionTimeLabel(value string) string {
	if value == "" {
		return "--:--"
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return value
	}
	return parsed.Local().Format("15:04")
}

func defaultString(value string, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func formatDurationLabel(minutes int) string {
	if minutes <= 0 {
		return "0m"
	}
	if minutes < 60 {
		return fmt.Sprintf("%dm", minutes)
	}
	hours := minutes / 60
	remainder := minutes % 60
	if remainder == 0 {
		return fmt.Sprintf("%dh", hours)
	}
	return fmt.Sprintf("%dh %dm", hours, remainder)
}
