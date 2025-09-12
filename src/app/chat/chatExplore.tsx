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
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  onSnapshot,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { onAuthStateChanged, User, getAuth } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import BottomNavBar from "../../components/BottomNavBar";
import useChats from "../../hooks/useChats";
import useNotificationCount from "../../hooks/useNotificationCount";
import UserAvatar from "../../components/UserAvatar";
import * as Haptics from 'expo-haptics';

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
  index: number;
}

const UserCard = ({ item, onPress, index }: UserCardProps) => {
  const { user } = useAuth();
  const { theme } = React.useContext(ThemeContext);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const delay = index * 100;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [index]);

  const handleCardPress = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/profile/${item.id}`);
  };

  const handlePressIn = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.parallel([
      Animated.timing(cardScaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(cardScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  return (
    <Animated.View
      style={[
        styles.userCard,
        {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
          opacity: opacityAnim,
          transform: [{ scale: cardScaleAnim }],
        }
      ]}
    >
      <TouchableOpacity
        style={styles.userCardContent}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={styles.userHeader}>
          <View style={styles.imageContainer}>
            {item.profilePicture ? (
              <UserAvatar
                user={item}
                size={56}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>
                  {item.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={[styles.onlineIndicator, { backgroundColor: '#10B981' }]} />
          </View>
          <View style={styles.userMainInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                {item.name}
              </Text>
              <View style={styles.ageBadge}>
                <Text style={styles.ageBadgeText}>{item.age} years old</Text>
              </View>
            </View>
            <View style={styles.userDetails}>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={14} color="#37a4c8" />
                <Text style={[styles.userLocation, { color: "#37a4c8" }]}>{item.airportCode}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {item.bio && (
          <View style={styles.userBioContainer}>
            <Text style={[styles.userBio, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={2}>
              {item.bio}
            </Text>
          </View>
        )}

        {item.interests && item.interests.length > 0 && (
          <View style={styles.userInterestsContainer}>
            {item.interests?.slice(0, 3).map((interest: string, index: number) => (
              <Animated.View 
                key={index} 
                style={[
                  styles.interestTag,
                  {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim
                  }
                ]}
              >
                <Text style={styles.interestText}>{interest}</Text>
              </Animated.View>
            ))}
            {item.interests.length > 3 && (
              <View style={styles.moreInterestsBadge}>
                <Text style={styles.moreInterestsText}>+{item.interests.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.userMoodContainer}>
          <Animated.View 
            style={[
              styles.moodIndicator,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim
              }
            ]} 
          />
          <Text style={[styles.moodText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
            {item.moodStatus || "Available"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: '#37a4c8' }]}
          onPress={handleCardPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.connectButtonText}>View Profile</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ModernLoadingIndicator = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
          ]),
        ])
      ),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View 
      style={[
        styles.loadingIndicatorContainer,
        {
          opacity: fadeAnim,
          transform: [
            { scale: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1]
            })},
            { rotate: spin }
          ]
        }
      ]}
    >
      <Animated.View
        style={[
          styles.loadingCircle,
          {
            backgroundColor: color,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.7],
            }),
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </Animated.View>
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const loadingStartTime = useRef<number | null>(null);

  // States to manage chat fetching and creation
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatPartnerIds, setChatPartnerIds] = useState<string[]>([]);

  // Animation values for bounce effect
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;

  // Dynamic styles that depend on safe area insets
  const dynamicStyles = React.useMemo(() => ({
    listContent: {
      paddingBottom: 80 + insets.bottom,
    },
  }), [insets.bottom]);

  // Add back the handleBack function
  const handleBack = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
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
        // User is authenticated
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
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, initialLoadComplete]);

  // Add effect for bounce animation when loading completes
  useEffect(() => {
    if (!loading && initialLoadComplete) {
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }
  }, [loading, initialLoadComplete]);

  // Fetch existing connections to filter out users we already have connections with
  const fetchExistingConnections = async (currentUserId: string): Promise<string[]> => {
    try {
      const connectionsRef = collection(db, "connections");
      const q = query(
        connectionsRef,
        where("participants", "array-contains", currentUserId)
      );
      const querySnapshot = await getDocs(q);
      
      const connectedUserIds = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUserId);
        if (otherUserId) {
          connectedUserIds.add(otherUserId);
        }
      });
      
      console.log('Found existing connections with users:', Array.from(connectedUserIds));
      return Array.from(connectedUserIds);
    } catch (error) {
      console.error("Error fetching existing connections:", error);
      return [];
    }
  };

  // Fetch all users excluding the authenticated user
  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        try {
          setUsersLoading(true);
          setUsersError(null);
          loadingStartTime.current = Date.now();
          
          // Get existing connections first
          const connectedUserIds = await fetchExistingConnections(user.uid);
          
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

          // Filter users based on blocking status, existing connections, and other criteria
          const otherUsers = allUsers.filter((u: AppUser, index: number) => {
            const userDoc = userDocs[index];
            const userData = userDoc.data();
            
            // Check if either user has blocked the other
            const isBlocked = blockedUsers.includes(u.id);
            const hasBlockedMe = hasMeBlocked.includes(u.id);
            const hasBlockedCurrentUser = userData?.blockedUsers?.includes(user.uid);
            const currentUserHasBlockedThem = userData?.hasMeBlocked?.includes(user.uid);
            
            // Check if we already have a connection with this user
            const hasExistingConnection = connectedUserIds.includes(u.id);

            return u.id !== user.uid && // Not current user
                   !isBlocked && // Not blocked by current user
                   !hasBlockedMe && // Has not blocked current user
                   !hasBlockedCurrentUser && // Has not blocked current user
                   !currentUserHasBlockedThem && // Current user has not blocked them
                   !hasExistingConnection; // No existing connection (pending or active)
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

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredUsers(users.filter((u) => !chatPartnerIds.includes(u.id)));
      return;
    }

    const filtered = users.filter((u) => {
      const searchLower = text.toLowerCase();
      return (
        u.name.toLowerCase().includes(searchLower) &&
        !chatPartnerIds.includes(u.id)
      );
    });

    setFilteredUsers(filtered);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <UserCard item={item} onPress={() => {}} index={index} />
  );

  if (loading || !initialLoadComplete) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <LoadingScreen />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true} 
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
        />
        <Animated.View 
          style={{ 
            flex: 1,
            opacity: contentBounceAnim,
            transform: [
              { scale: contentScaleAnim },
              {
                translateY: contentBounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }
            ]
          }}
        >
          {/* Chat Explore Content */}
          <View style={styles.container}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} style={styles.searchIcon} />
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                    color: theme === "light" ? "#0F172A" : "#e4fbfe",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                  }
                ]}
                placeholder="Search by name..."
                placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>
            
            {usersLoading || chatLoading ? (
              <View style={styles.loadingContainer}>
                <ModernLoadingIndicator color={theme === "light" ? "#37a4c8" : "#4db8d4"} />
                <Text style={[styles.loadingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Finding amazing people...
                </Text>
              </View>
            ) : usersError || chatError ? (
              <View style={styles.stateContainer}>
                <Ionicons name="alert-circle" size={48} color="#FF3B30" style={styles.errorIcon} />
                <Text style={[styles.errorText, { color: "#FF3B30" }]}>
                  {usersError || chatError}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={dynamicStyles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      // Add refresh logic here if needed
                    }}
                    tintColor={theme === "light" ? "#37a4c8" : "#4db8d4"}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.stateContainer}>
                    <Ionicons name="people" size={48} color={theme === "light" ? "#64748B" : "#94A3B8"} style={styles.emptyIcon} />
                    <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      No users found
                    </Text>
                    <Text style={[styles.emptySubtext, { color: theme === "light" ? "#94A3B8" : "#64748B" }]}>
                      Try adjusting your search or check back later
                    </Text>
                  </View>
                }
              />
            )}
          </View>
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
  searchContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  searchInput: {
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  userCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  userCardContent: {
    padding: 20,
    flex: 1,
    justifyContent: 'center',
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  imageContainer: {
    marginRight: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.3,
  },
  ageBadge: {
    backgroundColor: '#37a4c8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userLocation: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  userBioContainer: {
    marginBottom: 16,
  },
  userBio: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    alignItems: 'center',
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
    fontWeight: "600",
  },
  moreInterestsBadge: {
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  moreInterestsText: {
    color: '#37a4c8',
    fontSize: 11,
    fontWeight: '600',
  },
  userMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  moodIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  moodText: {
    fontSize: 14,
    fontWeight: "500",
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorIcon: {
    marginBottom: 16,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: '400',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
    marginTop: 16,
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
    shadowRadius: 12
  },
  loadingIndicatorContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
