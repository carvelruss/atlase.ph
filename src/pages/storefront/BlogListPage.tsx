import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/feedback/Spinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatDate } from '@/lib/format';

interface BlogCard {
  title: string;
  slug: string;
  excerpt: string | null;
  author: string | null;
  readTimeMinutes: number | null;
  publishedAt: string | null;
  imageUrl: string | null;
}

export function BlogListPage() {
  const { data, isLoading } = useQuery({ queryKey: ['sf-blog'], queryFn: () => apiFetch<{ items: BlogCard[] }>('/api/storefront/blog') });
  const items = data?.items ?? [];

  return (
    <div className="container py-4 py-lg-5">
      <h1 className="h2 mb-4">Blog</h1>
      {isLoading ? (
        <Spinner center />
      ) : items.length === 0 ? (
        <EmptyState icon="bi-newspaper" title="No posts yet" description="Check back soon for updates." />
      ) : (
        <div className="row g-4">
          {items.map((p) => (
            <div className="col-12 col-md-6 col-lg-4" key={p.slug}>
              <Link to={`/blog/${p.slug}`} className="at-card d-block h-100 text-decoration-none text-body overflow-hidden">
                {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />}
                <div className="p-3">
                  <h2 className="h6">{p.title}</h2>
                  {p.excerpt && <p className="text-body-secondary small">{p.excerpt}</p>}
                  <div className="small text-body-secondary">
                    {p.author && <span>{p.author} · </span>}
                    {p.publishedAt && formatDate(p.publishedAt)}
                    {p.readTimeMinutes ? ` · ${p.readTimeMinutes} min read` : ''}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
