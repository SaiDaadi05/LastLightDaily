import { describe, expect, it } from 'vitest';
import { analyzeBoard, difficultyOf, solutionKey } from './analysis';
import { finalDot, judge, segmentDistance, type Point } from './geometry';
import { PUZZLES } from './puzzles';

const MIN_SPACING = 15;

describe('rules', () => {
  const pts: Point[] = [
    [10, 10], [90, 10], [50, 90], // a big triangle
    [50, 40], // inside it
    [50, 10.5], // on its top side
  ];
  it('accepts exactly one dot inside', () => {
    expect(judge(pts, [0, 1, 2], [true, true, true, true, false])).toEqual({ ok: true, center: 3 });
  });
  it('rejects a dot touching a side', () => {
    expect(judge(pts, [0, 1, 2], [true, true, true, true, true])).toMatchObject({ ok: false, reason: 'edge' });
  });
  it('rejects empty triangles and crowded ones', () => {
    expect(judge(pts, [0, 1, 2], [true, true, true, false, false])).toMatchObject({ ok: false, reason: 'none' });
    const crowded: Point[] = [[10, 10], [90, 10], [50, 90], [50, 30], [50, 50]];
    expect(judge(crowded, [0, 1, 2], crowded.map(() => true))).toMatchObject({ ok: false, reason: 'many', count: 2 });
  });
  it('rejects a straight line', () => {
    const line: Point[] = [[10, 10], [50, 50], [90, 90.5], [20, 80]];
    expect(judge(line, [0, 1, 2], line.map(() => true))).toMatchObject({ ok: false, reason: 'line' });
  });
});

describe('the board set', () => {
  it('has 100 boards: 30 easy, 40 medium, 30 hard', () => {
    expect(PUZZLES).toHaveLength(100);
    const count = (d: string) => PUZZLES.filter((p) => p.difficulty === d).length;
    expect([count('easy'), count('medium'), count('hard')]).toEqual([30, 40, 30]);
  });
  it('has no duplicate or near-copy boards', () => {
    for (let a = 0; a < PUZZLES.length; a++)
      for (let b = a + 1; b < PUZZLES.length; b++) {
        const close = PUZZLES[a]!.points.filter((p) =>
          PUZZLES[b]!.points.some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 4)
        ).length;
        expect(close, `#${PUZZLES[a]!.number} vs #${PUZZLES[b]!.number}`).toBeLessThan(8);
      }
  });
});

describe.each(PUZZLES.map((p) => [p.number, p] as const))('board #%s', (_n, puzzle) => {
  const pts = puzzle.points;

  it('is a verified, well-made puzzle', () => {
    // 13 well-spaced dots, away from the border
    expect(pts).toHaveLength(13);
    for (const [x, y] of pts) {
      expect(Math.min(x, y)).toBeGreaterThanOrEqual(6);
      expect(Math.max(x, y)).toBeLessThanOrEqual(94);
    }
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i]![0] - pts[j]![0], pts[i]![1] - pts[j]![1])).toBeGreaterThanOrEqual(MIN_SPACING);

    // every saved route plays 13 → 10 → 7 → 4 → 1, clearly, and they end on different dots
    expect(puzzle.routes).toHaveLength(3);
    for (const route of puzzle.routes) {
      const alive = pts.map(() => true);
      const counts = [13];
      for (const tri of route) {
        expect(judge(pts, tri, alive).ok).toBe(true);
        const [a, b, c] = tri.map((i) => pts[i]!) as [Point, Point, Point];
        alive.forEach((on, j) => {
          if (!on || tri.includes(j)) return;
          expect(Math.min(segmentDistance(pts[j]!, a, b), segmentDistance(pts[j]!, b, c), segmentDistance(pts[j]!, c, a))).toBeGreaterThan(6);
        });
        for (const i of tri) alive[i] = false;
        counts.push(alive.filter(Boolean).length);
      }
      expect(counts).toEqual([13, 10, 7, 4, 1]);
    }
    expect(new Set(puzzle.routes.map((r) => finalDot(13, r))).size).toBe(3);

    // the full solver agrees with the stored numbers, and the puzzle has real choices and dead ends
    const st = analyzeBoard(pts);
    const keys = new Set(st.solutions.map(solutionKey));
    for (const route of puzzle.routes) expect(keys.has(solutionKey(route))).toBe(true);
    expect(st.solutions.length).toBe(puzzle.solutions);
    expect(st.winRate).toBeCloseTo(puzzle.winRate, 3);
    expect(difficultyOf(st.winRate)).toBe(puzzle.difficulty);
    expect(st.solutions.length).toBeGreaterThan(3);
    expect(st.firstMoves).toBeGreaterThanOrEqual(8);
    expect(st.deadFirstMoves).toBeGreaterThan(0);
  });
});
