import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../api/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface MediaUploaderProps {
  userType: 'vet' | 'kennel' | 'shop';
  existingImages?: string[];
  onImagesUpdate?: (urls: string[]) => void;
}


// Upload limits: 10 for professionals (vet, kennel, shop) on 'basic', 5 for 'free', 20 for 'premium', 50 for 'enterprise'
const MEDIA_LIMITS = {
  vet: 10,
  kennel: 10,
  shop: 10,
};

export default function MediaUploader({
  userType,
  existingImages = [],
  onImagesUpdate,
}: MediaUploaderProps) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // For MVP, everyone gets 'basic' plan limit (10)
  const maxImages = MEDIA_LIMITS[userType];
  const canUploadMore = images.length < maxImages;

  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  useEffect(() => {
    // Request permissions on mount
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload images.'
        );
      }
    })();
  }, []);

  const pickImages = async () => {
    if (!canUploadMore) {
      Alert.alert(
        'Upload Limit Reached',
        `You can upload up to ${maxImages} images for now.`,
        [
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Updated to new array format
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const remainingSlots = maxImages - images.length;
        const selectedImages = result.assets.slice(0, remainingSlots);

        if (result.assets.length > remainingSlots) {
          Alert.alert(
            'Upload Limit',
            `You can only upload ${remainingSlots} more image(s).`
          );
        }

        // Upload selected images
        await uploadImagesToCloudinary(selectedImages.map((asset) => asset.uri));
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const uploadImagesToCloudinary = async (imageUris: string[]) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        throw new Error('Not authenticated');
      }

      const uploadedUrls: string[] = [];
      const totalImages = imageUris.length;

      for (let i = 0; i < imageUris.length; i++) {
        const imageUri = imageUris[i];
        const formData = new FormData();

        // Get file extension
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userType}-${Date.now()}-${i}.${fileExt}`;

        formData.append('image', {
          uri: imageUri,
          type: `image/${fileExt}`,
          name: fileName,
        } as any);

        formData.append('folder', userType); // Organize by user type in Cloudinary

        // Upload to backend which handles Cloudinary
        const response = await fetch(
          'https://vet-market-place.onrender.com/api/upload/media',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Upload failed for image ${i + 1}`);
        }

        const data = await response.json();
        uploadedUrls.push(data.url);

        // Update progress
        setUploadProgress(((i + 1) / totalImages) * 100);
      }

      // Update state with new images
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);

      if (onImagesUpdate) {
        onImagesUpdate(newImages);
      }

      Alert.alert('Success', `${uploadedUrls.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteImage = async (imageUrl: string, index: number) => {
    Alert.alert('Delete Image', 'Are you sure you want to delete this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;

            // Call backend to delete from Cloudinary
            const response = await fetch(
              'https://vet-market-place.onrender.com/api/upload/delete',
              {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ imageUrl }),
              }
            );

            if (response.ok) {
              const newImages = images.filter((_, i) => i !== index);
              setImages(newImages);

              if (onImagesUpdate) {
                onImagesUpdate(newImages);
              }

              Alert.alert('Success', 'Image deleted successfully.');
            } else {
              throw new Error('Delete failed');
            }
          } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', 'Failed to delete image.');
          }
        },
      },
    ]);
  };

  const navigateToSubscription = () => {
    // Navigate to subscription screen
    // This would need navigation prop passed in or use navigation hook
    Alert.alert('Upgrade', 'Navigate to subscription screen...');
  };

  return (
    <View style={styles.container}>
      {/* Header with plan info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Gallery</Text>
          <Text style={styles.headerSubtitle}>
            {images.length} / {maxImages} images
          </Text>
        </View>
        <View style={styles.planBadge}>
          <Text style={styles.planText}>BASIC</Text>
        </View>
      </View>

      {/* Image Grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageGrid}>
          {images.map((imageUrl, index) => (
            <View key={index} style={styles.imageCard}>
              <Image source={{ uri: imageUrl }} style={styles.image} />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteImage(imageUrl, index)}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Upload Button */}
          {canUploadMore && (
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

        {/* Upgrade prompt if at limit */}
        {!canUploadMore && (
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

      {/* Plan Comparison Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Upload Limits by Plan:</Text>
        <View style={styles.planLimits}>
          <PlanLimit plan="Free" limit={MEDIA_LIMITS[userType].free} />
          <PlanLimit plan="Basic" limit={MEDIA_LIMITS[userType].basic} />
          <PlanLimit plan="Premium" limit={MEDIA_LIMITS[userType].premium} />
          <PlanLimit plan="Enterprise" limit={MEDIA_LIMITS[userType].enterprise} />
        </View>
      </View>
    </View>
  );
}

function PlanLimit({ plan, limit }: { plan: string; limit: number }) {
  return (
    <View style={styles.planLimitItem}>
      <Text style={styles.planLimitPlan}>{plan}</Text>
      <Text style={styles.planLimitNumber}>{limit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  planBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  scrollContent: {
    padding: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageCard: {
    position: 'relative',
    width: (width - 52) / 3,
    height: (width - 52) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadCard: {
    width: (width - 52) / 3,
    height: (width - 52) / 3,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  upgradePrompt: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  upgradeText: {
    marginTop: 8,
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
  },
  upgradeButton: {
    marginTop: 12,
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  planLimits: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  planLimitItem: {
    alignItems: 'center',
  },
  planLimitPlan: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  planLimitNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
});