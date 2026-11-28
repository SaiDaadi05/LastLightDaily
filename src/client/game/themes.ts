export type ThemeName = 'dusk' | 'midnight' | 'cobalt' | 'paper';

export type Theme = {
  label: string;
  bg: string;
  surface: string;
  ink: string;
  onInk: string;
  text2: string;
  muted: string;
  line: string;
  line2: string;
  line3: string;
  faint: string;
  paper: string;
  highlight: string;
  error: string;
  shadow: string;
  scrim: string;
  /** Triangle colors, in move order. */
  tris: readonly [string, string, string, string];
  fillLo: number;
  fillHi: number;
  /** Night-sky board: starfield, and the finished solution becomes a constellation. */
  night?: { sky: string; star: string; line: string; glow: string };
  /** Chunky outlined buttons and cards with flat drop shadows, in this color. */
  edge?: string;
  /** Layered dusk bands behind the whole page. */
  bands?: readonly [string, string, string];
};

export const THEMES: Record<ThemeName, Theme> = {
  dusk: {
    label: 'Dusk',
    bg: '#120E2E', surface: '#1C1744', ink: '#FFF2E2', onInk: '#120E2E', text2: '#D6CEF0', muted: '#A59CCB',
    line: '#2C2560', line2: '#3A3274', line3: '#4B428A', faint: '#5E5596', paper: '#2A2358',
    highlight: 'rgba(255, 217, 168, 0.3)', error: '#FFA38C', shadow: 'rgba(0, 0, 0, 0.6)', scrim: 'rgba(6, 4, 20, 0.7)',
    tris: ['#FF9E7A', '#7FE0D0', '#B9A7FF', '#FFD98A'], fillLo: 0.16, fillHi: 0.32,
    night: { sky: '#17123C', star: '#FFFFFF', line: '#FFE9CF', glow: '#FFD9A8' },
    edge: '#07051A',
    bands: ['#120E2E', '#1D1745', '#2B1F55'],
  },
  midnight: {
    label: 'Midnight',
    bg: '#0E1526', surface: '#16213A', ink: '#F3EEE4', onInk: '#0E1526', text2: '#C9CFDD', muted: '#8F9AB4',
    line: '#26345A', line2: '#33436A', line3: '#44557F', faint: '#56658C', paper: '#24335A',
    highlight: 'rgba(255, 138, 91, 0.32)', error: '#FF9C85', shadow: 'rgba(0, 0, 0, 0.55)', scrim: 'rgba(4, 8, 18, 0.62)',
    tris: ['#FF8A5B', '#45D3C7', '#9AA8FF', '#FFD166'], fillLo: 0.16, fillHi: 0.34,
    night: { sky: '#0A1020', star: '#FFFFFF', line: '#DCE6FF', glow: '#FFE7A8' },
  },
  cobalt: {
    label: 'Cobalt',
    bg: '#EEF1F8', surface: '#FFFFFF', ink: '#18224D', onInk: '#FFFFFF', text2: '#38406B', muted: '#5F6890',
    line: '#D7DCEB', line2: '#C9D0E4', line3: '#B3BCD8', faint: '#A3ACC9', paper: '#DFE4F1',
    highlight: '#FFE3A3', error: '#B8382A', shadow: 'rgba(24, 34, 77, 0.28)', scrim: 'rgba(24, 34, 77, 0.45)',
    tris: ['#FF6B4A', '#12A58C', '#4C6FFF', '#F2B200'], fillLo: 0.12, fillHi: 0.3,
  },
  paper: {
    label: 'Warm paper',
    bg: '#F4EEE3', surface: '#FFFDF8', ink: '#2B2724', onInk: '#FFFDF8', text2: '#4A433D', muted: '#6B635B',
    line: '#E2D8C7', line2: '#DDD3C3', line3: '#CFC5B4', faint: '#B5AC9F', paper: '#E4DBCB',
    highlight: '#F3DCD3', error: '#9A4B36', shadow: 'rgba(70, 50, 30, 0.35)', scrim: 'rgba(43, 39, 36, 0.36)',
    tris: ['#D9826B', '#4E9F98', '#9C8CC9', '#D2A548'], fillLo: 0.12, fillHi: 0.3,
  },
};

/** CSS custom properties for a theme (set on the app root). */
export function themeVars(t: Theme): Record<string, string> {
  return {
    '--bg': t.bg, '--surface': t.surface, '--ink': t.ink, '--on-ink': t.onInk, '--text2': t.text2,
    '--muted': t.muted, '--line': t.line, '--line2': t.line2, '--line3': t.line3, '--faint': t.faint,
    '--paper': t.paper, '--highlight': t.highlight, '--error': t.error, '--shadow': t.shadow, '--scrim': t.scrim,
    '--c0': t.tris[0], '--c1': t.tris[1], '--c2': t.tris[2], '--c3': t.tris[3],
    '--board': t.night?.sky ?? t.surface,
    '--star-line': t.night?.line ?? t.ink,
    '--star-glow': t.night?.glow ?? t.tris[3],
    '--edge': t.edge ?? t.line3,
    '--band0': t.bands?.[0] ?? t.bg,
    '--band1': t.bands?.[1] ?? t.bg,
    '--band2': t.bands?.[2] ?? t.bg,
  };
}
