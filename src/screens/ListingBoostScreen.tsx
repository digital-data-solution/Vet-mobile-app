/**
 * ListingBoostScreen — pay a one-off fee to feature a specific marketplace
 * listing at the top of the market with a "FEATURED" badge. Reuses the same
 * Paystack WebView flow as BoostListingScreen, targeting /market/:id/boost.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { boostListing, getMarketMeta } from '../api/market';
import { showAlert } from '../utils/alert';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

interface Pkg { days: number; price: number; label: string }
interface Props { navigation: any; route: any }

export default function ListingBoostScreen({ navigation, route }: Props) {
  const listingId: string = route.params?.listingId;
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState<number | null>(null);

  useEffect(() => {
    getMarketMeta().then((m) => { if (m?.boost?.packages) setPackages(m.boost.packages); }).finally(() => setLoading(false));
  }, []);

  const onSuccess = useCallback((reference: string) => {
    showAlert('Listing Boosted!', `Payment confirmed (Ref: ${reference}). Your listing now shows at the top of the marketplace.`);
    navigation.goBack();
  }, [navigation]);

  const openPaystack = (authorization_url: string, reference: string, amount: number) => {
    const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storePaystackCallbacks(callbackKey, { onSuccess, onCancel: () => {} });
    const params = { authorization_url, reference, amount, callbackKey };
    const parent = navigation.getParent();
    if (typeof parent?.navigate === 'function') parent.navigate('PaystackWebView', params);
    else navigation.navigate('PaystackWebView', params);
  };

  const buy = async (days: number) => {
    setPaying(days);
    const r = await boostListing(listingId, days);
    setPaying(null);
    if (r.ok && r.body?.data?.authorization_url) {
      const { authorization_url, reference, amount } = r.body.data;
      openPaystack(authorization_url, reference, amount);
    } else {
      showAlert('Error', r.body?.message || 'Could not start boost payment.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#F59E0B" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hero}>🚀 Boost this listing</Text>
      <Text style={styles.sub}>Featured listings appear at the very top of the marketplace with a highlighted badge — more views, faster sale.</Text>
      {packages.map((pkg) => (
        <View key={pkg.days} style={styles.pkg}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pkgLabel}>{pkg.label}</Text>
            <Text style={styles.pkgDays}>Top placement for {pkg.days} days</Text>
          </View>
          <TouchableOpacity style={[styles.buy, paying === pkg.days && { opacity: 0.6 }]} disabled={paying !== null} onPress={() => buy(pkg.days)}>
            {paying === pkg.days ? <ActivityIndicator color="#fff" /> : <Text style={styles.buyTxt}>₦{pkg.price.toLocaleString()}</Text>}
          </TouchableOpacity>
        </View>
      ))}
      <Text style={styles.foot}>One-off payment — separate from any subscription. Boosts stack and also refresh an expired listing.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  hero: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 6 },
  sub: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 20 },
  pkg: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pkgLabel: { fontSize: 16, fontWeight: '800', color: '#111827' },
  pkgDays: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  buy: { backgroundColor: '#F59E0B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, minWidth: 96, alignItems: 'center' },
  buyTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
  foot: { fontSize: 12, color: '#9CA3AF', marginTop: 12, lineHeight: 18, textAlign: 'center' },
});
