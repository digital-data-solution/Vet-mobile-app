import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../api/supabase';

export default function EmailVerifiedScreen({ navigation }: any) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const handleWebCallback = async () => {
      try {
        // On web, Supabase auto-handles the token from the URL
        // We just need to check if a session exists after it processes
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');

          // Wait 2 seconds then navigate to main app
          setTimeout(() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }], // adjust to your home screen name
            });
          }, 2000);
        } else {
          // Token may still be processing — listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
              if (event === 'SIGNED_IN' && session) {
                setStatus('success');
                setMessage('Your email has been verified successfully!');
                subscription.unsubscribe();

                setTimeout(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                  });
                }, 2000);
              }
            }
          );

          // Timeout fallback
          setTimeout(() => {
            setStatus('error');
            setMessage('Verification timed out. Please try signing in.');
          }, 8000);
        }
      } catch (err) {
        setStatus('error');
        setMessage('Verification failed. Please try again.');
      }
    };

    handleWebCallback();
  }, []);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color="#E8610A" />
          <Text style={styles.message}>{message}</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Text style={styles.icon}>🎉</Text>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>
            Welcome to Xpress Vet Marketplace. Redirecting you now...
          </Text>
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={styles.icon}>❌</Text>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C0F00',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#E8610A',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});