package views

import (
	"math"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/michaelnji/kairos/apps/desktop/internal/contracts"
)

const (
	longRunningFocusBlockMinMinutes = 15
	topFilesLimit                   = 5
	longFocusBlocksLimit            = 5
	areaBreakdownLimit              = 5
)

// File category classifier order: generated → build → infrastructure → test → config → docs → source → other.
// Each branch is documented in PLAN.MD under "Classifier rules".
const (
	fileCategorySource         = "source"
	fileCategoryTest           = "test"
	fileCategoryDocs           = "docs"
	fileCategoryConfig         = "config"
	fileCategoryBuild          = "build"
	fileCategoryGenerated      = "generated"
	fileCategoryInfrastructure = "infrastructure"
	fileCategoryOther          = "other"
)

type fileAggregate struct {
	filePath     string
	fileName     string
	category     string
	totalMinutes int
	eventCount   int
	editCount    int
	saveCount    int
	lastActiveAt string
}

type fileFocusAccumulator struct {
	filePath  string
	fileName  string
	startTime time.Time
	lastTime  time.Time
	count     int
}

// buildFileActivityKpis aggregates path-derived KPIs once the user opts in.
// Path-derived analytics are gated by both `privacy.fileMetricsEnabled` and
// `privacy.filePathMode != "hidden"`; either disables the feature returns the
// zero summary with explanatory flags so the UI can show the right empty state.
func buildFileActivityKpis(
	sessions []contracts.Session,
	events []contracts.ActivityEvent,
	privacy contracts.PrivacySettings,
	tracking contracts.TrackingSettings,
) contracts.FileKpiSummary {
	mode := strings.ToLower(strings.TrimSpace(privacy.FilePathMode))
	pathsHidden := mode == "hidden"
	summary := contracts.FileKpiSummary{
		OptInEnabled:           privacy.FileMetricsEnabled,
		FilePathsAvailable:     !pathsHidden,
		PathsMasked:            mode == "masked",
		TopFiles:               []contracts.FileHotspot{},
		MostRevisitedFiles:     []contracts.FileHotspot{},
		CategoryBreakdown:      []contracts.FileCategoryBreakdown{},
		FileChurnLeaders:       []contracts.FileHotspot{},
		LongRunningFocusBlocks: []contracts.FileFocusBlock{},
		ProjectAreaBreakdown:   []contracts.ProjectAreaBreakdown{},
	}

	if !privacy.FileMetricsEnabled || pathsHidden {
		return summary
	}

	idleTimeoutMinutes := tracking.IdleTimeoutMinutes
	if idleTimeoutMinutes <= 0 {
		idleTimeoutMinutes = 5
	}
	idleTimeout := time.Duration(idleTimeoutMinutes) * time.Minute

	groups := attributeEventsToSessions(sessions, events)
	files := make(map[string]*fileAggregate)
	categoryAggregates := make(map[string]*fileAggregate)
	areaAggregates := make(map[string]*fileAggregate)
	uniqueFilesPerSession := make([]int, 0, len(groups))
	focusBlocks := make([]contracts.FileFocusBlock, 0)
	openFocus := make(map[string]*fileFocusAccumulator)
	totalAttributedMinutes := 0

	for _, group := range groups {
		pathEvents := make([]contracts.ActivityEvent, 0)
		perFileEvents := make(map[string]int)
		for _, event := range group.events {
			normalized := normalizeFilePath(event.FilePath)
			if normalized == "" {
				continue
			}
			pathEvents = append(pathEvents, event)
			perFileEvents[normalized]++
		}
		if len(pathEvents) == 0 {
			continue
		}
		uniqueFilesPerSession = append(uniqueFilesPerSession, len(perFileEvents))

		for path, count := range perFileEvents {
			minutes := int(math.Round(float64(group.session.DurationMinutes) * (float64(count) / float64(len(pathEvents)))))
			totalAttributedMinutes += minutes
			file := files[path]
			if file == nil {
				file = &fileAggregate{
					filePath: path,
					fileName: filepath.Base(path),
					category: classifyFilePath(path),
				}
				files[path] = file
			}
			file.totalMinutes += minutes
			file.eventCount += count
			if group.session.EndTime > file.lastActiveAt {
				file.lastActiveAt = group.session.EndTime
			}

			categoryEntry := categoryAggregates[file.category]
			if categoryEntry == nil {
				categoryEntry = &fileAggregate{category: file.category}
				categoryAggregates[file.category] = categoryEntry
			}
			categoryEntry.totalMinutes += minutes
			categoryEntry.eventCount += count
			categoryEntry.editCount++

			areaKey := projectAreaKey(group.session.ProjectName, path)
			areaEntry := areaAggregates[areaKey]
			if areaEntry == nil {
				areaEntry = &fileAggregate{filePath: areaKey, fileName: areaKey}
				areaAggregates[areaKey] = areaEntry
			}
			areaEntry.totalMinutes += minutes
			areaEntry.eventCount += count
		}

		updateFileChurnCounts(files, group.events)
		processFocusBlocks(group.events, idleTimeout, openFocus, &focusBlocks)
	}

	for _, accumulator := range openFocus {
		focusBlocks = closeFocusBlock(accumulator, focusBlocks)
	}

	summary.TotalAttributedMinutes = totalAttributedMinutes
	summary.UniqueFileCount = len(files)
	summary.AverageUniqueFilesPerSession = averageInts(uniqueFilesPerSession)

	hotspots := buildHotspots(files, totalAttributedMinutes)
	summary.TopFiles = limitHotspots(hotspots, topFilesLimit)
	summary.MostRevisitedFiles = limitHotspots(sortByRevisits(hotspots), topFilesLimit)
	summary.FileChurnLeaders = limitHotspots(sortByChurn(hotspots), topFilesLimit)
	summary.CategoryBreakdown = buildCategoryBreakdown(files, categoryAggregates, totalAttributedMinutes)

	summary.TestVsSource = buildTestVsSource(summary.CategoryBreakdown)
	summary.DocumentationMinutes = lookupCategoryMinutes(summary.CategoryBreakdown, fileCategoryDocs)
	summary.ConfigMinutes = lookupCategoryMinutes(summary.CategoryBreakdown, fileCategoryConfig)
	summary.InfrastructureMinutes = lookupCategoryMinutes(summary.CategoryBreakdown, fileCategoryInfrastructure)

	summary.LongRunningFocusBlocks = limitFocusBlocks(focusBlocks, longFocusBlocksLimit)
	summary.ProjectAreaBreakdown = buildProjectAreaBreakdown(areaAggregates, totalAttributedMinutes)

	return summary
}

