import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
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
  vet: 'Veterinarian',
  kennel_owner: 'Kennel Owner',
  pet_owner: 'Pet Owner',
  user: 'Pet Owner',
};

interface SubscriptionInfo {
  plan: string;
  status: string;
  amount: number;
  expiresAt: string;
  daysRemaining: number;
  isActive: boolean;
  accountType: 'user' | 'professional';
}

export default function ProfileScreen({ navigation }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCurrentUser();
      if (data?.user) {
        // Get full user details from backend
        const res = await apiFetch('/api/auth/me', { method: 'GET' });
        if (res.ok && res.body?.user) {
          setUser(res.body.user);
        } else {
          setUser({ ...data.user });
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
      if (res.ok && res.body?.data) {
        setSubscription(res.body.data);
      } else {
        setSubscription(null);
      }
    } catch {
      setSubscription(null);
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchSubscription();
  }, [fetchUser, fetchSubscription]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUser();
      fetchSubscription();
    });
    return unsubscribe;
  }, [navigation, fetchUser, fetchSubscription]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
            await AsyncStorage.removeItem('xp_token');
            navigation.replace('Auth');
          } catch {
            Alert.alert('Error', 'Failed to log out. Please try again.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiFetch('/api/subscriptions/cancel', {
                method: 'DELETE',
              });
              
              if (res.ok) {
                Alert.alert('Subscription Cancelled', res.body?.message || 'Your subscription has been cancelled.');
                fetchSubscription(); // Refresh
              } else {
                Alert.alert('Error', res.body?.message || 'Failed to cancel subscription.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            }
          },
        },
      ]
    );
  };

  const isProfessional = user?.role === 'vet' || user?.role === 'kennel_owner';
  const roleLabel = ROLE_LABELS[user?.role] ?? 'User';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
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
      {/* Avatar & name */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>{isProfessional ? '👨‍⚕️' : '🐾'}</Text>
        </View>
        
        {/* Profile image uploader */}
        <ProfileImageUploader 
          onUploadSuccess={(url) => {
            console.log('Profile image uploaded:', url);
            // Optionally refresh user data
          }} 
        />
        
        <Text style={styles.userName}>
          {user?.full_name || user?.name || user?.phone || 'Anonymous User'}
        </Text>
        
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{roleLabel}</Text>
        </View>
      </View>

      {/* Subscription Status Card */}
      {subLoading ? (
        <View style={styles.infoCard}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : subscription ? (
        <View style={[
          styles.subscriptionCard,
          subscription.isActive ? styles.subscriptionCardActive : styles.subscriptionCardInactive
        ]}>
          <View style={styles.subscriptionHeader}>
            <View>
              <Text style={styles.subscriptionLabel}>SUBSCRIPTION</Text>
              <Text style={styles.subscriptionPlan}>
                {subscription.plan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Text style={styles.subscriptionAmount}>
                ₦{subscription.amount.toLocaleString()}/month
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              subscription.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
            ]}>
              <Text style={[
                styles.statusText,
                subscription.isActive ? styles.statusTextActive : styles.statusTextInactive
              ]}>
                {subscription.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          {subscription.isActive ? (
            <View style={styles.subscriptionDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expires in:</Text>
                <Text style={styles.detailValue}>
                  {subscription.daysRemaining} days
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Renewal date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(subscription.expiresAt).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.expiredText}>
              Expired on {new Date(subscription.expiresAt).toLocaleDateString('en-NG')}
            </Text>
          )}

          {subscription.isActive && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSubscription}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.noSubscriptionCard}>
          <Text style={styles.noSubEmoji}>⭐</Text>
          <Text style={styles.noSubTitle}>No Active Subscription</Text>
          <Text style={styles.noSubText}>
            Subscribe to unlock all features and unlimited access
          </Text>
          <TouchableOpacity
            style={styles.subscribeNowButton}
            onPress={() => navigation.navigate('Subscription')}
            activeOpacity={0.85}
          >
            <Text style={styles.subscribeNowText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Account info */}
      {user && (
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <InfoRow icon="📞" label="Phone" value={user.phone || 'N/A'} />
          <InfoRow icon="✉️" label="Email" value={user.email || 'N/A'} />
          <InfoRow icon="👤" label="Role" value={roleLabel} />
        </View>
      )}

      {/* Professional actions */}
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
            onPress={() => navigation.navigate('Subscription')}
            tint="#F59E0B"
          />
          <MenuButton
            emoji="✅"
            label="Verification Status"
            onPress={() => navigation.navigate('VetVerification')}
            tint="#10B981"
          />
        </View>
      )}

      {/* Register a business */}
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
          onPress={() => navigation.navigate('ProfessionalOnboarding', { role: 'kennel' })}
          tint="#10B981"
        />
        <MenuButton
          emoji="🛒"
          label="Register Your Pet Shop"
          onPress={() => navigation.navigate('ShopOnboardingScreen')}
          tint="#F97316"
        />
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loggingOut}
        activeOpacity={0.85}
      >
        {loggingOut ? (
          <ActivityIndicator size="small" color="#EF4444" />
        ) : (
          <Text style={styles.logoutText}>🚪 Log Out</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuButton({
  emoji,
  label,
  onPress,
  tint = '#2563EB',
}: {
  emoji: string;
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <TouchableOpacity style={styles.menuButton} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconBg, { backgroundColor: tint + '18' }]}>
        <Text style={styles.menuEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingBottom: 40 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 15 },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  avatarEmoji: { fontSize: 40 },
  userName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  roleBadgeText: { color: '#2563EB', fontSize: 13, fontWeight: '700' },
  
  // Subscription card styles
  subscriptionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 2,
  },
  subscriptionCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  subscriptionCardInactive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subscriptionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subscriptionPlan: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  subscriptionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextInactive: {
    color: '#991B1B',
  },
  subscriptionDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  expiredText: {
    fontSize: 13,
    color: '#991B1B',
    fontStyle: 'italic',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  
  // No subscription card
  noSubscriptionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 24,
    marginBottom: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noSubEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  noSubTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  noSubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  subscribeNowButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  subscribeNowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  
  infoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#6B7280', 
    marginBottom: 14, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F3F4F6' 
  },
  infoIcon: { fontSize: 16, marginRight: 10, width: 22 },
  infoLabel: { fontSize: 14, color: '#6B7280', flex: 0.8 },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1.2, textAlign: 'right' },
  actionsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuEmoji: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  menuChevron: { fontSize: 20, color: '#9CA3AF', fontWeight: '300' },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});