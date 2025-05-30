import { router } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
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
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import useChats from "../../hooks/useChats";
import useUsers from "../../hooks/useUsers";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import { formatDistanceToNow } from 'date-fns';

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.18;

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isPinned?: boolean;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
}

interface Partner {
  id: string;
  name: string;
  profilePicture?: string;
  age: string;
  airportCode: string;
  interests?: string[];
  moodStatus?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

interface ChatItemProps {
  chat: Chat;
  currentUser: User;
  getUser: (userId: string) => Promise<Partner>;
  onPress: () => void;
  onPinPress: () => void;
}

function ChatItem({ chat, currentUser, getUser, onPress, onPinPress }: ChatItemProps) {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = React.useContext(ThemeContext);

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
        <ActivityIndicator color="#37a4c8" />
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

  const getMessageStatusIcon = () => {
    switch (chat.lastMessageStatus) {
      case 'read':
        return <Ionicons name="checkmark-done" size={16} color="#37a4c8" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={16} color="#64748B" />;
      case 'sent':
        return <Ionicons name="checkmark" size={16} color="#64748B" />;
      default:
        return null;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.chatCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: "#37a4c8",
        borderLeftWidth: chat.isPinned ? 4 : 1,
        borderLeftColor: chat.isPinned ? "#37a4c8" : "#37a4c8"
      }]} 
      onPress={onPress}
    >
      <View style={styles.chatCardContent}>
        <View style={styles.chatHeader}>
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
            {partner.isOnline && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.chatMainInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.chatName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                {partner.name || "Unknown User"}
              </Text>
              {chat.isPinned && (
                <TouchableOpacity onPress={onPinPress} style={styles.pinButton}>
                  <Ionicons name="pin" size={16} color="#37a4c8" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.userDetails}>
              <Text style={[styles.userAge, { color: "#37a4c8" }]}>{partner.age} years old</Text>
              <Text style={[styles.userLocation, { color: "#37a4c8" }]}>• {partner.airportCode}</Text>
              {partner.lastSeen && (
                <Text style={[styles.lastSeen, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  • Last seen {formatDistanceToNow(partner.lastSeen, { addSuffix: true })}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.chatInfo}>
          {chat.lastMessage ? (
            <View style={styles.messageContainer}>
              <Text style={[styles.chatLastMessage, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={1}>
                {chat.lastMessage}
              </Text>
              <View style={styles.messageMeta}>
                {getMessageStatusIcon()}
                {chat.lastMessageTime && (
                  <Text style={[styles.messageTime, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    {formatDistanceToNow(chat.lastMessageTime, { addSuffix: true })}
                  </Text>
                )}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.userInterestsContainer}>
          {partner.interests?.slice(0, 2).map((interest: string, index: number) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestText}>{interest}</Text>
            </View>
          ))}
        </View>

        <View style={styles.userMoodContainer}>
          <View style={styles.moodIndicator} />
          <Text style={[styles.moodText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
            {partner.moodStatus || "Available"}
          </Text>
        </View>

        {chat.unreadCount ? (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{chat.unreadCount}</Text>
          </View>
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
  const { theme } = React.useContext(ThemeContext);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);

  // Add fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

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

  // Add effect for fade in animation
  useEffect(() => {
    if (!isAuthLoading && !chatsLoading && initialLoadComplete) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);
    }
  }, [isAuthLoading, chatsLoading, initialLoadComplete]);

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
        } finally {
          setInitialLoadComplete(true);
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

  const handlePinChat = (chatId: string) => {
    setPinnedChats(prev => {
      if (prev.includes(chatId)) {
        return prev.filter(id => id !== chatId);
      } else {
        return [...prev, chatId];
      }
    });
  };

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
      onPinPress={() => handlePinChat(item.id)}
    />
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

  if (isAuthLoading || chatsLoading || !initialLoadComplete) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading your chats..." />
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true} 
          title="Messages" 
          onProfilePress={() => router.push("/profile/profile")}
        />
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
              color: theme === "light" ? "#000000" : "#e4fbfe",
              borderColor: "#37a4c8"
            }]}
            placeholder="Search chats..."
            placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
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
              data={filteredChats.sort((a, b) => {
                // Sort by pinned status first
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                // Then by last message time
                return (b.lastMessageTime?.getTime() || 0) - (a.lastMessageTime?.getTime() || 0);
              })}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.stateContainer}>
                  <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#64748B" }]}>No chats found</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: "#37a4c8" }]}
            onPress={() => router.push("chat/chatExplore")}
          >
            <MaterialIcons name="add" size={28} color="#FFF" />
          </TouchableOpacity>
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
  chatCard: {
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
  chatCardContent: {
    padding: 16,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  chatMainInfo: {
    flex: 1,
  },
  chatName: {
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
  chatInfo: {
    marginBottom: 12,
  },
  chatLastMessage: {
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
    backgroundColor: "#37a4c8",
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
    fontSize: 16,
    textAlign: "center",
  },
  placeholderImage: {
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "600",
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinButton: {
    padding: 4,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  lastSeen: {
    fontSize: 12,
    marginLeft: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#37a4c8',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
