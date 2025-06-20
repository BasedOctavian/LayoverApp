import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
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
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
} from "react-native";
import useAuth from "../../hooks/auth";
import React, { useEffect, useState, useRef, useCallback } from "react";
import useUsers from "../../hooks/useUsers";
import { LinearGradient } from "expo-linear-gradient";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import BottomNavBar from "../../components/BottomNavBar";
import useChats from "../../hooks/useChats";
import useNotificationCount from "../../hooks/useNotificationCount";

interface Chat {
  id: string;
  participants: string[];
  createdAt: Date;
  status: string;
  connectionType: string | null;
  connectionId: string | null;
  lastMessage: string | null;
}

interface AppUser {
  id: string;
  name: string;
  age: number;
  airportCode: string;
  bio?: string;
  interests?: string[];
  moodStatus?: string;
  profilePicture?: string;
}

interface UserCardProps {
  item: AppUser;
  onPress: () => void;
}

const UserCard = ({ item, onPress }: UserCardProps) => {
  const { user } = useAuth();
  const { theme } = React.useContext(ThemeContext);

  const handleCardPress = () => {
    router.push(`/profile/${item.id}`);
  };

  return (
    <TouchableOpacity
      style={[styles.userCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: "#37a4c8"
      }]}
      onPress={handleCardPress}
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

        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: '#37a4c8' }]}
          onPress={handleCardPress}
        >
          <Text style={styles.connectButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const ModernLoadingIndicator = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Complex animation sequence
    const pulseAnimation = Animated.sequence([
      // First phase: grow and fade in
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ]),
      // Second phase: shrink and fade out
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ]),
    ]);

    // Continuous rotation animation
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );

    // Start both animations
    Animated.loop(pulseAnimation).start();
    rotationAnimation.start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingIndicatorContainer}>
      <Animated.View
        style={[
          styles.loadingCircle,
          {
            backgroundColor: color,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            transform: [
              { scale: scaleAnim },
              { rotate: spin }
            ],
            shadowOpacity: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.5],
            }),
            shadowRadius: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 8],
            }),
          },
        ]}
      />
    </View>
  );
};

export default function ChatExplore() {
  const { user } = useAuth();
  const { getUsers } = useUsers();
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Auth-related states
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  const loadingStartTime = useRef<number | null>(null);

  // States to manage chat fetching and creation
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatPartnerIds, setChatPartnerIds] = useState<string[]>([]);

  // Add fade animation
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

  // Add back the handleBack function
  const handleBack = () => {
    // Animate out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  };

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

  // Handle fade in animation when content is ready
  useEffect(() => {
    if (!loading && initialLoadComplete) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);
    }
  }, [loading, initialLoadComplete]);

  // Handle theme changes
  useEffect(() => {
    if (isThemeChanging) {
      // First fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        // Update animation values for new theme
        backgroundAnim.setValue(theme === "light" ? 0 : 1);
        textAnim.setValue(theme === "light" ? 0 : 1);
        
        // Fade back in with a slight delay
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }).start(() => {
            setIsThemeChanging(false);
          });
        }, 50);
      });
    }
  }, [theme, isThemeChanging]);

  // Fetch all users excluding the authenticated user
  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        try {
          setUsersLoading(true);
          setUsersError(null);
          loadingStartTime.current = Date.now();
          // Get current user's blocked lists
          const currentUserDoc = await getDoc(doc(db, "users", user.uid));
          const currentUserData = currentUserDoc.data();
          const blockedUsers = currentUserData?.blockedUsers || [];
          const hasMeBlocked = currentUserData?.hasMeBlocked || [];

          // Get all users
          const allUsers = await getUsers() as AppUser[];
          
          // Get all users' documents to check their blocked lists
          const userDocs = await Promise.all(
            allUsers.map(u => getDoc(doc(db, "users", u.id)))
          );

          // Filter users based on blocking status and other criteria
          const otherUsers = allUsers.filter((u: AppUser, index: number) => {
            const userDoc = userDocs[index];
            const userData = userDoc.data();
            
            // Check if either user has blocked the other
            const isBlocked = blockedUsers.includes(u.id);
            const hasBlockedMe = hasMeBlocked.includes(u.id);
            const hasBlockedCurrentUser = userData?.blockedUsers?.includes(user.uid);
            const currentUserHasBlockedThem = userData?.hasMeBlocked?.includes(user.uid);

            return u.id !== user.uid && // Not current user
                   !isBlocked && // Not blocked by current user
                   !hasBlockedMe && // Has not blocked current user
                   !hasBlockedCurrentUser && // Has not blocked current user
                   !currentUserHasBlockedThem; // Current user has not blocked them
          });

          // Sort users: those with profile pictures first
          const sortedUsers = otherUsers.sort((a, b) => {
            const aHasProfilePic = Boolean(a.profilePicture);
            const bHasProfilePic = Boolean(b.profilePicture);
            if (aHasProfilePic === bHasProfilePic) return 0;
            return aHasProfilePic ? -1 : 1;
          });

          setUsers(sortedUsers);
        } catch (error) {
          console.error("Error fetching users:", error);
          setUsersError("Failed to load users. Please try again.");
        } finally {
          setUsersLoading(false);
          // Ensure minimum loading time of 2 seconds
          const elapsed = Date.now() - (loadingStartTime.current || 0);
          const minDuration = 2000; // 2 seconds
          const remaining = Math.max(0, minDuration - elapsed);
          
          if (remaining > 0) {
            await new Promise(resolve => setTimeout(resolve, remaining));
          }
          
          setInitialLoadComplete(true);
        }
      }
    };
    fetchUsers();
  }, [user]);

  // Fetch chats and extract chat partner IDs
  
    
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
    <UserCard item={item} onPress={() => {}} />
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

  if (loading || !initialLoadComplete || isThemeChanging) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <View style={styles.loadingContainer}>
            <ModernLoadingIndicator color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          </View>
          <View 
            style={[
              styles.bottomNavContainer,
              {
                backgroundColor: theme === "light" ? "#ffffff" : "#000000",
              }
            ]}
          >
            <BottomNavBar />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={false} 
          title=""
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
        />
        <Animated.View 
          style={[
            styles.container, 
            { 
              opacity: fadeAnim,
              transform: [{
                translateY: translateYAnim
              }]
            }
          ]}
        >
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
        <View 
          style={[
            styles.bottomNavContainer,
            {
              backgroundColor: theme === "light" ? "#ffffff" : "#000000",
            }
          ]}
        >
          <BottomNavBar />
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
  connectButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#37a4c8",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  loadingIndicatorContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
