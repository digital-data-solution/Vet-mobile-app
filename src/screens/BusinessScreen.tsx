/**
 * BusinessScreen.tsx — the Business Suite hub.
 *
 * Shows live status (products, low stock, today's takings), who's currently
 * ringing up sales (the active rep), and routes to Inventory, Record Sale,
 * Reports, Staff and the Audit Log. Reps sign themselves in here by PIN so
 * their name is stamped on everything they do.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { money, setCurrencySymbol } from '../utils/money';
import {
  ActiveRep, getActiveRep, loadActiveRep, setActiveRep,
  StaffAuth, getStaffSession, loadStaffSession, clearStaffSession,
} from '../utils/businessSession';

interface Status {
  productCount: number; freeProductLimit: number; atLimit: boolean; lowStockCount: number;
  staffCount: number; canAddStaff: boolean; addonActive: boolean; daysRemaining: number;
  today: { count: number; total: number };
}
interface Staff { _id: string; name: string; role: string; }
interface Props { navigation: any; }

export default function BusinessScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState<Status | null>(null);
  const [rep, setRep]         = useState<ActiveRep | null>(null);
  const [staffAuth, setStaffAuth] = useState<StaffAuth | null>(null);

  const [switchOpen, setSwitchOpen] = useState(false);
  const [staff, setStaff]           = useState<Staff[]>([]);
  const [selStaff, setSelStaff]     = useState<Staff | null>(null);
  const [pin, setPin]               = useState('');
  const [verifying, setVerifying]   = useState(false);

  const load = useCallback(async () => {
    try {
      await loadStaffSession();
      setStaffAuth(getStaffSession()?.staff ?? null);
      await loadActiveRep();
      setRep(getActiveRep());
      const res = await businessFetch('/api/v1/business/status', { method: 'GET' });
      if (res.ok && res.body?.data) setStatus(res.body.data);
      else if (res.status === 403) showAlert('Not available', res.body?.message || 'The Business Suite is for shops, vets and kennels.');
      // Hydrate the business's currency so amounts render in ₦ / SAR / $ etc.
      businessFetch('/api/v1/business/reports/business-profile', { method: 'GET' })
        .then((r) => { if (r.ok && r.body?.data?.currencySymbol) setCurrencySymbol(r.body.data.currencySymbol); })
        .catch(() => {});
    } catch {
      showAlert('Error', 'Could not load your business dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openSwitch = async () => {
    setSwitchOpen(true);
    const res = await businessFetch('/api/v1/business/staff', { method: 'GET' });
    if (res.ok && res.body?.data) setStaff(res.body.data.filter((s: any) => s.isActive));
  };

  const verifyPin = async () => {
    if (!selStaff || !pin) return;
    setVerifying(true);
    try {
      const res = await businessFetch('/api/v1/business/staff/verify-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: selStaff._id, pin }),
      });
      if (res.ok && res.body?.data) {
        await setActiveRep(res.body.data);
        setRep(res.body.data);
        setSwitchOpen(false); setSelStaff(null); setPin('');
      } else {
        showAlert('Incorrect PIN', res.body?.message || 'Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const signOutRep = async () => { await setActiveRep(null); setRep(null); };

  const staffLogout = () => {
    showAlert('Log out?', 'You will need your username and password to sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await clearStaffSession(); } },
    ]);
  };

  // Permission-scoped visibility. In owner mode (no staff session) everything shows.
  const isStaff = !!staffAuth;
  const perms   = staffAuth?.permissions;
  const can = (key: keyof NonNullable<typeof perms>) => !isStaff || !!perms?.[key];

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;

  const Tile = ({ icon, title, desc, onPress, badge }: any) => (
    <Pressable style={styles.tile} onPress={onPress}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileDesc}>{desc}</Text>
      </View>
      {badge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View> : <Text style={styles.tileArrow}>›</Text>}
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Signed-in bar: staff mode (own device) vs owner mode (shared device + PIN switch) */}
      {isStaff ? (
        <View style={styles.repBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.repLabel}>Signed in as{staffAuth?.businessName ? ` · ${staffAuth.businessName}` : ''}</Text>
            <Text style={styles.repName}>👤 {staffAuth?.name}{staffAuth?.role ? ` · ${staffAuth.role}` : ''}</Text>
          </View>
          <TouchableOpacity style={styles.repBtnGhost} onPress={staffLogout}><Text style={styles.repBtnGhostText}>Log out</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.repBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.repLabel}>Selling as</Text>
            <Text style={styles.repName}>{rep ? `👤 ${rep.name}` : '👑 Owner'}</Text>
          </View>
          <TouchableOpacity style={styles.repBtn} onPress={openSwitch}><Text style={styles.repBtnText}>Switch</Text></TouchableOpacity>
          {rep && <TouchableOpacity style={styles.repBtnGhost} onPress={signOutRep}><Text style={styles.repBtnGhostText}>Owner</Text></TouchableOpacity>}
        </View>
      )}

      {/* Today */}
      {status && (
        <View style={styles.statCard}>
          <Text style={styles.statBig}>{money(status.today.total)}</Text>
          <Text style={styles.statSub}>{status.today.count} sale{status.today.count === 1 ? '' : 's'} today</Text>
          <View style={styles.statRow}>
            <Text style={styles.statChip}>📦 {status.productCount} products</Text>
            {status.lowStockCount > 0 && <Text style={[styles.statChip, styles.statWarn]}>⚠️ {status.lowStockCount} low</Text>}
          </View>
        </View>
      )}

      {!isStaff && status && !status.addonActive && (
        <Pressable style={styles.upBanner} onPress={() => navigation.navigate('BusinessUpgrade')}>
          <Text style={styles.upBannerText}>
            Free plan: {status.productCount}/{status.freeProductLimit} products. Upgrade for unlimited stock + sales reps →
          </Text>
        </Pressable>
      )}

      {can('sell')            && <Tile icon="🧾" title="Record a Sale" desc="Ring up items — stock updates instantly" onPress={() => navigation.navigate('RecordSale')} />}
      {can('manageInventory') && <Tile icon="📦" title="Inventory" desc="Products, stock levels, restock" badge={status?.lowStockCount || 0} onPress={() => navigation.navigate('Inventory')} />}
      {can('viewReports')     && <Tile icon="📊" title="Sales & Reports" desc="Revenue, profit, per-rep breakdown" onPress={() => navigation.navigate('SalesReport')} />}
      {can('viewReports')     && <Tile icon="📅" title="Day Close & Reports" desc="Balance the till, close each day, monthly CSV" onPress={() => navigation.navigate('DayReport')} />}
      {can('manageStaff')     && <Tile icon="👥" title="Sales Reps" desc="Add staff, set logins & permissions" onPress={() => navigation.navigate('Staff')} />}
      {!isStaff && <Tile icon="🧾" title="Receipt Settings" desc="Your logo & details on every receipt" onPress={() => navigation.navigate('ReceiptSettings')} />}
      {(!isStaff || perms?.adjustStock || perms?.manageInventory) && <Tile icon="🔎" title="Audit Log" desc="Every stock move, who did it, when" onPress={() => navigation.navigate('AuditLog')} />}
      {!isStaff && <Tile icon="⭐" title="Upgrade / Renew" desc={status?.addonActive ? `${status.daysRemaining} days left` : 'Unlock unlimited + reps'} onPress={() => navigation.navigate('BusinessUpgrade')} />}

      {/* Rep switch modal */}
      <Modal visible={switchOpen} transparent animationType="slide" onRequestClose={() => setSwitchOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selStaff ? `Enter PIN for ${selStaff.name}` : 'Who is selling?'}</Text>
            {!selStaff ? (
              <>
                {staff.length === 0 && <Text style={styles.modalHint}>No reps yet. Add them under Sales Reps.</Text>}
                {staff.map((s) => (
                  <TouchableOpacity key={s._id} style={styles.staffRow} onPress={() => setSelStaff(s)}>
                    <Text style={styles.staffName}>👤 {s.name}</Text>
                    <Text style={styles.staffRole}>{s.role}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.modalCancel} onPress={() => setSwitchOpen(false)}><Text style={styles.modalCancelText}>Close</Text></TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.pinInput} value={pin} onChangeText={setPin}
                  keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="••••" placeholderTextColor="#9CA3AF" autoFocus
                />
                <TouchableOpacity style={styles.modalBtn} onPress={verifyPin} disabled={verifying}>
                  {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Sign In</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setSelStaff(null); setPin(''); }}><Text style={styles.modalCancelText}>Back</Text></TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content:   { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },

  repBar:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#C7D2FE' },
  repLabel:{ fontSize: 11, color: '#6366F1', fontWeight: '700', textTransform: 'uppercase' },
  repName: { fontSize: 17, fontWeight: '900', color: '#3730A3', marginTop: 2 },
  repBtn:  { backgroundColor: '#4338CA', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  repBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  repBtnGhost: { paddingHorizontal: 10, paddingVertical: 8, marginLeft: 6 },
  repBtnGhostText: { color: '#4338CA', fontWeight: '800', fontSize: 13 },

  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  statBig:  { fontSize: 34, fontWeight: '900', color: '#111827' },
  statSub:  { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statRow:  { flexDirection: 'row', gap: 8, marginTop: 12 },
  statChip: { backgroundColor: '#F3F4F6', color: '#374151', fontWeight: '700', fontSize: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, overflow: 'hidden' },
  statWarn: { backgroundColor: '#FEF3C7', color: '#92400E' },

  upBanner: { backgroundColor: '#FEF9C3', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  upBannerText: { color: '#854D0E', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  tile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  tileIcon: { fontSize: 24, marginRight: 14 },
  tileTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  tileDesc:  { fontSize: 12.5, color: '#6B7280', marginTop: 2 },
  tileArrow: { fontSize: 26, color: '#9CA3AF', fontWeight: '900', marginLeft: 8 },
  badge: { backgroundColor: '#F59E0B', minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 12 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 14 },
  modalHint: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  staffRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  staffName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  staffRole: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  pinInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 16, fontSize: 24, textAlign: 'center', letterSpacing: 8, color: '#111827', marginBottom: 14 },
  modalBtn: { backgroundColor: '#4338CA', borderRadius: 12, padding: 15, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  modalCancel: { padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#6B7280', fontWeight: '700' },
});
