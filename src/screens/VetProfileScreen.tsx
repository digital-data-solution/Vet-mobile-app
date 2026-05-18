import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { apiFetch } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

interface VerifyResult {
  name?: string;
  vcnNumber?: string;
  specialization?: string;
  isVerified?: boolean;
  status?: string;
}

type CheckStatus = 'idle' | 'checking' | 'found' | 'not_found';

export default function VerifyProfessionalScreen() {
  const [vcnNumber, setVcnNumber] = useState('');
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');
  const [result, setResult] = useState<VerifyResult | null>(null);

  const checkInApp = async () => {
    if (!vcnNumber.trim()) {
      Alert.alert('Required', 'Please enter a VCN number first.');
      return;
    }
    setCheckStatus('checking');
    setResult(null);
    try {
      const res = await apiFetch(
        `/api/v1/professionals/list?vcnNumber=${encodeURIComponent(vcnNumber.trim())}&limit=1`,
        { method: 'GET' }
      );
      if (res.ok && res.body?.data?.length > 0) {
        setResult(res.body.data[0]);
        setCheckStatus('found');
      } else {
        setCheckStatus('not_found');
      }
    } catch {
      setCheckStatus('not_found');
    }
  };

  const openVcnPortal = () => {
    const query = vcnNumber.trim()
      ? `?search=${encodeURIComponent(vcnNumber.trim())}`
      : '';
    Linking.openURL(`https://portal.vcn.gov.ng/verify${query}`).catch(() =>
      Alert.alert('Error', 'Unable to open browser')
    );
  };

  const reset = () => {
    setVcnNumber('');
    setCheckStatus('idle');
    setResult(null);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconWrap}>
          <Text style={styles.headerEmoji}>🪪</Text>
        </View>
        <Text style={styles.title}>Verify a Professional</Text>
        <Text style={styles.subtitle}>
          Protect your pets — check that your vet is registered with the Veterinary Council of Nigeria (VCN)
        </Text>
      </View>

      {/* Why verify */}
      <View style={styles.whyCard}>
        <Text style={styles.cardTitle}>Why Verify?</Text>
        <ReasonRow icon="shield-checkmark-outline" color="#10B981" text="Avoid unqualified practitioners and quacks" />
        <ReasonRow icon="medal-outline" color="#F59E0B" text="Confirm active VCN registration status" />
        <ReasonRow icon="heart-outline" color="#EF4444" text="Ensure the safety and wellbeing of your pet" />
      </View>

      {/* Search form */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Check a VCN Number</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="card-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.input}
            placeholder="e.g. VCN/2024/001234"
            placeholderTextColor="#94A3B8"
            value={vcnNumber}
            onChangeText={(v) => { setVcnNumber(v); setCheckStatus('idle'); setResult(null); }}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={checkInApp}
          />
          {vcnNumber.length > 0 && (
            <TouchableOpacity onPress={reset}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Check in-app */}
        <TouchableOpacity
          style={[styles.checkBtn, checkStatus === 'checking' && styles.checkBtnDisabled]}
          onPress={checkInApp}
          disabled={checkStatus === 'checking'}
          activeOpacity={0.85}
        >
          {checkStatus === 'checking' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="search-outline" size={18} color="#fff" />
              <Text style={styles.checkBtnText}>Check on Xpress Vet</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        {/* Open VCN portal */}
        <TouchableOpacity
          style={styles.portalBtn}
          onPress={openVcnPortal}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={16} color="#2563EB" />
          <Text style={styles.portalBtnText}>Verify on VCN Portal</Text>
        </TouchableOpacity>
        <Text style={styles.portalHint}>Opens official vcn.gov.ng in your browser</Text>
      </View>

      {/* Result */}
      {checkStatus === 'found' && result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultIconWrap}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            </View>
            <View>
              <Text style={styles.resultTitle}>Registered Professional</Text>
              <Text style={styles.resultSubtitle}>Found in Xpress Vet database</Text>
            </View>
          </View>
          {result.name && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Name</Text>
              <Text style={styles.resultValue}>{result.name}</Text>
            </View>
          )}
          {result.vcnNumber && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>VCN Number</Text>
              <Text style={styles.resultValue}>{result.vcnNumber}</Text>
            </View>
          )}
          {result.specialization && (
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Specialization</Text>
              <Text style={styles.resultValue}>{result.specialization}</Text>
            </View>
          )}
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>✓ Verified</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.portalBtnSmall} onPress={openVcnPortal}>
            <Text style={styles.portalBtnSmallText}>Also confirm on VCN Portal →</Text>
          </TouchableOpacity>
        </View>
      )}

      {checkStatus === 'not_found' && (
        <View style={styles.notFoundCard}>
          <Ionicons name="warning-outline" size={32} color="#F59E0B" />
          <Text style={styles.notFoundTitle}>Not Found in Xpress Vet</Text>
          <Text style={styles.notFoundText}>
            This VCN number isn't in our database. The professional may not be registered here yet, but you can still verify directly on the official VCN portal.
          </Text>
          <TouchableOpacity style={styles.portalBtnAlt} onPress={openVcnPortal} activeOpacity={0.8}>
            <Ionicons name="open-outline" size={15} color="#fff" />
            <Text style={styles.portalBtnAltText}>Check on VCN Portal</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function ReasonRow({ icon, color, text }: { icon: any; color: string; text: string }) {
  return (
    <View style={styles.reasonRow}>
      <View style={[styles.reasonIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.reasonText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { paddingBottom: 40 },

  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  headerIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  headerEmoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  whyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
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
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  reasonIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonText: { fontSize: 14, color: '#334155', flex: 1, lineHeight: 20 },

  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#0F172A', letterSpacing: 0.5 },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    marginBottom: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkBtnDisabled: { opacity: 0.6 },
  checkBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  divider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  portalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: 6,
  },
  portalBtnText: { color: '#2563EB', fontSize: 15, fontWeight: '700' },
  portalHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  // Result card
  resultCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#ECFDF5',
  },
  resultIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: { fontSize: 16, fontWeight: '800', color: '#065F46' },
  resultSubtitle: { fontSize: 12, color: '#6EE7B7', marginTop: 2 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0FDF4',
  },
  resultLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  resultValue: { fontSize: 14, color: '#0F172A', fontWeight: '600', flex: 1, textAlign: 'right' },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 12, color: '#065F46', fontWeight: '700' },
  portalBtnSmall: { marginTop: 12, alignItems: 'center' },
  portalBtnSmallText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },

  // Not found
  notFoundCard: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
  },
  notFoundTitle: { fontSize: 17, fontWeight: '800', color: '#92400E', marginTop: 10, marginBottom: 8 },
  notFoundText: { fontSize: 14, color: '#78350F', textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  portalBtnAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 12,
    gap: 8,
  },
  portalBtnAltText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});