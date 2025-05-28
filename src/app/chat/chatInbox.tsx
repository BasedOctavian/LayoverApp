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
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import useChats from "../../hooks/useChats";
import useUsers from "../../hooks/useUsers";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.18;

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
}

interface Partner {
  id: string;
  name: string;
  profilePicture?: string;
}

interface ChatItemProps {
  chat: Chat;
  currentUser: User;
  getUser: (userId: string) => Promise<Partner>;
  onPress: () => void;
}

function ChatItem({ chat, currentUser, getUser, onPress }: ChatItemProps) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPartner = async () => {
      if (chat?.participants && currentUser) {
        const partnerId = chat.participants.find(
          (id: string) => id !== currentUser.uid
        );
        if (partnerId) {
          try {
            const fetchedPartner = await getUser(partnerId);
            setPartner(fetchedPartner);
          } catch (error) {
            console.error("Error fetching partner:", error);
          } finally {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadPartner();
  }, [chat, currentUser, getUser]);

  if (isLoading) {
    return (
      <View style={[styles.chatCard, { justifyContent: "center" }]}>
        <ActivityIndicator color="#38a5c9" />
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={[styles.chatCard, { justifyContent: "center" }]}>
        <Text style={styles.errorText}>Failed to load chat</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.chatCard} onPress={onPress}>
      <View style={styles.imageContainer}>
        {partner.profilePicture ? (
          <Image
            source={{ uri: partner.profilePicture }}
            style={styles.profileImage}
          />
        ) : (
          <View style={[styles.profileImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>
              {partner.name?.charAt(0)?.toUpperCase() || "?"}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{partner.name || "Unknown User"}</Text>
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      if (user) {
        try {
          const allChats = await getChats();
          if (allChats) {
            const userChats = allChats.filter(
              (chat: any) => chat.participants && chat.participants.includes(user.uid)
            ) as Chat[];
            setChats(userChats);
            setFilteredChats(userChats);
          }
        } catch (error) {
          console.error("Error fetching chats:", error);
        }
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

  const renderItem = ({ item }: { item: Chat }) => (
    <ChatItem
      chat={item}
      currentUser={user!}
      getUser={async (userId: string) => {
        const userData = await getUser(userId);
        if (!userData) throw new Error("User not found");
        return userData as Partner;
      }}
      onPress={() => {
        router.push("/chat/" + item.id);
      }}
    />
  );

  if (isAuthLoading || chatsLoading) {
    return (
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <LoadingScreen message="Loading your chats..." />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <TopBar showBackButton={true} title="Messages" />
        <View style={styles.container}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search chats..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {chatsError ? (
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
              ListEmptyComponent={
                <View style={styles.stateContainer}>
                  <Text style={styles.emptyText}>No chats found</Text>
                </View>
              }
            />
          )}

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
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: "#e4fbfe",
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  imageContainer: {
    width: 50,
    height: 50,
    marginRight: 16,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e4fbfe",
  },
  chatLastMessage: {
    fontSize: 14,
    color: "#38a5c9",
    marginTop: 4,
  },
  chatText: {
    fontSize: 18,
    color: "#e4fbfe",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#38a5c9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: "#64748B",
    fontSize: 16,
    textAlign: "center",
  },
  placeholderImage: {
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
