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

// Share-preview link (server-rendered Open Graph tags — see app.js's /b/:slug)
// rather than the raw /Blog/:slug SPA route, so WhatsApp/Facebook/etc show the
// post's own title and cover image instead of the generic app shell. Same
// go.xpressvetmarketplace.com pattern as market.ts's listingShareUrl.
export function blogShareUrl(slug: string) {
  return `https://go.xpressvetmarketplace.com/b/${slug}`;
}

// Rough reading time — ~200 words/minute, same heuristic most blogs use.
// Markdown syntax (#, *, -, links) is stripped first so it doesn't inflate
// the word count.
export function readingTime(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_>`~-]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  const words = plain.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
