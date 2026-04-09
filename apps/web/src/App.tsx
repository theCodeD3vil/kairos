import { useEffect, useMemo, useState } from 'react';
import { MoonStar, Sun, Download, Code2, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import kairosMark from '@/assets/kairos-mark.svg';
import { landingLinks } from '@/lib/links';
import { applyThemeMode, loadThemeMode, resolveEffectiveTheme, saveThemeMode, subscribeToSystemThemeChange, type ThemeMode } from '@/lib/theme-mode';

const featureItems = [
  {
    title: 'Local-First Timeline',
    points: ['Track coding activity in real time from VS Code.', 'Store activity in local SQLite, not cloud pipelines.'],
  },
  {
    title: 'Session Intelligence',
    points: ['Build coding sessions from raw activity events.', 'Review sessions by project, language, and machine.'],
  },
  {
    title: 'Desktop-Owned Settings',
    points: ['Keep preferences controlled by desktop app.', 'Sync effective settings to extension runtime.'],
  },
] as const;

const installCommands = {
  macos: ['brew tap theCodeD3vil/kairos https://github.com/theCodeD3vil/kairos', 'brew install --cask kairos'],
  linux: ['sudo dpkg -i kairos-linux-v<version>.deb', 'sudo apt-get install -f'],
  extension: ['pnpm --filter kairos-vscode package:vsix', 'code --install-extension apps/vscode-extension/dist/kairos-vscode-<version>.vsix'],
} as const;

const faqItems = [
  {
    title: 'Where is my activity data stored?',
    answer: 'Kairos v1 stores activity data locally by default using SQLite in your user config directory.',
  },
  {
    title: 'Does Kairos require cloud sync?',
    answer: 'No. Cloud sync is not part of v1, and tracking works with local desktop + extension runtime only.',
  },
  {
    title: 'How do I install updates?',
    answer: 'Desktop updates are release-driven. Use Homebrew upgrade on macOS or install the latest release package manually.',
  },
] as const;

const themeCycle: ThemeMode[] = ['system', 'light', 'dark'];

function titleCaseMode(mode: ThemeMode) {
  return mode[0].toUpperCase() + mode.slice(1);
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());

  useEffect(() => {
    applyThemeMode(themeMode);
    saveThemeMode(themeMode);

    if (themeMode !== 'system') {
      return;
    }

    return subscribeToSystemThemeChange(() => {
      applyThemeMode('system');
    });
  }, [themeMode]);

  const effectiveTheme = useMemo(() => resolveEffectiveTheme(themeMode), [themeMode]);

  function handleThemeToggle() {
    const idx = themeCycle.indexOf(themeMode);
    const next = themeCycle[(idx + 1) % themeCycle.length];
    setThemeMode(next);
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--surface-shell)] text-[var(--ink-strong)]">
      <div className="pointer-events-none absolute inset-0 subtle-grid opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.22), transparent 66%)' }}
        aria-hidden="true"
      />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-[var(--surface-navbar)]/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a className="inline-flex items-center gap-2" href="#top" aria-label="Kairos top">
            <img src={kairosMark} alt="Kairos" className="h-7 w-7" />
            <span className="font-title text-base font-semibold">Kairos</span>
          </a>

          <nav className="hidden items-center gap-5 md:flex">
            <a className="text-sm text-[var(--ink-secondary)] hover:text-foreground" href="#features">
              Features
            </a>
            <a className="text-sm text-[var(--ink-secondary)] hover:text-foreground" href="#install">
              Install
            </a>
            <a className="text-sm text-[var(--ink-secondary)] hover:text-foreground" href="#extension">
              Extension
            </a>
            <a className="text-sm text-[var(--ink-secondary)] hover:text-foreground" href="#faq">
              FAQ
            </a>
          </nav>

          <Button
            variant="outline"
            size="sm"
            onClick={handleThemeToggle}
            aria-label="Toggle theme"
            data-testid="theme-toggle"
            className="gap-2"
          >
            {effectiveTheme === 'dark' ? <MoonStar className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>Theme: {titleCaseMode(themeMode)}</span>
          </Button>
        </div>
      </header>

      <main id="top" className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <div className="grid gap-2 text-sm text-[var(--ink-secondary)] sm:text-base">
              <p>Local-first coding activity tracker for developers and teams.</p>
              <p>Desktop app plus VS Code extension with session and analytics workflows.</p>
            </div>

            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-[var(--ink-strong)] sm:text-5xl lg:text-6xl">Kairos</h1>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <a href={landingLinks.releasesLatest} target="_blank" rel="noreferrer" data-testid="cta-download">
                  <Download className="h-4 w-4" />
                  Download Kairos
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={landingLinks.readmeVsCodeSection} target="_blank" rel="noreferrer" data-testid="cta-extension">
                  <Code2 className="h-4 w-4" />
                  Get VS Code Extension
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-secondary)]">
              <span className="rounded-full bg-[var(--surface-chip)] px-3 py-1">macOS first release flow</span>
              <span className="rounded-full bg-[var(--surface-chip)] px-3 py-1">Linux package support</span>
              <span className="rounded-full bg-[var(--surface-chip)] px-3 py-1">Light + Dark theme parity</span>
            </div>
          </div>

          <Card className="relative overflow-hidden p-5 shadow-[var(--shadow-layered)] sm:p-6">
            <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[var(--surface-accent)]/30 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />

            <div className="relative space-y-4">
              <h2 className="text-xl font-semibold">Runtime Snapshot</h2>
              <div className="space-y-3 rounded-xl border border-border/70 bg-[var(--glass-light)] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--ink-secondary)]">Today</span>
                  <span className="font-numeric font-semibold">3h 42m</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 w-3/4 rounded-full bg-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--ink-secondary)]">
                  <span>Project: kairos</span>
                  <span>Language: TypeScript</span>
                  <span>Sessions: 6</span>
                  <span>Machine: Local</span>
                </div>
              </div>
              <pre className="overflow-x-auto rounded-xl bg-black/90 p-4 text-xs text-emerald-300">
{`$ kairos status\ntracking: active\neditor: vscode\nmode: local-first`}
              </pre>
            </div>
          </Card>
        </section>

        <section id="features" className="space-y-4">
          <h2 className="text-3xl font-semibold">Features</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {featureItems.map((item) => (
              <Card key={item.title} className="p-5">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--ink-secondary)]">
                  {item.points.map((point) => (
                    <li key={point}>• {point}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        <section id="install" className="space-y-4">
          <h2 className="text-3xl font-semibold">Install</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <h3 className="text-lg font-semibold">macOS</h3>
              <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-black/90 p-4 text-xs text-emerald-300">
                {installCommands.macos.map((line) => (
                  <code key={line} className="block">{line}</code>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Button asChild>
                  <a href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                    Download
                  </a>
                </Button>
                <Button asChild variant="ghost">
                  <a href={landingLinks.homebrewDocs} target="_blank" rel="noreferrer">
                    Docs <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-semibold">Linux</h3>
              <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-black/90 p-4 text-xs text-emerald-300">
                {installCommands.linux.map((line) => (
                  <code key={line} className="block">{line}</code>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Button asChild variant="outline">
                  <a href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                    Latest Release
                  </a>
                </Button>
                <Button asChild variant="ghost">
                  <a href={landingLinks.desktopReleaseChecklist} target="_blank" rel="noreferrer">
                    Checklist <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </Card>

            <Card id="extension" className="p-5">
              <h3 className="text-lg font-semibold">VS Code Extension</h3>
              <div className="mt-3 space-y-2 rounded-xl border border-border/70 bg-black/90 p-4 text-xs text-emerald-300">
                {installCommands.extension.map((line) => (
                  <code key={line} className="block">{line}</code>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Button asChild variant="secondary">
                  <a href={landingLinks.readmeVsCodeSection} target="_blank" rel="noreferrer">
                    Install Guide
                  </a>
                </Button>
                <Button asChild variant="ghost">
                  <a href={landingLinks.extensionReleaseChecklist} target="_blank" rel="noreferrer">
                    Release Flow <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </Card>
          </div>
        </section>

        <section id="faq" className="space-y-4">
          <h2 className="text-3xl font-semibold">FAQ</h2>
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details key={item.title} className="group rounded-2xl border border-border/70 bg-card/75 p-4">
                <summary className="cursor-pointer list-none text-base font-semibold">{item.title}</summary>
                <p className="mt-3 text-sm text-[var(--ink-secondary)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border/80 bg-[var(--glass-light)] px-6 py-8 shadow-[var(--shadow-layered)] sm:px-8">
          <h2 className="text-3xl font-semibold">Start Tracking</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                Download Kairos
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={landingLinks.repository} target="_blank" rel="noreferrer">
                Open GitHub
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
