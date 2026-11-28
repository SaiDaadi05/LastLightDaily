import type { Point } from './geometry';

/*
 * A board as a short link-friendly code: each coordinate (0.0–100.0) is stored
 * in tenths (0–1000) as two base-36 characters, so 13 dots = 52 characters.
 */
export function encodeBoard(points: readonly Point[]): string {
  return points
    .flatMap(([x, y]) => [x, y])
    .map((v) => Math.round(Math.max(0, Math.min(100, v)) * 10).toString(36).padStart(2, '0'))
    .join('');
}

export function decodeBoard(code: string): Point[] | null {
  if (!/^[0-9a-z]+$/.test(code) || code.length % 4 !== 0 || code.length > 4 * 40) return null;
  const nums: number[] = [];
  for (let i = 0; i < code.length; i += 2) {
    const v = parseInt(code.slice(i, i + 2), 36);
    if (!Number.isFinite(v) || v > 1000) return null;
    nums.push(v / 10);
  }
  const pts: Point[] = [];
  for (let i = 0; i < nums.length; i += 2) pts.push([nums[i]!, nums[i + 1]!]);
  return pts;
}
