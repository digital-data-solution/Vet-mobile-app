import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { useAuth } from '../navigation';
import type { RootStackParamList } from '../navigation';
import { listenMessages, unsubscribeFromChannel } from '../api/supabase';
import { apiFetch } from '../api/client';
import SubscriptionPrompt from '../components/SubscriptionPrompt';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  hasUnread: boolean;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ConversationsScreen() {
  const navigation = useNavigation<NavProp>();
  const { session, setUnreadCount } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const [subscriptionChecked, setSubscriptionChecked] = useState(false);
  const [isSubscribed, setIsSubscribed]               = useState(false);
  const [currentPlan, setCurrentPlan]                 = useState<string | null>(null);
  const [loading, setLoading]                         = useState(true);
  const [conversations, setConversations]             = useState<Conversation[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Check subscription once on mount
  useEffect(() => {
    apiFetch('/api/subscriptions/me')
      .then((res) => {
        const data = res.body?.data;
        setIsSubscribed(res.ok && data?.isActive === true);
        setCurrentPlan(data?.plan ?? null);
      })
      .catch(() => setIsSubscribed(false))
      .finally(() => setSubscriptionChecked(true));
  }, []);

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await apiFetch('/api/messages/conversations');
      if (!res.ok || !res.body?.data) return;
      const convos: Conversation[] = res.body.data;
      setConversations(convos);
      setUnreadCount(convos.filter((c) => c.hasUnread).length);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, setUnreadCount]);

  // Trigger first load once subscription check settles — useFocusEffect alone misses this
  // because the screen is already focused while the async check is still in flight.
  useEffect(() => {
    if (!subscriptionChecked || !isSubscribed || !currentUserId) return;
    setLoading(true);
    fetchConversations();
  }, [subscriptionChecked, isSubscribed, currentUserId, fetchConversations]);

  // Refresh on every subsequent tab focus; also clears the badge
  useFocusEffect(
    useCallback(() => {
      setUnreadCount(0);
      if (!subscriptionChecked || !isSubscribed || !currentUserId) return;
      setLoading(true);
      fetchConversations();
    }, [subscriptionChecked, isSubscribed, currentUserId, fetchConversations, setUnreadCount])
  );

  // Realtime: refresh list on any new message in current user's conversations
  useEffect(() => {
    if (!isSubscribed || !currentUserId) return;
    channelRef.current = listenMessages(currentUserId, () => fetchConversations());
    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isSubscribed, currentUserId, fetchConversations]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!subscriptionChecked) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E8610A" />
      </View>
    );
  }

  if (!isSubscribed) {
    return (
      <SubscriptionPrompt
        navigation={navigation as any}
        feature="messaging professionals"
        currentPlan={currentPlan}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E8610A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Messages</Text>

      {conversations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptyHint}>
            Tap the message button on a vet, kennel, or shop profile to start chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.otherUserId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                navigation.navigate('Chat', {
                  otherUserId:    item.otherUserId,
                  otherUserName:  item.otherUserName,
                  otherUserAvatar: item.otherUserAvatar ?? undefined,
                })
              }
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrap}>
                {item.otherUserAvatar ? (
                  <Image source={{ uri: item.otherUserAvatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitial}>
                    {item.otherUserName.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.otherUserName}
                  </Text>
                  <Text style={styles.rowTime}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text
                    style={[styles.rowPreview, item.hasUnread && styles.rowPreviewUnread]}
                    numberOfLines={1}
                  >
                    {item.lastMessage}
                  </Text>
                  {item.hasUnread && <View style={styles.unreadDot} />}
                </View>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 48;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  header: {
    fontSize:      22,
    fontWeight:    '700',
    color:         '#1C1C1E',
    paddingHorizontal: 16,
    paddingTop:    16,
    paddingBottom: 8,
  },

  emptyText: {
    fontSize:     17,
    fontWeight:   '600',
    color:        '#1C1C1E',
    marginBottom: 6,
  },
  emptyHint: {
    fontSize:  14,
    color:     '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },

  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
  },

  avatarWrap: {
    width:           AVATAR_SIZE,
    height:          AVATAR_SIZE,
    borderRadius:    AVATAR_SIZE / 2,
    backgroundColor: '#E8610A',
    justifyContent:  'center',
    alignItems:      'center',
    marginRight:     12,
    overflow:        'hidden',
  },
  avatarImage: {
    width:  AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarInitial: {
    color:      '#fff',
    fontSize:   20,
    fontWeight: '700',
  },

  rowBody: { flex: 1 },
  rowTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'baseline',
    marginBottom:   3,
  },
  rowName: {
    fontSize:    16,
    fontWeight:  '600',
    color:       '#1C1C1E',
    flex:        1,
    marginRight: 8,
  },
  rowTime: {
    fontSize: 12,
    color:    '#8E8E93',
  },
  rowBottom: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  rowPreview: {
    fontSize: 14,
    color:    '#8E8E93',
    flex:     1,
  },
  rowPreviewUnread: {
    color:      '#1C1C1E',
    fontWeight: '500',
  },
  unreadDot: {
    width:           9,
    height:          9,
    borderRadius:    5,
    backgroundColor: '#E8610A',
    marginLeft:      8,
  },

  separator: {
    height:          1,
    backgroundColor: '#F2F2F7',
    marginLeft:      AVATAR_SIZE + 12 + 16, // align with text start
  },
});
