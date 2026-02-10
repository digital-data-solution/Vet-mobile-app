// Polyfills required for Supabase to work correctly in React Native
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project credentials
const supabaseUrl = 'https://vmzbvaybnohfxfkrungj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtemJ2YXlibm9oZnhma3J1bmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NDQxMjksImV4cCI6MjA4NjIyMDEyOX0.QkGCSJkiD3r__oD3A7JJaT421Mqb_3efL7UMufh7YWU';

// AsyncStorage adapter expected by supabase-js: plain object with getItem/setItem/removeItem
const storage = {
  getItem: async (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helper functions
export const signUpWithPhone = async (phone: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    phone: phone,
    password: password,
  });
  return { data, error };
};

export const signInWithPhone = async (phone: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: phone,
    password: password,
  });
  return { data, error };
};

export const verifyOTP = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone,
    token: token,
    type: 'sms',
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};