import { Hono, type Context as HonoContext } from 'hono';
import { context, reddit } from '@devvit/web/server';
import type {
  CommentResponse,
  CommunityBoard,
  CommunityPrint,
  CommunityStats,
  ErrorResponse,
  InitResponse,
  SolveResponse,
  SplashResponse,
} from '../../shared/api';
import { analyzeBoard, solutionKey } from '../../shared/game/analysis';
import { boardIndexForNight, nightNumber } from '../../shared/game/daily';
import { finalDot } from '../../shared/game/geometry';
import { PUZZLES } from '../../shared/game/puzzles';
import {
  getStats,
  hasSolved,
  HttpError,
  listBoards,
  listPrints,
  litCount,
  nightPostId,
  recordNight,
  recordSolve,
  savePrint,
  streakFor,
  submitBoard,
  toggleVote,
  topName,
} from '../core/community';
import { postNight } from '../core/post';

export const api = new Hono();

type Body = Record<string, unknown>;

async function body(c: HonoContext): Promise<Body> {
  try {
    const v: unknown = await c.req.json();
    if (v && typeof v === 'object' && !Array.isArray(v)) return { ...v };
  } catch {
    // fall through
  }
  throw new HttpError(400, 'invalid JSON');
}

/** Logged-in players only; logged-out viewers are asked to log in. */
function requireUser(): string {
  if (!context.userId) throw new HttpError(401, 'log in to take part', true);
  return context.userId;
}

/** Built-in skies open one per night; later ones can't be played (or counted) early. */
function assertReleased(board: string): void {
  const i = PUZZLES.findIndex((p) => p.number === board);
  if (i >= 0 && i >= Math.min(nightNumber(), PUZZLES.length)) throw new HttpError(400, 'that sky has not risen yet');
}

/** The post's night, or tonight for posts made outside the nightly schedule. */
function thisNight(): number {
  return postNight(context.postData) ?? nightNumber();
}

const possibleFinals = new Map<number, number[]>();
function possibleStars(boardIndex: number): number[] {
  let finals = possibleFinals.get(boardIndex);
  if (!finals) {
    const p = PUZZLES[boardIndex];
    finals = p ? [...new Set(analyzeBoard(p.points).solutions.map((s) => finalDot(p.points.length, s)))] : [];
    possibleFinals.set(boardIndex, finals);
  }
  return finals;
}

function handle<T>(fn: (c: HonoContext) => Promise<T>) {
  return async (c: HonoContext) => {
    try {
      return c.json(await fn(c));
    } catch (e) {
      if (e instanceof HttpError) {
        const err: ErrorResponse = e.login ? { error: e.message, login: true } : { error: e.message };
        return c.json(err, e.status);
      }
      console.error(e);
      const err: ErrorResponse = { error: 'server error' };
      return c.json(err, 500);
    }
  };
}

api.get(
  '/init',
  handle(async (): Promise<InitResponse> => {
    const night = thisNight();
    const tonight = nightNumber();
    const boardIndex = boardIndexForNight(night);
    const board = PUZZLES[boardIndex]?.number ?? '001';
    const [username, lit, name, tonightPost, streak] = await Promise.all([
      reddit.getCurrentUsername(),
      litCount(board),
      topName(board),
      night < tonight ? nightPostId(tonight) : Promise.resolve(null),
      context.userId ? streakFor(context.userId, tonight) : Promise.resolve(0),
    ]);
    return {
      type: 'init',
      night,
      tonight,
      boardIndex,
      username: username ?? null,
      streak,
      lit,
      tonightPostUrl: tonightPost ? `https://www.reddit.com/r/${context.subredditName}/comments/${tonightPost.replace(/^t3_/, '')}` : null,
      topName: name,
    };
  })
);

api.get(
  '/splash',
  handle(async (): Promise<SplashResponse> => {
    const night = thisNight();
    const boardIndex = boardIndexForNight(night);
    const p = PUZZLES[boardIndex] ?? PUZZLES[0]!;
    const [stats, name, solved] = await Promise.all([
      getStats(p.number),
      topName(p.number),
      context.userId ? hasSolved(p.number, context.userId) : Promise.resolve(false),
    ]);
    const finals = possibleStars(boardIndex);
    const found = new Set(stats.discovered.finals);
    return {
      type: 'splash',
      night,
      tonight: nightNumber(),
      difficulty: p.difficulty,
      points: [...p.points],
      lit: stats.total,
      litStars: finals.filter((f) => found.has(f)).length,
      possibleStars: finals.length,
      solved,
      topName: name,
    };
  })
);

