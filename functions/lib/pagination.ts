export interface PageParams {
  page: number;
  pageSize: number;
  offset: number;
  search: string | null;
  sort: string | null;
  order: 'asc' | 'desc';
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Parse standard list query params (page, pageSize, q, sort, order) from a URL. */
export function parsePageParams(url: URL): PageParams {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const rawSize = Number.parseInt(url.searchParams.get('pageSize') ?? '', 10);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.isNaN(rawSize) ? DEFAULT_PAGE_SIZE : rawSize));
  const search = (url.searchParams.get('q') ?? '').trim() || null;
  const sort = url.searchParams.get('sort') ?? null;
  const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  return { page, pageSize, offset: (page - 1) * pageSize, search, sort, order };
}
