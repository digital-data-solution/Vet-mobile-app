import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [loading, setLoading] = useState(false);

  // Register user with Supabase
  const handleRegister = async () => {
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
      const { data, error } = await supabase.auth.signUp({
        email: email || undefined,
        phone: formattedPhone,
        password,
      });
      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else if (data.session) {
        await AsyncStorage.setItem('access_token', data.session.access_token || '');
        Alert.alert('Success', 'Registered and logged in!');
        navigation.navigate('MainTabs');
      } else {
        Alert.alert('Success', 'OTP sent to your phone. Please verify.');
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
        Alert.alert('Success', 'Registered and logged in!');
        navigation.navigate('MainTabs');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', paddingHorizontal: 24 }}>
      <View style={{ width: '100%', maxWidth: 400, backgroundColor: '#fff', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 24, textAlign: 'center' }}>Register</Text>
        {step === 'register' ? (
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
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>{loading ? 'Registering...' : 'Register'}</Text>
            </TouchableOpacity>
          </>
        ) : (
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
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
          <Text style={{ color: '#007AFF', textAlign: 'center', marginTop: 8 }}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
