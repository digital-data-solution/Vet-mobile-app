import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../utils/alert';
import { getUserLocation } from '../utils/location';
import { apiFetch } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// "Near Me" — combined Professional + Shop GPS search in one call, backed by
// GET /api/v1/search/nearby. Falls back to Google Places automatically on the
// server when own-DB results are sparse — this screen just renders whatever
// comes back, including the `source: 'google'` items and the required
// attribution line (Google ToS requirement — do not remove).
// ─────────────────────────────────────────────────────────────────────────────

type NearbyResult = {
  source: 'xpressvet' | 'google';
  kind: string;
  id: string;
  name: string;
  role: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  distance: number | null;
  rating?: number;
  phone?: string;
  googleMapsUri?: string;
};

const ROLE_EMOJI: Record<string, string> = {
  vet: '👨‍⚕️',
  kennel: '🐕',
  groomer: '✂️',
  trainer: '🎓',
  pet_sitter: '🏠',
  pet_transport: '🚚',
  cremation_service: '🕊️',
  agro_vet_supplier: '🌾',
  insurance_provider: '🛡️',
  pet_pharmacy: '💊',
  rescue_center: '🐾',
  pet_hotel: '🏨',
  farm: '🚜',
  shop: '🏪',
};

export default function NearbySearchScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [results, setResults] = useState<NearbyResult[]>([]);
  const [ownCount, setOwnCount] = useState(0);
  const [googleCount, setGoogleCount] = useState(0);
  const [attribution, setAttribution] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = async () => {
    setLocationLoading(true);
    try {
      const loc = await getUserLocation();
      setLocationLoading(false);
      setLoading(true);

      const params = new URLSearchParams({
        lng: loc.longitude.toString(),
        lat: loc.latitude.toString(),
        distance: '10',
      });

      const res = await apiFetch(`/api/v1/search/nearby?${params}`, { method: 'GET' });

      if (res.ok && res.body?.success) {
        const data = res.body.data;
        setResults(data.results || []);
        setOwnCount(data.ownCount || 0);
        setGoogleCount(data.googleCount || 0);
        setAttribution(data.attribution || null);
      } else {
        showAlert('Error', res.body?.message || 'Failed to search nearby.');
      }
    } catch (err) {
      showAlert('Error', (err as Error).message || 'Could not get your location.');
    } finally {
      setLocationLoading(false);
      setLoading(false);
      setHasSearched(true);
    }
  };

  const openItem = (item: NearbyResult) => {
    if (item.source === 'google') {
      if (item.googleMapsUri) Linking.openURL(item.googleMapsUri);
      return;
    }
    if (item.kind === 'professional') {
      if (item.role === 'vet') navigation.navigate('VetProfile', { vetId: item.id });
      else if (item.role === 'kennel') navigation.navigate('KennelProfile', { kennelId: item.id });
      else navigation.navigate('ServiceProfile', { professionalId: item.id });
    } else if (item.kind === 'shop') {
      navigation.navigate('ShopProfile', { shopId: item.id });
    }
  };

  const renderItem = ({ item }: { item: NearbyResult }) => (
    <TouchableOpacity style={styles.card} onPress={() => openItem(item)}>
      <View style={styles.cardIcon}>
        <Text style={{ fontSize: 22 }}>
          {item.source === 'google' ? '🌐' : (ROLE_EMOJI[item.role || item.kind] || '📍')}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        {!!item.address && (
          <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
        )}
        <View style={styles.cardMetaRow}>
          {item.distance != null && (
            <Text style={styles.cardMeta}>{item.distance} km away</Text>
          )}
          {item.source === 'google' && (
            <View style={styles.googleBadge}>
              <Text style={styles.googleBadgeText}>via Google</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Find vets, shops & kennels near you</Text>
        <Text style={styles.introSub}>
          We search Xpress Vet first — if there's not much nearby yet, we'll also check Google.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.searchBtn}
        onPress={runSearch}
        disabled={loading || locationLoading}
      >
        {(loading || locationLoading) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="locate" size={18} color="#fff" />
            <Text style={styles.searchBtnText}>
              {locationLoading ? 'Getting your location…' : 'Search near my location'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {hasSearched && !loading && (
        <>
          <Text style={styles.resultSummary}>
            {results.length === 0
              ? 'No results found nearby.'
              : `${ownCount} on Xpress Vet${googleCount > 0 ? ` · ${googleCount} more via Google` : ''}`}
          </Text>

          <FlatList
            data={results}
            keyExtractor={(item, idx) => `${item.source}-${item.id}-${idx}`}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 24 }}
          />

          {!!attribution && (
            <Text style={styles.attribution}>{attribution}</Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  intro: { marginBottom: 16 },
  introTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  introSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
  },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  resultSummary: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  cardMeta: { fontSize: 12, color: '#9CA3AF' },
  googleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  googleBadgeText: { fontSize: 10, color: '#2563EB', fontWeight: '600' },
  attribution: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 4, marginBottom: 8 },
});
