import { apiFetch } from '../api/client';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function ShopOnboardingScreen({ navigation }: Props) {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const registerShop = async () => {
    setLoading(true);
    try {
      const payload = { shopName, ownerName, address };
      const res = await apiFetch('/api/v1/shops/onboard', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        Alert.alert('Success', 'Pet shop registered successfully');
        navigation.goBack();
      } else {
        Alert.alert('Error', res.body?.message || 'Failed to register shop');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Your Pet Shop</Text>
      <TextInput
        value={shopName}
        onChangeText={setShopName}
        style={styles.input}
        placeholder="Shop Name"
      />
      <TextInput
        value={ownerName}
        onChangeText={setOwnerName}
        style={styles.input}
        placeholder="Owner Name"
      />
      <TextInput
        value={address}
        onChangeText={setAddress}
        style={styles.input}
        placeholder="Address"
      />
      <Button
        title={loading ? "Registering..." : "Register Shop"}
        onPress={registerShop}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#222' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 14, marginBottom: 14, borderRadius: 6, backgroundColor: '#fff', fontSize: 16 },
});
