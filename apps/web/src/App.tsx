import { type ReactNode, useEffect, useState } from 'react';
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
    title: 'Desktop-Authoritative',
    detail: 'Kairos Desktop is the canonical source of truth for long-term data, settings, and analytics.',
    icon: Workflow,
  },
  {
    title: 'Durable Offline Capture',
    detail: 'The VS Code extension stores events in a durable local outbox and replays them safely when desktop is back.',
    icon: Sparkles,
  },
  {
    title: 'Replay With Explicit Ack',
    detail: 'Events clear from the outbox only after desktop returns per-event accepted or duplicate acknowledgements.',
    icon: ShieldCheck,
  },
  {
    title: 'Local-First Privacy',
    detail: 'Your activity data stays on your machine with configurable file-path privacy and exclusion controls.',
    icon: Settings,
  },
] as const;

const faqItems = [
  {
    title: 'Does Desktop Need To Stay Open All Day?',
    answer:
      'No. You can keep coding with desktop closed. The extension buffers events in a durable local outbox and replays when desktop reconnects.',
  },
  {
    title: 'How Do I Install The VS Code Extension?',
    answer:
      'Kairos extension is installed manually from the release .vsix file. Download it from GitHub Releases, then run the install command from this page.',
  },
  {
    title: 'Where Is My Data Stored?',
    answer:
      'Kairos uses local SQLite databases. Desktop stores canonical long-term records. The extension stores a local operational outbox for offline durability.',
  },
] as const;

type DocsSlug = 'getting-started' | 'installation' | 'how-it-works' | 'troubleshooting';

const docsSidebarItems: { slug: DocsSlug; label: string; href: string }[] = [
  { slug: 'getting-started', label: 'Getting Started', href: '/docs/getting-started' },
  { slug: 'installation', label: 'Installation', href: '/docs/installation' },
  { slug: 'how-it-works', label: 'How It Works', href: '/docs/how-it-works' },
  { slug: 'troubleshooting', label: 'Troubleshooting', href: '/docs/troubleshooting' },
];

