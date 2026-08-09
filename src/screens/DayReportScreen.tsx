/**
 * DayReportScreen.tsx — "close the books" without arguments.
 *
 *   • DAY tab   — every transaction for one calendar day (timezone-aware on the
 *                 server), totals, a per-payment-method and per-rep breakdown,
 *                 a one-tap CSV export, and a Close Day (Z-report) flow with
 *                 cash reconciliation: opening float + counted cash → expected
 *                 vs variance, so the till is balanced and signed off.
 *   • MONTH tab — every day's net/profit for the month, the running total, which
 *                 days were closed (and any cash variance), plus a monthly CSV.
 *
 * Each calendar day stands alone (no bleed across midnight) and a closed day is
 * stamped with who closed it and when.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { downloadCsv } from '../utils/print';
import { money as naira } from '../utils/money';
const todayStr = () => new Date(Date.now() + 60 * 60000).toISOString().slice(0, 10); // WAT
const monthStr = () => todayStr().slice(0, 7);
const shiftDay = (d: string, delta: number) => {
  const t = new Date(`${d}T12:00:00.000Z`).getTime() + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
};
const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

interface Totals { salesCount: number; gross: number; discountTotal: number; net: number; costTotal: number; profit: number; }
interface DaySale { _id: string; total: number; staffName?: string; paymentMethod: string; items: any[]; customerName?: string; createdAt: string; }
interface Closed {
  openingFloat: number; expectedCash: number; countedCash: number | null; variance: number;
  closedByName: string; closedAt: string; note?: string;
}
interface DayData {
  dateStr: string; totals: Totals; byMethod: Record<string, number>;
  byStaff: { staffName: string; count: number; revenue: number }[];
  sales: DaySale[]; closed: Closed | null;
}
interface MonthDay { dateStr: string; salesCount: number; net: number; profit: number; discount: number; close: { variance: number; closedByName: string } | null; }
interface MonthData { ym: string; totals: { salesCount: number; net: number; profit: number; discount: number }; days: MonthDay[]; }

interface Props { navigation: any; }

export default function DayReportScreen({ navigation }: Props) {
  const [tab, setTab] = useState<'day' | 'month'>('day');
  const [date, setDate] = useState(todayStr());
  const [ym, setYm] = useState(monthStr());
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<DayData | null>(null);
  const [month, setMonth] = useState<MonthData | null>(null);

  // Close-day modal
  const [closeOpen, setCloseOpen] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [note, setNote] = useState('');
  const [closing, setClosing] = useState(false);

  const loadDay = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await businessFetch(`/api/v1/business/reports/day?date=${d}`, { method: 'GET' });
      if (res.ok && res.body?.data) setDay(res.body.data);
      else if (res.status === 403) showAlert('No permission', res.body?.message || 'Ask the owner for reports access.');
    } finally { setLoading(false); }
  }, []);

  const loadMonth = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const res = await businessFetch(`/api/v1/business/reports/month?ym=${m}`, { method: 'GET' });
      if (res.ok && res.body?.data) setMonth(res.body.data);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    if (tab === 'day') loadDay(date); else loadMonth(ym);
  }, [tab, date, ym, loadDay, loadMonth]));

  const exportDayCsv = async () => {
    const res = await businessFetch(`/api/v1/business/reports/day.csv?date=${date}`, { method: 'GET' });
    if (res.ok && typeof res.body === 'string') await downloadCsv(`sales-${date}.csv`, res.body);
    else showAlert('Export failed', 'Could not export this day.');
  };
  const exportMonthCsv = async () => {
    const res = await businessFetch(`/api/v1/business/reports/month.csv?ym=${ym}`, { method: 'GET' });
    if (res.ok && typeof res.body === 'string') await downloadCsv(`monthly-${ym}.csv`, res.body);
    else showAlert('Export failed', 'Could not export this month.');
  };

  const expectedCash = (Number(openingFloat) || 0) + (day?.byMethod?.cash || 0);
  const variancePreview = countedCash !== '' ? (Number(countedCash) || 0) - expectedCash : null;

  const submitClose = async () => {
    setClosing(true);
    try {
      const res = await businessFetch('/api/v1/business/reports/close-day', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          openingFloat: Number(openingFloat) || 0,
          countedCash: countedCash === '' ? undefined : Number(countedCash),
          note: note.trim() || undefined,
        }),
      });
      if (res.ok && res.body?.data) {
        setCloseOpen(false); setOpeningFloat(''); setCountedCash(''); setNote('');
        showAlert('Day closed', `${date} signed off. Net ${naira(res.body.data.net)}.`);
        loadDay(date);
      } else {
        showAlert('Error', res.body?.message || 'Could not close the day.');
      }
    } finally { setClosing(false); }
  };

  const Segmented = () => (
    <View style={styles.seg}>
      <TouchableOpacity style={[styles.segBtn, tab === 'day' && styles.segOn]} onPress={() => setTab('day')}>
        <Text style={[styles.segText, tab === 'day' && styles.segTextOn]}>Day</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.segBtn, tab === 'month' && styles.segOn]} onPress={() => setTab('month')}>
        <Text style={[styles.segText, tab === 'month' && styles.segTextOn]}>Month</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Segmented />

      {tab === 'day' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* date nav */}
          <View style={styles.nav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setDate(shiftDay(date, -1))}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
            <View style={styles.navMid}>
              <Text style={styles.navDate}>{date === todayStr() ? 'Today' : date}</Text>
              <Text style={styles.navSub}>{date}</Text>
            </View>
            <TouchableOpacity style={[styles.navBtn, date >= todayStr() && styles.navBtnOff]} disabled={date >= todayStr()} onPress={() => setDate(shiftDay(date, 1))}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator size="large" color="#4338CA" style={{ marginTop: 40 }} /> : day && (
            <>
              {day.closed && (
                <View style={styles.closedBanner}>
                  <Text style={styles.closedTitle}>✅ Closed by {day.closed.closedByName}</Text>
                  <Text style={styles.closedSub}>
                    Expected cash {naira(day.closed.expectedCash)} · Counted {day.closed.countedCash == null ? '—' : naira(day.closed.countedCash)}
                    {day.closed.countedCash != null ? ` · ${day.closed.variance === 0 ? 'Balanced' : (day.closed.variance > 0 ? `Over ${naira(day.closed.variance)}` : `Short ${naira(-day.closed.variance)}`)}` : ''}
                  </Text>
                </View>
              )}

              <View style={styles.statCard}>
                <Text style={styles.statBig}>{naira(day.totals.net)}</Text>
                <Text style={styles.statSub}>{day.totals.salesCount} sale{day.totals.salesCount === 1 ? '' : 's'} · {naira(day.totals.profit)} profit</Text>
                {day.totals.discountTotal > 0 && <Text style={styles.statSub}>{naira(day.totals.discountTotal)} discounts given</Text>}
              </View>

              <View style={styles.grid}>
                {Object.entries(day.byMethod).filter(([, v]) => v > 0).map(([k, v]) => (
                  <View key={k} style={styles.miniCard}>
                    <Text style={styles.miniVal}>{naira(v)}</Text>
                    <Text style={styles.miniLbl}>{k}</Text>
                  </View>
                ))}
              </View>

              {day.byStaff.length > 0 && (
                <>
                  <Text style={styles.section}>By rep</Text>
                  {day.byStaff.map((s) => (
                    <View key={s.staffName} style={styles.row}>
                      <Text style={styles.rowName}>👤 {s.staffName}</Text>
                      <Text style={styles.rowVal}>{naira(s.revenue)} · {s.count}</Text>
                    </View>
                  ))}
                </>
              )}

              <Text style={styles.section}>Transactions</Text>
              {day.sales.length === 0 && <Text style={styles.empty}>No sales this day.</Text>}
              {day.sales.map((s) => (
                <TouchableOpacity key={s._id} style={styles.saleRow} onPress={() => navigation.navigate('Receipt', { saleId: s._id })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleTotal}>{naira(s.total)}</Text>
                    <Text style={styles.saleMeta}>{s.items.length} item{s.items.length === 1 ? '' : 's'} · {s.staffName || 'Owner'} · {s.paymentMethod}{s.customerName ? ` · ${s.customerName}` : ''}</Text>
                  </View>
                  <Text style={styles.saleTime}>{new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Text style={styles.chev}>🧾›</Text>
                </TouchableOpacity>
              ))}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnGhost} onPress={exportDayCsv}><Text style={styles.btnGhostText}>⬇︎ Export CSV</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={() => setCloseOpen(true)}>
                  <Text style={styles.btnPrimaryText}>{day.closed ? 'Re-close Day' : 'Close Day'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.nav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => setYm(shiftMonth(ym, -1))}><Text style={styles.navArrow}>‹</Text></TouchableOpacity>
            <View style={styles.navMid}><Text style={styles.navDate}>{ym}</Text></View>
            <TouchableOpacity style={[styles.navBtn, ym >= monthStr() && styles.navBtnOff]} disabled={ym >= monthStr()} onPress={() => setYm(shiftMonth(ym, 1))}><Text style={styles.navArrow}>›</Text></TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator size="large" color="#4338CA" style={{ marginTop: 40 }} /> : month && (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statBig}>{naira(month.totals.net)}</Text>
                <Text style={styles.statSub}>{month.totals.salesCount} sales · {naira(month.totals.profit)} profit this month</Text>
              </View>

              <Text style={styles.section}>Day by day</Text>
              {month.days.length === 0 && <Text style={styles.empty}>No sales this month.</Text>}
              {month.days.map((d) => (
                <TouchableOpacity key={d.dateStr} style={styles.saleRow} onPress={() => { setDate(d.dateStr); setTab('day'); }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleTotal}>{naira(d.net)}</Text>
                    <Text style={styles.saleMeta}>{d.dateStr} · {d.salesCount} sales · {naira(d.profit)} profit</Text>
                  </View>
                  {d.close ? (
                    <Text style={[styles.tag, d.close.variance === 0 ? styles.tagOk : styles.tagWarn]}>
                      {d.close.variance === 0 ? '✓ closed' : (d.close.variance > 0 ? `+${naira(d.close.variance)}` : `-${naira(-d.close.variance)}`)}
                    </Text>
                  ) : <Text style={styles.tagOpen}>open</Text>}
                </TouchableOpacity>
              ))}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnGhost} onPress={exportMonthCsv}><Text style={styles.btnGhostText}>⬇︎ Export monthly CSV</Text></TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* Close-day modal */}
      <Modal visible={closeOpen} transparent animationType="slide" onRequestClose={() => setCloseOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Close {date === todayStr() ? 'today' : date}</Text>
            <Text style={styles.modalHint}>Count the till and sign off. Cash sales today: {naira(day?.byMethod?.cash || 0)}.</Text>

            <Text style={styles.fieldLabel}>Opening float (₦)</Text>
            <TextInput style={styles.input} value={openingFloat} onChangeText={setOpeningFloat} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />

            <Text style={styles.fieldLabel}>Cash counted in drawer (₦)</Text>
            <TextInput style={styles.input} value={countedCash} onChangeText={setCountedCash} keyboardType="numeric" placeholder="Count the cash" placeholderTextColor="#9CA3AF" />

            <View style={styles.reconRow}><Text style={styles.reconLbl}>Expected cash</Text><Text style={styles.reconVal}>{naira(expectedCash)}</Text></View>
            {variancePreview !== null && (
              <View style={styles.reconRow}>
                <Text style={styles.reconLbl}>Variance</Text>
                <Text style={[styles.reconVal, variancePreview === 0 ? styles.ok : styles.warn]}>
                  {variancePreview === 0 ? 'Balanced ✓' : (variancePreview > 0 ? `Over ${naira(variancePreview)}` : `Short ${naira(-variancePreview)}`)}
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Note (optional)</Text>
            <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. ₦500 taken for fuel" placeholderTextColor="#9CA3AF" />

            <TouchableOpacity style={styles.btnPrimaryWide} onPress={submitClose} disabled={closing}>
              {closing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Sign off & Close</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={() => setCloseOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 40 },

  seg: { flexDirection: 'row', backgroundColor: '#E5E7EB', margin: 16, marginBottom: 0, borderRadius: 10, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segOn: { backgroundColor: '#fff' },
  segText: { fontWeight: '800', color: '#6B7280' },
  segTextOn: { color: '#4338CA' },

  nav: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  navBtnOff: { opacity: 0.3 },
  navArrow: { fontSize: 26, color: '#4338CA', fontWeight: '900', lineHeight: 28 },
  navMid: { flex: 1, alignItems: 'center' },
  navDate: { fontSize: 18, fontWeight: '900', color: '#111827' },
  navSub: { fontSize: 12, color: '#9CA3AF' },

  closedBanner: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#A7F3D0' },
  closedTitle: { fontSize: 14, fontWeight: '800', color: '#065F46' },
  closedSub: { fontSize: 12, color: '#047857', marginTop: 2 },

  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  statBig: { fontSize: 32, fontWeight: '900', color: '#111827' },
  statSub: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  miniCard: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E7EB', minWidth: 100, flexGrow: 1 },
  miniVal: { fontSize: 16, fontWeight: '900', color: '#111827' },
  miniLbl: { fontSize: 11, color: '#6B7280', textTransform: 'uppercase', marginTop: 2, fontWeight: '700' },

  section: { fontSize: 16, fontWeight: '900', color: '#111827', marginTop: 18, marginBottom: 10 },
  empty: { color: '#9CA3AF', fontSize: 14 },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  rowName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  rowVal: { fontSize: 13, color: '#059669', fontWeight: '800' },

  saleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  saleTotal: { fontSize: 15, fontWeight: '900', color: '#111827' },
  saleMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  saleTime: { fontSize: 12, color: '#9CA3AF', marginRight: 8 },
  chev: { fontSize: 14, color: '#4338CA', fontWeight: '900' },

  tag: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  tagOk: { backgroundColor: '#ECFDF5', color: '#047857' },
  tagWarn: { backgroundColor: '#FEF2F2', color: '#B91C1C' },
  tagOpen: { fontSize: 11, fontWeight: '800', color: '#9CA3AF' },

  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btnGhost: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#4338CA', padding: 14, alignItems: 'center' },
  btnGhostText: { color: '#4338CA', fontWeight: '900', fontSize: 14 },
  btnPrimary: { flex: 1, backgroundColor: '#4338CA', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  modalHint: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827' },
  reconRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  reconLbl: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  reconVal: { fontSize: 16, fontWeight: '900', color: '#111827' },
  ok: { color: '#059669' },
  warn: { color: '#B91C1C' },
  btnPrimaryWide: { backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 18 },
  cancel: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
});
