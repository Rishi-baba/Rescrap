/**
 * ReScrap money handling.
 *
 * Rule PRICE-08 / technical-approach.md 7.2:
 * All monetary values are integer MINOR UNITS (paise). Floating-point
 * currency arithmetic is prohibited.
 *
 * A bare `number` is never used for currency in the domain. The `Money`
 * brand type makes accidental float usage a compile error at the boundary.
 */

declare const moneyBrand: unique symbol;

export type Money = number & { readonly [moneyBrand]: 'INR_MINOR' };

export function money(minorUnits: number): Money {
  if (!Number.isInteger(minorUnits)) {
    throw new TypeError(`Money must be integer minor units, received ${minorUnits}`);
  }
  return minorUnits as Money;
}

export function rupeesToMoney(rupees: number): Money {
  if (!Number.isFinite(rupees)) {
    throw new TypeError(`Rupees must be finite, received ${rupees}`);
  }
  return Math.round(rupees * 100) as Money;
}

export function moneyToRupees(value: Money): number {
  return value / 100;
}

export function formatMoney(value: Money, locale = 'en-IN'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(moneyToRupees(value));
}

export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return money(a - b);
}

/** Multiply money by a dimensionless factor, rounding half-up to minor units. */
export function scaleMoney(value: Money, factor: number): Money {
  return Math.round(value * factor) as Money;
}

export function sumMoney(values: readonly Money[]): Money {
  return money(values.reduce<number>((acc, v) => acc + v, 0));
}

export function isZero(value: Money): boolean {
  return value === 0;
}

export function isPositive(value: Money): boolean {
  return value > 0;
}

/**
 * Weight is stored in kilograms with two decimal places.
 * Rule VAL-02: finite, > 0, within a sane upper bound.
 */
export type WeightKg = number & { readonly [moneyBrand]: 'KG' };

export const MAX_SANE_WEIGHT_KG = 5000;

export function kg(value: number): WeightKg {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Weight must be finite, received ${value}`);
  }
  if (value <= 0) {
    throw new RangeError(`Weight must be > 0, received ${value}`);
  }
  if (value > MAX_SANE_WEIGHT_KG) {
    throw new RangeError(`Weight exceeds sane bound of ${MAX_SANE_WEIGHT_KG} kg`);
  }
  return Math.round(value * 100) / 100 as WeightKg;
}

export function isSaneWeight(value: number): value is number {
  return Number.isFinite(value) && value > 0 && value <= MAX_SANE_WEIGHT_KG;
}

export function formatWeight(value: WeightKg, locale = 'en-IN'): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} kg`;
}
