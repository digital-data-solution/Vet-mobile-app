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
  Share,
  Platform,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';
import { toggleFavorite, isFavorite } from '../utils/favorites';
import { addRecentlyViewed } from '../utils/recentlyViewed';
import SubscriptionPrompt from '../components/SubscriptionPrompt';
import ReviewsSection    from '../components/ReviewsSection';
import WriteReviewModal  from '../components/WriteReviewModal';
import GalleryViewer     from '../components/GalleryViewer';

interface Kennel {
  _id?: string;
  name?: string;
  businessName?: string;
  ownerName?: string;
  address?: string;
  phone?: string;
  email?: string;
  specialization?: string;
  description?: string;
  distance?: number;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
  profileImage?: string;
  mediaImages?: { url: string; publicId: string }[];
  userId?: {
    _id?:        string;
    supabaseId?: string;
    name?:       string;
    phone?:      string;
    email?:      string;
    profileImage?: string;
  };
}

export default function KennelProfileScreen({ route, navigation }: any) {
  const kennelId: string | undefined      = route?.params?.kennelId;
  const passedKennel: Kennel | undefined  = route?.params?.kennel;

  const [kennel, setKennel]         = useState<Kennel | null>(passedKennel ?? null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [isPreview, setIsPreview]       = useState(false);
  const [showSubModal, setShowSubModal]         = useState(false);
  const [showReviewModal, setShowReviewModal]   = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isFav, setIsFav] = useState(false);

  const fetchKennel = useCallback(async () => {
    if (!kennelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/v1/kennels/${kennelId}`, { method: 'GET' });
      if (res.ok && res.body?.success && res.body?.data) {
        const data = res.body.data;
        setKennel(data);
        setIsPreview(data.isPreview === true);
        addRecentlyViewed({
          id: data._id, type: 'kennel',
          name: data.businessName || data.name || 'Kennel',
          emoji: '🐕', color: '#7C3AED',
          profileImage: data.profileImage || data.userId?.profileImage,
        }).catch(() => {});
        isFavorite(data._id).then(setIsFav).catch(() => {});
      } else {
        if (!kennel) setError(res.body?.message || 'Could not load kennel profile.');
      }
    } catch {
      if (!kennel) setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [kennelId]);

  useEffect(() => {
    // Always re-fetch — the stub from KennelsScreen comes from an aggregate
    // query that doesn't populate userId, so supabaseId won't be there.
    fetchKennel();
  }, [fetchKennel]);

  const displayName = kennel?.businessName ?? kennel?.name ?? kennel?.userId?.name ?? 'Kennel';
  const phone       = kennel?.phone || kennel?.userId?.phone;
  const email       = kennel?.email || kennel?.userId?.email;
  const services    = kennel?.specialization?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  const canMessage  = !!kennel?.userId?.supabaseId;

  const trackTap = (method: 'phone' | 'whatsapp' | 'email') => {
    if (kennel?._id) {
      apiFetch('/api/v1/track/contact-tap', {
        method: 'POST',
        body: JSON.stringify({ targetId: kennel._id, targetType: 'kennel', method }),
      }).catch(() => {});
    }
  };

  const call = () => {
    if (!phone) return;
    trackTap('phone');
    Linking.openURL(`tel:${phone}`).catch(() =>
      showAlert('Error', 'Unable to open phone app'),
    );
  };

  const emailKennel = () => {
    if (!email) return;
    trackTap('email');
    Linking.openURL(`mailto:${email}`).catch(() =>
      showAlert('Error', 'Unable to open mail app'),
    );
  };

  const whatsApp = () => {
    if (!phone) return;
    trackTap('whatsapp');
    const digits = phone.replace(/\D/g, '').replace(/^0/, '234');
    Linking.openURL(`https://wa.me/${digits}`).catch(() =>
      showAlert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.'),
    );
  };

  const openChat = () => {
    const supabaseId = kennel?.userId?.supabaseId;
    if (!supabaseId) {
      showAlert('Unavailable', 'This kennel cannot be messaged yet.');
      return;
    }
    navigation.navigate('Chat', {
      otherUserId:   supabaseId,
      otherUserName: displayName,
    });
  };

  const shareProfile = async () => {
    if (!kennel?._id) return;
    const profileUrl = `https://xpressvetmarketplace.com/VetProfile?vetId=${kennel._id}`;
    const msg = `Check out ${displayName} on Xpress Vet 🐾\n${kennel.address ? kennel.address + '\n' : ''}${profileUrl}`;
    try {
      if (Platform.OS === 'web') {
        if ((navigator as any).share) {
          await (navigator as any).share({ title: displayName, text: msg, url: profileUrl });
        } else {
          await (navigator as any).clipboard.writeText(profileUrl);
          showAlert('Link Copied!', 'Share this link to let others find this kennel.');
        }
      } else {
        await Share.share({ message: msg, url: profileUrl });
      }
    } catch {}
  };

  const handleFavorite = async () => {
    if (!kennel?._id) return;
    const added = await toggleFavorite({ id: kennel._id, type: 'kennel', name: displayName, address: kennel.address, profileImage: kennel.profileImage || kennel.userId?.profileImage });
    setIsFav(added);
    showAlert(added ? 'Saved!' : 'Removed', added ? `${displayName} added to your favourites.` : `${displayName} removed from favourites.`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading kennel...</Text>
      </View>
    );
  }

  if (error || !kennel) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={52} color="#F59E0B" />
        <Text style={styles.errorTitle}>Kennel Unavailable</Text>
        <Text style={styles.errorText}>{error ?? 'Could not load this kennel.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchKennel}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            {(kennel.profileImage || kennel.userId?.profileImage) ? (
              <Image
                source={{ uri: kennel.profileImage || kennel.userId?.profileImage }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarEmoji}>🐕</Text>
            )}
          </View>
          {kennel.isVerified && (
            <View style={styles.verifiedRing}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
          )}
        </View>

        <Text style={styles.name}>{displayName}</Text>
        {kennel.ownerName && kennel.ownerName !== displayName && (
          <Text style={styles.ownerLabel}>Owner: {kennel.ownerName}</Text>
        )}

        <View style={styles.badgeRow}>
          {kennel.isVerified && (
            <View style={[styles.badge, styles.badgeGreen]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#065F46" />
              <Text style={[styles.badgeText, { color: '#065F46' }]}>Verified</Text>
            </View>
          )}
          {kennel.distance != null && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <Ionicons name="navigate-outline" size={12} color="#2563EB" />
              <Text style={[styles.badgeText, { color: '#2563EB' }]}>
                {kennel.distance.toFixed(1)} km away
              </Text>
            </View>
          )}
        </View>

        {kennel.rating != null && (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= Math.round(kennel.rating!) ? 'star' : 'star-outline'}
                size={16}
                color="#F59E0B"
              />
            ))}
            {kennel.reviewCount != null && (
              <Text style={styles.ratingText}>({kennel.reviewCount} reviews)</Text>
            )}
          </View>
        )}
      </View>

      {/* Share / Favorite */}
      <View style={styles.heroActions}>
        <TouchableOpacity style={styles.heroActionBtn} onPress={shareProfile} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={18} color="#7C3AED" />
          <Text style={[styles.heroActionText, { color: '#7C3AED' }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroActionBtn} onPress={handleFavorite} activeOpacity={0.8}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#EF4444' : '#7C3AED'} />
          <Text style={[styles.heroActionText, { color: isFav ? '#EF4444' : '#7C3AED' }]}>{isFav ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Gallery ──────────────────────────────────────────────────────── */}
      {(kennel.mediaImages ?? []).length > 0 ? (
        <View style={styles.gallerySection}>
          <Text style={styles.cardTitle}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {(kennel.mediaImages ?? []).map((img, i) => (
              <TouchableOpacity key={img.publicId || String(i)} onPress={() => setViewerIndex(i)} activeOpacity={0.85}>
                <Image source={{ uri: img.url }} style={styles.galleryImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <GalleryViewer
        visible={viewerIndex !== null}
        images={kennel.mediaImages ?? []}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />

      {/* ── Services chips ────────────────────────────────────────────────── */}
      {services.length > 0 && (
        <View style={styles.servicesCard}>
          <Text style={styles.cardTitle}>Services Offered</Text>
          <View style={styles.chipsRow}>
            {services.map((service, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Subscription hint */}
      {isPreview && (
        <TouchableOpacity style={styles.subHintBanner} onPress={() => setShowSubModal(true)} activeOpacity={0.85}>
          <Ionicons name="lock-closed" size={15} color="#fff" />
          <Text style={styles.subHintText}>Subscribe to call, WhatsApp or message this kennel — tap to unlock</Text>
          <Ionicons name="chevron-forward" size={15} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ── Contact actions ───────────────────────────────────────────────── */}
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
          {phone && (
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnCall]} onPress={call} activeOpacity={0.8}>
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          )}
          {phone && (
            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: '#25D366' }]} onPress={whatsApp} activeOpacity={0.8}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
          {canMessage ? (
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnOutline]} onPress={openChat} activeOpacity={0.8}>
              <Ionicons name="chatbubble-outline" size={18} color="#7C3AED" />
              <Text style={[styles.contactBtnText, { color: '#7C3AED' }]}>Message</Text>
            </TouchableOpacity>
          ) : email ? (
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnOutline]} onPress={emailKennel} activeOpacity={0.8}>
              <Ionicons name="mail-outline" size={18} color="#7C3AED" />
              <Text style={[styles.contactBtnText, { color: '#7C3AED' }]}>Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* ── Details card ─────────────────────────────────────────────────── */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Details</Text>

        {kennel.address && (
          <DetailRow icon="location-outline" label="Location" value={kennel.address} />
        )}
        {isPreview && (
          <TouchableOpacity style={styles.addressLockRow} onPress={() => setShowSubModal(true)}>
            <Ionicons name="lock-closed-outline" size={12} color="#7C3AED" />
            <Text style={styles.addressLockText}> Subscribe to see exact address</Text>
          </TouchableOpacity>
        )}
        {phone && (
          <DetailRow icon="call-outline" label="Phone" value={phone} />
        )}
        {email && (
          <DetailRow icon="mail-outline" label="Email" value={email} />
        )}
        {!kennel.address && !phone && !email && (
          <Text style={styles.noDetails}>No contact details available.</Text>
        )}
      </View>

      {/* ── About ────────────────────────────────────────────────────────── */}
      {kennel.description && (
        <View style={styles.bioCard}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.bioText}>{kennel.description}</Text>
        </View>
      )}

      {/* ── Safety note ──────────────────────────────────────────────────── */}
      <View style={styles.safetyNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#7C3AED" />
        <Text style={styles.safetyText}>
          Always verify credentials before leaving your pet with any service provider.
        </Text>
      </View>

      {/* ── Reviews ─────────────────────────────────────────────────────────── */}
      {kennel._id ? (
        <>
          <TouchableOpacity
            style={[styles.writeReviewBtn, { borderColor: '#7C3AED' }]}
            onPress={() => setShowReviewModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="star-outline" size={16} color="#7C3AED" />
            <Text style={[styles.writeReviewBtnText, { color: '#7C3AED' }]}>Write a Review</Text>
          </TouchableOpacity>

          <ReviewsSection
            targetType="professional"
            targetId={kennel._id}
            avgRating={kennel.rating}
            reviewCount={kennel.reviewCount}
            accentColor="#7C3AED"
            refreshKey={reviewRefreshKey}
            ownerMongoId={kennel.userId?._id}
          />

          <WriteReviewModal
            visible={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            onSuccess={() => setReviewRefreshKey(k => k + 1)}
            targetType="professional"
            targetId={kennel._id}
            targetName={displayName}
            accentColor="#7C3AED"
          />
        </>
      ) : null}

      {/* ── Subscription gate modal ───────────────────────────────────────── */}
      <Modal visible={showSubModal} transparent animationType="slide" onRequestClose={() => setShowSubModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSubModal(false)} activeOpacity={1}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Premium Feature</Text>
            <Text style={styles.modalMsg}>
              Subscribe to contact this kennel directly — call, WhatsApp, email, or message.
            </Text>
            <TouchableOpacity
              style={styles.modalSubscribeBtn}
              onPress={() => { setShowSubModal(false); navigation.navigate('SubscriptionScreen'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSubscribeBtnText}>Subscribe — from ₦1,500/month</Text>
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

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={16} color="#7C3AED" />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
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
    backgroundColor: '#7C3AED', paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 10, marginBottom: 10,
  },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backBtn:   { paddingVertical: 10 },
  backText:  { color: '#64748B', fontSize: 14 },

  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#DDD6FE',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 46 },
  verifiedRing: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  name:       { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4, textAlign: 'center' },
  ownerLabel: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  badgeRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  heroActions: {
    flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 4, marginBottom: 4, justifyContent: 'center',
  },
  heroActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  heroActionText: { fontSize: 14, fontWeight: '600' },
  subHintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#7C3AED', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  subHintText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 4,
  },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeBlue:  { backgroundColor: '#EFF6FF' },
  badgeText:  { fontSize: 12, fontWeight: '700' },
  ratingRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, color: '#64748B', marginLeft: 4 },

  gallerySection: { marginHorizontal: 16, marginBottom: 14 },
  galleryRow: { gap: 10, paddingRight: 4 },
  galleryImage: {
    width: 100, height: 100, borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  servicesCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#F5F3FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#DDD6FE',
  },
  chipText: { fontSize: 13, color: '#7C3AED', fontWeight: '600' },

  contactRow: {
    flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 14,
  },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 14, gap: 8,
  },
  contactBtnCall:    { backgroundColor: '#7C3AED' },
  contactBtnOutline: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#7C3AED' },
  contactBtnText:    { fontSize: 15, fontWeight: '700', color: '#fff' },

  detailsCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  detailIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F5F3FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1,
  },
  detailContent: { flex: 1 },
  detailLabel: {
    fontSize: 11, color: '#94A3B8', fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2,
  },
  detailValue: { fontSize: 14, color: '#0F172A', fontWeight: '500', lineHeight: 20 },
  noDetails:   { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },

  bioCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 16, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  bioText: { fontSize: 15, color: '#334155', lineHeight: 24 },

  safetyNote: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: 16, backgroundColor: '#FAF5FF', borderRadius: 14,
    padding: 14, gap: 10, borderWidth: 1, borderColor: '#E9D5FF',
  },
  safetyText: { flex: 1, fontSize: 13, color: '#6D28D9', lineHeight: 18 },

  contactBtnLocked: { backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: '#E2E8F0' },
  addressLockRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 },
  addressLockText:  { fontSize: 12, color: '#7C3AED', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle:          { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  modalMsg:            { fontSize: 14, color: '#64748B', lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  modalSubscribeBtn: {
    backgroundColor: '#7C3AED', paddingVertical: 15, borderRadius: 12, alignItems: 'center',
    marginBottom: 12, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  modalSubscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancelBtn:        { alignItems: 'center', paddingVertical: 8 },
  modalCancelText:       { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  writeReviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 12, paddingVertical: 12,
    borderRadius: 10, borderWidth: 1.5, backgroundColor: '#fff',
  },
  writeReviewBtnText: { fontSize: 14, fontWeight: '700' },
});