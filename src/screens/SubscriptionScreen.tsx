import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { apiFetch } from '../api/client';

export default function SubscriptionScreen() {
  const [plan, setPlan] = useState('premium');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      // Get user profile to check role
      const res = await apiFetch('/api/auth/me', { method: 'GET' });
      if (res.ok && res.body?.user) {
        setUserRole(res.body.user.role);
      } else {
        Alert.alert('Error', 'Failed to get user information');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setCheckingRole(false);
  };

  const create = async () => {
    if (!plan.trim()) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/subscription/create', { 
        method: 'POST', 
        body: JSON.stringify({ plan: plan.trim() }) 
      });
      
      if (res.ok) {
        Alert.alert('Success', 'Subscription created successfully!');
      } else {
        Alert.alert('Subscription Failed', res.body?.message || 'Failed to create subscription');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  const me = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/subscription/me', { method: 'GET' });
      
      if (res.ok) {
        const subscription = res.body;
        Alert.alert(
          'Your Subscription', 
          `Plan: ${subscription.plan}\nStatus: ${subscription.status}\nExpires: ${new Date(subscription.expiresAt).toLocaleDateString()}`
        );
      } else {
        Alert.alert('No Subscription', res.body?.message || 'You don\'t have an active subscription');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  if (checkingRole) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  // Only allow vets and shop owners
  if (userRole !== 'vet' && userRole !== 'kennel_owner') {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.title}>Subscription</Text>
        <Text style={styles.accessDeniedText}>
          Only veterinarians and pet shop owners can access subscription features.
        </Text>
        <Text style={styles.roleText}>Your current role: {userRole || 'Unknown'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Professional Subscription</Text>
      <Text style={styles.subtitle}>Manage your professional subscription</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Subscription</Text>
        <TextInput 
          value={plan} 
          onChangeText={setPlan} 
          style={styles.input} 
          placeholder="premium"
        />
        <Button 
          title={loading ? "Creating..." : "Create Subscription"} 
          onPress={create}
          disabled={loading}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Subscription</Text>
        <Button 
          title={loading ? "Loading..." : "View My Subscription"} 
          onPress={me}
          disabled={loading}
        />
      </View>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center', color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 30, color: '#666' },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 10, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
  loader: { marginTop: 20 },
  loadingText: { marginTop: 10, color: '#666' },
  accessDeniedText: { fontSize: 16, textAlign: 'center', color: '#666', marginBottom: 10 },
  roleText: { fontSize: 14, color: '#888', fontStyle: 'italic' }
});
