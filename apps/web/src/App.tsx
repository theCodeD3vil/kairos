import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  Code2,
  Download,
  Home,
  Laptop,
  MoonStar,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import kairosMark from '@/assets/kairos-mark.svg';
import kairosOverview from '@/assets/kairos-overview.png';
import { landingLinks } from '@/lib/links';
import {
  applyThemeMode,
  loadThemeMode,
  saveThemeMode,
  subscribeToSystemThemeChange,
  type ThemeMode,
} from '@/lib/theme-mode';

const featureCards = [
  {
    title: 'Automatic Time Tracking',
    detail: 'Track coding time while you work, without manual timers.',
    icon: Workflow,
  },
  {
    title: 'Clear Daily Insights',
    detail: 'See where your time goes across projects, days, and weeks.',
    icon: Sparkles,
  },
  {
    title: 'Offline-First',
    detail: 'Keep tracking even without internet, then continue seamlessly.',
    icon: ShieldCheck,
  },
  {
    title: 'Desktop + VS Code',
    detail: 'Use Kairos desktop and the VS Code extension together in one flow.',
    icon: Settings,
  },
] as const;

const installCommands = {
  macos: ['brew tap theCodeD3vil/kairos https://github.com/theCodeD3vil/kairos', 'brew install --cask kairos'],
  linux: ['sudo dpkg -i kairos-linux-v<version>.deb', 'sudo apt-get install -f'],
  extension: ['Download kairos-vscode-<version>.vsix from latest release', 'code --install-extension kairos-vscode-<version>.vsix'],
} as const;

const faqItems = [
  {
    title: 'Where is my activity data stored?',
    answer: 'Your activity data stays on your computer by default.',
  },
  {
    title: 'Can I use Kairos without internet?',
    answer: 'Yes. Kairos is offline-first, so tracking continues even when you are offline.',
  },
  {
    title: 'How do I install updates?',
    answer: 'Install the latest release from GitHub, or run Homebrew upgrade on macOS.',
  },
] as const;

const themeCycle: ThemeMode[] = ['system', 'light', 'dark'];
const sectionOrder = ['top', 'features', 'install', 'extension', 'faq'] as const;
const dockItems = [
  { id: 'top', label: 'Home', icon: Home },
  { id: 'features', label: 'Highlights', icon: Sparkles },
  { id: 'install', label: 'Install', icon: CalendarDays },
  { id: 'extension', label: 'Extension', icon: Code2 },
  { id: 'faq', label: 'FAQ', icon: CircleHelp },
] as const;

