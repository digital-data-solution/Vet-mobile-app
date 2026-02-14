import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { apiFetch } from '../api/client';

interface Props {
  navigation: any;
}

interface FormErrors {
  ownerName?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export default function KennelOnboardingScreen({ navigation }: Props) {
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [services, setServices] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    }
    
    if (!businessName.trim()) {
      newErrors.businessName = 'Kennel name is required';
    }
    
    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }
    
    // Optional but validate format if provided
    if (phone && !/^[\d\s\+\-\(\)]+$/.test(phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const register = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: ownerName.trim(),
        role: 'kennel',
        businessName: businessName.trim(),
        address: address.trim(),
        specialization: services.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      };

      const res = await apiFetch('/api/v1/professionals/onboard', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok && res.body?.success) {
        Alert.alert(
          'Registration Successful! 🎉',
          'Your kennel has been registered and is now live! Pet owners can find you in our directory.',
          [{ text: 'Continue', onPress: () => navigation.navigate('MainTabs') }]
        );
      } else {
        const errorMsg = res.body?.message || 'Please check your details and try again.';
        Alert.alert('Registration Failed', errorMsg);
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🐕</Text>
          <Text style={styles.title}>Register Your Kennel</Text>
          <Text style={styles.subtitle}>
            List your kennel to reach pet owners looking for boarding, grooming, and training services.
          </Text>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsCard}>
          <Text style={styles.cardTitle}>Why List Your Kennel?</Text>
          <BenefitRow emoji="🔍" text="Get discovered by local pet owners" />
          <BenefitRow emoji="📍" text="Show up in location-based searches" />
          <BenefitRow emoji="⚡" text="No verification delay — go live instantly" />
          <BenefitRow emoji="📞" text="Receive direct inquiries and bookings" />
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Kennel Information</Text>
          
          <FormField
            label="Your Name (Owner) *"
            value={ownerName}
            onChangeText={(v) => { 
              setOwnerName(v); 
              setErrors((e) => ({ ...e, ownerName: undefined })); 
            }}
            placeholder="e.g. John Doe"
            error={errors.ownerName}
          />
          
          <FormField
            label="Kennel / Business Name *"
            value={businessName}
            onChangeText={(v) => { 
              setBusinessName(v); 
              setErrors((e) => ({ ...e, businessName: undefined })); 
            }}
            placeholder="e.g. Happy Paws Kennel & Spa"
            error={errors.businessName}
          />
          
          <FormField
            label="Full Address *"
            value={address}
            onChangeText={(v) => { 
              setAddress(v); 
              setErrors((e) => ({ ...e, address: undefined })); 
            }}
            placeholder="e.g. 45 Admiralty Way, Lekki Phase 1, Lagos"
            error={errors.address}
            multiline
            helpText="Your address will be geocoded for map-based search"
          />
          
          <FormField
            label="Services Offered"
            value={services}
            onChangeText={setServices}
            placeholder="e.g. Boarding, Grooming, Training, Daycare"
            helpText="Separate multiple services with commas"
          />
          
          <FormField
            label="Contact Phone"
            value={phone}
            onChangeText={(v) => { 
              setPhone(v); 
              setErrors((e) => ({ ...e, phone: undefined })); 
            }}
            placeholder="e.g. +234 801 234 5678"
            error={errors.phone}
            keyboardType="phone-pad"
          />
          
          <FormField
            label="Contact Email"
            value={email}
            onChangeText={(v) => { 
              setEmail(v); 
              setErrors((e) => ({ ...e, email: undefined })); 
            }}
            placeholder="e.g. contact@happypaws.ng"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Your kennel will be <Text style={styles.infoBold}>automatically approved</Text> and 
            listed in our directory immediately. Your address will be converted to map coordinates 
            so pet owners can find you by location.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={register}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Register Kennel</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By registering, you confirm that all information provided is accurate and you agree to our terms of service.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

function BenefitRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={benefitStyles.row}>
      <View style={benefitStyles.emojiBox}>
        <Text style={benefitStyles.emoji}>{emoji}</Text>
      </View>
      <Text style={benefitStyles.text}>{text}</Text>
    </View>
  );
}

const benefitStyles = StyleSheet.create({
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 10,
    gap: 12,
  },
  emojiBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 18 },
  text: { 
    fontSize: 14, 
    color: '#374151', 
    flex: 1, 
    lineHeight: 20,
    fontWeight: '500',
  },
});

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  autoCapitalize,
  keyboardType,
  multiline,
  helpText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  helpText?: string;
}) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          fieldStyles.input,
          error && fieldStyles.inputError,
          multiline && fieldStyles.inputMultiline,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoCapitalize={autoCapitalize ?? 'words'}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {error ? (
        <Text style={fieldStyles.errorText}>{error}</Text>
      ) : helpText ? (
        <Text style={fieldStyles.helpText}>{helpText}</Text>
      ) : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 18 },
  label: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#374151', 
    marginBottom: 7 
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: { 
    borderColor: '#EF4444', 
    backgroundColor: '#FEF2F2' 
  },
  errorText: { 
    marginTop: 5, 
    fontSize: 12, 
    color: '#EF4444',
    fontWeight: '500',
  },
  helpText: {
    marginTop: 5,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

// ============================================================================
// MAIN STYLES
// ============================================================================

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingBottom: 40 },
  
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emoji: { fontSize: 60, marginBottom: 14 },
  title: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: '#111827', 
    textAlign: 'center', 
    marginBottom: 10 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 21,
    paddingHorizontal: 10,
  },

  benefitsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: '#9CA3AF', 
    textTransform: 'uppercase', 
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  infoIcon: { fontSize: 18, marginRight: 10, marginTop: 2 },
  infoText: { 
    flex: 1, 
    fontSize: 13, 
    color: '#92400E', 
    lineHeight: 19 
  },
  infoBold: { fontWeight: '700' },

  submitButton: {
    backgroundColor: '#F59E0B',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  
  disclaimer: {
    marginHorizontal: 24,
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});