// Thin client for the public Help Videos API. Same shape as api/blog.ts —
// public, no auth required.
import { apiFetch } from './client';

export interface HelpVideo {
  _id: string;
  title: string;
  description?: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  category: string;
  order: number;
  publishedAt?: string;
  viewCount?: number;
}

export async function listHelpVideos() {
  const r = await apiFetch('/api/v1/help-videos');
  return r.ok ? ((r.body?.data || []) as HelpVideo[]) : [];
}

// Fetches full detail by id — used by the player screen so a bare
// /HelpVideos/<id> deep link (only the id in the URL) still works, same
// "fetch by the one thing in the URL" pattern as api/blog.ts's getBlogPost.
export async function getHelpVideo(id: string) {
  const r = await apiFetch(`/api/v1/help-videos/${encodeURIComponent(id)}`);
  return r.ok ? (r.body?.data as HelpVideo) : null;
}

// Fire-and-forget — called when a viewer actually opens a video, not when
// the list renders. Never awaited by the caller for its result.
export function recordHelpVideoView(id: string) {
  apiFetch(`/api/v1/help-videos/${encodeURIComponent(id)}/view`, { method: 'POST' }).catch(() => {});
}

export function youtubeThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string) {
  // playsinline=1 keeps it inline on iOS instead of forcing fullscreen;
  // rel=0 avoids YouTube's related-video suggestions after playback ends.
  return `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0`;
}

// Groups a flat, already-sorted (category, order) list into sections for the
// screen's SectionList — done client-side so the API stays a simple flat GET.
export function groupByCategory(videos: HelpVideo[]): { title: string; data: HelpVideo[] }[] {
  const sections: { title: string; data: HelpVideo[] }[] = [];
  for (const v of videos) {
    const last = sections[sections.length - 1];
    if (last && last.title === v.category) {
      last.data.push(v);
    } else {
      sections.push({ title: v.category, data: [v] });
    }
  }
  return sections;
}
