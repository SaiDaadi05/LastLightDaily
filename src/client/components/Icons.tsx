/** Small stroke icons (decorative; buttons carry their own labels). */
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export const UndoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);
export const RestartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
  </svg>
);
export const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M10 8.5v7l6-3.5z" fill="currentColor" />
  </svg>
);
export const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" {...base}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...base} strokeWidth={2.2}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.5v5.5M12 16.6v.1" />
  </svg>
);
export const QuestionIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth={2.4}>
    <path d="M9 9a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.6" />
    <circle cx="11.9" cy="19" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const MenuIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" {...base} strokeWidth={2.4}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

/** The game's mark: a triangle around one glowing star. */
export const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="logo">
    <rect width="40" height="40" rx="11" fill="var(--surface)" stroke="var(--edge)" strokeWidth={2} />
    <path d="M10 29 L20 10 L30 29 Z" fill="none" stroke="var(--c0)" strokeWidth={2.4} strokeLinejoin="round" />
    <circle cx="20" cy="23" r="5.5" fill="var(--star-glow)" opacity={0.35} />
    <path d="M20 18.2 L21.3 21.7 L24.8 23 L21.3 24.3 L20 27.8 L18.7 24.3 L15.2 23 L18.7 21.7 Z" fill="var(--ink)" />
  </svg>
);
