import { useEffect, useState } from 'react';
import { communityEnabled, fetchPrints, fetchStats, type CommunityPrint, type CommunityStats } from '../community/api';
import { buildSky, STAR_LABEL } from '../community/sky';
import { boardIndexForNight } from '../../shared/game/daily';
import { PUZZLES } from '../../shared/game/puzzles';
import { starName } from './SharedSky';

/** A one-card recap of last night's sky, shown before you play tonight's. */
export function LastNight({ tonight, onOpen }: { tonight: number; onOpen: (boardIndex: number) => void }) {
  const night = tonight - 1;
  const index = night >= 1 ? boardIndexForNight(night) : -1;
  const board = index >= 0 ? PUZZLES[index]! : null;
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [top, setTop] = useState<CommunityPrint | null>(null);

  useEffect(() => {
    if (!board || !communityEnabled) return;
    let live = true;
    void fetchStats(board.number).then((s) => live && setStats(s));
    void fetchPrints(board.number).then((r) => live && setTop(r?.prints[0] ?? null));
    return () => {
      live = false;
    };
  }, [board]);

  if (!board || !stats || stats.total === 0) return null;
  const sky = buildSky(board, null, stats);
  const bright = sky.stars[0];
  const lonely = sky.stars.filter((s) => s.lit).at(-1);

  return (
    <button className="card last-night" onClick={() => onOpen(index)}>
      <span className="eyebrow">Last night · Night {night}</span>
      <span className="last-night-line">
        <b>{stats.total.toLocaleString()}</b> lit the sky
        {sky.litCount !== null && (
          <>
            {' · '}
            {sky.litCount === sky.stars.length ? 'fully lit' : `${sky.litCount} of ${sky.stars.length} stars`}
          </>
        )}
      </span>
      {sky.basis === 'players' && bright && (
        <span className="last-night-line muted">
          {STAR_LABEL.brightest.title}: {starName(bright.dot)} ({bright.share}%)
          {lonely && lonely.dot !== bright.dot ? ` · loneliest: ${starName(lonely.dot)} (${lonely.share}%)` : ''}
        </span>
      )}
      {top && <span className="last-night-line">Named “{top.name}” by the community</span>}
    </button>
  );
}
