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
import VerifyProfessionalScreen from '../screens/VerifyProfessionalScreen';
import ProfessionalOnboardingScreen from '../screens/ProfessionalOnboardingScreen';
import KennelOnboardingScreen from '../screens/KennelOnboardingScreen';
import KennelsScreen from '../screens/KennelsScreen';
import ShopOnboardingScreen from '../screens/ShopOnboardingScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ExploreOptionsScreen from '../screens/ExploreOptionsScreen';

import { SafeAreaView } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============================================================================
// USER TABS — pet owners looking for vets, kennels, shops
// ============================================================================
function UserTabs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen
          name="Explore"
          component={ExploreOptionsScreen}
          options={{ title: 'Explore', tabBarLabel: 'Explore', tabBarIcon: tabIcon('compass') }}
        />
        <Tab.Screen
          name="Professionals"
          component={ProfessionalsScreen}
          options={{ title: 'Find Vets', tabBarLabel: 'Vets', tabBarIcon: tabIcon('medkit') }}
        />
        <Tab.Screen
          name="Kennels"
          component={KennelsScreen}
          options={{ title: 'Kennels', tabBarLabel: 'Kennels', tabBarIcon: tabIcon('paw') }}
        />
        <Tab.Screen
          name="Shops"
          component={ShopsScreen}
          options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: tabIcon('basket') }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: tabIcon('person') }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// ============================================================================
// PROFESSIONAL TABS — vets and kennel owners
// ============================================================================
function ProfessionalTabs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: tabIcon('home') }}
        />
        <Tab.Screen
          name="Network"
          component={ProfessionalsScreen}
          options={{ title: 'Network', tabBarLabel: 'Network', tabBarIcon: tabIcon('people') }}
        />
        <Tab.Screen
          name="Shops"
          component={ShopsScreen}
          options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: tabIcon('basket') }}
        />
        <Tab.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ title: 'Premium', tabBarLabel: 'Premium', tabBarIcon: tabIcon('star') }}
        />
        <Tab.Screen
          name="VetVerification"
          component={VetVerificationScreen}
          options={{ title: 'Get Verified', tabBarLabel: 'Verify', tabBarIcon: tabIcon('checkmark-circle') }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: tabIcon('person') }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// ============================================================================
// KENNEL OWNER TABS — dedicated tab set for kennel owners
// ============================================================================
function KennelOwnerTabs() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Tab.Navigator screenOptions={tabScreenOptions}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Home', tabBarLabel: 'Home', tabBarIcon: tabIcon('home') }}
        />
        <Tab.Screen
          name="Kennels"
          component={KennelsScreen}
          options={{ title: 'Kennels', tabBarLabel: 'Kennels', tabBarIcon: tabIcon('paw') }}
        />
        <Tab.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{ title: 'Premium', tabBarLabel: 'Premium', tabBarIcon: tabIcon('star') }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profile', tabBarLabel: 'Profile', tabBarIcon: tabIcon('person') }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// ============================================================================
// HELPERS
// ============================================================================
const tabScreenOptions = {
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
  headerStyle: { backgroundColor: '#007AFF' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

function pickTabs(role: string | null) {
  if (role === 'vet') return <ProfessionalTabs />;
  if (role === 'kennel_owner') return <KennelOwnerTabs />;
  return <UserTabs />;
}

// ============================================================================
// ROOT NAVIGATOR
// ============================================================================
export default function AppNavigator() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const token = await AsyncStorage.getItem('xp_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || null);
      }
    } catch {
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* Auth */}
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />

        {/* Main app — tab set depends on role */}
        <Stack.Screen name="MainTabs">
          {() => pickTabs(userRole)}
        </Stack.Screen>

        {/* Onboarding flows — pushed as full-screen stack screens over tabs */}
        <Stack.Screen 
          name="ProfessionalOnboarding" 
          component={ProfessionalOnboardingScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="KennelOnboarding" 
          component={KennelOnboardingScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="ShopOnboardingScreen" 
          component={ShopOnboardingScreen}
          options={{ presentation: 'modal' }}
        />

        {/* Standalone screens reachable from anywhere */}
        <Stack.Screen name="VerifyProfessional" component={VerifyProfessionalScreen} />
        <Stack.Screen name="KennelProfile" component={require('../screens/KennelProfileScreen').default} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}