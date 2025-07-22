import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  SafeAreaView,
  Switch,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Feather, Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { useRouter } from "expo-router";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { containsFilteredContent, getFilteredContentCategory } from "../../utils/contentFilter";
import { ThemeContext } from "../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AvailabilitySchedule {
  monday: { start: string; end: string };
  tuesday: { start: string; end: string };
  wednesday: { start: string; end: string };
  thursday: { start: string; end: string };
  friday: { start: string; end: string };
  saturday: { start: string; end: string };
  sunday: { start: string; end: string };
}

interface EventPreferences {
  likesBars: boolean;
  prefersSmallGroups: boolean;
  prefersWeekendEvents: boolean;
  prefersEveningEvents: boolean;
  prefersIndoorVenues: boolean;
  prefersStructuredActivities: boolean;
  prefersSpontaneousPlans: boolean;
  prefersLocalMeetups: boolean;
  prefersTravelEvents: boolean;
  prefersQuietEnvironments: boolean;
  prefersActiveLifestyles: boolean;
  prefersIntellectualDiscussions: boolean;
}

interface FormData {
  name: string;
  age: string;
  bio: string;
  languages: string[];
  profilePicture: string;
  socialMedia: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  connectionIntents: string[];
  personalTags: string[];
  availabilitySchedule: AvailabilitySchedule;
  preferredMeetupRadius: number;
  eventPreferences: EventPreferences;
  availableNow: boolean;
}

type ProfileArrayField = "languages" | "connectionIntents" | "personalTags";

const defaultAvailabilitySchedule: AvailabilitySchedule = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "17:00" },
  saturday: { start: "00:00", end: "00:00" },
  sunday: { start: "00:00", end: "00:00" },
};

const defaultEventPreferences: EventPreferences = {
  likesBars: false,
  prefersSmallGroups: true,
  prefersWeekendEvents: false,
  prefersEveningEvents: false,
  prefersIndoorVenues: false,
  prefersStructuredActivities: false,
  prefersSpontaneousPlans: false,
  prefersLocalMeetups: false,
  prefersTravelEvents: false,
  prefersQuietEnvironments: false,
  prefersActiveLifestyles: false,
  prefersIntellectualDiscussions: false,
};

const LANGUAGES = [
  "Afrikaans", "Albanian", "Arabic", "Armenian", "Bengali", "Bulgarian", "Burmese",
  "Catalan", "Chinese (Mandarin)", "Croatian", "Czech", "Danish", "Dutch", "English",
  "Estonian", "Filipino", "Finnish", "French", "Georgian", "German", "Greek", "Hebrew",
  "Hindi", "Hungarian", "Icelandic", "Indonesian", "Italian", "Japanese", "Korean",
  "Latvian", "Lithuanian", "Malay", "Malayalam", "Maltese", "Marathi", "Mongolian",
  "Nepali", "Norwegian", "Persian", "Polish", "Portuguese", "Punjabi", "Romanian",
  "Russian", "Serbian", "Slovak", "Slovenian", "Spanish", "Swedish", "Tamil",
  "Telugu", "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese", "Welsh"
].sort();

const CONNECTION_INTENTS = [
  "Bar Hopping & Nightlife",
  "Sports & Athletics", 
  "Outdoor Adventures",
  "Networking & Business",
  "Creative Projects",
  "Deep Discussions",
  "Food & Dining",
  "Music & Concerts",
  "Travel & Exploration",
  "Gaming & Entertainment",
  "Fitness & Wellness",
  "Art & Culture",
  "Technology & Innovation",
  "Volunteering & Community",
  "Learning & Education",
  "Photography & Media",
  "Dancing & Social Events",
  "Board Games & Strategy",
  "Coffee & Casual Meetups",
  "Festivals & Events"
].sort();

const PERSONAL_TAGS = [
  "Christian",
  "Night Owl",
  "Straight Edge",
  "Introverted",
  "Extroverted",
  "Early Bird",
  "Coffee Addict",
  "Tea Enthusiast",
  "Bookworm",
  "Gym Rat",
  "Yoga Practitioner",
  "Meditation",
  "Vegan",
  "Vegetarian",
  "Foodie",
  "Adventure Seeker",
  "Homebody",
  "Minimalist",
  "Creative",
  "Analytical",
  "Empathetic",
  "Leader",
  "Team Player",
  "Independent",
  "Family-Oriented",
  "Career-Focused",
  "Student",
  "Entrepreneur",
  "Artist",
  "Musician",
  "Writer",
  "Photographer",
  "Tech-Savvy",
  "Old School",
  "Fashion-Forward",
  "Casual Style",
  "Pet Lover",
  "Plant Parent",
  "DIY Enthusiast",
  "Thrift Shopper",
  "Luxury Lover",
  "Budget-Conscious",
  "Spontaneous",
  "Planner",
  "Optimist",
  "Realist",
  "Sarcastic",
  "Humor-Loving",
  "Deep Thinker",
  "Action-Oriented"
].sort();

