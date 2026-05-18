/**
 * Screen Wrapper Utility
 * 
 * Use this to wrap screens that have typing issues with React Navigation
 * This ensures compatibility between your screen component types and React Navigation's expectations
 */

import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Wraps a screen component to make it compatible with React Navigation
 * even if it has custom prop types
 * 
 * @example
 * // In your AppNavigator:
 * <Stack.Screen 
 *   name="Chat" 
 *   component={wrapScreen(ChatScreen)} 
 * />
 */
export function wrapScreen<T = any>(
  Component: React.ComponentType<any>
): React.ComponentType<T> {
  return (props: any) => <Component {...props} />;
}

/**
 * Alternative: Create a higher-order component that passes navigation props
 * Use this if your screen expects specific prop names
 */
export function withNavigation<T = any>(
  Component: React.ComponentType<any>
) {
  return function WrappedComponent(props: any) {
    return <Component {...props} navigation={props.navigation} route={props.route} />;
  };
}

/**
 * Type-safe wrapper that preserves TypeScript types
 */
export function createScreen<TParams = any>(
  Component: React.ComponentType<NativeStackScreenProps<any, any>>
): React.ComponentType<NativeStackScreenProps<any, any>> {
  return Component;
}