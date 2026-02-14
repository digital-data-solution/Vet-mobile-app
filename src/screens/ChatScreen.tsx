import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { sendMessage, listenMessages, getCurrentUser } from '../api/supabase';
import { apiFetch } from '../api/client';
import SubscriptionPrompt from '../components/SubscriptionPrompt';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message_text: string;
  timestamp: string;
  read_status: boolean;
}

interface ChatScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: {
    params: {
      vetId: string; // The vet or recipient user id
      vetName?: string; // Optional vet name for header
    };
  };
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const { vetId, vetName } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    loading: boolean;
    hasAccess: boolean;
    message?: string;
  }>({ loading: true, hasAccess: false });
  
  const flatListRef = useRef<FlatList>(null);

  // Check subscription on mount
  useEffect(() => {
    checkSubscriptionAccess();
  }, []);

  const checkSubscriptionAccess = async () => {
    try {
      // Get current user from Supabase
      const { data } = await getCurrentUser();
      if (!data?.user) {
        setSubscriptionStatus({ 
          loading: false, 
          hasAccess: false,
          message: 'Please log in to continue' 
        });
        return;
      }

      const currentUserId = data.user.id;
      setUserId(currentUserId);

      // Check subscription from backend
      const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
      
      if (res.ok && res.body?.data) {
        const sub = res.body.data;
        
        // Check if subscription is active
        if (sub.isActive && sub.status === 'active') {
          setSubscriptionStatus({ 
            loading: false, 
            hasAccess: true 
          });
        } else {
          setSubscriptionStatus({ 
            loading: false, 
            hasAccess: false,
            message: sub.status === 'expired' 
              ? 'Your subscription has expired' 
              : 'Active subscription required'
          });
        }
      } else {
        // No subscription found
        setSubscriptionStatus({ 
          loading: false, 
          hasAccess: false,
          message: 'No active subscription found'
        });
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      setSubscriptionStatus({ 
        loading: false, 
        hasAccess: false,
        message: 'Unable to verify subscription'
      });
    }
  };

  // Listen for messages when user has access
  useEffect(() => {
    if (!userId || !subscriptionStatus.hasAccess) return;

    const subscription = listenMessages(userId, (payload: any) => {
      const msg = payload.new || payload.old;
      if (msg && (msg.from_user_id === userId || msg.to_user_id === userId)) {
        setMessages((prev) => {
          // Avoid duplicates
          const exists = prev.find((m) => m.id === msg.id);
          if (exists) return prev;
          
          const updated = [...prev, msg].sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          
          return updated;
        });
        
        // Scroll to bottom on new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, subscriptionStatus.hasAccess]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;
    
    try {
      await sendMessage(userId, vetId, input);
      setInput('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.from_user_id === userId;
    
    return (
      <View style={[
        styles.message, 
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        <Text style={[
          styles.messageText,
          isMyMessage && styles.myMessageText
        ]}>
          {item.message_text}
        </Text>
        <Text style={[
          styles.timestamp,
          isMyMessage && styles.myTimestamp
        ]}>
          {new Date(item.timestamp).toLocaleTimeString('en-NG', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      </View>
    );
  };

  // Loading state
  if (subscriptionStatus.loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // No access - show subscription prompt
  if (!subscriptionStatus.hasAccess) {
    return <SubscriptionPrompt navigation={navigation} feature="messaging" />;
  }

  // Has access - show chat
  return (
    <View style={styles.container}>
      {/* Header */}
      {vetName && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Chat with {vetName}</Text>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start a conversation with {vetName || 'the vet'}
            </Text>
          </View>
        }
      />

      {/* Input container */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[
            styles.sendButton,
            !input.trim() && styles.sendButtonDisabled
          ]} 
          onPress={handleSend}
          disabled={!input.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  message: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#2563EB',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: '#DBEAFE',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#2563EB',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default ChatScreen;