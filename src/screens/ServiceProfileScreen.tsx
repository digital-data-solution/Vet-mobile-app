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
  Modal,
  Share,
  Platform,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';
import { toggleFavorite, isFavorite } from '../utils/favorites';
import { addRecentlyViewed } from '../utils/recentlyViewed';
import SubscriptionPrompt from '../components/SubscriptionPrompt';
import ReviewsSection from '../components/ReviewsSection';
import WriteReviewModal from '../components/WriteReviewModal';
import GalleryViewer from '../components/GalleryViewer';

type ProfRole =
  | 'groomer' | 'trainer' | 'pet_sitter'
  | 'pet_transport' | 'cremation_service' | 'agro_vet_supplier' | 'insurance_provider'
  | 'pet_pharmacy' | 'rescue_center' | 'pet_hotel' | 'farm';

const ROLE_META: Record<string, { label: string; emoji: string; color: string; avatarBg: string }> = {
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
  profileImage?: string;
  mediaImages?: { url: string; publicId: string }[];
  businessHours?: string;
  priceRange?: 'low' | 'mid' | 'high';
  acceptingClients?: boolean;
  socialMedia?: { instagram?: string; facebook?: string; twitter?: string; website?: string };
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
  const [currentPlan, setCurrentPlan]     = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [isFav, setIsFav] = useState(false);

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
        const data = profRes.body.data;
        setProf(data);
        const roleMeta = ROLE_META[data.role] ?? { emoji: '🐾', color: '#2563EB' };
        addRecentlyViewed({
          id: data._id, type: 'professional',
          name: data.businessName || data.name || 'Professional',
          role: data.role, emoji: roleMeta.emoji, color: roleMeta.color,
        }).catch(() => {});
        isFavorite(data._id).then(setIsFav).catch(() => {});
      } else {
        setError(profRes.body?.message || 'Professional not found.');
      }

      const subData = subRes.body?.data;
      setIsSubscribed(subRes.ok && subData?.isActive === true);
      setCurrentPlan(subData?.plan ?? null);
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
      showAlert('Error', 'Unable to open phone app.'),
    );
  };

  const handleWhatsApp = () => {
    if (!phone) return;
    const digits = phone.replace(/\D/g, '').replace(/^0/, '234');
    Linking.openURL(`https://wa.me/${digits}`).catch(() =>
      showAlert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.'),
    );
  };

  const handleMessage = () => {
    const targetId = prof.userId?._id || prof.userId?.supabaseId;
    if (!targetId) {
      showAlert('Unavailable', 'This service provider has not enabled in-app messaging yet.');
      return;
    }
    try {
      navigation.getParent()?.navigate('Chat', { otherUserId: targetId, otherUserName: displayName });
    } catch {
      navigation.navigate('Chat', { otherUserId: targetId, otherUserName: displayName });
    }
  };

  const handleLockedContact = () => setShowSubModal(true);

  const copyToClipboard = async (text: string) => {
    try {
      if (Platform.OS === 'web') {
        await (navigator as any).clipboard.writeText(text);
        showAlert('Copied!', 'Phone number copied to clipboard.');
      } else {
        await Share.share({ message: text });
      }
    } catch {}
  };

  const shareProfile = async () => {
    const profileUrl = `https://xpressvetmarketplace.com/VetProfile?vetId=${prof._id}`;
    const msg = `Check out ${displayName} on Xpress Vet 🐾\n${prof.address ? prof.address + '\n' : ''}${profileUrl}`;
    try {
      if (Platform.OS === 'web') {
        if ((navigator as any).share) {
          await (navigator as any).share({ title: displayName, text: msg, url: profileUrl });
        } else {
          await (navigator as any).clipboard.writeText(profileUrl);
          showAlert('Link Copied!', 'Share this link to let others find this profile.');
        }
      } else {
        await Share.share({ message: msg, url: profileUrl });
      }
    } catch {}
  };

  const handleFavorite = async () => {
    const added = await toggleFavorite({ id: prof._id, type: 'professional', name: displayName, role: prof.role, address: prof.address });
    setIsFav(added);
    showAlert(added ? 'Saved!' : 'Removed', added ? `${displayName} added to your favourites.` : `${displayName} removed from favourites.`);
  };

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: meta.avatarBg }]}>
        {(prof.profileImage || prof.userId?.profileImage || prof.mediaImages?.[0]?.url) ? (
          <Image
            source={{ uri: prof.profileImage || prof.userId?.profileImage || prof.mediaImages?.[0]?.url }}
            style={styles.heroImage}
          />
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
          <View style={styles.heroBadgeRow}>
            {prof.acceptingClients === false ? (
              <View style={[styles.heroBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700' }}>Not accepting clients</Text>
              </View>
            ) : prof.acceptingClients === true ? (
              <View style={[styles.heroBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '700' }}>Accepting clients</Text>
              </View>
            ) : null}
            {prof.priceRange ? (
              <View style={[styles.heroBadge, { backgroundColor: '#F1F5F9' }]}>
                <Text style={{ fontSize: 11, color: '#334155', fontWeight: '700' }}>
                  {prof.priceRange === 'low' ? '₦' : prof.priceRange === 'mid' ? '₦₦' : '₦₦₦'}
                </Text>
              </View>
            ) : null}
          </View>
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

      {/* Share / Favorite */}
      <View style={styles.heroActions}>
        <TouchableOpacity style={styles.heroActionBtn} onPress={shareProfile} activeOpacity={0.8}>
          <Ionicons name="share-social-outline" size={18} color={meta.color} />
          <Text style={[styles.heroActionText, { color: meta.color }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroActionBtn} onPress={handleFavorite} activeOpacity={0.8}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? '#EF4444' : meta.color} />
          <Text style={[styles.heroActionText, { color: isFav ? '#EF4444' : meta.color }]}>{isFav ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      {/* Details card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>About</Text>
        {prof.specialization ? (
          <View style={styles.chipSection}>
            <Text style={styles.chipSectionLabel}>Services</Text>
            <View style={styles.chipRow}>
              {prof.specialization.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).map((chip) => (
                <View key={chip} style={[styles.chip, { backgroundColor: meta.color + '15', borderColor: meta.color + '30' }]}>
                  <Text style={[styles.chipText, { color: meta.color }]}>{chip}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <InfoRow icon="📍" label="Address" value={prof.address} />
        {prof.businessHours ? <InfoRow icon="🕐" label="Hours" value={prof.businessHours} /> : null}

        {isSubscribed ? (
          <>
            {phone ? <InfoRow icon="📞" label="Phone" value={phone} onPress={() => Linking.openURL(`tel:${phone}`)} onLongPress={() => copyToClipboard(phone)} /> : null}
            {email ? <InfoRow icon="✉️" label="Email" value={email} onPress={() => Linking.openURL(`mailto:${email}`)} /> : null}
          </>
        ) : (
          <TouchableOpacity style={styles.lockRow} onPress={() => setShowSubModal(true)}>
            <Ionicons name="lock-closed-outline" size={16} color="#6B7280" />
            <Text style={styles.lockText}>
              {currentPlan ? 'Upgrade your plan to view contact details' : 'Subscribe to view contact details'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Subscription hint for locked contacts */}
      {!isSubscribed && (
        <TouchableOpacity style={[styles.subHintBanner, { backgroundColor: meta.color }]} onPress={() => setShowSubModal(true)} activeOpacity={0.85}>
          <Ionicons name="lock-closed" size={15} color="#fff" />
          <Text style={styles.subHintText}>Subscribe to call, WhatsApp or message this {meta.label.toLowerCase()} — tap to unlock</Text>
          <Ionicons name="chevron-forward" size={15} color="#fff" />
        </TouchableOpacity>
      )}

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

      {/* Social media */}
      {(prof.socialMedia?.instagram || prof.socialMedia?.facebook || prof.socialMedia?.twitter || prof.socialMedia?.website) ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Follow Us</Text>
          <View style={styles.socialRow}>
            {prof.socialMedia.instagram ? (
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#E4405F' }]} onPress={() => Linking.openURL(prof.socialMedia!.instagram!).catch(() => {})} activeOpacity={0.8}>
                <Ionicons name="logo-instagram" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}
            {prof.socialMedia.facebook ? (
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1877F2' }]} onPress={() => Linking.openURL(prof.socialMedia!.facebook!).catch(() => {})} activeOpacity={0.8}>
                <Ionicons name="logo-facebook" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}
            {prof.socialMedia.twitter ? (
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#1DA1F2' }]} onPress={() => Linking.openURL(prof.socialMedia!.twitter!).catch(() => {})} activeOpacity={0.8}>
                <Ionicons name="logo-twitter" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}
            {prof.socialMedia.website ? (
              <TouchableOpacity style={[styles.socialBtn, { backgroundColor: meta.color }]} onPress={() => Linking.openURL(prof.socialMedia!.website!).catch(() => {})} activeOpacity={0.8}>
                <Ionicons name="globe-outline" size={20} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

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
      {prof.mediaImages && prof.mediaImages.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {prof.mediaImages.map((img, i) => (
              <TouchableOpacity key={img.publicId || String(i)} onPress={() => setViewerIndex(i)} activeOpacity={0.85}>
                <Image source={{ uri: img.url }} style={styles.galleryThumb} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <GalleryViewer
        visible={viewerIndex !== null}
        images={prof.mediaImages ?? []}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />

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

      <Modal visible={showSubModal} transparent animationType="slide" onRequestClose={() => setShowSubModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowSubModal(false)} activeOpacity={1}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {currentPlan ? 'Upgrade Required' : 'Premium Feature'}
            </Text>
            <Text style={styles.modalMsg}>
              {currentPlan
                ? `Your current plan doesn't include contact access. Upgrade to connect with this professional directly.`
                : 'Subscribe to view contact details and connect with this professional directly.'}
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, currentPlan ? { backgroundColor: '#7C3AED' } : {}]}
              onPress={() => {
                setShowSubModal(false);
                try { navigation.getParent()?.navigate('SubscriptionScreen'); } catch { navigation.navigate('SubscriptionScreen'); }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>
                {currentPlan ? 'View Upgrade Options' : 'Subscribe — from ₦1,500/month'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowSubModal(false)}>
              <Text style={styles.modalCancelText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({
  icon, label, value, onPress, onLongPress,
}: { icon: string; label: string; value: string; onPress?: () => void; onLongPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      activeOpacity={(onPress || onLongPress) ? 0.7 : 1}
    >
      <Text style={styles.infoIcon}>{icon}</Text>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, onPress && styles.infoValueLink]}>{value}</Text>
      </View>
      {onLongPress && !onPress ? <Ionicons name="copy-outline" size={14} color="#9CA3AF" /> : null}
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
  heroBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  heroBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  heroActions: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10,
    justifyContent: 'center', backgroundColor: '#fff',
  },
  heroActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  heroActionText: { fontSize: 14, fontWeight: '600' },
  subHintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 6,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  subHintText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },

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

  chipSection: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 4 },
  chipSectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
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

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  modalMsg: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },
  modalBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancel: { alignItems: 'center', paddingVertical: 8 },
  modalCancelText: { fontSize: 14, color: '#6B7280' },
});
