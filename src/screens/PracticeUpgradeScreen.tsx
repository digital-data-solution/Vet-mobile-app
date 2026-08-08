/**
 * PracticeUpgradeScreen.tsx
 *
 * Lets a vet pay to unlock unlimited patients in Practice Records (free tier
 * is capped — see status.freePatientLimit). Same Paystack WebView flow as
 * BoostListingScreen/SubscriptionScreen:
 *   POST /api/v1/practice/pay { days } -> authorization_url -> PaystackWebView
 * Status read from GET /api/v1/practice/status.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

interface Package { days: number; price: number; label: string; }
interface Status {
  patientCount: number;
  freePatientLimit: number;
  atLimit: boolean;
  addonActive: boolean;
  activeUntil: string | null;
  daysRemaining: number;
}

interface Props { navigation: any; }

export default function PracticeUpgradeScreen({ navigation }: Props) {
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [status,   setStatus]   = useState<Status | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [priceRes, statusRes] = await Promise.all([
        apiFetch('/api/v1/practice/pricing', { method: 'GET' }),
        apiFetch('/api/v1/practice/status', { method: 'GET' }),
      ]);
      if (priceRes.ok && priceRes.body?.data) {
        setPackages(priceRes.body.data.packages || []);
        setBenefits(priceRes.body.data.benefits || []);
      }
      if (statusRes.ok && statusRes.body?.data) setStatus(statusRes.body.data);
    } catch {
      showAlert('Error', 'Could not load Practice Records pricing. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSuccess = useCallback(async (reference: string) => {
    await load();
    showAlert('Unlocked!', `Payment confirmed (Ref: ${reference}). You now have unlimited patients in Practice Records.`);
  }, [load]);

  const onCancel = useCallback(() => {}, []);

  const openPaystackWebView = useCallback((authorization_url: string, reference: string, amount: number) => {
    const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storePaystackCallbacks(callbackKey, { onSuccess, onCancel });
    const params = { authorization_url, reference, amount, callbackKey };
    const parent = navigation.getParent();
    if (typeof parent?.navigate === 'function') parent.navigate('PaystackWebView', params);
    else navigation.navigate('PaystackWebView', params);
  }, [navigation, onSuccess, onCancel]);

  const buy = async (days: number) => {
    setPaying(days);
    try {
      const res = await apiFetch('/api/v1/practice/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      if (res.ok && res.body?.success) {
        const { authorization_url, reference, amount } = res.body.data;
        setPaying(null);
        openPaystackWebView(authorization_url, reference, amount);
      } else {
        showAlert('Error', res.body?.message || 'Could not start payment.');
        setPaying(null);
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
      setPaying(null);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#0D9488" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hero}>🩺 Practice Records</Text>
      <Text style={styles.sub}>
        Run your practice from the app — clients, patients, treatment history, vaccination schedules, and automatic reminders.
      </Text>

      {status && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {status.addonActive ? '✨ Unlimited patients active' : `${status.patientCount} of ${status.freePatientLimit} free patients used`}
          </Text>
          {status.addonActive ? (
            <Text style={styles.statusText}>{status.daysRemaining} day{status.daysRemaining === 1 ? '' : 's'} remaining. Buy again to extend.</Text>
          ) : status.atLimit ? (
            <Text style={styles.statusText}>You've reached the free limit — upgrade below to add more patients.</Text>
          ) : (
            <Text style={styles.statusText}>{status.freePatientLimit - status.patientCount} free patient slot{status.freePatientLimit - status.patientCount === 1 ? '' : 's'} left.</Text>
          )}
        </View>
      )}

      {benefits.length > 0 && (
        <View style={styles.benefits}>
          {benefits.map((b, i) => <Text key={i} style={styles.benefit}>✓  {b}</Text>)}
        </View>
      )}

      {packages.map((pkg) => (
        <View key={pkg.days} style={styles.pkgCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pkgLabel}>{pkg.label}</Text>
            <Text style={styles.pkgDays}>Unlimited patients for {pkg.days} days</Text>
          </View>
          <TouchableOpacity
            style={[styles.buyBtn, paying === pkg.days && styles.buyBtnDisabled]}
            disabled={paying !== null}
            onPress={() => buy(pkg.days)}
          >
            {paying === pkg.days ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyBtnText}>₦{pkg.price.toLocaleString()}</Text>}
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.footNote}>
        One-off payment, separate from your subscription. Time stacks if you buy again before it runs out.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content:   { padding: 20, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },

  hero: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 6 },
  sub:  { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 20 },

  statusCard:  { backgroundColor: '#F0FDFA', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#99F6E4' },
  statusTitle: { fontSize: 16, fontWeight: '800', color: '#0F766E', marginBottom: 4 },
  statusText:  { fontSize: 13, color: '#0F766E' },

  benefits: { marginBottom: 20 },
  benefit:  { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '600' },

  pkgCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pkgLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  pkgDays:  { fontSize: 13, color: '#6B7280', marginTop: 2 },

  buyBtn:         { backgroundColor: '#0D9488', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 96, alignItems: 'center' },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText:     { color: '#fff', fontWeight: '900', fontSize: 15 },

  footNote: { fontSize: 12, color: '#9CA3AF', marginTop: 12, lineHeight: 18, textAlign: 'center' },
});
