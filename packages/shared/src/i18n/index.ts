/**
 * ReScrap localization runtime.
 *
 * Rule PRD 21 / technical-approach.md 9: components reference string keys,
 * never literals. Layouts must tolerate longer translations, so nothing
 * here assumes a fixed string width.
 */

import type { Locale } from '../domain/types.js';
import { en, type StringCatalogue } from './en.js';
import { hi } from './hi.js';
import { mr } from './mr.js';

export const CATALOGUES: Readonly<Record<Locale, StringCatalogue>> = { en, hi, mr };

export const DEFAULT_LOCALE: Locale = 'en';

export type StringNamespace = keyof StringCatalogue;
export type StringKey<N extends StringNamespace> = keyof StringCatalogue[N];

export function isLocale(value: string): value is Locale {
  return value === 'en' || value === 'hi' || value === 'mr';
}

export function resolveLocale(candidate: string | undefined | null): Locale {
  if (!candidate) {
    return DEFAULT_LOCALE;
  }
  const normalized = candidate.toLowerCase().slice(0, 2);
  return isLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

export type TranslateValues = Readonly<Record<string, string | number>>;

/**
 * Typed interpolation. Rule technical-approach.md 9: interpolate via a
 * typed function, never by string concatenation, so missing or extra
 * placeholders are visible rather than producing "undefined" in the UI.
 */
function interpolate(template: string, values?: TranslateValues): string {
  if (!values) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export interface Translator {
  locale: Locale;
  t: <N extends StringNamespace>(namespace: N, key: StringKey<N>, values?: TranslateValues) => string;
  /** Resolve a match reason or enum label without a hardcoded switch at the call site. */
  reason: (code: string) => string;
}

export function createTranslator(locale: Locale): Translator {
  const catalogue = CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];
  const fallback = CATALOGUES[DEFAULT_LOCALE];

  const reason = (code: string): string => {
    const reasons = catalogue.reasons as Record<string, string>;
    const fallbackReasons = fallback.reasons as Record<string, string>;
    return reasons[code] ?? fallbackReasons[code] ?? code;
  };

  return {
    locale,
    reason,
    t: <N extends StringNamespace>(namespace: N, key: StringKey<N>, values?: TranslateValues) => {
      const ns = catalogue[namespace] as Record<string, string>;
      const template = ns[key as string];
      if (template === undefined) {
        // Fall back to English rather than showing a raw key to a user.
        const fallbackNs = fallback[namespace] as Record<string, string>;
        const fallbackTemplate = fallbackNs[key as string];
        return fallbackTemplate !== undefined ? interpolate(fallbackTemplate, values) : String(key);
      }
      return interpolate(template, values);
    },
  };
}

/**
 * Rule master prompt 41: async states.
 * Exposed as a single object so every screen resolves them identically.
 */
export const ASYNC_STATES = ['loading', 'empty', 'error', 'offline', 'syncing', 'success'] as const;
export type AsyncState = (typeof ASYNC_STATES)[number];
