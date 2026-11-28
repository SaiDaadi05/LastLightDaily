import type { Point, Triangle } from './game/geometry';

/** Everything the post needs when it opens. */
export type InitResponse = {
  type: 'init';
  /** The night this post belongs to. */
  night: number;
  /** The night it is right now. */
  tonight: number;
  /** Index into PUZZLES for this post's sky. */
  boardIndex: number;
  /** Logged-out viewers get null. */
  username: string | null;
  /** Nights in a row this player has solved the nightly sky on the night. */
  streak: number;
  /** Players who have lit this post's sky. */
  lit: number;
  /** Link to tonight's post, if this post is an older night and tonight's exists. */
  tonightPostUrl: string | null;
  /** Top-voted constellation name for this sky. */
  topName: string | null;
};

/** The splash (feed) view: small and fast. */
export type SplashResponse = {
  type: 'splash';
  night: number;
  tonight: number;
  difficulty: 'easy' | 'medium' | 'hard';
  points: Point[];
  lit: number;
  /** Possible last stars someone has found, out of all possible last stars. */
  litStars: number;
  possibleStars: number;
  solved: boolean;
  topName: string | null;
};

export type CommunityStats = {
  total: number;
  routes: Record<string, number>;
  finals: Record<string, number>;
  triangles: Record<string, number>;
  /** Everything anyone has found, replays included. */
  discovered: { routes: string[]; finals: number[] };
};

export type SolveResponse = CommunityStats & {
  /** Your nights-in-a-row streak after this solve. */
  streak: number;
};

export type CommunityPrint = {
  id: string;
  board: string;
  name: string;
  route: Triangle[];
  votes: number;
  mine: boolean;
  voted: boolean;
  /** Reddit username of whoever named it. */
  author: string | null;
};

export type CommunityBoard = {
  id: string;
  code: string;
  name: string;
  solutions: number;
  difficulty: string;
  plays: number;
  author: string | null;
};

export type CommentResponse = { ok: true; url: string };

export type ErrorResponse = { error: string; login?: boolean };
