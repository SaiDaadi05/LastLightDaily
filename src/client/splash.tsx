import './fonts';
import './splash.css';

import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState, type MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import type { SplashResponse } from '../shared/api';
import { fetchSplash } from './community/api';

const LEVEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' } as const;

/** What people see in the feed: tonight's sky, how many lit it, and a way in. */
export const Splash = () => {
  const [data, setData] = useState<SplashResponse | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void fetchSplash().then((d) => (d ? setData(d) : setFailed(true)));
  }, []);

  const tonight = data ? data.night === data.tonight : true;
  const play = (e: MouseEvent) => requestExpandedMode(e.nativeEvent, 'game');

  return (
    <main className="splash" onClick={play}>
      <div className="splash-moon" aria-hidden />
      <header className="splash-head">
        <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden>
          <rect width="40" height="40" rx="11" fill="#1C1744" stroke="#07051A" strokeWidth="2" />
          <path d="M10 29 L20 10 L30 29 Z" fill="none" stroke="#FF9E7A" strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="20" cy="23" r="5.5" fill="#FFD9A8" opacity=".35" />
          <path d="M20 18.2 L21.3 21.7 L24.8 23 L21.3 24.3 L20 27.8 L18.7 24.3 L15.2 23 L18.7 21.7 Z" fill="#FFF2E2" />
        </svg>
        <h1>Last Light</h1>
      </header>
      <p className="splash-night">
        {data ? `Night ${data.night} · ${LEVEL[data.difficulty]}` : failed ? 'A daily star puzzle' : ' '}
      </p>

      <svg className="splash-sky" viewBox="-4 -4 108 108" aria-label="Tonight's thirteen stars">
        <defs>
          <filter id="glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        {data?.points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="#FFD9A8" opacity={0.45} filter="url(#glow)" />
            <circle cx={x} cy={y} r={2.1} fill="#FFF2E2" />
          </g>
        ))}
      </svg>

      <p className="splash-rule">
        Circle <b>exactly one</b> star with a triangle. Keep one star shining.
      </p>
      {data && (
        <div className="splash-chips">
          <span className="chip">✦ {data.lit.toLocaleString()} lit {tonight ? 'tonight' : 'this sky'}</span>
          {data.lit > 0 && (
            <span className="chip">
              Sky lit {data.litStars}/{data.possibleStars}
            </span>
          )}
        </div>
      )}
      {data?.topName && <p className="splash-name">Named “{data.topName}” by the community</p>}
      <button className="splash-play" onClick={play}>
        {data?.solved ? 'See the shared sky' : tonight ? 'Play tonight’s sky' : 'Play this sky'}
      </button>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
