import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Share,
} from 'react-native';
import { getCurrentUser, signOut } from '../api/supabase';
import { apiFetch } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ProfileImageUploader from '../components/ProfileImageUploader';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const ROLE_LABELS: Record<string, string> = {
  vet:                'Veterinarian',
  kennel_owner:       'Kennel Owner',
  shop_owner:         'Shop Owner',
  pet_owner:          'Pet Owner',
  user:               'Pet Owner',
  groomer:            'Groomer',
  trainer:            'Pet Trainer',
  pet_sitter:         'Pet Sitter',
  pet_transport:      'Pet Transport',
  cremation_service:  'Cremation Service',
  agro_vet_supplier:  'Agro-Vet Supplier',
  insurance_provider: 'Insurance Provider',
  pet_pharmacy:       'Pet Pharmacy',
  rescue_center:      'Rescue Center',
  pet_hotel:          'Pet Hotel',
};

interface SubscriptionInfo {
  plan:          string;
  status:        string;
  amount:        number;
  expiresAt:     string;
  daysRemaining: number;
  isActive:      boolean;
  accountType:   'user' | 'professional';
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────
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
export default function ProfileScreen({ navigation }: Props) {
  const [user,                 setUser]                 = useState<any>(null);
  const [loading,              setLoading]              = useState(true);
  const [loggingOut,           setLoggingOut]           = useState(false);
  const [subscription,         setSubscription]         = useState<SubscriptionInfo | null>(null);
  const [subLoading,           setSubLoading]           = useState(false);
  const [referralCode,         setReferralCode]         = useState<string | null>(null);
  const [referralRewards,      setReferralRewards]      = useState(0);
  const [shareMessage,         setShareMessage]         = useState('');
  const [referralLoading,      setReferralLoading]      = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCurrentUser();
      if (data?.user) {
        try {
          const res = await apiFetch('/api/auth/me', { method: 'GET' });
          if (res.ok && res.body?.user) {
            setUser({
              ...data.user,
              ...res.body.user,
              user_metadata: data.user.user_metadata || {},
            });
          } else {
            setUser({ ...data.user, user_metadata: data.user.user_metadata || {} });
          }
        } catch {
          setUser({ ...data.user, user_metadata: data.user.user_metadata || {} });
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
      setSubscription(res.ok && res.body?.data ? res.body.data : null);
    } catch {
      setSubscription(null);
    } finally {
      setSubLoading(false);
    }
  }, []);

