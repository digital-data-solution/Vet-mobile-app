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

**Effective Date:** June 2026 | **Version:** 2.0

Welcome to Xpress Vet Marketplace ("Xpress Vet," "we," "us," or "our"), operated by Xpress Digital & Data Solutions Limited (RC: 9112280), Lagos, Nigeria. By creating an account or using our mobile app or website, you agree to these Terms in full. If you do not agree, please do not use the Service.

---

## 1. Nature of the Platform — Please Read Carefully

Xpress Vet is a **marketplace directory and discovery platform only**. We connect pet owners with independent service providers — veterinarians, kennel operators, groomers, pet trainers, pet sitters, pet transport operators, cremation services, agro-vet suppliers, and insurance providers.

**Xpress Vet is NOT:**
- A veterinary clinic or medical provider
- An employer or agent of any listed service provider
- A party to any agreement, booking, or transaction between a pet owner and a service provider
- Responsible for the quality, safety, or outcome of any service rendered

All service providers on this platform are **independent contractors or businesses**. Any service you receive is governed solely by your agreement with that provider — not with Xpress Vet.

---

## 2. Account Registration

- You must provide accurate, current information when creating an account.
- You are responsible for maintaining the confidentiality of your account credentials.
- You must be at least 18 years old to create an account.
- One account per person. You may not impersonate another person or entity.
- You are responsible for all activity that occurs under your account.

---

## 3. Service Provider Listings & Verification

### 3a. Veterinarians
Veterinarians may submit their VCN (Veterinary Council of Nigeria) registration number for verification. A "Verified" badge indicates we have reviewed the submitted VCN number. **This does not guarantee the vet's competence or the quality of their services.**

### 3b. Insurance Providers
Insurance providers undergo admin review and must receive explicit approval before appearing on the platform. A "Verified" badge confirms admin review only — not endorsement.

### 3c. Other Service Providers (Groomers, Trainers, Pet Sitters, Transport Operators, Cremation Services, Agro-Vet Suppliers, Kennels)
These providers are required to submit identification documents (such as a National Identification Number, CAC registration, or professional certification) upon registration. Submission of documents does not constitute a guarantee of fitness, safety, or professionalism.

**We strongly advise pet owners to:**
- Ask for proof of qualifications before engaging any service provider
- Agree on the scope and terms of any service in writing
- Never hand over your pet or pay without establishing clear communication and agreement

### 3d. General
- Professionals are solely responsible for the accuracy of their listing information.
- Xpress Vet reserves the right to approve, reject, suspend, or remove any listing at its sole discretion.
- Verification status may be revoked at any time if fraud or misconduct is discovered.

---

## 4. Liability Disclaimer for Service Outcomes

**READ THIS SECTION CAREFULLY — IT AFFECTS YOUR LEGAL RIGHTS.**

By using Xpress Vet to find and contact a service provider, you acknowledge and agree that:

- **Animal harm or death**: Xpress Vet is not liable for any injury, illness, or death of a pet caused by a service provider found on this platform. Any claim for harm must be made directly against the service provider.
- **Pet transport**: If a pet transport provider fails to deliver your pet, abandons your pet, or causes harm during transport, your recourse is solely against that provider. Xpress Vet does not supervise, insure, or guarantee transport services.
- **Incomplete or unsatisfactory services**: If a groomer, trainer, sitter, or any other provider does not complete the agreed service or performs it negligently, that is a matter between you and the provider.
- **Financial loss**: Xpress Vet is not responsible for any money paid to a service provider that is not returned, lost, or misappropriated.
- **Cremation services**: The handling of deceased pets is the sole responsibility of the cremation service provider. Xpress Vet does not oversee or guarantee the dignity, completeness, or delivery of cremation services.

We strongly recommend that pet owners:
- Use escrow or secure payment methods where possible
- Request a written service agreement before any service
- Take photos/videos of your pet before handover
- Avoid sharing home addresses with new providers until trust is established

---

## 5. Service Provider Obligations

By registering as a service provider on Xpress Vet, you agree that:

