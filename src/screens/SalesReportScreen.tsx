/**
 * SalesReportScreen.tsx — revenue & profit for today/this week/this month, a
 * per-rep breakdown (who's selling how much), top products, and recent sales.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiFetch } from '../api/client';

interface Period { count: number; revenue: number; profit: number; }
interface Summary {
  today: Period; week: Period; month: Period;
  byStaff: { _id: string; count: number; revenue: number }[];
  topProducts: { _id: string; qty: number; revenue: number }[];
}
interface Sale { _id: string; total: number; staffName: string; paymentMethod: string; items: any[]; createdAt: string; customerName?: string; }

export default function SalesReportScreen() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sales, setSales]     = useState<Sale[]>([]);

  const load = useCallback(async () => {
    try {
      const [sumRes, salesRes] = await Promise.all([
        apiFetch('/api/v1/business/sales/summary', { method: 'GET' }),
        apiFetch('/api/v1/business/sales', { method: 'GET' }),
      ]);
      if (sumRes.ok && sumRes.body?.data) setSummary(sumRes.body.data);
      if (salesRes.ok && salesRes.body?.data) setSales(salesRes.body.data.slice(0, 40));
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;

  const Stat = ({ label, p }: { label: string; p: Period }) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statRev}>₦{(p?.revenue || 0).toLocaleString()}</Text>
      <Text style={styles.statMeta}>{p?.count || 0} sales · ₦{(p?.profit || 0).toLocaleString()} profit</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {summary && (
        <>
          <Stat label="TODAY" p={summary.today} />
          <View style={styles.two}>
            <View style={{ flex: 1 }}><Stat label="THIS WEEK" p={summary.week} /></View>
            <View style={{ flex: 1 }}><Stat label="THIS MONTH" p={summary.month} /></View>
          </View>

          <Text style={styles.section}>By sales rep (this month)</Text>
          {summary.byStaff.length === 0 && <Text style={styles.empty}>No sales yet.</Text>}
          {summary.byStaff.map((s) => (
            <View key={s._id || 'owner'} style={styles.repRow}>
              <Text style={styles.repName}>👤 {s._id || 'Owner'}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.repRev}>₦{s.revenue.toLocaleString()}</Text>
                <Text style={styles.repMeta}>{s.count} sales</Text>
              </View>
            </View>
          ))}

          <Text style={styles.section}>Top products (this month)</Text>
          {summary.topProducts.length === 0 && <Text style={styles.empty}>No sales yet.</Text>}
          {summary.topProducts.map((p) => (
            <View key={p._id} style={styles.topRow}>
              <Text style={styles.topName}>{p._id}</Text>
              <Text style={styles.topQty}>{p.qty} sold · ₦{p.revenue.toLocaleString()}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.section}>Recent sales</Text>
      {sales.length === 0 && <Text style={styles.empty}>No sales recorded yet.</Text>}
      {sales.map((s) => (
        <View key={s._id} style={styles.saleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saleTotal}>₦{s.total.toLocaleString()}</Text>
            <Text style={styles.saleMeta}>
              {s.items.length} item{s.items.length === 1 ? '' : 's'} · {s.staffName} · {s.paymentMethod}
              {s.customerName ? ` · ${s.customerName}` : ''}
            </Text>
          </View>
          <Text style={styles.saleTime}>{new Date(s.createdAt).toLocaleDateString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  two: { flexDirection: 'row', gap: 12 },
  statCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  statLabel: { fontSize: 11, fontWeight: '800', color: '#6366F1', letterSpacing: 0.5 },
  statRev: { fontSize: 26, fontWeight: '900', color: '#111827', marginTop: 4 },
  statMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },

  section: { fontSize: 16, fontWeight: '900', color: '#111827', marginTop: 20, marginBottom: 10 },
  empty: { color: '#9CA3AF', fontSize: 14 },

  repRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  repName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  repRev: { fontSize: 16, fontWeight: '900', color: '#059669' },
  repMeta: { fontSize: 11, color: '#9CA3AF' },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  topName: { fontSize: 14, fontWeight: '700', color: '#111827', flex: 1 },
  topQty: { fontSize: 13, color: '#6B7280' },

  saleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  saleTotal: { fontSize: 16, fontWeight: '900', color: '#111827' },
  saleMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  saleTime: { fontSize: 12, color: '#9CA3AF' },
});
