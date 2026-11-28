import type { Point, Triangle } from '../../shared/game/geometry';
import { DIFFICULTY_LABEL, puzzleLabel, type Puzzle } from '../../shared/game/puzzles';

/** One square per triangle, in the order they were made (no spoilers). */
const SQUARES = ['🟧', '🟦', '🟪', '🟨'];

/**
 * Spoiler-free text for a Reddit comment: which night, undos, what kind of
 * star you kept, how much of the shared sky is lit, and your streak.
 */
export function shareText(opts: {
  puzzle: Puzzle;
  undos: number;
  night?: number | null;
  name?: string | null;
  star?: { title: string; share: number; basis: 'players' | 'solutions' } | null;
  sky?: { lit: number; of: number } | null;
  streak?: number;
}): string {
  const { puzzle, undos, night, name, star, sky, streak } = opts;
  const where = night ? `Night ${night}` : puzzleLabel(puzzle);
  const lines = [
    `Last Light · ${where} · ${DIFFICULTY_LABEL[puzzle.difficulty]}`,
    `${SQUARES.join('')}  ${undos} ${undos === 1 ? 'undo' : 'undos'}`,
  ];
  if (star) lines.push(`✦ ${star.title}${star.basis === 'players' ? ` (${star.share}% kept it)` : ''}`);
  if (name) lines.push(`☆ “${name}”`);
  const extra = [sky ? `🌌 Sky ${sky.lit}/${sky.of} lit` : '', streak && streak > 1 ? `🔥 ${streak} nights` : ''].filter(Boolean);
  if (extra.length) lines.push(extra.join(' · '));
  return lines.join('\n');
}

const POSTER_COLORS = ['#FF9E7A', '#7FE0D0', '#B9A7FF', '#FFD98A'];

/** Draw the solution as a 1080×1350 poster and return it as a PNG blob. */
export async function posterPng(opts: {
  puzzle: Puzzle;
  moves: readonly Triangle[];
  finalDot: number;
  title: string;
  undos: number | null;
  night?: number | null;
}): Promise<Blob> {
  const { puzzle, moves, finalDot, title, undos, night } = opts;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  try {
    await document.fonts?.ready;
  } catch {
    // fonts not available: canvas falls back to system fonts
  }
  const cream = '#FFF2E2';
  // dusk bands
  const bands: [string, number][] = [['#120E2E', 0], ['#1D1745', 0.76], ['#2B1F55', 0.9]];
  bands.forEach(([col, at], k) => {
    g.fillStyle = col;
    const y = at * H;
    g.fillRect(0, y, W, (bands[k + 1]?.[1] ?? 1) * H - y);
  });
  const m = 90;
  const size = W - 2 * m;
  // faint stars, fixed per board
  let seed = 0;
  for (const ch of puzzle.number) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let k = 0; k < 140; k++) {
    g.globalAlpha = 0.15 + rand() * 0.5;
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.arc(rand() * W, rand() * H * 0.8, 0.8 + rand() * 1.8, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const P = (p: Point) => [m + (p[0] / 100) * size, m + (p[1] / 100) * size] as const;
  moves.forEach((tri, k) => {
    g.beginPath();
    tri.forEach((i, n) => {
      const [x, y] = P(puzzle.points[i]!);
      if (n === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
    g.globalAlpha = 0.22;
    g.fillStyle = POSTER_COLORS[k % 4]!;
    g.fill();
    g.globalAlpha = 0.95;
    g.lineJoin = 'round';
    g.lineWidth = 5;
    g.strokeStyle = POSTER_COLORS[k % 4]!;
    g.stroke();
    g.globalAlpha = 1;
  });
  for (const tri of moves)
    for (const i of tri) {
      const [x, y] = P(puzzle.points[i]!);
      g.fillStyle = 'rgba(255, 242, 226, 0.75)';
      g.beginPath();
      g.arc(x, y, 7, 0, Math.PI * 2);
      g.fill();
    }
  const end = puzzle.points[finalDot];
  if (end) {
    const [x, y] = P(end);
    const glow = g.createRadialGradient(x, y, 0, x, y, 90);
    glow.addColorStop(0, 'rgba(255, 217, 168, 0.85)');
    glow.addColorStop(1, 'rgba(255, 217, 168, 0)');
    g.fillStyle = glow;
    g.fillRect(x - 90, y - 90, 180, 180);
    g.fillStyle = cream;
    g.beginPath();
    g.arc(x, y, 16, 0, Math.PI * 2);
    g.fill();
  }
  // caption
  g.fillStyle = cream;
  g.font = '500 76px Outfit, Inter, sans-serif';
  g.textBaseline = 'alphabetic';
  g.fillText(title, m, m + size + 120);
  g.font = '700 28px Inter, sans-serif';
  g.fillStyle = '#C8C0E6';
  const meta = `LAST LIGHT · ${(night ? `NIGHT ${night}` : puzzleLabel(puzzle)).toUpperCase()} · ${DIFFICULTY_LABEL[puzzle.difficulty].toUpperCase()}`;
  g.fillText(meta, m, m + size + 175);
  g.textAlign = 'right';
  g.font = '500 30px Inter, sans-serif';
  g.fillText(undos === null ? '4 triangles' : `4 triangles · ${undos} ${undos === 1 ? 'undo' : 'undos'}`, W - m, m + size + 175);
  return await new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}
