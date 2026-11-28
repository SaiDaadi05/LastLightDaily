import { solutionKey } from '../../shared/game/analysis';
import type { Triangle } from '../../shared/game/geometry';
import { hashString } from '../../shared/game/rng';

const ADJ = ['Paper', 'Sleeping', 'Lopsided', 'Quiet', 'Folded', 'Northern', 'Wandering', 'Little', 'Midnight', 'Hollow',
  'Crooked', 'Silver', 'Patient', 'Restless', 'Hidden', 'Tilted', 'Distant', 'Gentle', 'Broken', 'Golden'];
const NOUN = ['Kite', 'Fox', 'Lantern', 'Moth', 'Crane', 'Sail', 'Arrow', 'Heron', 'Comet', 'Anchor', 'Owl', 'Compass',
  'Harp', 'Whale', 'Tent', 'Bridge', 'Feather', 'Crown', 'Ladder', 'Bell'];

/** A constellation name for a solution, the same every time for the same triangles. */
export function constellationName(board: string, moves: readonly Triangle[]): string {
  const h = hashString(`${board}|${solutionKey(moves)}`);
  return `The ${ADJ[h % ADJ.length]} ${NOUN[Math.floor(h / ADJ.length) % NOUN.length]}`;
}

export type LocalPrint = { board: string; name: string; route: Triangle[]; at: string };
const KEY = 'last-dot:prints';

function readAll(): LocalPrint[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? (v as LocalPrint[]) : [];
  } catch {
    return [];
  }
}

/** Prints you've named on this device, newest first. */
export const localPrints = (): LocalPrint[] => readAll().sort((a, b) => b.at.localeCompare(a.at));

export function savedName(board: string, moves: readonly Triangle[]): string | null {
  const key = solutionKey(moves);
  return readAll().find((p) => p.board === board && solutionKey(p.route) === key)?.name ?? null;
}

export function saveName(board: string, moves: readonly Triangle[], name: string): void {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!clean) return;
  const key = solutionKey(moves);
  const all = readAll().filter((p) => !(p.board === board && solutionKey(p.route) === key));
  all.push({ board, name: clean, route: moves.map((t) => [...t] as unknown as Triangle), at: new Date().toISOString() });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all.slice(-200)));
  } catch {
    // ignore
  }
}
