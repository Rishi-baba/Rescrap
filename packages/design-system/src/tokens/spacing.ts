/**
 * ReScrap spacing, radius, elevation, and touch target tokens.
 *
 * Source of truth: frontend-discussion.md §6.4 and §7
 */

export const spacing = {
  1: '0.25rem', // 4px
  2: '0.5rem',  // 8px
  3: '0.75rem', // 12px
  4: '1rem',    // 16px
  5: '1.25rem', // 20px
  6: '1.5rem',  // 24px
  8: '2rem',    // 32px
  10: '2.5rem', // 40px
  12: '3rem',   // 48px
} as const;

export const radii = {
  sm: '0.5rem',    // 8px (small elements, tags)
  card: '0.75rem', // 12px (web cards)
  lg: '1rem',      // 16px (modals, collector cards)
  pill: '9999px',  // Pills, badges
} as const;

export const elevation = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
} as const;

export const touchTargets = {
  webMin: 48,       // Minimum 48px interactive touch target
  collectorCta: 56, // Minimum 56px primary CTA for outdoor one-handed use
} as const;
