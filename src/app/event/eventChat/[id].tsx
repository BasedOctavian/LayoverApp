import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar, KeyboardAvoidingView, Keyboard, Platform, Animated, Alert, Image, Easing, Dimensions, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import useAuth from '../../../hooks/auth';
import useChat from '../../../hooks/useChat';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../../../components/TopBar';
import LoadingScreen from '../../../components/LoadingScreen';
import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebaseConfig';
import { ThemeContext } from '../../../context/ThemeContext';
import * as ExpoNotifications from 'expo-notifications';
import { containsFilteredContent, getFilteredContentCategory } from '../../../utils/contentFilter';
import UserAvatar from '../../../components/UserAvatar';
import useNotificationCount from '../../../hooks/useNotificationCount';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
  isSystemMessage?: boolean;
}

const formatTimestamp = (timestamp: Timestamp): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Cache for user profiles
const userProfileCache = new Map<string, any>();

const MessageItem = ({ item, isCurrentUser, theme }: { item: Message; isCurrentUser: boolean; theme: string }) => {
  const [userProfile, setUserProfile] = useState<any>(userProfileCache.get(item.userId) || null);
  const router = useRouter();
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(!userProfileCache.has(item.userId));
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Render system messages differently
  if (item.isSystemMessage || item.userId === 'SYSTEM') {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={[styles.systemMessageText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8"
        }]}>
          {item.text}
        </Text>
      </View>
    );
  }

  // Add loading progress animation with pulse
  useEffect(() => {
    if (isLoading) {
      // Main loading line animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingProgress, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
          }),
          Animated.timing(loadingProgress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
          }),
        ])
      ).start();
    } else {
      loadingProgress.setValue(0);
      pulseAnim.setValue(0);
    }
  }, [isLoading]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isCurrentUser && !userProfileCache.has(item.userId)) {
        setIsLoading(true);
        const startTime = Date.now();
        
        const userDoc = await getDoc(doc(db, 'users', item.userId));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setUserProfile(profileData);
          userProfileCache.set(item.userId, profileData);
        }

        // Ensure loading state lasts at least 1 second
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
        }
        
        // Fade in the content with a slight bounce
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(fadeAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          })
        ]).start();
        
        setIsLoading(false);
      } else if (!isLoading) {
        fadeAnim.setValue(1);
      }
    };
    fetchUserProfile();
  }, [item.userId, isCurrentUser]);

  return (
    <View style={[
      styles.messageContainer,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
    ]}>
      {!isCurrentUser && (
        <TouchableOpacity 
          onPress={() => router.push(`/profile/${item.userId}`)}
          style={styles.profileImageContainer}
        >
          {isLoading ? (
            <View style={[styles.profileImage, { backgroundColor: theme === "light" ? "#f8f9fa" : "#1a1a1a" }]}>
              <Animated.View 
                style={[
                  styles.loadingLine,
                  {
                    backgroundColor: theme === "light" ? "#37a4c8" : "#4db8d4",
                    transform: [{
                      translateX: loadingProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 100]
                      })
                    }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.8, 0.3]
                    })
                  }
                ]}
              />
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              <UserAvatar
                user={userProfile || { name: 'User', profilePicture: null }}
                size={32}
                style={styles.profileImage}
              />
            </Animated.View>
          )}
        </TouchableOpacity>
      )}
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
          <View style={styles.userNameContainer}>
            {isLoading ? (
              <View style={[styles.userNamePlaceholder, { backgroundColor: theme === "light" ? "#e6e6e6" : "#2a2a2a" }]} />
            ) : (
              <Animated.Text style={[
                styles.messageUser, 
                { 
                  color: theme === "light" ? "#1a1a1a" : "#ffffff",
                  fontWeight: "600",
                  opacity: fadeAnim
                }
              ]}>
                {userProfile?.name || userProfile?.displayName || 'Anonymous'}
              </Animated.Text>
            )}
            <Animated.View 
              style={[
                styles.loadingLine,
                {
                  backgroundColor: theme === "light" ? "#37a4c8" : "#4db8d4",
                  transform: [{
                    translateX: loadingProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 100]
                    })
                  }],
                  opacity: isLoading ? pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.8, 0.3]
                  }) : 0
                }
              ]}
            />
          </View>
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
    </View>
  );
};

