import { router } from "expo-router";
import {
  Text,
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import useAuth from "../../hooks/auth";
import useChats from "../../hooks/useChats";
import useUsers from "../../hooks/useUsers";
import { onAuthStateChanged, User } from "firebase/auth"; // Added auth imports
import { auth } from "../../../firebaseConfig"; // Adjust path as needed

// Component for rendering a single chat item
function ChatItem({ chat, currentUser, getUser, onPress }: { 
  chat: any; 
  currentUser: any; 
  getUser: (uid: string) => Promise<any>; 
  onPress: () => void;
}) {
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    if (chat?.participants && currentUser) {
      const partnerId = chat.participants.find(
        (id: string) => id !== currentUser.uid
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
      </View>
    </TouchableOpacity>
  );
}

export default function ChatInbox() {
  const { user } = useAuth();
  const { getChats, loading: chatsLoading, error: chatsError } = useChats();
  const { getUser } = useUsers();

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<any[]>([]);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Added auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("/LoginScreen");
      }
      setLoading(false);
    });
    return unsubscribe; // Cleanup subscription
  }, []);

  useEffect(() => {
    const fetchChats = async () => {
      if (user) {
        const allChats = await getChats();
        const userChats = allChats.filter(
          (chat: any) =>
            chat.participants && chat.participants.includes(user.uid)
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

  const renderItem = ({ item }: { item: any }) => (
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
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <View style={styles.container}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : (
          <>
            {/* Floating Action Button */}
            <TouchableOpacity 
              style={styles.fab}
              onPress={() => router.push("chat/chatExplore")}
            >
              <MaterialIcons name="add" size={28} color="white" />
            </TouchableOpacity>

            {/* Chat List */}
            {chatsLoading ? (
              <Text style={styles.loadingText}>Loading chats...</Text>
            ) : chatsError ? (
              <Text style={styles.errorText}>{chatsError}</Text>
            ) : (
              <FlatList
                data={filteredChats}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: "#fff",
    marginBottom: 16,
    marginTop: 40,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
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
    color: "#fff",
  },
  chatText: {
    fontSize: 18,
    color: "#fff",
  },
  loadingText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 20,
  },
  errorText: {
    color: "#ff4444",
    textAlign: "center",
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
    marginTop: 45,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6a11cb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});