import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SubscriptionInfo {
  plan:          string;
  status:        string;
  amount:        number;
  expiresAt:     string | null;
  daysRemaining: number;
  isActive:      boolean;
  isPending?:    boolean;
}

type UserType = 'pet_owner' | 'professional';

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

const PET_OWNER_PLANS = [
  {
    id:       'free',
    name:     'Free',
    price:    0,
    tagline:  'Get started at no cost',
    color:    '#64748B',
    bgColor:  '#F8FAFC',
    features: [
      { text: 'Browse vet & kennel listings',     included: true  },
      { text: 'See names and specializations',    included: true  },
      { text: 'General location (city only)',     included: true  },
      { text: 'Full contact details (phone/email)', included: false },
      { text: 'GPS nearby search',                included: false },
      { text: 'Unlimited search results',         included: false },
    ],
  },
  {
    id:       'user_premium',
    name:     'Premium',
    price:    1500,
    tagline:  'Full access to all professionals',
    color:    '#2563EB',
    bgColor:  '#EFF6FF',
    badge:    'Most Popular',
    features: [
      { text: 'Browse vet & kennel listings',       included: true },
      { text: 'Full contact details (phone/email)', included: true },
      { text: 'Exact address for every listing',    included: true },
      { text: 'GPS nearby search',                  included: true },
      { text: 'Unlimited search results',           included: true },
      { text: 'Cancel anytime',                     included: true },
    ],
  },
] as const;

const PROFESSIONAL_PLANS = [
  {
    id:       'starter',
    name:     'Starter',
    price:    2500,
    tagline:  'Get listed and found',
    color:    '#7C3AED',
    bgColor:  '#F5F3FF',
    features: [
      { text: 'Listed in search results',              included: true  },
      { text: 'Full profile visible to subscribers',   included: true  },
      { text: 'Phone & email shown to Premium users',  included: true  },
      { text: 'Appear in nearby searches',             included: true  },
      { text: 'Featured badge on profile',             included: false },
      { text: 'Sorted to top of search results',       included: false },
    ],
  },
  {
    id:       'pro',
    name:     'Pro',
    price:    5000,
    tagline:  'Maximum visibility for your practice',
    color:    '#D97706',
    bgColor:  '#FFFBEB',
    badge:    'Best Value',
    features: [
      { text: 'Listed in search results',              included: true },
      { text: 'Full profile visible to subscribers',   included: true },
      { text: 'Phone & email shown to Premium users',  included: true },
      { text: 'Appear in nearby searches',             included: true },
      { text: 'Featured badge on profile',             included: true },
      { text: 'Sorted to top of search results',       included: true },
    ],
  },
] as const;

