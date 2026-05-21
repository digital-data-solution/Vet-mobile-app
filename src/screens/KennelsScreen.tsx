import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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

interface Kennel {
  _id: string;
  name: string;
  businessName?: string;
  address: string;
  phone?: string;
  email?: string;
  specialization?: string;
  distance?: number;
  isVerified?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

// Always escape the tab navigator and push SubscriptionScreen on the root
// stack. navigation.replace() is a stack method — calling it on a tab
// screen's navigation object does nothing or crashes. getParent() bubbles
// up to the root Stack.Navigator where SubscriptionScreen is registered.
function goToSubscription(navigation: any) {
  try {
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('SubscriptionScreen');
    } else {
      navigation.navigate('SubscriptionScreen');
    }
  } catch {
    navigation.navigate('SubscriptionScreen');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function KennelsScreen({ navigation }: any) {
  const [kennels, setKennels] = useState<Kennel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [coords, setCoords] = useState({ lat: '6.5244', lng: '3.3792' });

  // ─── Subscription gate ──────────────────────────────────────────────────────

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const checkSub = async () => {
        try {
          const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
          if (!isActive) return;
          if (!res.ok || !res.body?.data?.isActive) {
            Alert.alert(
              'Subscription Required',
              'You need an active subscription to access kennels.',
              [
                { text: 'Not Now', style: 'cancel' },
                // FIX: was navigation.replace('SubscriptionScreen') —
                // replace() is a stack method, not valid on a tab screen.
                // goToSubscription() uses getParent() to reach the root stack.
                { text: 'Subscribe', onPress: () => goToSubscription(navigation) },
              ],
            );
          }
        } catch {
          if (!isActive) return;
          Alert.alert('Error', 'Could not verify subscription. Please try again.');
        }
      };
      checkSub();
      return () => { isActive = false; };
    }, [navigation]),
  );

  useEffect(() => {
    fetchKennels();
  }, []);

  const fetchKennels = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/kennels/list?limit=50', { method: 'GET' });
      if (res.ok && res.body?.success) {
        setKennels(res.body.data || []);
      } else {
        setKennels(fallbackData);
      }
    } catch {
      setKennels(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const searchNearby = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lng: coords.lng,
        lat: coords.lat,
        distance: '15',
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
      });
      const res = await apiFetch(`/api/v1/kennels/nearby?${params}`, { method: 'GET' });
      if (res.ok && res.body?.success) {
        setKennels(res.body.data || []);
        if ((res.body.data || []).length === 0) {
          Alert.alert('No Results', 'No kennels found nearby. Try a wider search area.');
        }
      } else {
        Alert.alert('No Results', 'No kennels found nearby. Try a wider search area.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is needed to find nearby kennels.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: loc.coords.latitude.toString(),
        lng: loc.coords.longitude.toString(),
      });
      Alert.alert('Location Updated', 'Tap "Search Nearby" to find kennels near you.');
    } catch {
      Alert.alert('Error', 'Failed to get location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const filtered = kennels.filter(
    (k) =>
      !searchTerm.trim() ||
      [k.name, k.businessName, k.address, k.specialization]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const renderKennel = ({ item }: { item: Kennel }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('KennelProfile', { kennel: item, kennelId: item._id })}
      activeOpacity={0.78}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🐕</Text>
        </View>
        {item.isVerified && <View style={styles.verifiedDot} />}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.kennelName} numberOfLines={1}>
            {item.businessName || item.name}
          </Text>
          {item.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
        </View>
        {item.specialization ? (
          <Text style={styles.specialization} numberOfLines={1}>
            {item.specialization}
          </Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Ionicons name="location-outline" size={13} color="#64748B" />
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
        </View>
        {item.distance != null ? (
          <Text style={styles.distance}>{item.distance.toFixed(1)} km away</Text>
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
        {/* Search bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#94A3B8"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search kennels..."
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

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={useMyLocation}
            disabled={locationLoading}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <>
                <Ionicons name="navigate-outline" size={15} color="#2563EB" />
                <Text style={styles.locationBtnText}>My Location</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchNearbyBtn} onPress={searchNearby}>
            <Ionicons name="search-outline" size={15} color="#fff" />
            <Text style={styles.searchNearbyText}>Search Nearby</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.allBtn} onPress={fetchKennels}>
            <Text style={styles.allBtnText}>Show All</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Finding kennels...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            renderItem={renderKennel}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <Text style={styles.resultCount}>
                {filtered.length} kennel{filtered.length !== 1 ? 's' : ''} found
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🐕</Text>
                <Text style={styles.emptyTitle}>No kennels found</Text>
                <Text style={styles.emptyText}>
                  Try a different location or tap "Show All"
                </Text>
              </View>
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const fallbackData: Kennel[] = [
  {
    _id: '1',
    name: 'Happy Paws Kennel',
    address: 'Ikeja, Lagos',
    specialization: 'Boarding, Grooming',
    isVerified: true,
  },
  {
    _id: '2',
    name: 'Safe Haven Kennel',
    address: 'Lekki Phase 1, Lagos',
    specialization: 'Training, Boarding',
    isVerified: false,
  },
  {
    _id: '3',
    name: 'Royal Pet Lodge',
    address: 'Victoria Island, Lagos',
    specialization: 'Luxury Boarding, Day Care',
    isVerified: true,
  },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  searchRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
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
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  locationBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  searchNearbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 5,
    flex: 1,
    justifyContent: 'center',
  },
  searchNearbyText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  allBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  allBtnText: { fontSize: 13, color: '#475569', fontWeight: '600' },
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
  cardLeft: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: { fontSize: 26 },
  verifiedDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardBody: { flex: 1, marginRight: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  kennelName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedText: { fontSize: 10, color: '#065F46', fontWeight: '700' },
  specialization: { fontSize: 12, color: '#7C3AED', fontWeight: '500', marginBottom: 5 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  address: { fontSize: 12, color: '#64748B', flex: 1 },
  distance: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 3 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});