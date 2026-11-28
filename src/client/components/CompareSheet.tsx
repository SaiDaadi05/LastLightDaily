import { useEffect } from 'react';
import { finalDot, type Triangle } from '../../shared/game/geometry';
import type { Puzzle } from '../../shared/game/puzzles';
import { CloseIcon } from './Icons';
import { Print } from './Print';

const NAMES = ['Route A', 'Route B', 'Route C'];
const key = (moves: readonly Triangle[]) =>
  moves.map((t) => [...t].sort((a, b) => a - b).join('-')).sort().join('|');

function where([x, y]: readonly [number, number]): string {
  const v = y < 40 ? 'top' : y > 60 ? 'bottom' : 'middle';
  const h = x < 40 ? 'left' : x > 60 ? 'right' : '';
  if (v === 'middle') return h ? `Ends on the ${h}` : 'Ends in the middle';
  return `Ends ${v}${h ? ` ${h}` : ''}`;
}

export function CompareSheet({
  puzzle,
  mine,
  onPlay,
  onClose,
}: {
  puzzle: Puzzle;
  /** The player's own solution, if they solved it. */
  mine: readonly Triangle[] | null;
  onPlay: (routeIndex: number, name: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="scrim" onClick={onClose}>
      <section
        className="sheet fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Compare solutions"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 className="display">Three ways through #{puzzle.number}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" autoFocus>
            <CloseIcon />
          </button>
        </div>
        <p className="sheet-intro">
          Verified solutions to this same board, each ending on a different dot. Tap one to watch it played.
        </p>
        <div className="routes">
          {puzzle.routes.map((route, k) => {
            const end = finalDot(puzzle.points.length, route);
            const isMine = !!mine && key(mine) === key(route);
            const note = where(puzzle.points[end]!);
            return (
              <button
                key={k}
                className="route"
                onClick={() => onPlay(k, NAMES[k]!)}
                aria-label={`${NAMES[k]}, ${note.toLowerCase()}. Watch it played.`}
              >
                <Print points={puzzle.points} moves={route} end={end} />
                <span className="route-name">
                  {NAMES[k]}
                  {isMine ? ' · yours' : ''}
                </span>
                <span className="route-note">{note}</span>
              </button>
            );
          })}
        </div>
        <p className="fine-print">Worked examples checked against the rules, not live player data.</p>
      </section>
    </div>
  );
}
