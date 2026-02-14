import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { apiFetch } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

interface Shop {
  _id: string;
  name?: string;
  shopName?: string;
  businessName?: string;
  ownerName?: string;
  address?: string | { city?: string; town?: string; full?: string };
  phone?: string;
  email?: string;
  description?: string;
  distance?: number;
  services?: string[];
}

interface Props {
  navigation: any;
}

export default function ShopsScreen({ navigation }: Props) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [coords, setCoords] = useState({ lat: '6.5244', lng: '3.3792' });
  const [distance, setDistance] = useState('10');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    fetchAllShops();
  }, []);

  const fetchAllShops = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/shops?limit=50', { method: 'GET' });
      if (res.ok && (res.body?.success || Array.isArray(res.body?.data) || Array.isArray(res.body))) {
        const data = res.body?.data ?? res.body ?? [];
        setShops(Array.isArray(data) ? data : []);
      } else {
        setShops([]);
      }
    } catch {
      setShops([]);
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  const useMyLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access needed to find nearby shops.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: loc.coords.latitude.toString(), lng: loc.coords.longitude.toString() });
      Alert.alert('Location Set', 'Tap "Search Nearby" to find shops near you.');
    } catch {
      Alert.alert('Error', 'Failed to get location.');
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
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
      });
      const res = await apiFetch(`/api/v1/shops/nearby?${params}`, { method: 'GET' });
      if (res.ok) {
        const data = res.body?.data ?? res.body ?? [];
        setShops(Array.isArray(data) ? data : []);
      } else {
        Alert.alert('Error', 'Could not find shops nearby.');
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection.');
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  const getDisplayName = (shop: Shop) =>
    shop.shopName ?? shop.businessName ?? shop.name ?? 'Pet Shop';

  const getAddress = (shop: Shop): string => {
    if (typeof shop.address === 'string') return shop.address;
    return shop.address?.full ?? shop.address?.city ?? shop.address?.town ?? '';
  };

  const filtered = shops.filter(s =>
    !searchTerm.trim() ||
    (getDisplayName(s) + getAddress(s) + (s.description ?? ''))
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const renderShop = ({ item }: { item: Shop }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ShopProfileScreen', { shop: item })}
      activeOpacity={0.78}
    >
      <View style={styles.avatarWrap}>
        <Text style={styles.avatarEmoji}>🛒</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.shopName} numberOfLines={1}>{getDisplayName(item)}</Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
        ) : null}
        {getAddress(item) ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={12} color="#64748B" />
            <Text style={styles.addressText} numberOfLines={1}>{getAddress(item)}</Text>
          </View>
        ) : null}
        {item.distance != null ? (
          <Text style={styles.distanceText}>{item.distance.toFixed(1)} km away</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={styles.root}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pet shops..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={setSearchTerm}
              returnKeyType="search"
              onSubmitEditing={searchNearby}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Location & actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={useMyLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#EA580C" />
            ) : (
              <>
                <Ionicons name="navigate-outline" size={14} color="#EA580C" />
                <Text style={styles.locationBtnText}>My Location</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Distance chips */}
          {(['5', '10', '25'].map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.distanceChip, distance === d && styles.distanceChipActive]}
              onPress={() => setDistance(d)}
            >
              <Text style={[styles.distanceChipText, distance === d && styles.distanceChipTextActive]}>
                {d}km
              </Text>
            </TouchableOpacity>
          )))}

          <TouchableOpacity style={styles.searchNearbyBtn} onPress={searchNearby}>
            <Text style={styles.searchNearbyText}>Nearby</Text>
          </TouchableOpacity>
        </View>

        {/* All shops button */}
        <TouchableOpacity style={styles.allShopsBtn} onPress={fetchAllShops} disabled={loading}>
          <Text style={styles.allShopsBtnText}>Show All Pet Shops</Text>
        </TouchableOpacity>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#EA580C" />
            <Text style={styles.loadingText}>Finding shops...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            renderItem={renderShop}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              hasSearched ? (
                <Text style={styles.resultCount}>
                  {filtered.length} shop{filtered.length !== 1 ? 's' : ''} found
                </Text>
              ) : null
            }
            ListEmptyComponent={
              hasSearched ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🛒</Text>
                  <Text style={styles.emptyTitle}>No shops found</Text>
                  <Text style={styles.emptyText}>
                    Try expanding your search area or browse all shops.
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  searchContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#0F172A' },

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  locationBtnText: { fontSize: 12, color: '#EA580C', fontWeight: '600' },
  distanceChip: {
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  distanceChipActive: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  distanceChipText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  distanceChipTextActive: { color: '#EA580C', fontWeight: '700' },
  searchNearbyBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#EA580C',
    borderRadius: 10,
    paddingVertical: 9,
  },
  searchNearbyText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  allShopsBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  allShopsBtnText: { fontSize: 13, color: '#475569', fontWeight: '600' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 15 },

  list: { paddingHorizontal: 16, paddingBottom: 30 },
  resultCount: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  avatarEmoji: { fontSize: 24 },
  cardBody: { flex: 1, marginRight: 4 },
  shopName: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  description: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addressText: { fontSize: 12, color: '#64748B', flex: 1 },
  distanceText: { fontSize: 12, color: '#EA580C', fontWeight: '600', marginTop: 3 },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});