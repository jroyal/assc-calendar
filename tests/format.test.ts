import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Settings } from 'luxon';
import { getDateArray, formatDate, formatDuration } from '../src/lib/format';

describe('format library', () => {
  const fixedNow = new Date('2025-06-23T12:00:00Z');

  beforeEach(() => {
    Settings.now = () => fixedNow.getTime();
  });

  afterEach(() => {
    Settings.now = () => Date.now();
  });

  it('parses absolute dates correctly', () => {
    const result = getDateArray('Tuesday, July 1', '5:30 PM');
    expect(result).toEqual([2025, 7, 1, 22, 30]);
  });

  it('parses Tomorrow correctly', () => {
    const result = getDateArray('Tomorrow', '6:15 AM');
    expect(result).toEqual([2025, 6, 24, 11, 15]);
  });

  it('formats full date-time arrays', () => {
    const out = formatDate([2025, 7, 1, 22, 30]);
    expect(out).toBe('20250701T223000Z');
  });

  it('formats date-only arrays', () => {
    const out = formatDate([2025, 7, 1]);
    expect(out).toBe('20250701');
  });

  it('formats durations', () => {
    expect(formatDuration({ hours: 1, minutes: 30 })).toBe('PT1H30M');
    expect(formatDuration({ weeks: 1, days: 2 })).toBe('P1W2D');
    expect(formatDuration({})).toBe('P');
  });
});
