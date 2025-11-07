/**
 * Dashboard Screen
 * Main dashboard view showing user status, nearby users, events, and features
 * 
 * Performance optimizations:
 * - Memoized callbacks and computed values
 * - Virtualized lists with optimized props
 * - Cached data with custom hooks
 * - Error boundaries for graceful error handling
 */

import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, getDoc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { User } from "firebase/auth";
import * as Location from "expo-location";
import * as Notifications from 'expo-notifications';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";

// Context and Hooks
import { ThemeContext } from "../../context/ThemeContext";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";
import useNotificationCount from "../../hooks/useNotificationCount";
import useActivityCollapse from "../../hooks/useActivityCollapse";

// Components
import StatusSheet, { PresetStatus } from "../../components/StatusSheet";
import { router } from "expo-router";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import ActivityCard from "../../components/ActivityCard";
import LoadingImage from "../../components/LoadingImage";
import PingEventModal from "../../components/PingEventModal";
import ErrorBoundary from "../../components/ErrorBoundary";

// Dashboard Components
import FloatingActionButton from "../../components/dashboard/FloatingActionButton";
import FeatureGrid, { FeatureButton } from "../../components/dashboard/FeatureGrid";
import MoodStatusBar from "../../components/dashboard/MoodStatusBar";

// Utils and Types
import { isProfileComplete } from "../../utils/profileCompletionCheck";
import { 
  UserData, 
  DashboardItem, 
  SearchItem, 
  FlatListItem, 
  PopupData,
  UserLocation,
  EventData
} from "../../types/dashboard";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<FlatListItem>);

/**
 * Countdown Timer Component (Memoized for performance)
 */
