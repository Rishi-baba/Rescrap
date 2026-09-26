/**
 * ReScrap design system typography tokens.
 *
 * Source of truth: frontend-discussion.md §6.2
 * Inter font family across all three interfaces.
 */

export const typography = {
  fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  density: {
    collector: {
      display: { fontSize: '2rem', lineHeight: '2.5rem', fontWeight: '700' }, // 32 / 700
      title: { fontSize: '1.5rem', lineHeight: '2rem', fontWeight: '700' }, // 24 / 700
      body: { fontSize: '1.125rem', lineHeight: '1.75rem', fontWeight: '500' }, // 18 / 500
      caption: { fontSize: '0.9375rem', lineHeight: '1.375rem', fontWeight: '500' }, // 15 / 500
      numeric: { fontSize: '2.5rem', lineHeight: '2.75rem', fontWeight: '700', fontVariantNumeric: 'tabular-nums' }, // 40 / 700 tabular
    },
    web: {
      display: { fontSize: '1.75rem', lineHeight: '2.25rem', fontWeight: '700' }, // 28 / 700
      title: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: '700' }, // 20 / 700
      body: { fontSize: '0.9375rem', lineHeight: '1.375rem', fontWeight: '500' }, // 15 / 500
      caption: { fontSize: '0.8125rem', lineHeight: '1.125rem', fontWeight: '500' }, // 13 / 500
      numeric: { fontSize: '1.25rem', lineHeight: '1.75rem', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }, // 20 / 600 tabular
    },
  },
} as const;
