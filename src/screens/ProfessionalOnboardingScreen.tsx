import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { apiFetch } from '../api/client';

export default function ProfessionalOnboardingScreen({ navigation, route }: any) {
  // Use route.params.role if provided
  const roleParam = route?.params?.role || 'vet';
  const [role, setRole] = useState(roleParam); // 'vet' or 'kennel'
  const [name, setName] = useState('');
  const [vcnNumber, setVcnNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [loading, setLoading] = useState(false);

  const registerVet = async () => {
    setLoading(true);
    try {
      const payload = {
        name,
        vcnNumber,
        role,
        businessName,
        address,
        specialization,
      };
      const res = await apiFetch('/api/v1/professional/onboard', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        Alert.alert('Success', 'Veterinarian registered successfully');
        navigation.navigate('MainTabs');
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to register vet');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  const registerKennel = async () => {
    setLoading(true);
    try {
      const payload = {
        businessName,
        address,
        specialization,
        role: 'kennel',
      };
      const res = await apiFetch('/api/v1/professional/onboard', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        Alert.alert('Success', 'Kennel registered successfully');
        navigation.navigate('MainTabs');
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to register kennel');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{role === 'vet' ? 'Register as Veterinarian' : 'Register Your Kennel'}</Text>
        {role === 'vet' ? (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Full Name"
            />
            <TextInput
              value={vcnNumber}
              onChangeText={setVcnNumber}
              style={styles.input}
              placeholder="VCN Number"
            />
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              style={styles.input}
              placeholder="Business Name (optional)"
            />
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholder="Address (e.g. Ikeja, Lagos)"
            />
            <TextInput
              value={specialization}
              onChangeText={setSpecialization}
              style={styles.input}
              placeholder="Specialization"
            />
            <Button
              title={loading ? 'Registering...' : 'Register as Vet'}
              onPress={registerVet}
              disabled={loading}
            />
          </>
        ) : (
          <>
            <TextInput
              value={businessName}
              onChangeText={setBusinessName}
              style={styles.input}
              placeholder="Kennel Name"
            />
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={styles.input}
              placeholder="Address (e.g. Ikeja, Lagos)"
            />
            <TextInput
              value={specialization}
              onChangeText={setSpecialization}
              style={styles.input}
              placeholder="Services"
            />
            <Button
              title={loading ? 'Registering...' : 'Register Kennel'}
              onPress={registerKennel}
              disabled={loading}
            />
          </>
        )}
        {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
  loader: { marginTop: 20 },
});
