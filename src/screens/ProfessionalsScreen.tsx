import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { showAlert } from '../utils/alert';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ProfRole =
  | 'vet' | 'kennel' | 'groomer' | 'trainer' | 'pet_sitter'
  | 'pet_transport' | 'cremation_service' | 'agro_vet_supplier' | 'insurance_provider'
  | 'pet_pharmacy' | 'rescue_center' | 'pet_hotel' | 'farm';

const ROLE_META: Record<ProfRole, { label: string; emoji: string; color: string; avatarBg: string }> = {
  vet:               { label: 'Veterinarian',       emoji: '👨‍⚕️', color: '#2563EB', avatarBg: '#EFF6FF' },
  kennel:            { label: 'Kennel',              emoji: '🐕',   color: '#7C3AED', avatarBg: '#F5F3FF' },
  groomer:           { label: 'Groomer',             emoji: '✂️',   color: '#DB2777', avatarBg: '#FDF2F8' },
  trainer:           { label: 'Trainer',             emoji: '🎓',   color: '#059669', avatarBg: '#ECFDF5' },
  pet_sitter:        { label: 'Pet Sitter',          emoji: '🏠',   color: '#D97706', avatarBg: '#FFFBEB' },
  pet_transport:     { label: 'Pet Transport',       emoji: '🚐',   color: '#0891B2', avatarBg: '#ECFEFF' },
  cremation_service: { label: 'Cremation Service',   emoji: '🕊️',  color: '#64748B', avatarBg: '#F8FAFC' },
  agro_vet_supplier: { label: 'Agro-Vet Supplier',  emoji: '🌾',   color: '#65A30D', avatarBg: '#F7FEE7' },
  insurance_provider:{ label: 'Insurance Provider', emoji: '🛡️',  color: '#7C3AED', avatarBg: '#F5F3FF' },
  pet_pharmacy:      { label: 'Pet Pharmacy',       emoji: '💊',   color: '#0891B2', avatarBg: '#ECFEFF' },
  rescue_center:     { label: 'Rescue Center',      emoji: '🐾',   color: '#EA580C', avatarBg: '#FFF7ED' },
  pet_hotel:         { label: 'Pet Hotel',          emoji: '🏨',   color: '#0D9488', avatarBg: '#F0FDFA' },
  farm:              { label: 'Farm',               emoji: '🐐',   color: '#92400E', avatarBg: '#FEF9E7' },
};

const FILTER_CHIPS: { key: ProfRole | 'all'; label: string; emoji: string }[] = [
  { key: 'all',               label: 'All',               emoji: '🔍' },
  { key: 'vet',               label: 'Vets',              emoji: '👨‍⚕️' },
  { key: 'kennel',            label: 'Kennels',           emoji: '🐕' },
  { key: 'groomer',           label: 'Groomers',          emoji: '✂️' },
  { key: 'trainer',           label: 'Trainers',          emoji: '🎓' },
  { key: 'pet_sitter',        label: 'Sitters',           emoji: '🏠' },
  { key: 'pet_transport',     label: 'Transport',         emoji: '🚐' },
  { key: 'cremation_service', label: 'Cremation',         emoji: '🕊️' },
  { key: 'agro_vet_supplier', label: 'Agro-Vet',         emoji: '🌾' },
  { key: 'insurance_provider',label: 'Insurance',        emoji: '🛡️' },
  { key: 'pet_pharmacy',      label: 'Pharmacy',         emoji: '💊' },
  { key: 'rescue_center',     label: 'Rescue',           emoji: '🐾' },
  { key: 'pet_hotel',         label: 'Pet Hotel',        emoji: '🏨' },
  { key: 'farm',              label: 'Farms',            emoji: '🐐' },
];

interface Professional {
  _id: string;
  userId?: { name?: string; phone?: string; email?: string };
  name: string;
  businessName?: string;
  role: ProfRole;
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
  profileImage?: string;
  mediaImages?: { url: string; publicId: string }[];
}

