import React, { useState, useEffect, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../api/supabase';
import type { Session } from '@supabase/supabase-js';

import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../screens/AuthScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfessionalsScreen from '../screens/ProfessionalsScreen';
import ShopsScreen from '../screens/ShopsScreen';
import KennelsScreen from '../screens/KennelsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import VetVerificationScreen from '../screens/VetVerificationScreen';
import ProfessionalOnboardingScreen from '../screens/ProfessionalOnboardingScreen';
import KennelOnboardingScreen from '../screens/KennelOnboardingScreen';
import ShopOnboardingScreen from '../screens/ShopOnboardingScreen';
import ExploreOptionsScreen from '../screens/ExploreOptionsScreen';
import ChatScreen from '../screens/ChatScreen';
import VetProfileScreen from '../screens/VetProfileScreen';
import ShopProfileScreen from '../screens/ShopProfileScreen';
import KennelProfileScreen from '../screens/KennelProfileScreen';
import VerifyProfessionalScreen from '../screens/VerifyProfessionalScreen';
import AddressInputScreen from '../screens/AddressInputScreen';

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT
// Source of truth is the Supabase session. Role comes from user_metadata.
// ─────────────────────────────────────────────────────────────────────────────
type AuthContextType = {
  session: Session | null;
  userRole: string | null;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  userRole: null,
  isAuthenticated: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Register: undefined;
  MainTabs: undefined;
  ProfessionalOnboarding: { role?: string } | undefined;
  KennelOnboarding: undefined;
  ShopOnboarding: undefined;
  VetProfile: { vetId?: string } | undefined;
  ShopProfile: { shopId?: string } | undefined;
  KennelProfile: { kennelId?: string } | undefined;
  Chat: { recipientId?: string; recipientName?: string } | undefined;
  ExploreOptions: undefined;
  VerifyProfessional: undefined;
  AddressInput: undefined;
  SubscriptionScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB NAVIGATORS
// ─────────────────────────────────────────────────────────────────────────────
function UserTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"          component={HomeScreen}          options={{ tabBarIcon: icon('home') }} />
      <Tab.Screen name="Professionals" component={ProfessionalsScreen} options={{ title: 'Find Vets',  tabBarLabel: 'Vets',  tabBarIcon: icon('medkit') }} />
      <Tab.Screen name="Kennels"       component={KennelsScreen}       options={{ tabBarIcon: icon('paw') }} />
      <Tab.Screen name="Shops"         component={ShopsScreen}         options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: icon('basket') }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}       options={{ tabBarIcon: icon('person') }} />
    </Tab.Navigator>
  );
}

function ProfessionalTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"            component={HomeScreen}            options={{ tabBarIcon: icon('home') }} />
      <Tab.Screen name="Network"         component={ProfessionalsScreen}   options={{ tabBarIcon: icon('people') }} />
      <Tab.Screen name="Shops"           component={ShopsScreen}           options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: icon('basket') }} />
      <Tab.Screen name="Subscription"    component={SubscriptionScreen}    options={{ title: 'Subscription', tabBarIcon: icon('star') }} />
      <Tab.Screen name="VetVerification" component={VetVerificationScreen} options={{ title: 'Get Verified', tabBarLabel: 'Verify', tabBarIcon: icon('checkmark-circle') }} />
      <Tab.Screen name="Profile"         component={ProfileScreen}         options={{ tabBarIcon: icon('person') }} />
    </Tab.Navigator>
  );
}

function KennelOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"         component={HomeScreen}         options={{ tabBarIcon: icon('home') }} />
      <Tab.Screen name="Kennels"      component={KennelsScreen}      options={{ tabBarIcon: icon('paw') }} />
      <Tab.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription', tabBarIcon: icon('star') }} />
      <Tab.Screen name="Profile"      component={ProfileScreen}      options={{ tabBarIcon: icon('person') }} />
    </Tab.Navigator>
  );
}

function ShopOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"         component={HomeScreen}         options={{ tabBarIcon: icon('home') }} />
      <Tab.Screen name="Shops"        component={ShopsScreen}        options={{ title: 'My Shops', tabBarIcon: icon('basket') }} />
      <Tab.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription', tabBarIcon: icon('star') }} />
      <Tab.Screen name="Profile"      component={ProfileScreen}      options={{ tabBarIcon: icon('person') }} />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const { userRole } = useAuth();
  switch (userRole) {
    case 'vet':          return <ProfessionalTabs />;
    case 'kennel_owner': return <KennelOwnerTabs />;
    case 'shop_owner':   return <ShopOwnerTabs />;
    default:             return <UserTabs />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT NAVIGATOR
// ─────────────────────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Grab existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Stay in sync with Supabase auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const userRole = session?.user?.user_metadata?.role ?? null;
  const isAuthenticated = !!session;

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ session, userRole, isAuthenticated, signOut }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Auth"     component={AuthScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />

              {/* Modals */}
              <Stack.Screen name="ProfessionalOnboarding" component={ProfessionalOnboardingScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="KennelOnboarding"       component={KennelOnboardingScreen}       options={{ presentation: 'modal' }} />
              <Stack.Screen name="ShopOnboarding"         component={ShopOnboardingScreen}         options={{ presentation: 'modal' }} />

              {/* Detail screens */}
              <Stack.Screen name="VetProfile"     component={VetProfileScreen}     options={{ headerShown: true, title: 'Vet Profile' }} />
              <Stack.Screen name="ShopProfile"    component={ShopProfileScreen}    options={{ headerShown: true, title: 'Shop Profile' }} />
              <Stack.Screen name="KennelProfile"  component={KennelProfileScreen}  options={{ headerShown: true, title: 'Kennel Profile' }} />
              <Stack.Screen name="Chat"           component={ChatScreen}           options={{ headerShown: true, title: 'Chat' }} />
              <Stack.Screen name="ExploreOptions" component={ExploreOptionsScreen} options={{ headerShown: true, title: 'Explore' }} />

              {/* Verification */}
              <Stack.Screen name="VerifyProfessional" component={VerifyProfessionalScreen} options={{ headerShown: true, title: 'Verify Professional' }} />

              {/* Utilities */}
              <Stack.Screen name="AddressInput" component={AddressInputScreen} options={{ headerShown: true, title: 'Enter Address' }} />

              {/* Subscription */}
              <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} options={{ headerShown: true, title: 'Subscription' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}