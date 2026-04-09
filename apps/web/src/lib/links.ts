export const landingLinks = {
  releasesLatest: 'https://github.com/theCodeD3vil/kairos/releases/latest',
  repository: 'https://github.com/theCodeD3vil/kairos',
  readme: 'https://github.com/theCodeD3vil/kairos/blob/main/README.md',
  readmeVsCodeSection: 'https://github.com/theCodeD3vil/kairos/blob/main/README.md#vs-code-extension',
  homebrewDocs: 'https://github.com/theCodeD3vil/kairos/blob/main/docs/homebrew-cask.md',
  desktopReleaseChecklist: 'https://github.com/theCodeD3vil/kairos/blob/main/docs/desktop-release-checklist.md',
  extensionReleaseChecklist: 'https://github.com/theCodeD3vil/kairos/blob/main/docs/extension-release-checklist.md',
} as const;

export type LandingLinkKey = keyof typeof landingLinks;
