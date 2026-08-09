/**
 * StaffScreen.tsx — owner manages staff. Each staff can have a shared-device PIN
 * (for the PIN switcher) AND an individual username + password login for their
 * own phone, plus per-feature permissions. Reps are a paid feature (backend
 * returns 402 with STAFF_REQUIRES_UPGRADE on the free tier) — that gate is
 * surfaced here. A seats summary at the top links to seat purchase.
 */
import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import type { StaffPermissions } from '../utils/businessSession';

interface Staff {
  _id: string; name: string; role: string; isActive: boolean; lastActiveAt?: string;
  username?: string; permissions?: StaffPermissions;
}
interface SeatInfo { includedSeats: number; seatsPaid: number; staffCount: number; perSeatPrice: number; }
interface Props { navigation: any; }

const PERMISSIONS: { key: keyof StaffPermissions; label: string }[] = [
  { key: 'sell',            label: 'Record sales' },
  { key: 'viewReports',     label: 'View sales & reports' },
  { key: 'manageInventory', label: 'Manage inventory' },
  { key: 'adjustStock',     label: 'Adjust stock' },
  { key: 'manageStaff',     label: 'Manage staff' },
  { key: 'dispense',        label: 'Dispense items' },
  // Practice Records / hospital-flow roles
  { key: 'reception',       label: 'Reception — register clients & patients' },
  { key: 'clinical',        label: 'Clinical — treatments & vaccinations (vet)' },
  { key: 'lab',             label: 'Lab — upload lab results' },
];

const DEFAULT_PERMS: StaffPermissions = {
  sell: true, viewReports: false, manageInventory: false, adjustStock: false, manageStaff: false, dispense: false,
  reception: false, clinical: false, lab: false,
};

