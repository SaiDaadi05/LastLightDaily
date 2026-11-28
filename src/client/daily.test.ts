import { describe, expect, it } from 'vitest';
import { buildSky, solutionsOf, starKind } from './community/sky';
import { solutionKey } from '../shared/game/analysis';
import { boardIndexForNight, LAUNCH, msUntilNextNight, nightForBoardIndex, nightNumber, streak } from '../shared/game/daily';
import { finalDot } from '../shared/game/geometry';
import { PUZZLES } from '../shared/game/puzzles';
import { shareText } from './game/share';

const DAY = 86_400_000;

describe('nights', () => {
  it('counts nights from launch in UTC and cycles through the boards', () => {
    expect(nightNumber(LAUNCH)).toBe(1);
    expect(nightNumber(LAUNCH + DAY - 1)).toBe(1);
    expect(nightNumber(LAUNCH + DAY)).toBe(2);
    expect(boardIndexForNight(1)).toBe(0);
    expect(boardIndexForNight(101)).toBe(0);
    expect(nightForBoardIndex(4, 3)).toBeNull(); // sky 5 hasn't risen on night 3
    expect(nightForBoardIndex(4, 205)).toBe(205);
    expect(msUntilNextNight(LAUNCH + DAY / 2)).toBe(DAY / 2);
  });
  it('streaks count back from tonight, or from last night if tonight is still open', () => {
    expect(streak([1, 2, 3], 3)).toBe(3);
    expect(streak([1, 2, 3], 4)).toBe(3);
    expect(streak([1, 3], 3)).toBe(1);
    expect(streak([1, 2], 4)).toBe(0);
  });
});

describe('shared sky', () => {
  const p = PUZZLES[11]!;
  const sols = solutionsOf(p);
  it('without a server, every possible last star is listed with solution shares', () => {
    const sky = buildSky(p, sols[0]!, null);
    expect(sky.basis).toBe('solutions');
    expect(sky.litCount).toBeNull();
    expect(sky.stars.length).toBe(new Set(sols.map((s) => finalDot(13, s))).size);
    expect(sky.mine?.dot).toBe(finalDot(13, sols[0]!));
  });
  it('with players, shares come from players and dark stars are counted', () => {
    const a = sols[0]!;
    const fa = finalDot(13, a);
    const server = {
      total: 6,
      routes: { [solutionKey(a)]: 6 },
      finals: { [fa]: 6 },
      triangles: {},
      discovered: { routes: [solutionKey(a)], finals: [fa] },
    };
    const sky = buildSky(p, a, server);
    expect(sky.basis).toBe('players');
    expect(sky.litCount).toBe(1);
    expect(sky.routesFound).toBe(1);
    expect(sky.mine).toMatchObject({ dot: fa, share: 100, kind: 'brightest' });
    expect(sky.stars.filter((s) => !s.lit).length).toBe(sky.stars.length - 1);
  });
  it('names star kinds by rarity', () => {
    expect(starKind(50, 0, 5)).toBe('brightest');
    expect(starKind(30, 1, 5)).toBe('bright');
    expect(starKind(20, 2, 5)).toBe('rare');
    expect(starKind(8, 3, 5)).toBe('lonely');
  });
  it('share text has no spoilers', () => {
    const t = shareText({
      puzzle: p,
      undos: 0,
      night: 12,
      star: { title: 'Lonely star', share: 6, basis: 'players' },
      sky: { lit: 5, of: 6 },
      streak: 3,
    });
    expect(t).toBe('Last Light · Night 12 · ' + { easy: 'Easy', medium: 'Medium', hard: 'Hard' }[p.difficulty] + '\n🟧🟦🟪🟨  0 undos\n✦ Lonely star (6% kept it)\n🌌 Sky 5/6 lit · 🔥 3 nights');
  });
});
