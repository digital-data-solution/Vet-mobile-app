import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';

interface Shop {
  _id: string;
  name?: string;
  shopName?: string;
  businessName?: string;
  ownerName?: string;
  description?: string;
  address?: string | { city?: string; town?: string; full?: string };
  phone?: string;
  email?: string;
  services?: string[];
  hours?: string;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  isVerified?: boolean;
  images?: string[];           // Shop.images is string[] (URLs), not {url,publicId}[]
  owner?: {
    supabaseId?: string;       // ← populated by backend after patch
    name?: string;
    phone?: string;
    email?: string;
  };
}

export default function ShopProfileScreen({ route, navigation }: any) {
  // Accept either a pre-loaded shop object or just a shopId to fetch
  const shopId: string | undefined    = route?.params?.shopId;
  const passedShop: Shop | undefined  = route?.params?.shop;

  const [shop, setShop]         = useState<Shop | null>(passedShop ?? null);
  const [loading, setLoading]   = useState(!passedShop);
  const [error, setError]       = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    if (!shopId) {
      setError('No shop ID provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/shops/${shopId}`, { method: 'GET' });
      if (res.ok && res.body?.success && res.body?.data) {
        setShop(res.body.data);
      } else {
        setError(res.body?.message || 'Could not load shop profile.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    // If we only got a stub from the list screen (no owner.supabaseId), re-fetch
    // the full record so the Message button can populate.
    if (!passedShop || !passedShop.owner?.supabaseId) {
      fetchShop();
    }
  }, [fetchShop, passedShop]);

  const getAddress = (): string => {
    if (!shop?.address) return '';
    if (typeof shop.address === 'string') return shop.address;
    return shop.address.full ?? shop.address.city ?? shop.address.town ?? '';
  };

  const getDisplayName = (): string =>
    shop?.shopName ?? shop?.businessName ?? shop?.name ?? 'Pet Shop';

  const phone    = shop?.phone || shop?.owner?.phone;
  const email    = shop?.email || shop?.owner?.email;
  const address  = getAddress();

  const call = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Error', 'Unable to open phone app.'),
    );
  };

  const whatsApp = () => {
    if (!phone) return;
    const digits = phone.replace(/\D/g, '').replace(/^0/, '234');
    Linking.openURL(`https://wa.me/${digits}`).catch(() =>
      Alert.alert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.'),
    );
  };

  const emailShop = () => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() =>
      Alert.alert('Error', 'Unable to open mail app.'),
    );
  };

  const openChat = () => {
    const supabaseId = shop?.owner?.supabaseId;
    if (!supabaseId) {
      Alert.alert('Unavailable', 'This shop cannot be messaged yet.');
      return;
    }
    navigation.navigate('Chat', {
      otherUserId:   supabaseId,
      otherUserName: getDisplayName(),
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#EA580C" />
        <Text style={styles.loadingText}>Loading shop...</Text>
      </View>
    );
  }

  if (error || !shop) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={52} color="#F59E0B" />
        <Text style={styles.errorTitle}>Shop Unavailable</Text>
        <Text style={styles.errorText}>{error ?? 'Could not load this shop.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchShop}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canMessage  = !!shop.owner?.supabaseId;
  const displayName = getDisplayName();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarEmoji}>🛒</Text>
          {shop.isVerified && (
            <View style={styles.verifiedRing}>
              <Ionicons name="checkmark-circle" size={26} color="#10B981" />
            </View>
          )}
        </View>

        <Text style={styles.name}>{displayName}</Text>

        {shop.ownerName ? (
          <Text style={styles.ownerName}>by {shop.ownerName}</Text>
        ) : null}

        {shop.description ? (
          <Text style={styles.description}>{shop.description}</Text>
        ) : null}

        <View style={styles.badgeRow}>
          {shop.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#065F46" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
          {shop.distance != null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={13} color="#EA580C" />
              <Text style={styles.distanceBadgeText}>{shop.distance.toFixed(1)} km away</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Gallery ──────────────────────────────────────────────────────── */}
      {shop.images && shop.images.length > 0 ? (
        <View style={styles.gallerySection}>
          <Text style={styles.sectionTitle}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {shop.images.map((url, i) => (
              <Image
                key={String(i)}
                source={{ uri: url }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Contact actions ───────────────────────────────────────────────── */}
      {(phone || email || canMessage) ? (
        <View style={styles.contactRow}>
          {phone ? (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#EA580C' }]}
              onPress={call}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          ) : null}

          {phone ? (
            <TouchableOpacity
              style={[styles.contactBtn, { backgroundColor: '#25D366' }]}
              onPress={whatsApp}
              activeOpacity={0.8}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}

          {canMessage ? (
            <TouchableOpacity
              style={[styles.contactBtn, styles.contactBtnOutline]}
              onPress={openChat}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#EA580C" />
              <Text style={[styles.contactBtnText, { color: '#EA580C' }]}>Message</Text>
            </TouchableOpacity>
          ) : email ? (
            <TouchableOpacity
              style={[styles.contactBtn, styles.contactBtnOutline]}
              onPress={emailShop}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={18} color="#EA580C" />
              <Text style={[styles.contactBtnText, { color: '#EA580C' }]}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* ── Details ──────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Details</Text>

        {address ? (
          <InfoRow icon="location-outline" label="Address" value={address} />
        ) : null}

        {phone ? (
          <InfoRow icon="call-outline" label="Phone" value={phone} />
        ) : null}

        {email ? (
          <InfoRow icon="mail-outline" label="Email" value={email} />
        ) : null}

        {shop.hours ? (
          <InfoRow icon="time-outline" label="Hours" value={shop.hours} />
        ) : null}

        {shop.rating != null && shop.reviewCount != null ? (
          <InfoRow
            icon="star-outline"
            label="Rating"
            value={`${shop.rating.toFixed(1)} / 5 (${shop.reviewCount} review${shop.reviewCount !== 1 ? 's' : ''})`}
          />
        ) : null}
      </View>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      {shop.services && shop.services.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesWrap}>
            {shop.services.map((s, i) => (
              <View key={i} style={styles.serviceChip}>
                <Text style={styles.serviceChipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color="#64748B" style={{ width: 22 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: '#F8FAFC' },
  container: { paddingBottom: 40 },

  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC', paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: '#64748B' },
  errorTitle:  { fontSize: 20, fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  errorText:   { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#EA580C', paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 10, marginBottom: 10,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backBtn:   { paddingVertical: 10 },
  backText:  { color: '#64748B', fontSize: 14 },

  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    backgroundColor: '#FFF7ED',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
  },
  avatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FED7AA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },
  avatarEmoji: { fontSize: 42 },
  verifiedRing: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 13,
  },
  name: {
    fontSize: 24, fontWeight: '800', color: '#0F172A',
    marginBottom: 4, textAlign: 'center',
  },
  ownerName: {
    fontSize: 14, color: '#64748B', marginBottom: 8,
  },
  description: {
    fontSize: 14, color: '#475569', textAlign: 'center',
    lineHeight: 20, marginBottom: 12,
  },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  verifiedBadgeText: { fontSize: 12, color: '#065F46', fontWeight: '700' },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: '#FED7AA',
  },
  distanceBadgeText: { fontSize: 12, color: '#EA580C', fontWeight: '600' },

  gallerySection: { marginHorizontal: 16, marginBottom: 16 },
  galleryRow:     { gap: 10, paddingRight: 4 },
  galleryImage: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },

  contactRow: {
    flexDirection: 'row', marginHorizontal: 16,
    gap: 10, marginBottom: 16,
  },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12, gap: 8,
  },
  contactBtnOutline: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#EA580C',
  },
  contactBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  card: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: '#64748B', flex: 0.7, marginLeft: 4 },
  infoValue: { fontSize: 13, color: '#0F172A', fontWeight: '600', flex: 1.3, textAlign: 'right' },

  servicesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceChip: {
    backgroundColor: '#FFF7ED', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#FED7AA',
  },
  serviceChipText: { fontSize: 13, color: '#EA580C', fontWeight: '600' },
});