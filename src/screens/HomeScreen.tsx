import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../api/client';

export default function HomeScreen({ navigation }: any) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await getToken();
      setIsLoggedIn(!!token);

      if (token) {
        // Decode token to get user role
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || null);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      // If already logged in, go to main app
      navigation.navigate('Professionals');
    } else {
      // If not logged in, go to auth
      navigation.navigate('Auth');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.emoji}>🐾</Text>
        <Text style={styles.title}>Xpress Vet</Text>
        <Text style={styles.subtitle}>Your trusted veterinary marketplace</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          {isLoggedIn ? 'Welcome back!' : 'Welcome to Xpress Vet'}
        </Text>

        {!isLoggedIn ? (
          <>
            <Text style={styles.description}>
              Connect with verified veterinarians and find quality pet care services in your area.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </>
        ) : userRole === 'vet' || userRole === 'kennel_owner' ? (
          // Content for professionals
          <>
            <Text style={styles.description}>
              Manage your professional profile, connect with other vets, and grow your practice.
            </Text>
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Professional Dashboard</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('VetVerification')}
                >
                  <Text style={styles.actionEmoji}>✅</Text>
                  <Text style={styles.actionText}>Get Verified</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <Text style={styles.actionEmoji}>⭐</Text>
                  <Text style={styles.actionText}>Go Premium</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          // Content for regular users
          <>
            <Text style={styles.description}>
              Find trusted veterinarians and quality pet supplies in your area.
            </Text>
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>Find Services</Text>
              <View style={styles.actionsGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Professionals')}
                >
                  <Text style={styles.actionEmoji}>👨‍⚕️</Text>
                  <Text style={styles.actionText}>Find Vets</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Shops')}
                >
                  <Text style={styles.actionEmoji}>🛒</Text>
                  <Text style={styles.actionText}>Pet Shops</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa',
    padding: 20
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: { 
    alignItems: 'center', 
    marginTop: 60,
    marginBottom: 40
  },
  emoji: { 
    fontSize: 60, 
    marginBottom: 10 
  },
  title: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: '#2c3e50',
    marginBottom: 8
  },
  subtitle: { 
    fontSize: 16, 
    color: '#7f8c8d',
    textAlign: 'center'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 16
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24
  },
  quickActions: {
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center'
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center'
  },
  loginButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  featureCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  featureEmoji: {
    fontSize: 40,
    marginBottom: 10
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5
  },
  featureDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center'
  },
  footer: {
    marginBottom: 20
  },
  primaryButton: { 
    backgroundColor: '#3498db', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    marginBottom: 12
  },
  primaryButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '600' 
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3498db'
  },
  secondaryButtonText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '500'
  }
});
