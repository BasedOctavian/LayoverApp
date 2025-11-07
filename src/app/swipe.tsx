import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
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
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import Animated, {
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { ThemeContext } from "../context/ThemeContext";
import TopBar from "../components/TopBar";
import useNotificationCount from "../hooks/useNotificationCount";
import { UserCard, EmptyState, StatsSection } from "../components/swipe";

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




// MemoizedDataToggle component removed - no longer needed

// MemoizedNavigationButtons component removed - no longer needed

// DataModeToggle component removed - no longer needed

// LoadingCard component removed - no longer needed

// SwipeCard component removed - replaced with vertical scroll interface
// SwipeCard component variables and effects removed

// SwipeCard component body completely removed

// Responsive scaling utilities
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 393; // iPhone 15 width as base reference
const BASE_HEIGHT = 852; // iPhone 15 height as base reference

// Scale function for width-based dimensions
const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

// Scale function for height-based dimensions
const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

// Scale function for font sizes (using width for better consistency)
const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  // Ensure minimum font size for readability
  return Math.max(newSize, size * 0.85);
};

// Scale function for general dimensions (uses average of width/height scaling)
const scale = (size: number): number => {
  const widthScale = SCREEN_WIDTH / BASE_WIDTH;
  const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
  const scale = (widthScale + heightScale) / 2;
  return size * scale;
};

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
  const [showQuickMessage, setShowQuickMessage] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  // Removed unused buttonScale
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // Track if we've made the initial fetch attempt
  const [hasInitiallyFetched, setHasInitiallyFetched] = useState(false);
  const { theme: colorScheme } = React.useContext(ThemeContext);
  const theme = colorScheme || "light"; // Provide default value
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  
  // Animation state for dismissing cards
  const [dismissingUserId, setDismissingUserId] = useState<string | null>(null);
  const [dismissDirection, setDismissDirection] = useState<'left' | 'right' | null>(null);
  
  // ScrollView ref for scrolling to top
  const scrollViewRef = useRef<ScrollView>(null);

  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

  // Removed animation values - content loads immediately

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
    } catch (error: any) {
      console.error("❌ Message send error:", error.message);
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
      console.log('\n🔔 ===== SENDING MATCH NOTIFICATION =====');
      console.log('  Target:', matchedUserName);
      
      // Get matched user's data
      const matchedUserDoc = await getDoc(doc(db, 'users', matchedUserId));
      if (!matchedUserDoc.exists()) {
        console.log('❌ User not found');
        return;
      }

      const matchedUserData = matchedUserDoc.data();

      // Get current user's name
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserUID));
      if (!currentUserDoc.exists()) {
        console.log('❌ Current user not found');
        return;
      }
      
      const currentUserName = currentUserDoc.data()?.name || 'Someone';

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

      // Update swiped user's notifications
      const swipedUserNotifications = matchedUserData?.notifications || [];
      await updateDoc(doc(db, "users", matchedUserId), {
        notifications: [...swipedUserNotifications, notification]
      });
      console.log('✅ In-app notification added');

      // Send push notification if user has token and notifications enabled
      if (matchedUserData?.expoPushToken && 
          matchedUserData?.notificationPreferences?.notificationsEnabled && 
          matchedUserData?.notificationPreferences?.connections) {
        
        console.log('📱 Sending push notification...');

        try {
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
            console.error('❌ Push failed:', response.status, responseData);
          } else {
            console.log('✅ Push notification sent');
          }
        } catch (error: any) {
          console.error('❌ Push error:', error.message);
        }
      } else {
        console.log('⏭️  Skipped push (user settings or no token)');
      }

      console.log('✅ ===== NOTIFICATION COMPLETE =====\n');

    } catch (error: any) {
      console.error('❌ Notification error:', error.message);
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
        console.error("❌ User document not found");
      }
    }, (err) => {
      console.error("❌ Listener error:", err.message);
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
    } catch (error: any) {
      console.error("❌ Auth user fetch error:", error.message);
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
      console.log('\n🔍 ===== FETCHING USERS =====');

      // Get current user's blocked users
      const currentUserDoc = await doc(db, "users", currentUserUID);
      const currentUserSnapshot = await getDoc(currentUserDoc);
      const currentUserData = currentUserSnapshot.data();
      const blockedUsers = currentUserData?.blockedUsers || [];
      const hasMeBlocked = currentUserData?.hasMeBlocked || [];
      const dislikedUsers = currentUserData?.dislikedUsers || [];
      const likedUsers = currentUserData?.likedUsers || [];
      
      console.log('📋 User Filter Lists:');
      console.log('  • Blocked by me:', blockedUsers.length, 'users');
      console.log('  • Blocked me:', hasMeBlocked.length, 'users');
      console.log('  • Disliked:', dislikedUsers.length, 'users');
      console.log('  • Already liked:', likedUsers.length, 'users');

      // Calculate timestamp for 1 month ago
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      console.log('📅 Activity Filter: Users active since', oneMonthAgo.toLocaleDateString());

      // Get current time for availability check
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      console.log('⏰ Availability Check:', currentDay, 'at', currentTime);

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

      console.log('🤝 Existing Connections:', connectedUserIds.size, 'users');

      // Get all users in the area
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      console.log('👥 Total Users in Database:', querySnapshot.docs.length);

      // Get all users' documents to check their blocked lists
      const userDocs = await Promise.all(
        querySnapshot.docs.map(doc => getDoc(doc.ref))
      );

      const fetchedUsers = querySnapshot.docs
        .map((doc, index) => {
          const data = doc.data();
          const userDoc = userDocs[index];
          const userData = userDoc.data();
          
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
            return false;
          }

          // Check if user has logged in within the past month
          const lastLogin = user.lastLogin?.toDate?.() || new Date(0);
          const isRecent = lastLogin >= oneMonthAgo;

          // Check if user is available at current time
          const isAvailable = (() => {
            if (!user.availabilitySchedule) return false;

            const daySchedule = user.availabilitySchedule[currentDay];
            if (!daySchedule) return false;

            const { start, end } = daySchedule;
            if (!start || !end) return false;

            // Convert times to comparable format (HH:MM)
            return currentTime >= start && currentTime <= end;
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
          
          return shouldShow;
        });
      
      console.log('\n✅ Filtering Complete:');
      console.log('  • Total database users:', querySnapshot.docs.length);
      console.log('  • After filters:', fetchedUsers.length, 'eligible users');
      if (fetchedUsers.length > 0) {
        console.log('  • Eligible users:', fetchedUsers.map(u => u.name).join(', '));
      }
      
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
      
      console.log('\n📊 Sorting by Compatibility:');
      if (sortedUsers.length > 0) {
        sortedUsers.slice(0, 3).forEach((u, i) => {
          const sharedScore = getSharedInterestsScore(u);
          const proximityScore = getProximityScore(u);
          const combinedScore = ((sharedScore * 0.7) + (proximityScore * 0.3)).toFixed(1);
          console.log(`  ${i + 1}. ${u.name} (Score: ${combinedScore} - ${sharedScore} shared, ${proximityScore.toFixed(0)}km proximity)`);
        });
        if (sortedUsers.length > 3) {
          console.log(`  ... and ${sortedUsers.length - 3} more users`);
        }
      }
      
      setUsers(sortedUsers);
      setHasInitiallyFetched(true);
      console.log('✅ ===== FETCH COMPLETE =====\n');
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      Alert.alert("Error", "Failed to fetch users. Please try again later.");
      setHasInitiallyFetched(true);
    }
  };

  /** Handle right swipe (like) */
  const onSwipedRight = async (index: number) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    try {
      const swipedUser = users[index];
      const swipedUserUID = swipedUser.id;
      
      // Trigger dismissal animation
      setDismissingUserId(swipedUserUID);
      setDismissDirection('right');
      
      console.log(`\n👍 ===== RIGHT SWIPE: ${swipedUser.name} =====`);

      // Wait for animation to start
      await new Promise(resolve => setTimeout(resolve, 100));

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
      
      console.log(hasMatched ? '🎉 MATCH!' : '📤 Creating connection request');

      // Create a pending connection
      const connectionData = {
        participants: [currentUserUID, swipedUserUID],
        createdAt: new Date(),
        status: 'pending',
        initiator: currentUserUID,
        lastMessage: null,
      };
      
      try {
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
        if (swipedUserData?.expoPushToken && 
            swipedUserData?.notificationPreferences?.notificationsEnabled && 
            swipedUserData?.notificationPreferences?.connections) {
          
          console.log('📱 Sending push notification...');

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
              console.error('❌ Push notification failed:', response.status, responseData);
            } else {
              console.log('✅ Push notification sent successfully');
            }
          } catch (error: any) {
            console.error('❌ Push notification error:', error.message);
          }
        } else {
          console.log('⏭️  Skipped push notification (user settings or no token)');
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
        console.error("❌ Connection creation error:", error);
      }
      
      // Wait for animation to complete before removing from list
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove user from list
      setUsers(prevUsers => prevUsers.filter(u => u.id !== swipedUserUID));
      
      // Reset dismissal state
      setDismissingUserId(null);
      setDismissDirection(null);
      
      console.log('✅ ===== RIGHT SWIPE COMPLETE =====\n');
    } catch (err) {
      console.error("❌ Right swipe error:", err);
      // Reset dismissal state on error
      setDismissingUserId(null);
      setDismissDirection(null);
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
      
      // Trigger dismissal animation
      setDismissingUserId(swipedUserUID);
      setDismissDirection('left');
      
      console.log(`\n👎 LEFT SWIPE: ${swipedUser.name}`);

      // Wait for animation to start
      await new Promise(resolve => setTimeout(resolve, 100));

      await updateUser(currentUserUID, {
        dislikedUsers: arrayUnion(swipedUserUID),
      });
      
      // Wait for animation to complete before removing from list
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove user from list
      setUsers(prevUsers => prevUsers.filter(u => u.id !== swipedUserUID));
      
      // Reset dismissal state
      setDismissingUserId(null);
      setDismissDirection(null);
      
      console.log('✅ User added to disliked list\n');
    } catch (err) {
      console.error("❌ Left swipe error:", err);
      // Reset dismissal state on error
      setDismissingUserId(null);
      setDismissDirection(null);
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
        "Reset Swipe History",
        "This will clear users you've disliked or liked (but haven't matched with yet), allowing you to see them again. Your existing connections remain unchanged.\n\nTo view pending connection requests, go to the Chat tab.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Reset History",
            style: "destructive",
            onPress: async () => {
              try {
                // Update user document to clear both disliked and liked users arrays
                await updateUser(currentUserUID, {
                  dislikedUsers: [],
                  likedUsers: []
                });
                
                // Refresh the users list
                await fetchUsers();
                
                // Scroll to top of screen
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              } catch (error: any) {
                console.error("❌ Reset history error:", error.message);
                Alert.alert("Error", "Failed to reset history. Please try again.");
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error("❌ Reset confirmation error:", error.message);
    }
  };

  // Removed animated styles - content shows immediately

  // Removed loading state - show content immediately

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
              ref={scrollViewRef}
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              bounces={true}
              decelerationRate="fast"
            >

              {users.map((user, index) => {
                const sharedConnectionIntents = authUserData ? getSharedConnectionIntents(user) : [];
                const sharedPersonalTags = authUserData ? getSharedPersonalTags(user) : [];
                const sharedEventPreferences = authUserData ? getSharedEventPreferences(user) : [];
                const isDismissing = dismissingUserId === user.id;
                
                return (
                  <UserCard
                    key={user.id}
                    user={user}
                    index={index}
                    theme={theme}
                    isProcessing={isProcessing}
                    isDismissing={isDismissing}
                    dismissDirection={isDismissing ? dismissDirection : null}
                    sharedConnectionIntents={sharedConnectionIntents}
                    sharedPersonalTags={sharedPersonalTags}
                    sharedEventPreferences={sharedEventPreferences}
                    onLike={onSwipedRight}
                    onDislike={onSwipedLeft}
                  />
                );
              })}
              
              {/* Bottom Section with Stats and Reset */}
              <StatsSection 
                userCount={users.length}
                theme={theme}
                delay={users.length * 100}
                onResetHistory={resetSwipeHistory}
              />
            </ScrollView>
          ) : hasInitiallyFetched ? (
            <View style={styles.emptyStateWrapper}>
              <EmptyState theme={theme} onResetHistory={resetSwipeHistory} />
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              {/* Show nothing while fetching initially */}
            </View>
          )}
        </LinearGradient>
      </SafeAreaWrapper>
    </View>
  );
};

