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

**Effective Date:** June 2026 | **Version:** 2.0

Xpress Vet Marketplace ("Xpress Vet," "we," "us," or "our") is operated by Xpress Digital & Data Solutions Limited (RC: 9112280), Lagos, Nigeria. This Privacy Policy explains how we collect, use, store, and protect your information when you use our mobile app and website.

By using Xpress Vet, you agree to the practices described in this policy.

---

## 1. Information We Collect

### 1.1 Information You Provide (All Users)

- **Account information**: email address and password.
- **Profile information**: name, phone number, profile photo, and your role on the platform (e.g. pet owner, service provider).
- **Location information**: your address (for professional listings) and, where you grant permission, your device GPS coordinates (for "nearby" search features).
- **Communications**: messages sent through our in-app chat feature, and any correspondence with our support team.

### 1.2 Additional Information for Service Providers

When you register as a professional (veterinarian, groomer, trainer, pet sitter, pet transport operator, cremation service, agro-vet supplier, insurance provider, or kennel), we collect:

- **Business information**: business or trading name, address, specialization, contact details, and gallery photos.
- **Professional credentials**: VCN registration number (veterinarians only).
- **Identity and compliance documents**: Government-issued identification number (e.g. National Identification Number — NIN), Bank Verification Number (BVN), international passport number, or driver's licence number; CAC (Corporate Affairs Commission) business registration number; and where applicable, a professional certification number.

**Why we collect identity documents:** Nigerian law and platform safety require us to verify the identity of service providers before they are listed. This protects pet owners from fraudulent or unqualified practitioners. These details are stored securely and only accessed by our authorised admin team for verification purposes. They are never displayed publicly or shared with any third party other than as required by Nigerian law.

### 1.3 Payment Information

When you subscribe, payments are processed by our licensed payment processor. We do not store your card details — they are handled entirely by the payment processor in compliance with applicable security standards.

### 1.4 Information Collected Automatically

- Basic usage data (app interactions, search queries) to improve the Service.
- Device and session information required for authentication and security.

---

## 2. How We Use Your Information

We use your information to:

- Create and manage your account and verify your identity as a service provider.
- Display professional listings to pet owners across Nigeria.
- Enable location-based "nearby" search for pet services.
- Process subscription payments and send related confirmations.
- Enable in-app messaging between pet owners and service providers.
- Send service-related notifications: welcome emails, document submission confirmations, verification outcomes, subscription reminders, and important updates.
- Conduct identity verification of service providers in compliance with Nigerian regulations.
- Respond to support requests and resolve disputes.
- Operate and improve our referral program.
- Comply with applicable Nigerian laws and regulations.

---

## 3. Data Sharing & Third-Party Processors

We do not sell your personal data. We share only the minimum necessary information with carefully selected service providers who help us operate the platform — covering areas such as:

- Secure user authentication and account management
- Encrypted data storage
- Profile photo and media hosting
- Payment processing (licensed and regulated)
- Transactional email delivery
- Address-to-coordinates mapping for location features

Each of these providers operates under strict data processing agreements and is bound by their own security and privacy standards. We do not disclose their identities publicly as part of our operational security practices. You may contact us at **support@xpressvetmarketplace.com** for more information about our sub-processors.

---

## 4. Identity Document Data — Special Notice

For service provider accounts, we collect sensitive identity data (NIN, BVN, CAC numbers, etc.). By submitting this information, you confirm that:

- The information is accurate and belongs to you.
- You consent to Xpress Digital & Data Solutions Limited storing and using it solely for identity verification purposes.
- You understand this data is visible only to our authorised admin team.
- It will be retained for as long as your professional account is active, and deleted within 90 days of account closure unless we are required by law to retain it longer.

Under the Nigeria Data Protection Act (NDPA) 2023, you have the right to access, correct, or request deletion of this data at any time by contacting us.

---

## 5. How We Protect Your Information

- Passwords are never stored in plain text — they are managed by our authentication provider.
- All data in transit is encrypted via HTTPS/TLS.
- Sensitive identity documents are stored in a restricted-access database accessible only to authorised administrators.
- Payment card details are never stored on our servers.
- We conduct periodic security reviews of our data handling practices.

---

## 6. Your Rights Under the NDPA 2023

Under the Nigeria Data Protection Act (NDPA) 2023, you have the right to:

- **Access** the personal data we hold about you.
- **Correct** inaccurate or incomplete information (via your Profile settings or by contacting us).
- **Request deletion** of your account and associated personal data.
- **Withdraw consent** for location-based features at any time via your device settings.
- **Object** to certain uses of your data.
- **Data portability**: request a copy of your data in a structured format.

To exercise any of these rights, contact us at **support@xpressvetmarketplace.com**. We will respond within 30 days.

---

## 7. Data Retention

- **Active accounts**: We retain your information for as long as your account remains active.
- **Deleted accounts**: Personal data is deleted or anonymised within 90 days of account closure, except where retention is required by Nigerian law.
- **Identity documents**: Retained for the duration of your professional account and for up to 6 months after closure for compliance and dispute-resolution purposes.

---

## 8. Location Data

If you grant location permissions, we use your device's GPS coordinates only to power "nearby" search features. We do not share or sell location data. You can disable location access at any time through your device settings.

---

## 9. Children's Privacy

Xpress Vet is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children.

---

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. Significant changes will be communicated via email or an in-app notice at least 7 days before taking effect. Continued use of the Service after the effective date constitutes acceptance.

---

## 11. Contact & Data Requests

**Email:** support@xpressvetmarketplace.com
**Data Protection enquiries:** support@xpressvetmarketplace.com (mark subject: "Data Request")
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
