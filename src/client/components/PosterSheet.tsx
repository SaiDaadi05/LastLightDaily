import { canRunAsUser, navigateTo, showToast } from '@devvit/web/client';
import { useEffect, useState, type MouseEvent } from 'react';
import { postComment } from '../community/api';
import type { Triangle } from '../../shared/game/geometry';
import { DIFFICULTY_LABEL, puzzleLabel, type Puzzle } from '../../shared/game/puzzles';
import { CloseIcon } from './Icons';

const POSTER_COLORS = ['#FF9E7A', '#7FE0D0', '#B9A7FF', '#FFD98A'];

export function PosterSheet({
  puzzle,
  moves,
  finalDot,
  title,
  undos,
  night,
  text,
  canComment,
  onClose,
}: {
  puzzle: Puzzle;
  moves: readonly Triangle[];
  finalDot: number;
  title: string;
  undos: number | null;
  night?: number | null;
  text: string;
  /** Only your own solve can be posted as a comment. */
  canComment: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const [posting, setPosting] = useState(false);
  const [commentUrl, setCommentUrl] = useState<string | null>(null);

  /** Post the spoiler-free result as a comment from your account (Reddit asks you first). */
  const comment = async (e: MouseEvent) => {
    if (posting) return;
    setPosting(true);
    try {
      // Post from your own account if Reddit allows it; otherwise Last Light posts it with your username.
      let asUser = false;
      try {
        asUser = await canRunAsUser(e.nativeEvent);
      } catch {
        asUser = false;
      }
      let r = await postComment(puzzle.number, moves, undos ?? 0, asUser ? 'user' : 'app');
      if (!r && asUser) r = await postComment(puzzle.number, moves, undos ?? 0, 'app');
      if (r) {
        setCommentUrl(r.url);
        showToast('Your result is in the comments.');
      } else setNote('Could not post the comment right now. Copy the text instead.');
    } finally {
      setPosting(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied. Paste it anywhere.');
    } catch {
      setNote('Select the text above to copy it.');
    }
  };

  const end = puzzle.points[finalDot];
  return (
    <div className="scrim" onClick={onClose}>
      <section className="sheet poster-sheet fade-in" role="dialog" aria-modal="true" aria-label="Share your result" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 className="display">Share your result</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" autoFocus>
            <CloseIcon />
          </button>
        </div>
        <figure className="poster">
          <svg viewBox="0 0 100 100" role="img" aria-label={`Print of ${title}`} className="poster-print">
            {moves.map((tri, k) => (
              <polygon
                key={k}
                points={tri.map((i) => puzzle.points[i]!.join(',')).join(' ')}
                fill={POSTER_COLORS[k % 4]}
                fillOpacity={0.22}
                stroke={POSTER_COLORS[k % 4]}
                strokeWidth={1.6}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {moves.flat().map((i) => (
              <circle key={i} cx={puzzle.points[i]![0]} cy={puzzle.points[i]![1]} r={0.8} fill="#FFF2E2" opacity={0.75} />
            ))}
            {end && (
              <>
                <circle cx={end[0]} cy={end[1]} r={7} fill="#FFD9A8" opacity={0.35} />
                <circle cx={end[0]} cy={end[1]} r={2.4} fill="#FFF2E2" />
              </>
            )}
          </svg>
          <figcaption>
            <span className="poster-title">{title}</span>
            <span className="poster-meta">
              <span>
                Last Light · {night ? `Night ${night}` : puzzleLabel(puzzle)} · {DIFFICULTY_LABEL[puzzle.difficulty]}
              </span>
              <span>{undos === null ? '4 triangles' : `${undos} ${undos === 1 ? 'undo' : 'undos'}`}</span>
            </span>
          </figcaption>
        </figure>
        <pre className="share-text">{text}</pre>
        <div className="result-actions">
          {canComment &&
            (commentUrl ? (
              <button className="btn btn-primary" onClick={() => navigateTo(commentUrl)}>
                See your comment
              </button>
            ) : (
              <button className="btn btn-primary" disabled={posting} onClick={(e) => void comment(e)}>
                {posting ? 'Posting…' : 'Comment my result'}
              </button>
            ))}
          <button className="btn btn-secondary" onClick={() => void copy()}>
            Copy text
          </button>
        </div>
        <p className="fine-print" aria-live="polite">
          {note || 'No spoilers: the comment says how you did, never where your triangles went.'}
        </p>
      </section>
    </div>
  );
}
