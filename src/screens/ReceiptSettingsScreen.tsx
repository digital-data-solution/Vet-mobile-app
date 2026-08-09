/**
 * ReceiptSettingsScreen.tsx — the business's self-service control panel. The
 * owner sets everything that makes the app *theirs*: logo, header/address/phone,
 * receipt footer & number prefix, their currency (₦ / SAR / $ …), their app
 * language, and their timezone (so "today" and day-close match local midnight).
 * No platform admin needed — they own it. Owner-only.
 */
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { businessFetch, uploadFile } from '../api/client';
import { showAlert } from '../utils/alert';
import { CURRENCIES, setCurrencySymbol, symbolForCode } from '../utils/money';
import { LANGUAGES, setLanguage } from '../i18n';

interface Profile {
  headerName?: string; logoUrl?: string; addressLine?: string;
  phone?: string; email?: string; footerNote?: string; receiptPrefix?: string;
  currency?: string; currencySymbol?: string; locale?: string; tzOffsetMinutes?: number;
}
interface Props { navigation: any; }

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

export default function ReceiptSettingsScreen(_props: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [p, setP] = useState<Profile>({ currency: 'NGN', currencySymbol: '₦', locale: 'en', tzOffsetMinutes: 60 });

  const load = useCallback(async () => {
    try {
      const res = await businessFetch('/api/v1/business/reports/business-profile', { method: 'GET' });
      if (res.ok && res.body?.data) {
        setP(res.body.data);
        if (res.body.data.currencySymbol) setCurrencySymbol(res.body.data.currencySymbol);
      }
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const set = (k: keyof Profile) => (v: any) => setP((prev) => ({ ...prev, [k]: v }));

  const pickCurrency = (code: string) => setP((prev) => ({ ...prev, currency: code, currencySymbol: symbolForCode(code) }));
  const pickLanguage = async (code: string) => { setP((prev) => ({ ...prev, locale: code })); await setLanguage(code); };

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { showAlert('Permission needed', 'Allow photo access to add a logo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      // Resize/compress before upload so receipts load fast and bandwidth stays low.
      let uri = result.assets[0].uri;
      try {
        const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 512 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
        uri = manipulated.uri;
      } catch { /* use original if manipulation fails */ }
      const up = await uploadFile('/api/upload/asset', uri, 'logo.jpg', { folder: 'business-logos' }, 'image');
      if (up.ok && up.body?.url) setP((prev) => ({ ...prev, logoUrl: up.body.url }));
      else showAlert('Upload failed', up.userMessage || 'Could not upload the logo.');
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await businessFetch('/api/v1/business/reports/business-profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerName: p.headerName || '', logoUrl: p.logoUrl || '', addressLine: p.addressLine || '',
          phone: p.phone || '', email: p.email || '', footerNote: p.footerNote || '', receiptPrefix: p.receiptPrefix || '',
          currency: p.currency || 'NGN', currencySymbol: p.currencySymbol || '₦',
          locale: p.locale || 'en', tzOffsetMinutes: typeof p.tzOffsetMinutes === 'number' ? p.tzOffsetMinutes : 60,
        }),
      });
      if (res.ok) { setCurrencySymbol(p.currencySymbol); showAlert(t('common.success'), t('settings.saved')); }
      else showAlert(t('common.error'), res.body?.message || 'Could not save.');
    } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{t('settings.intro')}</Text>

      <View style={styles.logoBox}>
        {p.logoUrl ? <Image source={{ uri: p.logoUrl }} style={styles.logo} resizeMode="contain" /> : <View style={styles.logoPlaceholder}><Text style={styles.logoPh}>{t('settings.noLogo')}</Text></View>}
        <TouchableOpacity style={styles.logoBtn} onPress={pickLogo} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#4338CA" /> : <Text style={styles.logoBtnText}>{p.logoUrl ? t('settings.changeLogo') : t('settings.uploadLogo')}</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.field}><Text style={styles.label}>{t('settings.businessName')}</Text>
        <TextInput style={styles.input} value={p.headerName || ''} onChangeText={set('headerName')} placeholder="e.g. Happy Paws" placeholderTextColor="#9CA3AF" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('settings.address')}</Text>
        <TextInput style={styles.input} value={p.addressLine || ''} onChangeText={set('addressLine')} placeholder="12 Allen Ave, Ikeja" placeholderTextColor="#9CA3AF" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('common.phone')}</Text>
        <TextInput style={styles.input} value={p.phone || ''} onChangeText={set('phone')} placeholder="0803 000 0000" placeholderTextColor="#9CA3AF" keyboardType="phone-pad" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('common.email')}</Text>
        <TextInput style={styles.input} value={p.email || ''} onChangeText={set('email')} placeholder="shop@email.com" placeholderTextColor="#9CA3AF" keyboardType="email-address" autoCapitalize="none" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('settings.receiptPrefix')}</Text>
        <TextInput style={styles.input} value={p.receiptPrefix || ''} onChangeText={set('receiptPrefix')} placeholder="HP  (→ HP-ABC123)" placeholderTextColor="#9CA3AF" /></View>
      <View style={styles.field}><Text style={styles.label}>{t('settings.footerNote')}</Text>
        <TextInput style={styles.input} value={p.footerNote || ''} onChangeText={set('footerNote')} placeholder={t('receipt.thankYou')} placeholderTextColor="#9CA3AF" /></View>

      {/* Currency */}
      <Text style={styles.label}>{t('settings.currency')}</Text>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 60 },
  intro: { fontSize: 13, color: '#6B7280', marginBottom: 16 },

  logoBox: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  logo: { width: 110, height: 110, borderRadius: 8 },
  logoPlaceholder: { width: 110, height: 110, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  logoPh: { color: '#9CA3AF', fontSize: 12 },
  logoBtn: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#4338CA' },
  logoBtnText: { color: '#4338CA', fontWeight: '800' },

  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#111827', backgroundColor: '#fff' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: '#4338CA', borderColor: '#4338CA' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  chipTextOn: { color: '#fff' },

  save: { backgroundColor: '#4338CA', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 22 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
