// Polyfills required for Supabase to work correctly in React Native
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

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
    detectSessionInUrl: false,
  },
});

// ==========================================
// AUTH HELPER FUNCTIONS
// ==========================================

/**
 * Sign up with phone number
 */
export const signUpWithPhone = async (phone: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    phone: phone,
    password: password,
  });
  return { data, error };
};

/**
 * Sign in with phone number and password
 */
export const signInWithPhone = async (phone: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: phone,
    password: password,
  });
  return { data, error };
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });
  return { data, error };
};

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
  });
  return { data, error };
};

/**
 * Verify OTP (for phone or email)
 */
export const verifyOTP = async (phone: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phone,
    token: token,
    type: 'sms',
  });
  return { data, error };
};

/**
 * Verify email OTP
 */
export const verifyEmailOTP = async (email: string, token: string) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email,
    token: token,
    type: 'email',
  });
  return { data, error };
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

/**
 * Get current session
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

/**
 * Reset password for email
 */
export const resetPasswordForEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
};

/**
 * Update user password
 */
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
};

/**
 * Update user email
 */
export const updateEmail = async (newEmail: string) => {
  const { data, error } = await supabase.auth.updateUser({
    email: newEmail,
  });
  return { data, error };
};

// ==========================================
// MESSAGING HELPER FUNCTIONS
// ==========================================

/**
 * Send a message
 */
export const sendMessage = async (fromUserId: string, toUserId: string, messageText: string) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      message_text: messageText,
      timestamp: new Date().toISOString(),
      read_status: false,
    })
    .select()
    .single();

  return { data, error };
};

/**
 * Listen to new messages for a user
 * Returns a RealtimeChannel that can be unsubscribed
 */
export const listenMessages = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  const channel = supabase.channel(`messages-${userId}`);
  
  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `from_user_id=eq.${userId},to_user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();

  return channel;
};

/**
 * Get messages between two users
 */
export const getMessages = async (userId: string, otherUserId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .or(`from_user_id.eq.${otherUserId},to_user_id.eq.${otherUserId}`)
    .order('timestamp', { ascending: true });

  return { data, error };
};

/**
 * Mark message as read
 */
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

/**
 * Upload file to storage
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: any,
  options?: any
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, options);

  return { data, error };
};

/**
 * Get public URL for file
 */
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Delete file from storage
 */
export const deleteFile = async (bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  return { data, error };
};

/**
 * List files in a bucket
 */
export const listFiles = async (bucket: string, path?: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(path);

  return { data, error };
};

// ==========================================
// REALTIME HELPER FUNCTIONS
// ==========================================

/**
 * Subscribe to realtime changes on a table
 * Returns a RealtimeChannel that can be unsubscribed
 */
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

/**
 * Unsubscribe from a channel
 */
export const unsubscribeFromChannel = async (channel: RealtimeChannel) => {
  await channel.unsubscribe();
  return supabase.removeChannel(channel);
};

/**
 * Remove all channels
 */
export const removeAllChannels = async () => {
  return await supabase.removeAllChannels();
};

// ==========================================
// SUBSCRIPTION HELPER (OPTIONAL)
// ==========================================

/**
 * Check if user has active subscription
 * This calls your backend API to verify subscription
 */
export const checkSubscription = async () => {
  try {
    // Get backend URL from environment
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place.onrender.com';
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { subscribed: false, message: 'Not authenticated' };
    }

    // Call backend to check subscription
    const response = await fetch(`${backendUrl}/api/subscriptions/me`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
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

// Default export
export default supabase;