const PENDING_EXPIRY_MS = 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SubscriptionScreen({ navigation }: any) {
  const [userType,          setUserType]          = useState<UserType>('pet_owner');
  const [checkingRole,      setCheckingRole]      = useState(true);
  const [currentSub,        setCurrentSub]        = useState<SubscriptionInfo | null>(null);
  const [subLoading,        setSubLoading]        = useState(false);
  const [subscribing,       setSubscribing]       = useState(false);
  const [selectedPlan,      setSelectedPlan]      = useState<string | null>(null);

  const [pendingReference,   setPendingReference]   = useState<string | null>(null);
  const [pendingInitiatedAt, setPendingInitiatedAt] = useState<number | null>(null);
  const [transferInFlight,   setTransferInFlight]   = useState(false);

  // ── Role check ───────────────────────────────────────────────────────────

  const checkUserRole = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me', { method: 'GET' });
      if (res.ok && res.body?.user?.role) {
        const role = res.body.user.role;
        const isPro = ['vet', 'kennel_owner', 'shop_owner'].includes(role);
        setUserType(isPro ? 'professional' : 'pet_owner');
      }
    } catch {
      // keep default pet_owner
    } finally {
      setCheckingRole(false);
    }
  }, []);

  // ── Fetch current subscription ────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
      if (res.ok && res.body?.data) {
        const sub = res.body.data as SubscriptionInfo;
        setCurrentSub(sub);
        if (sub.isActive) {
          setTransferInFlight(false);
          setPendingReference(null);
          setPendingInitiatedAt(null);
        }
        if (sub.status === 'pending') setTransferInFlight(true);
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
    fetchSubscription();
  }, [checkUserRole, fetchSubscription]);

  // Auto-expire local pending state after 24h
  useEffect(() => {
    if (!pendingInitiatedAt) return;
    if (Date.now() - pendingInitiatedAt > PENDING_EXPIRY_MS) {
      setTransferInFlight(false);
      setPendingReference(null);
      setPendingInitiatedAt(null);
    }
  }, [pendingInitiatedAt]);

  // ── Payment callbacks ─────────────────────────────────────────────────────

  const handlePaymentSuccess = useCallback(async (reference: string) => {
    setTransferInFlight(false);
    setPendingReference(null);
    setPendingInitiatedAt(null);
    await fetchSubscription();
    Alert.alert('Subscription Active!', `Payment confirmed (Ref: ${reference}). You now have full access.`);
  }, [fetchSubscription]);

  const handlePaymentCancel = useCallback(() => {
    if (pendingReference) {
      setTransferInFlight(true);
      fetchSubscription();
    }
  }, [pendingReference, fetchSubscription]);

  const openPaystackWebView = useCallback((authorization_url: string, reference: string, amount: number) => {
    const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storePaystackCallbacks(callbackKey, { onSuccess: handlePaymentSuccess, onCancel: handlePaymentCancel });
    const params = { authorization_url, reference, amount, callbackKey };
    const parent = navigation.getParent();
    if (typeof parent?.navigate === 'function') {
      parent.navigate('PaystackWebView', params);
    } else {
      navigation.navigate('PaystackWebView', params);
    }
  }, [navigation, handlePaymentSuccess, handlePaymentCancel]);

  // ── Subscribe ─────────────────────────────────────────────────────────────

  const subscribe = async (planId: string) => {
    if (planId === 'free') return;

    setSubscribing(true);
    setSelectedPlan(planId);
    try {
      const isProfessionalPlan = ['starter', 'pro', 'basic'].includes(planId);
      const endpoint = isProfessionalPlan ? '/api/subscriptions/professional' : '/api/subscriptions/user';

      const res = await apiFetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planId }),
      });

      if (res.ok && res.body?.success) {
        const { authorization_url, reference, amount } = res.body.data;
        setPendingReference(reference);
        setPendingInitiatedAt(Date.now());
        setSubscribing(false);
        openPaystackWebView(authorization_url, reference, amount);
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to start subscription.');
        setSubscribing(false);
      }
    } catch {
      Alert.alert('Error', 'Please check your connection and try again.');
      setSubscribing(false);
    } finally {
      setSelectedPlan(null);
    }
  };

  // ── Check payment status ──────────────────────────────────────────────────

  const checkPaymentStatus = useCallback(async () => {
    setSubLoading(true);
    try {
      if (pendingReference) {
        const res = await apiFetch(`/api/subscriptions/verify?reference=${pendingReference}`, { method: 'GET' });
        if (res.ok && res.body?.data?.isActive) {
          await fetchSubscription();
          setTransferInFlight(false);
          setPendingReference(null);
          setPendingInitiatedAt(null);
          Alert.alert('Payment Confirmed!', 'Your subscription is now active.');
          return;
        }
      }
      await fetchSubscription();
      if (!currentSub?.isActive) {
        Alert.alert('Not Confirmed Yet', 'Your payment is still processing. Bank transfers can take a few minutes.');
      }
    } catch {
      Alert.alert('Network error', 'Please check your connection.');
    } finally {
      setSubLoading(false);
    }
  }, [pendingReference, fetchSubscription, currentSub]);

  const handleCancelAndStartOver = useCallback(() => {
    Alert.alert(
      'Cancel Payment',
      'Only tap "Cancel" if you did NOT send any money.',
      [
        { text: 'Keep Waiting', style: 'cancel' },
        {
          text: 'Cancel — I Did Not Pay',
          style: 'destructive',
          onPress: () => {
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

  // ── Derived state ──────────────────────────────────────────────────────────

  const isPending =
    (!currentSub?.isActive && currentSub?.status === 'pending') ||
    (transferInFlight && !currentSub?.isActive);

  const plans = userType === 'professional' ? PROFESSIONAL_PLANS : PET_OWNER_PLANS;

  // ─────────────────────────────────────────────────────────────────────────────

  if (checkingRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Text style={styles.headerEmoji}>{userType === 'professional' ? '🏥' : '🐾'}</Text>
        </View>
        <Text style={styles.headerTitle}>
          {userType === 'professional' ? 'Grow Your Practice' : 'Find Trusted Pet Care'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {userType === 'professional'
            ? 'Choose a plan to get listed and reach thousands of pet owners'
            : 'Choose a plan to unlock full access to verified professionals near you'}
        </Text>
      </View>

      {/* ── Active subscription card ─────────────────────────────────────────── */}
      {subLoading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color="#2563EB" />
      ) : currentSub?.isActive ? (
        <ActiveSubscriptionCard sub={currentSub} />
      ) : isPending ? (
        <PendingCard
          onCheck={checkPaymentStatus}
          onCancel={handleCancelAndStartOver}
          loading={subLoading}
        />
      ) : null}

      {/* ── Plan cards ──────────────────────────────────────────────────────── */}
      {!currentSub?.isActive && !isPending && (
        <>
          <Text style={styles.choosePlanLabel}>Choose a plan</Text>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSubscribe={subscribe}
              loading={subscribing && selectedPlan === plan.id}
              disabled={subscribing}
            />
          ))}
        </>
      )}

      {/* ── Trust badges ────────────────────────────────────────────────────── */}
      <View style={styles.trustRow}>
        <TrustBadge icon="shield-checkmark-outline" text="Secured by Paystack" />
        <TrustBadge icon="refresh-outline"          text="Cancel anytime"      />
        <TrustBadge icon="card-outline"             text="All payment methods" />
      </View>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <View style={styles.faqCard}>
        <Text style={styles.faqTitle}>Common Questions</Text>
        <FaqItem
          q="When does my subscription start?"
          a="Immediately after payment confirmation. Card payments confirm instantly; bank transfers may take a few minutes."
        />
        <FaqItem
          q="How do I cancel?"
          a="You can cancel anytime from your Profile screen. You keep access until the end of your billing period."
        />
        <FaqItem
          q="What payment methods are accepted?"
          a="Debit card, bank transfer, USSD, mobile money, and QR code — all via Paystack."
        />
      </View>

      <Text style={styles.disclaimer}>
        Monthly billing • Auto-renewal • Cancel anytime • Prices in Nigerian Naira (₦)
      </Text>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onSubscribe,
  loading,
  disabled,
}: {
  plan: typeof PET_OWNER_PLANS[number] | typeof PROFESSIONAL_PLANS[number];
  onSubscribe: (planId: string) => void;
  loading:  boolean;
  disabled: boolean;
}) {
  const isFree = plan.id === 'free';

  return (
    <View style={[styles.planCard, { borderColor: plan.color + '40', backgroundColor: plan.bgColor }]}>
      {'badge' in plan && plan.badge ? (
        <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
          <Text style={styles.planBadgeText}>{plan.badge}</Text>
        </View>
      ) : null}

      <View style={styles.planHeader}>
        <View>
          <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
          <Text style={styles.planTagline}>{plan.tagline}</Text>
        </View>
        <View style={styles.planPriceWrap}>
          {isFree ? (
            <Text style={[styles.planPrice, { color: plan.color }]}>Free</Text>
          ) : (
            <>
              <Text style={[styles.planPrice, { color: plan.color }]}>
                ₦{plan.price.toLocaleString()}
              </Text>
              <Text style={styles.planPeriod}>/month</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.planDivider} />

      <View style={styles.featureList}>
        {plan.features.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons
              name={f.included ? 'checkmark-circle' : 'close-circle-outline'}
              size={18}
              color={f.included ? plan.color : '#CBD5E1'}
            />
            <Text style={[styles.featureText, !f.included && styles.featureTextMuted]}>
              {f.text}
            </Text>
          </View>
        ))}
      </View>

      {!isFree && (
        <TouchableOpacity
          style={[
            styles.subscribeBtn,
            { backgroundColor: plan.color },
            disabled && styles.subscribeBtnDisabled,
          ]}
          onPress={() => onSubscribe(plan.id)}
          disabled={disabled}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.subscribeBtnText}>
              Subscribe — ₦{plan.price.toLocaleString()}/mo
            </Text>
          )}
        </TouchableOpacity>
      )}

      {isFree && (
        <View style={[styles.currentPlanBtn, { borderColor: plan.color + '40' }]}>
          <Text style={[styles.currentPlanText, { color: plan.color }]}>Your current plan</Text>
        </View>
      )}
    </View>
  );
}

