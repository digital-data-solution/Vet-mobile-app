import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_TOKEN_KEY = 'xp_token';

// Get backend URL from environment variables
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place.onrender.com';

// Get API timeout from environment
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10);

// Debug mode
const DEBUG_MODE = process.env.EXPO_PUBLIC_DEBUG_MODE === 'true';

/**
 * Save authentication token to storage
 */
export async function saveToken(token: string) {
  await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
}

/**
 * Get authentication token from storage
 */
export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_TOKEN_KEY);
}

/**
 * Remove authentication token from storage
 */
export async function removeToken() {
  await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
}

/**
 * Make API request to backend
 */
export async function apiFetch(path: string, options: RequestInit = {}) {
  // Construct full URL
  const url = BACKEND_URL.replace(/\/+$/, '') + path;

  // Debug logging
  if (DEBUG_MODE) {
    console.log('API Request:', {
      method: options.method || 'GET',
      url,
      headers: options.headers,
    });
  }

  try {
    // Get Supabase session token
    const { data: { session } } = await supabase.auth.getSession();
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    // Add authorization header if session exists
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    // Make request
    const res = await fetch(url, { 
      ...options, 
      headers,
      signal: controller.signal,
    });

    // Clear timeout
    clearTimeout(timeoutId);

    // Parse response
    const text = await res.text();
    let body: any = text;
    
    try { 
      body = JSON.parse(text); 
    } catch (e) {
      // Not JSON, keep as text
    }

    // Debug logging
    if (DEBUG_MODE) {
      console.log('API Response:', {
        status: res.status,
        ok: res.ok,
        body: typeof body === 'string' ? body.substring(0, 100) : body,
      });
    }

    return { status: res.status, ok: res.ok, body };

  } catch (error: any) {
    // Handle timeout
    if (error.name === 'AbortError') {
      console.error('API request timeout:', url);
      return {
        status: 408,
        ok: false,
        body: { 
          success: false, 
          message: 'Request timeout. Please check your internet connection.' 
        },
      };
    }

    // Handle network errors
    console.error('API request error:', error);
    return {
      status: 0,
      ok: false,
      body: { 
        success: false, 
        message: 'Network error. Please check your internet connection.' 
      },
    };
  }
}

/**
 * Upload file to backend (multipart/form-data)
 */
export async function uploadFile(
  path: string, 
  fileUri: string, 
  fileName: string,
  additionalData?: Record<string, any>
) {
  const url = BACKEND_URL.replace(/\/+$/, '') + path;

  try {
    // Get Supabase session token
    const { data: { session } } = await supabase.auth.getSession();

    // Create form data
    const formData = new FormData();
    
    // Add file
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'application/octet-stream', // Let backend determine type
    } as any);

    // Add additional data
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    // Make request
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        // Don't set Content-Type - let browser set it with boundary
      },
      body: formData,
    });

    const text = await res.text();
    let body: any = text;
    
    try { 
      body = JSON.parse(text); 
    } catch (e) {
      // Not JSON
    }

    return { status: res.status, ok: res.ok, body };

  } catch (error) {
    console.error('File upload error:', error);
    return {
      status: 0,
      ok: false,
      body: { 
        success: false, 
        message: 'Upload failed. Please try again.' 
      },
    };
  }
}

/**
 * Check if backend is reachable
 */
export async function healthCheck() {
  try {
    const res = await apiFetch('/health');
    return res.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get backend URL (useful for debugging)
 */
export function getBackendUrl() {
  return BACKEND_URL;
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode() {
  return DEBUG_MODE;
}