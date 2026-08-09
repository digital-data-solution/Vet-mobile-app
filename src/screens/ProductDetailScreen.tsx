/**
 * ProductDetailScreen.tsx — one product: current stock, restock, adjust (with a
 * mandatory reason — the theft-control path), edit details, archive, and the
 * product's own movement history.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { activeStaffId } from '../utils/businessSession';

interface Movement { _id: string; type: string; quantityChange: number; quantityBefore: number; quantityAfter: number; reason?: string; staffName: string; createdAt: string; }
interface Product { _id: string; name: string; sku?: string; category?: string; unit?: string; costPrice: number; sellPrice: number; quantity: number; lowStockThreshold: number; movements?: Movement[]; }
interface Props { navigation: any; route: any; }

const TYPE_LABEL: Record<string, string> = { initial: 'Opening stock', restock: 'Restock', sale: 'Sale', return: 'Return', adjustment: 'Adjustment', damage: 'Damage/Loss' };

export default function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [modal, setModal]     = useState<null | 'restock' | 'adjust' | 'edit'>(null);
  const [busy, setBusy]       = useState(false);

  const [restockQty, setRestockQty]   = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [newQty, setNewQty]           = useState('');
  const [reason, setReason]           = useState('');
  const [edit, setEdit]               = useState({ name: '', sellPrice: '', costPrice: '', lowStockThreshold: '' });

  const load = useCallback(async () => {
    try {
      const res = await businessFetch(`/api/v1/business/products/${productId}`, { method: 'GET' });
      if (res.ok && res.body?.data) {
        setProduct(res.body.data);
        setEdit({
          name: res.body.data.name,
          sellPrice: String(res.body.data.sellPrice),
          costPrice: String(res.body.data.costPrice || ''),
          lowStockThreshold: String(res.body.data.lowStockThreshold),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doRestock = async () => {
    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) return showAlert('Quantity', 'Enter how many you received.');
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/business/products/${productId}/restock`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, unitCost: restockCost ? Number(restockCost) : undefined, staffId: activeStaffId() }),
      });
      if (res.ok) { setModal(null); setRestockQty(''); setRestockCost(''); load(); }
      else showAlert('Error', res.body?.message || 'Could not add stock.');
    } finally { setBusy(false); }
  };

  const doAdjust = async () => {
    if (newQty === '' || isNaN(Number(newQty))) return showAlert('Count', 'Enter the new count.');
    if (!reason.trim()) return showAlert('Reason required', 'Say why the count is changing (recount, damage, loss…).');
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/business/products/${productId}/adjust`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newQuantity: parseInt(newQty, 10), reason: reason.trim(), staffId: activeStaffId() }),
      });
      if (res.ok) { setModal(null); setNewQty(''); setReason(''); load(); }
      else showAlert('Error', res.body?.message || 'Could not adjust stock.');
    } finally { setBusy(false); }
  };

  const doEdit = async () => {
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/business/products/${productId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: edit.name.trim(), sellPrice: Number(edit.sellPrice),
          costPrice: edit.costPrice ? Number(edit.costPrice) : 0,
          lowStockThreshold: parseInt(edit.lowStockThreshold, 10) || 0,
        }),
      });
      if (res.ok) { setModal(null); load(); }
      else showAlert('Error', res.body?.message || 'Could not save.');
    } finally { setBusy(false); }
  };

  const archive = () => showAlert('Archive product?', 'It will be hidden from your inventory. Sales history is kept.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Archive', style: 'destructive', onPress: async () => {
      const res = await businessFetch(`/api/v1/business/products/${productId}`, { method: 'DELETE' });
      if (res.ok) navigation.goBack();
    } },
  ]);

  if (loading || !product) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;
  const low = product.quantity <= product.lowStockThreshold;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.head}>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.price}>₦{product.sellPrice.toLocaleString()}{product.unit ? ` / ${product.unit}` : ''}</Text>
        {product.category ? <Text style={styles.cat}>{product.category}</Text> : null}
      </View>

      <View style={styles.stockCard}>
        <Text style={[styles.stockNum, low && { color: '#DC2626' }]}>{product.quantity}</Text>
        <Text style={styles.stockLabel}>{low ? '⚠️ Low stock' : 'in stock'}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#059669' }]} onPress={() => setModal('restock')}><Text style={styles.actText}>＋ Restock</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#D97706' }]} onPress={() => setModal('adjust')}><Text style={styles.actText}>⚖ Adjust</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.actBtn, { backgroundColor: '#4338CA' }]} onPress={() => setModal('edit')}><Text style={styles.actText}>✎ Edit</Text></TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Stock history</Text>
      {(product.movements || []).length === 0 && <Text style={styles.empty}>No movements yet.</Text>}
      {(product.movements || []).map((m) => (
        <View key={m._id} style={styles.moveRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.moveType}>{TYPE_LABEL[m.type] || m.type}{m.reason ? ` — ${m.reason}` : ''}</Text>
            <Text style={styles.moveMeta}>{m.staffName} · {new Date(m.createdAt).toLocaleString()}</Text>
          </View>
          <Text style={[styles.moveChange, { color: m.quantityChange >= 0 ? '#059669' : '#DC2626' }]}>
            {m.quantityChange >= 0 ? '+' : ''}{m.quantityChange}
          </Text>
        </View>
      ))}

      <TouchableOpacity style={styles.archive} onPress={archive}><Text style={styles.archiveText}>Archive this product</Text></TouchableOpacity>

      {/* Restock */}
      <SheetModal visible={modal === 'restock'} title="Add stock" onClose={() => setModal(null)}>
        <Field label="Quantity received" value={restockQty} onChangeText={setRestockQty} keyboardType="numeric" autoFocus />
        <Field label="Unit cost (optional)" value={restockCost} onChangeText={setRestockCost} keyboardType="numeric" />
        <PrimaryBtn label="Add Stock" busy={busy} onPress={doRestock} />
      </SheetModal>

      {/* Adjust */}
      <SheetModal visible={modal === 'adjust'} title="Adjust count" onClose={() => setModal(null)}>
        <Text style={styles.hint}>Use this for a recount, damage or loss. Current count: {product.quantity}. This is logged with your name.</Text>
        <Field label="New count" value={newQty} onChangeText={setNewQty} keyboardType="numeric" autoFocus />
        <Field label="Reason (required)" value={reason} onChangeText={setReason} placeholder="e.g. recount, expired, damaged" />
        <PrimaryBtn label="Save Adjustment" busy={busy} onPress={doAdjust} />
      </SheetModal>

      {/* Edit */}
      <SheetModal visible={modal === 'edit'} title="Edit product" onClose={() => setModal(null)}>
        <Field label="Name" value={edit.name} onChangeText={(t: string) => setEdit({ ...edit, name: t })} />
        <Field label="Sell price" value={edit.sellPrice} onChangeText={(t: string) => setEdit({ ...edit, sellPrice: t })} keyboardType="numeric" />
        <Field label="Cost price" value={edit.costPrice} onChangeText={(t: string) => setEdit({ ...edit, costPrice: t })} keyboardType="numeric" />
        <Field label="Low-stock alert at" value={edit.lowStockThreshold} onChangeText={(t: string) => setEdit({ ...edit, lowStockThreshold: t })} keyboardType="numeric" />
        <PrimaryBtn label="Save" busy={busy} onPress={doEdit} />
      </SheetModal>
    </ScrollView>
  );
}

