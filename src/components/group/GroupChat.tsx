import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import useAuth from '../../hooks/auth';
import useChats from '../../hooks/useChats';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName?: string;
  senderProfilePicture?: string;
  timestamp: any;
}

// Helper to format timestamps
const formatMessageTime = (timestamp: any): string => {
  if (!timestamp) return '';
  
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now';
  
  // Today
  if (date.toDateString() === now.toDateString()) {
    return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
  }
  
  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
  }
  
  // This week
  if (diff < 604800000) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
  }
  
  // Older
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
};

interface GroupChatProps {
  groupId: string;
  chatRoomId: string | undefined;
  isMember: boolean;
}

export default function GroupChat({ groupId, chatRoomId, isMember }: GroupChatProps) {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const { getMessages, subscribeToMessages, addMessage } = useChats();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Subscribe to messages
  useEffect(() => {
    if (!chatRoomId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const unsubscribe = subscribeToMessages(chatRoomId, async (fetchedMessages: any[]) => {
      // Sort messages by timestamp (oldest first for proper display)
      const sortedMessages = [...fetchedMessages].sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return aTime.getTime() - bTime.getTime();
      });
      
      // Fetch sender info for each message
      const messagesWithSenders = await Promise.all(
        sortedMessages.map(async (msg) => {
          if (!msg.senderName || !msg.senderProfilePicture) {
            try {
              const userDoc = await getDoc(doc(db, 'users', msg.sender));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                  ...msg,
                  senderName: userData.name || 'Anonymous',
                  senderProfilePicture: userData.profilePicture,
                };
              }
            } catch (error) {
              console.error('Error fetching sender info:', error);
            }
          }
          return msg;
        })
      );
      
      setMessages(messagesWithSenders);
      setLoading(false);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chatRoomId]);
  
  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !chatRoomId || !user) return;
    
    const textToSend = messageText.trim();
    setMessageText(''); // Clear input immediately for better UX
    Keyboard.dismiss();
    setSending(true);
    
    try {
      await addMessage(chatRoomId, {
        text: textToSend,
        sender: user.uid,
        senderName: user.displayName || 'Anonymous',
        senderProfilePicture: user.photoURL || undefined,
        timestamp: new Date(),
        content: textToSend,
      });
      
      // Smooth scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setMessageText(textToSend);
    } finally {
      setSending(false);
    }
  }, [messageText, chatRoomId, user, addMessage]);
  
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.sender === user?.uid;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    // Check if we should show avatar (last message from this sender)
    const isLastInGroup = !nextMessage || nextMessage.sender !== item.sender;
    const isFirstInGroup = !previousMessage || previousMessage.sender !== item.sender;
    
    // Spacing logic for grouped messages
    const marginBottom = isLastInGroup ? 16 : 2;
    
    return (
      <View style={[
        styles.messageWrapper,
        { marginBottom },
        isCurrentUser ? styles.messageWrapperRight : styles.messageWrapperLeft,
      ]}>
        {/* Avatar - only show for other users on last message in group */}
        {!isCurrentUser && isLastInGroup && (
          <TouchableOpacity style={styles.avatarContainer}>
            {item.senderProfilePicture ? (
              <Image source={{ uri: item.senderProfilePicture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, {
                backgroundColor: theme === 'light' ? '#e2e8f0' : '#334155',
              }]}>
                <MaterialIcons name="person" size={18} color={theme === 'light' ? '#94a3b8' : '#64748b'} />
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {/* Spacer when avatar not shown */}
        {!isCurrentUser && !isLastInGroup && <View style={styles.avatarSpacer} />}
        
        {/* Message bubble */}
        <View style={styles.messageContainer}>
          {/* Sender name - only show on first message in group for other users */}
          {!isCurrentUser && isFirstInGroup && (
            <Text style={[styles.senderName, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              {item.senderName || 'Anonymous'}
            </Text>
          )}
          
          {/* Message content */}
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
            {
              backgroundColor: isCurrentUser
                ? '#37a4c8'
                : (theme === 'light' ? '#f1f3f5' : '#262626'),
            },
            // Rounded corners based on position in group
            isFirstInGroup && !isLastInGroup && (isCurrentUser ? styles.bubbleTopRight : styles.bubbleTopLeft),
            !isFirstInGroup && !isLastInGroup && styles.bubbleMiddle,
            !isFirstInGroup && isLastInGroup && (isCurrentUser ? styles.bubbleBottomRight : styles.bubbleBottomLeft),
          ]}>
            <Text style={[
              styles.messageText,
              {
                color: isCurrentUser ? '#ffffff' : (theme === 'light' ? '#1e293b' : '#f1f5f9'),
              },
            ]}>
              {item.text}
            </Text>
            
            {/* Timestamp */}
            <Text style={[
              styles.timestamp,
              {
                color: isCurrentUser
                  ? 'rgba(255, 255, 255, 0.75)'
                  : (theme === 'light' ? '#94a3b8' : '#64748b'),
              },
            ]}>
              {formatMessageTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#37a4c8" />
      </View>
    );
  }
  
  if (!chatRoomId) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name="chat"
          size={48}
          color={theme === 'light' ? '#cbd5e1' : '#475569'}
        />
        <Text style={[styles.emptyText, {
          color: theme === 'light' ? '#64748b' : '#94a3b8',
        }]}>
          Chat room not available
        </Text>
      </View>
    );
  }
  
  if (!isMember) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons
          name="lock"
          size={48}
          color={theme === 'light' ? '#cbd5e1' : '#475569'}
        />
        <Text style={[styles.emptyText, {
          color: theme === 'light' ? '#64748b' : '#94a3b8',
        }]}>
          Join the group to chat
        </Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={[styles.container, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
      }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[styles.messagesList, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
        }]}
        showsVerticalScrollIndicator={false}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
        onContentSizeChange={() => {
          // Scroll to bottom when new messages arrive
          if (messages.length > 0) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="chat-bubble-outline"
              size={64}
              color={theme === 'light' ? '#cbd5e1' : '#475569'}
            />
            <Text style={[styles.emptyText, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, {
              color: theme === 'light' ? '#94a3b8' : '#64748b',
            }]}>
              Start the conversation!
            </Text>
          </View>
        }
      />
      
      {/* Input Area */}
      <View style={[styles.inputContainer, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
        borderTopColor: theme === 'light' ? '#e2e8f0' : '#1f1f1f',
      }]}>
        <View style={[styles.inputWrapper, {
          backgroundColor: theme === 'light' ? '#f8f9fa' : '#1a1a1a',
          borderColor: theme === 'light' ? '#e2e8f0' : '#262626',
        }]}>
          <TextInput
            style={[styles.input, {
              color: theme === 'light' ? '#0F172A' : '#ffffff',
            }]}
            placeholder="Message"
            placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            autoCorrect={true}
            spellCheck={true}
          />
        </View>
        
        <TouchableOpacity
          onPress={handleSend}
          disabled={!messageText.trim() || sending}
          style={[styles.sendButton, {
            backgroundColor: messageText.trim() && !sending ? '#37a4c8' : (theme === 'light' ? '#e2e8f0' : '#262626'),
          }]}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color={theme === 'light' ? '#37a4c8' : '#ffffff'} />
          ) : (
            <MaterialIcons 
              name="send" 
              size={20} 
              color={messageText.trim() ? '#ffffff' : (theme === 'light' ? '#94a3b8' : '#64748b')} 
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: 8,
    marginLeft: 0,
  },
  avatarSpacer: {
    width: 36,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageBubbleLeft: {
    alignSelf: 'flex-start',
  },
  messageBubbleRight: {
    alignSelf: 'flex-end',
  },
  // Corner radius variations for grouped messages
  bubbleTopLeft: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
  },
  bubbleTopRight: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  bubbleMiddle: {
    borderRadius: 20,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  bubbleBottomLeft: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bubbleBottomRight: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 21,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    gap: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    maxHeight: 120,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});

