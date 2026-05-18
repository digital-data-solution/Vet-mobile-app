/**
 * ChatScreen - Fixed for React Navigation compatibility
 * 
 * The issue was using React.FC with custom props.
 * Solution: Use regular function component and accept props directly from React Navigation
 */

import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// OPTION 1: Don't define custom props at all - let React Navigation handle it
import { Alert } from 'react-native';
import { apiFetch } from '../api/client';

export default function ChatScreen(props: any) {
  const { navigation, route } = props;
  
  // Safely access params with optional chaining
  const recipientId = route?.params?.recipientId;
  const recipientName = route?.params?.recipientName || 'Chat';
  
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (recipientName) {
      navigation.setOptions({
        title: recipientName,
      });
    }
  }, [recipientName, navigation]);


  // Subscription check on focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const checkSub = async () => {
        try {
          const res = await apiFetch('/api/subscriptions/me', { method: 'GET' });
          if (!res.ok || !res.body?.data?.isActive) {
            if (isActive) {
              Alert.alert('Subscription Required', 'You need an active subscription to use chat.', [
                { text: 'Go to Subscription', onPress: () => navigation.navigate('SubscriptionScreen') },
              ]);
            }
          }
        } catch (e) {
          if (isActive) {
            Alert.alert('Error', 'Could not verify subscription.');
          }
        }
      };
      checkSub();
      return () => { isActive = false; };
    }, [navigation])
  );

  useEffect(() => {
    if (recipientId) {
      loadMessages();
    }
  }, [recipientId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      // TODO: Load messages from your API
      // Removed console.log for clean output
      
      // Mock data for now
      setMessages([
        {
          id: '1',
          text: 'Hello! How can I help you today?',
          timestamp: new Date().toISOString(),
          senderId: recipientId,
          senderName: recipientName,
        },
      ]);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: messageText,
      timestamp: new Date().toISOString(),
      senderId: 'me',
      senderName: 'You',
    };

    setMessages([newMessage, ...messages]);
    setMessageText('');

    try {
      // TODO: Send message to your API
      // Removed console.log for clean output
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Messages List */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMyMessage = item.senderId === 'me';
          return (
            <View
              style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text style={styles.messageText}>{item.text}</Text>
              <Text style={styles.messageTime}>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        }}
        contentContainerStyle={styles.messagesList}
        inverted
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start a conversation!</Text>
          </View>
        }
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !messageText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!messageText.trim()}
          activeOpacity={0.7}
        >
          <Ionicons
            name="send"
            size={24}
            color={messageText.trim() ? '#2563EB' : '#D1D5DB'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
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
  },
  messageText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
    color: '#111827',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});