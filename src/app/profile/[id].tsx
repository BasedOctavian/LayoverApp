import React, { useEffect, useState, useRef } from "react";
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
  Linking,
  Modal,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc, arrayUnion, deleteDoc, arrayRemove, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../../config/firebaseConfig";
import { db } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import { useLocalSearchParams, useRouter as useExpoRouter, useFocusEffect } from "expo-router";
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
import { ThemeContext } from "../../context/ThemeContext";
import useNotificationCount from "../../hooks/useNotificationCount";

interface UserData {
  name: string;
  dateOfBirth?: Date;
  age?: string;
  pronouns?: string;
  bio?: string;
  profilePicture?: string;
  moodStatus?: string;
  languages: string[];
  interests: string[];
  goals: string[];
  travelHistory?: any[];
  createdAt?: any;
  socialMedia?: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

// Helper function to convert Firestore data to UserData
const convertToUserData = (data: DocumentData): UserData => {
  // Calculate age from dateOfBirth if it exists
  let age = '';
  if (data.dateOfBirth) {
    const birthDate = data.dateOfBirth.toDate();
    const today = new Date();
    const ageInMilliseconds = today.getTime() - birthDate.getTime();
    const ageInYears = Math.floor(ageInMilliseconds / (365.25 * 24 * 60 * 60 * 1000));
    age = ageInYears.toString();
  }

  return {
    name: data.name || '',
    dateOfBirth: data.dateOfBirth?.toDate(),
    age: age,
    pronouns: data.pronouns,
    bio: data.bio,
    profilePicture: data.profilePicture,
    moodStatus: data.moodStatus,
    languages: data.languages || [],
    interests: data.interests || [],
    goals: data.goals || [],
    travelHistory: data.travelHistory,
    createdAt: data.createdAt,
    socialMedia: data.socialMedia || {}
  };
};

const ADMIN_IDS = ['hDn74gYZCdZu0efr3jMGTIWGrRQ2', 'WhNhj8WPUpbomevJQ7j69rnLbDp2'];

const sendPushNotification = async (expoPushToken: string, reportedUserName: string) => {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: expoPushToken,
        title: 'New User Report',
        body: `User ${reportedUserName} has been reported`,
        sound: 'default',
        priority: 'high',
        data: { 
          type: 'user_report',
          timestamp: new Date().toISOString()
        },
      }),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

