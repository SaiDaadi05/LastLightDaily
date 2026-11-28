/** Which boards you've solved and where you left off (kept in this browser). */
const KEY = 'last-dot:progress';

export type Progress = { solved: string[]; current: number };

export function loadProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Progress>;
      return { solved: Array.isArray(p.solved) ? p.solved : [], current: Number(p.current) || 0 };
    }
  } catch {
    // storage unavailable or corrupt: start fresh
  }
  return { solved: [], current: 0 };
}

export function saveProgress(p: Progress): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}
