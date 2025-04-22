import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Animated,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import ImageViewing from "react-native-image-viewing";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar";

const Profile = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { user, userId } = useAuth();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPrompts, setShowPrompts] = useState(false);
  const promptAnim = useState(new Animated.Value(0))[0];
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  // Toggle quick starters modal
  const togglePrompts = () => {
    Animated.spring(promptAnim, {
      toValue: showPrompts ? 0 : 1,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
    setShowPrompts(!showPrompts);
  };

  // Handle photo press to open modal
  const handlePhotoPress = (photos: string[], index: number) => {
    setCurrentImages(photos);
    setInitialIndex(index);
    setIsModalVisible(true);
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId && id) {
        setLoading(true);
        try {
          const userDocRef = doc(db, "users", id);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            setError("No user data found.");
          }
        } catch (error) {
          setError("Failed to fetch user data.");
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [userId, id, fadeAnim]);

  // Preset messaging prompts
  const presetPrompts = [
    "Hi there!",
    "How's it going?",
    "Would love to chat!",
  ];

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#6a11cb" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <View style={styles.container}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
          <View style={styles.container}>
            <Text style={styles.noDataText}>No user data found.</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#E6F0FA", "#E6F0FA"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <TopBar />

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
            {/* Profile Header with Depth */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: userData.profilePicture || "https://via.placeholder.com/150" }}
                  style={styles.profileImage}
                />
                <View style={styles.statusIndicator} />
              </View>
              <Text style={styles.nameText}>
                {userData.name}, {userData.age}
                <Text style={styles.pronounsText}>
                  {userData.pronouns && ` (${userData.pronouns})`}
                </Text>
              </Text>
              <View style={styles.moodContainer}>
                <MaterialIcons name="mood" size={18} color="#6a11cb" />
                <Text style={styles.moodText}>{userData.moodStatus}</Text>
              </View>
            </View>

            {/* Profile Sections with Microinteractions */}
            <View style={styles.sectionsContainer}>
              <ProfileSection
                icon="info"
                title="About"
                content={userData.bio}
                cardStyle={styles.aboutCard}
              />

              <View style={styles.gridContainer}>
                <ProfileSection
                  icon="language"
                  title="Languages"
                  content={userData.languages.join(", ")}
                  cardStyle={styles.gridCard}
                />
                <ProfileSection
                  icon="favorite"
                  title="Interests"
                  content={userData.interests.join(", ")}
                  cardStyle={styles.gridCard}
                />
                <ProfileSection
                  icon="crisis-alert"
                  title="Goals"
                  content={userData.goals.join(", ")}
                  cardStyle={styles.gridCard}
                />
              </View>

              {/* Trip Galleries with Conditional Rendering */}
              {userData.travelHistory && Array.isArray(userData.travelHistory) && userData.travelHistory.length > 1 ? (
                userData.travelHistory.map((trip, index) => (
                  <TripGallery
                    key={index}
                    trip={trip}
                    onPhotoPress={handlePhotoPress}
                  />
                ))
              ) : null}
            </View>

            {/* Subtle Metadata */}
            <View style={styles.metaContainer}>
              <Text style={styles.metaText}>
                <MaterialIcons name="verified" size={14} color="#6a11cb" /> Joined{" "}
                {new Date(userData.createdAt?.toDate()).toLocaleDateString()}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Floating Action Container */}
        {id !== authUser?.uid && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.fab}
              activeOpacity={0.9}
              onPress={togglePrompts}
            >
              <LinearGradient
                colors={["#7F5AFF", "#5A7CFF"]}
                style={styles.fabGradient}
              >
                <MaterialIcons name="chat" size={24} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            {showPrompts && (
              <Animated.View
                style={[
                  styles.promptSheet,
                  {
                    transform: [
                      {
                        scale: promptAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: promptAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                    opacity: promptAnim,
                  },
                ]}
              >
                <Text style={styles.promptTitle}>Quick starters</Text>
                <View style={styles.promptGrid}>
                  {presetPrompts.map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.promptChip}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.promptText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            )}
          </View>
        )}

        {/* Image Viewing Modal */}
        <ImageViewing
          images={currentImages.map((uri) => ({ uri }))}
          imageIndex={initialIndex}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const ProfileSection = ({ icon, title, content, cardStyle }: any) => (
  <TouchableOpacity style={[styles.card, cardStyle]} activeOpacity={0.9}>
    <MaterialIcons name={icon} size={20} color="#6a11cb" style={styles.cardIcon} />
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardContent}>{content}</Text>
  </TouchableOpacity>
);

const TripGallery = ({ trip, onPhotoPress }) => (
  <View style={styles.tripContainer}>
    <Text style={styles.tripTitle}>{trip.name}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tripScrollContent}
    >
      {trip.photos.map((photo, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onPhotoPress(trip.photos, index)}
        >
          <Image source={{ uri: photo }} style={styles.tripPhoto} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingsGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(106,17,203,0.1)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 160,
  },
  contentContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  nameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  pronounsText: {
    fontSize: 16,
    color: "#718096",
    fontWeight: "400",
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(106,17,203,0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  moodText: {
    fontSize: 14,
    color: "#6a11cb",
    marginLeft: 8,
    fontWeight: "500",
  },
  sectionsContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  aboutCard: {
    marginBottom: 24,
    minHeight: 120,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  gridCard: {
    width: "100%",
    minHeight: 120,
    marginBottom: 12,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 8,
  },
  cardContent: {
    fontSize: 14,
    color: "#718096",
    lineHeight: 22,
  },
  metaContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#A0AEC0",
    fontWeight: "500",
  },
  actionContainer: {
    position: "absolute",
    bottom: 24,
    right: 24,
    alignItems: "flex-end",
    zIndex: 100,
  },
  fab: {
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  promptSheet: {
    position: "absolute",
    bottom: 72,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    padding: 20,
    width: 240,
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 101,
  },
  promptTitle: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  promptGrid: {
    gap: 12,
  },
  promptChip: {
    backgroundColor: "rgba(106,17,203,0.05)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  promptText: {
    fontSize: 14,
    color: "#6a11cb",
    fontWeight: "500",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ff4444",
    fontSize: 16,
    textAlign: "center",
  },
  noDataText: {
    color: "#2D3748",
    fontSize: 16,
    textAlign: "center",
  },
  tripContainer: {
    marginBottom: 32,
    width: "100%",
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  tripScrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  tripPhoto: {
    width: 120,
    height: 160,
    borderRadius: 16,
    backgroundColor: "#e9ecef",
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginLeft: -20,
    marginRight: 20,
  },
});

export default Profile;