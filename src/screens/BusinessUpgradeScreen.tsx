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
import { businessFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

interface Package { days: number; price: number; label: string; }
interface Status {
  productCount: number; freeProductLimit: number; atLimit: boolean;
  addonActive: boolean; activeUntil: string | null; daysRemaining: number;
  includedSeats?: number; seatsPaid?: number; staffCount?: number; perSeatPrice?: number;
}
interface Props { navigation: any; route?: any; }

export default function BusinessUpgradeScreen({ navigation, route }: Props) {
  const seatsMode = route?.params?.seats === true;
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState<number | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [status, setStatus]     = useState<Status | null>(null);
  const [seatQty, setSeatQty]   = useState(1);
  const [buyingSeats, setBuyingSeats] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [priceRes, statusRes] = await Promise.all([
        businessFetch('/api/v1/business/pricing', { method: 'GET' }),
        businessFetch('/api/v1/business/status', { method: 'GET' }),
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
      const res = await businessFetch('/api/v1/business/pay', {
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

  const buySeats = async () => {
    setBuyingSeats(true);
    try {
      const res = await businessFetch('/api/v1/business/seats/pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: seatQty, days: 30 }),
      });
      if (res.ok && res.body?.success) {
        const { authorization_url, reference, amount } = res.body.data;
        setBuyingSeats(false);
        openPaystackWebView(authorization_url, reference, amount);
      } else {
        showAlert('Error', res.body?.message || 'Could not start seat payment.');
        setBuyingSeats(false);
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
      setBuyingSeats(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4338CA" /></View>;

  // ── Seats purchase mode (from Staff → Add seats) ────────────────────────────
  if (seatsMode) {
    const perSeat  = status?.perSeatPrice ?? 0;
    const included = status?.includedSeats ?? 0;
    const paid     = status?.seatsPaid ?? 0;
    const used     = status?.staffCount ?? 0;
    const estimate = perSeat * seatQty;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.hero}>👥 Add staff seats</Text>
        <Text style={styles.sub}>
          Each staff member with their own login needs a seat. Buy extra seats to grow your team.
        </Text>

        {status && (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>{used} of {included + paid} seats used</Text>
            <Text style={styles.statusText}>
              {included} included{paid > 0 ? ` + ${paid} extra` : ''}. Extra seats are ₦{perSeat.toLocaleString()} each per 30 days.
            </Text>
          </View>
        )}

        <View style={styles.pkgCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pkgLabel}>How many seats?</Text>
            <Text style={styles.pkgDays}>₦{perSeat.toLocaleString()} per seat / 30 days</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setSeatQty((q) => Math.max(1, q - 1))}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
            <Text style={styles.stepQty}>{seatQty}</Text>
            <TouchableOpacity style={styles.stepBtn} onPress={() => setSeatQty((q) => Math.min(50, q + 1))}><Text style={styles.stepBtnText}>＋</Text></TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, styles.seatBuyBtn, buyingSeats && styles.buyBtnDisabled]}
          disabled={buyingSeats}
          onPress={buySeats}
        >
          {buyingSeats ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyBtnText}>Pay ₦{estimate.toLocaleString()} for {seatQty} seat{seatQty === 1 ? '' : 's'}</Text>}
        </TouchableOpacity>

        <Text style={styles.footNote}>
          Seats are billed separately per 30 days. Final amount is confirmed at checkout.
        </Text>
      </ScrollView>
    );
  }

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
  seatBuyBtn:     { paddingVertical: 15, borderRadius: 12, marginTop: 4 },
  stepper:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn:        { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  stepBtnText:    { color: '#4338CA', fontSize: 22, fontWeight: '900', marginTop: -2 },
  stepQty:        { fontSize: 20, fontWeight: '900', color: '#111827', minWidth: 28, textAlign: 'center' },
  footNote: { fontSize: 12, color: '#9CA3AF', marginTop: 12, lineHeight: 18, textAlign: 'center' },
});
