/**
 * ClinicalScreen.tsx — hospital-grade clinical records for clinics that do more
 * than out-patient visits. Three tabs:
 *   • Ward       — admit an animal, log daily care for days, then discharge
 *   • Surgery    — record a surgical procedure for a patient
 *   • Grooming   — record a grooming service for a patient
 * All calls go through businessFetch so a signed-in staff member's actions are
 * attributed to them automatically. Reachable from Practice Records.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import Dropdown from '../components/Dropdown';
import { SURGERY_TYPES, ANAESTHESIA_TYPES, SURGERY_OUTCOMES, GROOMING_SERVICES, PROCEDURE_CATEGORIES } from '../constants/clinicalOptions';

const ACCENT = '#0D9488';
type Tab = 'ward' | 'surgery' | 'grooming' | 'procedures';

interface Patient { _id: string; name: string; species?: string; breed?: string; }
interface Stay {
  _id: string; ward?: string; reason?: string; status: string; admittedAt: string; dischargedAt?: string;
  patient?: { _id: string; name: string; species?: string }; client?: { name?: string; phone?: string };
  dailyLogs?: any[]; createdByName?: string;
}

function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString() : ''; }
function mapOutcome(o: string): string {
  const k = (o || '').toLowerCase();
  if (k.startsWith('success')) return 'successful';
  if (k.startsWith('complication')) return 'complication';
  if (k.startsWith('deceased')) return 'deceased';
  return 'other';
}
function daysBetween(a?: string, b?: string) {
  if (!a) return 0;
  const end = b ? new Date(b) : new Date();
  return Math.max(1, Math.ceil((end.getTime() - new Date(a).getTime()) / 86400000));
}

export default function ClinicalScreen(_props: any) {
  const [tab, setTab] = useState<Tab>('ward');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [loading, setLoading] = useState(true);

  // shared patient picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<'admit' | 'surgery' | 'grooming' | 'procedure' | null>(null);
  const [selPatient, setSelPatient] = useState<Patient | null>(null);

  // modals
  const [admitOpen, setAdmitOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [surgeryOpen, setSurgeryOpen] = useState(false);
  const [groomOpen, setGroomOpen] = useState(false);
  const [procOpen, setProcOpen] = useState(false);
  const [activeStay, setActiveStay] = useState<Stay | null>(null);

  // form fields
  const [reason, setReason] = useState('');
  const [ward, setWard] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logTemp, setLogTemp] = useState('');
  const [logMed, setLogMed] = useState('');
  const [sxProc, setSxProc] = useState('');
  const [sxSurgeon, setSxSurgeon] = useState('');
  const [sxAnaes, setSxAnaes] = useState('');
  const [sxOutcome, setSxOutcome] = useState('Successful');
  const [sxNotes, setSxNotes] = useState('');
  const [grmService, setGrmService] = useState('');
  const [grmGroomer, setGrmGroomer] = useState('');
  const [grmPrice, setGrmPrice] = useState('');
  const [grmNotes, setGrmNotes] = useState('');
  const [prCategory, setPrCategory] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prBy, setPrBy] = useState('');
  const [prFindings, setPrFindings] = useState('');
  const [prCost, setPrCost] = useState('');
  const [busy, setBusy] = useState(false);

  const loadPatients = useCallback(async () => {
    const res = await businessFetch('/api/v1/practice/patients', { method: 'GET' });
    if (res.ok) setPatients(res.body?.data || []);
  }, []);

  const loadWard = useCallback(async () => {
    const res = await businessFetch('/api/v1/practice/hospitalizations?status=admitted', { method: 'GET' });
    if (res.ok) setStays(res.body?.data || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try { await Promise.all([loadPatients(), loadWard()]); }
    finally { setLoading(false); }
  }, [loadPatients, loadWard]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  // ── patient picker ──
  const openPicker = (forWhat: 'admit' | 'surgery' | 'grooming' | 'procedure') => { setPickerFor(forWhat); setPickerOpen(true); };
  const choosePatient = (pt: Patient) => {
    setSelPatient(pt);
    setPickerOpen(false);
    if (pickerFor === 'admit') { setReason(''); setWard(''); setAdmitOpen(true); }
    else if (pickerFor === 'surgery') { setSxProc(''); setSxSurgeon(''); setSxAnaes(''); setSxOutcome('Successful'); setSxNotes(''); setSurgeryOpen(true); }
    else if (pickerFor === 'grooming') { setGrmService(''); setGrmGroomer(''); setGrmPrice(''); setGrmNotes(''); setGroomOpen(true); }
    else if (pickerFor === 'procedure') { setPrCategory(''); setPrTitle(''); setPrBy(''); setPrFindings(''); setPrCost(''); setProcOpen(true); }
  };

  // ── actions ──
  const admit = async () => {
    if (!selPatient) return;
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/practice/patients/${selPatient._id}/hospitalizations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, ward }),
      });
      if (res.ok) { setAdmitOpen(false); showAlert('Admitted', `${selPatient.name} is now in the ward.`); loadWard(); }
      else showAlert('Could not admit', res.body?.message || 'Failed.');
    } finally { setBusy(false); }
  };

  const addLog = async () => {
    if (!activeStay) return;
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/practice/hospitalizations/${activeStay._id}/logs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: logNote, temperature: logTemp ? Number(logTemp) : undefined, medication: logMed }),
      });
      if (res.ok) { setLogOpen(false); setLogNote(''); setLogTemp(''); setLogMed(''); showAlert('Saved', 'Care log added.'); loadWard(); }
      else showAlert('Could not save', res.body?.message || 'Failed.');
    } finally { setBusy(false); }
  };

  const discharge = (stay: Stay) => {
    showAlert('Discharge', `Discharge ${stay.patient?.name || 'this patient'} from the ward?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discharge', style: 'destructive', onPress: async () => {
        const res = await businessFetch(`/api/v1/practice/hospitalizations/${stay._id}/discharge`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
        });
        if (res.ok) { showAlert('Discharged', 'The patient has been discharged.'); loadWard(); }
        else showAlert('Could not discharge', res.body?.message || 'Failed.');
      } },
    ]);
  };

  const saveSurgery = async () => {
    if (!selPatient || !sxProc.trim()) { showAlert('Procedure needed', 'Enter the procedure.'); return; }
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/practice/patients/${selPatient._id}/surgeries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedure: sxProc, surgeon: sxSurgeon, anaesthesia: sxAnaes, outcome: mapOutcome(sxOutcome), notes: sxNotes }),
      });
      if (res.ok) { setSurgeryOpen(false); showAlert('Saved', 'Surgery record saved.'); }
      else showAlert('Could not save', res.body?.message || 'Failed.');
    } finally { setBusy(false); }
  };

  const saveProcedure = async () => {
    if (!selPatient || !prCategory.trim()) { showAlert('Category needed', 'Pick a procedure category.'); return; }
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/practice/patients/${selPatient._id}/procedures`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: prCategory, title: prTitle, performedBy: prBy, findings: prFindings, cost: prCost ? Number(prCost) : undefined }),
      });
      if (res.ok) { setProcOpen(false); showAlert('Saved', 'Procedure record saved.'); }
      else showAlert('Could not save', res.body?.message || 'Failed.');
    } finally { setBusy(false); }
  };

  const saveGrooming = async () => {
    if (!selPatient || !grmService.trim()) { showAlert('Service needed', 'Enter the grooming service.'); return; }
    setBusy(true);
    try {
      const res = await businessFetch(`/api/v1/practice/patients/${selPatient._id}/grooming`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: grmService, groomer: grmGroomer, price: grmPrice ? Number(grmPrice) : undefined, notes: grmNotes }),
      });
      if (res.ok) { setGroomOpen(false); showAlert('Saved', 'Grooming record saved.'); }
      else showAlert('Could not save', res.body?.message || 'Failed.');
    } finally { setBusy(false); }
  };

  const TabBtn = ({ id, label }: { id: Tab; label: string }) => (
    <TouchableOpacity style={[styles.tabBtn, tab === id && styles.tabBtnOn]} onPress={() => setTab(id)}>
      <Text style={[styles.tabText, tab === id && styles.tabTextOn]}>{label}</Text>
    </TouchableOpacity>
  );

  const emptyPatients = patients.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TabBtn id="ward" label="🏥 Ward" />
        <TabBtn id="surgery" label="🔪 Surgery" />
        <TabBtn id="grooming" label="✂️ Groom" />
        <TabBtn id="procedures" label="🩻 Procedures" />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>
      ) : tab === 'ward' ? (
        <FlatList
          data={stays}
          keyExtractor={(s) => s._id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity style={styles.primaryBtn} onPress={() => openPicker('admit')} disabled={emptyPatients}>
              <Text style={styles.primaryBtnText}>+ Admit a patient to the ward</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<Text style={styles.empty}>{emptyPatients ? 'Add patients in Practice Records first, then admit them here.' : 'No patients are currently admitted.'}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{item.patient?.name || 'Patient'}{item.patient?.species ? ` · ${item.patient.species}` : ''}</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>Day {daysBetween(item.admittedAt)}</Text></View>
              </View>
              {!!item.ward && <Text style={styles.meta}>Ward/cage: {item.ward}</Text>}
              {!!item.reason && <Text style={styles.meta}>Reason: {item.reason}</Text>}
              <Text style={styles.meta}>Admitted {fmtDate(item.admittedAt)} · {item.dailyLogs?.length || 0} care log(s)</Text>
              {!!item.createdByName && <Text style={styles.metaFaint}>Admitted by {item.createdByName}</Text>}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.smallBtn} onPress={() => { setActiveStay(item); setLogOpen(true); }}>
                  <Text style={styles.smallBtnText}>+ Care log</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.smallBtn, styles.smallBtnDanger]} onPress={() => discharge(item)}>
                  <Text style={[styles.smallBtnText, { color: '#DC2626' }]}>Discharge</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.paneIntro}>
            {tab === 'surgery' ? 'Record a surgical procedure for a patient.'
              : tab === 'grooming' ? 'Record a grooming service for a patient.'
              : 'Record any clinical procedure — X-ray, ultrasound, dental, deworming, blood pressure and more.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => openPicker(tab === 'surgery' ? 'surgery' : tab === 'grooming' ? 'grooming' : 'procedure')}
            disabled={emptyPatients}
          >
            <Text style={styles.primaryBtnText}>+ {tab === 'surgery' ? 'New surgery record' : tab === 'grooming' ? 'New grooming record' : 'New procedure record'}</Text>
          </TouchableOpacity>
          {emptyPatients && <Text style={styles.empty}>Add patients in Practice Records first.</Text>}
        </ScrollView>
      )}

      {/* ── Patient picker ── */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Choose a patient</Text>
            <FlatList
              data={patients}
              keyExtractor={(p) => p._id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickRow} onPress={() => choosePatient(item)}>
                  <Text style={styles.pickName}>{item.name}</Text>
                  <Text style={styles.pickMeta}>{[item.species, item.breed].filter(Boolean).join(' · ')}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No patients yet.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Admit modal ── */}
      <FormModal visible={admitOpen} title={`Admit ${selPatient?.name || ''}`} onClose={() => setAdmitOpen(false)} onSubmit={admit} busy={busy} submitLabel="Admit">
        <Field label="Reason for admission" value={reason} onChange={setReason} placeholder="e.g. Parvo, post-op observation" />
        <Field label="Ward / cage / kennel no." value={ward} onChange={setWard} placeholder="e.g. Cage 3" />
      </FormModal>

      {/* ── Daily log modal ── */}
      <FormModal visible={logOpen} title="Daily care log" onClose={() => setLogOpen(false)} onSubmit={addLog} busy={busy} submitLabel="Add log">
        <Field label="Note / observations" value={logNote} onChange={setLogNote} placeholder="Ate well, IV fluids given…" multiline />
        <Field label="Temperature (°C)" value={logTemp} onChange={setLogTemp} placeholder="38.5" keyboardType="decimal-pad" />
        <Field label="Medication given" value={logMed} onChange={setLogMed} placeholder="e.g. Amoxicillin 250mg" />
      </FormModal>

      {/* ── Surgery modal ── */}
      <FormModal visible={surgeryOpen} title={`Surgery — ${selPatient?.name || ''}`} onClose={() => setSurgeryOpen(false)} onSubmit={saveSurgery} busy={busy} submitLabel="Save">
        <Dropdown label="Procedure *" value={sxProc} onChange={setSxProc} options={SURGERY_TYPES} placeholder="Pick a procedure" />
        <Field label="Surgeon" value={sxSurgeon} onChange={setSxSurgeon} placeholder="Dr. name" />
        <Dropdown label="Anaesthesia" value={sxAnaes} onChange={setSxAnaes} options={ANAESTHESIA_TYPES} placeholder="Pick anaesthesia" />
        <Dropdown label="Outcome" value={sxOutcome} onChange={setSxOutcome} options={SURGERY_OUTCOMES} placeholder="Outcome" allowFreeText={false} />
        <Field label="Notes / findings" value={sxNotes} onChange={setSxNotes} placeholder="Notes…" multiline />
      </FormModal>

      {/* ── Grooming modal ── */}
      <FormModal visible={groomOpen} title={`Grooming — ${selPatient?.name || ''}`} onClose={() => setGroomOpen(false)} onSubmit={saveGrooming} busy={busy} submitLabel="Save">
        <Dropdown label="Service *" value={grmService} onChange={setGrmService} options={GROOMING_SERVICES} placeholder="Pick a service" />
        <Field label="Groomer" value={grmGroomer} onChange={setGrmGroomer} placeholder="Staff name" />
        <Field label="Price" value={grmPrice} onChange={setGrmPrice} placeholder="0" keyboardType="decimal-pad" />
        <Field label="Notes" value={grmNotes} onChange={setGrmNotes} placeholder="Notes…" multiline />
      </FormModal>

      {/* ── Procedure modal (broad: imaging, dental, deworming, BP, etc.) ── */}
      <FormModal visible={procOpen} title={`Procedure — ${selPatient?.name || ''}`} onClose={() => setProcOpen(false)} onSubmit={saveProcedure} busy={busy} submitLabel="Save">
        <Dropdown label="Category *" value={prCategory} onChange={setPrCategory} options={PROCEDURE_CATEGORIES} placeholder="Pick what was done" />
        <Field label="Title / detail" value={prTitle} onChange={setPrTitle} placeholder="e.g. Left forelimb X-ray" />
        <Field label="Performed by" value={prBy} onChange={setPrBy} placeholder="Staff name" />
        <Field label="Findings / result" value={prFindings} onChange={setPrFindings} placeholder="Result / interpretation…" multiline />
        <Field label="Cost" value={prCost} onChange={setPrCost} placeholder="0" keyboardType="decimal-pad" />
      </FormModal>
    </View>
  );
}

