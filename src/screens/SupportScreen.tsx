import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { supabase } from '../api/supabase';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://vet-market-place-jsj5.onrender.com';

interface Message {
  _id: string;
  text: string;
  senderRole: 'user' | 'admin' | 'bot';
  createdAt: string;
}

interface Thread {
  _id: string;
  status: 'open' | 'resolved';
  needsHuman: boolean;
  messages: Message[];
}

const FAQ_SUGGESTIONS = [
  'How do I subscribe?',
  'How do I contact a vet?',
  'How do I reset my password?',
  'How do I update my profile?',
  'I want to talk to a person',
];

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function SupportScreen({ navigation }: { navigation: any }) {
  const [thread, setThread]           = useState<Thread | null>(null);
  const [text, setText]               = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [showFAQs, setShowFAQs]       = useState(false);
  const flatRef = useRef<FlatList>(null);

  const fetchThread = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError('Please log in to contact support.');
        setLoading(false);
        return;
      }
      const res  = await fetch(`${BASE_URL}/api/support`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setThread(json.data);
        setError('');
      } else {
        setError(json.message || 'Failed to load conversation.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchThread(); }, [fetchThread]);

  // Auto-refresh every 20 s so the user sees admin replies without manual pull
  useEffect(() => {
    const timer = setInterval(fetchThread, 20000);
    return () => clearInterval(timer);
  }, [fetchThread]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  useEffect(() => {
    if ((thread?.messages?.length ?? 0) > 0) scrollToBottom();
  }, [thread?.messages?.length, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');
    try {
      const token = await getToken();
      if (!token) {
        setError('Session expired. Please log in again.');
        setSending(false);
        return;
      }
      const res  = await fetch(`${BASE_URL}/api/support`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: trimmed }),
      });
      const json = await res.json();
      if (json.success) {
        setThread(json.data);
        setError('');
      } else {
        setError(json.message || 'Failed to send message.');
        setText(trimmed);
      }
    } catch {
      setError('Network error. Message not sent.');
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const messages = thread?.messages ?? [];

  const renderMessage = ({ item }: { item: Message }) => {
    const isBot   = item.senderRole === 'bot';
    const isAdmin = item.senderRole === 'admin';
    const isSupportSide = isAdmin || isBot;

    const time = new Date(item.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(item.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });

    return (
      <View style={[
        styles.bubble,
        isSupportSide ? (isBot ? styles.bubbleBot : styles.bubbleAdmin) : styles.bubbleUser,
      ]}>
        {isAdmin && <Text style={styles.senderLabel}>Support Team</Text>}
        {isBot   && <Text style={[styles.senderLabel, styles.senderLabelBot]}>Xpress Bot 🤖</Text>}
        <Text style={[styles.bubbleText, isSupportSide ? styles.bubbleTextAdmin : styles.bubbleTextUser]}>
          {item.text}
        </Text>
        <Text style={[styles.bubbleTime, isSupportSide ? styles.bubbleTimeAdmin : styles.bubbleTimeUser]}>
          {date}  {time}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backArrow}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🐾</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Xpress Vet Support</Text>
            <Text style={styles.headerSub}>
              {thread?.status === 'resolved'
                ? 'Conversation resolved — send a message to reopen'
                : thread?.needsHuman
                  ? '🟢 Human agent will reply soon'
                  : '🤖 Bot active · say "talk to a person" to escalate'}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1A56DB" />
          </View>
        ) : (
          <>
            {messages.length === 0 && !error && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyTitle}>How can we help?</Text>
                <Text style={styles.emptySub}>
                  Send us a message and our support team will reply as soon as possible.
                  We typically respond within a few hours.
                </Text>
              </View>
            )}

            {messages.length > 0 && (
              <FlatList
                ref={flatRef}
                data={messages}
                keyExtractor={(item, i) => item._id || String(i)}
                renderItem={renderMessage}
                contentContainerStyle={styles.messageList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); fetchThread(); }}
                  />
                }
                onContentSizeChange={scrollToBottom}
              />
            )}

            {!!error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {thread?.status === 'resolved' && (
              <View style={styles.resolvedBanner}>
                <Text style={styles.resolvedText}>
                  This conversation has been marked resolved. Send a new message if you need further help.
                </Text>
              </View>
            )}

            {showFAQs && (
              <View style={styles.faqBar}>
                {FAQ_SUGGESTIONS.map((faq) => (
                  <TouchableOpacity
                    key={faq}
                    style={styles.faqChip}
                    onPress={() => { setText(faq); setShowFAQs(false); }}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.faqChipText}>{faq}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.faqToggle}
                onPress={() => setShowFAQs((v) => !v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.faqToggleIcon, showFAQs && styles.faqToggleIconActive]}>💡</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Type your message..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
                activeOpacity={0.8}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.sendBtnText}>Send</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:  12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor:  '#fff',
  },
  backBtn:      { padding: 8, marginRight: 4 },
  backArrow:    { fontSize: 22, color: '#1A56DB', fontWeight: '700' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji:  { fontSize: 20 },
  headerTitle:  { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub:    { fontSize: 12, color: '#6B7280', marginTop: 1 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  emptySub:   { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },

  messageList: { padding: 16, paddingBottom: 8 },

  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 10 },
  bubbleUser:  { alignSelf: 'flex-end',   backgroundColor: '#1A56DB', borderBottomRightRadius: 4 },
  bubbleAdmin: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderBottomLeftRadius:  4 },
  bubbleBot:   { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', borderBottomLeftRadius:  4, borderWidth: 1, borderColor: '#BFDBFE' },

  senderLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748B',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  senderLabelBot: { color: '#1A56DB' },
  bubbleText:      { fontSize: 15, lineHeight: 22 },
  bubbleTextUser:  { color: '#fff' },
  bubbleTextAdmin: { color: '#111827' },
  bubbleTime:      { fontSize: 11, marginTop: 4 },
  bubbleTimeUser:  { color: 'rgba(255,255,255,0.65)', textAlign: 'right' },
  bubbleTimeAdmin: { color: '#9CA3AF' },

  errorBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
    marginHorizontal: 16, marginBottom: 8,
  },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },

  resolvedBanner: {
    backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12,
    marginHorizontal: 16, marginBottom: 8,
  },
  resolvedText: { color: '#065F46', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#fff', gap: 8,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 15,
    color: '#111827', maxHeight: 120, backgroundColor: '#F9FAFB',
  },
  sendBtn: {
    backgroundColor: '#1A56DB', borderRadius: 20, paddingHorizontal: 20,
    paddingVertical: 12, justifyContent: 'center', alignItems: 'center', minWidth: 70,
  },
  sendBtnDisabled: { backgroundColor: '#93C5FD' },
  sendBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  faqToggle: { padding: 8, marginRight: 2, alignSelf: 'flex-end', marginBottom: 4 },
  faqToggleIcon: { fontSize: 18 },
  faqToggleIconActive: { opacity: 0.6 },
  faqBar: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  faqChip: {
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  faqChipText: { fontSize: 13, color: '#1A56DB', fontWeight: '600' },
});
