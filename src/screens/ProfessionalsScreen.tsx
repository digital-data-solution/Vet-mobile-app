import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert, ActivityIndicator, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../api/client';

export default function ProfessionalsScreen({ navigation }: any) {
  const [lng, setLng] = useState('3.3792');
  const [lat, setLat] = useState('6.5244');
  const [distance, setDistance] = useState('5');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAllProfessionals();
  }, []);

  const fetchAllProfessionals = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/professional', { method: 'GET' });
      if (res.ok) {
        setResults(res.body?.data || []);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to fetch professionals');
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
        Alert.alert('Permission denied', 'Location permission is required to find nearby professionals');
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
      const url = `/api/v1/professionals/nearby?lng=${encodeURIComponent(lng)}&lat=${encodeURIComponent(lat)}&distance=${encodeURIComponent(distance)}&search=${encodeURIComponent(searchTerm)}`;
      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        setResults(res.body?.data || []);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to fetch professionals');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  // Helper to geocode address to lat/lng
  const geocodeAddress = async () => {
    setLocationLoading(true);
    try {
      if (!address) {
        Alert.alert('Error', 'Please enter a local address');
        setLocationLoading(false);
        return;
      }
      const res = await Location.geocodeAsync(address);
      if (res && res.length > 0) {
        setLat(res[0].latitude.toString());
        setLng(res[0].longitude.toString());
      } else {
        Alert.alert('Error', 'Could not find location for address');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to geocode address');
    }
    setLocationLoading(false);
  };

  // Select vet handler
  const selectVet = (vet: any) => {
    // Navigate to vet profile or booking screen
    if (navigation && navigation.navigate) {
      navigation.navigate('VetProfileScreen', { vet });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Find Veterinarians Near You</Text>
      
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Your Location</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            placeholder="Enter Local Address (e.g. Ikeja, Lagos)"
          />
          <Button
            title={locationLoading ? "Finding Address..." : "Use Address"}
            onPress={geocodeAddress}
            disabled={locationLoading}
          />
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

        {/* Remove manual coordinate inputs */}
        {/* Show only search and list */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Find Veterinarians Near You</Text>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.input}
            placeholder="Search by name, specialization, city, etc."
          />
          <Button
            title="Show All Vets"
            onPress={fetchAllProfessionals}
            disabled={loading}
          />
          <Button
            title={loading ? "Searching..." : "Show Nearby Vets"}
            onPress={nearby}
            disabled={loading}
          />
        </View>

        {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
        
        <FlatList
          data={results.filter((item) => item.role === 'vet')}
          keyExtractor={(i: any) => i._id || String(Math.random())}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => selectVet(item)}>
              <Text style={styles.itemName}>{item.name || item.fullName || item.businessName || item.phone}</Text>
              <Text style={styles.itemDetail}>VCN Number: {item.vcnNumber || 'N/A'}</Text>
              <Text style={styles.itemDetail}>Specialization: {item.specialization || item.vetDetails?.specialization || ''}</Text>
              <Text style={styles.itemDetail}>Business Name: {item.businessName || ''}</Text>
              <Text style={styles.itemDetail}>Address: {item.address?.city || item.address?.town || item.address || ''}</Text>
              <Text style={styles.itemDetail}>Phone: {item.phone || ''}</Text>
              <Text style={styles.itemDetail}>Email: {item.email || ''}</Text>
              <Text style={styles.itemDetail}>Distance: {item.distance ? `${item.distance.toFixed(2)} km` : ''}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No veterinarians found nearby</Text> : null}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ 
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#222' },
  locationSection: { backgroundColor: '#fff', padding: 18, borderRadius: 10, marginBottom: 18, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  searchSection: { backgroundColor: '#fff', padding: 18, borderRadius: 10, marginBottom: 18, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 14, color: '#333' },
  coordsContainer: { flexDirection: 'row', marginBottom: 14 },
  coordInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', padding: 10, marginRight: 10, borderRadius: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 14, marginBottom: 14, borderRadius: 6, backgroundColor: '#fff', fontSize: 16 },
  loader: { marginVertical: 22 },
  item: { backgroundColor: '#fff', padding: 20, marginBottom: 10, borderRadius: 10, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  itemName: { fontSize: 18, fontWeight: '600', color: '#333' },
  itemDetail: { fontSize: 16, color: '#666', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#666', fontStyle: 'italic', marginTop: 24, fontSize: 16 }
});
