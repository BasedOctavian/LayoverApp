import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  Alert,
  Easing,
  RefreshControl,
  Platform,
  Share,
  Linking,
  Dimensions,
} from "react-native";
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius, isSmallDevice } from "../../utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  deleteDoc, 
  arrayRemove, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  addDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, db } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import { useLocalSearchParams, useRouter as useExpoRouter, useFocusEffect } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import ImageViewing from "react-native-image-viewing";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar";
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import LoadingScreen from "../../components/LoadingScreen";
import useChats from "../../hooks/useChats";
import { DocumentData } from "firebase/firestore";
import { ThemeContext } from "../../context/ThemeContext";
import useNotificationCount from "../../hooks/useNotificationCount";
import StatusSheet from "../../components/StatusSheet";
import { generateProfileShareUrl, generateWebProfileShareUrl } from "../../utils/externalRoutes";

// Profile Components
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileTabs from "../../components/profile/ProfileTabs";
import ConnectionsModal from "../../components/profile/ConnectionsModal";
import AboutTab from "../../components/profile/tabs/AboutTab";
import InterestsTab from "../../components/profile/tabs/InterestsTab";
import SocialTab from "../../components/profile/tabs/SocialTab";
import GalleryTab from "../../components/profile/tabs/GalleryTab";

// Constants
const ADMIN_IDS = ['hDn74gYZCdZu0efr3jMGTIWGrRQ2', 'WhNhj8WPUpbomevJQ7j69rnLbDp2'];
const ANIMATION_CONFIG = {
  duration: 800,
  tension: 50,
  friction: 7,
  bounciness: 8,
};

// Types
interface UserData {
  name: string;
  dateOfBirth?: Date;
  age?: string;
  pronouns?: string;
  bio?: string;
  profilePicture?: string;
  galleryImages?: string[];
  moodStatus?: string;
  languages: string[];
  interests: string[];
  goals: string[];
  travelHistory?: any[];
  createdAt?: any;
  lastLogin?: any;
  socialMedia?: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  airportCode?: string | null;
  // New fields
  currentCity?: string;
  connectionIntents?: string[];
  personalTags?: string[];
  availableNow?: boolean;
  availabilitySchedule?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
  groupAffiliations?: string[];
  lastKnownCoordinates?: {
    latitude: number;
    longitude: number;
  };
  preferredMeetupRadius?: number;
  linkRatingScore?: {
    average: number;
    count: number;
  };
  reputationTags?: string[];
  eventPreferences?: {
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
  };
}

interface Connection {
  id: string;
  otherUser: {
    id: string;
    name: string;
    profilePicture: string;
    airportCode: string | null;
  };
  createdAt?: any;
}

// Helper functions
const convertToUserData = (data: DocumentData): UserData => {
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
    galleryImages: data.galleryImages || [],
    moodStatus: data.moodStatus,
    languages: data.languages || [],
    interests: data.interests || [],
    goals: data.goals || [],
    travelHistory: data.travelHistory,
    createdAt: data.createdAt,
    lastLogin: data.lastLogin,
    socialMedia: data.socialMedia || {},
    airportCode: data.airportCode || null,
    currentCity: data.currentCity,
    connectionIntents: data.connectionIntents,
    personalTags: data.personalTags,
    availableNow: data.availableNow,
    availabilitySchedule: data.availabilitySchedule,
    groupAffiliations: data.groupAffiliations,
    lastKnownCoordinates: data.lastKnownCoordinates,
    preferredMeetupRadius: data.preferredMeetupRadius,
    linkRatingScore: data.linkRatingScore,
    reputationTags: data.reputationTags,
    eventPreferences: data.eventPreferences,
  };
};