func normalizeFilePath(path string) string {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return ""
	}
	return strings.ReplaceAll(trimmed, "\\", "/")
}

// classifyFilePath returns the bucket name for `path` using the documented
// match order. The function lowercases once and reuses the result so each
// branch is cheap. Keep the order in sync with PLAN.MD.
func classifyFilePath(path string) string {
	if path == "" {
		return fileCategoryOther
	}
	lower := strings.ToLower(path)
	segments := strings.Split(lower, "/")
	base := filepath.Base(lower)
	ext := filepath.Ext(base)

	if isGeneratedPath(segments, base) {
		return fileCategoryGenerated
	}
	if isBuildPath(segments) {
		return fileCategoryBuild
	}
	if isInfrastructurePath(segments, base, ext) {
		return fileCategoryInfrastructure
	}
	if isTestPath(segments, base) {
		return fileCategoryTest
	}
	if isConfigPath(base, ext) {
		return fileCategoryConfig
	}
	if isDocsPath(segments, ext) {
		return fileCategoryDocs
	}
	if isSourcePath(ext) {
		return fileCategorySource
	}
	return fileCategoryOther
}

func isGeneratedPath(segments []string, base string) bool {
	for _, segment := range segments {
		if segment == "generated" || segment == ".gen" {
			return true
		}
	}
	if strings.Contains(base, ".generated.") {
		return true
	}
	if strings.HasSuffix(base, ".pb.go") || strings.HasSuffix(base, ".pb.ts") {
		return true
	}
	return false
}

