import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
  Linking,
} from 'react-native';
import { supabase } from '../api/supabase';
import { useAuth } from '../navigation';

type Stage = 'loading' | 'verified' | 'reset_form' | 'reset_success' | 'error';

export default function EmailVerifiedScreen({ navigation }: any) {
  const [stage,     setStage]     = useState<Stage>('loading');
  const [message,   setMessage]   = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving,    setSaving]    = useState(false);

  const { isAuthenticated } = useAuth();

  // Navigate to MainTabs only once auth context has confirmed the session is
  // active — avoids "Cannot navigate to MainTabs" when the state hasn't
  // propagated yet at the moment we call navigation.reset.
  useEffect(() => {
    if (stage !== 'verified') return;
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }, 800);
    return () => clearTimeout(timer);
  }, [stage, isAuthenticated, navigation]);

  useEffect(() => {
    let authSub: any;

    const handleCallback = async () => {
      try {
        // On native, detectSessionInUrl is false so Supabase never auto-exchanges
        // the PKCE code from the deep link. Do it manually before falling through
        // to the getSession() / onAuthStateChange path.
        if (Platform.OS !== 'web') {
          const url = await Linking.getInitialURL();
          let code: string | null = null;
          let type: string | null = null;
          let isAuthCallback = false;

          if (url) {
            try {
              const parsed = new URL(url);
              code = parsed.searchParams.get('code');
              type = parsed.searchParams.get('type');
              isAuthCallback = parsed.pathname.includes('auth/callback') || !!code;
            } catch { /* malformed URL — not a callback */ }
          }

          if (!isAuthCallback) {
            // Not opened via an auth deep link — redirect to the correct landing screen.
            navigation.reset({ index: 0, routes: [{ name: isAuthenticated ? 'MainTabs' : 'Auth' }] });
            return;
          }

          if (code) {
            const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchErr) {
              setStage('error');
              setMessage(exchErr.message);
            } else if (type === 'recovery') {
              setStage('reset_form');
            } else {
              setStage('verified');
            }
            return;
          }
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          // Session already established — email verification success
          setStage('verified');
          return;
        }

        // No session yet — wait for Supabase to process the token from the URL
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, sess) => {
            if (event === 'PASSWORD_RECOVERY') {
              setStage('reset_form');
              subscription.unsubscribe();
            } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && sess) {
              setStage('verified');
              subscription.unsubscribe();
            }
          },
        );
        authSub = subscription;

        // Fallback: if nothing happens in 10s show error
        setTimeout(() => {
          setStage((prev) => prev === 'loading' ? 'error' : prev);
          setMessage('Verification timed out. Please try signing in.');
        }, 10000);
      } catch {
        setStage('error');
        setMessage('Verification failed. Please try again.');
      }
    };

    handleCallback();
    return () => authSub?.unsubscribe();
  }, []);

  const handleSetPassword = async () => {
    if (newPw.length < 6 || newPw !== confirmPw) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) {
        setMessage(error.message);
        setStage('error');
      } else {
        setStage('reset_success');
      }
    } catch {
      setStage('error');
      setMessage('Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pwTooShort   = newPw.length > 0 && newPw.length < 6;
  const pwMismatch   = confirmPw.length > 0 && newPw !== confirmPw;
  const canSubmit    = newPw.length >= 6 && newPw === confirmPw;

  return (
    <View style={styles.container}>

      {stage === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#E8610A" />
          <Text style={styles.message}>Processing your link...</Text>
        </>
      )}

      {stage === 'verified' && (
        <>
          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>
            Welcome to Xpress Vet Marketplace. Redirecting you now...
          </Text>
        </>
      )}

      {stage === 'reset_form' && (
        <>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.message}>Enter and confirm your new password below.</Text>

          <TextInput
            style={styles.input}
            placeholder="New password (min 6 characters)"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={newPw}
            onChangeText={setNewPw}
            autoCapitalize="none"
          />
          {pwTooShort && (
            <Text style={styles.error}>Password must be at least 6 characters</Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            value={confirmPw}
            onChangeText={setConfirmPw}
            autoCapitalize="none"
          />
          {pwMismatch && (
            <Text style={styles.error}>Passwords do not match</Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleSetPassword}
            disabled={saving || !canSubmit}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Set Password'}</Text>
          </Pressable>
        </>
      )}

      {stage === 'reset_success' && (
        <>
          <Text style={styles.icon}>✅</Text>
          <Text style={styles.title}>Password Updated!</Text>
          <Text style={styles.message}>You can now sign in with your new password.</Text>
          <Pressable
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.buttonText}>Go to Sign In</Text>
          </Pressable>
        </>
      )}

      {stage === 'error' && (
        <>
          <Text style={styles.icon}>❌</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{message || 'Please try signing in manually.'}</Text>
          <Pressable
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.buttonText}>Go to Sign In</Text>
          </Pressable>
        </>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: '#fff',
    padding:         24,
  },
  icon:          { fontSize: 64, marginBottom: 16 },
  title:         { fontSize: 24, fontWeight: 'bold', color: '#1C0F00', marginBottom: 12, textAlign: 'center' },
  message:       { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 8 },
  error:         { fontSize: 12, color: '#EF4444', alignSelf: 'stretch', marginBottom: 4, marginLeft: 4 },
  input: {
    alignSelf:         'stretch',
    borderWidth:       1.5,
    borderColor:       '#E5E7EB',
    borderRadius:      10,
    paddingHorizontal: 14,
    paddingVertical:   13,
    fontSize:          15,
    color:             '#111827',
    backgroundColor:   '#F9FAFB',
    marginTop:         12,
  },
  button: {
    marginTop:         20,
    backgroundColor:   '#E8610A',
    paddingVertical:   14,
    paddingHorizontal: 40,
    borderRadius:      10,
    alignSelf:         'stretch',
    alignItems:        'center',
  },
  buttonDisabled: { backgroundColor: '#D1D5DB' },
  buttonText:     { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
