import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { getCurrentUser, signOut } from '../api/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ProfileScreen({ navigation }: Props) {
  const nav = navigation;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const { data } = await getCurrentUser();
      setUser(data?.user || null);
    } catch (error) {
      setUser(null);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await signOut();
    await AsyncStorage.removeItem('xp_token');
    setLoading(false);
    navigation.replace('Auth');
  };

  // Add registration options UI
  const handleRegisterVet = () => navigation.navigate('ProfessionalOnboarding');
  const handleRegisterKennel = () => navigation.navigate('ProfessionalOnboarding', { role: 'kennel' });
  const handleRegisterShop = () => navigation.navigate('ShopOnboardingScreen');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile & Settings</Text>
      {loading ? <ActivityIndicator size="large" color="#007AFF" /> : (
        <>
          {user ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Phone: {user.phone}</Text>
              <Text style={styles.infoText}>Email: {user.email || 'N/A'}</Text>
              <Text style={styles.infoText}>Role: {user.role || 'User'}</Text>
              <Button title="Edit Business Info" onPress={() => nav.navigate('ProfessionalOnboarding')} color="#007AFF" />
              {user.role === 'vet' || user.role === 'kennel_owner' ? (
                <Button title="Manage Subscription" onPress={() => nav.navigate('SubscriptionScreen')} color="#34C759" />
              ) : null}
            </View>
          ) : (
            <Text style={styles.infoText}>No user info found.</Text>
          )}
          <Button title="Logout" onPress={handleLogout} color="#FF3B30" />
          <View style={styles.registrationOptions}>
            <Text style={styles.sectionTitle}>Register Your Business</Text>
            <Button title="Register as Veterinarian" onPress={handleRegisterVet} color="#007AFF" />
            <View style={{ height: 12 }} />
            <Button title="Register Your Kennel" onPress={handleRegisterKennel} color="#34C759" />
            <View style={{ height: 12 }} />
            <Button title="Register Your Pet Shop" onPress={handleRegisterShop} color="#FF9500" />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9fafc', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 32, color: '#222' },
  infoBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 24, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  infoText: { fontSize: 18, color: '#333', marginBottom: 12 },
  registrationOptions: { backgroundColor: '#fff', padding: 18, borderRadius: 10, marginBottom: 18, shadowColor: '#007AFF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#222' },
});
