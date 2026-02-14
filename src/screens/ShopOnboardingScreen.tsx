import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { apiFetch } from '../api/client';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface FormErrors {
  shopName?: string;
  ownerName?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export default function ShopOnboardingScreen({ navigation }: Props) {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!shopName.trim()) newErrors.shopName = 'Shop name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    
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

  const clearError = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const registerShop = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: shopName.trim(),
        ownerName: ownerName.trim() || undefined,
        address: address.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        description: description.trim() || undefined,
        services: description.trim() ? [description.trim()] : [],
      };

      const res = await apiFetch('/api/v1/shops/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok && res.body?.success) {
        Alert.alert(
          'Shop Registered! 🎉',
          'Your pet shop is now listed and visible to thousands of pet owners nearby.',
          [{ text: 'Continue', onPress: () => navigation.goBack() }]
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
          <Text style={styles.headerEmoji}>🛒</Text>
          <Text style={styles.title}>Register Your Pet Shop</Text>
          <Text style={styles.subtitle}>
            List your shop on Xpress Vet to reach thousands of pet owners nearby.
          </Text>
        </View>

        {/* Required fields */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Shop Details</Text>

          <FormField
            label="Shop Name *"
            placeholder="e.g. Furry Friends Pet Store"
            value={shopName}
            onChangeText={(v) => { setShopName(v); clearError('shopName'); }}
            error={errors.shopName}
          />
          <FormField
            label="Owner Name"
            placeholder="e.g. Chidi Okafor"
            value={ownerName}
            onChangeText={(v) => { setOwnerName(v); clearError('ownerName'); }}
            error={errors.ownerName}
          />
          <FormField
            label="Address * (will be geocoded)"
            placeholder="e.g. 5 Allen Avenue, Ikeja, Lagos"
            value={address}
            onChangeText={(v) => { setAddress(v); clearError('address'); }}
            error={errors.address}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Optional fields */}
        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>Contact Information</Text>

          <FormField
            label="Phone Number"
            placeholder="e.g. +234 801 234 5678"
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError('phone'); }}
            error={errors.phone}
            keyboardType="phone-pad"
          />
          <FormField
            label="Email Address"
            placeholder="e.g. info@myshop.com"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormField
            label="Description"
            placeholder="Tell pet owners about your shop, what you sell, specialities..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Your address will be automatically converted to map coordinates for location-based search. 
            Your shop will be live immediately!
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={registerShop}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Register Shop</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By registering, you confirm that all information provided is accurate.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType,
  autoCapitalize,
  multiline,
  numberOfLines,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  multiline?: boolean;
  numberOfLines?: number;
}) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          fieldStyles.input,
          multiline && fieldStyles.inputMultiline,
          error && fieldStyles.inputError,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { marginTop: 4, fontSize: 12, color: '#EF4444' },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingBottom: 40 },
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
  headerEmoji: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  infoIcon: { fontSize: 18, marginRight: 10, marginTop: 2 },
  infoText: { flex: 1, fontSize: 13, color: '#C2410C', lineHeight: 18 },
  submitBtn: {
    backgroundColor: '#F97316',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    marginHorizontal: 24,
    marginTop: 14,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});