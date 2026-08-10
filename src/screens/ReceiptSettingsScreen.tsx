/**
 * ReceiptSettingsScreen.tsx — the business's complete self-service Settings hub.
 * The owner makes the app *theirs*, with no platform admin needed:
 *   • VIP profile-completion progress bar (what's done / what's left)
 *   • Identity: logo, name, address, phone, email, country, website
 *   • Receipt: footer note + number prefix
 *   • Tax (they own it): enable, name (VAT/Zakat/GST…), rate, tax number,
 *     inclusive/exclusive — with country quick-fills and a legal disclaimer
 *   • Currency, language, timezone
 *   • Which modules their account can use (read-only, provisioned by us)
 *   • Security: set/change an owner PIN, and change their login password
 * Owner-only.
 */
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { businessFetch, uploadFile } from '../api/client';
import { supabase } from '../api/supabase';
import { showAlert } from '../utils/alert';
import { CURRENCIES, setCurrencySymbol, symbolForCode } from '../utils/money';
import { LANGUAGES, setLanguage } from '../i18n';

interface Tax { enabled?: boolean; name?: string; rate?: number; number?: string | null; inclusive?: boolean; }
interface Profile {
  headerName?: string; logoUrl?: string; addressLine?: string;
  phone?: string; email?: string; footerNote?: string; receiptPrefix?: string;
  currency?: string; currencySymbol?: string; locale?: string; tzOffsetMinutes?: number;
  city?: string; country?: string; website?: string; tax?: Tax;
}
interface Step { key: string; label: string; done: boolean; }
interface Props { navigation: any; }

const ACCENT = '#4338CA';

const TIMEZONES = [
  { label: 'Nigeria / WAT (UTC+1)', min: 60 },
  { label: 'Saudi / Gulf (UTC+3)', min: 180 },
  { label: 'UK / GMT (UTC+0)', min: 0 },
  { label: 'Central Europe (UTC+1)', min: 60 },
  { label: 'East Africa (UTC+3)', min: 180 },
  { label: 'India (UTC+5:30)', min: 330 },
  { label: 'UAE (UTC+4)', min: 240 },
  { label: 'China (UTC+8)', min: 480 },
];

// Common country tax quick-fills. The business can override anything — these are
// just helpful starting points so they don't hunt for the number.
const TAX_PRESETS = [
  { country: 'Saudi Arabia', name: 'VAT', rate: 15 },
  { country: 'United Arab Emirates', name: 'VAT', rate: 5 },
  { country: 'Nigeria', name: 'VAT', rate: 7.5 },
  { country: 'Egypt', name: 'VAT', rate: 14 },
  { country: 'Kenya', name: 'VAT', rate: 16 },
  { country: 'South Africa', name: 'VAT', rate: 15 },
  { country: 'United Kingdom', name: 'VAT', rate: 20 },
  { country: 'None / 0%', name: 'VAT', rate: 0 },
];

