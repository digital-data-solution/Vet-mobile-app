import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';
import SubscriptionPrompt from '../components/SubscriptionPrompt';
import ReviewsSection from '../components/ReviewsSection';
import WriteReviewModal from '../components/WriteReviewModal';

type ProfRole =
  | 'groomer' | 'trainer' | 'pet_sitter'
  | 'pet_transport' | 'cremation_service' | 'agro_vet_supplier' | 'insurance_provider';

const ROLE_META: Record<string, { label: string; emoji: string; color: string; avatarBg: string }> = {
  groomer:            { label: 'Groomer',            emoji: '✂️',  color: '#DB2777', avatarBg: '#FDF2F8' },
  trainer:            { label: 'Pet Trainer',         emoji: '🎓',  color: '#059669', avatarBg: '#ECFDF5' },
  pet_sitter:         { label: 'Pet Sitter',          emoji: '🏠',  color: '#D97706', avatarBg: '#FFFBEB' },
  pet_transport:      { label: 'Pet Transport',       emoji: '🚐',  color: '#0891B2', avatarBg: '#ECFEFF' },
  cremation_service:  { label: 'Cremation Service',   emoji: '🕊️', color: '#64748B', avatarBg: '#F8FAFC' },
  agro_vet_supplier:  { label: 'Agro-Vet Supplier',  emoji: '🌾',  color: '#65A30D', avatarBg: '#F7FEE7' },
  insurance_provider: { label: 'Insurance Provider',  emoji: '🛡️', color: '#7C3AED', avatarBg: '#F5F3FF' },
};

interface Professional {
  _id: string;
  name: string;
  businessName?: string;
  role: ProfRole;
  specialization?: string;
  address: string;
  phone?: string;
  email?: string;
  isVerified: boolean;
  isActive?: boolean;
  rating?: number;
  reviewCount?: number;
  images?: { url: string; publicId: string }[];
  userId?: {
    _id?: string;
    supabaseId?: string;
    name?: string;
    phone?: string;
    email?: string;
    profileImage?: string;
  };
}

