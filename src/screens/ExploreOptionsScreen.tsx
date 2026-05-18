import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface OptionCard {
  emoji: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  color: string;
  bg: string;
  onPress: () => void;
}

export default function ExploreOptionsScreen() {
  const navigation = useNavigation<any>();
  
  // Get the root/parent navigator to access Stack screens
  const rootNavigation = navigation.getParent() || navigation;

  const options: OptionCard[] = [
    {
      emoji: '👨‍⚕️',
      icon: 'medkit-outline',
      label: 'Find Veterinarians',
      subtitle: 'Locate VCN-verified vets near you',
      color: '#2563EB',
      bg: '#EFF6FF',
      onPress: () => {
        // Check if we're in a tab navigator
        if (navigation.getParent()) {
          // We're in a nested navigator, navigate to the tab
          navigation.navigate('Professionals', { role: 'vet' });
        } else {
          // We're in the stack, navigate to MainTabs
          navigation.navigate('MainTabs', { 
            screen: 'Professionals',
            params: { role: 'vet' }
          });
        }
      },
    },
    {
      emoji: '🐕',
      icon: 'paw-outline',
      label: 'Find Kennels',
      subtitle: 'Boarding, grooming & training services',
      color: '#7C3AED',
      bg: '#F5F3FF',
      onPress: () => {
        // Always navigate to the Kennels tab via MainTabs
        navigation.navigate('MainTabs', { screen: 'Kennels' });
      },
    },
    {
      emoji: '🛒',
      icon: 'basket-outline',
      label: 'Pet Shops',
      subtitle: 'Quality supplies for your pets',
      color: '#EA580C',
      bg: '#FFF7ED',
      onPress: () => {
        if (navigation.getParent()) {
          navigation.navigate('Shops');
        } else {
          navigation.navigate('MainTabs', { screen: 'Shops' });
        }
      },
    },
    {
      emoji: '✅',
      icon: 'shield-checkmark-outline',
      label: 'Verify a Professional',
      subtitle: 'Check credentials on the VCN portal',
      color: '#059669',
      bg: '#ECFDF5',
      onPress: () =>
        Linking.openURL('https://portal.vcn.gov.ng/verify').catch(() =>
          Alert.alert('Error', 'Unable to open browser')
        ),
    },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Hero section */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>🐾 Xpress Vet</Text>
        </View>
        <Text style={styles.heroTitle}>What are you{'\n'}looking for?</Text>
        <Text style={styles.heroSubtitle}>
          Find trusted pet care services in your area
        </Text>
      </View>

      {/* Options */}
      <ScrollView
        contentContainerStyle={styles.optionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {options.map((opt, index) => (
          <TouchableOpacity
            key={index}
            style={styles.card}
            onPress={opt.onPress}
            activeOpacity={0.78}
          >
            <View style={[styles.iconCircle, { backgroundColor: opt.bg }]}>
              <Text style={styles.cardEmoji}>{opt.emoji}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardLabel, { color: opt.color }]}>{opt.label}</Text>
              <Text style={styles.cardSubtitle}>{opt.subtitle}</Text>
            </View>
            <View style={[styles.chevronCircle, { backgroundColor: opt.bg }]}>
              <Ionicons name="chevron-forward" size={16} color={opt.color} />
            </View>
          </TouchableOpacity>
        ))}

        {/* Register section */}
        <View style={styles.registerSection}>
          <Text style={styles.registerTitle}>Are you a professional?</Text>
          <Text style={styles.registerSubtitle}>
            List your practice or business on Xpress Vet
          </Text>
          <View style={styles.registerButtons}>
            <TouchableOpacity
              style={[styles.registerBtn, { backgroundColor: '#EFF6FF' }]}
              onPress={() => {
                try {
                  rootNavigation.navigate('ProfessionalOnboarding', { role: 'vet' });
                } catch (e) {
                  Alert.alert('Navigation Error', 'Unable to navigate to registration. Please try from the main menu.');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.registerBtnEmoji}>👨‍⚕️</Text>
              <Text style={[styles.registerBtnText, { color: '#2563EB' }]}>
                Register as Vet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.registerBtn, { backgroundColor: '#F5F3FF' }]}
              onPress={() => {
                try {
                  navigation.navigate('KennelOnboarding');
                } catch (e) {
                  Alert.alert('Navigation Error', 'Unable to navigate to registration. Please try from the main menu.');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.registerBtnEmoji}>🐕</Text>
              <Text style={[styles.registerBtnText, { color: '#7C3AED' }]}>
                Register Kennel
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.registerBtn, styles.registerBtnFullWidth, { backgroundColor: '#FFF7ED', marginTop: 10 }]}
            onPress={() => {
              try {
                rootNavigation.navigate('ShopOnboardingScreen');
              } catch (e) {
                Alert.alert('Navigation Error', 'Unable to navigate to registration. Please try from the main menu.');
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.registerBtnEmoji}>🛒</Text>
            <Text style={[styles.registerBtnText, { color: '#EA580C' }]}>
              Register Shop
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  hero: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroBadgeText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: { fontSize: 15, color: '#64748B', lineHeight: 21 },

  optionsContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 32 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardEmoji: { fontSize: 24 },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  cardSubtitle: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  registerSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  registerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  registerSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  registerButtons: { flexDirection: 'row', gap: 10 },
  registerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 6,
  },
  registerBtnFullWidth: {
    flex: undefined,
    width: '100%',
  },
  registerBtnEmoji: { fontSize: 18 },
  registerBtnText: { fontSize: 13, fontWeight: '700' },
});