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
  Pressable,
} from 'react-native';
import { NavigationContainer, NavigatorScreenParams, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../api/supabase';

import HomeScreen                   from '../screens/HomeScreen';
import AuthScreen                   from '../screens/AuthScreen';
import RegisterScreen               from '../screens/RegisterScreen';
import ProfessionalsScreen          from '../screens/ProfessionalsScreen';
import ShopsScreen                  from '../screens/ShopsScreen';
import KennelsScreen                from '../screens/KennelsScreen';
import ProfileScreen                from '../screens/ProfileScreen';
import SubscriptionScreen           from '../screens/SubscriptionScreen';
import VetVerificationScreen        from '../screens/VetVerificationScreen';
import ProfessionalOnboardingScreen from '../screens/ProfessionalOnboardingScreen';
import KennelOnboardingScreen       from '../screens/KennelOnboardingScreen';
import ShopOnboardingScreen         from '../screens/ShopOnboardingScreen';
import ExploreOptionsScreen         from '../screens/ExploreOptionsScreen';
import VetProfileScreen             from '../screens/VetProfileScreen';
import ShopProfileScreen            from '../screens/ShopProfileScreen';
import KennelProfileScreen          from '../screens/KennelProfileScreen';
import ServiceProfileScreen         from '../screens/ServiceProfileScreen';
import ServiceScreen                from '../screens/ServiceScreen';
import VerifyProfessionalScreen     from '../screens/VerifyProfessionalScreen';
import AddressInputScreen           from '../screens/AddressInputScreen';
import PaystackWebView              from '../screens/PaystackWebView';
import EmailVerifiedScreen          from '../screens/EmailVerifiedScreen';
import ConversationsScreen          from '../screens/ConversationsScreen';
import ChatScreen                   from '../screens/ChatScreen';
import PrivacyPolicyScreen          from '../screens/PrivacyPolicyScreen';
import TermsScreen                  from '../screens/TermsScreen';
import SupportScreen                from '../screens/SupportScreen';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com';

import type { Session } from '@supabase/supabase-js';
let _bootstrapSession: Session | null | undefined = undefined;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type UserRole =
  | 'vet' | 'kennel_owner' | 'shop_owner' | 'pet_owner'
  | 'groomer' | 'trainer' | 'pet_sitter'
  | 'pet_transport' | 'cremation_service' | 'agro_vet_supplier' | 'insurance_provider'
  | 'pet_pharmacy' | 'rescue_center' | 'pet_hotel'
  | null;

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
  Auth:             undefined;
  Register:         undefined;
  MainTabs:         NavigatorScreenParams<TabParamList> | undefined;
  EmailVerified:    undefined;
  VetProfile:             { vetId?: string } | undefined;
  ShopProfile:            { shopId?: string } | undefined;
  KennelProfile:          { kennelId?: string } | undefined;
  ServiceProfile:         { professionalId: string };
  ExploreOptions:         undefined;
  VerifyProfessional:     undefined;
  AddressInput:           { mode?: 'professional' } | undefined;
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
  Chat: { otherUserId: string; otherUserName: string };
  PrivacyPolicy: undefined;
  Terms:         undefined;
  Support:       undefined;
};

export type TabParamList = {
  Home:            undefined;
  Professionals:   undefined;
  Kennels:         undefined;
  Shops:           undefined;
  Services:        undefined;
  Profile:         undefined;
  Subscription:    undefined;
  Network:         undefined;
  VetVerification: undefined;
  Messages:        undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab       = createBottomTabNavigator<TabParamList>();

// ─────────────────────────────────────────────────────────────────────────────
// DEEP LINKING CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_WEB_PATHS = [
  '/auth/callback',
  '/auth/login',
  '/auth/register',
  '/privacy-policy',
  '/terms-and-conditions',
  '/support',
];

