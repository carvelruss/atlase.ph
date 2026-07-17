/** Resolve a named date range to a start Date (UTC). Shared by dashboards. */
export function rangeStart(range: string): Date {
  const now = new Date();
  const d = new Date(now);
  switch (range) {
    case 'today':
      d.setUTCHours(0, 0, 0, 0);
      return d;
    case 'yesterday':
      d.setUTCDate(d.getUTCDate() - 1);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    case '7d':
      d.setUTCDate(d.getUTCDate() - 7);
      return d;
    case 'month':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    case 'last_month':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    case 'year':
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    case 'lifetime':
      return new Date(0);
    case '30d':
    default:
      d.setUTCDate(d.getUTCDate() - 30);
      return d;
  }
}

export function rangeStartEpoch(range: string): number {
  return Math.floor(rangeStart(range).getTime() / 1000);
}
