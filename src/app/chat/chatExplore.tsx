import { router, useLocalSearchParams } from "expo-router";
import {
  Text,
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Easing,
} from "react-native";
import useAuth from "../../hooks/auth";
import React, { useEffect, useState, useRef } from "react";
import useUsers from "../../hooks/useUsers";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";

interface Chat {
  id: string;
  participants: string[];
  createdAt: Date;
}

export default function ChatExplore() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { getUsers, loading: usersLoading, error: usersError } = useUsers();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { theme } = React.useContext(ThemeContext);

  // Auth-related states
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // States to manage chat fetching and creation
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatPartnerIds, setChatPartnerIds] = useState<string[]>([]);

  // Add fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

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
    return unsubscribe;
  }, []);

  // Add effect for fade in animation
  useEffect(() => {
    if (!loading && !usersLoading && !chatLoading && initialLoadComplete) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);
    }
  }, [loading, usersLoading, chatLoading, initialLoadComplete]);

  // Function to fetch chats where the current user is a participant
  const getUserChats = async (userId: string) => {
    setChatLoading(true);
    try {
      const chatsCollection = collection(db, "chats");
      const q = query(chatsCollection, where("participants", "array-contains", userId));
      const snapshot = await getDocs(q);
      const chats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Chat[];
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
        try {
          const allUsers = await getUsers();
          const otherUsers = allUsers.filter((u: any) => u.id !== user.uid);
          setUsers(otherUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
        } finally {
          setInitialLoadComplete(true);
        }
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
      style={[styles.userCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: "#37a4c8"
      }]}
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
      <View style={styles.userCardContent}>
        <View style={styles.userHeader}>
          <Image
            source={{ uri: item.profilePicture || "https://via.placeholder.com/150" }}
            style={styles.profileImage}
          />
          <View style={styles.userMainInfo}>
            <Text style={[styles.userName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
              {item.name}
            </Text>
            <View style={styles.userDetails}>
              <Text style={[styles.userAge, { color: "#37a4c8" }]}>{item.age} years old</Text>
              <Text style={[styles.userLocation, { color: "#37a4c8" }]}>• {item.airportCode}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.userBioContainer}>
          <Text style={[styles.userBio, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={2}>
            {item.bio || "No bio available"}
          </Text>
        </View>

        <View style={styles.userInterestsContainer}>
          {item.interests?.slice(0, 3).map((interest: string, index: number) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>

        <View style={styles.userMoodContainer}>
          <View style={styles.moodIndicator} />
          <Text style={[styles.moodText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
            {item.moodStatus || "Available"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Interpolate colors for smooth transitions
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e6e6e6', '#000000'],
    extrapolate: 'clamp'
  });

  const textColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#ffffff'],
    extrapolate: 'clamp'
  });

  if (loading || !initialLoadComplete) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading..." />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true} 
          title="New Chat" 
          onProfilePress={() => router.push("/profile/profile")}
        />
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
              color: theme === "light" ? "#000000" : "#e4fbfe",
              borderColor: "#37a4c8"
            }]}
            placeholder="Search users..."
            placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {usersLoading || chatLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingScreen message="Finding users to chat with..." />
            </View>
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
        </Animated.View>
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
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  userCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    overflow: 'hidden',
  },
  userCardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  userMainInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAge: {
    fontSize: 14,
    fontWeight: "500",
  },
  userLocation: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  userBioContainer: {
    marginBottom: 12,
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  interestTag: {
    backgroundColor: "#37a4c8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  userMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 8,
  },
  moodText: {
    fontSize: 14,
    fontWeight: "500",
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
