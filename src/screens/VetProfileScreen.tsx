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
  Modal,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';
import SubscriptionPrompt from '../components/SubscriptionPrompt';
import ReviewsSection    from '../components/ReviewsSection';
import WriteReviewModal  from '../components/WriteReviewModal';

interface Professional {
  _id: string;
  name: string;
  businessName?: string;
  role: 'vet' | 'kennel';
  vcnNumber?: string;
  specialization?: string;
  address: string;
  phone?: string;
  email?: string;
  isVerified: boolean;
  isActive?: boolean;
  rating?: number;
  reviewCount?: number;
  distance?: number;
  licenseExpiry?: string;
  profileImage?: string;
  mediaImages?: { url: string; publicId: string }[];
  images?: { url: string; publicId: string }[];
  userId?: {
    _id?:        string;
    supabaseId?: string;
    name?:       string;
    phone?:      string;
    email?:      string;
    profileImage?: string;
  };
}

export default function VetProfileScreen({ route, navigation }: any) {
  const vetId: string | undefined = route?.params?.vetId;

  const [vet, setVet]           = useState<Professional | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [isPreview, setIsPreview]           = useState(false);
  const [viewerPlan, setViewerPlan]         = useState<string | null>(null);
  const [showSubModal, setShowSubModal]     = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);

  const fetchVet = useCallback(async () => {
    if (!vetId) {
      setError('No professional ID provided.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/professionals/${vetId}`, { method: 'GET' });
      if (res.ok && res.body?.success && res.body?.data) {
        setVet(res.body.data);
        setIsPreview(res.body.data.isPreview === true);
        setViewerPlan(res.body.data.viewerPlan ?? null);
      } else {
        setError(res.body?.message || 'Could not load professional profile.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [vetId]);

  useEffect(() => {
    fetchVet();
  }, [fetchVet]);

  const trackTap = (method: 'phone' | 'whatsapp' | 'email') => {
    if (vet?._id) {
      apiFetch('/api/v1/track/contact-tap', {
        method: 'POST',
        body: JSON.stringify({ targetId: vet._id, targetType: 'professional', method }),
      }).catch(() => {});
    }
  };

  const call = () => {
    const phone = vet?.phone || vet?.userId?.phone;
    if (!phone) return;
    trackTap('phone');
    Linking.openURL(`tel:${phone}`).catch(() =>
      showAlert('Error', 'Unable to open phone app.'),
    );
  };

  const emailVet = () => {
    const emailAddr = vet?.email || vet?.userId?.email;
    if (!emailAddr) return;
    trackTap('email');
    Linking.openURL(`mailto:${emailAddr}`).catch(() =>
      showAlert('Error', 'Unable to open mail app.'),
    );
  };

  const whatsApp = () => {
    const rawPhone = vet?.phone || vet?.userId?.phone;
    if (!rawPhone) return;
    trackTap('whatsapp');
    const digits = rawPhone.replace(/\D/g, '').replace(/^0/, '234');
    Linking.openURL(`https://wa.me/${digits}`).catch(() =>
      showAlert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.'),
    );
  };

  const openChat = () => {
    const supabaseId = vet?.userId?.supabaseId;
    if (!supabaseId) {
      showAlert('Unavailable', 'This professional cannot be messaged yet.');
      return;
    }
    const displayName = vet?.businessName || vet?.name || vet?.userId?.name || 'Professional';
    navigation.navigate('Chat', {
      otherUserId:   supabaseId,
      otherUserName: displayName,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error || !vet) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={52} color="#F59E0B" />
        <Text style={styles.errorTitle}>Profile Unavailable</Text>
        <Text style={styles.errorText}>{error ?? 'Could not load this profile.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchVet}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName  = vet.businessName || vet.name || vet.userId?.name || 'Professional';
  const phone        = vet.phone || vet.userId?.phone;
  const email        = vet.email || vet.userId?.email;
  const isVet        = vet.role === 'vet';
  const roleLabel    = isVet ? 'Veterinarian' : 'Kennel';
  const accentColor  = isVet ? '#2563EB' : '#7C3AED';
  const heroBg       = isVet ? '#EFF6FF' : '#F5F3FF';
  const canMessage   = !!vet.userId?.supabaseId;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <View style={[styles.hero, { backgroundColor: heroBg }]}>
        <View style={[styles.avatarWrap, { borderColor: accentColor + '30' }]}>
          {(vet.profileImage || vet.userId?.profileImage) ? (
            <Image
              source={{ uri: vet.profileImage || vet.userId?.profileImage }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarEmoji}>{isVet ? '👨‍⚕️' : '🐕'}</Text>
          )}
          {vet.isVerified && (
            <View style={styles.verifiedRing}>
              <Ionicons name="checkmark-circle" size={26} color="#10B981" />
            </View>
          )}
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <View style={[styles.roleBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}>
          <Text style={[styles.roleBadgeText, { color: accentColor }]}>{roleLabel}</Text>
        </View>

        {vet.specialization ? (
          <Text style={styles.specialization}>{vet.specialization}</Text>
        ) : null}

        <View style={styles.badgeRow}>
          {vet.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#065F46" />
              <Text style={styles.verifiedBadgeText}>{isVet ? 'VCN Verified' : 'Verified'}</Text>
            </View>
          )}
          {vet.distance != null && (
            <View style={styles.distanceBadge}>
              <Ionicons name="navigate-outline" size={13} color="#2563EB" />
              <Text style={styles.distanceBadgeText}>{vet.distance.toFixed(1)} km away</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Gallery ─────────────────────────────────────────────────────────── */}
      {(vet.mediaImages ?? []).length > 0 ? (
        <View style={styles.gallerySection}>
          <Text style={styles.gallerySectionTitle}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {(vet.mediaImages ?? []).map((img, i) => (
              <Image
                key={img.publicId || String(i)}
                source={{ uri: img.url }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Contact actions ─────────────────────────────────────────────────── */}
      {isPreview ? (
        <View style={styles.contactRow}>
          {(['Call', 'WhatsApp', 'Message'] as const).map((label) => (
            <TouchableOpacity
              key={label}
              style={[styles.contactBtn, styles.contactBtnLocked]}
              onPress={() => setShowSubModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={label === 'Call' ? 'call-outline' : label === 'WhatsApp' ? 'logo-whatsapp' : 'chatbubble-outline'}
                size={18} color="#9CA3AF"
              />
              <Text style={[styles.contactBtnText, { color: '#9CA3AF' }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (phone || email || canMessage) ? (
        <View style={styles.contactRow}>
          {phone ? (
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: accentColor }]} onPress={call} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          ) : null}
          {phone ? (
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#25D366' }]} onPress={whatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}
          {canMessage ? (
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnOutline, { borderColor: accentColor }]} onPress={openChat} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={18} color={accentColor} />
              <Text style={[styles.contactBtnText, { color: accentColor }]}>Message</Text>
            </TouchableOpacity>
          ) : null}
          {email && !canMessage ? (
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnOutline, { borderColor: accentColor }]} onPress={emailVet} activeOpacity={0.8}>
              <Ionicons name="mail-outline" size={18} color={accentColor} />
              <Text style={[styles.contactBtnText, { color: accentColor }]}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* ── Details ─────────────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>

        <InfoRow icon="location-outline" label="Address" value={vet.address} />
        {isPreview && (
          <TouchableOpacity style={styles.addressLockRow} onPress={() => setShowSubModal(true)}>
            <Ionicons name="lock-closed-outline" size={12} color="#2563EB" />
            <Text style={styles.addressLockText}> Subscribe to see exact address</Text>
          </TouchableOpacity>
        )}

        {phone ? (
          <InfoRow icon="call-outline" label="Phone" value={phone} />
        ) : null}

        {email ? (
          <InfoRow icon="mail-outline" label="Email" value={email} />
        ) : null}

        {vet.vcnNumber ? (
          <InfoRow icon="card-outline" label="VCN Number" value={vet.vcnNumber} />
        ) : null}

        {vet.licenseExpiry ? (
          <InfoRow
            icon="calendar-outline"
            label="License Expires"
            value={new Date(vet.licenseExpiry).toLocaleDateString('en-NG', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          />
        ) : null}

        {vet.rating != null && vet.reviewCount != null ? (
          <InfoRow
            icon="star-outline"
            label="Rating"
            value={`${vet.rating.toFixed(1)} / 5 (${vet.reviewCount} review${vet.reviewCount !== 1 ? 's' : ''})`}
          />
        ) : null}
      </View>

      {/* ── Verification notice ─────────────────────────────────────────────── */}
      {vet.isVerified ? (
        <View style={styles.verifiedCard}>
          <Ionicons name="shield-checkmark" size={22} color="#065F46" />
          <View style={{ flex: 1 }}>
            <Text style={styles.verifiedCardTitle}>
              {isVet ? 'VCN-Verified Veterinarian' : 'Verified Professional'}
            </Text>
            <Text style={styles.verifiedCardText}>
              {isVet
                ? 'This vet is registered with the Veterinary Council of Nigeria and has been verified by Xpress Vet.'
                : 'This kennel has been reviewed and verified by the Xpress Vet team.'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.unverifiedCard}>
          <Ionicons name="information-circle-outline" size={22} color="#92400E" />
          <View style={{ flex: 1 }}>
            <Text style={styles.unverifiedCardTitle}>Verification Pending</Text>
            <Text style={styles.unverifiedCardText}>
              This professional's credentials are still under review.
            </Text>
          </View>
        </View>
      )}

      {/* ── Reviews ─────────────────────────────────────────────────────────── */}
      {vet._id ? (
        <>
          <TouchableOpacity
            style={[styles.writeReviewBtn, { borderColor: accentColor }]}
            onPress={() => setShowReviewModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={16} color={accentColor} />
            <Text style={[styles.writeReviewBtnText, { color: accentColor }]}>Write a Review</Text>
          </TouchableOpacity>

          <ReviewsSection
            targetType="professional"
            targetId={vet._id}
            avgRating={vet.rating}
            reviewCount={vet.reviewCount}
            accentColor={accentColor}
            refreshKey={reviewRefreshKey}
            ownerMongoId={vet.userId?._id}
          />

          <WriteReviewModal
            visible={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            onSuccess={() => setReviewRefreshKey(k => k + 1)}
            targetType="professional"
            targetId={vet._id}
            targetName={displayName}
            accentColor={accentColor}
          />
        </>
      ) : null}

      {/* ── Subscription gate modal ───────────────────────────────────────── */}
      <Modal visible={showSubModal} transparent animationType="slide" onRequestClose={() => setShowSubModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowSubModal(false)}
          activeOpacity={1}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {viewerPlan ? 'Upgrade Required' : 'Premium Feature'}
            </Text>
            <Text style={styles.modalMsg}>
              {viewerPlan
                ? `Your current plan doesn't include contact access. Upgrade to reach this ${isVet ? 'vet' : 'kennel'} directly.`
                : `Subscribe to contact this ${isVet ? 'vet' : 'kennel'} directly — call, WhatsApp, email, or message.`}
            </Text>
            <TouchableOpacity
              style={[styles.modalSubscribeBtn, viewerPlan ? { backgroundColor: '#7C3AED' } : {}]}
              onPress={() => { setShowSubModal(false); navigation.navigate('SubscriptionScreen'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSubscribeBtnText}>
                {viewerPlan ? 'View Upgrade Options' : 'Subscribe — from ₦1,500/month'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowSubModal(false)}>
              <Text style={styles.modalCancelText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  scroll:     { flex: 1, backgroundColor: '#F8FAFC' },
  container:  { paddingBottom: 40 },

  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC', paddingHorizontal: 32,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: '#64748B' },
  errorTitle:  { fontSize: 20, fontWeight: '700', color: '#0F172A', marginTop: 16, marginBottom: 8 },
  errorText:   { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  retryBtn: {
    backgroundColor: '#2563EB', paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 10, marginBottom: 10,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backBtn:  { paddingVertical: 10 },
  backText: { color: '#64748B', fontSize: 14 },

  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },
  avatarEmoji: { fontSize: 42 },
  avatarImage: { width: 90, height: 90, borderRadius: 24 },
  verifiedRing: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 13,
  },
  name: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  roleBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginBottom: 8,
  },
  roleBadgeText: { fontSize: 13, fontWeight: '700' },
  specialization: {
    fontSize: 14, color: '#64748B', textAlign: 'center',
    marginBottom: 12, lineHeight: 20,
  },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  verifiedBadgeText: { fontSize: 12, color: '#065F46', fontWeight: '700' },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  distanceBadgeText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },

  contactRow: {
    flexDirection: 'row', marginHorizontal: 16,
    gap: 10, marginBottom: 16,
  },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 12, gap: 8,
  },
  contactBtnOutline: {
    backgroundColor: '#fff', borderWidth: 1.5,
  },
  contactBtnLocked: {
    backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  contactBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  addressLockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  addressLockText: { fontSize: 12, color: '#2563EB', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  modalMsg:   { fontSize: 14, color: '#64748B', lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  modalSubscribeBtn: {
    backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  modalSubscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },

  card: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '800', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { fontSize: 13, color: '#64748B', flex: 0.7, marginLeft: 4 },
  infoValue: { fontSize: 13, color: '#0F172A', fontWeight: '600', flex: 1.3, textAlign: 'right' },

  verifiedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#ECFDF5', marginHorizontal: 16, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#A7F3D0', marginBottom: 14,
  },
  verifiedCardTitle: { fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 4 },
  verifiedCardText:  { fontSize: 13, color: '#047857', lineHeight: 19 },

  unverifiedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFFBEB', marginHorizontal: 16, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 14,
  },
  unverifiedCardTitle: { fontSize: 14, fontWeight: '700', color: '#92400E', marginBottom: 4 },
  unverifiedCardText:  { fontSize: 13, color: '#78350F', lineHeight: 19 },

  gallerySection: { marginHorizontal: 16, marginBottom: 16 },
  gallerySectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  galleryRow: { gap: 10, paddingRight: 4 },
  galleryImage: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  writeReviewBtn: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    gap:               6,
    marginHorizontal:  16,
    marginBottom:      12,
    paddingVertical:   12,
    borderRadius:      10,
    borderWidth:       1.5,
    backgroundColor:   '#fff',
  },
  writeReviewBtnText: { fontSize: 14, fontWeight: '700' },
});