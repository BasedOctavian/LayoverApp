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
import { MaterialIcons } from "@expo/vector-icons";
import Swiper from "react-native-deck-swiper";
import useUsers from "./../hooks/useUsers";
import { arrayUnion } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.75;

const Swipe = () => {
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const { getUsers, updateUser, loading, error } = useUsers();
  const swiperRef = useRef(null);
  const currentUserUID = "some-uid"; // Replace with actual UID from auth context
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const buttonScale = useRef(new Animated.Value(1)).current;

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
        <LinearGradient
          colors={["#2A2D3E", "#1E202E"]}
          style={styles.cardGradient}
        >
          <View style={styles.profileHeader}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
                style={styles.profileImage}
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.imageOverlay}
              />
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>
                {user.name}, {user.age || ""}
                <Text style={styles.pronounsText}> • {user.pronouns || "they/them"}</Text>
              </Text>
              <View style={styles.moodContainer}>
                <MaterialIcons name="mood" size={20} color="#FFD700" />
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

          <View style={styles.footer}>
            <MaterialIcons name="verified" size={18} color="#6a11cb" />
            <Text style={styles.createdAtText}>
              Member since {user.createdAt?.toDate()?.toLocaleDateString() || "2024"}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderSection = (iconName, content) => {
    if (!content || (Array.isArray(content) && !content.length)) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={iconName} size={20} color="#6a11cb" />
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6a11cb" />
        <Text style={styles.loadingText}>Loading profiles...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!users.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyStateText}>No users found nearby.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
          <Text style={styles.retryButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <ActivityIndicator size="large" color="#6a11cb" />
        </View>
      )}
    </View>
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
  container: {
    flex: 1,
    backgroundColor: "#121318",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: "hidden",
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    flex: 1,
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
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  nameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  pronounsText: {
    fontSize: 16,
    color: "#A0A0A0",
    fontWeight: "400",
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  moodText: {
    fontSize: 16,
    color: "#FFD700",
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
    color: "#FFF",
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
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
    color: "#A0A0A0",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#A0A0A0",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#6a11cb",
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
    color: "#6a11cb",
  },
  loadingFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Swipe;