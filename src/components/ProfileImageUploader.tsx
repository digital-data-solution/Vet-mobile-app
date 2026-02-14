import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text,
  Image, 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase, getCurrentUser } from '../api/supabase';
import { apiFetch } from '../api/client';

interface ProfileImageUploaderProps {
  onUploadSuccess?: (url: string) => void;
  currentImageUrl?: string;
}

export default function ProfileImageUploader({ 
  onUploadSuccess,
  currentImageUrl 
}: ProfileImageUploaderProps) {
  const [image, setImage] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    getCurrentUser().then(({ data }) => {
      if (data?.user?.id) {
        setUserId(data.user.id);
      }
    });
  }, []);

  useEffect(() => {
    // Update image when currentImageUrl changes
    if (currentImageUrl) {
      setImage(currentImageUrl);
    }
  }, [currentImageUrl]);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload profile photos.'
        );
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType.IMAGE,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setImage(uri);
        // Auto-upload after selection
        uploadImage(uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (imageUri: string) => {
    if (!imageUri || !userId) {
      Alert.alert('Error', 'Please select an image first.');
      return;
    }

    setUploading(true);

    try {
      // Get file extension
      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}-${Date.now()}.${fileExt}`;

      // Upload to backend using Cloudinary
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: `image/${fileExt}`,
        name: fileName,
      } as any);

      const uploadResponse = await fetch('https://vet-market-place.onrender.com/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      const publicUrl = uploadData.url;

      // Update user profile in backend
      const updateRes = await apiFetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profileImage: publicUrl,
          profileImagePath: fileName 
        }),
      });

      if (updateRes.ok) {
        Alert.alert('Success', 'Profile photo updated successfully! ✓');
        setImage(publicUrl);
        
        if (onUploadSuccess) {
          onUploadSuccess(publicUrl);
        }
      } else {
        throw new Error(updateRes.body?.message || 'Failed to update profile');
      }

    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert(
        'Upload Failed', 
        error.message || 'Failed to upload image. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
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
              // Update backend to remove image
              const res = await apiFetch('/api/auth/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  profileImage: null,
                  profileImagePath: null 
                }),
              });

              if (res.ok) {
                setImage(null);
                Alert.alert('Success', 'Profile photo removed.');
                if (onUploadSuccess) {
                  onUploadSuccess('');
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove photo.');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Profile Image Preview */}
      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}
        
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>

      {/* Action Buttons */}
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
        <Text style={styles.uploadingText}>Uploading...</Text>
      )}
    </View>
  );
}

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
  placeholderText: {
    fontSize: 40,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563EB',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});