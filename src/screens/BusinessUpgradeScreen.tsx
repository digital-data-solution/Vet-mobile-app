/**
 * BusinessUpgradeScreen.tsx
 *
 * Unlocks the Business Suite (unlimited products + sales reps). Same Paystack
 * WebView flow as PracticeUpgradeScreen/BoostListingScreen:
 *   POST /api/v1/business/pay { days } -> authorization_url -> PaystackWebView
 * Status from GET /api/v1/business/status.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

interface Package { days: number; price: number; label: string; }
interface Status {
  productCount: number; freeProductLimit: number; atLimit: boolean;
  addonActive: boolean; activeUntil: string | null; daysRemaining: number;
}
interface Props { navigation: any; }

export default function BusinessUpgradeScreen({ navigation }: Props) {
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [status, setStatus]     = useState<Status | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [priceRes, statusRes] = await Promise.all([
        apiFetch('/api/v1/business/pricing', { method: 'GET' }),
        apiFetch('/api/v1/business/status', { method: 'GET' }),
      ]);
      if (priceRes.ok && priceRes.body?.data) {
        setPackages(priceRes.body.data.packages || []);
        setBenefits(priceRes.body.data.benefits || []);
      }
      if (statusRes.ok && statusRes.body?.data) setStatus(statusRes.body.data);
    } catch {
      showAlert('Error', 'Could not load Business Suite pricing. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSuccess = useCallback(async (reference: string) => {
    await load();
    showAlert('Unlocked!', `Payment confirmed (Ref: ${reference}). Unlimited products and sales reps are now active.`);
  }, [load]);

  const openPaystackWebView = useCallback((authorization_url: string, reference: string, amount: number) => {
    const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storePaystackCallbacks(callbackKey, { onSuccess, onCancel: () => {} });
    const params = { authorization_url, reference, amount, callbackKey };
    const parent = navigation.getParent();
    if (typeof parent?.navigate === 'function') parent.navigate('PaystackWebView', params);
    else navigation.navigate('PaystackWebView', params);
  }, [navigation, onSuccess]);

  const buy = async (days: number) => {
    setPaying(days);
    try {
      const res = await apiFetch('/api/v1/business/pay', {
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hero}>🏪 Business Suite</Text>
      <Text style={styles.sub}>
        Track your stock, record every sale, add your sales reps, and see exactly who moved what — your whole shop, in the app.
      </Text>

      {status && (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {status.addonActive ? '✨ Business Suite active' : `${status.productCount} of ${status.freeProductLimit} free products used`}
          </Text>
          {status.addonActive ? (
            <Text style={styles.statusText}>{status.daysRemaining} day{status.daysRemaining === 1 ? '' : 's'} remaining. Buy again to extend.</Text>
          ) : status.atLimit ? (
            <Text style={styles.statusText}>You've reached the free limit — upgrade below for unlimited products and reps.</Text>
          ) : (
            <Text style={styles.statusText}>{status.freeProductLimit - status.productCount} free product slot{status.freeProductLimit - status.productCount === 1 ? '' : 's'} left. Sales reps need an upgrade.</Text>
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
            <Text style={styles.pkgDays}>Unlimited products + reps for {pkg.days} days</Text>
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
  statusCard:  { backgroundColor: '#EEF2FF', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#C7D2FE' },
  statusTitle: { fontSize: 16, fontWeight: '800', color: '#3730A3', marginBottom: 4 },
  statusText:  { fontSize: 13, color: '#4338CA' },
  benefits: { marginBottom: 20 },
  benefit:  { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '600' },
  pkgCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pkgLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  pkgDays:  { fontSize: 13, color: '#6B7280', marginTop: 2 },
  buyBtn:         { backgroundColor: '#4338CA', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 96, alignItems: 'center' },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText:     { color: '#fff', fontWeight: '900', fontSize: 15 },
  footNote: { fontSize: 12, color: '#9CA3AF', marginTop: 12, lineHeight: 18, textAlign: 'center' },
});
