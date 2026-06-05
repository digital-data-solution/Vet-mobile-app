import { Platform } from 'react-native';
import { supabase } from './supabase';

const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com'
).replace(/\/+$/, '');

const API_TIMEOUT    = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT    || '30000', 10);
const UPLOAD_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_UPLOAD_TIMEOUT || '60000', 10);

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getAuthHeader(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) return `Bearer ${session.access_token}`;

    const { data: { session: refreshed } } = await supabase.auth.refreshSession();
    return refreshed?.access_token ? `Bearer ${refreshed.access_token}` : null;
  } catch {
    return null;
  }
}

function parseResponse(text: string): any {
  try   { return JSON.parse(text); }
  catch { return text; }
}

function getDefaultErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    402: 'Subscription required. Please upgrade your plan to continue.',
    403: "You don't have permission to perform this action.",
    404: 'The resource you\'re looking for was not found.',
    408: 'Request timed out. Please try again.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Server error. Please try again later.',
  };
  return messages[status] || 'An error occurred. Please try again.';
}

// ─────────────────────────────────────────────────────────────────────────────
// buildFileEntry
// ─────────────────────────────────────────────────────────────────────────────

async function buildFileEntry(
  fileUri:  string,
  fileName: string,
  mimeType: string,
): Promise<File | { uri: string; name: string; type: string }> {
  if (Platform.OS !== 'web') {
    return { uri: fileUri, name: fileName, type: mimeType };
  }

  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error(`Failed to read local file for upload (status ${response.status}).`);
  }
  const blob = await response.blob();
  const resolvedMime = blob.type && blob.type !== 'application/octet-stream'
    ? blob.type
    : mimeType;
  return new File([blob], fileName, { type: resolvedMime });
}

function mimeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
    png:  'image/png',
    gif:  'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  return map[ext ?? ''] ?? 'image/jpeg';
}

// ─────────────────────────────────────────────────────────────────────────────
// apiFetch — standard JSON requests
//
// FIX: React Native's Hermes/JSC fetch implementation silently drops the body
// on DELETE requests in many versions. The only reliable workaround is to use
// XMLHttpRequest for DELETE calls with a body, which always sends it correctly.
// ─────────────────────────────────────────────────────────────────────────────

function xhrRequest(
  url:     string,
  method:  string,
  headers: Record<string, string>,
  body:    string,
  timeout: number,
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = timeout;

    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    xhr.onload  = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(Object.assign(new Error('Timeout'), { name: 'AbortError' }));

    xhr.send(body);
  });
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url        = BACKEND_URL + path;
  const method     = (options.method ?? 'GET').toUpperCase();
  const bodyString = options.body as string | undefined;

  try {
    const authHeader = await getAuthHeader();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
      ...(authHeader ? { Authorization: authHeader } : {}),
    };

    let status: number;
    let rawText: string;

    // FIX: Use XHR for DELETE-with-body — React Native fetch drops the body
    // on DELETE requests regardless of how it is attached. XHR sends it reliably.
    if (method === 'DELETE' && bodyString) {
      const result = await xhrRequest(url, 'DELETE', headers, bodyString, API_TIMEOUT);
      status  = result.status;
      rawText = result.text;
    } else {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), API_TIMEOUT);

      const res = await fetch(url, {
        ...options,
        method,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      status  = res.status;
      rawText = await res.text();
    }

    const responseBody = parseResponse(rawText);
    const ok           = status >= 200 && status < 300;

    if (!ok) {
      return {
        status,
        ok:          false,
        body:        responseBody,
        error:       responseBody?.error   || 'Request Failed',
        userMessage: responseBody?.message || getDefaultErrorMessage(status),
      };
    }

    return { status, ok: true, body: responseBody };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('API request timeout:', url);
      return {
        status:      408,
        ok:          false,
        body:        { success: false, message: 'Request timeout.' },
        error:       'Timeout',
        userMessage: 'Request timed out. Please check your connection and try again.',
      };
    }

    console.error('API request error:', error);
    return {
      status:      0,
      ok:          false,
      body:        { success: false, message: 'Network error.' },
      error:       'Network Error',
      userMessage: 'No internet connection. Please check your network and try again.',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// uploadFile — multipart/form-data
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadFile(
  path:            string,
  fileUri:         string,
  fileName:        string,
  additionalData?: Record<string, string>,
  fieldName:       string = 'image',
) {
  const url = BACKEND_URL + path;

  try {
    const authHeader = await getAuthHeader();
    const mimeType   = mimeFromFileName(fileName);
    const fileEntry  = await buildFileEntry(fileUri, fileName, mimeType);

    const formData = new FormData();
    formData.append(fieldName, fileEntry as any);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        // Do NOT set Content-Type — fetch must set it with the multipart boundary
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body:   formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const body = parseResponse(await res.text());

    if (!res.ok) {
      return {
        status:      res.status,
        ok:          false,
        body,
        error:       body?.error   || 'Upload Failed',
        userMessage: body?.message || getDefaultErrorMessage(res.status),
      };
    }

    return { status: res.status, ok: true, body };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('File upload timeout:', url);
      return {
        status:      408,
        ok:          false,
        body:        { success: false, message: 'Upload timed out.' },
        error:       'Timeout',
        userMessage: 'Upload took too long. Please check your connection and try again.',
      };
    }

    console.error('File upload error:', error);
    return {
      status:      0,
      ok:          false,
      body:        { success: false, message: 'Upload failed.' },
      error:       'Network Error',
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