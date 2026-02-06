import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { apiFetch } from '../api/client';

export default function SubscriptionScreen() {
  const [plan, setPlan] = useState('premium');

  const create = async () => {
    const res = await apiFetch('/api/subscription/create', { method: 'POST', body: JSON.stringify({ plan }) });
    Alert.alert('Create subscription', JSON.stringify(res.body));
  };

  const me = async () => {
    const res = await apiFetch('/api/subscription/me', { method: 'GET' });
    Alert.alert('My subscription', JSON.stringify(res.body));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscription</Text>
      <TextInput value={plan} onChangeText={setPlan} style={styles.input} />
      <Button title="Create" onPress={create} />
      <View style={{ height: 8 }} />
      <Button title="My subscription" onPress={me} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 18, marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8 } });