api.post(
  '/solves',
  handle(async (c): Promise<SolveResponse> => {
    const user = requireUser();
    const b = await body(c);
    const board = String(b.board ?? '');
    assertReleased(board);
    const stats = await recordSolve(board, b.route, user);
    // Solving this post's sky on its own night keeps the streak going.
    const night = thisNight();
    const tonight = nightNumber();
    if (night === tonight && PUZZLES[boardIndexForNight(night)]?.number === board) await recordNight(user, night);
    return { ...stats, streak: await streakFor(user, tonight) };
  })
);

api.get(
  '/stats/:board',
  handle(async (c): Promise<CommunityStats> => getStats(c.req.param('board') ?? ''))
);

api.get(
  '/prints',
  handle(async (c): Promise<{ prints: CommunityPrint[] }> => ({
    prints: await listPrints(c.req.query('board') ?? '', context.userId ?? null),
  }))
);

api.post(
  '/prints',
  handle(async (c): Promise<CommunityPrint> => {
    const user = requireUser();
    const b = await body(c);
    assertReleased(String(b.board ?? ''));
    const username = (await reddit.getCurrentUsername()) ?? null;
    return savePrint(String(b.board ?? ''), b.route, b.name, user, username);
  })
);

api.post(
  '/prints/:id/vote',
  handle(async (c): Promise<CommunityPrint> => {
    const user = requireUser();
    const b = await body(c);
    return toggleVote(String(b.board ?? ''), c.req.param('id') ?? '', user);
  })
);

api.get(
  '/boards',
  handle(async (): Promise<{ boards: CommunityBoard[] }> => ({ boards: await listBoards() }))
);

api.post(
  '/boards',
  handle(async (c): Promise<CommunityBoard> => {
    const user = requireUser();
    const b = await body(c);
    const username = (await reddit.getCurrentUsername()) ?? null;
    return submitBoard(b.code, b.name, user, username);
  })
);

/**
 * Post your spoiler-free result as a comment, from your own account. The
 * client asks for permission first (canRunAsUser). The text is rebuilt here
 * from a verified route, so nobody can post arbitrary text through the app.
 */
api.post(
  '/comment',
  handle(async (c): Promise<CommentResponse> => {
    const user = requireUser();
    const postId = context.postId;
    if (!postId) throw new HttpError(400, 'no post');
    const b = await body(c);
    const board = String(b.board ?? '');
    assertReleased(board);
    const stats = await recordSolve(board, b.route, user);
    const undos = typeof b.undos === 'number' && Number.isInteger(b.undos) && b.undos >= 0 ? Math.min(b.undos, 999) : 0;
    const p = PUZZLES.find((x) => x.number === board);
    const night = thisNight();
    const route = Array.isArray(b.route) ? b.route : [];
    const key = solutionKey(route.filter((t): t is [number, number, number] => Array.isArray(t) && t.length === 3));
    const routeShare = stats.total > 0 ? Math.round((100 * (stats.routes[key] ?? 0)) / stats.total) : 0;
    const label = p ? `Night ${night} · ${p.difficulty[0]?.toUpperCase()}${p.difficulty.slice(1)}` : 'A player-made sky';
    const streak = await streakFor(user, nightNumber());
    const lines = [
      `Last Light · ${label}`,
      '',
      `🟧🟦🟪🟨  ${undos} ${undos === 1 ? 'undo' : 'undos'}`,
      '',
      stats.total >= 5 ? `✦ ${routeShare}% of players took my route` : '✦ One of the first to light this sky',
    ];
    if (streak > 1) lines.push('', `🔥 ${streak} nights in a row`);
    const comment = await reddit.submitComment({ id: postId, text: lines.join('\n'), runAs: 'USER' });
    return { ok: true, url: `https://www.reddit.com${comment.permalink}` };
  })
);
