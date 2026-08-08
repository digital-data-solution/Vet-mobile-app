/**
 * BoostListingScreen.tsx
 *
 * Lets a professional or shop owner pay a one-off fee to "boost" (feature)
 * their listing to the top of search results for a fixed number of days.
 *
 * Reuses the same Paystack WebView flow as SubscriptionScreen:
 *   POST /api/v1/featured/pay { days } -> authorization_url -> PaystackWebView
 * Boost status is read from GET /api/v1/featured/me.
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

interface BoostPackage {
  days:  number;
  price: number;
  label: string;
}

interface BoostStatus {
  isFeatured:    boolean;
  featuredUntil: string | null;
  daysRemaining: number;
}

interface Props {
  navigation: any;
}

export default function BoostListingScreen({ navigation }: Props) {
  const [loading,   setLoading]   = useState(true);
  const [paying,    setPaying]    = useState<number | null>(null);
  const [packages,  setPackages]  = useState<BoostPackage[]>([]);
  const [benefits,  setBenefits]  = useState<string[]>([]);
  const [status,    setStatus]    = useState<BoostStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [priceRes, statusRes] = await Promise.all([
        apiFetch('/api/v1/featured/pricing', { method: 'GET' }),
        apiFetch('/api/v1/featured/me', { method: 'GET' }),
      ]);
      if (priceRes.ok && priceRes.body?.data) {
        setPackages(priceRes.body.data.packages || []);
        setBenefits(priceRes.body.data.benefits || []);
      }
      if (statusRes.ok && statusRes.body?.data) {
        setStatus(statusRes.body.data as BoostStatus);
      } else {
        setStatus(null);
      }
    } catch {
      showAlert('Error', 'Could not load boost options. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSuccess = useCallback(async (reference: string) => {
    await load();
    showAlert('Listing Boosted!', `Payment confirmed (Ref: ${reference}). Your listing is now featured at the top of search.`);
  }, [load]);

  const onCancel = useCallback(() => {}, []);

  const openPaystackWebView = useCallback((authorization_url: string, reference: string, amount: number) => {
    const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storePaystackCallbacks(callbackKey, { onSuccess, onCancel });
    const params = { authorization_url, reference, amount, callbackKey };
    const parent = navigation.getParent();
    if (typeof parent?.navigate === 'function') {
      parent.navigate('PaystackWebView', params);
    } else {
      navigation.navigate('PaystackWebView', params);
    }
  }, [navigation, onSuccess, onCancel]);

  const buy = async (days: number) => {
    setPaying(days);
    try {
      const res = await apiFetch('/api/v1/featured/pay', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ days }),
      });
      if (res.ok && res.body?.success) {
        const { authorization_url, reference, amount } = res.body.data;
        setPaying(null);
        openPaystackWebView(authorization_url, reference, amount);
      } else {
        showAlert('Error', res.body?.message || 'Could not start boost payment.');
        setPaying(null);
      }
    } catch {
      showAlert('Error', 'Please check your connection and try again.');
      setPaying(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hero}>🚀 Boost Your Listing</Text>
      <Text style={styles.sub}>
        Featured listings appear at the very top of search results with a highlighted badge — more views, more contacts, more customers.
      </Text>

      {status?.isFeatured && (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>✨ Your listing is featured</Text>
          <Text style={styles.activeText}>
            {status.daysRemaining} day{status.daysRemaining === 1 ? '' : 's'} remaining. Buy again to extend.
          </Text>
        </View>
      )}

      {benefits.length > 0 && (
        <View style={styles.benefits}>
          {benefits.map((b, i) => (
            <Text key={i} style={styles.benefit}>✓  {b}</Text>
          ))}
        </View>
      )}

      {packages.map((pkg) => (
        <View key={pkg.days} style={styles.pkgCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pkgLabel}>{pkg.label}</Text>
            <Text style={styles.pkgDays}>Top placement for {pkg.days} days</Text>
          </View>
          <TouchableOpacity
            style={[styles.buyBtn, paying === pkg.days && styles.buyBtnDisabled]}
            disabled={paying !== null}
            onPress={() => buy(pkg.days)}
          >
            {paying === pkg.days
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buyBtnText}>₦{pkg.price.toLocaleString()}</Text>}
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.footNote}>
        One-off payment — this is separate from your monthly subscription. Boosts stack on top of your current plan.
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

  activeCard:  { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FCD34D' },
  activeTitle: { fontSize: 16, fontWeight: '800', color: '#92400E', marginBottom: 4 },
  activeText:  { fontSize: 13, color: '#92400E' },

  benefits: { marginBottom: 20 },
  benefit:  { fontSize: 14, color: '#374151', marginBottom: 8, fontWeight: '600' },

  pkgCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  pkgLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  pkgDays:  { fontSize: 13, color: '#6B7280', marginTop: 2 },

  buyBtn:         { backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 96, alignItems: 'center' },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText:     { color: '#fff', fontWeight: '900', fontSize: 15 },

  footNote: { fontSize: 12, color: '#9CA3AF', marginTop: 12, lineHeight: 18, textAlign: 'center' },
});
