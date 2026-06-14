import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewUser {
  _id: string;
  name?: string;
}

interface Review {
  _id: string;
  reviewer: ReviewUser | null;
  rating: number;
  comment: string | null;
  professionalResponse: string | null;
  professionalResponseAt: string | null;
  createdAt: string;
}

interface Props {
  targetType:     'professional' | 'shop';
  targetId:       string;
  avgRating?:     number;
  reviewCount?:   number;
  accentColor?:   string;
  refreshKey?:    number;
  ownerMongoId?:  string; // owner's User._id — used to show the Respond button
}

const PAGE_SIZE = 5;

// ─── Stars ───────────────────────────────────────────────────────────────────

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={i <= filled ? 'star' : 'star-outline'}
          size={size}
          color={i <= filled ? '#F59E0B' : '#D1D5DB'}
        />
      ))}
    </View>
  );
}

// ─── Review card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  isOwner,
  accentColor,
  onRespond,
}: {
  review:      Review;
  isOwner:     boolean;
  accentColor: string;
  onRespond:   (reviewId: string, existing: string | null) => void;
}) {
  const reviewerName = review.reviewer?.name ?? 'Anonymous';
  const dateStr      = new Date(review.createdAt).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <View style={s.reviewCard}>
      <View style={s.reviewHeader}>
        <View style={s.reviewerAvatar}>
          <Text style={s.reviewerInitial}>{reviewerName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.reviewerName}>{reviewerName}</Text>
          <View style={s.reviewMeta}>
            <Stars rating={review.rating} size={12} />
            <Text style={s.reviewDate}>{dateStr}</Text>
          </View>
        </View>
      </View>

      {review.comment ? (
        <Text style={s.reviewComment}>{review.comment}</Text>
      ) : null}

      {review.professionalResponse ? (
        <View style={s.responseBox}>
          <Text style={s.responseLabel}>Response from owner</Text>
          <Text style={s.responseText}>{review.professionalResponse}</Text>
        </View>
      ) : null}

      {isOwner ? (
        <TouchableOpacity
          style={[s.respondBtn, { borderColor: accentColor }]}
          onPress={() => onRespond(review._id, review.professionalResponse)}
          activeOpacity={0.75}
        >
          <Ionicons name="chatbubble-outline" size={13} color={accentColor} />
          <Text style={[s.respondBtnText, { color: accentColor }]}>
            {review.professionalResponse ? 'Edit Response' : 'Respond'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Respond modal ────────────────────────────────────────────────────────────

function RespondModal({
  visible,
  existingResponse,
  accentColor,
  onClose,
  onSubmit,
}: {
  visible:          boolean;
  existingResponse: string | null;
  accentColor:      string;
  onClose:          () => void;
  onSubmit:         (text: string) => Promise<void>;
}) {
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setText(existingResponse ?? '');
      setError(null);
    }
  }, [visible, existingResponse]);

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Please enter a response.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(text.trim());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} onPress={onClose} activeOpacity={1}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
          <View style={s.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={s.modalHandle} />

            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {existingResponse ? 'Edit Your Response' : 'Respond to Review'}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={s.modalBody}>
              <TextInput
                style={s.responseInput}
                placeholder="Write your response…"
                placeholderTextColor="#9CA3AF"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={s.charCount}>{text.length} / 1000</Text>

              {error ? (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.submitBtn, { backgroundColor: accentColor }, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.submitBtnText}>Save Response</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReviewsSection({
  targetType,
  targetId,
  avgRating    = 0,
  reviewCount  = 0,
  accentColor  = '#2563EB',
  refreshKey   = 0,
  ownerMongoId,
}: Props) {
  const [reviews,       setReviews]       = useState<Review[]>([]);
  const [total,         setTotal]         = useState(reviewCount);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [hasMore,       setHasMore]       = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Respond-modal state
  const [respondTarget, setRespondTarget] = useState<{
    reviewId: string;
    existing: string | null;
  } | null>(null);

  // Fetch the logged-in user's Mongo ID once so we can show/hide Respond button
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me', { method: 'GET' });
        if (res.ok && res.body?.user?._id) {
          setCurrentUserId(res.body.user._id);
        }
      } catch {}
    })();
  }, []);

  const fetchPage = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await apiFetch(
        `/api/v1/reviews/${targetType}/${targetId}?page=${pageNum}&limit=${PAGE_SIZE}`,
        { method: 'GET' },
      );
      if (res.ok && res.body?.success) {
        const incoming: Review[]  = res.body.data ?? [];
        const serverTotal: number = res.body.total ?? 0;
        setTotal(serverTotal);
        setReviews(prev => append ? [...prev, ...incoming] : incoming);
        setHasMore(pageNum * PAGE_SIZE < serverTotal);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    setReviews([]);
    setPage(1);
    setHasMore(false);
    fetchPage(1, false);
  }, [fetchPage, refreshKey]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  const isOwner = !!(ownerMongoId && currentUserId && ownerMongoId === currentUserId);

  const handleOpenRespond = (reviewId: string, existing: string | null) => {
    setRespondTarget({ reviewId, existing });
  };

  const handleSubmitResponse = async (text: string) => {
    if (!respondTarget) return;
    const res = await apiFetch(`/api/v1/reviews/${respondTarget.reviewId}/respond`, {
      method: 'POST',
      body:   JSON.stringify({ response: text }),
    });
    if (!res.ok) {
      throw new Error(res.body?.message ?? 'Failed to save response.');
    }
    // Update the review in-place — no need to re-fetch the whole list
    setReviews(prev => prev.map(r =>
      r._id === respondTarget.reviewId
        ? { ...r, professionalResponse: text, professionalResponseAt: new Date().toISOString() }
        : r,
    ));
    setRespondTarget(null);
  };

  return (
    <View style={s.section}>
      {/* ── Summary header ───────────────────────────────────────────────── */}
      <View style={s.summaryRow}>
        <Text style={s.sectionTitle}>Reviews</Text>
        {total > 0 ? (
          <View style={s.summaryRight}>
            <Stars rating={avgRating} size={14} />
            <Text style={s.summaryText}>
              {avgRating.toFixed(1)} ({total} review{total !== 1 ? 's' : ''})
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── List ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <ActivityIndicator color={accentColor} style={{ marginVertical: 20 }} />
      ) : reviews.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#D1D5DB" />
          <Text style={s.emptyText}>No reviews yet</Text>
        </View>
      ) : (
        <>
          {reviews.map(r => (
            <ReviewCard
              key={r._id}
              review={r}
              isOwner={isOwner}
              accentColor={accentColor}
              onRespond={handleOpenRespond}
            />
          ))}

          {hasMore ? (
            <TouchableOpacity
              style={[s.moreBtn, { borderColor: accentColor }]}
              onPress={loadMore}
              disabled={loadingMore}
              activeOpacity={0.75}
            >
              {loadingMore
                ? <ActivityIndicator size="small" color={accentColor} />
                : <Text style={[s.moreBtnText, { color: accentColor }]}>Show more reviews</Text>}
            </TouchableOpacity>
          ) : null}
        </>
      )}

      {/* ── Response modal ────────────────────────────────────────────────── */}
      <RespondModal
        visible={respondTarget !== null}
        existingResponse={respondTarget?.existing ?? null}
        accentColor={accentColor}
        onClose={() => setRespondTarget(null)}
        onSubmit={handleSubmitResponse}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom:     20,
    backgroundColor:  '#fff',
    borderRadius:     14,
    padding:          16,
    shadowColor:      '#000',
    shadowOffset:     { width: 0, height: 1 },
    shadowOpacity:    0.06,
    shadowRadius:     4,
    elevation:        2,
  },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  summaryRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText:  { fontSize: 13, color: '#374151', fontWeight: '600' },

  starRow: { flexDirection: 'row', gap: 2 },

  reviewCard: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  reviewHeader:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  reviewerAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  reviewerInitial: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  reviewerName:    { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  reviewMeta:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewDate:      { fontSize: 11, color: '#9CA3AF' },

  reviewComment: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 4 },

  responseBox: {
    marginTop: 8, backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: '#10B981',
    paddingLeft: 10, paddingVertical: 8, borderRadius: 4,
  },
  responseLabel: { fontSize: 11, fontWeight: '700', color: '#065F46', marginBottom: 3 },
  responseText:  { fontSize: 13, color: '#374151', lineHeight: 18 },

  respondBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    marginTop: 8, paddingVertical: 5, paddingHorizontal: 10,
    borderWidth: 1, borderRadius: 6,
  },
  respondBtnText: { fontSize: 12, fontWeight: '600' },

  empty:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  moreBtn: {
    marginTop: 12, paddingVertical: 10, borderWidth: 1.5, borderRadius: 8, alignItems: 'center',
  },
  moreBtnText: { fontSize: 14, fontWeight: '600' },

  // ── Respond modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2,
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  modalBody:  { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },

  responseInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#111827',
    minHeight: 110, backgroundColor: '#F9FAFB',
  },
  charCount: { textAlign: 'right', fontSize: 11, color: '#9CA3AF', marginTop: 4, marginBottom: 4 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginVertical: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626' },

  submitBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 10,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
