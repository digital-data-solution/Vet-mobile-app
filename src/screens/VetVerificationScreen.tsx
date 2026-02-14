import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { apiFetch } from '../api/client';

type VerificationStatus = 'idle' | 'submitting' | 'submitted';

type VerificationState = {
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  vcnNumber?: string;
  submittedAt?: string;
  reviewedAt?: string;
  adminNotes?: string;
};

export default function VetVerificationScreen() {
  const [vcn, setVcn] = useState('');
  const [documentLinks, setDocumentLinks] = useState('');
  const [notes, setNotes] = useState('');
  const [submitStatus, setSubmitStatus] = useState<VerificationStatus>('idle');
  const [errors, setErrors] = useState<{ vcn?: string }>({});

  // Current verification state fetched from backend
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [loadingState, setLoadingState] = useState(true);

  // ── Fetch current verification status on mount ──────────────────────────
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoadingState(true);
      const res = await apiFetch('/api/v1/vet-verification/status', { method: 'GET' });
      if (res.ok && res.body?.success) {
        const data: VerificationState = res.body.data;
        setVerificationState(data);
        if (data.vcnNumber) setVcn(data.vcnNumber);
      }
    } catch {
      // Non-fatal — show form in default state
    } finally {
      setLoadingState(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { vcn?: string } = {};
    if (!vcn.trim()) newErrors.vcn = 'VCN number is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openVCNPortal = () => {
    Linking.openURL('https://portal.vcn.gov.ng').catch(() =>
      Alert.alert('Error', 'Unable to open the VCN portal. Please visit portal.vcn.gov.ng manually.')
    );
  };

  const submit = async () => {
    if (!validate()) return;

    setSubmitStatus('submitting');
    try {
      const res = await apiFetch('/api/v1/vet-verification/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vcn: vcn.trim(),
          documents: documentLinks.trim(),
          notes: notes.trim(),
        }),
      });

      if (res.ok && res.body?.success) {
        setSubmitStatus('submitted');
        await fetchStatus();
        Alert.alert(
          'Submitted ✅',
          'Your verification request has been submitted. Our team will review it within 2–3 business days.',
          [{ text: 'OK' }]
        );
      } else {
        setSubmitStatus('idle');
        Alert.alert('Submission Failed', res.body?.message ?? 'Please try again later.');
      }
    } catch {
      setSubmitStatus('idle');
      Alert.alert('Network Error', 'Please check your connection and try again.');
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loadingState) {
    return (
      <View style={styles.centeredLoader}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loaderText}>Checking verification status…</Text>
      </View>
    );
  }

  // ── Approved state ───────────────────────────────────────────────────────
  if (verificationState?.status === 'approved') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>✅</Text>
        <Text style={styles.successTitle}>You're Verified!</Text>
        <Text style={styles.successSubtitle}>
          Your VCN number <Text style={styles.vcnHighlight}>{verificationState.vcnNumber}</Text> has
          been confirmed. Your verified badge is now live on your profile.
        </Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedBadgeText}>🏅 Verified Veterinarian</Text>
        </View>
      </View>
    );
  }

  // ── Pending state ────────────────────────────────────────────────────────
  if (verificationState?.status === 'pending') {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successEmoji}>⏳</Text>
        <Text style={styles.successTitle}>Under Review</Text>
        <Text style={styles.successSubtitle}>
          Your VCN number <Text style={styles.vcnHighlight}>{verificationState.vcnNumber}</Text> was
          submitted and is currently being reviewed. You'll be notified once approved.
        </Text>
        <Text style={styles.pendingHint}>
          Submitted{' '}
          {verificationState.submittedAt
            ? new Date(verificationState.submittedAt).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })
            : 'recently'}
        </Text>
      </View>
    );
  }

  // ── Rejected state or not submitted — show form ──────────────────────────
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🪪</Text>
        <Text style={styles.title}>Get Verified</Text>
        <Text style={styles.subtitle}>
          Submit your VCN credentials to display a verified badge on your profile and build client trust.
        </Text>
      </View>

      {/* Rejection notice */}
      {verificationState?.status === 'rejected' && (
        <View style={styles.rejectionCard}>
          <Text style={styles.rejectionTitle}>❌ Previous Submission Rejected</Text>
          {verificationState.adminNotes ? (
            <Text style={styles.rejectionReason}>
              Reason: {verificationState.adminNotes}
            </Text>
          ) : null}
          <Text style={styles.rejectionHint}>
            Please correct the details below and resubmit.
          </Text>
        </View>
      )}

      {/* Benefits */}
      <View style={styles.benefitsCard}>
        <Text style={styles.cardTitle}>Benefits of Verification</Text>
        <BenefitRow emoji="✅" text="Verified badge on your profile" />
        <BenefitRow emoji="📈" text="Higher visibility in search results" />
        <BenefitRow emoji="🔒" text="Increased trust from pet owners" />
        <BenefitRow emoji="⭐" text="Access to premium features" />
      </View>

      {/* Step 1 — VCN Portal */}
      <View style={styles.formCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>1</Text>
          </View>
          <Text style={styles.cardTitle}>Look Up Your Registration</Text>
        </View>
        <Text style={styles.stepDesc}>
          Visit the official VCN portal to confirm your registration number before submitting.
          On the portal, go to <Text style={styles.emphasis}>Verify Practitioner</Text>, search
          your name, and copy the <Text style={styles.emphasis}>Registration No.</Text> from your
          licence card.
        </Text>
        <TouchableOpacity style={styles.portalButton} onPress={openVCNPortal} activeOpacity={0.85}>
          <Text style={styles.portalButtonText}>Open VCN Portal ↗</Text>
        </TouchableOpacity>
      </View>

      {/* Step 2 — Form */}
      <View style={styles.formCard}>
        <View style={styles.stepHeader}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>2</Text>
          </View>
          <Text style={styles.cardTitle}>Submit Your Details</Text>
        </View>

        {/* VCN Number */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>VCN Registration Number *</Text>
          <TextInput
            value={vcn}
            onChangeText={(v) => { setVcn(v); setErrors({}); }}
            style={[styles.input, errors.vcn && styles.inputError]}
            placeholder="e.g. VCN/2024/001234"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            editable={submitStatus !== 'submitting'}
          />
          {errors.vcn ? <Text style={styles.errorText}>{errors.vcn}</Text> : null}
        </View>

        {/* Document links */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Supporting Document Links (optional)</Text>
          <TextInput
            value={documentLinks}
            onChangeText={setDocumentLinks}
            style={[styles.input, styles.inputMultiline]}
            placeholder={
              'Paste your VCN portal profile URL or document links — one per line\nhttps://portal.vcn.gov.ng/practitioners/...\nhttps://drive.google.com/...'
            }
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            editable={submitStatus !== 'submitting'}
          />
          <Text style={styles.fieldHint}>Google Drive, Dropbox, or any public file link</Text>
        </View>

        {/* Notes */}
        <View style={styles.fieldWrapper}>
          <Text style={styles.fieldLabel}>Additional Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.inputMultiline]}
            placeholder="Any context for the review team, e.g. recently renewed licence, name change…"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            editable={submitStatus !== 'submitting'}
          />
        </View>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitStatus === 'submitting' && styles.submitBtnDisabled]}
        onPress={submit}
        disabled={submitStatus === 'submitting'}
        activeOpacity={0.85}
      >
        {submitStatus === 'submitting' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>
            {verificationState?.status === 'rejected' ? 'Resubmit for Verification' : 'Submit for Verification'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Submitting false credentials is a violation of our terms of service and may result in account suspension.
      </Text>
    </ScrollView>
  );
}

function BenefitRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitEmoji}>{emoji}</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingBottom: 40 },

  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    gap: 12,
  },
  loaderText: { fontSize: 14, color: '#6B7280', marginTop: 8 },

  // ── Approved / pending full-screen states ───────────────────────────────
  successContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },
  successSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  vcnHighlight: { fontWeight: '700', color: '#111827', fontFamily: 'monospace' },
  verifiedBadge: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  verifiedBadgeText: { color: '#166534', fontWeight: '700', fontSize: 15 },
  pendingHint: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  // ── Rejection card ──────────────────────────────────────────────────────
  rejectionCard: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  rejectionTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  rejectionReason: { fontSize: 14, color: '#7F1D1D', lineHeight: 20, marginBottom: 6 },
  rejectionHint: { fontSize: 13, color: '#9CA3AF' },

  // ── Header ──────────────────────────────────────────────────────────────
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

  // ── Cards ────────────────────────────────────────────────────────────────
  benefitsCard: {
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
  formCard: {
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

  // ── Step header ──────────────────────────────────────────────────────────
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  stepDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 14,
  },
  emphasis: { color: '#374151', fontWeight: '600' },
  portalButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  portalButtonText: { color: '#2563EB', fontWeight: '700', fontSize: 15 },

  // ── Form fields ──────────────────────────────────────────────────────────
  benefitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  benefitEmoji: { fontSize: 18, marginRight: 12 },
  benefitText: { fontSize: 15, color: '#374151', fontWeight: '500' },
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
  inputError: { borderColor: '#EF4444' },
  inputMultiline: { minHeight: 80 },
  errorText: { marginTop: 4, fontSize: 12, color: '#EF4444' },
  fieldHint: { marginTop: 5, fontSize: 12, color: '#9CA3AF' },

  // ── Submit ───────────────────────────────────────────────────────────────
  submitBtn: {
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
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    marginHorizontal: 24,
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});