export default function ServiceProfileScreen({ route, navigation }: any) {
  const professionalId: string | undefined = route?.params?.professionalId;

  const [prof, setProf]         = useState<Professional | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [showSubModal, setShowSubModal]   = useState(false);
  const [isSubscribed, setIsSubscribed]   = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  const fetchProf = useCallback(async () => {
    if (!professionalId) {
      setError('No professional ID provided.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [profRes, subRes] = await Promise.all([
        apiFetch(`/api/v1/professionals/${professionalId}`, { method: 'GET' }),
        apiFetch('/api/subscriptions/me', { method: 'GET' }),
      ]);

      if (profRes.ok && profRes.body?.data) {
        setProf(profRes.body.data);
      } else {
        setError(profRes.body?.message || 'Professional not found.');
      }

      setIsSubscribed(subRes.ok && subRes.body?.data?.isActive === true);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useFocusEffect(useCallback(() => { fetchProf(); }, [fetchProf]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !prof) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load profile</Text>
        <Text style={styles.errorSubtitle}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProf}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const meta = ROLE_META[prof.role] ?? { label: prof.role, emoji: '🐾', color: '#2563EB', avatarBg: '#EFF6FF' };
  const displayName = prof.businessName || prof.name;
  const phone = prof.phone || prof.userId?.phone;
  const email = prof.email || prof.userId?.email;

  const handleCall = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Error', 'Unable to open phone app.'),
    );
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    const digits = phone.replace(/\D/g, '').replace(/^0/, '234');
    Linking.openURL(`https://wa.me/${digits}`).catch(() =>
      Alert.alert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.'),
    );
  };

  const handleMessage = () => {
    const targetId = prof.userId?._id || prof.userId?.supabaseId;
    if (!targetId) {
      Alert.alert('Unavailable', 'This service provider has not enabled in-app messaging yet.');
      return;
    }
    try {
      navigation.getParent()?.navigate('Chat', { otherUserId: targetId, otherUserName: displayName });
    } catch {
      navigation.navigate('Chat', { otherUserId: targetId, otherUserName: displayName });
    }
  };

  const handleLockedContact = () => setShowSubModal(true);

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: meta.avatarBg }]}>
        {prof.images && prof.images.length > 0 ? (
          <Image source={{ uri: prof.images[0].url }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroPlaceholder, { backgroundColor: meta.avatarBg }]}>
            <Text style={styles.heroEmoji}>{meta.emoji}</Text>
          </View>
        )}
        <View style={styles.heroOverlay}>
          <Text style={styles.heroName}>{displayName}</Text>
          <View style={[styles.rolePill, { backgroundColor: meta.color }]}>
            <Text style={styles.rolePillText}>{meta.emoji} {meta.label}</Text>
          </View>
          {prof.isVerified && (
            <View style={styles.verifiedPill}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.verifiedPillText}>Verified</Text>
            </View>
          )}
        </View>
      </View>

      {/* Rating row */}
      {(prof.rating || 0) > 0 && (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingStars}>{'★'.repeat(Math.round(prof.rating ?? 0))}</Text>
          <Text style={styles.ratingValue}>{(prof.rating ?? 0).toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({prof.reviewCount ?? 0} reviews)</Text>
        </View>
      )}

      {/* Details card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        {prof.specialization ? (
          <InfoRow icon="🏷️" label="Specialization" value={prof.specialization} />
        ) : null}
        <InfoRow icon="📍" label="Address" value={prof.address} />

        {isSubscribed ? (
          <>
            {email ? <InfoRow icon="✉️" label="Email" value={email} onPress={() => Linking.openURL(`mailto:${email}`)} /> : null}
          </>
        ) : (
          <TouchableOpacity style={styles.lockRow} onPress={() => setShowSubModal(true)}>
            <Ionicons name="lock-closed-outline" size={16} color="#6B7280" />
            <Text style={styles.lockText}>Subscribe to view contact details</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contact action row */}
      <View style={styles.contactRow}>
        {(['Call', 'WhatsApp', 'Message'] as const).map((label) => {
          const locked = !isSubscribed;
          const icon = label === 'Call' ? 'call-outline' : label === 'WhatsApp' ? 'logo-whatsapp' : 'chatbubble-outline';
          const color = label === 'WhatsApp' ? '#25D366' : meta.color;
          const action = locked
            ? handleLockedContact
            : label === 'Call' ? handleCall
            : label === 'WhatsApp' ? handleWhatsApp
            : handleMessage;
          return (
            <TouchableOpacity
              key={label}
              style={[styles.contactBtn, locked ? styles.contactBtnLocked : { backgroundColor: color }]}
              onPress={action}
              activeOpacity={0.8}
            >
              <Ionicons name={icon as any} size={18} color={locked ? '#9CA3AF' : '#fff'} />
              <Text style={[styles.contactBtnText, locked && { color: '#9CA3AF' }]}>{label}</Text>
              {locked && <Ionicons name="lock-closed" size={12} color="#9CA3AF" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Platform disclaimer */}
      <View style={styles.disclaimerCard}>
        <Ionicons name="information-circle-outline" size={18} color="#92400E" />
        <Text style={styles.disclaimerText}>
          <Text style={{ fontWeight: '700' }}>Important: </Text>
          Xpress Vet is a discovery platform. All service providers are independent and not employed by us.
          Always verify credentials, agree on terms before any service, and report concerns via Support.
        </Text>
      </View>

      {/* Gallery */}
      {prof.images && prof.images.length > 1 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {prof.images.map((img, i) => (
              <Image key={i} source={{ uri: img.url }} style={styles.galleryThumb} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Write a Review */}
      <TouchableOpacity
        style={[styles.writeReviewBtn, { backgroundColor: meta.color }]}
        onPress={() => setShowReviewModal(true)}
      >
        <Text style={styles.writeReviewBtnText}>✍️  Write a Review</Text>
      </TouchableOpacity>

      {/* Reviews */}
      <ReviewsSection
        targetType="professional"
        targetId={prof._id}
        avgRating={prof.rating}
        reviewCount={prof.reviewCount}
        accentColor={meta.color}
        refreshKey={reviewRefreshKey}
        ownerMongoId={prof.userId?._id}
      />

      <WriteReviewModal
        visible={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSuccess={() => { setShowReviewModal(false); setReviewRefreshKey((k) => k + 1); }}
        targetType="professional"
        targetId={prof._id}
        targetName={displayName}
        accentColor={meta.color}
      />

      <SubscriptionPrompt
        visible={showSubModal}
        onClose={() => setShowSubModal(false)}
        onSubscribe={() => {
          setShowSubModal(false);
          try {
            navigation.getParent()?.navigate('SubscriptionScreen');
          } catch {
            navigation.navigate('SubscriptionScreen');
          }
        }}
        message="Subscribe to view contact details and connect with this professional."
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({
  icon, label, value, onPress,
}: { icon: string; label: string; value: string; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 15 },
  errorEmoji:    { fontSize: 48, marginBottom: 12 },
  errorTitle:    { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  errorSubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  retryBtn:      { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText:  { color: '#fff', fontWeight: '700' },

  hero:    { height: 220, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  heroEmoji: { fontSize: 72 },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  rolePill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 4 },
  rolePillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#D1FAE5', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedPillText: { fontSize: 11, fontWeight: '700', color: '#059669' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', gap: 4 },
  ratingStars: { fontSize: 14, color: '#F59E0B' },
  ratingValue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  ratingCount: { fontSize: 13, color: '#6B7280' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  infoIcon: { fontSize: 18, marginRight: 12, width: 24, textAlign: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, color: '#111827', marginTop: 1 },
  infoValueLink: { color: '#2563EB' },

  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  lockText: { fontSize: 13, color: '#6B7280' },

  galleryThumb: { width: 100, height: 80, borderRadius: 8, marginRight: 8 },

  contactRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderRadius: 12,
  },
  contactBtnLocked: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contactBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 18,
    flex: 1,
  },

  writeReviewBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  writeReviewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
