import { analyzeBoard, difficultyOf, pickRoutes, type BoardStats } from './analysis';
import { encodeBoard } from './boardCode';
import type { Point } from './geometry';
import type { Puzzle } from './puzzles';

export const DOTS_PER_BOARD = 13;
export const MIN_SPACING = 15;
export const BORDER = 6;

export type BoardCheck = {
  placed: number;
  spacingOk: boolean;
  /** Present once all 13 dots are placed and spaced. */
  stats?: BoardStats;
  solvable: boolean;
  hasDeadEnds: boolean;
  routes: number;
  difficulty?: Puzzle['difficulty'] | undefined;
};

export const spacingOk = (pts: readonly Point[]) =>
  pts.every(
    (p, i) =>
      p[0] >= BORDER &&
      p[0] <= 100 - BORDER &&
      p[1] >= BORDER &&
      p[1] <= 100 - BORDER &&
      pts.every((q, j) => j === i || Math.hypot(p[0] - q[0], p[1] - q[1]) >= MIN_SPACING)
  );

/** Everything the editor's checklist shows. Solving runs only once the board is complete. */
export function checkBoard(pts: readonly Point[]): BoardCheck {
  const base = { placed: pts.length, spacingOk: spacingOk(pts), solvable: false, hasDeadEnds: false, routes: 0 };
  if (pts.length !== DOTS_PER_BOARD || !base.spacingOk) return base;
  const stats = analyzeBoard(pts);
  return {
    ...base,
    stats,
    solvable: stats.solutions.length > 0,
    hasDeadEnds: stats.deadFirstMoves > 0,
    routes: pickRoutes(pts, stats.solutions, 3, 3).length,
    difficulty: stats.solutions.length ? difficultyOf(stats.winRate) : undefined,
  };
}

/** A playable puzzle from a player-made board (null if it can't be solved). */
export function customPuzzle(pts: readonly Point[], label = 'Custom'): Puzzle | null {
  if (pts.length !== DOTS_PER_BOARD || !spacingOk(pts)) return null;
  const stats = analyzeBoard(pts);
  if (!stats.solutions.length) return null;
  const routes = pickRoutes(pts, stats.solutions, 3, 3);
  return {
    number: `c-${encodeBoard(pts)}`,
    label,
    custom: true,
    points: pts,
    routes: routes.length ? routes : pickRoutes(pts, stats.solutions, 1, 0),
    solutions: stats.solutions.length,
    winRate: Math.round(stats.winRate * 1000) / 1000,
    difficulty: difficultyOf(stats.winRate),
  };
}
