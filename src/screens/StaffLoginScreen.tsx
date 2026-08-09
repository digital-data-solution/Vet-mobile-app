/**
 * StaffLoginScreen.tsx
 *
 * Individual staff / team-member login on their OWN phone (as opposed to the
 * shared-device PIN switcher in BusinessScreen). Owner creates a username +
 * password for each staff; they sign in here and drop straight into the
 * Business hub, scoped to their permissions.
 *
 *   POST /api/v1/business/staff/login { username, password }
 *     -> { success, data: { token, staff: { id, name, role, permissions, ownerId, businessName } } }
 *
 * On success we store the staff session (utils/businessSession). AppNavigator
 * watches that session and swaps the navigator into staff mode, landing the
 * user on the Business hub. Indigo styling to match the Business Suite.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { apiFetch } from '../api/client';
import { showAlert } from '../utils/alert';
import { setStaffSession } from '../utils/businessSession';

const LOGO = require('../../assets/icon.png');

interface Props { navigation: any; }

export default function StaffLoginScreen({ navigation }: Props) {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const handleLogin = useCallback(async () => {
    if (!username.trim()) return showAlert('Username', 'Please enter your username.');
    if (!password)        return showAlert('Password', 'Please enter your password.');

    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/business/staff/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (res.ok && res.body?.success && res.body?.data?.token) {
        const { token, staff } = res.body.data;
        await setStaffSession({ staffToken: token, staff });
        // AppNavigator watches the staff session and swaps into staff mode,
        // landing this user on the Business hub — no navigate() needed here.
      } else if (res.status === 401) {
        showAlert('Sign In Failed', res.body?.message || 'Incorrect username or password.');
      } else {
        showAlert('Sign In Failed', res.body?.message || 'Could not sign you in. Please try again.');
      }
    } catch {
      showAlert('Network Error', 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [username, password]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Image source={LOGO} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.appName}>Staff Sign In</Text>
          <Text style={styles.appTagline}>Sign in to your team's Business Suite</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Team member login</Text>
          <Text style={styles.cardSubtitle}>
            Use the username and password your shop owner gave you.
          </Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.passwordWrapper}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
            <Pressable style={styles.showPasswordBtn} onPress={() => setShowPassword((v) => !v)}>
              <Text style={styles.showPasswordText}>{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, loading && styles.primaryBtnDisabled, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}>← Back to owner sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll:             { flex: 1, backgroundColor: '#F3F4F6' },
  container:          { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  logoSection:        { alignItems: 'center', marginBottom: 28 },
  logoImage:          { width: 80, height: 80, marginBottom: 10, borderRadius: 18 },
  appName:            { fontSize: 30, fontWeight: '800', color: '#3730A3', letterSpacing: -0.5 },
  appTagline:         { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  card:               { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  cardTitle:          { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  cardSubtitle:       { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 20 },
  inputWrapper:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 14, backgroundColor: '#F9FAFB' },
  inputIcon:          { fontSize: 16, marginRight: 10 },
  input:              { flex: 1, paddingVertical: 13, fontSize: 15, color: '#111827' },
  passwordWrapper:    { position: 'relative' },
  showPasswordBtn:    { position: 'absolute', right: 14, top: 14 },
  showPasswordText:   { fontSize: 13, color: '#4338CA', fontWeight: '600' },
  primaryBtn:         { backgroundColor: '#4338CA', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 4, shadowColor: '#4338CA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:             { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerLink:         { fontSize: 14, color: '#4338CA', fontWeight: '700' },
});
