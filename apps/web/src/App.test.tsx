import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
  }

  if (typeof window !== 'undefined' && !('IntersectionObserver' in window)) {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = '';
      thresholds: number[] = [];
    }
    (window as unknown as { IntersectionObserver: typeof IO }).IntersectionObserver = IO;
    (global as unknown as { IntersectionObserver: typeof IO }).IntersectionObserver = IO;
  }
});

afterAll(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('Landing page', () => {
  it('renders all major sections', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';

    expect(text).toMatch(/KAIROS/i);
    expect(text).toMatch(/Your\s+coding\s+time\./i);
    expect(text).toMatch(/On\s+your\s+machine\./i);
    expect(text).toMatch(/In\s+the\s+open\./i);
    expect(text).toMatch(/An open source alternative/i);
    expect(text).toMatch(/Built on a few simple ideas\./i);
    expect(text).toMatch(/Three pieces\.\s+Local data\./i);
    expect(text).toMatch(/Built for everyday coding\./i);
    expect(text).toMatch(/Your data never leaves home\./i);
    expect(text).toMatch(/Try Kairos today\./i);
    expect(text).not.toMatch(/Time trackers became spyware|Pick your poison|Stop renting your data/i);
  });

  it('renders nav and CTAs', () => {
    render(<App />);
    expect(screen.getByAltText(/Kairos logo/i)).toBeTruthy();
    expect(screen.getAllByText(/Features/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Privacy/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Download/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/View on GitHub/i).length).toBeGreaterThan(0);
  });

  it('uses the Kairos logo in app illustrations', () => {
    render(<App />);
    expect(screen.getAllByTestId('kairos-app-logo').length).toBeGreaterThanOrEqual(5);
  });

  it('shows current version constant', () => {
    render(<App />);
    expect(screen.getAllByText(/v1\.1\.14/i).length).toBeGreaterThan(0);
  });
});
