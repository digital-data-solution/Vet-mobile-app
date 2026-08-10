/**
 * PracticeRecordsScreen.tsx
 *
 * Vet's "virtual clinic" dashboard: patient/plan status, what's due soon
 * (vaccinations + follow-ups across all patients), and the client list
 * (tap a client -> ClientDetailScreen -> patients -> PatientDetailScreen).
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';

interface Status {
  patientCount: number;
  freePatientLimit: number;
  atLimit: boolean;
  addonActive: boolean;
  daysRemaining: number;
  planLabel?: string;
  planTier?: string;
  maxPatients?: number | null;
}
interface DueItem { patient?: { name?: string }; vaccineName?: string; reason?: string; nextDueDate?: string; followUpDate?: string; }
interface Client { _id: string; name: string; phone?: string; email?: string; emailRemindersEnabled?: boolean; }

interface Props { navigation: any; }

const TEAL = '#0D9488';

export default function PracticeRecordsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus]         = useState<Status | null>(null);
  const [dueVaccinations, setDueVaccinations] = useState<DueItem[]>([]);
  const [dueFollowUps, setDueFollowUps]       = useState<DueItem[]>([]);
  const [clients, setClients]       = useState<Client[]>([]);
  const [search, setSearch]         = useState('');

  const [addOpen, setAddOpen]       = useState(false);
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [email, setEmail]           = useState('');
  const [address, setAddress]       = useState('');
  const [remindersOn, setRemindersOn] = useState(false);
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async (q?: string) => {
    try {
      const qs = q ? `?q=${encodeURIComponent(q)}` : '';
      const [statusRes, dueRes, clientsRes] = await Promise.all([
        businessFetch('/api/v1/practice/status', { method: 'GET' }),
        businessFetch('/api/v1/practice/due-soon', { method: 'GET' }),
        businessFetch(`/api/v1/practice/clients${qs}`, { method: 'GET' }),
      ]);
      if (statusRes.ok && statusRes.body?.data) setStatus(statusRes.body.data);
      else if (statusRes.status === 403) {
        showAlert('Not Available', statusRes.body?.message || t('practice.vetsOnly'));
        navigation.goBack();
        return;
      }
      if (dueRes.ok && dueRes.body?.data) {
        setDueVaccinations(dueRes.body.data.vaccinations || []);
        setDueFollowUps(dueRes.body.data.followUps || []);
      }
      if (clientsRes.ok && clientsRes.body?.data) setClients(clientsRes.body.data);
    } catch {
      showAlert('Error', 'Could not load Practice Records. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSearch = (text: string) => {
    setSearch(text);
    load(text);
  };

  const openAdd = () => {
    setName(''); setPhone(''); setEmail(''); setAddress(''); setRemindersOn(false);
    setAddOpen(true);
  };

  const submitAdd = async () => {
    if (!name.trim()) { showAlert('Name required', t('practice.nameRequired')); return; }
    if (remindersOn && !email.trim()) {
      showAlert('Email needed', t('practice.emailNeeded'));
      return;
    }
    setSaving(true);
    try {
      const res = await businessFetch('/api/v1/practice/clients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone, email, address, emailRemindersEnabled: remindersOn }),
      });
      if (res.ok && res.body?.success) {
        setAddOpen(false);
        await load(search);
      } else {
        showAlert('Error', res.body?.message || 'Could not add client.');
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={TEAL} /></View>;
  }

  const dueCount = dueVaccinations.length + dueFollowUps.length;

  return (
    <>
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(search); }} />}
      ListHeaderComponent={
        <>
          {/* Status */}
          <TouchableOpacity style={styles.statusCard} onPress={() => navigation.navigate('PracticeUpgrade')} activeOpacity={0.85}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>
                {status?.planLabel ? `${status.planLabel}: ` : ''}
                {status?.maxPatients == null && status?.addonActive
                  ? t('practice.unlimited')
                  : t('practice.patients', { count: status?.patientCount ?? 0, limit: status?.maxPatients ?? status?.freePatientLimit ?? 5 })}
              </Text>
              <Text style={styles.statusText}>
                {status?.addonActive
                  ? t('practice.daysRemaining', { count: status.daysRemaining })
                  : status?.atLimit ? t('practice.freeLimitReached') : t('practice.seePlans')}
              </Text>
            </View>
            <Text style={styles.statusArrow}>›</Text>
          </TouchableOpacity>

          {/* Hospital tools — wards, surgery, grooming, procedures */}
          <TouchableOpacity style={styles.clinicalCard} onPress={() => navigation.navigate('Clinical')} activeOpacity={0.85}>
            <Text style={styles.clinicalIcon}>🏥</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicalTitle}>Ward · Surgery · Grooming · Procedures</Text>
              <Text style={styles.clinicalText}>Admit patients, log daily care, record surgeries, grooming, X-rays & more</Text>
            </View>
            <Text style={styles.statusArrow}>›</Text>
          </TouchableOpacity>

          {/* Due soon */}
          {dueCount > 0 && (
            <View style={styles.dueCard}>
              <Text style={styles.dueTitle}>📋 {t('practice.dueSoon', { count: dueCount })}</Text>
              {dueVaccinations.slice(0, 5).map((v, i) => (
                <Text key={`v${i}`} style={styles.dueRow}>💉 {v.patient?.name || t('practice.patient')} — {v.vaccineName}</Text>
              ))}
              {dueFollowUps.slice(0, 5).map((f, i) => (
                <Text key={`f${i}`} style={styles.dueRow}>🔁 {f.patient?.name || t('practice.patient')} — {f.reason || t('practice.followUp')}</Text>
              ))}
            </View>
          )}

          {/* Clients header */}
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>{t('practice.clients')}</Text>
            <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
              <Text style={styles.addBtnText}>{t('practice.addClient')}</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.search} placeholder={t('practice.searchClients')} value={search} onChangeText={onSearch} />
        </>
      }
      data={clients}
      keyExtractor={(c) => c._id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.clientRow}
          onPress={() => navigation.navigate('ClientDetail', { clientId: item._id, client: item })}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{item.name}</Text>
            <Text style={styles.clientMeta}>{item.phone || item.email || t('practice.noContact')}</Text>
          </View>
          <Text style={styles.clientArrow}>›</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>{t('practice.noClients')}</Text>}
    />

    <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('practice.addClientTitle')}</Text>
          <TextInput style={styles.input} placeholder={t('practice.clientName')} value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder={t('common.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput style={styles.input} placeholder={t('common.email')} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder={t('practice.addressOpt')} value={address} onChangeText={setAddress} />

          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderLabel}>{t('practice.sendReminders')}</Text>
              <Text style={styles.reminderSub}>{t('practice.remindersConsent')}</Text>
            </View>
            <Switch value={remindersOn} onValueChange={setRemindersOn} trackColor={{ true: TEAL }} />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddOpen(false)}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} disabled={saving} onPress={submitAdd}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>{t('practice.addClientTitle')}</Text>}
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

  statusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDFA', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#99F6E4' },
  statusTitle: { fontSize: 16, fontWeight: '800', color: '#0F766E' },
  statusText:  { fontSize: 13, color: '#0F766E', marginTop: 3 },
  statusArrow: { fontSize: 26, color: TEAL, fontWeight: '900' },

  clinicalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFEFF', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#A5F3FC' },
  clinicalIcon: { fontSize: 24, marginRight: 12 },
  clinicalTitle: { fontSize: 15, fontWeight: '800', color: '#0E7490' },
  clinicalText: { fontSize: 12, color: '#0E7490', marginTop: 3 },

  dueCard: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#FCD34D' },
  dueTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 8 },
  dueRow: { fontSize: 13, color: '#92400E', marginBottom: 4 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  addBtn: { backgroundColor: TEAL, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  search: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 12, backgroundColor: '#fff' },

  clientRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EEF2F7' },
  clientName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  clientMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  clientArrow: { fontSize: 22, color: '#9CA3AF' },

  empty: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12, minHeight: 46 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginBottom: 8, gap: 10 },
  reminderLabel: { fontSize: 13, fontWeight: '700', color: '#111827' },
  reminderSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: '#374151', fontWeight: '700' },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', backgroundColor: TEAL },
  confirmBtnText: { color: '#fff', fontWeight: '800' },
});
