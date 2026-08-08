/**
 * RecordSaleScreen.tsx — the point of sale. Pick products into a cart, set
 * quantities, apply a discount, choose payment method, optionally capture the
 * customer, then record. Stock decrements server-side and the sale is stamped
 * with whoever is the active rep (businessSession).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { activeStaffId, getActiveRep } from '../utils/businessSession';

interface Product { _id: string; name: string; sellPrice: number; quantity: number; unit?: string; }
interface CartLine { product: Product; quantity: number; }
interface Props { navigation: any; }

const METHODS = ['cash', 'transfer', 'card', 'wallet', 'credit'] as const;

export default function RecordSaleScreen({ navigation }: Props) {
  const [loading, setLoading]   = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ]               = useState('');
  const [cart, setCart]         = useState<Record<string, CartLine>>({});
  const [checkout, setCheckout] = useState(false);
  const [discount, setDiscount] = useState('');
  const [method, setMethod]     = useState<typeof METHODS[number]>('cash');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/business/products', { method: 'GET' });
      if (res.ok && res.body?.data) setProducts(res.body.data);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? products.filter((p) => p.name.toLowerCase().includes(s)) : products;
  }, [q, products]);

  const lines = Object.values(cart);
  const subtotal = lines.reduce((sum, l) => sum + l.product.sellPrice * l.quantity, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const cartCount = lines.reduce((n, l) => n + l.quantity, 0);

  const add = (p: Product) => {
    setCart((c) => {
      const existing = c[p._id];
      const nextQty = (existing?.quantity || 0) + 1;
      if (nextQty > p.quantity) { showAlert('Out of stock', `Only ${p.quantity} of ${p.name} left.`); return c; }
      return { ...c, [p._id]: { product: p, quantity: nextQty } };
    });
  };
  const setQty = (id: string, qty: number) => {
    setCart((c) => {
      if (qty <= 0) { const { [id]: _, ...rest } = c; return rest; }
      const line = c[id]; if (!line) return c;
      if (qty > line.product.quantity) { showAlert('Out of stock', `Only ${line.product.quantity} left.`); return c; }
      return { ...c, [id]: { ...line, quantity: qty } };
    });
  };

  const record = async () => {
    if (lines.length === 0) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/v1/business/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lines.map((l) => ({ productId: l.product._id, quantity: l.quantity })),
          discount: Number(discount) || 0,
          paymentMethod: method,
          customerName: custName.trim() || undefined,
          customerPhone: custPhone.trim() || undefined,
          staffId: activeStaffId(),
        }),
      });
      if (res.ok && res.body?.success) {
        setCart({}); setDiscount(''); setCustName(''); setCustPhone(''); setCheckout(false);
        showAlert('Sale recorded', `₦${total.toLocaleString()} — stock updated.`);
        load();
      } else {
        showAlert('Error', res.body?.message || 'Could not record sale.');
      }
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;
  const rep = getActiveRep();

  const renderProduct = ({ item }: { item: Product }) => {
    const inCart = cart[item._id]?.quantity || 0;
    const out = item.quantity <= 0;
    return (
      <Pressable style={[styles.pRow, out && { opacity: 0.4 }]} onPress={() => !out && add(item)} disabled={out}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pName}>{item.name}</Text>
          <Text style={styles.pMeta}>₦{item.sellPrice.toLocaleString()} · {item.quantity} left</Text>
        </View>
        {inCart > 0 ? <View style={styles.inCart}><Text style={styles.inCartText}>{inCart}</Text></View> : <Text style={styles.addPlus}>＋</Text>}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.repHint}>Selling as {rep ? rep.name : 'Owner'}</Text>
      <TextInput style={styles.search} value={q} onChangeText={setQ} placeholder="Search products…" placeholderTextColor="#9CA3AF" />

      <FlatList
        data={filtered}
        keyExtractor={(i) => i._id}
        renderItem={renderProduct}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListEmptyComponent={<Text style={styles.empty}>No products. Add stock in Inventory first.</Text>}
      />

      {cartCount > 0 && (
        <View style={styles.cartBar}>
          <View>
            <Text style={styles.cartCount}>{cartCount} item{cartCount === 1 ? '' : 's'}</Text>
            <Text style={styles.cartTotal}>₦{subtotal.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={() => setCheckout(true)}><Text style={styles.checkoutText}>Review & Pay →</Text></TouchableOpacity>
        </View>
      )}

      <Modal visible={checkout} transparent animationType="slide" onRequestClose={() => setCheckout(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Sale</Text>
            <FlatList
              data={lines}
              keyExtractor={(l) => l.product._id}
              style={{ maxHeight: 220 }}
              renderItem={({ item: l }) => (
                <View style={styles.cartLine}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.clName}>{l.product.name}</Text>
                    <Text style={styles.clPrice}>₦{(l.product.sellPrice * l.quantity).toLocaleString()}</Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.step} onPress={() => setQty(l.product._id, l.quantity - 1)}><Text style={styles.stepText}>−</Text></TouchableOpacity>
                    <Text style={styles.stepQty}>{l.quantity}</Text>
                    <TouchableOpacity style={styles.step} onPress={() => setQty(l.product._id, l.quantity + 1)}><Text style={styles.stepText}>＋</Text></TouchableOpacity>
                  </View>
                </View>
              )}
            />

            <View style={styles.field}><Text style={styles.fieldLabel}>Discount (₦)</Text>
              <TextInput style={styles.input} value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />
            </View>

            <Text style={styles.fieldLabel}>Payment method</Text>
            <View style={styles.methods}>
              {METHODS.map((m) => (
                <TouchableOpacity key={m} style={[styles.methodChip, method === m && styles.methodOn]} onPress={() => setMethod(m)}>
                  <Text style={[styles.methodText, method === m && styles.methodTextOn]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.two}>
              <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Customer (optional)</Text>
                <TextInput style={styles.input} value={custName} onChangeText={setCustName} placeholder="Name" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={[styles.field, { flex: 1 }]}><Text style={styles.fieldLabel}>Phone</Text>
                <TextInput style={styles.input} value={custPhone} onChangeText={setCustPhone} keyboardType="phone-pad" placeholder="080…" placeholderTextColor="#9CA3AF" />
              </View>
            </View>

            <View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalVal}>₦{total.toLocaleString()}</Text></View>

            <TouchableOpacity style={styles.payBtn} onPress={record} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.payText}>Record Sale</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={() => setCheckout(false)}><Text style={styles.cancelText}>Back</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  repHint: { fontSize: 12, color: '#6366F1', fontWeight: '700', paddingHorizontal: 16, paddingTop: 10 },
  search: { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB' },

  pRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  pName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  pMeta: { fontSize: 12.5, color: '#6B7280', marginTop: 2 },
  addPlus: { fontSize: 26, color: '#4338CA', fontWeight: '400' },
  inCart: { backgroundColor: '#4338CA', minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inCartText: { color: '#fff', fontWeight: '900' },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 50, fontSize: 15, paddingHorizontal: 30 },

  cartBar: { position: 'absolute', left: 12, right: 12, bottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', borderRadius: 16, padding: 16 },
  cartCount: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  cartTotal: { color: '#fff', fontSize: 20, fontWeight: '900' },
  checkoutBtn: { backgroundColor: '#4338CA', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12 },
  checkoutText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 14 },
  cartLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  clName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  clPrice: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  step: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, fontWeight: '800', color: '#4338CA' },
  stepQty: { minWidth: 34, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#111827' },

  field: { marginTop: 12 },
  two: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  methodOn: { backgroundColor: '#4338CA' },
  methodText: { fontWeight: '700', color: '#6B7280', textTransform: 'capitalize' },
  methodTextOn: { color: '#fff' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  totalVal: { fontSize: 24, fontWeight: '900', color: '#111827' },
  payBtn: { backgroundColor: '#059669', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 14 },
  payText: { color: '#fff', fontWeight: '900', fontSize: 17 },
  cancel: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
});