function titleCaseMode(mode: ThemeMode) {
  return mode[0].toUpperCase() + mode.slice(1);
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [activeSection, setActiveSection] = useState<(typeof sectionOrder)[number]>('top');

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

  useEffect(() => {
    const sections = sectionOrder
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const pickFromPosition = () => {
      const probe = window.scrollY + window.innerHeight * 0.3;
      let current: (typeof sectionOrder)[number] = 'top';

      for (const section of sections) {
        if (probe >= section.offsetTop - 2) {
          current = section.id as (typeof sectionOrder)[number];
          continue;
        }
        break;
      }

      setActiveSection((prev) => (prev === current ? prev : current));
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(() => {
        pickFromPosition();
        ticking = false;
      });
    };

    pickFromPosition();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', pickFromPosition);
    window.addEventListener('hashchange', pickFromPosition);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', pickFromPosition);
      window.removeEventListener('hashchange', pickFromPosition);
    };
  }, []);

  function handleThemeToggle() {
    const idx = themeCycle.indexOf(themeMode);
    const next = themeCycle[(idx + 1) % themeCycle.length];
    setThemeMode(next);
  }

  function ThemeModeIcon() {
    if (themeMode === 'system') {
      return <Laptop className="h-4 w-4" />;
    }
    if (themeMode === 'dark') {
      return <MoonStar className="h-4 w-4" />;
    }
    return <Sun className="h-4 w-4" />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--surface-shell)] text-[var(--ink-strong)]">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-[var(--surface-navbar)]/92 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a className="flex items-center gap-2" href="#top" aria-label="Kairos top">
            <img src={kairosMark} alt="Kairos" className="h-7 w-7" />
            <span className="text-lg font-black">kairos.<span className="text-primary">app</span></span>
          </a>

          <nav className="hidden items-center gap-5 md:flex">
            <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#features">
              Features
            </a>
            <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#install">
              Install
            </a>
            <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#extension">
              Extension
            </a>
            <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#faq">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] min-w-[44px] px-0"
              aria-label="Team settings"
              title="Team settings"
              data-testid="team-toggle"
            >
              <Users className="h-4 w-4" />
            </Button>
            <Button asChild variant="outline" size="sm" className="min-h-[44px] min-w-[44px] px-3" aria-label="Open Kairos repository">
              <a href={landingLinks.repository} target="_blank" rel="noreferrer">
                <Code2 className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleThemeToggle}
              aria-label={`Toggle theme (current ${titleCaseMode(themeMode)})`}
              data-testid="theme-toggle"
              data-theme-mode={themeMode}
              title={`Theme: ${titleCaseMode(themeMode)}`}
              className="min-h-[44px] min-w-[44px] px-0"
            >
              <ThemeModeIcon />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-36">
        <section id="top" className="grid gap-8 border-b border-border/75 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center">
          <div className="space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--ink-muted)]">
              Kairos Desktop + VS Code
            </p>
            <h1 className="text-5xl font-semibold leading-none tracking-tight sm:text-6xl lg:text-7xl">
              Kairos
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[var(--ink-secondary)]">
              Offline-first code time tracking for developers.
            </p>
            <p className="max-w-xl text-base leading-8 text-[var(--ink-secondary)]">
              Understand how long you code, when you focus best, and where your time goes across projects with desktop + VS Code.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="min-h-[44px]" data-testid="cta-download">
                <a href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" /> Download Kairos
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="min-h-[44px]" data-testid="cta-extension">
                <a href={landingLinks.readmeVsCodeSection} target="_blank" rel="noreferrer">
                  <Code2 className="h-4 w-4" /> Get VS Code Extension
                </a>
              </Button>
            </div>
          </div>

          <figure>
            <img
              src={kairosOverview}
              alt="Kairos overview dashboard"
              className="w-full object-cover"
            />
          </figure>
        </section>

        <section id="features" className="space-y-8 border-b border-border/75 py-14">
          <h2 className="text-3xl font-semibold">Features</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="border-l-2 border-primary/45 pl-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/14 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-xl font-semibold">{feature.title}</h3>
                      <p className="mt-2 max-w-md text-sm leading-7 text-[var(--ink-secondary)]">{feature.detail}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="install" className="space-y-8 border-b border-border/75 py-14">
          <h2 className="text-3xl font-semibold">Install</h2>
          <div className="grid gap-10 lg:grid-cols-2">
            <article className="space-y-4">
              <h3 className="text-2xl font-semibold">macOS</h3>
              <div className="space-y-2 rounded-2xl border border-border/70 bg-black/90 p-4 text-xs text-emerald-300">
                {installCommands.macos.map((line) => (
                  <code key={line} className="block">{line}</code>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <a className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary hover:underline" href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                  Latest release <ArrowUpRight className="h-4 w-4" />
                </a>
                <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href={landingLinks.homebrewDocs} target="_blank" rel="noreferrer">
                  Homebrew docs <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </article>

            <article className="space-y-4">
              <h3 className="text-2xl font-semibold">Linux</h3>
              <div className="space-y-2 rounded-2xl border border-border/70 bg-black/90 p-4 text-xs text-emerald-300">
                {installCommands.linux.map((line) => (
                  <code key={line} className="block">{line}</code>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <a className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary hover:underline" href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                  Package download <ArrowUpRight className="h-4 w-4" />
                </a>
                <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href={landingLinks.desktopReleaseChecklist} target="_blank" rel="noreferrer">
                  Release checklist <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </article>
          </div>
        </section>

        <section id="extension" className="space-y-8 border-b border-border/75 py-14">
          <h2 className="text-3xl font-semibold">Extension</h2>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <article className="space-y-4">
              <h3 className="text-2xl font-semibold">VS Code Extension</h3>
              <p className="max-w-xl text-sm leading-7 text-[var(--ink-secondary)]">
                Add the extension in seconds and track coding time directly from VS Code.
              </p>
              <div className="space-y-2 rounded-2xl border border-border/70 bg-black/90 p-4 text-xs text-emerald-300">
                {installCommands.extension.map((line) => (
                  <code key={line} className="block">{line}</code>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <a className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary hover:underline" href={landingLinks.readmeVsCodeSection} target="_blank" rel="noreferrer">
                  Install docs <ArrowUpRight className="h-4 w-4" />
                </a>
                <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href={landingLinks.extensionReleaseChecklist} target="_blank" rel="noreferrer">
                  Artifact flow <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </article>

            <article className="space-y-5">
              <div className="border-l-2 border-primary/45 pl-5">
                <h3 className="text-lg font-semibold">Simple Setup</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-secondary)]">
                  Install desktop, install extension, and start tracking right away.
                </p>
              </div>
              <div className="border-l-2 border-primary/45 pl-5">
                <h3 className="text-lg font-semibold">One Experience</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-secondary)]">
                  Your desktop app and VS Code extension work together smoothly.
                </p>
              </div>
              <div className="border-l-2 border-primary/45 pl-5">
                <h3 className="text-lg font-semibold">Built for Focus</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--ink-secondary)]">
                  Spend less time guessing and more time improving your coding habits.
                </p>
              </div>
            </article>
          </div>
        </section>

        <section id="faq" className="space-y-4 border-b border-border/75 py-14">
          <h2 className="text-3xl font-semibold">FAQ</h2>
          <div>
            {faqItems.map((item) => (
              <article key={item.title} className="border-b border-border/65 py-4">
                <h3 className="pr-6 text-base font-semibold text-primary">{item.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-secondary)]">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-14">
          <div className="rounded-3xl border border-border/80 bg-[var(--surface-navbar)]/72 p-6 shadow-[var(--shadow-layered)]">
            <h2 className="text-3xl font-semibold">Start Tracking</h2>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button asChild size="lg" className="min-h-[44px]">
                <a href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                  Download Kairos
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-[44px]">
                <a href={landingLinks.repository} target="_blank" rel="noreferrer">
                  Open GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-4 left-1/2 z-30 hidden -translate-x-1/2 rounded-full border border-border/80 bg-[var(--surface-navbar)]/95 p-2 shadow-[var(--shadow-layered)] backdrop-blur-lg md:flex">
        {dockItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`dock-link ${isActive ? 'dock-link-active' : ''}`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
