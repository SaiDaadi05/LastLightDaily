import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PUZZLES } from '../../shared/game/puzzles';

/** Just enough of Devvit's Redis for the community code, kept in memory. */
class FakeRedis {
  h = new Map<string, Map<string, string>>();
  z = new Map<string, Map<string, number>>();
  private hash(k: string) {
    let m = this.h.get(k);
    if (!m) this.h.set(k, (m = new Map()));
    return m;
  }
  private zset(k: string) {
    let m = this.z.get(k);
    if (!m) this.z.set(k, (m = new Map()));
    return m;
  }
  async hGet(k: string, f: string) {
    return this.h.get(k)?.get(f);
  }
  async hGetAll(k: string) {
    return Object.fromEntries(this.h.get(k) ?? []);
  }
  async hKeys(k: string) {
    return [...(this.h.get(k)?.keys() ?? [])];
  }
  async hMGet(k: string, fs: string[]) {
    return fs.map((f) => this.h.get(k)?.get(f) ?? null);
  }
  async hSet(k: string, fv: Record<string, string>) {
    for (const [f, v] of Object.entries(fv)) this.hash(k).set(f, v);
    return Object.keys(fv).length;
  }
  async hSetNX(k: string, f: string, v: string) {
    if (this.hash(k).has(f)) return 0;
    this.hash(k).set(f, v);
    return 1;
  }
  async hIncrBy(k: string, f: string, by: number) {
    const n = Number(this.hash(k).get(f) ?? 0) + by;
    this.hash(k).set(f, String(n));
    return n;
  }
  async hDel(k: string, fs: string[]) {
    for (const f of fs) this.hash(k).delete(f);
    return fs.length;
  }
  async zAdd(k: string, ...ms: { member: string; score: number }[]) {
    for (const m of ms) this.zset(k).set(m.member, m.score);
    return ms.length;
  }
  async zIncrBy(k: string, m: string, by: number) {
    const n = (this.zset(k).get(m) ?? 0) + by;
    this.zset(k).set(m, n);
    return n;
  }
  async zScore(k: string, m: string) {
    return this.z.get(k)?.get(m);
  }
  async zRange(k: string, start: number, stop: number, o?: { reverse?: boolean }) {
    const all = [...(this.z.get(k) ?? [])].map(([member, score]) => ({ member, score }));
    all.sort((a, b) => (o?.reverse ? b.score - a.score : a.score - b.score));
    return all.slice(start, stop + 1);
  }
}

const fake = { redis: new FakeRedis() };
vi.mock('@devvit/web/server', () => ({
  get redis() {
    return fake.redis;
  },
}));

const c = await import('./community');

const board = PUZZLES[11]!;
const [routeA, routeB, routeC] = board.routes;

describe('community storage', () => {
  beforeEach(() => {
    fake.redis = new FakeRedis();
  });

  it('counts each player once, but replays still light new stars and routes', async () => {
    let st = await c.recordSolve(board.number, routeA, 't2_alice');
    st = await c.recordSolve(board.number, routeB, 't2_bob');
    st = await c.recordSolve(board.number, routeA, 't2_bob'); // replay
    st = await c.recordSolve(board.number, routeC, 't2_alice'); // replay, new route
    expect(st.total).toBe(2);
    expect(Object.values(st.finals).reduce((a, b) => a + b, 0)).toBe(2);
    expect(st.discovered.routes).toHaveLength(3);
    expect(st.discovered.finals).toHaveLength(3);
    expect(await c.hasSolved(board.number, 't2_bob')).toBe(true);
    expect(await c.hasSolved(board.number, 't2_carol')).toBe(false);
  });

  it('rejects routes that break the rules and unknown boards', async () => {
    await expect(c.recordSolve(board.number, [routeA![0], routeA![0], routeA![0], routeA![0]], 't2_x')).rejects.toThrow();
    await expect(c.recordSolve(board.number, 'nope', 't2_x')).rejects.toThrow('route must be 4 triangles');
    await expect(c.recordSolve('999', routeA, 't2_x')).rejects.toThrow('unknown board');
    expect((await c.getStats(board.number)).total).toBe(0);
  });

  it('names: one per player per sky, renaming keeps votes, no voting for yourself', async () => {
    const p = await c.savePrint(board.number, routeA, 'The Kite', 't2_alice', 'alice');
    await expect(c.toggleVote(board.number, p.id, 't2_alice')).rejects.toThrow('own name');
    expect((await c.toggleVote(board.number, p.id, 't2_bob')).votes).toBe(1);
    expect((await c.toggleVote(board.number, p.id, 't2_carol')).voted).toBe(true);
    const renamed = await c.savePrint(board.number, routeB, '  The   Lantern ', 't2_alice', 'alice');
    expect(renamed.id).toBe(p.id);
    expect(renamed.name).toBe('The Lantern');
    expect(renamed.votes).toBe(2);
    await c.savePrint(board.number, routeC, 'The Heron', 't2_bob', 'bob');
    const list = await c.listPrints(board.number, 't2_bob');
    expect(list.map((x) => [x.name, x.votes, x.author])).toEqual([
      ['The Lantern', 2, 'alice'],
      ['The Heron', 0, 'bob'],
    ]);
    expect(list[0]!.voted).toBe(true);
    expect(list[1]!.mine).toBe(true);
    expect(await c.topName(board.number)).toBe('The Lantern');
    expect((await c.toggleVote(board.number, p.id, 't2_bob')).votes).toBe(1); // vote taken back
  });

  it('streaks come from nights solved on the night', async () => {
    for (const n of [3, 4, 5]) await c.recordNight('t2_alice', n);
    expect(await c.streakFor('t2_alice', 5)).toBe(3);
    expect(await c.streakFor('t2_alice', 6)).toBe(3);
    expect(await c.streakFor('t2_alice', 7)).toBe(0);
  });

  it('player-made skies are checked and deduplicated', async () => {
    await expect(c.submitBoard('garbage', 'x', 't2_alice', 'alice')).rejects.toThrow();
    const { encodeBoard } = await import('../../shared/game/boardCode');
    const code = encodeBoard(board.points);
    const a = await c.submitBoard(code, 'Copy of 12', 't2_alice', 'alice');
    const b = await c.submitBoard(code, 'Again', 't2_bob', 'bob');
    expect(b.id).toBe(a.id);
    expect((await c.listBoards()).map((x) => x.author)).toEqual(['alice']);
  });
});
