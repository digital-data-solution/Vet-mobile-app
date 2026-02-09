import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase, signInWithPhone, verifyOTP, signUpWithPhone, onAuthStateChange } from '../api/supabase';
import { saveToken, getToken } from '../api/client';

export default function AuthScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'register' | 'verify'>('login');

  const register = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUpWithPhone(phone);
      if (error) {
        Alert.alert('Registration Failed', error.message);
      } else {
        Alert.alert('Success', 'OTP sent to your phone. Please check your messages.');
        setStep('verify');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  const verify = async () => {
    if (!phone || !otp) {
      Alert.alert('Error', 'Please enter phone and OTP');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await verifyOTP(phone, otp);
      if (error) {
        Alert.alert('Verification Failed', error.message);
      } else if (data.user) {
        // Save the access token
        await saveToken(data.session?.access_token || '');
        Alert.alert('Success', step === 'register' ? 'Account created and logged in!' : 'Logged in successfully!');
        navigation.navigate('MainTabs');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  const login = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signInWithPhone(phone);
      if (error) {
        Alert.alert('Login Failed', error.message);
      } else {
        Alert.alert('Success', 'OTP sent to your phone. Please check your messages.');
        setStep('verify');
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
      if (event === 'SIGNED_IN' && session) {
        navigation.navigate('MainTabs');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Vet Marketplace</Text>
      
      {step === 'login' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Login</Text>
          <TextInput 
            placeholder="Phone Number" 
            value={phone} 
            onChangeText={setPhone} 
            style={styles.input} 
            keyboardType="phone-pad"
          />
          <Button 
            title={loading ? "Logging in..." : "Login"} 
            onPress={login}
            disabled={loading}
          />
          
          <TouchableOpacity onPress={() => setStep('register')} style={styles.switchButton}>
            <Text style={styles.switchText}>Don't have an account? Register</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'register' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Register</Text>
          <TextInput 
            placeholder="Phone Number" 
            value={phone} 
            onChangeText={setPhone} 
            style={styles.input} 
            keyboardType="phone-pad"
          />
          <TextInput 
            placeholder="Email Address" 
            value={email} 
            onChangeText={setEmail} 
            style={styles.input} 
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button 
            title={loading ? "Registering..." : "Register & Send OTP"} 
            onPress={register}
            disabled={loading}
          />
          
          <TouchableOpacity onPress={() => setStep('login')} style={styles.switchButton}>
            <Text style={styles.switchText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 'verify' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verify OTP</Text>
          <Text style={styles.infoText}>Enter the OTP sent to {phone}</Text>
          <TextInput 
            placeholder="Enter OTP" 
            value={otp} 
            onChangeText={setOtp} 
            style={styles.input} 
            keyboardType="number-pad"
          />
          <Button 
            title={loading ? "Verifying..." : "Verify OTP"} 
            onPress={verify}
            disabled={loading}
          />
          
          <TouchableOpacity onPress={() => setStep('register')} style={styles.switchButton}>
            <Text style={styles.switchText}>Didn't receive OTP? Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15, textAlign: 'center', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
  loader: { marginTop: 20 },
  switchButton: { marginTop: 15, alignItems: 'center' },
  switchText: { color: '#007AFF', textDecorationLine: 'underline' },
  infoText: { textAlign: 'center', marginBottom: 15, color: '#666' }
});
