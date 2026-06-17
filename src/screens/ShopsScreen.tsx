import React, { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Animated,
  RefreshControl,
} from 'react-native';
import { showAlert } from '../utils/alert';
import * as Location from 'expo-location';
import { apiFetch } from '../api/client';
import { Ionicons } from '@expo/vector-icons';
function goToSubscription(navigation: any) {
  try {
    const parent = navigation.getParent();
    if (parent) parent.navigate('SubscriptionScreen');
    else navigation.navigate('SubscriptionScreen');
  } catch { navigation.navigate('SubscriptionScreen'); }
}

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
  images?: string[];
  profileImage?: string;
}

interface Props {
  navigation: any;
}


export default function ShopsScreen({ navigation }: Props) {
  const [shops,           setShops]           = useState<Shop[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [coords,          setCoords]          = useState({ lat: '6.5244', lng: '3.3792' });
  const [distance,           setDistance]           = useState('10');
  const [hasSearched,        setHasSearched]        = useState(false);
  const [isSubscribed,       setIsSubscribed]       = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [showUpsell,         setShowUpsell]         = useState(false);
  const [showGalleryNudge,   setShowGalleryNudge]   = useState(false);
  const galleryNudgeShownRef = useRef(false);
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

  // ── On every focus: check subscription then load shops ──────────────────
  useFocusEffect(
    useCallback(() => {
      let active = true;

      apiFetch('/api/subscriptions/me', { method: 'GET' })
        .then((res) => {
          if (!active) return;
          setIsSubscribed(res.ok && res.body?.data?.isActive === true);
        })
        .catch(() => { if (active) setIsSubscribed(false); })
        .finally(() => { if (active) setSubscriptionChecked(true); });

      fetchAllShops();

      return () => { active = false; };
    }, [navigation]),
  );

  const fetchAllShops = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/shops/list?limit=50', { method: 'GET' });

      if (res.ok && (res.body?.success || Array.isArray(res.body?.data) || Array.isArray(res.body))) {
        const data: Shop[] = Array.isArray(res.body?.data ?? res.body) ? (res.body?.data ?? res.body) : [];
        setShops(data);
        checkUpsellAfterSearch();
        if (!galleryNudgeShownRef.current && data.some((s) => s.images?.[0] || s.profileImage)) {
          galleryNudgeShownRef.current = true;
          setShowGalleryNudge(true);
          Animated.timing(nudgeOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          setTimeout(() => {
            Animated.timing(nudgeOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(
              () => setShowGalleryNudge(false),
            );
          }, 7000);
        }
      } else {
        if (res.status === 402) {
          // Subscription required — don't alert, the useFocusEffect already handled it
          setShops([]);
        } else {
          showAlert('Error', res.body?.message || 'Failed to fetch shops.');
          setShops([]);
        }
      }
    } catch (error) {
      showAlert('Network Error', 'Could not reach server. Please check your connection.');
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
        showAlert('Permission Denied', 'Location access needed to find nearby shops.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        lat: loc.coords.latitude.toString(),
        lng: loc.coords.longitude.toString(),
      });
      showAlert('Location Set', 'Tap "Nearby" to find shops near you.');
    } catch {
      showAlert('Error', 'Failed to get location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const searchNearby = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lng:      coords.lng,
        lat:      coords.lat,
        distance,
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
      });

      const res = await apiFetch(`/api/v1/shops/nearby?${params}`, { method: 'GET' });

      if (res.ok) {
        const data = res.body?.data ?? res.body ?? [];
        const nearby = Array.isArray(data) ? data : [];
        setShops(nearby);
        checkUpsellAfterSearch();
        if (nearby.length === 0) {
          showAlert(
            'No Nearby Shops',
            'No shops found in your area. Showing all shops instead.',
            [{ text: 'OK', onPress: fetchAllShops }],
          );
        }
      } else {
        showAlert(
          'Nearby Search Failed',
          res.body?.message || 'Could not find shops nearby. Showing all shops.',
          [{ text: 'OK', onPress: fetchAllShops }],
        );
      }
    } catch {
      showAlert('Unexpected Error', 'Something went wrong. Please try again.');
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

  const filtered = shops.filter(
    (s) =>
      !searchTerm.trim() ||
      (getDisplayName(s) + getAddress(s) + (s.description ?? ''))
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const renderShop = ({ item }: { item: Shop }) => {
    const avatarUri = item.images?.[0] || item.profileImage;
    return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ShopProfile', { shop: item, shopId: item._id })}
      activeOpacity={0.78}
    >
      <View style={styles.avatarWrap}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarEmoji}>🛒</Text>
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.shopName} numberOfLines={1}>
          {getDisplayName(item)}
        </Text>
        {item.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        {getAddress(item) ? (
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={12} color="#64748B" />
            <Text style={styles.addressText} numberOfLines={1}>
              {getAddress(item)}
            </Text>
          </View>
        ) : null}
        {item.distance != null ? (
          <Text style={styles.distanceText}>{item.distance.toFixed(1)} km away</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
    </TouchableOpacity>
    );
  };

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

          {['5', '10', '25'].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.distanceChip, distance === d && styles.distanceChipActive]}
              onPress={() => setDistance(d)}
            >
              <Text style={[styles.distanceChipText, distance === d && styles.distanceChipTextActive]}>
                {d}km
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.searchNearbyBtn}
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
            <Text style={styles.searchNearbyText}>Nearby</Text>
          </TouchableOpacity>
        </View>

        {/* All shops button */}
        <TouchableOpacity
          style={styles.allShopsBtn}
          onPress={fetchAllShops}
          disabled={loading}
        >
          <Text style={styles.allShopsBtnText}>Show All Pet Shops</Text>
        </TouchableOpacity>

        {/* Gallery nudge */}
        {showGalleryNudge && (
          <Animated.View style={[styles.galleryNudge, { opacity: nudgeOpacity }]}>
            <Text style={styles.galleryNudgeIcon}>🖼️</Text>
            <Text style={styles.galleryNudgeText}>
              Tap any shop to see their product photos and gallery before contacting
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

        {/* Teaser banner */}
        {subscriptionChecked && !isSubscribed && (
          <View style={styles.teaserBanner}>
            <Ionicons name="lock-closed-outline" size={14} color="#EA580C" style={{ marginRight: 6 }} />
            <Text style={styles.teaserText}>Subscribe to view contact details and use GPS search.</Text>
            <TouchableOpacity style={styles.teaserBtn} onPress={() => goToSubscription(navigation)}>
              <Text style={styles.teaserBtnText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#EA580C" />
            <Text style={styles.loadingText}>Finding shops...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            renderItem={renderShop}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAllShops} colors={['#EA580C']} tintColor="#EA580C" />}
            ListHeaderComponent={
              hasSearched ? (
                <>
                  <Text style={styles.resultCount}>
                    {filtered.length} shop{filtered.length !== 1 ? 's' : ''} found
                  </Text>
                  {filtered.length > 0 && (
                    <Text style={styles.galleryHint}>
                      🖼️ Tap any shop to view their photos, products and contact details
                    </Text>
                  )}
                </>
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

        {/* Upsell modal — shop specific */}
        <Modal visible={showUpsell} transparent animationType="slide" onRequestClose={handleDismissUpsell}>
          <TouchableOpacity style={styles.upsellOverlay} onPress={handleDismissUpsell} activeOpacity={1}>
            <View style={styles.upsellSheet} onStartShouldSetResponder={() => true}>
              <View style={styles.upsellHandle} />
              <Text style={styles.upsellTitle}>Contact This Pet Shop</Text>
              <Text style={styles.upsellMsg}>
                Subscribe to call or WhatsApp pet shops directly, view product galleries, and get the best deals near you.
              </Text>
              <View style={styles.upsellBenefits}>
                <Text style={styles.upsellBenefit}>📞 Call or WhatsApp shops directly</Text>
                <Text style={styles.upsellBenefit}>💬 Send in-app messages</Text>
                <Text style={styles.upsellBenefit}>📡 GPS search for nearby shops</Text>
                <Text style={styles.upsellBenefit}>🖼️ View full product galleries</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  // Gate styles
  gateContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC', paddingHorizontal: 32,
  },
  gateEmoji: { fontSize: 56, marginBottom: 16 },
  gateTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  gateText:  { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  gateBtn: {
    backgroundColor: '#EA580C', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12,
  },
  gateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

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
  distanceChipActive:     { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  distanceChipText:       { fontSize: 12, color: '#64748B', fontWeight: '600' },
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
    overflow: 'hidden',
  },
  avatarImage: { width: 52, height: 52 },
  avatarEmoji: { fontSize: 24 },
  cardBody: { flex: 1, marginRight: 4 },
  shopName:    { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  description: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  addressRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addressText: { fontSize: 12, color: '#64748B', flex: 1 },
  distanceText:{ fontSize: 12, color: '#EA580C', fontWeight: '600', marginTop: 3 },
  emptyState:  { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:  { fontSize: 52, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  emptyText:   { fontSize: 14, color: '#64748B', textAlign: 'center' },
  teaserBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  teaserText:    { flex: 1, fontSize: 12, color: '#9A3412', lineHeight: 16 },
  teaserBtn:     { backgroundColor: '#EA580C', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  teaserBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  upsellOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  upsellSheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  upsellHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  upsellTitle:      { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' },
  upsellMsg:        { fontSize: 14, color: '#6B7280', lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  upsellBenefits:   { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 },
  upsellBenefit:    { fontSize: 14, color: '#374151', fontWeight: '500' },
  upsellBtn:        { backgroundColor: '#EA580C', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginBottom: 12, shadowColor: '#EA580C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  upsellBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  upsellNotNow:     { alignItems: 'center', paddingVertical: 8 },
  upsellNotNowText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },

  galleryNudge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7ED', borderRadius: 10, borderWidth: 1, borderColor: '#FED7AA',
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  galleryNudgeIcon:  { fontSize: 18 },
  galleryNudgeText:  { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 17 },
  galleryNudgeClose: { fontSize: 14, color: '#6B7280', paddingHorizontal: 4 },
  galleryHint:       { fontSize: 12, color: '#6B7280', marginBottom: 8, fontStyle: 'italic', lineHeight: 17 },
});