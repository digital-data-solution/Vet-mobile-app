import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Kennel {
  _id?: string;
  name?: string;
  businessName?: string;
  ownerName?: string;
  address?: string;
  phone?: string;
  email?: string;
  specialization?: string;
  description?: string;
  distance?: number;
  isVerified?: boolean;
  rating?: number;
  reviewCount?: number;
}

export default function KennelProfileScreen({ route }: any) {
  const kennel: Kennel = route.params?.kennel ?? {};

  const displayName = kennel.businessName ?? kennel.name ?? 'Kennel';
  const services = kennel.specialization?.split(',').map(s => s.trim()).filter(Boolean) ?? [];

  const call = () => {
    if (!kennel.phone) return;
    Linking.openURL(`tel:${kennel.phone}`).catch(() =>
      Alert.alert('Error', 'Unable to open phone app')
    );
  };

  const email = () => {
    if (!kennel.email) return;
    Linking.openURL(`mailto:${kennel.email}`).catch(() =>
      Alert.alert('Error', 'Unable to open mail app')
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🐕</Text>
          </View>
          {kennel.isVerified && (
            <View style={styles.verifiedRing}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
          )}
        </View>

        <Text style={styles.name}>{displayName}</Text>
        {kennel.ownerName && kennel.ownerName !== displayName && (
          <Text style={styles.ownerLabel}>Owner: {kennel.ownerName}</Text>
        )}

        <View style={styles.badgeRow}>
          {kennel.isVerified && (
            <View style={[styles.badge, styles.badgeGreen]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#065F46" />
              <Text style={[styles.badgeText, { color: '#065F46' }]}>Verified</Text>
            </View>
          )}
          {kennel.distance != null && (
            <View style={[styles.badge, styles.badgeBlue]}>
              <Ionicons name="navigate-outline" size={12} color="#2563EB" />
              <Text style={[styles.badgeText, { color: '#2563EB' }]}>
                {kennel.distance.toFixed(1)} km away
              </Text>
            </View>
          )}
        </View>

        {kennel.rating != null && (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= Math.round(kennel.rating!) ? 'star' : 'star-outline'}
                size={16}
                color="#F59E0B"
              />
            ))}
            {kennel.reviewCount != null && (
              <Text style={styles.ratingText}>({kennel.reviewCount} reviews)</Text>
            )}
          </View>
        )}
      </View>

      {/* Services chips */}
      {services.length > 0 && (
        <View style={styles.servicesCard}>
          <Text style={styles.cardTitle}>Services Offered</Text>
          <View style={styles.chipsRow}>
            {services.map((service, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Contact actions */}
      {(kennel.phone || kennel.email) && (
        <View style={styles.contactRow}>
          {kennel.phone && (
            <TouchableOpacity
              style={[styles.contactBtn, styles.contactBtnCall]}
              onPress={call}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
          )}
          {kennel.email && (
            <TouchableOpacity
              style={[styles.contactBtn, styles.contactBtnEmail]}
              onPress={email}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={18} color="#0F172A" />
              <Text style={[styles.contactBtnText, { color: '#0F172A' }]}>Email</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Details card */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Details</Text>

        {kennel.address && (
          <DetailRow icon="location-outline" label="Location" value={kennel.address} />
        )}
        {kennel.phone && (
          <DetailRow icon="call-outline" label="Phone" value={kennel.phone} />
        )}
        {kennel.email && (
          <DetailRow icon="mail-outline" label="Email" value={kennel.email} />
        )}
        {!kennel.address && !kennel.phone && !kennel.email && (
          <Text style={styles.noDetails}>No contact details available.</Text>
        )}
      </View>

      {/* About / description */}
      {kennel.description && (
        <View style={styles.bioCard}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.bioText}>{kennel.description}</Text>
        </View>
      )}

      {/* Safety note */}
      <View style={styles.safetyNote}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#7C3AED" />
        <Text style={styles.safetyText}>
          Always verify credentials before leaving your pet with any service provider.
        </Text>
      </View>
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={16} color="#7C3AED" />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { paddingBottom: 40 },

  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#DDD6FE',
  },
  avatarEmoji: { fontSize: 46 },
  verifiedRing: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  name: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4, textAlign: 'center' },
  ownerLabel: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  badgeGreen: { backgroundColor: '#D1FAE5' },
  badgeBlue: { backgroundColor: '#EFF6FF' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, color: '#64748B', marginLeft: 4 },

  servicesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  chipText: { fontSize: 13, color: '#7C3AED', fontWeight: '600' },

  contactRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 14,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  contactBtnCall: { backgroundColor: '#7C3AED' },
  contactBtnEmail: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  contactBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#0F172A', fontWeight: '500', lineHeight: 20 },
  noDetails: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },

  bioCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bioText: { fontSize: 15, color: '#334155', lineHeight: 24 },

  safetyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  safetyText: { flex: 1, fontSize: 13, color: '#6D28D9', lineHeight: 18 },
});