export default function ReceiptSettingsScreen(_props: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [p, setP] = useState<Profile>({ currency: 'NGN', currencySymbol: '₦', locale: 'en', tzOffsetMinutes: 60, tax: {} });

  const [completion, setCompletion] = useState<{ percent: number; steps: Step[] }>({ percent: 0, steps: [] });
  const [modules, setModules] = useState<{ key: string; label: string; description: string }[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [provisioned, setProvisioned] = useState(false);
  const [ownerPinSet, setOwnerPinSet] = useState(false);
  const [customPricing, setCustomPricing] = useState<any>(null);

  // Security inputs
  const [newPin, setNewPin] = useState('');
  const [curPin, setCurPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await businessFetch('/api/v1/business/reports/settings', { method: 'GET' });
      if (res.ok && res.body?.data) {
        const d = res.body.data;
        setP({ tax: {}, ...(d.profile || {}) });
        if (d.profile?.currencySymbol) setCurrencySymbol(d.profile.currencySymbol);
        setCompletion(d.completion || { percent: 0, steps: [] });
        setModules(d.moduleCatalog || []);
        setEnabled(d.entitlements?.modules || {});
        setProvisioned(!!d.entitlements?.provisioned);
        setOwnerPinSet(!!d.ownerPinSet);
        setCustomPricing(d.customPricing || null);
      }
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: keyof Profile) => (v: any) => setP((prev) => ({ ...prev, [k]: v }));
  const setTax = (k: keyof Tax) => (v: any) => setP((prev) => ({ ...prev, tax: { ...(prev.tax || {}), [k]: v } }));

  const pickCurrency = (code: string) => setP((prev) => ({ ...prev, currency: code, currencySymbol: symbolForCode(code) }));
  const pickLanguage = async (code: string) => { setP((prev) => ({ ...prev, locale: code })); await setLanguage(code); };
  const applyTaxPreset = (preset: { country: string; name: string; rate: number }) =>
    setP((prev) => ({ ...prev, country: prev.country || (preset.country.startsWith('None') ? prev.country : preset.country), tax: { ...(prev.tax || {}), enabled: preset.rate > 0, name: preset.name, rate: preset.rate } }));

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { showAlert('Permission needed', 'Allow photo access to add a logo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      let uri = result.assets[0].uri;
      try {
        const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 512 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
        uri = manipulated.uri;
      } catch { /* use original */ }
      const up = await uploadFile('/api/upload/asset', uri, 'logo.jpg', { folder: 'business-logos' }, 'image');
      if (up.ok && up.body?.url) setP((prev) => ({ ...prev, logoUrl: up.body.url }));
      else showAlert('Upload failed', up.userMessage || 'Could not upload the logo.');
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const tax = p.tax || {};
      const res = await businessFetch('/api/v1/business/reports/business-profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerName: p.headerName || '', logoUrl: p.logoUrl || '', addressLine: p.addressLine || '',
          phone: p.phone || '', email: p.email || '', footerNote: p.footerNote || '', receiptPrefix: p.receiptPrefix || '',
          city: p.city || '', country: p.country || '', website: p.website || '',
          currency: p.currency || 'NGN', currencySymbol: p.currencySymbol || '₦',
          locale: p.locale || 'en', tzOffsetMinutes: typeof p.tzOffsetMinutes === 'number' ? p.tzOffsetMinutes : 60,
          tax: { enabled: !!tax.enabled, name: tax.name || 'VAT', rate: Number(tax.rate) || 0, number: tax.number || null, inclusive: !!tax.inclusive },
        }),
      });
      if (res.ok) { setCurrencySymbol(p.currencySymbol); showAlert(t('common.success'), t('settings.saved')); load(); }
      else showAlert(t('common.error'), res.body?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  const saveOwnerPin = async () => {
    if (!/^\d{4,8}$/.test(newPin)) { showAlert('Invalid PIN', 'PIN must be 4 to 8 digits.'); return; }
    setSavingPin(true);
    try {
      const res = await businessFetch('/api/v1/business/reports/owner-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin, currentPin: curPin }),
      });
      if (res.ok) { showAlert('Saved', 'Your owner PIN has been saved.'); setNewPin(''); setCurPin(''); setOwnerPinSet(true); load(); }
      else showAlert('Could not save', res.body?.message || 'Failed to save the PIN.');
    } finally { setSavingPin(false); }
  };

  const changePassword = async () => {
    if (newPw.length < 8) { showAlert('Too short', 'Password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { showAlert('Mismatch', 'The two passwords do not match.'); return; }
    setSavingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) showAlert('Could not change', error.message || 'Failed to change password.');
      else { showAlert('Done', 'Your password has been changed.'); setNewPw(''); setConfirmPw(''); }
    } catch (e: any) {
      showAlert('Could not change', e?.message || 'Failed to change password.');
    } finally { setSavingPw(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;

  const tax = p.tax || {};
  const remaining = completion.steps.filter((s) => !s.done);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── VIP completion progress ─────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.progressTitle}>Profile setup — {completion.percent}% complete</Text>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${completion.percent}%` }]} /></View>
        {remaining.length > 0 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.stepHint}>Finish these to complete your profile:</Text>
            <View style={styles.chips}>
              {remaining.map((s) => <View key={s.key} style={styles.todoChip}><Text style={styles.todoChipText}>○ {s.label}</Text></View>)}
            </View>
          </View>
        ) : <Text style={styles.allDone}>🎉 All set — your profile is complete!</Text>}
      </View>

      {customPricing?.active && (
        <View style={[styles.card, { borderColor: ACCENT }]}>
          <Text style={styles.priceLabel}>Your plan: {customPricing.label || 'Custom'}</Text>
          {customPricing.amount != null && (
            <Text style={styles.priceValue}>{customPricing.currency || ''} {Number(customPricing.amount).toLocaleString()} / {customPricing.period || 'month'}</Text>
          )}
          {!!customPricing.note && <Text style={styles.priceNote}>{customPricing.note}</Text>}
        </View>
      )}

      <Text style={styles.intro}>{t('settings.intro')}</Text>

      {/* ── Logo + identity ─────────────────────────────────────── */}
      <View style={styles.logoBox}>
        {p.logoUrl ? <Image source={{ uri: p.logoUrl }} style={styles.logo} resizeMode="contain" /> : <View style={styles.logoPlaceholder}><Text style={styles.logoPh}>{t('settings.noLogo')}</Text></View>}
        <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} disabled={uploading}>
          {uploading ? <ActivityIndicator color={ACCENT} /> : <Text style={styles.logoBtnText}>{p.logoUrl ? t('settings.changeLogo') : t('settings.uploadLogo')}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.field}><Text style={styles.label}>{t('settings.businessName')}</Text>
        <TextInput style={styles.input} value={p.headerName || ''} onChangeText={set('headerName')} placeholder="e.g. Happy Paws Clinic" placeholderTextColor="#9CA3AF" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('settings.address')}</Text>
        <TextInput style={styles.input} value={p.addressLine || ''} onChangeText={set('addressLine')} placeholder="12 King Fahd Rd, Riyadh" placeholderTextColor="#9CA3AF" /></View>
      <View style={styles.row2}>
        <View style={[styles.field, styles.half]}><Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={p.city || ''} onChangeText={set('city')} placeholder="Riyadh" placeholderTextColor="#9CA3AF" /></View>
        <View style={[styles.field, styles.half]}><Text style={styles.label}>Country</Text>
          <TextInput style={styles.input} value={p.country || ''} onChangeText={set('country')} placeholder="Saudi Arabia" placeholderTextColor="#9CA3AF" /></View>
      </View>
      <View style={styles.field}><Text style={styles.label}>{t('common.phone')}</Text>
        <TextInput style={styles.input} value={p.phone || ''} onChangeText={set('phone')} placeholder="+966 5x xxx xxxx" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('common.email')}</Text>
        <TextInput style={styles.input} value={p.email || ''} onChangeText={set('email')} placeholder="clinic@email.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" /></View>
      <View style={styles.field}><Text style={styles.label}>Website (optional)</Text>
        <TextInput style={styles.input} value={p.website || ''} onChangeText={set('website')} placeholder="www.yourclinic.com" placeholderTextColor="#9CA3AF" autoCapitalize="none" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('settings.receiptPrefix')}</Text>
        <TextInput style={styles.input} value={p.receiptPrefix || ''} onChangeText={set('receiptPrefix')} placeholder="HP  (→ HP-ABC123)" placeholderTextColor="#9CA3AF" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('settings.footerNote')}</Text>
        <TextInput style={styles.input} value={p.footerNote || ''} onChangeText={set('footerNote')} placeholder={t('receipt.thankYou')} placeholderTextColor="#9CA3AF" /></View>

      {/* ── TAX (self-service) ──────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tax</Text>
          <Switch value={!!tax.enabled} onValueChange={setTax('enabled')} trackColor={{ true: ACCENT }} />
        </View>
        <Text style={styles.disclaimer}>
          You set your own tax — you know your country's rules best. Xpress Vet only shows these numbers on your receipts; it does not collect or file any tax on your behalf. That remains your responsibility. (In Saudi Arabia the receipt tax is VAT 15%; Zakat is a separate yearly company tax, not a receipt line.)
        </Text>

        <Text style={styles.smallLabel}>Quick fill by country</Text>
        <View style={styles.chips}>
          {TAX_PRESETS.map((preset) => (
            <TouchableOpacity key={preset.country} style={styles.chip} onPress={() => applyTaxPreset(preset)}>
              <Text style={styles.chipText}>{preset.country} · {preset.rate}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tax.enabled && (
          <>
            <View style={styles.row2}>
              <View style={[styles.field, styles.half]}><Text style={styles.label}>Tax name</Text>
                <TextInput style={styles.input} value={tax.name || ''} onChangeText={setTax('name')} placeholder="VAT" placeholderTextColor="#9CA3AF" /></View>
              <View style={[styles.field, styles.half]}><Text style={styles.label}>Rate (%)</Text>
                <TextInput style={styles.input} value={tax.rate != null ? String(tax.rate) : ''} onChangeText={(v) => setTax('rate')(v.replace(/[^0-9.]/g, ''))} placeholder="15" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" /></View>
            </View>
            <View style={styles.field}><Text style={styles.label}>Tax / VAT registration number (shown on receipt)</Text>
              <TextInput style={styles.input} value={tax.number || ''} onChangeText={setTax('number')} placeholder="3001234567890003" placeholderTextColor="#9CA3AF" /></View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Prices already include tax</Text>
                <Text style={styles.hintText}>{tax.inclusive ? 'Tax is inside your prices; the receipt shows the tax portion.' : 'Tax is added on top of your prices at checkout.'}</Text>
              </View>
              <Switch value={!!tax.inclusive} onValueChange={setTax('inclusive')} trackColor={{ true: ACCENT }} />
            </View>
          </>
        )}
      </View>

      {/* Currency */}
      <Text style={[styles.label, { marginTop: 8 }]}>{t('settings.currency')}</Text>
      <View style={styles.chips}>
        {CURRENCIES.map((c) => (
          <TouchableOpacity key={c.code} style={[styles.chip, p.currency === c.code && styles.chipOn]} onPress={() => pickCurrency(c.code)}>
            <Text style={[styles.chipText, p.currency === c.code && styles.chipTextOn]}>{c.symbol} {c.code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Language */}
      <Text style={[styles.label, { marginTop: 16 }]}>{t('common.language')}</Text>
      <View style={styles.chips}>
        {LANGUAGES.map((l) => (
          <TouchableOpacity key={l.code} style={[styles.chip, p.locale === l.code && styles.chipOn]} onPress={() => pickLanguage(l.code)}>
            <Text style={[styles.chipText, p.locale === l.code && styles.chipTextOn]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timezone */}
      <Text style={[styles.label, { marginTop: 16 }]}>{t('settings.timezone')}</Text>
      <View style={styles.chips}>
        {TIMEZONES.map((tz) => (
          <TouchableOpacity key={tz.label} style={[styles.chip, p.tzOffsetMinutes === tz.min && styles.chipOn]} onPress={() => set('tzOffsetMinutes')(tz.min)}>
            <Text style={[styles.chipText, p.tzOffsetMinutes === tz.min && styles.chipTextOn]}>{tz.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.save} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('settings.saveSettings')}</Text>}
      </TouchableOpacity>

      {/* ── Your modules ────────────────────────────────────────── */}
      {modules.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your modules</Text>
          <Text style={styles.hintText}>{provisioned ? 'These are the features enabled for your account. Contact us to add more.' : 'Your account can use every feature for its type.'}</Text>
          <View style={{ marginTop: 10 }}>
            {modules.map((m) => (
              <View key={m.key} style={styles.moduleRow}>
                <Text style={[styles.moduleDot, { color: enabled[m.key] ? '#059669' : '#CBD5E1' }]}>{enabled[m.key] ? '●' : '○'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moduleName, !enabled[m.key] && { color: '#9CA3AF' }]}>{m.label}</Text>
                  <Text style={styles.moduleDesc}>{m.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Security: owner PIN ─────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Owner PIN {ownerPinSet ? '(set)' : ''}</Text>
        <Text style={styles.hintText}>A quick 4–8 digit PIN for unlocking on a shared device. Separate from your login password.</Text>
        {ownerPinSet && (
          <View style={styles.field}><Text style={styles.label}>Current PIN</Text>
            <TextInput style={styles.input} value={curPin} onChangeText={setCurPin} placeholder="••••" placeholderTextColor="#9CA3AF" keyboardType="number-pad" secureTextEntry maxLength={8} /></View>
        )}
        <View style={styles.field}><Text style={styles.label}>{ownerPinSet ? 'New PIN' : 'Set PIN'}</Text>
          <TextInput style={styles.input} value={newPin} onChangeText={setNewPin} placeholder="4–8 digits" placeholderTextColor="#9CA3AF" keyboardType="number-pad" secureTextEntry maxLength={8} /></View>
        <TouchableOpacity style={styles.secondaryBtn} onPress={saveOwnerPin} disabled={savingPin}>
          {savingPin ? <ActivityIndicator color={ACCENT} /> : <Text style={styles.secondaryBtnText}>Save PIN</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Security: change password ───────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Change login password</Text>
        <View style={styles.field}><Text style={styles.label}>New password</Text>
          <TextInput style={styles.input} value={newPw} onChangeText={setNewPw} placeholder="At least 8 characters" placeholderTextColor="#9CA3AF" secureTextEntry /></View>
        <View style={styles.field}><Text style={styles.label}>Confirm password</Text>
          <TextInput style={styles.input} value={confirmPw} onChangeText={setConfirmPw} placeholder="Repeat new password" placeholderTextColor="#9CA3AF" secureTextEntry /></View>
        <TouchableOpacity style={styles.secondaryBtn} onPress={changePassword} disabled={savingPw}>
          {savingPw ? <ActivityIndicator color={ACCENT} /> : <Text style={styles.secondaryBtnText}>Change password</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 80 },
  intro: { fontSize: 13, color: '#6B7280', marginBottom: 16 },

  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  progressTitle: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 10 },
  progressTrack: { height: 12, backgroundColor: '#EEF2FF', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: 12, backgroundColor: ACCENT, borderRadius: 8 },
  stepWrap: { marginTop: 12 },
  stepHint: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  allDone: { marginTop: 12, fontSize: 13, fontWeight: '700', color: '#059669' },
  todoChip: { backgroundColor: '#FEF3C7', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  todoChipText: { fontSize: 12, color: '#92400E', fontWeight: '700' },

  priceLabel: { fontSize: 12, fontWeight: '800', color: ACCENT, textTransform: 'uppercase' },
  priceValue: { fontSize: 22, fontWeight: '900', color: '#111827', marginTop: 4 },
  priceNote: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  logoBox: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  logo: { width: 110, height: 110, borderRadius: 8 },
  logoPlaceholder: { width: 110, height: 110, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  logoPh: { color: '#9CA3AF', fontSize: 12 },
  logoBtn: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: ACCENT },
  logoBtnText: { color: ACCENT, fontWeight: '800' },

  field: { marginBottom: 14 },
  row2: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  smallLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginTop: 12, marginBottom: 8 },
  hintText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#fff' },

  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#111827', marginBottom: 6 },
  disclaimer: { fontSize: 11, color: '#6B7280', lineHeight: 16, marginTop: 6, marginBottom: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  chipTextOn: { color: '#fff' },

  moduleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  moduleDot: { fontSize: 14, marginTop: 1 },
  moduleName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  moduleDesc: { fontSize: 12, color: '#9CA3AF' },

  save: { backgroundColor: ACCENT, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 22 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  secondaryBtn: { borderRadius: 12, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: ACCENT, marginTop: 4 },
  secondaryBtnText: { color: ACCENT, fontWeight: '800', fontSize: 15 },
});
