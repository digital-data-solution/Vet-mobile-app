// Thin client for the public Xpress Vet Blog API. Same shape as api/market.ts
// and api/jobBoard.ts — public, no auth required (apiFetch works fine with
// no session, it just omits the auth header).
import { apiFetch } from './client';

export interface BlogPostSummary {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string | null;
  tags?: string[];
  authorName?: string;
  publishedAt?: string;
  viewCount?: number;
}

export interface BlogPost extends BlogPostSummary {
  contentMarkdown: string;
}

export async function listBlogPosts(page = 1, tag?: string) {
  const qs = `page=${page}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`;
  const r = await apiFetch(`/api/v1/blog?${qs}`);
  return r.ok
    ? { data: (r.body?.data || []) as BlogPostSummary[], totalPages: r.body?.totalPages || 1 }
    : { data: [], totalPages: 1 };
}

export async function getBlogPost(slug: string) {
  const r = await apiFetch(`/api/v1/blog/${encodeURIComponent(slug)}`);
  return r.ok ? (r.body?.data as BlogPost) : null;
}
