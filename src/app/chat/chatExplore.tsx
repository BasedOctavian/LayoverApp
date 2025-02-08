import { router, useLocalSearchParams } from "expo-router";
import {
  Text,
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
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

export default function ChatExplore() {
  const { user } = useAuth();
  const { getUsers, loading, error } = useUsers();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // States to manage chat fetching and creation
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  // This state will hold the IDs of users that the auth user already has a chat with.
  const [chatPartnerIds, setChatPartnerIds] = useState<string[]>([]);

  // Function to fetch chats where the current user is a participant.
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

  // Hook to create a chat document with the given chat data.
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

  // Fetch all users excluding the authenticated user.
  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        const allUsers = await getUsers();
        // Exclude the current user.
        const otherUsers = allUsers.filter((u: any) => u.id !== user.uid);
        setUsers(otherUsers);
      }
    };
    fetchUsers();
  }, [user]);

  // Fetch chats and extract chat partner IDs.
  useEffect(() => {
    if (user) {
      const fetchUserChats = async () => {
        const chats = await getUserChats(user.uid);
        if (chats) {
          // For each chat, remove the current user's ID from the participants list
          // so that only the "other" user remains.
          const partners = chats.reduce<string[]>((acc, chat) => {
            const partnerIds = chat.participants.filter((p: string) => p !== user.uid);
            return [...acc, ...partnerIds];
          }, []);
          // Remove duplicates by converting the array to a Set, then back to an array.
          setChatPartnerIds(Array.from(new Set(partners)));
        }
      };
      fetchUserChats();
    }
  }, [user]);

  // Filter the users list by both search query and chat partner IDs.
  useEffect(() => {
    // Remove users that the auth user already has a chat with.
    let updatedFilteredUsers = users.filter((u) => !chatPartnerIds.includes(u.id));

    // Apply search query filter if present.
    if (searchQuery) {
      updatedFilteredUsers = updatedFilteredUsers.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredUsers(updatedFilteredUsers);
  }, [users, chatPartnerIds, searchQuery]);

  // Render a user card. When tapped, create a new chat and navigate to it.
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={async () => {
        if (!user) return;
        // Prepare chat data with both participants and a creation timestamp.
        const chatData = {
          participants: [user.uid, item.id],
          createdAt: new Date(), // You can replace this with serverTimestamp() if desired.
        };
        const chatId = await addChat(chatData);
        if (chatId) {
          // Navigate to the chat screen with the newly created chat's id.
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
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <View style={styles.container}>
        {/* Search Bar */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* User List */}
        {loading || chatLoading ? (
          <Text style={styles.loadingText}>Loading users...</Text>
        ) : error || chatError ? (
          <Text style={styles.errorText}>{error || chatError}</Text>
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
  userCard: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
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
  },
});
