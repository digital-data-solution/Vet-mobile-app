/**
 * AuditLogScreen.tsx — the full, append-only stock ledger across all products.
 * Every movement shows the product, what happened, the before→after count, the
 * reason, and WHO did it. Filter by type or rep. This is the theft-review view.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { businessFetch } from '../api/client';

interface Movement {
  _id: string; productName: string; type: string; quantityChange: number;
  quantityBefore: number; quantityAfter: number; reason?: string; staffName: string; createdAt: string;
}
interface Staff { _id: string; name: string; }

const TYPES = ['', 'sale', 'restock', 'adjustment', 'damage', 'initial', 'return'];
const TYPE_LABEL: Record<string, string> = { '': 'All', initial: 'Opening', restock: 'Restock', sale: 'Sale', return: 'Return', adjustment: 'Adjust', damage: 'Damage' };
const TYPE_COLOR: Record<string, string> = { sale: '#DC2626', restock: '#059669', adjustment: '#D97706', damage: '#B91C1C', initial: '#6B7280', return: '#059669' };

export default function AuditLogScreen() {
  const [loading, setLoading]   = useState(true);
  const [moves, setMoves]       = useState<Movement[]>([]);
  const [staff, setStaff]       = useState<Staff[]>([]);
  const [type, setType]         = useState('');
  const [staffId, setStaffId]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (staffId) params.set('staffId', staffId);
      const [mRes, sRes] = await Promise.all([
        businessFetch(`/api/v1/business/movements?${params.toString()}`, { method: 'GET' }),
        staff.length ? Promise.resolve(null) : businessFetch('/api/v1/business/staff', { method: 'GET' }),
      ]);
      if (mRes.ok && mRes.body?.data) setMoves(mRes.body.data);
      if (sRes && sRes.ok && sRes.body?.data) setStaff(sRes.body.data);
    } finally { setLoading(false); }
  }, [type, staffId, staff.length]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        <FlatList
          horizontal showsHorizontalScrollIndicator={false} data={TYPES} keyExtractor={(t) => t || 'all'}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.chip, type === item && styles.chipOn]} onPress={() => setType(item)}>
              <Text style={[styles.chipText, type === item && styles.chipTextOn]}>{TYPE_LABEL[item]}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      {staff.length > 0 && (
        <View style={styles.filters}>
          <FlatList
            horizontal showsHorizontalScrollIndicator={false}
            data={[{ _id: '', name: 'Everyone' }, ...staff]} keyExtractor={(s) => s._id || 'all'}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.chip, staffId === item._id && styles.chipOn]} onPress={() => setStaffId(item._id)}>
                <Text style={[styles.chipText, staffId === item._id && styles.chipTextOn]}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>
      ) : (
        <FlatList
          data={moves}
          keyExtractor={(m) => m._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No movements match this filter.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={[styles.tag, { backgroundColor: (TYPE_COLOR[item.type] || '#6B7280') + '22' }]}>
                <Text style={[styles.tagText, { color: TYPE_COLOR[item.type] || '#6B7280' }]}>{TYPE_LABEL[item.type] || item.type}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prod}>{item.productName}</Text>
                <Text style={styles.meta}>
                  {item.quantityBefore} → {item.quantityAfter}{item.reason ? ` · ${item.reason}` : ''}
                </Text>
                <Text style={styles.who}>{item.staffName} · {new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              <Text style={[styles.change, { color: item.quantityChange >= 0 ? '#059669' : '#DC2626' }]}>
                {item.quantityChange >= 0 ? '+' : ''}{item.quantityChange}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filters: { paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  chip: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  chipOn: { backgroundColor: '#4338CA' },
  chipText: { fontWeight: '700', color: '#6B7280', fontSize: 13 },
  chipTextOn: { color: '#fff' },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  tag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 62, alignItems: 'center' },
  tagText: { fontSize: 11, fontWeight: '800' },
  prod: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 12.5, color: '#6B7280', marginTop: 1 },
  who: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  change: { fontSize: 18, fontWeight: '900' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 50, fontSize: 15 },
});