func isBuildPath(segments []string) bool {
	buildSegments := map[string]struct{}{
		"dist":         {},
		"build":        {},
		"out":          {},
		"target":       {},
		"node_modules": {},
		".next":        {},
		".nuxt":        {},
		".svelte-kit":  {},
		"bin":          {},
		"obj":          {},
	}
	for _, segment := range segments {
		if _, ok := buildSegments[segment]; ok {
			return true
		}
	}
	return false
}

func isInfrastructurePath(segments []string, base string, ext string) bool {
	infraSegments := map[string]struct{}{
		".github":    {},
		"terraform":  {},
		"helm":       {},
		"k8s":        {},
		"kubernetes": {},
		"ansible":    {},
		"pulumi":     {},
		"cdk":        {},
	}
	for _, segment := range segments {
		if _, ok := infraSegments[segment]; ok {
			return true
		}
	}
	if ext == ".tf" || ext == ".tfvars" || ext == ".tfstate" {
		return true
	}
	if strings.HasPrefix(base, "dockerfile") {
		return true
	}
	if strings.HasPrefix(base, "docker-compose") {
		return true
	}
	if base == "makefile" || base == "procfile" {
		return true
	}
	return false
}

func isTestPath(segments []string, base string) bool {
	testSegments := map[string]struct{}{
		"__tests__": {},
		"test":      {},
		"tests":     {},
		"e2e":       {},
		"spec":      {},
		"__mocks__": {},
	}
	for _, segment := range segments {
		if _, ok := testSegments[segment]; ok {
			return true
		}
	}
	if strings.HasSuffix(base, "_test.go") {
		return true
	}
	if strings.HasPrefix(base, "test_") && strings.HasSuffix(base, ".py") {
		return true
	}
	testSuffixExtensions := []string{".ts", ".tsx", ".js", ".jsx", ".mts", ".mjs", ".py", ".rb"}
	for _, ext := range testSuffixExtensions {
		if strings.HasSuffix(base, ".test"+ext) || strings.HasSuffix(base, ".spec"+ext) {
			return true
		}
	}
	return false
}

func isConfigPath(base string, ext string) bool {
	configExtensions := map[string]struct{}{
		".json": {},
		".yaml": {},
		".yml":  {},
		".toml": {},
		".ini":  {},
		".env":  {},
		".cfg":  {},
		".conf": {},
	}
	if _, ok := configExtensions[ext]; ok {
		return true
	}
	wellKnown := map[string]struct{}{
		"package.json":        {},
		"tsconfig.json":       {},
		"pnpm-workspace.yaml": {},
		".eslintrc":           {},
		".prettierrc":         {},
	}
	if _, ok := wellKnown[base]; ok {
		return true
	}
	if strings.HasPrefix(base, ".") && ext == "" {
		return true
	}
	return false
}

func isDocsPath(segments []string, ext string) bool {
	docsExtensions := map[string]struct{}{
		".md":   {},
		".mdx":  {},
		".rst":  {},
		".adoc": {},
		".txt":  {},
	}
	if _, ok := docsExtensions[ext]; ok {
		return true
	}
	for _, segment := range segments {
		if segment == "docs" || segment == "documentation" {
			return true
		}
	}
	return false
}

func isSourcePath(ext string) bool {
	sourceExtensions := map[string]struct{}{
		".go":     {},
		".ts":     {},
		".tsx":    {},
		".js":     {},
		".jsx":    {},
		".py":     {},
		".rb":     {},
		".rs":     {},
		".java":   {},
		".kt":     {},
		".swift":  {},
		".c":      {},
		".cpp":    {},
		".cc":     {},
		".h":      {},
		".hpp":    {},
		".cs":     {},
		".php":    {},
		".lua":    {},
		".vue":    {},
		".svelte": {},
	}
	_, ok := sourceExtensions[ext]
	return ok
}

func projectAreaKey(projectName string, filePath string) string {
	cleanProject := strings.ToLower(strings.TrimSpace(projectName))
	cleanPath := strings.TrimPrefix(strings.ToLower(filePath), "/")
	if cleanProject != "" {
		cleanPath = strings.TrimPrefix(cleanPath, cleanProject+"/")
	}
	if cleanPath == "" {
		return projectName + "::(root)"
	}
	segments := strings.SplitN(cleanPath, "/", 2)
	area := segments[0]
	if area == filepath.Base(cleanPath) {
		area = "(root)"
	}
	return projectName + "::" + area
}

