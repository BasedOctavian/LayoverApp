import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import useUsers from "../../hooks/useUsers";
import useChats from "../../hooks/useChats";
import useAuth from "../../hooks/auth";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../../config/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import { containsFilteredContent, getFilteredContentCategory } from "../../utils/contentFilter";

interface Chat {
  id: string; 
  participants: string[];
  connectionId?: string;
  connectionType?: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  lastMessage?: string;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
  lastMessageTime?: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  status?: 'pending' | 'active';
}

interface Message {
  id: string;
  text: string;
  date: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  sender: string;
  receiver: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface Partner {
  id: string;
  name: string;
  profilePicture?: string;
  age?: number;
  airportCode?: string;
  moodStatus?: string;
  bio?: string;
}

// Cache for user profiles
const userProfileCache = new Map<string, any>();

interface MessageItemProps {
  item: Message;
  isCurrentUser: boolean;
  theme: string;
}

// Format timestamp for display
const formatTimestamp = (dateObj: { seconds: number; nanoseconds: number } | Date) => {
  if (!dateObj) return "";
  const date = 'seconds' in dateObj ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const MessageItem: React.FC<MessageItemProps> = ({ item, isCurrentUser, theme }) => {
  const [userProfile, setUserProfile] = useState<any>(userProfileCache.get(item.sender) || null);
  const router = useRouter();
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(!userProfileCache.has(item.sender));
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
      if (!isCurrentUser && !userProfileCache.has(item.sender)) {
        setIsLoading(true);
        const startTime = Date.now();
        
        const userDoc = await getDoc(doc(db, 'users', item.sender));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setUserProfile(profileData);
          userProfileCache.set(item.sender, profileData);
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
  }, [item.sender, isCurrentUser]);

  return (
    <View style={[
      styles.messageContainer,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
    ]}>
      {!isCurrentUser && (
        <TouchableOpacity 
          onPress={() => router.push(`/profile/${item.sender}`)}
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
              {userProfile?.profilePicture ? (
                <Image
                  source={{ uri: userProfile.profilePicture }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.defaultAvatar]} />
              )}
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
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTimestamp, { 
            color: isCurrentUser ? "#ffffff" : theme === "light" ? "#666666" : "#a0a0a0",
            opacity: 0.8
          }]}>
            {formatTimestamp(item.date)}
          </Text>
          {isCurrentUser && (
            <View style={styles.messageStatus}>
              {item.status === 'read' ? (
                <Ionicons 
                  name="checkmark-done" 
                  size={18} 
                  color="#ffffff"
                />
              ) : item.status === 'delivered' ? (
                <Ionicons 
                  name="checkmark-done" 
                  size={18} 
                  color="#ffffff"
                />
              ) : (
                <Ionicons 
                  name="checkmark" 
                  size={18} 
                  color="#ffffff"
                />
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default function Chat() {
  // Get chat ID from params
  const { id } = useLocalSearchParams();
  const chatId = id as string;

  const { user: authUser } = useAuth();
  const { getUser, error: usersError } = useUsers();
  const {
    getChat,
    subscribeToChat,
    getMessages,
    subscribeToMessages,
    addMessage,
    deleteMessage,
    error: chatError,
  } = useChats();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const marginAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialScrollDone = useRef(false);
  const [messageError, setMessageError] = useState(false);

  const insets = useSafeAreaInsets();
  const globalTopBarHeight = 50 + insets.top;
  const chatHeaderHeight = 70;

  // Access ThemeContext
  const { theme } = React.useContext(ThemeContext);

  // Get chat document and partner details on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!chatId || !authUser) return;

      try {
        setIsInitialLoading(true);
        const fetchedChat = await getChat(chatId);
        if (fetchedChat && 'participants' in fetchedChat) {
          const chatData = fetchedChat as Chat;
          setChat(chatData);

          const otherUserId = chatData.participants.find(
            (participant: string) => participant !== authUser.uid
          );
          if (otherUserId) {
            const fetchedPartner = await getUser(otherUserId);
            if (fetchedPartner) {
              setPartner(fetchedPartner as Partner);
            }
          }
        }
      } catch (error) {
        console.error("Error loading initial chat data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, [chatId, authUser]);

  // Subscribe to real-time updates for messages
  useEffect(() => {
    if (chatId) {
      const unsubscribeMessages = subscribeToMessages(chatId, (msgs: Message[]) => {
        // Sort messages from oldest to newest
        const sorted = msgs.sort(
          (a: Message, b: Message) => {
            const dateA = a.date instanceof Date ? a.date.getTime() : a.date.seconds * 1000;
            const dateB = b.date instanceof Date ? b.date.getTime() : b.date.seconds * 1000;
            return dateA - dateB;
          }
        );
        setMessages(sorted);
        
        // If the last message is from the partner, scroll to bottom
        const lastMessage = sorted[sorted.length - 1];
        if (lastMessage && lastMessage.sender === partner?.id) {
          scrollToBottom();
        }
      });
      return () => unsubscribeMessages();
    }
  }, [chatId, partner?.id]);

  // Subscribe to real-time updates for the chat document
  useEffect(() => {
    if (chatId) {
      const unsubscribeChat = subscribeToChat(chatId, (updatedChat: Chat) => {
        setChat(updatedChat);
      });
      return () => unsubscribeChat();
    }
  }, [chatId]);

  // Function to scroll to bottom
  const scrollToBottom = (animated = true) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated });
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !isInitialScrollDone.current) {
      scrollToBottom(false);
      isInitialScrollDone.current = true;
    }
  }, [messages]);

  // Scroll to bottom when keyboard appears
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
        setTimeout(() => scrollToBottom(), 100);
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

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !authUser || !partner) return;
    
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
    const messageData = {
      text: newMessage,
      date: new Date(),
      sender: authUser.uid,
      receiver: partner.id,
      status: 'sent' as const
    };
    
    try {
      await addMessage(chatId, messageData);

      // Update the chat document with the last message info
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: newMessage,
        lastMessageStatus: 'sent',
        lastMessageTime: new Date()
      });

      // Get sender's data for the notification
      const senderDoc = await getDoc(doc(db, 'users', authUser.uid));
      const senderData = senderDoc.exists() ? senderDoc.data() : null;
      const senderName = senderData?.name || 'Unknown User';

      // Get receiver's data to check notification preferences and push token
      const receiverDoc = await getDoc(doc(db, 'users', partner.id));
      const receiverData = receiverDoc.exists() ? receiverDoc.data() : null;

      // Check if receiver has notifications enabled and has a push token
      const hasPushToken = !!receiverData?.expoPushToken;
      const hasNotificationsEnabled = !!receiverData?.notificationPreferences?.notificationsEnabled;
      const hasChatsEnabled = !!receiverData?.notificationPreferences?.chats;

      console.log('📱 Push notification conditions:', {
        hasPushToken,
        hasNotificationsEnabled,
        hasChatsEnabled,
        receiverId: partner.id,
        token: receiverData?.expoPushToken,
        fullPreferences: receiverData?.notificationPreferences
      });

      if (hasPushToken && hasNotificationsEnabled && hasChatsEnabled) {
        console.log('✅ All conditions met, sending push notification to:', {
          token: receiverData.expoPushToken,
          name: senderName,
          message: newMessage
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
              title: `Message from ${senderName}`,
              body: newMessage,
              sound: 'default',
              priority: 'high',
              data: { 
                type: 'chat',
                chatId: chatId,
                matchedUserId: authUser.uid,
                matchedUserName: senderName
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
            receiverId: partner.id,
            token: receiverData.expoPushToken
          });
        }
      } else {
        console.log('Push notification not sent because:', {
          hasToken: !!receiverData?.expoPushToken,
          notificationsEnabled: receiverData?.notificationPreferences?.notificationsEnabled,
          chatsEnabled: receiverData?.notificationPreferences?.chats,
          receiverId: partner.id
        });
      }

      // Add notification to receiver's user document
      const notification = {
        id: Date.now().toString(),
        title: `Message from ${senderName}`,
        body: newMessage,
        data: {
          type: 'chat',
          chatId: chatId,
          matchedUserId: authUser.uid,
          matchedUserName: senderName
        },
        timestamp: new Date(),
        read: false
      };

      // Add notification to receiver's user document
      if (receiverDoc.exists()) {
        const notifications = receiverData?.notifications || [];
        await updateDoc(doc(db, 'users', partner.id), {
          notifications: [...notifications, notification]
        });
      }

      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleLongPressMessage = (message: Message) => {
    if (!authUser || message.sender !== authUser.uid) return;
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMessage(chatId, message.id);
        },
      },
    ]);
  };

  // Add cleanup for cache when component unmounts
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

  if (usersError || chatError) {
    return (
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {usersError || chatError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.replace("/chat/chatInbox")}
          >
            <Text style={styles.retryButtonText}>Return to Inbox</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  if (!chat || !partner || !authUser) {
    return (
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Chat not found</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.replace("/chat/chatInbox")}
          >
            <Text style={styles.retryButtonText}>Return to Inbox</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          showNotifications={true}
          onProfilePress={() => router.push(`/profile/${authUser.uid}`)}
        />

        {/* Chat Header Top Bar */}
        <View style={[styles.chatHeader, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderBottomColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
        }]}>
          <TouchableOpacity 
            onPress={() => router.push(`/profile/${partner.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <View style={[styles.avatarContainer, { 
              backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
            }]}>
              {partner.profilePicture ? (
                <Image
                  source={{ uri: partner.profilePicture }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.placeholderAvatar]}>
                  <Text style={styles.placeholderText}>
                    {partner.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.headerTextContainer}>
              <View style={styles.nameRow}>
                <Text style={[styles.partnerName, { 
                  color: theme === "light" ? "#1a1a1a" : "#ffffff",
                }]}>
                  {partner.name || "Unknown User"}
                </Text>
                {partner.age && (
                  <Text style={[styles.ageText, { 
                    color: theme === "light" ? "#666666" : "#a0a0a0"
                  }]}>
                    {partner.age}
                  </Text>
                )}
              </View>
              <View style={styles.infoRow}>
                {partner.airportCode && (
                  <View style={[styles.infoBadge, { 
                    backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                  }]}>
                    <Ionicons name="airplane" size={14} color="#37a4c8" />
                    <Text style={[styles.infoText, { 
                      color: theme === "light" ? "#666666" : "#a0a0a0"
                    }]}>
                      {partner.airportCode}
                    </Text>
                  </View>
                )}
                {partner.moodStatus && (
                  <View style={[styles.infoBadge, { 
                    backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                  }]}>
                    <Ionicons name="happy" size={14} color="#37a4c8" />
                    <Text style={[styles.infoText, { 
                      color: theme === "light" ? "#666666" : "#a0a0a0"
                    }]}>
                      {partner.moodStatus}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.inner}>
              {/* Chat Messages */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => scrollToBottom()}
                onLayout={() => scrollToBottom()}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((message) => {
                  const isCurrentUser = message.sender === authUser.uid;
                  return (
                    <MessageItem 
                      key={message.id} 
                      item={message} 
                      isCurrentUser={isCurrentUser} 
                      theme={theme || 'light'} 
                    />
                  );
                })}
              </ScrollView>

              {/* Chat Input Area */}
              <Animated.View style={[styles.inputContainer, { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderTopColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
                marginBottom: marginAnim 
              }]}>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                    color: theme === "light" ? "#1a1a1a" : "#ffffff",
                    borderColor: messageError ? "#ff4444" : theme === "light" ? "#e0e0e0" : "#3a3a3a"
                  }]}
                  placeholder={messageError ? "Inappropriate content detected" : "Type your message..."}
                  placeholderTextColor={messageError ? "#ff4444" : theme === "light" ? "#666666" : "#a0a0a0"}
                  value={newMessage}
                  onChangeText={(text) => {
                    setNewMessage(text);
                    if (messageError && !containsFilteredContent(text)) {
                      setMessageError(false);
                    }
                  }}
                  multiline
                  maxLength={1000}
                  keyboardAppearance={theme === "light" ? "light" : "dark"}
                />
                <TouchableOpacity
                  style={[styles.sendButton, messageError && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={messageError}
                >
                  <Text style={[styles.sendButtonText, messageError && styles.sendButtonTextDisabled]}>Send</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  chatHeader: {
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  inner: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
    flexGrow: 1,
    justifyContent: 'flex-end',
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
  rightMessageText: {
    color: "#ffffff",
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
    opacity: 0.8,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    alignItems: "center",
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
    backgroundColor: "#37a4c8",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minWidth: 70,
    alignItems: 'center',
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#37a4c8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
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
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    overflow: "hidden",
  },
  placeholderAvatar: {
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  onlineStatus: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageStatus: {
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageText: {
    fontSize: 15,
    fontWeight: "500",
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
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  sendButtonTextDisabled: {
    color: "#666666",
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
});
