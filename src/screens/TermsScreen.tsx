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
# Terms & Conditions

**Effective Date:** June 2026

Welcome to Xpress Vet Marketplace ("Xpress Vet," "we," "us," or "our"), operated by Xpress Digital & Data Solutions Limited (RC: 9112280), Lagos, Nigeria. By creating an account or using our mobile app or website, you agree to these Terms. If you do not agree, please do not use the Service.

---

## 1. What Xpress Vet Is

Xpress Vet is a **directory and discovery platform** that connects pet owners with veterinarians, kennels, and pet shops across Nigeria. We help users find, view, and contact professionals listed on our platform.

**Xpress Vet is not a veterinary clinic, medical provider, or employer of any listed professional.** We do not provide veterinary advice, diagnoses, or treatment, and we are not a party to any agreement, appointment, or transaction between a pet owner and a listed professional.

---

## 2. Account Registration

- You must provide accurate, current information when creating an account.
- You are responsible for maintaining the confidentiality of your account credentials.
- You must be at least 18 years old to create an account.
- One account per person. You may not impersonate another person or entity.

---

## 3. Professional Listings & Verification

- Veterinarians may submit their VCN registration number for verification. A "Verified" badge indicates that Xpress Vet has reviewed the submitted VCN number — **it does not constitute an endorsement or guarantee of any professional's competence.**
- Kennel and shop listings are reviewed for basic completeness but may not undergo the same verification process.
- Professionals are solely responsible for the accuracy of their listing information.
- Xpress Vet reserves the right to approve, reject, suspend, or remove any listing at its discretion.

---

## 4. Subscriptions & Payments

- Certain features require an active paid subscription.
- Subscription fees are billed monthly via **Paystack** in Nigerian Naira (₦), as displayed in the app at the time of purchase.
- Subscriptions automatically renew each month unless cancelled. You may cancel anytime from **Profile → Subscription**.
- We do not provide refunds for partial subscription periods, except where required by law.
- Prices are subject to change with reasonable advance notice.

---

## 5. Referral Program

- Users may share a unique referral code. When a referred user subscribes for the first time, the referred user may receive a discount, and the referrer may receive a free subscription extension, as described in the app.
- Xpress Vet reserves the right to modify, suspend, or terminate the referral program, or to deny rewards in cases of suspected abuse (e.g., fake accounts, self-referrals).

---

## 6. In-App Messaging

- The messaging feature is intended for legitimate communication between pet owners and professionals.
- You agree not to use messaging for spam, harassment, or any unlawful purpose.
- We reserve the right to monitor messages for safety and fraud prevention, and to suspend accounts that violate this section.

---

## 7. User Conduct

You agree not to:

- Provide false or misleading information in your profile or listings.
- Use the Service for any unlawful purpose.
- Attempt to access other users' accounts or data without authorization.
- Scrape, copy, or redistribute listings or data from the Service without permission.
- Upload offensive, defamatory, or inappropriate content.

We reserve the right to suspend or terminate accounts that violate these rules.

---

## 8. Disclaimers

- **No medical advice**: Information on Xpress Vet is for informational purposes only and does not constitute veterinary or medical advice. Always consult a qualified veterinarian for advice regarding your pet's health.
- **No guarantee of availability**: We do not guarantee that any listed professional will respond to inquiries or be available at any given time.
- **"As is" basis**: The Service is provided "as is" and "as available," without warranties of any kind.

---

## 9. Limitation of Liability

To the fullest extent permitted by Nigerian law, Xpress Digital & Data Solutions Limited shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.

Our total liability for any claim shall not exceed the amount you paid us in subscription fees in the 3 months preceding the claim.

---

## 10. Termination

You may delete your account at any time. We may suspend or terminate your access to the Service if you violate these Terms or engage in fraudulent activity.

---

## 11. Changes to These Terms

We may update these Terms from time to time. Significant changes will be communicated via email or an in-app notice. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.

---

## 12. Governing Law

These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.

---

## 13. Contact Us

**Email:** support@xpressvetmarketplace.com
**Company:** Xpress Digital & Data Solutions Limited (RC: 9112280)
**Location:** Lagos, Nigeria
`;

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer (shared pattern across legal screens)
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

export default function TermsScreen({ navigation }: Props) {
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    backgroundColor:   '#2563EB',
    paddingTop:        52,
    paddingBottom:     16,
    paddingHorizontal: 16,
  },
  backBtn:      { width: 60 },
  backText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerTitle:  { color: '#fff', fontSize: 17, fontWeight: '700', textAlign: 'center' },

  scroll:   { flex: 1 },
  content:  {
    backgroundColor:   '#fff',
    margin:            16,
    borderRadius:      14,
    padding:           20,
    paddingBottom:     32,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 1 },
    shadowOpacity:     0.06,
    shadowRadius:      4,
    elevation:         2,
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
