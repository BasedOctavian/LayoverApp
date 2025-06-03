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
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebaseConfig';
import { ThemeContext } from '../../../context/ThemeContext';
import * as ExpoNotifications from 'expo-notifications';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
}

export default function EventChat() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const { messages, error, sendMessage } = useChat(id);
  const [newMessage, setNewMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const marginAnim = useRef(new Animated.Value(50)).current;
  const flatListRef = useRef<FlatList>(null);
  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
        // Add a small delay to ensure the keyboard is fully shown
        setTimeout(() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, 100);
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
  }, [messages]);

  const sendPushNotification = async (receiverId: string, messageText: string, eventId: string) => {
    try {
      // Get receiver's push token
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (!receiverDoc.exists()) {
        console.log('Receiver document not found');
        return;
      }

      const receiverData = receiverDoc.data();
      const pushToken = receiverData?.expoPushToken;

      if (!pushToken) {
        console.log('No push token found for receiver');
        return;
      }

      // Send push notification using Expo's push notification service
      const notificationPayload = {
        to: pushToken,
        sound: 'default',
        title: `Event Message from ${user?.displayName || 'Someone'}`,
        body: messageText,
        data: {
          type: 'eventChat',
          eventId: eventId,
          chatId: id,
          receiverId: receiverId,
          senderId: user?.uid
        },
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;
    
    const messageData = {
      text: newMessage,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
    };
    
    sendMessage(messageData);
    
    // Send push notification to other participants
    if (messages.length > 0) {
      const otherParticipants = messages
        .map(msg => msg.userId)
        .filter(id => id !== user.uid);
      
      otherParticipants.forEach(participantId => {
        sendPushNotification(participantId, newMessage, id as string);
      });
    }
    
    setNewMessage('');
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const formatTimestamp = (timestamp: Timestamp): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.userId === user?.uid;
    return (
      <View style={[
        styles.messageBubble, 
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        { 
          backgroundColor: isCurrentUser 
            ? '#37a4c8' 
            : theme === "light" 
              ? "#f5f5f5" 
              : "#2a2a2a",
          borderColor: isCurrentUser 
            ? '#37a4c8' 
            : theme === "light" 
              ? "#e0e0e0" 
              : "#3a3a3a"
        }
      ]}>
        {!isCurrentUser && (
          <Text style={[styles.messageUser, { 
            color: theme === "light" ? "#1a1a1a" : "#ffffff",
            fontWeight: "600"
          }]}>
            {item.userName}
          </Text>
        )}
        <Text style={[styles.messageText, { 
          color: isCurrentUser ? "#ffffff" : theme === "light" ? "#1a1a1a" : "#ffffff",
          fontWeight: "500"
        }]}>
          {item.text}
        </Text>
        <Text style={[styles.messageTimestamp, { 
          color: isCurrentUser ? "#ffffff" : theme === "light" ? "#666666" : "#a0a0a0",
          opacity: 0.8
        }]}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
    );
  };

  if (isInitialLoading) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title="Event Chat"
          showNotifications={true}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
        />
        {error ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.errorText, { color: theme === "light" ? "#FF3B30" : "#FF3B30" }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: "#37a4c8" }]}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>Return to Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messageList}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.messageListContent}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              ref={flatListRef}
            />
            <Animated.View style={[styles.inputContainer, { 
              marginBottom: marginAnim,
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderTopColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
            }]}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                  color: theme === "light" ? "#1a1a1a" : "#ffffff",
                  borderColor: theme === "light" ? "#e0e0e0" : "#3a3a3a"
                }]}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={[styles.sendButton, { backgroundColor: "#37a4c8" }]}
              >
                <Feather name="send" size={24} color="#ffffff" />
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { 
    flex: 1, 
    marginBottom: -20 
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  messageList: { 
    flex: 1,
    paddingHorizontal: 16,
  },
  messageListContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingVertical: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    marginVertical: 4,
    maxWidth: '80%',
    minWidth: '30%',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserBubble: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  otherUserBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopRightRadius: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  messageUser: {
    fontSize: 13,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  messageTimestamp: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    fontSize: 15,
    marginRight: 10,
    borderWidth: 1,
    letterSpacing: 0.2,
    maxHeight: 100,
  },
  sendButton: {
    padding: 12,
    borderRadius: 24,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 48,
    height: 48,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});