const AUTH_WEB_PATHS = [
  '/home',
  '/professionals',
  '/kennels',
  '/shops',
  '/profile',
  '/services',
  '/messages',
  '/subscription',
  '/network',
  '/verify',
  '/VetProfile',
  '/ShopProfile',
  '/KennelProfile',
  '/ServiceProfile',
  '/ExploreOptions',
  '/VerifyProfessional',
];

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'https://xpressvetmarketplace.com',
    'http://xpressvetmarketplace.com',
    'xpressvet://',
  ],
  getInitialURL: async () => {
    if (typeof window === 'undefined') return null;
    const { pathname, origin, href } = window.location;

    const matchesPath = (list: string[]) =>
      list.some((p) => pathname === p || pathname.startsWith(p + '?') || pathname.startsWith(p + '/'));

    if (matchesPath(PUBLIC_WEB_PATHS)) return href;

    if (matchesPath(AUTH_WEB_PATHS)) {
      if (_bootstrapSession) return href;
      // Only save non-root paths as redirect targets to avoid loop
      if (pathname !== '/') {
        try { sessionStorage.setItem('postLoginRedirect', href); } catch {}
      }
      return origin + '/';
    }

    return origin + '/';
  },
  config: {
    screens: {
      EmailVerified: 'auth/callback',
      Auth:          'auth/login',
      Register:      'auth/register',
      PrivacyPolicy: 'privacy-policy',
      Terms:         'terms-and-conditions',
      Support:       'support',
      VetProfile:     { path: 'VetProfile',     parse: { vetId:          String } },
      ShopProfile:    { path: 'ShopProfile',     parse: { shopId:         String } },
      KennelProfile:  { path: 'KennelProfile',   parse: { kennelId:       String } },
      ServiceProfile: { path: 'ServiceProfile',  parse: { professionalId: String } },
      ExploreOptions: 'ExploreOptions',
      VerifyProfessional: 'VerifyProfessional',
      MainTabs:      {
        screens: {
          Home:          'home',
          Professionals: 'professionals',
          Kennels:       'kennels',
          Shops:         'shops',
          Services:      'services',
          Messages:      'messages',
          Subscription:  'subscription',
          Network:       'network',
          VetVerification: 'verify',
          Profile:       'profile',
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View style={styles.centered}>
      <Text style={styles.appName}>Xpress Vet</Text>
      <ActivityIndicator size="large" color="#E8610A" style={{ marginTop: 24 }} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────────────────────
type ErrorBoundaryState = { hasError: boolean; message: string };

class NavigationErrorBoundary extends Component
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[NavigationErrorBoundary]', error, info);
    const { Platform } = require('react-native');
    fetch(`${BASE_URL}/api/v1/report-error`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error:    error.message,
        stack:    error.stack,
        platform: Platform.OS,
        url:      typeof window !== 'undefined' ? window.location?.href : undefined,
      }),
    }).catch(() => {});
  }

  handleRetry = () => this.setState({ hasError: false, message: '' });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.message}</Text>
          <Pressable style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
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
  tabBarActiveTintColor:   '#E8610A',
  tabBarInactiveTintColor: '#8E8E93',
  tabBarStyle: {
    backgroundColor: '#fff',
    borderTopColor:  '#E5E5EA',
    borderTopWidth:  1,
    paddingBottom:   5,
    paddingTop:      5,
    height:          60,
  },
  headerStyle:      { backgroundColor: '#E8610A' },
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
// ─────────────────────────────────────────────────────────────────────────────
function UserTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"          component={HomeScreen}          options={{ tabBarIcon: TabIcon('home'),               headerShown: false }} />
      <Tab.Screen name="Professionals" component={ProfessionalsScreen} options={{ title: 'Find Vets', tabBarLabel: 'Vets',   tabBarIcon: TabIcon('medkit'),            headerShown: false }} />
      <Tab.Screen name="Kennels"       component={KennelsScreen}       options={{ tabBarIcon: TabIcon('paw'),                headerShown: false }} />
      <Tab.Screen name="Shops"         component={ShopsScreen}         options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: TabIcon('basket'),            headerShown: false }} />
      <Tab.Screen name="Services"      component={ServiceScreen}       options={{ title: 'Pet Services', tabBarLabel: 'Services', tabBarIcon: TabIcon('grid-outline'), headerShown: false }} />
      <Tab.Screen name="Messages"      component={ConversationsScreen} options={{ title: 'Messages',     tabBarIcon: TabIcon('chatbubbles-outline'),                   headerShown: false }} />
      <Tab.Screen name="Subscription"  component={SubscriptionScreen}  options={{ title: 'Subscription', tabBarLabel: 'Plans', tabBarIcon: TabIcon('star'),           headerShown: false }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}       options={{ tabBarIcon: TabIcon('person'),              headerShown: false }} />
    </Tab.Navigator>
  );
}

function ProfessionalTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"            component={HomeScreen}            options={{ tabBarIcon: TabIcon('home'),                headerShown: false }} />
      <Tab.Screen name="Network"         component={ProfessionalsScreen}   options={{ tabBarIcon: TabIcon('people'),              headerShown: false }} />
      <Tab.Screen name="Professionals"   component={ProfessionalsScreen}   options={{ tabBarButton: () => null,                  headerShown: false }} />
      <Tab.Screen name="Kennels"         component={KennelsScreen}         options={{ tabBarButton: () => null,                  headerShown: false }} />
      <Tab.Screen name="Services"        component={ServiceScreen}         options={{ title: 'Pet Services', tabBarLabel: 'Services', tabBarIcon: TabIcon('grid-outline'), headerShown: false }} />
      <Tab.Screen name="Shops"           component={ShopsScreen}           options={{ title: 'Pet Shops', tabBarLabel: 'Shops',   tabBarIcon: TabIcon('basket'),          headerShown: false }} />
      <Tab.Screen name="Subscription"    component={SubscriptionScreen}    options={{ title: 'Subscription', tabBarIcon: TabIcon('star'),                                  headerShown: false }} />
      <Tab.Screen name="Messages"        component={ConversationsScreen}   options={{ title: 'Messages',     tabBarIcon: TabIcon('chatbubbles-outline'),                   headerShown: false }} />
      <Tab.Screen name="VetVerification" component={VetVerificationScreen} options={{ title: 'Get Verified', tabBarLabel: 'Verify', tabBarIcon: TabIcon('checkmark-circle'), headerShown: false }} />
      <Tab.Screen name="Profile"         component={ProfileScreen}         options={{ tabBarIcon: TabIcon('person'),              headerShown: false }} />
    </Tab.Navigator>
  );
}

function KennelOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"          component={HomeScreen}          options={{ tabBarIcon: TabIcon('home'),  headerShown: false }} />
      <Tab.Screen name="Kennels"       component={KennelsScreen}       options={{ tabBarIcon: TabIcon('paw'),   headerShown: false }} />
      <Tab.Screen name="Professionals" component={ProfessionalsScreen} options={{ tabBarButton: () => null,     headerShown: false }} />
      <Tab.Screen name="Services"      component={ServiceScreen}       options={{ tabBarButton: () => null,     headerShown: false }} />
      <Tab.Screen name="Shops"         component={ShopsScreen}         options={{ tabBarButton: () => null,     headerShown: false }} />
      <Tab.Screen name="Messages"      component={ConversationsScreen} options={{ title: 'Messages', tabBarIcon: TabIcon('chatbubbles-outline'), headerShown: false }} />
      <Tab.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription', tabBarIcon: TabIcon('star'), headerShown: false }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}       options={{ tabBarIcon: TabIcon('person'), headerShown: false }} />
    </Tab.Navigator>
  );
}

function ShopOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"          component={HomeScreen}          options={{ tabBarIcon: TabIcon('home'),   headerShown: false }} />
      <Tab.Screen name="Shops"         component={ShopsScreen}         options={{ title: 'My Shops', tabBarIcon: TabIcon('basket'), headerShown: false }} />
      <Tab.Screen name="Professionals" component={ProfessionalsScreen} options={{ tabBarButton: () => null,     headerShown: false }} />
      <Tab.Screen name="Kennels"       component={KennelsScreen}       options={{ tabBarButton: () => null,     headerShown: false }} />
      <Tab.Screen name="Services"      component={ServiceScreen}       options={{ tabBarButton: () => null,     headerShown: false }} />
      <Tab.Screen name="Messages"      component={ConversationsScreen} options={{ title: 'Messages', tabBarIcon: TabIcon('chatbubbles-outline'), headerShown: false }} />
      <Tab.Screen name="Subscription"  component={SubscriptionScreen}  options={{ title: 'Subscription', tabBarIcon: TabIcon('star'), headerShown: false }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}       options={{ tabBarIcon: TabIcon('person'), headerShown: false }} />
    </Tab.Navigator>
  );
}

const SERVICE_PROFESSIONAL_ROLES = new Set([
  'vet', 'groomer', 'trainer', 'pet_sitter',
  'pet_transport', 'cremation_service', 'agro_vet_supplier', 'insurance_provider',
  'pet_pharmacy', 'rescue_center', 'pet_hotel',
]);

