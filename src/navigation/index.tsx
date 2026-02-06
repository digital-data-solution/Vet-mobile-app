import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../screens/AuthScreen';
import ProfessionalsScreen from '../screens/ProfessionalsScreen';
import ShopsScreen from '../screens/ShopsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import VetVerificationScreen from '../screens/VetVerificationScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Professionals" component={ProfessionalsScreen} />
        <Stack.Screen name="Shops" component={ShopsScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="VetVerification" component={VetVerificationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
