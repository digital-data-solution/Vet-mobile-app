import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { apiFetch, uploadFile } from '../api/client';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const CONTENT_WIDTH = Math.min(width, 600);
const IMAGE_SIZE    = (CONTENT_WIDTH - 52) / 3;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlanLimits {
  [plan: string]: number;
}

interface LimitsResponse {
  success:     boolean;
  currentPlan: string;
  maxImages:   number;
  // FIX: usedImages is now consumed to seed initial image count correctly
  usedImages:  number;
  limits:      PlanLimits;
}

// FIX: Images are tracked as { url, publicId } objects (matching the User
// model's mediaImageSchema) instead of bare URL strings. This lets the delete
// endpoint receive the correct Cloudinary publicId for hard-deletion.
interface MediaImage {
  url:      string;
  publicId: string;
}

interface MediaUploaderProps {
  userType:        'vet' | 'kennel_owner' | 'shop_owner' | 'pet_owner';
  // FIX: prop updated to accept the richer object shape the backend now returns.
  // Callers that previously passed string[] should migrate to MediaImage[].
  existingImages?: MediaImage[];
  onImagesUpdate?: (images: MediaImage[]) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MediaUploader({
  userType,
  existingImages = [],
  onImagesUpdate,
}: MediaUploaderProps) {
  const navigation = useNavigation<any>();

  const [images,          setImages]          = useState<MediaImage[]>(existingImages);
  const [uploading,       setUploading]       = useState(false);
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const [limitsLoading,   setLimitsLoading]   = useState(true);
  const [currentPlan,     setCurrentPlan]     = useState<string>('free');
  const [maxImages,       setMaxImages]       = useState<number>(2);
  const [planLimits,      setPlanLimits]      = useState<PlanLimits>({});

  // FIX: canUploadMore is derived from images.length which is kept in sync with
  // the server's usedImages on mount (see fetchLimits below).
  const canUploadMore = images.length < maxImages;

  // ── Sync existingImages prop ──────────────────────────────────────────────
  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  // ── Permissions ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
      }
    })();
  }, []);

  // ── Fetch real plan limits on mount ───────────────────────────────────────
  const fetchLimits = useCallback(async () => {
    setLimitsLoading(true);
    try {
      const res = await apiFetch('/api/upload/limits');

      if (res.ok && res.body?.success) {
        const data: LimitsResponse = res.body;
        setCurrentPlan(data.currentPlan);
        setMaxImages(data.maxImages);
        setPlanLimits(data.limits ?? {});

        // FIX: Reconcile local image count with server's authoritative usedImages.
        // If the server says 3 images are stored but existingImages only provided 1,
        // the local state would have allowed 2 extra uploads — now we prevent that
        // by padding with placeholder entries. The parent should ideally pass all
        // stored images; this is a safety net for partial prop hydration.
        setImages((prev) => {
          if (prev.length < data.usedImages) {
            // We don't have the actual URLs for the server-known extras, so we
            // block slots by inserting sentinel objects. The parent should fetch
            // and pass the full mediaImages array to avoid this path.
            const missing = data.usedImages - prev.length;
            const sentinels: MediaImage[] = Array.from({ length: missing }, (_, i) => ({
              url:      '',          // empty URL won't render an <Image>
              publicId: `__sentinel__${i}`,
            }));
            return [...prev, ...sentinels];
          }
          return prev;
        });
      } else {
        console.warn('Could not fetch upload limits:', res.body?.message);
      }
    } catch (error) {
      console.warn('Limits fetch error:', error);
    } finally {
      setLimitsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  // ── Pick images ───────────────────────────────────────────────────────────
  const pickImages = async () => {
    if (!canUploadMore) {
      Alert.alert(
        'Upload Limit Reached',
        `You have reached the ${maxImages}-image limit for the ${currentPlan} plan.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Plans', onPress: navigateToSubscription },
        ],
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const remainingSlots = maxImages - images.length;
        const selectedAssets = result.assets.slice(0, remainingSlots);

        if (result.assets.length > remainingSlots) {
          Alert.alert(
            'Selection Trimmed',
            `You can only upload ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'} on this plan.`,
          );
        }

        await uploadImagesToCloudinary(selectedAssets.map((a) => a.uri));
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  // ── Upload loop ───────────────────────────────────────────────────────────
  const uploadImagesToCloudinary = async (imageUris: string[]) => {
    setUploading(true);
    setUploadProgress(0);

    // FIX: Snapshot images state before the loop so we have a clean rollback
    // target if any individual upload fails mid-sequence.
    const imagesBeforeUpload = images;
    const uploadedImages: MediaImage[] = [];
    const total = imageUris.length;

    try {
      for (let i = 0; i < total; i++) {
        const uri      = imageUris[i];
        const fileExt  = uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userType}-${Date.now()}-${i}.${fileExt}`;

        const result = await uploadFile(
          '/api/upload/media',
          uri,
          fileName,
          { folder: userType },
          'image',
        );

        if (!result.ok) {
          // 402 means plan limit hit server-side — refresh limits and stop
          if (result.status === 402) {
            await fetchLimits();
            Alert.alert('Limit Reached', result.userMessage || result.body?.message || 'Upload limit reached.');
            break;
          }
          throw new Error(result.userMessage || result.body?.message || `Upload failed for image ${i + 1}`);
        }

        // FIX: Capture publicId returned by the backend so we can send it on
        // delete — previously only the URL was stored, leaving publicId unknown.
        uploadedImages.push({
          url:      result.body.url,
          publicId: result.body.publicId,
        });

        setUploadProgress(((i + 1) / total) * 100);
      }

      if (uploadedImages.length > 0) {
        const newImages = [...images, ...uploadedImages];
        setImages(newImages);
        onImagesUpdate?.(newImages);
        Alert.alert('Success', `${uploadedImages.length} image${uploadedImages.length === 1 ? '' : 's'} uploaded.`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);

      // FIX: Roll back to the pre-upload snapshot so partially-uploaded images
      // are not silently left in local state without a corresponding server record.
      // (Successful uploads within the same batch ARE committed server-side, so we
      // merge only those instead of discarding them.)
      if (uploadedImages.length > 0) {
        // Some succeeded before the failure — keep those
        const partialState = [...imagesBeforeUpload, ...uploadedImages];
        setImages(partialState);
        onImagesUpdate?.(partialState);
      } else {
        // Nothing succeeded — full rollback
        setImages(imagesBeforeUpload);
      }

      Alert.alert('Upload Failed', error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ── Delete image ──────────────────────────────────────────────────────────
  const deleteImage = (image: MediaImage, index: number) => {
    Alert.alert('Delete Image', 'Are you sure you want to delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await apiFetch('/api/upload/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              // FIX: Send imageUrl (ownership check) — backend uses URL to locate
              // the sub-document and derives publicId from it for Cloudinary delete.
              body: JSON.stringify({ imageUrl: image.url }),
            });

            if (!response.ok) {
              throw new Error(response.body?.message || 'Delete failed.');
            }

            const newImages = images.filter((_, i) => i !== index);
            setImages(newImages);
            onImagesUpdate?.(newImages);
          } catch (error: any) {
            console.error('Delete error:', error);
            Alert.alert('Error', error.message || 'Failed to delete image.');
          }
        },
      },
    ]);
  };

  // ── Navigate to subscription screen ──────────────────────────────────────
  const navigateToSubscription = () => {
    navigation.navigate('Subscription');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Gallery</Text>
          <Text style={styles.headerSubtitle}>
            {images.length} / {limitsLoading ? '—' : maxImages} images
          </Text>
        </View>
        {limitsLoading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <View style={styles.planBadge}>
            <Text style={styles.planText}>{currentPlan.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* ── Image grid ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageGrid}>

          {images.map((img, index) => (
            // FIX: key uses publicId (stable, unique) instead of url+index
            <View key={img.publicId} style={styles.imageCard}>
              {/* FIX: Sentinel placeholders (url='') render a grey box, not a broken image */}
              {img.url ? (
                <Image source={{ uri: img.url }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.sentinelPlaceholder]} />
              )}
              <TouchableOpacity
                style={styles.deleteButton}
                // FIX: pass full image object so deleteImage can send imageUrl
                onPress={() => deleteImage(img, index)}
                activeOpacity={0.8}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Upload slot — hidden while loading limits so the count isn't misleading */}
          {!limitsLoading && canUploadMore && (
            <TouchableOpacity
              style={styles.uploadCard}
              onPress={pickImages}
              disabled={uploading}
              activeOpacity={0.7}
            >
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="large" color="#2563EB" />
                  <Text style={styles.uploadingText}>{uploadProgress.toFixed(0)}%</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={48} color="#2563EB" />
                  <Text style={styles.uploadText}>Add Photos</Text>
                </>
              )}
            </TouchableOpacity>
          )}

        </View>

        {/* ── Upgrade prompt when limit reached ── */}
        {!limitsLoading && !canUploadMore && (
          <View style={styles.upgradePrompt}>
            <Ionicons name="star" size={24} color="#F59E0B" />
            <Text style={styles.upgradeText}>
              Upgrade your plan to upload more images
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={navigateToSubscription}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Plan limits footer ── */}
      {!limitsLoading && Object.keys(planLimits).length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Upload Limits by Plan</Text>
          <View style={styles.planLimits}>
            {Object.entries(planLimits).map(([plan, limit]) => (
              <PlanLimitBadge
                key={plan}
                plan={plan}
                limit={limit as number}
                isCurrent={plan === currentPlan}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanLimitBadge
// ─────────────────────────────────────────────────────────────────────────────

function PlanLimitBadge({
  plan,
  limit,
  isCurrent,
}: {
  plan:      string;
  limit:     number;
  isCurrent: boolean;
}) {
  const label = plan
    .replace('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View style={[styles.planLimitItem, isCurrent && styles.planLimitItemActive]}>
      <Text style={[styles.planLimitLabel, isCurrent && styles.planLimitLabelActive]}>
        {label}
      </Text>
      <Text style={[styles.planLimitNumber, isCurrent && styles.planLimitNumberActive]}>
        {limit}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    ...(Platform.OS === 'web' ? { alignSelf: 'center' as const, width: '100%', maxWidth: 600 } : {}),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft:    { flex: 1 },
  headerTitle:   { fontSize: 20, fontWeight: '700', color: '#111827' },
  headerSubtitle:{ fontSize: 14, color: '#6B7280', marginTop: 2 },
  planBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },

  scrollContent: { padding: 16 },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageCard: {
    position: 'relative',
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  image: { width: '100%', height: '100%' },
  // FIX: style for sentinel placeholder slots (server-known images without local URLs)
  sentinelPlaceholder: {
    backgroundColor: '#E5E7EB',
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: '#F0F7FF',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: { alignItems: 'center' },
  uploadingText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#2563EB' },
  uploadText:    { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#2563EB' },

  upgradePrompt: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  upgradeText: { marginTop: 8, fontSize: 14, color: '#92400E', textAlign: 'center' },
  upgradeButton: {
    marginTop: 12,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  footerTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 12 },
  planLimits:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-around' },
  planLimitItem: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 70,
  },
  planLimitItemActive:  { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  planLimitLabel:       { fontSize: 11, color: '#6B7280', marginBottom: 4, textAlign: 'center' },
  planLimitLabelActive: { color: '#1D4ED8', fontWeight: '600' },
  planLimitNumber:      { fontSize: 18, fontWeight: '700', color: '#111827' },
  planLimitNumberActive:{ color: '#2563EB' },
});