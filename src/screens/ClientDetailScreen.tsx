/**
 * ClientDetailScreen.tsx
 *
 * A vet's client (pet owner): contact info, the reminder-emails opt-in
 * toggle (vet-controlled, off by default — see practice_records memory),
 * and the list of their patients.
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';

interface Client {
  _id: string; name: string; phone?: string; email?: string; address?: string;
  notes?: string; emailRemindersEnabled?: boolean;
}
interface Patient { _id: string; name: string; species?: string; breed?: string; }

interface Props { route: any; navigation: any; }

const TEAL = '#0D9488';

export default function ClientDetailScreen({ route, navigation }: Props) {
  const clientId: string = route?.params?.clientId;
  const [client, setClient] = useState<Client | null>(route?.params?.client ?? null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [eName, setEName] = useState('');
  const [ePhone, setEPhone] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [eAddress, setEAddress] = useState('');
  const [eNotes, setENotes] = useState('');
  const [eReminders, setEReminders] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [pName, setPName] = useState('');
  const [pSpecies, setPSpecies] = useState('');
  const [pBreed, setPBreed] = useState('');
  const [pSex, setPSex] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [pDob, setPDob] = useState('');
  const [pWeight, setPWeight] = useState('');
  const [addingPatient, setAddingPatient] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/practice/patients?clientId=${clientId}`, { method: 'GET' });
      if (res.ok && res.body?.data) setPatients(res.body.data);
    } catch {
      showAlert('Error', 'Could not load patients. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(useCallback(() => { fetchPatients(); }, [fetchPatients]));

  const openEdit = () => {
    if (!client) return;
    setEName(client.name); setEPhone(client.phone || ''); setEEmail(client.email || '');
    setEAddress(client.address || ''); setENotes(client.notes || '');
    setEReminders(!!client.emailRemindersEnabled);
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!eName.trim()) { showAlert('Name required', 'Enter the client\'s name.'); return; }
    if (eReminders && !eEmail.trim()) { showAlert('Email needed', 'Add an email address to enable reminders.'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/v1/practice/clients/${clientId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: eName.trim(), phone: ePhone, email: eEmail, address: eAddress, notes: eNotes, emailRemindersEnabled: eReminders }),
      });
      if (res.ok && res.body?.success) {
        setClient(res.body.data);
        setEditOpen(false);
      } else {
        showAlert('Error', res.body?.message || 'Could not update client.');
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    showAlert(
      'Delete Client?',
      `Remove ${client?.name}? You'll need to delete their patients first if they have any on file.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ],
    );
  };

  const doDelete = async () => {
    try {
      const res = await apiFetch(`/api/v1/practice/clients/${clientId}`, { method: 'DELETE' });
      if (res.ok && res.body?.success) {
        navigation.goBack();
      } else {
        showAlert('Error', res.body?.message || 'Could not delete client.');
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    }
  };

  const openAddPatient = () => {
    setPName(''); setPSpecies(''); setPBreed(''); setPSex('unknown'); setPDob(''); setPWeight('');
    setAddOpen(true);
  };

  const submitAddPatient = async () => {
    if (!pName.trim()) { showAlert('Name required', 'Enter the patient\'s name.'); return; }
    setAddingPatient(true);
    try {
      const res = await apiFetch('/api/v1/practice/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId, name: pName.trim(), species: pSpecies, breed: pBreed, sex: pSex,
          dob: pDob || undefined, weightKg: pWeight ? parseFloat(pWeight) : undefined,
        }),
      });
      if (res.ok && res.body?.success) {
        setAddOpen(false);
        await fetchPatients();
      } else if (res.status === 402) {
        setAddOpen(false);
        showAlert(
          'Free Limit Reached',
          res.body?.message || 'Upgrade Practice Records to add more patients.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('PracticeUpgrade') },
          ],
        );
      } else {
        showAlert('Error', res.body?.message || 'Could not add patient.');
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setAddingPatient(false);
    }
  };

  if (!client) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TEAL} /></View>;
  }

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.clientName}>{client.name}</Text>
              <TouchableOpacity onPress={openEdit}><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
            </View>
            {client.phone ? <Text style={styles.infoLine}>📞 {client.phone}</Text> : null}
            {client.email ? <Text style={styles.infoLine}>✉️ {client.email}</Text> : null}
            {client.address ? <Text style={styles.infoLine}>📍 {client.address}</Text> : null}
            {client.notes ? <Text style={styles.notes}>{client.notes}</Text> : null}
            <View style={styles.reminderBadge}>
              <Text style={styles.reminderBadgeText}>
                {client.emailRemindersEnabled ? '🔔 Reminder emails ON for this client' : '🔕 Reminder emails OFF for this client'}
              </Text>
            </View>
            <TouchableOpacity onPress={confirmDelete}><Text style={styles.deleteLink}>Delete Client</Text></TouchableOpacity>
          </View>

          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Patients</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAddPatient}>
              <Text style={styles.addBtnText}>+ Add Patient</Text>
            </TouchableOpacity>
          </View>
          {loading && <ActivityIndicator color={TEAL} style={{ marginVertical: 12 }} />}
        </>
      }
      data={patients}
      keyExtractor={(p) => p._id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.patientRow}
          onPress={() => navigation.navigate('PatientDetail', { patientId: item._id })}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.name}</Text>
            <Text style={styles.patientMeta}>{[item.species, item.breed].filter(Boolean).join(' · ') || 'No details yet'}</Text>
          </View>
          <Text style={styles.patientArrow}>›</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={!loading ? <Text style={styles.empty}>No patients yet for this client.</Text> : null}
    />

    {/* Edit client modal */}
    <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Client</Text>
          <TextInput style={styles.input} placeholder="Client name" value={eName} onChangeText={setEName} />
          <TextInput style={styles.input} placeholder="Phone" keyboardType="phone-pad" value={ePhone} onChangeText={setEPhone} />
          <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={eEmail} onChangeText={setEEmail} />
          <TextInput style={styles.input} placeholder="Address" value={eAddress} onChangeText={setEAddress} />
          <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Notes" multiline value={eNotes} onChangeText={setENotes} />
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderLabel}>Send this client reminder emails?</Text>
              <Text style={styles.reminderSub}>Only if you have their consent.</Text>
            </View>
            <Switch value={eReminders} onValueChange={setEReminders} trackColor={{ true: TEAL }} />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} disabled={saving} onPress={submitEdit}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Add patient modal */}
    <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add Patient</Text>
          <TextInput style={styles.input} placeholder="Patient name" value={pName} onChangeText={setPName} />
          <TextInput style={styles.input} placeholder="Species (e.g. Dog, Cat)" value={pSpecies} onChangeText={setPSpecies} />
          <TextInput style={styles.input} placeholder="Breed" value={pBreed} onChangeText={setPBreed} />
          <View style={styles.sexRow}>
            {(['male', 'female', 'unknown'] as const).map((s) => (
              <TouchableOpacity key={s} style={[styles.sexChip, pSex === s && styles.sexChipActive]} onPress={() => setPSex(s)}>
                <Text style={[styles.sexChipText, pSex === s && styles.sexChipTextActive]}>{s === 'unknown' ? 'Unknown' : s[0].toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Date of birth (YYYY-MM-DD, optional)" value={pDob} onChangeText={setPDob} />
          <TextInput style={styles.input} placeholder="Weight (kg, optional)" keyboardType="numeric" value={pWeight} onChangeText={setPWeight} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} disabled={addingPatient} onPress={submitAddPatient}>
              {addingPatient ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Add Patient</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  clientName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  editLink: { color: TEAL, fontWeight: '700', fontSize: 14 },
  infoLine: { fontSize: 14, color: '#374151', marginBottom: 4 },
  notes: { fontSize: 13, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
  reminderBadge: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginTop: 10, marginBottom: 10 },
  reminderBadgeText: { fontSize: 12, fontWeight: '700', color: '#374151' },
  deleteLink: { color: '#B91C1C', fontWeight: '700', fontSize: 13 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: TEAL, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  patientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EEF2F7' },
  patientName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  patientMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  patientArrow: { fontSize: 22, color: '#9CA3AF' },

  empty: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '88%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, minHeight: 46 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  reminderLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  reminderSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  sexRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sexChip: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#F3F4F6' },
  sexChipActive: { backgroundColor: TEAL },
  sexChipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  sexChipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#374151', fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: TEAL },
  confirmBtnText: { color: '#fff', fontWeight: '800' },
});