func updateFileChurnCounts(files map[string]*fileAggregate, events []contracts.ActivityEvent) {
	for _, event := range events {
		path := normalizeFilePath(event.FilePath)
		if path == "" {
			continue
		}
		entry, ok := files[path]
		if !ok {
			continue
		}
		switch normalizeEventType(event.EventType) {
		case "edit":
			entry.editCount++
		case "save":
			entry.saveCount++
		}
	}
}

func processFocusBlocks(
	events []contracts.ActivityEvent,
	idleTimeout time.Duration,
	openFocus map[string]*fileFocusAccumulator,
	blocks *[]contracts.FileFocusBlock,
) {
	for _, event := range events {
		eventType := normalizeEventType(event.EventType)
		if eventType != "edit" && eventType != "save" {
			continue
		}
		path := normalizeFilePath(event.FilePath)
		if path == "" {
			continue
		}
		ts, err := parseTimestamp(event.Timestamp)
		if err != nil {
			continue
		}
		current, ok := openFocus[path]
		if !ok {
			openFocus[path] = &fileFocusAccumulator{
				filePath:  path,
				fileName:  filepath.Base(path),
				startTime: ts,
				lastTime:  ts,
				count:     1,
			}
			continue
		}
		if ts.Sub(current.lastTime) > idleTimeout {
			*blocks = closeFocusBlock(current, *blocks)
			openFocus[path] = &fileFocusAccumulator{
				filePath:  path,
				fileName:  current.fileName,
				startTime: ts,
				lastTime:  ts,
				count:     1,
			}
			continue
		}
		current.lastTime = ts
		current.count++
	}
}

func closeFocusBlock(accumulator *fileFocusAccumulator, blocks []contracts.FileFocusBlock) []contracts.FileFocusBlock {
	duration := int(math.Round(accumulator.lastTime.Sub(accumulator.startTime).Minutes()))
	if duration < longRunningFocusBlockMinMinutes {
		return blocks
	}
	return append(blocks, contracts.FileFocusBlock{
		FilePath:        accumulator.filePath,
		FileName:        accumulator.fileName,
		StartTime:       accumulator.startTime.UTC().Format(time.RFC3339),
		EndTime:         accumulator.lastTime.UTC().Format(time.RFC3339),
		DurationMinutes: duration,
		EventCount:      accumulator.count,
	})
}

func buildHotspots(files map[string]*fileAggregate, total int) []contracts.FileHotspot {
	hotspots := make([]contracts.FileHotspot, 0, len(files))
	for _, file := range files {
		hotspots = append(hotspots, contracts.FileHotspot{
			FilePath:     file.filePath,
			FileName:     file.fileName,
			Category:     file.category,
			TotalMinutes: file.totalMinutes,
			EventCount:   file.eventCount,
			EditCount:    file.editCount,
			SaveCount:    file.saveCount,
			ShareOfTotal: percentOfTotal(file.totalMinutes, total),
			LastActiveAt: file.lastActiveAt,
		})
	}
	sort.SliceStable(hotspots, func(i int, j int) bool {
		if hotspots[i].TotalMinutes != hotspots[j].TotalMinutes {
			return hotspots[i].TotalMinutes > hotspots[j].TotalMinutes
		}
		return hotspots[i].FilePath < hotspots[j].FilePath
	})
	return hotspots
}

func sortByRevisits(hotspots []contracts.FileHotspot) []contracts.FileHotspot {
	cloned := append([]contracts.FileHotspot(nil), hotspots...)
	sort.SliceStable(cloned, func(i int, j int) bool {
		if cloned[i].EventCount != cloned[j].EventCount {
			return cloned[i].EventCount > cloned[j].EventCount
		}
		return cloned[i].FilePath < cloned[j].FilePath
	})
	return cloned
}

