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
# Privacy Policy

**Effective Date:** June 2026

Xpress Vet Marketplace ("Xpress Vet," "we," "us," or "our") is operated by Xpress Digital & Data Solutions Limited (RC: 9112280), Lagos, Nigeria. This Privacy Policy explains how we collect, use, store, and protect your information when you use our mobile app and website.

By using Xpress Vet, you agree to the practices described in this policy.

---

## 1. Information We Collect

### 1.1 Information You Provide

- **Account information**: name, email address, phone number, password (managed securely via Supabase Authentication).
- **Profile information**: profile photo, role (pet owner, veterinarian, kennel owner, shop owner).
- **Professional listing information** (for vets, kennels, shops): business name, address, specialization, VCN registration number, contact details, gallery photos.
- **Location information**: your address (for professional listings) and, where you grant permission, your device's GPS location (for "nearby" search features).
- **Payment information**: when you subscribe, payments are processed by Paystack. We do not store your card details.
- **Communications**: messages you send through our in-app chat feature, and any correspondence with our support team.

### 1.2 Information Collected Automatically

- Basic usage data (app interactions, search queries) to improve the Service.
- Device and session information needed for authentication and security.

---

## 2. How We Use Your Information

We use your information to:

- Create and manage your account.
- Display professional listings (vets, kennels, shops) to pet owners.
- Enable location-based search ("nearby" features).
- Process subscription payments and send related confirmations.
- Enable in-app messaging between pet owners and professionals.
- Send service-related emails (welcome, subscription confirmations, expiry reminders, verification updates).
- Verify veterinarian credentials (VCN numbers) for trust and safety.
- Respond to support requests and improve our Service.
- Operate our referral program.

---

## 3. Third-Party Services We Use

We work with the following providers, who may process your data on our behalf:

- **Supabase** — User authentication and account management
- **MongoDB** — Storing app data (profiles, listings, subscriptions)
- **Cloudinary** — Hosting profile photos and gallery images
- **Paystack** — Processing subscription payments
- **Resend** — Sending transactional emails
- **OpenStreetMap (Nominatim)** — Converting addresses to map coordinates

These providers are bound by their own privacy and security policies. We only share the minimum information necessary.

---

## 4. How We Protect Your Information

- Passwords are managed and encrypted by Supabase Authentication — we never store plain-text passwords.
- Data is transmitted using HTTPS encryption.
- Access to user data is restricted to authorized personnel only.
- Payment card details are never stored on our servers — Paystack handles this in compliance with PCI-DSS standards.

---

## 5. Your Rights

Under the Nigeria Data Protection Act (NDPA) 2023, you have the right to:

- **Access** the personal data we hold about you.
- **Correct** inaccurate or incomplete information (via your Profile settings).
- **Request deletion** of your account and associated data.
- **Withdraw consent** for location-based features at any time (via your device settings).
- **Object** to certain uses of your data.

To exercise any of these rights, contact us at **support@xpressvetmarketplace.com**.

---

## 6. Data Retention

We retain your information for as long as your account is active. If you delete your account, we will delete or anonymize your personal data within a reasonable period, except where required by law.

---

## 7. Children's Privacy

Xpress Vet is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.

---

## 8. Location Data

If you grant location permissions, we use your device's GPS coordinates only to power "nearby" search features. You can disable location access at any time through your device settings.

---

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. We will notify users of significant changes via email or an in-app notice.

---

## 10. Contact Us

**Email:** support@xpressvetmarketplace.com
**Company:** Xpress Digital & Data Solutions Limited (RC: 9112280)
**Location:** Lagos, Nigeria
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
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
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

export default function PrivacyPolicyScreen({ navigation }: Props) {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderMd(CONTENT)}

        <Pressable
          onPress={() => Linking.openURL('mailto:support@xpressvetmarketplace.com')}
          style={styles.contactBtn}
        >
          <Text style={styles.contactBtnText}>Email support@xpressvetmarketplace.com</Text>
        </Pressable>

        <Text style={styles.footer}>
          © {new Date().getFullYear()} Xpress Digital & Data Solutions Limited
        </Text>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown styles
// ─────────────────────────────────────────────────────────────────────────────

const md = StyleSheet.create({
  h1:     { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 8, marginBottom: 6 },
  h2:     { fontSize: 17, fontWeight: '700', color: '#1D4ED8', marginTop: 22, marginBottom: 6 },
  h3:     { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 14, marginBottom: 4 },
  p:      { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 8 },
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
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    backgroundColor:  '#2563EB',
    paddingTop:       52,
    paddingBottom:    16,
    paddingHorizontal: 16,
  },
  backBtn:      { width: 60 },
  backText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle:  { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },

  scroll:   { flex: 1 },
  content:  {
    backgroundColor:    '#fff',
    margin:             16,
    borderRadius:       14,
    padding:            20,
    paddingBottom:      32,
    shadowColor:        '#000',
    shadowOffset:       { width: 0, height: 1 },
    shadowOpacity:      0.06,
    shadowRadius:       4,
    elevation:          2,
  },

  contactBtn: {
    marginTop:         20,
    backgroundColor:   '#EFF6FF',
    borderWidth:       1,
    borderColor:       '#BFDBFE',
    borderRadius:      10,
    paddingVertical:   12,
    paddingHorizontal: 16,
    alignItems:        'center',
  },
  contactBtnText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },

  footer: {
    marginTop:  16,
    fontSize:   12,
    color:      '#9CA3AF',
    textAlign:  'center',
    lineHeight: 18,
  },
});
