import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../navigation';
import type { RootStackParamList } from '../navigation';
import {
  getMessages,
  sendMessage,
  listenMessages,
  markMessageAsRead,
  unsubscribeFromChannel,
} from '../api/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message_text: string;
  created_at: string;
  read_status: boolean;
}

function formatBubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ route }: Props) {
  const { otherUserId, otherUserName } = route.params;
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load history and mark received messages as read on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const { data, error } = await getMessages(currentUserId, otherUserId);
        if (cancelled) return;
        if (!error && data) {
          // getMessages returns ascending; invert for FlatList inverted prop
          const sorted = (data as Message[]).slice().reverse();
          setMessages(sorted);
          const unread = sorted.filter(
            (m) => m.to_user_id === currentUserId && !m.read_status,
          );
          await Promise.all(unread.map((m) => markMessageAsRead(m.id)));
        }
        setLoading(false);
      })();
      return () => { cancelled = true; };
    }, [currentUserId, otherUserId])
  );

  // Realtime subscription for this conversation
  useEffect(() => {
    if (!currentUserId) return;

    channelRef.current = listenMessages(currentUserId, (payload: any) => {
      const row: Message = payload.new ?? payload.old;

      // Client-side filter: only handle messages in this conversation
      const isThisConvo =
        (row.from_user_id === currentUserId && row.to_user_id === otherUserId) ||
        (row.from_user_id === otherUserId   && row.to_user_id === currentUserId);
      if (!isThisConvo) return;

      if (payload.eventType === 'INSERT') {
        setMessages((prev) => {
          // Guard against duplicate when optimistic send + realtime both fire
          if (prev.some((m) => m.id === row.id)) return prev;
          return [row, ...prev];
        });
        // Auto-mark as read when the screen is open and we receive a message
        if (row.to_user_id === currentUserId) markMessageAsRead(row.id);
      } else if (payload.eventType === 'UPDATE') {
        setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
      }
    });

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId, otherUserId]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');

    const { data, error } = await sendMessage(currentUserId, otherUserId, trimmed);
    if (!error && data) {
      const msg = data as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [msg, ...prev];
      });
    }
    setSending(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E8610A" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.messageList}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isMine = item.from_user_id === currentUserId;
          return (
            <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                  {item.message_text}
                </Text>
                <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                  {formatBubbleTime(item.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              Say hello to {otherUserName}!
            </Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#8E8E93"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.75}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  messageList: {
    paddingHorizontal: 12,
    paddingTop:        12,
    paddingBottom:     8,
    flexGrow:          1,
    justifyContent:    'flex-end',
  },

  bubbleRow: {
    flexDirection:  'row',
    marginBottom:   6,
    justifyContent: 'flex-start',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },

  bubble: {
    maxWidth:          '75%',
    borderRadius:      18,
    paddingHorizontal: 14,
    paddingVertical:   9,
    backgroundColor:   '#E5E5EA',
  },
  bubbleMine: {
    backgroundColor:     '#E8610A',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize:   15,
    color:      '#1C1C1E',
    lineHeight: 21,
  },
  bubbleTextMine: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize:  11,
    color:     '#8E8E93',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.7)',
  },

  emptyWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color:    '#8E8E93',
  },

  inputBar: {
    flexDirection:     'row',
    alignItems:        'flex-end',
    paddingHorizontal: 12,
    paddingTop:        8,
    paddingBottom:     8,
    backgroundColor:   '#fff',
    borderTopWidth:    1,
    borderTopColor:    '#E5E5EA',
  },
  input: {
    flex:              1,
    minHeight:         40,
    maxHeight:         120,
    backgroundColor:   '#F2F2F7',
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   Platform.OS === 'ios' ? 10 : 8,
    fontSize:          15,
    color:             '#1C1C1E',
    marginRight:       8,
  },
  sendButton: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: '#E8610A',
    justifyContent:  'center',
    alignItems:      'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
});