// ── small building blocks ──
function Field({ label, value, onChange, placeholder, multiline, keyboardType }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { height: 78, textAlignVertical: 'top' }]}
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9CA3AF"
        multiline={multiline} keyboardType={keyboardType}
      />
    </View>
  );
}
function FormModal({ visible, title, onClose, onSubmit, busy, submitLabel, children }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{submitLabel}</Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  tabBtnOn: { backgroundColor: ACCENT },
  tabText: { fontWeight: '800', color: '#374151', fontSize: 13 },
  tabTextOn: { color: '#fff' },

  list: { padding: 16, paddingBottom: 60 },
  paneIntro: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 20, fontSize: 13, paddingHorizontal: 12 },

  primaryBtn: { backgroundColor: ACCENT, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: '#111827', flex: 1 },
  badge: { backgroundColor: '#CCFBF1', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#0F766E', fontWeight: '800', fontSize: 12 },
  meta: { fontSize: 13, color: '#4B5563', marginTop: 4 },
  metaFaint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  smallBtn: { flex: 1, borderWidth: 1, borderColor: ACCENT, borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  smallBtnDanger: { borderColor: '#FCA5A5' },
  smallBtnText: { color: ACCENT, fontWeight: '800', fontSize: 13 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  sheetTitle: { fontSize: 17, fontWeight: '900', color: '#111827', marginBottom: 14 },
  pickRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  pickMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
});
