import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';

interface ExistingReview {
  _id: string;
  rating: number;
  comment: string | null;
}

interface Props {
  visible:    boolean;
  onClose:    () => void;
  onSuccess:  () => void;
  targetType: 'professional' | 'shop';
  targetId:   string;
  targetName: string;
  accentColor?: string;
}

type EligibilityPhase = 'checking' | 'eligible' | 'ineligible' | 'error';

// ─── Star selector ────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
  accentColor,
}: {
  value:       number;
  onChange:    (r: number) => void;
  accentColor: string;
}) {
  return (
    <View style={s.starPicker}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={38}
            color={n <= value ? '#F59E0B' : '#D1D5DB'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const STAR_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function WriteReviewModal({
  visible,
  onClose,
  onSuccess,
  targetType,
  targetId,
  targetName,
  accentColor = '#2563EB',
}: Props) {
  const [phase,       setPhase]       = useState<EligibilityPhase>('checking');
  const [rating,      setRating]      = useState(0);
  const [comment,     setComment]     = useState('');
  const [isEdit,      setIsEdit]      = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset and check eligibility each time the modal opens
  useEffect(() => {
    if (!visible) return;

    setPhase('checking');
    setRating(0);
    setComment('');
    setIsEdit(false);
    setSubmitError(null);

    (async () => {
      try {
        const res = await apiFetch(
          `/api/v1/reviews/eligibility/${targetType}/${targetId}`,
          { method: 'GET' },
        );

        if (!res.ok) {
          setPhase('error');
          return;
        }

        if (!res.body?.eligible) {
          setPhase('ineligible');
          return;
        }

        setPhase('eligible');
        const existing: ExistingReview | null = res.body.existingReview ?? null;
        if (existing) {
          setIsEdit(true);
          setRating(existing.rating ?? 0);
          setComment(existing.comment ?? '');
        }
      } catch {
        setPhase('error');
      }
    })();
  }, [visible, targetType, targetId]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setSubmitError('Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiFetch('/api/v1/reviews', {
        method: 'POST',
        body:   JSON.stringify({ targetType, targetId, rating, comment: comment.trim() }),
      });

      if (res.ok && res.body?.success) {
        onSuccess();
        onClose();
      } else {
        setSubmitError(res.body?.message || 'Failed to save your review. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render body based on eligibility phase ───────────────────────────────

  const renderBody = () => {
    if (phase === 'checking') {
      return (
        <View style={s.centeredState}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={s.stateText}>Checking eligibility…</Text>
        </View>
      );
    }

    if (phase === 'ineligible') {
      return (
        <View style={s.centeredState}>
          <Ionicons name="chatbubble-ellipses-outline" size={48} color="#D1D5DB" />
          <Text style={s.ineligibleTitle}>Message first, then review</Text>
          <Text style={s.ineligibleText}>
            To leave a review you must have exchanged at least one message with{' '}
            <Text style={{ fontWeight: '700' }}>{targetName}</Text>. Start a conversation and come
            back to review after.
          </Text>
        </View>
      );
    }

    if (phase === 'error') {
      return (
        <View style={s.centeredState}>
          <Ionicons name="warning-outline" size={48} color="#F59E0B" />
          <Text style={s.stateText}>Could not check eligibility. Please try again.</Text>
        </View>
      );
    }

    // eligible
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.formContainer}
      >
        <Text style={s.formLabel}>Your rating</Text>
        <StarPicker value={rating} onChange={setRating} accentColor={accentColor} />
        {rating > 0 && (
          <Text style={[s.starLabel, { color: accentColor }]}>{STAR_LABELS[rating]}</Text>
        )}

        <Text style={[s.formLabel, { marginTop: 20 }]}>Comment (optional)</Text>
        <TextInput
          style={s.commentInput}
          placeholder="Share your experience…"
          placeholderTextColor="#9CA3AF"
          value={comment}
          onChangeText={setComment}
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={s.charCount}>{comment.length} / 1000</Text>

        {submitError ? (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
            <Text style={s.errorText}>{submitError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: accentColor }, submitting && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>{isEdit ? 'Update Review' : 'Submit Review'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={s.overlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kvView}
        >
          <View style={s.sheet} onStartShouldSetResponder={() => true}>
            {/* Handle bar */}
            <View style={s.handle} />

            {/* Header */}
            <View style={s.sheetHeader}>
              <View>
                <Text style={s.sheetTitle}>
                  {isEdit ? 'Edit Your Review' : 'Write a Review'}
                </Text>
                <Text style={s.sheetSubtitle} numberOfLines={1}>
                  {targetName}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {renderBody()}
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent:  'flex-end',
  },
  kvView: { width: '100%' },

  sheet: {
    backgroundColor:   '#fff',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    paddingBottom:     Platform.OS === 'ios' ? 32 : 16,
    maxHeight:         '80%',
  },

  handle: {
    width:           40,
    height:          4,
    backgroundColor: '#E5E7EB',
    borderRadius:    2,
    alignSelf:       'center',
    marginTop:       10,
    marginBottom:    6,
  },

  sheetHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle:    { fontSize: 17, fontWeight: '700', color: '#111827' },
  sheetSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  // ── States ──────────────────────────────────────────────────────────────
  centeredState: {
    alignItems:     'center',
    paddingVertical: 36,
    paddingHorizontal: 28,
    gap: 12,
  },
  stateText:         { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  ineligibleTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  ineligibleText:    { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21 },

  // ── Form ────────────────────────────────────────────────────────────────
  formContainer: {
    paddingHorizontal: 20,
    paddingTop:        16,
    paddingBottom:     8,
  },
  formLabel: {
    fontSize:    13,
    fontWeight:  '700',
    color:       '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  starPicker: {
    flexDirection:  'row',
    gap:            10,
    justifyContent: 'center',
    marginBottom:   6,
  },
  starLabel: {
    textAlign:  'center',
    fontSize:   14,
    fontWeight: '600',
    marginBottom: 2,
  },

  commentInput: {
    borderWidth:     1.5,
    borderColor:     '#E5E7EB',
    borderRadius:    10,
    padding:         12,
    fontSize:        14,
    color:           '#111827',
    minHeight:       100,
    backgroundColor: '#F9FAFB',
  },
  charCount: {
    textAlign: 'right',
    fontSize:  11,
    color:     '#9CA3AF',
    marginTop:  4,
    marginBottom: 4,
  },

  errorBox: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: '#FEF2F2',
    borderRadius:    8,
    padding:         10,
    marginVertical:  8,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626' },

  submitBtn: {
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
