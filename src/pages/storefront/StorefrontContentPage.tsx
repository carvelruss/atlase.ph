import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Spinner } from '@/components/feedback/Spinner';
import { NotFoundPage } from './NotFoundPage';

interface PageContent {
  title: string;
  content: string | null;
}

export function StorefrontContentPage() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sf-page', slug],
    queryFn: () => apiFetch<PageContent>(`/api/storefront/pages/${slug}`),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <Spinner center />;
  if (isError || !data) return <NotFoundPage />;

  return (
    <div className="container py-4 py-lg-5" style={{ maxWidth: 760 }}>
      <h1 className="h2 mb-4">{data.title}</h1>
      <div className="at-prose" dangerouslySetInnerHTML={{ __html: data.content ?? '' }} />
    </div>
  );
}
