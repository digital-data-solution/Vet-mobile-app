import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../api/client';

interface Professional {
  _id: string;
  userId?: { name?: string; phone?: string; email?: string };
  name: string;
  businessName?: string;
  role: 'vet' | 'kennel';
  vcnNumber?: string;
  specialization?: string;
  address: string;
  phone?: string;
  email?: string;
  distance?: number;
  location?: { type: string; coordinates: number[] };
  isVerified: boolean;
  rating?: number;
  reviewCount?: number;
}

interface Props {
  navigation: any;
}

export default function ProfessionalsScreen({ navigation }: Props) {
  const [coords, setCoords] = useState({ lat: '6.5244', lng: '3.3792' }); // Default: Lagos
  const [distance, setDistance] = useState('10');
  const [searchTerm, setSearchTerm] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'vet' | 'kennel'>('vet');
  const [results, setResults] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchAllProfessionals();
  }, [roleFilter]);

  // Fetch all verified professionals
  const fetchAllProfessionals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(roleFilter !== 'all' && { role: roleFilter }),
        limit: '50',
      });

      const res = await apiFetch(`/api/v1/professionals/list?${params}`, { method: 'GET' });
      
      if (res.ok && res.body?.success) {
        setResults(res.body.data || []);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to fetch professionals');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
    setHasSearched(true);
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to find nearby professionals.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({
        lat: location.coords.latitude.toString(),
        lng: location.coords.longitude.toString(),
      });
      Alert.alert('Location Updated', 'Now showing results near your current location.');
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const geocodeAddress = async () => {
    if (!addressInput.trim()) {
      Alert.alert('Error', 'Please enter an address first.');
      return;
    }
    setLocationLoading(true);
    try {
      const results = await Location.geocodeAsync(addressInput.trim());
      if (results.length > 0) {
        setCoords({
          lat: results[0].latitude.toString(),
          lng: results[0].longitude.toString(),
        });
        Alert.alert('Location Set', `Location updated to: ${addressInput}`);
      } else {
        Alert.alert('Not Found', 'Could not find coordinates for that address. Try a more specific address.');
      }
    } catch (error) {
      console.error('Geocode error:', error);
      Alert.alert('Error', 'Failed to look up that address.');
    } finally {
      setLocationLoading(false);
    }
  };

  const searchNearby = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lng: coords.lng,
        lat: coords.lat,
        distance,
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
      });

      const res = await apiFetch(`/api/v1/professionals/nearby?${params}`, { method: 'GET' });
      
      if (res.ok && res.body?.success) {
        setResults(res.body.data || []);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to fetch professionals');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  const renderProfessional = ({ item }: { item: Professional }) => {
    const isVet = item.role === 'vet';
    const displayName = item.businessName || item.name || item.userId?.name || 'Unknown';
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('VetProfileScreen', { vet: item })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, !isVet && styles.avatarCircleKennel]}>
            <Text style={styles.avatarEmoji}>{isVet ? '👨‍⚕️' : '🐕'}</Text>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.vetName}>{displayName}</Text>
            {item.specialization ? (
              <Text style={styles.specialization}>{item.specialization}</Text>
            ) : null}
            {!isVet && item.name !== displayName ? (
              <Text style={styles.ownerName}>Owner: {item.name}</Text>
            ) : null}
          </View>
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ {isVet ? 'VCN' : 'Verified'}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardDetails}>
          {item.address ? <DetailRow icon="📍" value={item.address} /> : null}
          {item.phone || item.userId?.phone ? (
            <DetailRow icon="📞" value={item.phone || item.userId?.phone || ''} />
          ) : null}
          {item.email || item.userId?.email ? (
            <DetailRow icon="✉️" value={item.email || item.userId?.email || ''} />
          ) : null}
          {item.distance != null ? (
            <DetailRow icon="📏" value={`${item.distance.toFixed(1)} km away`} highlight />
          ) : null}
          {item.rating && item.reviewCount ? (
            <DetailRow icon="⭐" value={`${item.rating.toFixed(1)} (${item.reviewCount} reviews)`} />
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const professionals = results.filter((item) => {
    if (roleFilter === 'all') return true;
    return item.role === roleFilter;
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
            placeholder="Search by name, specialization..."
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={searchNearby}
          />
        </View>

        {/* Role filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Show:</Text>
          {(['vet', 'kennel', 'all'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.filterChip, roleFilter === r && styles.filterChipActive]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[styles.filterChipText, roleFilter === r && styles.filterChipTextActive]}>
                {r === 'vet' ? '👨‍⚕️ Vets' : r === 'kennel' ? '🐕 Kennels' : '🔍 All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Location section */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Your Location</Text>
          <TextInput
            value={addressInput}
            onChangeText={setAddressInput}
            style={styles.locationInput}
            placeholder="e.g. Ikeja, Lagos"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={geocodeAddress}
          />
          <View style={styles.locationButtons}>
            <TouchableOpacity
              style={[styles.locationBtn, styles.locationBtnSecondary]}
              onPress={geocodeAddress}
              disabled={locationLoading}
            >
              <Text style={styles.locationBtnSecondaryText}>Use Address</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locationBtn, styles.locationBtnPrimary]}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.locationBtnPrimaryText}>📡 Use My Location</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Distance selector */}
          <View style={styles.distanceRow}>
            <Text style={styles.distanceLabel}>Search radius:</Text>
            {['5', '10', '25', '50'].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.distanceChip, distance === d && styles.distanceChipActive]}
                onPress={() => setDistance(d)}
              >
                <Text style={[styles.distanceChipText, distance === d && styles.distanceChipTextActive]}>
                  {d} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={fetchAllProfessionals}
            disabled={loading}
          >
            <Text style={styles.actionBtnOutlineText}>Show All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnFill]}
            onPress={searchNearby}
            disabled={loading}
          >
            <Text style={styles.actionBtnFillText}>Search Nearby</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Finding professionals...</Text>
          </View>
        ) : (
          <FlatList
            data={professionals}
            keyExtractor={(item) => item._id}
            renderItem={renderProfessional}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              hasSearched ? (
                <Text style={styles.resultCount}>
                  {professionals.length} professional{professionals.length !== 1 ? 's' : ''} found
                </Text>
              ) : null
            }
            ListEmptyComponent={
              hasSearched ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text style={styles.emptyTitle}>No professionals found</Text>
                  <Text style={styles.emptySubtitle}>
                    Try expanding your search radius or searching in a different area.
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function DetailRow({ icon, value, highlight = false }: { icon: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  filterLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600', marginRight: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  filterChipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  filterChipTextActive: { color: '#2563EB', fontWeight: '700' },
  locationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  locationTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },
  locationInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  locationButtons: { flexDirection: 'row', gap: 8, marginTop: 10 },
  locationBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  locationBtnPrimary: { backgroundColor: '#2563EB' },
  locationBtnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  locationBtnSecondary: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  locationBtnSecondaryText: { color: '#374151', fontWeight: '600', fontSize: 13 },
  distanceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  distanceLabel: { fontSize: 13, color: '#6B7280', marginRight: 4 },
  distanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  distanceChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  distanceChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  distanceChipTextActive: { color: '#2563EB', fontWeight: '700' },
  actionRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  actionBtnOutline: { borderWidth: 1.5, borderColor: '#2563EB' },
  actionBtnOutlineText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
  actionBtnFill: { backgroundColor: '#2563EB' },
  actionBtnFillText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  resultCount: { fontSize: 13, color: '#6B7280', marginBottom: 10, fontWeight: '500' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarCircleKennel: { backgroundColor: '#FEF3C7' },
  avatarEmoji: { fontSize: 22 },
  cardMeta: { flex: 1 },
  vetName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  specialization: { fontSize: 13, color: '#2563EB', fontWeight: '500' },
  ownerName: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: { fontSize: 11, color: '#065F46', fontWeight: '700' },
  cardDetails: { gap: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailIcon: { fontSize: 13, marginRight: 6, width: 18 },
  detailValue: { fontSize: 13, color: '#6B7280', flex: 1 },
  detailValueHighlight: { color: '#2563EB', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});