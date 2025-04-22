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

export default function Chat() {
  // Get chat ID from params
  const { id } = useLocalSearchParams();
  const chatId = id;

  const { user: authUser } = useAuth();
  const { getUser, loading, error } = useUsers();
  const {
    getChat,
    subscribeToChat,
    getMessages,
    subscribeToMessages,
    addMessage,
    deleteMessage,
    loading: loadingChat,
    error: errorChat,
  } = useChats();

  const [partner, setPartner] = useState(null);
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const insets = useSafeAreaInsets();
  const globalTopBarHeight = 50 + insets.top;
  const chatHeaderHeight = 70;
  const scrollViewRef = useRef(null);

  // Get chat document and partner details on mount
  useEffect(() => {
    if (chatId) {
      (async () => {
        const fetchedChat = await getChat(chatId);
        setChat(fetchedChat);

        // If the chat document includes a typing field, you could use it here.
        if (fetchedChat?.participants && authUser) {
          const otherUserId = fetchedChat.participants.find(
            (participant) => participant !== authUser.uid
          );
          if (otherUserId) {
            const fetchedPartner = await getUser(otherUserId);
            setPartner(fetchedPartner);
          }
        }
      })();
    }
  }, [chatId, authUser]);

  // Subscribe to real-time updates for the chat document (e.g. typing indicators)
  useEffect(() => {
    if (chatId) {
      const unsubscribeChat = subscribeToChat(chatId, (updatedChat) => {
        setChat(updatedChat);
      });
      return () => unsubscribeChat();
    }
  }, [chatId]);

  // Subscribe to real-time updates for messages
  useEffect(() => {
    if (chatId) {
      const unsubscribeMessages = subscribeToMessages(chatId, (msgs) => {
        // Sort messages from oldest to newest
        const sorted = msgs.sort(
          (a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0)
        );
        setMessages(sorted);
        // Scroll to bottom when new messages arrive
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
      return () => unsubscribeMessages();
    }
  }, [chatId]);

  // Format timestamp for display
  const formatTimestamp = (dateObj) => {
    if (!dateObj) return "";
    const date = dateObj.seconds ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "") return;
    const messageData = {
      content: newMessage,
      date: new Date(),
      sender: authUser.uid,
      receiver: partner?.id,
    };
    const messageId = await addMessage(chatId, messageData);
    if (messageId) {
      // The real-time subscription will update the message list.
      setNewMessage("");
    }
  };

  const handleLongPressMessage = (message) => {
    if (message.sender !== authUser.uid) return;
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMessage(chatId, message.id);
          // The subscription will update the messages.
        },
      },
    ]);
  };

  if (loading || loadingChat) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["bottom"]}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
          <ActivityIndicator size="large" color="#2F80ED" />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error || errorChat) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["bottom"]}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
          <Text style={styles.errorText}>Error: {error || errorChat}</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!partner) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={["bottom"]}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
          <Text style={styles.infoText}>User not found</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
        <TopBar />

        {/* Chat Header Top Bar */}
        <TouchableOpacity onPress={() => router.push(`/profile/${partner.id}`)}>
          <View style={[styles.chatHeader, { height: chatHeaderHeight }]}>
            <Image
              source={{
                uri: partner.profilePicture || "https://via.placeholder.com/150",
              }}
              style={styles.avatar}
            />
            <Text style={styles.partnerName}>{partner.name}</Text>
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
              >
                {messages.map((message) => {
                  const isSender = message.sender === authUser.uid;
                  return (
                    <TouchableOpacity
                      key={message.id}
                      onLongPress={() => handleLongPressMessage(message)}
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
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Type your message..."
                  placeholderTextColor="#64748B"
                  value={newMessage}
                  onChangeText={setNewMessage}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                >
                  <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
              </View>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#E6F0FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: -10,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    color: "#1E293B",
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
  },
  messageBubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 12,
    marginVertical: 5,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "#2F80ED",
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
    color: "#1E293B",
    lineHeight: 22,
  },
  rightMessageText: {
    color: "#FFFFFF",
  },
  timestamp: {
    fontSize: 10,
    color: "#FFFFFF",
    marginTop: 4,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 25,
    fontSize: 16,
    color: "#1E293B",
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#2F80ED",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#FFFFFF",
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
});