function ActiveSubscriptionCard({ sub }: { sub: SubscriptionInfo }) {
  const planLabel = sub.plan
    .replace('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={styles.activeCard}>
      <View style={styles.activeCardHeader}>
        <View>
          <Text style={styles.activeCardLabel}>ACTIVE PLAN</Text>
          <Text style={styles.activeCardPlan}>{planLabel}</Text>
          <Text style={styles.activeCardAmount}>₦{sub.amount.toLocaleString()}/month</Text>
        </View>
        <View style={styles.activeBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#fff" />
          <Text style={styles.activeBadgeText}>ACTIVE</Text>
        </View>
      </View>
      <View style={styles.activeCardFooter}>
        <Ionicons name="calendar-outline" size={14} color="#047857" />
        <Text style={styles.activeCardExpiry}>
          Renews in {sub.daysRemaining} day{sub.daysRemaining !== 1 ? 's' : ''} •{' '}
          {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString('en-NG') : ''}
        </Text>
      </View>
    </View>
  );
}

function PendingCard({
  onCheck,
  onCancel,
  loading,
}: {
  onCheck:  () => void;
  onCancel: () => void;
  loading:  boolean;
}) {
  return (
    <View style={styles.pendingCard}>
      <ActivityIndicator size="small" color="#92400E" />
      <Text style={styles.pendingTitle}>Awaiting Payment Confirmation</Text>
      <Text style={styles.pendingText}>
        If you paid via bank transfer your subscription will activate automatically once confirmed.
      </Text>
      <TouchableOpacity style={styles.checkBtn} onPress={onCheck} disabled={loading}>
        <Text style={styles.checkBtnText}>{loading ? 'Checking…' : '↻ Check Payment Status'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelBtnText}>✕ Cancel & Start Over</Text>
      </TouchableOpacity>
    </View>
  );
}

function TrustBadge({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.trustBadge}>
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text style={styles.trustText}>{text}</Text>
    </View>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity style={styles.faqItem} onPress={() => setOpen(!open)} activeOpacity={0.7}>
      <View style={styles.faqQuestion}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:           { flex: 1, backgroundColor: '#F8FAFC' },
  container:        { paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  headerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  headerEmoji:    { fontSize: 34 },
  headerTitle:    { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 6, textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21 },

  choosePlanLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 12,
  },

  // ── Plan cards ────────────────────────────────────────────────────────────
  planCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1.5,
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: -1,
    right: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  planBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  planHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  planName:      { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  planTagline:   { fontSize: 13, color: '#64748B', lineHeight: 18 },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice:     { fontSize: 26, fontWeight: '800' },
  planPeriod:    { fontSize: 12, color: '#94A3B8', marginTop: -2 },

  planDivider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 14 },

  featureList: { gap: 10, marginBottom: 18 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#334155', flex: 1, lineHeight: 19 },
  featureTextMuted: { color: '#94A3B8' },

  subscribeBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeBtnDisabled: { opacity: 0.6 },
  subscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  currentPlanBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  currentPlanText: { fontSize: 14, fontWeight: '700' },

  // ── Active card ───────────────────────────────────────────────────────────
  activeCard: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#6EE7B7',
  },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  activeCardLabel:  { fontSize: 10, fontWeight: '800', color: '#047857', letterSpacing: 1, marginBottom: 4 },
  activeCardPlan:   { fontSize: 20, fontWeight: '800', color: '#065F46' },
  activeCardAmount: { fontSize: 13, color: '#047857', marginTop: 2 },
  activeBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText:  { fontSize: 10, fontWeight: '800', color: '#fff' },
  activeCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeCardExpiry: { fontSize: 13, color: '#047857' },

  // ── Pending card ──────────────────────────────────────────────────────────
  pendingCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    alignItems: 'center',
    gap: 8,
  },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', textAlign: 'center' },
  pendingText:  { fontSize: 13, color: '#78350F', textAlign: 'center', lineHeight: 19 },
  checkBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  checkBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },

  // ── Trust badges ──────────────────────────────────────────────────────────
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 20,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  trustText: { fontSize: 11, color: '#64748B', fontWeight: '600' },

  // ── FAQ ───────────────────────────────────────────────────────────────────
  faqCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  faqTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  faqItem:  { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  faqQuestion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  faqQ: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1, marginRight: 8 },
  faqA: { fontSize: 13, color: '#64748B', marginTop: 8, lineHeight: 19 },

  disclaimer: {
    marginHorizontal: 24,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
