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
} from "react-native";
import { useEffect, useState } from "react";
import useUsers from "../../hooks/useUsers"; // Adjust the path as needed
import useChats from "../../hooks/useChats";
import useAuth from "../../hooks/auth";
import { router, useLocalSearchParams } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

export default function Chat() {
  // Get the chat ID from the URL params
  const { id } = useLocalSearchParams();
  console.log("Chat ID:", id);

  // Get the authenticated user
  const { user: authUser } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
    if (user){
    setUser(user);
    } else {
    router.replace("login/login");
    }
    setAuthLoading(false);
    })
    }, []);

  // Use the chat ID from params
  const chatId = id; // or fallback: chatId = "mMJuXG3BgWLGtxmnZhpi";

  // Hooks for fetching data and sending messages
  const { getUser, loading, error } = useUsers();
  const {
    getChat,
    getMessages,
    addMessage, // Function for sending messages
    loading: loadingChat,
    error: errorChat,
  } = useChats();

  // State for chat data, partner user, messages, and new message text
  const [partner, setPartner] = useState<any>(null);
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");

  useEffect(() => {
    if (chatId) {
      (async () => {
        // Fetch the chat document
        const fetchedChat = await getChat(chatId);
        setChat(fetchedChat);

        // Fetch messages from the 'messages' subcollection of this chat
        const fetchedMessages = await getMessages(chatId);
        console.log("Fetched messages:", fetchedMessages);

        // Sort messages from oldest to newest (assuming each message has a 'date' field with a 'seconds' property)
        const sortedMessages = fetchedMessages.sort(
          (a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0)
        );
        setMessages(sortedMessages);

        // If the chat has participants and we have an authenticated user, then find the partner.
        if (fetchedChat?.participants && authUser) {
          const otherUserId = fetchedChat.participants.find(
            (participant: string) => participant !== authUser.uid
          );
          if (otherUserId) {
            const fetchedPartner = await getUser(otherUserId);
            setPartner(fetchedPartner);
          } else {
            console.warn("No other user found in chat:", fetchedChat);
          }
        }
      })();
    }
  }, [chatId, authUser]);

  // Function to handle sending a new message
  const handleSendMessage = async () => {
    if (newMessage.trim() === "") return; // Do not send empty messages

    // Build the message object.
    // For production, consider using Firestore's serverTimestamp() for the date.
    const messageData = {
      content: newMessage,
      date: new Date(),
      sender: authUser.uid,
      receiver: partner?.id, // or partner.uid if that's your field
    };

    // Call the addMessage function from the useChats hook
    const messageId = await addMessage(chatId, messageData);
    if (messageId) {
      // Update local state to display the new message immediately.
      setMessages((prevMessages) => [
        ...prevMessages,
        { ...messageData, id: messageId },
      ]);
      setNewMessage(""); // Clear the input
    }
  };

  // Render loading indicator while fetching data.
  if (loading || loadingChat) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Display error messages if any.
  if (error || errorChat) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Error: {error || errorChat}
        </Text>
      </View>
    );
  }

  // Fallback if no partner is found.
  if (!partner) {
    return (
      <View style={styles.center}>
        <Text style={styles.infoText}>User not found</Text>
      </View>
    );
  }

  return (
    // Wrap everything in a KeyboardAvoidingView so that the input area is adjusted when the keyboard appears.
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* TouchableWithoutFeedback to dismiss the keyboard when tapping outside */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Chat Header with navigation to partner's profile */}
          <TouchableOpacity
            onPress={() => router.push(`/profile/${partner.id}`)}
          >
            <View style={styles.header}>
              <Image
                source={{
                  uri:
                    partner.profilePicture ||
                    "https://via.placeholder.com/150",
                }}
                style={styles.avatar}
              />
              <Text style={styles.headerText}>{partner.name}</Text>
            </View>
          </TouchableOpacity>

          {/* Chat Messages */}
          <ScrollView
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message) => {
              // Determine if the current user is the sender.
              const isSender = message.sender === authUser.uid;
              return (
                <View
                  key={message.id}
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
                </View>
              );
            })}
          </ScrollView>

          {/* Chat Input Area */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor="#999"
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  inner: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#6a11cb",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  headerText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  messageBubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: "#e5e5e5",
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
    maxWidth: "80%",
  },
  messageBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: "#6a11cb",
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
    maxWidth: "80%",
  },
  messageText: {
    color: "#000",
  },
  rightMessageText: {
    color: "#fff",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    padding: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#6a11cb",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  infoText: {
    fontSize: 16,
  },
});