function PermissionToggles({ value, onChange }: { value: StaffPermissions; onChange: (v: StaffPermissions) => void }) {
  return (
    <View style={styles.permWrap}>
      {PERMISSIONS.map((p) => {
        const on = !!value[p.key];
        return (
          <TouchableOpacity key={p.key} style={styles.permRow} onPress={() => onChange({ ...value, [p.key]: !on })}>
            <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Text style={styles.checkboxTick}>✓</Text>}</View>
            <Text style={styles.permLabel}>{p.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function StaffScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff]     = useState<Staff[]>([]);
  const [seats, setSeats]     = useState<SeatInfo | null>(null);

  // Add
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin]         = useState('');
  const [role, setRole]       = useState<'rep' | 'manager'>('rep');
  const [addPerms, setAddPerms] = useState<StaffPermissions>(DEFAULT_PERMS);
  const [saving, setSaving]   = useState(false);

  // Reset PIN
  const [resetFor, setResetFor] = useState<Staff | null>(null);
  const [resetPin, setResetPin] = useState('');

  // Reset password
  const [pwFor, setPwFor]     = useState<Staff | null>(null);
  const [newPw, setNewPw]     = useState('');

  // Edit (username + permissions)
  const [editFor, setEditFor]     = useState<Staff | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPerms, setEditPerms] = useState<StaffPermissions>(DEFAULT_PERMS);

  const load = useCallback(async () => {
    try {
      const [staffRes, statusRes] = await Promise.all([
        businessFetch('/api/v1/business/staff', { method: 'GET' }),
        businessFetch('/api/v1/business/status', { method: 'GET' }),
      ]);
      if (staffRes.ok && staffRes.body?.data) setStaff(staffRes.body.data);
      if (statusRes.ok && statusRes.body?.data) {
        const d = statusRes.body.data;
        if (typeof d.includedSeats === 'number') {
          setSeats({
            includedSeats: d.includedSeats, seatsPaid: d.seatsPaid ?? 0,
            staffCount: d.staffCount ?? 0, perSeatPrice: d.perSeatPrice ?? 0,
          });
        }
      }
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addStaff = async () => {
    if (!name.trim()) return showAlert('Name', 'Enter the staff member\'s name.');
    if (pin && !/^\d{4,6}$/.test(pin)) return showAlert('PIN', 'PIN must be 4–6 digits (or leave blank).');
    if (username.trim() && password.length < 6) return showAlert('Password', 'Password must be at least 6 characters.');
    setSaving(true);
    try {
      const res = await businessFetch('/api/v1/business/staff', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), role,
          ...(pin ? { pin } : {}),
          ...(username.trim() ? { username: username.trim(), password } : {}),
          permissions: addPerms,
        }),
      });
      if (res.ok && res.body?.success) {
        setAddOpen(false);
        setName(''); setUsername(''); setPassword(''); setPin(''); setRole('rep'); setAddPerms(DEFAULT_PERMS);
        load();
      } else if (res.status === 402) {
        setAddOpen(false);
        showAlert('Upgrade needed', res.body?.message || 'Staff logins need the Business Suite upgrade.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('BusinessUpgrade') },
        ]);
      } else {
        showAlert('Error', res.body?.message || 'Could not add staff.');
      }
    } finally { setSaving(false); }
  };

  const doResetPin = async () => {
    if (!resetFor || !/^\d{4,6}$/.test(resetPin)) return showAlert('PIN', 'PIN must be 4–6 digits.');
    const res = await businessFetch(`/api/v1/business/staff/${resetFor._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: resetPin }),
    });
    if (res.ok) { setResetFor(null); setResetPin(''); showAlert('Done', 'PIN updated.'); }
    else showAlert('Error', res.body?.message || 'Could not reset PIN.');
  };

  const doResetPassword = async () => {
    if (!pwFor || newPw.length < 6) return showAlert('Password', 'Password must be at least 6 characters.');
    const res = await businessFetch(`/api/v1/business/staff/${pwFor._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw }),
    });
    if (res.ok) { setPwFor(null); setNewPw(''); showAlert('Done', 'Password updated.'); }
    else showAlert('Error', res.body?.message || 'Could not reset password.');
  };

  const openEdit = (s: Staff) => {
    setEditFor(s);
    setEditUsername(s.username || '');
    setEditPerms({ ...DEFAULT_PERMS, ...(s.permissions || {}) });
  };

  const doEdit = async () => {
    if (!editFor) return;
    const res = await businessFetch(`/api/v1/business/staff/${editFor._id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(editUsername.trim() ? { username: editUsername.trim() } : {}),
        permissions: editPerms,
      }),
    });
    if (res.ok) { setEditFor(null); load(); showAlert('Done', 'Staff updated.'); }
    else showAlert('Error', res.body?.message || 'Could not update staff.');
  };

  const toggleActive = (s: Staff) => {
    const action = s.isActive ? 'Deactivate' : 'Reactivate';
    showAlert(`${action} ${s.name}?`, s.isActive ? 'They will no longer be able to sign in.' : 'They can sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: action, onPress: async () => {
        const res = s.isActive
          ? await businessFetch(`/api/v1/business/staff/${s._id}`, { method: 'DELETE' })
          : await businessFetch(`/api/v1/business/staff/${s._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: true }) });
        if (res.ok) load();
      } },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;

  return (
    <View style={styles.container}>
      {seats && (
        <View style={styles.seatBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.seatLabel}>Seats</Text>
            <Text style={styles.seatValue}>{seats.staffCount} of {seats.includedSeats + seats.seatsPaid} used</Text>
          </View>
          <TouchableOpacity style={styles.seatBtn} onPress={() => navigation.navigate('BusinessUpgrade', { seats: true })}>
            <Text style={styles.seatBtnText}>Add seats</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.intro}>
        Give each staff member a PIN for the shared till, or a username + password so they can sign in on their own phone. Toggle exactly what each can do.
      </Text>

      <FlatList
        data={staff}
        keyExtractor={(i) => i._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        ListEmptyComponent={<Text style={styles.empty}>No staff yet. Tap ＋ to add your first.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.isActive && { opacity: 0.5 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>👤 {item.name}</Text>
              <Text style={styles.meta}>
                {item.role}{item.username ? ` · @${item.username}` : ' · no login'}{item.isActive ? '' : ' · inactive'}
              </Text>
            </View>
            <View style={styles.rowBtns}>
              <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => setResetFor(item)}><Text style={styles.smallBtnText}>PIN</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => setPwFor(item)}><Text style={styles.smallBtnText}>PW</Text></TouchableOpacity>
              <TouchableOpacity style={styles.smallBtn} onPress={() => toggleActive(item)}><Text style={styles.smallBtnText}>{item.isActive ? 'Off' : 'On'}</Text></TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setAddOpen(true)}><Text style={styles.fabText}>＋</Text></TouchableOpacity>

      {/* Add */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalWrap}><View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Add Staff</Text>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Amaka" placeholderTextColor="#9CA3AF" />

            <Text style={styles.fieldLabel}>Shared-till PIN (4–6 digits, optional)</Text>
            <TextInput style={styles.input} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="••••" placeholderTextColor="#9CA3AF" />

            <Text style={styles.fieldLabel}>Username (for own-phone login, optional)</Text>
            <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="e.g. amaka" placeholderTextColor="#9CA3AF" />
            <Text style={styles.fieldLabel}>Password (min 6 chars)</Text>
            <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Set a password" placeholderTextColor="#9CA3AF" />

            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              {(['rep', 'manager'] as const).map((r) => (
                <TouchableOpacity key={r} style={[styles.roleChip, role === r && styles.roleOn]} onPress={() => setRole(r)}>
                  <Text style={[styles.roleText, role === r && styles.roleTextOn]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Permissions</Text>
            <PermissionToggles value={addPerms} onChange={setAddPerms} />

            <TouchableOpacity style={styles.saveBtn} onPress={addStaff} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Add Staff</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={() => setAddOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>

      {/* Edit username + permissions */}
      <Modal visible={!!editFor} transparent animationType="slide" onRequestClose={() => setEditFor(null)}>
        <View style={styles.modalWrap}><View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalTitle}>Edit {editFor?.name}</Text>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput style={styles.input} value={editUsername} onChangeText={setEditUsername} autoCapitalize="none" autoCorrect={false} placeholder="Username" placeholderTextColor="#9CA3AF" />
            <Text style={styles.fieldLabel}>Permissions</Text>
            <PermissionToggles value={editPerms} onChange={setEditPerms} />
            <TouchableOpacity style={styles.saveBtn} onPress={doEdit}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={() => setEditFor(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View></View>
      </Modal>

      {/* Reset PIN */}
      <Modal visible={!!resetFor} transparent animationType="slide" onRequestClose={() => setResetFor(null)}>
        <View style={styles.modalWrap}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Reset PIN for {resetFor?.name}</Text>
          <TextInput style={styles.input} value={resetPin} onChangeText={setResetPin} keyboardType="number-pad" secureTextEntry maxLength={6} placeholder="New PIN" placeholderTextColor="#9CA3AF" autoFocus />
          <TouchableOpacity style={styles.saveBtn} onPress={doResetPin}><Text style={styles.saveBtnText}>Update PIN</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => { setResetFor(null); setResetPin(''); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      {/* Reset password */}
      <Modal visible={!!pwFor} transparent animationType="slide" onRequestClose={() => setPwFor(null)}>
        <View style={styles.modalWrap}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Reset password for {pwFor?.name}</Text>
          <TextInput style={styles.input} value={newPw} onChangeText={setNewPw} secureTextEntry placeholder="New password (min 6 chars)" placeholderTextColor="#9CA3AF" autoFocus />
          <TouchableOpacity style={styles.saveBtn} onPress={doResetPassword}><Text style={styles.saveBtnText}>Update Password</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={() => { setPwFor(null); setNewPw(''); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  intro: { fontSize: 13, color: '#6B7280', lineHeight: 19, padding: 16, paddingBottom: 0 },

  seatBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', margin: 16, marginBottom: 0, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#C7D2FE' },
  seatLabel: { fontSize: 11, color: '#6366F1', fontWeight: '700', textTransform: 'uppercase' },
  seatValue: { fontSize: 16, fontWeight: '900', color: '#3730A3', marginTop: 2 },
  seatBtn: { backgroundColor: '#4338CA', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  seatBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  rowBtns: { flexDirection: 'row', gap: 6 },
  name: { fontSize: 16, fontWeight: '800', color: '#111827' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  smallBtn: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnText: { color: '#4338CA', fontWeight: '800', fontSize: 13 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 50, fontSize: 15 },
  fab: { position: 'absolute', right: 20, bottom: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#4338CA', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -2 },

  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 34, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  roleChip: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  roleOn: { backgroundColor: '#4338CA' },
  roleText: { fontWeight: '700', color: '#6B7280', textTransform: 'capitalize' },
  roleTextOn: { color: '#fff' },

  permWrap: { marginTop: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: '#C7D2FE', alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#fff' },
  checkboxOn: { backgroundColor: '#4338CA', borderColor: '#4338CA' },
  checkboxTick: { color: '#fff', fontWeight: '900', fontSize: 14 },
  permLabel: { fontSize: 15, color: '#111827', fontWeight: '600' },

  saveBtn: { backgroundColor: '#4338CA', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 14 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { color: '#6B7280', fontWeight: '700' },
});
