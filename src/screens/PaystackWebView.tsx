/**
 * PaystackWebView.tsx
 *
 * Renders Paystack's hosted payment page inside an in-app WebView.
 * Intercepts the Paystack callback URL to detect success / cancellation
 * without ever leaving the app.
 *
 * Navigation params expected:
 *   authorization_url  – URL returned by your backend's initialise-transaction call
 *   reference          – Paystack transaction reference (tx_ref / reference)
 *   amount             – Naira amount (number)
 *   callbackKey        – Key used to look up onSuccess/onCancel from paystackCallbackStore
 *
 * IMPORTANT: Register this screen on your ROOT stack, outside any Tab.Navigator:
 *   <Stack.Screen name="PaystackWebView" component={PaystackWebView} options={{ headerShown: false }} />
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import {
  clearPaystackCallbacks,
  getPaystackCallbacks,
  PaystackCallbacks,
} from '../utils/paystackCallbackStore';

// ─── Paystack URL patterns ────────────────────────────────────────────────────
//
// SUCCESS: Paystack closes its own page after a completed charge.
//   paystack.com/close  — Paystack's own close signal (most reliable)
//   /callback           — your PAYSTACK_CALLBACK_URL, only reached on success
//
// CANCEL: user explicitly abandons the payment.
//   paystack.com/cancel — Paystack's cancel redirect
//
// ORDER MATTERS: check cancel BEFORE success so that if a URL somehow
// contains both patterns, cancel wins and we don't false-positive a success.

const SUCCESS_PATTERNS = [
  'paystack.com/close',
  '/api/subscriptions/verify',   // your PAYSTACK_CALLBACK_URL path
  'onrender.com/api/subscriptions/verify',
];
const CANCEL_PATTERNS  = ['paystack.com/cancel', '/cancel'];

// ─────────────────────────────────────────────────────────────────────────────

interface RouteParams {
  authorization_url: string;
  reference:         string;
  amount:            number;
  callbackKey:       string;
}

interface Props {
  route:      { params: RouteParams };
  navigation: any;
}

export default function PaystackWebView({ route, navigation }: Props) {

  if (!route?.params) {
    console.warn('[PaystackWebView] route.params is undefined — is the screen registered on the root stack?');
    navigation?.goBack();
    return null;
  }

  const { authorization_url, reference, amount, callbackKey } = route.params;

  const [loading,  setLoading]  = useState(true);
  const [webError, setWebError] = useState(false);

  const handledRef   = useRef(false);
  const callbacksRef = useRef<PaystackCallbacks | undefined>(undefined);

  // ─── Resolve callbacks from store on mount ────────────────────────────────

  useEffect(() => {
    callbacksRef.current = getPaystackCallbacks(callbackKey);

    if (!callbacksRef.current) {
      console.warn('[PaystackWebView] No callbacks found for key:', callbackKey);
      navigation.goBack();
      return;
    }

    return () => {
      clearPaystackCallbacks(callbackKey);
    };
  }, [callbackKey, navigation]);

  // ─── Shared finish helper ─────────────────────────────────────────────────

  const finish = useCallback(
    (type: 'success' | 'cancel') => {
      if (handledRef.current) return;
      handledRef.current = true;

      console.log(`[PaystackWebView] finish called: ${type}`);

      const callbacks = callbacksRef.current;
      navigation.goBack();

      setTimeout(() => {
        if (type === 'success') {
          callbacks?.onSuccess(reference);
        } else {
          callbacks?.onCancel();
        }
      }, 300);
    },
    [navigation, reference],
  );

  // ─── URL intercept ────────────────────────────────────────────────────────
  //
  // Check CANCEL first — prevents a URL containing both patterns from
  // being misclassified as success.

  const isWeb = Platform.OS === 'web';

  const handleNavChange = useCallback(
    (navState: WebViewNavigation) => {
      if (handledRef.current) return;
      const url = navState.url || '';

      console.log('[PaystackWebView] navigating to:', url);

      if (CANCEL_PATTERNS.some(p => url.includes(p))) {
        finish('cancel');
        return;
      }

      if (SUCCESS_PATTERNS.some(p => url.includes(p))) {
        finish('success');
      }
    },
    [finish],
  );

  // ─── Manual cancel (top-bar button) ──────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (handledRef.current) return;
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        { text: 'Continue Paying', style: 'cancel' },
        {
          text:    'Yes, Cancel',
          style:   'destructive',
          onPress: () => finish('cancel'),
        },
      ],
    );
  }, [finish]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.cancelBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.cancelText}>✕ Cancel</Text>
        </TouchableOpacity>

        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>Secure Payment</Text>
          <Text style={styles.topAmount}>₦{amount.toLocaleString()}/month</Text>
        </View>

        <View style={styles.lockBadge}>
          <Text style={styles.lockText}>🔒</Text>
        </View>
      </View>

      {/* WebView / Error */}
      {webError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorTitle}>Could Not Load Payment Page</Text>
          <Text style={styles.errorText}>
            Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setWebError(false)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelLinkBtn} onPress={handleCancel}>
            <Text style={styles.cancelLinkText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loaderText}>Loading secure payment…</Text>
            </View>
          )}
          {isWeb ? (
            <View style={styles.webviewContainer}>
              <iframe
                src={authorization_url}
                title="Paystack Secure Payment"
                style={styles.iframe}
                onLoad={() => setLoading(false)}
              />
            </View>
          ) : (
            <WebView
              source={{ uri: authorization_url }}
              onNavigationStateChange={handleNavChange}
              onLoadEnd={() => setLoading(false)}
              onError={() => { setLoading(false); setWebError(true); }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
              style={[styles.webview, loading && { opacity: 0 }]}
            />
          )}
        </>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Secured by Paystack  •  Ref: {reference}</Text>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  topBar: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor:   '#fff',
  },
  cancelBtn:  { minWidth: 72 },
  cancelText: { color: '#EF4444', fontWeight: '700', fontSize: 14 },
  topCenter:  { flex: 1, alignItems: 'center' },
  topTitle:   { fontSize: 15, fontWeight: '800', color: '#111827' },
  topAmount:  { fontSize: 12, color: '#6B7280', marginTop: 1 },
  lockBadge:  { minWidth: 72, alignItems: 'flex-end' },
  lockText:   { fontSize: 20 },

  webview: { flex: 1 },
  webviewContainer: { flex: 1, minHeight: 400 },
  iframe: { width: '100%', height: '100%', borderWidth: 0 },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F9FAFB',
    justifyContent:  'center',
    alignItems:      'center',
    zIndex:          10,
  },
  loaderText: { marginTop: 12, color: '#6B7280', fontSize: 14 },

  errorContainer: {
    flex:              1,
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: 32,
  },
  errorEmoji:     { fontSize: 48, marginBottom: 16 },
  errorTitle:     { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  errorText:      { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  retryBtn:       { backgroundColor: '#2563EB', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12, marginBottom: 12 },
  retryBtnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelLinkBtn:  { paddingVertical: 8 },
  cancelLinkText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },

  footer: {
    paddingVertical:  10,
    alignItems:       'center',
    borderTopWidth:   1,
    borderTopColor:   '#E5E7EB',
    backgroundColor:  '#F9FAFB',
  },
  footerText: { fontSize: 11, color: '#9CA3AF' },
});