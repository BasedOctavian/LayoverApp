import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar, KeyboardAvoidingView, Keyboard, Platform, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import useAuth from '../../../hooks/auth';
import useChat from '../../../hooks/useChat';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../../../components/TopBar';
import LoadingScreen from '../../../components/LoadingScreen';
import { Timestamp } from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
}

export default function EventChat() {
  const { id } = useLocalSearchParams(); // Event ID from navigation params
  const { user } = useAuth(); // Authenticated user
  const router = useRouter();
  const { messages, loading, error, sendMessage } = useChat(id); // Custom chat hook
  const [newMessage, setNewMessage] = useState('');
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const marginAnim = useRef(new Animated.Value(50)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        Animated.timing(marginAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: false,
        }).start();
        setKeyboardVisible(true);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(marginAnim, {
          toValue: 50,
          duration: 150,
          useNativeDriver: false,
        }).start();
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;
    sendMessage({
      text: newMessage,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
    });
    setNewMessage('');
  };

  const formatTimestamp = (timestamp: Timestamp): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate(); // Convert Firestore Timestamp to Date
    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    if (isToday) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } else {
      const options: Intl.DateTimeFormatOptions = { 
        month: 'short' as const, 
        day: 'numeric' as const 
      };
      return date.toLocaleDateString(undefined, options) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.userId === user?.uid;
    return (
      <View style={[styles.messageBubble, isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble]}>
        {!isCurrentUser && (
          <Text style={[styles.messageUser, styles.otherUserText]}>{item.userName}</Text>
        )}
        <Text style={[styles.messageText, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTimestamp, isCurrentUser ? styles.currentUserText : styles.otherUserText]}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <TopBar />
        {error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{error}</Text>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messageList}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.messageListContent}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              ref={flatListRef}
            />
            <Animated.View style={[styles.inputContainer, { marginBottom: marginAnim }]}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor="#64748B"
                accessibilityLabel="Message input"
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={styles.sendButton}
                accessibilityLabel="Send message"
              >
                <Feather name="send" size={24} color="#000000" />
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, marginBottom: -20 },
  messageList: { 
    flex: 1,
    paddingHorizontal: 16,
  },
  messageListContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '80%',
    borderWidth: 1,
  },
  currentUserBubble: {
    backgroundColor: '#38a5c9',
    alignSelf: 'flex-end',
    borderColor: '#38a5c9',
  },
  otherUserBubble: {
    backgroundColor: '#1a1a1a',
    alignSelf: 'flex-start',
    borderColor: '#38a5c9',
  },
  messageText: {
    fontSize: 16,
  },
  messageUser: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageTimestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  currentUserText: {
    color: '#000000',
  },
  otherUserText: {
    color: '#e4fbfe',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#38a5c9',
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#000000',
    marginRight: 12,
    color: '#e4fbfe',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  sendButton: {
    backgroundColor: '#38a5c9',
    padding: 12,
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#e4fbfe',
  },
});