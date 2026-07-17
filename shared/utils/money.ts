import { CURRENCY_MINOR_UNITS, DEFAULT_CURRENCY, DEFAULT_LOCALE } from '../constants/index';

/**
 * Money is stored and computed as integer minor units (centavos). These helpers
 * are the ONLY sanctioned way to convert to/from display values. Never use
 * floating-point arithmetic on money.
 */

/** Convert a major-unit decimal string/number (e.g. "199.50") to minor units (19950). */
export function toMinorUnits(value: string | number, minorUnits = CURRENCY_MINOR_UNITS): number {
  const factor = 10 ** minorUnits;
  if (typeof value === 'number') {
    return Math.round(value * factor);
  }
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  // Parse without floats: split on the decimal point and pad/truncate the fraction.
  const negative = trimmed.startsWith('-');
  const [whole, fractionRaw = ''] = trimmed.replace(/^-/, '').split('.');
  const fraction = (fractionRaw + '0'.repeat(minorUnits)).slice(0, minorUnits);
  const wholeInt = Number.parseInt(whole || '0', 10);
  const fractionInt = Number.parseInt(fraction || '0', 10);
  if (Number.isNaN(wholeInt) || Number.isNaN(fractionInt)) return 0;
  const total = wholeInt * factor + fractionInt;
  return negative ? -total : total;
}

/** Convert minor units (19950) to a major-unit number (199.5). For display only. */
export function toMajorUnits(minor: number, minorUnits = CURRENCY_MINOR_UNITS): number {
  return minor / 10 ** minorUnits;
}

/** Format minor units as a localized currency string, e.g. "₱199.50". */
export function formatMoney(
  minor: number,
  currency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(toMajorUnits(minor));
}

/** Sum a list of minor-unit amounts safely (integer arithmetic). */
export function sumMinor(amounts: number[]): number {
  return amounts.reduce((acc, n) => acc + Math.round(n), 0);
}

/** Apply a percentage (0–100) to a minor-unit amount, rounding to the nearest minor unit. */
export function applyPercent(minor: number, percent: number): number {
  return Math.round((minor * percent) / 100);
}