- All information in your profile is accurate and up to date.
- You will provide services in a professional, safe, and lawful manner.
- You will not misrepresent your qualifications, certifications, or experience.
- You are solely responsible for any harm, loss, or damage caused to a pet or pet owner while rendering services.
- You will not use the platform to engage in fraud, deception, or any criminal activity.
- You will comply with all applicable Nigerian laws and regulations governing your service type.
- Xpress Vet may remove your profile and suspend your account if misconduct is reported and substantiated.

---

## 6. Document Verification for Service Providers

As part of our commitment to platform safety, we require service providers to submit identification documents during onboarding:

- **All providers**: National Identification Number (NIN), Bank Verification Number (BVN), or valid government-issued photo ID
- **Business providers** (transport, cremation, agro-vet, insurance): CAC Registration Number or business licence
- **Vets**: VCN Registration Number (verified directly)
- **Groomers & Trainers**: Professional certification number (where applicable)

Submission of these documents is a condition of listing on the platform. Providing false documents is grounds for immediate removal and may be reported to the appropriate authorities.

---

## 7. Subscriptions & Payments

- Certain features require an active paid subscription.
- Subscription fees are billed monthly via **Paystack** in Nigerian Naira (₦), as displayed in the app at the time of purchase.
- Subscriptions automatically renew each month unless cancelled. You may cancel anytime from **Profile → Subscription**.
- We do not provide refunds for partial subscription periods, except where required by law.
- Prices are subject to change with reasonable advance notice.

---

## 8. Referral Program

- Users may share a unique referral code. When a referred user subscribes for the first time, the referrer may receive a free subscription extension as described in the app.
- Xpress Vet reserves the right to modify or terminate the referral program, or deny rewards in cases of suspected abuse (e.g., fake accounts, self-referrals).

---

## 9. In-App Messaging & WhatsApp

- The messaging feature is intended for legitimate communication between pet owners and service providers.
- You agree not to use messaging for spam, harassment, threats, fraud, or any unlawful purpose.
- We reserve the right to monitor messages for safety and fraud prevention, and to suspend accounts that violate this section.
- Sharing personal information via messaging is at your own risk.

---

## 10. Reviews & Ratings

- Reviews must be honest and based on genuine experience with the service provider.
- You must not post false, defamatory, or malicious reviews.
- Xpress Vet may remove reviews that violate these Terms.
- Reviews are not a substitute for personal due diligence before engaging a service provider.

---

## 11. User Conduct

You agree not to:

- Provide false or misleading information in your profile or listings.
- Use the Service for any unlawful purpose.
- Attempt to access other users' accounts or data without authorization.
- Scrape, copy, or redistribute listings or data from the Service without permission.
- Upload offensive, defamatory, or inappropriate content.
- Impersonate a professional or misrepresent your qualifications.

We reserve the right to suspend or terminate accounts that violate these rules without notice or refund.

---

## 12. Limitation of Liability

To the fullest extent permitted by Nigerian law:

- Xpress Digital & Data Solutions Limited shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service or from your interaction with any service provider found on the platform.
- We shall not be liable for harm, injury, loss, or death of any animal.
- We shall not be liable for any financial loss resulting from payment to a service provider.
- Our total liability for any claim related to the platform itself shall not exceed the amount you paid us in subscription fees in the 3 months preceding the claim.

---

## 13. Indemnification

You agree to indemnify and hold harmless Xpress Digital & Data Solutions Limited and its officers, employees, and agents from any claims, damages, losses, liabilities, or expenses (including legal fees) arising from: (a) your use of the Service; (b) your interaction with any service provider; (c) any service rendered to you or your pet; or (d) your violation of these Terms.

---

## 14. Termination

You may delete your account at any time. We may suspend or terminate your access if you violate these Terms or engage in fraudulent or harmful activity, without prior notice or refund.

---

## 15. Changes to These Terms

We may update these Terms from time to time. Significant changes will be communicated via email or an in-app notice. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.

---

## 16. Governing Law

These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.

---

## 17. Contact & Reporting

If you experience a problem with a service provider — including misconduct, harm to your pet, or financial fraud — please report it immediately:

**Support Email:** support@xpressvetmarketplace.com
**Company:** Xpress Digital & Data Solutions Limited (RC: 9112280)
**Location:** Lagos, Nigeria

Reports of serious misconduct may be escalated to the appropriate Nigerian regulatory authorities.
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
