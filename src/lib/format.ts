import { format, formatDistanceToNow } from 'date-fns';
import { formatMoney as sharedFormatMoney } from '@shared/utils/money';

const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'PHP';
const LOCALE = import.meta.env.VITE_LOCALE ?? 'en-PH';

/** Format integer minor units as a currency string, e.g. 49900 -> "₱499.00". */
export function money(minorUnits: number): string {
  return sharedFormatMoney(minorUnits, CURRENCY, LOCALE);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Accepts a Date, ISO string, or unix seconds. */
function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value * 1000);
  return new Date(value);
}

export function formatDate(value: Date | string | number, pattern = 'PP'): string {
  return format(toDate(value), pattern);
}

export function formatDateTime(value: Date | string | number): string {
  return format(toDate(value), 'PP p');
}

export function timeAgo(value: Date | string | number): string {
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}