interface Props {
  navigation: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

// Always navigate to the root stack's SubscriptionScreen, regardless of
// whether we're inside a tab or already on the stack. Using getParent()
// bubbles up from the tab navigator to the root stack navigator, which
// is where PaystackWebView and SubscriptionScreen are registered.
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

export default function ProfessionalsScreen({ navigation }: Props) {
  const [coords, setCoords] = useState({ lat: '6.5244', lng: '3.3792' });
  const [distance, setDistance] = useState('10');
  const [searchTerm, setSearchTerm] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<ProfRole | 'all'>('vet');
  const [results, setResults] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSubscribed,       setIsSubscribed]       = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [currentPlan,        setCurrentPlan]        = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);

  const handleDismissUpsell = () => {
    setShowUpsell(false);
    apiFetch('/api/v1/upsell/dismiss', { method: 'POST' }).catch(() => {});
  };

  const checkUpsellAfterSearch = () => {
    if (isSubscribed) return;
    apiFetch('/api/v1/upsell/check?trigger=search', { method: 'GET' })
      .then((r) => { if (r.body?.show) setShowUpsell(true); })
      .catch(() => {});
  };

  // ─── Subscription gate ──────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      let active = true;

      apiFetch('/api/subscriptions/me', { method: 'GET' })
        .then((res) => {
          if (!active) return;
          const data = res.body?.data;
          setIsSubscribed(res.ok && data?.isActive === true);
          setCurrentPlan(data?.plan ?? null);
        })
        .catch(() => { if (active) setIsSubscribed(false); })
        .finally(() => { if (active) setSubscriptionChecked(true); });

      return () => { active = false; };
    }, []),
  );

  // ─── Initial fetch + role filter change ─────────────────────────────────────

  useEffect(() => {
    fetchAllProfessionals(searchTerm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  // ─── Fetch all ───────────────────────────────────────────────────────────────

  const fetchAllProfessionals = async (term?: string) => {
    setLoading(true);
    const q = term !== undefined ? term : searchTerm;
    try {
      const params = new URLSearchParams({
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(q.trim() && { search: q.trim() }),
        limit: '50',
      });

      const res = await apiFetch(`/api/v1/professionals/list?${params}`, { method: 'GET' });

      if (res.ok && res.body?.success) {
        setResults(res.body.data || []);
        checkUpsellAfterSearch();
      } else {
        showAlert('Error', res.body?.message || 'Failed to fetch professionals.');
      }
    } catch {
      showAlert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  // ─── Location ────────────────────────────────────────────────────────────────

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Location permission is required to find nearby professionals.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({
        lat: location.coords.latitude.toString(),
        lng: location.coords.longitude.toString(),
      });
      showAlert('Location Updated', 'Now showing results near your current location.');
    } catch {
      showAlert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const geocodeAddress = async () => {
    if (!addressInput.trim()) {
      showAlert('Error', 'Please enter an address first.');
      return;
    }
    setLocationLoading(true);
    try {
      const geocoded = await Location.geocodeAsync(addressInput.trim());
      if (geocoded.length > 0) {
        setCoords({
          lat: geocoded[0].latitude.toString(),
          lng: geocoded[0].longitude.toString(),
        });
        showAlert('Location Set', `Location updated to: ${addressInput}`);
      } else {
        showAlert('Not Found', 'Could not find that address. Try a more specific one.');
      }
    } catch {
      showAlert('Error', 'Failed to look up that address.');
    } finally {
      setLocationLoading(false);
    }
  };

  // ─── Nearby search ───────────────────────────────────────────────────────────

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
        checkUpsellAfterSearch();
      } else {
        showAlert('Error', res.body?.message || 'Failed to fetch professionals.');
      }
    } catch {
      showAlert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  };

  // ─── Render card ─────────────────────────────────────────────────────────────

  const navigateToProfile = (item: Professional) => {
    if (item.role === 'vet') {
      navigation.navigate('VetProfile', { vetId: item._id });
    } else if (item.role === 'kennel') {
      navigation.navigate('KennelProfile', { kennelId: item._id });
    } else {
      navigation.navigate('ServiceProfile', { professionalId: item._id });
    }
  };

  const renderProfessional = ({ item }: { item: Professional }) => {
    const meta = ROLE_META[item.role] ?? ROLE_META.vet;
    const displayName = item.businessName || item.name || item.userId?.name || 'Unknown';
    const showOwnerLine = item.businessName && item.name && item.name !== item.businessName;
    const avatarUri = item.profileImage || item.mediaImages?.[0]?.url;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigateToProfile(item)}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatarCircle, { backgroundColor: meta.avatarBg }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>{meta.emoji}</Text>
            )}
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.vetName}>{displayName}</Text>
            <Text style={[styles.roleLabel, { color: meta.color }]}>{meta.label}</Text>
            {item.specialization ? (
              <Text style={styles.specialization} numberOfLines={1}>{item.specialization}</Text>
            ) : null}
            {showOwnerLine ? (
              <Text style={styles.ownerName}>Owner: {item.name}</Text>
            ) : null}
          </View>
          {item.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: `${meta.color}18` }]}>
              <Text style={[styles.verifiedText, { color: meta.color }]}>
                ✓ {item.role === 'vet' ? 'VCN' : 'Verified'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardDetails}>
          {item.address ? <DetailRow icon="📍" value={item.address} /> : null}
          {item.phone || item.userId?.phone ? (
            <DetailRow icon="📞" value={(item.phone || item.userId?.phone) ?? ''} />
          ) : null}
          {item.email || item.userId?.email ? (
            <DetailRow icon="✉️" value={(item.email || item.userId?.email) ?? ''} />
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

  // ─── Filtered list ───────────────────────────────────────────────────────────

  const professionals = results.filter((item) =>
    roleFilter === 'all' ? true : item.role === roleFilter,
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

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
            onChangeText={(v) => {
              setSearchTerm(v);
              if (searchDebounce.current) clearTimeout(searchDebounce.current);
              searchDebounce.current = setTimeout(() => fetchAllProfessionals(v), 350);
            }}
            style={styles.searchInput}
            placeholder="Search by name, specialization..."
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            onSubmitEditing={() => fetchAllProfessionals(searchTerm)}
          />
        </View>

        {/* Role filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_CHIPS.map(({ key, label, emoji }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterChip, roleFilter === key && styles.filterChipActive]}
              onPress={() => setRoleFilter(key)}
            >
              <Text style={[styles.filterChipText, roleFilter === key && styles.filterChipTextActive]}>
                {emoji} {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Location card */}
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

          {/* Distance chips */}
          <View style={styles.distanceRow}>
            <Text style={styles.distanceLabel}>Radius:</Text>
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
            disabled={loading}
          >
            <Text style={styles.actionBtnFillText}>Search Nearby</Text>
          </TouchableOpacity>
        </View>

        {/* Teaser banner */}
        {subscriptionChecked && !isSubscribed && (
          <View style={styles.teaserBanner}>
            <Ionicons name="lock-closed-outline" size={14} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.teaserText}>
              {currentPlan
                ? 'Upgrade your plan to view contact details and use GPS search.'
                : 'Subscribe to view contact details and use GPS search.'}
            </Text>
            <TouchableOpacity style={styles.teaserBtn} onPress={() => goToSubscription(navigation)}>
              <Text style={styles.teaserBtnText}>{currentPlan ? 'Upgrade' : 'Subscribe'}</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Upsell modal — shown after free search limit is reached */}
        <Modal visible={showUpsell} transparent animationType="slide" onRequestClose={handleDismissUpsell}>
          <TouchableOpacity style={styles.upsellOverlay} onPress={handleDismissUpsell} activeOpacity={1}>
            <View style={styles.upsellSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.upsellHandle} />
              <Text style={styles.upsellTitle}>Unlock Unlimited Search</Text>
              <Text style={styles.upsellMsg}>
                You've used your free searches this week. Subscribe to search without limits and contact professionals directly.
              </Text>
              <TouchableOpacity
                style={styles.upsellBtn}
                onPress={() => { handleDismissUpsell(); goToSubscription(navigation); }}
                activeOpacity={0.85}
              >
                <Text style={styles.upsellBtnText}>Subscribe — from ₦1,500/month</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.upsellNotNow} onPress={handleDismissUpsell}>
                <Text style={styles.upsellNotNowText}>Not now</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function DetailRow({
  icon,
  value,
  highlight = false,
}: {
  icon: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={[styles.detailValue, highlight && styles.detailValueHighlight]}>{value}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

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

  filterScroll: { marginTop: 12 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 2,
  },
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
    overflow: 'hidden',
  },
  avatarImage: { width: 48, height: 48 },
  avatarEmoji: { fontSize: 22 },
  cardMeta: { flex: 1 },
  vetName: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 1 },
  roleLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  specialization: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  ownerName: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
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
  teaserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  teaserText:    { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 16 },
  teaserBtn:     { backgroundColor: '#2563EB', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  teaserBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  upsellOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  upsellSheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  upsellHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  upsellTitle:      { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' },
  upsellMsg:        { fontSize: 14, color: '#6B7280', lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  upsellBtn:        { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  upsellBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  upsellNotNow:     { alignItems: 'center', paddingVertical: 8 },
  upsellNotNowText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
});