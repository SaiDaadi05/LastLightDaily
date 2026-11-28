import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Board } from './components/Board';
import { BoardPicker } from './components/BoardPicker';
import { CompareSheet } from './components/CompareSheet';
import { Editor } from './components/Editor';
import { GallerySheet } from './components/GallerySheet';
import { AlertIcon, Logo, MenuIcon, PlayIcon, QuestionIcon, RestartIcon, UndoIcon } from './components/Icons';
import { InsightsPanel } from './components/InsightsPanel';
import { LastNight } from './components/LastNight';
import { MenuSheet } from './components/MenuSheet';
import { PosterSheet } from './components/PosterSheet';
import { Print } from './components/Print';
import { Progress } from './components/Progress';
import { SharedSky } from './components/SharedSky';
import { navigateTo } from '@devvit/web/client';
import type { InitResponse } from '../shared/api';
import { communityEnabled } from './community/api';
import { buildSky, STAR_LABEL } from './community/sky';
import { useBoardStats } from './community/useStats';
import { decodeBoard } from '../shared/game/boardCode';
import { boardIndexForNight, formatCountdown, msUntilNextNight, nightForBoardIndex, nightNumber } from '../shared/game/daily';
import { customPuzzle } from '../shared/game/customBoard';
import { finalDot } from '../shared/game/geometry';
import { constellationName, saveName, savedName } from './game/names';
import { addPuzzle, DIFFICULTY_LABEL, PUZZLES, puzzleLabel, type Puzzle } from '../shared/game/puzzles';
import { shareText } from './game/share';
import { THEMES, themeVars, type ThemeName } from './game/themes';
import { useGame } from './game/useGame';

const THEME_KEY = 'last-light:palette';

function initialTheme(): ThemeName {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    const found = (Object.keys(THEMES) as ThemeName[]).find((t) => t === saved);
    if (found) return found;
  } catch {
    // storage unavailable (private mode, sandbox): use the default
  }
  return 'dusk';
}

type Sheet = 'help' | 'menu' | 'boards' | 'compare' | 'gallery' | 'share' | null;

