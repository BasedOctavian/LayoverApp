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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

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
        setLoading(false);
        return;
      }

      const authUserData = authUserDoc.data();
      console.log('Auth user data:', authUserData);

      // Explicitly check the blockedUsers array
      if (!authUserData?.blockedUsers) {
        console.warn('No blockedUsers array found in auth user document');
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      // Validate the blockedUsers array
      if (!isValidBlockedUsersArray(authUserData.blockedUsers)) {
        console.warn('Invalid blockedUsers array format in auth user document');
        setBlockedUsers([]);
        setLoading(false);
        return;
      }

      const blockedUserIds = authUserData.blockedUsers;
      console.log('Found blocked user IDs:', blockedUserIds);

      if (blockedUserIds.length === 0) {
        console.log('No blocked users found in auth user document');
        setBlockedUsers([]);
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

      const users = (await Promise.all(blockedUsersPromises)).filter((user): user is BlockedUser => user !== null);
      console.log('Successfully processed blocked users:', users);

      setBlockedUsers(users);

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

  const handleUnblock = async (userId: string) => {
    try {
      if (!user) return;

      Alert.alert(
        "Unblock User",
        "Are you sure you want to unblock this user?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Unblock",
            style: "destructive",
            onPress: async () => {
              try {
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
              } catch (error) {
                console.error("Error updating documents:", error);
                Alert.alert("Error", "Failed to unblock user. Please try again.");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error unblocking user:", error);
      Alert.alert("Error", "Failed to unblock user. Please try again.");
    }
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <TouchableOpacity
      style={[styles.userCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: "#37a4c8"
      }]}
    >
      <View style={styles.userCardContent}>
        <View style={styles.userHeader}>
          <Image
            source={{ uri: item.profilePicture || "https://via.placeholder.com/150" }}
            style={styles.profileImage}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
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
          style={[styles.unblockButton, { backgroundColor: "#ff4444" }]}
          onPress={() => handleUnblock(item.id)}
        >
          <Text style={styles.unblockButtonText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingScreen message="Loading blocked users..." />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.container}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true} 
          title="Blocked Users" 
          onBackPress={() => router.back()}
        />
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {blockedUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="person-remove" size={64} color="#37a4c8" style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                No blocked users
              </Text>
              <Text style={[styles.emptySubtext, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                Users you block won't be able to see your profile or message you
              </Text>
            </View>
          ) : (
            <FlatList
              data={blockedUsers}
              renderItem={renderBlockedUser}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#37a4c8"]}
                  tintColor={theme === "light" ? "#37a4c8" : "#e4fbfe"}
                />
              }
            />
          )}
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 20,
  },
  userCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: "hidden",
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
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 14,
  },
  unblockButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  unblockButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
}); 