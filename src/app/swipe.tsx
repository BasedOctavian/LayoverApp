import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5, Feather } from "@expo/vector-icons";
import useUsers from "./../hooks/useUsers";
import { arrayUnion, doc, onSnapshot, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import useAuth from "../hooks/auth";
import { router } from "expo-router";
import { db } from "../../config/firebaseConfig";
import { collection, addDoc, query, where, getDocs, limit, startAfter } from "firebase/firestore";
import useChats from "../hooks/useChats";
import LoadingScreen from "../components/LoadingScreen";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
  useAnimatedReaction,
  withTiming,
  FadeIn,
  FadeOut,
  Easing,
  withRepeat,
} from "react-native-reanimated";
import { ThemeContext } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import useNotificationCount from "../hooks/useNotificationCount";
import UserAvatar from "../components/UserAvatar";

interface TravelHistory {
  id: string;
  name: string;
  photos?: string[];
}

interface Notification {
  id: string;
  title: string;
  body: string;
  data: {
    type: 'match';
    matchedUserId: string;
    matchedUserName: string;
  };
  timestamp: any;
  read: boolean;
}

interface User {
  id: string;
  name: string;
  age?: number;
  profilePicture?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  goals?: string[];
  travelHistory?: TravelHistory[];
  moodStatus?: string;
  likedUsers?: string[];
  dislikedUsers?: string[];
  airportCode?: string;
  lastLogin?: any; // Firestore Timestamp
  notifications?: Notification[];
  blockedUsers?: string[];
  hasMeBlocked?: string[];
  availabilitySchedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
  // New profile fields
  currentCity?: string;
  connectionIntents?: string[];
  personalTags?: string[];
  availableNow?: boolean;
  groupAffiliations?: string[];
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
  lastKnownCoordinates?: {
    latitude: number;
    longitude: number;
  }; // Location data for proximity calculation
}

interface Connection {
  user1: string;
  user2: string;
}

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.55;
const IMAGE_HEIGHT = CARD_HEIGHT * 0.54;



// MemoizedDataToggle component removed - no longer needed

// MemoizedNavigationButtons component removed - no longer needed

// DataModeToggle component removed - no longer needed

// LoadingCard component removed - no longer needed

// SwipeCard component removed - replaced with vertical scroll interface
// SwipeCard component variables and effects removed

// SwipeCard component body completely removed

