/*
 * One sky per night, the same for everyone. A new night starts at 00:00 UTC
 * (7 pm in New York in winter), so players around the world share a board.
 */
import { PUZZLES } from './puzzles';

/** Night 1 is this UTC date. */
export const LAUNCH = Date.UTC(2026, 10, 27); // 27 Nov 2026
const DAY = 86_400_000;

/** The night number for a moment in time (1, 2, 3, …). */
export function nightNumber(now: number = Date.now()): number {
  return Math.max(1, Math.floor((now - LAUNCH) / DAY) + 1);
}

/** Index into PUZZLES for a night. The 100 boards repeat after night 100. */
export function boardIndexForNight(night: number): number {
  return (((night - 1) % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
}

/** The night a built-in board index was (most recently, up to tonight) the nightly sky, or null. */
export function nightForBoardIndex(index: number, tonight: number = nightNumber()): number | null {
  if (index < 0 || index >= PUZZLES.length) return null;
  const first = index + 1;
  if (first > tonight) return null;
  return first + Math.floor((tonight - first) / PUZZLES.length) * PUZZLES.length;
}

/** Milliseconds until the next sky. */
export function msUntilNextNight(now: number = Date.now()): number {
  const into = (((now - LAUNCH) % DAY) + DAY) % DAY;
  return DAY - into;
}

/** "5h 12m" */
export function formatCountdown(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

/** Consecutive nights solved, ending tonight (or last night, if tonight isn't solved yet). */
export function streak(nights: readonly number[], tonight: number = nightNumber()): number {
  const set = new Set(nights);
  let n = set.has(tonight) ? tonight : tonight - 1;
  let count = 0;
  while (set.has(n)) {
    count++;
    n--;
  }
  return count;
}
