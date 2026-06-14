import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useAuth } from '../navigation';

interface Props {
  navigation: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Role sets
// ─────────────────────────────────────────────────────────────────────────────

const PROFESSIONAL_ROLES = new Set([
  'vet', 'kennel_owner', 'shop_owner', 'groomer', 'trainer',
  'pet_sitter', 'pet_transport', 'cremation_service', 'agro_vet_supplier', 'insurance_provider',
  'pet_pharmacy', 'rescue_center', 'pet_hotel',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Service grid config (pet owner + guest view)
// ─────────────────────────────────────────────────────────────────────────────

const PET_OWNER_SERVICES = [
  { emoji: '\u{1F468}‍⚕️', label: 'Vets',          color: '#EFF6FF', borderColor: '#BFDBFE', tab: 'Professionals' },
  { emoji: '\u{1F3E0}',                   label: 'Kennels',        color: '#F0FDF4', borderColor: '#BBF7D0', tab: 'Kennels'       },
  { emoji: '✂️',               label: 'Groomers',       color: '#FFF7ED', borderColor: '#FED7AA', tab: 'Services'      },
  { emoji: '\u{1F393}',                   label: 'Trainers',       color: '#FDF4FF', borderColor: '#E9D5FF', tab: 'Services'      },
  { emoji: '\u{1F6CC}',                   label: 'Pet Sitters',    color: '#FFF1F2', borderColor: '#FECDD3', tab: 'Services'      },
  { emoji: '\u{1F690}',                   label: 'Pet Transport',  color: '#ECFDF5', borderColor: '#A7F3D0', tab: 'Services'      },
  { emoji: '\u{1F33F}',                   label: 'Cremation',      color: '#F8FAFC', borderColor: '#CBD5E1', tab: 'Services'      },
  { emoji: '\u{1F33E}',                   label: 'Agro-Vet',       color: '#FFFBEB', borderColor: '#FDE68A', tab: 'Services'      },
  { emoji: '\u{1F6E1}️',             label: 'Insurance',      color: '#EFF6FF', borderColor: '#BFDBFE', tab: 'Services'      },
  { emoji: '\u{1F6D2}',  label: 'Pet Shops',      color: '#FFF0F5', borderColor: '#FBCFE8', tab: 'Shops'     },
  { emoji: '\u{1F48A}',  label: 'Pet Pharmacy',   color: '#ECFEFF', borderColor: '#A5F3FC', tab: 'Services'  },
  { emoji: '\u{1F43E}',  label: 'Rescue Centers', color: '#FFF7ED', borderColor: '#FED7AA', tab: 'Services'  },
  { emoji: '\u{1F3E8}',  label: 'Pet Hotels',     color: '#F0FDFA', borderColor: '#99F6E4', tab: 'Services'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Per-role professional dashboard config
// Tab sets:
//   ProfessionalTabs  (vet, groomer, trainer, pet_sitter, pet_transport,
//                      cremation_service, agro_vet_supplier, insurance_provider,
//                      pet_pharmacy, rescue_center, pet_hotel):
//     Home | Network | Services | Shops | Subscription | Messages | VetVerification | Profile
//   KennelOwnerTabs   (kennel_owner):
//     Home | Kennels | Messages | Subscription | Profile
//   ShopOwnerTabs     (shop_owner):
//     Home | Shops | Messages | Subscription | Profile
// ─────────────────────────────────────────────────────────────────────────────

type NavItem = { emoji: string; label: string; tab: string };

type RoleConfig = {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  pendingReview: boolean;
  actions: NavItem[];
  explores: NavItem[];
  tips: string[];
};

const ROLE_CONFIG: Record<string, RoleConfig> = {
  vet: {
    emoji: '\u{1F468}‍⚕️',
    color: '#2563EB', bgColor: '#EFF6FF', pendingReview: false,
    title: 'Veterinary Dashboard',
    subtitle: 'Get VCN-verified, connect with the vet network, and grow your practice.',
    actions: [
      { emoji: '✅',              label: 'Get Verified', tab: 'VetVerification' },
      { emoji: '\u{1F4B3}',           label: 'Subscription', tab: 'Subscription'    },
      { emoji: '\u{1F465}',           label: 'Vet Network',  tab: 'Network'         },
      { emoji: '\u{1F4AC}',           label: 'Messages',     tab: 'Messages'        },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'A verified VCN badge increases client trust and appears at the top of search results.',
      'Keep your clinic hours and location updated to attract nearby pet owners.',
    ],
  },
  kennel_owner: {
    emoji: '\u{1F3E0}',
    color: '#16A34A', bgColor: '#F0FDF4', pendingReview: false,
    title: 'Kennel Dashboard',
    subtitle: 'Manage your kennel listing, showcase facilities, and attract bookings.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F3E0}',  label: 'My Kennels',   tab: 'Kennels'      },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F3E0}',  label: 'Kennels',      tab: 'Kennels'      },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
    ],
    tips: [
      'Upload photos of your kennels and play areas — images drive 3x more enquiries.',
      'List your capacity so pet owners know you can accommodate their pet.',
    ],
  },
  groomer: {
    emoji: '✂️',
    color: '#D97706', bgColor: '#FFF7ED', pendingReview: false,
    title: 'Grooming Dashboard',
    subtitle: 'Showcase your grooming services and attract pet owners in your area.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F465}',  label: 'Network',      tab: 'Network'      },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Before-and-after grooming photos are the single best way to attract new clients.',
      'Mention breed-specific specialisations to stand out in search.',
    ],
  },
  trainer: {
    emoji: '\u{1F393}',
    color: '#7C3AED', bgColor: '#FDF4FF', pendingReview: false,
    title: 'Training Dashboard',
    subtitle: 'List your training programs and connect with pet owners who need you.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F465}',  label: 'Network',      tab: 'Network'      },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Add video testimonials or training milestone examples to build client trust.',
      'Specify your training method (positive reinforcement, clicker, etc.) on your profile.',
    ],
  },
  pet_sitter: {
    emoji: '\u{1F6CC}',
    color: '#DB2777', bgColor: '#FFF1F2', pendingReview: false,
    title: 'Pet Sitting Dashboard',
    subtitle: 'Offer peace of mind to pet owners - showcase your sitting experience.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F465}',  label: 'Network',      tab: 'Network'      },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Share your home-visit policy and daily update routine to win client trust.',
      'Specify whether you accept multiple pets at once to set clear expectations.',
    ],
  },
  pet_transport: {
    emoji: '\u{1F690}',
    color: '#059669', bgColor: '#ECFDF5', pendingReview: true,
    title: 'Pet Transport Dashboard',
    subtitle: 'Your profile requires admin review before going live.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Admin approval takes 1-3 business days after document verification.',
      'Add your vehicle type and coverage areas to your profile for quicker approval.',
    ],
  },
  cremation_service: {
    emoji: '\u{1F33F}',
    color: '#64748B', bgColor: '#F8FAFC', pendingReview: true,
    title: 'Cremation Service Dashboard',
    subtitle: 'Your profile requires admin review before going live.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Admin approval takes 1-3 business days after document verification.',
      'A compassionate, clearly written service description builds trust with grieving pet owners.',
    ],
  },
  agro_vet_supplier: {
    emoji: '\u{1F33E}',
    color: '#92400E', bgColor: '#FFFBEB', pendingReview: true,
    title: 'Agro-Vet Supplier Dashboard',
    subtitle: 'Your profile requires admin review before going live.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Admin approval takes 1-3 business days after CAC / business registration verification.',
      'List specific livestock and agricultural products you supply to reach the right buyers.',
    ],
  },
  insurance_provider: {
    emoji: '\u{1F6E1}️',
    color: '#1D4ED8', bgColor: '#EFF6FF', pendingReview: true,
    title: 'Insurance Provider Dashboard',
    subtitle: 'Your profile requires admin review before going live.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Admin approval takes 1-3 business days after license verification.',
      'Clearly listing covered conditions and premium ranges helps pet owners compare plans.',
    ],
  },
  shop_owner: {
    emoji: '\u{1F6D2}',
    color: '#DC2626', bgColor: '#FFF0F5', pendingReview: false,
    title: 'Shop Dashboard',
    subtitle: 'Manage your shop listing and reach thousands of pet owners near you.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F6D2}',  label: 'My Shop',      tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'My Shop',      tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
    ],
    tips: [
      'Keep your product list and prices updated - outdated info turns away buyers.',
      'Pet owners search by location, so make sure your shop address is accurate.',
    ],
  },
  // ProfessionalTabs — requires admin review (NAFDAC/PCN license)
  pet_pharmacy: {
    emoji: '\u{1F48A}',
    color: '#0891B2', bgColor: '#ECFEFF', pendingReview: true,
    title: 'Pet Pharmacy Dashboard',
    subtitle: 'Your profile requires admin review before going live.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Admin approval takes 1-3 business days after pharmacy license verification.',
      'List every product category you stock so pet owners can find you through search filters.',
    ],
  },
  // ProfessionalTabs — requires admin review (animal welfare body registration)
  rescue_center: {
    emoji: '\u{1F43E}',
    color: '#EA580C', bgColor: '#FFF7ED', pendingReview: true,
    title: 'Rescue Center Dashboard',
    subtitle: 'Your profile requires admin review before going live.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
      { emoji: '\u{1F464}',  label: 'My Profile',   tab: 'Profile'      },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'Admin approval takes 1-3 business days after organization registration verification.',
      'List the animal types and breeds you currently have available for adoption to get more enquiries.',
    ],
  },
  // ProfessionalTabs — auto-approved (premium boarding, no special license)
  pet_hotel: {
    emoji: '\u{1F3E8}',
    color: '#0D9488', bgColor: '#F0FDFA', pendingReview: false,
    title: 'Pet Hotel Dashboard',
    subtitle: 'Showcase your premium boarding facilities and attract discerning pet owners.',
    actions: [
      { emoji: '\u{1F4B3}',  label: 'Subscription', tab: 'Subscription' },
      { emoji: '\u{1F465}',  label: 'Network',      tab: 'Network'      },
      { emoji: '\u{1F6D2}',  label: 'Pet Shops',    tab: 'Shops'        },
      { emoji: '\u{1F4AC}',  label: 'Messages',     tab: 'Messages'     },
    ],
    explores: [
      { emoji: '\u{1F6D2}',  label: 'Pet Shops', tab: 'Shops'        },
      { emoji: '⭐',     label: 'Services',  tab: 'Services'     },
      { emoji: '\u{1F4B3}',  label: 'Plans',     tab: 'Subscription' },
    ],
    tips: [
      'High-quality room photos are the single biggest driver of bookings for pet hotels.',
      'List all amenities (private suites, pool, grooming, live cameras) to justify premium pricing.',
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const { userRole, isAuthenticated } = useAuth();

  const isProfessional = PROFESSIONAL_ROLES.has(userRole ?? '');
  const cfg: RoleConfig | undefined = userRole ? ROLE_CONFIG[userRole] : undefined;

  if (isAuthenticated && isProfessional && cfg) {
    return <ProfessionalHome navigation={navigation} cfg={cfg} />;
  }

  if (isAuthenticated && !isProfessional) {
    return <PetOwnerHome navigation={navigation} />;
  }

  return <GuestHome navigation={navigation} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Guest home
// ─────────────────────────────────────────────────────────────────────────────

function GuestHome({ navigation }: { navigation: any }) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1A56DB" />

      <View style={styles.guestHero}>
        <Text style={styles.heroEmoji}>🐾</Text>
        <Text style={styles.heroTitle}>Xpress Vet</Text>
        <Text style={styles.heroTagline}>
          Nigeria's trusted marketplace for every pet care need
        </Text>
        <View style={styles.heroCtas}>
          <TouchableOpacity
            style={styles.heroCtaPrimary}
            onPress={() => navigation.navigate('ExploreOptions')}
            activeOpacity={0.85}
          >
            <Text style={styles.heroCtaPrimaryText}>Find Pet Care</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.heroCtaSecondary}
            onPress={() => navigation.navigate('ExploreOptions')}
            activeOpacity={0.85}
          >
            <Text style={styles.heroCtaSecondaryText}>List Your Business</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionPad}>
        <Text style={styles.sectionHeading}>All Pet Services</Text>
        <Text style={styles.sectionSubtitle}>Discover verified professionals across 10 categories</Text>
        <View style={styles.serviceGrid}>
          {PET_OWNER_SERVICES.map((svc) => (
            <TouchableOpacity
              key={svc.label}
              style={[styles.serviceCard, { backgroundColor: svc.color, borderColor: svc.borderColor }]}
              onPress={() => navigation.navigate('ExploreOptions')}
              activeOpacity={0.82}
            >
              <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
              <Text style={styles.serviceLabel}>{svc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionPad}>
        <Text style={styles.sectionHeading}>Why Choose Xpress Vet?</Text>
        <FeatureCard emoji="✅" title="Verified Professionals" description="Every vet is VCN-registered. Transport, insurance and cremation providers are admin-reviewed before listing." />
        <FeatureCard emoji="📍" title="Find Nearby Care" description="Search by your city or use GPS to find the closest vets, groomers, kennels, and sitters." />
        <FeatureCard emoji="💬" title="Direct Contact" description="Call, WhatsApp, or message service providers directly — no middlemen, no booking fees." />
        <FeatureCard emoji="⭐" title="Real Reviews" description="Read verified reviews from other pet owners before you book or contact any provider." />
      </View>

      <View style={[styles.sectionPad, styles.registerBanner]}>
        <Text style={styles.registerBannerTitle}>Are you a vet or pet professional?</Text>
        <Text style={styles.registerBannerSub}>
          Join thousands of professionals already growing their business on Xpress Vet.
        </Text>
        <TouchableOpacity
          style={styles.registerBannerBtn}
          onPress={() => navigation.navigate('ExploreOptions')}
          activeOpacity={0.85}
        >
          <Text style={styles.registerBannerBtnText}>Register Your Business</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionPad}>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() => navigation.navigate('Support')}
          activeOpacity={0.8}
        >
          <Text style={styles.supportRowEmoji}>💬</Text>
          <Text style={styles.supportRowText}>Need help? Chat with our support team</Text>
          <Text style={styles.supportRowArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pet owner home
// ─────────────────────────────────────────────────────────────────────────────

function PetOwnerHome({ navigation }: { navigation: any }) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F0FDF4" />

      <View style={styles.ownerHeader}>
        <Text style={styles.ownerHeaderTitle}>🐾 Xpress Vet</Text>
        <Text style={styles.ownerHeaderSub}>Find trusted pet care near you</Text>
      </View>

      <View style={styles.sectionPad}>
        <Text style={styles.sectionHeading}>Browse Services</Text>
        <View style={styles.serviceGrid}>
          {PET_OWNER_SERVICES.map((svc) => (
            <TouchableOpacity
              key={svc.label}
              style={[styles.serviceCard, { backgroundColor: svc.color, borderColor: svc.borderColor }]}
              onPress={() => navigation.navigate(svc.tab)}
              activeOpacity={0.82}
            >
              <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
              <Text style={styles.serviceLabel}>{svc.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.upsellBanner}
        onPress={() => navigation.navigate('Subscription')}
        activeOpacity={0.88}
      >
        <Text style={styles.upsellEmoji}>⭐</Text>
        <View style={styles.upsellText}>
          <Text style={styles.upsellTitle}>Unlock Premium</Text>
          <Text style={styles.upsellSub}>
            WhatsApp, in-app messaging, and direct contact with all providers
          </Text>
        </View>
        <Text style={styles.upsellArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.sectionPad}>
        <Text style={styles.sectionHeading}>All on Xpress Vet</Text>
        <FeatureCard emoji="👨‍⚕️" title="VCN-Verified Vets" description="Every vet on the platform is registered with the Veterinary Council of Nigeria." />
        <FeatureCard emoji="🔍" title="10 Service Categories" description="From grooming to cremation — find every pet care professional in one place." />
        <FeatureCard emoji="⭐" title="Real Reviews" description="Read reviews from verified pet owners before reaching out to any provider." />
      </View>

      <View style={[styles.sectionPad, styles.registerBanner]}>
        <Text style={styles.registerBannerTitle}>Do you offer pet services?</Text>
        <Text style={styles.registerBannerSub}>
          Vets, groomers, trainers, kennels, sitters, transport, shops and more — list your business today.
        </Text>
        <TouchableOpacity
          style={styles.registerBannerBtn}
          onPress={() => navigation.getParent()?.navigate('ProfessionalOnboarding')}
          activeOpacity={0.85}
        >
          <Text style={styles.registerBannerBtnText}>Register as a Professional</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionPad}>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() => navigation.getParent()?.navigate('Support')}
          activeOpacity={0.8}
        >
          <Text style={styles.supportRowEmoji}>💬</Text>
          <Text style={styles.supportRowText}>Need help? Chat with our support team</Text>
          <Text style={styles.supportRowArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Professional home — role-tailored dashboard
// ─────────────────────────────────────────────────────────────────────────────

function ProfessionalHome({
  navigation,
  cfg,
}: {
  navigation: any;
  cfg: RoleConfig;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor={cfg.bgColor} />

      <View style={[styles.proHero, { backgroundColor: cfg.bgColor }]}>
        <Text style={styles.proHeroEmoji}>{cfg.emoji}</Text>
        <Text style={[styles.proHeroTitle, { color: cfg.color }]}>{cfg.title}</Text>
        <Text style={styles.proHeroSub}>{cfg.subtitle}</Text>
      </View>

      {cfg.pendingReview && (
        <View style={styles.pendingNotice}>
          <Text style={styles.pendingIcon}>⏳</Text>
          <View style={styles.pendingText}>
            <Text style={styles.pendingTitle}>Verification Required</Text>
            <Text style={styles.pendingSub}>
              Your role requires admin review. If still awaiting approval, expect an email within 1-3 business days. Already approved? Your profile is now live!
            </Text>
          </View>
        </View>
      )}

      <View style={styles.sectionPad}>
        <Text style={styles.sectionHeading}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {cfg.actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionCard, { borderColor: cfg.color + '33' }]}
              onPress={() => navigation.navigate(action.tab)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionEmoji}>{action.emoji}</Text>
              <Text style={[styles.actionLabel, { color: cfg.color }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionPad}>
        <Text style={styles.sectionHeading}>Tips for Your Profile</Text>
        {cfg.tips.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <Text style={[styles.tipBullet, { color: cfg.color }]}>💡</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionPad}>
        <Text style={styles.sectionHeading}>Explore the Platform</Text>
        <View style={styles.exploreRow}>
          {cfg.explores.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.exploreCard}
              onPress={() => navigation.navigate(item.tab)}
              activeOpacity={0.8}
            >
              <Text style={styles.exploreEmoji}>{item.emoji}</Text>
              <Text style={styles.exploreLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionPad}>
        <TouchableOpacity
          style={styles.supportRow}
          onPress={() => navigation.getParent()?.navigate('Support')}
          activeOpacity={0.8}
        >
          <Text style={styles.supportRowEmoji}>💬</Text>
          <Text style={styles.supportRowText}>Need help? Chat with our support team</Text>
          <Text style={styles.supportRowArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionPad}>
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerText}>
            Xpress Vet is a discovery and listing platform. All service providers are independent professionals and are not employed by Xpress Vet.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCard({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <View style={styles.featureCard}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: '#F9FAFB' },
  container: { paddingBottom: 48 },

  // Guest hero
  guestHero: {
    backgroundColor: '#1A56DB',
    paddingTop: 64, paddingBottom: 40, paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  heroEmoji:   { fontSize: 64, marginBottom: 12 },
  heroTitle:   { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroTagline: { fontSize: 16, color: '#BFDBFE', textAlign: 'center', marginTop: 8, lineHeight: 24, maxWidth: 300 },
  heroCtas:    { flexDirection: 'row', gap: 12, marginTop: 28 },
  heroCtaPrimary: {
    backgroundColor: '#fff',
    paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4,
  },
  heroCtaPrimaryText:   { color: '#1A56DB', fontWeight: '700', fontSize: 15 },
  heroCtaSecondary:     { borderWidth: 2, borderColor: '#93C5FD', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  heroCtaSecondaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Pet owner header
  ownerHeader: {
    backgroundColor: '#fff',
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  ownerHeaderTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  ownerHeaderSub:   { fontSize: 15, color: '#6B7280', marginTop: 4 },

  // Professional hero
  proHero: { paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  proHeroEmoji: { fontSize: 48, marginBottom: 12 },
  proHeroTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  proHeroSub:   { fontSize: 15, color: '#374151', lineHeight: 22 },

  // Pending notice
  pendingNotice: {
    flexDirection: 'row', backgroundColor: '#FEF9C3',
    borderWidth: 1, borderColor: '#FDE047', borderRadius: 14,
    padding: 16, marginHorizontal: 20, marginTop: 16, gap: 12, alignItems: 'flex-start',
  },
  pendingIcon:  { fontSize: 24 },
  pendingText:  { flex: 1 },
  pendingTitle: { fontSize: 15, fontWeight: '700', color: '#78350F', marginBottom: 4 },
  pendingSub:   { fontSize: 13, color: '#92400E', lineHeight: 19 },

  // Section
  sectionPad:      { paddingHorizontal: 20, marginTop: 28 },
  sectionHeading:  { fontSize: 19, fontWeight: '700', color: '#111827', marginBottom: 6 },
  sectionSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },

  // Service grid
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  serviceCard: {
    borderWidth: 1, borderRadius: 14, padding: 14, alignItems: 'center',
    width: '30%', flexGrow: 1, maxWidth: '32%', minWidth: '30%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  serviceEmoji: { fontSize: 28, marginBottom: 6 },
  serviceLabel: { fontSize: 11, fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Upsell banner
  upsellBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A56DB',
    borderRadius: 16, marginHorizontal: 20, marginTop: 20, padding: 16, gap: 12,
    shadowColor: '#1A56DB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  upsellEmoji: { fontSize: 32 },
  upsellText:  { flex: 1 },
  upsellTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 3 },
  upsellSub:   { fontSize: 12, color: '#BFDBFE', lineHeight: 17 },
  upsellArrow: { fontSize: 28, color: '#fff', fontWeight: '300' },

  // Register banner
  registerBanner: {
    backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0',
    borderRadius: 18, padding: 20,
  },
  registerBannerTitle: { fontSize: 18, fontWeight: '700', color: '#14532D', marginBottom: 8 },
  registerBannerSub:   { fontSize: 14, color: '#166534', lineHeight: 21, marginBottom: 16 },
  registerBannerBtn:   { backgroundColor: '#16A34A', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  registerBannerBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Support row
  supportRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  supportRowEmoji: { fontSize: 24 },
  supportRowText:  { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151' },
  supportRowArrow: { fontSize: 22, color: '#9CA3AF' },

  // Professional action grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  actionCard: {
    backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 16,
    padding: 18, alignItems: 'center', width: '47%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2,
  },
  actionEmoji: { fontSize: 32, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Tips
  tipCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 10, gap: 10, alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  tipBullet: { fontSize: 18, marginTop: 1 },
  tipText:   { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },

  // Explore row
  exploreRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  exploreCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  exploreEmoji: { fontSize: 26, marginBottom: 6 },
  exploreLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },

  // Disclaimer
  disclaimerCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14 },
  disclaimerText: { fontSize: 12, color: '#64748B', lineHeight: 18 },

  // Feature card
  featureCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  featureEmoji:       { fontSize: 26, marginRight: 14, marginTop: 2 },
  featureContent:     { flex: 1 },
  featureTitle:       { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  featureDescription: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
});
