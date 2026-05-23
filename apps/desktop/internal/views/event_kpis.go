package views

import (
	"math"
	"sort"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

const (
	warmupSustainedEditWindowSeconds = 300
	warmupSustainedEditMinEdits      = 2
	activityBurstWindowSeconds       = 300
	activityBurstMinEvents           = 5
)

type eventTypeCounts struct {
	edit      int
	save      int
	open      int
	heartbeat int
	focus     int
	blur      int
}

func (c eventTypeCounts) total() int {
	return c.edit + c.save + c.open + c.heartbeat + c.focus + c.blur
}

func (c eventTypeCounts) active() int  { return c.edit + c.save }
func (c eventTypeCounts) passive() int { return c.heartbeat + c.focus + c.blur }
func (c eventTypeCounts) neutral() int { return c.open }

type sessionEvents struct {
	session contracts.Session
	events  []contracts.ActivityEvent
}

// Event activity KPI formulas: events join to a session when the timestamp falls
// inside [session.startTime, session.endTime] and machine + project match.
// All medians use medianInt over sorted slices to match existing helpers.
func buildEventActivityKpis(
	sessions []contracts.Session,
	events []contracts.ActivityEvent,
	tracking contracts.TrackingSettings,
	extension contracts.ExtensionSettings,
) contracts.EventActivityKpiSummary {
	summary := contracts.EventActivityKpiSummary{
		TrackEditEvents:        extension.TrackEditEvents,
		TrackSaveEvents:        extension.TrackSaveEvents,
		TrackFileOpenEvents:    extension.TrackFileOpenEvents,
		EventTypeMixByProject:  []contracts.EventTypeMixBucket{},
		EventTypeMixByLanguage: []contracts.EventTypeMixBucket{},
		EventTypeMixByMachine:  []contracts.EventTypeMixBucket{},
	}

	totalCounts := eventTypeCounts{}
	for _, event := range events {
		switch normalizeEventType(event.EventType) {
		case "edit":
			totalCounts.edit++
		case "save":
			totalCounts.save++
		case "open":
			totalCounts.open++
		case "heartbeat":
			totalCounts.heartbeat++
		case "focus":
			totalCounts.focus++
		case "blur":
			totalCounts.blur++
		}
	}
	summary.TotalEvents = totalCounts.total()

	groups := attributeEventsToSessions(sessions, events)
	inSessionCounts := eventTypeCounts{}
	totalSessionMinutes := 0
	heartbeatOnly := 0
	firstOpenToEditDurations := make([]int, 0, len(groups))
	editToSaveDurations := make([]int, 0, len(groups))
	warmupDurations := make([]int, 0, len(groups))
	activityBurstCount := 0

	for _, group := range groups {
		sessionCounts := countEventTypes(group.events)
		inSessionCounts.edit += sessionCounts.edit
		inSessionCounts.save += sessionCounts.save
		inSessionCounts.open += sessionCounts.open
		inSessionCounts.heartbeat += sessionCounts.heartbeat
		inSessionCounts.focus += sessionCounts.focus
		inSessionCounts.blur += sessionCounts.blur
		totalSessionMinutes += group.session.DurationMinutes

		if isHeartbeatOnlySession(sessionCounts) {
			heartbeatOnly++
		}

		if seconds, ok := firstOpenToFirstEditSeconds(group.events); ok {
			firstOpenToEditDurations = append(firstOpenToEditDurations, seconds)
		}
		if seconds, ok := medianEditToSaveSecondsForSession(group.events); ok {
			editToSaveDurations = append(editToSaveDurations, seconds)
		}
		if seconds, ok := sessionWarmupSeconds(group.events); ok {
			warmupDurations = append(warmupDurations, seconds)
		}
		if group.session.DurationMinutes >= defaultDeepWorkThresholdMinutes {
			activityBurstCount += activityBurstsForSession(group.events)
		}
	}

	summary.EventsInSessions = inSessionCounts.total()
	summary.EditCount = inSessionCounts.edit
	summary.SaveCount = inSessionCounts.save
	summary.OpenCount = inSessionCounts.open
	summary.HeartbeatCount = inSessionCounts.heartbeat
	summary.FocusCount = inSessionCounts.focus
	summary.BlurCount = inSessionCounts.blur
	summary.ActiveEventCount = inSessionCounts.active()
	summary.PassiveEventCount = inSessionCounts.passive()
	summary.NeutralEventCount = inSessionCounts.neutral()
	summary.ActiveShare = percentOfTotal(inSessionCounts.active(), inSessionCounts.total())
	summary.PassiveShare = percentOfTotal(inSessionCounts.passive(), inSessionCounts.total())
	summary.NeutralShare = percentOfTotal(inSessionCounts.neutral(), inSessionCounts.total())

	if totalSessionMinutes > 0 {
		summary.EventDensityPerMinute = roundOneDecimal(float64(inSessionCounts.total()) / float64(totalSessionMinutes))
	}
	if inSessionCounts.save > 0 {
		summary.EditSaveRatio = roundOneDecimal(float64(inSessionCounts.edit) / float64(inSessionCounts.save))
	}

	summary.MedianFirstOpenToFirstEditSeconds = medianFromUnsorted(firstOpenToEditDurations)
	summary.MedianEditToSaveSeconds = medianFromUnsorted(editToSaveDurations)
	summary.MedianSessionWarmupSeconds = medianFromUnsorted(warmupDurations)
	summary.WarmupQualifyingSessionCount = len(warmupDurations)
	summary.MedianReturnAfterIdleMinutes = medianReturnAfterIdleMinutes(sessions, tracking.IdleTimeoutMinutes)
	summary.ActivityBurstCount = activityBurstCount
	summary.HeartbeatOnlySessionCount = heartbeatOnly
	summary.HeartbeatOnlySessionShare = percentOfTotal(heartbeatOnly, len(sessions))

	summary.EventTypeMixByProject = topEventTypeMix(groups, func(s contracts.Session) string {
		return normalizeProjectName(s.ProjectName)
	})
	summary.EventTypeMixByLanguage = topEventTypeMix(groups, func(s contracts.Session) string {
		return strings.TrimSpace(s.Language)
	})
	summary.EventTypeMixByMachine = topEventTypeMix(groups, func(s contracts.Session) string {
		name := strings.TrimSpace(s.MachineName)
		if name != "" {
			return name
		}
		return strings.TrimSpace(s.MachineID)
	})

	return summary
}

func normalizeEventType(eventType string) string {
	return strings.ToLower(strings.TrimSpace(eventType))
}

func countEventTypes(events []contracts.ActivityEvent) eventTypeCounts {
	counts := eventTypeCounts{}
	for _, event := range events {
		switch normalizeEventType(event.EventType) {
		case "edit":
			counts.edit++
		case "save":
			counts.save++
		case "open":
			counts.open++
		case "heartbeat":
			counts.heartbeat++
		case "focus":
			counts.focus++
		case "blur":
			counts.blur++
		}
	}
	return counts
}

func isHeartbeatOnlySession(counts eventTypeCounts) bool {
	if counts.total() == 0 {
		return false
	}
	return counts.edit == 0 && counts.save == 0 && counts.open == 0
}

func attributeEventsToSessions(
	sessions []contracts.Session,
	events []contracts.ActivityEvent,
) []sessionEvents {
	index := indexEventsByMachineProject(events)
	out := make([]sessionEvents, 0, len(sessions))
	for _, session := range sessions {
		matched := matchEventsForSession(session, index)
		sort.SliceStable(matched, func(i int, j int) bool {
			return matched[i].Timestamp < matched[j].Timestamp
		})
		out = append(out, sessionEvents{session: session, events: matched})
	}
	return out
}

type indexedEvent struct {
	event contracts.ActivityEvent
	time  time.Time
}

func indexEventsByMachineProject(events []contracts.ActivityEvent) map[string][]indexedEvent {
	index := make(map[string][]indexedEvent)
	for _, event := range events {
		eventTime, err := parseTimestamp(event.Timestamp)
		if err != nil {
			continue
		}
		key := event.MachineID + "\x00" + normalizeProjectName(event.ProjectName)
		index[key] = append(index[key], indexedEvent{event: event, time: eventTime})
	}
	for key := range index {
		sort.Slice(index[key], func(i int, j int) bool {
			return index[key][i].time.Before(index[key][j].time)
		})
	}
	return index
}

func matchEventsForSession(session contracts.Session, index map[string][]indexedEvent) []contracts.ActivityEvent {
	start, err := parseTimestamp(session.StartTime)
	if err != nil {
		return nil
	}
	end, err := parseTimestamp(session.EndTime)
	if err != nil {
		return nil
	}
	key := session.MachineID + "\x00" + normalizeProjectName(session.ProjectName)
	bucket, ok := index[key]
	if !ok {
		return nil
	}
	lower := sort.Search(len(bucket), func(i int) bool {
		return !bucket[i].time.Before(start)
	})
	upper := sort.Search(len(bucket), func(i int) bool {
		return bucket[i].time.After(end)
	})
	if lower >= upper {
		return nil
	}
	out := make([]contracts.ActivityEvent, 0, upper-lower)
	for i := lower; i < upper; i++ {
		out = append(out, bucket[i].event)
	}
	return out
}

func firstOpenToFirstEditSeconds(events []contracts.ActivityEvent) (int, bool) {
	var firstOpen, firstEdit time.Time
	haveOpen := false
	haveEdit := false
	for _, event := range events {
		ts, err := parseTimestamp(event.Timestamp)
		if err != nil {
			continue
		}
		switch normalizeEventType(event.EventType) {
		case "open":
			if !haveOpen || ts.Before(firstOpen) {
				firstOpen = ts
				haveOpen = true
			}
		case "edit":
			if !haveEdit || ts.Before(firstEdit) {
				firstEdit = ts
				haveEdit = true
			}
		}
	}
	if !haveOpen || !haveEdit {
		return 0, false
	}
	delta := int(firstEdit.Sub(firstOpen).Seconds())
	if delta < 0 {
		return 0, false
	}
	return delta, true
}

func medianEditToSaveSecondsForSession(events []contracts.ActivityEvent) (int, bool) {
	pairs := make([]int, 0)
	var pendingEdit time.Time
	havePending := false
	for _, event := range events {
		ts, err := parseTimestamp(event.Timestamp)
		if err != nil {
			continue
		}
		switch normalizeEventType(event.EventType) {
		case "edit":
			pendingEdit = ts
			havePending = true
		case "save":
			if havePending {
				delta := int(ts.Sub(pendingEdit).Seconds())
				if delta >= 0 {
					pairs = append(pairs, delta)
				}
				havePending = false
			}
		}
	}
	if len(pairs) == 0 {
		return 0, false
	}
	sort.Ints(pairs)
	return medianInt(pairs), true
}

func sessionWarmupSeconds(events []contracts.ActivityEvent) (int, bool) {
	if len(events) == 0 {
		return 0, false
	}
	firstTs, err := parseTimestamp(events[0].Timestamp)
	if err != nil {
		return 0, false
	}
	edits := make([]time.Time, 0)
	for _, event := range events {
		if normalizeEventType(event.EventType) != "edit" {
			continue
		}
		ts, err := parseTimestamp(event.Timestamp)
		if err != nil {
			continue
		}
		edits = append(edits, ts)
	}
	if len(edits) < warmupSustainedEditMinEdits {
		return 0, false
	}
	sort.Slice(edits, func(i int, j int) bool { return edits[i].Before(edits[j]) })
	for i := 0; i+warmupSustainedEditMinEdits-1 < len(edits); i++ {
		window := edits[i+warmupSustainedEditMinEdits-1].Sub(edits[i]).Seconds()
		if window <= warmupSustainedEditWindowSeconds {
			delta := int(edits[i].Sub(firstTs).Seconds())
			if delta < 0 {
				delta = 0
			}
			return delta, true
		}
	}
	return 0, false
}

func activityBurstsForSession(events []contracts.ActivityEvent) int {
	active := make([]time.Time, 0)
	for _, event := range events {
		eventType := normalizeEventType(event.EventType)
		if eventType != "edit" && eventType != "save" {
			continue
		}
		ts, err := parseTimestamp(event.Timestamp)
		if err != nil {
			continue
		}
		active = append(active, ts)
	}
	if len(active) < activityBurstMinEvents {
		return 0
	}
	sort.Slice(active, func(i int, j int) bool { return active[i].Before(active[j]) })

	bursts := 0
	burstEnd := time.Time{}
	for i := 0; i+activityBurstMinEvents-1 < len(active); i++ {
		windowEnd := active[i+activityBurstMinEvents-1]
		if windowEnd.Sub(active[i]).Seconds() > activityBurstWindowSeconds {
			continue
		}
		if !burstEnd.IsZero() && !active[i].After(burstEnd) {
			continue
		}
		bursts++
		burstEnd = windowEnd
	}
	return bursts
}

func medianReturnAfterIdleMinutes(sessions []contracts.Session, idleTimeoutMinutes int) int {
	if idleTimeoutMinutes <= 0 {
		idleTimeoutMinutes = 5
	}
	ordered := cloneSessions(sessions)
	sort.SliceStable(ordered, func(i int, j int) bool {
		if ordered[i].MachineID != ordered[j].MachineID {
			return ordered[i].MachineID < ordered[j].MachineID
		}
		if ordered[i].Date != ordered[j].Date {
			return ordered[i].Date < ordered[j].Date
		}
		return ordered[i].StartTime < ordered[j].StartTime
	})
	gaps := make([]int, 0)
	for i := 1; i < len(ordered); i++ {
		previous := ordered[i-1]
		current := ordered[i]
		if previous.MachineID != current.MachineID || previous.Date != current.Date {
			continue
		}
		prevEnd, err := parseTimestamp(previous.EndTime)
		if err != nil {
			continue
		}
		nextStart, err := parseTimestamp(current.StartTime)
		if err != nil {
			continue
		}
		gapMinutes := int(math.Round(nextStart.Sub(prevEnd).Minutes()))
		if gapMinutes <= idleTimeoutMinutes {
			continue
		}
		gaps = append(gaps, gapMinutes)
	}
	if len(gaps) == 0 {
		return 0
	}
	sort.Ints(gaps)
	return medianInt(gaps)
}

func medianFromUnsorted(values []int) int {
	if len(values) == 0 {
		return 0
	}
	sort.Ints(values)
	return medianInt(values)
}

func topEventTypeMix(
	groups []sessionEvents,
	bucketKey func(contracts.Session) string,
) []contracts.EventTypeMixBucket {
	buckets := make(map[string]*eventTypeCounts)
	for _, group := range groups {
		key := bucketKey(group.session)
		if key == "" {
			continue
		}
		entry, ok := buckets[key]
		if !ok {
			entry = &eventTypeCounts{}
			buckets[key] = entry
		}
		counts := countEventTypes(group.events)
		entry.edit += counts.edit
		entry.save += counts.save
		entry.open += counts.open
		entry.heartbeat += counts.heartbeat
		entry.focus += counts.focus
		entry.blur += counts.blur
	}
	out := make([]contracts.EventTypeMixBucket, 0, len(buckets))
	for name, counts := range buckets {
		if counts.total() == 0 {
			continue
		}
		out = append(out, contracts.EventTypeMixBucket{
			Name:           name,
			TotalEvents:    counts.total(),
			EditCount:      counts.edit,
			SaveCount:      counts.save,
			OpenCount:      counts.open,
			HeartbeatCount: counts.heartbeat,
			FocusCount:     counts.focus,
			BlurCount:      counts.blur,
		})
	}
	sort.SliceStable(out, func(i int, j int) bool {
		if out[i].TotalEvents != out[j].TotalEvents {
			return out[i].TotalEvents > out[j].TotalEvents
		}
		return out[i].Name < out[j].Name
	})
	if len(out) > topSummaryLimit {
		out = out[:topSummaryLimit]
	}
	return out
}
