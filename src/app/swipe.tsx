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
} from "react-native";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import Swiper from "react-native-deck-swiper";
import useUsers from "./../hooks/useUsers";
import { arrayUnion } from "firebase/firestore";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";

const { width, height } = Dimensions.get("window");

const Swipe = () => {
  // State Management
  const [users, setUsers] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const { getUsers, updateUser, loading, error } = useUsers();
  const swiperRef = useRef<Swiper<any>>(null);
  const currentUserUID = "some-uid"; // Replace with actual UID from auth context
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const fetchedUsers = await getUsers();
      if (fetchedUsers?.length) {
        setUsers(fetchedUsers);
        setShowSwiper(true); // Delay swiper rendering
      } else {
        setShowSwiper(false); // Hide swiper if no users
      }
    } catch (err) {
      Alert.alert("Error", "Failed to fetch users. Please try again later.");
      console.error("Error fetching users:", err);
    }
  };

  // Handle right swipe (like)
  const onSwipedRight = async (index: number) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    const swipedUser = users[index];
    const swipedUserUID = swipedUser.id;

    try {
      // Update current user's likedUsers array in Firestore
      await updateUser(currentUserUID, {
        likedUsers: arrayUnion(swipedUserUID),
      });

      // Check for mutual like
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

  // Handle left swipe (dislike)
  const onSwipedLeft = (index: number) => {
    console.log("Swiped left on user:", users[index].name);
  };

  // Render skeleton placeholder during loading
  const renderLoadingSkeleton = () => (
    <SkeletonPlaceholder backgroundColor="#e0e0e0" highlightColor="#f5f5f5">
      <View style={styles.cardContainer}>
        <SkeletonPlaceholder.Item width={120} height={120} borderRadius={60} alignSelf="center" />
        <SkeletonPlaceholder.Item width={200} height={20} marginTop={10} alignSelf="center" />
        <SkeletonPlaceholder.Item width={150} height={15} marginTop={5} alignSelf="center" />
        <SkeletonPlaceholder.Item width="90%" height={15} marginTop={20} />
        <SkeletonPlaceholder.Item width="80%" height={15} marginTop={10} />
        <SkeletonPlaceholder.Item width="70%" height={15} marginTop={10} />
      </View>
    </SkeletonPlaceholder>
  );

  // Render individual user card
  const renderCard = (user: any) => {
    if (!user) return null;

    return (
      <View style={[styles.cardContainer, styles.cardBackground]}>
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
            style={styles.profileImage}
          />
          <Text style={styles.nameText}>
            {user.name}, {user.age || ''}
          </Text>
          <Text style={styles.moodText}>
            <MaterialIcons name="mood" size={16} color="#fff" /> 
            {user.moodStatus || 'No mood set'}
          </Text>
        </View>

        {renderSection('About Me', user.bio)}
        {renderSection('Languages', user.languages, 'language')}
        {renderSection('Interests', user.interests, 'favorite')}
        {renderSection('Goals', user.goals, 'bullseye')}
        {renderSection('Travel History', user.travelHistory, 'flight')}

        <Text style={styles.createdAtText}>
          Member since: {user.createdAt?.toDate()?.toLocaleDateString() || 'Unknown'}
        </Text>
      </View>
    );
  };

  // Render section content (e.g., bio, interests)
  const renderSection = (title: string, content: any, iconName?: string) => {
    if (!content || (Array.isArray(content) && !content.length)) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {iconName && <MaterialIcons name={iconName} size={20} color="#fff" />}{' '}
          {title}
        </Text>
        <Text style={styles.sectionContent}>
          {Array.isArray(content) ? content.join(", ") : content}
        </Text>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        {renderLoadingSkeleton()}
      </View>
    );
  }

  // Error state
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

  // No users state
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

  // Main render with swiper
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
            left: overlayConfig('NOPE', 'red'),
            right: overlayConfig('LIKE', 'green'),
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

// Configure overlay labels for swipes
const overlayConfig = (title: string, color: string) => ({
  title,
  style: {
    label: {
      backgroundColor: color,
      borderColor: color,
      color: "#fff",
      borderWidth: 1,
    },
    wrapper: {
      flexDirection: "column",
      alignItems: color === 'green' ? "flex-start" : "flex-end",
      justifyContent: "flex-start",
      marginTop: 30,
      marginLeft: color === 'green' ? 30 : -30,
    },
  },
});

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContainer: {
    flex: 1,
    borderRadius: 15,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    width: width * 0.9,
    marginHorizontal: 20,
    minHeight: height * 0.7,
  },
  cardBackground: {
    backgroundColor: '#6a11cb',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 10,
  },
  nameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  moodText: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.8,
  },
  section: {
    width: "100%",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
    color: "#fff",
  },
  createdAtText: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    opacity: 0.8,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#666",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Swipe;