/**
 * JobPostingDetailScreen — view one job board posting.
 *  • Anyone: Share, Contact poster (call/WhatsApp), Report.
 *  • Owner: Edit, Boost, Mark Filled, Renew, Remove.
 * Off-platform contact only — no in-app application/CV flow (see api/jobBoard.ts).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Linking, Platform, ScrollView, Share,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getJobPosting, reportJobPosting, markJobFilled, renewJobPosting,
  removeJobPosting, boostJobPosting, jobPostingShareUrl, getJobBoardMeta, JobPosting,
} from '../api/jobBoard';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { storePaystackCallbacks } from '../utils/paystackCallbackStore';

const ACCENT = '#2563EB';

const ROLE_LABELS: Record<string, string> = {
  vet: 'Veterinarian', vet_tech: 'Vet Tech', groomer: 'Groomer', trainer: 'Trainer',
  pet_sitter: 'Pet Sitter', receptionist: 'Receptionist', kennel_assistant: 'Kennel Assistant',
  driver: 'Driver', sales_rep: 'Sales Rep', manager: 'Manager', other: 'Other',
};
const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time', part_time: 'Part-time', locum: 'Locum', contract: 'Contract',
};

interface Props { navigation: any; route: any }

export default function JobPostingDetailScreen({ navigation, route }: Props) {
  const id: string = route.params?.id;
  const [posting, setPosting]       = useState<JobPosting | null>(null);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading]       = useState(true);
  const [myId, setMyId]             = useState<string | null>(null);
  const [boosting, setBoosting]     = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await getJobPosting(id);
    if (res?.posting) { setPosting(res.posting); setDisclaimer(res.disclaimer || ''); }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiFetch('/api/auth/me').then((r) => { if (r.ok) setMyId(r.body?.user?._id || null); }).catch(() => {});
  }, []);

  const poster = posting && typeof posting.poster === 'object' ? posting.poster : null;
  const isMine = !!(myId && poster && poster._id === myId) || route.params?.mine === true;

  const phone    = posting?.contactPhone || poster?.phone || '';
  const whatsapp = posting?.contactWhatsapp || phone;

  const share = async () => {
    if (!posting) return;
    const url = jobPostingShareUrl(posting._id);
    const msg = `${posting.title} — on Xpress Vet Job Board 🐾\n${url}`;
    try {
      if (Platform.OS === 'web') {
        if ((navigator as any).share) await (navigator as any).share({ title: posting.title, text: msg, url });
        else { await (navigator as any).clipboard.writeText(url); showAlert('Link Copied!', 'Share it anywhere.'); }
      } else {
        await Share.share({ message: msg, url });
      }
    } catch {}
  };

  const call = () => { if (phone) Linking.openURL(`tel:${phone}`).catch(() => {}); };
  const chatWhatsApp = () => {
    const num = whatsapp.replace(/[^0-9]/g, '').replace(/^0/, '234');
    const text = encodeURIComponent(`Hi, I saw your "${posting?.title}" posting on Xpress Vet Job Board.`);
    Linking.openURL(`https://wa.me/${num}?text=${text}`).catch(() =>
      showAlert('WhatsApp', 'Could not open WhatsApp. Make sure it is installed.'));
  };

  const report = () => {
    const reasons: { key: string; label: string }[] = [
      { key: 'scam', label: 'Looks like a scam' },
      { key: 'fake_job', label: 'Fake or misleading job' },
      { key: 'discriminatory', label: 'Discriminatory content' },
      { key: 'offensive', label: 'Offensive content' },
      { key: 'filled', label: 'Already filled' },
      { key: 'other', label: 'Something else' },
    ];
    showAlert('Report this posting', 'Why are you reporting it?',
      [...reasons.map((r) => ({ text: r.label, onPress: () => doReport(r.key) })), { text: 'Cancel', style: 'cancel' as const }]);
  };
  const doReport = async (reason: string) => {
    if (!posting) return;
    const r = await reportJobPosting(posting._id, reason);
    showAlert(r.ok ? 'Thank you' : 'Error', r.body?.message || (r.ok ? 'Our team will review this.' : 'Please try again.'));
  };

  const doFilled = () => showAlert('Mark as filled?', 'This hides the posting from the board.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Mark filled', onPress: async () => { const r = await markJobFilled(id); if (r.ok) load(); showAlert(r.ok ? 'Done' : 'Error', r.body?.message || ''); } },
  ]);
  const doRenew = async () => { const r = await renewJobPosting(id); if (r.ok) load(); showAlert(r.ok ? 'Renewed' : 'Error', r.body?.message || ''); };
  const doRemove = () => showAlert('Remove posting?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: async () => { const r = await removeJobPosting(id); if (r.ok) { showAlert('Removed', ''); navigation.goBack(); } else showAlert('Error', r.body?.message || ''); } },
  ]);

  const openPaystack = (authorization_url: string, reference: string, amount: number) => {
    const callbackKey = `paystack_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    storePaystackCallbacks(callbackKey, {
      onSuccess: () => { showAlert('Posting Boosted!', 'Your posting now shows at the top of the board.'); load(); },
      onCancel: () => {},
    });
    const params = { authorization_url, reference, amount, callbackKey };
    const parent = navigation.getParent();
    if (typeof parent?.navigate === 'function') parent.navigate('PaystackWebView', params);
    else navigation.navigate('PaystackWebView', params);
  };

  const doBoost = async () => {
    const meta = await getJobBoardMeta();
    const packages = meta?.boost?.packages || [];
    if (!packages.length) return showAlert('Error', 'Boost pricing unavailable right now.');
    showAlert('Boost this posting', 'Featured postings appear at the top of the board.', [
      ...packages.map((p) => ({
        text: `${p.label} — ₦${p.price.toLocaleString()}`,
        onPress: async () => {
          setBoosting(p.days);
          const r = await boostJobPosting(id, p.days);
          setBoosting(null);
          if (r.ok && r.body?.data?.authorization_url) {
            const { authorization_url, reference, amount } = r.body.data;
            openPaystack(authorization_url, reference, amount);
          } else {
            showAlert('Error', r.body?.message || 'Could not start boost payment.');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={ACCENT} /></View>;
  if (!posting) return <View style={styles.center}><Text style={styles.muted}>This posting is no longer available.</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.body}>
          <View style={styles.rowBetween}>
            <View style={styles.roleBadge}>
              <Ionicons name={posting.kind === 'position' ? 'briefcase' : 'person'} size={14} color={ACCENT} />
              <Text style={styles.roleBadgeTxt}>{ROLE_LABELS[posting.roleCategory || ''] || 'General'}</Text>
            </View>
            {posting.isFeaturedNow && <View style={styles.featured}><Text style={styles.featuredTxt}>★ FEATURED</Text></View>}
          </View>
          <Text style={styles.title}>{posting.title}</Text>
          <Text style={styles.sub}>
            {[posting.employmentType && EMPLOYMENT_LABELS[posting.employmentType], posting.city, posting.status !== 'active' ? posting.status.toUpperCase() : null].filter(Boolean).join(' · ')}
          </Text>

          <View style={styles.attrs}>
            {posting.experienceText && <Attr label="Experience" value={posting.experienceText} />}
            {posting.salaryText && <Attr label="Pay" value={posting.salaryText} />}
          </View>

          <Text style={styles.section}>Description</Text>
          <Text style={styles.desc}>{posting.description}</Text>

          {poster && (
            <View style={styles.posterCard}>
              <Ionicons name="person-circle-outline" size={34} color="#9CA3AF" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.posterName}>{poster.name || 'Poster'}</Text>
                <Text style={styles.muted}>{posting.kind === 'position' ? 'Verified on Xpress Vet' : 'Candidate on Xpress Vet'}</Text>
              </View>
            </View>
          )}

          <View style={styles.disclaimer}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#92400E" />
            <Text style={styles.disclaimerTxt}>{disclaimer || 'Xpress Vet only connects job posters and candidates. Verify credentials directly before hiring or accepting a role.'}</Text>
          </View>

          <TouchableOpacity onPress={report} style={styles.reportBtn}>
            <Ionicons name="flag-outline" size={15} color="#DC2626" />
            <Text style={styles.reportTxt}>Report this posting</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.bar}>
        <TouchableOpacity style={styles.iconBtn} onPress={share}>
          <Ionicons name="share-social-outline" size={20} color={ACCENT} />
          <Text style={styles.iconTxt}>Share</Text>
        </TouchableOpacity>

        {isMine ? (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateJobPosting', { edit: posting })}>
              <Ionicons name="create-outline" size={20} color="#2563EB" /><Text style={styles.iconTxt}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={doBoost} disabled={boosting !== null}>
              {boosting !== null ? <ActivityIndicator color="#F59E0B" size="small" /> : <Ionicons name="rocket-outline" size={20} color="#F59E0B" />}
              <Text style={styles.iconTxt}>Boost</Text>
            </TouchableOpacity>
            {posting.status === 'expired'
              ? <TouchableOpacity style={styles.primaryBtn} onPress={doRenew}><Text style={styles.primaryTxt}>Renew</Text></TouchableOpacity>
              : <TouchableOpacity style={styles.primaryBtn} onPress={doFilled}><Text style={styles.primaryTxt}>Mark Filled</Text></TouchableOpacity>}
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
            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={chatWhatsApp}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.primaryTxt}>  WhatsApp</Text>
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
  body: { backgroundColor: '#fff', margin: 10, borderRadius: 14, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  roleBadgeTxt: { fontSize: 12, fontWeight: '700', color: ACCENT },
  featured: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  featuredTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  title: { fontSize: 20, fontWeight: '900', color: '#111827', marginTop: 10 },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 4, textTransform: 'capitalize' },

  attrs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  attr: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: '45%' },
  attrLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  attrValue: { fontSize: 13, color: '#111827', fontWeight: '700', marginTop: 2 },

  section: { fontSize: 14, fontWeight: '800', color: '#111827', marginTop: 18, marginBottom: 6 },
  desc: { fontSize: 14, color: '#374151', lineHeight: 21 },

  posterCard: { flexDirection: 'row', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  posterName: { fontSize: 14, fontWeight: '700', color: '#111827' },

  disclaimer: { flexDirection: 'row', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginTop: 16 },
  disclaimerTxt: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },

  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 16 },
  reportTxt: { fontSize: 12, color: '#DC2626', fontWeight: '600' },

  bar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'center' },
  iconBtn: { alignItems: 'center', paddingHorizontal: 6 },
  iconTxt: { fontSize: 10, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  primaryBtn: { flex: 1, flexDirection: 'row', backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  primaryTxt: { color: '#fff', fontWeight: '900', fontSize: 14 },
});
