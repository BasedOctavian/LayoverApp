import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import Swiper from "react-native-deck-swiper";
import useUsers from "./../hooks/useUsers";
import { arrayUnion, doc, onSnapshot } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import useAuth from "../hooks/auth";
import { router } from "expo-router";
import { db } from "../../firebaseConfig";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.80;

const Swipe = () => {
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [currentUserData, setCurrentUserData] = useState(null);
  const { getUsers, updateUser, loading, error } = useUsers();
  const { user } = useAuth();
  const currentUserUID = user?.uid || "some-uid"; // Step 1: Store authenticated user's ID
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  // Step 5: Set up listener for array updates
  useEffect(() => {
    const userDocRef = doc(db, "users", currentUserUID);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setCurrentUserData({ id: doc.id, ...doc.data() });
      } else {
        console.error("User document not found.");
      }
    }, (err) => {
      console.error("Error listening to user data:", err);
    });

    return () => unsubscribe();
  }, [currentUserUID]);

  // Fetch users when currentUserData is available
  useEffect(() => {
    if (currentUserData) {
      fetchUsers();
    }
  }, [currentUserData]);

  /** Fetch users and filter based on likedUsers and dislikedUsers */
  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers(); // Step 2: Loop through users collection (handled by getUsers)
      const likedAndDisliked = [
        ...(currentUserData?.likedUsers || []),
        ...(currentUserData?.dislikedUsers || []),
      ];
      // Steps 3 & 4: Filter users based on likedUsers and dislikedUsers
      const filteredUsers = fetchedUsers.filter(
        (user) => user.id !== currentUserUID && !likedAndDisliked.includes(user.id)
      );
      setUsers(filteredUsers);
      setShowSwiper(filteredUsers.length > 0);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch users. Please try again later.");
      console.error("Error fetching users:", err);
    }
  };

  /** Handle right swipe (like) */
  const onSwipedRight = async (index) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    const swipedUser = users[index];
    const swipedUserUID = swipedUser.id;

    try {
      await updateUser(currentUserUID, {
        likedUsers: arrayUnion(swipedUserUID),
      });

      if (swipedUser.likedUsers?.includes(currentUserUID)) {
        const isDuplicate = connections.some(
          (conn) =>
            (conn.user1 === currentUserUID && conn.user2 === swipedUserUID) ||
            (conn.user1 === swipedUserUID && conn.user2 === currentUserUID)
        );
        if (!isDuplicate) {
          setConnections((prev) => [
            ...prev,
            { user1: currentUserUID, user2: swipedUserUID },
          ]);
          setTimeout(() => {
            Alert.alert("It's a match!", `You and ${swipedUser.name} liked each other!`);
          }, 500);
        }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to process swipe. Please try again.");
      console.error("Error processing right swipe:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Handle left swipe (dislike) - Step 6: Add to dislikedUsers */
  const onSwipedLeft = async (index) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    const swipedUser = users[index];
    const swipedUserUID = swipedUser.id;

    try {
      await updateUser(currentUserUID, {
        dislikedUsers: arrayUnion(swipedUserUID),
      });
      console.log("Swiped left on user:", swipedUser.name);
    } catch (err) {
      Alert.alert("Error", "Failed to process swipe. Please try again.");
      console.error("Error processing left swipe:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Render individual user card */
  const renderCard = (user) => {
    if (!user) return null;

    return (
      <Animated.View style={[styles.cardContainer, styles.cardShadow]}>
        <View style={styles.cardContent}>
          <View style={styles.profileHeader}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
                style={styles.profileImage}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>
                {user.name}, {user.age || ""}
              </Text>
              <View style={styles.moodContainer}>
                <MaterialIcons name="mood" size={20} color="#2F80ED" />
                <Text style={styles.moodText}>{user.moodStatus || "Exploring the world 🌍"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.contentContainer}>
            {renderSection("person-outline", user.bio)}
            {renderSection("translate", user.languages)}
            {renderSection("favorite-border", user.interests)}
            {renderSection("work-outline", user.goals)}
            {renderSection("flight-takeoff", user.travelHistory)}
          </View>
        </View>
      </Animated.View>
    );
  };

  /** Render profile section with icon and content */
  const renderSection = (iconName, content) => {
    if (!content || (Array.isArray(content) && !content.length)) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={iconName} size={20} color="#2F80ED" />
          <Text style={styles.sectionContent}>
            {Array.isArray(content) ? content.join(" • ") : content}
          </Text>
        </View>
        <View style={styles.divider} />
      </View>
    );
  };

  /** Loading state */
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={{ flex: 1 }}>
          <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
            <Text style={styles.logo}>Wingman</Text>
            <TouchableOpacity onPress={() => router.push(`profile/${currentUserUID}`)}>
              <Ionicons name="person-circle" size={32} color="#2F80ED" />
            </TouchableOpacity>
          </View>
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#2F80ED" />
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  /** Error state */
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={{ flex: 1 }}>
          <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
            <Text style={styles.logo}>Wingman</Text>
            <TouchableOpacity onPress={() => router.push(`profile/${currentUserUID}`)}>
              <Ionicons name="person-circle" size={32} color="#2F80ED" />
            </TouchableOpacity>
          </View>
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  /** No users available state */
  if (!users.length) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={{ flex: 1 }}>
          <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
            <Text style={styles.logo}>Wingman</Text>
            <TouchableOpacity onPress={() => router.push(`profile/${currentUserUID}`)}>
              <Ionicons name="person-circle" size={32} color="#2F80ED" />
            </TouchableOpacity>
          </View>
          <View style={styles.stateContainer}>
            <Text style={styles.emptyStateText}>No users found nearby.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  /** Main Swiper view */
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={{ flex: 1 }}>
        <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
          <Text style={styles.logo}>Wingman</Text>
          <TouchableOpacity onPress={() => router.push(`profile/${currentUserUID}`)}>
            <Ionicons name="person-circle" size={32} color="#2F80ED" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          {showSwiper && users.length > 0 ? (
            <Swiper
              cards={users}
              renderCard={renderCard}
              onSwipedLeft={onSwipedLeft}
              onSwipedRight={onSwipedRight}
              cardIndex={0}
              backgroundColor="transparent"
              stackSize={3}
              verticalSwipe={false}
              animateCardOpacity
              overlayLabels={{
                left: {
                  element: <Text style={{ color: "#FF3B30", fontSize: 24, fontWeight: "800" }}>NOPE</Text>,
                  style: {
                    wrapper: {
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 60,
                    },
                  },
                },
                right: {
                  element: <Text style={{ color: "#4CD964", fontSize: 24, fontWeight: "800" }}>LIKE</Text>,
                  style: {
                    wrapper: {
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 60,
                    },
                  },
                },
              }}
              onSwipedAll={() => {
                setShowSwiper(false);
                fetchUsers().then(() => setShowSwiper(true));
              }}
            />
          ) : (
            <View style={styles.loadingFallback}>
              <ActivityIndicator size="large" color="#2F80ED" />
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

/** Styles */
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#E6F0FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: -50,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: "hidden",
    marginLeft: 10,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  imageContainer: {
    width: CARD_WIDTH - 40,
    height: CARD_HEIGHT * 0.4,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  nameText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1E293B",
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  moodText: {
    fontSize: 16,
    color: "#64748B",
    marginLeft: 8,
    fontWeight: "500",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 8,
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
  emptyStateText: {
    fontSize: 18,
    color: "#64748B",
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748B",
  },
  loadingFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Swipe;