/**
 * Presentation helpers.
 *
 * Money is integer paise everywhere in this codebase, so every amount that
 * reaches the screen passes through here. There is no place in the admin
 * console where a raw paise value is rendered.
 */

/**
 * 123456 paise -> "1,234.56". Money rule: integers only, no float math.
 *
 * Digits are grouped the Indian way (lakh/crore) because the app ships en, hi
 * and mr locales. 999,999.99 rupees reads as "9,99,999.99" here, which is how
 * the amount is written in the markets this product operates in.
 */
export function formatMoney(paise: number): string {
  const negative = paise < 0;
  const absolute = Math.abs(Math.trunc(paise));
  const major = Math.trunc(absolute / 100);
  const minor = absolute % 100;
  const grouped = major.toLocaleString('en-IN');
  return `${negative ? '-' : ''}INR ${grouped}.${String(minor).padStart(2, '0')}`;
}

/** Weight is kilograms, branded as WeightKg to prevent unit mixing. */
export function formatWeight(kg: number): string {
  return `${kg.toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN');
}

/**
 * Lot states are shown as a short human label. The raw state code is kept in
 * the cell as a title attribute, because operators need the exact value.
 */
export function lotStateLabel(state: string): string {
  return state
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

const STATE_TONE: Readonly<Record<string, string>> = {
  DRAFT: 'bg-stone-200 text-stone-700',
  SUBMITTED: 'bg-sky-100 text-sky-800',
  MATCHING: 'bg-violet-100 text-violet-800',
  OFFERED: 'bg-indigo-100 text-indigo-800',
  SOLD: 'bg-amber-100 text-amber-900',
  PICKUP_SCHEDULED: 'bg-orange-100 text-orange-900',
  PICKED_UP: 'bg-cyan-100 text-cyan-900',
  RECEIVED: 'bg-emerald-100 text-emerald-900',
  COMPLETED: 'bg-emerald-200 text-emerald-950',
  DISPUTED: 'bg-rose-100 text-rose-900',
  CANCELLED: 'bg-stone-200 text-stone-600',
};

export function lotStateTone(state: string): string {
  return STATE_TONE[state] ?? 'bg-stone-100 text-stone-700';
}

export function severityTone(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'HIGH':
    case 'CRITICAL':
      return 'bg-rose-100 text-rose-900 border-rose-300';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    default:
      return 'bg-stone-100 text-stone-700 border-stone-300';
  }
}
