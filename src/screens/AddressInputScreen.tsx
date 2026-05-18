import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

interface AddressData {
  state: string;
  lga: string;
  city: string;
  town: string;
  street: string;
  houseNumber: string;
  zipCode: string;
}

interface FormErrors {
  state?: string;
  lga?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
}

interface Props {
  navigation: any;
  onSave?: (address: AddressData) => void;
}

export default function AddressInputScreen({ navigation, onSave }: Props) {
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('');
  const [city, setCity] = useState('');
  const [town, setTown] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [statePickerVisible, setStatePickerVisible] = useState(false);

  const clearError = (field: keyof FormErrors) =>
    setErrors((prev) => ({ ...prev, [field]: undefined }));

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!state) newErrors.state = 'Please select a state';
    if (!lga.trim()) newErrors.lga = 'LGA is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!street.trim()) newErrors.street = 'Street is required';
    if (!houseNumber.trim()) newErrors.houseNumber = 'House number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const address: AddressData = {
      state,
      lga: lga.trim(),
      city: city.trim(),
      town: town.trim(),
      street: street.trim(),
      houseNumber: houseNumber.trim(),
      zipCode: zipCode.trim(),
    };

    if (onSave) onSave(address);
    navigation.goBack();
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
          <Text style={styles.headerEmoji}>📍</Text>
          <Text style={styles.title}>Enter Your Address</Text>
          <Text style={styles.subtitle}>Provide your full address so clients can find you.</Text>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {/* State picker */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>State *</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, errors.state && styles.inputError]}
              onPress={() => setStatePickerVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.pickerBtnText}>{state || 'Select state'}</Text>
              <Text style={styles.pickerChevron}>▾</Text>
            </TouchableOpacity>
            {errors.state ? <Text style={styles.errorText}>{errors.state}</Text> : null}
          </View>

          <FormField
            label="Local Government Area (LGA) *"
            placeholder="e.g. Ikeja"
            value={lga}
            onChangeText={(v) => { setLga(v); clearError('lga'); }}
            error={errors.lga}
          />
          <FormField
            label="City *"
            placeholder="e.g. Lagos"
            value={city}
            onChangeText={(v) => { setCity(v); clearError('city'); }}
            error={errors.city}
          />
          <FormField
            label="Town / Area (Optional)"
            placeholder="e.g. Allen Avenue Area"
            value={town}
            onChangeText={setTown}
          />
          <FormField
            label="Street *"
            placeholder="e.g. Adeola Odeku Street"
            value={street}
            onChangeText={(v) => { setStreet(v); clearError('street'); }}
            error={errors.street}
          />
          <FormField
            label="House Number *"
            placeholder="e.g. 12B"
            value={houseNumber}
            onChangeText={(v) => { setHouseNumber(v); clearError('houseNumber'); }}
            error={errors.houseNumber}
          />
          <FormField
            label="Zip Code (Optional)"
            placeholder="e.g. 100001"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>Save Address</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* State picker modal */}
      <Modal
        visible={statePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setStatePickerVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={NIGERIAN_STATES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.stateItem, state === item && styles.stateItemSelected]}
                  onPress={() => {
                    setState(item);
                    clearError('state');
                    setStatePickerVisible(false);
                  }}
                >
                  <Text style={[styles.stateItemText, state === item && styles.stateItemTextSelected]}>
                    {item}
                  </Text>
                  {state === item && <Text style={styles.stateCheck}>✓</Text>}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
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
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  keyboardType?: any;
}) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, error && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize="words"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

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
  headerEmoji: { fontSize: 52, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
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
  fieldWrapper: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { marginTop: 4, fontSize: 12, color: '#EF4444' },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 13,
    backgroundColor: '#F9FAFB',
  },
  pickerBtnText: { fontSize: 15, color: '#111827' },
  pickerChevron: { fontSize: 14, color: '#6B7280' },
  saveBtn: {
    backgroundColor: '#2563EB',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { fontSize: 18, color: '#6B7280', padding: 4 },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  stateItemSelected: { backgroundColor: '#EFF6FF' },
  stateItemText: { fontSize: 16, color: '#111827' },
  stateItemTextSelected: { color: '#2563EB', fontWeight: '700' },
  stateCheck: { fontSize: 15, color: '#2563EB', fontWeight: '800' },
});