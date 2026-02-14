import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface SubscriptionPromptProps {
  navigation?: NativeStackNavigationProp<any>;
  feature?: string;
}

/**
 * Component to show when user tries to access a feature that requires subscription
 * Can be used in ChatScreen, AppointmentScreen, etc.
 */
export default function SubscriptionPrompt({ 
  navigation, 
  feature = 'this feature' 
}: SubscriptionPromptProps) {
  
  const handleSubscribe = () => {
    if (navigation) {
      navigation.navigate('SubscriptionScreen');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={styles.title}>Subscription Required</Text>
      <Text style={styles.message}>
        Subscribe to unlock {feature} and get unlimited access to all PetCare features.
      </Text>
      
      <View style={styles.featuresBox}>
        <Text style={styles.featuresTitle}>With your subscription, you get:</Text>
        <FeatureItem text="Unlimited messaging with vets" />
        <FeatureItem text="Book appointments anytime" />
        <FeatureItem text="Track all your pets' health records" />
        <FeatureItem text="Get medication reminders" />
        <FeatureItem text="Priority customer support" />
      </View>

      <TouchableOpacity 
        style={styles.subscribeButton} 
        onPress={handleSubscribe}
        activeOpacity={0.85}
      >
        <Text style={styles.subscribeButtonText}>View Plans — From ₦500/month</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Cancel anytime • No hidden fees • Secure payment
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
    alignItems: 'center',
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