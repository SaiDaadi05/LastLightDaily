/*
 * The rules of Last Dot, as geometry.
 *
 * The board is a 0..100 square. A move picks three remaining dots. It is legal
 * when exactly one other remaining dot is strictly inside the triangle, no
 * remaining dot touches one of its sides, and the three corners aren't (nearly)
 * in a straight line. A legal move removes the three corners; the inside dot stays.
 */

export type Point = readonly [number, number];
export type Triangle = readonly [number, number, number];

/** A side passing closer than this to a dot's center touches the drawn dot. */
export const EDGE_TOLERANCE = 2.5;
/** Twice the triangle's area; anything flatter counts as a straight line. */
export const MIN_DOUBLE_AREA = 60;

export type Verdict =
  | { ok: true; center: number }
  | { ok: false; reason: 'line' | 'edge' | 'none' | 'many'; count?: number };

const cross = (o: Point, a: Point, b: Point) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Distance from p to the segment a–b. */
export function segmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function judge(
  points: readonly Point[],
  tri: Triangle,
  alive: readonly boolean[]
): Verdict {
  const a = points[tri[0]]!;
  const b = points[tri[1]]!;
  const c = points[tri[2]]!;
  if (Math.abs(cross(a, b, c)) < MIN_DOUBLE_AREA) return { ok: false, reason: 'line' };
  const inside: number[] = [];
  let edge = false;
  for (let j = 0; j < points.length; j++) {
    if (!alive[j] || tri.includes(j)) continue;
    const p = points[j]!;
    const d = Math.min(segmentDistance(p, a, b), segmentDistance(p, b, c), segmentDistance(p, c, a));
    const s1 = cross(a, b, p);
    const s2 = cross(b, c, p);
    const s3 = cross(c, a, p);
    const isInside = (s1 > 0 && s2 > 0 && s3 > 0) || (s1 < 0 && s2 < 0 && s3 < 0);
    if (d < EDGE_TOLERANCE) edge = true;
    else if (isInside) inside.push(j);
  }
  if (edge) return { ok: false, reason: 'edge' };
  if (inside.length === 1) return { ok: true, center: inside[0]! };
  if (inside.length === 0) return { ok: false, reason: 'none' };
  return { ok: false, reason: 'many', count: inside.length };
}

export function verdictMessage(v: Verdict): string {
  if (v.ok) return '';
  switch (v.reason) {
    case 'line':
      return 'Those three are in a line.';
    case 'edge':
      return 'A star is touching a line.';
    case 'none':
      return 'No star inside.';
    case 'many':
      return `${v.count} stars inside.`;
  }
}

/** Every legal move from this position. */
export function legalMoves(points: readonly Point[], alive: readonly boolean[]): Triangle[] {
  const idx = alive.flatMap((v, i) => (v ? [i] : []));
  const out: Triangle[] = [];
  for (let x = 0; x < idx.length; x++)
    for (let y = x + 1; y < idx.length; y++)
      for (let z = y + 1; z < idx.length; z++) {
        const tri: Triangle = [idx[x]!, idx[y]!, idx[z]!];
        if (judge(points, tri, alive).ok) out.push(tri);
      }
  return out;
}

const solvableCache = new Map<string, boolean>();

/** Can this position still be taken down to a single dot? (memoized) */
export function isSolvable(boardId: string, points: readonly Point[], alive: readonly boolean[]): boolean {
  const left = alive.filter(Boolean).length;
  if (left === 1) return true;
  if (left < 4) return false;
  const key = `${boardId}:${alive.map((v) => (v ? 1 : 0)).join('')}`;
  const hit = solvableCache.get(key);
  if (hit !== undefined) return hit;
  let ok = false;
  for (const tri of legalMoves(points, alive)) {
    const next = alive.slice();
    for (const i of tri) next[i] = false;
    if (isSolvable(boardId, points, next)) {
      ok = true;
      break;
    }
  }
  solvableCache.set(key, ok);
  return ok;
}

/** Every distinct solution (as a set of triangles, order ignored). Used by tests. */
export function allSolutions(points: readonly Point[]): Triangle[][] {
  const seen = new Map<string, Triangle[]>();
  const walk = (alive: boolean[], path: Triangle[]) => {
    if (alive.filter(Boolean).length === 1) {
      const key = path.map((t) => [...t].sort((a, b) => a - b).join('-')).sort().join('|');
      if (!seen.has(key)) seen.set(key, path.slice());
      return;
    }
    for (const tri of legalMoves(points, alive)) {
      const next = alive.slice();
      for (const i of tri) next[i] = false;
      walk(next, [...path, tri]);
    }
  };
  walk(points.map(() => true), []);
  return [...seen.values()];
}

/** The dot that survives a full solution. */
export function finalDot(dotCount: number, moves: readonly Triangle[]): number {
  const used = new Set(moves.flat());
  for (let i = 0; i < dotCount; i++) if (!used.has(i)) return i;
  return -1;
}
