import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, StatusBar, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useAuth from '../../../hooks/auth';
import useChat from '../../../hooks/useChat';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventChat() {
  const { id } = useLocalSearchParams(); // Event ID from navigation params
  const { user } = useAuth(); // Authenticated user
  const router = useRouter();
  const { messages, loading, error, sendMessage } = useChat(id); // Custom chat hook
  const [newMessage, setNewMessage] = useState('');
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  const handleSendMessage = () => {
    if (!newMessage.trim() || !user) return;
    sendMessage({
      text: newMessage,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
    });
    setNewMessage('');
  };

  const formatTimestamp = (timestamp) => {
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
      const options = { month: 'short', day: 'numeric' };
      return date.toLocaleDateString(undefined, options) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const renderMessage = ({ item }) => {
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

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        {/* Top Bar matching Event Screen */}
        <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
          <Text style={styles.logo}>Wingman</Text>
          <TouchableOpacity onPress={() => router.push(`profile/${user?.uid}`)}>
            <Ionicons name="person-circle" size={32} color="#2F80ED" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading chat...</Text>
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{error}</Text>
          </View>
        ) : (
          <KeyboardAvoidingView behavior="padding" style={styles.flex}>
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              style={styles.messageList}
              inverted
              keyboardShouldPersistTaps="always"
            />
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                accessibilityLabel="Message input"
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                style={styles.sendButton}
                accessibilityLabel="Send message"
              >
                <Ionicons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  messageList: { flex: 1 },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '80%',
  },
  currentUserBubble: {
    backgroundColor: '#7F5AFF',
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: '#E2E8F0',
    alignSelf: 'flex-start',
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
  },
  currentUserText: {
    color: '#fff',
  },
  otherUserText: {
    color: '#2D3748',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#F7F7F7',
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#7F5AFF',
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
    color: '#2D3748',
  },
});