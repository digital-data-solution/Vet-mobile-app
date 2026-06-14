import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Image,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';

const LOGO = require('../../assets/icon.png');
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage             from '@react-native-async-storage/async-storage';
import { supabase }             from '../api/supabase';
import { apiFetch }             from '../api/client';

type Step = 'login' | 'forgot';

const STORAGE_KEYS = {
  lastEmail:    'last_email',
  lastPassword: 'last_password',
  accessToken:  'access_token',
};

// ─────────────────────────────────────────────────────────────────────────────
// syncWithBackend
// Called immediately after every successful Supabase sign-in.
// Creates the MongoDB User document if it doesn't exist yet (upsert),
// or returns the existing one. Silent — never blocks navigation.
// ─────────────────────────────────────────────────────────────────────────────
async function syncWithBackend(
  accessToken:  string,
  utmSource?:   string | null,
  utmCampaign?: string | null,
  utmMedium?:   string | null,
): Promise<void> {
  try {
    const res = await apiFetch('/api/auth/sync', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...(utmSource   && { utmSource }),
        ...(utmCampaign && { utmCampaign }),
        ...(utmMedium   && { utmMedium }),
      }),
    });

    if (!res.ok) {
      console.warn('[AuthScreen] sync failed — status:', res.status, res.body?.message);
    } else {
      console.log('[AuthScreen] sync OK — mongoId:', res.body?.userId);
    }
  } catch (err) {
    // Never crash login over a sync failure — log and continue.
    console.error('[AuthScreen] sync error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AuthScreen({ navigation, route }: { navigation: any; route?: any }) {
  const utmSource   = route?.params?.utmSource   ?? null;
  const utmCampaign = route?.params?.utmCampaign ?? null;
  const utmMedium   = route?.params?.utmMedium   ?? null;
  const [email,              setEmail]              = useState('');
  const [password,           setPassword]           = useState('');
  const [step,               setStep]               = useState<Step>('login');
  const [loading,            setLoading]            = useState(false);
  const [showPassword,       setShowPassword]       = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    })();
  }, []);

  // ─── Shared post-login handler ──────────────────────────────────────────────
  // Single place that saves credentials, syncs MongoDB, then lets
  // onAuthStateChange in AppNavigator handle navigation.

  const afterLogin = useCallback(
    async (
      accessToken: string,
      userEmail:   string,
      userPassword: string,
    ) => {
      // 1. Persist session
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.accessToken,  accessToken],
        [STORAGE_KEYS.lastEmail,    userEmail],
        [STORAGE_KEYS.lastPassword, userPassword],
      ]);

      // 2. Ensure MongoDB document exists — fire-and-forget but awaited
      //    so the document is ready before any gated route is hit.
      await syncWithBackend(accessToken, utmSource, utmCampaign, utmMedium);

      // 3. Navigation handled by onAuthStateChange — no navigate() call needed.
    },
    [],
  );

  // ─── Email / password login ─────────────────────────────────────────────────

  const handleLogin = useCallback(async () => {
    if (!email.trim())  return Alert.alert('Validation', 'Please enter your email address.');
    if (!password)      return Alert.alert('Validation', 'Please enter your password.');

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return Alert.alert('Sign In Failed', error.message);
      }

      if (data.session) {
        await afterLogin(
          data.session.access_token,
          email.trim().toLowerCase(),
          password,
        );
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, afterLogin]);

  // ─── Biometric login ────────────────────────────────────────────────────────

  const handleBiometricLogin = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use Password',
      });
      if (!result.success) return;

      const [[, savedEmail], [, savedPassword]] = await AsyncStorage.multiGet([
        STORAGE_KEYS.lastEmail,
        STORAGE_KEYS.lastPassword,
      ]);

      if (!savedEmail || !savedPassword) {
        return Alert.alert(
          'No Saved Credentials',
          'Please sign in manually at least once first.',
        );
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email:    savedEmail,
        password: savedPassword,
      });

      if (error) {
        Alert.alert('Biometric Sign In Failed', error.message);
      } else if (data.session) {
        await afterLogin(data.session.access_token, savedEmail, savedPassword);
      }
    } catch {
      Alert.alert('Error', 'Biometric authentication failed.');
    }
  }, [afterLogin]);

  // ─── Forgot password ────────────────────────────────────────────────────────

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) return Alert.alert('Required', 'Please enter your email address.');

    setLoading(true);
    try {
      // /auth/callback is registered in the navigation deep-link config
      // and renders EmailVerifiedScreen which handles both verify + recovery flows
      const resetRedirect = Platform.OS === 'web'
        ? 'https://xpressvetmarketplace.com/auth/callback'
        : 'xpressvet://auth/callback';

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: resetRedirect },
      );

      if (error) {
        Alert.alert('Reset Failed', error.message);
      } else {
        Alert.alert(
          'Email Sent',
          'A password reset link has been sent to your email.',
          [{ text: 'OK', onPress: () => setStep('login') }],
        );
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.appName}>Xpress Vet</Text>
          <Text style={styles.appTagline}>Your trusted veterinary marketplace</Text>
        </View>

        <View style={styles.card}>
          {step === 'login' && (
            <>
              <Text style={styles.cardTitle}>Sign In</Text>

              <FormInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="✉️"
              />

              <View style={styles.passwordWrapper}>
                <FormInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  icon="🔒"
                />
                <Pressable
                  style={styles.showPasswordBtn}
                  onPress={() => setShowPassword(v => !v)}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.forgotLink}
                onPress={() => setStep('forgot')}
              >
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </Pressable>

              <PrimaryButton
                label="Sign In"
                loadingLabel="Signing in..."
                onPress={handleLogin}
                loading={loading}
              />

              {biometricAvailable && (
                <Pressable
                  style={({ pressed }) => [styles.biometricBtn, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={handleBiometricLogin}
                >
                  <Text style={styles.biometricBtnText}>
                    🔐 Sign In with Biometrics
                  </Text>
                </Pressable>
              )}
            </>
          )}

          {step === 'forgot' && (
            <>
              <Text style={styles.cardTitle}>Reset Password</Text>
              <Text style={styles.cardSubtitle}>
                Enter your email and we'll send you a reset link.
              </Text>

              <FormInput
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="✉️"
              />

              <PrimaryButton
                label="Send Reset Link"
                loadingLabel="Sending..."
                onPress={handleForgotPassword}
                loading={loading}
              />

              <Pressable
                style={styles.textLink}
                onPress={() => setStep('login')}
              >
                <Text style={styles.textLinkText}>← Back to Sign In</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}> Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormInput({
  placeholder, value, onChangeText, keyboardType,
  secureTextEntry, autoCapitalize, icon, maxLength,
}: {
  placeholder:      string;
  value:            string;
  onChangeText:     (v: string) => void;
  keyboardType?:    any;
  secureTextEntry?: boolean;
  autoCapitalize?:  any;
  icon:             string;
  maxLength?:       number;
}) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputIcon}>{icon}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'none'}
        maxLength={maxLength}
      />
    </View>
  );
}

