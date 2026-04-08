import { describe, expect, it } from 'vitest';
import { formatDurationHours, formatDurationMinutes } from '@/lib/time-format';

describe('formatDurationMinutes', () => {
  it('formats zero and sub-hour durations', () => {
    expect(formatDurationMinutes(0)).toBe('0m');
    expect(formatDurationMinutes(44)).toBe('44m');
  });

  it('formats mixed durations in short mode', () => {
    expect(formatDurationMinutes(60)).toBe('1h');
    expect(formatDurationMinutes(125)).toBe('2h 5m');
  });

  it('formats axis mode without unnecessary minutes', () => {
    expect(formatDurationMinutes(120, 'axis')).toBe('2h');
    expect(formatDurationMinutes(95, 'axis')).toBe('1h 35m');
  });

  it('formats long durations including days', () => {
    expect(formatDurationMinutes(1440, 'long')).toBe('1d');
    expect(formatDurationMinutes(1510, 'long')).toBe('1d 1h 10m');
  });
});

describe('formatDurationHours', () => {
  it('formats decimal hours through minute conversion', () => {
    expect(formatDurationHours(1.5, 'axis')).toBe('1h 30m');
    expect(formatDurationHours(8, 'long')).toBe('8h');
  });
});
