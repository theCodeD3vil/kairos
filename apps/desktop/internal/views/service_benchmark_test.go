package views

import (
	"strconv"
	"testing"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

var (
	benchmarkDailyTotalsSink       map[string]dailyAggregate
	benchmarkProjectSummariesSink  []contracts.ProjectSummary
	benchmarkLanguageSummariesSink []contracts.LanguageSummary
	benchmarkMachineSummariesSink  []contracts.MachineSummary
	benchmarkEventKpisSink         contracts.EventActivityKpiSummary
)

func BenchmarkAggregateDailyTotals50k(b *testing.B) {
	sessions, _ := benchmarkSessions(50_000)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		benchmarkDailyTotalsSink = aggregateDailyTotals(sessions)
	}
}

func BenchmarkBuildProjectSummaries50k(b *testing.B) {
	sessions, _ := benchmarkSessions(50_000)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		benchmarkProjectSummariesSink = buildProjectSummaries(sessions)
	}
}

func BenchmarkBuildLanguageSummaries50k(b *testing.B) {
	sessions, _ := benchmarkSessions(50_000)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		benchmarkLanguageSummariesSink = buildLanguageSummaries(sessions)
	}
}

func BenchmarkBuildMachineSummaries50k(b *testing.B) {
	sessions, machineIndex := benchmarkSessions(50_000)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		benchmarkMachineSummariesSink = buildMachineSummaries(sessions, machineIndex)
	}
}

func BenchmarkBuildEventActivityKpis50k(b *testing.B) {
	sessions, _ := benchmarkSessions(5_000)
	events := benchmarkEvents(50_000, sessions)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		benchmarkEventKpisSink = buildEventActivityKpis(sessions, events, contracts.TrackingSettings{IdleTimeoutMinutes: 5}, contracts.ExtensionSettings{})
	}
}

func benchmarkEvents(total int, sessions []contracts.Session) []contracts.ActivityEvent {
	eventTypes := []string{"edit", "save", "open", "heartbeat", "focus", "blur"}
	events := make([]contracts.ActivityEvent, total)
	if len(sessions) == 0 {
		return events
	}
	for i := 0; i < total; i++ {
		session := sessions[i%len(sessions)]
		start, err := time.Parse(time.RFC3339, session.StartTime)
		if err != nil {
			continue
		}
		offset := time.Duration(i%60) * time.Second
		events[i] = contracts.ActivityEvent{
			ID:          "event-" + strconv.Itoa(i),
			Timestamp:   start.Add(offset).Format(time.RFC3339),
			EventType:   eventTypes[i%len(eventTypes)],
			MachineID:   session.MachineID,
			WorkspaceID: "workspace-1",
			ProjectName: session.ProjectName,
			Language:    session.Language,
		}
	}
	return events
}

func benchmarkSessions(total int) ([]contracts.Session, map[string]contracts.MachineInfo) {
	const machineCount = 24
	languages := []string{
		"go",
		"typescript",
		"typescriptreact",
		"json",
		"shellscript",
		"python",
		"yaml",
		"markdown",
	}
	osPlatforms := []string{"darwin", "linux", "windows"}

	machineIndex := make(map[string]contracts.MachineInfo, machineCount)
	for i := 0; i < machineCount; i++ {
		machineID := "machine-" + strconv.Itoa(i)
		machineIndex[machineID] = contracts.MachineInfo{
			MachineID:   machineID,
			MachineName: "Machine " + strconv.Itoa(i),
			OSPlatform:  osPlatforms[i%len(osPlatforms)],
		}
	}

	sessions := make([]contracts.Session, total)
	startAnchor := time.Date(2026, time.January, 1, 8, 0, 0, 0, time.UTC)
	for i := 0; i < total; i++ {
		dayOffset := i % 120
		hourOffset := i % 24
		minuteOffset := i % 60
		duration := 5 + (i % 180)
		start := startAnchor.
			AddDate(0, 0, dayOffset).
			Add(time.Duration(hourOffset)*time.Hour + time.Duration(minuteOffset)*time.Minute)
		end := start.Add(time.Duration(duration) * time.Minute)

		machineID := "machine-" + strconv.Itoa(i%machineCount)
		sessions[i] = contracts.Session{
			ID:              "session-" + strconv.Itoa(i),
			Date:            start.Format(dateLayout),
			StartTime:       start.Format(time.RFC3339),
			EndTime:         end.Format(time.RFC3339),
			DurationMinutes: duration,
			ProjectName:     "project-" + strconv.Itoa(i%48),
			Language:        languages[i%len(languages)],
			MachineID:       machineID,
			MachineName:     machineIndex[machineID].MachineName,
		}
	}

	return sessions, machineIndex
}
