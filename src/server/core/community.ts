/*
 * The community side of Last Light, stored in the subreddit's Redis:
 * shared solve stats (the shared sky), nightly streaks, named constellations
 * with votes, and player-made skies. Every route and board is checked with
 * the game's own rules before it counts.
 *
 * Keys (Redis here is per subreddit):
 *   stats:<board>          hash  total, r:<route>, f:<dot>, t:<triangle>  (first solve per player)
 *   found:<board>          hash  r:<route>, f:<dot>                       (anything anyone found, replays too)
 *   solvedBy:<board>       hash  <userId> -> 1
 *   nights:<userId>        hash  <night> -> 1                             (solved on the night itself)
 *   prints:<board>         hash  <printId> -> PrintDoc JSON
 *   printOf:<board>        hash  <userId> -> <printId>
 *   printScore:<board>     zset  <printId> by votes
 *   myVotes:<board>:<uid>  hash  <printId> -> 1
 *   boards                 hash  <code> -> BoardDoc JSON
 *   boardsBy               hash  <userId> -> count
 *   nightPost              hash  <night> -> <postId>
 */
import { redis } from '@devvit/web/server';
import type { CommunityBoard, CommunityPrint, CommunityStats } from '../../shared/api';
import { solutionKey } from '../../shared/game/analysis';
import { decodeBoard, encodeBoard } from '../../shared/game/boardCode';
import { customPuzzle } from '../../shared/game/customBoard';
import { streak } from '../../shared/game/daily';
import { judge, type Point, type Triangle } from '../../shared/game/geometry';
import { PUZZLES } from '../../shared/game/puzzles';

export class HttpError extends Error {
  constructor(
    public status: 400 | 401 | 404 | 429,
    message: string,
    public login = false
  ) {
    super(message);
  }
}

/** Points for a board id: built-in "001"…"100", or "c-<code>" for a player-made one. */
export function pointsFor(board: string): readonly Point[] | null {
  const builtIn = PUZZLES.find((p) => p.number === board);
  if (builtIn) return builtIn.points;
  if (board.startsWith('c-')) {
    const pts = decodeBoard(board.slice(2));
    return pts && customPuzzle(pts) ? pts : null;
  }
  return null;
}

