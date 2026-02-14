import React, { useState, useEffect, useCallback } from 'react';
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
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, onAuthStateChange } from '../api/supabase';
import { resetPassword } from '../api/resetPassword';

type Step = 'login' | 'verify' | 'forgot';
type LoginMethod = 'phone' | 'email';

interface Props {
  navigation: any;
}

// SECURITY NOTE: Storing passwords in AsyncStorage for biometric re-auth
// is acceptable only if the device is encrypted (default on modern iOS/Android).
// For higher security, consider using expo-secure-store instead.
const STORAGE_KEYS = {
  lastEmail: 'last_email',
  lastPhone: 'last_phone',
  lastPassword: 'last_password',
  accessToken: 'access_token',
};

export default function AuthScreen({ navigation }: Props) {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('login');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigation.replace('MainTabs');
      }
    };
    checkSession();

    // Listen for auth changes (e.g. email link verification)
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      if (session && _event === 'SIGNED_IN') {
        navigation.replace('MainTabs');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigation]);

  // Check biometric availability
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    })();
  }, []);

  const formatPhone = (p: string) =>
    p.startsWith('+') ? p : `+234${p.replace(/^0/, '')}`;

  const handleLogin = useCallback(async () => {
    // Validate
    if (loginMethod === 'email') {
      if (!email.trim()) {
        Alert.alert('Validation', 'Please enter your email address.');
        return;
      }
    } else {
      if (!phone.trim()) {
        Alert.alert('Validation', 'Please enter your phone number.');
        return;
      }
    }
    if (!password) {
      Alert.alert('Validation', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const credentials =
        loginMethod === 'email'
          ? { email: email.trim(), password }
          : { phone: formatPhone(phone.trim()), password };

      const { data, error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        Alert.alert('Sign In Failed', error.message);
        return;
      }

      if (data.session) {
        // Save token and credentials for biometric re-auth
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.accessToken, data.session.access_token],
          [STORAGE_KEYS.lastPassword, password],
          ...(loginMethod === 'email'
            ? [[STORAGE_KEYS.lastEmail, email.trim()] as [string, string]]
            : [[STORAGE_KEYS.lastPhone, formatPhone(phone.trim())] as [string, string]]),
        ]);
        navigation.replace('MainTabs');
      } else {
        // OTP flow
        setStep('verify');
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [loginMethod, email, phone, password, navigation]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Validation', 'Please enter the OTP sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatPhone(phone),
        token: otp,
        type: 'sms',
      });
      if (error) {
        Alert.alert('Verification Failed', error.message);
      } else if (data.session) {
        await AsyncStorage.setItem(STORAGE_KEYS.accessToken, data.session.access_token);
        navigation.replace('MainTabs');
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [otp, phone, navigation]);

  const handleBiometricLogin = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign in',
        fallbackLabel: 'Use Password',
      });
      if (!result.success) return;

      const [savedEmail, savedPhone, savedPassword] = await AsyncStorage.multiGet([
        STORAGE_KEYS.lastEmail,
        STORAGE_KEYS.lastPhone,
        STORAGE_KEYS.lastPassword,
      ]);
      const email = savedEmail[1];
      const savedPh = savedPhone[1];
      const pass = savedPassword[1];

      if (!pass || (!email && !savedPh)) {
        Alert.alert('No Saved Credentials', 'Please sign in manually at least once first.');
        return;
      }

      const credentials = email
        ? { email, password: pass }
        : { phone: savedPh!, password: pass };

      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) {
        Alert.alert('Biometric Sign In Failed', error.message);
      } else if (data.session) {
        await AsyncStorage.setItem(STORAGE_KEYS.accessToken, data.session.access_token);
        navigation.replace('MainTabs');
      }
    } catch {
      Alert.alert('Error', 'Biometric authentication failed.');
    }
  }, [navigation]);

  const handleForgotPassword = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        Alert.alert('Reset Failed', error.message);
      } else {
        Alert.alert(
          'Email Sent',
          'A password reset link has been sent to your email.',
          [{ text: 'OK', onPress: () => setStep('login') }]
        );
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
          <Text style={styles.appTagline}>Your trusted veterinary marketplace</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {step === 'login' && (
            <>
              <Text style={styles.cardTitle}>Sign In</Text>

              {/* Method toggle */}
              <View style={styles.methodToggle}>
                <ToggleButton
                  label="Email"
                  active={loginMethod === 'email'}
                  onPress={() => setLoginMethod('email')}
                />
                <ToggleButton
                  label="Phone"
                  active={loginMethod === 'phone'}
                  onPress={() => setLoginMethod('phone')}
                />
              </View>

              {loginMethod === 'email' ? (
                <FormInput
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="✉️"
                />
              ) : (
                <FormInput
                  placeholder="Phone number (e.g. 08012345678)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  icon="📞"
                />
              )}

              <View style={styles.passwordWrapper}>
                <FormInput
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  icon="🔒"
                />
                <TouchableOpacity
                  style={styles.showPasswordBtn}
                  onPress={() => setShowPassword((v) => !v)}
                >
                  <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotLink}
                onPress={() => setStep('forgot')}
              >
                <Text style={styles.forgotLinkText}>Forgot password?</Text>
              </TouchableOpacity>

              <PrimaryButton
                label="Sign In"
                loadingLabel="Signing in..."
                onPress={handleLogin}
                loading={loading}
              />

              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricLogin}
                  activeOpacity={0.8}
                >
                  <Text style={styles.biometricBtnText}>🔐 Sign In with Biometrics</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {step === 'verify' && (
            <>
              <Text style={styles.cardTitle}>Verify OTP</Text>
              <Text style={styles.cardSubtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.boldText}>{formatPhone(phone)}</Text>
              </Text>

              <FormInput
                placeholder="Enter OTP code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                icon="🔢"
                maxLength={6}
              />

              <PrimaryButton
                label="Verify"
                loadingLabel="Verifying..."
                onPress={handleVerifyOtp}
                loading={loading}
              />

              <TouchableOpacity
                style={styles.textLink}
                onPress={() => setStep('login')}
              >
                <Text style={styles.textLinkText}>← Back to Sign In</Text>
              </TouchableOpacity>
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

              <TouchableOpacity
                style={styles.textLink}
                onPress={() => setStep('login')}
              >
                <Text style={styles.textLinkText}>← Back to Sign In</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}> Create one</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToggleButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.toggleBtnText, active && styles.toggleBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FormInput({
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  icon,
  maxLength,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: any;
  icon: string;
  maxLength?: number;
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
  label,
  loadingLabel,
  onPress,
  loading,
}: {
  label: string;
  loadingLabel: string;
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  logoSection: { alignItems: 'center', marginBottom: 28 },
  logoEmoji: { fontSize: 56, marginBottom: 10 },
  appName: { fontSize: 30, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  appTagline: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  cardSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  boldText: { fontWeight: '700', color: '#111827' },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  toggleBtnTextActive: { color: '#111827' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  passwordWrapper: { position: 'relative' },
  showPasswordBtn: { position: 'absolute', right: 14, top: 14 },
  showPasswordText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 18, marginTop: -6 },
  forgotLinkText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  biometricBtn: {
    backgroundColor: '#F0FDF4',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  biometricBtnText: { color: '#16A34A', fontSize: 15, fontWeight: '700' },
  textLink: { alignItems: 'center', marginTop: 8 },
  textLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, color: '#2563EB', fontWeight: '700' },
});