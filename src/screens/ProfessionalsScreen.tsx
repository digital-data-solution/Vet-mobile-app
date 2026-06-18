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
  Animated,
  RefreshControl,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { getUserLocation, forwardGeocode } from '../utils/location';
import { Ionicons } from '@expo/vector-icons';
import SkeletonList from '../components/SkeletonLoader';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { getSearchHistory, addSearchTerm, clearSearchHistory } from '../utils/searchHistory';

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
// Context-aware upsell content — title + message by active role filter
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_UPSELL: Record<string, { title: string; msg: string }> = {
  vet:               { title: 'Contact Your Vet Directly',   msg: 'Subscribe to call, WhatsApp or message any vet and book a consultation.' },
  kennel:            { title: 'Book This Kennel',            msg: 'Subscribe to contact kennels, check availability, and arrange boarding.' },
  groomer:           { title: 'Book a Groomer',              msg: 'Subscribe to see groomer galleries and contact them directly for bookings.' },
  trainer:           { title: 'Book a Trainer',              msg: 'Subscribe to contact trainers, discuss your pet\'s needs, and start a training program.' },
  pet_sitter:        { title: 'Find a Pet Sitter',           msg: 'Subscribe to see full sitter profiles and contact them directly.' },
  pet_transport:     { title: 'Book Pet Transport',          msg: 'Subscribe to contact transport providers and arrange safe pet travel.' },
  cremation_service: { title: 'Cremation Services',          msg: 'Subscribe to contact verified cremation providers in your area.' },
  agro_vet_supplier: { title: 'Order from Agro-Vet Suppliers', msg: 'Subscribe to contact suppliers and order livestock products directly.' },
  insurance_provider:{ title: 'Get Pet Insurance',          msg: 'Subscribe to contact insurance providers and get a personalised quote.' },
  pet_pharmacy:      { title: 'Order Medications',          msg: 'Subscribe to contact pet pharmacies and get your pet\'s meds delivered.' },
  rescue_center:     { title: 'Adopt a Pet',                msg: 'Subscribe to contact rescue centres and start your adoption process.' },
  pet_hotel:         { title: 'Book a Premium Pet Hotel',   msg: 'Subscribe to view hotel galleries and make a premium boarding booking.' },
  farm:              { title: 'Order from Farms',           msg: 'Subscribe to contact verified farms and order livestock or farm produce directly.' },
  all:               { title: 'Unlock Full Access',         msg: 'Subscribe to call, WhatsApp or message any professional directly from the app.' },
};

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

