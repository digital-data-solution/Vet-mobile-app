import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type TargetType = 'professional' | 'shop' | 'kennel';

interface ReviewDoc {
  _id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer?: { _id: string; name?: string; profileImage?: string };
  professionalResponse?: string;
  professionalResponseAt?: string;
}

interface Props {
  targetId:   string;
  targetType: TargetType;
  accentColor?: string;
  onRatingUpdate?: (rating: number, count: number) => void;
}

// ─── Star row helper ──────────────────────────────────────────────────────────

function Stars({ rating, size = 15, color = '#F59E0B', interactive = false, onPress }: {
  rating: number; size?: number; color?: string;
  interactive?: boolean; onPress?: (n: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => interactive && onPress?.(n)}
          activeOpacity={interactive ? 0.7 : 1}
          disabled={!interactive}
        >
          <Ionicons
            name={n <= Math.round(rating) ? 'star' : 'star-outline'}
            size={size}
            color={n <= Math.round(rating) ? color : '#D1D5DB'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewSection({ targetId, targetType, accentColor = '#2563EB', onRatingUpdate }: Props) {
  const [reviews,       setReviews]       = useState<ReviewDoc[]>([]);
  const [total,         setTotal]         = useState(0);
  const [loadingList,   setLoadingList]   = useState(true);
  const [eligible,      setEligible]      = useState(false);
  const [existingReview, setExistingReview] = useState<ReviewDoc | null>(null);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [starPick,      setStarPick]      = useState(0);
  const [comment,       setComment]       = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState('');
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(false);

  const fetchReviews = useCallback(async (p = 1) => {
    try {
      const res = await apiFetch(`/api/v1/reviews/${targetType}/${targetId}?page=${p}&limit=5`);
      if (res.ok && res.body?.data) {
        setReviews(p === 1 ? res.body.data : (prev) => [...prev, ...res.body.data]);
        setTotal(res.body.total ?? 0);
        setHasMore((res.body.page ?? 1) < (res.body.totalPages ?? 1));
        setPage(p);
        if (p === 1 && onRatingUpdate && res.body.data.length > 0) {
          const avg = res.body.data.reduce((s: number, r: ReviewDoc) => s + r.rating, 0) / res.body.data.length;
          onRatingUpdate(Math.round(avg * 10) / 10, res.body.total ?? 0);
        }
      }
    } finally {
      setLoadingList(false);
    }
  }, [targetId, targetType]);

  const fetchEligibility = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/v1/reviews/eligibility/${targetType}/${targetId}`);
      if (res.ok && res.body?.success) {
        setEligible(res.body.eligible === true);
        if (res.body.existingReview) {
          setExistingReview(res.body.existingReview);
          setStarPick(res.body.existingReview.rating);
          setComment(res.body.existingReview.comment ?? '');
        }
      }
    } catch {}
  }, [targetId, targetType]);

  useEffect(() => {
    fetchReviews(1);
    fetchEligibility();
  }, [fetchReviews, fetchEligibility]);

  const openModal = () => {
    setSubmitError('');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (starPick === 0) { setSubmitError('Please choose a star rating.'); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await apiFetch('/api/v1/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, rating: starPick, comment: comment.trim() }),
      });
      if (res.ok) {
        setModalVisible(false);
        setExistingReview(res.body.data);
        fetchReviews(1);
      } else {
        const code = res.body?.code;
        if (code === 'ELIGIBILITY_FAILED') {
          setSubmitError('You need to message this professional first before leaving a review.');
        } else {
          setSubmitError(res.body?.message || 'Failed to submit review.');
        }
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.slice(0, 5).reduce((s, r) => s + r.rating, 0) / Math.min(reviews.length, 5)
    : 0;

  return (
    <View style={styles.container}>
      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {total > 0 && (
            <View style={styles.summaryRow}>
              <Stars rating={avgRating} size={14} />
              <Text style={styles.summaryText}>{total} review{total !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
        {eligible && (
          <TouchableOpacity
            style={[styles.writeBtn, { backgroundColor: accentColor }]}
            onPress={openModal}
            activeOpacity={0.85}
          >
            <Ionicons name={existingReview ? 'create-outline' : 'star-outline'} size={14} color="#fff" />
            <Text style={styles.writeBtnText}>
              {existingReview ? 'Edit Review' : 'Write a Review'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Eligibility hint ────────────────────────────────────────────────── */}
      {!eligible && !loadingList && (
        <Text style={styles.eligibilityHint}>
          Message this {targetType === 'shop' ? 'shop' : 'professional'} first to unlock reviews.
        </Text>
      )}

      {/* ── Review list ─────────────────────────────────────────────────────── */}
      {loadingList ? (
        <ActivityIndicator size="small" color={accentColor} style={{ marginVertical: 16 }} />
      ) : reviews.length === 0 ? (
        <View style={styles.emptyReviews}>
          <Ionicons name="chatbubble-outline" size={28} color="#CBD5E1" />
          <Text style={styles.emptyText}>No reviews yet</Text>
        </View>
      ) : (
        <>
          {reviews.map((r) => (
            <View key={r._id} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                {r.reviewer?.profileImage ? (
                  <Image source={{ uri: r.reviewer.profileImage }} style={styles.reviewerAvatar} />
                ) : (
                  <View style={[styles.reviewerAvatarPlaceholder, { backgroundColor: accentColor + '22' }]}>
                    <Text style={[styles.reviewerInitial, { color: accentColor }]}>
                      {(r.reviewer?.name ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewerName}>{r.reviewer?.name ?? 'Anonymous'}</Text>
                  <View style={styles.reviewMeta}>
                    <Stars rating={r.rating} size={12} />
                    <Text style={styles.reviewDate}>{timeAgo(r.createdAt)}</Text>
                  </View>
                </View>
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              {r.professionalResponse ? (
                <View style={[styles.responseBox, { borderLeftColor: accentColor }]}>
                  <Text style={[styles.responseLabel, { color: accentColor }]}>Owner reply</Text>
                  <Text style={styles.responseText}>{r.professionalResponse}</Text>
                </View>
              ) : null}
            </View>
          ))}

          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => fetchReviews(page + 1)}
              activeOpacity={0.8}
            >
              <Text style={[styles.loadMoreText, { color: accentColor }]}>Load more reviews</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ── Write / Edit modal ───────────────────────────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} onPress={() => setModalVisible(false)} activeOpacity={1}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>
              {existingReview ? 'Edit Your Review' : 'Leave a Review'}
            </Text>
            <Text style={styles.modalSub}>Tap a star to rate:</Text>

            <View style={styles.starPickRow}>
              <Stars rating={starPick} size={36} interactive onPress={setStarPick} color={accentColor} />
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience (optional)..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>

            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: starPick === 0 ? '#CBD5E1' : accentColor }]}
              onPress={handleSubmit}
              disabled={submitting || starPick === 0}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>Submit Review</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { marginTop: 8 },

  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingHorizontal: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText:  { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  writeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  writeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  eligibilityHint: {
    fontSize: 12, color: '#9CA3AF', fontStyle: 'italic',
    marginHorizontal: 16, marginBottom: 12,
  },

  emptyReviews: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  reviewCard: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  reviewTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reviewerInitial: { fontSize: 15, fontWeight: '700' },
  reviewerName: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 2 },
  reviewMeta:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewDate:   { fontSize: 11, color: '#9CA3AF' },
  reviewComment:{ fontSize: 14, color: '#374151', lineHeight: 20, marginTop: 2 },

  responseBox: {
    marginTop: 10, borderLeftWidth: 3, paddingLeft: 10,
    backgroundColor: '#F0F9FF', borderRadius: 6, padding: 10,
  },
  responseLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.3 },
  responseText:  { fontSize: 13, color: '#374151', lineHeight: 19 },

  loadMoreBtn:  { alignItems: 'center', paddingVertical: 12 },
  loadMoreText: { fontSize: 14, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4, textAlign: 'center' },
  modalSub:    { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16 },

  starPickRow: { alignItems: 'center', marginBottom: 20 },

  commentInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827', minHeight: 100,
    textAlignVertical: 'top', backgroundColor: '#F9FAFB',
  },
  charCount:   { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 4, marginBottom: 12 },

  submitError: { color: '#DC2626', fontSize: 13, textAlign: 'center', marginBottom: 10 },

  submitBtn: {
    paddingVertical: 15, borderRadius: 12,
    alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
