import { useEffect, useRef, useState } from 'react';
import { solutionKey } from '../../shared/game/analysis';
import type { Triangle } from '../../shared/game/geometry';
import { communityEnabled, fetchStats, recordSolve, type CommunityStats } from './api';

/**
 * A board's community stats. Loads them when the board opens, refreshes every
 * minute while it stays open, and sends your solve (once per route) when you
 * finish. Returns null when there is no community server.
 */
export function useBoardStats(
  board: string,
  mine: readonly Triangle[] | null,
  onStreak?: (streak: number) => void
): CommunityStats | null {
  const [loaded, setLoaded] = useState<{ board: string; stats: CommunityStats } | null>(null);
  const mineKey = mine ? solutionKey(mine) : '';
  const mineRef = useRef(mine);
  const streakRef = useRef(onStreak);
  useEffect(() => {
    mineRef.current = mine;
    streakRef.current = onStreak;
  });

  useEffect(() => {
    if (!communityEnabled) return;
    let live = true;
    const load = () => void fetchStats(board).then((s) => live && s && setLoaded({ board, stats: s }));
    load();
    const t = window.setInterval(load, 60_000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [board]);

  useEffect(() => {
    const m = mineRef.current;
    if (!communityEnabled || !m) return;
    let live = true;
    void recordSolve(board, m).then((s) => {
      if (!live || !s) return;
      setLoaded({ board, stats: s });
      streakRef.current?.(s.streak);
    });
    return () => {
      live = false;
    };
  }, [board, mineKey]);

  return loaded && loaded.board === board ? loaded.stats : null;
}
