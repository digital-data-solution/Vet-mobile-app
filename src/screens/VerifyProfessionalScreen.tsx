import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

type LookupState = 'idle' | 'opening' | 'done';

export default function VerifyProfessionalScreen() {
  const [vcnNumber, setVcnNumber] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');

    if (!vcnNumber.trim()) {
      setError('Please enter a VCN number before searching.');
      return;
    }

    // Basic format hint — VCN numbers typically follow VCN/YYYY/NNNNN
    const cleaned = vcnNumber.trim().toUpperCase();

    setLookupState('opening');

    // The portal search URL with the VCN number pre-filled
    const url = `https://portal.vcn.gov.ng/verify?search=${encodeURIComponent(cleaned)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        // Fallback: open portal homepage if deep link not supported
        await Linking.openURL('https://portal.vcn.gov.ng');
      } else {
        await Linking.openURL(url);
      }
      setLookupState('done');
    } catch {
      setLookupState('idle');
      Alert.alert(
        'Unable to Open Browser',
        'Could not open the VCN portal automatically. Please visit portal.vcn.gov.ng and search manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReset = () => {
    setVcnNumber('');
    setLookupState('idle');
    setError('');
  };

  // ── Post-lookup state ────────────────────────────────────────────────────
  if (lookupState === 'done') {
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneEmoji}>🔍</Text>
        <Text style={styles.doneTitle}>Portal Opened</Text>
        <Text style={styles.doneSubtitle}>
          The VCN portal has been opened with{' '}
          <Text style={styles.vcnHighlight}>{vcnNumber.trim().toUpperCase()}</Text>.{'\n\n'}
          On the portal, check that:
        </Text>

        <View style={styles.checkList}>
          <CheckRow text="The practitioner's name and photo match" />
          <CheckRow text="The licence status shows Active" />
          <CheckRow text="The specialisation matches what was advertised" />
          <CheckRow text="The expiry date has not passed" />
        </View>

        <TouchableOpacity style={styles.reopenBtn} onPress={handleVerify} activeOpacity={0.85}>
          <Text style={styles.reopenBtnText}>Reopen Portal ↗</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} activeOpacity={0.85}>
          <Text style={styles.resetBtnText}>Search Another VCN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main screen ──────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🔬</Text>
        <Text style={styles.title}>Verify a Professional</Text>
        <Text style={styles.subtitle}>
          Enter the vet's VCN number to confirm they are registered with the Veterinary Council of Nigeria
          and avoid quackery.
        </Text>
      </View>

      {/* Info card */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Why Verify?</Text>
        <CheckRow text="Confirm the practitioner is licensed" />
        <CheckRow text="Check their licence is still active" />
        <CheckRow text="Protect your pet from unqualified practitioners" />
      </View>

      {/* Search card */}
      <View style={styles.searchCard}>
        <Text style={styles.cardTitle}>Enter VCN Number</Text>
        <Text style={styles.fieldHint}>
          You can find a vet's VCN number on their profile or by asking them directly.
          It usually follows the format <Text style={styles.mono}>VCN/YYYY/NNNNN</Text>.
        </Text>

        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          placeholder="e.g. VCN/2019/00123"
          placeholderTextColor="#9CA3AF"
          value={vcnNumber}
          onChangeText={(v) => { setVcnNumber(v); setError(''); }}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={handleVerify}
          editable={lookupState !== 'opening'}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.verifyBtn, lookupState === 'opening' && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={lookupState === 'opening'}
          activeOpacity={0.85}
        >
          {lookupState === 'opening' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.verifyBtnText}>Search on VCN Portal ↗</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* What to look for */}
      <View style={styles.tipsCard}>
        <Text style={styles.cardTitle}>What to Check on the Portal</Text>
        <TipRow
          number="1"
          title="Name & Photo"
          desc="Confirm the registered name and photo match the person you're dealing with."
        />
        <TipRow
          number="2"
          title="Licence Status"
          desc="The status should say Active. Expired or Suspended means they cannot legally practise."
        />
        <TipRow
          number="3"
          title="Specialisation"
          desc="Make sure the listed specialisation covers the service being offered."
        />
        <TipRow
          number="4"
          title="Expiry Date"
          desc="VCN licences are renewed annually. Ensure the current year is covered."
        />
      </View>
    </ScrollView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function CheckRow({ text }: { text: string }) {
  return (
    <View style={styles.checkRow}>
      <Text style={styles.checkIcon}>✓</Text>
      <Text style={styles.checkText}>{text}</Text>
    </View>
  );
}

function TipRow({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipNumber}>
        <Text style={styles.tipNumberText}>{number}</Text>
      </View>
      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingBottom: 40 },

  // ── Done state ───────────────────────────────────────────────────────────
  doneContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    padding: 32,
    paddingTop: 60,
  },
  doneEmoji: { fontSize: 60, marginBottom: 20 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 10 },
  doneSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  vcnHighlight: { fontWeight: '700', color: '#111827', fontFamily: 'monospace' },
  checkList: { width: '100%', marginBottom: 28 },
  reopenBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  reopenBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resetBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  resetBtnText: { color: '#374151', fontWeight: '600', fontSize: 15 },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerEmoji: { fontSize: 52, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  // ── Cards ─────────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
  },
  searchCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
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
    marginBottom: 14,
  },

  // ── Form ──────────────────────────────────────────────────────────────────
  fieldHint: { fontSize: 13, color: '#9CA3AF', lineHeight: 18, marginBottom: 12 },
  mono: { fontFamily: 'monospace', color: '#374151' },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 13,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 4,
    letterSpacing: 1,
    fontFamily: 'monospace',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 12, color: '#EF4444', marginBottom: 8 },
  verifyBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyBtnDisabled: { opacity: 0.7 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Check rows ────────────────────────────────────────────────────────────
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6 },
  checkIcon: { fontSize: 14, color: '#2563EB', fontWeight: '700', marginRight: 10, marginTop: 1 },
  checkText: { fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 },

  // ── Tip rows ──────────────────────────────────────────────────────────────
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
    flexShrink: 0,
  },
  tipNumberText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  tipDesc: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
});