/** Styles */
const styles = StyleSheet.create({
  logo: {
    fontSize: scaleFont(18),
    fontWeight: "bold",
    color: "#38a5c9",
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    padding: scaleWidth(16),
    justifyContent: 'flex-end',
  },
  profileHeader: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  nameText: {
    fontSize: scaleFont(24),
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: scale(1), height: scale(1) },
    textShadowRadius: scale(4),
  },
  locationOverlayContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 165, 201, 0.2)",
    paddingVertical: scaleHeight(4),
    paddingHorizontal: scaleWidth(8),
    borderRadius: scale(12),
    marginTop: scaleHeight(4),
  },
  availabilityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 217, 100, 0.2)",
    paddingVertical: scaleHeight(4),
    paddingHorizontal: scaleWidth(8),
    borderRadius: scale(12),
    marginTop: scaleHeight(4),
  },
  contentContainer: {
    flex: 1,
    padding: scale(12),
  },
  section: {
    marginBottom: scaleHeight(8),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(4),
  },
  sectionContent: {
    fontSize: scaleFont(14),
    marginLeft: scaleWidth(8),
    flex: 1,
    lineHeight: scaleFont(18),
  },
  divider: {
    height: scaleHeight(1),
    backgroundColor: "#38a5c9",
    marginVertical: scaleHeight(6),
    opacity: 0.2,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(12),
    borderRadius: scale(16),
    marginTop: scaleHeight(4),
    alignSelf: 'center',
  },
  moodText: {
    fontSize: scaleFont(13),
    color: "#38a5c9",
    marginLeft: scaleWidth(6),
    fontWeight: "500",
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: scaleFont(16),
    textAlign: "center",
    marginBottom: scaleHeight(20),
  },
  emptyStateText: {
    fontSize: scaleFont(18),
    color: "#38a5c9",
    textAlign: "center",
    marginBottom: scaleHeight(20),
  },
  retryButton: {
    backgroundColor: "#38a5c9",
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scale(8),
    borderWidth: scale(1),
    borderColor: "#38a5c9",
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: scaleFont(16),
    fontWeight: "600",
  },
  loadingFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backHeader: {
    alignItems: 'center',
    marginBottom: scaleHeight(20),
  },
  backTitle: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    color: '#38a5c9',
    marginBottom: scaleHeight(8),
  },
  backSubtitle: {
    fontSize: scaleFont(16),
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
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.25,
    shadowRadius: scale(4),
    elevation: 5,
    borderWidth: scale(1),
    borderColor: '#38a5c9',
  },
  messageOptionsHeader: {
    padding: scale(16),
    borderBottomWidth: scale(1),
    borderBottomColor: '#38a5c9',
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  messageOptionsTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    color: '#38a5c9',
    textAlign: 'center',
  },
  messageOptionsSubtitle: {
    fontSize: scaleFont(14),
    color: '#e4fbfe',
    textAlign: 'center',
    marginTop: scaleHeight(6),
  },
  closeButton: {
    position: 'absolute',
    top: scaleHeight(16),
    right: scaleWidth(16),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: '#38a5c9',
  },
  messagesContainer: {
    padding: scale(16),
  },
  presetMessageButton: {
    backgroundColor: '#FFFFFF',
    padding: scale(12),
    borderRadius: scale(10),
    marginBottom: scaleHeight(8),
    borderWidth: scale(1),
    borderColor: '#38a5c9',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: scale(1) },
    shadowOpacity: 0.1,
    shadowRadius: scale(2),
    elevation: 1,
  },
  presetMessageText: {
    fontSize: scaleFont(14),
    color: '#e4fbfe',
    textAlign: 'center',
    lineHeight: scaleFont(20),
  },
  chatButton: {
    backgroundColor: '#38a5c9',
    marginTop: scaleHeight(8),
    borderColor: '#38a5c9',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleWidth(8),
  },
  messageSection: {
    marginBottom: scaleHeight(20),
  },
  messageSectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    color: '#38a5c9',
    marginBottom: scaleHeight(8),
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayLabel: {
    position: 'absolute',
    padding: scale(10),
    borderRadius: scale(10),
    borderWidth: scale(3),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.25,
    shadowRadius: scale(3.84),
    elevation: 5,
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(8),
  },
  likeLabel: {
    right: scaleWidth(40),
    borderColor: '#4CD964',
  },
  nopeLabel: {
    left: scaleWidth(40),
    borderColor: '#FF3B30',
  },
  likeText: {
    color: '#4CD964',
    fontSize: scaleFont(28),
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: scaleHeight(4),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: scale(1), height: scale(1) },
    textShadowRadius: scale(2),
  },
  nopeText: {
    color: '#FF3B30',
    fontSize: scaleFont(28),
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: scaleHeight(4),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: scale(1), height: scale(1) },
    textShadowRadius: scale(2),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: scaleWidth(12),
    marginTop: scaleHeight(8),
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#37a4c8',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scale(8),
    borderWidth: scale(1),
    borderColor: '#37a4c8',
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#37a4c8',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.3,
    shadowRadius: scale(4),
    elevation: 5,
  },
  emptyStateGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(32),
  },
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleWidth(16),
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(32),
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scale(12),
    borderWidth: scale(1),
    borderColor: '#37a4c8',
    gap: scaleWidth(8),
    minWidth: scaleWidth(120),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 2,
  },
  navButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  dataToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleWidth(12),
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
  },
  dataToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    borderRadius: scale(20),
    borderWidth: scale(1),
    borderColor: '#37a4c8',
    gap: scaleWidth(6),
    minWidth: scaleWidth(120),
    backgroundColor: '#FFFFFF',
  },
  dataToggleButtonActive: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  dataToggleText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scale(12),
    borderWidth: scale(1),
    borderColor: '#37a4c8',
    gap: scaleWidth(8),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  clearHistoryButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  dataModeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleWidth(12),
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
  },
  dataModeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    borderRadius: scale(20),
    borderWidth: scale(1),
    borderColor: '#37a4c8',
    gap: scaleWidth(6),
    minWidth: scaleWidth(80),
    backgroundColor: '#FFFFFF',
  },
  dataModeToggleButtonActive: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  dataModeToggleText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  // Vertical scroll styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(24),
    paddingBottom: scaleHeight(40),
    alignItems: 'center',
  },
  // New polished design styles
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: scale(16),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Swipe;