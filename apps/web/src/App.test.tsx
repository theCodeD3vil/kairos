import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import App from '@/App';
import { landingLinks } from '@/lib/links';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderApp() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  act(() => {
    root?.render(<App />);
  });

  return container;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
  window.localStorage?.clear?.();
});

describe('App landing page', () => {
  it('renders the main sections and command blocks', () => {
    const view = renderApp();

    expect(view.textContent).toContain('Kairos');
    expect(view.textContent).toContain('Features');
    expect(view.textContent).toContain('Install');
    expect(view.textContent).toContain('FAQ');
    expect(view.textContent).toContain('brew install --cask kairos');
    expect(view.textContent).toContain('code --install-extension kairos-vscode-<version>.vsix');
  });

  it('wires primary CTA links from centralized config', () => {
    const view = renderApp();
    const download = view.querySelector('[data-testid="cta-download"]') as HTMLAnchorElement | null;
    const extension = view.querySelector('[data-testid="cta-extension"]') as HTMLAnchorElement | null;

    expect(download?.href).toBe(landingLinks.releasesLatest);
    expect(extension?.href).toBe(landingLinks.readmeVsCodeSection);
  });

  it('cycles theme mode from system to light and dark', () => {
    const view = renderApp();
    const toggle = view.querySelector('[data-testid="theme-toggle"]') as HTMLButtonElement | null;

    expect(toggle?.textContent).not.toContain('Theme:');
    expect(toggle?.getAttribute('title')).toContain('System');

    act(() => {
      toggle?.click();
    });

    expect(toggle?.getAttribute('title')).toContain('Light');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();

    act(() => {
      toggle?.click();
    });

    expect(toggle?.getAttribute('title')).toContain('Dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
