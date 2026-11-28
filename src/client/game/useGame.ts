import { useCallback, useEffect, useRef, useState } from 'react';
import { isSolvable, judge, legalMoves, verdictMessage, type Triangle } from '../../shared/game/geometry';
import { loadProgress, saveProgress } from './progress';
import { ALL_PUZZLES as PUZZLES, PUZZLES as BUILT_IN } from '../../shared/game/puzzles';

export type Phase = 'idle' | 'check' | 'valid' | 'invalid';

export type GameState = {
  puzzleIndex: number;
  alive: boolean[];
  /** Selected corners, in tap order (up to 3). */
  selection: number[];
  /** Completed triangles, in order. */
  history: { tri: Triangle; center: number }[];
  phase: Phase;
  /** The enclosed dot while a valid move animates. */
  center: number | null;
  message: string;
  done: boolean;
  /** Name of the route being played automatically, if any. */
  autoplay: string | null;
  /** Who finished the board: 'you', or the name of a played route. */
  finishedBy: string | null;
  undos: number;
};

const freshState = (puzzleIndex: number): GameState => ({
  puzzleIndex,
  alive: PUZZLES[puzzleIndex]!.points.map(() => true),
  selection: [],
  history: [],
  phase: 'idle',
  center: null,
  message: '',
  done: false,
  autoplay: null,
  finishedBy: null,
  undos: 0,
});

// Animation timings (ms); shortened when the player prefers reduced motion.
const TIMING = { check: 320, valid: 700, invalid: 1100, tap: 380, between: 1250 };
const REDUCED = { check: 120, valid: 120, invalid: 900, tap: 300, between: 500 };

export function useGame(initialIndex: number) {
  const [progress, setProgress] = useState(loadProgress);
  // Every visit opens tonight's sky; older nights are in the board picker.
  const [state, setState] = useState<GameState>(() => freshState(initialIndex));
  const ref = useRef(state);
  const timers = useRef<number[]>([]);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const set = useCallback((patch: Partial<GameState> | GameState) => {
    ref.current = { ...ref.current, ...patch };
    setState(ref.current);
  }, []);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);
  const timing = () => (reduced.current ? REDUCED : TIMING);

  const markSolved = useCallback((number: string) => {
    setProgress((p) => {
      if (p.solved.includes(number)) return p;
      const next = { ...p, solved: [...p.solved, number] };
      saveProgress(next);
      return next;
    });
  }, []);

  /** Open a board (resets the play state, remembers where you are). */
  const goTo = useCallback(
    (index: number) => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      const i = ((index % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
      ref.current = freshState(i);
      setState(ref.current);
      // Only built-in boards are remembered as "where you left off".
      if (i < BUILT_IN.length)
        setProgress((p) => {
          const next = { ...p, current: i };
          saveProgress(next);
          return next;
        });
    },
    []
  );

  const commit = useCallback(
    (tri: Triangle, center: number) => {
      const s = ref.current;
      const alive = s.alive.slice();
      for (const i of tri) alive[i] = false;
      const done = alive.filter(Boolean).length === 1;
      if (done && !s.autoplay) markSolved(PUZZLES[s.puzzleIndex]!.number);
      set({
        alive,
        history: [...s.history, { tri, center }],
        selection: [],
        center: null,
        phase: 'idle',
        done,
        finishedBy: done ? (s.autoplay ?? 'you') : null,
        autoplay: done ? null : s.autoplay,
      });
    },
    [set, markSolved]
  );

  const evaluate = useCallback(
    (tri: Triangle) => {
      const s = ref.current;
      const v = judge(PUZZLES[s.puzzleIndex]!.points, tri, s.alive);
      if (v.ok) {
        set({ phase: 'valid', center: v.center });
        later(timing().valid, () => commit(tri, v.center));
      } else {
        set({ phase: 'invalid', message: `${verdictMessage(v)} Try another three.` });
        later(timing().invalid, () => set({ selection: [], phase: 'idle' }));
      }
    },
    [commit, later, set]
  );

  const tapDot = useCallback(
    (i: number, fromAutoplay = false) => {
      const s = ref.current;
      if (s.done || s.phase !== 'idle' || !s.alive[i]) return;
      if (s.autoplay && !fromAutoplay) return;
      if (s.selection.includes(i)) {
        set({ selection: s.selection.filter((x) => x !== i), message: '' });
        return;
      }
      const selection = [...s.selection, i];
      if (selection.length < 3) {
        set({ selection, message: '' });
        return;
      }
      set({ selection, message: '', phase: 'check' });
      const tri = selection as unknown as Triangle;
      later(timing().check, () => evaluate(tri));
    },
    [evaluate, later, set]
  );

  const undo = useCallback(() => {
    const s = ref.current;
    if (!s.history.length || s.autoplay || s.phase === 'check' || s.phase === 'valid') return;
    clearTimers();
    const last = s.history[s.history.length - 1]!;
    const alive = s.alive.slice();
    for (const i of last.tri) alive[i] = true;
    set({
      alive,
      history: s.history.slice(0, -1),
      selection: [],
      phase: 'idle',
      center: null,
      message: '',
      done: false,
      finishedBy: null,
      undos: s.undos + 1,
    });
  }, [clearTimers, set]);

  const restart = useCallback(() => {
    clearTimers();
    const s = ref.current;
    // A restart mid-game counts every move it takes back as an undo.
    const keepUndos = s.finishedBy === null && !s.autoplay;
    set({ ...freshState(s.puzzleIndex), undos: keepUndos ? s.undos + s.history.length : 0 });
  }, [clearTimers, set]);

  /** Play a verified route on a fresh board. */
  const playRoute = useCallback(
    (routeIndex: number, name: string) => {
      clearTimers();
      const s = ref.current;
      set({ ...freshState(s.puzzleIndex), autoplay: name });
      const t = timing();
      let at = 450;
      for (const tri of PUZZLES[s.puzzleIndex]!.routes[routeIndex]!) {
        for (const i of tri) {
          later(at, () => tapDot(i, true));
          at += t.tap;
        }
        at += t.between;
      }
    },
    [clearTimers, later, set, tapDot]
  );

  /** The next board you haven't solved yet (or simply the next one, if all are solved). */
  /** The next unsolved sky among the first `released` (skies that have risen so far). */
  const nextPuzzle = useCallback(
    (released: number = BUILT_IN.length) => {
      const n = Math.max(1, Math.min(released, BUILT_IN.length));
      const at = ref.current.puzzleIndex;
      const from = at < n ? at : n - 1;
      for (let k = 1; k <= n; k++) {
        const i = (from + k) % n;
        if (!progress.solved.includes(BUILT_IN[i]!.number)) return goTo(i);
      }
      goTo((from + 1) % n);
    },
    [goTo, progress.solved]
  );

  const puzzle = PUZZLES[state.puzzleIndex]!;
  const idle = state.phase === 'idle' && !state.autoplay && !state.done;
  const noMoves = idle && legalMoves(puzzle.points, state.alive).length === 0;
  const deadEnd = idle && !noMoves && !isSolvable(puzzle.number, puzzle.points, state.alive);

  return { state, puzzle, noMoves, deadEnd, solved: progress.solved, tapDot, undo, restart, playRoute, nextPuzzle, goTo };
}
