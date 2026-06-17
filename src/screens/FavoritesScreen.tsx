import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getFavorites, toggleFavorite, FavoriteItem } from '../utils/favorites';
import { showAlert } from '../utils/alert';

const TYPE_META: Record<string, { emoji: string; color: string; bgColor: string }> = {
  professional: { emoji: '👨‍⚕️', color: '#2563EB', bgColor: '#EFF6FF' },
  kennel:       { emoji: '🐕',   color: '#7C3AED', bgColor: '#F5F3FF' },
  shop:         { emoji: '🛒',   color: '#EA580C', bgColor: '#FFF7ED' },
};

const ROLE_EMOJI: Record<string, string> = {
  vet: '👨‍⚕️', kennel: '🐕', groomer: '✂️', trainer: '🎓',
  pet_sitter: '🏠', pet_transport: '🚐', farm: '🐐',
  agro_vet_supplier: '🌾', pet_pharmacy: '💊', rescue_center: '🐾',
  pet_hotel: '🏨', insurance_provider: '🛡️', cremation_service: '🕊️',
};

export default function FavoritesScreen({ navigation }: any) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const items = await getFavorites();
    setFavorites(items);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleRemove = async (item: FavoriteItem) => {
    showAlert(
      'Remove Favourite',
      `Remove ${item.name} from your favourites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            await toggleFavorite(item);
            setFavorites((prev) => prev.filter((f) => f.id !== item.id));
          },
        },
      ],
    );
  };

  const handleNavigate = (item: FavoriteItem) => {
    if (item.type === 'kennel') navigation.navigate('KennelProfile', { kennelId: item.id });
    else if (item.type === 'shop') navigation.navigate('ShopProfile', { shopId: item.id });
    else if (item.role === 'vet' || item.role === 'kennel') navigation.navigate('VetProfile', { vetId: item.id });
    else navigation.navigate('ServiceProfile', { professionalId: item.id });
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => {
    const meta = TYPE_META[item.type] ?? TYPE_META.professional;
    const emoji = (item.role && ROLE_EMOJI[item.role]) || meta.emoji;
    const roleLabel = item.role ? item.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : item.type;

    return (
      <TouchableOpacity style={styles.card} onPress={() => handleNavigate(item)} activeOpacity={0.82}>
        {item.profileImage ? (
          <Image source={{ uri: item.profileImage }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardIcon, { backgroundColor: meta.bgColor }]}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.cardRole, { color: meta.color }]}>{roleLabel}</Text>
          {item.address ? <Text style={styles.cardAddress} numberOfLines={1}>📍 {item.address}</Text> : null}
        </View>
        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="heart" size={22} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E8610A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={['#E8610A']} tintColor="#E8610A" />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>❤️ Saved Favourites</Text>
            <Text style={styles.headerSub}>{favorites.length} saved · tap any to revisit</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💔</Text>
            <Text style={styles.emptyTitle}>No favourites yet</Text>
            <Text style={styles.emptySub}>
              Tap the heart icon on any vet, kennel, shop or service profile to save them here.
            </Text>
            <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('Professionals')} activeOpacity={0.85}>
              <Text style={styles.browseBtnText}>Browse Professionals</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F1F5F9' },
  cardIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardRole: { fontSize: 12, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  cardAddress: { fontSize: 12, color: '#6B7280', marginTop: 3 },
  removeBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  browseBtn: { backgroundColor: '#2563EB', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
