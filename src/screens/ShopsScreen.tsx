import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert } from 'react-native';
import { apiFetch } from '../api/client';

export default function ShopsScreen() {
  const [lng, setLng] = useState('3.3792');
  const [lat, setLat] = useState('6.5244');
  const [distance, setDistance] = useState('5');
  const [results, setResults] = useState<any[]>([]);

  const nearby = async () => {
    const url = `/api/v1/shops/nearby?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}&distance=${encodeURIComponent(distance)}`;
    const res = await apiFetch(url, { method: 'GET' });
    if (res.ok) setResults(res.body || []);
    else Alert.alert('Error', JSON.stringify(res.body));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shops (nearby)</Text>
      <TextInput value={lng} onChangeText={setLng} style={styles.input} placeholder="Longitude" />
      <TextInput value={lat} onChangeText={setLat} style={styles.input} placeholder="Latitude" />
      <TextInput value={distance} onChangeText={setDistance} style={styles.input} placeholder="Distance (km)" />
      <Button title="Find Nearby" onPress={nearby} />
      <FlatList data={results} keyExtractor={(i: any) => i._id || String(Math.random())} renderItem={({ item }) => (
        <View style={styles.item}><Text style={{ fontWeight: '600' }}>{item.name || item.title}</Text><Text>{item.address || ''}</Text></View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 18, marginBottom: 8 }, input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginBottom: 8 }, item: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#eee' } });