export default function EventChat() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const { messages, error, sendMessage } = useChat(id);
  const [newMessage, setNewMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const flatListRef = useRef<FlatList>(null);
  const { theme } = React.useContext(ThemeContext);
  const [messageError, setMessageError] = useState(false);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnimatedValue = useRef(new Animated.Value(0)).current;
  const inputContainerAnim = useRef(new Animated.Value(0)).current;
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', id as string));
        if (eventDoc.exists()) {
          setEventDetails(eventDoc.data());
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
      }
    };

    fetchEventDetails();
  }, [id]);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Smooth keyboard animations
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const duration = Platform.OS === 'ios' ? e.duration || 250 : 250;
        setKeyboardHeight(e.endCoordinates.height);
        
        Animated.parallel([
          Animated.timing(keyboardAnimatedValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(inputContainerAnim, {
            toValue: 1,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          })
        ]).start();
        
        // Scroll to bottom smoothly
        setTimeout(() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }, duration / 2);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        const duration = Platform.OS === 'ios' ? e.duration || 250 : 250;
        
        Animated.parallel([
          Animated.timing(keyboardAnimatedValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(inputContainerAnim, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          })
        ]).start(() => {
          setKeyboardHeight(0);
        });
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [messages]);

  const sendPushNotification = async (receiverId: string, messageText: string, eventId: string) => {
    try {
      // Get sender's data to get their name
      const senderDoc = await getDoc(doc(db, 'users', user?.uid || ''));
      const senderData = senderDoc.exists() ? senderDoc.data() : null;
      const senderName = senderData?.name || senderData?.displayName || 'Someone';

      // Get event data to get event name
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      const eventData = eventDoc.exists() ? eventDoc.data() : null;
      const eventName = eventData?.title || 'Event';

      // Get receiver's data to check notification preferences and push token
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (!receiverDoc.exists()) {
        console.log('Receiver document not found:', receiverId);
        return;
      }

      const receiverData = receiverDoc.data();

      // Check if receiver has notifications enabled and has a push token
      if (receiverData?.expoPushToken && 
          receiverData?.notificationPreferences?.notificationsEnabled && 
          (receiverData?.notificationPreferences?.activities || receiverData?.notificationPreferences?.events) &&
          receiverData?.notificationPreferences?.chats) {
        
        console.log('Sending push notification to:', {
          token: receiverData.expoPushToken,
          name: senderName,
          message: messageText,
          senderId: user?.uid
        });

        // Send push notification
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify({
              to: receiverData.expoPushToken,
              title: eventName,
              body: `${senderName}: ${messageText}`,
              sound: 'default',
              priority: 'high',
              data: {
                type: 'eventChat',
                eventId: eventId,
                chatId: id,
                receiverId: receiverId,
                senderId: user?.uid,
                senderName: senderName
              },
            }),
          });

          const responseData = await response.json();
          
          if (!response.ok) {
            console.error('Failed to send push notification:', {
              status: response.status,
              statusText: response.statusText,
              data: responseData
            });
          } else {
            console.log('Push notification sent successfully:', responseData);
          }
        } catch (error) {
          console.error('Error sending push notification:', {
            error,
            receiverId: receiverId,
            token: receiverData.expoPushToken
          });
        }
      } else {
        console.log('Push notification not sent because:', {
          hasToken: !!receiverData?.expoPushToken,
          notificationsEnabled: receiverData?.notificationPreferences?.notificationsEnabled,
          activitiesEnabled: receiverData?.notificationPreferences?.activities || receiverData?.notificationPreferences?.events,
          chatsEnabled: receiverData?.notificationPreferences?.chats,
          receiverId: receiverId
        });
      }

      // Add notification to receiver's user document
      const notification = {
        id: Date.now().toString(),
        title: eventName,
        body: `${senderName}: ${messageText}`,
        data: {
          type: 'eventChat',
          eventId: eventId,
          chatId: id,
          receiverId: receiverId,
          senderId: user?.uid,
          senderName: senderName
        },
        timestamp: new Date(),
        read: false
      };

      // Add notification to receiver's user document
      if (receiverDoc.exists()) {
        const notifications = receiverData?.notifications || [];
        await updateDoc(doc(db, 'users', receiverId), {
          notifications: [...notifications, notification]
        });
      }
    } catch (error) {
      console.error('Error in sendPushNotification:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    
    // Check for inappropriate content
    if (containsFilteredContent(newMessage)) {
      setMessageError(true);
      Alert.alert(
        "Inappropriate Content",
        `Your message contains inappropriate content. Please review and try again.`,
        [{ text: "OK" }]
      );
      return;
    }
    
    setMessageError(false);
    const messageText = newMessage.trim();
    
    // Clear input immediately for better UX
    setNewMessage('');
    
    // Dismiss keyboard
    Keyboard.dismiss();

    // Get sender's data to get their name
    const senderDoc = await getDoc(doc(db, 'users', user.uid));
    const senderData = senderDoc.exists() ? senderDoc.data() : null;
    const senderName = senderData?.name || senderData?.displayName || 'Anonymous';

    const messageData = {
      text: messageText,
      userId: user.uid,
      userName: senderName,
    };
    
    try {
      await sendMessage(messageData);
      
      // Scroll to bottom after message is added
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
      
      // Get event document to access attendees
      const eventDoc = await getDoc(doc(db, 'events', id as string));
      if (!eventDoc.exists()) {
        console.error('Event document not found');
        return;
      }

      const eventData = eventDoc.data();
      const participants = eventData?.participants || [];
      
      // Send notifications to all participants except the sender
      await Promise.all(
        participants
          .filter((participantId: string) => participantId !== user.uid) // Exclude sender
          .map((participantId: string) => 
            sendPushNotification(participantId, messageText, id as string)
          )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message if send fails
      setNewMessage(messageText);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.userId === user?.uid;
    return <MessageItem item={item} isCurrentUser={isCurrentUser} theme={theme || 'light'} />;
  };

  // Clear cache when component unmounts
  useEffect(() => {
    return () => {
      userProfileCache.clear();
    };
  }, []);

  if (isInitialLoading) {
    return (
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme === "light" ? "#F8FAFC" : "#000000" }]}>
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title=""
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />

        {/* Event Header */}
        <TouchableOpacity 
          style={[styles.eventHeader, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderBottomColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
          }]}
          onPress={() => router.push(`/event/${id}`)}
        >
          <View style={styles.headerTextContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.eventName, { 
                color: theme === "light" ? "#1a1a1a" : "#ffffff",
              }]}>
                {eventDetails?.title || "Loading..."}
              </Text>
            </View>
            <View style={styles.infoRow}>
              {eventDetails?.location && (
                <View style={[styles.infoBadge, { 
                  backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                }]}>
                  <Ionicons name="location" size={14} color="#37a4c8" />
                  <Text style={[styles.infoText, { 
                    color: theme === "light" ? "#666666" : "#a0a0a0"
                  }]}>
                    {eventDetails.location}
                  </Text>
                </View>
              )}
              {eventDetails?.category && (
                <View style={[styles.infoBadge, { 
                  backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                }]}>
                  <Ionicons name="people" size={14} color="#37a4c8" />
                  <Text style={[styles.infoText, { 
                    color: theme === "light" ? "#666666" : "#a0a0a0"
                  }]}>
                    {eventDetails.category}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

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
          <View style={styles.chatContainer}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messageList}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.messageListContent, { paddingBottom: 20 }]}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              ref={flatListRef}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
              }}
            />
            
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? topBarHeight + 70 - insets.bottom : 20}
            >
              <Animated.View
                style={{
                  transform: [{
                    translateY: inputContainerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -5]
                    })
                  }]
                }}
              >
                <SafeAreaView 
                  edges={["bottom"]} 
                  style={{ backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }}
                >
                  <View style={[styles.inputContainer, { 
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    borderTopColor: theme === "light" ? "#e8e9ea" : "#2a2a2a"
                  }]}>
                    <Animated.View style={[styles.inputWrapper, {
                      transform: [{
                        scale: inputContainerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.01]
                        })
                      }]
                    }]}>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                          color: theme === "light" ? "#1a1a1a" : "#ffffff",
                          borderColor: messageError ? "#ff4444" : theme === "light" ? "#e8e9ea" : "#3a3a3a"
                        }]}
                        value={newMessage}
                        onChangeText={(text) => {
                          setNewMessage(text);
                          if (messageError && !containsFilteredContent(text)) {
                            setMessageError(false);
                          }
                        }}
                        placeholder={messageError ? "Inappropriate content detected" : "Type a message..."}
                        placeholderTextColor={messageError ? "#ff4444" : theme === "light" ? "#666666" : "#a0a0a0"}
                        multiline
                        maxLength={1000}
                        keyboardAppearance={theme === "light" ? "light" : "dark"}
                        returnKeyType="send"
                        onSubmitEditing={(e) => {
                          e.preventDefault();
                          if (newMessage.trim() !== "" && !messageError) {
                            handleSendMessage();
                          }
                        }}
                        blurOnSubmit={false}
                        enablesReturnKeyAutomatically={true}
                        autoCorrect={true}
                        spellCheck={true}
                      />
                    </Animated.View>
                    <TouchableOpacity
                      onPress={handleSendMessage}
                      style={[
                        styles.sendButton, 
                        { backgroundColor: "#37a4c8" }, 
                        (messageError || newMessage.trim() === "") && styles.sendButtonDisabled
                      ]}
                      disabled={messageError || newMessage.trim() === ""}
                      activeOpacity={0.7}
                    >
                      <Feather 
                        name="send" 
                        size={22} 
                        color={(messageError || newMessage.trim() === "") ? "#999999" : "#ffffff"} 
                      />
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { 
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  chatContainer: {
    flex: 1,
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
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 4,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  profileImageContainer: {
    marginRight: 8,
    marginBottom: 4,
    marginLeft: 0,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  defaultAvatar: {
    backgroundColor: '#000000',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '75%',
    minWidth: '30%',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  currentUserBubble: {
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  otherUserBubble: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopRightRadius: 18,
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
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    fontSize: 15,
    marginRight: 8,
    borderWidth: 1,
    letterSpacing: 0.2,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: "#37a4c8",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  userNameContainer: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 4,
  },
  userNamePlaceholder: {
    height: 16,
    width: '60%',
    borderRadius: 4,
  },
  loadingLine: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderBottomWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
  },
  systemMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  systemMessageText: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.65,
    maxWidth: '85%',
  },
});