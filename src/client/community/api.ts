/*
 * Talks to the app's server (src/server), which stores everything in the
 * subreddit's Redis. Players are identified by their Reddit account; a
 * logged-out viewer who tries to take part gets Reddit's login prompt.
 */
import { showLoginPrompt } from '@devvit/web/client';
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
import type { Triangle } from '../../shared/game/geometry';

export type { CommunityBoard, CommunityPrint, CommunityStats } from '../../shared/api';

/** Always on inside Reddit: the server is part of the app. */
export const communityEnabled = true;

const isError = (v: unknown): v is ErrorResponse => typeof v === 'object' && v !== null && 'error' in v;

async function call<T>(path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(
      `/api${path}`,
      body === undefined
        ? {}
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401 && isError(json) && json.login) showLoginPrompt();
      return null;
    }
    // The server and client share these types (src/shared/api.ts).
    return json as T;
  } catch {
    return null;
  }
}

export const fetchInit = () => call<InitResponse>('/init');
export const fetchSplash = () => call<SplashResponse>('/splash');
export const recordSolve = (board: string, route: readonly Triangle[]) => call<SolveResponse>('/solves', { board, route });
export const fetchStats = (board: string) => call<CommunityStats>(`/stats/${encodeURIComponent(board)}`);
export const fetchPrints = (board: string) => call<{ prints: CommunityPrint[] }>(`/prints?board=${encodeURIComponent(board)}`);
export const postPrint = (board: string, route: readonly Triangle[], name: string) =>
  call<CommunityPrint>('/prints', { board, route, name });
export const votePrint = (board: string, id: string) => call<CommunityPrint>(`/prints/${encodeURIComponent(id)}/vote`, { board });
export const submitBoard = (code: string, name: string) => call<CommunityBoard>('/boards', { code, name });
export const fetchBoards = () => call<{ boards: CommunityBoard[] }>('/boards');
export const postComment = (board: string, route: readonly Triangle[], undos: number, as: 'user' | 'app') =>
  call<CommentResponse>('/comment', { board, route, undos, as });
