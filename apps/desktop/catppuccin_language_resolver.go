package main

import "strings"

const catppuccinFallbackIconKey = "_file"

var catppuccinLanguageAliases = map[string]string{
	"golang":          "go",
	"javascriptreact": "javascript-react",
	"js":              "javascript",
	"jsx":             "javascript-react",
	"markdown":        "markdown",
	"md":              "markdown",
	"mdc":             "markdown",
	"plaintext":       "text",
	"py":              "python",
	"rs":              "rust",
	"ts":              "typescript",
	"tsx":             "typescript-react",
	"typescriptreact": "typescript-react",
	"yml":             "yaml",
}

var catppuccinLanguageQueryAliases = map[string]string{
	"react": "typescriptreact",
}

// normalizeMenubarLanguageLabel mirrors the frontend display-label normalization.
func normalizeMenubarLanguageLabel(language string) string {
	trimmed := strings.TrimSpace(language)
	if trimmed == "" {
		return language
	}
	replacer := strings.NewReplacer(" ", "", "_", "", "-", "")
	compact := strings.ToLower(replacer.Replace(trimmed))
	if compact == "typescriptreact" {
		return "React"
	}
	return trimmed
}

// resolveMenubarCatppuccinLanguageIconKey mirrors frontend language icon resolution.
func resolveMenubarCatppuccinLanguageIconKey(language string) string {
	normalized := strings.ToLower(strings.TrimSpace(language))
	if normalized == "" {
		return catppuccinFallbackIconKey
	}

	queryLanguage := normalized
	if aliased, ok := catppuccinLanguageQueryAliases[normalized]; ok {
		queryLanguage = aliased
	}

	if direct, ok := catppuccinLanguageIDToIconKey[queryLanguage]; ok && direct != "" {
		return direct
	}
	if aliased, ok := catppuccinLanguageAliases[queryLanguage]; ok && aliased != "" {
		return aliased
	}
	return catppuccinFallbackIconKey
}
