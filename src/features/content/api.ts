import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiFetchWithMeta } from '@/lib/api';

// --- Pages -------------------------------------------------------------------
export interface PageListItem { id: number; title: string; slug: string; status: string; updatedAt: string }
export interface PageDetail extends PageListItem { content: string | null; template: string; seoTitle: string | null; seoDescription: string | null }
export interface PageInput { title: string; slug?: string; content?: string | null; status: 'draft' | 'published'; seoTitle?: string | null; seoDescription?: string | null }

export function usePages() {
  return useQuery({ queryKey: ['admin-pages'], queryFn: () => apiFetch<{ items: PageListItem[] }>('/api/admin/content/pages') });
}
export function usePage(id: number | null) {
  return useQuery({ queryKey: ['admin-page', id], queryFn: () => apiFetch<PageDetail>(`/api/admin/content/pages/${id}`), enabled: id != null });
}
export function useSavePage(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PageInput) => apiFetch<PageDetail>(id ? `/api/admin/content/pages/${id}` : '/api/admin/content/pages', { method: id ? 'PATCH' : 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-pages'] }),
  });
}
export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/admin/content/pages/${id}`, { method: 'DELETE' }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-pages'] }) });
}

// --- Blog --------------------------------------------------------------------
export interface BlogListItem { id: number; title: string; slug: string; status: string; author: string | null; updatedAt: string; thumbnailUrl: string | null }
export interface BlogDetail { id: number; title: string; slug: string; excerpt: string | null; overview: string | null; body: string | null; author: string | null; featuredImageAssetId: number | null; status: string; seoTitle: string | null; seoDescription: string | null }
export interface BlogInput { title: string; slug?: string; excerpt?: string | null; overview?: string | null; body?: string | null; author?: string | null; featuredImageAssetId?: number | null; status: 'draft' | 'published'; seoTitle?: string | null; seoDescription?: string | null }

export function useBlogPosts() {
  return useQuery({ queryKey: ['admin-blog'], queryFn: () => apiFetch<{ items: BlogListItem[] }>('/api/admin/content/blog') });
}
export function useBlogPost(id: number | null) {
  return useQuery({ queryKey: ['admin-blog-post', id], queryFn: () => apiFetch<BlogDetail>(`/api/admin/content/blog/${id}`), enabled: id != null });
}
export function useSaveBlogPost(id: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BlogInput) => apiFetch<BlogDetail>(id ? `/api/admin/content/blog/${id}` : '/api/admin/content/blog', { method: id ? 'PATCH' : 'POST', body: input }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-blog'] }),
  });
}
export function useDeleteBlogPost() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/admin/content/blog/${id}`, { method: 'DELETE' }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-blog'] }) });
}

// --- Media -------------------------------------------------------------------
export interface MediaAsset { id: number; url: string; fileName: string; mimeType: string; sizeBytes: number; altText: string | null; folder: string; createdAt: string }
export function useMedia(params: { page?: number; q?: string; folder?: string }) {
  return useQuery({ queryKey: ['admin-media', params], queryFn: () => apiFetchWithMeta<{ items: MediaAsset[] }>('/api/admin/content/media', { query: params }), placeholderData: (prev) => prev });
}
export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiFetch(`/api/admin/uploads/${id}`, { method: 'DELETE' }), onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-media'] }) });
}

// --- Navigation --------------------------------------------------------------
export interface MenuItem { id?: number; label: string; linkType: string; url: string | null; refId: number | null; isVisible: boolean }
export interface Menu { id: number; handle: string; name: string; items: MenuItem[] }
export function useNavigation() {
  return useQuery({ queryKey: ['admin-navigation'], queryFn: () => apiFetch<{ menus: Menu[] }>('/api/admin/content/navigation') });
}
export function useSaveMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { handle: string; name: string; items: MenuItem[] }) => apiFetch('/api/admin/content/navigation', { method: 'POST', body }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-navigation'] }),
  });
}
