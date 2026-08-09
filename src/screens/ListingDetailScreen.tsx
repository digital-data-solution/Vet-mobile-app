/**
 * ListingDetailScreen — view one marketplace listing.
 *  • Anyone: Share (WhatsApp/etc.), Contact seller (call/WhatsApp), Buy with
 *    Buyer Protection (escrow), Report.
 *  • Owner: Edit, Mark Sold, Boost, Renew, Remove.
 * Xpress Vet only connects buyers & sellers — the disclaimer is always shown.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, Linking, Platform, ScrollView, Share,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getListing, buyListing, reportListing, markListingSold, renewListing,
  removeListing, listingShareUrl, Listing,
} from '../api/market';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';

const ACCENT = '#0F9D58';

interface Props { navigation: any; route: any }

export default function ListingDetailScreen({ navigation, route }: Props) {
  const id: string = route.params?.id;
  const [listing, setListing]   = useState<Listing | null>(null);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading]   = useState(true);
  const [myId, setMyId]         = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);

  const load = useCallback(async () => {
    const res = await getListing(id);
    if (res?.listing) { setListing(res.listing); setDisclaimer(res.disclaimer || ''); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => { if (r.ok) setMyId(r.body?.user?._id || null); }).catch(() => {});
  }, []);

  const seller = listing && typeof listing.seller === 'object' ? listing.seller : null;
  const isMine = !!(myId && seller && seller._id === myId) || route.params?.mine === true;

  const phone    = listing?.contactPhone || seller?.phone || '';
  const whatsapp = listing?.contactWhatsapp || phone;

  const share = async () => {
    if (!listing) return;
    const url = listingShareUrl(listing._id);
    const msg = `${listing.title} — ₦${listing.price.toLocaleString()} on Xpress Vet 🐾\n${url}`;
    try {
      if (Platform.OS === 'web') {
        if ((navigator as any).share) await (navigator as any).share({ title: listing.title, text: msg, url });
        else { await (navigator as any).clipboard.writeText(url); showAlert('Link Copied!', 'Share it anywhere.'); }
      } else {
        await Share.share({ message: msg, url });
      }
    } catch {}
  };

  const call = () => { if (phone) Linking.openURL(`tel:${phone}`).catch(() => {}); };
  const chatWhatsApp = () => {
    const num = whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '234');
    const text = encodeURIComponent(`Hi, I saw your "${listing?.title}" on Xpress Vet. Is it still available?`);
    Linking.openURL(`https://wa.me/${num}?text=${text}`).catch(() =>
      showAlert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.'));
  };

  const buy = () => {
    if (!listing) return;
    showAlert(
      'Buy with Buyer Protection',
      `Pay ₦${listing.price.toLocaleString()} into escrow. Your money is held safely and only released to the seller after you confirm you received "${listing.title}". Xpress Vet is not responsible for the item itself.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Pay into escrow', onPress: doBuy },
      ],
    );
  };
  const doBuy = async () => {
    if (!listing) return;
    setBusy(true);
    const r = await buyListing(listing._id, listing.price);
    setBusy(false);
    if (r.ok) {
      showAlert('Paid into escrow', r.body?.message || 'Release it from your Wallet once you receive the item.', [
        { text: 'Go to Wallet', onPress: () => navigation.navigate('Wallet') },
        { text: 'OK' },
      ]);
    } else if (r.body?.code === 'INSUFFICIENT_FUNDS') {
      showAlert('Add money first', 'Your wallet balance is too low. Add money, then buy.', [
        { text: 'Open Wallet', onPress: () => navigation.navigate('Wallet') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      showAlert('Could not pay', r.body?.message || 'Please try again.');
    }
  };

  const report = () => {
    const reasons: { key: string; label: string }[] = [
      { key: 'scam', label: 'Looks like a scam' },
      { key: 'prohibited', label: 'Prohibited / illegal item' },
      { key: 'animal_welfare', label: 'Animal welfare concern' },
      { key: 'offensive', label: 'Offensive content' },
      { key: 'sold', label: 'Already sold' },
      { key: 'other', label: 'Something else' },
    ];
    showAlert('Report this listing', 'Why are you reporting it?',
      [...reasons.map((r) => ({ text: r.label, onPress: () => doReport(r.key) })), { text: 'Cancel', style: 'cancel' as const }]);
  };
  const doReport = async (reason: string) => {
    if (!listing) return;
    const r = await reportListing(listing._id, reason);
    showAlert(r.ok ? 'Thank you' : 'Error', r.body?.message || (r.ok ? 'Our team will review this.' : 'Please try again.'));
  };

  const doSold = () => showAlert('Mark as sold?', 'This hides the listing from buyers.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Mark sold', onPress: async () => { const r = await markListingSold(id); if (r.ok) load(); showAlert(r.ok ? 'Done' : 'Error', r.body?.message || ''); } },
  ]);
  const doRenew = async () => { const r = await renewListing(id); if (r.ok) load(); showAlert(r.ok ? 'Renewed' : 'Error', r.body?.message || ''); };
  const doRemove = () => showAlert('Remove listing?', 'This deletes its photos and cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { const r = await removeListing(id); if (r.ok) { showAlert('Removed', ''); navigation.goBack(); } else showAlert('Error', r.body?.message || ''); } },
  ]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  if (!listing) return <View style={styles.center}><Text style={styles.muted}>This listing is no longer available.</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Gallery */}
        {listing.images?.length ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {listing.images.map((img, i) => (
              <Image key={i} source={{ uri: img.url }} style={styles.hero} />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.hero, styles.heroEmpty]}><Ionicons name={listing.kind === 'pet' ? 'paw' : 'cube'} size={48} color="#CBD5E1" /></View>
        )}

        <View style={styles.body}>
          <View style={styles.rowBetween}>
            <Text style={styles.price}>₦{listing.price.toLocaleString()}{listing.negotiable ? '  (negotiable)' : ''}</Text>
            {listing.isFeaturedNow && <View style={styles.featured}><Text style={styles.featuredTxt}>★ FEATURED</Text></View>}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.sub}>
            {[listing.category, listing.city, listing.status !== 'active' ? listing.status.toUpperCase() : null].filter(Boolean).join(' · ')}
          </Text>

          {/* Attributes */}
          <View style={styles.attrs}>
            {listing.kind === 'pet' ? (
              <>
                {listing.species && <Attr label="Species" value={listing.species} />}
                {listing.breed && <Attr label="Breed" value={listing.breed} />}
                {listing.ageText && <Attr label="Age" value={listing.ageText} />}
                {listing.sex && <Attr label="Sex" value={listing.sex} />}
              </>
            ) : (
              <>
                {listing.condition && <Attr label="Condition" value={listing.condition} />}
                {typeof listing.quantity === 'number' && <Attr label="Available" value={String(listing.quantity)} />}
              </>
            )}
          </View>

          <Text style={styles.section}>Description</Text>
          <Text style={styles.desc}>{listing.description}</Text>

          {listing.kind === 'pet' && listing.healthInfo ? (
            <>
              <Text style={styles.section}>Health & vaccination</Text>
              <Text style={styles.desc}>{listing.healthInfo}</Text>
            </>
          ) : null}

          {seller && (
            <View style={styles.sellerCard}>
              <Ionicons name="person-circle-outline" size={34} color="#9CA3AF" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.sellerName}>{seller.name || 'Seller'}</Text>
                <Text style={styles.muted}>Seller on Xpress Vet</Text>
              </View>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#92400E" />
            <Text style={styles.disclaimerTxt}>{disclaimer || 'Xpress Vet only connects buyers and sellers. Transact carefully and use Buyer Protection when you can.'}</Text>
          </View>

          <TouchableOpacity onPress={report} style={styles.reportBtn}>
            <Ionicons name="flag-outline" size={15} color="#DC2626" />
            <Text style={styles.reportTxt}>Report this listing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={styles.bar}>
        <TouchableOpacity style={styles.iconBtn} onPress={share}>
          <Ionicons name="share-social-outline" size={20} color={ACCENT} />
          <Text style={styles.iconTxt}>Share</Text>
        </TouchableOpacity>

        {isMine ? (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateListing', { edit: listing })}>
              <Ionicons name="create-outline" size={20} color="#2563EB" /><Text style={styles.iconTxt}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('ListingBoost', { listingId: listing._id })}>
              <Ionicons name="rocket-outline" size={20} color="#F59E0B" /><Text style={styles.iconTxt}>Boost</Text>
            </TouchableOpacity>
            {listing.status === 'expired'
              ? <TouchableOpacity style={styles.primaryBtn} onPress={doRenew}><Text style={styles.primaryTxt}>Renew</Text></TouchableOpacity>
              : <TouchableOpacity style={styles.primaryBtn} onPress={doSold}><Text style={styles.primaryTxt}>Mark Sold</Text></TouchableOpacity>}
            <TouchableOpacity style={styles.iconBtn} onPress={doRemove}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" /><Text style={styles.iconTxt}>Remove</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {!!phone && (
              <TouchableOpacity style={styles.iconBtn} onPress={call}>
                <Ionicons name="call-outline" size={20} color={ACCENT} /><Text style={styles.iconTxt}>Call</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={chatWhatsApp}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" /><Text style={styles.iconTxt}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, busy && { opacity: 0.6 }]} disabled={busy || listing.status !== 'active'} onPress={buy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryTxt}>Buy (Escrow)</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

function Attr({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.attr}>
      <Text style={styles.attrLabel}>{label}</Text>
      <Text style={styles.attrValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', padding: 24 },
  muted: { color: '#9CA3AF', fontSize: 13 },
  hero: { width: 380, maxWidth: 480, height: 300, backgroundColor: '#E5E7EB' },
  heroEmpty: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  body: { backgroundColor: '#fff', margin: 10, borderRadius: 14, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 24, fontWeight: '900', color: ACCENT },
  featured: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  featuredTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 6 },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, textTransform: 'capitalize' },
  attrs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  attr: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  attrLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '700' },
  attrValue: { fontSize: 13, color: '#111827', fontWeight: '600', textTransform: 'capitalize' },
  section: { fontSize: 14, fontWeight: '800', color: '#111827', marginTop: 18, marginBottom: 4 },
  desc: { fontSize: 14, color: '#374151', lineHeight: 21 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 18 },
  sellerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  disclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginTop: 18 },
  disclaimerTxt: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 16 },
  reportTxt: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingVertical: 8, paddingHorizontal: 6, gap: 4 },
  iconBtn: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  iconTxt: { fontSize: 11, color: '#374151', marginTop: 2, fontWeight: '600' },
  primaryBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginLeft: 4 },
  primaryTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
