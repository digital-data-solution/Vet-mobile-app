/**
 * PatientDetailScreen.tsx
 *
 * A single patient: profile, treatment history, and vaccination schedule.
 * GET /api/v1/practice/patients/:id returns the patient plus both timelines
 * in one call, so this screen re-fetches everything after any mutation.
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch, uploadFile } from '../api/client';
import { showAlert } from '../utils/alert';

interface Treatment {
  _id: string; date: string; reason?: string; diagnosis?: string;
  treatment?: string; medications?: string; weightKg?: number; notes?: string; followUpDate?: string;
}
interface Vaccination {
  _id: string; vaccineName: string; dateGiven?: string; nextDueDate?: string; notes?: string;
}
interface LabResult {
  _id: string; testName: string; sampleType?: string; results?: string; referenceRange?: string;
  status?: string; performedAt?: string; technicianName?: string; attachmentUrl?: string; notes?: string;
}
interface Patient {
  _id: string; name: string; species?: string; breed?: string; sex?: string;
  dob?: string; weightKg?: number; color?: string; microchipId?: string; notes?: string;
  client?: { _id?: string; name?: string; phone?: string; email?: string };
  treatments: Treatment[]; vaccinations: Vaccination[]; labResults?: LabResult[];
}

// Stable, human-readable patient ID derived from the record id (no migration
// needed) — shown so staff reference the exact patient without confusion.
const patientCode = (id: string) => 'PT-' + String(id).slice(-6).toUpperCase();

const LAB_STATUSES = ['pending', 'normal', 'abnormal', 'inconclusive'] as const;
const statusColor: Record<string, string> = { normal: '#059669', abnormal: '#DC2626', inconclusive: '#D97706', pending: '#6B7280' };

interface Props { route: any; navigation: any; }

const TEAL = '#0D9488';
const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function PatientDetailScreen({ route, navigation }: Props) {
  const patientId: string = route?.params?.patientId;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [eName, setEName] = useState(''); const [eSpecies, setESpecies] = useState('');
  const [eBreed, setEBreed] = useState(''); const [eDob, setEDob] = useState('');
  const [eWeight, setEWeight] = useState(''); const [eColor, setEColor] = useState('');
  const [eMicrochip, setEMicrochip] = useState(''); const [eNotes, setENotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [txOpen, setTxOpen] = useState(false);
  const [txReason, setTxReason] = useState(''); const [txDiagnosis, setTxDiagnosis] = useState('');
  const [txTreatment, setTxTreatment] = useState(''); const [txMeds, setTxMeds] = useState('');
  const [txFollowUp, setTxFollowUp] = useState(''); const [txNotes, setTxNotes] = useState('');
  const [savingTx, setSavingTx] = useState(false);

  const [vxOpen, setVxOpen] = useState(false);
  const [vxName, setVxName] = useState(''); const [vxDate, setVxDate] = useState('');
  const [vxNextDue, setVxNextDue] = useState(''); const [vxNotes, setVxNotes] = useState('');
  const [savingVx, setSavingVx] = useState(false);

  const [lxOpen, setLxOpen] = useState(false);
  const [lxTest, setLxTest] = useState(''); const [lxSample, setLxSample] = useState('');
  const [lxResults, setLxResults] = useState(''); const [lxRef, setLxRef] = useState('');
  const [lxStatus, setLxStatus] = useState<typeof LAB_STATUSES[number]>('pending');
  const [lxTech, setLxTech] = useState(''); const [lxDate, setLxDate] = useState('');
  const [lxNotes, setLxNotes] = useState(''); const [lxAttachment, setLxAttachment] = useState('');
  const [lxUploading, setLxUploading] = useState(false); const [savingLx, setSavingLx] = useState(false);

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/practice/patients/${patientId}`, { method: 'GET' });
      if (res.ok && res.body?.data) setPatient(res.body.data);
      else showAlert('Error', res.body?.message || 'Could not load patient.');
    } catch {
      showAlert('Error', 'Could not load patient. Pull to refresh.');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useFocusEffect(useCallback(() => { fetchPatient(); }, [fetchPatient]));

  const openEdit = () => {
    if (!patient) return;
    setEName(patient.name); setESpecies(patient.species || ''); setEBreed(patient.breed || '');
    setEDob(patient.dob ? patient.dob.slice(0, 10) : ''); setEWeight(patient.weightKg?.toString() || '');
    setEColor(patient.color || ''); setEMicrochip(patient.microchipId || ''); setENotes(patient.notes || '');
    setEditOpen(true);
  };

  const submitEdit = async () => {
    if (!eName.trim()) { showAlert('Name required', 'Enter the patient\'s name.'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/v1/practice/patients/${patientId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: eName.trim(), species: eSpecies, breed: eBreed, dob: eDob || undefined,
          weightKg: eWeight ? parseFloat(eWeight) : undefined, color: eColor, microchipId: eMicrochip, notes: eNotes,
        }),
      });
      if (res.ok && res.body?.success) { setEditOpen(false); await fetchPatient(); }
      else showAlert('Error', res.body?.message || 'Could not update patient.');
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    showAlert(
      'Delete Patient?',
      `This removes ${patient?.name} and all their treatment/vaccination history. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ],
    );
  };

  const doDelete = async () => {
    try {
      const res = await apiFetch(`/api/v1/practice/patients/${patientId}`, { method: 'DELETE' });
      if (res.ok && res.body?.success) navigation.goBack();
      else showAlert('Error', res.body?.message || 'Could not delete patient.');
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    }
  };

  const openAddTx = () => {
    setTxReason(''); setTxDiagnosis(''); setTxTreatment(''); setTxMeds(''); setTxFollowUp(''); setTxNotes('');
    setTxOpen(true);
  };

  const submitTx = async () => {
    setSavingTx(true);
    try {
      const res = await apiFetch(`/api/v1/practice/patients/${patientId}/treatments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: txReason, diagnosis: txDiagnosis, treatment: txTreatment,
          medications: txMeds, followUpDate: txFollowUp || undefined, notes: txNotes,
        }),
      });
      if (res.ok && res.body?.success) { setTxOpen(false); await fetchPatient(); }
      else showAlert('Error', res.body?.message || 'Could not save treatment record.');
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setSavingTx(false);
    }
  };

  const openAddVx = () => {
    setVxName(''); setVxDate(''); setVxNextDue(''); setVxNotes('');
    setVxOpen(true);
  };

  const submitVx = async () => {
    if (!vxName.trim()) { showAlert('Vaccine name required', 'Enter which vaccine was given.'); return; }
    setSavingVx(true);
    try {
      const res = await apiFetch(`/api/v1/practice/patients/${patientId}/vaccinations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaccineName: vxName.trim(), dateGiven: vxDate || undefined, nextDueDate: vxNextDue || undefined, notes: vxNotes }),
      });
      if (res.ok && res.body?.success) { setVxOpen(false); await fetchPatient(); }
      else showAlert('Error', res.body?.message || 'Could not save vaccination record.');
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setSavingVx(false);
    }
  };

  const openAddLx = () => {
    setLxTest(''); setLxSample(''); setLxResults(''); setLxRef(''); setLxStatus('pending');
    setLxTech(''); setLxDate(''); setLxNotes(''); setLxAttachment('');
    setLxOpen(true);
  };

  const pickLxAttachment = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { showAlert('Permission needed', 'Allow photo access to attach a result.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    setLxUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const up = await uploadFile('/api/upload', uri, `lab-result.${ext}`, { folder: 'lab-results' }, 'image');
      if (up.ok && up.body?.url) setLxAttachment(up.body.url);
      else showAlert('Upload failed', up.userMessage || 'Could not upload the file.');
    } finally { setLxUploading(false); }
  };

  const submitLx = async () => {
    if (!lxTest.trim()) { showAlert('Test name required', 'Enter the test name (e.g. Complete Blood Count).'); return; }
    setSavingLx(true);
    try {
      const res = await apiFetch(`/api/v1/practice/patients/${patientId}/lab`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testName: lxTest.trim(), sampleType: lxSample, results: lxResults, referenceRange: lxRef,
          status: lxStatus, technicianName: lxTech, performedAt: lxDate || undefined,
          notes: lxNotes, attachmentUrl: lxAttachment || undefined,
        }),
      });
      if (res.ok && res.body?.success) { setLxOpen(false); await fetchPatient(); }
      else showAlert('Error', res.body?.message || 'Could not save lab result.');
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally { setSavingLx(false); }
  };

  const deleteLx = (id: string) => {
    showAlert('Delete result?', 'Remove this lab result?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await apiFetch(`/api/v1/practice/lab/${id}`, { method: 'DELETE' });
        if (res.ok && res.body?.success) await fetchPatient();
        else showAlert('Error', res.body?.message || 'Could not delete.');
      } },
    ]);
  };

  if (loading || !patient) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TEAL} /></View>;
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.patientName}>{patient.name}</Text>
          <TouchableOpacity onPress={openEdit}><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
        </View>
        <Text style={styles.patientId}>ID: {patientCode(patient._id)}</Text>
        {patient.client?.name ? <Text style={styles.infoLine}>👤 Owner: {patient.client.name}{patient.client.phone ? ` · ${patient.client.phone}` : ''}</Text> : null}
        <Text style={styles.infoLine}>{[patient.species, patient.breed, patient.sex].filter(Boolean).join(' · ') || 'No details yet'}</Text>
        {patient.dob ? <Text style={styles.infoLine}>🎂 Born {fmt(patient.dob)}</Text> : null}
        {patient.weightKg ? <Text style={styles.infoLine}>⚖️ {patient.weightKg} kg</Text> : null}
        {patient.color ? <Text style={styles.infoLine}>🎨 {patient.color}</Text> : null}
        {patient.microchipId ? <Text style={styles.infoLine}>🔖 Microchip: {patient.microchipId}</Text> : null}
        {patient.notes ? <Text style={styles.notes}>{patient.notes}</Text> : null}
        <TouchableOpacity onPress={confirmDelete}><Text style={styles.deleteLink}>Delete Patient</Text></TouchableOpacity>
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>💉 Vaccinations</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddVx}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>
      {patient.vaccinations.length === 0 ? (
        <Text style={styles.empty}>No vaccination records yet.</Text>
      ) : patient.vaccinations.map((v) => (
        <View key={v._id} style={styles.entryCard}>
          <Text style={styles.entryTitle}>{v.vaccineName}</Text>
          <Text style={styles.entryMeta}>Given {fmt(v.dateGiven)}{v.nextDueDate ? ` · Next due ${fmt(v.nextDueDate)}` : ''}</Text>
          {v.notes ? <Text style={styles.entryNotes}>{v.notes}</Text> : null}
        </View>
      ))}

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>📋 Treatment History</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddTx}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>
      {patient.treatments.length === 0 ? (
        <Text style={styles.empty}>No treatment records yet.</Text>
      ) : patient.treatments.map((t) => (
        <View key={t._id} style={styles.entryCard}>
          <Text style={styles.entryTitle}>{t.reason || 'Visit'} · {fmt(t.date)}</Text>
          {t.diagnosis ? <Text style={styles.entryMeta}>Diagnosis: {t.diagnosis}</Text> : null}
          {t.treatment ? <Text style={styles.entryMeta}>Treatment: {t.treatment}</Text> : null}
          {t.medications ? <Text style={styles.entryMeta}>Medications: {t.medications}</Text> : null}
          {t.followUpDate ? <Text style={styles.entryMeta}>🔁 Follow-up: {fmt(t.followUpDate)}</Text> : null}
          {t.notes ? <Text style={styles.entryNotes}>{t.notes}</Text> : null}
        </View>
      ))}

      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>🧪 Lab Results</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddLx}><Text style={styles.addBtnText}>+ Add</Text></TouchableOpacity>
      </View>
      {(!patient.labResults || patient.labResults.length === 0) ? (
        <Text style={styles.empty}>No lab results yet.</Text>
      ) : patient.labResults.map((l) => (
        <View key={l._id} style={styles.entryCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.entryTitle}>{l.testName}</Text>
            <Text style={[styles.statusPill, { color: statusColor[l.status || 'pending'], borderColor: statusColor[l.status || 'pending'] }]}>{(l.status || 'pending').toUpperCase()}</Text>
          </View>
          <Text style={styles.entryMeta}>{[l.sampleType, fmt(l.performedAt)].filter(Boolean).join(' · ')}{l.technicianName ? ` · ${l.technicianName}` : ''}</Text>
          {l.results ? <Text style={styles.entryMeta}>Results: {l.results}</Text> : null}
          {l.referenceRange ? <Text style={styles.entryMeta}>Reference: {l.referenceRange}</Text> : null}
          {l.notes ? <Text style={styles.entryNotes}>{l.notes}</Text> : null}
          <View style={styles.rowBetween}>
            {l.attachmentUrl ? <Text style={styles.attachLink} onPress={() => Linking.openURL(l.attachmentUrl!)}>📎 View attachment</Text> : <Text style={styles.entryNotes}>No file attached</Text>}
            <TouchableOpacity onPress={() => deleteLx(l._id)}><Text style={styles.deleteSmall}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>

    {/* Edit patient modal */}
    <Modal visible={editOpen} transparent animationType="slide" onRequestClose={() => setEditOpen(false)}>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit Patient</Text>
          <TextInput style={styles.input} placeholder="Patient name" value={eName} onChangeText={setEName} />
          <TextInput style={styles.input} placeholder="Species" value={eSpecies} onChangeText={setESpecies} />
          <TextInput style={styles.input} placeholder="Breed" value={eBreed} onChangeText={setEBreed} />
          <TextInput style={styles.input} placeholder="Date of birth (YYYY-MM-DD)" value={eDob} onChangeText={setEDob} />
          <TextInput style={styles.input} placeholder="Weight (kg)" keyboardType="numeric" value={eWeight} onChangeText={setEWeight} />
          <TextInput style={styles.input} placeholder="Color/markings" value={eColor} onChangeText={setEColor} />
          <TextInput style={styles.input} placeholder="Microchip ID" value={eMicrochip} onChangeText={setEMicrochip} />
          <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Notes" multiline value={eNotes} onChangeText={setENotes} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditOpen(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} disabled={saving} onPress={submitEdit}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>

    {/* Add treatment modal */}
    <Modal visible={txOpen} transparent animationType="slide" onRequestClose={() => setTxOpen(false)}>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Treatment Record</Text>
          <TextInput style={styles.input} placeholder="Reason for visit" value={txReason} onChangeText={setTxReason} />
          <TextInput style={styles.input} placeholder="Diagnosis" value={txDiagnosis} onChangeText={setTxDiagnosis} />
          <TextInput style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Treatment given" multiline value={txTreatment} onChangeText={setTxTreatment} />
          <TextInput style={styles.input} placeholder="Medications" value={txMeds} onChangeText={setTxMeds} />
          <TextInput style={styles.input} placeholder="Follow-up due (YYYY-MM-DD, optional)" value={txFollowUp} onChangeText={setTxFollowUp} />
          <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Notes" multiline value={txNotes} onChangeText={setTxNotes} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTxOpen(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} disabled={savingTx} onPress={submitTx}>
              {savingTx ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>

    {/* Add vaccination modal */}
    <Modal visible={vxOpen} transparent animationType="slide" onRequestClose={() => setVxOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Vaccination Record</Text>
          <TextInput style={styles.input} placeholder="Vaccine name" value={vxName} onChangeText={setVxName} />
          <TextInput style={styles.input} placeholder="Date given (YYYY-MM-DD)" value={vxDate} onChangeText={setVxDate} />
          <TextInput style={styles.input} placeholder="Next due date (YYYY-MM-DD, optional)" value={vxNextDue} onChangeText={setVxNextDue} />
          <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Notes" multiline value={vxNotes} onChangeText={setVxNotes} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setVxOpen(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} disabled={savingVx} onPress={submitVx}>
              {savingVx ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Add lab result modal */}
    <Modal visible={lxOpen} transparent animationType="slide" onRequestClose={() => setLxOpen(false)}>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Lab Result</Text>
          <TextInput style={styles.input} placeholder="Test name (e.g. Complete Blood Count)" value={lxTest} onChangeText={setLxTest} />
          <TextInput style={styles.input} placeholder="Sample type (e.g. Blood, Urine)" value={lxSample} onChangeText={setLxSample} />
          <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Results / findings" multiline value={lxResults} onChangeText={setLxResults} />
          <TextInput style={styles.input} placeholder="Reference range (optional)" value={lxRef} onChangeText={setLxRef} />

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.statusRow}>
            {LAB_STATUSES.map((s) => (
              <TouchableOpacity key={s} style={[styles.statusChip, lxStatus === s && { backgroundColor: statusColor[s], borderColor: statusColor[s] }]} onPress={() => setLxStatus(s)}>
                <Text style={[styles.statusChipText, lxStatus === s && { color: '#fff' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} placeholder="Uploaded by (technician name)" value={lxTech} onChangeText={setLxTech} />
          <TextInput style={styles.input} placeholder="Date performed (YYYY-MM-DD, optional)" value={lxDate} onChangeText={setLxDate} />
          <TextInput style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Notes" multiline value={lxNotes} onChangeText={setLxNotes} />

          <TouchableOpacity style={styles.attachBtn} onPress={pickLxAttachment} disabled={lxUploading}>
            {lxUploading ? <ActivityIndicator color={TEAL} /> : <Text style={styles.attachBtnText}>{lxAttachment ? '✓ Photo attached — change' : '📎 Attach result photo'}</Text>}
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLxOpen(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} disabled={savingLx} onPress={submitLx}>
              {savingLx ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  editLink: { color: TEAL, fontWeight: '700', fontSize: 14 },
  infoLine: { fontSize: 14, color: '#374151', marginBottom: 4 },
  notes: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 8, fontStyle: 'italic' },
  deleteLink: { color: '#B91C1C', fontWeight: '700', fontSize: 13, marginTop: 6 },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 6 },
  addBtn: { backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  entryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#EEF2F7' },
  entryTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  entryMeta: { fontSize: 13, color: '#374151', marginTop: 3 },
  entryNotes: { fontSize: 12, color: '#6B7280', marginTop: 4, fontStyle: 'italic' },

  empty: { color: '#9CA3AF', fontSize: 13, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, minHeight: 46 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 20 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#374151', fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: TEAL },
  confirmBtnText: { color: '#fff', fontWeight: '800' },

  patientId: { fontSize: 12, fontWeight: '800', color: TEAL, backgroundColor: '#F0FDFA', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  statusPill: { fontSize: 10, fontWeight: '900', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  attachLink: { color: TEAL, fontWeight: '700', fontSize: 13, marginTop: 6 },
  deleteSmall: { color: '#B91C1C', fontWeight: '700', fontSize: 12, marginTop: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusChip: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  statusChipText: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'capitalize' },
  attachBtn: { borderWidth: 1, borderColor: TEAL, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 12 },
  attachBtnText: { color: TEAL, fontWeight: '800' },
});
