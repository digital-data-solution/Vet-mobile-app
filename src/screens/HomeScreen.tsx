import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet } from 'react-native';
import { saveToken } from '../api/client';

export default function HomeScreen({ navigation }: any) {
  const [base, setBase] = useState('http://192.168.0.206:5000');

  const saveBase = async () => {
    await saveToken('');
    // store base url in AsyncStorage via API client
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('xp_base_url', base);
    navigation.navigate('Auth');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xpress Vet Marketplace</Text>
      <Text style={styles.label}>Set backend base URL (eg. http://your-pc-ip:5000)</Text>
      <TextInput value={base} onChangeText={setBase} style={styles.input} />
      <Button title="Save & Continue" onPress={saveBase} />
      <View style={{ height: 12 }} />
      <Button title="Professionals" onPress={() => navigation.navigate('Professionals')} />
      <View style={{ height: 12 }} />
      <Button title="Shops" onPress={() => navigation.navigate('Shops')} />
      <View style={{ height: 12 }} />
      <Button title="Subscription" onPress={() => navigation.navigate('Subscription')} />
      <View style={{ height: 12 }} />
      <Button title="Vet Verification" onPress={() => navigation.navigate('VetVerification')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  label: { color: '#666', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 12 },
});