const CountdownTimer = memo(({ startTime }: { startTime: Date }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const start = new Date(startTime);
      const difference = start.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeLeft('Starting now');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      let timeString = '';
      if (days > 0) timeString += `${days}d `;
      if (hours > 0) timeString += `${hours}h `;
      if (minutes > 0) timeString += `${minutes}m`;
      if (!timeString) timeString = 'Starting now';

      setTimeLeft(timeString.trim());
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <View style={[styles.countdownContainer, { 
      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
    }]}>
      <Feather 
        name="clock" 
        size={14} 
        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
      />
      <Text style={[styles.countdownText, { 
        color: theme === "light" ? "#37a4c8" : "#38a5c9"
      }]}>
        {timeLeft}
      </Text>
    </View>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

/**
 * Main Dashboard Component
 */
export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { theme } = React.useContext(ThemeContext);

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Animation values for theme transitions
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

  // Interpolate colors for smooth transitions
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e6e6e6', '#000000'],
    extrapolate: 'clamp'
  });

  const textColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#ffffff'],
    extrapolate: 'clamp'
  });

  // Update animation values when theme changes
  useEffect(() => {
    backgroundAnim.setValue(theme === "light" ? 0 : 1);
    textAnim.setValue(theme === "light" ? 0 : 1);
  }, [theme, backgroundAnim, textAnim]);

  const { user: authUser, userId } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { updateUser } = useUsers();
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];
  const [customStatus, setCustomStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [updatingMood, setUpdatingMood] = useState(false);
  const [searchHeaderHeight, setSearchHeaderHeight] = useState(0);
  const [defaultSearchHeight, setDefaultSearchHeight] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [popupData, setPopupData] = useState<PopupData>({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });

  // Ping Modal State
  const [showPingModal, setShowPingModal] = useState(false);

  // Handle ping modal open/close
  const handleOpenPingModal = useCallback(() => {
    setShowPingModal(true);
    toggleFabExpansion();
  }, []);

  const handleClosePingModal = useCallback(() => {
    setShowPingModal(false);
  }, []);

  const [displayText, setDisplayText] = useState<string>("");
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const displayTextRef = useRef<string>("");

  // FAB expansion state
  const [fabExpanded, setFabExpanded] = useState(false);

  // Track if we've shown the mood modal this session
  const hasShownMoodModalRef = useRef(false);

  // Random messages for alternating display (Memoized)
  const randomMessages = useMemo(() => [
    "Spontaneity starts here.",
    "Start the party. Ping now.",
    "Throw a vibe out there.",
    "Basketball at 5? Ping it.",
    "Something cool going down? Let people know.",
    "Invite the city. Ping it.",
    "Got plans? Drop a Ping.",
    "Open invite. You in?",
    "Kick something off. Ping it.",
    "Send it. Someone's down.",
    "It's time to lock in."
  ], []);

  // Function to handle FAB expansion (Memoized)
  const toggleFabExpansion = useCallback(() => {
    setFabExpanded(!fabExpanded);
  }, [fabExpanded]);

  // Function to handle text transition with fade (Memoized)
  const transitionText = useCallback((newText: string) => {
    // Fade out
    Animated.timing(textFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Change text
      setDisplayText(newText);
      displayTextRef.current = newText;
      // Wait 0.3 seconds before fading in
      setTimeout(() => {
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 300);
    });
  }, [textFadeAnim]);

  // Effect to alternate between mood status and random messages
  useEffect(() => {
    if (!userData) {
      setDisplayText("Set your mood status");
      return;
    }

    if (!userData.moodStatus) {
      setDisplayText("Set your mood status");
      return;
    }

    const initialText = `Current status: ${userData.moodStatus}`;
    setDisplayText(initialText);
    displayTextRef.current = initialText;

    // Trigger glow and scale animation for initial load
    Animated.sequence([
      Animated.parallel([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [userData?.moodStatus, glowAnim, scaleAnim]);

  // Separate effect for the interval
  useEffect(() => {
    if (!userData?.moodStatus) {
      return;
    }

    const interval = setInterval(() => {
      const currentText = displayTextRef.current;
      
      if (currentText.startsWith("Current status:")) {
        const randomIndex = Math.floor(Math.random() * randomMessages.length);
        transitionText(randomMessages[randomIndex]);
      } else {
        transitionText(`Current status: ${userData.moodStatus}`);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [userData?.moodStatus, transitionText, randomMessages]);

  const hasUpdatedRef = useRef(false);
  const [scrollY] = useState(new Animated.Value(0));
  
  // Memoized interpolations
  const searchHeaderOpacity = useMemo(() => scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  }), [scrollY]);

  const searchHeaderTranslateY = useMemo(() => scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  }), [scrollY]);

  const searchTransitionAnim = useRef(new Animated.Value(0)).current;
  const listOpacityAnim = useRef(new Animated.Value(0)).current;
  const listTranslateYAnim = useRef(new Animated.Value(20)).current;

  const notificationCount = useNotificationCount(userId);
  const { isCollapsed: activityCollapsed, isLoading: activityCollapseLoading, toggleCollapse: toggleActivityCollapse } = useActivityCollapse();

  // Memoized callback for showing popups
  const showPopup = useCallback((title: string, message: string, type: "success" | "error") => {
    setPopupData({ visible: true, title, message, type });
    setTimeout(() => setPopupData((prev) => ({ ...prev, visible: false })), 3000);
  }, []);

  // Memoized callback for updating mood status
  const handleUpdateMoodStatus = useCallback(async (status: string) => {
    if (!userId) return;
    setUpdatingMood(true);
    setIsUpdating(true);
    try {
      const updatedData = {
        moodStatus: status,
        updatedAt: serverTimestamp(),
      };
      await updateUser(userId, updatedData);
    } catch (error) {
      console.error(error);
      showPopup("Error", "Failed to update mood status", "error");
    } finally {
      setUpdatingMood(false);
      setIsUpdating(false);
    }
  }, [userId, updateUser, showPopup]);

  // Memoized callback for toggling status sheet
  const toggleStatusSheet = useCallback(() => {
    Animated.spring(sheetAnim, {
      toValue: showStatusSheet ? 0 : 1,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
    setShowStatusSheet(!showStatusSheet);
  }, [showStatusSheet, sheetAnim]);

  // Fetch user location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Permission to access location was denied");
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          long: location.coords.longitude,
        });
      } catch (error) {
        console.error("Error fetching location:", error);
      }
    })();
  }, []);

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        showPopup("Error", "Failed to load dashboard data", "error");
      }
    };

    if (userId) {
      initializeDashboard();
    }
  }, [userId, showPopup]);

  // Set loading to false once initial load is complete
  useEffect(() => {
    if (initialLoadComplete) {
      setLoading(false);
    }
  }, [initialLoadComplete]);

  // Memoized features array
  const features: FeatureButton[] = useMemo(() => [
    { 
      icon: <MaterialIcons name="groups" size={24} color="#38a5c9" />, 
      title: "Groups", 
      screen: "group",
      description: "View and create groups"
    },
    { 
      icon: <MaterialIcons name="explore" size={24} color="#38a5c9" />, 
      title: "Explore", 
      screen: "explore",
      description: "Discover events and people nearby"
    },
    { 
      icon: <FontAwesome5 name="user-friends" size={24} color="#38a5c9" />, 
      title: "Connect", 
      screen: "swipe",
      description: "Swipe to find the perfect match"
    },
    { 
      icon: <MaterialIcons name="message" size={24} color="#38a5c9" />, 
      title: "Messages", 
      screen: "chat/chatInbox",
      description: "View your conversations"
    },
    { 
      icon: <Feather name="user" size={24} color="#38a5c9" />, 
      title: "Profile", 
      screen: userId ? `profile/${userId}` : "profile",
      description: "Manage your account settings"
    },
    { 
      icon: <MaterialIcons name="settings" size={24} color="#38a5c9" />, 
      title: "Settings", 
      screen: "settings/settings",
      description: "Customize your app preferences"
    },
  ], [userId]);

  // Memoized refresh callback
  const refreshData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      console.log('🔄 [Dashboard] Refreshing data');
      // Refresh logic can be added here if needed
    } catch (error) {
      console.error("Error refreshing data:", error);
      showPopup("Error", "Failed to refresh data", "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, showPopup]);

  // Memoized filtered results
  const filteredResults: SearchItem[] = useMemo(() => [
    // Search results can be added here if needed
  ], [searchQuery]);

  const visibleResults: SearchItem[] = useMemo(() => filteredResults, [filteredResults]);

  // Memoized search handlers
  const handleSearchPress = useCallback(() => {
    setShowSearch(true);
    Animated.parallel([
      Animated.timing(searchTransitionAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(listOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(listTranslateYAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(listOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(listTranslateYAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [searchTransitionAnim, listOpacityAnim, listTranslateYAnim]);

  const handleSearchClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(searchTransitionAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(listOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(listTranslateYAnim, {
        toValue: 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSearch(false);
      Animated.parallel([
        Animated.timing(listOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(listTranslateYAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [searchTransitionAnim, listOpacityAnim, listTranslateYAnim]);

  const handleMoodPress = useCallback(() => {
    toggleStatusSheet();
  }, [toggleStatusSheet]);

  // Memoized render functions
  const renderSearchResult = useCallback((item: SearchItem) => {
    const isCreateEvent = item.isCreateEvent;
    return (
      <TouchableOpacity
        style={styles.resultItem}
        activeOpacity={0.9}
        accessible={true}
        accessibilityLabel={`${item.name}. ${item.description}`}
        accessibilityRole="button"
        onPress={() => {
          if (isCreateEvent) {
            router.push('eventCreation');
          } else {
            const route = item.type === "sport" ? `/sport/${item.id}` : `/event/${item.id}`;
            router.push(route);
          }
        }}
      >
        <View style={[
          isCreateEvent ? styles.createEventItemView : styles.resultItemView,
          { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
          }
        ]}>
          <Feather 
            name={isCreateEvent ? "plus-circle" : "calendar"} 
            size={20} 
            color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
            style={styles.resultIcon} 
          />
          <View style={styles.eventResultContent}>
            <View style={[styles.eventHeader, { 
              borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}>
              <View style={styles.eventTitleContainer}>
                <Text style={[styles.eventName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                  {item.name}
                </Text>
              </View>
            </View>
            <Text style={[styles.eventDescription, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
              {item.description}
            </Text>
            {!isCreateEvent && item.startTime && (
              <View style={styles.eventMetaContainer}>
                <View style={[styles.eventMetaItem, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <Feather 
                    name="clock" 
                    size={14} 
                    color={theme === "light" ? "#37a4c8" : "#64748B"} 
                  />
                  <Text style={[styles.eventMeta, { color: theme === "light" ? "#37a4c8" : "#64748B" }]}>
                    {new Date(item.startTime).toLocaleDateString()} at {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                </View>
                {item.startTime && (
                  <CountdownTimer startTime={new Date(item.startTime)} />
                )}
              </View>
            )}
          </View>
          <Feather 
            name="chevron-right" 
            size={18} 
            color={theme === "light" ? "#37a4c8" : "#CBD5E1"} 
          />
        </View>
      </TouchableOpacity>
    );
  }, [theme, router]);

  const renderLoadMore = useCallback(() => {
    return null;
  }, []);

  // Memoized dashboard data
  const dashboardData: DashboardItem[] = useMemo(() => [
    { type: "activity", id: "activity", data: { userLocation, userId, isCollapsed: activityCollapsed } },
    { type: "spacer", id: "spacer1", data: null },
    { type: "feature", id: "feature-grid", data: features },
  ], [userLocation, userId, activityCollapsed, features]);

  useEffect(() => {
    if (!loading && initialLoadComplete) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);
    }
  }, [loading, initialLoadComplete, fadeAnim]);

  // Add state to track if profile completion has been checked
  const [profileCompletionChecked, setProfileCompletionChecked] = useState(false);

  // Profile completion check (runs only once)
  useEffect(() => {
    if (!userId || profileCompletionChecked) return;

    const checkProfileCompletion = async () => {
      try {
        const storageKey = `profileComplete_${userId}`;
        const storedCompletionStatus = await AsyncStorage.getItem(storageKey);
        
        if (storedCompletionStatus === 'true') {
          console.log('✅ Dashboard - Profile completion previously verified, skipping check');
          setProfileCompletionChecked(true);
          return;
        }
        
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserData;
          console.log('🔄 Dashboard - Checking profile completion...');
          
          const isComplete = isProfileComplete(data);
          
          if (!isComplete) {
            console.log('🔄 Dashboard - Profile incomplete, redirecting to /profileComplete');
            router.replace("/profileComplete");
          } else {
            console.log('✅ Dashboard - Profile complete, saving to storage');
            await AsyncStorage.setItem(storageKey, 'true');
            setProfileCompletionChecked(true);
          }
        }
      } catch (error) {
        console.error('Error checking profile completion status:', error);
        setProfileCompletionChecked(true);
      }
    };

    checkProfileCompletion();
  }, [userId, profileCompletionChecked]);

  // Real-time user data updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (userId) {
      const userRef = doc(db, "users", userId);
      unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserData;
          setUserData(data);
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  // Auto-open mood picker if status is neutral (once per session)
  useEffect(() => {
    if (
      userData?.moodStatus === 'neutral' && 
      !hasShownMoodModalRef.current && 
      !showStatusSheet &&
      initialLoadComplete &&
      !loading
    ) {
      console.log('🎭 Auto-opening mood picker for neutral status');
      hasShownMoodModalRef.current = true;
      // Add a small delay to ensure the UI is fully loaded
      setTimeout(() => {
        toggleStatusSheet();
      }, 1000);
    }
  }, [userData?.moodStatus, showStatusSheet, initialLoadComplete, loading, toggleStatusSheet]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: FlatListItem, index: number) => {
    if (showSearch) {
      return `search-${index}`;
    }
    return item.id;
  }, [showSearch]);

  // Memoized render item
  const renderItem = useCallback(({ item, index }: { item: FlatListItem; index: number }) => {
    if (showSearch) {
      return (
        <Animated.View
          style={{
            opacity: listOpacityAnim,
            transform: [{ translateY: listTranslateYAnim }],
          }}
        >
          {renderSearchResult(item as SearchItem)}
        </Animated.View>
      );
    } else {
      if ('type' in item && 'data' in item) {
        const dashboardItem = item as DashboardItem;
        
        if (dashboardItem.type === "activity") {
          return (
            <View style={styles.section}>
              <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                  <MaterialIcons name="local-activity" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.headerIcon} />
                  <Text style={[styles.sectionHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    What's Happening
                  </Text>
                </View>
              </View>
              <ActivityCard 
                userLocation={dashboardItem.data.userLocation}
                userId={dashboardItem.data.userId}
                isCollapsed={false}
                onToggleCollapse={() => {}}
              />
            </View>
          );
        } else if (dashboardItem.type === "feature") {
          return <FeatureGrid features={features} />;
        } else if (dashboardItem.type === "spacer") {
          return <View style={styles.spacer} />;
        }
      }
    }
    return null;
  }, [showSearch, listOpacityAnim, listTranslateYAnim, renderSearchResult, theme, loading, features, router]);

  // Show black screen during auth check
  if (!userId) {
    return <View style={{ flex: 1, backgroundColor: theme === "light" ? "#e6e6e6" : "#000000" }} />;
  }

  // Show loading screen during auth check or updates
  if (!userId || isUpdating) {
    return <LoadingScreen message={!userId ? "Loading your dashboard..." : "Updating..."} />;
  }

  // Show loading screen ONLY during initial auth check, not for data loading
  // This allows the dashboard to render immediately while data loads
  if (!initialLoadComplete) {
    return (
      <LoadingScreen 
        isUsersLoading={true} 
      />
    );
  }

  return (
    <ErrorBoundary>
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
        <TopBar 
          onProfilePress={() => router.push(`profile/${authUser?.uid}`)} 
          notificationCount={notificationCount}
        />
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Animated.View style={{ flex: 1, position: "relative", opacity: fadeAnim }}>
              <Animated.View 
                style={[
                  styles.searchHeaderContainer,
                  {
                    opacity: searchHeaderOpacity,
                    transform: [{ translateY: searchHeaderTranslateY }],
                  }
                ]}
              >
                {showSearch ? (
                  <Animated.View
                    style={[
                      styles.searchHeader,
                      {
                        opacity: searchTransitionAnim,
                        transform: [
                          {
                            scale: searchTransitionAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.95, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                    onLayout={(event) => {
                      const { height } = event.nativeEvent.layout;
                      setSearchHeaderHeight(height);
                    }}
                  >
                    <View style={[styles.searchInputContainer, { 
                      backgroundColor: theme === "light" ? "#e6e6e6" : "#000000",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                    }]}>
                      <TextInput
                        style={[styles.searchInput, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}
                        placeholder="Search events..."
                        placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        accessible={true}
                        accessibilityLabel="Search events"
                        accessibilityHint="Enter text to search for events"
                      />
                      {searchQuery.length > 0 && (
                        <TouchableOpacity 
                          style={[styles.clearButton, { 
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                          }]} 
                          onPress={() => setSearchQuery("")}
                          accessible={true}
                          accessibilityLabel="Clear search"
                          accessibilityRole="button"
                        >
                          <Feather name="x-circle" size={20} color={theme === "light" ? "#64748B" : "#64748B"} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={[styles.cancelButton, { 
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                        }]} 
                        onPress={handleSearchClose}
                        accessible={true}
                        accessibilityLabel="Close search"
                        accessibilityRole="button"
                      >
                        <Feather name="x" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>
                ) : (
                  <View
                    onLayout={(event) => {
                      const { height } = event.nativeEvent.layout;
                      setDefaultSearchHeight(height);
                    }}
                  >
                    <MoodStatusBar 
                      displayText={displayText}
                      onPress={handleMoodPress}
                      textFadeAnim={textFadeAnim}
                    />
                  </View>
                )}
              </Animated.View>
              
              <AnimatedFlatList
                style={{ flex: 1 }}
                data={showSearch ? visibleResults : dashboardData}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                refreshing={isRefreshing}
                onRefresh={refreshData}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                contentContainerStyle={{ 
                  paddingTop: showSearch ? searchHeaderHeight + 40 : defaultSearchHeight + 20,
                  paddingHorizontal: 16, 
                  paddingBottom: Platform.OS === 'ios' ? 100 : 80 
                }}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={5}
                updateCellsBatchingPeriod={50}
              />
              
              {!showSearch && (
                <FloatingActionButton
                  expanded={fabExpanded}
                  onToggle={toggleFabExpansion}
                  onEventPress={toggleFabExpansion}
                  onPingPress={handleOpenPingModal}
                  sheetAnim={sheetAnim}
                />
              )}
              
              {showStatusSheet && (
                <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.2)', zIndex: 1 }]} />
              )}
              
              <View style={{ zIndex: 2 }}>
                <StatusSheet
                  showStatusSheet={showStatusSheet}
                  sheetAnim={sheetAnim}
                  customStatus={customStatus}
                  setCustomStatus={setCustomStatus}
                  handleUpdateMoodStatus={handleUpdateMoodStatus}
                  toggleStatusSheet={toggleStatusSheet}
                />
              </View>

              <PingEventModal
                visible={showPingModal}
                onClose={handleClosePingModal}
                onSuccess={showPopup}
              />
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 0,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 12,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.3,
  },
  searchHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 8,
    letterSpacing: 0.3,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  resultItem: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
    padding: 6,
  },
  resultItemView: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#38a5c9",
    borderRadius: 24,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resultIcon: {
    marginRight: 14,
  },
  eventResultContent: {
    flex: 1,
    marginRight: 12,
  },
  createEventItemView: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#38a5c9",
    borderRadius: 24,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  spacer: {
    height: 18,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  searchHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 0 : 0,
  },
  eventHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  eventDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  eventMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventMeta: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  countdownText: {
    fontSize: 13,
    color: "#38a5c9",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export { Dashboard };
