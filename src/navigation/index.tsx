import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  Component,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../api/supabase';
import type { Session } from '@supabase/supabase-js';

import HomeScreen                  from '../screens/HomeScreen';
import AuthScreen                  from '../screens/AuthScreen';
import RegisterScreen              from '../screens/RegisterScreen';
import ProfessionalsScreen         from '../screens/ProfessionalsScreen';
import ShopsScreen                 from '../screens/ShopsScreen';
import KennelsScreen               from '../screens/KennelsScreen';
import ProfileScreen               from '../screens/ProfileScreen';
import SubscriptionScreen          from '../screens/SubscriptionScreen';
import VetVerificationScreen       from '../screens/VetVerificationScreen';
import ProfessionalOnboardingScreen from '../screens/ProfessionalOnboardingScreen';
import KennelOnboardingScreen      from '../screens/KennelOnboardingScreen';
import ShopOnboardingScreen        from '../screens/ShopOnboardingScreen';
import ExploreOptionsScreen        from '../screens/ExploreOptionsScreen';
import VetProfileScreen            from '../screens/VetProfileScreen';
import ShopProfileScreen           from '../screens/ShopProfileScreen';
import KennelProfileScreen         from '../screens/KennelProfileScreen';
import VerifyProfessionalScreen    from '../screens/VerifyProfessionalScreen';
import AddressInputScreen          from '../screens/AddressInputScreen';
import PaystackWebView             from '../screens/PaystackWebView';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type UserRole = 'vet' | 'kennel_owner' | 'shop_owner' | 'pet_owner' | null;

type AuthContextType = {
  session:         Session | null;
  userRole:        UserRole;
  isAuthenticated: boolean;
  signOut:         () => Promise<void>;
  refreshRole:     () => Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextType>({
  session:         null,
  userRole:        null,
  isAuthenticated: false,
  signOut:         async () => {},
  refreshRole:     async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION PARAM LISTS
// ─────────────────────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth:     undefined;
  Register: undefined;
  MainTabs: undefined;
  // Shared overlay screens (accessible from anywhere without tab nesting)
  VetProfile:             { vetId?: string } | undefined;
  ShopProfile:            { shopId?: string } | undefined;
  KennelProfile:          { kennelId?: string } | undefined;
  ExploreOptions:         undefined;
  VerifyProfessional:     undefined;
  AddressInput:           undefined;
  SubscriptionScreen:     undefined;
  ProfessionalOnboarding: { role?: string } | undefined;
  KennelOnboarding:       undefined;
  ShopOnboarding:         undefined;
  PaystackWebView: {
    authorization_url: string;
    reference:         string;
    amount:            number;
    callbackKey:       string;
  };
};

export type TabParamList = {
  Home:            undefined;
  Professionals:   undefined;
  Kennels:         undefined;
  Shops:           undefined;
  Profile:         undefined;
  Subscription:    undefined;
  Network:         undefined;
  VetVerification: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab       = createBottomTabNavigator<TabParamList>();

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <Text style={styles.appName}>Xpress Vet</Text>
      <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 24 }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────
type ErrorBoundaryState = { hasError: boolean; message: string };

class NavigationErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[NavigationErrorBoundary]', error, info);
  }

  handleRetry = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const tabScreenOptions = {
  tabBarActiveTintColor:   '#007AFF',
  tabBarInactiveTintColor: '#8E8E93',
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopColor:  '#E5E5EA',
    borderTopWidth:  1,
    paddingBottom:   5,
    paddingTop:      5,
    height:          60,
  },
  headerStyle:      { backgroundColor: '#007AFF' },
  headerTintColor:  '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

function TabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB NAVIGATORS
// Each tab shows only its own root screen. Shared screens (VetProfile, Chat,
// SubscriptionScreen, PaystackWebView, etc.) live in the RootStack so they
// are accessible from any tab without duplication.
// ─────────────────────────────────────────────────────────────────────────────
function UserTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: TabIcon('home'), headerShown: false }}
      />
      <Tab.Screen
        name="Professionals"
        component={ProfessionalsScreen}
        options={{ title: 'Find Vets', tabBarLabel: 'Vets', tabBarIcon: TabIcon('medkit'), headerShown: false }}
      />
      <Tab.Screen
        name="Kennels"
        component={KennelsScreen}
        options={{ tabBarIcon: TabIcon('paw'), headerShown: false }}
      />
      <Tab.Screen
        name="Shops"
        component={ShopsScreen}
        options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: TabIcon('basket'), headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: TabIcon('person'), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function ProfessionalTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: TabIcon('home'), headerShown: false }}
      />
      <Tab.Screen
        name="Network"
        component={ProfessionalsScreen}
        options={{ tabBarIcon: TabIcon('people'), headerShown: false }}
      />
      <Tab.Screen
        name="Shops"
        component={ShopsScreen}
        options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: TabIcon('basket'), headerShown: false }}
      />
      <Tab.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscription', tabBarIcon: TabIcon('star'), headerShown: false }}
      />
      <Tab.Screen
        name="VetVerification"
        component={VetVerificationScreen}
        options={{ title: 'Get Verified', tabBarLabel: 'Verify', tabBarIcon: TabIcon('checkmark-circle'), headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: TabIcon('person'), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function KennelOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: TabIcon('home'), headerShown: false }}
      />
      <Tab.Screen
        name="Kennels"
        component={KennelsScreen}
        options={{ tabBarIcon: TabIcon('paw'), headerShown: false }}
      />
      <Tab.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscription', tabBarIcon: TabIcon('star'), headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: TabIcon('person'), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

function ShopOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: TabIcon('home'), headerShown: false }}
      />
      <Tab.Screen
        name="Shops"
        component={ShopsScreen}
        options={{ title: 'My Shops', tabBarIcon: TabIcon('basket'), headerShown: false }}
      />
      <Tab.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: 'Subscription', tabBarIcon: TabIcon('star'), headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: TabIcon('person'), headerShown: false }}
      />
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
  const [session,  setSession]  = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading,  setLoading]  = useState(true);

  // ------------------------------------------------------------------
  // Fetch the canonical role from MongoDB via GET /api/auth/me.
  // Falls back to Supabase user_metadata role if the backend is down.
  // ------------------------------------------------------------------
  const fetchRoleFromBackend = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setUserRole(null);
      return;
    }

    try {
      const token = currentSession.access_token;
      const res   = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        // Response shape: { user: { role, ... } }
        const role = json?.user?.role as UserRole ?? null;
        setUserRole(role);
      } else {
        // Backend unreachable or user not synced yet — fall back to metadata
        const metaRole = (currentSession.user?.user_metadata?.role as UserRole) ?? 'pet_owner';
        setUserRole(metaRole);
      }
    } catch {
      // Network error — fall back gracefully
      const metaRole = (currentSession.user?.user_metadata?.role as UserRole) ?? 'pet_owner';
      setUserRole(metaRole);
    }
  }, []);

  // ------------------------------------------------------------------
  // Exposed via context so any screen (e.g. after onboarding completes)
  // can trigger a role refresh without requiring a full sign-out/sign-in.
  // ------------------------------------------------------------------
  const refreshRole = useCallback(async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    await fetchRoleFromBackend(current);
  }, [fetchRoleFromBackend]);

  // ------------------------------------------------------------------
  // Bootstrap: load session + role on mount, then subscribe to changes
  // ------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data: { session: initial } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(initial);
      await fetchRoleFromBackend(initial);
      setLoading(false);
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        await fetchRoleFromBackend(newSession);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRoleFromBackend]);

  // ------------------------------------------------------------------
  // signOut — wrapped in useCallback so context consumers don't
  // re-render unnecessarily.
  // ------------------------------------------------------------------
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserRole(null);
  }, []);

  const isAuthenticated = !!session;

  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ session, userRole, isAuthenticated, signOut, refreshRole }}>
      <NavigationErrorBoundary>
        <NavigationContainer>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
              // ── Auth screens ──────────────────────────────────────────────
              <>
                <RootStack.Screen name="Auth"     component={AuthScreen} />
                <RootStack.Screen name="Register" component={RegisterScreen} />
              </>
            ) : (
              // ── Authenticated screens ─────────────────────────────────────
              <>
                {/* Bottom tabs (flat root screens only) */}
                <RootStack.Screen name="MainTabs" component={MainTabs} />

                {/*
                 * Shared overlay screens — defined ONCE here in RootStack.
                 * Any tab can reach these via navigation.navigate('VetProfile')
                 * without needing getParent() hacks or duplicate registrations.
                 */}
                <RootStack.Screen
                  name="VetProfile"
                  component={VetProfileScreen}
                  options={{ headerShown: true, title: 'Vet Profile' }}
                />
                <RootStack.Screen
                  name="ShopProfile"
                  component={ShopProfileScreen}
                  options={{ headerShown: true, title: 'Shop Profile' }}
                />
                <RootStack.Screen
                  name="KennelProfile"
                  component={KennelProfileScreen}
                  options={{ headerShown: true, title: 'Kennel Profile' }}
                />
                <RootStack.Screen
                  name="ExploreOptions"
                  component={ExploreOptionsScreen}
                  options={{ headerShown: true, title: 'Explore' }}
                />
                <RootStack.Screen
                  name="VerifyProfessional"
                  component={VerifyProfessionalScreen}
                  options={{ headerShown: true, title: 'Verify Professional' }}
                />
                <RootStack.Screen
                  name="AddressInput"
                  component={AddressInputScreen}
                  options={{ headerShown: true, title: 'Enter Address' }}
                />
                <RootStack.Screen
                  name="SubscriptionScreen"
                  component={SubscriptionScreen}
                  options={{ headerShown: true, title: 'Subscription' }}
                />
                <RootStack.Screen
                  name="ProfessionalOnboarding"
                  component={ProfessionalOnboardingScreen}
                  options={{ presentation: 'modal', headerShown: true, title: 'Professional Onboarding' }}
                />
                <RootStack.Screen
                  name="KennelOnboarding"
                  component={KennelOnboardingScreen}
                  options={{ presentation: 'modal', headerShown: true, title: 'Kennel Onboarding' }}
                />
                <RootStack.Screen
                  name="ShopOnboarding"
                  component={ShopOnboardingScreen}
                  options={{ presentation: 'modal', headerShown: true, title: 'Shop Onboarding' }}
                />
                <RootStack.Screen
                  name="PaystackWebView"
                  component={PaystackWebView}
                  options={{ headerShown: false }}
                />
              </>
            )}
          </RootStack.Navigator>
        </NavigationContainer>
      </NavigationErrorBoundary>
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: '#fff',
    padding:         24,
  },
  appName: {
    fontSize:   28,
    fontWeight: '700',
    color:      '#007AFF',
    letterSpacing: 0.5,
  },
  errorTitle: {
    fontSize:   20,
    fontWeight: '700',
    color:      '#1C1C1E',
    marginTop:  16,
  },
  errorMessage: {
    fontSize:   14,
    color:      '#8E8E93',
    marginTop:  8,
    textAlign:  'center',
  },
  retryButton: {
    marginTop:       24,
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical:   12,
    borderRadius:    10,
  },
  retryText: {
    color:      '#fff',
    fontSize:   16,
    fontWeight: '600',
  },
});