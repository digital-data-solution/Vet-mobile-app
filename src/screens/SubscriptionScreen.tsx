import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { apiFetch } from '../api/client';
import { apiFetch as getMe } from '../api/client';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

interface SubscriptionInfo {
  plan:          string;
  status:        string;
  amount:        number;
  expiresAt:     string | null;
  daysRemaining: number;
  isActive:      boolean;
}

const PET_OWNER_PRICE    = 500;
const PROFESSIONAL_PRICE = 3000;

// How long to keep showing "Awaiting Confirmation" UI after a bank transfer
// before we give up and let the user start over. 24 hours in ms.
const PENDING_EXPIRY_MS = 24 * 60 * 60 * 1000;

export default function SubscriptionScreen({ navigation }: any) {
  const [loading,          setLoading]          = useState(false);
  const [isProfessional,   setIsProfessional]   = useState(false);
  const [checkingRole,     setCheckingRole]     = useState(true);
  const [currentSub,       setCurrentSub]       = useState<SubscriptionInfo | null>(null);
  const [subLoading,       setSubLoading]       = useState(false);

  // ─── Pending bank transfer state ──────────────────────────────────────────
  // We track these separately from currentSub so closing the WebView
  // does NOT wipe the pending state. The pending record stays in MongoDB
  // until the webhook confirms it or the user explicitly cancels.

  const [pendingReference,  setPendingReference]  = useState<string | null>(null);
  const [pendingInitiatedAt, setPendingInitiatedAt] = useState<number | null>(null);

  // Tracks whether the user closed the WebView mid-transfer (bank transfer case).
  // When true we show the "Awaiting Confirmation" card even if currentSub is null.
  const [transferInFlight, setTransferInFlight] = useState(false);

  // ─── Role check ───────────────────────────────────────────────────────────

  const checkUserRole = useCallback(async () => {
    try {
      const res = await getMe('/api/auth/me', { method: 'GET' });
      if (res.ok && res.body?.data?.role) {
        const role = res.body.data.role;
        setIsProfessional(['vet', 'kennel_owner', 'shop_owner'].includes(role));
      }
    } catch (err) {
      console.error('Error checking user role:', err);
    } finally {
      setCheckingRole(false);
    }
  }, []);

  // ─── Fetch subscription ───────────────────────────────────────────────────

  const fetchCurrentSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
      if (res.ok && res.body?.data) {
        const sub = res.body.data as SubscriptionInfo;
        setCurrentSub(sub);

        // If backend now shows active, clear our local transfer-in-flight state
        if (sub.isActive) {
          setTransferInFlight(false);
          setPendingReference(null);
          setPendingInitiatedAt(null);
        }
        // If backend shows pending, make sure our UI reflects that
        if (sub.status === 'pending') {
          setTransferInFlight(true);
        }
      } else {
        setCurrentSub(null);
      }
    } catch {
      setCurrentSub(null);
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRole();
    fetchCurrentSubscription();
  }, [checkUserRole, fetchCurrentSubscription]);

  // ─── Payment callbacks ────────────────────────────────────────────────────

  const handlePaymentSuccess = useCallback(
    async (reference: string) => {
      // Card payment: Paystack redirected to /close, subscription should be active
      setTransferInFlight(false);
      setPendingReference(null);
      setPendingInitiatedAt(null);
      await fetchCurrentSubscription();
      Alert.alert(
        '🎉 Subscription Active!',
        `Payment confirmed (Ref: ${reference}). You now have full access.`,
        [{ text: 'Continue' }],
      );
    },
    [fetchCurrentSubscription],
  );

  const handlePaymentCancel = useCallback(() => {
    // ─── CRITICAL FIX ────────────────────────────────────────────────────────
    //
    // For BANK TRANSFERS: Paystack shows "taking longer than expected" and the
    // user closes the WebView. This is NOT a cancellation — the money may have
    // already left their account. We must NOT call cancel-pending here.
    //
    // Instead we:
    //   1. Keep transferInFlight = true so the "Awaiting Confirmation" UI shows
    //   2. Keep pendingReference so "Check Payment Status" can verify
    //   3. Only call cancel-pending if the user explicitly taps "Cancel & Start Over"
    //
    // For CARD PAYMENTS that were genuinely cancelled: the user never sent money,
    // so cancel-pending is safe. But we have no reliable way to distinguish
    // the two cases at this point — so we err on the side of caution and
    // NEVER auto-cancel here. The user can always tap "Cancel & Start Over" manually.
    //
    // ─────────────────────────────────────────────────────────────────────────

    console.log('[SubscriptionScreen] WebView closed — preserving pending state');

    // If there is a pending reference, show the awaiting-confirmation UI
    if (pendingReference) {
      setTransferInFlight(true);
      // Re-fetch from backend to get the latest status
      fetchCurrentSubscription();
    }

    // Do NOT call cancel-pending here. Do NOT clear pendingReference.
    // Do NOT show a "payment cancelled" alert — they may have just closed
    // the WebView after sending the transfer.
  }, [pendingReference, fetchCurrentSubscription]);

  // ─── Open PaystackWebView ─────────────────────────────────────────────────

  const openPaystackWebView = useCallback(
    (authorization_url: string, reference: string, amount: number) => {
      const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      storePaystackCallbacks(callbackKey, {
        onSuccess: handlePaymentSuccess,
        onCancel:  handlePaymentCancel,
      });

      const params = { authorization_url, reference, amount, callbackKey };
      const parent = navigation.getParent();
      if (typeof parent?.navigate === 'function') {
        parent.navigate('PaystackWebView', params);
      } else {
        navigation.navigate('PaystackWebView', params);
      }
    },
    [navigation, handlePaymentSuccess, handlePaymentCancel],
  );

  // ─── Subscribe handler ────────────────────────────────────────────────────

  const subscribe = async () => {
    setLoading(true);
    try {
      const endpoint = isProfessional
        ? '/api/subscriptions/professional'
        : '/api/subscriptions/user';
      const plan = isProfessional ? 'basic' : 'user_monthly';

      const res = await apiFetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      });

      if (res.ok && res.body?.success) {
        const { authorization_url, reference, amount } = res.body.data;

        // Store reference NOW before opening WebView so handlePaymentCancel
        // can access it if the user closes the WebView mid-transfer
        setPendingReference(reference);
        setPendingInitiatedAt(Date.now());
        setLoading(false);
        openPaystackWebView(authorization_url, reference, amount);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to start subscription. Please try again.');
        setLoading(false);
      }
    } catch {
      Alert.alert('Error', 'Please check your connection and try again.');
      setLoading(false);
    }
  };

  // ─── Manual status check ──────────────────────────────────────────────────

  const checkPaymentStatus = useCallback(async () => {
    setSubLoading(true);
    try {
      // First try to verify via reference if we have one
      if (pendingReference) {
        const verifyRes = await apiFetch(
          `/api/subscriptions/verify?reference=${pendingReference}`,
          { method: 'GET' },
        );

        if (verifyRes.ok && verifyRes.body?.data?.isActive) {
          // Payment confirmed — fetch fresh sub data and clear pending state
          await fetchCurrentSubscription();
          setTransferInFlight(false);
          setPendingReference(null);
          setPendingInitiatedAt(null);
          Alert.alert(
            '🎉 Payment Confirmed!',
            'Your subscription is now active.',
            [{ text: 'Continue' }],
          );
          return;
        }
      }

      // Fall back to polling /me to see if webhook already activated it
      await fetchCurrentSubscription();

      if (!currentSub?.isActive) {
        Alert.alert(
          'Not Confirmed Yet',
          'Your payment is still being processed. Bank transfers can take a few minutes. Please check again shortly.',
          [{ text: 'OK' }],
        );
      }
    } catch {
      Alert.alert('Network error', 'Please check your connection and try again.', [{ text: 'OK' }]);
    } finally {
      setSubLoading(false);
    }
  }, [pendingReference, fetchCurrentSubscription, currentSub]);

  // ─── Explicit cancel & start over (user confirms they did NOT pay) ────────

  const handleCancelAndStartOver = useCallback(() => {
    Alert.alert(
      'Cancel Payment',
      'Did you complete a bank transfer? If yes, tap "Keep Waiting" — your payment may still confirm.\n\nOnly tap "Cancel" if you did NOT send any money.',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Cancel — I Did Not Pay',
          style: 'destructive',
          onPress: () => {
            // User explicitly confirms no money was sent — safe to cancel
            setPendingReference(null);
            setPendingInitiatedAt(null);
            setTransferInFlight(false);
            setCurrentSub(null);
            apiFetch('/api/subscriptions/cancel-pending', { method: 'POST' }).catch(() => {});
          },
        },
      ],
    );
  }, []);

  // ─── Navigate to Profile ──────────────────────────────────────────────────

  const goToProfile = () => {
    try {
      const parent = navigation.getParent();
      if (parent) {
        parent.navigate('Profile');
      } else {
        navigation.navigate('MainTabs', { screen: 'Profile' } as any);
      }
    } catch {
      navigation.navigate('MainTabs', { screen: 'Profile' } as any);
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────

  // Show pending UI if:
  //   (a) backend says status === 'pending', OR
  //   (b) we locally know a transfer is in flight (user closed WebView)
  const isPending =
    (!currentSub?.isActive && currentSub?.status === 'pending') ||
    (transferInFlight && !currentSub?.isActive);

  const expiryLabel = currentSub?.expiresAt
    ? new Date(currentSub.expiresAt).toLocaleDateString('en-NG')
    : 'N/A';

  // Auto-expire local pending state after 24h as a safety net
  useEffect(() => {
    if (!pendingInitiatedAt) return;
    if (Date.now() - pendingInitiatedAt > PENDING_EXPIRY_MS) {
      setTransferInFlight(false);
      setPendingReference(null);
      setPendingInitiatedAt(null);
    }
  }, [pendingInitiatedAt]);

  if (checkingRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

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

      {/* Subscription status */}
      {subLoading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color="#2563EB" />
      ) : currentSub?.isActive ? (
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
            Renews in {currentSub.daysRemaining} day{currentSub.daysRemaining !== 1 ? 's' : ''} • {expiryLabel}
          </Text>
        </View>
      ) : isPending ? (
        <View style={styles.pendingCard}>
          <ActivityIndicator size="small" color="#92400E" style={{ marginBottom: 8 }} />
          <Text style={styles.pendingTitle}>Awaiting Payment Confirmation</Text>
          <Text style={styles.pendingText}>
            If you already paid via bank transfer, your subscription will activate automatically once confirmed. Tap below to check.
          </Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={checkPaymentStatus}
            disabled={subLoading}
          >
            <Text style={styles.refreshBtnText}>
              {subLoading ? 'Checking…' : '↻ Check Payment Status'}
            </Text>
          </TouchableOpacity>
          {/* Only show cancel after explicit user confirmation they did not pay */}
          <TouchableOpacity
            style={[styles.refreshBtn, styles.cancelPendingBtn]}
            onPress={handleCancelAndStartOver}
          >
            <Text style={styles.cancelPendingBtnText}>✕ Cancel & Start Over</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
          ₦{isProfessional ? PROFESSIONAL_PRICE.toLocaleString() : PET_OWNER_PRICE.toLocaleString()}/month
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

      {/* Subscribe button — hidden while pending or active */}
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
                Subscribe — ₦{isProfessional ? PROFESSIONAL_PRICE.toLocaleString() : PET_OWNER_PRICE.toLocaleString()}/month
              </Text>
              <Text style={styles.subscribeBtnSubtext}>Secure payment via Paystack</Text>
            </>
          )}
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
          Pay with debit card, bank transfer, USSD, mobile money, or QR code. All secured by Paystack.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔄 Flexible Monthly Billing</Text>
        <Text style={styles.infoText}>
          Auto-renews monthly. Cancel anytime from your profile. Keep access until end of paid period.
          No setup fees or hidden charges.
        </Text>
      </View>

      {/* Professional prompt */}
      {!isProfessional && (
        <TouchableOpacity style={styles.professionalPrompt} onPress={goToProfile}>
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
  scroll:           { flex: 1, backgroundColor: '#F3F4F6' },
  container:        { paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },

  header: {
    backgroundColor: '#fff', alignItems: 'center',
    paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerEmoji: { fontSize: 52, marginBottom: 12 },
  title:    { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },

  activeCard: {
    backgroundColor: '#D1FAE5', marginHorizontal: 16, borderRadius: 14,
    padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#10B981',
  },
  statusRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusLabel:     { fontSize: 11, fontWeight: '800', color: '#065F46', letterSpacing: 0.5 },
  activeBadge:     { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  activeAmount:    { fontSize: 20, fontWeight: '800', color: '#065F46', marginBottom: 4 },
  activeExpiry:    { fontSize: 13, color: '#047857' },

  pendingCard: {
    backgroundColor: '#FFFBEB', marginHorizontal: 16, borderRadius: 14,
    padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: '#FCD34D', alignItems: 'center',
  },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 6, textAlign: 'center' },
  pendingText:  { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 20, marginBottom: 12 },

  notActiveCard: {
    backgroundColor: '#FEF2F2', marginHorizontal: 16, borderRadius: 14,
    padding: 20, marginBottom: 16, borderWidth: 1.5, borderColor: '#FCA5A5', alignItems: 'center',
  },
  notActiveEmoji: { fontSize: 40, marginBottom: 8 },
  notActiveTitle: { fontSize: 16, fontWeight: '700', color: '#991B1B', marginBottom: 6, textAlign: 'center' },
  notActiveText:  { fontSize: 14, color: '#7F1D1D', textAlign: 'center', lineHeight: 20 },

  planCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#2563EB',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  planTitle:   { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
  planPrice:   { fontSize: 28, fontWeight: '800', color: '#2563EB', marginBottom: 16 },
  divider:     { height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 },
  whatYouGet:  { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 12 },
  featureList: { gap: 10 },
  feature:     { fontSize: 15, color: '#374151', lineHeight: 22 },

  subscribeBtn: {
    backgroundColor: '#2563EB', marginHorizontal: 16, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginBottom: 16,
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText:     { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 2 },
  subscribeBtnSubtext:  { color: '#DBEAFE', fontSize: 12, fontWeight: '500' },

  refreshBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#2563EB', backgroundColor: '#EFF6FF',
    marginTop: 8,
  },
  refreshBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },

  cancelPendingBtn: {
    borderColor: '#DC2626', backgroundColor: '#FEF2F2',
  },
  cancelPendingBtnText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },

  valueCard: {
    backgroundColor: '#EFF6FF', marginHorizontal: 16, borderRadius: 12,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#DBEAFE',
  },
  valueTitle: { fontSize: 16, fontWeight: '700', color: '#1E40AF', marginBottom: 8 },
  valueText:  { fontSize: 14, color: '#1E3A8A', lineHeight: 22 },

  infoCard: {
    backgroundColor: '#F9FAFB', marginHorizontal: 16, borderRadius: 12,
    padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 6 },
  infoText:  { fontSize: 13, color: '#6B7280', lineHeight: 20 },

  professionalPrompt: {
    backgroundColor: '#FEF3C7', marginHorizontal: 16, borderRadius: 12,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FCD34D',
    flexDirection: 'row', alignItems: 'center',
  },
  professionalPromptTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  professionalPromptText:  { fontSize: 12, color: '#78350F', marginTop: 2 },
  professionalPromptArrow: { fontSize: 24, color: '#D97706', marginLeft: 8 },

  disclaimer: { marginHorizontal: 24, fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});