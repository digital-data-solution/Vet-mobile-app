import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { apiFetch } from '../api/client';

export default function VetVerificationScreen() {
  const [vcn, setVcn] = useState('');
  const [documents, setDocuments] = useState('');

  const submit = async () => {
    const res = await apiFetch('/api/v1/vet-verification/submit', { method: 'POST', body: JSON.stringify({ vcn, documents }) });
    Alert.alert('Submit VCN', JSON.stringify(res.body));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vet Verification</Text>
      <TextInput value={vcn} onChangeText={setVcn} style={styles.input} placeholder="VCN" />
      <TextInput value={documents} onChangeText={setDocuments} style={styles.input} placeholder="Documents (links)" />
      <Button title="Submit VCN" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 18, marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8 } });
