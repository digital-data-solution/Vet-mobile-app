import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../screens/AuthScreen';
import ProfessionalsScreen from '../screens/ProfessionalsScreen';
import ShopsScreen from '../screens/ShopsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import VetVerificationScreen from '../screens/VetVerificationScreen';
import ProfessionalOnboardingScreen from '../screens/ProfessionalOnboardingScreen';
import ShopOnboardingScreen from '../screens/ShopOnboardingScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import KennelsScreen from '../screens/KennelsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tabs for regular users (looking for vets/shops)
function UserTabs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#E5E5EA',
            borderTopWidth: 1,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="home" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Professionals"
          component={ProfessionalsScreen}
          options={{
            title: 'Find Vets',
            tabBarLabel: 'Vets',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="medkit" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Kennels"
          component={KennelsScreen}
          options={{
            title: 'Kennels',
            tabBarLabel: 'Kennels',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="paw" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Shops"
          component={ShopsScreen}
          options={{
            title: 'Pet Shops',
            tabBarLabel: 'Shops',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="basket" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            title: 'Profile',
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="person" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// Tabs for veterinarians and shop owners
function ProfessionalTabs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#E5E5EA',
            borderTopWidth: 1,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="home" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Professionals"
          component={ProfessionalsScreen}
          options={{
            title: 'Network',
            tabBarLabel: 'Network',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="people" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Shops"
          component={ShopsScreen}
          options={{
            title: 'Pet Shops',
            tabBarLabel: 'Shops',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="basket" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{
            title: 'Premium',
            tabBarLabel: 'Premium',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="star" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="VetVerification"
          component={VetVerificationScreen}
          options={{
            title: 'Get Verified',
            tabBarLabel: 'Verify',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="checkmark-circle" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="RegisterVet"
          component={ProfessionalOnboardingScreen}
          initialParams={{ role: 'vet' }}
          options={{
            title: 'Register Vet',
            tabBarLabel: 'Vet Registration',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="medkit" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="RegisterKennel"
          component={ProfessionalOnboardingScreen}
          initialParams={{ role: 'kennel' }}
          options={{
            title: 'Register Kennel',
            tabBarLabel: 'Kennel Registration',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="paw" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="RegisterShop"
          component={ShopOnboardingScreen}
          options={{
            title: 'Register Shop',
            tabBarLabel: 'Shop Registration',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="basket" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="ShopOnboardingScreen"
          component={ShopOnboardingScreen}
          options={{
            title: 'Shop Onboarding',
            tabBarLabel: 'Shop Onboarding',
            tabBarIcon: ({ color, size }) => (
              <TabBarIcon name="basket" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// Simple icon component using Ionicons
function TabBarIcon({ name, color, size }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function AppNavigator() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const token = await AsyncStorage.getItem('xp_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Decode token to get user role (simple decode, not secure but for UI purposes)
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role || null);
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole(null);
    }
    setLoading(false);
  };

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="ProfessionalOnboarding" component={ProfessionalOnboardingScreen} />
        <Stack.Screen name="KennelOnboarding" component={require('../screens/KennelOnboardingScreen').default} />
        <Stack.Screen name="ShopOnboardingScreen" component={ShopOnboardingScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ExploreOptions" component={require('../screens/ExploreOptionsScreen').default} />
        <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} />
        <Stack.Screen name="MainTabs">
          {() => (userRole === 'vet' || userRole === 'kennel_owner') ? <ProfessionalTabs /> : <UserTabs />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
