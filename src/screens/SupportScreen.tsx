import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = { navigation: NativeStackNavigationProp<any> };

// ─────────────────────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────────────────────

const CONTENT = `
## Frequently Asked Questions

### How do I create an account?

Download the app or visit xpressvetmarketplace.com, tap "Sign Up," and enter your email and password. You'll receive a confirmation email — click the link to verify your account.

### I didn't receive my verification email. What do I do?

Check your spam/promotions folder. If you still don't see it, contact us at support@xpressvetmarketplace.com with the email address you signed up with.

### How do I list my veterinary practice?

Go to **Profile → Register as Veterinarian**, fill in your details including your VCN registration number, and submit. Our team will review and verify your listing within 2–3 business days.

### I don't have a clinic — can I still list myself?

Yes! You can list yourself as an ambulatory/mobile veterinarian using your service address.

### How do subscriptions work?

Some features (full contact details, exact addresses, GPS "nearby" search, and messaging) require an active subscription. You can subscribe from **Profile → Subscription**. Payments are processed securely via Paystack.

### How do I cancel my subscription?

Go to **Profile → Subscription** and tap "Cancel Subscription." You'll keep access until the end of your current billing period.

### My payment didn't go through or my subscription is stuck on "pending."

Bank transfers can take a few minutes to confirm. If it's been longer than 30 minutes, go to **Subscription** and tap "Cancel & Start Over" to try again. If money was deducted but your subscription still isn't active, contact support with your payment reference.

### How does the referral program work?

Find your unique referral code under **Profile → Refer & Earn**. Share it with friends — when they subscribe for the first time, they get a discount, and you earn a free month added to your subscription.

### How do I delete my account?

Contact us at support@xpressvetmarketplace.com and we'll process your deletion request in line with our Privacy Policy.

### I found incorrect or suspicious information on a listing.

Please report it to support@xpressvetmarketplace.com with details, and we'll investigate.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer
// ─────────────────────────────────────────────────────────────────────────────

function inlineParse(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.*?)\*\*/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<Text key={m.index} style={{ fontWeight: '700' }}>{m[1]}</Text>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 1 ? <>{parts}</> : text;
}

function renderMd(content: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let key = 0;
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    if (line === '---') {
      out.push(<View key={key++} style={md.hr} />);
    } else if (line.startsWith('### ')) {
      out.push(<Text key={key++} style={md.h3}>{inlineParse(line.slice(4))}</Text>);
    } else if (line.startsWith('## ')) {
      out.push(<Text key={key++} style={md.h2}>{inlineParse(line.slice(3))}</Text>);
    } else if (line.startsWith('# ')) {
      out.push(<Text key={key++} style={md.h1}>{inlineParse(line.slice(2))}</Text>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      out.push(
        <View key={key++} style={md.li}>
          <Text style={md.bullet}>•</Text>
          <Text style={md.liText}>{inlineParse(line.slice(2))}</Text>
        </View>,
      );
    } else {
      out.push(<Text key={key++} style={md.p}>{inlineParse(line)}</Text>);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SupportScreen({ navigation }: Props) {
  const openEmail = () =>
    Linking.openURL('mailto:support@xpressvetmarketplace.com?subject=Xpress%20Vet%20Support');

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Support / Help</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contact card */}
        <View style={styles.contactCard}>
          <Text style={styles.contactEmoji}>📧</Text>
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactBody}>
            We aim to respond within 1–2 business days.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.emailBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={openEmail}
          >
            <Text style={styles.emailBtnText}>support@xpressvetmarketplace.com</Text>
          </Pressable>
        </View>

        {/* FAQ */}
        <View style={styles.faqCard}>
          {renderMd(CONTENT)}
        </View>

        {/* Legal links */}
        <View style={styles.legalRow}>
          <Pressable
            onPress={() => navigation.navigate('PrivacyPolicy')}
            style={({ pressed }) => [styles.legalLink, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable
            onPress={() => navigation.navigate('Terms')}
            style={({ pressed }) => [styles.legalLink, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.legalLinkText}>Terms & Conditions</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown styles
// ─────────────────────────────────────────────────────────────────────────────

const md = StyleSheet.create({
  h1:     { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 8, marginBottom: 6 },
  h2:     { fontSize: 16, fontWeight: '700', color: '#6B7280', marginTop: 4, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  h3:     { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 18, marginBottom: 4 },
  p:      { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 6 },
  hr:     { height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 },
  li:     { flexDirection: 'row', marginBottom: 6, paddingLeft: 4 },
  bullet: { fontSize: 14, color: '#6B7280', marginRight: 8, marginTop: 1 },
  liText: { fontSize: 14, color: '#374151', lineHeight: 22, flex: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Screen styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   '#E8610A',
    paddingTop:        52,
    paddingBottom:     16,
    paddingHorizontal: 16,
  },
  backBtn:     { width: 60 },
  backText:    { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  contactCard: {
    backgroundColor: '#fff',
    borderRadius:    14,
    padding:         20,
    alignItems:      'center',
    marginBottom:    14,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  contactEmoji: { fontSize: 40, marginBottom: 10 },
  contactTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 6 },
  contactBody:  { fontSize: 14, color: '#6B7280', marginBottom: 14, textAlign: 'center' },
  emailBtn: {
    backgroundColor:   '#E8610A',
    borderRadius:      10,
    paddingVertical:   12,
    paddingHorizontal: 20,
  },
  emailBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  faqCard: {
    backgroundColor: '#fff',
    borderRadius:    14,
    padding:         20,
    marginBottom:    14,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },

  legalRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    marginTop:      4,
    marginBottom:   12,
  },
  legalLink:     { paddingHorizontal: 8, paddingVertical: 6 },
  legalLinkText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
  legalDot:      { color: '#9CA3AF', fontSize: 13 },
});