const docsPages: Record<DocsSlug, { title: string; sections: { title: string; content: ReactNode }[] }> = {
  'getting-started': {
    title: 'Getting Started',
    sections: [
      {
        title: 'Quick Setup Path',
        content: (
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li>Install Kairos Desktop from the latest release.</li>
            <li>Install the Kairos VS Code extension manually from the release <code>.vsix</code> file.</li>
            <li>Open desktop once so the extension can connect and sync settings.</li>
            <li>Start coding in VS Code.</li>
          </ol>
        ),
      },
      {
        title: 'What To Expect',
        content: (
          <>
            <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
              <li>Desktop is the long-term source of truth for your Kairos history and settings.</li>
              <li>The extension can keep tracking while desktop is closed and replay later.</li>
              <li>You do not need to keep desktop open every second of coding time.</li>
            </ul>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-secondary)]">
              The extension must still be installed manually from VSIX. Desktop installation does not auto-install VS Code extensions.
            </p>
          </>
        ),
      },
      {
        title: 'Connection States',
        content: (
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li><strong>Connected:</strong> extension can send events to desktop.</li>
            <li><strong>Offline or retrying:</strong> extension stores events locally in its durable outbox.</li>
            <li><strong>Reconnected:</strong> extension replays backlog and clears acknowledged events.</li>
          </ul>
        ),
      },
    ],
  },
  installation: {
    title: 'Installation',
    sections: [
      {
        title: 'Before You Start',
        content: (
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li>
              Download desktop package files from{' '}
              <a className="text-primary hover:underline" href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                GitHub Releases
              </a>
              .
            </li>
            <li>Download the VS Code extension <code>.vsix</code> from the same release page.</li>
            <li>Install desktop first, then install the extension manually.</li>
          </ul>
        ),
      },
      {
        title: 'macOS',
        content: (
          <>
            <h4 className="mt-3 text-sm font-semibold text-[var(--ink-strong)]">Option 1</h4>
            <pre className="mt-2 overflow-x-auto bg-slate-950 p-3 text-xs text-slate-100 sm:text-sm">
              <code>{`brew tap theCodeD3vil/kairos https://github.com/theCodeD3vil/kairos\nbrew install --cask kairos`}</code>
            </pre>
            <h4 className="mt-4 text-sm font-semibold text-[var(--ink-strong)]">Option 2</h4>
            <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
              <li>Download the macOS release package from GitHub Releases.</li>
              <li>Open the package and move Kairos into Applications.</li>
              <li>Launch Kairos from Applications.</li>
            </ol>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-secondary)]">
              If macOS blocks launch, open <strong>System Settings → Privacy &amp; Security</strong>, allow Kairos, and relaunch.
            </p>
          </>
        ),
      },
      {
        title: 'Linux or Ubuntu',
        content: (
          <>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-secondary)]">Download the Linux <code>.deb</code> package before running any command.</p>
            <h4 className="mt-3 text-sm font-semibold text-[var(--ink-strong)]">Recommended GUI Install</h4>
            <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
              <li>Open your Downloads folder.</li>
              <li>Double-click the <code>.deb</code> file.</li>
              <li>Install it using App Center or Ubuntu Software.</li>
            </ol>
            <h4 className="mt-4 text-sm font-semibold text-[var(--ink-strong)]">Terminal Fallback</h4>
            <pre className="mt-2 overflow-x-auto bg-slate-950 p-3 text-xs text-slate-100 sm:text-sm">
              <code>{`cd ~/Downloads\nsudo dpkg -i ./kairos-linux-v<version>.deb\nsudo apt-get install -f`}</code>
            </pre>
          </>
        ),
      },
      {
        title: 'VS Code Extension',
        content: (
          <>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-secondary)]">The extension is a separate manual install from VSIX.</p>
            <h4 className="mt-3 text-sm font-semibold text-[var(--ink-strong)]">Command Line</h4>
            <pre className="mt-2 overflow-x-auto bg-slate-950 p-3 text-xs text-slate-100 sm:text-sm">
              <code>{`code --install-extension /absolute/path/to/kairos-vscode-<version>.vsix --force`}</code>
            </pre>
            <h4 className="mt-4 text-sm font-semibold text-[var(--ink-strong)]">VS Code UI</h4>
            <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
              <li>Open Extensions panel in VS Code.</li>
              <li>Select the menu in the top-right.</li>
              <li>Choose <strong>Install from VSIX...</strong> and pick the downloaded file.</li>
            </ol>
          </>
        ),
      },
    ],
  },
  'how-it-works': {
    title: 'How It Works',
    sections: [
      {
        title: 'Desktop and Extension Roles',
        content: (
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li>Kairos Desktop stores your long-term local history and effective settings.</li>
            <li>The VS Code extension captures coding activity where you work.</li>
            <li>Both components communicate over local loopback on your machine.</li>
          </ul>
        ),
      },
      {
        title: 'Offline and Replay Behavior',
        content: (
          <>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
              <li>If desktop is unavailable, extension continues capturing locally.</li>
              <li>Events are queued in a durable local outbox.</li>
              <li>When desktop becomes available, extension reconnects and replays backlog.</li>
              <li>Events are cleared only after explicit desktop acknowledgement.</li>
            </ol>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-secondary)]">
              Duplicate acknowledgements are safe clear results, so replay stays reliable without double counting.
            </p>
          </>
        ),
      },
      {
        title: 'Settings Flow',
        content: (
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li>Desktop is the canonical authority for Kairos tracking settings.</li>
            <li>Extension keeps a mirrored snapshot for offline continuity.</li>
            <li>If desktop is unreachable, extension uses cached snapshot or sane defaults until reconnect.</li>
          </ul>
        ),
      },
      {
        title: 'What You See In VS Code',
        content: (
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li>Status bar and tooltip indicate connection and replay state.</li>
            <li>During outages, status indicates buffering or retrying instead of failing silently.</li>
            <li>After reconnect, backlog drains and status returns to connected.</li>
          </ul>
        ),
      },
    ],
  },
  troubleshooting: {
    title: 'Troubleshooting',
    sections: [
      {
        title: 'Desktop Not Detected In VS Code',
        content: (
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li>Open Kairos Desktop and wait for full startup.</li>
            <li>Confirm the Kairos extension is enabled in VS Code.</li>
            <li>Reload VS Code window with <code>Developer: Reload Window</code>.</li>
            <li>If still disconnected, restart both apps once.</li>
          </ol>
        ),
      },
      {
        title: 'macOS Gatekeeper Blocks Launch',
        content: (
          <>
            <p className="mt-3 text-sm leading-7 text-[var(--ink-secondary)]">
              If Kairos is blocked because it is from an unidentified developer, use this path.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
              <li>Try opening Kairos once from Applications.</li>
              <li>Open <strong>System Settings → Privacy &amp; Security</strong>.</li>
              <li>Find the Kairos notice and choose <strong>Open Anyway</strong>.</li>
              <li>Launch Kairos again and confirm.</li>
            </ol>
          </>
        ),
      },
      {
        title: 'VSIX Install Fails',
        content: (
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
            <li>Use the extension <code>.vsix</code> from the same release version as desktop.</li>
            <li>Use an absolute file path with <code>code --install-extension</code>.</li>
            <li>If CLI install fails, use VS Code Extensions menu and choose <strong>Install from VSIX...</strong>.</li>
          </ol>
        ),
      },
      {
        title: 'Backlog Does Not Drain After Reconnect',
        content: (
          <>
            <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-[var(--ink-secondary)]">
              <li>Keep desktop open for a minute and continue editing.</li>
              <li>Check extension status tooltip for retrying or backlog indicators.</li>
              <li>Reload VS Code window to restart extension runtime cleanly.</li>
            </ol>
            <p className="mt-4 text-sm leading-7 text-[var(--ink-secondary)]">
              Captured events are buffered locally and replayed when desktop is reachable.
            </p>
          </>
        ),
      },
    ],
  },
};

