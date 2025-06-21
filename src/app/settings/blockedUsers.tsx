import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Animated,
  StatusBar,
  Easing,
  RefreshControl,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import useAuth from "../../hooks/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";

interface BlockedUser {
  id: string;
  name: string;
  profilePicture?: string;
  airportCode?: string;
}

// Add type guard for blocked users array
const isValidBlockedUsersArray = (data: unknown): data is string[] => {
  return Array.isArray(data) && data.every(item => typeof item === 'string');
};

export default function BlockedUsers() {
  const { user } = useAuth();
  const { theme } = React.useContext(ThemeContext);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [displayedUsers, setDisplayedUsers] = useState<BlockedUser[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;
  const USERS_PER_PAGE = 10;
  const INITIAL_USERS = 5;
  const [animatingUsers, setAnimatingUsers] = useState<Set<string>>(new Set());

  const fetchBlockedUsers = async () => {
    try {
      if (!user?.uid) {
        console.warn('No authenticated user found, retry count:', retryCount.current);
        
        // Retry logic if auth isn't immediately available
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          setTimeout(() => {
            fetchBlockedUsers();
          }, 1000); // Retry after 1 second
          return;
        }
        
        console.error('Max retries reached, no authenticated user available');
        setBlockedUsers([]);
        setDisplayedUsers([]);
        setHasMoreUsers(false);
        setCurrentPage(1);
        setLoading(false);
        return;
      }

      // Reset retry count on successful auth
      retryCount.current = 0;

      // Explicitly get the authenticated user's document
      const authUserRef = doc(db, "users", user.uid);
      const authUserDoc = await getDoc(authUserRef);

      if (!authUserDoc.exists()) {
        console.error('Authenticated user document not found');
        setBlockedUsers([]);
        setDisplayedUsers([]);
        setHasMoreUsers(false);
        setCurrentPage(1);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
        
        setLoading(false);
        return;
      }

      const authUserData = authUserDoc.data();
      console.log('Auth user data:', authUserData);

      // Handle case where blockedUsers array doesn't exist
      if (!authUserData?.blockedUsers) {
        console.warn('No blockedUsers array found in auth user document');
        setBlockedUsers([]);
        setDisplayedUsers([]);
        setHasMoreUsers(false);
        setCurrentPage(1);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
        
        setLoading(false);
        return;
      }

      // Validate the blockedUsers array
      if (!isValidBlockedUsersArray(authUserData.blockedUsers)) {
        console.warn('Invalid blockedUsers array format in auth user document');
        setBlockedUsers([]);
        setDisplayedUsers([]);
        setHasMoreUsers(false);
        setCurrentPage(1);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
        
        setLoading(false);
        return;
      }

      const blockedUserIds = authUserData.blockedUsers;
      console.log('Found blocked user IDs:', blockedUserIds);

      if (blockedUserIds.length === 0) {
        console.log('No blocked users found in auth user document');
        setBlockedUsers([]);
        setDisplayedUsers([]);
        setHasMoreUsers(false);
        setCurrentPage(1);
        
        // Animate in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
        
        setLoading(false);
        return;
      }

      // Fetch details for each blocked user
      const blockedUsersPromises = blockedUserIds.map(async (userId: string) => {
        if (!userId || typeof userId !== 'string') {
          console.warn('Invalid user ID in blockedUsers array:', userId);
          return null;
        }

        try {
          const blockedUserRef = doc(db, "users", userId);
          const blockedUserDoc = await getDoc(blockedUserRef);

          if (!blockedUserDoc.exists()) {
            console.warn(`Blocked user document not found for ID: ${userId}`);
            return null;
          }

          const blockedUserData = blockedUserDoc.data();
          console.log(`Fetched blocked user data for ${userId}:`, blockedUserData);

          if (!blockedUserData?.name) {
            console.warn(`Missing required fields for blocked user ${userId}`);
            return null;
          }

          return {
            id: userId,
            name: blockedUserData.name,
            profilePicture: blockedUserData.profilePicture,
            airportCode: blockedUserData.airportCode,
          };
        } catch (error) {
          console.error(`Error fetching blocked user ${userId}:`, error);
          return null;
        }
      });

      const users = (await Promise.all(blockedUsersPromises)).filter((user): user is { id: string; name: any; profilePicture: any; airportCode: any; } => {
        if (!user) return false;
        return (
          typeof user === 'object' &&
          'id' in user &&
          'name' in user &&
          typeof user.id === 'string' &&
          typeof user.name === 'string' &&
          (!('profilePicture' in user) || typeof user.profilePicture === 'string' || user.profilePicture === null) &&
          (!('airportCode' in user) || typeof user.airportCode === 'string' || user.airportCode === null)
        );
      });
      console.log('Successfully processed blocked users:', users);

      setBlockedUsers(users);

      // Set initial displayed users (first 5)
      const allUsers = [...users];
      const initialDisplayed = allUsers.slice(0, INITIAL_USERS);
      setDisplayedUsers(initialDisplayed);
      setHasMoreUsers(allUsers.length > INITIAL_USERS);
      setCurrentPage(1);

      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      Alert.alert("Error", "Failed to load blocked users. Please try again.");
      setBlockedUsers([]);
      setDisplayedUsers([]);
      setHasMoreUsers(false);
      setCurrentPage(1);
      
      // Animate in even on error
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
      
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  // Add effect to handle auth state changes
  useEffect(() => {
    if (user?.uid) {
      fetchBlockedUsers();
    }
  }, [user?.uid]);

  // Add focus effect to refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        fetchBlockedUsers();
      }
    }, [user?.uid])
  );

  const onRefresh = React.useCallback(async () => {
    if (!user?.uid) {
      console.warn('Cannot refresh: No authenticated user');
      return;
    }
    setRefreshing(true);
    await fetchBlockedUsers();
    setRefreshing(false);
  }, [user?.uid]);

  const loadMoreUsers = () => {
    const allUsers = blockedUsers;
    const nextPage = currentPage + 1;
    const startIndex = INITIAL_USERS + (nextPage - 2) * USERS_PER_PAGE;
    const endIndex = startIndex + USERS_PER_PAGE;
    const newUsers = allUsers.slice(startIndex, endIndex);
    
    setDisplayedUsers(prev => [...prev, ...newUsers]);
    setCurrentPage(nextPage);
    setHasMoreUsers(endIndex < allUsers.length);
  };

  const handleUnblock = async (userId: string) => {
    try {
      if (!user) return;

      // Start animation
      setAnimatingUsers(prev => new Set(prev).add(userId));

      // Animate out the item
      await new Promise(resolve => setTimeout(resolve, 300));

      // Update current user's document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(userId)
      });

      // Update the other user's document
      const otherUserRef = doc(db, "users", userId);
      await updateDoc(otherUserRef, {
        hasMeBlocked: arrayRemove(user.uid)
      });

      // Update the local state
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      setDisplayedUsers(prev => prev.filter(u => u.id !== userId));
      setAnimatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Failed to unblock user. Please try again.");
      // Remove from animating state if error occurs
      setAnimatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => {
    const isAnimating = animatingUsers.has(item.id);
    
    return (
      <Animated.View
        style={[
          styles.blockedUserItem, 
          { 
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: "#37a4c8",
            opacity: isAnimating ? 0 : 1,
            transform: [
              {
                translateX: isAnimating ? -100 : 0
              },
              {
                scale: isAnimating ? 0.8 : 1
              }
            ]
          }
        ]}
      >
        <View style={[styles.blockedUserGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <View style={styles.userInfoContainer}>
            <Image
              source={{ uri: item.profilePicture || "https://via.placeholder.com/150" }}
              style={styles.profileImage}
            />
            <View style={styles.userTextContainer}>
              <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                {item.name}
              </Text>
              {item.airportCode && (
                <Text style={[styles.userLocation, { color: "#37a4c8" }]}>
                  {item.airportCode}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.unblockButton,
              {
                opacity: isAnimating ? 0.5 : 1,
                transform: [{ scale: isAnimating ? 0.9 : 1 }]
              }
            ]}
            onPress={() => handleUnblock(item.id)}
            disabled={isAnimating}
            activeOpacity={0.7}
          >
            <Ionicons name="person-remove" size={20} color="#ff4444" />
            <Text style={styles.unblockButtonText}>Unblock</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading blocked users..." />;
  }

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar 
        showBackButton={true}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView 
            contentContainerStyle={styles.container}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#37a4c8"]}
                tintColor={theme === "light" ? "#37a4c8" : "#38a5c9"}
              />
            }
          >
            {/* Header */}
            <View style={styles.header}>
              <Text 
                style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Blocked Users
              </Text>
              <Text 
                style={[styles.headerDescription, { color: theme === "light" ? "#666666" : "#94A3B8" }]}
              >
                Manage users you've blocked from seeing your profile and messaging you
              </Text>
            </View>

            {/* Blocked Users Section */}
            <View style={styles.settingsSection}>
              <Text 
                style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Blocked Users ({blockedUsers.length})
              </Text>
              
              {displayedUsers.length === 0 ? (
                <View style={[styles.emptyState, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}>
                  <View style={[styles.emptyIconContainer, { 
                    backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
                    borderColor: "#37a4c8"
                  }]}>
                    <Ionicons name="person-remove" size={48} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </View>
                  <Text style={[styles.emptyText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    No Blocked Users
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme === "light" ? "#666666" : "#94A3B8" }]}>
                    Users you block won't be able to see your profile or message you. You can block users from their profile or chat.
                  </Text>
                </View>
              ) : (
                <>
                  {displayedUsers.map((user) => (
                    <View key={user.id}>
                      {renderBlockedUser({ item: user })}
                    </View>
                  ))}
                  
                  {hasMoreUsers && (
                    <TouchableOpacity
                      style={[styles.loadMoreButton, { 
                        backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                        borderColor: "#37a4c8"
                      }]}
                      onPress={loadMoreUsers}
                      accessibilityRole="button"
                      accessibilityLabel="Load more blocked users"
                    >
                      <View style={[styles.loadMoreGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                        <Ionicons name="chevron-down" size={20} color="#37a4c8" />
                        <Text style={[styles.loadMoreText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                          Load More
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    paddingVertical: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerDescription: {
    fontSize: 14,
    fontWeight: "500",
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  blockedUserItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  blockedUserGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#37a4c8",
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 14,
    fontWeight: "500",
  },
  unblockButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  unblockButtonText: {
    color: "#ff4444",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginVertical: 24,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loadMoreButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  loadMoreGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
}); 