export function App({ init }: { init: InitResponse | null }) {
  // The night this post belongs to (posts are made one per night).
  const postNight = init?.night ?? nightNumber();
  const postIndex = init?.boardIndex ?? boardIndexForNight(postNight);
  const game = useGame(postIndex);
  const { state, puzzle, noMoves, deadEnd, solved } = game;
  const [themeName, setThemeName] = useState<ThemeName>(initialTheme);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [view, setView] = useState<'play' | 'editor'>('play');
  const [edited, setEdited] = useState<{ key: string; value: string } | null>(null);
  const theme = THEMES[themeName];
  const [now, setNow] = useState(() => Date.now());
  const [streakNow, setStreakNow] = useState(init?.streak ?? 0);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const tonight = nightNumber(now);
  const tonightIndex = boardIndexForNight(tonight);
  const released = Math.min(tonight, PUZZLES.length);

  useEffect(() => {
    document.body.style.background = theme.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
    try {
      window.localStorage.setItem(THEME_KEY, themeName);
    } catch {
      // ignore
    }
  }, [theme, themeName]);

  const { goTo } = game;
  const openPuzzle = (p: Puzzle) => {
    goTo(addPuzzle(p));
    setView('play');
    setSheet(null);
  };

  const left = state.alive.filter(Boolean).length;
  const moves = useMemo(() => state.history.map((h) => h.tri), [state.history]);
  const byYou = state.finishedBy === 'you';
  const end = state.done ? finalDot(puzzle.points.length, moves) : -1;
  const builtInSolved = solved.filter((n) => PUZZLES.some((p) => p.number === n)).length;
  const onPostSky = state.puzzleIndex === postIndex;
  const isTonight = onPostSky && postNight === tonight;
  const night = onPostSky ? postNight : puzzle.custom ? null : nightForBoardIndex(state.puzzleIndex, tonight);
  const mine = state.done && byYou ? moves : null;
  const stats = useBoardStats(puzzle.number, mine, setStreakNow);
  const sky = useMemo(() => (state.done ? buildSky(puzzle, mine, stats) : null), [state.done, puzzle, mine, stats]);
  const skyName = puzzle.custom ? puzzleLabel(puzzle) : `Sky ${Number(puzzle.number)}`;

  // The finished print's name: what you typed, your saved one, or a constellation name.
  const titleKey = state.done ? `${puzzle.number}:${moves.map((t) => t.join('.')).join('|')}` : '';
  const autoTitle = useMemo(
    () => (state.done ? (savedName(puzzle.number, moves) ?? constellationName(puzzle.number, moves)) : ''),
    [state.done, puzzle.number, moves]
  );
  const title = edited && edited.key === titleKey ? edited.value : autoTitle;
  const setTitle = (value: string) => setEdited({ key: titleKey, value });

  let status = `${left} ${left === 1 ? 'star' : 'stars'} · Keep 1 shining.`;
  if (state.autoplay) status = `Playing ${state.autoplay === 'example' ? 'the example' : state.autoplay}…`;
  else if (state.done) status = '1 star left.';
  else if (noMoves) status = `${left} stars · No moves left. Undo or restart.`;
  else if (deadEnd) status = `${left} stars · Dead end: one star is out of reach from here. Undo your last triangle.`;

  const canUndo = state.history.length > 0 && !state.autoplay;
  const close = () => setSheet(null);

  return (
    <div className={`app${theme.edge ? ' is-chunky' : ''}${theme.bands ? ' has-bands' : ''}`} style={themeVars(theme) as CSSProperties}>
      <button className="help-btn menu-btn" onClick={() => setSheet('menu')} aria-label="Menu">
        <span aria-hidden>
          <MenuIcon />
        </span>
      </button>
      <button
        className="help-btn"
        onClick={() => setSheet((s) => (s === 'help' ? null : 'help'))}
        aria-label="How to play"
        aria-expanded={sheet === 'help'}
      >
        <span aria-hidden>
          <QuestionIcon />
        </span>
      </button>

      <main className="column">
        <header className="header">
          <div className="brand">
            <Logo />
            <h1 className="wordmark">Last Light</h1>
          </div>
        </header>
        {view === 'play' && (
          <div className="night-strip">
            {isTonight ? (
              <>
                <span className="night-chip">Night {tonight}</span>
                {communityEnabled && stats && (
                  <span className="lit-chip">
                    <span aria-hidden>✦</span> {stats.total.toLocaleString()} lit tonight
                  </span>
                )}
                <span className="muted small night-next">New sky in {formatCountdown(msUntilNextNight(now))}</span>
              </>
            ) : onPostSky ? (
              <>
                <span className="night-chip is-past">Night {postNight}</span>
                {stats && (
                  <span className="lit-chip">
                    <span aria-hidden>✦</span> {stats.total.toLocaleString()} lit
                  </span>
                )}
                {init?.tonightPostUrl && (
                  <button className="text-btn back-tonight" onClick={() => navigateTo(init.tonightPostUrl!)}>
                    Tonight’s sky →
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="night-chip is-past">{night ? `Night ${night}` : skyName}</span>
                <button className="text-btn back-tonight" onClick={() => game.goTo(postIndex)}>
                  Back to {postNight === tonight ? 'tonight’s' : 'this post’s'} sky
                </button>
              </>
            )}
          </div>
        )}

        {view === 'editor' ? (
          <Editor onPlay={openPuzzle} onExit={() => setView('play')} />
        ) : (
          <>
            {sheet === 'help' && (
              <section className="card help fade-in" aria-label="How to play">
                <p>
                  Tap three stars to draw a triangle. If exactly one star sits inside it, the three corners fade out and
                  the star inside keeps shining.
                </p>
                <p>Do it four times: 13, 10, 7, 4, 1. Some legal moves lead to dead ends, so use Undo freely.</p>
                <p>
                  If a line of your triangle runs right through another star, it doesn’t count. Nudge a corner so the
                  line misses it.
                </p>
                <p>
                  Everyone plays the same sky each night. When you finish, your last star joins the shared sky, so you
                  can see where everyone else ended and help light the stars nobody has found yet.
                </p>
                <p className="muted small">The ☰ menu has every sky, the constellations people named, the sky maker and colors.</p>
              </section>
            )}

            {state.done ? (
              <p className="done-headline display fade-in" aria-live="polite">
                {byYou ? 'Your last star is shining.' : 'One star left. That is one way through.'}
              </p>
            ) : (
              <>
                {isTonight && state.history.length === 0 && <LastNight tonight={tonight} onOpen={(i) => game.goTo(i)} />}
                <p className="rule">
                  Circle <strong>exactly one</strong> star with a triangle. Its three corners fade. Keep one star shining.
                </p>
              </>
            )}

            <Board
              points={puzzle.points}
              state={state}
              boardId={puzzle.number}
              night={!!theme.night}
              onTap={(i) => game.tapDot(i)}
            />

            <Progress made={state.history.length} animating={state.phase === 'valid'} />

            <div className="status-area">
              <div className="status-row">
                <p className="status" aria-live="polite">
                  {status}
                </p>
                <button
                  className="board-chip"
                  onClick={() => setSheet('boards')}
                  aria-label={`${skyName}, ${DIFFICULTY_LABEL[puzzle.difficulty]}. Choose another sky`}
                >
                  {skyName} · {DIFFICULTY_LABEL[puzzle.difficulty]}
                  {solved.includes(puzzle.number) && <span aria-hidden> ✓</span>}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>
              {state.message && !state.done && (
                <p className="message fade-in" aria-live="assertive">
                  <AlertIcon />
                  {state.message}
                </p>
              )}
            </div>

            {!state.done && (
              <div className="controls">
                <div className="segmented">
                  <button onClick={game.undo} disabled={!canUndo} className={deadEnd || noMoves ? 'is-urgent' : ''}>
                    <UndoIcon />
                    Undo
                  </button>
                  <span className="divider" aria-hidden />
                  <button onClick={game.restart}>
                    <RestartIcon />
                    Restart
                  </button>
                </div>
                <button className="text-btn" onClick={() => game.playRoute(0, 'example')}>
                  <PlayIcon />
                  Watch example
                </button>
              </div>
            )}

            {state.done && (
              <section className="result fade-in" aria-label="Your result">
                <SharedSky
                  puzzle={puzzle}
                  mine={mine}
                  server={stats}
                  isTonight={isTonight}
                  onReplay={game.restart}
                  onName={() => setSheet('gallery')}
                />
                <div className="card result-card">
                  <Print points={puzzle.points} moves={moves} end={end} label={`Print: ${title}`} className="result-print" />
                  <div className="result-text">
                    <p className="eyebrow">
                      {night ? `Night ${night}` : skyName} · {DIFFICULTY_LABEL[puzzle.difficulty]}
                    </p>
                    {byYou ? (
                      <label className="rename">
                        <span className="sr-only">Name your constellation</span>
                        <input
                          className="result-title-input display"
                          value={title}
                          maxLength={40}
                          onChange={(e) => setTitle(e.target.value)}
                          onBlur={() => title.trim() && saveName(puzzle.number, moves, title)}
                        />
                      </label>
                    ) : (
                      <p className="result-title display">
                        {state.finishedBy === 'example' ? 'The example route' : state.finishedBy}
                      </p>
                    )}
                    <div className="stats">
                      <div>
                        <b className="display">4</b>
                        <span>triangles</span>
                      </div>
                      <div>
                        <b className="display">{byYou ? state.undos : '–'}</b>
                        <span>{state.undos === 1 ? 'undo' : 'undos'}</span>
                      </div>
                      {streakNow > 0 && (
                        <div>
                          <b className="display">{streakNow}</b>
                          <span>{streakNow === 1 ? 'night' : 'nights'} in a row</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="result-actions">
                  <button className="btn btn-primary" onClick={() => setSheet('share')}>
                    Share
                  </button>
                  {released > 1 ? (
                    <button className="btn btn-secondary" onClick={() => game.nextPuzzle(released)}>
                      {isTonight ? 'Play an older sky' : 'Next sky'}
                    </button>
                  ) : (
                    <button className="btn btn-secondary" onClick={game.restart}>
                      Play again
                    </button>
                  )}
                </div>
                <div className="result-links">
                  <button className="text-btn" onClick={() => setSheet('compare')}>
                    Compare solutions
                  </button>
                  <button className="text-btn" onClick={() => setSheet('gallery')}>
                    Constellations
                  </button>
                  {!byYou ? (
                    <button className="text-btn" onClick={game.restart}>
                      Try it yourself
                    </button>
                  ) : (
                    !puzzle.custom && (
                      <button className="text-btn" onClick={() => setSheet('boards')}>
                        {builtInSolved} of {PUZZLES.length} solved
                      </button>
                    )
                  )}
                </div>
                <InsightsPanel puzzle={puzzle} mine={mine} server={stats} />
              </section>
            )}
          </>
        )}
      </main>

      {sheet === 'menu' && (
        <MenuSheet
          themeName={themeName}
          onTheme={setThemeName}
          onBoards={() => setSheet('boards')}
          onTonight={() => {
            setView('play');
            close();
            if (postNight !== tonight && init?.tonightPostUrl) navigateTo(init.tonightPostUrl);
            else game.goTo(postNight === tonight ? postIndex : tonightIndex);
          }}
          onEditor={() => {
            setView('editor');
            close();
          }}
          onGallery={() => setSheet('gallery')}
          onPlayCode={(code, name) => {
            const pts = decodeBoard(code);
            const p = pts ? customPuzzle(pts, name) : null;
            if (p) openPuzzle(p);
          }}
          onClose={close}
        />
      )}
      {sheet === 'boards' && (
        <BoardPicker
          current={state.puzzleIndex}
          tonight={tonightIndex}
          released={released}
          solved={solved}
          onClose={close}
          onPick={(i) => {
            close();
            setView('play');
            game.goTo(i);
          }}
        />
      )}
      {sheet === 'compare' && (
        <CompareSheet
          puzzle={puzzle}
          mine={byYou ? moves : null}
          onClose={close}
          onPlay={(k, name) => {
            close();
            game.playRoute(k, name);
          }}
        />
      )}
      {sheet === 'gallery' && (
        <GallerySheet
          puzzle={puzzle}
          mine={byYou ? moves : null}
          suggestedName={title}
          title={night ? `Constellations of Night ${night}` : undefined}
          onClose={close}
        />
      )}
      {sheet === 'share' && state.done && (
        <PosterSheet
          puzzle={puzzle}
          moves={moves}
          finalDot={end}
          title={title || skyName}
          undos={byYou ? state.undos : null}
          night={night}
          canComment={byYou && !puzzle.custom}
          text={shareText({
            puzzle,
            undos: state.undos,
            night,
            name: byYou ? title : null,
            star:
              byYou && sky?.mine
                ? { title: STAR_LABEL[sky.mine.kind].title, share: sky.mine.share, basis: sky.basis }
                : null,
            sky: sky && sky.litCount !== null ? { lit: sky.litCount, of: sky.stars.length } : null,
            streak: isTonight ? streakNow : 0,
          })}
          onClose={close}
        />
      )}
    </div>
  );
}
