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
  Pressable,
} from 'react-native';
import { apiFetch } from '../api/client';
import MediaUploader from '../components/Mediauploader';
import { useAuth } from '../navigation';
import type { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfessionalOnboarding'>;

type Role =
  | 'vet' | 'kennel' | 'groomer' | 'trainer' | 'pet_sitter'
  | 'pet_transport' | 'cremation_service' | 'agro_vet_supplier' | 'insurance_provider';

interface MediaImage { url: string; publicId: string; }

interface FormErrors {
  name?: string;
  vcnNumber?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface RoleConfig {
  label: string;
  emoji: string;
  color: string;
  businessNameLabel: string;
  specializationLabel: string;
  specializationPlaceholder: string;
  requiresVCN: boolean;
  requiresBusinessName: boolean;
  requiresAdminReview: boolean;
}

const ROLE_CONFIG: Record<Role, RoleConfig> = {
  vet: {
    label: 'Veterinarian', emoji: '👨‍⚕️', color: '#2563EB',
    businessNameLabel: 'Clinic / Business Name',
    specializationLabel: 'Specialization',
    specializationPlaceholder: 'e.g. Small Animals, Surgery, Livestock',
    requiresVCN: true, requiresBusinessName: false, requiresAdminReview: true,
  },
  kennel: {
    label: 'Kennel', emoji: '🐕', color: '#7C3AED',
    businessNameLabel: 'Kennel Name *',
    specializationLabel: 'Services Offered',
    specializationPlaceholder: 'e.g. Boarding, Daycare, Training',
    requiresVCN: false, requiresBusinessName: true, requiresAdminReview: false,
  },
  groomer: {
    label: 'Groomer', emoji: '✂️', color: '#DB2777',
    businessNameLabel: 'Business Name',
    specializationLabel: 'Services Offered',
    specializationPlaceholder: 'e.g. Bath & Brush, Haircut, Nail Trim',
    requiresVCN: false, requiresBusinessName: false, requiresAdminReview: false,
  },
  trainer: {
    label: 'Pet Trainer', emoji: '🎓', color: '#059669',
    businessNameLabel: 'Business Name',
    specializationLabel: 'Training Methods / Breeds',
    specializationPlaceholder: 'e.g. Obedience, Agility, Puppy Classes',
    requiresVCN: false, requiresBusinessName: false, requiresAdminReview: false,
  },
  pet_sitter: {
    label: 'Pet Sitter', emoji: '🏠', color: '#D97706',
    businessNameLabel: 'Business Name',
    specializationLabel: 'Pet Types Accepted',
    specializationPlaceholder: 'e.g. Dogs, Cats, Small Animals',
    requiresVCN: false, requiresBusinessName: false, requiresAdminReview: false,
  },
  pet_transport: {
    label: 'Pet Transport', emoji: '🚐', color: '#0891B2',
    businessNameLabel: 'Company / Fleet Name *',
    specializationLabel: 'Routes / Services',
    specializationPlaceholder: 'e.g. Lagos–Abuja, Airport runs, Vet transfers',
    requiresVCN: false, requiresBusinessName: true, requiresAdminReview: false,
  },
  cremation_service: {
    label: 'Cremation Service', emoji: '🕊️', color: '#64748B',
    businessNameLabel: 'Business Name *',
    specializationLabel: 'Services Offered',
    specializationPlaceholder: 'e.g. Private cremation, Communal, Memorial',
    requiresVCN: false, requiresBusinessName: true, requiresAdminReview: false,
  },
  agro_vet_supplier: {
    label: 'Agro-Vet Supplier', emoji: '🌾', color: '#65A30D',
    businessNameLabel: 'Business / Store Name *',
    specializationLabel: 'Products / Categories',
    specializationPlaceholder: 'e.g. Feeds, Vaccines, Livestock equipment',
    requiresVCN: false, requiresBusinessName: true, requiresAdminReview: false,
  },
  insurance_provider: {
    label: 'Insurance Provider', emoji: '🛡️', color: '#7C3AED',
    businessNameLabel: 'Company Name *',
    specializationLabel: 'Coverage Types',
    specializationPlaceholder: 'e.g. Health, Accident, Third-party liability',
    requiresVCN: false, requiresBusinessName: true, requiresAdminReview: true,
  },
};

const ROLE_GROUPS: { label: string; roles: Role[] }[] = [
  { label: 'Medical', roles: ['vet'] },
  { label: 'Care & Services', roles: ['kennel', 'groomer', 'trainer', 'pet_sitter'] },
  { label: 'Business', roles: ['pet_transport', 'cremation_service', 'agro_vet_supplier', 'insurance_provider'] },
];

const VET_SPECIALIZATIONS = [
  'General Practice', 'Small Animals', 'Large Animals', 'Livestock & Farm Animals',
  'Poultry', 'Exotic & Wildlife', 'Surgery', 'Dentistry',
  'Dermatology', 'Oncology', 'Cardiology', 'Ophthalmology',
  'Reproduction', 'Aquatic Animals',
];

export default function ProfessionalOnboardingScreen({ navigation, route }: Props) {
  const { refreshRole } = useAuth();

  const [role, setRole]               = useState<Role>((route?.params?.role as Role) ?? 'vet');
  const [name, setName]               = useState('');
  const [vcnNumber, setVcnNumber]     = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress]         = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasExistingProfile, setHasExistingProfile] = useState(false);
  const [profileViews, setProfileViews] = useState<number>(0);
  const [errors, setErrors]           = useState<FormErrors>({});
  const [galleryImages, setGalleryImages] = useState<MediaImage[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const init = async () => {
        setProfileLoading(true);

        let hasExisting = false;
        try {
          const profileRes = await apiFetch('/api/v1/professionals/me', { method: 'GET' });
          if (isActive && profileRes.ok && profileRes.body?.data) {
            const p = profileRes.body.data;
            hasExisting = true;
            setHasExistingProfile(true);
            setRole(p.role as Role);
            setName(p.name ?? '');
            setVcnNumber(p.vcnNumber ?? '');
            setBusinessName(p.businessName ?? '');
            setAddress(p.address ?? '');
            setSpecialization(p.specialization ?? '');
            setPhone(p.phone ?? '');
            setEmail(p.email ?? '');
            setGalleryImages(p.mediaImages ?? []);
            setProfileViews(p.profileViews ?? 0);
          }
        } catch {
          // 404 = no profile yet
        } finally {
          if (isActive) setProfileLoading(false);
        }

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
            // silent
          }
        }
      };

      init();
      return () => { isActive = false; };
    }, [navigation]),
  );

  const validate = (): boolean => {
    const cfg = ROLE_CONFIG[role];
    const newErrors: FormErrors = {};

    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (cfg.requiresVCN && !vcnNumber.trim()) newErrors.vcnNumber = 'VCN number is required';
    if (cfg.requiresBusinessName && !businessName.trim())
      newErrors.businessName = `${cfg.businessNameLabel.replace(' *', '')} is required`;
    if (phone && !/^[\d\s\+\-\(\)]+$/.test(phone))
      newErrors.phone = 'Please enter a valid phone number';
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      newErrors.email = 'Please enter a valid email address';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const register = async () => {
    if (!validate()) {
      Alert.alert('Check Your Details', 'Please fill in all required fields correctly before submitting.');
      return;
    }

    setLoading(true);
    try {
      const cfg = ROLE_CONFIG[role];
      const payload: Record<string, unknown> = {
        name:           name.trim(),
        address:        address.trim(),
        specialization: specialization.trim() || undefined,
        phone:          phone.trim() || undefined,
        email:          email.trim() || undefined,
        ...(cfg.requiresVCN && { vcnNumber: vcnNumber.trim() }),
        ...((cfg.requiresBusinessName || businessName.trim()) && {
          businessName: businessName.trim() || undefined,
        }),
      };

      let res;
      if (hasExistingProfile) {
        res = await apiFetch('/api/v1/professionals/profile', {
          method:  'PUT',
          body:    JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
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
          await refreshRole();
          const locationSet = !!res.body?.data?.location;
          const cfg = ROLE_CONFIG[role];
          if (!locationSet) {
            Alert.alert(
              'Profile Created',
              "We couldn't automatically locate your address for map-based search. You can set it manually now so clients can find you nearby.",
              [
                {
                  text: 'Set Location Manually',
                  onPress: () => navigation.navigate('AddressInput', { mode: 'professional' }),
                },
                { text: 'Skip for Now', style: 'cancel', onPress: () => navigation.navigate('MainTabs') },
              ],
            );
          } else {
            Alert.alert(
              'Registration Successful!',
              cfg.requiresAdminReview
                ? 'Your profile has been created and is pending admin review. You will be notified once approved.'
                : `Your ${cfg.label} profile is now live!`,
              [{ text: 'Continue', onPress: () => navigation.navigate('MainTabs') }],
            );
          }
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

  const cfg = ROLE_CONFIG[role];

  const title = hasExistingProfile
    ? `Edit ${cfg.label} Profile`
    : `Register as ${cfg.label}`;
  const subtitle = hasExistingProfile
    ? 'Update your information below.'
    : cfg.requiresAdminReview
      ? 'Create your profile — it will be reviewed before going live.'
      : `List your ${cfg.label.toLowerCase()} to reach more pet owners.`;
  const submitLabel = hasExistingProfile ? 'Save Changes' : `Register as ${cfg.label}`;

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
          <Text style={styles.emoji}>{cfg.emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {hasExistingProfile && (
            <View style={styles.viewsBadge}>
              <Text style={styles.viewsBadgeText}>
                👁 {profileViews.toLocaleString()} profile view{profileViews !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Role Picker — only for new profiles */}
        {!hasExistingProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Your Role</Text>
            {ROLE_GROUPS.map((group) => (
              <View key={group.label}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={styles.roleRow}>
                  {group.roles.map((r) => {
                    const rc = ROLE_CONFIG[r];
                    const selected = role === r;
                    return (
                      <Pressable
                        key={r}
                        style={[
                          styles.roleChip,
                          selected && { backgroundColor: rc.color, borderColor: rc.color },
                        ]}
                        onPress={() => { setRole(r); setErrors({}); }}
                      >
                        <Text style={styles.roleChipEmoji}>{rc.emoji}</Text>
                        <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                          {rc.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Form */}
        <View style={styles.formCard}>
          <FormField
            label={role === 'vet' ? 'Full Name *' : 'Your Name *'}
            value={name}
            onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })); }}
            placeholder={role === 'vet' ? 'Dr. Amaka Obi' : 'e.g. John Doe'}
            error={errors.name}
          />

          {/* VCN — vets only */}
          {cfg.requiresVCN && (
            <FormField
              label="VCN Registration Number *"
              value={vcnNumber}
              onChangeText={(v) => { setVcnNumber(v); setErrors((e) => ({ ...e, vcnNumber: undefined })); }}
              placeholder="e.g. VCN/2024/001234"
              error={errors.vcnNumber}
              autoCapitalize="characters"
            />
          )}

          {/* Business name — required for some roles, optional for others */}
          {(cfg.requiresBusinessName || ['vet', 'groomer', 'trainer', 'pet_sitter'].includes(role)) && (
            <FormField
              label={cfg.businessNameLabel}
              value={businessName}
              onChangeText={(v) => { setBusinessName(v); setErrors((e) => ({ ...e, businessName: undefined })); }}
              placeholder={
                role === 'vet' ? 'e.g. Paws & Claws Veterinary Clinic'
                : role === 'kennel' ? 'e.g. Happy Paws Kennel'
                : role === 'pet_transport' ? 'e.g. SafePaws Logistics'
                : role === 'insurance_provider' ? 'e.g. PetGuard Insurance Ltd'
                : 'e.g. Your business name'
              }
              error={errors.businessName}
            />
          )}

          <FormField
            label="Address * (will be geocoded)"
            value={address}
            onChangeText={(v) => { setAddress(v); setErrors((e) => ({ ...e, address: undefined })); }}
            placeholder="e.g. 12 Adeola Odeku St, Victoria Island, Lagos"
            error={errors.address}
            multiline
          />

          {/* Vet specialization chips */}
          {role === 'vet' ? (
            <View style={fieldStyles.wrapper}>
              <Text style={fieldStyles.label}>{cfg.specializationLabel}</Text>
              <View style={styles.specChipsWrap}>
                {VET_SPECIALIZATIONS.map((spec) => {
                  const active = specialization.split(',').map((s) => s.trim()).includes(spec);
                  return (
                    <Pressable
                      key={spec}
                      style={[styles.specChip, active && styles.specChipActive]}
                      onPress={() => {
                        const parts = specialization.split(',').map((s) => s.trim()).filter(Boolean);
                        const idx = parts.indexOf(spec);
                        if (idx >= 0) parts.splice(idx, 1);
                        else parts.push(spec);
                        setSpecialization(parts.join(', '));
                      }}
                    >
                      <Text style={[styles.specChipText, active && styles.specChipTextActive]}>{spec}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={specialization}
                onChangeText={setSpecialization}
                style={[fieldStyles.input, { marginTop: 8 }]}
                placeholder="Or type custom specializations…"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="words"
              />
            </View>
          ) : (
            <FormField
              label={cfg.specializationLabel}
              value={specialization}
              onChangeText={setSpecialization}
              placeholder={cfg.specializationPlaceholder}
            />
          )}

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
            placeholder="e.g. contact@example.ng"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Gallery */}
        <View style={{ marginHorizontal: 16, marginVertical: 18 }}>
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
            {cfg.label} Gallery (optional)
          </Text>
          <MediaUploader
            userType={role === 'kennel' ? 'kennel_owner' : role}
            existingImages={galleryImages}
            onImagesUpdate={setGalleryImages}
          />
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            {cfg.requiresAdminReview
              ? 'Your profile will be reviewed by our team before going live. You will be notified once approved.'
              : 'Your profile will be automatically listed in our directory once submitted.'}
          </Text>
        </View>

        {/* Submit */}
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: cfg.color },
            loading && styles.submitButtonDisabled,
            { opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={register}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{submitLabel}</Text>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          By registering, you confirm that all information provided is accurate and you agree to our terms of service.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label, value, onChangeText, placeholder, error,
  autoCapitalize, keyboardType, multiline,
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
        style={[fieldStyles.input, error && fieldStyles.inputError, multiline && fieldStyles.inputMultiline]}
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
  wrapper:        { marginBottom: 16 },
  label:          { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
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
  scroll:    { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingBottom: 40 },
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
  viewsBadge: {
    marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#BFDBFE',
  },
  viewsBadgeText: { fontSize: 13, fontWeight: '600', color: '#1E40AF' },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  groupLabel:   { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 8, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  roleRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F9FAFB',
    gap: 5,
  },
  roleChipEmoji:        { fontSize: 14 },
  roleChipText:         { fontSize: 13, fontWeight: '600', color: '#374151' },
  roleChipTextSelected: { color: '#fff' },
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
  specChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  specChip: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F9FAFB',
  },
  specChipActive:     { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  specChipText:       { fontSize: 12, fontWeight: '500', color: '#374151' },
  specChipTextActive: { color: '#fff' },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'flex-start',
  },
  infoIcon: { fontSize: 16, marginRight: 10, marginTop: 1 },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  submitButton: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
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