const TRENDING_SEARCHES = ['dog vaccination', 'cat groomer', 'pet boarding', 'vet near me', 'pet transport'];

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
  const [showUpsell,         setShowUpsell]         = useState(false);
  const [verifiedOnly,       setVerifiedOnly]       = useState(false);
  const [sortBy,             setSortBy]             = useState<'default'|'rating'|'distance'|'newest'>('default');
  const [searchFocused,      setSearchFocused]      = useState(false);
  const [searchHistory,      setSearchHistory]      = useState<string[]>([]);
  const [showGalleryNudge,   setShowGalleryNudge]   = useState(false);
  const [referralNudge,      setReferralNudge]      = useState(false);
  const galleryNudgeShownRef = useRef(false);
  const profileTapsRef       = useRef<number>(0);
  const nudgeOpacity         = useRef(new Animated.Value(0)).current;

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

  // ─── Search history ─────────────────────────────────────────────────────────

  useFocusEffect(useCallback(() => {
    getSearchHistory().then(setSearchHistory).catch(() => {});
  }, []));

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

  // ─── Auto-detect GPS on mount ────────────────────────────────────────────────

  useEffect(() => {
    getUserLocation()
      .then((loc) => setCoords({ lat: loc.latitude.toString(), lng: loc.longitude.toString() }))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Initial fetch + role filter change ─────────────────────────────────────

  useEffect(() => {
    fetchAllProfessionals(searchTerm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  // ─── Fetch all ───────────────────────────────────────────────────────────────

  const fetchAllProfessionals = async (term?: string) => {
    setLoading(true);
    const q = term !== undefined ? term : searchTerm;
    if (q.trim().length >= 4) {
      addSearchTerm(q).then(() => getSearchHistory().then(setSearchHistory)).catch(() => {});
    }
    try {
      const params = new URLSearchParams({
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(q.trim() && { search: q.trim() }),
        limit: '50',
      });

      const res = await apiFetch(`/api/v1/professionals/list?${params}`, { method: 'GET' });

      if (res.ok && res.body?.success) {
        const data: Professional[] = res.body.data || [];
        setResults(data);
        checkUpsellAfterSearch();
        // Show gallery nudge once if any result has a profile photo or gallery
        if (!galleryNudgeShownRef.current && data.some((p) => p.profileImage || (p.mediaImages?.length ?? 0) > 0)) {
          galleryNudgeShownRef.current = true;
          setShowGalleryNudge(true);
          Animated.timing(nudgeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          // Auto-hide after 6 seconds
          setTimeout(() => {
            Animated.timing(nudgeOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(
              () => setShowGalleryNudge(false),
            );
          }, 6000);
        }
        // Show referral nudge after first successful search with results
        if (data.length > 0 && !referralNudge) {
          setTimeout(() => setReferralNudge(true), 3000);
        }
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
      const loc = await getUserLocation();
      setCoords({ lat: loc.latitude.toString(), lng: loc.longitude.toString() });
      showAlert('Location Updated', 'Now showing results near your current location.');
    } catch (err) {
      showAlert('Permission Denied', (err as Error).message || 'Failed to get current location.');
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
      const result = await forwardGeocode(addressInput.trim());
      setCoords({ lat: result.lat.toString(), lng: result.lon.toString() });
      showAlert('Location Set', `Location updated to: ${addressInput}`);
    } catch {
      showAlert('Not Found', 'Could not find that address. Try a more specific one.');
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
    profileTapsRef.current += 1;
    // After 3rd tap, nudge unsubscribed users toward subscribing
    if (profileTapsRef.current >= 3 && !isSubscribed) {
      checkUpsellAfterSearch();
    }
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
            {item.rating && item.rating > 0 ? (
              <View style={styles.ratingInline}>
                <Text style={styles.ratingStarsInline}>{'★'.repeat(Math.min(5, Math.round(item.rating)))}</Text>
                <Text style={[styles.ratingValInline, { color: meta.color }]}>{item.rating.toFixed(1)}</Text>
                {item.reviewCount ? <Text style={styles.ratingCntInline}>({item.reviewCount})</Text> : null}
              </View>
            ) : null}
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

  const professionals = results
    .filter((item) => {
      if (roleFilter !== 'all' && item.role !== roleFilter) return false;
      if (verifiedOnly && !item.isVerified) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
      if (sortBy === 'distance') return (a.distance ?? 9999) - (b.distance ?? 9999);
      return 0;
    });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>

        {/* Search bar */}
        <View>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
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
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onSubmitEditing={() => { fetchAllProfessionals(searchTerm); setSearchFocused(false); }}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchTerm(''); fetchAllProfessionals(''); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          {/* Search suggestions dropdown */}
          {searchFocused && searchTerm.length === 0 && (
            <View style={styles.suggestionsDropdown}>
              {searchHistory.length > 0 && (
                <>
                  <View style={styles.suggestRow}>
                    <Text style={styles.suggestLabel}>Recent</Text>
                    <TouchableOpacity onPress={async () => { await clearSearchHistory(); setSearchHistory([]); }}>
                      <Text style={styles.suggestClear}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  {searchHistory.map((h) => (
                    <TouchableOpacity key={h} style={styles.suggestItem} onPress={() => { setSearchTerm(h); fetchAllProfessionals(h); setSearchFocused(false); }}>
                      <Ionicons name="time-outline" size={15} color="#6B7280" style={{ marginRight: 8 }} />
                      <Text style={styles.suggestItemText}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.suggestDivider} />
                </>
              )}
              <Text style={styles.suggestLabel}>Trending 🔥</Text>
              {TRENDING_SEARCHES.map((t) => (
                <TouchableOpacity key={t} style={styles.suggestItem} onPress={() => { setSearchTerm(t); fetchAllProfessionals(t); setSearchFocused(false); }}>
                  <Ionicons name="trending-up-outline" size={15} color="#E8610A" style={{ marginRight: 8 }} />
                  <Text style={styles.suggestItemText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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

        {/* Sort + Verified filter row */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroll}
          contentContainerStyle={styles.sortRow}
        >
          <TouchableOpacity
            style={[styles.sortChip, verifiedOnly && styles.sortChipActive]}
            onPress={() => setVerifiedOnly((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name={verifiedOnly ? 'shield-checkmark' : 'shield-checkmark-outline'} size={13} color={verifiedOnly ? '#fff' : '#059669'} />
            <Text style={[styles.sortChipText, verifiedOnly && { color: '#fff' }]}>Verified Only</Text>
          </TouchableOpacity>
          {([['default','⊞ Default'],['rating','⭐ Top Rated'],['distance','📍 Nearest']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.sortChip, sortBy === key && styles.sortChipActive]}
              onPress={() => setSortBy(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sortChipText, sortBy === key && { color: '#fff' }]}>{label}</Text>
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

        {/* Gallery nudge — fades in when profiles with images are loaded */}
        {showGalleryNudge && (
          <Animated.View style={[styles.galleryNudge, { opacity: nudgeOpacity }]}>
            <Text style={styles.galleryNudgeIcon}>🖼️</Text>
            <Text style={styles.galleryNudgeText}>
              Tap any card to see their profile photo and full gallery before contacting
            </Text>
            <TouchableOpacity
              onPress={() => {
                Animated.timing(nudgeOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
                  () => setShowGalleryNudge(false),
                );
              }}
            >
              <Text style={styles.galleryNudgeClose}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Referral nudge — appears 3s after first results load */}
        {referralNudge && !isSubscribed && (
          <TouchableOpacity
            style={styles.referralNudge}
            onPress={() => {
              setReferralNudge(false);
              navigation.navigate('Profile');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.referralNudgeIcon}>🎁</Text>
            <Text style={styles.referralNudgeText}>
              Know a vet or groomer? Invite them — earn 7 free days
            </Text>
            <TouchableOpacity onPress={() => setReferralNudge(false)}>
              <Text style={styles.galleryNudgeClose}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Results */}
        {loading && results.length === 0 ? (
          <SkeletonList count={5} />
        ) : loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            data={professionals}
            keyExtractor={(item) => item._id}
            renderItem={renderProfessional}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={() => fetchAllProfessionals()} colors={['#2563EB']} tintColor="#2563EB" />
            }
            ListHeaderComponent={
              hasSearched ? (
                <>
                  <Text style={styles.resultCount}>
                    {professionals.length} professional{professionals.length !== 1 ? 's' : ''} found
                  </Text>
                  {professionals.length > 0 && (
                    <Text style={styles.galleryHint}>
                      🖼️ Tap any card to see their profile photo, gallery and contact details
                    </Text>
                  )}
                </>
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
                  <Text style={styles.emptyRegisterHint}>
                    Are you a {roleFilter !== 'all' ? (ROLE_META[roleFilter as ProfRole]?.label ?? 'Professional') : 'Professional'} in this area?
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyRegisterBtn}
                    onPress={() => {
                      const screen = roleFilter === 'kennel' || roleFilter === 'farm'
                        ? 'KennelOnboarding'
                        : 'ProfessionalOnboarding';
                      try { navigation.getParent()?.navigate(screen) ?? navigation.navigate(screen); } catch { navigation.navigate(screen); }
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emptyRegisterBtnText}>Register Your Business — It's Free</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}

        {/* Upsell modal — context-aware copy based on active role filter */}
        <Modal visible={showUpsell} transparent animationType="slide" onRequestClose={handleDismissUpsell}>
          <TouchableOpacity style={styles.upsellOverlay} onPress={handleDismissUpsell} activeOpacity={1}>
            <View style={styles.upsellSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.upsellHandle} />
              <Text style={styles.upsellTitle}>
                {(ROLE_UPSELL[roleFilter] ?? ROLE_UPSELL.all).title}
              </Text>
              <Text style={styles.upsellMsg}>
                {(ROLE_UPSELL[roleFilter] ?? ROLE_UPSELL.all).msg}
              </Text>
              <View style={styles.upsellBenefits}>
                <Text style={styles.upsellBenefit}>✅ View full contact details</Text>
                <Text style={styles.upsellBenefit}>📞 Call or WhatsApp directly</Text>
                <Text style={styles.upsellBenefit}>💬 Send in-app messages</Text>
                <Text style={styles.upsellBenefit}>📡 GPS nearby search</Text>
              </View>
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
  searchBarFocused: { borderWidth: 1.5, borderColor: '#E8610A' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#111827' },

  suggestionsDropdown: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
    marginTop: 4,
  },
  suggestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  suggestLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6 },
  suggestClear: { fontSize: 12, color: '#E8610A', fontWeight: '600' },
  suggestDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  suggestItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  suggestItemText: { fontSize: 14, color: '#374151' },

  // FIX: explicit height so this horizontal ScrollView reliably reserves its
  // own vertical space on web (react-native-web) instead of collapsing and
  // letting the sort row below render on top of it.
  filterScroll: { marginTop: 12, height: 44, flexGrow: 0, flexShrink: 0 },
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

  ratingInline: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  ratingStarsInline: { fontSize: 12, color: '#F59E0B' },
  ratingValInline: { fontSize: 12, fontWeight: '700' },
  ratingCntInline: { fontSize: 11, color: '#9CA3AF' },

  // FIX: this ScrollView previously had no `style` prop at all — only
  // contentContainerStyle — so it had no defined height on web and could
  // render in the same vertical slot as the role filter row above it.
  // Giving it an explicit height + marginTop fixes the overlap.
  sortScroll: { marginTop: 10, height: 40, flexGrow: 0, flexShrink: 0 },
  sortRow: { paddingHorizontal: 16, gap: 8, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  sortChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff',
  },
  sortChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  sortChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingBottom: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  emptyRegisterHint: { fontSize: 14, color: '#374151', textAlign: 'center', marginBottom: 10 },
  emptyRegisterBtn: {
    backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  emptyRegisterBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  upsellMsg:        { fontSize: 14, color: '#6B7280', lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  upsellBenefits:   { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 },
  upsellBenefit:    { fontSize: 14, color: '#374151', fontWeight: '500' },
  upsellBtn:        { backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  upsellBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  upsellNotNow:     { alignItems: 'center', paddingVertical: 8 },
  upsellNotNowText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },

  // Gallery nudge banner
  galleryNudge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 10, borderWidth: 1, borderColor: '#BBF7D0',
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  galleryNudgeIcon:  { fontSize: 18 },
  galleryNudgeText:  { flex: 1, fontSize: 12, color: '#14532D', fontWeight: '600', lineHeight: 17 },
  galleryNudgeClose: { fontSize: 14, color: '#6B7280', paddingHorizontal: 4 },

  // Gallery hint in list header
  galleryHint: { fontSize: 12, color: '#6B7280', marginBottom: 10, fontStyle: 'italic', lineHeight: 17 },

  // Referral nudge in list
  referralNudge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A',
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  referralNudgeIcon: { fontSize: 18 },
  referralNudgeText: { flex: 1, fontSize: 12, color: '#78350F', fontWeight: '600', lineHeight: 17 },
});
