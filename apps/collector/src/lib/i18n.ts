/**
 * Localization helper for Collector App.
 *
 * Wraps @rescrap/shared i18n runtime with React hooks for instant language switching.
 * Languages: en (English), hi (हिंदी), mr (मराठी).
 */
import { useEffect, useState } from 'react';
import { createTranslator, type Translator } from '@rescrap/shared';
import { offlineDb } from './offline-db.js';

export type SupportedLocale = 'en' | 'hi' | 'mr';

type Listener = () => void;
const listeners = new Set<Listener>();

let currentLocale: SupportedLocale = offlineDb.getLocale();
let currentTranslator: Translator = createTranslator(currentLocale);

function notify() {
  currentTranslator = createTranslator(currentLocale);
  for (const l of listeners) l();
}

export function setAppLocale(locale: SupportedLocale): void {
  currentLocale = locale;
  offlineDb.setLocale(locale);
  notify();
}

export function getAppLocale(): SupportedLocale {
  return currentLocale;
}

export function useI18n(): {
  locale: SupportedLocale;
  t: Translator['t'];
  reason: Translator['reason'];
  setLocale: (l: SupportedLocale) => void;
} {
  const [, setTick] = useState(0);

  useEffect(() => {
    const l = () => setTick((v) => v + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return {
    locale: currentLocale,
    t: currentTranslator.t,
    reason: currentTranslator.reason,
    setLocale: setAppLocale,
  };
}
