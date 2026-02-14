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

interface Shop {
  shopName?: string;
  businessName?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  address?: string | { city?: string; town?: string; full?: string };
  description?: string;
  distance?: number;
}

export default function ShopProfileScreen({ route }: any) {
  const shop: Shop = route.params?.shop ?? {};

  const displayName = shop.shopName ?? shop.businessName ?? shop.ownerName ?? 'Pet Shop';

  const getAddress = (): string => {
    if (typeof shop.address === 'string') return shop.address;
    return shop.address?.full ?? shop.address?.city ?? shop.address?.town ?? '';
  };

  const callShop = () => {
    if (!shop.phone) return;
    Linking.openURL(`tel:${shop.phone}`).catch(() =>
      Alert.alert('Error', 'Unable to open phone app')
    );
  };

  const emailShop = () => {
    if (!shop.email) return;
    Linking.openURL(`mailto:${shop.email}`).catch(() =>
      Alert.alert('Error', 'Unable to open mail app')
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🛒</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        {shop.distance != null ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{shop.distance.toFixed(1)} km away</Text>
          </View>
        ) : null}
      </View>

      {/* Contact actions */}
      {(shop.phone || shop.email) ? (
        <View style={styles.contactRow}>
          {shop.phone ? (
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnCall]} onPress={callShop}>
              <Text style={styles.contactBtnText}>📞 Call</Text>
            </TouchableOpacity>
          ) : null}
          {shop.email ? (
            <TouchableOpacity style={[styles.contactBtn, styles.contactBtnEmail]} onPress={emailShop}>
              <Text style={[styles.contactBtnText, styles.contactBtnEmailText]}>✉️ Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>Details</Text>
        {shop.ownerName ? (
          <DetailRow icon="👤" label="Owner" value={shop.ownerName} />
        ) : null}
        {getAddress() ? (
          <DetailRow icon="📍" label="Location" value={getAddress()} />
        ) : null}
        {shop.phone ? (
          <DetailRow icon="📞" label="Phone" value={shop.phone} />
        ) : null}
        {shop.email ? (
          <DetailRow icon="✉️" label="Email" value={shop.email} />
        ) : null}
      </View>

      {/* Description */}
      {shop.description ? (
        <View style={styles.bioCard}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.bioText}>{shop.description}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingBottom: 40 },
  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FED7AA',
  },
  avatarEmoji: { fontSize: 42 },
  name: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 10 },
  badge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  badgeText: { fontSize: 12, color: '#C2410C', fontWeight: '700' },
  contactRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  contactBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  contactBtnCall: { backgroundColor: '#F97316' },
  contactBtnEmail: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  contactBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  contactBtnEmailText: { color: '#111827' },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailIcon: { fontSize: 16, width: 28, marginTop: 1 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
  bioCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bioText: { fontSize: 15, color: '#374151', lineHeight: 24 },
});