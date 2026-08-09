/**
 * MarketScreen — Xpress Market browse hub. Two sections: "Pets" (live animals)
 * and "Pet Mart" (products). Search, category + sort filters, near-me, and a
 * "Sell" button. Xpress Vet only connects buyers and sellers (see disclaimer).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { browseListings, getMarketMeta, Listing, ListingKind, MarketMeta } from '../api/market';
import { getUserLocation } from '../utils/location';

const ACCENT = '#0F9D58';

interface Props { navigation: any }

export default function MarketScreen({ navigation }: Props) {
  const [kind, setKind]         = useState<ListingKind>('pet');
  const [meta, setMeta]         = useState<MarketMeta | null>(null);
  const [category, setCategory] = useState<string>('');
  const [sort, setSort]         = useState<'newest' | 'nearest' | 'price_asc'>('newest');
  const [q, setQ]               = useState('');
  const [items, setItems]       = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { getMarketMeta().then(setMeta); }, []);
  useEffect(() => {
    // Silent GPS for "near me" — no error if denied.
    getUserLocation().then((loc: any) => {
      if (loc?.latitude && loc?.longitude) setCoords({ lat: loc.latitude, lng: loc.longitude });
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const res = await browseListings({
      kind, category: category || undefined, q: q || undefined, sort,
      lat: sort === 'nearest' ? coords?.lat : undefined,
      lng: sort === 'nearest' ? coords?.lng : undefined,
      limit: 30,
    });
    setItems(res.data);
  }, [kind, category, q, sort, coords]);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = useCallback(() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }, [load]);

  const categories = kind === 'pet' ? (meta?.petCategories || []) : (meta?.productCategories || []);

  const renderCard = ({ item }: { item: Listing }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}
      onPress={() => navigation.navigate('ListingDetail', { id: item._id })}>
      <View style={styles.thumbWrap}>
        {item.images?.[0]?.url
          ? <Image source={{ uri: item.images[0].url }} style={styles.thumb} />
          : <View style={[styles.thumb, styles.thumbEmpty]}><Ionicons name={kind === 'pet' ? 'paw' : 'cube'} size={28} color="#9CA3AF" /></View>}
        {item.isFeaturedNow && <View style={styles.featured}><Text style={styles.featuredTxt}>★ FEATURED</Text></View>}
      </View>
      <View style={{ flex: 1, padding: 10 }}>
        <Text style={styles.price}>₦{item.price?.toLocaleString()}{item.negotiable ? ' ' : ''}</Text>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[item.breed || item.species || item.category, item.city].filter(Boolean).join(' · ') || '—'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Kind toggle */}
      <View style={styles.kindRow}>
        {(['pet', 'product'] as ListingKind[]).map((k) => (
          <TouchableOpacity key={k} style={[styles.kindBtn, kind === k && styles.kindBtnActive]}
            onPress={() => { setKind(k); setCategory(''); }}>
            <Text style={[styles.kindTxt, kind === k && styles.kindTxtActive]}>
              {k === 'pet' ? '🐾 Pets' : '🛒 Pet Mart'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput style={styles.search} placeholder={kind === 'pet' ? 'Search breed, species…' : 'Search products…'}
          value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={load} placeholderTextColor="#9CA3AF" />
        {q ? <TouchableOpacity onPress={() => { setQ(''); }}><Ionicons name="close-circle" size={18} color="#9CA3AF" /></TouchableOpacity> : null}
      </View>

      {/* Sort + category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {([['newest', 'Newest'], ['nearest', 'Near me'], ['price_asc', 'Cheapest']] as const).map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.chip, sort === val && styles.chipActive]} onPress={() => setSort(val)}>
            <Text style={[styles.chipTxt, sort === val && styles.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.sep} />
        <TouchableOpacity style={[styles.chip, !category && styles.chipActive]} onPress={() => setCategory('')}>
          <Text style={[styles.chipTxt, !category && styles.chipTxtActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipTxt, category === c && styles.chipTxtActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i._id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 8, gap: 8 }}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name={kind === 'pet' ? 'paw-outline' : 'cube-outline'} size={44} color="#D1D5DB" />
              <Text style={styles.emptyTxt}>Nothing here yet.</Text>
              <Text style={styles.emptySub}>Be the first to list {kind === 'pet' ? 'a pet' : 'a product'} for sale.</Text>
            </View>
          }
        />
      )}

      {/* My listings + Sell */}
      <View style={styles.fabRow}>
        <TouchableOpacity style={styles.mineBtn} onPress={() => navigation.navigate('MyListings')}>
          <Ionicons name="pricetags-outline" size={18} color={ACCENT} />
          <Text style={styles.mineTxt}>My Listings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sellBtn} onPress={() => navigation.navigate('CreateListing', {})}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.sellTxt}>Sell</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTxt: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 10 },
  emptySub: { fontSize: 13, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  kindRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 8 },
  kindBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  kindBtnActive: { backgroundColor: ACCENT },
  kindTxt: { fontWeight: '800', color: '#6B7280' },
  kindTxtActive: { color: '#fff' },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  search: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#111827' },

  chips: { maxHeight: 46, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 6 },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt: { fontSize: 13, color: '#6B7280', fontWeight: '600', textTransform: 'capitalize' },
  chipTxtActive: { color: '#fff' },
  sep: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 6, marginVertical: 8 },

  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#EEF0F2' },
  thumbWrap: { position: 'relative' },
  thumb: { width: '100%', height: 130, backgroundColor: '#F3F4F6' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  featured: { position: 'absolute', top: 8, left: 8, backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  featuredTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  price: { fontSize: 16, fontWeight: '900', color: ACCENT },
  title: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
  meta: { fontSize: 11, color: '#9CA3AF', marginTop: 3, textTransform: 'capitalize' },

  fabRow: { position: 'absolute', bottom: 16, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  mineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: ACCENT, elevation: 2 },
  mineTxt: { color: ACCENT, fontWeight: '800' },
  sellBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 3 },
  sellTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
