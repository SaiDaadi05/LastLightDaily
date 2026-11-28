import { segmentDistance, type Point } from './geometry';
import { rng } from './rng';

/*
 * Builds a board backwards from its final dot: start with one dot, then four
 * times wrap a triangle of three new dots around an existing dot. Every board
 * built this way is solvable. Used by scripts/generate-boards.ts and by the
 * board editor's "Surprise me".
 */

const MIN_SPACING = 15;
/** While building, every other dot stays this far from the new triangle's sides. */
const BUILD_MARGIN = 8;

const round1 = (v: number) => Math.round(v * 10) / 10;
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function canWrap(existing: Point[], tri: [Point, Point, Point], center: Point): boolean {
  const [a, b, c] = tri;
  if (Math.abs(cross(a, b, c)) < 350) return false; // not too skinny
  for (const p of tri) {
    if (p[0] < 8 || p[0] > 92 || p[1] < 8 || p[1] > 92) return false;
    if (existing.some((q) => dist(p, q) < MIN_SPACING)) return false;
  }
  if (dist(a, b) < MIN_SPACING || dist(b, c) < MIN_SPACING || dist(a, c) < MIN_SPACING) return false;
  const inside: Point[] = [];
  for (const q of existing) {
    const d = Math.min(segmentDistance(q, a, b), segmentDistance(q, b, c), segmentDistance(q, c, a));
    if (d < BUILD_MARGIN) return false;
    const s1 = cross(a, b, q);
    const s2 = cross(b, c, q);
    const s3 = cross(c, a, q);
    if ((s1 > 0 && s2 > 0 && s3 > 0) || (s1 < 0 && s2 < 0 && s3 < 0)) inside.push(q);
  }
  return inside.length === 1 && inside[0] === center;
}

/** A solvable 13-dot board from a seed, or null if this seed doesn't work out. */
export function buildBoard(seed: number): Point[] | null {
  const r = rng(seed);
  let pts: Point[] = [[round1(30 + r() * 40), round1(30 + r() * 40)]];
  for (let step = 0; step < 4; step++) {
    let placed = false;
    for (let attempt = 0; attempt < 4000 && !placed; attempt++) {
      const center = pts[Math.floor(r() * pts.length)]!;
      const radius = 14 + r() * 26;
      const base = r() * Math.PI * 2;
      const angles = [base, base + 1.6 + r()];
      angles.push(angles[1]! + 1.6 + r());
      const tri = angles.map(
        (t) =>
          [
            round1(center[0] + radius * (0.8 + r() * 0.5) * Math.cos(t)),
            round1(center[1] + radius * (0.8 + r() * 0.5) * Math.sin(t)),
          ] as Point
      ) as [Point, Point, Point];
      if (canWrap(pts, tri, center)) {
        pts = [...pts, ...tri];
        placed = true;
      }
    }
    if (!placed) return null;
  }
  // Shuffle so dot order says nothing about the solution.
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pts[i], pts[j]] = [pts[j]!, pts[i]!];
  }
  return pts;
}
