// Thin client for the Xpress Vet Job Board API. Mirrors api/market.ts's shape
// on purpose — same "connector, not intermediary" pattern, off-platform
// contact (phone/WhatsApp), no CV/application-tracking flow.
import { apiFetch } from './client';

export type JobKind = 'position' | 'seeking_work';
export type EmploymentType = 'full_time' | 'part_time' | 'locum' | 'contract';

export interface JobPosting {
  _id: string;
  poster?: { _id: string; name?: string; profileImage?: string | null; phone?: string | null } | string;
  kind: JobKind;
  title: string;
  description: string;
  roleCategory?: string;
  employmentType?: EmploymentType | null;
  experienceText?: string | null;
  salaryText?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  status: 'active' | 'filled' | 'expired' | 'removed';
  isFeaturedNow?: boolean;
  featuredUntil?: string | null;
  views?: number;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface JobBoardMeta {
  roleCategories: string[];
  employmentTypes: EmploymentType[];
  disclaimer: string;
  boost: { currency: string; packages: { days: number; price: number; label: string }[] };
  maxActivePostings: number;
  postingTtlDays: number;
}

export async function getJobBoardMeta() {
  const r = await apiFetch('/api/v1/jobs/meta');
  return r.ok ? (r.body?.data as JobBoardMeta) : null;
}

export async function browseJobPostings(params: Record<string, string | number | undefined>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const r = await apiFetch(`/api/v1/jobs${qs ? `?${qs}` : ''}`);
  return r.ok ? { data: (r.body?.data || []) as JobPosting[], total: r.body?.total || 0, totalPages: r.body?.totalPages || 1 } : { data: [], total: 0, totalPages: 1 };
}

export async function getJobPosting(id: string) {
  const r = await apiFetch(`/api/v1/jobs/${id}`);
  return r.ok ? { posting: r.body?.data as JobPosting, disclaimer: r.body?.disclaimer as string } : null;
}

export async function getMyJobPostings() {
  const r = await apiFetch('/api/v1/jobs/mine');
  return r.ok ? (r.body?.data || []) as JobPosting[] : [];
}

export async function createJobPosting(body: Record<string, any>) {
  return apiFetch('/api/v1/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export async function updateJobPosting(id: string, body: Record<string, any>) {
  return apiFetch(`/api/v1/jobs/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export async function markJobFilled(id: string) {
  return apiFetch(`/api/v1/jobs/${id}/filled`, { method: 'POST' });
}

export async function renewJobPosting(id: string) {
  return apiFetch(`/api/v1/jobs/${id}/renew`, { method: 'POST' });
}

export async function removeJobPosting(id: string) {
  return apiFetch(`/api/v1/jobs/${id}`, { method: 'DELETE' });
}

export async function reportJobPosting(id: string, reason: string, note?: string) {
  return apiFetch(`/api/v1/jobs/${id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, note }) });
}

export async function boostJobPosting(id: string, days: number) {
  return apiFetch(`/api/v1/jobs/${id}/boost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) });
}

export function jobPostingShareUrl(id: string) {
  return `https://xpressvetmarketplace.com/JobDetail?id=${id}`;
}
