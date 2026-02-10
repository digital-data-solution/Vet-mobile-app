import { Alert, View, Text, TextInput, TouchableOpacity } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { onAuthStateChange, supabase } from '../api/supabase';
import { resetPassword } from '../api/resetPassword';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'login' | 'verify' | 'forgot'>('login');
  const [biometricSupported, setBiometricSupported] = useState(false);
      // Check for biometric support
      useEffect(() => {
        (async () => {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricSupported(compatible && enrolled);
        })();
      }, []);

      // Biometric login handler
      const handleBiometricLogin = async () => {
        try {
          const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Login with Biometrics' });
          if (result.success) {
            // Try to get last used credentials from AsyncStorage
            const lastEmail = await AsyncStorage.getItem('last_email');
            const lastPhone = await AsyncStorage.getItem('last_phone');
            const lastPassword = await AsyncStorage.getItem('last_password');
            if (lastPassword && (lastEmail || lastPhone)) {
              let data, error;
              if (lastEmail) {
                ({ data, error } = await supabase.auth.signInWithPassword({ email: lastEmail, password: lastPassword }));
              } else if (lastPhone) {
                ({ data, error } = await supabase.auth.signInWithPassword({ phone: lastPhone, password: lastPassword }));
              } else {
                Alert.alert('No saved credentials', 'Please login manually first.');
                return;
              }
              if (error) {
                Alert.alert('Biometric Login Failed', error.message);
              } else if (data.session) {
                await AsyncStorage.setItem('access_token', data.session.access_token || '');
                Alert.alert('Success', 'Logged in successfully!');
                navigation.navigate('MainTabs');
              }
            } else {
              Alert.alert('No saved credentials', 'Please login manually first.');
            }
          }
        } catch (e) {
          Alert.alert('Error', 'Biometric authentication failed');
        }
      };
    // Handle password reset
    const handleForgotPassword = async () => {
      if (!email) {
        Alert.alert('Enter your email to reset password');
        return;
      }
      try {
        const { error } = await resetPassword(email);
        if (error) {
          Alert.alert('Reset Failed', error.message);
        } else {
          Alert.alert('Check your email', 'A password reset link has been sent.');
          setStep('login');
        }
      } catch (e) {
        Alert.alert('Error', 'Network error occurred');
      }
    };
  const [loading, setLoading] = useState(false);

  // Send OTP for login
  const handleSendOtp = async () => {
    setLoading(true);
    try {
      // Format phone to E.164 if needed
      const formattedPhone = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
      // Use email and password if provided
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email || undefined,
        phone: formattedPhone,
        password,
      });
      if (error) {
        Alert.alert('Login Failed', error.message);
      } else if (data.session) {
        await AsyncStorage.setItem('access_token', data.session.access_token || '');
        // Save credentials for biometric login
        if (password) {
          if (email) await AsyncStorage.setItem('last_email', email);
          if (phone) await AsyncStorage.setItem('last_phone', formattedPhone);
          await AsyncStorage.setItem('last_password', password);
        }
        Alert.alert('Success', 'Logged in successfully!');
        navigation.navigate('MainTabs');
      } else {
        Alert.alert('Success', 'OTP sent to your phone. Please check your messages.');
        setStep('verify');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
      const { data, error } = await supabase.auth.verifyOtp({ phone: formattedPhone, token: otp, type: 'sms' });
      if (error) {
        Alert.alert('Verification Failed', error.message);
      } else if (data.session) {
        await AsyncStorage.setItem('access_token', data.session.access_token || '');
        Alert.alert('Success', 'Logged in successfully!');
        navigation.navigate('MainTabs');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  const checkExistingSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigation.navigate('MainTabs');
    }
  };

  useEffect(() => {
    checkExistingSession();
    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      // Remove auto-navigation on SIGNED_IN
      // Only navigate after OTP verification
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', paddingHorizontal: 24 }}>
      <View style={{ width: '100%', maxWidth: 400, backgroundColor: '#fff', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 24, textAlign: 'center' }}>Sign In</Text>
        {step === 'login' ? (
          <>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' }}
              placeholder="Email (optional)"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' }}
              placeholder="Phone Number"
              placeholderTextColor="#888"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' }}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={{ backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 8, marginBottom: 8 }}
              onPress={handleSendOtp}
              disabled={loading}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{loading ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>
            {biometricSupported && (
              <TouchableOpacity
                style={{ backgroundColor: '#34c759', paddingVertical: 14, borderRadius: 8, marginBottom: 8 }}
                onPress={handleBiometricLogin}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>Login with Biometrics</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setStep('forgot')}>
              <Text style={{ color: '#007AFF', textAlign: 'center', marginTop: 8 }}>Forgot Password?</Text>
            </TouchableOpacity>
          </>
        ) : step === 'verify' ? (
          <>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' }}
              placeholder="Enter OTP"
              placeholderTextColor="#888"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={{ backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 8, marginBottom: 8 }}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{loading ? 'Verifying...' : 'Verify OTP'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 16, color: '#222', marginBottom: 12, textAlign: 'center' }}>Reset Password</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16, fontSize: 16, backgroundColor: '#fff' }}
              placeholder="Enter your email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={{ backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 8, marginBottom: 8 }}
              onPress={handleForgotPassword}
              disabled={loading}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{loading ? 'Sending...' : 'Send Reset Link'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('login')}>
              <Text style={{ color: '#007AFF', textAlign: 'center', marginTop: 8 }}>Back to Sign In</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={{ color: '#007AFF', textAlign: 'center', marginTop: 8 }}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
