import { useEffect, useState } from 'react';
import { communityEnabled, fetchBoards, type CommunityBoard } from '../community/api';
import { THEMES, type ThemeName } from '../game/themes';
import { CloseIcon } from './Icons';

export function MenuSheet({
  themeName,
  onTheme,
  onBoards,
  onTonight,
  onEditor,
  onGallery,
  onPlayCode,
  onClose,
}: {
  themeName: ThemeName;
  onTheme: (t: ThemeName) => void;
  onBoards: () => void;
  onTonight: () => void;
  onEditor: () => void;
  onGallery: () => void;
  onPlayCode: (code: string, name: string) => void;
  onClose: () => void;
}) {
  const [community, setCommunity] = useState<CommunityBoard[] | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (communityEnabled) void fetchBoards().then((r) => setCommunity(r?.boards ?? []));
  }, []);

  return (
    <div className="scrim" onClick={onClose}>
      <section className="sheet menu fade-in" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
        <span className="sheet-handle" aria-hidden />
        <div className="sheet-head">
          <h2 className="display">Last Light</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close" autoFocus>
            <CloseIcon />
          </button>
        </div>
        <nav className="menu-list">
          <button onClick={onTonight}>
            <b>Tonight’s sky</b>
            <span>The sky everyone is playing today</span>
          </button>
          <button onClick={onBoards}>
            <b>Every sky</b>
            <span>All 100 skies and your progress</span>
          </button>
          <button onClick={onGallery}>
            <b>Constellations</b>
            <span>{communityEnabled ? 'Named by players, voted by players' : 'The constellations you’ve named'}</span>
          </button>
          <button onClick={onEditor}>
            <b>Make a sky</b>
            <span>Place 13 stars, check it, share a link</span>
          </button>
        </nav>
        {communityEnabled && (
          <div className="menu-section">
            <p className="eyebrow">Skies made by players</p>
            {community === null && <p className="muted small">Loading…</p>}
            {community?.length === 0 && <p className="muted small">None yet. Make one!</p>}
            {community?.slice(0, 8).map((b) => (
              <button key={b.id} className="menu-row" onClick={() => onPlayCode(b.code, b.name)}>
                <span>{b.name}</span>
                <span className="muted small">
                  {b.difficulty} · {b.plays} {b.plays === 1 ? 'play' : 'plays'}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="menu-section">
          <p className="eyebrow">Colors</p>
          <div className="palette">
            {(Object.keys(THEMES) as ThemeName[]).map((name) => (
              <button key={name} className={`chip${name === themeName ? ' is-on' : ''}`} aria-pressed={name === themeName} onClick={() => onTheme(name)}>
                <span className="swatch" style={{ background: THEMES[name].bg, borderColor: THEMES[name].tris[0] }} aria-hidden />
                {THEMES[name].label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