const themeCycle: ThemeMode[] = ['system', 'light', 'dark'];
const sectionOrder = ['top', 'features', 'architecture', 'install', 'extension', 'faq'] as const;
const dockItems = [
  { id: 'top', label: 'Home', icon: Home },
  { id: 'features', label: 'Highlights', icon: Sparkles },
  { id: 'architecture', label: 'Flow', icon: ShieldCheck },
  { id: 'install', label: 'Install', icon: CalendarDays },
  { id: 'extension', label: 'Extension', icon: Code2 },
  { id: 'faq', label: 'FAQ', icon: CircleHelp },
] as const;

function titleCaseMode(mode: ThemeMode) {
  return mode[0].toUpperCase() + mode.slice(1);
}

function normalizePath(pathname: string): string {
  if (pathname === '/') {
    return pathname;
  }
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function resolveDocsSlug(pathname: string): DocsSlug | null {
  const path = normalizePath(pathname);

  if (path === '/docs' || path === '/docs/index.html' || path === '/docs/getting-started' || path === '/docs/getting-started.html') {
    return 'getting-started';
  }
  if (path === '/docs/installation' || path === '/docs/installation.html' || path === '/docs/install.html') {
    return 'installation';
  }
  if (path === '/docs/how-it-works' || path === '/docs/how-it-works.html' || path === '/docs/how-kairos-works.html') {
    return 'how-it-works';
  }
  if (path === '/docs/troubleshooting' || path === '/docs/troubleshooting.html') {
    return 'troubleshooting';
  }

  return null;
}

export default function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode());
  const [activeSection, setActiveSection] = useState<(typeof sectionOrder)[number]>('top');
  const [pathname, setPathname] = useState(() => window.location.pathname);

  const docsSlug = resolveDocsSlug(pathname);
  const docsMode = docsSlug !== null;

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

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
    if (docsMode) {
      return;
    }

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
  }, [docsMode]);

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

  function renderDocs() {
    if (!docsSlug) {
      return null;
    }

    const page = docsPages[docsSlug];

    return (
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-7 sm:px-6 lg:px-8 lg:pb-36">
        <section className="grid gap-10 bg-[var(--surface-navbar)]/72 px-4 py-7 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:py-10">
          <aside className="sticky top-24 h-fit self-start">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)]">Documentation</h2>
            <nav className="mt-4 flex flex-col gap-1">
              {docsSidebarItems.map((item) => (
                <a
                  key={item.slug}
                  href={item.href}
                  className={`min-h-[44px] rounded-full px-3 py-2 text-sm transition-colors ${
                    docsSlug === item.slug
                      ? 'bg-[var(--surface-chip)] text-[var(--ink-strong)]'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-chip)]/65 hover:text-[var(--ink-strong)]'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          <section className="max-w-3xl">
            <h1 className="text-5xl font-semibold leading-none tracking-tight sm:text-6xl">{page.title}</h1>

            <div className="mt-9">
              {page.sections.map((section) => (
                <article key={section.title} className="space-y-3 py-8 first:pt-0">
                  <h2 className="text-3xl font-semibold">{section.title}</h2>
                  <div>{section.content}</div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>
    );
  }

  function renderLanding() {
    return (
      <>
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
                Kairos Desktop owns canonical history and settings. The VS Code extension captures activity locally, survives offline periods, and replays safely when desktop is available again.
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
                <Button asChild variant="outline" size="lg" className="min-h-[44px]">
                  <a href="/docs/getting-started">
                    <CircleHelp className="h-4 w-4" /> Read User Docs
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

          <section id="architecture" className="space-y-8 border-b border-border/75 py-14">
            <h2 className="text-3xl font-semibold">How It Works</h2>
            <div className="grid gap-8 lg:grid-cols-3">
              <article className="border-l-2 border-primary/45 pl-5">
                <h3 className="text-xl font-semibold">Desktop App</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-secondary)]">
                  Desktop runs a loopback-only local server, stores canonical long-term data in SQLite, and is the authority for effective settings.
                </p>
              </article>
              <article className="border-l-2 border-primary/45 pl-5">
                <h3 className="text-xl font-semibold">VS Code Extension</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-secondary)]">
                  Extension captures events and writes them to its own local durable outbox. If desktop is unavailable, tracking continues locally without losing captured events.
                </p>
              </article>
              <article className="border-l-2 border-primary/45 pl-5">
                <h3 className="text-xl font-semibold">Replay + Acknowledgement</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--ink-secondary)]">
                  When desktop reconnects, extension replays queued events through the normal ingestion API. Rows clear only after explicit accepted or duplicate acknowledgements.
                </p>
              </article>
            </div>
          </section>

          <section id="install" className="space-y-8 border-b border-border/75 py-14">
            <h2 className="text-3xl font-semibold">Install</h2>
            <div className="grid gap-10 lg:grid-cols-2">
              <article className="space-y-4">
                <h3 className="text-2xl font-semibold">macOS</h3>
                <p className="text-sm leading-7 text-[var(--ink-secondary)]">
                  Use Homebrew for a fast install and updates. For first-run macOS security prompts, follow the troubleshooting steps in docs.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary hover:underline" href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                    Latest release <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href={landingLinks.homebrewDocs} target="_blank" rel="noreferrer">
                    Homebrew docs <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href="/docs/installation">
                    Full install guide <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </article>

              <article className="space-y-4">
                <h3 className="text-2xl font-semibold">Linux</h3>
                <p className="text-sm leading-7 text-[var(--ink-secondary)]">
                  Download the .deb release package first. You can install by double-clicking in Ubuntu Software/App Center, or use terminal fallback if needed.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary hover:underline" href={landingLinks.releasesLatest} target="_blank" rel="noreferrer">
                    Package download <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href={landingLinks.desktopReleaseChecklist} target="_blank" rel="noreferrer">
                    Release checklist <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href="/docs/installation">
                    Full install guide <ArrowUpRight className="h-4 w-4" />
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
                  Install the extension manually from VSIX. The desktop app does not auto-install VS Code extensions.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <a className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-primary hover:underline" href={landingLinks.readmeVsCodeSection} target="_blank" rel="noreferrer">
                    Install docs <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href={landingLinks.extensionReleaseChecklist} target="_blank" rel="noreferrer">
                    Artifact flow <ArrowUpRight className="h-4 w-4" />
                  </a>
                  <a className="inline-flex min-h-[44px] items-center gap-1 text-[var(--ink-secondary)] hover:text-foreground" href="/docs/installation">
                    Full extension setup <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              </article>

              <article className="space-y-5">
                <div className="border-l-2 border-primary/45 pl-5">
                  <h3 className="text-lg font-semibold">Desktop Optional While Coding</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-secondary)]">
                    Desktop does not have to be running every second. The extension can keep capturing activity and replay it safely when desktop returns.
                  </p>
                </div>
                <div className="border-l-2 border-primary/45 pl-5">
                  <h3 className="text-lg font-semibold">Settings Stay Consistent</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-secondary)]">
                    Extension mirrors desktop-effective settings and uses cached snapshot/defaults when desktop is unavailable.
                  </p>
                </div>
                <div className="border-l-2 border-primary/45 pl-5">
                  <h3 className="text-lg font-semibold">Clear Connection States</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--ink-secondary)]">
                    Status bar and tooltip show connected, buffering, retrying, and backlog states so you always know what Kairos is doing.
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
      </>
    );
  }

  return (
    <div className={`relative min-h-screen bg-[var(--surface-shell)] text-[var(--ink-strong)] ${docsMode ? '' : 'overflow-x-hidden'}`}>
      <header className="sticky top-0 z-30 border-b border-border/70 bg-[var(--surface-navbar)]/92 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <a className="flex items-center gap-2" href={docsMode ? '/' : '#top'} aria-label="Kairos top">
            <img src={kairosMark} alt="Kairos" className="h-7 w-7" />
            <span className="text-lg font-black">kairos.<span className="text-primary">app</span></span>
          </a>

          {docsMode ? (
            <nav className="hidden items-center gap-5 md:flex">
              {docsSidebarItems.map((item) => (
                <a key={item.slug} className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          ) : (
            <nav className="hidden items-center gap-5 md:flex">
              <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#features">
                Features
              </a>
              <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#architecture">
                Flow
              </a>
              <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#install">
                Install
              </a>
              <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#extension">
                Extension
              </a>
              <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="/docs/getting-started">
                Docs
              </a>
              <a className="text-sm text-[var(--ink-secondary)] transition-colors hover:text-foreground" href="#faq">
                FAQ
              </a>
            </nav>
          )}

          <div className="flex items-center gap-2">
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

      {docsMode ? renderDocs() : renderLanding()}
    </div>
  );
}
