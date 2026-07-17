interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  total?: number;
}

export function Pagination({ page, totalPages, onPage, total }: PaginationProps) {
  if (totalPages <= 1) {
    return total != null ? <div className="text-body-secondary small">{total} item{total === 1 ? '' : 's'}</div> : null;
  }
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="d-flex justify-content-between align-items-center flex-wrap gap-2" aria-label="Pagination">
      {total != null && <span className="text-body-secondary small">{total} item{total === 1 ? '' : 's'}</span>}
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPage(page - 1)} disabled={page <= 1}>
            Prev
          </button>
        </li>
        {start > 1 && (
          <li className="page-item">
            <button className="page-link" onClick={() => onPage(1)}>
              1
            </button>
          </li>
        )}
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPage(p)}>
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPage(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
