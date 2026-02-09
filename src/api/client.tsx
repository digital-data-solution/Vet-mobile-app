import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_TOKEN_KEY = 'xp_token';

export async function saveToken(token: string) {
  await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_TOKEN_KEY);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  // Always use production URL
  const base = 'https://vet-market-place.onrender.com';
  const url = base.replace(/\/+$/, '') + path;

  // Get Supabase session token
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch (e) {}
  return { status: res.status, ok: res.ok, body };
}
