import { useMemo, type CSSProperties } from 'react';
import type { Point } from '../../shared/game/geometry';
import { hashString, rng } from '../../shared/game/rng';
import type { GameState } from '../game/useGame';
import { Imprints, pointsOf } from './Print';

/** Faint stars for the night-sky board (fixed per board). */
function Starfield({ seed }: { seed: string }) {
  const stars = useMemo(() => {
    const r = rng(hashString(seed));
    return Array.from({ length: 90 }, () => ({
      x: 1 + r() * 98,
      y: 1 + r() * 98,
      r: 0.12 + r() * 0.3,
      o: 0.18 + r() * 0.55,
      d: r() * 6,
    }));
  }, [seed]);
  return (
    <g className="starfield">
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.r}
          fill="#fff"
          opacity={s.o}
          className={i % 7 === 0 ? 'twinkle' : undefined}
          style={i % 7 === 0 ? { animationDelay: `${s.d}s` } : undefined}
        />
      ))}
    </g>
  );
}

/** An ink splash: a wobbly blob and a few droplets, fixed per dot. */
function Bloom({ at, seed }: { at: Point; seed: number }) {
  const { d, drops } = useMemo(() => {
    const r = rng(seed * 7919 + 13);
    const n = 9;
    const pts = Array.from({ length: n }, (_, k) => {
      const a = (2 * Math.PI * k) / n + (r() - 0.5) * 0.4;
      const rad = 2.6 + r() * 2.2;
      return [rad * Math.cos(a), rad * Math.sin(a)] as const;
    });
    let path = `M${pts[0]![0].toFixed(2)},${pts[0]![1].toFixed(2)} `;
    for (let k = 0; k < n; k++) {
      const a = pts[k]!;
      const b = pts[(k + 1) % n]!;
      path += `Q${a[0].toFixed(2)},${a[1].toFixed(2)} ${((a[0] + b[0]) / 2).toFixed(2)},${((a[1] + b[1]) / 2).toFixed(2)} `;
    }
    const drops = Array.from({ length: 6 }, () => ({
      x: (r() - 0.5) * 16,
      y: (r() - 0.5) * 16,
      r: 0.4 + r() * 0.7,
    }));
    return { d: `${path}Z`, drops };
  }, [seed]);
  return (
    <g className="bloom" transform={`translate(${at[0]} ${at[1]})`}>
      <path d={d} fill="var(--move)" />
      {drops.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="var(--move)" className="droplet" />
      ))}
    </g>
  );
}

/** The board's border, filling a quarter with each triangle's color. */
function ProgressFrame({ made, making }: { made: number; making: boolean }) {
  return (
    <svg className="frame" viewBox="0 0 100 100" aria-hidden>
      {[0, 1, 2, 3].map((k) => (
        <rect
          key={k}
          x="0.6"
          y="0.6"
          width="98.8"
          height="98.8"
          rx="6"
          pathLength={100}
          className={`frame-seg${k < made ? ' is-made' : ''}${k === made && making ? ' is-making' : ''}`}
          style={{ '--seg': `var(--c${k})`, strokeDashoffset: -(25 * k) - 0.7 } as CSSProperties}
        />
      ))}
    </svg>
  );
}

export function Board({
  points,
  state,
  boardId,
  night,
  onTap,
}: {
  points: readonly Point[];
  state: GameState;
  boardId: string;
  night: boolean;
  onTap: (i: number) => void;
}) {
  const { selection, phase, history, done } = state;
  const move = history.length; // index of the triangle being made
  const showTri = selection.length === 3 && phase !== 'idle';
  const busy = phase !== 'idle' || !!state.autoplay || done;
  const constellation = night && done;
  const moves = history.map((h) => h.tri);

  return (
    <div className={`board${night ? ' is-night' : ''}`} style={{ '--move': `var(--c${move % 4})` } as CSSProperties}>
      <svg viewBox="0 0 100 100" aria-hidden className="board-svg">
        <defs>
          <pattern id="paper-dots" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.32" fill="var(--paper)" />
          </pattern>
          <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        {night ? <Starfield seed={boardId} /> : <rect x="1" y="1" width="98" height="98" rx="5" fill="url(#paper-dots)" />}
        <Imprints points={points} moves={moves} strong={done && !constellation} faded={constellation} />
        {constellation && (
          <g className="constellation">
            {moves.map((tri, k) => (
              <polygon key={k} className="tri constellation-line" points={pointsOf(points, tri)} />
            ))}
            {moves.flat().map((i) => (
              <circle key={i} cx={points[i]![0]} cy={points[i]![1]} r={1.3} className="ghost-star" />
            ))}
          </g>
        )}
        {phase === 'idle' &&
          selection.slice(1).map((j, k) => {
            const a = points[selection[k]!]!;
            const b = points[j]!;
            return <line key={k} className="tri selection-line" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
          })}
        {showTri && (
          <polygon
            className={`tri attempt is-${phase}`}
            points={pointsOf(points, selection as unknown as [number, number, number])}
          />
        )}
        {phase === 'valid' && selection.map((i) => <Bloom key={`b${i}`} at={points[i]!} seed={i + move * 31} />)}
        {constellation &&
          state.alive.map((on, i) =>
            on ? (
              <circle key={`g${i}`} cx={points[i]![0]} cy={points[i]![1]} r={5} className="final-glow" filter="url(#star-glow)" />
            ) : null
          )}
      </svg>

      <ProgressFrame made={history.length} making={phase === 'valid'} />

      {points.map((p, i) => {
        if (!state.alive[i]) return null;
        const order = selection.indexOf(i);
        const selected = order >= 0;
        const inside = phase === 'valid' && state.center === i;
        const leaving = phase === 'valid' && selected;
        const last = done;
        const cls = ['dot', selected && 'is-selected', inside && 'is-inside', leaving && 'is-leaving', last && 'is-last']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={i}
            className={cls}
            style={{ left: `${p[0]}%`, top: `${p[1]}%`, cursor: busy ? 'default' : 'pointer' }}
            onClick={() => onTap(i)}
            aria-pressed={selected}
            aria-label={`Dot ${i + 1}${selected ? `, corner ${order + 1} of 3` : ''}`}
          >
            <span className="dot-core" aria-hidden />
            {selected && !leaving && (
              <span className="dot-badge" aria-hidden>
                {order + 1}
              </span>
            )}
            {inside && (
              <span className="dot-inside" aria-hidden>
                inside
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
