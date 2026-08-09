// Thin client for the Xpress Market (buy/sell) API. Keeps types + endpoints in
// one place so the marketplace screens stay small.
import { apiFetch, uploadFile } from './client';

export type ListingKind = 'pet' | 'product';

export interface ListingImage { url: string; publicId?: string | null }

export interface Listing {
  _id: string;
  seller?: { _id: string; name?: string; profileImage?: string | null; phone?: string | null } | string;
  kind: ListingKind;
  title: string;
  description: string;
  price: number;
  currency: string;
  negotiable?: boolean;
  category?: string;
  species?: string;
  breed?: string;
  ageText?: string;
  sex?: 'male' | 'female' | 'unknown' | null;
  healthInfo?: string;
  condition?: 'new' | 'used' | null;
  quantity?: number;
  images: ListingImage[];
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  status: 'active' | 'sold' | 'expired' | 'removed';
  isFeaturedNow?: boolean;
  featuredUntil?: string | null;
  views?: number;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface MarketMeta {
  petCategories: string[];
  productCategories: string[];
  disclaimer: string;
  boost: { currency: string; packages: { days: number; price: number; label: string }[] };
  commissionRate: number;
  maxActiveListings: number;
  listingTtlDays: number;
}

export async function getMarketMeta() {
  const r = await apiFetch('/api/v1/market/meta');
  return r.ok ? (r.body?.data as MarketMeta) : null;
}

export async function browseListings(params: Record<string, string | number | undefined>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '' && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  const r = await apiFetch(`/api/v1/market${qs ? `?${qs}` : ''}`);
  return r.ok ? { data: (r.body?.data || []) as Listing[], total: r.body?.total || 0, totalPages: r.body?.totalPages || 1 } : { data: [], total: 0, totalPages: 1 };
}

export async function getListing(id: string) {
  const r = await apiFetch(`/api/v1/market/${id}`);
  return r.ok ? { listing: r.body?.data as Listing, disclaimer: r.body?.disclaimer as string } : null;
}

export async function getMyListings() {
  const r = await apiFetch('/api/v1/market/mine');
  return r.ok ? (r.body?.data || []) as Listing[] : [];
}

export async function createListing(body: Record<string, any>) {
  return apiFetch('/api/v1/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export async function updateListing(id: string, body: Record<string, any>) {
  return apiFetch(`/api/v1/market/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

export async function markListingSold(id: string) {
  return apiFetch(`/api/v1/market/${id}/sold`, { method: 'POST' });
}

export async function renewListing(id: string) {
  return apiFetch(`/api/v1/market/${id}/renew`, { method: 'POST' });
}

export async function removeListing(id: string) {
  return apiFetch(`/api/v1/market/${id}`, { method: 'DELETE' });
}

export async function reportListing(id: string, reason: string, note?: string) {
  return apiFetch(`/api/v1/market/${id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason, note }) });
}

export async function boostListing(id: string, days: number) {
  return apiFetch(`/api/v1/market/${id}/boost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days }) });
}

export async function buyListing(id: string, amount: number) {
  return apiFetch(`/api/v1/market/${id}/buy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) });
}

// Upload a listing photo via the generic asset endpoint (no plan cap, not tied
// to the user's profile gallery). Returns { url, publicId } or null.
export async function uploadListingImage(uri: string): Promise<ListingImage | null> {
  const name = `listing-${Date.now()}.jpg`;
  const res = await uploadFile('/api/upload/asset', uri, name, { folder: 'marketplace' }, 'image');
  if (res.ok && res.body?.url) return { url: res.body.url, publicId: res.body.publicId };
  return null;
}

// Public share link that renders an Open Graph preview (photo + price) on
// WhatsApp/Facebook, then redirects into the app.
export function listingShareUrl(id: string) {
  return `https://vet-market-place-jsj5.onrender.com/l/${id}`;
}
