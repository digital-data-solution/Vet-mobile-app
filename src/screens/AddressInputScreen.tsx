import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { Platform } from 'react-native';

const states = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function AddressInputScreen({ navigation, onSave }: any) {
  const [state, setState] = useState('Lagos');
  const [lga, setLga] = useState('');
  const [city, setCity] = useState('');
  const [town, setTown] = useState('');
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [zipCode, setZipCode] = useState('');

  const handleSave = () => {
    if (!state || !lga || !city || !town || !street || !houseNumber || !zipCode) {
      Alert.alert('Error', 'Please fill all address fields');
      return;
    }
    const address = {
      state, lga, city, town, street, houseNumber, zipCode
    };
    if (onSave) onSave(address);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Full Address</Text>
      <View style={styles.input}>
        <Text style={{ marginBottom: 6, color: '#888' }}>State</Text>
        <TextInput
          value={state}
          onChangeText={setState}
          placeholder="State"
          style={{ padding: 0, borderWidth: 0, backgroundColor: 'transparent' }}
        />
        {/* For a real dropdown, use a library like react-native-dropdown-picker or RN Picker Select */}
      </View>
      <TextInput placeholder="Local Government Area" value={lga} onChangeText={setLga} style={styles.input} />
      <TextInput placeholder="City" value={city} onChangeText={setCity} style={styles.input} />
      <TextInput placeholder="Town" value={town} onChangeText={setTown} style={styles.input} />
      <TextInput placeholder="Street" value={street} onChangeText={setStreet} style={styles.input} />
      <TextInput placeholder="House Number" value={houseNumber} onChangeText={setHouseNumber} style={styles.input} />
      <TextInput placeholder="Zip Code" value={zipCode} onChangeText={setZipCode} style={styles.input} keyboardType="numeric" />
      <Button title="Save Address" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 15, borderRadius: 5, backgroundColor: '#fff' },
});