  const fetchReferralInfo = useCallback(async () => {
    setReferralLoading(true);
    try {
      const res = await apiFetch('/api/auth/referral-info', { method: 'GET' });
      if (res.ok && res.body?.data) {
        setReferralCode(res.body.data.referralCode ?? null);
        setReferralRewards(res.body.data.referralRewardsEarned ?? 0);
        setShareMessage(res.body.data.shareMessage ?? '');
      }
    } catch {
      // silent — referral info is non-critical
    } finally {
      setReferralLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchSubscription();
    fetchReferralInfo();
  }, [fetchUser, fetchSubscription, fetchReferralInfo]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUser();
      fetchSubscription();
      fetchReferralInfo();
    });
    return unsubscribe;
  }, [navigation, fetchUser, fetchSubscription, fetchReferralInfo]);

  const handleImageUploadSuccess = useCallback((newUrl: string) => {
    setUser((prev: any) => prev ? { ...prev, profileImage: newUrl } : prev);
  }, []);

  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    if (Platform.OS === 'web') {
      try {
        await (navigator as any).clipboard.writeText(referralCode);
        Alert.alert('Copied!', 'Share this code with friends.');
      } catch {
        Alert.alert('Your Code', referralCode);
      }
    } else {
      try { await Share.share({ message: referralCode }); } catch {}
    }
  }, [referralCode]);

  const handleShare = useCallback(async () => {
    if (!shareMessage) return;
    try {
      await Share.share({ message: shareMessage });
    } catch {
      if (Platform.OS === 'web') {
        try {
          await (navigator as any).clipboard.writeText(shareMessage);
          Alert.alert('Copied!', 'Share this with friends.');
        } catch {
          Alert.alert('Share', shareMessage);
        }
      }
    }
  }, [shareMessage]);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    const doLogout = async () => {
      setLoggingOut(true);
      try {
        await AsyncStorage.removeItem('access_token');
        await signOut();
      } catch {
        Alert.alert('Error', 'Failed to log out. Please try again.');
      } finally {
        setLoggingOut(false);
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if ((window as any).confirm('Are you sure you want to log out?')) doLogout();
    } else {
      Alert.alert('Log Out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  // ─── Cancel subscription ───────────────────────────────────────────────────
  const handleCancelSubscription = () => {
    const doCancel = async () => {
      try {
        const res = await apiFetch('/api/subscriptions/cancel', { method: 'DELETE' });
        if (res.ok) {
          Alert.alert('Subscription Cancelled', res.body?.message || 'Your subscription has been cancelled.');
          fetchSubscription();
        } else {
          Alert.alert('Error', res.body?.message || 'Failed to cancel subscription.');
        }
      } catch {
        Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
      }
    };

    if (Platform.OS === 'web') {
      if ((window as any).confirm('Cancel your subscription? You will retain access until the end of your billing period.')) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Cancel Subscription',
        'Are you sure you want to cancel? You will retain access until the end of your billing period.',
        [
          { text: 'Keep Subscription', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: doCancel },
        ],
      );
    }
  };

  // ─── Display helpers ───────────────────────────────────────────────────────
  const getUserDisplayName = () => {
    if (!user) return 'Anonymous User';
    const name =
      user.full_name ??
      user.name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split('@')[0] ??
      user.phone;
    return name?.trim() || 'Anonymous User';
  };

  const getUserPhone = () => user?.phone ?? user?.user_metadata?.phone ?? 'Not provided';
  const getUserEmail = () => user?.email ?? user?.user_metadata?.email ?? 'Not provided';

  const PROF_ROLES = new Set([
    'vet', 'kennel_owner',
    'groomer', 'trainer', 'pet_sitter',
    'pet_transport', 'cremation_service', 'agro_vet_supplier', 'insurance_provider',
    'pet_pharmacy', 'rescue_center', 'pet_hotel',
  ]);
  const isProfessional = PROF_ROLES.has(user?.role ?? '');
  const isShopOwner    = user?.role === 'shop_owner';
  const isVet          = user?.role === 'vet';
  const roleLabel      = ROLE_LABELS[user?.role] ?? 'User';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8610A" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Avatar & name ───────────────────────────────────────────────── */}
      <View style={styles.avatarSection}>
        <ProfileImageUploader
          currentImageUrl={user?.profileImage ?? user?.user_metadata?.profileImage ?? null}
          onUploadSuccess={handleImageUploadSuccess}
        />

        {(user?.role === 'pet_owner' || user?.role === 'user') && (
          <Text style={styles.uploadHint}>
            Tap the photo to change your profile picture.
          </Text>
        )}

        <Text style={styles.userName}>{getUserDisplayName()}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>
      </View>

      {/* ── Subscription card ───────────────────────────────────────────── */}
      {subLoading ? (
        <View style={styles.infoCard}>
          <ActivityIndicator size="small" color="#E8610A" />
        </View>
      ) : subscription ? (
        <View style={[
          styles.subscriptionCard,
          subscription.isActive ? styles.subscriptionCardActive : styles.subscriptionCardInactive,
        ]}>
          <View style={styles.subscriptionHeader}>
            <View>
              <Text style={styles.subscriptionLabel}>SUBSCRIPTION</Text>
              <Text style={styles.subscriptionPlan}>
                {(subscription.plan ?? 'Free').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Text style={styles.subscriptionAmount}>
                ₦{(subscription.amount ?? 0).toLocaleString()}/month
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              subscription.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
            ]}>
              <Text style={[
                styles.statusText,
                subscription.isActive ? styles.statusTextActive : styles.statusTextInactive,
              ]}>
                {(subscription.status ?? 'inactive').toUpperCase()}
              </Text>
            </View>
          </View>

          {subscription.isActive ? (
            <View style={styles.subscriptionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expires in:</Text>
                <Text style={styles.detailValue}>{subscription.daysRemaining} days</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Renewal date:</Text>
                <Text style={styles.detailValue}>
                  {subscription.expiresAt
                    ? new Date(subscription.expiresAt).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : 'N/A'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.expiredText}>
              {subscription.expiresAt
                ? `Expired on ${new Date(subscription.expiresAt).toLocaleDateString('en-NG')}`
                : 'No active subscription'}
            </Text>
          )}

          {subscription.isActive && (
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
              onPress={handleCancelSubscription}
            >
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.noSubscriptionCard}>
          <Text style={styles.noSubEmoji}>⭐</Text>
          <Text style={styles.noSubTitle}>No Active Subscription</Text>
          <Text style={styles.noSubText}>
            Subscribe to unlock all features and unlimited access
          </Text>
          <Pressable
            style={({ pressed }) => [styles.subscribeNowButton, pressed && { opacity: 0.7 }]}
            onPress={() => goToSubscription(navigation)}
          >
            <Text style={styles.subscribeNowText}>View Plans</Text>
          </Pressable>
        </View>
      )}

      {/* ── Account info ────────────────────────────────────────────────── */}
      {user && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <InfoRow icon="📞" label="Phone"   value={getUserPhone()} />
          <InfoRow icon="✉️" label="Email"   value={getUserEmail()} />
          <InfoRow icon="👤" label="Role"    value={roleLabel} />
          <InfoRow icon="🆔" label="User ID" value={`${user.id?.slice(0, 16)}...`} />
        </View>
      )}

      {/* ── Referrals ───────────────────────────────────────────────────── */}
      {user && (
        <View style={styles.referralCard}>
          <Text style={styles.cardTitle}>Refer &amp; Earn</Text>
          <Text style={styles.referralDescription}>
            Share your code — you earn a free month every time a friend subscribes.
          </Text>
          {referralLoading ? (
            <ActivityIndicator size="small" color="#E8610A" style={{ marginVertical: 12 }} />
          ) : referralCode ? (
            <>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCodeLabel}>YOUR CODE</Text>
                <Text selectable style={styles.referralCodeText}>{referralCode}</Text>
              </View>
              <Text style={styles.referralRewardsText}>
                Free months earned: {referralRewards}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.copyButton, pressed && { opacity: 0.8 }]}
                onPress={handleCopyCode}
              >
                <Text style={styles.copyButtonText}>Copy Code</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.shareButton, pressed && { opacity: 0.8 }]}
                onPress={handleShare}
              >
                <Text style={styles.shareButtonText}>Share Invite</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      )}

      {/* ── Professional tools ──────────────────────────────────────────── */}
      {isProfessional && (
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Professional Tools</Text>
          <MenuButton
            emoji="✏️"
            label="Edit Business Info"
            onPress={() => navigation.navigate('ProfessionalOnboarding')}
          />
          <MenuButton
            emoji="⭐"
            label="Manage Subscription"
            onPress={() => goToSubscription(navigation)}
            tint="#F59E0B"
          />
          {isVet && (
            <MenuButton
              emoji="✅"
              label="Verification Status"
              onPress={() => navigation.navigate('VetVerification')}
              tint="#10B981"
            />
          )}
        </View>
      )}

      {/* ── Shop tools ──────────────────────────────────────────────────── */}
      {isShopOwner && (
        <View style={styles.actionsCard}>
          <Text style={styles.cardTitle}>Shop Tools</Text>
          <MenuButton
            emoji="✏️"
            label="Edit Shop Info"
            onPress={() => navigation.navigate('ShopOnboarding')}
          />
          <MenuButton
            emoji="⭐"
            label="Manage Subscription"
            onPress={() => goToSubscription(navigation)}
            tint="#F59E0B"
          />
        </View>
      )}

      {/* ── Register a business ─────────────────────────────────────────── */}
      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Register a Business</Text>
        <MenuButton
          emoji="👨‍⚕️"
          label="Register as Veterinarian"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'vet' })}
          tint="#2563EB"
        />
        <MenuButton
          emoji="🐕"
          label="Register Your Kennel"
          onPress={() => navigation.navigate('KennelOnboarding')}
          tint="#10B981"
        />
        <MenuButton
          emoji="🛒"
          label="Register Your Pet Shop"
          onPress={() => navigation.navigate('ShopOnboarding')}
          tint="#F97316"
        />
        <MenuButton
          emoji="✂️"
          label="Register as Groomer"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'groomer' })}
          tint="#DB2777"
        />
        <MenuButton
          emoji="🎓"
          label="Register as Pet Trainer"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'trainer' })}
          tint="#059669"
        />
        <MenuButton
          emoji="🏠"
          label="Register as Pet Sitter"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'pet_sitter' })}
          tint="#D97706"
        />
        <MenuButton
          emoji="🚐"
          label="Register Pet Transport"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'pet_transport' })}
          tint="#0891B2"
        />
        <MenuButton
          emoji="🕊️"
          label="Register Cremation Service"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'cremation_service' })}
          tint="#64748B"
        />
        <MenuButton
          emoji="🌾"
          label="Register Agro-Vet Store"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'agro_vet_supplier' })}
          tint="#65A30D"
        />
        <MenuButton
          emoji="🛡️"
          label="Register Insurance Provider"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'insurance_provider' })}
          tint="#7C3AED"
        />
        <MenuButton
          emoji="💊"
          label="Register Pet Pharmacy"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'pet_pharmacy' })}
          tint="#0891B2"
        />
        <MenuButton
          emoji="🐾"
          label="Register Rescue Center"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'rescue_center' })}
          tint="#EA580C"
        />
        <MenuButton
          emoji="🏨"
          label="Register Pet Hotel"
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'pet_hotel' })}
          tint="#0D9488"
        />
      </View>

      {/* ── Legal & Support ─────────────────────────────────────────────── */}
      <View style={styles.actionsCard}>
        <Text style={styles.cardTitle}>Legal &amp; Support</Text>
        <MenuButton
          emoji="🔒"
          label="Privacy Policy"
          onPress={() => navigation.navigate('PrivacyPolicy')}
          tint="#6B7280"
        />
        <MenuButton
          emoji="📋"
          label="Terms &amp; Conditions"
          onPress={() => navigation.navigate('Terms')}
          tint="#6B7280"
        />
        <MenuButton
          emoji="❓"
          label="Support / Help"
          onPress={() => navigation.navigate('Support')}
          tint="#2563EB"
        />
      </View>

      {/* ── Logout ──────────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [
          styles.logoutButton,
          pressed && { opacity: 0.7 },
        ]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <Text style={styles.logoutText}>🚪 Log Out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function MenuButton({
  emoji, label, onPress, tint = '#2563EB',
}: {
  emoji: string; label: string; onPress: () => void; tint?: string;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuButton, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconBg, { backgroundColor: tint + '18' }]}>
        <Text style={styles.menuEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: '#F3F4F6' },
  container:  { paddingBottom: 40 },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6',
  },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 15 },

  avatarSection: {
    alignItems:              'center',
    paddingTop:              40,
    paddingBottom:           28,
    backgroundColor:         '#fff',
    borderBottomLeftRadius:  24,
    borderBottomRightRadius: 24,
    marginBottom:            20,
    shadowColor:             '#000',
    shadowOffset:            { width: 0, height: 2 },
    shadowOpacity:           0.06,
    shadowRadius:            8,
    elevation:               3,
  },
  uploadHint: {
    color: '#6B7280', fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 24,
  },
  userName: {
    fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 12, marginBottom: 8,
  },
  roleBadge: {
    backgroundColor:  '#FFF4EE',
    paddingHorizontal: 14,
    paddingVertical:   5,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       '#FDDCCC',
  },
  roleBadgeText: { color: '#E8610A', fontSize: 13, fontWeight: '700' },

  subscriptionCard: {
    marginHorizontal: 16, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 2,
  },
  subscriptionCardActive:   { backgroundColor: '#FFF4EE', borderColor: '#E8610A' },
  subscriptionCardInactive: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  subscriptionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12,
  },
  subscriptionLabel:  { fontSize: 11, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, marginBottom: 4 },
  subscriptionPlan:   { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 2 },
  subscriptionAmount: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  statusBadge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeActive:   { backgroundColor: '#D1FAE5' },
  statusBadgeInactive: { backgroundColor: '#FEE2E2' },
  statusText:         { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  statusTextActive:   { color: '#065F46' },
  statusTextInactive: { color: '#991B1B' },
  subscriptionDetails: { gap: 8 },
  detailRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 13, color: '#6B7280' },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  expiredText: { fontSize: 13, color: '#991B1B', fontStyle: 'italic' },
  cancelButton: {
    marginTop:       12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius:    8,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     '#E5E7EB',
  },
  cancelButtonText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

  noSubscriptionCard: {
    marginHorizontal: 16,
    borderRadius:     16,
    padding:          24,
    marginBottom:     14,
    backgroundColor:  '#fff',
    alignItems:       'center',
    borderWidth:      2,
    borderColor:      '#E5E7EB',
    borderStyle:      'dashed',
  },
  noSubEmoji: { fontSize: 48, marginBottom: 12 },
  noSubTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 6 },
  noSubText:  { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  subscribeNowButton: {
    backgroundColor:   '#E8610A',
    paddingVertical:   12,
    paddingHorizontal: 32,
    borderRadius:      10,
  },
  subscribeNowText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius:     14,
    padding:          16,
    marginBottom:     14,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.06,
    shadowRadius:     4,
    elevation:        2,
  },
  cardTitle: {
    fontSize:        13,
    fontWeight:      '700',
    color:           '#6B7280',
    marginBottom:    14,
    textTransform:   'uppercase',
    letterSpacing:   0.5,
  },
  infoRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoIcon:  { fontSize: 16, marginRight: 10, width: 22 },
  infoLabel: { fontSize: 14, color: '#6B7280', flex: 0.8 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1.2, textAlign: 'right' },

  actionsCard: {
    backgroundColor:  '#fff',
    marginHorizontal: 16,
    borderRadius:     14,
    padding:          16,
    marginBottom:     14,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.06,
    shadowRadius:     4,
    elevation:        2,
  },
  menuButton: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconBg: {
    width:           36,
    height:          36,
    borderRadius:    10,
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     12,
  },
  menuEmoji:   { fontSize: 18 },
  menuLabel:   { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  menuChevron: { fontSize: 20, color: '#9CA3AF', fontWeight: '300' },

  logoutButton: {
    marginHorizontal: 16,
    marginTop:        6,
    backgroundColor:  '#FEF2F2',
    borderWidth:      1.5,
    borderColor:      '#FECACA',
    paddingVertical:  15,
    borderRadius:     14,
    alignItems:       'center',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },

  referralCard: {
    backgroundColor:  '#fff',
    marginHorizontal: 16,
    borderRadius:     14,
    padding:          16,
    marginBottom:     14,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.06,
    shadowRadius:     4,
    elevation:        2,
  },
  referralDescription: {
    fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 14,
  },
  referralCodeBox: {
    backgroundColor:   '#FFF4EE',
    borderRadius:      12,
    paddingVertical:   14,
    paddingHorizontal: 20,
    alignItems:        'center',
    borderWidth:       1.5,
    borderColor:       '#FDDCCC',
    marginBottom:      10,
  },
  referralCodeLabel: {
    fontSize: 10, fontWeight: '800', color: '#E8610A', letterSpacing: 1.2, marginBottom: 4,
  },
  referralCodeText: {
    fontSize: 30, fontWeight: '900', color: '#111827', letterSpacing: 8,
  },
  referralRewardsText: {
    fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 10,
  },
  copyButton: {
    borderWidth:     1.5,
    borderColor:     '#E8610A',
    borderRadius:    10,
    paddingVertical: 12,
    alignItems:      'center',
    marginBottom:    8,
  },
  copyButtonText: { color: '#E8610A', fontSize: 15, fontWeight: '700' },
  shareButton: {
    backgroundColor: '#E8610A',
    borderRadius:    10,
    paddingVertical: 13,
    alignItems:      'center',
  },
  shareButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});