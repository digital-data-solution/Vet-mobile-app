import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { apiFetch } from '../api/client';
import { getCurrentUser } from '../api/supabase';

interface SubscriptionInfo {
  plan: string;
  status: string;
  amount: number;
  expiresAt: string;
  daysRemaining: number;
  isActive: boolean;
}

const PET_OWNER_PRICE = 500;
const PROFESSIONAL_PRICE = 3000;

// How long to poll after the user taps "Pay Now", in ms
const POLL_INTERVAL = 4000;
const POLL_MAX_ATTEMPTS = 10; // ~40 seconds total

export default function SubscriptionScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [currentSub, setCurrentSub] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(false); // user opened browser but hasn't paid yet

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ─── Role check ────────────────────────────────────────────────────────────

  const checkUserRole = useCallback(async () => {
    try {
      const { data } = await getCurrentUser();
      if (!data?.user) return;
      const role = data.user.user_metadata?.role || data.user.role;
      setIsProfessional(['vet', 'kennel_owner', 'shop_owner'].includes(role));
    } catch (error) {
      console.error('Error checking user role:', error);
    } finally {
      setCheckingRole(false);
    }
  }, []);

  // ─── Fetch subscription ────────────────────────────────────────────────────

  const fetchCurrentSubscription = useCallback(async (): Promise<SubscriptionInfo | null> => {
    setSubLoading(true);
    try {
      const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
      if (res.ok && res.body?.data) {
        const data: SubscriptionInfo = res.body.data;
        setCurrentSub(data);
        return data;
      }
      setCurrentSub(null);
      return null;
    } catch {
      setCurrentSub(null);
      return null;
    } finally {
      setSubLoading(false);
    }
  }, []);

  // ─── Polling after payment redirect ────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  const pollForActivation = useCallback(() => {
    if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
      stopPolling();
      setPendingPayment(false);
      Alert.alert(
        'Still Processing',
        'Your payment may still be processing. Check back in a few minutes or contact support if payment was deducted.',
        [{ text: 'OK' }],
      );
      return;
    }

    pollAttemptsRef.current += 1;

    pollTimerRef.current = setTimeout(async () => {
      const sub = await fetchCurrentSubscription();
      if (sub?.isActive) {
        stopPolling();
        setPendingPayment(false);
        Alert.alert('🎉 Subscription Active!', 'Your payment was confirmed. You now have full access.', [
          { text: 'Continue' },
        ]);
      } else {
        pollForActivation(); // keep going
      }
    }, POLL_INTERVAL);
  }, [fetchCurrentSubscription, stopPolling]);

  // ─── Resume polling when the app comes back to foreground ─────────────────

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const comingToForeground =
        appStateRef.current.match(/inactive|background/) && nextState === 'active';
      appStateRef.current = nextState;

      if (comingToForeground && pendingPayment) {
        // User returned from browser — start a fresh poll cycle
        stopPolling();
        pollAttemptsRef.current = 0;
        pollForActivation();
      }
    });

    return () => subscription.remove();
  }, [pendingPayment, pollForActivation, stopPolling]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ─── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    checkUserRole();
    fetchCurrentSubscription();
  }, [checkUserRole, fetchCurrentSubscription]);

  // ─── Subscribe handler ─────────────────────────────────────────────────────

  const subscribe = async () => {
    setLoading(true);
    try {
      const endpoint = isProfessional
        ? '/api/subscriptions/professional'
        : '/api/subscriptions/user';
      const plan = isProfessional ? 'basic' : 'user_monthly';

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (res.ok && res.body?.success) {
        const { authorization_url, reference, amount } = res.body.data;

        const message = isProfessional
          ? `Pay ₦${amount.toLocaleString()}/month to get your business listed and receive client messages.`
          : `Pay ₦${amount.toLocaleString()}/month for unlimited access to search and chat with vets, kennels, and shops.`;

        Alert.alert('Complete Payment', message, [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
          {
            text: 'Pay Now',
            onPress: async () => {
              try {
                const supported = await Linking.canOpenURL(authorization_url);
                if (supported) {
                  await Linking.openURL(authorization_url);
                  setPendingPayment(true);
                  pollAttemptsRef.current = 0;
                  pollForActivation();
                  Alert.alert(
                    'Complete Payment in Browser',
                    `Ref: ${reference}\n\nReturn to the app after paying — your subscription activates automatically.`,
                    [{ text: 'OK' }],
                  );
                } else {
                  Alert.alert('Error', 'Could not open payment page. Please try again.');
                }
              } catch {
                Alert.alert('Error', 'Could not open payment page. Please try again.');
              } finally {
                setLoading(false);
              }
            },
          },
        ]);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to start subscription. Please try again.');
        setLoading(false);
      }
    } catch {
      Alert.alert('Error', 'Please check your connection and try again.');
      setLoading(false);
    }
  };

  // ─── Derived state ─────────────────────────────────────────────────────────

  const isPending = !currentSub?.isActive && currentSub?.status === 'pending';

  // ─── Loading gate ──────────────────────────────────────────────────────────

  if (checkingRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{isProfessional ? '⭐' : '🐾'}</Text>
        <Text style={styles.title}>
          {isProfessional ? 'Get Your Business Listed' : 'Access All Pet Services'}
        </Text>
        <Text style={styles.subtitle}>
          {isProfessional
            ? 'Reach thousands of pet owners looking for your services'
            : 'Unlimited search and messaging with verified professionals'}
        </Text>
      </View>

      {/* Subscription status card */}
      {subLoading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color="#2563EB" />
      ) : currentSub?.isActive ? (
        // ── Active ────────────────────────────────────────────────────────────
        <View style={styles.activeCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              {isProfessional ? 'BUSINESS LISTED' : 'PREMIUM ACCESS'}
            </Text>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>✓ ACTIVE</Text>
            </View>
          </View>
          <Text style={styles.activeAmount}>₦{currentSub.amount.toLocaleString()}/month</Text>
          <Text style={styles.activeExpiry}>
            Renews in {currentSub.daysRemaining} day{currentSub.daysRemaining !== 1 ? 's' : ''} •{' '}
            {new Date(currentSub.expiresAt).toLocaleDateString('en-NG')}
          </Text>
        </View>
      ) : isPending ? (
        // ── Pending payment ───────────────────────────────────────────────────
        <View style={styles.pendingCard}>
          <ActivityIndicator size="small" color="#92400E" style={{ marginBottom: 8 }} />
          <Text style={styles.pendingTitle}>Awaiting Payment Confirmation</Text>
          <Text style={styles.pendingText}>
            Complete your payment in the browser. Your subscription will activate automatically once
            the payment is confirmed.
          </Text>
        </View>
      ) : (
        // ── Not subscribed ────────────────────────────────────────────────────
        <View style={styles.notActiveCard}>
          <Text style={styles.notActiveEmoji}>⚠️</Text>
          <Text style={styles.notActiveTitle}>
            {isProfessional ? 'Your Business is Not Listed' : 'Subscribe to Access Services'}
          </Text>
          <Text style={styles.notActiveText}>
            {isProfessional
              ? 'Subscribe to appear in search results and receive client messages.'
              : 'Subscribe to search for vets, kennels, shops and chat with them.'}
          </Text>
        </View>
      )}

      {/* Plan card */}
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>
          {isProfessional ? 'Business Listing' : 'Premium Access'}
        </Text>
        <Text style={styles.planPrice}>
          ₦{isProfessional ? PROFESSIONAL_PRICE.toLocaleString() : PET_OWNER_PRICE.toLocaleString()}
          /month
        </Text>

        <View style={styles.divider} />

        <Text style={styles.whatYouGet}>What You Get:</Text>
        <View style={styles.featureList}>
          {isProfessional ? (
            <>
              <Text style={styles.feature}>✓ Your business listed in search results</Text>
              <Text style={styles.feature}>✓ Business profile page with your details</Text>
              <Text style={styles.feature}>✓ Receive unlimited client messages</Text>
              <Text style={styles.feature}>✓ Contact information visible to clients</Text>
              <Text style={styles.feature}>✓ Reach thousands of pet owners</Text>
            </>
          ) : (
            <>
              <Text style={styles.feature}>✓ Search all veterinarians in Nigeria</Text>
              <Text style={styles.feature}>✓ Search all kennels and boarding facilities</Text>
              <Text style={styles.feature}>✓ Search all pet shops and suppliers</Text>
              <Text style={styles.feature}>✓ Unlimited messaging with professionals</Text>
              <Text style={styles.feature}>✓ View complete business profiles</Text>
            </>
          )}
          <Text style={styles.feature}>✓ Cancel anytime, no commitment</Text>
        </View>
      </View>

      {/* Subscribe button — hidden when active or pending */}
      {!currentSub?.isActive && !isPending && (
        <TouchableOpacity
          style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
          onPress={subscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.subscribeBtnText}>
                Subscribe — ₦
                {isProfessional
                  ? PROFESSIONAL_PRICE.toLocaleString()
                  : PET_OWNER_PRICE.toLocaleString()}
                /month
              </Text>
              <Text style={styles.subscribeBtnSubtext}>Secure payment via Paystack</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Refresh button while polling */}
      {pendingPayment && (
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchCurrentSubscription()}
          disabled={subLoading}
        >
          <Text style={styles.refreshBtnText}>
            {subLoading ? 'Checking...' : '↻ Check Payment Status'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Value proposition */}
      <View style={styles.valueCard}>
        <Text style={styles.valueTitle}>
          {isProfessional ? '📈 Grow Your Business' : '🎯 Why Subscribe?'}
        </Text>
        <Text style={styles.valueText}>
          {isProfessional
            ? 'With over 10 million pet owners in Nigeria and growing, get your business in front of clients actively looking for your services. Just one new client per month pays for your subscription many times over!'
            : 'Finding trusted vets, kennels, and pet shops is hard. For less than the cost of one vet visit, get unlimited access to all verified professionals in your area. Your pets deserve the best care!'}
        </Text>
      </View>

      {/* Info cards */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💳 All Payment Methods Accepted</Text>
        <Text style={styles.infoText}>
          Pay with debit card, bank transfer, USSD, mobile money, or QR code. All secured by
          Paystack.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔄 Flexible Monthly Billing</Text>
        <Text style={styles.infoText}>
          Auto-renews monthly. Cancel anytime from your profile. Keep access until end of paid
          period. No setup fees or hidden charges.
        </Text>
      </View>

      {!isProfessional && (
        <TouchableOpacity
          style={styles.professionalPrompt}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.professionalPromptTitle}>👨‍⚕️ Are You a Professional?</Text>
            <Text style={styles.professionalPromptText}>
              Register your vet clinic, kennel, or pet shop to get listed
            </Text>
          </View>
          <Text style={styles.professionalPromptArrow}>→</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.disclaimer}>
        Monthly billing • Auto-renewal • Cancel anytime • Prices in Nigerian Naira (₦)
      </Text>
    </ScrollView>
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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerEmoji: { fontSize: 52, marginBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },

  // ── Active card ─────────────────────────────────────────────────────────────
  activeCard: {
    backgroundColor: '#D1FAE5',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: { fontSize: 11, fontWeight: '800', color: '#065F46', letterSpacing: 0.5 },
  activeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  activeAmount: { fontSize: 20, fontWeight: '800', color: '#065F46', marginBottom: 4 },
  activeExpiry: { fontSize: 13, color: '#047857' },

  // ── Pending card ────────────────────────────────────────────────────────────
  pendingCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    alignItems: 'center',
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 6,
    textAlign: 'center',
  },
  pendingText: { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 20 },

  // ── Not active card ─────────────────────────────────────────────────────────
  notActiveCard: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  notActiveEmoji: { fontSize: 40, marginBottom: 8 },
  notActiveTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 6,
    textAlign: 'center',
  },
  notActiveText: { fontSize: 14, color: '#7F1D1D', textAlign: 'center', lineHeight: 20 },

  // ── Plan card ───────────────────────────────────────────────────────────────
  planCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  planTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  planPrice: { fontSize: 28, fontWeight: '800', color: '#2563EB', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 },
  whatYouGet: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 12 },
  featureList: { gap: 10 },
  feature: { fontSize: 15, color: '#374151', lineHeight: 22 },

  // ── Subscribe button ────────────────────────────────────────────────────────
  subscribeBtn: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 2 },
  subscribeBtnSubtext: { color: '#DBEAFE', fontSize: 12, fontWeight: '500' },

  // ── Refresh button (shown while polling) ────────────────────────────────────
  refreshBtn: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  refreshBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },

  // ── Value / info cards ──────────────────────────────────────────────────────
  valueCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  valueTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF', marginBottom: 8 },
  valueText: { fontSize: 14, color: '#1E3A8A', lineHeight: 22 },
  infoCard: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  // ── Professional prompt ─────────────────────────────────────────────────────
  professionalPrompt: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
    flexDirection: 'row',
    alignItems: 'center',
  },
  professionalPromptTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  professionalPromptText: { fontSize: 12, color: '#78350F', marginTop: 2 },
  professionalPromptArrow: { fontSize: 24, color: '#D97706', marginLeft: 8 },

  // ── Disclaimer ──────────────────────────────────────────────────────────────
  disclaimer: {
    marginHorizontal: 24,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});