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

type Stage = 'loading' | 'verified' | 'verified_signin' | 'reset_form' | 'reset_success' | 'expired' | 'error';

const EMAIL_VERIFY_REDIRECT = Platform.OS === 'web'
  ? 'https://xpressvetmarketplace.com/auth/callback'
  : 'xpressvet://auth/callback';

function isNetworkError(msg: string): boolean {
  return /failed to fetch|network|load failed|timeout/i.test(msg);
}

export default function EmailVerifiedScreen({ navigation }: any) {
  const [stage,     setStage]     = useState<Stage>('loading');
  const [message,   setMessage]   = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendNote,  setResendNote]  = useState('');

  const { isAuthenticated } = useAuth();

  // Navigate to MainTabs only once auth context has confirmed the session is
  // active — avoids "Cannot navigate to MainTabs" when the state hasn't
  // propagated yet at the moment we call navigation.reset.
  useEffect(() => {
    if (stage !== 'verified') return;
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      // Reset URL to '/' so '/auth/callback' doesn't re-trigger this screen on next load
      if (typeof window !== 'undefined' && window.history) {
        window.history.replaceState({}, '', '/');
      }
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }, 800);
    return () => clearTimeout(timer);
  }, [stage, isAuthenticated, navigation]);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // detectSessionInUrl is off on every platform (see api/supabase.ts) — we
        // own the entire exchange here, on purpose. Supabase's own auto-detection
        // used to strip the token/type out of the URL as part of establishing the
        // session *before* this code got a chance to read it, so a recovery link
        // and a plain verification link became indistinguishable by the time we
        // checked. Reading the raw URL ourselves, first, before touching the SDK
        // at all, removes that race entirely.
        const rawUrl = Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.href
          : await Linking.getInitialURL();

        if (!rawUrl) {
          navigation.reset({ index: 0, routes: [{ name: isAuthenticated ? 'MainTabs' : 'Auth' }] });
          return;
        }

        let parsed: URL;
        try {
          parsed = new URL(rawUrl);
        } catch {
          navigation.reset({ index: 0, routes: [{ name: isAuthenticated ? 'MainTabs' : 'Auth' }] });
          return;
        }

        const query = parsed.searchParams;
        // Supabase's own /auth/v1/verify redirect (used for both email-confirm and
        // password-recovery links) puts the tokens in the hash fragment; a PKCE
        // `code` exchange puts them in the query string. Check both.
        const hashParams = parsed.hash ? new URLSearchParams(parsed.hash.replace(/^#/, '')) : null;

        const code         = query.get('code');
        const accessToken  = query.get('access_token')  || hashParams?.get('access_token')  || null;
        const refreshToken = query.get('refresh_token') || hashParams?.get('refresh_token') || null;
        const type         = query.get('type') || hashParams?.get('type') || null;
        // Supabase sends expired / already-used links back here as
        // #error=access_denied&error_code=otp_expired&error_description=...
        const linkErrorCode = query.get('error_code') || hashParams?.get('error_code')
          || query.get('error') || hashParams?.get('error') || null;

        const isAuthCallback = parsed.pathname.includes('auth/callback') || !!code || !!accessToken || !!type || !!linkErrorCode;

        if (!isAuthCallback) {
          // Not opened via an auth deep link — redirect to the correct landing screen.
          navigation.reset({ index: 0, routes: [{ name: isAuthenticated ? 'MainTabs' : 'Auth' }] });
          return;
        }

        // Strip tokens out of the visible URL immediately on web — they're already
        // captured in the variables above, no reason to leave them sitting in the
        // address bar / browser history while we process them.
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
          window.history.replaceState({}, '', parsed.pathname);
        }

        if (linkErrorCode && !code && !accessToken) {
          // Link expired or was already used (most often: opened hours later).
          // Let the person request a fresh link right here.
          setStage('expired');
          return;
        }

        let exchangeError: string | null = null;

        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr) exchangeError = exchErr.message;
        } else if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (setErr) exchangeError = setErr.message;
        } else {
          exchangeError = 'This link is missing or has invalid parameters. Please request a new one.';
        }

        if (exchangeError && accessToken && isNetworkError(exchangeError)) {
          // Supabase only issues tokens after the email is confirmed, so the
          // account IS verified; only the follow-up network call failed.
          setStage('verified_signin');
          return;
        }

        if (exchangeError) {
          setStage('error');
          setMessage(exchangeError);
          return;
        }

        setStage(type === 'recovery' ? 'reset_form' : 'verified');
      } catch {
        setStage('error');
        setMessage('Verification failed. Please try again.');
      }
    };

    handleCallback();
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

  const handleResend = async () => {
    const e = resendEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setResendNote('Please enter the email you signed up with.');
      return;
    }
    setSaving(true);
    setResendNote('');
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: e,
        options: { emailRedirectTo: EMAIL_VERIFY_REDIRECT },
      });
      if (error) {
        setResendNote(isNetworkError(error.message) ? 'Could not reach our server. Check your internet, or open xpressvetmarketplace.com in Chrome, then try again.' : error.message);
      } else {
        setResendNote('Done! A new link is in your inbox (check Spam too). Please open it soon.');
      }
    } catch {
      setResendNote('Could not reach our server. Check your internet, or open xpressvetmarketplace.com in Chrome, then try again.');
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

      {stage === 'verified_signin' && (
        <>
          <Text style={styles.icon}>✅</Text>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>
            Your account is confirmed. Please sign in with your email and password.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
          >
            <Text style={styles.buttonText}>Go to Sign In</Text>
          </Pressable>
        </>
      )}

      {stage === 'expired' && (
        <>
          <Text style={styles.icon}>⏰</Text>
          <Text style={styles.title}>This link has expired</Text>
          <Text style={styles.message}>
            Email links work for a limited time and only once. If you already
            confirmed, just sign in. Otherwise, enter your email to get a new link.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email you signed up with"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
            value={resendEmail}
            onChangeText={setResendEmail}
          />
          {!!resendNote && <Text style={styles.message}>{resendNote}</Text>}
          <Pressable
            style={({ pressed }) => [styles.button, saving && styles.buttonDisabled, { opacity: pressed ? 0.8 : 1 }]}
            onPress={handleResend}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Sending...' : 'Send New Link'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })}
          >
            <Text style={styles.secondaryText}>I already confirmed: Sign In</Text>
          </Pressable>
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
  secondaryButton: { marginTop: 14, paddingVertical: 10, alignSelf: 'stretch', alignItems: 'center' },
  secondaryText:   { color: '#E8610A', fontWeight: '600', fontSize: 14 },
  buttonText:     { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
