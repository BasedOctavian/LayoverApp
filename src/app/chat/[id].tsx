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
import { useEffect, useRef, useState } from "react";
import useUsers from "../../hooks/useUsers";
import useChats from "../../hooks/useChats";
import useAuth from "../../hooks/auth";
import { router, useLocalSearchParams } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";

interface Chat {
  id: string;
  participants: string[];
}

interface Message {
  id: string;
  content: string;
  date: {
    seconds: number;
  };
  sender: string;
  receiver: string;
}

interface Partner {
  id: string;
  name: string;
  profilePicture?: string;
}

export default function Chat() {
  // Get chat ID from params
  const { id } = useLocalSearchParams();
  const chatId = id as string;

  const { user: authUser } = useAuth();
  const { getUser, loading: usersLoading, error: usersError } = useUsers();
  const {
    getChat,
    subscribeToChat,
    getMessages,
    subscribeToMessages,
    addMessage,
    deleteMessage,
    loading: loadingChat,
    error: chatError,
  } = useChats();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const marginAnim = useRef(new Animated.Value(50)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const isInitialScrollDone = useRef(false);

  const insets = useSafeAreaInsets();
  const globalTopBarHeight = 50 + insets.top;
  const chatHeaderHeight = 70;

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

  // Subscribe to real-time updates for messages
  useEffect(() => {
    if (chatId) {
      const unsubscribeMessages = subscribeToMessages(chatId, (msgs: Message[]) => {
        // Sort messages from oldest to newest
        const sorted = msgs.sort(
          (a: Message, b: Message) => (a.date?.seconds || 0) - (b.date?.seconds || 0)
        );
        setMessages(sorted);
        // Scroll to bottom when new messages arrive
        scrollToBottom();
      });
      return () => unsubscribeMessages();
    }
  }, [chatId]);

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
  const formatTimestamp = (dateObj: { seconds: number } | Date) => {
    if (!dateObj) return "";
    const date = 'seconds' in dateObj ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || isSending || !authUser || !partner) return;
    
    setIsSending(true);
    const messageData = {
      content: newMessage,
      date: new Date(),
      sender: authUser.uid,
      receiver: partner.id,
    };
    
    try {
      const messageId = await addMessage(chatId, messageData);
      if (messageId) {
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
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

  if (isInitialLoading || usersLoading || loadingChat) {
    return (
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  if (usersError || chatError) {
    return (
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <TopBar 
          showBackButton={true}
          title="Chat"
          showNotifications={false}
        />

        {/* Chat Header Top Bar */}
        <TouchableOpacity onPress={() => router.push(`/profile/${partner.id}`)}>
          <View style={[styles.chatHeader, { height: chatHeaderHeight }]}>
            <View style={styles.avatarContainer}>
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
            </View>
            <Text style={styles.partnerName}>{partner.name || "Unknown User"}</Text>
          </View>
        </TouchableOpacity>

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
                        style={
                          isSender
                            ? styles.messageBubbleRight
                            : styles.messageBubbleLeft
                        }
                      >
                        <Text
                          style={
                            isSender
                              ? [styles.messageText, styles.rightMessageText]
                              : styles.messageText
                          }
                        >
                          {message.content}
                        </Text>
                        <Text style={styles.timestamp}>
                          {formatTimestamp(message.date)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Chat Input Area */}
              <Animated.View style={[styles.inputContainer, { marginBottom: marginAnim }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Type your message..."
                  placeholderTextColor="#64748B"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  editable={!isSending}
                />
                <TouchableOpacity
                  style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={isSending}
                >
                  <Text style={styles.sendButtonText}>
                    {isSending ? "Sending..." : "Send"}
                  </Text>
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
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#38a5c9",
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  partnerName: {
    fontSize: 20,
    color: "#e4fbfe",
    fontWeight: "600",
  },
  inner: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: "#1a1a1a",
    borderRadius: 15,
    padding: 12,
    marginVertical: 5,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  messageBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "#38a5c9",
    borderRadius: 15,
    padding: 12,
    marginVertical: 5,
    maxWidth: "80%",
    minWidth: "30%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    color: "#e4fbfe",
    lineHeight: 22,
  },
  rightMessageText: {
    color: "#000000",
  },
  timestamp: {
    fontSize: 10,
    color: "#e4fbfe",
    marginTop: 4,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#38a5c9",
    backgroundColor: "#1a1a1a",
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#000000",
    borderRadius: 25,
    fontSize: 16,
    color: "#e4fbfe",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  sendButton: {
    backgroundColor: "#38a5c9",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#000000",
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
  },
  infoText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  retryButton: {
    backgroundColor: "#38a5c9",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  avatarContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  placeholderAvatar: {
    backgroundColor: "#38a5c9",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "600",
  },
});
