import { analyzeBoard } from '../../shared/game/analysis';
import { finalDot, type Triangle } from '../../shared/game/geometry';
import type { Puzzle } from '../../shared/game/puzzles';
import type { CommunityStats } from './api';
import { MIN_PLAYERS } from './insights';

/*
 * Tonight's shared sky: where everyone's last star ended, how much of the sky
 * the community has lit, and what kind of star you kept.
 */

export type StarKind = 'brightest' | 'bright' | 'rare' | 'lonely';

export type Sky = {
  /** 'players' once enough people have solved; until then, every solution counted once. */
  basis: 'players' | 'solutions';
  /** Players who lit this sky (0 without a server). */
  players: number;
  /** Every dot that can ever be the last one, with its share (0–100) and whether anyone has lit it. */
  stars: { dot: number; share: number; lit: boolean }[];
  /** How many of those stars have been lit by someone (null without a server). */
  litCount: number | null;
  /** Routes found by anyone / all routes (found is null without a server). */
  routesFound: number | null;
  routesTotal: number;
  /** Your star, if you solved it. */
  mine: { dot: number; share: number; kind: StarKind; rank: number } | null;
};

const cache = new Map<string, Triangle[][]>();
export function solutionsOf(p: Puzzle): Triangle[][] {
  let s = cache.get(p.number);
  if (!s) {
    s = analyzeBoard(p.points).solutions;
    cache.set(p.number, s);
  }
  return s;
}

export function starKind(share: number, rank: number, count: number): StarKind {
  if (rank === 0 && count > 1) return 'brightest';
  if (share <= 10 || rank === count - 1) return 'lonely';
  if (share <= 25) return 'rare';
  return 'bright';
}

export const STAR_LABEL: Record<StarKind, { title: string; line: string }> = {
  brightest: { title: 'Brightest star', line: 'You kept the star most people kept.' },
  bright: { title: 'Bright star', line: 'A popular place to end.' },
  rare: { title: 'Rare star', line: 'Few people ended here.' },
  lonely: { title: 'Lonely star', line: 'Almost nobody ended here. Well found.' },
};

export function buildSky(p: Puzzle, mine: readonly Triangle[] | null, server: CommunityStats | null): Sky {
  const all = solutionsOf(p);
  const possible = new Map<number, number>();
  for (const s of all) {
    const d = finalDot(p.points.length, s);
    possible.set(d, (possible.get(d) ?? 0) + 1);
  }
  const players = server?.total ?? 0;
  const basis: Sky['basis'] = server && players >= MIN_PLAYERS ? 'players' : 'solutions';
  const counts = basis === 'players' ? new Map(Object.entries(server!.finals).map(([d, n]) => [Number(d), n])) : possible;
  const total = basis === 'players' ? players : all.length;
  const litSet = server ? new Set([...(server.discovered?.finals ?? []), ...Object.keys(server.finals).map(Number)]) : null;

  const stars = [...possible.keys()]
    .map((dot) => ({
      dot,
      share: total ? Math.round((100 * (counts.get(dot) ?? 0)) / total) : 0,
      lit: litSet ? litSet.has(dot) : true,
    }))
    .sort((a, b) => b.share - a.share || a.dot - b.dot);

  let me: Sky['mine'] = null;
  if (mine) {
    const dot = finalDot(p.points.length, mine);
    const rank = stars.findIndex((s) => s.dot === dot);
    const share = stars[rank]?.share ?? 0;
    me = { dot, share, rank, kind: starKind(share, rank, stars.length) };
  }
  const found = server ? new Set([...(server.discovered?.routes ?? []), ...Object.keys(server.routes)]).size : null;
  return {
    basis,
    players,
    stars,
    litCount: litSet ? stars.filter((s) => s.lit).length : null,
    routesFound: found,
    routesTotal: all.length,
    mine: me,
  };
}
