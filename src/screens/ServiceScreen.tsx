import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showAlert } from '../utils/alert';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────

type ServiceRole =
  | 'groomer' | 'trainer' | 'pet_sitter'
  | 'pet_transport' | 'cremation_service' | 'agro_vet_supplier' | 'insurance_provider'
  | 'pet_pharmacy' | 'rescue_center' | 'pet_hotel' | 'farm';

const ROLE_META: Record<ServiceRole, { label: string; emoji: string; color: string; avatarBg: string }> = {
  groomer:            { label: 'Groomer',            emoji: '✂️',  color: '#DB2777', avatarBg: '#FDF2F8' },
  trainer:            { label: 'Pet Trainer',         emoji: '🎓',  color: '#059669', avatarBg: '#ECFDF5' },
  pet_sitter:         { label: 'Pet Sitter',          emoji: '🏠',  color: '#D97706', avatarBg: '#FFFBEB' },
  pet_transport:      { label: 'Pet Transport',       emoji: '🚐',  color: '#0891B2', avatarBg: '#ECFEFF' },
  cremation_service:  { label: 'Cremation Service',   emoji: '🕊️', color: '#64748B', avatarBg: '#F8FAFC' },
  agro_vet_supplier:  { label: 'Agro-Vet Supplier',  emoji: '🌾',  color: '#65A30D', avatarBg: '#F7FEE7' },
  insurance_provider: { label: 'Insurance Provider',  emoji: '🛡️', color: '#7C3AED', avatarBg: '#F5F3FF' },
  pet_pharmacy:       { label: 'Pet Pharmacy',        emoji: '💊',  color: '#0891B2', avatarBg: '#ECFEFF' },
  rescue_center:      { label: 'Rescue Center',       emoji: '🐾',  color: '#EA580C', avatarBg: '#FFF7ED' },
  pet_hotel:          { label: 'Pet Hotel',           emoji: '🏨',  color: '#0D9488', avatarBg: '#F0FDFA' },
  farm:               { label: 'Farm',                emoji: '🐐',  color: '#92400E', avatarBg: '#FEF9E7' },
};

const FILTER_CHIPS: { key: ServiceRole | 'all'; label: string; emoji: string }[] = [
  { key: 'all',               label: 'All Services',  emoji: '🔍' },
  { key: 'groomer',           label: 'Groomers',      emoji: '✂️' },
  { key: 'trainer',           label: 'Trainers',      emoji: '🎓' },
  { key: 'pet_sitter',        label: 'Pet Sitters',   emoji: '🏠' },
  { key: 'pet_transport',     label: 'Transport',     emoji: '🚐' },
  { key: 'cremation_service', label: 'Cremation',     emoji: '🕊️' },
  { key: 'agro_vet_supplier', label: 'Agro-Vet',     emoji: '🌾' },
  { key: 'insurance_provider',label: 'Insurance',     emoji: '🛡️' },
  { key: 'pet_pharmacy',      label: 'Pharmacy',      emoji: '💊' },
  { key: 'rescue_center',     label: 'Rescue',        emoji: '🐾' },
  { key: 'pet_hotel',         label: 'Pet Hotel',     emoji: '🏨' },
  { key: 'farm',              label: 'Farms',         emoji: '🐐' },
];

const SERVICE_ROLES: ServiceRole[] = [
  'groomer', 'trainer', 'pet_sitter',
  'pet_transport', 'cremation_service', 'agro_vet_supplier', 'insurance_provider',
  'pet_pharmacy', 'rescue_center', 'pet_hotel', 'farm',
];

interface ServiceProfessional {
  _id: string;
  name: string;
  businessName?: string;
  role: ServiceRole;
  specialization?: string;
  address: string;
  phone?: string;
  email?: string;
  isVerified: boolean;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  userId?: { name?: string; phone?: string; email?: string };
}

