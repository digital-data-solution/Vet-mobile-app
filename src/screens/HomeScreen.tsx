import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { getToken } from '../api/client';

type UserRole = 'vet' | 'kennel_owner' | 'user' | null;

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const checkLoginStatus = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setIsLoggedIn(false);
        setUserRole(null);
        return;
      }

      setIsLoggedIn(true);

      // Safely decode JWT payload
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        setUserRole(payload.role ?? null);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkLoginStatus();
  }, [checkLoginStatus]);

  // Re-check on focus so login/logout reflects immediately
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', checkLoginStatus);
    return unsubscribe;
  }, [navigation, checkLoginStatus]);

  const isProfessional = userRole === 'vet' || userRole === 'kennel_owner';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.emoji}>🐾</Text>
        <Text style={styles.appName}>Xpress Vet</Text>
        <Text style={styles.tagline}>Your trusted veterinary marketplace</Text>
      </View>

      {/* Welcome */}
      <Text style={styles.welcomeText}>
        {isLoggedIn ? 'Welcome back!' : 'Welcome to Xpress Vet'}
      </Text>

      {/* Guest view */}
      {!isLoggedIn && (
        <View style={styles.section}>
          <Text style={styles.description}>
            Connect with verified veterinarians and find quality pet care services in your area.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('ExploreOptions')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Professional view */}
      {isLoggedIn && isProfessional && (
        <View style={styles.section}>
          <Text style={styles.description}>
            Manage your professional profile, connect with other vets, and grow your practice.
          </Text>
          <Text style={styles.sectionTitle}>Professional Dashboard</Text>
          <View style={styles.grid}>
            <ActionCard
              emoji="✅"
              label="Get Verified"
              onPress={() => navigation.navigate('VetVerification')}
            />
            <ActionCard
              emoji="⭐"
              label="Go Premium"
              onPress={() => navigation.navigate('Subscription')}
            />
            <ActionCard
              emoji="👥"
              label="Network"
              onPress={() => navigation.navigate('Professionals')}
            />
            <ActionCard
              emoji="🏪"
              label="Pet Shops"
              onPress={() => navigation.navigate('Shops')}
            />
          </View>
        </View>
      )}

      {/* Regular user view */}
      {isLoggedIn && !isProfessional && (
        <View style={styles.section}>
          <Text style={styles.description}>
            Find trusted veterinarians and quality pet supplies in your area.
          </Text>
          <Text style={styles.sectionTitle}>Find Services</Text>
          <View style={styles.grid}>
            <ActionCard
              emoji="👨‍⚕️"
              label="Find Vets"
              onPress={() => navigation.navigate('Professionals')}
            />
            <ActionCard
              emoji="🛒"
              label="Pet Shops"
              onPress={() => navigation.navigate('Shops')}
            />
          </View>
        </View>
      )}

      {/* Feature highlights for guests */}
      {!isLoggedIn && (
        <View style={styles.featuresSection}>
          <FeatureCard
            emoji="🔍"
            title="Find Nearby Vets"
            description="Locate verified veterinarians close to you using GPS or address search."
          />
          <FeatureCard
            emoji="✅"
            title="Verified Professionals"
            description="All vets are VCN-verified so you know you're getting quality care."
          />
          <FeatureCard
            emoji="🛒"
            title="Pet Supplies"
            description="Discover trusted pet shops in your area for all your pet needs."
          />
        </View>
      )}
    </ScrollView>
  );
}

function ActionCard({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionCard} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
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

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginTop: 28,
    marginBottom: 4,
    paddingHorizontal: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginTop: 28,
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  featureEmoji: {
    fontSize: 28,
    marginRight: 14,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});