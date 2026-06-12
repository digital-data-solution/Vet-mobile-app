// Polyfills required for Supabase to work correctly in React Native
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('Please check your .env file and ensure:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL is set');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY is set');
}

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

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // On web, Supabase must read the token_hash from the callback URL.
    // On native (iOS/Android), URL-based session detection causes errors.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ==========================================
// AUTH HELPER FUNCTIONS
// ==========================================

export const signUpWithPhone = async (phone: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ phone, password });
  return { data, error };
};

export const signInWithPhone = async (phone: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  return { data, error };
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
};

export const verifyOTP = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  return { data, error };
};

export const verifyEmailOTP = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return { error };
};

export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export const resetPasswordForEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
};

export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
};

export const updateEmail = async (newEmail: string) => {
  const { data, error } = await supabase.auth.updateUser({ email: newEmail });
  return { data, error };
};

// ==========================================
// MESSAGING HELPER FUNCTIONS
// ==========================================

export const sendMessage = async (fromUserId: string, toUserId: string, messageText: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message_text: messageText,
      read_status: false,
    })
    .select()
    .single();
  return { data, error };
};

export const listenMessages = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  const channel = supabase.channel(`messages-${userId}`);
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        // Realtime filters don't support OR reliably — no server-side filter here;
        // filter client-side so we only invoke the caller for messages in this user's conversations.
      },
      (payload: any) => {
        const row = payload.new ?? payload.old;
        if (row?.from_user_id === userId || row?.to_user_id === userId) {
          callback(payload);
        }
      }
    )
    .subscribe();
  return channel;
};

export const getMessages = async (userId: string, otherUserId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(from_user_id.eq.${userId},to_user_id.eq.${otherUserId}),` +
      `and(from_user_id.eq.${otherUserId},to_user_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });
  return { data, error };
};

export const markMessageAsRead = async (messageId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .update({ read_status: true })
    .eq('id', messageId);
  return { data, error };
};

// ==========================================
// STORAGE HELPER FUNCTIONS
// ==========================================

export const uploadFile = async (bucket: string, path: string, file: any, options?: any) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, options);
  return { data, error };
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const deleteFile = async (bucket: string, path: string) => {
  const { data, error } = await supabase.storage.from(bucket).remove([path]);
  return { data, error };
};

export const listFiles = async (bucket: string, path?: string) => {
  const { data, error } = await supabase.storage.from(bucket).list(path);
  return { data, error };
};

// ==========================================
// REALTIME HELPER FUNCTIONS
// ==========================================

export const subscribeToTable = (
  tableName: string,
  callback: (payload: any) => void,
  filter?: string
): RealtimeChannel => {
  const channel = supabase.channel(`${tableName}-changes-${Date.now()}`);
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName,
        ...(filter && { filter }),
      },
      callback
    )
    .subscribe();
  return channel;
};

export const unsubscribeFromChannel = async (channel: RealtimeChannel) => {
  await channel.unsubscribe();
  return supabase.removeChannel(channel);
};

export const removeAllChannels = async () => {
  return await supabase.removeAllChannels();
};

// ==========================================
// SUBSCRIPTION HELPER
// ==========================================

export const checkSubscription = async () => {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com';
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return { subscribed: false, message: 'Not authenticated' };

    const response = await fetch(`${backendUrl}/api/subscriptions/me`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await response.json();

    return {
      subscribed: data.success && data.data?.isActive,
      data: data.data,
    };
  } catch (error) {
    console.error('Subscription check error:', error);
    return { subscribed: false, message: 'Check failed' };
  }
};

export default supabase;
