import { analyzeBoard, solutionKey } from '../../shared/game/analysis';
import { finalDot, type Triangle } from '../../shared/game/geometry';
import type { Puzzle } from '../../shared/game/puzzles';
import type { CommunityStats } from './api';

/*
 * The numbers behind route rarity, the community print and "where did everyone
 * end". From the server when it has enough solves; otherwise from the board's
 * own solutions (every solution counted once), and labeled that way.
 */
export type Insights = {
  basis: 'players' | 'solutions';
  /** How many players (or solutions) the numbers are based on. */
  total: number;
  /** Share of players/solutions using exactly your route, 0–100 (null if you didn't solve). */
  yourRoute: number | null;
  /** The most common routes, with their share. */
  topRoutes: { route: Triangle[]; share: number; yours: boolean }[];
  /** Dots that can be last, with their share. */
  finals: { dot: number; share: number }[];
  /** Triangle (sorted corners "a-b-c") → how often it was drawn, 0–1 relative to the most common. */
  triangles: { tri: Triangle; weight: number }[];
};

/** Server numbers are used once at least this many players have solved the board. */
export const MIN_PLAYERS = 5;

const triKey = (t: readonly number[]) => [...t].sort((a, b) => a - b).join('-');
const parseTri = (k: string) => k.split('-').map(Number) as unknown as Triangle;

const solutionCache = new Map<string, Triangle[][]>();
function solutionsOf(p: Puzzle): Triangle[][] {
  let s = solutionCache.get(p.number);
  if (!s) {
    s = analyzeBoard(p.points).solutions;
    solutionCache.set(p.number, s);
  }
  return s;
}

export function buildInsights(p: Puzzle, mine: readonly Triangle[] | null, server: CommunityStats | null): Insights {
  const mineKey = mine ? solutionKey(mine) : null;
  const all = solutionsOf(p);
  const byKey = new Map(all.map((s) => [solutionKey(s), s] as const));

  let basis: Insights['basis'];
  let total: number;
  let routeCounts: [string, number][];
  let finalCounts: [number, number][];
  let triCounts: [string, number][];

  if (server && server.total >= MIN_PLAYERS) {
    basis = 'players';
    total = server.total;
    routeCounts = Object.entries(server.routes);
    finalCounts = Object.entries(server.finals).map(([d, n]) => [Number(d), n]);
    triCounts = Object.entries(server.triangles);
  } else {
    basis = 'solutions';
    total = all.length;
    routeCounts = all.map((s) => [solutionKey(s), 1]);
    const f = new Map<number, number>();
    const t = new Map<string, number>();
    for (const s of all) {
      const d = finalDot(p.points.length, s);
      f.set(d, (f.get(d) ?? 0) + 1);
      for (const tri of s) t.set(triKey(tri), (t.get(triKey(tri)) ?? 0) + 1);
    }
    finalCounts = [...f];
    triCounts = [...t];
  }

  const share = (n: number) => (total ? Math.round((100 * n) / total) : 0);
  const routeMap = new Map(routeCounts);
  const yourRoute = mineKey ? share(routeMap.get(mineKey) ?? (basis === 'players' ? 1 : 0)) : null;
  const topRoutes = routeCounts
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, n]) => ({ route: byKey.get(k) ?? [], share: share(n), yours: k === mineKey }))
    .filter((r) => r.route.length === 4);
  const maxTri = Math.max(1, ...triCounts.map(([, n]) => n));
  return {
    basis,
    total,
    yourRoute,
    topRoutes,
    finals: finalCounts.map(([dot, n]) => ({ dot, share: share(n) })).sort((a, b) => b.share - a.share),
    triangles: triCounts.map(([k, n]) => ({ tri: parseTri(k), weight: n / maxTri })).sort((a, b) => a.weight - b.weight),
  };
}
