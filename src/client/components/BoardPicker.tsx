import { useEffect } from 'react';
import { DIFFICULTY_LABEL, PUZZLES, type Difficulty } from '../../shared/game/puzzles';
import { CloseIcon } from './Icons';

const MARK: Record<Difficulty, string> = { easy: '●', medium: '◆', hard: '▲' };

/** All boards in a grid: number, difficulty (shape + word, not color alone) and solved state. */
export function BoardPicker({
  current,
  tonight,
  released,
  solved,
  onPick,
  onClose,
}: {
  current: number;
  tonight: number;
  /** Skies that have risen so far; later ones stay locked until their night. */
  released: number;
  solved: readonly string[];
  onPick: (index: number) => void;
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
        className="sheet picker fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a sky"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 className="display">Every sky</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" autoFocus>
            <CloseIcon />
          </button>
        </div>
        <p className="sheet-intro">
          {solved.length} of {Math.min(released, PUZZLES.length)} solved. Sky {Number(PUZZLES[tonight]?.number ?? 1)} is tonight’s. A new one rises each night; locked skies (☾) open on their night.
          <span className="legend">
            {(Object.keys(MARK) as Difficulty[]).map((d) => (
              <span key={d} className={`legend-item is-${d}`}>
                <span aria-hidden>{MARK[d]}</span> {DIFFICULTY_LABEL[d]}
              </span>
            ))}
          </span>
        </p>
        <div className="picker-grid">
          {PUZZLES.map((p, i) => {
            const done = solved.includes(p.number);
            if (i >= released)
              return (
                <span key={p.number} className="tile is-locked" aria-label={`Sky ${Number(p.number)} rises on night ${i + 1}`}>
                  <span className="tile-num">{Number(p.number)}</span>
                  <span className="tile-mark" aria-hidden>
                    ☾
                  </span>
                </span>
              );
            return (
              <button
                key={p.number}
                className={`tile is-${p.difficulty}${done ? ' is-solved' : ''}${i === current ? ' is-current' : ''}${i === tonight ? ' is-tonight' : ''}`}
                onClick={() => onPick(i)}
                aria-label={`Sky ${Number(p.number)}${i === tonight ? ' (tonight)' : ''}, ${DIFFICULTY_LABEL[p.difficulty]}${done ? ', solved' : ''}${i === current ? ', current' : ''}`}
              >
                <span className="tile-num">{Number(p.number)}</span>
                <span className="tile-mark" aria-hidden>
                  {done ? '✓' : MARK[p.difficulty]}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
