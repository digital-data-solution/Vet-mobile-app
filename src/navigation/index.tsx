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
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '../api/supabase';
import type { Session } from '@supabase/supabase-js';

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
import VerifyProfessionalScreen     from '../screens/VerifyProfessionalScreen';
import AddressInputScreen           from '../screens/AddressInputScreen';
import PaystackWebView              from '../screens/PaystackWebView';
import EmailVerifiedScreen          from '../screens/EmailVerifiedScreen';
import ConversationsScreen          from '../screens/ConversationsScreen';
import ChatScreen                   from '../screens/ChatScreen';

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
  Auth:             undefined;
  Register:         undefined;
  MainTabs:         undefined;
  EmailVerified:    undefined;
  // Shared overlay screens
  VetProfile:             { vetId?: string } | undefined;
  ShopProfile:            { shopId?: string } | undefined;
  KennelProfile:          { kennelId?: string } | undefined;
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
  Messages:        undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab       = createBottomTabNavigator<TabParamList>();

// ─────────────────────────────────────────────────────────────────────────────
// DEEP LINKING CONFIG
// Maps incoming URLs to screen names in RootStack.
// Web:    https://xpressvetmarketplace.com/auth/callback  → EmailVerified
// Native: xpressvet://verify-email                        → EmailVerified
// ─────────────────────────────────────────────────────────────────────────────
const linking = {
  prefixes: [
    'https://xpressvetmarketplace.com',
    'http://xpressvetmarketplace.com',
    'xpressvet://',
  ],
  config: {
    screens: {
      EmailVerified: 'auth/callback',
      Auth:          'auth/login',
      Register:      'auth/register',
      MainTabs:      {
        screens: {
          Home:          'home',
          Professionals: 'professionals',
          Kennels:       'kennels',
          Shops:         'shops',
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
      <Tab.Screen name="Home"          component={HomeScreen}          options={{ tabBarIcon: TabIcon('home'),     headerShown: false }} />
      <Tab.Screen name="Professionals" component={ProfessionalsScreen} options={{ title: 'Find Vets', tabBarLabel: 'Vets', tabBarIcon: TabIcon('medkit'),  headerShown: false }} />
      <Tab.Screen name="Kennels"       component={KennelsScreen}       options={{ tabBarIcon: TabIcon('paw'),      headerShown: false }} />
      <Tab.Screen name="Shops"         component={ShopsScreen}         options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: TabIcon('basket'), headerShown: false }} />
      <Tab.Screen name="Messages"      component={ConversationsScreen} options={{ title: 'Messages', tabBarIcon: TabIcon('chatbubbles-outline'), headerShown: false }} />
      <Tab.Screen name="Subscription"  component={SubscriptionScreen}  options={{ title: 'Subscription', tabBarLabel: 'Plans', tabBarIcon: TabIcon('star'), headerShown: false }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}       options={{ tabBarIcon: TabIcon('person'),   headerShown: false }} />
    </Tab.Navigator>
  );
}

function ProfessionalTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"            component={HomeScreen}           options={{ tabBarIcon: TabIcon('home'),             headerShown: false }} />
      <Tab.Screen name="Network"         component={ProfessionalsScreen}  options={{ tabBarIcon: TabIcon('people'),            headerShown: false }} />
      <Tab.Screen name="Shops"           component={ShopsScreen}          options={{ title: 'Pet Shops', tabBarLabel: 'Shops', tabBarIcon: TabIcon('basket'), headerShown: false }} />
      <Tab.Screen name="Subscription"    component={SubscriptionScreen}   options={{ title: 'Subscription', tabBarIcon: TabIcon('star'),            headerShown: false }} />
      <Tab.Screen name="Messages"        component={ConversationsScreen}  options={{ title: 'Messages', tabBarIcon: TabIcon('chatbubbles-outline'), headerShown: false }} />
      <Tab.Screen name="VetVerification" component={VetVerificationScreen} options={{ title: 'Get Verified', tabBarLabel: 'Verify', tabBarIcon: TabIcon('checkmark-circle'), headerShown: false }} />
      <Tab.Screen name="Profile"         component={ProfileScreen}        options={{ tabBarIcon: TabIcon('person'),            headerShown: false }} />
    </Tab.Navigator>
  );
}

function KennelOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"         component={HomeScreen}         options={{ tabBarIcon: TabIcon('home'),  headerShown: false }} />
      <Tab.Screen name="Kennels"      component={KennelsScreen}      options={{ tabBarIcon: TabIcon('paw'),   headerShown: false }} />
      <Tab.Screen name="Messages"     component={ConversationsScreen} options={{ title: 'Messages', tabBarIcon: TabIcon('chatbubbles-outline'), headerShown: false }} />
      <Tab.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription', tabBarIcon: TabIcon('star'),   headerShown: false }} />
      <Tab.Screen name="Profile"      component={ProfileScreen}      options={{ tabBarIcon: TabIcon('person'), headerShown: false }} />
    </Tab.Navigator>
  );
}

function ShopOwnerTabs() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home"         component={HomeScreen}         options={{ tabBarIcon: TabIcon('home'),   headerShown: false }} />
      <Tab.Screen name="Shops"        component={ShopsScreen}        options={{ title: 'My Shops', tabBarIcon: TabIcon('basket'), headerShown: false }} />
      <Tab.Screen name="Messages"     component={ConversationsScreen} options={{ title: 'Messages', tabBarIcon: TabIcon('chatbubbles-outline'), headerShown: false }} />
      <Tab.Screen name="Subscription" component={SubscriptionScreen} options={{ title: 'Subscription', tabBarIcon: TabIcon('star'),    headerShown: false }} />
      <Tab.Screen name="Profile"      component={ProfileScreen}      options={{ tabBarIcon: TabIcon('person'), headerShown: false }} />
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUserRole(null);
  }, []);

  const isAuthenticated = !!session;

  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider value={{ session, userRole, isAuthenticated, signOut, refreshRole }}>
      <NavigationErrorBoundary>
        <NavigationContainer linking={linking}>
          <RootStack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName={isAuthenticated ? 'MainTabs' : 'Auth'}
          >

            {/*
             * EmailVerified is ALWAYS registered regardless of auth state.
             * The email confirmation link hits /auth/callback whether the
             * user is logged in or not — so it must be reachable from both.
             */}
            <RootStack.Screen
              name="EmailVerified"
              component={EmailVerifiedScreen}
              options={{ headerShown: false }}
            />

            {!isAuthenticated ? (
              <>
                <RootStack.Screen name="Auth"     component={AuthScreen} />
                <RootStack.Screen name="Register" component={RegisterScreen} />
              </>
            ) : (
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
