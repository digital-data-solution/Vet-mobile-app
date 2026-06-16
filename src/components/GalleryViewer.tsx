import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Image,
  FlatList,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GalleryImage {
  url: string;
  publicId?: string;
}

interface GalleryViewerProps {
  visible: boolean;
  images: GalleryImage[];
  initialIndex?: number;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function GalleryViewer({ visible, images, initialIndex = 0, onClose }: GalleryViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const listRef = useRef<FlatList>(null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false })}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>

        {images.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{index + 1} / {images.length}</Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item, i) => item.publicId || item.url || String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(i);
          }}
          renderItem={({ item }) => (
            <View style={styles.page}>
              <Image source={{ uri: item.url }} style={styles.image} resizeMode="contain" />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 6,
  },
  counter: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  page: { width, justifyContent: 'center', alignItems: 'center' },
  image: { width: width - 24, height: '80%' },
});