const Swipe = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [authUserData, setAuthUserData] = useState<User | null>(null);
  const { getUsers, updateUser, loading, error } = useUsers();
  const { user } = useAuth();
  const { addMessage, getExistingChat, addChat } = useChats();
  const currentUserUID = user?.uid || "some-uid";
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const [showQuickMessage, setShowQuickMessage] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  // Removed unused buttonScale
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Removed unused loading states
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { theme: colorScheme } = React.useContext(ThemeContext);
  const theme = colorScheme || "light"; // Provide default value
  const [showMessageOptions, setShowMessageOptions] = useState(false);

  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

  // Animation values for fade in
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);

  // Handle fade in animation when content is ready
  useEffect(() => {
    if (!isLoadingUsers) {
      fadeAnim.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
      scaleAnim.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isLoadingUsers]);

  // Remove gesture-based swiping - replaced with button-based actions

  // Remove unused animation styles - replaced with simple button actions

  const presetMessages = [
    "Hey! Great to match with you! 👋",
    "Would love to chat more! 💬",
    "Let's connect! ✨",
  ];

  const sendQuickMessage = async (message: string, userId: string) => {
    try {
      // Check if a chat already exists with this user
      let existingChatId = chatId;
      
      if (!existingChatId) {
        // Create a new chat if one doesn't exist
        const chatData = {
          participants: [currentUserUID, userId],
          createdAt: new Date(),
          lastMessage: null,
        };
        
        const chatsCollection = collection(db, "chats");
        const docRef = await addDoc(chatsCollection, chatData);
        existingChatId = docRef.id;
        setChatId(docRef.id);
      }
      
      // Send the message
      await addMessage(existingChatId, {
        content: message,
        date: new Date(),
        sender: currentUserUID,
        receiver: userId,
      });
      
      Alert.alert("Message sent!", "Check your chats to continue the conversation.");
      setShowMessageOptions(false);
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  // Helper functions to find shared items
  const getSharedConnectionIntents = useCallback((user: User) => {
    if (!user.connectionIntents || !authUserData?.connectionIntents) {
      return [];
    }
    return user.connectionIntents.filter(intent => 
      authUserData.connectionIntents!.includes(intent)
    );
  }, [authUserData?.connectionIntents]);

  const getSharedPersonalTags = useCallback((user: User) => {
    if (!user.personalTags || !authUserData?.personalTags) {
      return [];
    }
    return user.personalTags.filter(tag => 
      authUserData.personalTags!.includes(tag)
    );
  }, [authUserData?.personalTags]);

  const getSharedEventPreferences = useCallback((user: User) => {
    if (!user.eventPreferences || !authUserData?.eventPreferences) {
      return [];
    }
    
    const sharedPreferences: string[] = [];
    const userPrefs = user.eventPreferences;
    const authPrefs = authUserData.eventPreferences;
    
    if (userPrefs.likesBars && authPrefs.likesBars) sharedPreferences.push('Enjoys bar meetups');
    if (userPrefs.prefersSmallGroups && authPrefs.prefersSmallGroups) sharedPreferences.push('Prefers small groups');
    if (userPrefs.prefersWeekendEvents && authPrefs.prefersWeekendEvents) sharedPreferences.push('Prefers weekend events');
    if (userPrefs.prefersEveningEvents && authPrefs.prefersEveningEvents) sharedPreferences.push('Prefers evening events');
    if (userPrefs.prefersIndoorVenues && authPrefs.prefersIndoorVenues) sharedPreferences.push('Prefers indoor venues');
    if (userPrefs.prefersStructuredActivities && authPrefs.prefersStructuredActivities) sharedPreferences.push('Prefers structured activities');
    if (userPrefs.prefersSpontaneousPlans && authPrefs.prefersSpontaneousPlans) sharedPreferences.push('Prefers spontaneous plans');
    if (userPrefs.prefersLocalMeetups && authPrefs.prefersLocalMeetups) sharedPreferences.push('Prefers local meetups');
    if (userPrefs.prefersTravelEvents && authPrefs.prefersTravelEvents) sharedPreferences.push('Prefers travel events');
    if (userPrefs.prefersQuietEnvironments && authPrefs.prefersQuietEnvironments) sharedPreferences.push('Prefers quiet environments');
    if (userPrefs.prefersActiveLifestyles && authPrefs.prefersActiveLifestyles) sharedPreferences.push('Prefers active lifestyles');
    if (userPrefs.prefersIntellectualDiscussions && authPrefs.prefersIntellectualDiscussions) sharedPreferences.push('Prefers intellectual discussions');
    
    return sharedPreferences;
  }, [authUserData?.eventPreferences]);

  const isSharedItem = useCallback((item: string, type: 'connectionIntents' | 'personalTags' | 'eventPreferences', user: User) => {
    if (type === 'connectionIntents') {
      return getSharedConnectionIntents(user).includes(item);
    } else if (type === 'personalTags') {
      return getSharedPersonalTags(user).includes(item);
    } else {
      return getSharedEventPreferences(user).includes(item);
    }
  }, [getSharedConnectionIntents, getSharedPersonalTags, getSharedEventPreferences]);

  const sendMatchNotification = async (matchedUserId: string, matchedUserName: string) => {
    try {
      console.log('=== Starting Match Notification Process ===');
      console.log('Target User:', {
        id: matchedUserId,
        name: matchedUserName
      });
      
      // Get matched user's data
      const matchedUserDoc = await getDoc(doc(db, 'users', matchedUserId));
      if (!matchedUserDoc.exists()) {
        console.log('❌ Matched user document not found:', matchedUserId);
        return;
      }

      const matchedUserData = matchedUserDoc.data();
      console.log('📄 Matched user data retrieved:', {
        hasPushToken: !!matchedUserData?.expoPushToken,
        pushToken: matchedUserData?.expoPushToken, // Log the actual token
        notificationPreferences: matchedUserData?.notificationPreferences,
        currentNotificationsCount: matchedUserData?.notifications?.length || 0
      });

      // Get current user's name
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserUID));
      if (!currentUserDoc.exists()) {
        console.log('❌ Current user document not found:', currentUserUID);
        return;
      }
      
      const currentUserName = currentUserDoc.data()?.name || 'Someone';
      console.log('👤 Current user info:', {
        id: currentUserUID,
        name: currentUserName
      });

      // Create notification for the swiped user
      const notification = {
        id: Date.now().toString(),
        title: "New Connection Request",
        body: `${currentUserName} wants to connect with you!`,
        data: {
          type: 'connection',
          matchedUserId: currentUserUID,
          matchedUserName: currentUserName
        },
        timestamp: new Date(),
        read: false
      };

      console.log('📝 Created notification object:', notification);

      // Update swiped user's notifications
      const swipedUserNotifications = matchedUserData?.notifications || [];
      console.log('📊 Current notifications count:', swipedUserNotifications.length);
      
      await updateDoc(doc(db, "users", matchedUserId), {
        notifications: [...swipedUserNotifications, notification]
      });
      console.log('✅ In-app notification added to user document');

      // Debug notification preferences
      console.log('🔍 Checking notification preferences:', {
        hasToken: !!matchedUserData?.expoPushToken,
        token: matchedUserData?.expoPushToken,
        notificationsEnabled: matchedUserData?.notificationPreferences?.notificationsEnabled,
        connectionsEnabled: matchedUserData?.notificationPreferences?.connections,
        fullPreferences: matchedUserData?.notificationPreferences
      });

      // Send push notification if user has token and notifications enabled
      if (matchedUserData?.expoPushToken && 
          matchedUserData?.notificationPreferences?.notificationsEnabled && 
          matchedUserData?.notificationPreferences?.connections) {
        
        console.log('📱 Push notification conditions met:', {
          hasToken: true,
          token: matchedUserData.expoPushToken,
          notificationsEnabled: true,
          connectionsEnabled: true
        });

        try {
          console.log('🚀 Attempting to send push notification to:', {
            token: matchedUserData.expoPushToken,
            name: currentUserName
          });

          const pushPayload = {
            to: matchedUserData.expoPushToken,
            title: "New Connection Request",
            body: `${currentUserName} wants to connect with you!`,
            sound: 'default',
            priority: 'high',
            data: {
              type: 'connection',
              matchedUserId: currentUserUID,
              matchedUserName: currentUserName
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
              receiverId: matchedUserId,
              senderName: currentUserName
            });
          }
        } catch (error: any) {
          console.error('❌ Error sending push notification:', {
            error,
            errorMessage: error.message,
            errorStack: error.stack,
            receiverId: matchedUserId,
            token: matchedUserData.expoPushToken,
            senderName: currentUserName
          });
        }
      } else {
        console.log('ℹ️ Push notification not sent. Reason:', {
          hasToken: !!matchedUserData?.expoPushToken,
          token: matchedUserData?.expoPushToken,
          notificationsEnabled: matchedUserData?.notificationPreferences?.notificationsEnabled,
          connectionsEnabled: matchedUserData?.notificationPreferences?.connections,
          receiverId: matchedUserId,
          receiverName: matchedUserName,
          fullPreferences: matchedUserData?.notificationPreferences
        });
      }

      console.log('=== Match Notification Process Completed ===');

    } catch (error: any) {
      console.error('❌ Error in match notification process:', {
        error,
        errorMessage: error.message,
        errorStack: error.stack,
        matchedUserId,
        currentUserUID
      });
      // Don't throw the error, just log it to prevent app crash
    }
  };

  // Step 5: Set up listener for array updates
  useEffect(() => {
    const userDocRef = doc(db, "users", currentUserUID);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as Omit<User, 'id'>;
        setCurrentUserData({ id: doc.id, ...userData });
      } else {
        console.error("User document not found.");
      }
    }, (err) => {
      console.error("Error listening to user data:", err);
    });

    return () => unsubscribe();
  }, [currentUserUID]);

  // Fetch auth user data
  const fetchAuthUserData = useCallback(async () => {
    if (!currentUserUID) return;
    
    try {
      const authUserDocRef = doc(db, "users", currentUserUID);
      const authUserDoc = await getDoc(authUserDocRef);
      
      if (authUserDoc.exists()) {
        const authUserData = authUserDoc.data() as User;
        setAuthUserData(authUserData);
      }
    } catch (error) {
      console.error("Error fetching auth user data:", error);
    }
  }, [currentUserUID]);

  // Fetch users when currentUserData is available
  useEffect(() => {
    if (currentUserData) {
      fetchUsers();
    }
  }, [currentUserData]);

  // Fetch auth user data on component mount
  useEffect(() => {
    fetchAuthUserData();
  }, [fetchAuthUserData]);

  /** Fetch users and filter based on recent activity and availability */
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      console.log('Starting to fetch users...');

      // Get current user's blocked users
      const currentUserDoc = await doc(db, "users", currentUserUID);
      const currentUserSnapshot = await getDoc(currentUserDoc);
      const currentUserData = currentUserSnapshot.data();
      const blockedUsers = currentUserData?.blockedUsers || [];
      const hasMeBlocked = currentUserData?.hasMeBlocked || [];
      const dislikedUsers = currentUserData?.dislikedUsers || [];
      const likedUsers = currentUserData?.likedUsers || [];
      
      console.log('Current user blocked users:', blockedUsers);
      console.log('Users who blocked current user:', hasMeBlocked);
      console.log('Disliked users:', dislikedUsers);
      console.log('Liked users:', likedUsers);

      // Calculate timestamp for 1 month ago
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      console.log('Filtering users active since:', oneMonthAgo.toISOString());

      // Get current time for availability check
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log('Current day:', currentDay, 'Current time:', currentTime);

      // Get all pending connections for current user
      const connectionsRef = collection(db, "connections");
      const connectionsQuery = query(
        connectionsRef,
        where("participants", "array-contains", currentUserUID)
      );
      const connectionsSnapshot = await getDocs(connectionsQuery);
      const connectedUserIds = new Set<string>();
      
      connectionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUserUID);
        if (otherUserId) {
          connectedUserIds.add(otherUserId);
        }
      });

      console.log('Found connections with users:', Array.from(connectedUserIds));

      // Get all users (removed airport filter)
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      console.log('Total users:', querySnapshot.docs.length);

      // Get all users' documents to check their blocked lists
      const userDocs = await Promise.all(
        querySnapshot.docs.map(doc => getDoc(doc.ref))
      );

      const fetchedUsers = querySnapshot.docs
        .map((doc, index) => {
          const data = doc.data();
          const userDoc = userDocs[index];
          const userData = userDoc.data();
          
          console.log('User data:', {
            id: doc.id,
            name: data.name,
            airportCode: data.airportCode,
            lastLogin: data.lastLogin?.toDate?.() || 'No login time',
            blockedUsers: userData?.blockedUsers || [],
            hasMeBlocked: userData?.hasMeBlocked || []
          });
          
          return {
            id: doc.id,
            ...data,
            blockedUsers: userData?.blockedUsers || [],
            hasMeBlocked: userData?.hasMeBlocked || []
          } as User;
        })
        .filter(user => {
          // First check if this is the current user
          if (user.id === currentUserUID) {
            console.log('Filtering out current user:', user.id);
            return false;
          }

          // Check if user has logged in within the past month
          const lastLogin = user.lastLogin?.toDate?.() || new Date(0);
          const isRecent = lastLogin >= oneMonthAgo;

          // Check if user is available at current time
          const isAvailable = (() => {
            if (!user.availabilitySchedule) {
              console.log('User has no availability schedule:', user.id);
              return false;
            }

            const daySchedule = user.availabilitySchedule[currentDay];
            if (!daySchedule) {
              console.log('User has no schedule for current day:', user.id, currentDay);
              return false;
            }

            const { start, end } = daySchedule;
            if (!start || !end) {
              console.log('User has incomplete schedule for current day:', user.id, currentDay);
              return false;
            }

            // Convert times to comparable format (HH:MM)
            const isCurrentlyAvailable = currentTime >= start && currentTime <= end;
            console.log(`User ${user.id} availability check: ${currentTime} between ${start}-${end} = ${isCurrentlyAvailable}`);
            
            return isCurrentlyAvailable;
          })();

          const isNotConnected = !connectedUserIds.has(user.id);
          const isNotBlocked = !blockedUsers.includes(user.id);
          const hasNotBlockedMe = !hasMeBlocked.includes(user.id);
          const hasNotBlockedCurrentUser = !user.blockedUsers?.includes(currentUserUID);
          const currentUserHasNotBlockedThem = !user.hasMeBlocked?.includes(currentUserUID);
          const isNotDisliked = !dislikedUsers.includes(user.id);
          const isNotLiked = !likedUsers.includes(user.id);
          
          const shouldShow = isRecent && isAvailable && isNotConnected && 
                 isNotBlocked && hasNotBlockedMe && 
                 hasNotBlockedCurrentUser && currentUserHasNotBlockedThem &&
                 isNotDisliked && isNotLiked;

          if (!shouldShow) {
            console.log(`Filtering out user ${user.id}:`, {
              isRecent,
              isAvailable,
              isNotConnected,
              isNotBlocked,
              hasNotBlockedMe,
              hasNotBlockedCurrentUser,
              currentUserHasNotBlockedThem,
              isNotDisliked,
              isNotLiked
            });
          }
          
          return shouldShow;
        });
      
      console.log('Final filtered users count:', fetchedUsers.length);
      console.log('Filtered users:', fetchedUsers.map(u => ({
        id: u.id,
        name: u.name,
        lastLogin: u.lastLogin?.toDate?.() || 'No login time'
      })));
      
      // Sort users by shared interests and proximity
      // Calculate shared interests score for each user
      const getSharedInterestsScore = (user: User) => {
        if (!authUserData) return 0;
        
        const sharedConnectionIntents = getSharedConnectionIntents(user);
        const sharedPersonalTags = getSharedPersonalTags(user);
        const sharedEventPreferences = getSharedEventPreferences(user);
        
        return sharedConnectionIntents.length + sharedPersonalTags.length + sharedEventPreferences.length;
      };
      
      // Calculate proximity score (lower distance = higher score)
      const getProximityScore = (user: User) => {
        if (!authUserData?.lastKnownCoordinates || !user.lastKnownCoordinates) {
          return 0; // No location data, neutral score
        }
        
        const userLat = user.lastKnownCoordinates.latitude;
        const userLng = user.lastKnownCoordinates.longitude;
        const authLat = authUserData.lastKnownCoordinates.latitude;
        const authLng = authUserData.lastKnownCoordinates.longitude;
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = (userLat - authLat) * Math.PI / 180;
        const dLng = (userLng - authLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(authLat * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in kilometers
        
        // Convert distance to score (closer = higher score)
        // Max distance considered: 100km, score ranges from 100 to 0
        return Math.max(0, 100 - distance);
      };
      
      const sortedUsers = fetchedUsers.sort((a, b) => {
        const aSharedScore = getSharedInterestsScore(a);
        const bSharedScore = getSharedInterestsScore(b);
        const aProximityScore = getProximityScore(a);
        const bProximityScore = getProximityScore(b);
        
        // Combined scoring: 70% shared interests, 30% proximity
        const aCombinedScore = (aSharedScore * 0.7) + (aProximityScore * 0.3);
        const bCombinedScore = (bSharedScore * 0.7) + (bProximityScore * 0.3);
        
        // Sort in descending order (highest score first)
        return bCombinedScore - aCombinedScore;
      });
      
      console.log('Sorted users by compatibility:', sortedUsers.map(u => {
        const sharedScore = getSharedInterestsScore(u);
        const proximityScore = getProximityScore(u);
        const combinedScore = (sharedScore * 0.7) + (proximityScore * 0.3);
        return {
          id: u.id,
          name: u.name,
          sharedInterests: sharedScore,
          proximityScore: proximityScore,
          combinedScore: combinedScore
        };
      }));
      
      setUsers(sortedUsers);
      setShowSwiper(fetchedUsers.length > 0);
    } catch (err) {
      console.error("Error fetching users:", err);
      Alert.alert("Error", "Failed to fetch users. Please try again later.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  /** Handle right swipe (like) */
  const onSwipedRight = async (index: number) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    try {
      const swipedUser = users[index];
      const swipedUserUID = swipedUser.id;
      console.log('Processing right swipe for user:', swipedUserUID);

      // Get current user data first
      const currentUserDoc = await getDoc(doc(db, "users", currentUserUID));
      const currentUserData = currentUserDoc.data();

      // Update current user's liked users
      await updateUser(currentUserUID, {
        likedUsers: arrayUnion(swipedUserUID),
      });

      // Check if the other user has already liked us
      const swipedUserDoc = await getDoc(doc(db, "users", swipedUserUID));
      const swipedUserData = swipedUserDoc.data();
      const hasMatched = swipedUserData?.likedUsers?.includes(currentUserUID);

      // Create a pending connection
      const connectionData = {
        participants: [currentUserUID, swipedUserUID],
        createdAt: new Date(),
        status: 'pending',
        initiator: currentUserUID,
        lastMessage: null,
      };
      
      try {
        console.log('Creating pending connection');
        const connectionsCollection = collection(db, "connections");
        await addDoc(connectionsCollection, connectionData);

        // Create notification for the swiped user
        const notification = {
          id: Date.now().toString(),
          title: hasMatched ? "New Match! 🎉" : "New Connection Request",
          body: hasMatched 
            ? `${currentUserData?.name || 'Someone'} matched with you!`
            : `${currentUserData?.name || 'Someone'} wants to connect with you!`,
          data: {
            type: hasMatched ? 'match' : 'connection',
            matchedUserId: currentUserUID,
            matchedUserName: currentUserData?.name
          },
          timestamp: new Date(),
          read: false
        };

        // Update swiped user's notifications
        const swipedUserNotifications = swipedUserData?.notifications || [];
        await updateDoc(doc(db, "users", swipedUserUID), {
          notifications: [...swipedUserNotifications, notification]
        });

        // Send push notification for both matches and connection requests
        console.log('Sending push notification for:', hasMatched ? 'match' : 'connection request');
        if (swipedUserData?.expoPushToken && 
            swipedUserData?.notificationPreferences?.notificationsEnabled && 
            swipedUserData?.notificationPreferences?.connections) {
          
          console.log('📱 Push notification conditions met:', {
            hasToken: true,
            token: swipedUserData.expoPushToken,
            notificationsEnabled: true,
            connectionsEnabled: true
          });

          try {
            const pushPayload = {
              to: swipedUserData.expoPushToken,
              title: hasMatched ? "New Match! 🎉" : "New Connection Request",
              body: hasMatched 
                ? `${currentUserData?.name || 'Someone'} matched with you!`
                : `${currentUserData?.name || 'Someone'} wants to connect with you!`,
              sound: 'default',
              priority: 'high',
              data: {
                type: hasMatched ? 'match' : 'connection',
                matchedUserId: currentUserUID,
                matchedUserName: currentUserData?.name
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
                receiverId: swipedUserUID,
                senderName: currentUserData?.name
              });
            }
          } catch (error: any) {
            console.error('❌ Error sending push notification:', {
              error,
              errorMessage: error.message,
              errorStack: error.stack,
              receiverId: swipedUserUID,
              token: swipedUserData.expoPushToken,
              senderName: currentUserData?.name
            });
          }
        } else {
          console.log('ℹ️ Push notification not sent. Reason:', {
            hasToken: !!swipedUserData?.expoPushToken,
            token: swipedUserData?.expoPushToken,
            notificationsEnabled: swipedUserData?.notificationPreferences?.notificationsEnabled,
            connectionsEnabled: swipedUserData?.notificationPreferences?.connections,
            receiverId: swipedUserUID,
            receiverName: swipedUser.name,
            fullPreferences: swipedUserData?.notificationPreferences
          });
        }

        // If it's a match, create notification for current user
        if (hasMatched) {
          const currentUserNotifications = currentUserData?.notifications || [];
          await updateDoc(doc(db, "users", currentUserUID), {
            notifications: [...currentUserNotifications, {
              id: Date.now().toString(),
              title: "New Match! 🎉",
              body: `You matched with ${swipedUser.name}!`,
              data: {
                type: 'match',
                matchedUserId: swipedUserUID,
                matchedUserName: swipedUser.name
              },
              timestamp: new Date(),
              read: false
            }]
          });
        }
        
      } catch (error) {
        console.error("Error creating pending connection:", error);
      }
    } catch (err) {
      console.error("Error processing right swipe:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Handle left swipe (dislike) */
  const onSwipedLeft = async (index: number) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    try {
      const swipedUser = users[index];
      const swipedUserUID = swipedUser.id;

      await updateUser(currentUserUID, {
        dislikedUsers: arrayUnion(swipedUserUID),
      });
    } catch (err) {
      console.error("Error processing left swipe:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Handle showing message options */
  const handleShowMessageOptions = (user: User) => {
    setSelectedUser(user);
    setShowMessageOptions(true);
  };

    // renderCard function completely removed

  // Removed unused buttonStyle

  const resetSwipeHistory = async () => {
    try {
      // Show confirmation dialog
      Alert.alert(
        "Clear Disliked History",
        "This will clear your disliked users history, allowing you to see them again. Your connections and liked users will remain unchanged.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Clear History",
            style: "destructive",
            onPress: async () => {
              try {
                // Update user document to clear only disliked users array
                await updateUser(currentUserUID, {
                  dislikedUsers: []
                });
                
                // Refresh the users list
                await fetchUsers();
                
                Alert.alert("Success", "Your disliked history has been cleared!");
              } catch (error) {
                console.error("Error clearing history:", error);
                Alert.alert("Error", "Failed to clear history. Please try again.");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error in reset confirmation:", error);
    }
  };

  // Simplified animated styles for fade in
  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }]
  }));

  /** Loading state */
  if (loading || isLoadingUsers) {
    return <LoadingScreen />;
  }

  /** Error state */
  if (error) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        style={styles.loadingContainer}
      >
        <SafeAreaWrapper edges={["bottom"]}>
          <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
            <View style={styles.stateContainer}>
              <Text style={[styles.errorText, { color: theme === "light" ? "#FF3B30" : "#FF3B30" }]}>{error}</Text>
            </View>
          </LinearGradient>
        </SafeAreaWrapper>
      </Animated.View>
    );
  }

  /** Main Vertical Scroll view */
  return (
    <View style={{ flex: 1 }}>
      <TopBar onProfilePress={() => router.push(`/profile/${currentUserUID}`)} notificationCount={notificationCount} />
      <SafeAreaWrapper edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
          {users.length > 0 ? (
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={true}
              decelerationRate="fast"
            >
              {/* Header Section */}
              <Animated.View 
                entering={FadeIn.duration(600).easing(Easing.out(Easing.cubic))}
                style={styles.headerSection}
              >
                <Text style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                  Connect with Others
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  {users.length} {users.length === 1 ? 'person' : 'people'} available now
                </Text>
              </Animated.View>

              {users.map((user, index) => (
                <Animated.View 
                  key={user.id}
                  entering={FadeIn.duration(400).delay(index * 100).easing(Easing.out(Easing.cubic))}
                  style={styles.verticalCard}
                >
                  <View style={[styles.cardContainer, { 
                    backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                  }]}>
                    {/* Profile Image Section */}
                    <View style={styles.profileImageSection}>
                      <View style={styles.profileImageContainer}>
                        <UserAvatar
                          user={user}
                          size={120}
                          style={styles.profileImage}
                        />
                        {/* Status indicator ring */}
                        <View style={[styles.statusRing, { 
                          borderColor: user.availableNow ? "#37a4c8" : "rgba(55, 164, 200, 0.3)"
                        }]} />
                      </View>
                    </View>

                    {/* Content Section */}
                    <View style={styles.contentSection}>
                      {/* Header with Name and Age */}
                      <View style={styles.userHeader}>
                        <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                          {user.name}
                        </Text>
                        <Text style={[styles.userAge, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          {user.age}
                        </Text>
                      </View>

                      {/* Location and Status Row */}
                      <View style={styles.statusRow}>
                        {/* Location */}
                        {(user.currentCity || user.airportCode) && (
                          <View style={[styles.locationBadge, { 
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.15)",
                            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                          }]}>
                            <MaterialIcons name="location-on" size={14} color="#37a4c8" />
                            <Text style={[styles.locationText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                              {user.currentCity || user.airportCode}
                            </Text>
                          </View>
                        )}
                        
                        {/* Availability Status */}
                        {user.availableNow && (
                          <View style={[styles.availabilityBadge, { 
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.15)",
                            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                          }]}>
                            <View style={[styles.availabilityDot, { backgroundColor: "#37a4c8" }]} />
                            <Text style={[styles.availabilityText, { color: "#37a4c8" }]}>Now</Text>
                          </View>
                        )}
                      </View>

                      {/* Today's Schedule */}
                      {user.availabilitySchedule && (() => {
                        const now = new Date();
                        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                        const currentDay = days[now.getDay()];
                        const todaySchedule = user.availabilitySchedule[currentDay];
                        
                        if (todaySchedule && todaySchedule.start && todaySchedule.end) {
                          const formatTimeToAMPM = (militaryTime: string): string => {
                            if (!militaryTime || militaryTime === "00:00") return "12:00 AM";
                            
                            const [hours, minutes] = militaryTime.split(':').map(Number);
                            const period = hours >= 12 ? 'PM' : 'AM';
                            const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                            
                            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
                          };

                          const startTime = formatTimeToAMPM(todaySchedule.start);
                          const endTime = formatTimeToAMPM(todaySchedule.end);
                          
                          return (
                            <View style={[styles.scheduleSection, { 
                              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(55, 164, 200, 0.2)"
                            }]}>
                              <View style={styles.scheduleHeader}>
                                <MaterialIcons name="schedule" size={16} color="#37a4c8" />
                                <Text style={[styles.scheduleTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                                  Available Today
                                </Text>
                              </View>
                              <Text style={[styles.scheduleTime, { color: "#37a4c8" }]}>
                                {startTime} - {endTime}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}

                      {/* Shared Items Section */}
                      {authUserData && (() => {
                        const sharedConnectionIntents = getSharedConnectionIntents(user);
                        const sharedPersonalTags = getSharedPersonalTags(user);
                        const sharedEventPreferences = getSharedEventPreferences(user);
                        const totalSharedItems = sharedConnectionIntents.length + sharedPersonalTags.length + sharedEventPreferences.length;
                        
                        if (totalSharedItems === 0) return null;
                        
                        return (
                          <View style={[styles.sharedItemsSection, { 
                            backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.05)" : "rgba(76, 175, 80, 0.1)",
                            borderColor: theme === "light" ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.3)"
                          }]}>
                            <View style={styles.sharedItemsHeader}>
                              <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                              <Text style={[styles.sharedItemsTitle, { color: "#4CAF50" }]}>
                                {totalSharedItems} shared interest{totalSharedItems !== 1 ? 's' : ''}
                              </Text>
                            </View>
                            
                            <View style={styles.sharedItemsContainer}>
                              {/* Connection Intents */}
                              {sharedConnectionIntents.slice(0, 3).map((intent, index) => (
                                <View key={`intent-${index}`} style={[styles.sharedItemTag, { 
                                  backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)",
                                  borderColor: "#4CAF50"
                                }]}>
                                  <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
                                    {intent}
                                  </Text>
                                </View>
                              ))}
                              
                              {/* Personal Tags */}
                              {sharedPersonalTags.slice(0, 3).map((tag, index) => (
                                <View key={`tag-${index}`} style={[styles.sharedItemTag, { 
                                  backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)",
                                  borderColor: "#4CAF50"
                                }]}>
                                  <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
                                    {tag}
                                  </Text>
                                </View>
                              ))}
                              
                              {/* Event Preferences */}
                              {sharedEventPreferences.slice(0, 2).map((pref, index) => (
                                <View key={`pref-${index}`} style={[styles.sharedItemTag, { 
                                  backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)",
                                  borderColor: "#4CAF50"
                                }]}>
                                  <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
                                    {pref}
                                  </Text>
                                </View>
                              ))}
                              
                              {/* Show more indicator if there are more items */}
                              {(sharedConnectionIntents.length + sharedPersonalTags.length + sharedEventPreferences.length) > 8 && (
                                <View style={[styles.sharedItemTag, { 
                                  backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.2)",
                                  borderColor: "#4CAF50"
                                }]}>
                                  <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
                                    +{(sharedConnectionIntents.length + sharedPersonalTags.length + sharedEventPreferences.length) - 8} more
                                  </Text>
                                </View>
                              )}
                            </View>
                          </View>
                        );
                      })()}

                      {/* Bio Section */}
                      {user.bio && (
                        <View style={styles.bioSection}>
                          <Text 
                            style={[styles.bioText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {user.bio}
                          </Text>
                        </View>
                      )}

                      {/* Action Buttons */}
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.dislikeButton, { 
                            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                            borderColor: theme === "light" ? "#64748B" : "#94A3B8"
                          }]}
                          onPress={() => onSwipedLeft(index)}
                          disabled={isProcessing}
                        >
                          <MaterialIcons name="close" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.actionButton, styles.likeButton, { 
                            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                            borderColor: "#37a4c8"
                          }]}
                          onPress={() => onSwipedRight(index)}
                          disabled={isProcessing}
                        >
                          <MaterialIcons name="favorite" size={20} color="#37a4c8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))}
              
              {/* Bottom Section with Stats and Reset */}
              <Animated.View 
                entering={FadeIn.duration(800).delay(users.length * 100).easing(Easing.out(Easing.cubic))}
                style={styles.bottomSection}
              >
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                  <View style={[styles.statCard, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                  }]}>
                    <MaterialIcons name="people" size={20} color="#37a4c8" />
                    <Text style={[styles.statNumber, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                      {users.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Available
                    </Text>
                  </View>
                  
                  <View style={[styles.statCard, { 
                    backgroundColor: theme === "light" ? "rgba(76, 217, 100, 0.05)" : "rgba(76, 217, 100, 0.1)",
                    borderColor: theme === "light" ? "rgba(76, 217, 100, 0.2)" : "rgba(76, 217, 100, 0.3)"
                  }]}>
                    <MaterialIcons name="schedule" size={20} color="#4CD964" />
                    <Text style={[styles.statNumber, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                      Now
                    </Text>
                    <Text style={[styles.statLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Active
                    </Text>
                  </View>
                </View>

                {/* Reset History Button */}
                <TouchableOpacity
                  style={[
                    styles.verticalResetButton,
                    { 
                      backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                      borderColor: "#37a4c8"
                    }
                  ]}
                  onPress={resetSwipeHistory}
                >
                  <MaterialIcons name="history" size={20} color="#37a4c8" />
                  <Text style={[styles.verticalResetButtonText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                    Reset History
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </ScrollView>
          ) : (
            <Animated.View 
              entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
              style={[styles.emptyStateContainer]}
            >
              <LinearGradient
                colors={theme === "light" ? ["#FFFFFF", "#FFFFFF"] : ["#1a1a1a", "#1a1a1a"]}
                style={styles.cardContent}
              >
                {/* Image Container - Empty State */}
                <View style={styles.imageContainer}>
                  <View style={[styles.profileImageContainer, { 
                    backgroundColor: theme === "light" ? "#f3f4f6" : "#2a2a2a",
                    justifyContent: 'center',
                    alignItems: 'center'
                  }]}>
                    <Image
                      source={require('../../assets/icon.png')}
                      style={{
                        width: '100%',
                        height: '100%',
                        resizeMode: 'cover'
                      }}
                    />
                  </View>
                  <View style={styles.imageOverlay}>
                    <View style={styles.profileHeader}>
                      <Text style={styles.nameText}>
                        No Nearby Users
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Content Container - Empty State */}
                <View style={[styles.contentContainer]}>
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="info" size={18} color="#37a4c8" />
                      <Text style={[styles.sectionContent, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                        We couldn't find any more travelers at this airport right now.
                      </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
                  </View>
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <MaterialIcons name="schedule" size={18} color="#37a4c8" />
                      <Text style={[styles.sectionContent, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                        Check back later or try resetting your history to see users again.
                      </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
                  </View>
                  <View style={[styles.moodContainer, { 
                    backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.1)" : "rgba(56, 165, 201, 0.1)",
                    alignSelf: 'center',
                    marginTop: 'auto',
                    marginBottom: 8
                  }]}>
                    <MaterialIcons name="refresh" size={16} color="#37a4c8" />
                    <Text style={styles.moodText}>Ready for new connections!</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}
        </LinearGradient>
      </SafeAreaWrapper>
    </View>
  );
};

/** Styles */
const styles = StyleSheet.create({
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#38a5c9",
  },
  cardTouchable: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardShadow: {
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    transform: [{ rotateY: '180deg' }],
  },
  cardContent: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    padding: 16,
    justifyContent: 'flex-end',
  },
  profileHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  nameText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  locationOverlayContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 165, 201, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  availabilityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 217, 100, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    padding: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: "#38a5c9",
    marginVertical: 6,
    opacity: 0.2,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
    alignSelf: 'center',
  },
  moodText: {
    fontSize: 13,
    color: "#38a5c9",
    marginLeft: 6,
    fontWeight: "500",
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
    color: "#38a5c9",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#38a5c9",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  backTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#38a5c9',
    marginBottom: 8,
  },
  backSubtitle: {
    fontSize: 16,
    color: '#e4fbfe',
  },
  messageOptionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  messageOptionsContent: {
    width: '85%',
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  messageOptionsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38a5c9',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  messageOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#38a5c9',
    textAlign: 'center',
  },
  messageOptionsSubtitle: {
    fontSize: 14,
    color: '#e4fbfe',
    textAlign: 'center',
    marginTop: 6,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  messagesContainer: {
    padding: 16,
  },
  presetMessageButton: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#38a5c9',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  presetMessageText: {
    fontSize: 14,
    color: '#e4fbfe',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatButton: {
    backgroundColor: '#38a5c9',
    marginTop: 8,
    borderColor: '#38a5c9',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  messageSection: {
    marginBottom: 20,
  },
  messageSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#38a5c9',
    marginBottom: 8,
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLabel: {
    position: 'absolute',
    padding: 10,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  likeLabel: {
    right: 40,
    borderColor: '#4CD964',
  },
  nopeLabel: {
    left: 40,
    borderColor: '#FF3B30',
  },
  likeText: {
    color: '#4CD964',
    fontSize: 28,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  nopeText: {
    color: '#FF3B30',
    fontSize: 28,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#37a4c8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#37a4c8',
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#37a4c8',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginHorizontal: 'auto',
    marginBottom: 40,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  emptyStateGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#37a4c8',
    gap: 8,
    minWidth: 120,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dataToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  dataToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#37a4c8',
    gap: 6,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
  },
  dataToggleButtonActive: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  dataToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#37a4c8',
    gap: 8,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  clearHistoryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dataModeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  dataModeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#37a4c8',
    gap: 6,
    minWidth: 80,
    backgroundColor: '#FFFFFF',
  },
  dataModeToggleButtonActive: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  dataModeToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Vertical scroll styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  verticalCard: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 20,
  },
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  profileImageSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  profileImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
    borderRadius: 60,
  },
  statusRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    top: -5,
    left: -5,
  },
  contentSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  userAge: {
    fontSize: 18,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.2,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  scheduleSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  scheduleTime: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bioSection: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dislikeButton: {
    // Additional styles if needed
  },
  likeButton: {
    // Additional styles if needed
  },
  verticalResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginBottom: 32,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  verticalResetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#37a4c8',
    letterSpacing: 0.2,
  },
  // New polished design styles
  headerSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    opacity: 0.8,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  // Shared items styles
  sharedItemsSection: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sharedItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  sharedItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sharedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sharedItemTag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  sharedItemText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default Swipe;