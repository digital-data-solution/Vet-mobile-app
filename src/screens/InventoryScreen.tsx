/**
 * InventoryScreen.tsx — product list with live stock counts, search, low-stock
 * filter, and an add-product modal. Tap a product to manage its stock & history.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { activeStaffId } from '../utils/businessSession';
import BarcodeScanner from '../components/BarcodeScanner';

interface Product {
  _id: string; name: string; sku?: string; barcode?: string; category?: string; unit?: string;
  costPrice: number; sellPrice: number; quantity: number; lowStockThreshold: number;
  trackBatches?: boolean;
}
interface Props { navigation: any; }

// Build a tidy, professional SKU from category + name + a short random suffix,
// e.g. FOOD-ROYA-8F2. Owners can still type their own.
function suggestSku(name: string, category: string) {
  const clean = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const cat = clean(category) || 'GEN';
  const nm = clean(name) || 'ITEM';
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${cat}-${nm}-${rnd}`;
}

// Accept blank (optional) or a valid YYYY-MM-DD date not in the distant past.
function validExpiry(s: string) {
  if (!s.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const d = new Date(s.trim());
  return !isNaN(d.getTime());
}

export default function InventoryScreen({ navigation }: Props) {
  const [loading, setLoading]   = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ]               = useState('');
  const [lowOnly, setLowOnly]   = useState(false);

  const [addOpen, setAddOpen]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const emptyForm = {
    name: '', sku: '', barcode: '', sellPrice: '', costPrice: '', quantity: '', unit: '', category: '', lowStockThreshold: '',
    trackBatches: false, stockPolicy: 'FEFO' as 'FEFO' | 'FIFO', lotNumber: '', expiryDate: '',
  };
  const [form, setForm]         = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (lowOnly) params.set('lowStock', 'true');
      const res = await businessFetch(`/api/v1/business/products?${params.toString()}`, { method: 'GET' });
      if (res.ok && res.body?.data) setProducts(res.body.data);
    } catch {
      showAlert('Error', 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, [q, lowOnly]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addProduct = async () => {
    if (!form.name.trim()) return showAlert('Name required', 'Enter a product name.');
    if (!form.sellPrice || isNaN(Number(form.sellPrice))) return showAlert('Price required', 'Enter a valid selling price.');
    if (form.trackBatches && !validExpiry(form.expiryDate)) return showAlert('Expiry date', 'Enter the expiry as YYYY-MM-DD, or leave it blank.');
    setSaving(true);
    try {
      const res = await businessFetch('/api/v1/business/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          sellPrice: Number(form.sellPrice),
          costPrice: form.costPrice ? Number(form.costPrice) : 0,
          quantity: form.quantity ? parseInt(form.quantity, 10) : 0,
          unit: form.unit.trim() || undefined,
          category: form.category.trim() || undefined,
          lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold, 10) : undefined,
          trackBatches: form.trackBatches,
          stockPolicy: form.stockPolicy,
          lotNumber: form.trackBatches ? (form.lotNumber.trim() || undefined) : undefined,
          expiryDate: form.trackBatches ? (form.expiryDate.trim() || undefined) : undefined,
          staffId: activeStaffId(),
        }),
      });
      if (res.ok && res.body?.success) {
        setAddOpen(false);
        setForm(emptyForm);
        load();
      } else if (res.status === 402) {
        setAddOpen(false);
        showAlert('Free limit reached', res.body?.message || 'Upgrade to add more products.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('BusinessUpgrade') },
        ]);
      } else {
        showAlert('Error', res.body?.message || 'Could not add product.');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Product }) => {
    const low = item.quantity <= item.lowStockThreshold;
    return (
      <Pressable style={styles.row} onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>₦{item.sellPrice.toLocaleString()}{item.category ? ` · ${item.category}` : ''}</Text>
          <View style={styles.tagRow}>
            {item.sku ? <Text style={styles.skuTag}>{item.sku}</Text> : null}
            {item.trackBatches ? <Text style={styles.batchTag}>📅 batches</Text> : null}
          </View>
        </View>
        <View style={styles.qtyWrap}>
          <Text style={[styles.qty, low && styles.qtyLow]}>{item.quantity}</Text>
          <Text style={styles.qtyUnit}>{item.unit || 'in stock'}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.search} value={q} onChangeText={setQ} placeholder="Search products…"
          placeholderTextColor="#9CA3AF" returnKeyType="search" onSubmitEditing={load}
        />
        <TouchableOpacity style={[styles.filterChip, lowOnly && styles.filterChipOn]} onPress={() => setLowOnly((v) => !v)}>
          <Text style={[styles.filterText, lowOnly && styles.filterTextOn]}>⚠️ Low</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          ListEmptyComponent={<Text style={styles.empty}>No products yet. Tap ＋ to add your first item.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setAddOpen(true)}><Text style={styles.fabText}>＋</Text></TouchableOpacity>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Product</Text>
            <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
            <Field label="Name *" value={form.name} onChangeText={(t: string) => setForm({ ...form, name: t })} />
            <View style={styles.two}>
              <Field label="Sell price *" value={form.sellPrice} onChangeText={(t: string) => setForm({ ...form, sellPrice: t })} keyboardType="numeric" half />
              <Field label="Cost price" value={form.costPrice} onChangeText={(t: string) => setForm({ ...form, costPrice: t })} keyboardType="numeric" half />
            </View>

            {/* SKU with one-tap auto-generate */}
            <Text style={styles.fieldLabel}>SKU (stock code)</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]} value={form.sku} placeholder="e.g. FOOD-ROYA-8F2"
                placeholderTextColor="#9CA3AF" autoCapitalize="characters"
                onChangeText={(t: string) => setForm({ ...form, sku: t })}
              />
              <TouchableOpacity style={styles.miniBtn} onPress={() => setForm({ ...form, sku: suggestSku(form.name, form.category) })}>
                <Text style={styles.miniBtnText}>Auto</Text>
              </TouchableOpacity>
            </View>

            {/* Barcode with camera scan */}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Barcode</Text>
            <View style={styles.inlineRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]} value={form.barcode} placeholder="Scan or type"
                placeholderTextColor="#9CA3AF" keyboardType="numeric"
                onChangeText={(t: string) => setForm({ ...form, barcode: t })}
              />
              <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#059669' }]} onPress={() => setScanOpen(true)}>
                <Text style={styles.miniBtnText}>📷 Scan</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.two, { marginTop: 12 }]}>
              <Field label="Opening stock" value={form.quantity} onChangeText={(t: string) => setForm({ ...form, quantity: t })} keyboardType="numeric" half />
              <Field label="Unit (bag, tin…)" value={form.unit} onChangeText={(t: string) => setForm({ ...form, unit: t })} half />
            </View>
            <View style={styles.two}>
              <Field label="Category" value={form.category} onChangeText={(t: string) => setForm({ ...form, category: t })} half />
              <Field label="Low-stock at" value={form.lowStockThreshold} onChangeText={(t: string) => setForm({ ...form, lowStockThreshold: t })} keyboardType="numeric" half />
            </View>

            {/* Batch / expiry tracking (opt-in) */}
            <TouchableOpacity style={styles.toggleRow} onPress={() => setForm({ ...form, trackBatches: !form.trackBatches })}>
              <View style={[styles.checkbox, form.trackBatches && styles.checkboxOn]}>
                {form.trackBatches ? <Text style={styles.checkTick}>✓</Text> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Track batches & expiry</Text>
                <Text style={styles.toggleHint}>For medicines, vaccines & perishables. Enables expiry alerts and sells the right batch first.</Text>
              </View>
            </TouchableOpacity>

            {form.trackBatches && (
              <View style={styles.batchBox}>
                <Text style={styles.fieldLabel}>Sell-first rule</Text>
                <View style={styles.segment}>
                  {(['FEFO', 'FIFO'] as const).map((p) => (
                    <TouchableOpacity key={p} style={[styles.segBtn, form.stockPolicy === p && styles.segBtnOn]} onPress={() => setForm({ ...form, stockPolicy: p })}>
                      <Text style={[styles.segText, form.stockPolicy === p && styles.segTextOn]}>{p === 'FEFO' ? 'Expiry first (FEFO)' : 'Oldest first (FIFO)'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[styles.two, { marginTop: 12 }]}>
                  <Field label="Lot / batch no." value={form.lotNumber} onChangeText={(t: string) => setForm({ ...form, lotNumber: t })} half />
                  <Field label="Expiry (YYYY-MM-DD)" value={form.expiryDate} onChangeText={(t: string) => setForm({ ...form, expiryDate: t })} placeholder="2026-12-31" half />
                </View>
              </View>
            )}
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={addProduct} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Product</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={() => setAddOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BarcodeScanner
        visible={scanOpen}
        title="Scan product barcode"
        onClose={() => setScanOpen(false)}
        onScanned={(code) => { setForm((f) => ({ ...f, barcode: code })); setScanOpen(false); }}
      />
    </View>
  );
}

function Field({ label, half, ...props }: any) {
  return (
    <View style={[{ marginBottom: 12 }, half && { flex: 1 }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor="#9CA3AF" {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  search: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827' },
  filterChip: { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 12, justifyContent: 'center' },
  filterChipOn: { backgroundColor: '#FEF3C7' },
  filterText: { fontWeight: '700', color: '#6B7280', fontSize: 13 },
  filterTextOn: { color: '#92400E' },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 5 },
  skuTag: { fontSize: 10.5, fontWeight: '800', color: '#4338CA', backgroundColor: '#EEF2FF', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' },
  batchTag: { fontSize: 10.5, fontWeight: '800', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, overflow: 'hidden' },
  qtyWrap: { alignItems: 'flex-end' },
  qty: { fontSize: 22, fontWeight: '900', color: '#059669' },
  qtyLow: { color: '#DC2626' },
  qtyUnit: { fontSize: 11, color: '#9CA3AF' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 60, fontSize: 15, paddingHorizontal: 30, lineHeight: 22 },

  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4338CA', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 16 },
  two: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },

  inlineRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  miniBtn: { backgroundColor: '#4338CA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, justifyContent: 'center' },
  miniBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, marginBottom: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: '#4338CA', borderColor: '#4338CA' },
  checkTick: { color: '#fff', fontWeight: '900', fontSize: 14 },
  toggleTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  toggleHint: { fontSize: 11.5, color: '#6B7280', marginTop: 2, lineHeight: 16 },

  batchBox: { backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, marginTop: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  segBtnOn: { backgroundColor: '#EEF2FF', borderColor: '#4338CA' },
  segText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  segTextOn: { color: '#4338CA' },

  saveBtn: { backgroundColor: '#4338CA', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
});
