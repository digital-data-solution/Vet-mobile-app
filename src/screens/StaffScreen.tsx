/**
 * StaffScreen.tsx — manage sales reps. Add a rep with a name + PIN, reset a
 * PIN, deactivate. Reps are a paid feature (backend returns 402 with
 * STAFF_REQUIRES_UPGRADE on the free tier) — that gate is surfaced here.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';

interface Staff { _id: string; name: string; role: string; isActive: boolean; lastActiveAt?: string; }
interface Props { navigation: any; }

export default function StaffScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff]     = useState<Staff[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName]       = useState('');
  const [pin, setPin]         = useState('');
  const [role, setRole]       = useState<'rep' | 'manager'>('rep');
  const [saving, setSaving]   = useState(false);

  const [resetFor, setResetFor] = useState<Staff | null>(null);
  const [resetPin, setResetPin] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/v1/business/staff', { method: 'GET' });
      if (res.ok && res.body?.data) setStaff(res.body.data);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addStaff = async () => {
    if (!name.trim()) return showAlert('Name', 'Enter the rep\'s name.');
    if (!/^\d{4,6}$/.test(pin)) return showAlert('PIN', 'PIN must be 4–6 digits.');
    setSaving(true);
    try {
      const res = await apiFetch('/api/v1/business/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin, role }),
      });
      if (res.ok && res.body?.success) {
        setAddOpen(false); setName(''); setPin(''); setRole('rep'); load();
      } else if (res.status === 402) {
        setAddOpen(false);
        showAlert('Upgrade needed', res.body?.message || 'Sales reps need the Business Suite upgrade.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('BusinessUpgrade') },
        ]);
      } else {
        showAlert('Error', res.body?.message || 'Could not add rep.');
      }
    } finally { setSaving(false); }
  };

  const doReset = async () => {
    if (!resetFor || !/^\d{4,6}$/.test(resetPin)) return showAlert('PIN', 'PIN must be 4–6 digits.');
    const res = await apiFetch(`/api/v1/business/staff/${resetFor._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: resetPin }),
    });
    if (res.ok) { setResetFor(null); setResetPin(''); showAlert('Done', 'PIN updated.'); }
    else showAlert('Error', res.body?.message || 'Could not reset PIN.');
  };

  const toggleActive = (s: Staff) => {
    const action = s.isActive ? 'Deactivate' : 'Reactivate';
    showAlert(`${action} ${s.name}?`, s.isActive ? 'They will no longer be able to sign in.' : 'They can sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: action, onPress: async () => {
        const res = s.isActive
          ? await apiFetch(`/api/v1/business/staff/${s._id}`, { method: 'DELETE' })
          : await apiFetch(`/api/v1/business/staff/${s._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }) });
        if (res.ok) load();
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Give each rep their own PIN. Every sale and stock change they make is logged under their name — so you always know who did what.
      </Text>

      <FlatList
        data={staff}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={styles.empty}>No reps yet. Tap ＋ to add your first.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.isActive && { opacity: 0.5 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>👤 {item.name}</Text>
              <Text style={styles.meta}>{item.role}{item.isActive ? '' : ' · inactive'}{item.lastActiveAt ? ` · last active ${new Date(item.lastActiveAt).toLocaleDateString()}` : ''}</Text>
            </View>
            <TouchableOpacity style={styles.smallBtn} onPress={() => setResetFor(item)}><Text style={styles.smallBtnText}>PIN</Text></TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={() => toggleActive(item)}><Text style={styles.smallBtnText}>{item.isActive ? 'Off' : 'On'}</Text></TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setAddOpen(true)}><Text style={styles.fabText}>＋</Text></TouchableOpacity>

      {/* Add */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalWrap}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add Sales Rep</Text>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Amaka" placeholderTextColor="#9CA3AF" />
          <Text style={styles.fieldLabel}>PIN (4–6 digits)</Text>
          <TextInput style={styles.input} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="••••" placeholderTextColor="#9CA3AF" />
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={styles.roleRow}>
            {(['rep', 'manager'] as const).map((r) => (
              <TouchableOpacity key={r} style={[styles.roleChip, role === r && styles.roleOn]} onPress={() => setRole(r)}>
                <Text style={[styles.roleText, role === r && styles.roleTextOn]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={addStaff} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Rep</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => setAddOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Reset PIN */}
      <Modal visible={!!resetFor} transparent animationType="slide" onRequestClose={() => setResetFor(null)}>
        <View style={styles.modalWrap}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Reset PIN for {resetFor?.name}</Text>
          <TextInput style={styles.input} value={resetPin} onChangeText={setResetPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="New PIN" placeholderTextColor="#9CA3AF" autoFocus />
          <TouchableOpacity style={styles.saveBtn} onPress={doReset}><Text style={styles.saveBtnText}>Update PIN</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => { setResetFor(null); setResetPin(''); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  intro: { fontSize: 13, color: '#6B7280', lineHeight: 19, padding: 16, paddingBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  smallBtn: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: '#4338CA', fontWeight: '800', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 50, fontSize: 15 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4338CA', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  roleChip: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  roleOn: { backgroundColor: '#4338CA' },
  roleText: { fontWeight: '700', color: '#6B7280', textTransform: 'capitalize' },
  roleTextOn: { color: '#fff' },
  saveBtn: { backgroundColor: '#4338CA', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
});
