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
import {
  Gesture,
  GestureDetector,
  PanGestureHandler,
} from "react-native-gesture-handler";
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
}

interface Connection {
  user1: string;
  user2: string;
}

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.55;
const IMAGE_HEIGHT = CARD_HEIGHT * 0.54;

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

// Memoized DataToggle component
const MemoizedDataToggle = React.memo(({ 
  useFakeData, 
  isTestLoading, 
  setUseFakeData, 
  setIsTestLoading,
  theme 
}: { 
  useFakeData: boolean;
  isTestLoading: boolean;
  setUseFakeData: (value: boolean) => void;
  setIsTestLoading: (value: boolean) => void;
  theme: "light" | "dark";
}) => (
  <View style={styles.dataToggleContainer}>
    <TouchableOpacity 
      style={[
        styles.dataToggleButton,
        !useFakeData && !isTestLoading && styles.dataToggleButtonActive,
        { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
      ]}
      onPress={() => {
        setUseFakeData(false);
        setIsTestLoading(false);
      }}
    >
      <MaterialIcons name="people" size={20} color={!useFakeData && !isTestLoading ? "#37a4c8" : "#64748B"} />
      <Text style={[
        styles.dataToggleText,
        { color: !useFakeData && !isTestLoading ? "#37a4c8" : "#64748B" }
      ]}>Real Users</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[
        styles.dataToggleButton,
        useFakeData && !isTestLoading && styles.dataToggleButtonActive,
        { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
      ]}
      onPress={() => {
        setUseFakeData(true);
        setIsTestLoading(false);
      }}
    >
      <MaterialIcons name="computer" size={20} color={useFakeData && !isTestLoading ? "#37a4c8" : "#64748B"} />
      <Text style={[
        styles.dataToggleText,
        { color: useFakeData && !isTestLoading ? "#37a4c8" : "#64748B" }
      ]}>Test Data</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[
        styles.dataToggleButton,
        isTestLoading && styles.dataToggleButtonActive,
        { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
      ]}
      onPress={() => {
        setUseFakeData(false);
        setIsTestLoading(true);
      }}
    >
      <MaterialIcons name="hourglass-empty" size={20} color={isTestLoading ? "#37a4c8" : "#64748B"} />
      <Text style={[
        styles.dataToggleText,
        { color: isTestLoading ? "#37a4c8" : "#64748B" }
      ]}>Test Loading</Text>
    </TouchableOpacity>
  </View>
));

// Memoized Navigation Buttons component
const MemoizedNavigationButtons = React.memo(({ 
  onBack, 
  onProfile, 
  currentUser,
  theme 
}: { 
  onBack: () => void;
  onProfile: () => void;
  currentUser: User | null;
  theme: "light" | "dark";
}) => (
  <View style={styles.navigationButtons}>
    <TouchableOpacity 
      style={[styles.navButton, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]} 
      onPress={onBack}
    >
      <MaterialIcons name="arrow-back" size={24} color="#37a4c8" />
      <Text style={[styles.navButtonText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Go Back</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[styles.navButton, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]} 
      onPress={onProfile}
      disabled={!currentUser}
    >
      <MaterialIcons name="person" size={24} color="#37a4c8" />
      <Text style={[styles.navButtonText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>View Profile</Text>
    </TouchableOpacity>
  </View>
));

// Data Mode Toggle component
const DataModeToggle = React.memo(({ 
  dataMode, 
  setDataMode,
  theme 
}: { 
  dataMode: 'real' | 'fake' | 'none';
  setDataMode: (mode: 'real' | 'fake' | 'none') => void;
  theme: "light" | "dark";
}) => (
  <View style={styles.dataModeToggleContainer}>
    <TouchableOpacity 
      style={[
        styles.dataModeToggleButton,
        dataMode === 'real' && styles.dataModeToggleButtonActive,
        { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
      ]}
      onPress={() => setDataMode('real')}
    >
      <MaterialIcons name="people" size={16} color={dataMode === 'real' ? "#37a4c8" : "#64748B"} />
      <Text style={[
        styles.dataModeToggleText,
        { color: dataMode === 'real' ? "#37a4c8" : "#64748B" }
      ]}>Real</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[
        styles.dataModeToggleButton,
        dataMode === 'fake' && styles.dataModeToggleButtonActive,
        { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
      ]}
      onPress={() => setDataMode('fake')}
    >
      <MaterialIcons name="computer" size={16} color={dataMode === 'fake' ? "#37a4c8" : "#64748B"} />
      <Text style={[
        styles.dataModeToggleText,
        { color: dataMode === 'fake' ? "#37a4c8" : "#64748B" }
      ]}>Fake</Text>
    </TouchableOpacity>
    <TouchableOpacity 
      style={[
        styles.dataModeToggleButton,
        dataMode === 'none' && styles.dataModeToggleButtonActive,
        { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
      ]}
      onPress={() => setDataMode('none')}
    >
      <MaterialIcons name="person-off" size={16} color={dataMode === 'none' ? "#37a4c8" : "#64748B"} />
      <Text style={[
        styles.dataModeToggleText,
        { color: dataMode === 'none' ? "#37a4c8" : "#64748B" }
      ]}>None</Text>
    </TouchableOpacity>
  </View>
));

// New LoadingCard component
const LoadingCard = React.memo(({ theme }: { theme: "light" | "dark" }) => {
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: interpolate(
      pulseAnim.value,
      [1, 1.2],
      [0.5, 1],
      Extrapolate.CLAMP
    )
  }));

  return (
    <View style={[styles.cardContainer, styles.cardShadow]}>
      <View style={[styles.cardContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a", position: 'relative' }]}>
        <View style={[styles.imageContainer, { backgroundColor: theme === "light" ? "#f3f4f6" : "#2a2a2a" }]}>
          <View style={styles.imageOverlay}>
            <View style={styles.profileHeader}>
              <View style={{ width: "60%", height: 24, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", borderRadius: 4 }} />
              <View style={{ width: "40%", height: 20, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", marginTop: 8, borderRadius: 4 }} />
            </View>
          </View>
        </View>
        <View style={[styles.contentContainer, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ width: 18, height: 18, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", borderRadius: 4 }} />
              <View style={{ width: "80%", height: 16, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", marginLeft: 8, borderRadius: 4 }} />
            </View>
            <View style={[styles.divider, { backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a" }]} />
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ width: 18, height: 18, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", borderRadius: 4 }} />
              <View style={{ width: "90%", height: 16, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", marginLeft: 8, borderRadius: 4 }} />
            </View>
            <View style={[styles.divider, { backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a" }]} />
          </View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ width: 18, height: 18, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", borderRadius: 4 }} />
              <View style={{ width: "70%", height: 16, backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a", marginLeft: 8, borderRadius: 4 }} />
            </View>
            <View style={[styles.divider, { backgroundColor: theme === "light" ? "#e5e7eb" : "#3a3a3a" }]} />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingDot, pulseStyle, { backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9" }]} />
        </View>
      </View>
    </View>
  );
});

// Modify SwipeCard component to handle loading state
const SwipeCard = React.memo(({ 
  user, 
  gesture, 
  cardStyle, 
  likeStyle, 
  nopeStyle,
  theme,
  isAnimating
}: { 
  user: User | null;
  gesture: any;
  cardStyle: any;
  likeStyle: any;
  nopeStyle: any;
  theme: "light" | "dark";
  isAnimating: boolean;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Move useEffect outside of any conditions
  useEffect(() => {
    const loadImage = async () => {
      if (!user?.profilePicture) {
        setImageLoaded(true);
        imageOpacity.value = withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
        contentOpacity.value = withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
        return;
      }

      try {
        // Reset states
        setImageLoaded(false);
        imageOpacity.value = 0;
        contentOpacity.value = 0;

        // Preload image
        await Image.prefetch(user.profilePicture);
        
        // Fade in image first
        imageOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
        
        // Then fade in content
        contentOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
        
        setImageLoaded(true);
      } catch (error) {
        console.error('Error preloading image:', error);
        setImageLoaded(true);
        // Still fade in content even if image fails
        imageOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
        contentOpacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadImage();
  }, [user?.profilePicture]);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      {
        scale: interpolate(
          imageOpacity.value,
          [0, 1],
          [0.95, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      {
        translateY: interpolate(
          contentOpacity.value,
          [0, 1],
          [10, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  if (!user) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View 
        style={[
          styles.cardContainer, 
          cardStyle, 
          { 
            borderColor: "#37a4c8",
          }
        ]}
      >
        {isAnimating || isInitialLoad ? (
          <LoadingCard theme={theme} />
        ) : (
          <>
            <LinearGradient
              colors={theme === "light" ? ["#FFFFFF", "#FFFFFF"] : ["#000000", "#1a1a1a"]}
              style={[styles.cardContent]}
            >
              <View style={styles.imageContainer}> 
                <Animated.View style={[styles.profileImageContainer, imageStyle]}>
                  <Image
                    source={{ 
                      uri: user.profilePicture || 'https://via.placeholder.com/400x400?text=No+Photo'
                    }}
                    style={styles.profileImage}
                    defaultSource={require('../../assets/adaptive-icon.png')}
                  />
                </Animated.View>
                <LinearGradient
                  colors={['transparent', theme === "light" ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)']}
                  style={styles.imageOverlay}
                >
                  <Animated.View style={[styles.profileHeader, animatedContentStyle]}>
                    <Text style={styles.nameText}>
                      {user.name}, {user.age}
                    </Text>
                    <View style={[styles.locationContainer, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]}> 
                      <MaterialIcons name="location-on" size={16} color="#37a4c8" />
                      <Text style={styles.locationText}>{user.airportCode}</Text>
                    </View>
                  </Animated.View>
                </LinearGradient>
              </View>
              <Animated.View style={[styles.contentContainer]}> 
                {user.bio && (
                  <View style={styles.section}> 
                    <View style={styles.sectionHeader}> 
                      <MaterialIcons name="person" size={18} color="#37a4c8" />
                      <Text 
                        style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}
                        numberOfLines={3}
                        ellipsizeMode="tail"
                      >
                        {user.bio.length > 120 ? `${user.bio.substring(0, 120)}...` : user.bio}
                      </Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
                  </View>
                )}
                <View style={styles.section}> 
                  <View style={styles.sectionHeader}> 
                    <MaterialIcons name="translate" size={18} color="#37a4c8" />
                    <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}> 
                      {user.languages?.join(" • ")}
                      {user.interests && user.interests.length > 0 && (
                        <Text style={{ color: theme === "light" ? "#64748B" : "#94A3B8" }}>
                          {" • "}{user.interests.join(" • ")}
                        </Text>
                      )}
                    </Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
                </View>
                {user.moodStatus && (
                  <View style={[styles.moodContainer, { 
                    backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.1)" : "rgba(56, 165, 201, 0.1)",
                    alignSelf: 'center',
                    marginTop: 'auto',
                    marginBottom: 8
                  }]}> 
                    <MaterialIcons name="mood" size={16} color="#37a4c8" />
                    <Text style={styles.moodText}>{user.moodStatus}</Text>
                  </View>
                )}
              </Animated.View>
            </LinearGradient>
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
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
});

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
  const [showLoadingCard, setShowLoadingCard] = useState(false);
  const loadingStartTime = useRef<number | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const { theme: colorScheme } = React.useContext(ThemeContext);
  const theme = colorScheme || "light"; // Provide default value
  const [showMessageOptions, setShowMessageOptions] = useState(false);

  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

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
      setShowLoadingCard(true);
      loadingStartTime.current = Date.now();

      const currentUserIndex = currentIndex.value;
      if (currentUserIndex >= users.length) {
        isAnimating.value = false;
        setShowLoadingCard(false);
        return;
      }

      // Start processing the swipe immediately
      if (direction === "right") {
        onSwipedRight(currentUserIndex);
      } else {
        onSwipedLeft(currentUserIndex);
      }
      
      // Quick animation for current card only
      translateX.value = withTiming(direction === "right" ? width * 1.5 : -width * 1.5, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
      
      // Process the next card after animation
      setTimeout(() => {
        try {
          // Reset transform values
          translateX.value = direction === "right" ? -width * 1.5 : width * 1.5;
          
          // Update currentIndex to point to the next user
          currentIndex.value = Math.min(currentUserIndex + 1, users.length - 1);
          
          // Quick slide in for next card
          translateX.value = withTiming(0, {
            duration: 150,
            easing: Easing.out(Easing.cubic),
          });
          
          // Ensure loading dot is visible for at least 1 second
          const elapsed = Date.now() - (loadingStartTime.current || 0);
          const minDuration = 1000;
          const remaining = Math.max(0, minDuration - elapsed);
          
          setTimeout(() => {
            isAnimating.value = false;
            setShowLoadingCard(false);
          }, remaining);
        } catch (error) {
          console.error('Error in swipe animation completion:', error);
          isAnimating.value = false;
          setShowLoadingCard(false);
        }
      }, 150);
    } catch (error) {
      console.error('Error in handleSwipe:', error);
      isAnimating.value = false;
      setShowLoadingCard(false);
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
      const dislikedUsers = currentUserData?.dislikedUsers || [];
      const likedUsers = currentUserData?.likedUsers || [];
      
      console.log('Current user airport:', currentUserAirport);
      console.log('Current user blocked users:', blockedUsers);
      console.log('Users who blocked current user:', hasMeBlocked);
      console.log('Disliked users:', dislikedUsers);
      console.log('Liked users:', likedUsers);

      if (!currentUserAirport) {
        console.log('No airport code found for current user');
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
          // First check if this is the current user
          if (user.id === currentUserUID) {
            console.log('Filtering out current user:', user.id);
            return false;
          }

          const lastLogin = user.lastLogin?.toDate?.() || new Date(0);
          const isRecent = lastLogin >= oneHourAgo;
          const isNotConnected = !connectedUserIds.has(user.id);
          const isNotBlocked = !blockedUsers.includes(user.id);
          const hasNotBlockedMe = !hasMeBlocked.includes(user.id);
          const hasNotBlockedCurrentUser = !user.blockedUsers?.includes(currentUserUID);
          const currentUserHasNotBlockedThem = !user.hasMeBlocked?.includes(currentUserUID);
          const isNotDisliked = !dislikedUsers.includes(user.id);
          const isNotLiked = !likedUsers.includes(user.id);
          
          return isRecent && isNotConnected && 
                 isNotBlocked && hasNotBlockedMe && 
                 hasNotBlockedCurrentUser && currentUserHasNotBlockedThem &&
                 isNotDisliked && isNotLiked;
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

  /** Render individual user card */
  const renderCard = (user: User) => {
    if (!user) return null;

    return (
      <Animated.View style={[styles.cardContainer, styles.cardShadow]}>
        <View style={[styles.cardContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
          {/* Profile Image Section */}
          <View style={styles.imageContainer}>
            <UserAvatar
              user={user}
              size={400}
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

          {/* Content Section - Now with only 3 rows */}
          <View style={[styles.contentContainer, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
            {/* Row 1: Bio - Most important for initial connection */}
            {user.bio && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="person" size={18} color="#37a4c8" />
                  <Text 
                    style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {user.bio.length > 120 ? `${user.bio.substring(0, 120)}...` : user.bio}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
              </View>
            )}

            {/* Row 2: Languages & Interests - Combined for better space usage */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="translate" size={18} color="#37a4c8" />
                <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                  {user.languages?.join(" • ")}
                  {user.interests && user.interests.length > 0 && (
                    <Text style={{ color: theme === "light" ? "#64748B" : "#94A3B8" }}>
                      {" • "}{user.interests.join(" • ")}
                    </Text>
                  )}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
            </View>

            {/* Row 3: Mood Status - Small badge at the bottom */}
            {user.moodStatus && (
              <View style={[styles.moodContainer, { 
                backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.1)" : "rgba(56, 165, 201, 0.1)",
                alignSelf: 'center',
                marginTop: 'auto',
                marginBottom: 8
              }]}> 
                <MaterialIcons name="mood" size={16} color="#37a4c8" />
                <Text style={styles.moodText}>{user.moodStatus}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

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

  /** Main Swiper view */
  return (
    <View style={{ flex: 1 }}>
      <TopBar onProfilePress={() => router.push(`/profile/${currentUserUID}`)} notificationCount={notificationCount} />
      <SafeAreaWrapper edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#FFFFFF", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
          <Animated.View style={[styles.cardsContainer, cardsContainerStyle]}>
            {users.length > 0 && currentIndex.value < users.length ? (
              <>
                <SwipeCard
                  user={currentUser}
                  gesture={gesture}
                  cardStyle={cardStyle}
                  likeStyle={likeStyle}
                  nopeStyle={nopeStyle}
                  theme={theme}
                  isAnimating={showLoadingCard}
                />
                <MemoizedNavigationButtons
                  onBack={() => router.back()}
                  onProfile={() => currentUser && router.push(`/profile/${currentUser.id}`)}
                  currentUser={currentUser}
                  theme={theme}
                />
              </>
            ) : (
              <Animated.View 
                entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
                style={[
                  styles.cardContainer, 
                  styles.cardShadow,
                  { 
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }]
                  }
                ]}
              >
                <LinearGradient
                  colors={theme === "light" ? ["#FFFFFF", "#FFFFFF"] : ["#000000", "#1a1a1a"]}
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
                    <LinearGradient
                      colors={['transparent', theme === "light" ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)']}
                      style={styles.imageOverlay}
                    >
                      <View style={styles.profileHeader}>
                        <Text style={styles.nameText}>
                          No Nearby Users
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Content Container - Empty State */}
                  <View style={[styles.contentContainer, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="info" size={18} color="#37a4c8" />
                        <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                          We couldn't find any more travelers at this airport right now.
                        </Text>
                      </View>
                      <View style={[styles.divider, { backgroundColor: theme === "light" ? "rgba(56, 165, 201, 0.2)" : "rgba(56, 165, 201, 0.2)" }]} />
                    </View>
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <MaterialIcons name="schedule" size={18} color="#37a4c8" />
                        <Text style={[styles.sectionContent, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
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
                
                {/* Reset History Button */}
                <TouchableOpacity
                  style={[
                    styles.clearHistoryButton,
                    { 
                      backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      right: 16,
                      zIndex: 10
                    }
                  ]}
                  onPress={resetSwipeHistory}
                >
                  <MaterialIcons name="history" size={20} color="#37a4c8" />
                  <Text style={[styles.clearHistoryButtonText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Reset History
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>
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
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 'auto',
    marginBottom: 21,
    backfaceVisibility: 'hidden',
    borderWidth: 1,
    borderColor: "#38a5c9",
    position: 'relative',
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
  profileImageContainer: {
    width: '100%',
    height: '100%',
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
    backgroundColor: "#FFFFFF",
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
    marginBottom: 70,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
});

export default Swipe;