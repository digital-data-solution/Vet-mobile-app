import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../api/client';

export default function ShopsScreen({ navigation }: any) {
  const [lng, setLng] = useState('3.3792');
  const [lat, setLat] = useState('6.5244');
  const [distance, setDistance] = useState('5');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchAllShops();
  }, []);

  const fetchAllShops = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/shops', { method: 'GET' });
      if (res.ok) {
        setResults(res.body?.data || []);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to fetch shops');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to find nearby shops');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude.toString());
      setLng(location.coords.longitude.toString());
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
    setLocationLoading(false);
  };

  const nearby = async () => {
    setLoading(true);
    try {
      const url = `/api/v1/shops/nearby?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}&distance=${encodeURIComponent(distance)}`;
      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        setResults(res.body?.data || []);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to fetch shops');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  // Fix: Add selectShop handler
  const selectShop = (shop: any) => {
    if (navigation && navigation.navigate) {
      navigation.navigate('ShopProfileScreen', { shop });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Find Pet Shops Near You</Text>
        
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Your Location</Text>
          <View style={styles.coordsContainer}>
            <TextInput 
              value={lng} 
              onChangeText={setLng} 
              style={styles.coordInput} 
              placeholder="Longitude" 
              keyboardType="numeric"
            />
            <TextInput 
              value={lat} 
              onChangeText={setLat} 
              style={styles.coordInput} 
              placeholder="Latitude" 
              keyboardType="numeric"
            />
          </View>
          <Button 
            title={locationLoading ? "Getting Location..." : "Use Current Location"} 
            onPress={getCurrentLocation}
            disabled={locationLoading}
          />
        </View>

        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Search Settings</Text>
          <TextInput 
            value={distance} 
            onChangeText={setDistance} 
            style={styles.input} 
            placeholder="Distance (km)" 
            keyboardType="numeric"
          />
          <Button
            title="Show All Shops"
            onPress={fetchAllShops}
            disabled={loading}
          />
          <Button
            title={loading ? "Searching..." : "Show Nearby Shops"}
            onPress={nearby}
            disabled={loading}
          />
        </View>

        {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
        
        <FlatList 
          data={results} 
          keyExtractor={(i: any) => i._id || String(Math.random())} 
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => selectShop(item)}>
              <Text style={styles.itemName}>{item.shopName || item.businessName || item.ownerName}</Text>
              <Text style={styles.itemDetail}>{item.address?.city || item.address?.town || item.address || ''}</Text>
              <Text style={styles.itemDetail}>Distance: {item.distance ? `${item.distance.toFixed(2)} km` : ''}</Text>
            </TouchableOpacity>
          )} 
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No shops found nearby</Text> : null}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  locationSection: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 },
  searchSection: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#333' },
  coordsContainer: { flexDirection: 'row', marginBottom: 12 },
  coordInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 8, marginRight: 8, borderRadius: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 12, borderRadius: 4, backgroundColor: '#fff' },
  loader: { marginVertical: 20 },
  item: { backgroundColor: '#fff', padding: 16, marginBottom: 8, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#333' },
  itemDetail: { fontSize: 14, color: '#666', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: 20 }
});