function PrimaryButton({
  label, loadingLabel, onPress, loading,
}: {
  label:        string;
  loadingLabel: string;
  onPress:      () => void;
  loading:      boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.primaryBtn, loading && styles.primaryBtnDisabled, { opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={styles.primaryBtnText}>{label}</Text>
      }
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:             { flex: 1, backgroundColor: '#F3F4F6' },
  container:          { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  logoSection:        { alignItems: 'center', marginBottom: 28 },
  logoImage:          { width: 80, height: 80, marginBottom: 10, borderRadius: 18 },
  appName:            { fontSize: 30, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  appTagline:         { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card:               { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardTitle:          { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  cardSubtitle:       { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  inputWrapper:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 14, backgroundColor: '#F9FAFB' },
  inputIcon:          { fontSize: 16, marginRight: 10 },
  input:              { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  passwordWrapper:    { position: 'relative' },
  showPasswordBtn:    { position: 'absolute', right: 14, top: 14 },
  showPasswordText:   { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  forgotLink:         { alignSelf: 'flex-end', marginBottom: 18, marginTop: -6 },
  forgotLinkText:     { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  primaryBtn:         { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  biometricBtn:       { backgroundColor: '#F0FDF4', paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#BBF7D0' },
  biometricBtnText:   { color: '#16A34A', fontSize: 15, fontWeight: '700' },
  textLink:           { alignItems: 'center', marginTop: 8 },
  textLinkText:       { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  footer:             { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText:         { fontSize: 14, color: '#6B7280' },
  footerLink:         { fontSize: 14, color: '#2563EB', fontWeight: '700' },
});