const EditProfile = () => {
  const { userId } = useAuth();
  const { updateUser } = useUsers();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    age: "",
    bio: "",
    languages: [""],
    profilePicture: "",
    socialMedia: {
      instagram: "",
      linkedin: "",
      twitter: "",
    },
    connectionIntents: [""],
    personalTags: [""],
    availabilitySchedule: defaultAvailabilitySchedule,
    preferredMeetupRadius: 10,
    eventPreferences: defaultEventPreferences,
    availableNow: true,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});
  const { theme } = React.useContext(ThemeContext);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConnectionIntentsModal, setShowConnectionIntentsModal] = useState(false);
  const [connectionIntentsSearchQuery, setConnectionIntentsSearchQuery] = useState("");
  const [showPersonalTagsModal, setShowPersonalTagsModal] = useState(false);
  const [personalTagsSearchQuery, setPersonalTagsSearchQuery] = useState("");
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [currentTimePicker, setCurrentTimePicker] = useState<{
    day: string;
    type: 'start' | 'end';
  } | null>(null);
  
  const insets = useSafeAreaInsets();

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
      if (userId) {
        try {
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData({
              name: data.name || "",
              age: data.age?.toString() || "",
              bio: data.bio || "",
              languages: data.languages || [""],
              profilePicture: data.profilePicture || "",
              socialMedia: {
                instagram: data.socialMedia?.instagram || "",
                linkedin: data.socialMedia?.linkedin || "",
                twitter: data.socialMedia?.twitter || "",
              },
              connectionIntents: data.connectionIntents || [""],
              personalTags: data.personalTags || [""],
              availabilitySchedule: data.availabilitySchedule || defaultAvailabilitySchedule,
              preferredMeetupRadius: data.preferredMeetupRadius || 10,
              eventPreferences: data.eventPreferences || defaultEventPreferences,
              availableNow: data.availableNow !== undefined ? data.availableNow : true,
            });
          }
        } catch (error) {
          Alert.alert("Error", "Failed to load user data");
        } finally {
          setLoading(false);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    fetchUserData();
  }, [userId]);

  const handleSelectPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "We need access to your photos to set a profile picture"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri ?? "";
        setFormData((prev) => ({ ...prev, profilePicture: selectedUri }));
      }
    } catch (err) {
      console.log("Image picker error:", err);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const handleAvailabilityChange = (day: keyof AvailabilitySchedule, type: 'start' | 'end', time: string) => {
    setFormData((prev) => ({
      ...prev,
      availabilitySchedule: {
        ...prev.availabilitySchedule,
        [day]: {
          ...prev.availabilitySchedule[day],
          [type]: time,
        },
      },
    }));
  };

  const handleEventPreferenceChange = (preference: keyof EventPreferences, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      eventPreferences: {
        ...prev.eventPreferences,
        [preference]: value,
      },
    }));
  };

  const handleRadiusChange = (radius: number) => {
    setFormData((prev) => ({
      ...prev,
      preferredMeetupRadius: radius,
    }));
  };

  const handleAvailableNowChange = (available: boolean) => {
    setFormData((prev) => ({
      ...prev,
      availableNow: available,
    }));
  };

  const handleLanguageSelect = (language: string) => {
    const currentLanguages = formData.languages.filter(l => l.trim() !== "");
    if (!currentLanguages.includes(language)) {
      setFormData((prev) => ({
        ...prev,
        languages: [...currentLanguages, language],
      }));
    }
    setShowLanguageModal(false);
    setSearchQuery("");
  };

  const handleLanguageRemove = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      languages: prev.languages.filter(l => l !== language),
    }));
  };

  const handleConnectionIntentSelect = (intent: string) => {
    const currentIntents = formData.connectionIntents.filter(i => i.trim() !== "");
    if (!currentIntents.includes(intent)) {
      setFormData((prev) => ({
        ...prev,
        connectionIntents: [...currentIntents, intent],
      }));
    }
    // Don't close modal - allow multiple selections
    // setShowConnectionIntentsModal(false);
    // setConnectionIntentsSearchQuery("");
  };

  const handleConnectionIntentRemove = (intent: string) => {
    setFormData((prev) => ({
      ...prev,
      connectionIntents: prev.connectionIntents.filter(i => i !== intent),
    }));
  };

  const handlePersonalTagSelect = (tag: string) => {
    const currentTags = formData.personalTags.filter(t => t.trim() !== "");
    if (!currentTags.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        personalTags: [...currentTags, tag],
      }));
    }
    // Don't close modal - allow multiple selections
    // setShowPersonalTagsModal(false);
    // setPersonalTagsSearchQuery("");
  };

  const handlePersonalTagRemove = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      personalTags: prev.personalTags.filter(t => t !== tag),
    }));
  };

  const openLanguageModal = () => {
    setSearchQuery("");
    setShowLanguageModal(true);
  };

  const openConnectionIntentsModal = () => {
    setConnectionIntentsSearchQuery("");
    setShowConnectionIntentsModal(true);
  };

  const openPersonalTagsModal = () => {
    setPersonalTagsSearchQuery("");
    setShowPersonalTagsModal(true);
  };

  const formatTimeForDisplay = (militaryTime: string): string => {
    if (!militaryTime || militaryTime === "00:00") return "12:00 AM";
    
    const [hours, minutes] = militaryTime.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const convertToMilitaryTime = (displayTime: string): string => {
    if (!displayTime) return "00:00";
    
    const match = displayTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return "00:00";
    
    let [_, hours, minutes, period] = match;
    let hour = parseInt(hours);
    const minute = parseInt(minutes);
    
    if (period.toUpperCase() === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period.toUpperCase() === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const openTimePicker = (day: string, type: 'start' | 'end') => {
    setCurrentTimePicker({ day, type });
    setShowTimePickerModal(true);
  };

  const handleTimeSelection = (hour: number, minute: number, period: 'AM' | 'PM') => {
    if (!currentTimePicker) return;
    
    let militaryHour = hour;
    if (period === 'PM' && hour !== 12) {
      militaryHour += 12;
    } else if (period === 'AM' && hour === 12) {
      militaryHour = 0;
    }
    
    const militaryTime = `${militaryHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    handleAvailabilityChange(
      currentTimePicker.day as keyof AvailabilitySchedule, 
      currentTimePicker.type, 
      militaryTime
    );
    
    setShowTimePickerModal(false);
    setCurrentTimePicker(null);
  };

  const handleApplyToAllDays = () => {
    if (!currentTimePicker) return;
    
    const currentTime = formData.availabilitySchedule[currentTimePicker.day as keyof AvailabilitySchedule][currentTimePicker.type];
    
    const updatedSchedule = { ...formData.availabilitySchedule };
    Object.keys(updatedSchedule).forEach((day) => {
      updatedSchedule[day as keyof AvailabilitySchedule] = {
        ...updatedSchedule[day as keyof AvailabilitySchedule],
        [currentTimePicker.type]: currentTime,
      };
    });
    
    setFormData(prev => ({
      ...prev,
      availabilitySchedule: updatedSchedule,
    }));
    
    setShowTimePickerModal(false);
    setCurrentTimePicker(null);
  };

  const filteredLanguages = LANGUAGES.filter(language => 
    language.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !formData.languages.includes(language)
  );

  const filteredConnectionIntents = CONNECTION_INTENTS.filter(intent => 
    intent.toLowerCase().includes(connectionIntentsSearchQuery.toLowerCase()) &&
    !formData.connectionIntents.includes(intent)
  );

  const filteredPersonalTags = PERSONAL_TAGS.filter(tag => 
    tag.toLowerCase().includes(personalTagsSearchQuery.toLowerCase()) &&
    !formData.personalTags.includes(tag)
  );

  const handleUpdateProfile = async () => {
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }

    // Check for any field errors
    if (Object.values(fieldErrors).some(error => error)) {
      Alert.alert(
        "Inappropriate Content",
        "Please remove any inappropriate content before saving.",
        [{ text: "OK" }]
      );
      return;
    }

    setUpdating(true);
    setSaveProgress(0);
    try {
      let profilePicUrl = formData.profilePicture;

      // Format social media URLs before saving
      const formattedSocialMedia = {
        instagram: formatSocialUrl('instagram', formData.socialMedia.instagram || ''),
        linkedin: formatSocialUrl('linkedin', formData.socialMedia.linkedin || ''),
        twitter: formatSocialUrl('twitter', formData.socialMedia.twitter || ''),
      };

      setSaveProgress(20);

      if (profilePicUrl && !profilePicUrl.startsWith("http")) {
        const response = await fetch(profilePicUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile_pictures/${userId}`);
        await uploadBytes(storageRef, blob);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      setSaveProgress(60);

      const updatedData = {
        ...formData,
        profilePicture: profilePicUrl,
        age: parseInt(formData.age, 10),
        languages: formData.languages.filter((l) => l.trim() !== ""),
        connectionIntents: formData.connectionIntents.filter((c) => c.trim() !== ""),
        personalTags: formData.personalTags.filter((p) => p.trim() !== ""),
        socialMedia: formattedSocialMedia,
        updatedAt: serverTimestamp(),
      };

      setSaveProgress(80);

      await updateUser(userId, updatedData);
      setSaveProgress(100);

      // Show success message and smoothly transition back
      Alert.alert(
        "Success",
        "Profile updated successfully",
        [
          {
            text: "OK",
            onPress: () => {
              // Add a small delay for better UX
              setTimeout(() => {
                router.back();
              }, 300);
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update profile. Please try again.",
        [{ text: "OK" }],
        { cancelable: false }
      );
      console.error(error);
    } finally {
      setUpdating(false);
      setSaveProgress(0);
    }
  };

  const handleAddField = (field: ProfileArrayField) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleRemoveField = (field: ProfileArrayField, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((value: string, i: number) => i !== index),
    }));
  };

  const handleFieldChange = (
    field: ProfileArrayField,
    index: number,
    text: string
  ) => {
    // Check for filtered content
    if (containsFilteredContent(text)) {
      setFieldErrors(prev => ({ ...prev, [`${field}_${index}`]: true }));
    } else {
      setFieldErrors(prev => ({ ...prev, [`${field}_${index}`]: false }));
    }

    const updatedFields = [...formData[field]];
    updatedFields[index] = text;
    setFormData((prev) => ({
      ...prev,
      [field]: updatedFields,
    }));
  };

  // Add URL formatting functions
  const formatSocialUrl = (platform: string, username: string) => {
    if (!username) return "";
    const cleanUsername = username.trim().replace(/^@/, '');
    
    switch (platform) {
      case 'instagram':
        return `https://www.instagram.com/${cleanUsername}/`;
      case 'linkedin':
        // LinkedIn can be either a full URL or just a username
        if (username.includes('linkedin.com')) {
          return username;
        }
        return `https://www.linkedin.com/in/${cleanUsername}/`;
      case 'twitter':
        return `https://x.com/${cleanUsername}`;
      default:
        return username;
    }
  };

  const extractUsername = (url: string, platform: string) => {
    if (!url) return "";
    
    try {
      const urlObj = new URL(url);
      switch (platform) {
        case 'instagram':
          return urlObj.pathname.replace(/^\/|\/$/g, '');
        case 'linkedin':
          // For LinkedIn, return the full URL if it's already a URL, otherwise return as is
          if (url.includes('linkedin.com')) {
            return url;
          }
          return urlObj.pathname.replace(/^\/in\/|\/$/g, '');
        case 'twitter':
          return urlObj.pathname.replace(/^\/|\/$/g, '');
        default:
          return url;
      }
    } catch {
      // If it's not a valid URL, return as is (for LinkedIn profile links)
      if (platform === 'linkedin') {
        return url;
      }
      return url;
    }
  };

  if (authLoading || loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (updating) {
    return <LoadingScreen message="Updating your profile..." />;
  }

  return (
    <LinearGradient 
      colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} 
      style={styles.container}
    >
      <TopBar />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                Edit Profile
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                Update your profile information
              </Text>
            </View>

            {/* Profile Picture Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.profileHeader}>
                <TouchableOpacity onPress={handleSelectPhoto} style={styles.profileImageContainer}>
                  <Image
                    source={{
                      uri: formData.profilePicture || "https://via.placeholder.com/150",
                    }}
                    style={styles.profileImage}
                  />
                  <View style={[styles.changePhotoOverlay, { backgroundColor: theme === "light" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.5)" }]}>
                    <MaterialIcons name="photo-camera" size={24} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.changePhotoButton, { backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)" }]}
                  onPress={handleSelectPhoto}
                >
                  <Feather name="camera" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.changePhotoText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                    Change Photo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Basic Info Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Basic Information
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Full Name
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                      borderColor: fieldErrors['name'] ? "#ff4444" : theme === "light" ? "#E2E8F0" : "#374151",
                      color: theme === "light" ? "#1E293B" : "#e4fbfe"
                    }
                  ]}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChangeText={(text) => {
                    if (containsFilteredContent(text)) {
                      setFieldErrors(prev => ({ ...prev, name: true }));
                    } else {
                      setFieldErrors(prev => ({ ...prev, name: false }));
                    }
                    setFormData({ ...formData, name: text });
                  }}
                  placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Bio
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.multilineInput,
                    { 
                      backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                      borderColor: fieldErrors['bio'] ? "#ff4444" : theme === "light" ? "#E2E8F0" : "#374151",
                      color: theme === "light" ? "#1E293B" : "#e4fbfe"
                    }
                  ]}
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChangeText={(text) => {
                    if (containsFilteredContent(text)) {
                      setFieldErrors(prev => ({ ...prev, bio: true }));
                    } else {
                      setFieldErrors(prev => ({ ...prev, bio: false }));
                    }
                    setFormData({ ...formData, bio: text });
                  }}
                  multiline
                  placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                />
              </View>
            </View>

            {/* Languages Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.sectionHeader}>
                <Feather name="globe" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Languages
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Languages you speak
                </Text>
                
                <TouchableOpacity
                  style={[styles.selectionButton, {
                    backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                  }]}
                  onPress={openLanguageModal}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectionButtonContent}>
                    <Feather name="globe" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.selectionButtonText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Select Languages
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </TouchableOpacity>

                {/* Selected Languages Display */}
                {formData.languages.filter(l => l.trim() !== "").length > 0 && (
                  <View style={styles.tagsContainer}>
                    {formData.languages.filter(l => l.trim() !== "").map((language, index) => (
                      <View key={index} style={[styles.tag, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>
                        <Text style={[styles.tagText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                          {language}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleLanguageRemove(language)}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Feather name="x" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Connection Intents Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.sectionHeader}>
                <Feather name="target" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Connection Intents
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  What are you looking to connect about?
                </Text>
                
                <TouchableOpacity
                  style={[styles.selectionButton, {
                    backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                  }]}
                  onPress={openConnectionIntentsModal}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectionButtonContent}>
                    <Feather name="target" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.selectionButtonText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Select Connection Intents
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </TouchableOpacity>

                {/* Selected Connection Intents Display */}
                {formData.connectionIntents.filter(i => i.trim() !== "").length > 0 && (
                  <View style={styles.tagsContainer}>
                    {formData.connectionIntents.filter(i => i.trim() !== "").map((intent, index) => (
                      <View key={index} style={[styles.tag, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>
                        <Text style={[styles.tagText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                          {intent}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleConnectionIntentRemove(intent)}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Feather name="x" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Personal Tags Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.sectionHeader}>
                <Feather name="user" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Personal Tags
                </Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Tags that describe you
                </Text>
                
                <TouchableOpacity
                  style={[styles.selectionButton, {
                    backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                  }]}
                  onPress={openPersonalTagsModal}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectionButtonContent}>
                    <Feather name="user" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.selectionButtonText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Select Personal Tags
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </TouchableOpacity>

                {/* Selected Personal Tags Display */}
                {formData.personalTags.filter(t => t.trim() !== "").length > 0 && (
                  <View style={styles.tagsContainer}>
                    {formData.personalTags.filter(t => t.trim() !== "").map((tag, index) => (
                      <View key={index} style={[styles.tag, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>
                        <Text style={[styles.tagText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                          {tag}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handlePersonalTagRemove(tag)}
                          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                        >
                          <Feather name="x" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Availability Settings Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="schedule" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Availability Settings
                </Text>
              </View>
              
              {/* Preferred Meetup Radius */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Preferred Meetup Radius (miles)
                </Text>
                <View style={styles.radiusContainer}>
                  {[5, 10, 25, 50].map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      style={[
                        styles.radiusButton,
                        {
                          backgroundColor: formData.preferredMeetupRadius === radius 
                            ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                            : (theme === "light" ? "#F8FAFC" : "#000000"),
                          borderColor: formData.preferredMeetupRadius === radius 
                            ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                            : (theme === "light" ? "#E2E8F0" : "#37a4c8")
                        }
                      ]}
                      onPress={() => handleRadiusChange(radius)}
                    >
                      <Text style={[
                        styles.radiusButtonText,
                        {
                          color: formData.preferredMeetupRadius === radius 
                            ? "#FFFFFF" 
                            : (theme === "light" ? "#1E293B" : "#e4fbfe")
                        }
                      ]}>
                        {radius}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Weekly Availability Schedule */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Weekly Availability
                </Text>
                
                {/* Quick Preset Buttons */}
                <View style={styles.presetContainer}>
                  <TouchableOpacity
                    style={[styles.presetButton, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                    }]}
                    onPress={() => {
                      const workWeekSchedule = {
                        monday: { start: "09:00", end: "17:00" },
                        tuesday: { start: "09:00", end: "17:00" },
                        wednesday: { start: "09:00", end: "17:00" },
                        thursday: { start: "09:00", end: "17:00" },
                        friday: { start: "09:00", end: "17:00" },
                        saturday: { start: "00:00", end: "00:00" },
                        sunday: { start: "00:00", end: "00:00" },
                      };
                      setFormData(prev => ({ ...prev, availabilitySchedule: workWeekSchedule }));
                    }}
                  >
                    <Text style={[styles.presetButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Work Week
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.presetButton, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                    }]}
                    onPress={() => {
                      const weekendSchedule = {
                        monday: { start: "00:00", end: "00:00" },
                        tuesday: { start: "00:00", end: "00:00" },
                        wednesday: { start: "00:00", end: "00:00" },
                        thursday: { start: "00:00", end: "00:00" },
                        friday: { start: "00:00", end: "00:00" },
                        saturday: { start: "10:00", end: "22:00" },
                        sunday: { start: "10:00", end: "20:00" },
                      };
                      setFormData(prev => ({ ...prev, availabilitySchedule: weekendSchedule }));
                    }}
                  >
                    <Text style={[styles.presetButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Weekends Only
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.presetButton, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                    }]}
                    onPress={() => {
                      const alwaysAvailableSchedule = {
                        monday: { start: "00:00", end: "23:59" },
                        tuesday: { start: "00:00", end: "23:59" },
                        wednesday: { start: "00:00", end: "23:59" },
                        thursday: { start: "00:00", end: "23:59" },
                        friday: { start: "00:00", end: "23:59" },
                        saturday: { start: "00:00", end: "23:59" },
                        sunday: { start: "00:00", end: "23:59" },
                      };
                      setFormData(prev => ({ ...prev, availabilitySchedule: alwaysAvailableSchedule }));
                    }}
                  >
                    <Text style={[styles.presetButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Always Available
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Day-by-Day Schedule */}
                <View style={styles.scheduleContainer}>
                  {Object.entries(formData.availabilitySchedule).map(([day, times]) => (
                    <View key={day} style={[styles.availabilityRow, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                    }]}>
                      <View style={styles.dayHeader}>
                        <Text style={[styles.dayLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </Text>
                        <TouchableOpacity
                          style={[styles.toggleDayButton, {
                            backgroundColor: (times.start === "00:00" && times.end === "00:00") 
                              ? (theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.2)")
                              : (theme === "light" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.2)")
                          }]}
                          onPress={() => {
                            const newTimes = (times.start === "00:00" && times.end === "00:00") 
                              ? { start: "09:00", end: "17:00" }
                              : { start: "00:00", end: "00:00" };
                            handleAvailabilityChange(day as keyof AvailabilitySchedule, 'start', newTimes.start);
                            handleAvailabilityChange(day as keyof AvailabilitySchedule, 'end', newTimes.end);
                          }}
                        >
                          <Text style={[styles.toggleDayText, {
                            color: (times.start === "00:00" && times.end === "00:00") 
                              ? "#ef4444" 
                              : "#22c55e"
                          }]}>
                            {(times.start === "00:00" && times.end === "00:00") ? "Unavailable" : "Available"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {(times.start !== "00:00" || times.end !== "00:00") && (
                        <View style={styles.timeInputs}>
                          <View style={styles.timeInputGroup}>
                            <Text style={[styles.timeLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                              Start
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.timeButton,
                                {
                                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                                }
                              ]}
                              onPress={() => openTimePicker(day, 'start')}
                            >
                              <Text style={[styles.timeButtonText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                                {formatTimeForDisplay(times.start)}
                              </Text>
                              <MaterialIcons 
                                name="access-time" 
                                size={16} 
                                color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                              />
                            </TouchableOpacity>
                          </View>
                          
                          <View style={styles.timeSeparatorContainer}>
                            <Text style={[styles.timeSeparator, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>to</Text>
                          </View>
                          
                          <View style={styles.timeInputGroup}>
                            <Text style={[styles.timeLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                              End
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.timeButton,
                                {
                                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                                }
                              ]}
                              onPress={() => openTimePicker(day, 'end')}
                            >
                              <Text style={[styles.timeButtonText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                                {formatTimeForDisplay(times.end)}
                              </Text>
                              <MaterialIcons 
                                name="access-time" 
                                size={16} 
                                color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Event Preferences Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="event" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Event Preferences
                </Text>
              </View>
              <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                Your event preferences and style
              </Text>
              
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="local-bar" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Like Bars & Nightlife
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.likesBars}
                  onValueChange={(value) => handleEventPreferenceChange('likesBars', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.likesBars ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="group" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Small Groups
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersSmallGroups}
                  onValueChange={(value) => handleEventPreferenceChange('prefersSmallGroups', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersSmallGroups ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="weekend" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Weekend Events
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersWeekendEvents}
                  onValueChange={(value) => handleEventPreferenceChange('prefersWeekendEvents', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersWeekendEvents ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="nights-stay" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Evening Events
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersEveningEvents}
                  onValueChange={(value) => handleEventPreferenceChange('prefersEveningEvents', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersEveningEvents ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="home" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Indoor Venues
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersIndoorVenues}
                  onValueChange={(value) => handleEventPreferenceChange('prefersIndoorVenues', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersIndoorVenues ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="schedule" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Structured Activities
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersStructuredActivities}
                  onValueChange={(value) => handleEventPreferenceChange('prefersStructuredActivities', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersStructuredActivities ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="flash-on" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Spontaneous Plans
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersSpontaneousPlans}
                  onValueChange={(value) => handleEventPreferenceChange('prefersSpontaneousPlans', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersSpontaneousPlans ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="location-on" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Local Meetups
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersLocalMeetups}
                  onValueChange={(value) => handleEventPreferenceChange('prefersLocalMeetups', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersLocalMeetups ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="flight" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Travel Events
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersTravelEvents}
                  onValueChange={(value) => handleEventPreferenceChange('prefersTravelEvents', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersTravelEvents ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="volume-off" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Quiet Environments
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersQuietEnvironments}
                  onValueChange={(value) => handleEventPreferenceChange('prefersQuietEnvironments', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersQuietEnvironments ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="fitness-center" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Active Lifestyles
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersActiveLifestyles}
                  onValueChange={(value) => handleEventPreferenceChange('prefersActiveLifestyles', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersActiveLifestyles ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialIcons name="psychology" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.settingLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Prefer Intellectual Discussions
                  </Text>
                </View>
                <Switch
                  value={formData.eventPreferences.prefersIntellectualDiscussions}
                  onValueChange={(value) => handleEventPreferenceChange('prefersIntellectualDiscussions', value)}
                  trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                  thumbColor={formData.eventPreferences.prefersIntellectualDiscussions ? "#FFFFFF" : "#FFFFFF"}
                />
              </View>
            </View>

            {/* Social Media Section */}
            <View style={[styles.card, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
            }]}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="share" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Social Media
                </Text>
              </View>
              <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                Connect your social media accounts
              </Text>
              <View style={styles.socialMediaContainer}>
                <View style={[styles.socialMediaInput, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: fieldErrors['instagram'] ? "#ff4444" : theme === "light" ? "#E2E8F0" : "#37a4c8"
                }]}>
                  <MaterialIcons 
                    name="photo-camera" 
                    size={24} 
                    color={fieldErrors['instagram'] ? "#ff4444" : theme === "light" ? "#37a4c8" : "#38a5c9"} 
                    style={styles.socialIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.socialInput, {
                      color: theme === "light" ? "#1E293B" : "#e4fbfe"
                    }]}
                    placeholder="Instagram Username"
                    value={extractUsername(formData.socialMedia.instagram || '', 'instagram')}
                    onChangeText={(text) => {
                      if (containsFilteredContent(text)) {
                        setFieldErrors(prev => ({ ...prev, instagram: true }));
                      } else {
                        setFieldErrors(prev => ({ ...prev, instagram: false }));
                      }
                      setFormData((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, instagram: text },
                      }));
                    }}
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                  />
                </View>
                <View style={[styles.socialMediaInput, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: fieldErrors['linkedin'] ? "#ff4444" : theme === "light" ? "#E2E8F0" : "#37a4c8"
                }]}>
                  <MaterialIcons 
                    name="work" 
                    size={24} 
                    color={fieldErrors['linkedin'] ? "#ff4444" : theme === "light" ? "#37a4c8" : "#38a5c9"} 
                    style={styles.socialIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.socialInput, {
                      color: theme === "light" ? "#1E293B" : "#e4fbfe"
                    }]}
                    placeholder="LinkedIn Profile Link"
                    value={formData.socialMedia.linkedin || ''}
                    onChangeText={(text) => {
                      if (containsFilteredContent(text)) {
                        setFieldErrors(prev => ({ ...prev, linkedin: true }));
                      } else {
                        setFieldErrors(prev => ({ ...prev, linkedin: false }));
                      }
                      setFormData((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, linkedin: text },
                      }));
                    }}
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                  />
                </View>
                <View style={[styles.socialMediaInput, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: fieldErrors['twitter'] ? "#ff4444" : theme === "light" ? "#E2E8F0" : "#37a4c8"
                }]}>
                  <MaterialIcons 
                    name="chat" 
                    size={24} 
                    color={fieldErrors['twitter'] ? "#ff4444" : theme === "light" ? "#37a4c8" : "#38a5c9"} 
                    style={styles.socialIcon} 
                  />
                  <TextInput
                    style={[styles.input, styles.socialInput, {
                      color: theme === "light" ? "#1E293B" : "#e4fbfe"
                    }]}
                    placeholder="X (Twitter) Username"
                    value={extractUsername(formData.socialMedia.twitter || '', 'twitter')}
                    onChangeText={(text) => {
                      if (containsFilteredContent(text)) {
                        setFieldErrors(prev => ({ ...prev, twitter: true }));
                      } else {
                        setFieldErrors(prev => ({ ...prev, twitter: false }));
                      }
                      setFormData((prev) => ({
                        ...prev,
                        socialMedia: { ...prev.socialMedia, twitter: text },
                      }));
                    }}
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                  />
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                  shadowColor: theme === "light" ? "#0F172A" : "#38a5c9",
                  opacity: (updating || Object.values(fieldErrors).some(error => error)) ? 0.7 : 1
                }
              ]}
              onPress={handleUpdateProfile}
              disabled={updating || Object.values(fieldErrors).some(error => error)}
            >
              {updating ? (
                <View style={styles.saveButtonContent}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={[styles.saveButtonText, styles.saveButtonTextLoading, { color: "#FFFFFF" }]}>
                    Saving... {saveProgress}%
                  </Text>
                </View>
              ) : (
                <Text style={[styles.saveButtonText, { color: "#FFFFFF" }]}>
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
          }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Feather name="globe" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.modalTitleIcon} />
                <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Select Languages
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.closeButton, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}
              >
                <Feather name="x" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, {
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
            }]}>
              <Feather name="search" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              <TextInput
                style={[styles.searchInput, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                placeholder="Search languages..."
                placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={() => setShowLanguageModal(false)}
                blurOnSubmit={true}
                keyboardAppearance={theme === "light" ? "light" : "dark"}
              />
            </View>

            <FlatList
              data={filteredLanguages}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.languageItem, {
                    borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                  }]}
                  onPress={() => handleLanguageSelect(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.languageItemText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    {item}
                  </Text>
                  <View style={[styles.languageItemIcon, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                  }]}>
                    <Feather name="plus" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </View>
                </TouchableOpacity>
              )}
              style={[styles.languageList, {
                backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
              }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              contentContainerStyle={styles.languageListContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="search" size={32} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.emptyStateText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                    No languages found
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme === "light" ? "#94A3B8" : "#94A3B8" }]}>
                    Try a different search term
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Connection Intents Selection Modal */}
      <Modal
        visible={showConnectionIntentsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConnectionIntentsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
          }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Feather name="target" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.modalTitleIcon} />
                <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Select Connection Intents
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowConnectionIntentsModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.closeButton, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}
              >
                <Feather name="x" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, {
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
            }]}>
              <Feather name="search" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              <TextInput
                style={[styles.searchInput, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                placeholder="Search connection intents..."
                placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                value={connectionIntentsSearchQuery}
                onChangeText={setConnectionIntentsSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={() => setShowConnectionIntentsModal(false)}
                blurOnSubmit={true}
                keyboardAppearance={theme === "light" ? "light" : "dark"}
              />
            </View>

            <FlatList
              data={filteredConnectionIntents}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.languageItem, {
                    borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                  }]}
                  onPress={() => handleConnectionIntentSelect(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.languageItemText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    {item}
                  </Text>
                  <View style={[styles.languageItemIcon, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                  }]}>
                    <Feather name="plus" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </View>
                </TouchableOpacity>
              )}
              style={[styles.languageList, {
                backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
              }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              contentContainerStyle={styles.languageListContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="search" size={32} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.emptyStateText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                    No connection intents found
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme === "light" ? "#94A3B8" : "#94A3B8" }]}>
                    Try a different search term
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Personal Tags Selection Modal */}
      <Modal
        visible={showPersonalTagsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPersonalTagsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
          }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Feather name="user" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.modalTitleIcon} />
                <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Select Personal Tags
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPersonalTagsModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.closeButton, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}
              >
                <Feather name="x" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, {
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
            }]}>
              <Feather name="search" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              <TextInput
                style={[styles.searchInput, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                placeholder="Search personal tags..."
                placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                value={personalTagsSearchQuery}
                onChangeText={setPersonalTagsSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                returnKeyType="done"
                onSubmitEditing={() => setShowPersonalTagsModal(false)}
                blurOnSubmit={true}
                keyboardAppearance={theme === "light" ? "light" : "dark"}
              />
            </View>

            <FlatList
              data={filteredPersonalTags}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.languageItem, {
                    borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                  }]}
                  onPress={() => handlePersonalTagSelect(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.languageItemText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    {item}
                  </Text>
                  <View style={[styles.languageItemIcon, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                  }]}>
                    <Feather name="plus" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </View>
                </TouchableOpacity>
              )}
              style={[styles.languageList, {
                backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
              }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              contentContainerStyle={styles.languageListContent}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="search" size={32} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.emptyStateText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                    No personal tags found
                  </Text>
                  <Text style={[styles.emptyStateSubtext, { color: theme === "light" ? "#94A3B8" : "#94A3B8" }]}>
                    Try a different search term
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
            height: '80%',
            maxHeight: 500,
          }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MaterialIcons name="access-time" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.modalTitleIcon} />
                <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Select Time
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePickerModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[styles.closeButton, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}
              >
                <Feather name="x" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timePickerContainer}>
              <Text style={[styles.timePickerLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                {currentTimePicker?.type === 'start' ? 'Start Time' : 'End Time'}
              </Text>
              
              <ScrollView 
                style={styles.timePickerScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.timePickerScrollContent}
              >
                <View style={styles.timePickerGrid}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                    <View key={hour} style={styles.timePickerRow}>
                      <TouchableOpacity
                        style={[styles.timePickerButton, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                        }]}
                        onPress={() => handleTimeSelection(hour, 0, 'AM')}
                      >
                        <Text style={[styles.timePickerButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                          {hour}:00 AM
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.timePickerButton, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                        }]}
                        onPress={() => handleTimeSelection(hour, 0, 'PM')}
                      >
                        <Text style={[styles.timePickerButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                          {hour}:00 PM
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity
                  style={[styles.applyToAllButton, {
                    backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                  }]}
                  onPress={handleApplyToAllDays}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="schedule" size={20} color="#FFFFFF" />
                  <Text style={styles.applyToAllButtonText}>
                    Apply to All Days
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  profileHeader: {
    alignItems: "center",
    gap: 16,
  },
  profileImageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: "#37a4c8",
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  changePhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  changePhotoText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  socialMediaContainer: {
    gap: 16,
  },
  socialMediaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  socialIcon: {
    marginRight: 12,
  },
  socialInput: {
    flex: 1,
    marginBottom: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  radiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  radiusButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 50,
    alignItems: 'center',
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  availabilityRow: {
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleDayButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDayText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeSeparatorContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeInput: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  timeButton: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  presetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  presetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  scheduleContainer: {
    gap: 8,
  },
  languageSelectionButton: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  languageSelectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageSelectionText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
  languageTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  languageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  languageTagText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitleIcon: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    margin: 24,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    paddingVertical: 4,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  languageItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  languageItemIcon: {
    padding: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageList: {
    maxHeight: 400,
    borderRadius: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  languageListContent: {
    paddingBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  emptyStateSubtext: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    opacity: 0.7,
  },
  timePickerContainer: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 24,
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  timePickerGrid: {
    gap: 12,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timePickerScrollView: {
    flex: 1,
    minHeight: 200,
  },
  timePickerScrollContent: {
    paddingBottom: 24,
  },
  applyToAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 24,
    marginHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applyToAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  selectionButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  saveButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginVertical: 24,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  saveButtonTextLoading: {
    fontSize: 16,
  },
});

export default EditProfile;