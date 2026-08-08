/**
 * WalletScreen.tsx
 *
 * Wallet + escrow UI (Phase 2 monetization):
 *  - Balance (available + held in escrow)
 *  - Fund wallet via Paystack (reuses PaystackWebView)
 *  - Withdraw to a bank account (Paystack Transfer)
 *  - Transaction history
 *  - Bookings/escrow with Release (buyer) / Refund (provider) actions
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

interface Props { navigation: any; }

interface Txn {
  _id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: string;
  metadata?: { description?: string };
}
interface Booking {
  _id: string;
  amount: number;
  providerAmount: number;
  commissionAmount: number;
  status: string;
  role: 'buyer' | 'provider';
  description?: string;
  buyer?: { name?: string };
  provider?: { name?: string };
}
interface Bank { name: string; code: string; }

const naira = (n: number) => `₦${(n || 0).toLocaleString()}`;

const TYPE_LABEL: Record<string, string> = {
  deposit: 'Wallet funding',
  withdrawal: 'Withdrawal',
  payment_escrow: 'Paid to escrow',
  payment_release: 'Received (released)',
  commission: 'Commission',
  refund: 'Refund',
};

export default function WalletScreen({ navigation }: Props) {
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balance, setBalance]   = useState(0);
  const [escrow, setEscrow]     = useState(0);
  const [txns, setTxns]         = useState<Txn[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [fundOpen, setFundOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [funding, setFunding]   = useState(false);

  const [wdOpen, setWdOpen]     = useState(false);
  const [wdAmount, setWdAmount] = useState('');
  const [wdAccount, setWdAccount] = useState('');
  const [wdBank, setWdBank]     = useState<Bank | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const [banks, setBanks]       = useState<Bank[]>([]);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [w, t, b] = await Promise.all([
        apiFetch('/api/v1/wallet', { method: 'GET' }),
        apiFetch('/api/v1/wallet/transactions', { method: 'GET' }),
        apiFetch('/api/v1/wallet/bookings', { method: 'GET' }),
      ]);
      if (w.ok && w.body?.data) { setBalance(w.body.data.balance || 0); setEscrow(w.body.data.escrowBalance || 0); }
      if (t.ok && t.body?.data) setTxns(t.body.data);
      if (b.ok && b.body?.data) setBookings(b.body.data);
    } catch {
      showAlert('Error', 'Could not load your wallet. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Fund via Paystack ──────────────────────────────────────────────────────
  const openPaystackWebView = useCallback((authorization_url: string, reference: string, amount: number) => {
    const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storePaystackCallbacks(callbackKey, {
      onSuccess: async () => { await load(); showAlert('Wallet Funded', 'Your balance has been topped up.'); },
      onCancel: () => {},
    });
    const params = { authorization_url, reference, amount, callbackKey };
    const parent = navigation.getParent();
    if (typeof parent?.navigate === 'function') parent.navigate('PaystackWebView', params);
    else navigation.navigate('PaystackWebView', params);
  }, [navigation, load]);

  const submitFund = async () => {
    const amount = parseInt(fundAmount, 10);
    if (!amount || amount < 100) { showAlert('Invalid amount', 'Enter at least ₦100.'); return; }
    setFunding(true);
    try {
      const res = await apiFetch('/api/v1/wallet/fund', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (res.ok && res.body?.success) {
        setFundOpen(false); setFundAmount('');
        const { authorization_url, reference, amount: amt } = res.body.data;
        openPaystackWebView(authorization_url, reference, amt);
      } else {
        showAlert('Error', res.body?.message || 'Could not start funding.');
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setFunding(false);
    }
  };

  // ── Withdraw ───────────────────────────────────────────────────────────────
  const openWithdraw = async () => {
    setWdOpen(true);
    if (banks.length === 0) {
      const res = await apiFetch('/api/v1/wallet/banks', { method: 'GET' });
      if (res.ok && res.body?.data) setBanks(res.body.data);
    }
  };

  const submitWithdraw = async () => {
    const amount = parseInt(wdAmount, 10);
    if (!amount || amount < 500) { showAlert('Invalid amount', 'Minimum withdrawal is ₦500.'); return; }
    if (!wdBank) { showAlert('Select a bank', 'Please choose your bank.'); return; }
    if (!wdAccount || wdAccount.length < 10) { showAlert('Account number', 'Enter a valid 10-digit account number.'); return; }
    setWithdrawing(true);
    try {
      const res = await apiFetch('/api/v1/wallet/withdraw', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, bankCode: wdBank.code, accountNumber: wdAccount }),
      });
      if (res.ok && res.body?.success) {
        setWdOpen(false); setWdAmount(''); setWdAccount(''); setWdBank(null);
        await load();
        showAlert('Withdrawal started', res.body.message || 'Funds are on the way.');
      } else {
        showAlert('Error', res.body?.message || 'Withdrawal failed.');
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  // ── Release / Refund ───────────────────────────────────────────────────────
  const act = async (bookingId: string, action: 'release' | 'refund') => {
    setActioningId(bookingId);
    try {
      const res = await apiFetch(`/api/v1/wallet/bookings/${bookingId}/${action}`, { method: 'POST' });
      if (res.ok && res.body?.success) {
        await load();
        showAlert('Done', res.body.message || 'Updated.');
      } else {
        showAlert('Error', res.body?.message || 'Action failed.');
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }

  const filteredBanks = banks.filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Balance */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balanceValue}>{naira(balance)}</Text>
        {escrow > 0 && <Text style={styles.escrowLine}>🔒 {naira(escrow)} held in escrow</Text>}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.fundBtn} onPress={() => setFundOpen(true)}>
            <Text style={styles.fundBtnText}>+ Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wdBtn} onPress={openWithdraw}>
            <Text style={styles.wdBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bookings / escrow */}
      {bookings.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Escrow & Bookings</Text>
          {bookings.map((b) => (
            <View key={b._id} style={styles.bookingCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingTitle}>
                  {b.role === 'buyer' ? `To ${b.provider?.name || 'provider'}` : `From ${b.buyer?.name || 'buyer'}`}
                </Text>
                {b.description ? <Text style={styles.bookingDesc}>{b.description}</Text> : null}
                <Text style={styles.bookingMeta}>
                  {naira(b.amount)} · <Text style={statusStyle(b.status)}>{b.status.replace('_', ' ')}</Text>
                </Text>
              </View>
              {b.status === 'funded' && b.role === 'buyer' && (
                <TouchableOpacity style={styles.releaseBtn} disabled={actioningId === b._id} onPress={() => act(b._id, 'release')}>
                  {actioningId === b._id ? <ActivityIndicator color="#fff" /> : <Text style={styles.releaseBtnText}>Release</Text>}
                </TouchableOpacity>
              )}
              {b.status === 'funded' && b.role === 'provider' && (
                <TouchableOpacity style={styles.refundBtn} disabled={actioningId === b._id} onPress={() => act(b._id, 'refund')}>
                  {actioningId === b._id ? <ActivityIndicator color="#B91C1C" /> : <Text style={styles.refundBtnText}>Refund</Text>}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      )}

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Transactions</Text>
      {txns.length === 0 ? (
        <Text style={styles.empty}>No transactions yet. Add money to get started.</Text>
      ) : txns.map((t) => (
        <View key={t._id} style={styles.txnRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.txnLabel}>{TYPE_LABEL[t.type] || t.type}</Text>
            <Text style={styles.txnDate}>{new Date(t.createdAt).toLocaleDateString()} · {t.status}</Text>
          </View>
          <Text style={[styles.txnAmount, isCredit(t.type) ? styles.credit : styles.debit]}>
            {isCredit(t.type) ? '+' : '−'}{naira(t.amount)}
          </Text>
        </View>
      ))}

      {/* Fund modal */}
      <Modal visible={fundOpen} transparent animationType="slide" onRequestClose={() => setFundOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Money</Text>
            <TextInput
              style={styles.input} keyboardType="numeric" placeholder="Amount (₦)"
              value={fundAmount} onChangeText={setFundAmount}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setFundOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} disabled={funding} onPress={submitFund}>
                {funding ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Continue</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw modal */}
      <Modal visible={wdOpen} transparent animationType="slide" onRequestClose={() => setWdOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Withdraw to Bank</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="Amount (₦)" value={wdAmount} onChangeText={setWdAmount} />
            <TouchableOpacity style={styles.input} onPress={() => setBankPickerOpen(true)}>
              <Text style={{ color: wdBank ? '#111827' : '#9CA3AF', paddingTop: 2 }}>{wdBank ? wdBank.name : 'Select bank'}</Text>
            </TouchableOpacity>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="Account number" value={wdAccount} onChangeText={setWdAccount} maxLength={10} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWdOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} disabled={withdrawing} onPress={submitWithdraw}>
                {withdrawing ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Withdraw</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank picker */}
      <Modal visible={bankPickerOpen} transparent animationType="slide" onRequestClose={() => setBankPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Select Bank</Text>
            <TextInput style={styles.input} placeholder="Search banks" value={bankSearch} onChangeText={setBankSearch} />
            <FlatList
              data={filteredBanks}
              keyExtractor={(item, i) => `${item.code}_${i}`}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.bankRow} onPress={() => { setWdBank(item); setBankPickerOpen(false); setBankSearch(''); }}>
                  <Text style={styles.bankName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>Loading banks…</Text>}
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setBankPickerOpen(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const isCredit = (type: string) => ['deposit', 'payment_release', 'refund'].includes(type);
const statusStyle = (s: string) =>
  s === 'released' ? { color: '#16A34A', fontWeight: '700' as const }
  : s === 'funded' ? { color: '#D97706', fontWeight: '700' as const }
  : s === 'refunded' ? { color: '#6B7280', fontWeight: '700' as const }
  : { color: '#6B7280' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },

  balanceCard: { backgroundColor: '#2563EB', borderRadius: 18, padding: 20, marginBottom: 20 },
  balanceLabel: { color: '#DBEAFE', fontSize: 13 },
  balanceValue: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  escrowLine:  { color: '#BFDBFE', fontSize: 13, marginTop: 6 },
  actionRow:   { flexDirection: 'row', marginTop: 16, gap: 10 },
  fundBtn:     { flex: 1, backgroundColor: '#fff', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  fundBtnText: { color: '#2563EB', fontWeight: '800' },
  wdBtn:       { flex: 1, backgroundColor: 'rgba(255,255,255,0.18)', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  wdBtnText:   { color: '#fff', fontWeight: '800' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 8, marginBottom: 10 },
  empty: { color: '#9CA3AF', fontSize: 14, paddingVertical: 12 },

  bookingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  bookingTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  bookingDesc:  { fontSize: 13, color: '#6B7280', marginTop: 2 },
  bookingMeta:  { fontSize: 13, color: '#374151', marginTop: 4 },
  releaseBtn:   { backgroundColor: '#16A34A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 84, alignItems: 'center' },
  releaseBtnText: { color: '#fff', fontWeight: '800' },
  refundBtn:    { borderWidth: 1, borderColor: '#B91C1C', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 84, alignItems: 'center' },
  refundBtnText: { color: '#B91C1C', fontWeight: '800' },

  txnRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EEF2F7' },
  txnLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  txnDate:  { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '800' },
  credit: { color: '#16A34A' },
  debit:  { color: '#B91C1C' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, minHeight: 46 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#374151', fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: '#2563EB' },
  confirmBtnText: { color: '#fff', fontWeight: '800' },
  bankRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bankName: { fontSize: 15, color: '#111827' },
});
