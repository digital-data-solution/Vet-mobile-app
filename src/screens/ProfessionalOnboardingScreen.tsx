import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import MediaUploader from '../components/Mediauploader';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfessionalOnboarding'>;

type Role = 'vet' | 'kennel';

interface MediaImage {
  url:      string;
  publicId: string;
}

interface FormErrors {
  name?: string;
  vcnNumber?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export default function ProfessionalOnboardingScreen({ navigation, route }: Props) {
  // Role is set from route param OR from the existing profile once loaded
  const [role, setRole]       = useState<Role>((route?.params?.role as Role) ?? 'vet');
  const [name, setName]       = useState('');
  const [vcnNumber, setVcnNumber]     = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone]     = useState('');
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [errors, setErrors]   = useState<FormErrors>({});
  const [galleryImages, setGalleryImages] = useState<MediaImage[]>([]);

  // Load existing profile + check subscription on every focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const init = async () => {
        setProfileLoading(true);

        // Load existing profile (non-blocking on error — first-time users have none)
        let hasExisting = false;
        try {
          const profileRes = await apiFetch('/api/v1/professionals/me', { method: 'GET' });
          if (isActive && profileRes.ok && profileRes.body?.data) {
            const p = profileRes.body.data;
            hasExisting = true;
            setHasExistingProfile(true);
            setRole(p.role === 'kennel' ? 'kennel' : 'vet');
            setName(p.name              ?? '');
            setVcnNumber(p.vcnNumber    ?? '');
            setBusinessName(p.businessName ?? '');
            setAddress(p.address        ?? '');
            setSpecialization(p.specialization ?? '');
            setPhone(p.phone            ?? '');
            setEmail(p.email            ?? '');
          }
        } catch {
          // 404 = no profile yet — normal for first-time users
        } finally {
          if (isActive) setProfileLoading(false);
        }

