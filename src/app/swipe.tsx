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
import { arrayUnion, doc, onSnapshot } from "firebase/firestore";
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
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  PanGestureHandler,
} from "react-native-gesture-handler";

interface User {
  id: string;
  name: string;
  age?: number;
  profilePicture?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  goals?: string[];
  travelHistory?: string[];
  moodStatus?: string;
  likedUsers?: string[];
  dislikedUsers?: string[];
}

interface Connection {
  user1: string;
  user2: string;
}

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.80;

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

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const cardRotation = useSharedValue(0);
  const currentIndex = useRef(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      cardRotation.value = interpolate(
        event.translationX,
        [-width / 2, 0, width / 2],
        [-30, 0, 30],
        Extrapolate.CLAMP
      );
    })
    .onEnd((event) => {
      const shouldSwipe = Math.abs(event.translationX) > width * 0.25;
      
      if (shouldSwipe) {
        const direction = event.translationX > 0 ? "right" : "left";
        runOnJS(handleSwipe)(direction);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        cardRotation.value = withSpring(0);
      }
    });

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "right") {
      onSwipedRight(currentIndex.current);
    } else {
      onSwipedLeft(currentIndex.current);
    }
    
    translateX.value = withSpring(direction === "right" ? width * 1.5 : -width * 1.5);
    translateY.value = withSpring(0);
    cardRotation.value = withSpring(direction === "right" ? 30 : -30);
    
    setTimeout(() => {
      translateX.value = 0;
      translateY.value = 0;
      cardRotation.value = 0;
      currentIndex.current = (currentIndex.current + 1) % users.length;
    }, 300);
  };

  const cardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${cardRotation.value}deg` },
      ],
    };
  });

  const likeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, width * 0.25],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const nopeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-width * 0.25, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
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
      const fetchedUsers = await getUsers() as User[];
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
    }
  };

  /** Handle right swipe (like) */
  const onSwipedRight = async (index: number) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    const swipedUser = users[index];
    const swipedUserUID = swipedUser.id;

    try {
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
      Alert.alert("Error", "Failed to process swipe. Please try again.");
      console.error("Error processing right swipe:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /** Handle left swipe (dislike) */
  const onSwipedLeft = async (index: number) => {
    if (!users?.[index] || isProcessing) return;
    setIsProcessing(true);

    const swipedUser = users[index];
    const swipedUserUID = swipedUser.id;

    try {
      await updateUser(currentUserUID, {
        dislikedUsers: arrayUnion(swipedUserUID),
      });
      console.log("Swiped left on user:", swipedUser.name);
    } catch (err) {
      Alert.alert("Error", "Failed to process swipe. Please try again.");
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
        <View style={styles.cardContent}>
          <View style={styles.profileHeader}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
                style={styles.profileImage}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.nameText}>
                {user.name}, {user.age || ""}
              </Text>
              <View style={styles.moodContainer}>
                <MaterialIcons name="mood" size={20} color="#38a5c9" />
                <Text style={styles.moodText}>{user.moodStatus || "Exploring the world 🌍"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.contentContainer}>
            {renderSection("person", user.bio)}
            {renderSection("translate", user.languages)}
            {renderSection("favorite", user.interests)}
            {renderSection("work", user.goals)}
            {renderSection("flight-takeoff", user.travelHistory)}
          </View>
        </View>
      </Animated.View>
    );
  };

  /** Render profile section with icon and content */
  const renderSection = (iconName: keyof typeof MaterialIcons.glyphMap, content?: string | string[]) => {
    if (!content || (Array.isArray(content) && !content.length)) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={iconName} size={20} color="#38a5c9" />
          <Text style={styles.sectionContent}>
            {Array.isArray(content) ? content.join(" • ") : content}
          </Text>
        </View>
        <View style={styles.divider} />
      </View>
    );
  };

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleButtonPress = () => {
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });
    if (users.length > 0) {
      handleShowMessageOptions(users[currentIndex.current]);
    }
  };

  /** Loading state */
  if (loading) {
    return <LoadingScreen message="Finding travelers near you..." />;
  }

  /** Error state */
  if (error) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <LinearGradient colors={["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
          <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
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
        <LinearGradient colors={["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
          <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
          <View style={styles.stateContainer}>
            <Text style={styles.emptyStateText}>No users found nearby.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchUsers}>
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
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
        <TopBar onProfilePress={() => router.push(`profile/${currentUserUID}`)} />
        <View style={{ flex: 1 }}>
          {showSwiper && users.length > 0 ? (
            <>
              <View style={styles.cardsContainer}>
                <GestureDetector gesture={gesture}>
                  <Animated.View style={[styles.cardContainer, cardStyle]}>
                    {renderCard(users[currentIndex.current])}
                    <Animated.View style={[styles.overlayLabel, styles.likeLabel, likeStyle]}>
                      <Text style={styles.likeText}>LIKE</Text>
                    </Animated.View>
                    <Animated.View style={[styles.overlayLabel, styles.nopeLabel, nopeStyle]}>
                      <Text style={styles.nopeText}>NOPE</Text>
                    </Animated.View>
                  </Animated.View>
                </GestureDetector>
              </View>
              
              {/* Quick Message Button */}
              <View style={styles.quickMessageButtonContainer}>
                <Animated.View style={buttonStyle}>
                  <TouchableOpacity 
                    style={styles.quickMessageButton}
                    onPress={handleButtonPress}
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
            <View style={styles.messageOptionsContainer}>
              <View style={styles.messageOptionsContent}>
                <View style={styles.messageOptionsHeader}>
                  <Text style={styles.messageOptionsTitle}>Quick Messages</Text>
                  <Text style={styles.messageOptionsSubtitle}>Send a message to {selectedUser.name}</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowMessageOptions(false)}
                  >
                    <MaterialIcons name="close" size={20} color="#e4fbfe" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.messagesContainer}>
                  <View style={styles.messageSection}>
                    <Text style={styles.messageSectionTitle}>Preset Messages</Text>
                    {presetMessages.map((message, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.presetMessageButton}
                        onPress={() => {
                          sendQuickMessage(message, selectedUser.id);
                        }}
                      >
                        <Text style={styles.presetMessageText}>{message}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  <View style={styles.messageSection}>
                    <Text style={styles.messageSectionTitle}>Chat Options</Text>
                    <TouchableOpacity
                      style={[styles.presetMessageButton, styles.chatButton]}
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
    borderRadius: 12,
    overflow: "hidden",
    marginLeft: 10,
    marginTop: -40,
    backfaceVisibility: 'hidden',
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
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  profileHeader: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
  },
  imageContainer: {
    width: CARD_WIDTH - 40,
    height: CARD_HEIGHT * 0.35,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  profileInfo: {
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  nameText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#e4fbfe",
    textAlign: "center",
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    justifyContent: "center",
    width: "100%",
  },
  moodText: {
    fontSize: 16,
    color: "#38a5c9",
    marginLeft: 8,
    fontWeight: "500",
    flexShrink: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: "#e4fbfe",
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: "#38a5c9",
    marginVertical: 8,
    opacity: 0.3,
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
    width: '90%',
    maxHeight: '80%',
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#38a5c9',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  messageOptionsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#38a5c9',
    textAlign: 'center',
  },
  messageOptionsSubtitle: {
    fontSize: 16,
    color: '#e4fbfe',
    textAlign: 'center',
    marginTop: 8,
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
    padding: 20,
  },
  presetMessageButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38a5c9',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  presetMessageText: {
    fontSize: 16,
    color: '#e4fbfe',
    textAlign: 'center',
    lineHeight: 22,
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
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  quickMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38a5c9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
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
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    top: 60,
    padding: 10,
    borderRadius: 5,
    borderWidth: 2,
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
    fontSize: 24,
    fontWeight: '800',
  },
  nopeText: {
    color: '#FF3B30',
    fontSize: 24,
    fontWeight: '800',
  },
});

export default Swipe;