const isIndex = (v: unknown, n: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < n;

/** A route is valid if every step is a legal move and it ends on one star. */
export function checkRoute(points: readonly Point[], route: unknown): Triangle[] {
  if (!Array.isArray(route) || route.length !== 4) throw new HttpError(400, 'route must be 4 triangles');
  const alive = points.map(() => true);
  const out: Triangle[] = [];
  for (const t of route) {
    if (!Array.isArray(t) || t.length !== 3) throw new HttpError(400, 'bad triangle');
    const [a, b, c] = t;
    if (!isIndex(a, points.length) || !isIndex(b, points.length) || !isIndex(c, points.length))
      throw new HttpError(400, 'bad triangle');
    const tri: Triangle = [a, b, c];
    if (!judge(points, tri, alive).ok) throw new HttpError(400, 'route breaks the rules');
    for (const i of tri) alive[i] = false;
    out.push(tri);
  }
  if (alive.filter(Boolean).length !== 1) throw new HttpError(400, 'route must end on one star');
  return out;
}

export function cleanName(s: unknown): string {
  if (typeof s !== 'string') throw new HttpError(400, 'name required');
  // eslint-disable-next-line no-control-regex
  const name = s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (name.length < 2) throw new HttpError(400, 'name too short');
  return name;
}

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---- the shared sky ----------------------------------------------------------

export async function getStats(board: string): Promise<CommunityStats> {
  const [raw, found] = await Promise.all([redis.hGetAll(`stats:${board}`), redis.hKeys(`found:${board}`)]);
  const stats: CommunityStats = {
    total: Number(raw.total ?? 0),
    routes: {},
    finals: {},
    triangles: {},
    discovered: { routes: [], finals: [] },
  };
  for (const [field, value] of Object.entries(raw)) {
    const n = Number(value);
    if (field.startsWith('r:')) stats.routes[field.slice(2)] = n;
    else if (field.startsWith('f:')) stats.finals[field.slice(2)] = n;
    else if (field.startsWith('t:')) stats.triangles[field.slice(2)] = n;
  }
  for (const field of found) {
    if (field.startsWith('r:')) stats.discovered.routes.push(field.slice(2));
    else if (field.startsWith('f:')) stats.discovered.finals.push(Number(field.slice(2)));
  }
  return stats;
}

/**
 * Count a finished sky. Each player counts once per sky; replays still light
 * new routes and last stars for everyone.
 */
export async function recordSolve(board: string, routeIn: unknown, userId: string): Promise<CommunityStats> {
  const pts = pointsFor(board);
  if (!pts) throw new HttpError(404, 'unknown board');
  const route = checkRoute(pts, routeIn);
  const key = solutionKey(route);
  const used = new Set(route.flat());
  const fin = pts.findIndex((_, i) => !used.has(i));
  await Promise.all([redis.hSetNX(`found:${board}`, `r:${key}`, '1'), redis.hSetNX(`found:${board}`, `f:${fin}`, '1')]);
  const first = await redis.hSetNX(`solvedBy:${board}`, userId, '1');
  if (first === 1) {
    const st = `stats:${board}`;
    await Promise.all([
      redis.hIncrBy(st, 'total', 1),
      redis.hIncrBy(st, `r:${key}`, 1),
      redis.hIncrBy(st, `f:${fin}`, 1),
      ...route.map((t) => redis.hIncrBy(st, `t:${[...t].sort((x, y) => x - y).join('-')}`, 1)),
    ]);
  }
  return getStats(board);
}

export async function litCount(board: string): Promise<number> {
  return Number((await redis.hGet(`stats:${board}`, 'total')) ?? 0);
}

export async function hasSolved(board: string, userId: string): Promise<boolean> {
  return (await redis.hGet(`solvedBy:${board}`, userId)) !== undefined;
}

// ---- streaks -------------------------------------------------------------------

export async function recordNight(userId: string, night: number): Promise<void> {
  await redis.hSetNX(`nights:${userId}`, String(night), '1');
}

export async function streakFor(userId: string, tonight: number): Promise<number> {
  const nights = (await redis.hKeys(`nights:${userId}`)).map(Number);
  return streak(nights, tonight);
}

// ---- named constellations --------------------------------------------------------

type PrintDoc = {
  id: string;
  board: string;
  name: string;
  route: Triangle[];
  player: string;
  author: string | null;
  createdAt: string;
};

function parsePrint(json: string | null | undefined): PrintDoc | null {
  if (!json) return null;
  try {
    const v: unknown = JSON.parse(json);
    if (!v || typeof v !== 'object') return null;
    const o: Record<string, unknown> = { ...v };
    const route = Array.isArray(o.route) ? o.route : [];
    const tris: Triangle[] = [];
    for (const t of route) {
      if (Array.isArray(t) && t.length === 3 && t.every((i) => typeof i === 'number')) {
        const [a, b, c] = t;
        if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number') tris.push([a, b, c]);
      }
    }
    if (typeof o.id !== 'string' || typeof o.board !== 'string' || typeof o.name !== 'string' || typeof o.player !== 'string')
      return null;
    return {
      id: o.id,
      board: o.board,
      name: o.name,
      route: tris,
      player: o.player,
      author: typeof o.author === 'string' ? o.author : null,
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : '',
    };
  } catch {
    return null;
  }
}

const publicPrint = (p: PrintDoc, votes: number, me: string | null, voted: boolean): CommunityPrint => ({
  id: p.id,
  board: p.board,
  name: p.name,
  route: p.route,
  votes,
  mine: me !== null && p.player === me,
  voted,
  author: p.author,
});

export async function listPrints(board: string, me: string | null): Promise<CommunityPrint[]> {
  const ranked = await redis.zRange(`printScore:${board}`, 0, 29, { by: 'rank', reverse: true });
  if (ranked.length === 0) return [];
  const ids = ranked.map((r) => r.member);
  const [docs, mine] = await Promise.all([
    redis.hMGet(`prints:${board}`, ids),
    me ? redis.hGetAll(`myVotes:${board}:${me}`) : Promise.resolve<Record<string, string>>({}),
  ]);
  const out: CommunityPrint[] = [];
  ranked.forEach((r, i) => {
    const p = parsePrint(docs[i]);
    if (p) out.push(publicPrint(p, r.score, me, mine[p.id] !== undefined));
  });
  return out;
}

/** One name per player per sky; naming again renames it. */
export async function savePrint(
  board: string,
  routeIn: unknown,
  nameIn: unknown,
  userId: string,
  username: string | null
): Promise<CommunityPrint> {
  const pts = pointsFor(board);
  if (!pts) throw new HttpError(404, 'unknown board');
  const route = checkRoute(pts, routeIn);
  const name = cleanName(nameIn);
  const existingId = await redis.hGet(`printOf:${board}`, userId);
  const existing = existingId ? parsePrint(await redis.hGet(`prints:${board}`, existingId)) : null;
  const doc: PrintDoc = existing
    ? { ...existing, name, route, author: username ?? existing.author }
    : { id: newId(), board, name, route, player: userId, author: username, createdAt: new Date().toISOString() };
  await redis.hSet(`prints:${board}`, { [doc.id]: JSON.stringify(doc) });
  if (!existing) {
    await redis.hSet(`printOf:${board}`, { [userId]: doc.id });
    await redis.zAdd(`printScore:${board}`, { member: doc.id, score: 0 });
  }
  const votes = (await redis.zScore(`printScore:${board}`, doc.id)) ?? 0;
  return publicPrint(doc, votes, userId, false);
}

/** Vote for someone else's name, or take the vote back. */
export async function toggleVote(board: string, printId: string, userId: string): Promise<CommunityPrint> {
  const p = parsePrint(await redis.hGet(`prints:${board}`, printId));
  if (!p) throw new HttpError(404, 'unknown name');
  if (p.player === userId) throw new HttpError(400, 'you cannot vote for your own name');
  const mineKey = `myVotes:${board}:${userId}`;
  const had = (await redis.hGet(mineKey, printId)) !== undefined;
  if (had) await redis.hDel(mineKey, [printId]);
  else await redis.hSet(mineKey, { [printId]: '1' });
  const votes = await redis.zIncrBy(`printScore:${board}`, printId, had ? -1 : 1);
  return publicPrint(p, votes, userId, !had);
}

export async function topName(board: string): Promise<string | null> {
  const [top] = await redis.zRange(`printScore:${board}`, 0, 0, { by: 'rank', reverse: true });
  if (!top) return null;
  return parsePrint(await redis.hGet(`prints:${board}`, top.member))?.name ?? null;
}

// ---- player-made skies -------------------------------------------------------------

type BoardDoc = Omit<CommunityBoard, 'plays'> & { player: string; createdAt: string };

function parseBoard(json: string): BoardDoc | null {
  try {
    const v: unknown = JSON.parse(json);
    if (!v || typeof v !== 'object') return null;
    const o: Record<string, unknown> = { ...v };
    if (typeof o.id !== 'string' || typeof o.code !== 'string' || typeof o.name !== 'string' || typeof o.player !== 'string')
      return null;
    return {
      id: o.id,
      code: o.code,
      name: o.name,
      player: o.player,
      author: typeof o.author === 'string' ? o.author : null,
      solutions: typeof o.solutions === 'number' ? o.solutions : 0,
      difficulty: typeof o.difficulty === 'string' ? o.difficulty : 'medium',
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : '',
    };
  } catch {
    return null;
  }
}

const publicBoard = ({ player: _p, createdAt: _c, ...pub }: BoardDoc, plays: number): CommunityBoard => ({ ...pub, plays });

export async function submitBoard(
  codeIn: unknown,
  nameIn: unknown,
  userId: string,
  username: string | null
): Promise<CommunityBoard> {
  const pts = decodeBoard(String(codeIn ?? ''));
  const puzzle = pts ? customPuzzle(pts) : null;
  if (!pts || !puzzle) throw new HttpError(400, 'that is not a valid, solvable 13-star sky');
  const code = encodeBoard(pts);
  const existing = await redis.hGet('boards', code);
  const known = existing ? parseBoard(existing) : null;
  if (known) return publicBoard(known, await litCount(`c-${code}`));
  if (Number((await redis.hGet('boardsBy', userId)) ?? 0) >= 20) throw new HttpError(429, 'you have shared 20 skies already');
  const doc: BoardDoc = {
    id: newId(),
    code,
    name: cleanName(nameIn ?? 'Untitled sky'),
    player: userId,
    author: username,
    solutions: puzzle.solutions,
    difficulty: puzzle.difficulty,
    createdAt: new Date().toISOString(),
  };
  await redis.hSet('boards', { [code]: JSON.stringify(doc) });
  await redis.hIncrBy('boardsBy', userId, 1);
  return publicBoard(doc, 0);
}

export async function listBoards(): Promise<CommunityBoard[]> {
  const all = Object.values(await redis.hGetAll('boards'))
    .map(parseBoard)
    .filter((d): d is BoardDoc => d !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50);
  const plays = await Promise.all(all.map((d) => litCount(`c-${d.code}`)));
  return all.map((d, i) => publicBoard(d, plays[i] ?? 0)).sort((a, b) => b.plays - a.plays);
}

// ---- nightly posts ---------------------------------------------------------------------

export async function nightPostId(night: number): Promise<string | null> {
  return (await redis.hGet('nightPost', String(night))) ?? null;
}

export async function setNightPost(night: number, postId: string): Promise<void> {
  await redis.hSet('nightPost', { [String(night)]: postId });
}
