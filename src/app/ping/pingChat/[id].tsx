import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar, KeyboardAvoidingView, Keyboard, Platform, Animated, Alert, Image, Easing, Dimensions, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import useAuth from '../../../hooks/auth';
import usePingChat from '../../../hooks/usePingChat';
import usePings from '../../../hooks/usePings';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import TopBar from '../../../components/TopBar';
import LoadingScreen from '../../../components/LoadingScreen';
import { Timestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebaseConfig';
import { ThemeContext } from '../../../context/ThemeContext';
import * as ExpoNotifications from 'expo-notifications';
import { containsFilteredContent, getFilteredContentCategory } from '../../../utils/contentFilter';
import UserAvatar from '../../../components/UserAvatar';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: Timestamp;
}

interface Ping {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  category: string;
  template: string;
  duration: string;
  maxParticipants: string;
  pingType: string;
  visibilityRadius: string;
  connectionIntents: string[];
  eventPreferences: any;
  createdAt: any;
  status: string;
  participants: string[];
  participantCount: number;
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

export default function PingChat() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const { messages, error, sendMessage } = usePingChat(id);
  const { getPings } = usePings({ user });
  const [newMessage, setNewMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const marginAnim = useRef(new Animated.Value(50)).current;
  const flatListRef = useRef<FlatList>(null);
  const { theme } = React.useContext(ThemeContext);
  const [messageError, setMessageError] = useState(false);
  const [pingDetails, setPingDetails] = useState<Ping | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchPingDetails = async () => {
      try {
        const allPings = await getPings();
        const found = allPings.find((p: Ping) => p.id === id);
        setPingDetails(found || null);
        
        // Check if user is a participant
        if (found && user) {
          const participant = found.participants?.includes(user.uid);
          setIsParticipant(participant);
          if (!participant) {
            setAccessDenied(true);
          }
        }
      } catch (error) {
        console.error('Error fetching ping details:', error);
      }
    };

    fetchPingDetails();
  }, [id, user]);

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

  const sendPushNotification = async (receiverId: string, messageText: string, pingId: string) => {
    try {
      // Get sender's data to get their name
      const senderDoc = await getDoc(doc(db, 'users', user?.uid || ''));
      const senderData = senderDoc.exists() ? senderDoc.data() : null;
      const senderName = senderData?.name || senderData?.displayName || 'Someone';

      // Get ping data to get ping title
      const pingDoc = await getDoc(doc(db, 'pings', pingId));
      const pingData = pingDoc.exists() ? pingDoc.data() : null;
      const pingTitle = pingData?.title || 'Ping';

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
          receiverData?.notificationPreferences?.events &&
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
              title: pingTitle,
              body: `${senderName}: ${messageText}`,
              sound: 'default',
              priority: 'high',
              data: {
                type: 'pingChat',
                pingId: pingId,
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
          eventsEnabled: receiverData?.notificationPreferences?.events,
          chatsEnabled: receiverData?.notificationPreferences?.chats,
          receiverId: receiverId
        });
      }

      // Add notification to receiver's user document
      const notification = {
        id: Date.now().toString(),
        title: pingTitle,
        body: `${senderName}: ${messageText}`,
        data: {
          type: 'pingChat',
          pingId: pingId,
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
    if (!newMessage.trim() || !user || !isParticipant) return;
    
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

    // Get sender's data to get their name
    const senderDoc = await getDoc(doc(db, 'users', user.uid));
    const senderData = senderDoc.exists() ? senderDoc.data() : null;
    const senderName = senderData?.name || senderData?.displayName || 'Anonymous';

    const messageData = {
      text: newMessage,
      userId: user.uid,
      userName: senderName,
    };
    
    try {
      await sendMessage(messageData);
      
      // Send notifications to all participants except the sender
      if (pingDetails?.participants) {
        await Promise.all(
          pingDetails.participants
            .filter((participantId: string) => participantId !== user.uid) // Exclude sender
            .map((participantId: string) => 
              sendPushNotification(participantId, newMessage, id as string)
            )
        );
      }
      
      setNewMessage('');
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      console.error('Error sending message:', error);
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

  // Show access denied screen if user is not a participant
  if (accessDenied) {
    return (
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <TopBar 
            showBackButton={true}
            showNotifications={true}
            onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          />
          <View style={styles.centerContainer}>
            <MaterialIcons name="lock" size={64} color={theme === "light" ? "#37a4c8" : "#4db8d4"} />
            <Text style={[styles.errorText, { color: theme === "light" ? "#1a1a1a" : "#ffffff" }]}>
              Access Denied
            </Text>
            <Text style={[styles.errorSubtext, { color: theme === "light" ? "#666666" : "#a0a0a0" }]}>
              You need to join this ping to access the chat
            </Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: "#37a4c8" }]}
              onPress={() => router.push(`/ping/${id}`)}
            >
              <Text style={styles.retryButtonText}>Go to Ping</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (isInitialLoading) {
    return (
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          showNotifications={true}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
        />

        {/* Ping Header */}
        <TouchableOpacity 
          style={[styles.pingHeader, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderBottomColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
          }]}
          onPress={() => router.push(`/ping/${id}`)}
        >
          <View style={styles.headerTextContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.pingName, { 
                color: theme === "light" ? "#1a1a1a" : "#ffffff",
              }]}>
                {pingDetails?.title || "Loading..."}
              </Text>
            </View>
            <View style={styles.infoRow}>
              {pingDetails?.location && (
                <View style={[styles.infoBadge, { 
                  backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                }]}>
                  <Ionicons name="location" size={14} color="#37a4c8" />
                  <Text style={[styles.infoText, { 
                    color: theme === "light" ? "#666666" : "#a0a0a0"
                  }]}>
                    {pingDetails.location}
                  </Text>
                </View>
              )}
              {pingDetails?.category && (
                <View style={[styles.infoBadge, { 
                  backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                }]}>
                  <Ionicons name="people" size={14} color="#37a4c8" />
                  <Text style={[styles.infoText, { 
                    color: theme === "light" ? "#666666" : "#a0a0a0"
                  }]}>
                    {pingDetails.category}
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
              <Text style={styles.retryButtonText}>Return to Ping</Text>
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
                  borderColor: messageError ? "#ff4444" : theme === "light" ? "#e0e0e0" : "#3a3a3a"
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
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={[styles.sendButton, { backgroundColor: "#37a4c8" }, messageError && styles.sendButtonDisabled]}
                disabled={messageError || !isParticipant}
              >
                <Feather name="send" size={24} color={messageError ? "#666666" : "#ffffff"} />
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
    borderRadius: 20,
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
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 20,
  },
  otherUserBubble: {
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
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
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
  pingHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  pingName: {
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
}); 