function goToSubscription(navigation: any) {
  try {
    const parent = navigation.getParent();
    if (parent) parent.navigate('SubscriptionScreen');
    else navigation.navigate('SubscriptionScreen');
  } catch { navigation.navigate('SubscriptionScreen'); }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ServiceScreen({ navigation }: any) {
  const [results, setResults]           = useState<ServiceProfessional[]>([]);
  const [loading, setLoading]           = useState(false);
  const [hasLoaded, setHasLoaded]       = useState(false);
  const [roleFilter, setRoleFilter]     = useState<ServiceRole | 'all'>('all');
  const [searchTerm, setSearchTerm]     = useState('');
  const [coords, setCoords]             = useState({ lat: '6.5244', lng: '3.3792' });
  const [locationLoading, setLocationLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subChecked, setSubChecked]     = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Subscription check ────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let active = true;
      apiFetch('/api/subscriptions/me', { method: 'GET' })
        .then((res) => { if (active) setIsSubscribed(res.ok && res.body?.data?.isActive === true); })
        .catch(() => { if (active) setIsSubscribed(false); })
        .finally(() => { if (active) setSubChecked(true); });
      return () => { active = false; };
    }, []),
  );

  // ── Fetch all ─────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (term?: string) => {
    setLoading(true);
    const q = term !== undefined ? term : searchTerm;
    try {
      // Fetch all service roles or a specific one
      const rolesToFetch: (ServiceRole | 'all')[] = roleFilter === 'all' ? ['all'] : [roleFilter];
      const params = new URLSearchParams({
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(q.trim() && { search: q.trim() }),
        limit: '50',
      });
      const res = await apiFetch(`/api/v1/professionals/list?${params}`, { method: 'GET' });
      if (res.ok && res.body?.success) {
        // Filter to only service roles (exclude vet and kennel which have their own screens)
        const all: ServiceProfessional[] = (res.body.data || []).filter((p: any) =>
          SERVICE_ROLES.includes(p.role),
        );
        setResults(all);
      } else {
        showAlert('Error', res.body?.message || 'Failed to load services.');
      }
    } catch {
      showAlert('Network Error', 'Could not connect. Please try again.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  // ── Nearby search ─────────────────────────────────────────────────────────

  const searchNearby = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lng: coords.lng,
        lat: coords.lat,
        distance: '15',
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
      });
      const res = await apiFetch(`/api/v1/professionals/nearby?${params}`, { method: 'GET' });
      if (res.ok && res.body?.success) {
        const filtered: ServiceProfessional[] = (res.body.data || []).filter((p: any) =>
          SERVICE_ROLES.includes(p.role),
        );
        setResults(filtered);
        if (filtered.length === 0)
          showAlert('No Results', 'No service providers found nearby. Try a wider area.');
      } else {
        showAlert('No Results', 'No service providers found nearby.');
      }
    } catch {
      showAlert('Network Error', 'Please try again.');
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  // ── Location ──────────────────────────────────────────────────────────────

  const useMyLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Location access is needed to find nearby services.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({
        lat: loc.coords.latitude.toString(),
        lng: loc.coords.longitude.toString(),
      });
      showAlert('Location Updated', 'Tap "Search Nearby" to find services near you.');
    } catch {
      showAlert('Error', 'Failed to get location.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ── Render card ───────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: ServiceProfessional }) => {
    const meta = ROLE_META[item.role];
    const displayName = item.businessName || item.name;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ServiceProfile', { professionalId: item._id })}
        activeOpacity={0.78}
      >
        <View style={[styles.avatar, { backgroundColor: meta.avatarBg }]}>
          <Text style={styles.avatarEmoji}>{meta.emoji}</Text>
          {item.isVerified && <View style={styles.verifiedDot} />}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={styles.serviceName} numberOfLines={1}>{displayName}</Text>
            {item.isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: `${meta.color}18` }]}>
                <Text style={[styles.verifiedText, { color: meta.color }]}>✓ Verified</Text>
              </View>
            )}
          </View>
          <Text style={[styles.roleLabel, { color: meta.color }]}>{meta.label}</Text>
          {item.specialization ? (
            <Text style={styles.specialization} numberOfLines={1}>{item.specialization}</Text>
          ) : null}
          <View style={styles.cardFooter}>
            <Ionicons name="location-outline" size={13} color="#64748B" />
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          </View>
          {item.distance != null ? (
            <Text style={[styles.distance, { color: meta.color }]}>
              {item.distance.toFixed(1)} km away
            </Text>
          ) : null}
          {(item.rating || 0) > 0 && (
            <Text style={styles.rating}>⭐ {item.rating?.toFixed(1)} ({item.reviewCount})</Text>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

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
            <Ionicons name="search-outline" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              placeholderTextColor="#94A3B8"
              value={searchTerm}
              onChangeText={(v) => {
                setSearchTerm(v);
                if (debounce.current) clearTimeout(debounce.current);
                debounce.current = setTimeout(() => fetchAll(v), 350);
              }}
              returnKeyType="search"
              onSubmitEditing={() => fetchAll(searchTerm)}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchTerm(''); fetchAll(''); }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Role filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {FILTER_CHIPS.map(({ key, label, emoji }) => {
            const active = roleFilter === key;
            const color = key !== 'all' ? ROLE_META[key as ServiceRole]?.color : '#2563EB';
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => setRoleFilter(key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {emoji} {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Action row */}
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
          <TouchableOpacity
            style={styles.nearbyBtn}
            onPress={() => {
              if (!isSubscribed) {
                showAlert(
                  'Premium Feature',
                  'GPS nearby search requires a Premium subscription.',
                  [
                    { text: 'Subscribe', onPress: () => goToSubscription(navigation) },
                    { text: 'Cancel', style: 'cancel' },
                  ],
                );
                return;
              }
              searchNearby();
            }}
          >
            <Ionicons name="search-outline" size={15} color="#fff" />
            <Text style={styles.nearbyBtnText}>Search Nearby</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.allBtn} onPress={() => fetchAll()}>
            <Text style={styles.allBtnText}>Show All</Text>
          </TouchableOpacity>
        </View>

        {/* Teaser banner */}
        {subChecked && !isSubscribed && (
          <View style={styles.teaserBanner}>
            <Ionicons name="lock-closed-outline" size={14} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.teaserText}>Subscribe to view contact details and use GPS search.</Text>
            <TouchableOpacity style={styles.teaserBtn} onPress={() => goToSubscription(navigation)}>
              <Text style={styles.teaserBtnText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Finding services...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              hasLoaded ? (
                <Text style={styles.resultCount}>
                  {results.length} service provider{results.length !== 1 ? 's' : ''} found
                </Text>
              ) : null
            }
            ListEmptyComponent={
              hasLoaded ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>🔍</Text>
                  <Text style={styles.emptyTitle}>No services found</Text>
                  <Text style={styles.emptyText}>Try a different filter or tap "Show All"</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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

  chipScroll: { flexGrow: 0, marginBottom: 10 },
  chipRow:    { paddingHorizontal: 16, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#fff' },

  actionRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
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
  nearbyBtn: {
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
  nearbyBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },
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

  teaserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  teaserText:    { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 16 },
  teaserBtn:     { backgroundColor: '#2563EB', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  teaserBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  loadingBox:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 15 },

  list:        { paddingHorizontal: 16, paddingBottom: 30 },
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarEmoji: { fontSize: 26 },
  verifiedDot: {
    position: 'absolute',
    bottom: 2, right: 2,
    width: 12, height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2, borderColor: '#fff',
  },
  cardBody:   { flex: 1, marginRight: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  serviceName: { fontSize: 15, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  verifiedBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  verifiedText:  { fontSize: 10, fontWeight: '700' },
  roleLabel:     { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  specialization:{ fontSize: 12, color: '#64748B', marginBottom: 4 },
  cardFooter:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  address:       { fontSize: 12, color: '#64748B', flex: 1 },
  distance:      { fontSize: 12, fontWeight: '600', marginTop: 3 },
  rating:        { fontSize: 12, color: '#64748B', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptyText:  { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
