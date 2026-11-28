import type { Point, Triangle } from './geometry';
import boards from './boards.json';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Puzzle = {
  /** Stable id: "012" for built-in boards, "c-<code>" for player-made ones. */
  number: string;
  /** Display name: "#012" or "Custom". */
  label?: string;
  custom?: boolean;
  points: readonly Point[];
  /**
   * Three verified solutions, each ending on a different dot. The first is the
   * "Watch example" route; all three appear in "Compare solutions".
   */
  routes: readonly (readonly Triangle[])[];
  /** Distinct solutions (sets of four triangles). */
  solutions: number;
  /** How often random legal play wins (lower = harder). */
  winRate: number;
  difficulty: Difficulty;
};

type RawBoard = {
  points: [number, number][];
  routes: [number, number, number][][];
  solutions: number;
  winRate: number;
  difficulty: Difficulty;
};

/*
 * Boards come from scripts/generate-boards.ts: each is built backwards from
 * its final dot, then measured with the full solver. puzzles.test.ts re-checks
 * every one.
 */
export const PUZZLES: readonly Puzzle[] = (boards as unknown as RawBoard[]).map((b, i) => ({
  number: String(i + 1).padStart(3, '0'),
  points: b.points,
  routes: b.routes,
  solutions: b.solutions,
  winRate: b.winRate,
  difficulty: b.difficulty,
}));

/** Built-in boards plus any player-made boards opened this session. */
export const ALL_PUZZLES: Puzzle[] = [...PUZZLES];

/** Add a player-made board (once) and return its index in ALL_PUZZLES. */
export function addPuzzle(p: Puzzle): number {
  const at = ALL_PUZZLES.findIndex((q) => q.number === p.number);
  if (at >= 0) return at;
  ALL_PUZZLES.push(p);
  return ALL_PUZZLES.length - 1;
}

export const puzzleLabel = (p: Puzzle) => p.label ?? `#${p.number}`;

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
