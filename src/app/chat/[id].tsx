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
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import useUsers from "../../hooks/useUsers";
import useChats from "../../hooks/useChats";
import useAuth from "../../hooks/auth";
import { router, useLocalSearchParams } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../../config/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import * as ExpoNotifications from 'expo-notifications';

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

  // Format timestamp for display
  const formatTimestamp = (dateObj: { seconds: number; nanoseconds: number } | Date) => {
    if (!dateObj) return "";
    const date = 'seconds' in dateObj ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendPushNotification = async (receiverId: string, message: string) => {
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

      // Get sender's name from Firestore
      const senderDoc = await getDoc(doc(db, 'users', authUser?.uid || ''));
      const senderName = senderDoc.exists() ? senderDoc.data()?.displayName : null;

      // Send push notification using Expo's push notification service
      const messageData = {
        to: pushToken,
        sound: 'default',
        title: senderName ? `Message from ${senderName}` : 'New Message',
        body: message,
        data: {
          type: 'chat',
          chatId: chatId,
          receiverId: receiverId,
          senderId: authUser?.uid,
          senderName: senderName
        },
      };

      console.log('Sending push notification:', messageData);

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !authUser || !partner) return;
    
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

      // Create notification for the receiver
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
      const receiverRef = doc(db, 'users', partner.id);
      const receiverDoc = await getDoc(receiverRef);
      if (receiverDoc.exists()) {
        const receiverData = receiverDoc.data();
        const notifications = receiverData.notifications || [];
        await updateDoc(receiverRef, {
          notifications: [...notifications, notification]
        });
      }

      // Send push notification to the receiver
      await sendPushNotification(partner.id, newMessage);
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

  if (isInitialLoading) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  if (usersError || chatError) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
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
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
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
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title="Chat"
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
                  const isSender = message.sender === authUser.uid;
                  return (
                    <TouchableOpacity
                      key={message.id}
                      onLongPress={() => handleLongPressMessage(message)}
                      onPress={() => Keyboard.dismiss()}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          isSender ? styles.messageBubbleRight : styles.messageBubbleLeft,
                          !isSender && { 
                            backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                            borderColor: theme === "light" ? "#e0e0e0" : "#3a3a3a"
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageText,
                            isSender ? styles.rightMessageText : { 
                              color: theme === "light" ? "#1a1a1a" : "#ffffff",
                              fontWeight: "500"
                            }
                          ]}
                        >
                          {message.text}
                        </Text>
                        <View style={styles.messageFooter}>
                          <Text style={[styles.timestamp, { 
                            color: isSender 
                              ? "#ffffff"
                              : (theme === "light" ? "#1a1a1a" : "#ffffff")
                          }]}>
                            {formatTimestamp(message.date)}
                          </Text>
                          {isSender && (
                            <View style={styles.messageStatus}>
                              {message.status === 'read' ? (
                                <Ionicons 
                                  name="checkmark-done" 
                                  size={18} 
                                  color="#ffffff"
                                />
                              ) : message.status === 'delivered' ? (
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
                    </TouchableOpacity>
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
                    borderColor: theme === "light" ? "#e0e0e0" : "#3a3a3a"
                  }]}
                  placeholder="Type your message..."
                  placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
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
    marginTop: 5,
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
  messageBubbleLeft: {
    alignSelf: "flex-start",
    borderRadius: 20,
    padding: 12,
    marginVertical: 4,
    marginLeft: 8,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopRightRadius: 20,
  },
  messageBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "#37a4c8",
    borderRadius: 20,
    padding: 12,
    marginVertical: 4,
    marginRight: 8,
    maxWidth: "80%",
    minWidth: "30%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 20,
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
});
