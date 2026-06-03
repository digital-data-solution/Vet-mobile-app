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
    
    // Return consistent format: { status, ok, body, error?, userMessage? }
    if (!res.ok) {
      return {
        status: res.status,
        ok: res.ok,
        body,
        error: body?.error || 'Request Failed',
        userMessage: body?.message || getDefaultErrorMessage(res.status),
      };
    }

    return { status: res.status, ok: res.ok, body };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('API request timeout:', url);
      return {
        status: 408,
        ok: false,
        body: { success: false, message: 'Request timeout. Please check your internet connection.' },
        error: 'Timeout',
        userMessage: 'Request timed out. Please check your connection and try again.',
      };
    }

    console.error('API request error:', error);
    return {
      status: 0,
      ok: false,
      body: { success: false, message: 'Network error. Please check your internet connection.' },
      error: 'Network Error',
      userMessage: 'No internet connection. Please check your network and try again.',
    };
  }
}

function getDefaultErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    402: 'Subscription required. Please upgrade your plan to continue.',
    403: 'You don\'t have permission to perform this action.',
    404: 'The resource you\'re looking for was not found.',
    408: 'Request timed out. Please try again.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
  };
  return messages[status] || 'An error occurred. Please try again.';
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadFile — multipart/form-data with timeout
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadFile(
  path: string,
  fileUri: string,
  fileName: string,
  additionalData?: Record<string, string>,
  fieldName: string = 'image',
) {
  const url = BACKEND_URL + path;

  try {
    const authHeader = await getAuthHeader();

    const formData = new FormData();
    formData.append(fieldName, {
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
    
    // Return consistent error format
    if (!res.ok) {
      return {
        status: res.status,
        ok: res.ok,
        body,
        error: body?.error || 'Upload Failed',
        userMessage: body?.message || getDefaultErrorMessage(res.status),
      };
    }

    return { status: res.status, ok: res.ok, body };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('File upload timeout:', url);
      return {
        status: 408,
        ok: false,
        body: { success: false, message: 'Upload timed out. Please check your connection and try again.' },
        error: 'Timeout',
        userMessage: 'Upload took too long. Please check your connection and try again.',
      };
    }

    console.error('File upload error:', error);
    return {
      status: 0,
      ok: false,
      body: { success: false, message: 'Upload failed. Please try again.' },
      error: 'Network Error',
      userMessage: 'Upload failed. Please check your connection and try again.',
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