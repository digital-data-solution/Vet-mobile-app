import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../api/supabase';
import { apiFetch } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Step = 'register' | 'emailSent';

interface Props {
  navigation: any;
}

function isValidEmail(e: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

const COOLDOWN_MS = 60_000;
// On web the redirect must be a real URL; on native use the deep link scheme
const EMAIL_VERIFY_REDIRECT = Platform.OS === 'web'
  ? 'https://xpressvetmarketplace.com/verify-email'
  : 'xpressvet://verify-email';

export default function RegisterScreen({ navigation }: Props) {
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step,            setStep]            = useState<Step>('register');
  const [loading,         setLoading]         = useState(false);
  const [showPassword,    setShowPassword]    = useState(false);

  const lastSubmitTime = useRef<number | null>(null);

  const validate = (): string | null => {
    if (!email.trim())              return 'Please enter an email address.';
    if (!isValidEmail(email.trim())) return 'Please enter a valid email address.';
    if (!password)                  return 'Please enter a password.';
    if (password.length < 6)        return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    const now = Date.now();
    if (lastSubmitTime.current && now - lastSubmitTime.current < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastSubmitTime.current)) / 1000);
      Alert.alert('Please Wait', `You can request another verification email in ${remaining} seconds.`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email:   email.trim().toLowerCase(),
        password,
        options: { emailRedirectTo: EMAIL_VERIFY_REDIRECT },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered')) {
          Alert.alert(
            'Account Exists',
            'An account with this email already exists. Please sign in instead.',
            [{ text: 'Sign In', onPress: () => navigation.navigate('Auth') }],
          );
        } else {
          Alert.alert('Registration Failed', error.message);
        }
        return;
      }

      lastSubmitTime.current = Date.now();

      try {
        await apiFetch('/api/auth/register', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:  email.trim().split('@')[0],
            email: email.trim().toLowerCase(),
            password,
            role:  'pet_owner',
          }),
        });
      } catch {
        // backend registration failure is non-fatal; user can complete onboarding later
      }

      if (data?.user && !data.session) {
        setStep('emailSent');
      } else if (data?.session) {
        await AsyncStorage.setItem('access_token', data.session.access_token);
        navigation.replace('MainTabs');
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, confirmPassword, navigation]);

  const handleResendEmail = useCallback(async () => {
    const now = Date.now();
    if (lastSubmitTime.current && now - lastSubmitTime.current < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastSubmitTime.current)) / 1000);
      Alert.alert('Please Wait', `You can resend the email in ${remaining} seconds.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type:    'signup',
        email:   email.trim().toLowerCase(),
        options: { emailRedirectTo: EMAIL_VERIFY_REDIRECT },
      });

      if (error) {
        Alert.alert('Failed to Resend', error.message);
      } else {
        lastSubmitTime.current = Date.now();
        Alert.alert('Email Sent', 'A new verification link has been sent to your inbox.');
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

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
          <Text style={styles.logoEmoji}>🐾</Text>
          <Text style={styles.appName}>Xpress Vet</Text>
          <Text style={styles.appTagline}>Create your free account</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'register' && (
            <>
              <Text style={styles.cardTitle}>Create Account</Text>

              <FormInput
                icon="✉️"
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View>
                <FormInput
                  icon="🔒"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.showPasswordBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              <FormInput
                icon="🔒"
                placeholder="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />

              <PrimaryButton
                label="Create Account"
                loadingLabel="Creating account..."
                onPress={handleRegister}
                loading={loading}
              />

              <Text style={styles.terms}>
                By registering you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </>
          )}

          {step === 'emailSent' && (
            <>
              <View style={styles.successIcon}>
                <Text style={styles.successEmoji}>📧</Text>
              </View>
              <Text style={styles.cardTitle}>Check Your Email</Text>
              <Text style={styles.cardSubtitle}>
                We sent a verification link to{'\n'}
                <Text style={styles.boldText}>{email}</Text>
                {'\n\n'}Tap the link in the email to confirm your account, then come back to sign in.
              </Text>

              <PrimaryButton
                label="Go to Sign In"
                loadingLabel="..."
                onPress={() => navigation.navigate('Auth')}
                loading={false}
              />

              <TouchableOpacity
                style={styles.textLink}
                onPress={handleResendEmail}
                disabled={loading}
              >
                <Text style={styles.textLinkText}>
                  {loading ? 'Sending...' : "Didn't receive it? Resend email"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.textLink, { marginTop: 4 }]}
                onPress={() => setStep('register')}
              >
                <Text style={[styles.textLinkText, { color: '#6B7280' }]}>← Use a different email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.footerLink}> Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormInput({
  icon, placeholder, value, onChangeText,
  keyboardType, secureTextEntry, autoCapitalize,
}: {
  icon: string; placeholder: string; value: string;
  onChangeText: (v: string) => void; keyboardType?: any;
  secureTextEntry?: boolean; autoCapitalize?: any;
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
      />
    </View>
  );
}

function PrimaryButton({
  label, loadingLabel, onPress, loading,
}: {
  label: string; loadingLabel: string; onPress: () => void; loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator size="small" color="#fff" />
        : <Text style={styles.primaryBtnText}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:              { flex: 1, backgroundColor: '#F3F4F6' },
  container:           { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  logoSection:         { alignItems: 'center', marginBottom: 28 },
  logoEmoji:           { fontSize: 56, marginBottom: 10 },
  appName:             { fontSize: 30, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  appTagline:          { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card:                { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardTitle:           { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 18 },
  cardSubtitle:        { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 20 },
  boldText:            { fontWeight: '700', color: '#111827' },
  inputWrapper:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 14, backgroundColor: '#F9FAFB' },
  inputIcon:           { fontSize: 16, marginRight: 10 },
  input:               { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  showPasswordBtn:     { position: 'absolute', right: 14, top: 14 },
  showPasswordText:    { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  primaryBtn:          { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 4, marginBottom: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  primaryBtnDisabled:  { opacity: 0.7 },
  primaryBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  textLink:            { alignItems: 'center', marginTop: 8 },
  textLinkText:        { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  successIcon:         { alignItems: 'center', marginBottom: 12 },
  successEmoji:        { fontSize: 52 },
  terms:               { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  termsLink:           { color: '#2563EB', fontWeight: '600' },
  footer:              { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText:          { fontSize: 14, color: '#6B7280' },
  footerLink:          { fontSize: 14, color: '#2563EB', fontWeight: '700' },
});
