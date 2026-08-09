/**
 * MyListingsScreen — the seller's own listings across all statuses, with quick
 * access to detail (where edit/boost/sold/renew/remove live).
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyListings, Listing } from '../api/market';

const ACCENT = '#0F9D58';
const STATUS_COLOR: Record<string, string> = {
  active: '#0F9D58', sold: '#6B7280', expired: '#F59E0B', removed: '#DC2626',
};

interface Props { navigation: any }

export default function MyListingsScreen({ navigation }: Props) {
  const [items, setItems]   = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getMyListings().then(setItems).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const render = ({ item }: { item: Listing }) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.85}
      onPress={() => navigation.navigate('ListingDetail', { id: item._id, mine: true })}>
      {item.images?.[0]?.url
        ? <Image source={{ uri: item.images[0].url }} style={styles.thumb} />
        : <View style={[styles.thumb, styles.thumbEmpty]}><Ionicons name={item.kind === 'pet' ? 'paw' : 'cube'} size={22} color="#9CA3AF" /></View>}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.price}>₦{item.price?.toLocaleString()}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[item.status] || '#6B7280') + '22' }]}>
            <Text style={[styles.badgeTxt, { color: STATUS_COLOR[item.status] || '#6B7280' }]}>
              {item.isFeaturedNow ? '★ ' : ''}{item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.views}><Ionicons name="eye-outline" size={12} color="#9CA3AF" /> {item.views || 0}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        renderItem={render}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="pricetags-outline" size={44} color="#D1D5DB" />
            <Text style={styles.emptyTxt}>You have no listings yet.</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateListing', {})}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.fabTxt}>New Listing</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTxt: { fontSize: 15, color: '#6B7280', marginTop: 10, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEF0F2' },
  thumb: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#F3F4F6' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  price: { fontSize: 14, fontWeight: '900', color: ACCENT, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  views: { fontSize: 12, color: '#9CA3AF' },
  fab: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 30, elevation: 3 },
  fabTxt: { color: '#fff', fontWeight: '900' },
});
