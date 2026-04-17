//go:build darwin

package main

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Cocoa
#include <stdlib.h>
#include <stdbool.h>
void kairosInstallMenubar(void);
void kairosSetMenubarEnabled(bool enabled);
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

func setupMacMenubar(app *App, enabled bool) {
	macMenubarAppLock.Lock()
	macMenubarApp = app
	macMenubarAppLock.Unlock()
	if enabled {
		C.kairosInstallMenubar()
		return
	}
	C.kairosSetMenubarEnabled(C.bool(false))
}

func setMacMenubarEnabled(enabled bool) {
	C.kairosSetMenubarEnabled(C.bool(enabled))
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
	ShowTimeline   bool                   `json:"showTimeline"`
	ShowSession    bool                   `json:"showSession"`
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
		ShowTimeline: true,
		ShowSession:  true,
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
	menubarEnabled := true
	if app.settingsService != nil {
		if settingsData, settingsErr := app.settingsService.GetSettingsData(ctx); settingsErr == nil {
			if settingsData.General.ThemeMode != "" {
				snapshot.ThemeMode = settingsData.General.ThemeMode
			}
			menubarEnabled = settingsData.AppBehavior.EnableMenubar
			snapshot.ShowTimeline = settingsData.AppBehavior.ShowMenubarTimeline
			snapshot.ShowSession = settingsData.AppBehavior.ShowMenubarSession
		}
	}
	if !menubarEnabled {
		return marshalMenubarSnapshot(snapshot)
	}

	overview, err := app.viewService.GetOverviewData(ctx)
	if err == nil {
		snapshot.TodayLabel = formatDurationLabel(overview.TodayMinutes)
		snapshot.WeekLabel = formatDurationLabel(overview.WeekMinutes)
		snapshot.SessionCount = overview.SessionCount
		snapshot.AverageLabel = formatDurationLabel(overview.AverageSessionMinutes)
	}

	todaySessions, err := app.viewService.GetSessionsPageData(ctx, "today")
	if err == nil {
		if snapshot.ShowTimeline {
			snapshot.Timeline = buildMenubarDailyTimelineTwoHour(todaySessions.Sessions, time.Now())
		}
		if snapshot.ShowSession && len(todaySessions.Sessions) > 0 {
			latest := todaySessions.Sessions[0]
			snapshot.CurrentSession = &menubarCurrentSession{
				Project:       defaultString(latest.ProjectName, "Unknown Project"),
				Language:      defaultString(latest.Language, "Unknown Language"),
				DurationLabel: formatDurationLabel(latest.DurationMinutes),
				StartLabel:    formatSessionTimeLabel(latest.StartTime),
				EndLabel:      formatSessionTimeLabel(latest.EndTime),
			}
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

func buildMenubarDailyTimelineTwoHour(sessions []contracts.Session, now time.Time) []menubarTimelinePoint {
	localNow := now.Local()
	dayStart := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, localNow.Location())
	dayEnd := dayStart.Add(24 * time.Hour)
	bucketWidth := 2 * time.Hour
	bucketCount := 12
	bucketMinutes := make([]int, bucketCount)

	for _, session := range sessions {
		start, startErr := time.Parse(time.RFC3339, session.StartTime)
		if startErr != nil {
			continue
		}
		start = start.Local()

		end, endErr := time.Parse(time.RFC3339, session.EndTime)
		if endErr != nil || !end.After(start) {
			end = start.Add(time.Duration(session.DurationMinutes) * time.Minute)
		}
		end = end.Local()

		if !end.After(dayStart) || !start.Before(dayEnd) {
			continue
		}
		if start.Before(dayStart) {
			start = dayStart
		}
		if end.After(dayEnd) {
			end = dayEnd
		}

		current := start
		for current.Before(end) {
			offset := current.Sub(dayStart)
			bucketIndex := int(offset / bucketWidth)
			if bucketIndex < 0 || bucketIndex >= bucketCount {
				break
			}

			bucketStart := dayStart.Add(time.Duration(bucketIndex) * bucketWidth)
			bucketEnd := bucketStart.Add(bucketWidth)
			if end.Before(bucketEnd) {
				bucketEnd = end
			}

			segment := bucketEnd.Sub(current)
			segmentMinutes := int((segment + 30*time.Second) / time.Minute)
			if segmentMinutes > 0 {
				bucketMinutes[bucketIndex] += segmentMinutes
			}
			current = bucketEnd
		}
	}

	result := make([]menubarTimelinePoint, 0, bucketCount)
	for i := 0; i < bucketCount; i++ {
		bucketStart := dayStart.Add(time.Duration(i) * bucketWidth)
		result = append(result, menubarTimelinePoint{
			Label:   bucketStart.Format("15:04"),
			Minutes: bucketMinutes[i],
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