// Helper function to extract username from social media URLs
const extractUsername = (url: string, platform: string) => {
  if (!url) return "";
  
  // If it's already just a username (no http/https), return it
  if (!url.includes('http')) {
    return url.replace(/^@/, ''); // Remove @ if present
  }
  
  try {
    // Handle malformed double URLs (like "https://www.instagram.com/https://www.instagram.com/username//")
    if (platform === 'instagram' && url.includes('instagram.com/instagram.com/')) {
      const parts = url.split('instagram.com/');
      if (parts.length >= 3) {
        const username = parts[2].replace(/\/+$/, ''); // Remove trailing slashes
        return username;
      }
    }
    
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

// Helper function to format military time to AM/PM format
const formatTimeToAMPM = (militaryTime: string): string => {
  if (!militaryTime || militaryTime === "00:00") return "12:00 AM";
  
  const [hours, minutes] = militaryTime.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper function to check if user is currently available based on schedule
const isUserCurrentlyAvailable = (availabilitySchedule: any): boolean => {
  if (!availabilitySchedule) return false;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const todaySchedule = availabilitySchedule[currentDay];
  if (!todaySchedule) return false;
  
  const { start, end } = todaySchedule;
  
  // Check for invalid times
  if (!start || !end) {
    return false;
  }
  
  // Check if start and end are the same (no availability window)
  if (start === end) return false;
  
  // Special case: "00:00" to "23:59" means all day availability
  if ((start === '00:00' || start === '0:00') && (end === '23:59' || end === '23:59')) {
    return true;
  }
  
  // Check for invalid zero times (but not the all-day case above)
  if ((start === '0:00' || start === '00:00') && (end !== '23:59' && end !== '23:59')) {
    return false;
  }
  if ((end === '0:00' || end === '00:00') && (start !== '23:59' && start !== '23:59')) {
    return false;
  }
  
  // Normalize time formats to ensure consistent comparison
  const normalizeTime = (timeStr: string): string => {
    // Handle both "H:MM" and "HH:MM" formats
    const [hours, minutes] = timeStr.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  const normalizedStart = normalizeTime(start);
  const normalizedEnd = normalizeTime(end);
  const normalizedCurrent = normalizeTime(currentTime);
  
  // Handle cases where availability spans midnight (e.g., 22:00 to 02:00)
  if (normalizedStart > normalizedEnd) {
    // Availability spans midnight, so check if current time is after start OR before end
    return normalizedCurrent >= normalizedStart || normalizedCurrent <= normalizedEnd;
  } else {
    // Normal case: availability within same day
    return normalizedCurrent >= normalizedStart && normalizedCurrent <= normalizedEnd;
  }
};

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

    const notificationPromises = adminTokens
      .filter(token => token)
      .map(token => sendPushNotification(token!, reportedUserName));

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

// Memoized components
const TripGallery = React.memo(({ trip, onPhotoPress, theme }: { 
  trip: any; 
  onPhotoPress: (photos: string[], index: number) => void; 
  theme: "light" | "dark" 
}) => {
  if (typeof trip === 'string') {
    return null;
  }

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
});

const SkeletonLoader = React.memo(() => {
  const skeletonAnim = useRef(new Animated.Value(0)).current;

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

  return (
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
});

const ProfileSection = React.memo(({ icon, title, content, cardStyle }: any) => (
  <TouchableOpacity style={[styles.card, cardStyle]} activeOpacity={0.9}>
    <MaterialIcons name={icon} size={20} color="#e4fbfe" style={styles.cardIcon} />
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardContent}>{content}</Text>
  </TouchableOpacity>
));

// Main Profile Component
const Profile = () => {
  // State management
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<"connected" | "pending" | "not_connected">("not_connected");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [profileViews, setProfileViews] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPrompts, setShowPrompts] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<UserData | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [customStatus, setCustomStatus] = useState("");
  const [updatingMood, setUpdatingMood] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [loadingGalleryImages, setLoadingGalleryImages] = useState<Set<number>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);

  // Refs and animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const sectionsFadeAnim = useRef(new Animated.Value(0)).current;
  const socialFadeAnim = useRef(new Animated.Value(0)).current;
  const promptAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.98)).current;
  const tabFadeAnim = useRef(new Animated.Value(1)).current;
  const tabScaleAnim = useRef(new Animated.Value(1)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const modalOpacityAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(1)).current;
  const loadingRotationAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(0)).current;

  // Hooks
  const { user, userId } = useAuth();
  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useExpoRouter();
  const insets = useSafeAreaInsets();
  const { addChat, addMessage, getExistingChat } = useChats();
  const { theme: rawTheme } = React.useContext(ThemeContext);
  const theme = rawTheme || "dark"; // Default to dark theme if undefined
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const notificationCount = useNotificationCount(userId);

  // Memoized values
  const isOwnProfile = useMemo(() => id === authUser?.uid, [id, authUser?.uid]);
  const canEdit = useMemo(() => isOwnProfile, [isOwnProfile]);
  const topBarHeight = useMemo(() => 50 + insets.top, [insets.top]);

  // Color interpolations
  const backgroundColor = useMemo(() => backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f8f9fa', '#000000'],
    extrapolate: 'clamp'
  }), [backgroundAnim]);

  const textColor = useMemo(() => textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0F172A', '#ffffff'],
    extrapolate: 'clamp'
  }), [textAnim]);

  const secondaryTextColor = useMemo(() => textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#666666', '#999999'],
    extrapolate: 'clamp'
  }), [textAnim]);

  // Utility functions
  const getDynamicFontSize = useCallback((text: string, baseSize: number = 12) => {
    const connectionCount = connections.length;
    const textLength = text.length;
    
    if (connectionCount >= 1000) return baseSize - 6;
    if (connectionCount >= 500) return baseSize - 5;
    if (connectionCount >= 100) return baseSize - 4;
    if (connectionCount >= 50) return baseSize - 3;
    if (connectionCount >= 20) return baseSize - 2;
    if (connectionCount >= 10) return baseSize - 1;
    
    if (textLength >= 10) return baseSize - 2;
    if (textLength >= 9) return baseSize - 1;
    
    return baseSize;
  }, [connections.length]);

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS !== 'web') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }
  }, []);

  const formatLastSeen = useCallback((date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, []);

  // Helper functions to find shared items
  const getSharedConnectionIntents = useCallback(() => {
    if (!userData?.connectionIntents || !currentUserData?.connectionIntents || isOwnProfile) {
      return [];
    }
    return userData.connectionIntents.filter(intent => 
      currentUserData.connectionIntents!.includes(intent)
    );
  }, [userData?.connectionIntents, currentUserData?.connectionIntents, isOwnProfile]);

  const getSharedPersonalTags = useCallback(() => {
    if (!userData?.personalTags || !currentUserData?.personalTags || isOwnProfile) {
      return [];
    }
    return userData.personalTags.filter(tag => 
      currentUserData.personalTags!.includes(tag)
    );
  }, [userData?.personalTags, currentUserData?.personalTags, isOwnProfile]);

  const getSharedEventPreferences = useCallback(() => {
    if (!userData?.eventPreferences || !currentUserData?.eventPreferences || isOwnProfile) {
      return [];
    }
    
    const sharedPreferences: string[] = [];
    const userPrefs = userData.eventPreferences;
    const currentPrefs = currentUserData.eventPreferences;
    
    if (userPrefs.likesBars && currentPrefs.likesBars) sharedPreferences.push('Enjoys bar meetups');
    if (userPrefs.prefersSmallGroups && currentPrefs.prefersSmallGroups) sharedPreferences.push('Prefers small groups');
    if (userPrefs.prefersWeekendEvents && currentPrefs.prefersWeekendEvents) sharedPreferences.push('Prefers weekend events');
    if (userPrefs.prefersEveningEvents && currentPrefs.prefersEveningEvents) sharedPreferences.push('Prefers evening events');
    if (userPrefs.prefersIndoorVenues && currentPrefs.prefersIndoorVenues) sharedPreferences.push('Prefers indoor venues');
    if (userPrefs.prefersStructuredActivities && currentPrefs.prefersStructuredActivities) sharedPreferences.push('Prefers structured activities');
    if (userPrefs.prefersSpontaneousPlans && currentPrefs.prefersSpontaneousPlans) sharedPreferences.push('Prefers spontaneous plans');
    if (userPrefs.prefersLocalMeetups && currentPrefs.prefersLocalMeetups) sharedPreferences.push('Prefers local meetups');
    if (userPrefs.prefersTravelEvents && currentPrefs.prefersTravelEvents) sharedPreferences.push('Prefers travel events');
    if (userPrefs.prefersQuietEnvironments && currentPrefs.prefersQuietEnvironments) sharedPreferences.push('Prefers quiet environments');
    if (userPrefs.prefersActiveLifestyles && currentPrefs.prefersActiveLifestyles) sharedPreferences.push('Prefers active lifestyles');
    if (userPrefs.prefersIntellectualDiscussions && currentPrefs.prefersIntellectualDiscussions) sharedPreferences.push('Prefers intellectual discussions');
    
    return sharedPreferences;
  }, [userData?.eventPreferences, currentUserData?.eventPreferences, isOwnProfile]);

  const isSharedItem = useCallback((item: string, type: 'connectionIntents' | 'personalTags' | 'eventPreferences') => {
    if (isOwnProfile) return false;
    
    if (type === 'connectionIntents') {
      return getSharedConnectionIntents().includes(item);
    } else if (type === 'personalTags') {
      return getSharedPersonalTags().includes(item);
    } else {
      return getSharedEventPreferences().includes(item);
    }
  }, [isOwnProfile, getSharedConnectionIntents, getSharedPersonalTags, getSharedEventPreferences]);

  // Data fetching functions
  const fetchUserData = useCallback(async () => {
    if (!userId || !id) return;
    
    // Don't fetch if user is not authenticated (e.g., during logout)
    if (!authUser) {
      return;
    }
    
    setIsLoadingProfile(true);
    setIsLoadingContent(true);
    
    try {
      const userDocRef = doc(db, "users", id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = convertToUserData(userDoc.data());
        setUserData(userData);
        
        // Enhanced animation sequence
        Animated.parallel([
          Animated.sequence([
            Animated.timing(headerFadeAnim, {
              toValue: 1,
              duration: ANIMATION_CONFIG.duration,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              tension: ANIMATION_CONFIG.tension,
              friction: ANIMATION_CONFIG.friction,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(sectionsFadeAnim, {
              toValue: 1,
              duration: ANIMATION_CONFIG.duration,
              useNativeDriver: true,
            }),
            Animated.spring(cardScaleAnim, {
              toValue: 1,
              tension: ANIMATION_CONFIG.tension,
              friction: ANIMATION_CONFIG.friction,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(socialFadeAnim, {
            toValue: 1,
            duration: ANIMATION_CONFIG.duration,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setIsLoadingProfile(false);
          setTimeout(() => {
            setIsLoadingContent(false);
          }, 300);
        });
      } else {
        // Only show error if user is still authenticated
        if (authUser) {
          setError("No user data found.");
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Only show error if user is still authenticated
      if (authUser) {
        setError("Failed to fetch user data.");
      }
    } finally {
      setIsLoadingProfile(false);
      setIsLoadingContent(false);
    }
  }, [userId, id, authUser, headerFadeAnim, scaleAnim, sectionsFadeAnim, cardScaleAnim, socialFadeAnim]);

  const fetchCurrentUserData = useCallback(async () => {
    if (!authUser?.uid || isOwnProfile) return;
    
    try {
      const currentUserDocRef = doc(db, "users", authUser.uid);
      const currentUserDoc = await getDoc(currentUserDocRef);
      
      if (currentUserDoc.exists()) {
        const currentUserData = convertToUserData(currentUserDoc.data());
        setCurrentUserData(currentUserData);
      }
    } catch (error) {
      console.error("Error fetching current user data:", error);
    }
  }, [authUser?.uid, isOwnProfile]);

  const checkConnectionStatus = useCallback(async () => {
    if (!authUser || !id) return;
    
    try {
      const connectionsRef = collection(db, "connections");
      const q = query(
        connectionsRef,
        where("participants", "array-contains", authUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
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
  }, [authUser, id]);

  const fetchConnections = useCallback(async () => {
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
                profilePicture: userData?.profilePicture || "https://via.placeholder.com/150",
                airportCode: userData?.airportCode || null
              }
            };
          }
          return null;
        })
      );
      
      setConnections(connectionsData.filter(Boolean) as Connection[]);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoadingConnections(false);
    }
  }, [id]);

  // Animation functions
  const startLoadingAnimation = useCallback(() => {
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
  }, [buttonScaleAnim, buttonOpacityAnim, loadingRotationAnim]);

  const stopLoadingAnimation = useCallback(() => {
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
  }, [buttonScaleAnim, buttonOpacityAnim, loadingRotationAnim]);

  const animateModal = useCallback((show: boolean) => {
    Animated.parallel([
      Animated.spring(modalScaleAnim, {
        toValue: show ? 1 : 0.9,
        useNativeDriver: true,
        tension: ANIMATION_CONFIG.tension,
        friction: ANIMATION_CONFIG.friction,
      }),
      Animated.timing(modalOpacityAnim, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [modalScaleAnim, modalOpacityAnim]);

  const handleTabChange = useCallback((tab: string) => {
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
      Animated.parallel([
        Animated.timing(tabFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(tabScaleAnim, {
          toValue: 1,
          tension: ANIMATION_CONFIG.tension,
          friction: ANIMATION_CONFIG.friction,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [tabFadeAnim, tabScaleAnim]);

  // Event handlers
  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setIsScrolled(offsetY > 20);
  }, []);

  const handlePhotoPress = useCallback((photos: string[], index: number) => {
    setCurrentImages(photos);
    setInitialIndex(index);
    setIsModalVisible(true);
  }, []);

  const handleModalVisibility = useCallback((show: boolean) => {
    setShowConnectionsModal(show);
    animateModal(show);
  }, [animateModal]);

  const toggleStatusSheet = useCallback(() => {
    Animated.spring(sheetAnim, {
      toValue: showStatusSheet ? 0 : 1,
      useNativeDriver: true,
      bounciness: ANIMATION_CONFIG.bounciness,
    }).start();
    setShowStatusSheet(!showStatusSheet);
  }, [showStatusSheet, sheetAnim]);

  const handleShareProfile = useCallback(async () => {
    try {
      triggerHapticFeedback('light');
      
      // Generate shareable URL
      const deepLinkUrl = generateProfileShareUrl(id);
      
      // Create share message
      const shareMessage = `${userData?.name} - Wingman\n${deepLinkUrl}`;
      
      await Share.share({
        message: shareMessage,
        title: `${userData?.name} - Wingman`,
        url: deepLinkUrl, // iOS will use this for deep linking
      });
    } catch (error) {
      console.error('Error sharing profile:', error);
      Alert.alert('Error', 'Failed to share profile. Please try again.');
    }
  }, [userData, id, triggerHapticFeedback]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHapticFeedback('light');
    
    try {
      if (userId && id) {
        setLoading(true);
        setIsLoadingProfile(true);
        setIsLoadingContent(true);
        
        await Promise.all([
          fetchUserData(),
          fetchConnections(),
          checkConnectionStatus()
        ]);
        
        setLoading(false);
        setIsLoadingProfile(false);
        setIsLoadingContent(false);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userId, id, fetchUserData, fetchConnections, checkConnectionStatus, triggerHapticFeedback]);

  // Connection management
  const handleConnect = useCallback(async () => {
    if (!authUser || !id || isProcessing) return;
    
    setIsProcessing(true);
    startLoadingAnimation();

    try {
      console.log('Starting connection process for user:', id);
      
      // Get current user data
      const currentUserRef = doc(db, 'users', authUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      const currentUserData = currentUserDoc.data();
      
      // Create connection document
      const connectionData = {
        connectionType: null,
        createdAt: new Date(),
        initiator: authUser.uid,
        lastMessage: null,
        participants: [authUser.uid, id],
        status: 'pending'
      };
      
      await addDoc(collection(db, 'connections'), connectionData);
      
      // Update user's likedUsers array
      const userRef = doc(db, 'users', authUser.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      // Remove from dislikedUsers if present
      const currentDislikedUsers = userData?.dislikedUsers || [];
      if (currentDislikedUsers.includes(id)) {
        await updateDoc(userRef, {
          dislikedUsers: arrayRemove(id)
        });
      }
      
      // Add to likedUsers
      const currentLikedUsers = userData?.likedUsers || [];
      if (!currentLikedUsers.includes(id)) {
        await updateDoc(userRef, {
          likedUsers: [...currentLikedUsers, id]
        });
      }

      // Create notification for target user
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

      const targetNotifications = targetUserData?.notifications || [];
      await updateDoc(targetUserRef, {
        notifications: [...targetNotifications, notification]
      });

      // Send push notification
      if (targetUserData?.expoPushToken && 
          targetUserData?.notificationPreferences?.notificationsEnabled && 
          targetUserData?.notificationPreferences?.connections) {
        
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

          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify(pushPayload),
          });

          if (!response.ok) {
            console.error('Push notification failed:', response.status);
          } else {
            console.log('Push notification sent successfully');
          }
        } catch (error) {
          console.error('Error sending push notification:', error);
        }
      }
      
      setIsConnected("pending");
    } catch (error) {
      console.error("Error creating connection:", error);
      Alert.alert("Error", "Failed to create connection. Please try again.");
    } finally {
      setIsProcessing(false);
      stopLoadingAnimation();
    }
  }, [authUser, id, isProcessing, startLoadingAnimation, stopLoadingAnimation]);

  const handleRemoveConnection = useCallback(async () => {
    if (!authUser || !id || isProcessing) return;
    
    Alert.alert(
      "Remove Connection",
      "Are you sure you want to remove this connection?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              // Find and delete connection document
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
                  await deleteDoc(doc.ref);
                  break;
                }
              }

              // Delete associated chat
              if (connectionId) {
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

              // Remove from likedUsers
              const userRef = doc(db, 'users', authUser.uid);
              const userDoc = await getDoc(userRef);
              const userData = userDoc.data();
              
              if (userData?.likedUsers) {
                await updateDoc(userRef, {
                  likedUsers: arrayRemove(id)
                });
              }

              // Remove notification from target user
              const targetUserRef = doc(db, 'users', id);
              const targetUserDoc = await getDoc(targetUserRef);
              const targetUserData = targetUserDoc.data();
              
              if (targetUserData?.notifications) {
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
              Alert.alert("Error", "Failed to remove connection. Please try again.");
            } finally {
              setIsProcessing(false);
            }
          }
        }
      ]
    );
  }, [authUser, id, isProcessing]);

  // Profile management handlers
  const handleProfilePictureUpload = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingImage(true);
        const imageUri = result.assets[0].uri;
        
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const storageRef = ref(storage, `profile_pictures/${id}`);
        await uploadBytes(storageRef, blob);
        
        const downloadURL = await getDownloadURL(storageRef);
        
        const userDocRef = doc(db, "users", id);
        await updateDoc(userDocRef, {
          profilePicture: downloadURL
        });

        setUserData((prev: UserData | null) => {
          if (!prev) return null;
          return {
            ...prev,
            profilePicture: downloadURL
          };
        });

        
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }, [id]);

  const handleGalleryImageUpload = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [1, 1],
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: 10,
      });

      if (!result.canceled && result.assets.length > 0) {
        setUploadingGalleryImage(true);
        
        try {
          const uploadPromises = result.assets.map(async (asset, index) => {
            const imageUri = asset.uri;
            
            const response = await fetch(imageUri);
            if (!response.ok) {
              throw new Error(`Failed to fetch image ${index + 1}`);
            }
            
            const blob = await response.blob();
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const storageRef = ref(storage, `gallery_images/${id}/${timestamp}_${randomId}`);
            
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
          });

          const downloadURLs = await Promise.all(uploadPromises);
          
          const userDocRef = doc(db, "users", id);
          const updatedGallery = [...galleryImages, ...downloadURLs];
          await updateDoc(userDocRef, {
            galleryImages: updatedGallery
          });

          setGalleryImages(updatedGallery);

         
        } catch (uploadError) {
          console.error('Error during upload process:', uploadError);
          Alert.alert(
            'Upload Error', 
            'Some images failed to upload. Please try again with fewer images or check your connection.'
          );
        }
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      Alert.alert('Error', 'Failed to upload images. Please try again.');
    } finally {
      setUploadingGalleryImage(false);
    }
  }, [id, galleryImages]);

  const handleDeleteGalleryImage = useCallback(async (imageIndex: number) => {
    if (!authUser || id !== authUser.uid) return;
    
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo from your gallery?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedGallery = galleryImages.filter((_, index) => index !== imageIndex);
              
              const userDocRef = doc(db, "users", id);
              await updateDoc(userDocRef, {
                galleryImages: updatedGallery
              });

              setGalleryImages(updatedGallery);
              
            } catch (error) {
              console.error('Error deleting gallery image:', error);
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
            }
          }
        }
      ]
    );
  }, [authUser, id, galleryImages]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const isSectionExpanded = useCallback((sectionId: string) => {
    return expandedSections.has(sectionId);
  }, [expandedSections]);

  const shouldShowExpandButton = useCallback((items: any[], maxItems: number = 6) => {
    return items && items.length > maxItems;
  }, []);

  const getVisibleItems = useCallback((items: any[], maxItems: number = 6) => {
    if (!items) return [];
    if (items.length <= maxItems) return items;
    return items.slice(0, maxItems);
  }, []);

  const getHiddenItems = useCallback((items: any[], maxItems: number = 6) => {
    if (!items) return [];
    if (items.length <= maxItems) return [];
    return items.slice(maxItems);
  }, []);

  const handleUpdateMoodStatus = useCallback(async (status: string) => {
    if (!userId) return;
    setUpdatingMood(true);
    try {
      const updatedData = {
        moodStatus: status,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, "users", userId), updatedData);
      
      setUserData((prev: UserData | null) => {
        if (!prev) return null;
        return {
          ...prev,
          moodStatus: status
        };
      });
    } catch (error) {
      console.error("Error updating mood status:", error);
      Alert.alert("Error", "Failed to update mood status. Please try again.");
    } finally {
      setUpdatingMood(false);
    }
  }, [userId]);

  const handleMessageStarter = useCallback(async (message: string) => {
    if (!authUser) return;
    
    try {
      const existingChat = await getExistingChat(authUser.uid, id);
      let chatId;
      
      if (existingChat) {
        chatId = existingChat.id;
      } else {
        const chatData = {
          participants: [authUser.uid, id],
          createdAt: new Date(),
          lastMessage: null,
        };
        
        chatId = await addChat(chatData);
      }

      await addMessage(chatId, {
        content: message,
        date: new Date(),
        sender: authUser.uid,
        receiver: id,
      });

      router.push(`/chat/${chatId}`);
      setShowPrompts(false);
    } catch (error) {
      console.error("Error handling message starter:", error);
      Alert.alert("Error", "Failed to start chat. Please try again.");
    }
  }, [authUser, id, getExistingChat, addChat, addMessage, router]);

  const handleReport = useCallback(() => {
    Alert.alert(
      "Report User",
      "Are you sure you want to report this user?",
      [
        { text: "Cancel", style: "cancel" },
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
  }, [user?.uid, userData, id]);

  const handleBlock = useCallback(() => {
    Alert.alert(
      "Block User",
      "Are you sure you want to block this user? You won't be able to see their profile or receive messages from them.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              if (!authUser || !id) return;

              const authUserRef = doc(db, "users", authUser.uid);
              await updateDoc(authUserRef, {
                blockedUsers: arrayUnion(id)
              });

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
  }, [authUser, id, router]);

  // Tab content rendering
  const renderTabContent = useCallback(() => {
    if (!userData) return null;

    switch (activeTab) {
      case 'about':
        return (
          <AboutTab
            userData={userData}
            theme={theme}
            tabFadeAnim={tabFadeAnim}
            tabScaleAnim={tabScaleAnim}
            isUserCurrentlyAvailable={isUserCurrentlyAvailable}
            formatTimeToAMPM={formatTimeToAMPM}
          />
        );
      case 'interests':
        return (
          <InterestsTab
            userData={userData}
            theme={theme}
            tabFadeAnim={tabFadeAnim}
            tabScaleAnim={tabScaleAnim}
            isOwnProfile={isOwnProfile}
            expandedSections={expandedSections}
            getSharedConnectionIntents={getSharedConnectionIntents}
            getSharedPersonalTags={getSharedPersonalTags}
            getSharedEventPreferences={getSharedEventPreferences}
            isSharedItem={isSharedItem}
            shouldShowExpandButton={shouldShowExpandButton}
            getVisibleItems={getVisibleItems}
            getHiddenItems={getHiddenItems}
            isSectionExpanded={isSectionExpanded}
            toggleSection={toggleSection}
          />
        );
      case 'social':
        return (
          <SocialTab
            userData={userData}
            userId={id}
            theme={theme}
            tabFadeAnim={tabFadeAnim}
            tabScaleAnim={tabScaleAnim}
            extractUsername={extractUsername}
          />
        );
      case 'gallery':
        return (
          <GalleryTab
            galleryImages={galleryImages}
            authUser={authUser}
            id={id}
            theme={theme}
            tabFadeAnim={tabFadeAnim}
            tabScaleAnim={tabScaleAnim}
            uploadingGalleryImage={uploadingGalleryImage}
            loadingGalleryImages={loadingGalleryImages}
            onGalleryImageUpload={handleGalleryImageUpload}
            onPhotoPress={handlePhotoPress}
            onDeleteGalleryImage={handleDeleteGalleryImage}
            setLoadingGalleryImages={setLoadingGalleryImages}
          />
        );
      default:
        return null;
    }
  }, [userData, activeTab, theme, galleryImages, uploadingGalleryImage, loadingGalleryImages, authUser, id, expandedSections]);

  // Effects
  useFocusEffect(
    React.useCallback(() => {
      if (userId && id) {
        setLoading(true);
        fetchUserData();
        fetchCurrentUserData();
      }
    }, [userId, id, fetchUserData, fetchCurrentUserData])
  );

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
  }, [router]);

  useEffect(() => {
    if (userId && id) {
      fetchUserData();
      fetchCurrentUserData();
    }
  }, [userId, id, fetchUserData, fetchCurrentUserData]);

  useEffect(() => {
    if (authUser && id) {
      checkConnectionStatus();
    }
  }, [authUser, id, checkConnectionStatus]);

  useEffect(() => {
    if (id) {
      fetchConnections();
    }
  }, [id, fetchConnections]);

  // Load gallery images when userData changes
  useEffect(() => {
    if (userData?.galleryImages) {
      setGalleryImages(userData.galleryImages);
    }
  }, [userData?.galleryImages]);

  // Update animations when theme changes
  useEffect(() => {
    Animated.parallel([
      Animated.timing(backgroundAnim, {
        toValue: theme === "light" ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(textAnim, {
        toValue: theme === "light" ? 0 : 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [theme, backgroundAnim, textAnim]);

  // Loading states
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
        
        {/* Top Bar */}
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            {/* Profile Header */}
            <ProfileHeader
              userData={userData}
              authUser={authUser}
              id={id}
              isOwnProfile={isOwnProfile}
              connections={connections}
              isConnected={isConnected}
              isProcessing={isProcessing}
              uploadingImage={uploadingImage}
              theme={theme}
              headerFadeAnim={headerFadeAnim}
              scaleAnim={scaleAnim}
              buttonScaleAnim={buttonScaleAnim}
              buttonOpacityAnim={buttonOpacityAnim}
              loadingRotationAnim={loadingRotationAnim}
              onProfilePictureUpload={handleProfilePictureUpload}
              onMoodStatusPress={toggleStatusSheet}
              onConnectionsPress={() => handleModalVisibility(true)}
              onShareProfile={handleShareProfile}
              onConnect={handleConnect}
              onRemoveConnection={handleRemoveConnection}
              isUserCurrentlyAvailable={isUserCurrentlyAvailable}
            />

            {/* Navigation Tabs */}
            <ProfileTabs
              activeTab={activeTab}
              onTabChange={handleTabChange}
              theme={theme}
              sectionsFadeAnim={sectionsFadeAnim}
              cardScaleAnim={cardScaleAnim}
            />

            {/* Tab Content */}
            {renderTabContent()}

            {/* Action Buttons */}
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

            {/* Footer */}
            <View style={styles.footer}>
              <Image
                source={theme === "light" 
                  ? require('../../../assets/images/splash-icon.png')
                  : require('../../../assets/images/splash-icon-dark.png')
                }
                style={[
                  styles.footerLogo
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

        {/* Floating Action Button */}
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
              style={[styles.editFab, {
                backgroundColor: theme === "light" ? "#37a4c8" : "#000000",
                borderColor: theme === "light" ? "#38a5c9" : "#37a4c8",
              }]}
              activeOpacity={0.7}
              onPress={() => router.push('/profile/editProfile')}
            >
              <MaterialIcons 
                name="edit" 
                size={28} 
                color={theme === "light" ? "#ffffff" : "#37a4c8"} 
              />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* Modals */}
        <ImageViewing
          images={currentImages.map((uri) => ({ uri }))}
          imageIndex={initialIndex}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />

        <ConnectionsModal
          visible={showConnectionsModal}
          connections={connections}
          theme={theme}
          modalOpacityAnim={modalOpacityAnim}
          modalScaleAnim={modalScaleAnim}
          onClose={() => handleModalVisibility(false)}
        />

        {/* Status Sheet */}
        <StatusSheet
          showStatusSheet={showStatusSheet}
          sheetAnim={sheetAnim}
          customStatus={customStatus}
          setCustomStatus={setCustomStatus}
          handleUpdateMoodStatus={handleUpdateMoodStatus}
          toggleStatusSheet={toggleStatusSheet}
        />
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: scaleHeight(-20),
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
    fontSize: scaleFontSize(20),
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.5,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  settingsGradient: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(228, 251, 254, 0.1)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: scaleHeight(160),
    paddingTop: spacing.xl,
  },
  contentContainer: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: scaleHeight(80),
    position: 'relative',
    marginTop: spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  profileImage: {
    width: moderateScale(128),
    height: moderateScale(128),
    borderRadius: moderateScale(64),
    borderWidth: 2,
    borderColor: '#37a4c8',
    backgroundColor: 'rgba(55, 164, 200, 0.05)',
  },
  statusIndicator: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#37a4c8",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  nameText: {
    fontSize: scaleFontSize(isSmallDevice() ? 28 : 32),
    fontWeight: "700",
    marginBottom: spacing.sm,
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: scaleFontSize(isSmallDevice() ? 34 : 38),
  },
  pronounsText: {
    fontSize: scaleFontSize(18),
    fontWeight: "400",
    opacity: 0.6,
    letterSpacing: -0.1,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  ageContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(55, 164, 200, 0.12)",
    height: moderateScale(36),
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: "#37a4c8",
    minWidth: scaleWidth(130),
    justifyContent: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(55, 164, 200, 0.12)",
    height: moderateScale(36),
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: "#37a4c8",
    minWidth: scaleWidth(130),
    justifyContent: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  ageText: {
    fontSize: scaleFontSize(13),
    marginLeft: spacing.xs,
    fontWeight: "600",
    flex: 1,
    textAlign: 'center',
    lineHeight: moderateScale(36),
    letterSpacing: 0.2,
  },
  moodText: {
    fontSize: scaleFontSize(13),
    marginLeft: spacing.xs,
    fontWeight: "600",
    flex: 1,
    textAlign: 'center',
    lineHeight: moderateScale(36),
    letterSpacing: 0.2,
  },
  sectionsContainer: {
    flex: 1,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowRadius: moderateScale(8),
    elevation: 2,
    marginBottom: spacing.lg,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.08,
    overflow: 'hidden',
  },
  aboutCard: {
    marginBottom: spacing.xl,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  gridCard: {
    width: "100%",
    minHeight: scaleHeight(120),
    marginBottom: spacing.md,
  },
  cardIcon: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: "600",
    marginBottom: spacing.lg,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  cardContent: {
    fontSize: scaleFontSize(16),
    lineHeight: scaleFontSize(26),
    letterSpacing: 0.1,
    fontWeight: "400",
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#38a5c9",
    marginBottom: 30,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
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
    marginBottom: 28,
  },
  socialMediaLinks: {
    gap: 16,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.08)',
  },
  socialLinkText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    letterSpacing: 0.3,
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
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
    gap: 6,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(55, 164, 200, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 1 }],
  },
  activeTab: {
    backgroundColor: 'rgba(55, 164, 200, 0.12)',
    borderColor: '#37a4c8',
    shadowColor: '#37a4c8',
    shadowOpacity: 0.15,
    transform: [{ scale: 1.01 }],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  activeTabText: {
    fontWeight: '700',
    color: '#37a4c8',
  },
  tabContent: {
    marginTop: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.06,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  noContentText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  languagesCard: {
    marginTop: 20,
  },
  interestsCard: {
    marginBottom: 20,
  },
  goalsCard: {
    marginBottom: 20,
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
    marginTop: 56,
    marginBottom: 32,
    paddingTop: 32,
    borderTopWidth: 2,
    borderTopColor: 'rgba(55, 164, 200, 0.35)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  footerLogo: {
    width: 95,
    height: 95,
    marginBottom: 0,
  },
  membershipText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  actionButtonsContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
    gap: 16,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 2,
    gap: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.08)',
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  blockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 2,
    gap: 12,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.08)',
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    width: '100%',
    alignSelf: 'center',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 60,
    height: 44,
    transform: [{ scale: 1 }],
  },
  statusButtonText: {
    fontWeight: '700',
    marginLeft: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontSize: 14,
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
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOpacity: 0.12,
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
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
    marginLeft: 10,
  },
  connectionItemType: {
    fontSize: 14,
    marginLeft: 10,
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
    marginRight: 6,
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
  separatorGradient: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  nameSeparator: {
    width: '60%',
    height: 2,
    borderRadius: 1,
    marginBottom: 20,
    marginTop: 4,
    alignSelf: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
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
    minWidth: 120,
    paddingHorizontal: 20,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  statsCard: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOpacity: 0.12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  membershipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  connectionCountButton: {
    minWidth: 110,
    paddingHorizontal: 20,
  },
  connectionCountText: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 6,
  },
  shareButton: {
    minWidth: 100,
    paddingHorizontal: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  moodContainerUnderName: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(55, 164, 200, 0.12)",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#37a4c8",
    justifyContent: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  moodTextUnderName: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "600",
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  ageTextUnderName: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: 'center',
    letterSpacing: 0.3,
    opacity: 0.8,
  },
  locationCard: {
    marginTop: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  meetupRadiusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 0,
  },
  availabilityCard: {
    marginTop: 20,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectionIntentsCard: {
    marginBottom: 20,
  },
  cardSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  intentTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personalTagsCard: {
    marginBottom: 20,
  },
  traitTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupsCard: {
    marginBottom: 20,
  },
  groupTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reputationCard: {
    marginBottom: 20,
  },
  reputationTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventPreferencesCard: {
    marginTop: 20,
  },
  preferencesContainer: {
    gap: 12,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  preferenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  ratingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  meetupRadiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  scheduleContainer: {
    marginTop: 16,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  scheduleItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  scheduleDay: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  intentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  interestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 'auto',
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.3)',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
    marginTop: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  galleryCard: {
    marginBottom: 20,
    overflow: 'hidden',
    width: '100%',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  galleryCount: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
    opacity: 0.7,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
    minWidth: 70,
    maxWidth: 100,
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addPhotoText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 0,
    width: '100%',
  },
  galleryImageContainer: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    marginBottom: 8,
    position: 'relative',
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    minWidth: 0,
    maxWidth: '48%',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  emptyGalleryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyGalleryText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyGallerySubtext: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  galleryImageTouchable: {
    flex: 1,
    position: 'relative',
  },
  deleteImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  traitHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  preferencesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  groupsHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  reputationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  verticalTagsContainer: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  verticalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowOpacity: 0.12,
  },
  verticalTagText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
  },
  sharedItemsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  sharedItemsText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sharedStar: {
    marginLeft: 4,
  },
});

export default Profile;