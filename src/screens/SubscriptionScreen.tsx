import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { apiFetch } from '../api/client';
import { getCurrentUser } from '../api/supabase';

type UserPlan = 'user_monthly' | 'user_yearly';
type ProfessionalPlan = 'basic' | 'premium' | 'enterprise';
type Plan = UserPlan | ProfessionalPlan;

interface SubscriptionInfo {
  plan: string;
  status: string;
  amount: number;
  expiresAt: string;
  daysRemaining: number;
  isActive: boolean;
  features: Record<string, any>;
  accountType: 'user' | 'professional';
}

// USER PLANS (Pet Owners)
const USER_PLANS: { id: UserPlan; label: string; price: string; monthly: number; features: string[]; highlight?: boolean }[] = [
  {
    id: 'user_monthly',
    label: 'Monthly',
    price: '₦500/mo',
    monthly: 500,
    features: ['Up to 5 pets', '10 appointments/month', 'Vet access', 'Health records', 'Reminders'],
  },
  {
    id: 'user_yearly',
    label: 'Yearly',
    price: '₦5,000/yr',
    monthly: 417, // Monthly equivalent
    highlight: true, // Highlight yearly plan as best value
    features: [
      'Up to 10 pets',
      'Unlimited appointments',
      'Priority vet access',
      'Full health records',
      'Reminders & alerts',
      'Priority support',
      '💰 Save ₦1,000 (2 months free)',
    ],
  },
];

