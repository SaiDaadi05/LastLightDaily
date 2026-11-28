import { finalDot, judge, legalMoves, segmentDistance, type Point, type Triangle } from './geometry';

export type BoardStats = {
  /** Distinct solutions (sets of four triangles; order ignored). */
  solutions: Triangle[][];
  /** Complete games that end on one dot, counting move order. */
  orderedWins: number;
  /** Games of legal moves that get stuck before one dot. */
  stuckGames: number;
  firstMoves: number;
  /** Legal first moves after which one dot is no longer reachable. */
  deadFirstMoves: number;
  /** orderedWins / all games: how often random legal play wins. */
  winRate: number;
};

export const solutionKey = (moves: readonly Triangle[]) =>
  moves.map((t) => [...t].sort((a, b) => a - b).join('-')).sort().join('|');

/** Walk every game of legal moves on a board (used by the generator and the tests). */
export function analyzeBoard(points: readonly Point[]): BoardStats {
  const seen = new Map<string, Triangle[]>();
  let orderedWins = 0;
  let stuckGames = 0;
  const winsFrom: number[] = [];
  const walk = (alive: boolean[], path: Triangle[]): number => {
    if (alive.filter(Boolean).length === 1) {
      orderedWins++;
      const key = solutionKey(path);
      if (!seen.has(key)) seen.set(key, path.slice());
      return 1;
    }
    const moves = legalMoves(points, alive);
    if (!moves.length) {
      stuckGames++;
      return 0;
    }
    let wins = 0;
    for (const tri of moves) {
      const next = alive.slice();
      for (const i of tri) next[i] = false;
      const w = walk(next, [...path, tri]);
      if (path.length === 0) winsFrom.push(w);
      wins += w;
    }
    return wins;
  };
  walk(points.map(() => true), []);
  return {
    solutions: [...seen.values()],
    orderedWins,
    stuckGames,
    firstMoves: winsFrom.length,
    deadFirstMoves: winsFrom.filter((w) => w === 0).length,
    winRate: orderedWins / (orderedWins + stuckGames),
  };
}

/** Difficulty from how often random legal play wins. */
export const difficultyOf = (winRate: number): 'easy' | 'medium' | 'hard' =>
  winRate >= 0.24 ? 'easy' : winRate >= 0.16 ? 'medium' : 'hard';

/** A "clear" route keeps every other remaining dot at least this far from its sides. */
export const CLEAR_MARGIN = 6;

/** Smallest distance from any non-corner remaining dot to a side, over a route. */
export function clearance(points: readonly Point[], route: readonly Triangle[]): number {
  const alive = points.map(() => true);
  let worst = Infinity;
  for (const tri of route) {
    const [a, b, c] = tri.map((i) => points[i]!) as [Point, Point, Point];
    alive.forEach((on, j) => {
      if (!on || tri.includes(j)) return;
      worst = Math.min(worst, segmentDistance(points[j]!, a, b), segmentDistance(points[j]!, b, c), segmentDistance(points[j]!, c, a));
    });
    for (const i of tri) alive[i] = false;
  }
  return worst;
}

/** Put a solution's triangles in an order where every step is legal. */
export function playableOrder(points: readonly Point[], set: readonly Triangle[]): Triangle[] | null {
  const go = (alive: boolean[], left: readonly Triangle[], out: Triangle[]): Triangle[] | null => {
    if (!left.length) return out;
    for (let k = 0; k < left.length; k++) {
      const tri = left[k]!;
      if (!judge(points, tri, alive).ok) continue;
      const next = alive.slice();
      for (const i of tri) next[i] = false;
      const r = go(next, [...left.slice(0, k), ...left.slice(k + 1)], [...out, tri]);
      if (r) return r;
    }
    return null;
  };
  return go(points.map(() => true), set, []);
}

/**
 * Up to `count` showcase routes: the clearest solutions, each ending on a
 * different dot (for "Watch example" and "Compare solutions").
 */
export function pickRoutes(
  points: readonly Point[],
  solutions: readonly Triangle[][],
  count = 3,
  minClearance = CLEAR_MARGIN
): Triangle[][] {
  const ranked = solutions
    .map((set) => ({ set, c: clearance(points, set) }))
    .filter((x) => x.c > minClearance)
    .sort((x, y) => y.c - x.c);
  const routes: Triangle[][] = [];
  const ends = new Set<number>();
  for (const { set } of ranked) {
    const end = finalDot(points.length, set);
    if (ends.has(end)) continue;
    const ordered = playableOrder(points, set);
    if (!ordered) continue;
    routes.push(ordered);
    ends.add(end);
    if (routes.length === count) break;
  }
  return routes;
}
