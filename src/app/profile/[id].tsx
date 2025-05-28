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
  TextInput,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../config/firebaseConfig";
import { db } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import ImageViewing from "react-native-image-viewing";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar";
import * as ImagePicker from 'expo-image-picker';
import LoadingScreen from "../../components/LoadingScreen";
import useChats from "../../hooks/useChats";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { DocumentData } from "firebase/firestore";

interface UserData {
  name: string;
  age: string;
  pronouns?: string;
  bio?: string;
  profilePicture?: string;
  moodStatus?: string;
  languages: string[];
  interests: string[];
  goals: string[];
  travelHistory?: any[];
  createdAt?: any;
}

// Helper function to convert Firestore data to UserData
const convertToUserData = (data: DocumentData): UserData => {
  return {
    name: data.name || '',
    age: data.age || '',
    pronouns: data.pronouns,
    bio: data.bio,
    profilePicture: data.profilePicture,
    moodStatus: data.moodStatus,
    languages: data.languages || [],
    interests: data.interests || [],
    goals: data.goals || [],
    travelHistory: data.travelHistory,
    createdAt: data.createdAt
  };
};

const Profile = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<UserData | null>(null);
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const [uploadingImage, setUploadingImage] = useState(false);
  const { addChat, addMessage } = useChats();

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

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // Reset edited data when exiting edit mode
      setEditedData(null);
    } else {
      // Initialize edited data with current user data
      if (userData) {
        const newEditedData: UserData = {
          name: userData.name,
          age: userData.age,
          pronouns: userData.pronouns,
          bio: userData.bio,
          profilePicture: userData.profilePicture,
          moodStatus: userData.moodStatus,
          languages: userData.languages,
          interests: userData.interests,
          goals: userData.goals,
          travelHistory: userData.travelHistory,
          createdAt: userData.createdAt
        };
        setEditedData(newEditedData);
      }
    }
    setIsEditMode(!isEditMode);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!editedData) return;
    
    try {
      const userDocRef = doc(db, "users", id);
      const updateData = {
        name: editedData.name,
        age: editedData.age,
        pronouns: editedData.pronouns,
        bio: editedData.bio,
        profilePicture: editedData.profilePicture,
        moodStatus: editedData.moodStatus,
        languages: editedData.languages,
        interests: editedData.interests,
        goals: editedData.goals,
        travelHistory: editedData.travelHistory,
        createdAt: editedData.createdAt
      };
      await updateDoc(userDocRef, updateData);
      setUserData(editedData);
      setIsEditMode(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string | string[]) => {
    setEditedData((prev: UserData | null) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value,
      };
    });
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
            setUserData(convertToUserData(userDoc.data()));
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

  // Handle profile picture upload
  const handleProfilePictureUpload = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        
        // Convert image to blob
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const storageRef = ref(storage, `profile_pictures/${id}`);
        await uploadBytes(storageRef, blob);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Update user data
        const userDocRef = doc(db, "users", id);
        await updateDoc(userDocRef, {
          profilePicture: downloadURL
        });

        // Update local state
        setUserData((prev: UserData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            profilePicture: downloadURL
          };
        });

        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle message starter selection
  const handleMessageStarter = async (message: string) => {
    if (!authUser) return;
    
    try {
      // Check if a chat already exists between these users
      const chatsCollection = collection(db, "chats");
      const q = query(
        chatsCollection, 
        where("participants", "array-contains", authUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      let existingChatId = null;
      
      // Check each chat to see if it contains both users
      for (const doc of querySnapshot.docs) {
        const chatData = doc.data();
        if (chatData.participants.includes(id)) {
          existingChatId = doc.id;
          break;
        }
      }
      
      let chatId;
      if (existingChatId) {
        chatId = existingChatId;
      } else {
        // Create a new chat if none exists
        const chatData = {
          participants: [authUser.uid, id],
          createdAt: new Date(),
          lastMessage: null,
        };
        
        const docRef = await addDoc(chatsCollection, chatData);
        chatId = docRef.id;
      }

      // Add the initial message
      await addMessage(chatId, {
        content: message,
        date: new Date(),
        sender: authUser.uid,
        receiver: id,
      });

      // Navigate to the chat
      router.push(`/chat/${chatId}`);
      setShowPrompts(false);
    } catch (error) {
      console.error("Error handling message starter:", error);
      Alert.alert("Error", "Failed to start chat. Please try again.");
    }
  };

  // Add type guard for editedData
  const isEditing = isEditMode && editedData !== null;

  if (authLoading || loading) {
    return <LoadingScreen message="Loading profile" />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
        <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          <View style={styles.container}>
            <Text style={styles.noDataText}>No user data found.</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <TopBar onProfilePress={() => {}} />

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
            {/* Profile Header with Depth */}
            <View style={styles.profileHeader}>
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={id === authUser?.uid ? handleProfilePictureUpload : undefined}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <View style={[styles.profileImage, styles.uploadingContainer]}>
                    <ActivityIndicator size="large" color="#e4fbfe" />
                  </View>
                ) : (
                  <Image
                    source={{ uri: userData.profilePicture || "https://via.placeholder.com/150" }}
                    style={styles.profileImage}
                  />
                )}
                {id === authUser?.uid && (
                  <View style={styles.editImageOverlay}>
                    <MaterialIcons name="camera-alt" size={24} color="#e4fbfe" />
                  </View>
                )}
                <View style={styles.statusIndicator} />
              </TouchableOpacity>
              {isEditing ? (
                <View style={styles.editInputContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={editedData!.name}
                    onChangeText={(value) => handleInputChange("name", value)}
                    placeholder="Name"
                    placeholderTextColor="#e4fbfe80"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editedData!.age}
                    onChangeText={(value) => handleInputChange("age", value)}
                    placeholder="Age"
                    placeholderTextColor="#e4fbfe80"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.editInput}
                    value={editedData!.pronouns || ''}
                    onChangeText={(value) => handleInputChange("pronouns", value)}
                    placeholder="Pronouns"
                    placeholderTextColor="#e4fbfe80"
                  />
                </View>
              ) : (
                <Text style={styles.nameText}>
                  {userData.name}, {userData.age}
                  <Text style={styles.pronounsText}>
                    {userData.pronouns && ` (${userData.pronouns})`}
                  </Text>
                </Text>
              )}
              <View style={styles.moodContainer}>
                <MaterialIcons name="mood" size={18} color="#e4fbfe" />
                {isEditing ? (
                  <TextInput
                    style={styles.moodInput}
                    value={editedData!.moodStatus}
                    onChangeText={(value) => handleInputChange("moodStatus", value)}
                    placeholder="How are you feeling?"
                    placeholderTextColor="#e4fbfe80"
                  />
                ) : (
                  <Text style={styles.moodText}>{userData.moodStatus}</Text>
                )}
              </View>
            </View>

            {/* Profile Sections with Microinteractions */}
            <View style={styles.sectionsContainer}>
              {isEditing ? (
                <View style={[styles.card, styles.aboutCard]}>
                  <TextInput
                    style={styles.bioInput}
                    value={editedData!.bio || ''}
                    onChangeText={(value) => handleInputChange("bio", value)}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#e4fbfe80"
                    multiline
                    numberOfLines={4}
                  />
                </View>
              ) : (
                <ProfileSection
                  icon="info"
                  title="About"
                  content={userData.bio}
                  cardStyle={styles.aboutCard}
                />
              )}

              <View style={styles.gridContainer}>
                {isEditing ? (
                  <>
                    <View style={[styles.card, styles.gridCard]}>
                      <TextInput
                        style={styles.editInput}
                        value={editedData!.languages.join(", ")}
                        onChangeText={(value) => handleInputChange("languages", value.split(", "))}
                        placeholder="Languages (comma separated)"
                        placeholderTextColor="#e4fbfe80"
                      />
                    </View>
                    <View style={[styles.card, styles.gridCard]}>
                      <TextInput
                        style={styles.editInput}
                        value={editedData!.interests.join(", ")}
                        onChangeText={(value) => handleInputChange("interests", value.split(", "))}
                        placeholder="Interests (comma separated)"
                        placeholderTextColor="#e4fbfe80"
                      />
                    </View>
                    <View style={[styles.card, styles.gridCard]}>
                      <TextInput
                        style={styles.editInput}
                        value={editedData!.goals.join(", ")}
                        onChangeText={(value) => handleInputChange("goals", value.split(", "))}
                        placeholder="Goals (comma separated)"
                        placeholderTextColor="#e4fbfe80"
                      />
                    </View>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </View>

              {/* Trip Galleries with Conditional Rendering */}
              {userData.travelHistory && Array.isArray(userData.travelHistory) && userData.travelHistory.length > 1 ? (
                userData.travelHistory.map((trip: any, index: number) => (
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
                <MaterialIcons name="verified" size={14} color="#e4fbfe" /> Joined{" "}
                {new Date(userData.createdAt?.toDate()).toLocaleDateString()}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Floating Action Container */}
        {id === authUser?.uid ? (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.editFab}
              activeOpacity={0.9}
              onPress={toggleEditMode}
            >
              <MaterialIcons name={isEditing ? "save" : "edit"} size={24} color="#e4fbfe" />
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity
                style={[styles.editFab, { marginTop: 16 }]}
                activeOpacity={0.9}
                onPress={handleSaveChanges}
              >
                <MaterialIcons name="check" size={24} color="#e4fbfe" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.fab}
              activeOpacity={0.9}
              onPress={togglePrompts}
            >
              <LinearGradient
                colors={["#070707", "#38a5c9"]}
                style={styles.fabGradient}
              >
                <MaterialIcons name="chat" size={24} color="#e4fbfe" />
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
                      onPress={() => handleMessageStarter(prompt)}
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
    <MaterialIcons name={icon} size={20} color="#e4fbfe" style={styles.cardIcon} />
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardContent}>{content}</Text>
  </TouchableOpacity>
);

const TripGallery = ({ trip, onPhotoPress }: { trip: any; onPhotoPress: (photos: string[], index: number) => void }) => (
  <View style={styles.tripContainer}>
    <Text style={styles.tripTitle}>{trip.name}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tripScrollContent}
    >
      {trip.photos.map((photo: string, index: number) => (
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
    marginBottom: -20,
  },
  gradient: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.5,
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
    borderColor: "rgba(228, 251, 254, 0.1)",
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
    borderColor: "#38a5c9",
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
    borderColor: "#070707",
  },
  nameText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  pronounsText: {
    fontSize: 16,
    color: "#e4fbfe",
    fontWeight: "400",
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(228, 251, 254, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  moodText: {
    fontSize: 14,
    color: "#ffffff",
    marginLeft: 8,
    fontWeight: "500",
  },
  sectionsContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#38a5c9",
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
    color: "#e4fbfe",
    marginBottom: 8,
  },
  cardContent: {
    fontSize: 14,
    color: "#38a5c9",
    lineHeight: 22,
  },
  metaContainer: {
    marginTop: 32,
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#e4fbfe",
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
    shadowColor: "#070707",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  promptSheet: {
    position: "absolute",
    bottom: 72,
    right: 0,
    backgroundColor: "#1a1a1a",
    borderRadius: 28,
    padding: 20,
    width: 240,
    borderWidth: 1,
    borderColor: "#38a5c9",
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 101,
  },
  promptTitle: {
    fontSize: 13,
    color: "#e4fbfe",
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  promptGrid: {
    gap: 12,
  },
  promptChip: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  promptText: {
    fontSize: 14,
    color: "#e4fbfe",
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
    color: "#ffffff",
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
    color: "#ffffff",
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
    backgroundColor: "rgba(228, 251, 254, 0.1)",
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginLeft: -20,
    marginRight: 20,
  },
  editInputContainer: {
    width: "100%",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
    color: "#e4fbfe",
    width: "100%",
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  moodInput: {
    flex: 1,
    color: "#e4fbfe",
    marginLeft: 8,
    fontSize: 14,
  },
  bioInput: {
    color: "#e4fbfe",
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: "top",
    minHeight: 100,
  },
  editFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 30,
  },
  uploadingContainer: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
});

export default Profile;