// PROFESSIONAL PLANS (Vets, Kennels, Shops)
const PROFESSIONAL_PLANS: { 
  id: ProfessionalPlan; 
  label: string; 
  price: string; 
  monthly: number;
  features: string[]; 
  highlight?: boolean;
}[] = [
  {
    id: 'basic',
    label: 'Basic',
    price: '₦3,000/mo',
    monthly: 3000,
    features: [
      '50 clients',
      '100 appointments/month',
      'Listed in search',
      'Basic analytics',
      'Profile page',
    ],
  },
  {
    id: 'premium',
    label: 'Premium',
    price: '₦8,000/mo',
    monthly: 8000,
    highlight: true,
    features: [
      '200 clients',
      'Unlimited appointments',
      '⭐ Featured listing',
      'Advanced analytics',
      'Multi-location support',
      'Verified badge',
    ],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    price: '₦20,000/mo',
    monthly: 20000,
    features: [
      'Unlimited clients',
      'Unlimited appointments',
      '🔥 Premium listing',
      'Advanced analytics',
      'Multi-location',
      'White-label option',
      'API access',
      'Dedicated support',
    ],
  },
];

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>('user_monthly');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [currentSub, setCurrentSub] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [isProfessional, setIsProfessional] = useState(false);

  const checkUserRole = useCallback(async () => {
    try {
      // Get Supabase user first
      const { data } = await getCurrentUser();
      if (!data?.user) {
        setCheckingRole(false);
        return;
      }

      // Check backend for role and professional status
      const res = await apiFetch('/api/auth/me', { method: 'GET' });
      if (res.ok && res.body?.user) {
        const role = res.body.user.role;
        setUserRole(role);
        
        // Check if user is a professional (vet, kennel_owner) or has shop
        const professional = role === 'vet' || role === 'kennel_owner';
        setIsProfessional(professional);
        
        // Set default plan based on user type
        if (professional) {
          setSelectedPlan('premium'); // Default to most popular
        } else {
          setSelectedPlan('user_monthly'); // Default to monthly for pet owners
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    } finally {
      setCheckingRole(false);
    }
  }, []);

  const fetchCurrentSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
      if (res.ok && res.body?.data) {
        setCurrentSub(res.body.data);
      }
    } catch (error) {
      console.log('No current subscription');
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserRole();
    fetchCurrentSubscription();
  }, [checkUserRole, fetchCurrentSubscription]);

  const createSubscription = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a Plan', 'Please select a subscription plan first.');
      return;
    }

    setLoading(true);
    try {
      // Choose endpoint based on plan type
      const endpoint = isProfessional 
        ? '/api/subscriptions/professional' 
        : '/api/subscriptions/user';

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (res.ok && res.body?.data) {
        const { authorization_url, reference } = res.body.data;
        
        // Show confirmation
        Alert.alert(
          'Redirecting to Payment',
          `You'll be redirected to Paystack to complete your ${selectedPlan} subscription payment.`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  // Open Paystack payment page
                  const supported = await Linking.canOpenURL(authorization_url);
                  if (supported) {
                    await Linking.openURL(authorization_url);
                    
                    // Show success message
                    Alert.alert(
                      'Payment Page Opened',
                      'Complete the payment in your browser. Your subscription will be activated automatically after successful payment.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            // Refresh subscription status
                            fetchCurrentSubscription();
                          },
                        },
                      ]
                    );
                  } else {
                    Alert.alert('Error', 'Cannot open payment page. Please try again.');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to open payment page.');
                }
                setLoading(false);
              },
            },
          ]
        );
      } else {
        const message = res.body?.message || 'Failed to initialize payment. Please try again.';
        Alert.alert('Subscription Failed', message);
        setLoading(false);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Network Error', 'Please check your connection and try again.');
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Choose appropriate plans based on user type
  const availablePlans = isProfessional ? PROFESSIONAL_PLANS : USER_PLANS;
  const planInfo = availablePlans.find((p) => p.id === selectedPlan);

  return (
    <ScrollView 
      style={styles.scroll} 
      contentContainerStyle={styles.container} 
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{isProfessional ? '⭐' : '🐾'}</Text>
        <Text style={styles.title}>
          {isProfessional ? 'Professional Plans' : 'Subscribe to PetCare'}
        </Text>
        <Text style={styles.subtitle}>
          {isProfessional 
            ? 'Choose the plan that fits your practice' 
            : 'Get unlimited access to all features'}
        </Text>
      </View>

      {/* Current subscription */}
      {subLoading ? (
        <ActivityIndicator style={{ marginBottom: 16 }} color="#2563EB" />
      ) : currentSub ? (
        <View style={styles.currentSubCard}>
          <View style={styles.currentSubHeader}>
            <Text style={styles.currentSubTitle}>Current Plan</Text>
            <View style={[
              styles.subStatusBadge, 
              currentSub.isActive && styles.subStatusBadgeActive
            ]}>
              <Text style={[
                styles.subStatusText, 
                currentSub.isActive && styles.subStatusTextActive
              ]}>
                {currentSub.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.currentSubPlan}>
            {currentSub.plan.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Text>
          <Text style={styles.currentSubAmount}>₦{currentSub.amount.toLocaleString()}/mo</Text>
          <Text style={styles.currentSubExpiry}>
            {currentSub.isActive 
              ? `Expires in ${currentSub.daysRemaining} days • ${new Date(currentSub.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}`
              : `Expired on ${new Date(currentSub.expiresAt).toLocaleDateString('en-NG')}`
            }
          </Text>
        </View>
      ) : null}

      {/* Plan cards */}
      <Text style={styles.sectionLabel}>
        {isProfessional ? 'Select a Plan' : 'Choose Your Plan'}
      </Text>
      
      {availablePlans.map((plan) => (
        <TouchableOpacity
          key={plan.id}
          style={[
            styles.planCard,
            selectedPlan === plan.id && styles.planCardSelected,
            plan.highlight && styles.planCardHighlight,
          ]}
          onPress={() => setSelectedPlan(plan.id)}
          activeOpacity={0.8}
        >
          {plan.highlight ? (
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
            </View>
          ) : null}
          
          <View style={styles.planHeader}>
            <View>
              <Text style={[
                styles.planName, 
                selectedPlan === plan.id && styles.planNameSelected
              ]}>
                {plan.label}
              </Text>
              <Text style={[
                styles.planPrice, 
                plan.highlight && styles.planPriceHighlight
              ]}>
                {plan.price}
              </Text>
              {plan.id === 'user_yearly' && (
                <Text style={styles.planSavings}>≈ ₦{plan.monthly}/month</Text>
              )}
            </View>
            <View style={[
              styles.radioCircle, 
              selectedPlan === plan.id && styles.radioCircleSelected
            ]}>
              {selectedPlan === plan.id ? <View style={styles.radioDot} /> : null}
            </View>
          </View>
          
          <View style={styles.featureList}>
            {plan.features.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.featureCheck}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}

      {/* Subscribe button */}
      <TouchableOpacity
        style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
        onPress={createSubscription}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <View>
            <Text style={styles.subscribeBtnText}>
              Subscribe to {planInfo?.label} — {planInfo?.price}
            </Text>
            <Text style={styles.subscribeBtnSubtext}>
              Secure payment via Paystack
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Info cards */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💳 Safe & Secure</Text>
        <Text style={styles.infoText}>
          All payments are processed securely through Paystack. We support cards, bank transfers, USSD, and mobile money.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🔄 Cancel Anytime</Text>
        <Text style={styles.infoText}>
          You can cancel your subscription at any time. You'll retain access until the end of your billing period.
        </Text>
      </View>

      <Text style={styles.disclaimer}>
        Plans auto-renew monthly. Cancel anytime from your account settings. No hidden fees.
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
  loadingText: { marginTop: 12, color: '#6B7280', fontSize: 15 },
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
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  currentSubCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
  },
  currentSubHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  currentSubTitle: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#6B7280', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  subStatusBadge: { 
    backgroundColor: '#E5E7EB', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8 
  },
  subStatusBadgeActive: { backgroundColor: '#D1FAE5' },
  subStatusText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  subStatusTextActive: { color: '#065F46' },
  currentSubPlan: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#2563EB', 
    marginBottom: 2 
  },
  currentSubAmount: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#111827', 
    marginBottom: 4 
  },
  currentSubExpiry: { fontSize: 13, color: '#6B7280' },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#6B7280', 
    textTransform: 'uppercase', 
    letterSpacing: 0.5, 
    marginHorizontal: 16, 
    marginBottom: 12 
  },
  planCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  planCardSelected: { borderColor: '#2563EB', backgroundColor: '#FAFCFF' },
  planCardHighlight: { borderColor: '#F59E0B' },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  popularBadgeText: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#fff', 
    letterSpacing: 0.5 
  },
  planHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 14 
  },
  planName: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 3 },
  planNameSelected: { color: '#2563EB' },
  planPrice: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  planPriceHighlight: { color: '#D97706' },
  planSavings: { fontSize: 12, color: '#10B981', fontWeight: '600', marginTop: 2 },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: { borderColor: '#2563EB' },
  radioDot: { width: 11, height: 11, borderRadius: 5.5, backgroundColor: '#2563EB' },
  featureList: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureCheck: { 
    fontSize: 13, 
    color: '#10B981', 
    fontWeight: '800', 
    marginRight: 8, 
    width: 16 
  },
  featureText: { fontSize: 14, color: '#374151', flex: 1 },
  subscribeBtn: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  subscribeBtnDisabled: { opacity: 0.7 },
  subscribeBtnText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    marginBottom: 2,
  },
  subscribeBtnSubtext: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  disclaimer: {
    marginHorizontal: 24,
    marginTop: 14,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});