import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tabs for regular users (looking for vets/shops)
function UserTabs() {
  return (
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
    </Tab.Navigator>
  );
}

// Tabs for veterinarians and shop owners
function ProfessionalTabs() {
  return (
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
    </Tab.Navigator>
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
        <Stack.Screen name="MainTabs">
          {() => (userRole === 'vet' || userRole === 'kennel_owner') ? <ProfessionalTabs /> : <UserTabs />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
