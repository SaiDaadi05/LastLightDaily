import { useEffect, useState } from 'react';
import { communityEnabled, fetchPrints, postPrint, votePrint, type CommunityPrint } from '../community/api';
import { finalDot, type Triangle } from '../../shared/game/geometry';
import { localPrints, saveName } from '../game/names';
import { ALL_PUZZLES, puzzleLabel, type Puzzle } from '../../shared/game/puzzles';
import { CloseIcon } from './Icons';
import { Print } from './Print';

/** Named prints for this board: everyone's (with votes) when the server is on, else your own. */
export function GallerySheet({
  puzzle,
  mine,
  suggestedName,
  title,
  onClose,
}: {
  puzzle: Puzzle;
  /** Your solution of this board, if you just solved it. */
  mine: readonly Triangle[] | null;
  suggestedName: string;
  title?: string | undefined;
  onClose: () => void;
}) {
  const [prints, setPrints] = useState<CommunityPrint[] | null>(null);
  const [name, setName] = useState(suggestedName);
  const [note, setNote] = useState('');
  const [, refresh] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    let live = true;
    void fetchPrints(puzzle.number).then((r) => live && setPrints(r?.prints ?? null));
    return () => {
      live = false;
    };
  }, [puzzle.number]);

  const post = async () => {
    if (!mine || name.trim().length < 2) return;
    saveName(puzzle.number, mine, name);
    const p = await postPrint(puzzle.number, mine, name);
    if (p) {
      setPrints((list) => [p, ...(list ?? []).filter((x) => x.id !== p.id)]);
      setNote('Posted. Others can vote for it now.');
    } else {
      setNote(communityEnabled ? 'Saved on this device. Could not reach the server right now.' : 'Saved to your constellations.');
      refresh((n) => n + 1);
    }
  };
  const vote = async (id: string) => {
    const p = await votePrint(puzzle.number, id);
    if (p) setPrints((list) => (list ?? []).map((x) => (x.id === id ? p : x)).sort((a, b) => b.votes - a.votes));
  };

  const showing = prints !== null;
  const own = localPrints();
  return (
    <div className="scrim" onClick={onClose}>
      <section className="sheet gallery fade-in" role="dialog" aria-modal="true" aria-label="Constellations" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 className="display">{showing ? (title ?? `Constellations of ${puzzleLabel(puzzle)}`) : 'Your constellations'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" autoFocus>
            <CloseIcon />
          </button>
        </div>

        {mine && (
          <form
            className="name-print"
            onSubmit={(e) => {
              e.preventDefault();
              void post();
            }}
          >
            <Print points={puzzle.points} moves={mine} end={finalDot(13, mine)} className="mini" />
            <label>
              Name your constellation
              <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Paper Crane" />
            </label>
            <button className="btn btn-primary small" type="submit" disabled={name.trim().length < 2}>
              {showing ? 'Post' : 'Save'}
            </button>
          </form>
        )}
        {note && (
          <p className="fine-print" aria-live="polite">
            {note}
          </p>
        )}

        <div className="gallery-grid">
          {showing
            ? prints!.map((p) => (
                <article key={p.id} className="gallery-card">
                  <Print points={puzzle.points} moves={p.route} end={finalDot(13, p.route)} />
                  <div className="gallery-meta">
                    <span className="gallery-name">
                      {p.name}
                      {p.author && <span className="gallery-author">u/{p.author}</span>}
                    </span>
                    <button
                      className={`vote${p.voted ? ' is-on' : ''}`}
                      disabled={p.mine}
                      onClick={() => void vote(p.id)}
                      aria-pressed={p.voted}
                      aria-label={`${p.votes} votes${p.mine ? ' (your name)' : p.voted ? ', remove your vote' : ', vote'}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
                        <path d="M5 1 L9 8 L1 8 Z" fill="currentColor" />
                      </svg>
                      {p.votes}
                    </button>
                  </div>
                </article>
              ))
            : own.map((p, i) => {
                const pz = ALL_PUZZLES.find((x) => x.number === p.board);
                if (!pz) return null;
                return (
                  <article key={i} className="gallery-card">
                    <Print points={pz.points} moves={p.route} end={finalDot(13, p.route)} />
                    <div className="gallery-meta">
                      <span className="gallery-name">{p.name}</span>
                      <span className="muted small">{puzzleLabel(pz)}</span>
                    </div>
                  </article>
                );
              })}
        </div>
        {showing && prints!.length === 0 && <p className="muted small">No names yet. Be the first to name one.</p>}
        {!showing && own.length === 0 && <p className="muted small">Solve a sky and name your constellation to start your collection.</p>}
        {!communityEnabled && (
          <p className="fine-print">Voting on everyone’s names turns on when the community server is connected.</p>
        )}
      </section>
    </div>
  );
}