function MainTabs() {
  const { userRole } = useAuth();
  if (userRole && SERVICE_PROFESSIONAL_ROLES.has(userRole)) return <ProfessionalTabs />;
  switch (userRole) {
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

  const isAuthenticated = !!session;

  const fetchRoleFromBackend = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setUserRole(null);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setUserRole((json?.user?.role as UserRole) ?? null);
      } else {
        setUserRole((currentSession.user?.user_metadata?.role as UserRole) ?? 'pet_owner');
      }
    } catch {
      setUserRole((currentSession.user?.user_metadata?.role as UserRole) ?? 'pet_owner');
    }
  }, []);

  const refreshRole = useCallback(async () => {
    const { data: { session: current } } = await supabase.auth.getSession();
    await fetchRoleFromBackend(current);
  }, [fetchRoleFromBackend]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data: { session: initial } } = await supabase.auth.getSession();
      if (!mounted) return;
      _bootstrapSession = initial;
      setSession(initial);
      await fetchRoleFromBackend(initial);
      setLoading(false);
    };

    bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        _bootstrapSession = newSession;
        if (!newSession && typeof window !== 'undefined' && window.history) {
          const { pathname } = window.location;
          const isPublic =
            pathname === '/' ||
            PUBLIC_WEB_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
          if (!isPublic) window.history.replaceState({}, '', '/');
        }
        setSession(newSession);
        await fetchRoleFromBackend(newSession);
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRoleFromBackend]);

  // After login, redirect to the URL the user was trying to reach before auth.
  // Use history.replaceState instead of window.location.href to avoid full reload loop.
  useEffect(() => {
    if (!isAuthenticated || loading) return;
    if (typeof window === 'undefined') return;
    try {
      const pending = sessionStorage.getItem('postLoginRedirect');
      if (!pending) return;
      sessionStorage.removeItem('postLoginRedirect');
      const url = new URL(pending);
      // Only redirect if it's a different non-root path to avoid loop
      if (url.pathname !== '/' && url.pathname !== window.location.pathname) {
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } catch {}
  }, [isAuthenticated, loading]);

  // Reset URL to root when unauthenticated and on a protected path
  useEffect(() => {
    if (loading || isAuthenticated) return;
    if (typeof window !== 'undefined' && window.history) {
      const { pathname } = window.location;
      const isPublic =
        pathname === '/' ||
        PUBLIC_WEB_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
      if (!isPublic) window.history.replaceState({}, '', '/');
    }
  }, [isAuthenticated, loading]);

  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
    setSession(null);
    setUserRole(null);
    await supabase.auth.signOut();
  }, []);

  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ session, userRole, isAuthenticated, signOut, refreshRole }}>
      <NavigationErrorBoundary>
        <NavigationContainer linking={linking}>
          <RootStack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={isAuthenticated ? 'MainTabs' : 'Auth'}
          >
            <RootStack.Screen name="Auth"     component={AuthScreen} />
            <RootStack.Screen name="Register" component={RegisterScreen} />
            <RootStack.Screen
              name="EmailVerified"
              component={EmailVerifiedScreen}
              options={{ headerShown: false }}
            />
            <RootStack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ headerShown: false }}
            />
            <RootStack.Screen
              name="Terms"
              component={TermsScreen}
              options={{ headerShown: false }}
            />
            <RootStack.Screen
              name="Support"
              component={SupportScreen}
              options={{ headerShown: false }}
            />

            {isAuthenticated && (
              <>
                <RootStack.Screen name="MainTabs" component={MainTabs} />
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
                  name="ServiceProfile"
                  component={ServiceProfileScreen}
                  options={{ headerShown: true, title: 'Profile' }}
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
                <RootStack.Screen
                  name="Chat"
                  component={ChatScreen}
                  options={({ route }) => ({
                    headerShown: true,
                    title: route.params.otherUserName,
                    headerStyle:      { backgroundColor: '#E8610A' },
                    headerTintColor:  '#fff',
                    headerTitleStyle: { fontWeight: 'bold' },
                  })}
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
    fontSize:      28,
    fontWeight:    '700',
    color:         '#E8610A',
    letterSpacing: 0.5,
  },
  errorTitle: {
    fontSize:   20,
    fontWeight: '700',
    color:      '#1C1C1E',
    marginTop:  16,
  },
  errorMessage: {
    fontSize:  14,
    color:     '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop:         24,
    backgroundColor:   '#E8610A',
    paddingHorizontal: 32,
    paddingVertical:   12,
    borderRadius:      10,
  },
  retryText: {
    color:      '#fff',
    fontSize:   16,
    fontWeight: '600',
  },
});