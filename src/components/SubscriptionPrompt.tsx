import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface SubscriptionPromptProps {
  navigation?: NativeStackNavigationProp<any>;
  feature?: string;
  isProfessional?: boolean;
  customMessage?: string;
  requiredPlan?: string;
  // When the viewer already has a plan (even expired/lower tier), pass it here.
  // The component switches to "Upgrade" mode instead of "Subscribe" mode.
  currentPlan?: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  basic:        'Basic',
  starter:      'Starter',
  pro:          'Pro',
  user_premium: 'Premium',
  user_monthly: 'Monthly',
};

export default function SubscriptionPrompt({
  navigation,
  feature = 'this feature',
  isProfessional = false,
  customMessage,
  requiredPlan,
  currentPlan,
}: SubscriptionPromptProps) {
  const isUpgrade = !!currentPlan;
  const planLabel = requiredPlan ?? (isProfessional ? 'Professional' : 'Premium');
  const currentPlanLabel = currentPlan ? (PLAN_LABELS[currentPlan] ?? currentPlan) : null;

  const handleCTA = () => navigation?.navigate('SubscriptionScreen');

  // ── Upgrade mode ──────────────────────────────────────────────────────────
  if (isUpgrade) {
    const upgradeFeatures = isProfessional
      ? [
          'Higher image upload limits for your gallery',
          'Priority placement in search results',
          'Access to advanced analytics',
          'More client messages per month',
          'Unlock all business listing features',
        ]
      : [
          'GPS-based nearby search for vets and kennels',
          'View contact details for more listings',
          'Access premium pet shops and services',
          'Higher search result limits',
          'Priority support',
        ];

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>⬆️</Text>

        <Text style={styles.title}>Upgrade Your Plan</Text>

        <Text style={styles.message}>
          {customMessage ??
            `You're on the ${currentPlanLabel} plan. Upgrade to unlock ${feature} and get more ${
              isProfessional ? 'business' : 'pet care'
            } benefits.`}
        </Text>

        <View style={styles.featuresBox}>
          <Text style={styles.featuresTitle}>Unlock with a higher plan:</Text>
          {upgradeFeatures.map((f) => (
            <FeatureItem key={f} text={f} />
          ))}
        </View>

        <TouchableOpacity style={[styles.subscribeButton, styles.upgradeButton]} onPress={handleCTA} activeOpacity={0.85}>
          <Text style={styles.subscribeButtonText}>View Upgrade Options</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Cancel anytime · Upgrade instantly · Secure payment via Paystack
        </Text>
      </View>
    );
  }

  // ── Subscribe mode (no plan at all) ───────────────────────────────────────
  const price   = isProfessional ? 'from ₦1,500' : '₦1,500';
  const ctaText = `Subscribe to ${planLabel} — ${price}/month`;

  const defaultMessage = `Subscribe to unlock ${feature} and get full access to ${
    isProfessional ? 'business listing features' : 'all Xpress Vet services'
  }.`;

  const features = isProfessional
    ? [
        'Your business listed in search results',
        'Receive unlimited client messages',
        'Full business profile visible to pet owners',
        'Contact info shown to Premium pet owners',
        'Reach thousands of active pet owners',
      ]
    : [
        'Search all vets, kennels, and pet shops',
        'View full contact details for every listing',
        'Exact address and GPS nearby search',
        'Find verified services near you',
        'Cancel anytime — no commitment',
      ];

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{isProfessional ? '⭐' : '🐾'}</Text>

      <Text style={styles.title}>Subscription Required</Text>

      <Text style={styles.message}>
        {customMessage ?? defaultMessage}
      </Text>

      <View style={styles.featuresBox}>
        <Text style={styles.featuresTitle}>What you get:</Text>
        {features.map((f) => (
          <FeatureItem key={f} text={f} />
        ))}
      </View>

      <TouchableOpacity style={styles.subscribeButton} onPress={handleCTA} activeOpacity={0.85}>
        <Text style={styles.subscribeButtonText}>{ctaText}</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Cancel anytime · No hidden fees · Secure payment via Paystack
      </Text>
    </View>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureCheck}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  featureCheck: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '800',
    marginRight: 10,
    width: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  upgradeButton: {
    backgroundColor: '#7C3AED',
    shadowColor: '#7C3AED',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
