import { useEffect, useMemo, useState } from 'react';
import { communityEnabled, fetchPrints, type CommunityPrint, type CommunityStats } from '../community/api';
import { buildSky, STAR_LABEL } from '../community/sky';
import { solutionKey } from '../../shared/game/analysis';
import type { Triangle } from '../../shared/game/geometry';
import type { Puzzle } from '../../shared/game/puzzles';

/** Greek letters name the stars, the way star atlases do. */
export const STAR_NAMES = 'αβγδεζηθικλμν';
export const starName = (dot: number) => STAR_NAMES[dot] ?? String(dot + 1);

/**
 * Tonight's shared sky: everyone's last star on one board, how much of the
 * sky the community has lit, your star's rarity, and tonight's top-voted name.
 */
export function SharedSky({
  puzzle,
  mine,
  server,
  isTonight,
  onReplay,
  onName,
}: {
  puzzle: Puzzle;
  mine: readonly Triangle[] | null;
  server: CommunityStats | null;
  isTonight: boolean;
  onReplay: () => void;
  onName: () => void;
}) {
  const mineKey = mine ? solutionKey(mine) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sky = useMemo(() => buildSky(puzzle, mine, server), [puzzle, mineKey, server]);
  const [top, setTop] = useState<CommunityPrint | null>(null);

  useEffect(() => {
    if (!communityEnabled) return;
    let live = true;
    void fetchPrints(puzzle.number).then((r) => live && setTop(r?.prints[0] ?? null));
    return () => {
      live = false;
    };
  }, [puzzle.number, server?.total]);

  const players = sky.basis === 'players';
  const maxShare = Math.max(1, ...sky.stars.map((s) => s.share));
  const possible = new Set(sky.stars.map((s) => s.dot));
  const me = sky.mine;
  const when = isTonight ? 'tonight' : 'on this night';
  const dark = sky.litCount === null ? 0 : sky.stars.length - sky.litCount;

  let headline: string;
  if (sky.players > 0) headline = `${sky.players.toLocaleString()} ${sky.players === 1 ? 'player' : 'players'} lit this sky ${when}`;
  else if (communityEnabled) headline = 'Be the first to light this sky';
  else headline = 'Every way this sky can end';

  return (
    <section className="card sky-card" aria-label="The shared sky">
      <p className="eyebrow">{isTonight ? 'Tonight’s shared sky' : 'The shared sky'}</p>
      <h2 className="sky-headline display">{headline}</h2>

      <svg viewBox="-6 -8 112 114" className="sky-map" role="img" aria-label={`Where everyone's last star ended. ${sky.stars.length} stars can be last.`}>
        <defs>
          <filter id="sky-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        {puzzle.points.map((p, i) => {
          if (possible.has(i)) return null;
          return <circle key={i} cx={p[0]} cy={p[1]} r={0.9} className="sky-faint" />;
        })}
        {sky.stars.map((s) => {
          const [x, y] = puzzle.points[s.dot]!;
          const t = s.share / maxShare;
          if (!s.lit)
            return (
              <g key={s.dot} className="sky-dark">
                <circle cx={x} cy={y} r={4.2} />
                <text x={x} y={y + 1.5} textAnchor="middle">
                  ?
                </text>
              </g>
            );
          return (
            <g key={s.dot}>
              <circle cx={x} cy={y} r={2.5 + 5 * t} className="sky-halo" style={{ opacity: 0.25 + 0.6 * t }} filter="url(#sky-glow)" />
              <circle cx={x} cy={y} r={1.4 + 1.6 * t} className="sky-star" />
              <text x={x + 3.4 + 1.6 * t} y={y - 2.6 - 1.4 * t} className="sky-label">
                {starName(s.dot)}
              </text>
            </g>
          );
        })}
        {me && (
          <g className="sky-you">
            <circle cx={puzzle.points[me.dot]![0]} cy={puzzle.points[me.dot]![1]} r={7.5} />
            <text x={puzzle.points[me.dot]![0]} y={puzzle.points[me.dot]![1] + 12.5} textAnchor="middle">
              you
            </text>
          </g>
        )}
      </svg>

      {me && (
        <div className={`star-badge is-${me.kind}`}>
          <span className="star-badge-title">{STAR_LABEL[me.kind].title}</span>
          <span className="star-badge-line">
            {players ? `${me.share}% of players kept star ${starName(me.dot)}.` : `${me.share}% of all solutions end on star ${starName(me.dot)}.`}{' '}
            {STAR_LABEL[me.kind].line}
          </span>
        </div>
      )}

      {sky.litCount !== null ? (
        <div className="sky-goal">
          <div className="sky-goal-row">
            <span>
              Sky lit <b>{sky.litCount}</b> of {sky.stars.length}
            </span>
            <span className="muted small">
              Routes found {sky.routesFound} of {sky.routesTotal}
            </span>
          </div>
          <span className="bar sky-bar" aria-hidden>
            <span style={{ width: `${(100 * sky.litCount) / Math.max(1, sky.stars.length)}%` }} />
          </span>
          <p className="small sky-goal-note">
            {dark === 0
              ? 'Fully lit! Between you, every star that can be last has been found.'
              : `${dark} ${dark === 1 ? 'star is' : 'stars are'} still dark (?). Solve it another way to light ${dark === 1 ? 'it' : 'one'} for everyone.`}
          </p>
        </div>
      ) : (
        <p className="small sky-goal-note">
          {sky.stars.length} of the 13 stars can be the last one. Some are lonely: very few routes reach them.
        </p>
      )}

      <ul className="sky-bars">
        {sky.stars.slice(0, 5).map((s) => (
          <li key={s.dot} className={me?.dot === s.dot ? 'is-yours' : ''}>
            <span className="sky-bar-name">
              Star {starName(s.dot)}
              {me?.dot === s.dot ? ' · you' : ''}
            </span>
            <span className="bar">
              <span style={{ width: `${(100 * s.share) / maxShare}%` }} />
            </span>
            <b>{s.lit ? `${s.share}%` : 'dark'}</b>
          </li>
        ))}
      </ul>

      <div className="sky-actions">
        <button className="btn btn-secondary" onClick={onReplay}>
          {dark > 0 ? 'Light another star' : 'Find another route'}
        </button>
        <button className="btn btn-primary" onClick={onName}>
          Name your constellation
        </button>
      </div>
      {top && (
        <p className="sky-top-name">
          Top name {when}: <b>“{top.name}”</b> · {top.votes} {top.votes === 1 ? 'vote' : 'votes'}
        </p>
      )}
      <p className="fine-print">
        {players
          ? `From ${sky.players.toLocaleString()} players. Each player counts once; replays only light new stars.`
          : communityEnabled
            ? 'Shares come from all solutions until 5 players have solved this sky.'
            : 'Shares come from all solutions. Connect the community server to see where real players ended.'}
      </p>
    </section>
  );
}
