import type { CSSProperties } from 'react';

const COUNTS = [13, 10, 7, 4, 1];

/** 13 ▲ 10 ▲ 7 ▲ 4 ▲ 1, filling in as triangles are made. */
export function Progress({ made, animating }: { made: number; animating: boolean }) {
  const left = COUNTS[made] ?? 1;
  return (
    <div className="progress" role="img" aria-label={`${made} of 4 triangles made, ${left} ${left === 1 ? 'dot' : 'dots'} left`}>
      {COUNTS.map((n, k) => (
        <span key={n} className="progress-step">
          <span className={`progress-count${k === made ? ' is-current' : ''}${k > made ? ' is-ahead' : ''}`}>{n}</span>
          {k < 4 && (
            <svg width="22" height="20" viewBox="0 0 22 20" aria-hidden>
              <path
                d="M11 2 L20 18 L2 18 Z"
                className={`progress-tri${k < made ? ' is-made' : ''}${k === made && animating ? ' is-making' : ''}`}
                style={{ '--tri': `var(--c${k})` } as CSSProperties}
              />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
}
