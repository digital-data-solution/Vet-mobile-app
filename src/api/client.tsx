import { supabase } from './supabase';

const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com'
).replace(/\/+$/, '');

const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10);
// Uploads can legitimately take longer — default 60 s
const UPLOAD_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_UPLOAD_TIMEOUT || '60000', 10);

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<string | null> {
  try {
    // Try getSession first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return `Bearer ${session.access_token}`;

    // Fallback: refresh the session
    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    return refreshed?.access_token ? `Bearer ${refreshed.access_token}` : null;
  } catch {
    return null;
  }
}

function parseResponse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// apiFetch — standard JSON requests
// ─────────────────────────────────────────────────────────────────────────────

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = BACKEND_URL + path;

  try {
    const authHeader = await getAuthHeader();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    const body = parseResponse(await res.text());
    return { status: res.status, ok: res.ok, body };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('API request timeout:', url);
      return {
        status: 408,
        ok: false,
        body: { success: false, message: 'Request timeout. Please check your internet connection.' },
      };
    }

    console.error('API request error:', error);
    return {
      status: 0,
      ok: false,
      body: { success: false, message: 'Network error. Please check your internet connection.' },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadFile — multipart/form-data with timeout
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadFile(
  path: string,
  fileUri: string,
  fileName: string,
  additionalData?: Record<string, string>,
) {
  const url = BACKEND_URL + path;

  try {
    const authHeader = await getAuthHeader();

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'application/octet-stream',
    } as any);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        // Do NOT set Content-Type — fetch sets it with the multipart boundary
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const body = parseResponse(await res.text());
    return { status: res.status, ok: res.ok, body };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('File upload timeout:', url);
      return {
        status: 408,
        ok: false,
        body: { success: false, message: 'Upload timed out. Please check your connection and try again.' },
      };
    }

    console.error('File upload error:', error);
    return {
      status: 0,
      ok: false,
      body: { success: false, message: 'Upload failed. Please try again.' },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await apiFetch('/health');
    return res.ok;
  } catch {
    return false;
  }
}

export function getBackendUrl(): string {
  return BACKEND_URL;
}