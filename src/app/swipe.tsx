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
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import useUsers from "./../hooks/useUsers";
import { arrayUnion, doc, onSnapshot, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import useAuth from "../hooks/auth";
import { router } from "expo-router";
import { db } from "../../config/firebaseConfig";
import TopBar from "../components/TopBar";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
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
}

interface Connection {
  user1: string;
  user2: string;
}

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.55;

const Swipe = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const { getUsers, updateUser, loading, error } = useUsers();
  const { user } = useAuth();
  const { addMessage } = useChats();
  const currentUserUID = user?.uid || "some-uid";
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSwiper, setShowSwiper] = useState(false);
  const [showQuickMessage, setShowQuickMessage] = useState(false);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const buttonScale = useSharedValue(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { theme } = React.useContext(ThemeContext);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardRotation = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const lastDirection = useSharedValue<'left' | 'right' | null>(null);
  const currentIndex = useSharedValue(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  const gesture = Gesture.Pan()
    .onBegin(() => {
      if (isAnimating.value) return;
      lastDirection.value = null;
    })
    .onUpdate((event) => {
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
    })
    .onEnd((event) => {
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
    })
    .onFinalize(() => {
      if (!isAnimating.value && Math.abs(translateX.value) < width * 0.2) {
        runOnJS(resetCard)();
      }
    });

  const handleSwipe = (direction: "left" | "right") => {
    if (isAnimating.value || !users.length) return;
    isAnimating.value = true;

    const currentUserIndex = currentIndex.value;
    if (currentUserIndex >= users.length) {
      isAnimating.value = false;
      return;
    }

    if (direction === "right") {
      onSwipedRight(currentUserIndex);
    } else {
      onSwipedLeft(currentUserIndex);
    }
    
    translateX.value = withSpring(direction === "right" ? width * 1.5 : -width * 1.5, {
      damping: 15,
      stiffness: 100,
      velocity: direction === "right" ? 1000 : -1000,
    });
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
    cardRotation.value = withSpring(direction === "right" ? 30 : -30, {
      damping: 15,
      stiffness: 100,
    });
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        translateX.value = 0;
        translateY.value = 0;
        cardRotation.value = 0;
        
        // Update currentIndex only if there are more users
        if (currentUserIndex + 1 < users.length) {
          currentIndex.value = currentUserIndex + 1;
        } else {
          // If we've reached the end, reset to 0 or handle empty state
          currentIndex.value = 0;
          if (users.length === 0) {
            setShowSwiper(false);
          }
        }
        
        isAnimating.value = false;
      }, 300);
    });
  };

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-30, 0, 30],
      Extrapolate.CLAMP
    );
    
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, width * 0.2],
      [1, 0.95],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale },
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

  /** Fetch users and filter based on likedUsers and dislikedUsers */
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      
      // Get current user's airport code
      const currentUserDoc = await doc(db, "users", currentUserUID);
      const currentUserSnapshot = await getDoc(currentUserDoc);
      const currentUserAirport = currentUserSnapshot.data()?.airportCode;

      if (!currentUserAirport) {
        Alert.alert("Error", "Please set your airport code in your profile.");
        return;
      }

      // Calculate timestamp for 1 hour ago
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // Query users with the same airport code and recent updates
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("airportCode", "==", currentUserAirport),
        where("updatedAt", ">=", oneHourAgo)
      );

      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      const likedAndDisliked = [
        ...(currentUserData?.likedUsers || []),
        ...(currentUserData?.dislikedUsers || []),
      ];
      
      const filteredUsers = fetchedUsers.filter(
        (user) => user.id !== currentUserUID && !likedAndDisliked.includes(user.id)
      );
      
      setUsers(filteredUsers);
      setShowSwiper(filteredUsers.length > 0);
    } catch (err) {
      Alert.alert("Error", "Failed to fetch users. Please try again later.");
      console.error("Error fetching users:", err);
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
          
          // Create a new chat when there's a match
          const chatData = {
            participants: [currentUserUID, swipedUserUID],
            createdAt: new Date(),
            lastMessage: null,
          };
          
          try {
            const chatsCollection = collection(db, "chats");
            const docRef = await addDoc(chatsCollection, chatData);
            setChatId(docRef.id);
            setMatchedUser(swipedUser);
            setShowQuickMessage(true);
          } catch (error) {
            console.error("Error creating chat:", error);
          }
        }
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

  /** Loading state */
  if (loading || isLoadingUsers) {
    return <LoadingScreen message="Finding travelers near you..." />;
  }

  /** Error state */
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
          <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
          <View style={styles.stateContainer}>
            <Text style={[styles.errorText, { color: theme === "light" ? "#FF3B30" : "#FF3B30" }]}>{error}</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme === "light" ? "#37a4c8" : "#37a4c8" }]} onPress={fetchUsers}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  /** No users available state */
  if (!users.length) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1, marginBottom: -40 }}>
          <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
          <View style={styles.stateContainer}>
            <Text style={[styles.emptyStateText, { color: theme === "light" ? "#37a4c8" : "#37a4c8" }]}>No users found nearby.</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: theme === "light" ? "#37a4c8" : "#37a4c8" }]} onPress={fetchUsers}>
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  /** Main Swiper view */
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1, marginBottom: -40 }}>
        <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
        <View style={{ flex: 1 }}>
          {showSwiper && users.length > 0 ? (
            <>
              <View style={styles.cardsContainer}>
                <GestureDetector gesture={gesture}>
                  <Animated.View style={[styles.cardContainer, cardStyle, { 
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    borderColor: "#37a4c8"
                  }]}>
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
              </View>
              
              {/* Quick Message Button */}
              <View style={styles.quickMessageButtonContainer}>
                <Animated.View style={buttonStyle}>
                  <TouchableOpacity 
                    style={[styles.quickMessageButton, { 
                      backgroundColor: theme === "light" ? "#37a4c8" : "#37a4c8",
                      borderColor: theme === "light" ? "#37a4c8" : "#37a4c8"
                    }]}
                    onPress={() => {
                      if (currentUser) {
                        handleShowMessageOptions(currentUser);
                      }
                    }}
                  >
                    <MaterialIcons name="message" size={24} color="#FFF" />
                    <Text style={styles.quickMessageButtonText}>Send Quick Message</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </>
          ) : (
            <LoadingScreen message="Loading user profiles..." />
          )}
          
          {/* Message Options Modal */}
          {showMessageOptions && selectedUser && (
            <View style={[styles.messageOptionsContainer, { backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.8)" }]}>
              <View style={[styles.messageOptionsContent, { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderColor: "#37a4c8"
              }]}>
                <View style={[styles.messageOptionsHeader, { 
                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}>
                  <Text style={[styles.messageOptionsTitle, { color: theme === "light" ? "#37a4c8" : "#37a4c8" }]}>Quick Messages</Text>
                  <Text style={[styles.messageOptionsSubtitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Send a message to {selectedUser.name}</Text>
                  <TouchableOpacity 
                    style={[styles.closeButton, { 
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                      borderColor: "#37a4c8"
                    }]}
                    onPress={() => setShowMessageOptions(false)}
                  >
                    <MaterialIcons name="close" size={20} color={theme === "light" ? "#000000" : "#e4fbfe"} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.messagesContainer}>
                  <View style={styles.messageSection}>
                    <Text style={[styles.messageSectionTitle, { color: theme === "light" ? "#37a4c8" : "#37a4c8" }]}>Preset Messages</Text>
                    {presetMessages.map((message, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.presetMessageButton, { 
                          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                          borderColor: "#37a4c8"
                        }]}
                        onPress={() => {
                          sendQuickMessage(message, selectedUser.id);
                        }}
                      >
                        <Text style={[styles.presetMessageText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{message}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={styles.messageSection}>
                    <Text style={[styles.messageSectionTitle, { color: theme === "light" ? "#37a4c8" : "#37a4c8" }]}>Chat Options</Text>
                    <TouchableOpacity
                      style={[styles.presetMessageButton, styles.chatButton, { 
                        backgroundColor: theme === "light" ? "#37a4c8" : "#37a4c8",
                        borderColor: theme === "light" ? "#37a4c8" : "#37a4c8"
                      }]}
                      onPress={() => {
                        const findOrCreateChat = async () => {
                          try {
                            // First check if a chat already exists between these users
                            const chatsCollection = collection(db, "chats");
                            const q = query(
                              chatsCollection, 
                              where("participants", "array-contains", currentUserUID)
                            );
                            
                            const querySnapshot = await getDocs(q);
                            let existingChatId = null;
                            
                            // Check each chat to see if it contains both users
                            for (const doc of querySnapshot.docs) {
                              const chatData = doc.data();
                              if (chatData.participants.includes(selectedUser.id)) {
                                existingChatId = doc.id;
                                break;
                              }
                            }
                            
                            if (existingChatId) {
                              // Use the existing chat
                              router.push(`/chat/${existingChatId}`);
                            } else {
                              // Create a new chat if none exists
                              const chatData = {
                                participants: [currentUserUID, selectedUser.id],
                                createdAt: new Date(),
                                lastMessage: null,
                              };
                              
                              const docRef = await addDoc(chatsCollection, chatData);
                              router.push(`/chat/${docRef.id}`);
                            }
                            
                            setShowMessageOptions(false);
                          } catch (error) {
                            console.error("Error finding or creating chat:", error);
                            Alert.alert("Error", "Failed to open chat. Please try again.");
                          }
                        };
                        
                        findOrCreateChat();
                      }}
                    >
                      <MaterialIcons name="chat" size={20} color="#FFF" />
                      <Text style={[styles.presetMessageText, { color: '#FFF' }]}>Open Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
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
  quickMessageButtonContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    marginBottom: 60,
  },
  quickMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38a5c9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  quickMessageButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
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
});

export default Swipe;