        // Subscription gate — only for new profiles, not for editing existing ones
        if (!hasExisting) {
          try {
            const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
            if (isActive && (!res.ok || !res.body?.data?.isActive)) {
              Alert.alert(
                'Subscription Required',
                'You need an active subscription to register as a professional.',
                [{ text: 'Go to Subscription', onPress: () => navigation.navigate('SubscriptionScreen') }],
              );
            }
          } catch {
            // silent — don't block the screen on a subscription check failure
          }
        }
      };

      init();
      return () => { isActive = false; };
    }, [navigation]),
  );

  const validateVet = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim())      newErrors.name      = 'Full name is required';
    if (!vcnNumber.trim()) newErrors.vcnNumber = 'VCN number is required';
    if (!address.trim())   newErrors.address   = 'Address is required';

    if (phone && !/^[\d\s\+\-\(\)]+$/.test(phone))
      newErrors.phone = 'Please enter a valid phone number';
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      newErrors.email = 'Please enter a valid email address';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateKennel = (): boolean => {
    const newErrors: FormErrors = {};
    if (!name.trim())         newErrors.name         = 'Owner name is required';
    if (!businessName.trim()) newErrors.businessName = 'Kennel name is required';
    if (!address.trim())      newErrors.address      = 'Address is required';

    if (phone && !/^[\d\s\+\-\(\)]+$/.test(phone))
      newErrors.phone = 'Please enter a valid phone number';
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      newErrors.email = 'Please enter a valid email address';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const register = async () => {
    const isValid = role === 'vet' ? validateVet() : validateKennel();
    if (!isValid) return;

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name:    name.trim(),
        address: address.trim(),
        specialization: specialization.trim() || undefined,
        phone:   phone.trim() || undefined,
        email:   email.trim() || undefined,
        ...(role === 'vet' && {
          vcnNumber:    vcnNumber.trim(),
          businessName: businessName.trim() || undefined,
        }),
        ...(role === 'kennel' && {
          businessName: businessName.trim(),
        }),
      };

      let res;
      if (hasExistingProfile) {
        // Update existing profile
        res = await apiFetch('/api/v1/professionals/profile', {
          method:  'PUT',
          body:    JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // Create new profile
        res = await apiFetch('/api/v1/professionals/onboard', {
          method:  'POST',
          body:    JSON.stringify({ ...payload, role }),
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (res.ok && res.body?.success) {
        if (hasExistingProfile) {
          Alert.alert('Profile Updated', 'Your profile has been updated successfully.', [
            { text: 'Done', onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert(
            'Registration Successful! 🎉',
            role === 'vet'
              ? 'Your veterinarian profile has been created and is pending verification. You will be notified once approved.'
              : 'Your kennel has been registered and is now live!',
            [{ text: 'Continue', onPress: () => navigation.navigate('MainTabs') }],
          );
        }
      } else {
        const errorMsg = res.body?.message || 'Please check your details and try again.';
        Alert.alert(hasExistingProfile ? 'Update Failed' : 'Registration Failed', errorMsg);
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const isVet   = role === 'vet';
  const title   = hasExistingProfile
    ? (isVet ? 'Edit Veterinarian Profile' : 'Edit Kennel Profile')
    : (isVet ? 'Register as Veterinarian'  : 'Register Your Kennel');
  const subtitle = hasExistingProfile
    ? 'Update your business information below.'
    : isVet
      ? 'Create your professional profile to start connecting with clients.'
      : 'List your kennel to reach more pet owners.';
  const submitLabel = hasExistingProfile
    ? 'Save Changes'
    : isVet ? 'Register as Veterinarian' : 'Register Kennel';

  if (profileLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading profile...</Text>
      </View>
    );
  }

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
          <Text style={styles.emoji}>{isVet ? '👨‍⚕️' : '🐕'}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {isVet ? (
            <>
              <FormField
                label="Full Name *"
                value={name}
                onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }}
                placeholder="Dr. Amaka Obi"
                error={errors.name}
              />
              <FormField
                label="VCN Registration Number *"
                value={vcnNumber}
                onChangeText={(v) => { setVcnNumber(v); setErrors((e) => ({ ...e, vcnNumber: undefined })); }}
                placeholder="e.g. VCN/2024/001234"
                error={errors.vcnNumber}
                autoCapitalize="characters"
              />
              <FormField
                label="Clinic / Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="e.g. Paws & Claws Veterinary Clinic"
              />
              <FormField
                label="Address * (will be geocoded)"
                value={address}
                onChangeText={(v) => { setAddress(v); setErrors((e) => ({ ...e, address: undefined })); }}
                placeholder="e.g. 12 Adeola Odeku St, Victoria Island, Lagos"
                error={errors.address}
                multiline
              />
              <FormField
                label="Specialization"
                value={specialization}
                onChangeText={setSpecialization}
                placeholder="e.g. Small Animals, Surgery, Dermatology"
              />
              <FormField
                label="Phone Number"
                value={phone}
                onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
                placeholder="e.g. +234 801 234 5678"
                error={errors.phone}
                keyboardType="phone-pad"
              />
              <FormField
                label="Email Address"
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
                placeholder="e.g. dr.amaka@clinic.ng"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          ) : (
            <>
              <FormField
                label="Your Name *"
                value={name}
                onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }}
                placeholder="e.g. John Doe"
                error={errors.name}
              />
              <FormField
                label="Kennel Name *"
                value={businessName}
                onChangeText={(v) => { setBusinessName(v); setErrors((e) => ({ ...e, businessName: undefined })); }}
                placeholder="e.g. Happy Paws Kennel"
                error={errors.businessName}
              />
              <FormField
                label="Address * (will be geocoded)"
                value={address}
                onChangeText={(v) => { setAddress(v); setErrors((e) => ({ ...e, address: undefined })); }}
                placeholder="e.g. 45 Admiralty Way, Lekki, Lagos"
                error={errors.address}
                multiline
              />
              <FormField
                label="Services Offered"
                value={specialization}
                onChangeText={setSpecialization}
                placeholder="e.g. Boarding, Grooming, Training"
              />
              <FormField
                label="Phone Number"
                value={phone}
                onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: undefined })); }}
                placeholder="e.g. +234 801 234 5678"
                error={errors.phone}
                keyboardType="phone-pad"
              />
              <FormField
                label="Email Address"
                value={email}
                onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: undefined })); }}
                placeholder="e.g. contact@happypaws.ng"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}
        </View>

        {/* Media Uploader for business/gallery images */}
        <View style={{ marginVertical: 18 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
            {isVet ? 'Clinic Gallery (optional)' : 'Kennel Gallery (optional)'}
          </Text>
          <MediaUploader
            userType={isVet ? 'vet' : 'kennel_owner'}
            existingImages={galleryImages}
            onImagesUpdate={setGalleryImages}
          />
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            {isVet
              ? 'Your address will be automatically converted to map coordinates for location-based search. Your profile will be reviewed by our team before going live.'
              : 'Your kennel will be automatically approved and listed in our directory immediately.'}
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={register}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By registering, you confirm that all information provided is accurate and you agree to our terms of service.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  autoCapitalize,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  multiline?: boolean;
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
      {error ? <Text style={fieldStyles.errorText}>{error}</Text> : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper:       { marginBottom: 16 },
  label:         { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputError:     { borderColor: '#EF4444' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  errorText:      { color: '#EF4444', fontSize: 12, marginTop: 4 },
});

const styles = StyleSheet.create({
  scroll:     { flex: 1, backgroundColor: '#F3F4F6' },
  container:  { paddingBottom: 40 },
  header: {
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
  emoji:    { fontSize: 52, marginBottom: 10 },
  title:    { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center', paddingHorizontal: 20 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 6, paddingHorizontal: 24 },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 16, marginRight: 10, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  submitButton: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginHorizontal: 20,
    lineHeight: 18,
  },
});
