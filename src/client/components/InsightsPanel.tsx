import { useMemo, useState } from 'react';
import { communityEnabled, type CommunityStats } from '../community/api';
import { buildInsights } from '../community/insights';
import { solutionKey } from '../../shared/game/analysis';
import { finalDot, type Point, type Triangle } from '../../shared/game/geometry';
import type { Puzzle } from '../../shared/game/puzzles';
import { Print } from './Print';

type Tab = 'route' | 'print' | 'ends';

function where([x, y]: Point): string {
  const v = y < 40 ? 'top' : y > 60 ? 'bottom' : 'middle';
  const h = x < 40 ? 'left' : x > 60 ? 'right' : '';
  if (v === 'middle') return h ? `${h} star` : 'middle star';
  return `${v}${h ? ` ${h}` : ''} star`;
}

/** Route rarity, the community print and where everyone ended, after you solve. */
export function InsightsPanel({
  puzzle,
  mine,
  server,
}: {
  puzzle: Puzzle;
  mine: readonly Triangle[] | null;
  server: CommunityStats | null;
}) {
  const [tab, setTab] = useState<Tab>('route');
  const mineKey = mine ? solutionKey(mine) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ins = useMemo(() => buildInsights(puzzle, mine, server), [puzzle, mineKey, server]);
  const players = ins.basis === 'players';
  const myEnd = mine ? finalDot(puzzle.points.length, mine) : -1;
  const basisNote = players
    ? `Based on ${ins.total.toLocaleString()} players who solved this sky.`
    : communityEnabled
      ? `Player numbers appear after 5 players solve this sky. Until then: all ${ins.total} solutions, each counted once.`
      : `Based on all ${ins.total} possible solutions, each counted once.`;

  return (
    <section className="card insights" aria-label="How this board was solved">
      <div className="tabs" role="tablist">
        {(
          [
            ['route', 'Your route'],
            ['print', 'Community'],
            ['ends', 'Last stars'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'route' && (
        <div className="insight-body">
          {players && ins.yourRoute !== null ? (
            <div className="rarity">
              <div>
                {ins.yourRoute <= 15 && <span className="tag">Rare route</span>}
                <span className="big-number display">{ins.yourRoute}%</span>
                <span className="muted">of players found your route</span>
              </div>
            </div>
          ) : (
            <div className="rarity">
              <div>
                <span className="big-number display">1 of {ins.total}</span>
                <span className="muted">
                  ways through this sky. {mine ? `Yours ends on the ${where(puzzle.points[myEnd]!)}.` : ''}
                </span>
              </div>
            </div>
          )}
          {players && ins.topRoutes.length > 0 && (
            <ul className="route-bars">
              {ins.topRoutes.map((r, k) => (
                <li key={k} className={r.yours ? 'is-yours' : ''}>
                  <Print points={puzzle.points} moves={r.route} end={finalDot(13, r.route)} className="mini" />
                  <div className="bar-text">
                    <span>
                      {r.yours ? 'Your route' : `Route ${'ABC'[k]}`}
                      <b>{r.share}%</b>
                    </span>
                    <span className="bar">
                      <span style={{ width: `${r.share}%` }} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'print' && (
        <div className="insight-body">
          <svg viewBox="0 0 100 100" className="community-print" role="img" aria-label="Every solution drawn on top of each other">
            {ins.triangles.map(({ tri, weight }, k) => (
              <polygon
                key={k}
                className="tri"
                points={tri.map((i) => puzzle.points[i]!.join(',')).join(' ')}
                style={{
                  fill: `var(--c${k % 4})`,
                  fillOpacity: 0.02 + 0.16 * weight,
                  stroke: `var(--c${k % 4})`,
                  strokeOpacity: 0.08 + 0.6 * weight,
                  strokeWidth: 1.2,
                }}
              />
            ))}
            {puzzle.points.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={1.6} fill="var(--ink)" />
            ))}
          </svg>
          <p className="muted small">The brighter a triangle, the more {players ? 'players drew it' : 'solutions use it'}.</p>
        </div>
      )}

      {tab === 'ends' && (
        <div className="insight-body">
          <svg viewBox="0 0 100 100" className="community-print" role="img" aria-label="Which stars end up last, and how often">
            {puzzle.points.map((p, i) => {
              const f = ins.finals.find((x) => x.dot === i);
              if (!f) return <circle key={i} cx={p[0]} cy={p[1]} r={1.8} fill="var(--faint)" />;
              const rr = 3 + 12 * Math.sqrt(f.share / 100);
              return (
                <g key={i}>
                  <circle cx={p[0]} cy={p[1]} r={rr} className="tri end-ring" />
                  <circle cx={p[0]} cy={p[1]} r={2.6} fill="var(--ink)" />
                  {i === myEnd && <circle cx={p[0]} cy={p[1]} r={4.2} fill="none" stroke="var(--ink)" strokeWidth={0.8} />}
                  <text x={p[0]} y={Math.max(4, p[1] - rr - 1.5)} textAnchor="middle" className="end-label">
                    {f.share}%
                  </text>
                </g>
              );
            })}
          </svg>
          <p className="muted small">
            Only {ins.finals.length} of the 13 stars can ever be the last one.
            {mine ? ` Yours (ringed) was the ${where(puzzle.points[myEnd]!)}.` : ''}
          </p>
        </div>
      )}
      <p className="fine-print">{basisNote}</p>
    </section>
  );
}
