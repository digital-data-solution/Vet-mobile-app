import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { apiFetch, saveToken } from '../api/client';

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');

  const register = async () => {
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ phone, email }) });
    Alert.alert('Register', JSON.stringify(res.body));
  };

  const verify = async () => {
    const res = await apiFetch('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) });
    Alert.alert('Verify OTP', JSON.stringify(res.body));
  };

  const login = async () => {
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ phone }) });
    if (res.ok && res.body && res.body.token) {
      await saveToken(res.body.token);
      Alert.alert('Logged in', 'Token saved');
    } else {
      Alert.alert('Login failed', JSON.stringify(res.body));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth</Text>
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput placeholder="Email (optional)" value={email} onChangeText={setEmail} style={styles.input} />
      <Button title="Register (send OTP)" onPress={register} />
      <View style={{ height: 8 }} />
      <TextInput placeholder="OTP" value={otp} onChangeText={setOtp} style={styles.input} />
      <Button title="Verify OTP" onPress={verify} />
      <View style={{ height: 8 }} />
      <Button title="Login (request JWT)" onPress={login} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 18, marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8 } });
