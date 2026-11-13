/**
 * A clock that always reports the same instant. Tests use this so that dates
 * and timestamps are deterministic.
 *
 * The default instant is the demo date: 12 Nov 2026, 09:00 UTC.
 */
export type Clock = {
  now(): string;
  today(): string;
};

export const DEFAULT_FIXED_NOW = '2026-11-12T09:00:00.000Z';

export function fixedClock(at: string = DEFAULT_FIXED_NOW): Clock {
  return {
    now: () => at,
    today: () => at.slice(0, 10),
  };
}
