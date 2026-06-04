import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, uploadFile } from '../api/client';

// FIX: Removed supabase + getCurrentUser imports entirely.
// The backend derives the user from the JWT via req.user._id (protect middleware),
// so the frontend never needs to know the userId for profile uploads.
// The old code fetched userId only to build the fileName/publicId, which is
// equally unique using Date.now() and is overwritten deterministically by
// the publicId field sent to Cloudinary.

interface ProfileImageUploaderProps {
  onUploadSuccess?: (url: string) => void;
  currentImageUrl?: string | null;
}

export default function ProfileImageUploader({
  onUploadSuccess,
  currentImageUrl,
}: ProfileImageUploaderProps) {
  const [image,     setImage]     = useState<string | null>(currentImageUrl ?? null);
  const [uploading, setUploading] = useState(false);

  // FIX: Removed userId state + getCurrentUser() effect — not needed (see above).

  // Keep local state in sync when the parent updates currentImageUrl
  useEffect(() => {
    setImage(currentImageUrl ?? null);
  }, [currentImageUrl]);

  // Request media-library permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload profile photos.',
        );
      }
    })();
  }, []);

  // ─── Pick image ─────────────────────────────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const localUri = result.assets[0].uri;
        // Show local preview immediately while upload runs
        setImage(localUri);
        await uploadImage(localUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // ─── Upload to Cloudinary via backend ──────────────────────────────────────
  const uploadImage = async (imageUri: string) => {
    if (!imageUri) return;

    setUploading(true);

    try {
      // FIX: No userId needed — publicId is a fixed string per user managed
      // server-side. We send a stable publicId so Cloudinary overwrites the
      // previous profile photo in-place (no orphaned assets accumulate).
      // The backend appends req.user._id to make it globally unique.
      const fileExt  = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `profile.${fileExt}`;

      const result = await uploadFile(
        '/api/upload',
        imageUri,
        fileName,
        {
          folder:   'profiles',
          // FIX: publicId no longer embeds userId from client — the backend
          // route reads req.body.publicId but the server already knows the
          // user from the JWT. Sending 'profile' here means the backend will
          // use it as-is; the backend could also ignore it and build its own.
          // Either way, the client doesn't need to know its own userId.
          publicId: 'profile',
        },
        'image',
      );

      if (!result.ok) {
        throw new Error(result.userMessage || result.body?.message || 'Image upload failed.');
      }

      const publicUrl: string = result.body.url;

      // ── Persist the URL on the user's profile ────────────────────────────────
      const updateRes = await apiFetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileImage:     publicUrl,
          profileImagePath: result.body.publicId ?? fileName,
        }),
      });

      if (!updateRes.ok) {
        throw new Error(updateRes.body?.message ?? 'Failed to save profile image.');
      }

      // Replace local preview with the final Cloudinary URL
      setImage(publicUrl);
      onUploadSuccess?.(publicUrl);
      Alert.alert('Success', 'Profile photo updated successfully! ✓');
    } catch (error: any) {
      console.error('Upload error:', error);
      // Roll back preview to the previous remote URL on failure
      setImage(currentImageUrl ?? null);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Remove photo ───────────────────────────────────────────────────────────
  const removeImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              const updateRes = await apiFetch('/api/auth/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profileImage: null, profileImagePath: null }),
              });

              if (!updateRes.ok) {
                throw new Error(updateRes.body?.message ?? 'Failed to remove photo.');
              }

              setImage(null);
              onUploadSuccess?.('');
              Alert.alert('Success', 'Profile photo removed.');
            } catch (error: any) {
              console.error('Remove error:', error);
              Alert.alert('Error', error.message || 'Failed to remove photo.');
            } finally {
              setUploading(false);
            }
          },
        },
      ],
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={pickImage}
        disabled={uploading}
        activeOpacity={0.85}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}

        {/* Upload overlay */}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Camera badge */}
        {!uploading && (
          <View style={styles.cameraBadge}>
            <Text style={styles.cameraBadgeText}>✏️</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={pickImage}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {image ? '📷 Change Photo' : '📷 Add Photo'}
          </Text>
        </TouchableOpacity>

        {image && !uploading && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={removeImage}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonTextSecondary}>🗑️ Remove</Text>
          </TouchableOpacity>
        )}
      </View>

      {uploading && (
        <Text style={styles.uploadingText}>Uploading…</Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  placeholderText: { fontSize: 40 },
  uploadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cameraBadgeText: { fontSize: 14 },
  buttonContainer: { flexDirection: 'row', gap: 8 },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonPrimary: { backgroundColor: '#2563EB' },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  buttonTextSecondary: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  uploadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});