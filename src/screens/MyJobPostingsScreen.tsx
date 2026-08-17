/**
 * MyJobPostingsScreen — the poster's own job postings across all statuses,
 * with quick access to detail (where edit/boost/filled/renew/remove live).
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyJobPostings, JobPosting } from '../api/jobBoard';

const ACCENT = '#2563EB';
const STATUS_COLOR: Record<string, string> = {
  active: '#2563EB', filled: '#6B7280', expired: '#F59E0B', removed: '#DC2626',
};

interface Props { navigation: any }

export default function MyJobPostingsScreen({ navigation }: Props) {
  const [items, setItems]     = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    getMyJobPostings().then(setItems).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const render = ({ item }: { item: JobPosting }) => (
    <TouchableOpacity style={styles.row} activeOpacity={0.85}
      onPress={() => navigation.navigate('JobPostingDetail', { id: item._id, mine: true })}>
      <View style={styles.iconWrap}>
        <Ionicons name={item.kind === 'position' ? 'briefcase' : 'person'} size={22} color={ACCENT} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.kind}>{item.kind === 'position' ? 'Open Position' : 'Seeking Work'}</Text>
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
            <Ionicons name="briefcase-outline" size={44} color="#D1D5DB" />
            <Text style={styles.emptyTxt}>You have no job postings yet.</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateJobPosting', {})}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.fabTxt}>New Posting</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTxt: { fontSize: 15, color: '#6B7280', marginTop: 10, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#EEF0F2' },
  iconWrap: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  kind: { fontSize: 12, color: ACCENT, marginTop: 2, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeTxt: { fontSize: 10, fontWeight: '800' },
  views: { fontSize: 12, color: '#9CA3AF' },
  fab: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 30, elevation: 3 },
  fabTxt: { color: '#fff', fontWeight: '900' },
});
