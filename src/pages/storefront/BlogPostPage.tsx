import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/feedback/Spinner';
import { NotFoundPage } from './NotFoundPage';
import { formatDate } from '@/lib/format';
import { useSeo } from '@/hooks/useSeo';

interface Post {
  title: string;
  body: string | null;
  overview: string | null;
  author: string | null;
  imageUrl: string | null;
  imageCaption: string | null;
  readTimeMinutes: number | null;
  publishedAt: string | null;
}

export function BlogPostPage() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({ queryKey: ['sf-post', slug], queryFn: () => apiFetch<Post>(`/api/storefront/blog/${slug}`), enabled: !!slug, retry: false });

  useSeo({ title: data?.title, description: data?.overview || undefined });

  if (isLoading) return <Spinner center />;
  if (isError || !data) return <NotFoundPage />;

  return (
    <article className="container py-4 py-lg-5" style={{ maxWidth: 760 }}>
      <Link to="/blog" className="small">← Back to blog</Link>
      <h1 className="h2 mt-3 mb-2">{data.title}</h1>
      <div className="text-body-secondary small mb-4">
        {data.author && <span>{data.author} · </span>}
        {data.publishedAt && formatDate(data.publishedAt)}
        {data.readTimeMinutes ? ` · ${data.readTimeMinutes} min read` : ''}
      </div>
      {data.imageUrl && (
        <figure className="mb-4">
          <img src={data.imageUrl} alt="" style={{ width: '100%', borderRadius: 'var(--at-radius-lg)' }} />
          {data.imageCaption && <figcaption className="text-body-secondary small mt-1">{data.imageCaption}</figcaption>}
        </figure>
      )}
      {data.overview && <p className="lead">{data.overview}</p>}
      <div className="at-prose" dangerouslySetInnerHTML={{ __html: data.body ?? '' }} />
    </article>
  );
}
