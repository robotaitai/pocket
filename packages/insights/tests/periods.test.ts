import { describe, expect, it, vi } from 'vitest';
import { onlyMonth, parsePeriodToken, sinceMonth } from '../src/periods.js';

describe('period helpers', () => {
  it('builds an exact month range from a YYYY-MM key', () => {
    expect(onlyMonth('2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-03-01',
    });
  });

  it('builds a trailing range from a since-month key', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));

    expect(sinceMonth('2025-10')).toEqual({
      start: '2025-10-01',
      end: '2026-05-01',
    });

    vi.useRealTimers();
  });

  it('parses only/since human-readable month tokens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));

    expect(parsePeriodToken('only 2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-03-01',
    });
    expect(parsePeriodToken('since 2025-10')).toEqual({
      start: '2025-10-01',
      end: '2026-05-01',
    });

    vi.useRealTimers();
  });
});
