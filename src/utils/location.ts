import * as Location from 'expo-location';
import { Platform } from 'react-native';

const LOCATIONIQ_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY;

export const getUserLocation = async (): Promise<{ latitude: number; longitude: number }> => {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => reject(new Error('Location permission denied')),
        { timeout: 10000 },
      );
    });
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission denied');

  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: coords.latitude, longitude: coords.longitude };
};

export const reverseGeocode = async (lat: number, lon: number) => {
  const res = await fetch(
    `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  return {
    fullAddress: data.display_name as string,
    city: (data.address?.city || data.address?.town) as string | undefined,
    state: data.address?.state as string | undefined,
    county: (data.address?.county || data.address?.suburb) as string | undefined,
    road: data.address?.road as string | undefined,
    country: data.address?.country as string | undefined,
    lat,
    lon,
  };
};

export const forwardGeocode = async (address: string) => {
  const res = await fetch(
    `https://us1.locationiq.com/v1/search?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=ng`,
  );
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error('Address not found');

  return {
    fullAddress: data[0].display_name as string,
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
  };
};
