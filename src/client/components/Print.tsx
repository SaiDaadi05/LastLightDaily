import type { Point, Triangle } from '../../shared/game/geometry';

const pointsOf = (pts: readonly Point[], tri: Triangle) => tri.map((i) => `${pts[i]![0]},${pts[i]![1]}`).join(' ');

/** The translucent triangles a solution leaves behind (also the board's imprints). */
export function Imprints({
  points,
  moves,
  strong,
  faded = false,
}: {
  points: readonly Point[];
  moves: readonly Triangle[];
  strong: boolean;
  /** Night-sky finish: colors fade back so the constellation lines lead. */
  faded?: boolean;
}) {
  return (
    <>
      {moves.map((tri, k) => (
        <polygon
          key={k}
          className={`tri imprint${strong ? ' is-strong' : ''}${faded ? ' is-faded' : ''}`}
          points={pointsOf(points, tri)}
          style={{ fill: `var(--c${k})`, stroke: `var(--c${k})` }}
        />
      ))}
    </>
  );
}

/** A small square "geometric print" of a solution, with the surviving dot. */
export function Print({
  points,
  moves,
  end,
  label,
  className = '',
}: {
  points: readonly Point[];
  moves: readonly Triangle[];
  end: number;
  label?: string;
  className?: string;
}) {
  const p = points[end];
  return (
    <svg
      viewBox="0 0 100 100"
      className={`print ${className}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <Imprints points={points} moves={moves} strong />
      {p && <circle cx={p[0]} cy={p[1]} r={3.6} fill="var(--ink)" />}
    </svg>
  );
}

export { pointsOf };
