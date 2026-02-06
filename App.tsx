import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Button,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

export default function App() {
  const [baseUrl, setBaseUrl] = useState('http://10.0.2.2:5000');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Try a quick auto-check (will likely fail on device unless URL is reachable)
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/health`);
      const text = await res.text();
      setStatus(`${res.status} ${res.statusText}: ${text}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const openQuickTest = () => {
    Alert.alert('Quick test', 'Press "Ping backend" to check the health endpoint.');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Xpress Vet Marketplace</Text>
        <Text style={styles.label}>Backend base URL</Text>
        <TextInput
          value={baseUrl}
          onChangeText={setBaseUrl}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://<your-pc-ip>:5000"
        />

        <View style={styles.row}>
          <Button title="Ping backend" onPress={checkHealth} />
          <View style={styles.spacer} />
          <Button title="Help" onPress={openQuickTest} />
        </View>

        <View style={styles.result}>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.resultText}>{status ?? 'No result yet'}</Text>
          )}
        </View>
      </View>
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 540,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: { width: 12 },
  result: {
    marginTop: 16,
  },
  resultText: {
    color: '#2d3748',
  },
});
