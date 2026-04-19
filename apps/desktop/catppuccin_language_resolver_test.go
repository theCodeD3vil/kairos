package main

import "testing"

func TestResolveMenubarCatppuccinLanguageIconKey(t *testing.T) {
	tests := []struct {
		name     string
		language string
		want     string
	}{
		{name: "direct map", language: "typescriptreact", want: "typescript-react"},
		{name: "display alias", language: "React", want: "typescript-react"},
		{name: "frontend alias", language: "mdc", want: "markdown"},
		{name: "fallback", language: "madeuplang", want: "_file"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := resolveMenubarCatppuccinLanguageIconKey(tc.language)
			if got != tc.want {
				t.Fatalf("resolveMenubarCatppuccinLanguageIconKey(%q) = %q, want %q", tc.language, got, tc.want)
			}
		})
	}
}

func TestNormalizeMenubarLanguageLabel(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{input: "typescriptreact", want: "React"},
		{input: "TypeScript React", want: "React"},
		{input: "TypeScript", want: "TypeScript"},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := normalizeMenubarLanguageLabel(tc.input)
			if got != tc.want {
				t.Fatalf("normalizeMenubarLanguageLabel(%q) = %q, want %q", tc.input, got, tc.want)
			}
		})
	}
}
