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
import { arrayUnion } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import useAuth from "../hooks/auth";
import { router } from "expo-router"; // For navigation consistency with Dashboard

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.80;

const Swipe = () => {
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const { getUsers, updateUser, loading, error } = useUsers();
  const swiperRef = useRef(null);
  const { user } = useAuth(); // Get current user from auth context
  const currentUserUID = user?.uid || "some-uid"; // Use actual UID or fallback
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets(); // Handle safe area insets like Dashboard
  const topBarHeight = 50 + insets.top; // Match Dashboard's top bar height

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers();
      if (fetchedUsers?.length) {
        setUsers(fetchedUsers);
        setShowSwiper(true);
      } else {
        setShowSwiper(false);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to fetch users. Please try again later.");
      console.error("Error fetching users:", err);
    }
  };

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
          Alert.alert("It's a match!", `You and ${swipedUser.name} liked each other!`);
        }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to process swipe. Please try again.");
      console.error("Error processing right swipe:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onSwipedLeft = (index) => {
    console.log("Swiped left on user:", users[index].name);
  };

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

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
              {/* Removed image overlay to match Dashboard's simpler style */}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>
                {user.name}, {user.age || ""}
                <Text style={styles.pronounsText}> • {user.pronouns || "they/them"}</Text>
              </Text>
              <View style={styles.moodContainer}>
                <MaterialIcons name="mood" size={20} color="#2F80ED" /> {/* Updated color */}
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

  const renderSection = (iconName, content) => {
    if (!content || (Array.isArray(content) && !content.length)) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={iconName} size={20} color="#2F80ED" /> {/* Updated color */}
          <Text style={styles.sectionContent}>
            {Array.isArray(content) ? content.join(" • ") : content}
          </Text>
        </View>
        <View style={styles.divider} />
      </View>
    );
  };

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
            <ActivityIndicator size="large" color="#2F80ED" /> {/* Updated color */}
            <Text style={styles.loadingText}>Loading profiles...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

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
              ref={swiperRef}
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
                left: overlayConfig("NOPE", "#FF3B30"),
                right: overlayConfig("LIKE", "#4CD964"),
              }}
              onSwipedAll={() => {
                setShowSwiper(false);
                fetchUsers().then(() => setShowSwiper(true));
              }}
            />
          ) : (
            <View style={styles.loadingFallback}>
              <ActivityIndicator size="large" color="#2F80ED" /> {/* Updated color */}
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const overlayConfig = (title, color) => ({
  title,
  style: {
    label: {
      backgroundColor: color,
      borderColor: color,
      color: "#fff",
      borderWidth: 0,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 20,
      fontSize: 24,
      fontWeight: "800",
      transform: [{ rotate: color === "#4CD964" ? "-8deg" : "8deg" }],
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },
    wrapper: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 60,
    },
  },
});

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
    borderRadius: 12, // Matches Dashboard's card border radius
    overflow: "hidden",
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3, // Lighter shadow to match Dashboard
  },
  cardContent: {
    flex: 1,
    backgroundColor: "#FFFFFF", // White background like Dashboard cards
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
    fontSize: 24, // Slightly larger but reasonable for a profile card
    fontWeight: "600",
    color: "#1E293B", // Matches Dashboard's primary text color
  },
  pronounsText: {
    fontSize: 16,
    color: "#64748B", // Matches Dashboard's secondary text color
    fontWeight: "400",
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  moodText: {
    fontSize: 16,
    color: "#64748B", // Matches Dashboard's secondary text color
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
    color: "#1E293B", // Matches Dashboard's primary text color
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0", // Matches Dashboard's border color
    marginVertical: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
  },
  createdAtText: {
    fontSize: 12,
    color: "#64748B", // Matches Dashboard's secondary text color
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30", // Kept as is for error indication
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#64748B", // Matches Dashboard's secondary text color
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#2F80ED", // Matches Dashboard's primary action color
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
    color: "#64748B", // Matches Dashboard's secondary text color
  },
  loadingFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Swipe;