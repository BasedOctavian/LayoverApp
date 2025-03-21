import { router, useLocalSearchParams } from "expo-router";
import {
  Text,
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import useAuth from "../../hooks/auth";
import { useEffect, useState } from "react";
import useUsers from "../../hooks/useUsers";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function ChatExplore() {
  const { user } = useAuth();
  const { getUsers, loading: usersLoading, error: usersError } = useUsers();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Auth-related states
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // States to manage chat fetching and creation
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatPartnerIds, setChatPartnerIds] = useState<string[]>([]);

  // Added auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  // Function to fetch chats where the current user is a participant
  const getUserChats = async (userId: string) => {
    setChatLoading(true);
    try {
      const chatsCollection = collection(db, "chats");
      const q = query(chatsCollection, where("participants", "array-contains", userId));
      const snapshot = await getDocs(q);
      const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      return chats;
    } catch (error) {
      setChatError("Failed to fetch user chats.");
      console.error("Error fetching chats:", error);
    } finally {
      setChatLoading(false);
    }
  };

  // Hook to create a chat document
  const addChat = async (chatData: any) => {
    setChatLoading(true);
    try {
      const chatsCollection = collection(db, "chats");
      const docRef = await addDoc(chatsCollection, chatData);
      return docRef.id;
    } catch (error) {
      setChatError("Failed to create chat.");
      console.error(error);
    } finally {
      setChatLoading(false);
    }
  };

  // Fetch all users excluding the authenticated user
  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        const allUsers = await getUsers();
        const otherUsers = allUsers.filter((u: any) => u.id !== user.uid);
        setUsers(otherUsers);
      }
    };
    fetchUsers();
  }, [user]);

  // Fetch chats and extract chat partner IDs
  useEffect(() => {
    if (user) {
      const fetchUserChats = async () => {
        const chats = await getUserChats(user.uid);
        if (chats) {
          const partners = chats.reduce<string[]>((acc, chat) => {
            const partnerIds = chat.participants.filter((p: string) => p !== user.uid);
            return [...acc, ...partnerIds];
          }, []);
          setChatPartnerIds(Array.from(new Set(partners)));
        }
      };
      fetchUserChats();
    }
  }, [user]);

  // Filter users list to only show those you haven't chatted with yet
  useEffect(() => {
    let updatedFilteredUsers = users.filter((u) => !chatPartnerIds.includes(u.id));
    if (searchQuery) {
      updatedFilteredUsers = updatedFilteredUsers.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredUsers(updatedFilteredUsers);
  }, [users, chatPartnerIds, searchQuery]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={async () => {
        if (!user) return;
        const chatData = {
          participants: [user.uid, item.id],
          createdAt: new Date(),
        };
        const chatId = await addChat(chatData);
        if (chatId) {
          router.push("/chat/" + chatId);
        }
      }}
    >
      <Image
        source={{ uri: item.profilePicture || "https://via.placeholder.com/150" }}
        style={styles.profileImage}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userBio}>{item.bio || "No bio available"}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
        {/* Global Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.logo}>Wingman</Text>
          <TouchableOpacity onPress={() => router.push(`profile/${authUser?.uid}`)}>
            <Ionicons name="person-circle" size={32} color="#2F80ED" />
          </TouchableOpacity>
        </View>
        <View style={styles.container}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {usersLoading || chatLoading ? (
            <Text style={styles.loadingText}>Loading users...</Text>
          ) : usersError || chatError ? (
            <Text style={styles.errorText}>{usersError || chatError}</Text>
          ) : (
            <FlatList
              data={filteredUsers}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#E6F0FA",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#E6F0FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    height: 50,
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
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
    marginBottom: 16,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userCard: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: "#64748B",
  },
  loadingText: {
    color: "#1E293B",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
    
  },
});