func sortByChurn(hotspots []contracts.FileHotspot) []contracts.FileHotspot {
	cloned := append([]contracts.FileHotspot(nil), hotspots...)
	sort.SliceStable(cloned, func(i int, j int) bool {
		left := cloned[i].EditCount + cloned[i].SaveCount
		right := cloned[j].EditCount + cloned[j].SaveCount
		if left != right {
			return left > right
		}
		return cloned[i].FilePath < cloned[j].FilePath
	})
	return cloned
}

func limitHotspots(hotspots []contracts.FileHotspot, limit int) []contracts.FileHotspot {
	if len(hotspots) <= limit {
		return hotspots
	}
	return hotspots[:limit]
}

func limitFocusBlocks(blocks []contracts.FileFocusBlock, limit int) []contracts.FileFocusBlock {
	sort.SliceStable(blocks, func(i int, j int) bool {
		if blocks[i].DurationMinutes != blocks[j].DurationMinutes {
			return blocks[i].DurationMinutes > blocks[j].DurationMinutes
		}
		return blocks[i].StartTime < blocks[j].StartTime
	})
	if len(blocks) <= limit {
		return blocks
	}
	return blocks[:limit]
}

func buildCategoryBreakdown(
	files map[string]*fileAggregate,
	categories map[string]*fileAggregate,
	total int,
) []contracts.FileCategoryBreakdown {
	fileCounts := make(map[string]int)
	for _, file := range files {
		fileCounts[file.category]++
	}
	out := make([]contracts.FileCategoryBreakdown, 0, len(categories))
	for category, entry := range categories {
		out = append(out, contracts.FileCategoryBreakdown{
			Category:     category,
			TotalMinutes: entry.totalMinutes,
			EventCount:   entry.eventCount,
			FileCount:    fileCounts[category],
			ShareOfTotal: percentOfTotal(entry.totalMinutes, total),
		})
	}
	sort.SliceStable(out, func(i int, j int) bool {
		if out[i].TotalMinutes != out[j].TotalMinutes {
			return out[i].TotalMinutes > out[j].TotalMinutes
		}
		return out[i].Category < out[j].Category
	})
	return out
}

func buildTestVsSource(breakdown []contracts.FileCategoryBreakdown) contracts.FileTestVsSource {
	testMinutes := lookupCategoryMinutes(breakdown, fileCategoryTest)
	sourceMinutes := lookupCategoryMinutes(breakdown, fileCategorySource)
	denominator := testMinutes + sourceMinutes
	share := 0.0
	if denominator > 0 {
		share = roundOneDecimal(float64(testMinutes) / float64(denominator) * 100)
	}
	return contracts.FileTestVsSource{
		TestMinutes:     testMinutes,
		SourceMinutes:   sourceMinutes,
		TestShareOfCode: share,
	}
}

func lookupCategoryMinutes(breakdown []contracts.FileCategoryBreakdown, category string) int {
	for _, entry := range breakdown {
		if entry.Category == category {
			return entry.TotalMinutes
		}
	}
	return 0
}

func buildProjectAreaBreakdown(
	areas map[string]*fileAggregate,
	total int,
) []contracts.ProjectAreaBreakdown {
	out := make([]contracts.ProjectAreaBreakdown, 0, len(areas))
	for key, entry := range areas {
		project, area, found := strings.Cut(key, "::")
		if !found {
			area = key
		}
		out = append(out, contracts.ProjectAreaBreakdown{
			ProjectName:  project,
			Area:         area,
			TotalMinutes: entry.totalMinutes,
			EventCount:   entry.eventCount,
			ShareOfTotal: percentOfTotal(entry.totalMinutes, total),
		})
	}
	sort.SliceStable(out, func(i int, j int) bool {
		if out[i].TotalMinutes != out[j].TotalMinutes {
			return out[i].TotalMinutes > out[j].TotalMinutes
		}
		if out[i].ProjectName != out[j].ProjectName {
			return out[i].ProjectName < out[j].ProjectName
		}
		return out[i].Area < out[j].Area
	})
	if len(out) > areaBreakdownLimit {
		out = out[:areaBreakdownLimit]
	}
	return out
}

func averageInts(values []int) float64 {
	if len(values) == 0 {
		return 0
	}
	total := 0
	for _, value := range values {
		total += value
	}
	return roundOneDecimal(float64(total) / float64(len(values)))
}
