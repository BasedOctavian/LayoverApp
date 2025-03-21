import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../firebaseConfig";
import useAuth from "../../hooks/auth";
import useChats from "../../hooks/useChats";
import useUsers from "../../hooks/useUsers";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.18;

function ChatItem({ chat, currentUser, getUser, onPress }) {
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    if (chat?.participants && currentUser) {
      const partnerId = chat.participants.find(
        (id) => id !== currentUser.uid
      );
      if (partnerId) {
        (async () => {
          const fetchedPartner = await getUser(partnerId);
          setPartner(fetchedPartner);
        })();
      }
    }
  }, [chat, currentUser, getUser]);

  if (!partner) {
    return (
      <View style={[styles.chatCard, { justifyContent: "center" }]}>
        <Text style={styles.chatText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.chatCard} onPress={onPress}>
      <Image
        source={{
          uri: partner.profilePicture || "https://via.placeholder.com/150",
        }}
        style={styles.profileImage}
      />
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{partner.name}</Text>
        {chat.lastMessage ? (
          <Text style={styles.chatLastMessage} numberOfLines={1}>
            {chat.lastMessage}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ChatInbox() {
  const { user } = useAuth();
  const { getChats, loading: chatsLoading, error: chatsError } = useChats();
  const { getUser } = useUsers();
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      if (user) {
        const allChats = await getChats();
        const userChats = allChats.filter(
          (chat) => chat.participants && chat.participants.includes(user.uid)
        );
        setChats(userChats);
        setFilteredChats(userChats);
      }
    };
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = chats.filter((chat) =>
        chat.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const renderItem = ({ item }) => (
    <ChatItem
      chat={item}
      currentUser={user}
      getUser={getUser}
      onPress={() => {
        router.push("/chat/" + item.id);
      }}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={{ flex: 1 }}>
        {/* Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
          <Text style={styles.logo}>Wingman</Text>
          <TouchableOpacity onPress={() => router.push(`profile/${user?.uid}`)}>
            <Ionicons name="person-circle" size={32} color="#2F80ED" />
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          {/* Optional Search Input */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color="#2F80ED" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : chatsLoading ? (
            <View style={styles.stateContainer}>
              <ActivityIndicator size="large" color="#2F80ED" />
              <Text style={styles.loadingText}>Loading chats...</Text>
            </View>
          ) : chatsError ? (
            <View style={styles.stateContainer}>
              <Text style={styles.errorText}>{chatsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => {}}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredChats}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* Floating Action Button */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push("chat/chatExplore")}
          >
            <MaterialIcons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#E6F0FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: -0,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    backgroundColor: "#FFF",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  chatLastMessage: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  chatText: {
    fontSize: 18,
    color: "#1E293B",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748B",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2F80ED",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
    marginTop: 10,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2F80ED",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
