/** Generate a URL-safe slug from arbitrary text. Deterministic and unicode-aware. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

/** Append a numeric suffix to disambiguate a slug that already exists. */
export function slugWithSuffix(slug: string, suffix: number): string {
  return `${slug}-${suffix}`.slice(0, 90);
}
