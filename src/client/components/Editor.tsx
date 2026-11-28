import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { communityEnabled, submitBoard } from '../community/api';
import { encodeBoard } from '../../shared/game/boardCode';
import { buildBoard } from '../../shared/game/builder';
import { BORDER, checkBoard, customPuzzle, DOTS_PER_BOARD, MIN_SPACING } from '../../shared/game/customBoard';
import type { Point } from '../../shared/game/geometry';
import { DIFFICULTY_LABEL, type Puzzle } from '../../shared/game/puzzles';

type Tool = 'place' | 'move' | 'erase';

const clamp = (v: number) => Math.round(Math.min(100 - BORDER, Math.max(BORDER, v)) * 10) / 10;

/** Make your own board: place 13 dots, the solver checks it live, then play or share it. */
export function Editor({ onPlay, onExit }: { onPlay: (p: Puzzle) => void; onExit: () => void }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [tool, setTool] = useState<Tool>('place');
  const [note, setNote] = useState('');
  const [name, setName] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const check = useMemo(() => checkBoard(points), [points]);

  const toBoard = (e: { clientX: number; clientY: number }): Point => {
    const r = boardRef.current!.getBoundingClientRect();
    return [clamp(((e.clientX - r.left) / r.width) * 100), clamp(((e.clientY - r.top) / r.height) * 100)];
  };
  const tooClose = (p: Point, skip = -1) =>
    points.some((q, i) => i !== skip && Math.hypot(p[0] - q[0], p[1] - q[1]) < MIN_SPACING);

  const onBoardDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (tool !== 'place' || e.target !== e.currentTarget) return;
    if (points.length >= DOTS_PER_BOARD) return setNote('All 13 dots are placed. Erase one to add another.');
    const p = toBoard(e);
    if (tooClose(p)) return setNote('Too close to another dot.');
    setNote('');
    setPoints([...points, p]);
  };
  const onDotDown = (i: number, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (tool === 'erase') {
      setPoints(points.filter((_, j) => j !== i));
      setNote('');
      return;
    }
    if (tool === 'move') {
      dragging.current = i;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const onDotMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const i = dragging.current;
    if (i === null) return;
    const p = toBoard(e);
    setPoints((pts) => pts.map((q, j) => (j === i ? p : q)));
  };
  const onDotUp = () => {
    dragging.current = null;
  };

  const surprise = () => {
    // A fresh board with real choices and real dead ends (like the built-in ones).
    for (let k = 0; k < 300; k++) {
      const b = buildBoard(Math.floor(Math.random() * 1e9));
      const c = b ? checkBoard(b) : null;
      if (b && c?.solvable && c.hasDeadEnds && c.stats!.firstMoves >= 8 && c.stats!.winRate <= 0.45) {
        setPoints(b);
        setNote('A fresh solvable board. Move dots around to make it yours.');
        return;
      }
    }
  };
  const submit = async () => {
    const r = await submitBoard(encodeBoard(points), name.trim() || 'Untitled board');
    setNote(r ? 'Shared! It now appears under Skies made by players.' : 'Could not share it right now. Try again in a moment.');
  };

  const complete = check.placed === DOTS_PER_BOARD && check.spacingOk;
  const ready = complete && check.solvable;
  const items: [boolean, string][] = [
    [check.placed === DOTS_PER_BOARD, `${check.placed} of 13 dots placed`],
    [check.placed > 0 && check.spacingOk, 'Dots spaced apart and away from the edge'],
    [check.solvable, complete ? (check.solvable ? `Solvable: ${check.stats!.solutions.length} solutions` : 'Not solvable yet: move some dots') : 'Solvable'],
    [check.hasDeadEnds, complete && check.solvable && !check.hasDeadEnds ? 'No wrong first moves (too easy)' : 'Has dead ends to avoid'],
  ];

  return (
    <div className="editor">
      <div className="editor-head">
        <h2 className="display">Make a board</h2>
        <button className="text-btn" onClick={onExit}>
          Done
        </button>
      </div>

      <div
        ref={boardRef}
        className={`board editor-board tool-${tool}`}
        onPointerDown={onBoardDown}
        role="application"
        aria-label={`Board editor. ${points.length} of 13 dots. Tool: ${tool}.`}
      >
        <svg viewBox="0 0 100 100" aria-hidden className="board-svg">
          <defs>
            <pattern id="paper-dots-ed" width="5" height="5" patternUnits="userSpaceOnUse">
              <circle cx="2.5" cy="2.5" r="0.32" fill="var(--paper)" />
            </pattern>
          </defs>
          <rect x="1" y="1" width="98" height="98" rx="5" fill="url(#paper-dots-ed)" pointerEvents="none" />
        </svg>
        {points.map((p, i) => (
          <button
            key={i}
            className={`dot${tooClose(p, i) ? ' is-crowded' : ''}`}
            style={{ left: `${p[0]}%`, top: `${p[1]}%`, touchAction: 'none' }}
            onPointerDown={(e) => onDotDown(i, e)}
            onPointerMove={onDotMove}
            onPointerUp={onDotUp}
            aria-label={`Dot ${i + 1}${tool === 'erase' ? ', erase' : tool === 'move' ? ', drag to move' : ''}`}
          >
            <span className="dot-core" aria-hidden />
          </button>
        ))}
      </div>

      <div className="editor-tools">
        <div className="segmented" role="group" aria-label="Tool">
          {(['place', 'move', 'erase'] as const).map((t) => (
            <button key={t} className={tool === t ? 'is-urgent' : ''} aria-pressed={tool === t} onClick={() => setTool(t)}>
              {t[0]!.toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button className="text-btn" onClick={surprise}>
          Surprise me
        </button>
      </div>

      <section className="card checklist" aria-label="Board check">
        {items.map(([ok, text]) => (
          <p key={text} className={ok ? 'is-ok' : ''}>
            <span aria-hidden>{ok ? '✓' : '·'}</span>
            {text}
          </p>
        ))}
        {ready && check.difficulty && <p className="muted small">Difficulty: {DIFFICULTY_LABEL[check.difficulty]}</p>}
      </section>
      {note && (
        <p className="status" aria-live="polite">
          {note}
        </p>
      )}

      <div className="result-actions">
        <button className="btn btn-primary" disabled={!ready} onClick={() => ready && onPlay(customPuzzle(points, 'Your board')!)}>
          Test play
        </button>
      </div>
      {communityEnabled && ready && (
        <form
          className="name-print"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label>
            Board name
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Saturday Swirl" />
          </label>
          <button className="btn btn-primary small" type="submit">
            Submit
          </button>
        </form>
      )}
      <button className="text-btn centered" onClick={() => setPoints([])} disabled={!points.length}>
        Clear board
      </button>
    </div>
  );
}