function SheetModal({ visible, title, onClose, children }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
          <TouchableOpacity style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
function Field({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#9CA3AF" {...props} />
    </View>
  );
}
function PrimaryBtn({ label, busy, onPress }: any) {
  return (
    <TouchableOpacity style={styles.saveBtn} onPress={onPress} disabled={busy}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  head: { marginBottom: 14 },
  name: { fontSize: 24, fontWeight: '900', color: '#111827' },
  price: { fontSize: 16, fontWeight: '700', color: '#4338CA', marginTop: 4 },
  cat: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  stockCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 },
  stockNum: { fontSize: 48, fontWeight: '900', color: '#059669' },
  stockLabel: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  actBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  actText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 10 },
  empty: { color: '#9CA3AF', fontSize: 14 },
  moveRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  moveType: { fontSize: 14, fontWeight: '700', color: '#111827' },
  moveMeta: { fontSize: 11.5, color: '#9CA3AF', marginTop: 2 },
  moveChange: { fontSize: 18, fontWeight: '900', marginLeft: 8 },

  archive: { marginTop: 24, padding: 14, alignItems: 'center' },
  archiveText: { color: '#DC2626', fontWeight: '700' },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 16 },
  hint: { fontSize: 13, color: '#6B7280', marginBottom: 12, lineHeight: 19 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  saveBtn: { backgroundColor: '#4338CA', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
});
