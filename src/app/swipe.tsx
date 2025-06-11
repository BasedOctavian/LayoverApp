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
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import useUsers from "./../hooks/useUsers";
import { arrayUnion, doc, onSnapshot, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../hooks/auth";
import { router } from "expo-router";
import { db } from "../../config/firebaseConfig";
import TopBar from "../components/TopBar";
import { collection, addDoc, query, where, getDocs, limit, startAfter } from "firebase/firestore";
import useChats from "../hooks/useChats";
import LoadingScreen from "../components/LoadingScreen";
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
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  PanGestureHandler,
} from "react-native-gesture-handler";
import { ThemeContext } from "../context/ThemeContext";

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
}

interface Connection {
  user1: string;
  user2: string;
}

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.55;

// Airport name lookup hook
function useAirportName(airportCode: string | undefined) {
  const [airportName, setAirportName] = useState<string | null>(null);
  useEffect(() => {
    const fetchAirportName = async () => {
      if (!airportCode) return;
      try {
        const airportsRef = collection(db, "airports");
        const q = query(airportsRef, where("airportCode", "==", airportCode));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const airportDoc = snapshot.docs[0];
          const data = airportDoc.data();
          setAirportName(data.name || airportCode);
        } else {
          setAirportName(airportCode);
        }
      } catch (err) {
        setAirportName(airportCode);
      }
    };
    fetchAirportName();
  }, [airportCode]);
  return airportName;
}

