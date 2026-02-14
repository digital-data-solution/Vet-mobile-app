import React, { useState, useCallback } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

type RegisterMethod = 'email' | 'phone';
type Step = 'register' | 'verifyOtp' | 'emailSent';

interface Props {
  navigation: any;
}

function formatPhone(p: string): string {
  return p.startsWith('+') ? p : `+234${p.replace(/^0/, '')}`;
}

function isValidEmail(e: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

function isValidPhone(p: string): boolean {
  const formatted = formatPhone(p);
  return /^\+\d{10,15}$/.test(formatted);
}

export default function RegisterScreen({ navigation }: Props) {
  const [registerMethod, setRegisterMethod] = useState<RegisterMethod>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('register');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = (): string | null => {
    if (registerMethod === 'phone') {
      if (!phone.trim()) return 'Please enter a phone number.';
      if (!isValidPhone(phone.trim())) return 'Enter a valid Nigerian phone number (e.g. 08012345678).';
    } else {
      if (!email.trim()) return 'Please enter an email address.';
      if (!isValidEmail(email.trim())) return 'Please enter a valid email address.';
    }
    if (!password) return 'Please enter a password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setLoading(true);
    try {
      let data, error;

      if (registerMethod === 'email') {
        ({ data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        }));
      } else {
        ({ data, error } = await supabase.auth.signUp({
          phone: formatPhone(phone.trim()),
          password,
        }));
      }

      if (error) {
        Alert.alert('Registration Failed', error.message);
        return;
      }

      // Register user in backend (MongoDB)
      const backendPayload = registerMethod === 'email'
        ? { name: email.split('@')[0], email: email.trim(), password, role: 'pet_owner' }
        : { name: phone.trim(), phone: formatPhone(phone.trim()), password, role: 'pet_owner' };
      try {
        await fetch('https://vet-market-place.onrender.com/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backendPayload),
        });
      } catch (e) {
        // Ignore backend errors for now, user can retry onboarding if needed
      }

      if (registerMethod === 'phone') {
        setStep('verifyOtp');
      } else {
        // Check if email confirmation is required
        if (data?.user && !data.session) {
          setStep('emailSent');
        } else if (data?.session) {
          await AsyncStorage.setItem('access_token', data.session.access_token);
          navigation.replace('MainTabs');
        }
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [registerMethod, email, phone, password, navigation]);

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
        await AsyncStorage.setItem('access_token', data.session.access_token);
        navigation.replace('MainTabs');
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [otp, phone, navigation]);

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

              {/* Method toggle */}
              <View style={styles.methodToggle}>
                <ToggleButton
                  label="Email"
                  active={registerMethod === 'email'}
                  onPress={() => setRegisterMethod('email')}
                />
                <ToggleButton
                  label="Phone"
                  active={registerMethod === 'phone'}
                  onPress={() => setRegisterMethod('phone')}
                />
              </View>

              {registerMethod === 'email' ? (
                <FormInput
                  icon="✉️"
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <FormInput
                  icon="📞"
                  placeholder="Phone number (e.g. 08012345678)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              )}

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

          {step === 'verifyOtp' && (
            <>
              <Text style={styles.cardTitle}>Verify Phone</Text>
              <Text style={styles.cardSubtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.boldText}>{formatPhone(phone)}</Text>
              </Text>

              <FormInput
                icon="🔢"
                placeholder="Enter OTP code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />

              <PrimaryButton
                label="Verify & Continue"
                loadingLabel="Verifying..."
                onPress={handleVerifyOtp}
                loading={loading}
              />

              <TouchableOpacity style={styles.textLink} onPress={() => setStep('register')}>
                <Text style={styles.textLinkText}>← Change phone number</Text>
              </TouchableOpacity>
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
                {'\n\n'}Click the link in the email, then return here to sign in.
              </Text>

              <PrimaryButton
                label="Go to Sign In"
                loadingLabel="..."
                onPress={() => navigation.navigate('Auth')}
                loading={false}
              />
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
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  maxLength,
}: {
  icon: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  secureTextEntry?: boolean;
  autoCapitalize?: any;
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
  cardSubtitle: { fontSize: 14, color: '#6B7280', lineHeight: 22, marginBottom: 20 },
  boldText: { fontWeight: '700', color: '#111827' },
  methodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 4,
    marginBottom: 18,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  toggleBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
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
  showPasswordBtn: { position: 'absolute', right: 14, top: 14 },
  showPasswordText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  textLink: { alignItems: 'center', marginTop: 8 },
  textLinkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
  successIcon: { alignItems: 'center', marginBottom: 12 },
  successEmoji: { fontSize: 52 },
  terms: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#2563EB', fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: { fontSize: 14, color: '#6B7280' },
  footerLink: { fontSize: 14, color: '#2563EB', fontWeight: '700' },
});