const notifyAdmins = async (reportedUserName: string) => {
  try {
    // Get push tokens for admin users
    const adminTokens = await Promise.all(
      ADMIN_IDS.map(async (adminId) => {
        const adminDoc = await getDoc(doc(db, 'users', adminId));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          return adminData.expoPushToken;
        }
        return null;
      })
    );

    // Send notifications to admins with valid push tokens
    const notificationPromises = adminTokens
      .filter(token => token) // Filter out null tokens
      .map(token => sendPushNotification(token!, reportedUserName));

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

const Profile = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<"connected" | "pending" | "not_connected">("not_connected");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const headerFadeAnim = useState(new Animated.Value(0))[0];
  const sectionsFadeAnim = useState(new Animated.Value(0))[0];
  const socialFadeAnim = useState(new Animated.Value(0))[0];
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
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const [uploadingImage, setUploadingImage] = useState(false);
  const { addChat, addMessage, getExistingChat } = useChats();
  const scaleAnim = useState(new Animated.Value(0.95))[0];
  const cardScaleAnim = useState(new Animated.Value(0.98))[0];
  const [activeTab, setActiveTab] = useState('about');
  const [isScrolled, setIsScrolled] = useState(false);
  const tabFadeAnim = useState(new Animated.Value(1))[0];
  const tabScaleAnim = useState(new Animated.Value(1))[0];
  const { theme } = React.useContext(ThemeContext);
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(1)).current;
  const loadingRotationAnim = useRef(new Animated.Value(0)).current;

  // Add dynamic font size calculation
  const getDynamicFontSize = (text: string, baseSize: number = 12) => {
    const connectionCount = connections.length;
    const textLength = text.length;
    
    // For connection count-based sizing
    if (connectionCount >= 1000) return baseSize - 6; // 6px
    if (connectionCount >= 500) return baseSize - 5;  // 7px
    if (connectionCount >= 100) return baseSize - 4;  // 8px
    if (connectionCount >= 50) return baseSize - 3;   // 9px
    if (connectionCount >= 20) return baseSize - 2;   // 10px
    if (connectionCount >= 10) return baseSize - 1;   // 11px
    
    // For text length-based sizing (for connect button states)
    if (textLength >= 10) return baseSize - 2; // "Connecting..." = 12 chars
    if (textLength >= 9) return baseSize - 1;  // "Connected" = 9 chars
    
    return baseSize; // 12px
  };

  const dynamicFontSize = getDynamicFontSize(`${connections.length} ${connections.length === 1 ? 'Connection' : 'Connections'}`);

  // Get notification count
  const notificationCount = useNotificationCount(userId);

  // Define TripGallery component inside Profile
  const TripGallery = ({ trip, onPhotoPress, theme }: { 
    trip: any; 
    onPhotoPress: (photos: string[], index: number) => void; 
    theme: "light" | "dark" 
  }) => {
    // Handle case where trip is just a string (country name)
    if (typeof trip === 'string') {
      return null; // Don't show anything for string-only entries
    }

    // Handle case where trip is a full object with photos
    return (
      <View style={styles.tripContainer}>
        <Text style={[styles.tripTitle, { color: theme === "light" ? "#000000" : "#ffffff" }]}>{trip.name}</Text>
        {trip.photos && trip.photos.length > 0 ? (
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
        ) : null}
      </View>
    );
  };

  // Interpolate colors for smooth transitions
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f8f9fa', '#000000'],
    extrapolate: 'clamp'
  });

  const textColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0F172A', '#ffffff'],
    extrapolate: 'clamp'
  });

  const secondaryTextColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#666666', '#999999'],
    extrapolate: 'clamp'
  });

  // Add focus effect to refresh data
  useFocusEffect(
    React.useCallback(() => {
      if (userId && id) {
        setLoading(true);
        fetchUserData();
      }
    }, [userId, id])
  );

  // Add scroll handler
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 20);
  };

  // Add skeleton animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Enhanced fetch with animations
  const fetchUserData = async () => {
    if (userId && id) {
      setIsLoadingProfile(true);
      setIsLoadingContent(true);
      try {
        const userDocRef = doc(db, "users", id);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(convertToUserData(userDoc.data()));
          // Enhanced animation sequence
          Animated.parallel([
            Animated.sequence([
              Animated.timing(headerFadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
              }),
            ]),
            Animated.sequence([
              Animated.timing(sectionsFadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.spring(cardScaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(socialFadeAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setIsLoadingProfile(false);
            // Add a slight delay before showing content
            setTimeout(() => {
              setIsLoadingContent(false);
            }, 300);
          });
        } else {
          setError("No user data found.");
        }
      } catch (error) {
        setError("Failed to fetch user data.");
        console.error(error);
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingContent(false);
      }
    }
  };

  // Remove the old useEffect that was calling fetchUserData
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

  // Initial data fetch
  useEffect(() => {
    if (userId && id) {
      fetchUserData();
    }
  }, [userId, id]);

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
          dateOfBirth: userData.dateOfBirth,
          age: userData.age,
          pronouns: userData.pronouns,
          bio: userData.bio,
          profilePicture: userData.profilePicture,
          moodStatus: userData.moodStatus,
          languages: userData.languages,
          interests: userData.interests,
          goals: userData.goals,
          travelHistory: userData.travelHistory,
          createdAt: userData.createdAt,
          socialMedia: userData.socialMedia || {}
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
        dateOfBirth: editedData.dateOfBirth,
        age: editedData.age,
        pronouns: editedData.pronouns,
        bio: editedData.bio,
        profilePicture: editedData.profilePicture,
        moodStatus: editedData.moodStatus,
        languages: editedData.languages,
        interests: editedData.interests,
        goals: editedData.goals,
        travelHistory: editedData.travelHistory,
        socialMedia: editedData.socialMedia || {},
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
      const existingChat = await getExistingChat(authUser.uid, id);
      let chatId;
      
      if (existingChat) {
        chatId = existingChat.id;
      } else {
        // Create a new chat if none exists
        const chatData = {
          participants: [authUser.uid, id],
          createdAt: new Date(),
          lastMessage: null,
        };
        
        chatId = await addChat(chatData);
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

  // Add tab change handler with animation
  const handleTabChange = (tab: string) => {
    // Animate out
    Animated.parallel([
      Animated.timing(tabFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(tabScaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveTab(tab);
      // Animate in
      Animated.parallel([
        Animated.timing(tabFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(tabScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  // Add render content based on active tab
  const renderTabContent = () => {
    if (!userData) return null;

    switch (activeTab) {
      case 'about':
        return (
          <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
            <View style={[styles.card, styles.aboutCard, { 
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
              shadowOpacity: theme === "light" ? 0.2 : 0.1,
            }]}>
              <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>About</Text>
              <Text style={[styles.cardContent, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{userData.bio || "No bio provided"}</Text>
            </View>
            <View style={[styles.card, styles.languagesCard, { 
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
              shadowOpacity: theme === "light" ? 0.2 : 0.1,
            }]}>
              <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Languages</Text>
              <View style={styles.tagsContainer}>
                {userData.languages.map((language, index) => (
                  <View key={index} style={[styles.tag, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                    shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                    shadowOpacity: theme === "light" ? 0.1 : 0,
                  }]}>
                    <Text style={[styles.tagText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{language}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        );
      case 'interests':
        return (
          <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
            <View style={[styles.card, styles.interestsCard, { 
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
              shadowOpacity: theme === "light" ? 0.2 : 0.1,
            }]}>
              <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Interests</Text>
              <View style={styles.tagsContainer}>
                {userData.interests.map((interest, index) => (
                  <View key={index} style={[styles.tag, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                    shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                    shadowOpacity: theme === "light" ? 0.1 : 0,
                  }]}>
                    <Text style={[styles.tagText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.card, styles.goalsCard, { 
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
              shadowOpacity: theme === "light" ? 0.2 : 0.1,
            }]}>
              <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Goals</Text>
              <View style={styles.tagsContainer}>
                {userData.goals.map((goal, index) => (
                  <View key={index} style={[styles.tag, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                    shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                    shadowOpacity: theme === "light" ? 0.1 : 0,
                  }]}>
                    <Text style={[styles.tagText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{goal}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Travel History Section */}
            {userData.travelHistory && Array.isArray(userData.travelHistory) && userData.travelHistory.length > 0 && (
              <View style={[styles.card, styles.travelHistoryCard, { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
                shadowOpacity: theme === "light" ? 0.2 : 0.1,
              }]}>
                <Text style={[styles.cardTitle, { color: theme === "light" ? "#000000" : "#ffffff" }]}>Travel History</Text>
                <View style={styles.tagsContainer}>
                  {userData.travelHistory.map((country, index) => {
                    // Handle both string and object formats
                    const countryName = typeof country === 'string' ? country : country?.name || 'Unknown';
                    return (
                      <View key={index} style={[styles.tag, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                        shadowOpacity: theme === "light" ? 0.1 : 0,
                      }]}>
                        <Text style={[styles.tagText, { color: theme === "light" ? "#333333" : "#ffffff" }]}>{countryName}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </Animated.View>
        );
      case 'social':
        return (
          <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
            {userData.socialMedia && Object.keys(userData.socialMedia).length > 0 ? (
              <View style={[styles.card, styles.socialMediaCard, { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
                shadowOpacity: theme === "light" ? 0.2 : 0.1,
              }]}>
                <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Social Media</Text>
                <View style={styles.socialMediaLinks}>
                  {userData.socialMedia?.instagram && (
                    <TouchableOpacity 
                      style={[styles.socialLink, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                        shadowOpacity: theme === "light" ? 0.1 : 0,
                      }]}
                      onPress={() => Linking.openURL(`https://instagram.com/${userData.socialMedia?.instagram}`)}
                    >
                      <MaterialIcons name="photo-camera" size={24} color={theme === "light" ? "#0F172A" : "#ffffff"} />
                      <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>@{userData.socialMedia.instagram}</Text>
                    </TouchableOpacity>
                  )}
                  {userData.socialMedia?.linkedin && (
                    <TouchableOpacity 
                      style={[styles.socialLink, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.15)",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.4)" : "#37a4c8",
                        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                        shadowOpacity: theme === "light" ? 0.15 : 0,
                      }]}
                      onPress={() => userData.socialMedia?.linkedin && Linking.openURL(userData.socialMedia.linkedin)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="work" size={24} color={theme === "light" ? "#0F172A" : "#ffffff"} />
                      <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>LinkedIn Profile</Text>
                    </TouchableOpacity>
                  )}
                  {userData.socialMedia?.twitter && (
                    <TouchableOpacity 
                      style={[styles.socialLink, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.15)",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.4)" : "#37a4c8",
                        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
                        shadowOpacity: theme === "light" ? 0.15 : 0,
                      }]}
                      onPress={() => Linking.openURL(`https://twitter.com/${userData.socialMedia?.twitter}`)}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="chat" size={24} color={theme === "light" ? "#0F172A" : "#ffffff"} />
                      <Text style={[styles.socialLinkText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>@{userData.socialMedia.twitter}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={[styles.card, styles.socialMediaCard, { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
                shadowOpacity: theme === "light" ? 0.2 : 0.1,
              }]}>
                <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Social Media</Text>
                <Text style={[styles.noContentText, { color: theme === "light" ? "#666666" : "#999999" }]}>No social media links provided</Text>
              </View>
            )}
          </Animated.View>
        );
      case 'connections':
        return (
          <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
            {loadingConnections ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#37a4c8" />
              </View>
            ) : connections.length > 0 ? (
              <View style={styles.connectionsContainer}>
                {connections.map((connection) => (
                  <TouchableOpacity
                    key={connection.id}
                    style={[styles.connectionCard, { 
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                      shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
                      shadowOpacity: theme === "light" ? 0.2 : 0.1,
                    }]}
                    onPress={() => router.push(`/chat/${connection.id}`)}
                  >
                    <Image
                      source={{ uri: connection.otherUser.profilePicture || "https://via.placeholder.com/150" }}
                      style={styles.connectionAvatar}
                    />
                    <View style={styles.connectionInfo}>
                      <Text style={[styles.connectionName, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
                        {connection.otherUser.name}
                      </Text>
                      <Text style={[styles.connectionType, { color: theme === "light" ? "#666666" : "#999999" }]}>
                        {connection.connectionType || "Local Experiences"}
                      </Text>
                      <Text style={[styles.connectionDate, { color: theme === "light" ? "#666666" : "#999999" }]}>
                        Connected {connection.createdAt?.toDate().toLocaleDateString()}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={theme === "light" ? "#666666" : "#999999"} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.noConnectionsContainer, { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              }]}>
                <MaterialIcons name="people" size={48} color={theme === "light" ? "#666666" : "#999999"} />
                <Text style={[styles.noConnectionsText, { color: theme === "light" ? "#666666" : "#999999" }]}>
                  No active connections yet
                </Text>
              </View>
            )}
          </Animated.View>
        );
      default:
        return null;
    }
  };

  // Add Skeleton Loading Component
  const SkeletonLoader = () => (
    <Animated.View style={[
      styles.skeletonContainer,
      {
        opacity: skeletonAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 0.7],
        }),
      },
    ]}>
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonAvatar} />
        <View style={styles.skeletonName} />
        <View style={styles.skeletonMood} />
      </View>
      <View style={styles.skeletonTabs} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonCard} />
        <View style={styles.skeletonCard} />
      </View>
    </Animated.View>
  );

  // Add connection status check
  const checkConnectionStatus = async () => {
    if (!authUser || !id) return;
    
    try {
      // Check connections collection for any existing connection
      const connectionsRef = collection(db, "connections");
      const q = query(
        connectionsRef,
        where("participants", "array-contains", authUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      // Check if there's a connection between these users
      const existingConnection = querySnapshot.docs.find(doc => {
        const data = doc.data();
        return data.participants.includes(id);
      });

      if (existingConnection) {
        const connectionData = existingConnection.data();
        if (connectionData.status === "active") {
          setIsConnected("connected");
        } else if (connectionData.status === "pending") {
          setIsConnected("pending");
        } else {
          setIsConnected("not_connected");
        }
      } else {
        setIsConnected("not_connected");
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
      setIsConnected("not_connected");
    }
  };

  // Add loading animation function
  const startLoadingAnimation = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonOpacityAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.timing(loadingRotationAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  };

  // Add stop loading animation function
  const stopLoadingAnimation = () => {
    Animated.parallel([
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacityAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    loadingRotationAnim.setValue(0);
  };

  // Update handleConnect to use animations
  const handleConnect = async () => {
    if (!authUser || !id || isProcessing) return;
    setIsProcessing(true);
    startLoadingAnimation();

    try {
      console.log('Starting connection process for user:', id);
      
      // Get current user data for the notification
      const currentUserRef = doc(db, 'users', authUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.data();
      
      // Create a new connection document with exact structure matching chatExplore
      const connectionData = {
        connectionType: null,
        createdAt: new Date(),
        initiator: authUser.uid,
        lastMessage: null,
        participants: [authUser.uid, id],
        status: 'pending'
      };
      
      console.log('Creating connection document with data:', connectionData);
      // Create ONLY the connection document
      await addDoc(collection(db, 'connections'), connectionData);
      
      // Get current user document to check if likedUsers exists
      const userRef = doc(db, 'users', authUser.uid);
      console.log('Fetching user document for:', authUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      console.log('Current user data:', userData);
      console.log('Current likedUsers array:', userData?.likedUsers);
      
      // Remove from dislikedUsers if present
      const currentDislikedUsers = userData?.dislikedUsers || [];
      if (currentDislikedUsers.includes(id)) {
        console.log('Removing user from dislikedUsers array:', id);
        await updateDoc(userRef, {
          dislikedUsers: arrayRemove(id)
        });
      }
      
      // Always create/update the likedUsers array
      const currentLikedUsers = userData?.likedUsers || [];
      if (!currentLikedUsers.includes(id)) {
        console.log('Adding user to likedUsers array:', id);
        await updateDoc(userRef, {
          likedUsers: [...currentLikedUsers, id]
        });
      }

      // Create notification for the target user
      const targetUserRef = doc(db, 'users', id);
      const targetUserDoc = await getDoc(targetUserRef);
      const targetUserData = targetUserDoc.data();
      
      const notification = {
        id: Date.now().toString(),
        title: "New Connection Request",
        body: `${userData?.name || 'Someone'} wants to connect with you!`,
        data: {
          type: 'match',
          matchedUserId: authUser.uid,
          matchedUserName: userData?.name
        },
        timestamp: new Date(),
        read: false
      };

      // Add notification to target user's notifications array
      const targetNotifications = targetUserData?.notifications || [];
      await updateDoc(targetUserRef, {
        notifications: [...targetNotifications, notification]
      });

      // Send push notification if target user has token and notifications enabled
      if (targetUserData?.expoPushToken && 
          targetUserData?.notificationPreferences?.notificationsEnabled && 
          targetUserData?.notificationPreferences?.connections) {
        
        console.log('📱 Push notification conditions met:', {
          hasToken: true,
          token: targetUserData.expoPushToken,
          notificationsEnabled: true,
          connectionsEnabled: true
        });

        try {
          const pushPayload = {
            to: targetUserData.expoPushToken,
            title: "New Connection Request",
            body: `${userData?.name || 'Someone'} wants to connect with you!`,
            sound: 'default',
            priority: 'high',
            data: {
              type: 'match',
              matchedUserId: authUser.uid,
              matchedUserName: userData?.name
            },
          };

          console.log('📦 Push notification payload:', pushPayload);

          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify(pushPayload),
          });

          const responseData = await response.json();
          
          if (!response.ok) {
            console.error('❌ Push notification failed:', {
              status: response.status,
              statusText: response.statusText,
              data: responseData,
              requestPayload: pushPayload
            });
          } else {
            console.log('✅ Push notification sent successfully:', {
              responseData,
              receiverId: id,
              senderName: userData?.name
            });
          }
        } catch (error: any) {
          console.error('❌ Error sending push notification:', {
            error,
            errorMessage: error.message,
            errorStack: error.stack,
            receiverId: id,
            token: targetUserData.expoPushToken,
            senderName: userData?.name
          });
        }
      } else {
        console.log('ℹ️ Push notification not sent. Reason:', {
          hasToken: !!targetUserData?.expoPushToken,
          token: targetUserData?.expoPushToken,
          notificationsEnabled: targetUserData?.notificationPreferences?.notificationsEnabled,
          connectionsEnabled: targetUserData?.notificationPreferences?.connections,
          receiverId: id,
          receiverName: targetUserData?.name,
          fullPreferences: targetUserData?.notificationPreferences
        });
      }
      
      // Verify the update
      const updatedUserDoc = await getDoc(userRef);
      const updatedUserData = updatedUserDoc.data();
      console.log('Updated user data:', updatedUserData);
      console.log('Updated likedUsers array:', updatedUserData?.likedUsers);
      
      setIsConnected("pending");
    } catch (error) {
      console.error("Error creating connection:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
      Alert.alert("Error", "Failed to create connection. Please try again.");
    } finally {
      setIsProcessing(false);
      stopLoadingAnimation();
    }
  };

  // Add connection removal handler
  const handleRemoveConnection = async () => {
    if (!authUser || !id || isProcessing) return;
    setIsProcessing(true);

    try {
      // Show confirmation dialog
      Alert.alert(
        "Remove Connection",
        "Are you sure you want to remove this connection?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              try {
                console.log('Starting connection removal process for user:', id);
                
                // Find and delete the connection document
                const connectionsRef = collection(db, "connections");
                const q = query(
                  connectionsRef,
                  where("participants", "array-contains", authUser.uid)
                );
                const querySnapshot = await getDocs(q);
                
                let connectionId = null;
                for (const doc of querySnapshot.docs) {
                  const data = doc.data();
                  if (data.participants.includes(id)) {
                    connectionId = doc.id;
                    console.log('Found connection document to delete:', connectionId);
                    await deleteDoc(doc.ref);
                    break;
                  }
                }

                // If we found a connection, also delete associated chat
                if (connectionId) {
                  console.log('Deleting associated chat documents for connection:', connectionId);
                  const chatsRef = collection(db, "chats");
                  const chatsQuery = query(
                    chatsRef,
                    where("connectionId", "==", connectionId)
                  );
                  const chatsSnapshot = await getDocs(chatsQuery);
                  
                  for (const chatDoc of chatsSnapshot.docs) {
                    await deleteDoc(chatDoc.ref);
                  }
                }

                // Get current user document to check if likedUsers exists
                const userRef = doc(db, 'users', authUser.uid);
                console.log('Fetching user document for removal:', authUser.uid);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.data();
                
                console.log('Current user data before removal:', userData);
                console.log('Current likedUsers array before removal:', userData?.likedUsers);
                
                // Only attempt to remove from likedUsers if the array exists
                if (userData?.likedUsers) {
                  console.log('Removing user from likedUsers array:', id);
                  await updateDoc(userRef, {
                    likedUsers: arrayRemove(id)
                  });
                }

                // Remove the notification from target user's document
                const targetUserRef = doc(db, 'users', id);
                const targetUserDoc = await getDoc(targetUserRef);
                const targetUserData = targetUserDoc.data();
                
                if (targetUserData?.notifications) {
                  console.log('Removing notification from target user');
                  const updatedNotifications = targetUserData.notifications.filter(
                    (notification: any) => 
                      !(notification.data?.type === 'match' && 
                        notification.data?.matchedUserId === authUser.uid)
                  );
                  
                  await updateDoc(targetUserRef, {
                    notifications: updatedNotifications
                  });
                }

                setIsConnected("not_connected");
              } catch (error) {
                console.error("Error removing connection:", error);
                if (error instanceof Error) {
                  console.error("Error details:", error.message);
                  console.error("Error stack:", error.stack);
                }
                Alert.alert("Error", "Failed to remove connection. Please try again.");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error in remove confirmation:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Add useEffect to check connection status
  useEffect(() => {
    if (authUser && id) {
      checkConnectionStatus();
    }
  }, [authUser, id]);

  // Add fetchConnections function
  const fetchConnections = async () => {
    if (!id) return;
    setLoadingConnections(true);
    try {
      const connectionsRef = collection(db, "connections");
      const q = query(
        connectionsRef,
        where("participants", "array-contains", id),
        where("status", "==", "active")
      );
      const querySnapshot = await getDocs(q);
      const connectionsData = await Promise.all(
        querySnapshot.docs.map(async (connectionDoc) => {
          const data = connectionDoc.data();
          const otherUserId = data.participants.find((participantId: string) => participantId !== id);
          if (otherUserId) {
            const userRef = doc(db, "users", otherUserId);
            const userSnapshot = await getDoc(userRef);
            const userData = userSnapshot.data();
            return {
              id: connectionDoc.id,
              ...data,
              otherUser: {
                id: otherUserId,
                name: userData?.name || 'Unknown User',
                profilePicture: userData?.profilePicture || "https://via.placeholder.com/150"
              }
            };
          }
          return null;
        })
      );
      setConnections(connectionsData.filter(Boolean));
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Update the useEffect for fetching connections
  useEffect(() => {
    if (id) {
      fetchConnections();
    }
  }, [id]);

  // Add modal animation function
  const animateModal = (show: boolean) => {
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: show ? 1 : 0.9,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Update modal visibility handler
  const handleModalVisibility = (show: boolean) => {
    setShowConnectionsModal(show);
    animateModal(show);
  };

  // Update the report handler
  const handleReport = () => {
    Alert.alert(
      "Report User",
      "Are you sure you want to report this user?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              const reportData = {
                reportedBy: user?.uid,
                reportedByUserName: userData?.name || 'Unknown User',
                reportedUserId: id,
                reportedUserName: userData?.name || 'Unknown User',
                reportedUserProfile: {
                  age: userData?.age,
                  bio: userData?.bio,
                  createdAt: userData?.createdAt,
                  goals: userData?.goals,
                  interests: userData?.interests,
                  languages: userData?.languages,
                  name: userData?.name
                },
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
                status: 'pending',
                type: 'user_report',
                reviewDate: null,
                reviewNotes: null,
                reviewedBy: null
              };

              await addDoc(collection(db, 'reports'), reportData);
              
              // Notify admins about the report
              await notifyAdmins(userData?.name || 'Unknown User');

              Alert.alert(
                "Report Submitted",
                "Thank you for your report. Our team will review it shortly.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("Error submitting report:", error);
              Alert.alert(
                "Error",
                "Failed to submit report. Please try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  // Add block handler
  const handleBlock = () => {
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? You won't be able to see their profile or receive messages from them.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              if (!authUser || !id) return;

              // Update authUser's document with blocked user
              const authUserRef = doc(db, "users", authUser.uid);
              await updateDoc(authUserRef, {
                blockedUsers: arrayUnion(id)
              });

              // Update blocked user's document with hasMeBlocked
              const blockedUserRef = doc(db, "users", id);
              await updateDoc(blockedUserRef, {
                hasMeBlocked: arrayUnion(authUser.uid)
              });

              Alert.alert(
                "User Blocked",
                "You have successfully blocked this user.",
                [{ 
                  text: "OK",
                  onPress: () => router.back()
                }]
              );
            } catch (error) {
              console.error("Error blocking user:", error);
              Alert.alert(
                "Error",
                "Failed to block user. Please try again later.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  if (authLoading || isLoadingProfile) {
    return (
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <LinearGradient 
          colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} 
          style={styles.flex}
        >
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <SkeletonLoader />
        </LinearGradient>
      </SafeAreaView>
    );
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
      <LinearGradient 
        colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} 
        style={styles.flex}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <Animated.View style={[
          styles.topBarContainer,
          {
            backgroundColor: isScrolled ? (theme === "light" ? 'rgba(248, 249, 250, 0.95)' : 'rgba(26, 26, 26, 0.95)') : 'transparent',
            borderBottomWidth: isScrolled ? 1 : 0,
            borderBottomColor: "#37a4c8",
          }
        ]}>
          <TopBar onProfilePress={() => router.push(`/profile/${authUser?.uid}`)} notificationCount={notificationCount} />
        </Animated.View>

        {isLoadingContent ? (
          <SkeletonLoader />
        ) : (
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {/* Profile Header with Enhanced Fade */}
            <Animated.View 
              style={[
                styles.profileHeader, 
                { 
                  opacity: headerFadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.avatarContainer}
                onPress={id === authUser?.uid ? handleProfilePictureUpload : undefined}
                disabled={uploadingImage}
                activeOpacity={0.8}
              >
                {uploadingImage ? (
                  <View style={[styles.profileImage, styles.uploadingContainer]}>
                    <ActivityIndicator size="large" color={theme === "light" ? "#000000" : "#ffffff"} />
                  </View>
                ) : (
                  <Image
                    source={{ uri: userData?.profilePicture || "https://via.placeholder.com/150" }}
                    style={[styles.profileImage, { borderColor: "#37a4c8" }]}
                  />
                )}
                {id === authUser?.uid && (
                  <Animated.View 
                    style={[
                      styles.editImageOverlay,
                      {
                        opacity: headerFadeAnim,
                        transform: [{ scale: scaleAnim }],
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderColor: "#37a4c8",
                      }
                    ]}
                  >
                    <MaterialIcons name="camera-alt" size={24} color="#ffffff" />
                  </Animated.View>
                )}
                <View style={[styles.statusIndicator, { borderColor: theme === "light" ? "#e6e6e6" : "#000000" }]} />
              </TouchableOpacity>

              <Animated.View 
                style={[
                  styles.nameContainer,
                  {
                    opacity: headerFadeAnim,
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
              >
                <View style={styles.nameRow}>
                  <Animated.Text style={[styles.nameText, { color: textColor }]}>
                    {userData?.name}
                    <Animated.Text style={[styles.pronounsText, { color: secondaryTextColor }]}>
                      {userData?.pronouns && ` (${userData.pronouns})`}
                    </Animated.Text>
                  </Animated.Text>
                </View>
                
                {/* Subtle visual separator */}
                <Animated.View 
                  style={[
                    styles.nameSeparator, 
                    { 
                      marginBottom: 20,
                      marginTop: 4,
                      opacity: headerFadeAnim,
                      transform: [{ scale: scaleAnim }]
                    }
                  ]} 
                >
                  <LinearGradient
                    colors={theme === "light" 
                      ? ["rgba(55, 164, 200, 0.1)", "rgba(55, 164, 200, 0.3)", "rgba(55, 164, 200, 0.1)"]
                      : ["rgba(55, 164, 200, 0.2)", "rgba(55, 164, 200, 0.4)", "rgba(55, 164, 200, 0.2)"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.separatorGradient}
                  />
                </Animated.View>
                
                <View style={styles.badgeContainer}>
                  <TouchableOpacity 
                    style={[styles.statusButton, { 
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
                      borderColor: "#37a4c8"
                    }]}
                    onPress={() => handleModalVisibility(true)}
                  >
                    <MaterialIcons name="people" size={16} color="#37a4c8" />
                    <Text style={[styles.statusButtonText, { 
                      color: "#37a4c8",
                      fontSize: dynamicFontSize
                    }]}>
                      {connections.length} {connections.length === 1 ? 'Connection' : 'Connections'}
                    </Text>
                  </TouchableOpacity>
                  {id !== authUser?.uid && (
                    <Animated.View style={{
                      transform: [{ scale: buttonScaleAnim }],
                      opacity: buttonOpacityAnim,
                    }}>
                      <TouchableOpacity 
                        onPress={isConnected === "not_connected" ? handleConnect : handleRemoveConnection}
                        disabled={isProcessing}
                        style={[
                          styles.statusButton,
                          {
                            backgroundColor: isConnected === "connected" 
                              ? (theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(55, 164, 200, 0.25)")
                              : isConnected === "pending"
                              ? (theme === "light" ? "rgba(255, 149, 0, 0.15)" : "rgba(255, 149, 0, 0.25)")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(55, 164, 200, 0.25)"),
                            borderColor: isConnected === "connected" 
                              ? "#37a4c8" 
                              : isConnected === "pending"
                              ? "#FF9500"
                              : "#37a4c8",
                          }
                        ]}
                        activeOpacity={0.8}
                      >
                        {isProcessing ? (
                          <Animated.View style={{
                            transform: [{
                              rotate: loadingRotationAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0deg', '360deg']
                              })
                            }]
                          }}>
                            <MaterialIcons 
                              name="sync" 
                              size={20} 
                              color={isConnected === "connected" 
                                ? "#37a4c8" 
                                : isConnected === "pending"
                                ? "#FF9500"
                                : "#37a4c8"} 
                            />
                          </Animated.View>
                        ) : (
                          <MaterialIcons 
                            name={isConnected === "connected" 
                              ? "people" 
                              : isConnected === "pending"
                              ? "hourglass-empty"
                              : "person-add"} 
                            size={20} 
                            color={isConnected === "connected" 
                              ? "#37a4c8" 
                              : isConnected === "pending"
                              ? "#FF9500"
                              : "#37a4c8"} 
                          />
                        )}
                        <Text style={[styles.statusButtonText, { 
                          color: isConnected === "connected" 
                            ? "#37a4c8" 
                            : isConnected === "pending"
                            ? "#FF9500"
                            : "#37a4c8",
                          fontSize: dynamicFontSize
                        }]}>
                          {isProcessing 
                            ? "Connecting..." 
                            : isConnected === "connected" 
                              ? "Connected" 
                              : isConnected === "pending"
                              ? "Pending"
                              : "Connect"}
                        </Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                </View>
                <View style={styles.infoContainer}>
                  <View style={[styles.ageContainer, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: "#37a4c8"
                  }]}>
                    <MaterialIcons name="cake" size={16} color="#37a4c8" />
                    <Animated.Text style={[styles.ageText, { color: "#37a4c8" }]}>
                      {userData?.age} years old
                    </Animated.Text>
                  </View>
                  <View style={[styles.moodContainer, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: "#37a4c8"
                  }]}>
                    <MaterialIcons name="mood" size={16} color="#37a4c8" />
                    <Animated.Text style={[styles.moodText, { color: "#37a4c8" }]} numberOfLines={1} ellipsizeMode="tail">
                      {userData?.moodStatus || "No status set"}
                    </Animated.Text>
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Navigation Tabs */}
            <Animated.View 
              style={[
                styles.tabContainer,
                {
                  opacity: sectionsFadeAnim,
                  transform: [{ scale: cardScaleAnim }]
                }
              ]}
            >
              {['about', 'interests', 'social'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    activeTab === tab && styles.activeTab,
                    { 
                      backgroundColor: activeTab === tab 
                        ? (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)")
                        : (theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"),
                      borderColor: activeTab === tab 
                        ? "#37a4c8" 
                        : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"),
                      shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
                    }
                  ]}
                  onPress={() => handleTabChange(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.tabText,
                    { 
                      color: activeTab === tab 
                        ? "#37a4c8" 
                        : (theme === "light" ? "#666666" : "#999999")
                    }
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </Animated.View>

            {/* Tab Content */}
            {renderTabContent()}

            {/* Add report and block buttons here, before the footer */}
            {id !== authUser?.uid && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.reportButton, { 
                    backgroundColor: theme === "light" ? "rgba(255, 68, 68, 0.1)" : "rgba(255, 102, 102, 0.1)",
                    borderColor: theme === "light" ? "#ff4444" : "#ff6666",
                  }]}
                  onPress={handleReport}
                >
                  <MaterialIcons name="report" size={16} color={theme === "light" ? "#ff4444" : "#ff6666"} />
                  <Text style={[styles.reportButtonText, { color: theme === "light" ? "#ff4444" : "#ff6666" }]}>
                    Report User
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.blockButton, { 
                    backgroundColor: theme === "light" ? "rgba(255, 68, 68, 0.1)" : "rgba(255, 102, 102, 0.1)",
                    borderColor: theme === "light" ? "#ff4444" : "#ff6666",
                  }]}
                  onPress={handleBlock}
                >
                  <MaterialIcons name="block" size={16} color={theme === "light" ? "#ff4444" : "#ff6666"} />
                  <Text style={[styles.blockButtonText, { color: theme === "light" ? "#ff4444" : "#ff6666" }]}>
                    Block User
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Footer with Logo and Membership Duration */}
            <View style={styles.footer}>
              <Image
                source={require('../../../assets/adaptive-icon.png')}
                style={[
                  styles.footerLogo,
                  { tintColor: theme === "light" ? "#0F172A" : "#ffffff" }
                ]}
                resizeMode="contain"
              />
              <Text style={[styles.membershipText, { color: theme === "light" ? "#666666" : "#999999" }]}>
                {userData.createdAt ? (
                  (() => {
                    const createdAt = userData.createdAt.toDate();
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
                    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
                    
                    if (diffMonths === 0) {
                      return "Joined this month";
                    } else if (diffMonths === 1) {
                      return "1 month on Wingman";
                    } else {
                      return `${diffMonths} months on Wingman`;
                    }
                  })()
                ) : "Member of Wingman"}
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Enhanced Floating Action Container */}
        {id === authUser?.uid ? (
          <Animated.View 
            style={[
              styles.actionContainer,
              {
                opacity: headerFadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <TouchableOpacity
              style={styles.editFab}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/editProfile')}
            >
              <MaterialIcons name="edit" size={24} color="#e4fbfe" />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Image Viewing Modal */}
        <ImageViewing
          images={currentImages.map((uri) => ({ uri }))}
          imageIndex={initialIndex}
          visible={isModalVisible}
          onRequestClose={() => {
            setIsModalVisible(false);
          }}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />

        {/* Connections Modal */}
        <Modal
          visible={showConnectionsModal}
          transparent
          animationType="none"
          onRequestClose={() => handleModalVisibility(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => handleModalVisibility(false)}
          >
            <Animated.View 
              style={[
                styles.modalContent,
                {
                  opacity: modalOpacityAnim,
                  transform: [{ scale: modalScaleAnim }],
                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                }
              ]}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <MaterialIcons name="people" size={24} color={theme === "light" ? "#37a4c8" : "#37a4c8"} />
                  <Text style={[styles.modalTitle, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
                    Connections
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleModalVisibility(false)}
                  style={[styles.closeButton, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
                  }]}
                >
                  <MaterialIcons name="close" size={20} color={theme === "light" ? "#666666" : "#999999"} />
                </TouchableOpacity>
              </View>
              <ScrollView 
                style={styles.connectionsList}
                showsVerticalScrollIndicator={false}
              >
                {connections.length > 0 ? (
                  connections.map((connection) => (
                    <TouchableOpacity
                      key={connection.id}
                      style={[styles.connectionItem, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                      }]}
                      onPress={() => {
                        handleModalVisibility(false);
                        router.push(`/profile/${connection.otherUser.id}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: connection.otherUser.profilePicture || "https://via.placeholder.com/150" }}
                        style={styles.connectionItemAvatar}
                      />
                      <View style={styles.connectionItemInfo}>
                        <Text style={[styles.connectionItemName, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
                          {connection.otherUser.name}
                        </Text>
                        <Text style={[styles.connectionItemType, { color: theme === "light" ? "#666666" : "#999999" }]}>
                          {connection.connectionType || "Local Experiences"}
                        </Text>
                      </View>
                      <View style={[styles.profileButton, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
                      }]}>
                        <MaterialIcons 
                          name="person" 
                          size={20} 
                          color={theme === "light" ? "#37a4c8" : "#37a4c8"} 
                        />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.noConnectionsContainer, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                  }]}>
                    <MaterialIcons name="people" size={48} color={theme === "light" ? "#666666" : "#999999"} />
                    <Text style={[styles.noConnectionsText, { color: theme === "light" ? "#666666" : "#999999" }]}>
                      No active connections yet
                    </Text>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </Modal>
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  gradient: {
    flex: 1,
    backgroundColor: "#000000",
  },
  topBarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
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
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 80,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 10,
  },
  profileImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: '#38a5c9',
  },
  statusIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#37a4c8",
    borderWidth: 2,
    borderColor: "#070707",
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  nameText: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  pronounsText: {
    fontSize: 18,
    fontWeight: "400",
    opacity: 0.8,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
    width: '100%',
  },
  ageContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minWidth: 160,
    justifyContent: 'center',
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minWidth: 160,
    justifyContent: 'center',
  },
  ageText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
    flex: 1,
    textAlign: 'center',
    lineHeight: 36,
  },
  moodText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
    flex: 1,
    textAlign: 'center',
    lineHeight: 36,
  },
  sectionsContainer: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 8,
  },
  cardContent: {
    fontSize: 14,
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
    shadowColor: "#000000",
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
    borderColor: "#37a4c8",
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
    color: "#38a5c9",
    marginLeft: 6,
    fontSize: 13,
    padding: 0,
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
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  socialMediaCard: {
    marginBottom: 24,
  },
  socialMediaLinks: {
    gap: 12,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    transform: [{ scale: 1 }],
  },
  socialLinkText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    color: '#e4fbfe',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.2)',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeTab: {
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    borderColor: '#37a4c8',
    shadowColor: '#37a4c8',
    shadowOpacity: 0.2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    fontWeight: '600',
    color: '#37a4c8',
  },
  tabContent: {
    marginTop: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noContentText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  languagesCard: {
    marginTop: 16,
  },
  interestsCard: {
    marginBottom: 16,
  },
  goalsCard: {
    marginBottom: 16,
  },
  skeletonContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 100,
  },
  skeletonHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  skeletonAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    marginBottom: 16,
  },
  skeletonName: {
    width: 200,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    marginBottom: 12,
  },
  skeletonMood: {
    width: 150,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  skeletonTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  skeletonContent: {
    gap: 16,
  },
  skeletonCard: {
    height: 120,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 164, 200, 0.2)',
  },
  footerLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },
  membershipText: {
    fontSize: 14,
    opacity: 0.8,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    width: '100%',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
    height: 44,
  },
  statusButtonText: {
    fontWeight: '700',
    marginLeft: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontSize: 12,
    flexShrink: 1,
  },
  connectionsContainer: {
    gap: 16,
  },
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  connectionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  connectionType: {
    fontSize: 14,
    marginBottom: 2,
  },
  connectionDate: {
    fontSize: 12,
  },
  noConnectionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  noConnectionsText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.2)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionsList: {
    padding: 16,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  connectionItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#37a4c8',
  },
  connectionItemInfo: {
    flex: 1,
  },
  connectionItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  connectionItemType: {
    fontSize: 14,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  tripPlaceholder: {
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tripPlaceholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  travelHistoryCard: {
    marginTop: 16,
  },
  tagIcon: {
    marginRight: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  verifiedBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginTop: 2,
  },
  actionButtonsContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  blockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nameSeparator: {
    width: '60%',
    height: 2,
    borderRadius: 1,
    marginBottom: 20,
    marginTop: 4,
    alignSelf: 'center',
  },
  separatorGradient: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  connectionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 180,
    height: 44,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 180,
    height: 44,
  },
});

export default Profile;