const Swipe = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const { getUsers, updateUser, loading, error } = useUsers();
  const { user } = useAuth();
  const { addMessage, getExistingChat, addChat } = useChats();
  const currentUserUID = user?.uid || "some-uid";
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const [showQuickMessage, setShowQuickMessage] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const buttonScale = useSharedValue(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { theme } = React.useContext(ThemeContext);
  const [showMessageOptions, setShowMessageOptions] = useState(false);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardRotation = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const lastDirection = useSharedValue<'left' | 'right' | null>(null);
  const currentIndex = useSharedValue(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const airportName = useAirportName(currentUserData?.airportCode);

  const screenOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.95);

  // Replace Animated.Value with useSharedValue
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);
  const headerSlideAnim = useSharedValue(20);
  const listSlideAnim = useSharedValue(30);

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
      headerSlideAnim.value = withTiming(0, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
      listSlideAnim.value = withTiming(0, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [isLoadingUsers]);

  useAnimatedReaction(
    () => currentIndex.value,
    (current) => {
      if (users.length > 0 && current < users.length) {
        runOnJS(setCurrentUser)(users[current]);
      } else {
        runOnJS(setCurrentUser)(null);
      }
    },
    [users]
  );

  const resetCard = () => {
    if (isAnimating.value) return;
    
    isAnimating.value = true;
    translateX.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
    cardRotation.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    }, () => {
      isAnimating.value = false;
    });
  };

  const handleSwipe = (direction: "left" | "right") => {
    try {
      if (isAnimating.value || !users.length) return;
      isAnimating.value = true;

      const currentUserIndex = currentIndex.value;
      if (currentUserIndex >= users.length) {
        isAnimating.value = false;
        return;
      }

      // Start processing the swipe immediately
      if (direction === "right") {
        onSwipedRight(currentUserIndex);
      } else {
        onSwipedLeft(currentUserIndex);
      }
      
      // Quick animation for current card
      translateX.value = withTiming(direction === "right" ? width * 1.5 : -width * 1.5, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
      
      // Process the next card immediately
      setTimeout(() => {
        try {
          // Reset transform values
          translateX.value = direction === "right" ? -width * 1.5 : width * 1.5;
          
          // Remove the swiped user from the array
          const updatedUsers = [...users];
          updatedUsers.splice(currentUserIndex, 1);
          setUsers(updatedUsers);
          
          // If we've reached the end, handle empty state
          if (updatedUsers.length === 0) {
            setShowSwiper(false);
            // Fade in empty state
            fadeAnim.value = withTiming(1, {
              duration: 150,
              easing: Easing.out(Easing.cubic),
            });
          } else {
            // Update currentIndex to point to the next user
            currentIndex.value = Math.min(currentUserIndex, updatedUsers.length - 1);
            // Quick slide in for next card
            translateX.value = withTiming(0, {
              duration: 150,
              easing: Easing.out(Easing.cubic),
            });
          }
          
          isAnimating.value = false;
        } catch (error) {
          console.error('Error in swipe animation completion:', error);
          isAnimating.value = false;
        }
      }, 150); // Reduced timeout
    } catch (error) {
      console.error('Error in handleSwipe:', error);
      isAnimating.value = false;
    }
  };

  const gesture = Gesture.Pan()
    .onBegin(() => {
      try {
        if (isAnimating.value) return;
        lastDirection.value = null;
      } catch (error) {
        console.error('Error in gesture onBegin:', error);
      }
    })
    .onUpdate((event) => {
      try {
        if (isAnimating.value) return;

        // Add resistance to the drag
        const resistance = 0.5;
        const dragDistance = event.translationX;
        const resistedDistance = dragDistance > 0 
          ? Math.min(dragDistance, width * 0.4) * resistance
          : Math.max(dragDistance, -width * 0.4) * resistance;

        // Update direction
        if (Math.abs(resistedDistance) > 10) {
          lastDirection.value = resistedDistance > 0 ? 'right' : 'left';
        }

        translateX.value = resistedDistance;
        translateY.value = event.translationY * 0.3;
        cardRotation.value = interpolate(
          resistedDistance,
          [-width / 2, 0, width / 2],
          [-30, 0, 30],
          Extrapolate.CLAMP
        );
      } catch (error) {
        console.error('Error in gesture onUpdate:', error);
      }
    })
    .onEnd((event) => {
      try {
        if (isAnimating.value) return;

        const shouldSwipe = Math.abs(event.translationX) > width * 0.2;
        const velocity = event.velocityX;
        
        // If moving fast enough, trigger swipe regardless of distance
        if (Math.abs(velocity) > 500) {
          const direction = velocity > 0 ? "right" : "left";
          runOnJS(handleSwipe)(direction);
          return;
        }
        
        if (shouldSwipe && lastDirection.value) {
          runOnJS(handleSwipe)(lastDirection.value);
        } else {
          runOnJS(resetCard)();
        }
      } catch (error) {
        console.error('Error in gesture onEnd:', error);
        runOnJS(resetCard)();
      }
    })
    .onFinalize(() => {
      try {
        if (!isAnimating.value && Math.abs(translateX.value) < width * 0.2) {
          runOnJS(resetCard)();
        }
      } catch (error) {
        console.error('Error in gesture onFinalize:', error);
        runOnJS(resetCard)();
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value }
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, width * 0.2],
      [0, 1],
      Extrapolate.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, width * 0.2],
      [0.5, 1],
      Extrapolate.CLAMP
    );
    const rotate = interpolate(
      translateX.value,
      [0, width * 0.2],
      [-15, 0],
      Extrapolate.CLAMP
    );
    return { 
      opacity,
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      position: 'absolute',
      top: 50,
      right: 40,
      zIndex: 1000,
    };
  });

  const nopeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-width * 0.2, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-width * 0.2, 0],
      [1, 0.5],
      Extrapolate.CLAMP
    );
    const rotate = interpolate(
      translateX.value,
      [-width * 0.2, 0],
      [0, 15],
      Extrapolate.CLAMP
    );
    return { 
      opacity,
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      position: 'absolute',
      top: 50,
      left: 40,
      zIndex: 1000,
    };
  });

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

  const sendMatchNotification = async (matchedUserId: string, matchedUserName: string) => {
    try {
      console.log('Starting to send match notification to:', matchedUserId);
      
      // Get matched user's push token
      const matchedUserDoc = await getDoc(doc(db, 'users', matchedUserId));
      if (!matchedUserDoc.exists()) {
        console.log('Matched user document not found');
        return;
      }

      const matchedUserData = matchedUserDoc.data();
      const pushToken = matchedUserData?.expoPushToken;

      if (!pushToken) {
        console.log('No push token found for matched user');
        return;
      }

      // Get current user's name
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserUID));
      if (!currentUserDoc.exists()) {
        console.log('Current user document not found');
        return;
      }
      
      const currentUserName = currentUserDoc.data()?.name || 'Someone';
      console.log('Sending notification from:', currentUserName, 'to:', matchedUserName);

      // Send push notification using Expo's push notification service
      const message = {
        to: pushToken,
        sound: 'default',
        title: 'New Match! 🎉',
        body: `${currentUserName} also wants to connect with you!`,
        data: {
          type: 'match',
          matchedUserId: currentUserUID,
          matchedUserName: currentUserName
        },
      };

      console.log('Attempting to send notification with data:', message);

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const responseData = await response.json();
      console.log('Notification send response:', responseData);

      if (!response.ok) {
        throw new Error(`Failed to send notification: ${responseData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending match notification:', error);
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

  // Fetch users when currentUserData is available
  useEffect(() => {
    if (currentUserData) {
      fetchUsers();
    }
  }, [currentUserData]);

  /** Fetch users and filter based on airport code and recent activity */
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      console.log('Starting to fetch users...');
      
      // Get current user's airport code and blocked users
      const currentUserDoc = await doc(db, "users", currentUserUID);
      const currentUserSnapshot = await getDoc(currentUserDoc);
      const currentUserData = currentUserSnapshot.data();
      const currentUserAirport = currentUserData?.airportCode;
      const blockedUsers = currentUserData?.blockedUsers || [];
      const hasMeBlocked = currentUserData?.hasMeBlocked || [];
      
      console.log('Current user airport:', currentUserAirport);
      console.log('Current user blocked users:', blockedUsers);
      console.log('Users who blocked current user:', hasMeBlocked);

      if (!currentUserAirport) {
        console.log('No airport code found for current user');
        Alert.alert("Error", "Please set your airport code in your profile.");
        return;
      }

      // Calculate timestamp for 1 hour ago
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      console.log('Filtering users active since:', oneHourAgo.toISOString());

      // Get all pending connections for current user
      const connectionsRef = collection(db, "connections");
      const connectionsQuery = query(
        connectionsRef,
        where("participants", "array-contains", currentUserUID),
        where("status", "==", "pending")
      );
      const connectionsSnapshot = await getDocs(connectionsQuery);
      const pendingUserIds = new Set<string>();
      
      connectionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUserUID);
        if (otherUserId) {
          pendingUserIds.add(otherUserId);
        }
      });

      // Get all pending chats for current user
      const chatsRef = collection(db, "chats");
      const chatsQuery = query(
        chatsRef,
        where("participants", "array-contains", currentUserUID),
        where("status", "==", "pending")
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      
      chatsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUserUID);
        if (otherUserId) {
          pendingUserIds.add(otherUserId);
        }
      });

      console.log('Found pending connections/chats with users:', Array.from(pendingUserIds));

      // First, get all users at the same airport
      const usersRef = collection(db, "users");
      const airportQuery = query(
        usersRef,
        where("airportCode", "==", currentUserAirport)
      );

      console.log('Executing airport query...');
      const querySnapshot = await getDocs(airportQuery);
      console.log('Total users at airport:', querySnapshot.docs.length);

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
          const lastLogin = user.lastLogin?.toDate?.() || new Date(0);
          const isRecent = lastLogin >= oneHourAgo;
          const isNotCurrentUser = user.id !== currentUserUID;
          const isNotPending = !pendingUserIds.has(user.id);
          const isNotBlocked = !blockedUsers.includes(user.id);
          const hasNotBlockedMe = !hasMeBlocked.includes(user.id);
          const hasNotBlockedCurrentUser = !user.blockedUsers?.includes(currentUserUID);
          const currentUserHasNotBlockedThem = !user.hasMeBlocked?.includes(currentUserUID);
          
          console.log('Filtering user:', {
            id: user.id,
            name: user.name,
            lastLogin: lastLogin.toISOString(),
            isRecent,
            isNotCurrentUser,
            isNotPending,
            isNotBlocked,
            hasNotBlockedMe,
            hasNotBlockedCurrentUser,
            currentUserHasNotBlockedThem,
            passesFilter: isRecent && isNotCurrentUser && isNotPending && 
                         isNotBlocked && hasNotBlockedMe && 
                         hasNotBlockedCurrentUser && currentUserHasNotBlockedThem
          });
          
          return isRecent && isNotCurrentUser && isNotPending && 
                 isNotBlocked && hasNotBlockedMe && 
                 hasNotBlockedCurrentUser && currentUserHasNotBlockedThem;
        });
      
      console.log('Final filtered users count:', fetchedUsers.length);
      console.log('Filtered users:', fetchedUsers.map(u => ({
        id: u.id,
        name: u.name,
        lastLogin: u.lastLogin?.toDate?.() || 'No login time'
      })));
      
      setUsers(fetchedUsers);
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
        const docRef = await addDoc(connectionsCollection, connectionData);
        
        // Create a chat with pending status
        const chatData = {
          participants: [currentUserUID, swipedUserUID],
          createdAt: new Date(),
          lastMessage: null,
          status: 'pending',
          connectionId: docRef.id
        };
        
        const chatsCollection = collection(db, "chats");
        await addDoc(chatsCollection, chatData);

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

  /** Render individual user card */
  const renderCard = (user: User) => {
    if (!user) return null;

    return (
      <Animated.View style={[styles.cardContainer, styles.cardShadow]}>
        <View style={[styles.cardContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
          {/* Profile Image Section */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
              style={styles.profileImage}
            />
            <LinearGradient
              colors={['transparent', theme === "light" ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)']}
              style={styles.imageOverlay}
            >
              <View style={styles.profileHeader}>
                <Text style={styles.nameText}>
                  {user.name}, {user.age}
                </Text>
                <View style={[styles.locationContainer, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]}>
                  <MaterialIcons name="location-on" size={16} color="#37a4c8" />
                  <Text style={styles.locationText}>{user.airportCode}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Content Section */}
          <View style={[styles.contentContainer, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
            {/* Bio Section */}
            {user.bio && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="person" size={18} color="#37a4c8" />
                  <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{user.bio}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
              </View>
            )}

            {/* Languages Section */}
            {user.languages && user.languages.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="translate" size={18} color="#37a4c8" />
                  <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    {user.languages.join(" • ")}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
              </View>
            )}

            {/* Interests Section */}
            {user.interests && user.interests.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="favorite" size={18} color="#37a4c8" />
                  <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    {user.interests.join(" • ")}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
              </View>
            )}

            {/* Goals Section */}
            {user.goals && user.goals.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="flight-takeoff" size={18} color="#37a4c8" />
                  <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Wants to visit: {user.goals.join(" • ")}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
              </View>
            )}

            {/* Travel History Section */}
            {user.travelHistory && user.travelHistory.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="history" size={18} color="#37a4c8" />
                  <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Visited: {user.travelHistory.map(trip => trip.name).join(" • ")}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
              </View>
            )}

            {/* Mood Status */}
            {user.moodStatus && (
              <View style={[styles.moodContainer, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.1)" : "rgba(56, 165, 201, 0.1)" }]}>
                <MaterialIcons name="mood" size={16} color="#37a4c8" />
                <Text style={styles.moodText}>{user.moodStatus}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const resetSwipeHistory = async () => {
    try {
      // Show confirmation dialog
      Alert.alert(
        "Reset Swipe History",
        "This will clear your liked and disliked users, allowing you to see them again. Are you sure?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Reset",
            style: "destructive",
            onPress: async () => {
              try {
                // Update user document to clear liked and disliked arrays
                await updateUser(currentUserUID, {
                  likedUsers: [],
                  dislikedUsers: []
                });

                // Delete all existing connections for this user
                const connectionsRef = collection(db, "connections");
                const q = query(
                  connectionsRef,
                  where("participants", "array-contains", currentUserUID),
                  limit(50) // Add limit to prevent Bloom filter issues
                );
                
                let lastDoc: any = null;
                let hasMore = true;
                
                while (hasMore) {
                  const querySnapshot = await getDocs(
                    lastDoc ? query(q, startAfter(lastDoc)) : q
                  );
                  
                  if (querySnapshot.empty) {
                    hasMore = false;
                    continue;
                  }
                  
                  // Delete each connection
                  const deletePromises = querySnapshot.docs.map((doc: any) => deleteDoc(doc.ref));
                  await Promise.all(deletePromises);
                  
                  lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
                  hasMore = querySnapshot.docs.length === 50;
                }

                // Delete all existing chats for this user
                const chatsRef = collection(db, "chats");
                const chatsQuery = query(
                  chatsRef,
                  where("participants", "array-contains", currentUserUID),
                  limit(50) // Add limit to prevent Bloom filter issues
                );
                
                lastDoc = null;
                hasMore = true;
                
                while (hasMore) {
                  const chatsSnapshot = await getDocs(
                    lastDoc ? query(chatsQuery, startAfter(lastDoc)) : chatsQuery
                  );
                  
                  if (chatsSnapshot.empty) {
                    hasMore = false;
                    continue;
                  }
                  
                  // Delete each chat
                  const deleteChatPromises = chatsSnapshot.docs.map((doc: any) => deleteDoc(doc.ref));
                  await Promise.all(deleteChatPromises);
                  
                  lastDoc = chatsSnapshot.docs[chatsSnapshot.docs.length - 1];
                  hasMore = chatsSnapshot.docs.length === 50;
                }
                
                // Refresh the users list
                await fetchUsers();
                
                Alert.alert("Success", "Your swipe history has been reset!");
              } catch (error) {
                console.error("Error resetting swipe history:", error);
                Alert.alert("Error", "Failed to reset swipe history. Please try again.");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error("Error in reset confirmation:", error);
    }
  };

  // Create animated styles
  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ scale: scaleAnim.value }]
  }));

  const cardsContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: headerSlideAnim.value },
      { scale: scaleAnim.value }
    ]
  }));

  const quickMessageStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [
      { translateY: listSlideAnim.value },
      { scale: scaleAnim.value }
    ]
  }));

  /** Loading state */
  if (loading || isLoadingUsers) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        style={styles.loadingContainer}
      >
        <LoadingScreen message="Finding travelers near you..." />
      </Animated.View>
    );
  }

  /** Error state */
  if (error) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        style={styles.loadingContainer}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
            <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
            <View style={styles.stateContainer}>
              <Text style={[styles.errorText, { color: theme === "light" ? "#FF3B30" : "#FF3B30" }]}>{error}</Text>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </Animated.View>
    );
  }

  /** No users available state */
  if (!users.length) {
    return (
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(300)}
        style={styles.loadingContainer}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1, marginBottom: -40 }}>
            <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
            <View style={[styles.stateContainer, { paddingHorizontal: 32, alignItems: 'center' }]}> 
              <MaterialIcons name="person-off" size={64} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={{ marginBottom: 24 }} />
              <Text style={[styles.emptyStateText, { color: theme === "light" ? "#37a4c8" : "#37a4c8", fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' }]}>No users found at {airportName || (currentUserData?.airportCode || "this airport")}.</Text>
              <Text style={{ color: theme === "light" ? "#64748B" : "#CBD5E1", fontSize: 15, textAlign: 'center', marginBottom: 24 }}>
                We couldn't find any travelers at this airport right now. Check back later!
              </Text>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </Animated.View>
    );
  }

  /** Main Swiper view */
  return (
    <Animated.View 
      style={[styles.loadingContainer, containerStyle]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1, marginBottom: -40 }}>
          <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
          <View style={{ flex: 1 }}>
            {showSwiper ? (
              <>
                <Animated.View style={[styles.cardsContainer, cardsContainerStyle]}>
                  {users.length > 0 ? (
                    <GestureDetector gesture={gesture}>
                      <Animated.View 
                        style={[
                          styles.cardContainer, 
                          cardStyle, 
                          { 
                            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                            borderColor: "#37a4c8",
                          }
                        ]}
                      >
                        {currentUser && renderCard(currentUser)}
                        <Animated.View style={[styles.overlayLabel, styles.likeLabel, likeStyle]}>
                          <View style={styles.labelContainer}>
                            <MaterialIcons name="people" size={32} color="#4CD964" />
                            <Text style={styles.likeText}>CONNECT</Text>
                          </View>
                        </Animated.View>
                        <Animated.View style={[styles.overlayLabel, styles.nopeLabel, nopeStyle]}>
                          <View style={styles.labelContainer}>
                            <MaterialIcons name="thumb-down" size={32} color="#FF3B30" />
                            <Text style={styles.nopeText}>NOPE</Text>
                          </View>
                        </Animated.View>
                      </Animated.View>
                    </GestureDetector>
                  ) : (
                    <Animated.View 
                      entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
                      style={[
                        styles.emptyStateContainer, 
                        { 
                          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                          opacity: fadeAnim,
                          transform: [{ scale: scaleAnim }]
                        }
                      ]}
                    >
                      <MaterialIcons name="person-off" size={64} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={{ marginBottom: 24 }} />
                      <Text style={[styles.emptyStateText, { color: theme === "light" ? "#37a4c8" : "#37a4c8" }]}>
                        No more users at {airportName || (currentUserData?.airportCode || "this airport")}
                      </Text>
                      <Text style={{ color: theme === "light" ? "#64748B" : "#CBD5E1", fontSize: 15, textAlign: 'center', marginTop: 8 }}>
                        Check back later for more travelers!
                      </Text>
                    </Animated.View>
                  )}
                </Animated.View>
              </>
            ) : (
              <Animated.View 
                entering={FadeIn.duration(300)}
                style={[styles.loadingContainer, cardsContainerStyle]}
              >
                <LoadingScreen message="Finding travelers near you..." />
              </Animated.View>
            )}
          </View>
        </LinearGradient>
      </SafeAreaView>
    </Animated.View>
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
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 'auto',
    marginBottom: 70,
    backfaceVisibility: 'hidden',
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#38a5c9",
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
    height: CARD_HEIGHT * 0.6,
    position: 'relative',
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 165, 201, 0.2)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 4,
    fontWeight: "500",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 4,
    alignSelf: 'flex-start',
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
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  messagesContainer: {
    padding: 16,
  },
  presetMessageButton: {
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#000000',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#37a4c8',
    marginHorizontal: 'auto',
    marginBottom: 70,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default Swipe;