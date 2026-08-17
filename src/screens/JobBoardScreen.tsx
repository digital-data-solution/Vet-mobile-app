/**
 * JobBoardScreen — Job Board browse hub. Two sides: "Open Positions" (clinics/
 * shops/kennels hiring) and "Seeking Work" (candidates available). Built as a
 * directory, not a feed — useful even when fresh postings are sparse.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { browseJobPostings, getJobBoardMeta, JobKind, JobPosting, JobBoardMeta } from '../api/jobBoard';
import { getUserLocation } from '../utils/location';
import { showAlert } from '../utils/alert';

const ACCENT = '#2563EB';

const ROLE_LABELS: Record<string, string> = {
  vet: 'Vet', vet_tech: 'Vet Tech', groomer: 'Groomer', trainer: 'Trainer',
  pet_sitter: 'Pet Sitter', receptionist: 'Receptionist', kennel_assistant: 'Kennel Assistant',
  driver: 'Driver', sales_rep: 'Sales Rep', manager: 'Manager', other: 'Other',
};

interface Props { navigation: any }

export default function JobBoardScreen({ navigation }: Props) {
  const [kind, setKind]         = useState<JobKind>('position');
  const [meta, setMeta]         = useState<JobBoardMeta | null>(null);
  const [roleCategory, setRoleCategory] = useState('');
  const [sort, setSort]         = useState<'newest' | 'nearest'>('newest');
  const [q, setQ]               = useState('');
  const [items, setItems]       = useState<JobPosting[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coords, setCoords]     = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => { getJobBoardMeta().then(setMeta); }, []);
  useEffect(() => {
    getUserLocation().then((loc: any) => {
      if (loc?.latitude && loc?.longitude) setCoords({ lat: loc.latitude, lng: loc.longitude });
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    const res = await browseJobPostings({
      kind, roleCategory: roleCategory || undefined, q: q || undefined, sort,
      lat: sort === 'nearest' ? coords?.lat : undefined,
      lng: sort === 'nearest' ? coords?.lng : undefined,
      limit: 30,
    });
    setItems(res.data);
  }, [kind, roleCategory, q, sort, coords]);

  useEffect(() => { setLoading(true); load().finally(() => setLoading(false)); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load().finally(() => setRefreshing(false)); }, [load]);

  const selectSort = useCallback(async (val: 'newest' | 'nearest') => {
    if (val === 'nearest' && !coords) {
      try {
        const loc: any = await getUserLocation();
        if (loc?.latitude && loc?.longitude) setCoords({ lat: loc.latitude, lng: loc.longitude });
        else throw new Error('no-coords');
      } catch {
        showAlert('Location needed', 'Turn on location access to see postings near you. Showing newest for now.');
        setSort('newest');
        return;
      }
    }
    setSort(val);
  }, [coords]);

  const roleCategories = meta?.roleCategories || [];

  const renderCard = ({ item }: { item: JobPosting }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.85}
      onPress={() => navigation.navigate('JobPostingDetail', { id: item._id })}>
      <View style={styles.cardTop}>
        <View style={styles.roleBadge}>
          <Ionicons name={item.kind === 'position' ? 'briefcase' : 'person'} size={14} color={ACCENT} />
          <Text style={styles.roleBadgeTxt}>{ROLE_LABELS[item.roleCategory || ''] || 'General'}</Text>
        </View>
        {item.isFeaturedNow && <View style={styles.featured}><Text style={styles.featuredTxt}>★ FEATURED</Text></View>}
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {[item.employmentType?.replace('_', ' '), item.city].filter(Boolean).join(' · ') || '—'}
      </Text>
      {!!item.salaryText && <Text style={styles.salary} numberOfLines={1}>{item.salaryText}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Kind toggle */}
      <View style={styles.kindRow}>
        {([['position', '🏥 Open Positions'], ['seeking_work', '🙋 Seeking Work']] as const).map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.kindBtn, kind === k && styles.kindBtnActive]}
            onPress={() => setKind(k as JobKind)}>
            <Text style={[styles.kindTxt, kind === k && styles.kindTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput style={styles.search} placeholder="Search title, role or city…"
          value={q} onChangeText={setQ} returnKeyType="search" onSubmitEditing={load} placeholderTextColor="#9CA3AF" />
        {q ? <TouchableOpacity onPress={() => setQ('')}><Ionicons name="close-circle" size={18} color="#9CA3AF" /></TouchableOpacity> : null}
      </View>

      {/* Sort + role chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {([['newest', 'Newest'], ['nearest', 'Near me']] as const).map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.chip, sort === val && styles.chipActive]} onPress={() => selectSort(val)}>
            <Text style={[styles.chipTxt, sort === val && styles.chipTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.sep} />
        <TouchableOpacity style={[styles.chip, !roleCategory && styles.chipActive]} onPress={() => setRoleCategory('')}>
          <Text style={[styles.chipTxt, !roleCategory && styles.chipTxtActive]}>All roles</Text>
        </TouchableOpacity>
        {roleCategories.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, roleCategory === c && styles.chipActive]} onPress={() => setRoleCategory(c)}>
            <Text style={[styles.chipTxt, roleCategory === c && styles.chipTxtActive]}>{ROLE_LABELS[c] || c}</Text>
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
          contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name={kind === 'position' ? 'briefcase-outline' : 'person-outline'} size={44} color="#D1D5DB" />
              <Text style={styles.emptyTxt}>Nothing here yet.</Text>
              <Text style={styles.emptySub}>
                {kind === 'position' ? 'Be the first clinic to post an opening.' : 'Be the first to post your availability.'}
              </Text>
            </View>
          }
        />
      )}

      {/* My postings + Post */}
      <View style={styles.fabRow}>
        <TouchableOpacity style={styles.mineBtn} onPress={() => navigation.navigate('MyJobPostings')}>
          <Ionicons name="briefcase-outline" size={18} color={ACCENT} />
          <Text style={styles.mineTxt}>My Postings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postBtn} onPress={() => navigation.navigate('CreateJobPosting', { kind })}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.postTxt}>Post</Text>
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
  kindTxt: { fontWeight: '800', color: '#6B7280', fontSize: 13 },
  kindTxtActive: { color: '#fff' },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginTop: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  search: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#111827' },

  chips: { maxHeight: 46, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginRight: 6 },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipTxt: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  chipTxtActive: { color: '#fff' },
  sep: { width: 1, backgroundColor: '#E5E7EB', marginHorizontal: 6, marginVertical: 8 },

  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 14, borderWidth: 1, borderColor: '#EEF0F2' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleBadgeTxt: { fontSize: 11, fontWeight: '700', color: ACCENT },
  featured: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  featuredTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12, color: '#9CA3AF', marginTop: 4, textTransform: 'capitalize' },
  salary: { fontSize: 13, fontWeight: '700', color: '#059669', marginTop: 4 },

  fabRow: { position: 'absolute', bottom: 16, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  mineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: ACCENT, elevation: 2 },
  mineTxt: { color: ACCENT, fontWeight: '800' },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, elevation: 3 },
  postTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
