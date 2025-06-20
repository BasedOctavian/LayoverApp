import React, { useEffect, useState, useRef } from "react";
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
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Modal,
  Linking,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp, orderBy, limit, startAfter, onSnapshot } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import * as Location from "expo-location";
import StatusSheet, { presetStatuses, PresetStatus } from "../../components/StatusSheet";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import useAirports, { Airport } from "../../hooks/useAirports";
import useEvents from "../../hooks/useEvents";
import useSportEvents from "../../hooks/useSportEvents";
import useUsers from "../../hooks/useUsers";
import { useNearestAirports } from "../../hooks/useNearestAirports";
import { useFilteredEvents } from "../../hooks/useFilteredEvents";
import useNotificationCount from "../../hooks/useNotificationCount";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from 'expo-notifications';
import LoadingImage from "../../components/LoadingImage";

type FeatureButton = {
  icon: React.ReactNode;
  title: string;
  screen: string;
  description: string;
};

type NearbyUser = {
  id: string;
  name: string;
  status: string;
  isInviteCard?: boolean;
  isViewMoreCard?: boolean;
  profilePicture?: string;
  age?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  goals?: string[];
  pronouns?: string;
  lastLogin?: any;
};

interface UserData {
  id: string;
  name?: string;
  moodStatus?: string;
  airportCode?: string;
  lastLogin?: any;
  profilePicture?: string;
  age?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  goals?: string[];
  pronouns?: string;
}

function haversineDistance(lat1: number, long1: number, lat2: number, long2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLong = toRad(long2 - long1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLong / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type DashboardItem = {
  type: "section" | "feature" | "spacer";
  id: string;
  data: any;
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Wellness':
      return <MaterialIcons name="self-improvement" size={20} color="#38a5c9" />;
    case 'Food & Drink':
      return <MaterialIcons name="restaurant" size={20} color="#38a5c9" />;
    case 'Entertainment':
      return <MaterialIcons name="theater-comedy" size={20} color="#38a5c9" />;
    case 'Travel Tips':
      return <MaterialIcons name="flight-takeoff" size={20} color="#38a5c9" />;
    case 'Activity':
      return <MaterialIcons name="sports-basketball" size={20} color="#38a5c9" />;
    case 'Networking':
      return <MaterialIcons name="groups" size={20} color="#38a5c9" />;
    case 'Social':
      return <MaterialIcons name="people-alt" size={20} color="#38a5c9" />;
    case 'Learning':
      return <MaterialIcons name="school" size={20} color="#38a5c9" />;
    case 'Business':
      return <MaterialIcons name="business" size={20} color="#38a5c9" />;
    case 'Misc':
      return <MaterialIcons name="category" size={20} color="#38a5c9" />;
    default:
      return <MaterialIcons name="event" size={20} color="#38a5c9" />;
  }
};

const getEventIcon = (eventName: string) => {
  const name = eventName.toLowerCase();
  if (name.includes('startup') || name.includes('pitch')) {
    return <MaterialIcons name="rocket-launch" size={20} color="#38a5c9" />;
  }
  if (name.includes('mindful') || name.includes('meditation')) {
    return <MaterialIcons name="self-improvement" size={20} color="#38a5c9" />;
  }
  if (name.includes('coffee') || name.includes('career')) {
    return <MaterialIcons name="coffee" size={20} color="#38a5c9" />;
  }
  if (name.includes('mentor')) {
    return <MaterialIcons name="psychology" size={20} color="#38a5c9" />;
  }
  if (name.includes('industry') || name.includes('roundtable')) {
    return <MaterialIcons name="forum" size={20} color="#38a5c9" />;
  }
  if (name.includes('speed')) {
    return <MaterialIcons name="speed" size={20} color="#38a5c9" />;
  }
  if (name.includes('creative')) {
    return <MaterialIcons name="palette" size={20} color="#38a5c9" />;
  }
  if (name.includes('global') || name.includes('international')) {
    return <MaterialIcons name="public" size={20} color="#38a5c9" />;
  }
  if (name.includes('entrepreneur')) {
    return <MaterialIcons name="trending-up" size={20} color="#38a5c9" />;
  }
  if (name.includes('resume')) {
    return <MaterialIcons name="description" size={20} color="#38a5c9" />;
  }
  if (name.includes('travel')) {
    return <MaterialIcons name="luggage" size={20} color="#38a5c9" />;
  }
  if (name.includes('cultural')) {
    return <MaterialIcons name="emoji-people" size={20} color="#38a5c9" />;
  }
  if (name.includes('freelancer')) {
    return <MaterialIcons name="work" size={20} color="#38a5c9" />;
  }
  if (name.includes('book')) {
    return <MaterialIcons name="menu-book" size={20} color="#38a5c9" />;
  }
  if (name.includes('tech')) {
    return <MaterialIcons name="computer" size={20} color="#38a5c9" />;
  }
  if (name.includes('problem') || name.includes('solve')) {
    return <MaterialIcons name="lightbulb" size={20} color="#38a5c9" />;
  }
  if (name.includes('story')) {
    return <MaterialIcons name="record-voice-over" size={20} color="#38a5c9" />;
  }
  if (name.includes('side') || name.includes('hustle')) {
    return <MaterialIcons name="rocket" size={20} color="#38a5c9" />;
  }
  if (name.includes('leadership')) {
    return <MaterialIcons name="leaderboard" size={20} color="#38a5c9" />;
  }
  return getCategoryIcon('Misc');
};

const CountdownTimer = ({ startTime }: { startTime: Date }) => {
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
};

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { theme } = React.useContext(ThemeContext);

  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);

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
  }, [theme]);

  const { user: authUser, userId } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"airports" | "events">("airports");
  const { getEvents } = useEvents();
  const [events, setEvents] = useState<any[]>([]);
  const { updateUser, updateUserLocationAndLogin, getNearbyUsers } = useUsers();
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const { getSportEvents } = useSportEvents();
  const [allSportEvents, setAllSportEvents] = useState<any[]>([]);
  const { getAirports } = useAirports();
  const nearestAirports = useNearestAirports(userLocation, allAirports);
  const { filteredRegularEvents, matchingSportEvents } = useFilteredEvents(selectedAirport, events, allSportEvents);
  const allEvents = [...matchingSportEvents, ...filteredRegularEvents];
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];
  const [customStatus, setCustomStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [updatingMood, setUpdatingMood] = useState(false);
  const [searchHeaderHeight, setSearchHeaderHeight] = useState(0);
  const [defaultSearchHeight, setDefaultSearchHeight] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [popupData, setPopupData] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });
  const hasShownProfilePopup = useRef(false);
  const hasShownNotificationPopup = useRef(false);
  const [profilePicturePopup, setProfilePicturePopup] = useState<{
    visible: boolean;
  }>({
    visible: false
  });
  const [notificationsPopup, setNotificationsPopup] = useState<{
    visible: boolean;
  }>({
    visible: false
  });
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [visibleAirportCount, setVisibleAirportCount] = useState(5);
  const AIRPORTS_PER_PAGE = 5;

  const hasUpdatedRef = useRef(false);
  const [scrollY] = useState(new Animated.Value(0));
  const searchHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const searchHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const searchTransitionAnim = useRef(new Animated.Value(0)).current;
  const listOpacityAnim = useRef(new Animated.Value(0)).current;
  const listTranslateYAnim = useRef(new Animated.Value(20)).current;

  const notificationCount = useNotificationCount(userId);

  const showPopup = (title: string, message: string, type: "success" | "error") => {
    setPopupData({ visible: true, title, message, type });
    setTimeout(() => setPopupData((prev) => ({ ...prev, visible: false })), 3000);
  };

  const handleUpdateMoodStatus = async (status: string) => {
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
    } finally {
      setUpdatingMood(false);
      setIsUpdating(false);
    }
  };

  const toggleStatusSheet = () => {
    Animated.spring(sheetAnim, {
      toValue: showStatusSheet ? 0 : 1,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
    setShowStatusSheet(!showStatusSheet);
  };
  

  // Fetch user location on mount
  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  // Fetch events, sport events, and airports
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const [eventsData, sportEventsData] = await Promise.all([
          getEvents(),
          getSportEvents(),
        ]);

        if (eventsData) setEvents(eventsData);
        if (sportEventsData) setAllSportEvents(sportEventsData);
        setEventsLoaded(true);

        // Load airports
        const fetchedAirports = await getAirports();
        if (fetchedAirports) setAllAirports(fetchedAirports);

        // Set initial load complete
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        showPopup("Error", "Failed to load dashboard data", "error");
      }
    };

    if (userId) {
      initializeDashboard();
    }
  }, [userId]);

  useEffect(() => {
    const fetchNearbyUsers = async () => {
      if (!selectedAirport?.airportCode) return;
      
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const users = await getNearbyUsers(selectedAirport.airportCode, thirtyMinutesAgo) as UserData[];
        
        // Get current user's document to check blocked users
        if (!userId) {
          console.error('User ID is null');
          return;
        }
        const currentUserRef = doc(db, 'users', userId);
        const currentUserDoc = await getDoc(currentUserRef);
        const currentUserData = currentUserDoc.data();
        
        // Get lists of blocked users
        const blockedUsers = currentUserData?.blockedUsers || [];
        const hasMeBlocked = currentUserData?.hasMeBlocked || [];
        
        // Convert users to NearbyUser format and filter out blocked users
        const formattedUsers = users
          .filter(user => 
            user.id !== userId && // Exclude current user
            !blockedUsers.includes(user.id) && // Exclude users blocked by current user
            !hasMeBlocked.includes(user.id) // Exclude users who blocked current user
          )
          .map(user => ({
            id: user.id,
            name: user.name || 'Anonymous',
            status: user.moodStatus || 'Available',
            profilePicture: user.profilePicture,
            age: user.age,
            bio: user.bio,
            languages: user.languages || [],
            interests: user.interests || [],
            goals: user.goals || [],
            pronouns: user.pronouns,
            lastLogin: user.lastLogin,
          }));

        // Generate a unique timestamp for this batch of invite cards
        const timestamp = Date.now();
        
        let finalUsers = [...formattedUsers];
        
        // If we have 3 or more users, add a "View More" card as the last item
        if (formattedUsers.length >= 3) {
          finalUsers = [
            ...formattedUsers,
            {
              id: `view-more-${timestamp}`,
              name: 'View More',
              status: 'See all travelers',
              profilePicture: undefined,
              age: undefined,
              bio: undefined,
              languages: [],
              interests: [], 
              goals: [],
              pronouns: undefined,
              lastLogin: null
            }
          ];
        } else {
          // If we have fewer than 3 users, add "Invite Friends" cards
          const inviteFriendsCards = Array(3 - formattedUsers.length)
            .fill(null)
            .map((_, index) => ({
              id: `invite-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
              name: 'Invite Friends',
              status: 'Click to invite',
              isInviteCard: true,
              profilePicture: undefined,
              age: undefined,
              bio: undefined,
              languages: [],
              interests: [],
              goals: [],
              pronouns: undefined,
              lastLogin: null
            }));
          finalUsers = [...formattedUsers, ...inviteFriendsCards];
        }

        setNearbyUsers(finalUsers);
        setUsersLoaded(true);
      } catch (error) {
        console.error('Error fetching nearby users:', error);
        setNearbyUsers([]);
        setUsersLoaded(true);
      }
    };

    fetchNearbyUsers();
  }, [selectedAirport?.airportCode, userId]);

  // Update loading state based on both events and users loading status
  useEffect(() => {
    if (eventsLoaded && usersLoaded) {
      setLoading(false);
    }
  }, [eventsLoaded, usersLoaded]);

  const features: FeatureButton[] = [
    { 
      icon: <FontAwesome5 name="user-friends" size={24} color="#38a5c9" />, 
      title: "Connect", 
      screen: "swipe",
      description: "Swipe to find the perfect match"
    },
    { 
      icon: <Feather name="plus" size={24} color="#38a5c9" />, 
      title: "Create Event", 
      screen: "eventCreation",
      description: "Start a new event or activity"
    },
    { 
      icon: <MaterialIcons name="event" size={24} color="#38a5c9" />, 
      title: "Events", 
      screen: "home",
      description: "Browse all events at your airport"
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
  ];

  const refreshData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [eventsData, sportEventsData] = await Promise.all([
        getEvents(),
        getSportEvents(),
      ]);

      if (eventsData) setEvents(eventsData);
      if (sportEventsData) setAllSportEvents(sportEventsData);

      const fetchedAirports = await getAirports();
      if (fetchedAirports) setAllAirports(fetchedAirports);
    } catch (error) {
      console.error("Error refreshing data:", error);
      showPopup("Error", "Failed to refresh data", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredResults =
    searchType === "airports"
      ? (() => {
          // First filter the airports based on search query
          const filtered = (allAirports || []).filter((airport: Airport) => 
            airport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            airport?.airportCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            airport?.location?.toLowerCase().includes(searchQuery.toLowerCase())
          );

          // If we have user location, calculate distances and sort
          if (userLocation) {
            const withDistances = filtered.map(airport => ({
              ...airport,
              distance: haversineDistance(
                userLocation.lat,
                userLocation.long,
                airport.lat,
                airport.long
              )
            }));

            // Sort by distance, but put selected airport at top
            return withDistances.sort((a, b) => {
              if (selectedAirport && a.airportCode === selectedAirport.airportCode) return -1;
              if (selectedAirport && b.airportCode === selectedAirport.airportCode) return 1;
              return a.distance - b.distance;
            });
          }

          // If no user location, just put selected airport at top
          return filtered.sort((a, b) => {
            if (selectedAirport && a.airportCode === selectedAirport.airportCode) return -1;
            if (selectedAirport && b.airportCode === selectedAirport.airportCode) return 1;
            return 0;
          });
        })()
      : [
          ...(allEvents || []).filter((event) => 
            event?.name?.toLowerCase().includes(searchQuery.toLowerCase())),
          {
            id: 'create-event',
            name: 'Create Event',
            description: 'Start a new event at this airport',
            isCreateEvent: true
          }
        ];

  const visibleAirports = searchType === "airports" 
    ? filteredResults.slice(0, visibleAirportCount)
    : filteredResults;

  const handleLoadMore = () => {
    setVisibleAirportCount(prev => prev + AIRPORTS_PER_PAGE);
  };

  const handleSearchPress = () => {
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
      // After search transition completes, animate the list in
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
  };

  const handleSearchClose = () => {
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
      // After closing search, animate the dashboard back in
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
  };

  const renderSearchResult = (item: any) => {
    if (searchType === "airports") {
      const isSelected = selectedAirport?.airportCode === item.airportCode;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.9}
          onPress={() => {
            setSelectedAirport(item);
            setShowSearch(false);
          }}
        >
          <View style={[styles.resultItemView, { 
            backgroundColor: isSelected 
              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
              : (theme === "light" ? "#ffffff" : "#1a1a1a"),
            borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
          }]}>
            <Feather 
              name="airplay" 
              size={20} 
              color={isSelected 
                ? "#FFFFFF" 
                : (theme === "light" ? "#37a4c8" : "#38a5c9")} 
              style={styles.resultIcon} 
            />
            <View style={styles.airportResultContent}>
              <Text style={[styles.airportName, { 
                color: isSelected 
                  ? "#FFFFFF" 
                  : (theme === "light" ? "#000000" : "#e4fbfe")
              }]}>{item.name}</Text>
              <Text style={[styles.airportLocation, { 
                color: isSelected 
                  ? "#FFFFFF" 
                  : (theme === "light" ? "#37a4c8" : "#38a5c9")
              }]}>{item.location}</Text>
              <View style={styles.airportMetaContainer}>
                <Text style={[styles.airportCode, { 
                  color: isSelected 
                    ? "#FFFFFF" 
                    : (theme === "light" ? "#37a4c8" : "#64748B")
                }]}>{item.airportCode}</Text>
                {item.distance !== undefined && (
                  <Text style={[styles.airportDistance, { 
                    color: isSelected 
                      ? "#FFFFFF" 
                      : (theme === "light" ? "#37a4c8" : "#64748B")
                  }]}>
                    {(item.distance * 0.621371).toFixed(1)} mi away
                  </Text>
                )}
              </View>
            </View>
            <Feather 
              name="chevron-right" 
              size={18} 
              color={isSelected 
                ? "#FFFFFF" 
                : (theme === "light" ? "#37a4c8" : "#CBD5E1")} 
            />
          </View>
        </TouchableOpacity>
      );
    } else {
      const isCreateEvent = item.isCreateEvent;
      return (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.9}
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
                      {new Date(item.startTime).toLocaleDateString()} at {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
    }
  };

  const renderLoadMore = () => {
    if (searchType === "airports" && filteredResults.length > visibleAirportCount) {
      return (
        <TouchableOpacity
          style={[styles.loadMoreButton, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
          }]}
          onPress={handleLoadMore}
        >
          <Text style={[styles.loadMoreText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>Load More Airports</Text>
          <Feather name="chevron-down" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
        </TouchableOpacity>
      );
    }
    return null;
  };

  const dashboardData = [
    { type: "section", id: "users", data: nearbyUsers || [] },
    { type: "section", id: "events", data: allEvents || [] },
    { type: "spacer", id: "spacer1" },
    { type: "feature", id: "feature-grid", data: features },
  ];

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
  }, [loading, initialLoadComplete]);

  

  // Check notification permissions
  const checkNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    return existingStatus === 'granted';
  };

  // Request notification permissions
  const requestNotificationPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        // Get the token if permissions are granted
        const projectId = '61cfadd9-25bb-4566-abec-1e9679ef882b';
        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        
        // Update user document with token
        if (userId) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            expoPushToken: token.data,
            notificationPreferences: {
              announcements: true,
              chats: true,
              connections: true,
              events: true,
              notificationsEnabled: true
            }
          });

          // Navigate to notification preferences screen
          router.push('/settings/notificationPreferences');
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (userId) {
      const userRef = doc(db, "users", userId);
      unsubscribe = onSnapshot(userRef, async (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserData;
          setUserData(data);
          
          try {
            // Check both conditions
            const hasNotifications = await checkNotificationPermissions();
            const hasProfilePicture = !!data.profilePicture;
            const randomChance = Math.random();
            
            console.log('Popup conditions:', {
              hasNotifications,
              hasProfilePicture,
              randomChance,
              hasShownNotifications: hasShownNotificationPopup.current,
              hasShownProfile: hasShownProfilePopup.current
            });

            // If both conditions are true (need both notifications and profile pic)
            if (!hasNotifications && !hasProfilePicture) {
              if (randomChance < 0.2 && !hasShownNotificationPopup.current && !hasShownProfilePopup.current) {
                // Randomly choose which popup to show
                if (Math.random() < 0.5) {
                  console.log('Showing notifications popup (both conditions true)');
                  setNotificationsPopup({ visible: true });
                  hasShownNotificationPopup.current = true;
                } else {
                  console.log('Showing profile popup (both conditions true)');
                  setProfilePicturePopup({ visible: true });
                  hasShownProfilePopup.current = true;
                }
              }
            }
            // If only notifications are needed
            else if (!hasNotifications && !hasShownNotificationPopup.current) {
              if (randomChance < 0.1) {
                console.log('Showing notifications popup (only notifications needed)');
                setNotificationsPopup({ visible: true });
                hasShownNotificationPopup.current = true;
              }
            }
            // If only profile picture is needed
            else if (!hasProfilePicture && !hasShownProfilePopup.current) {
              if (randomChance < 0.1) {
                console.log('Showing profile popup (only profile needed)');
                setProfilePicturePopup({ visible: true });
                hasShownProfilePopup.current = true;
              }
            }
          } catch (error) {
            console.error('Error checking conditions:', error);
          }
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId]);

  useEffect(() => {
    if (!selectedAirport && nearestAirports.closest) {
      setSelectedAirport(nearestAirports.closest);
    }
  }, [nearestAirports.closest, selectedAirport]);

  useEffect(() => {
    if (userId && nearestAirports.closest && !hasUpdatedRef.current) {
      hasUpdatedRef.current = true; // Mark as updated to prevent re-runs
      updateUserLocationAndLogin(userId, nearestAirports.closest.airportCode);
      console.log("Updated user location and login");
    }
  }, [userId, nearestAirports.closest, updateUserLocationAndLogin]);

  // Show black screen during auth check
  if (!userId) {
    return <View style={{ flex: 1, backgroundColor: theme === "light" ? "#e6e6e6" : "#000000" }} />;
  }

  // Show loading screen during auth check or updates
  if (!userId || isUpdating) {
    return <LoadingScreen message={!userId ? "Loading your dashboard..." : "Updating..."} />;
  }

  // Show loading screen only during data loading
  if (loading || !initialLoadComplete) {
    return (
      <LoadingScreen 
        isEventsLoading={!eventsLoaded} 
        isUsersLoading={!usersLoaded} 
      />
    );
  }

  return (
    <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar 
        onProfilePress={() => router.push(`profile/${authUser?.uid}`)} 
        notificationCount={notificationCount}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, position: "relative", opacity: fadeAnim }}>
            {/* Profile Picture Popup */}
            {profilePicturePopup.visible && (
              <View style={[styles.overlay, { backgroundColor: 'transparent', zIndex: 1000 }]}>
                <View style={[styles.profilePicturePopup, { 
                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                }]}>
                  <Image
                    source={require('../../../assets/adaptive-icon.png')}
                    style={[
                      styles.popupLogo,
                      { tintColor: theme === "light" ? "#0F172A" : "#ffffff" }
                    ]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.popupTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Add a Profile Picture
                  </Text>
                  <Text style={[styles.popupMessage, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Make your profile stand out by adding a profile picture. This helps other travelers recognize you!
                  </Text>
                  <View style={styles.popupButtons}>
                    <TouchableOpacity 
                      style={[styles.popupButton, { 
                        backgroundColor: theme === "light" ? "#FFFFFF" : "#000000",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                        borderWidth: 1
                      }]}
                      onPress={() => setProfilePicturePopup({ visible: false })}
                    >
                      <Text style={[styles.popupButtonText, { 
                        color: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>Maybe Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.popupButton, { 
                        backgroundColor: theme === "light" ? "#FFFFFF" : "#000000",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                        borderWidth: 1,
                        marginLeft: 8,
                        shadowColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3
                      }]}
                      onPress={() => {
                        setProfilePicturePopup({ visible: false });
                        router.push(`profile/${userId}`);
                      }}
                    >
                      <Text style={[styles.popupButtonText, { 
                        color: theme === "light" ? "#37a4c8" : "#38a5c9",
                        fontWeight: '700'
                      }]}>Add Picture</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Notifications Popup */}
            {notificationsPopup.visible && (
              <View style={[styles.overlay, { backgroundColor: 'transparent', zIndex: 1000 }]}>
                <View style={[styles.profilePicturePopup, { 
                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                }]}>
                  <Image
                    source={require('../../../assets/adaptive-icon.png')}
                    style={[
                      styles.popupLogo,
                      { tintColor: theme === "light" ? "#0F172A" : "#ffffff" }
                    ]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.popupTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Enable Notifications
                  </Text>
                  <Text style={[styles.popupMessage, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Stay connected with other travelers! Enable notifications to never miss a message or connection request.
                  </Text>
                  <View style={styles.popupButtons}>
                    <TouchableOpacity 
                      style={[styles.popupButton, { 
                        backgroundColor: theme === "light" ? "#FFFFFF" : "#000000",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                        borderWidth: 1
                      }]}
                      onPress={() => setNotificationsPopup({ visible: false })}
                    >
                      <Text style={[styles.popupButtonText, { 
                        color: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>Maybe Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.popupButton, { 
                        backgroundColor: theme === "light" ? "#FFFFFF" : "#000000",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                        borderWidth: 1,
                        marginLeft: 8,
                        shadowColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: 3
                      }]}
                      onPress={async () => {
                        const granted = await requestNotificationPermissions();
                        setNotificationsPopup({ visible: false });
                        if (granted) {
                          showPopup(
                            "Notifications Enabled",
                            "You'll now receive notifications for messages, connections, and events.",
                            "success"
                          );
                        } else {
                          showPopup(
                            "Permission Required",
                            "Please enable notifications in your device settings to receive updates.",
                            "error"
                          );
                        }
                      }}
                    >
                      <Text style={[styles.popupButtonText, { 
                        color: theme === "light" ? "#37a4c8" : "#38a5c9",
                        fontWeight: '700'
                      }]}>Enable Notifications</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
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
                      placeholder={`Search ${searchType}...`}
                      placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity 
                        style={[styles.clearButton, { 
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                        }]} 
                        onPress={() => setSearchQuery("")}
                      >
                        <Feather name="x-circle" size={20} color={theme === "light" ? "#64748B" : "#64748B"} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={[styles.cancelButton, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                      }]} 
                      onPress={handleSearchClose}
                    >
                      <Feather name="x" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.filterContainer}>
                    <TouchableOpacity style={styles.filterButton} onPress={() => setSearchType("airports")}>
                      <View style={[styles.filterButtonInner, { 
                        backgroundColor: searchType === "airports" ? (theme === "light" ? "#37a4c8" : "#38a5c9") : (theme === "light" ? "#e6e6e6" : "#1a1a1a"),
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>
                        <Feather name="airplay" size={18} color={searchType === "airports" ? "#FFFFFF" : (theme === "light" ? "#37a4c8" : "#38a5c9")} />
                        <Text style={[styles.filterText, { 
                          color: searchType === "airports" ? "#FFFFFF" : (theme === "light" ? "#37a4c8" : "#38a5c9")
                        }]}>Airports</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.filterButton} onPress={() => setSearchType("events")}>
                      <View style={[styles.filterButtonInner, { 
                        backgroundColor: searchType === "events" ? (theme === "light" ? "#37a4c8" : "#38a5c9") : (theme === "light" ? "#e6e6e6" : "#1a1a1a"),
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>
                        <Feather name="calendar" size={18} color={searchType === "events" ? "#FFFFFF" : (theme === "light" ? "#37a4c8" : "#38a5c9")} />
                        <Text style={[styles.filterText, { 
                          color: searchType === "events" ? "#FFFFFF" : (theme === "light" ? "#37a4c8" : "#38a5c9")
                        }]}>Events</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleSearchPress}
                  style={styles.defaultSearchContainer}
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    setDefaultSearchHeight(height);
                  }}
                >
                  <View style={[styles.searchContainer, { 
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                  }]}>
                    <Feather name="search" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.searchPlaceholder, { 
                      color: theme === "light" ? "#37a4c8" : "#38a5c9"
                    }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {selectedAirport ? selectedAirport.name : "Select an airport"}
                    </Text>
                    
                  </View>
                  {selectedAirport && (
                    <TouchableOpacity
                      style={[styles.directionsButton, { 
                        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}
                      onPress={() => {
                        const url = Platform.select({
                          ios: `maps://app?daddr=${selectedAirport.lat},${selectedAirport.long}`,
                          android: `google.navigation:q=${selectedAirport.lat},${selectedAirport.long}`
                        });
                        if (url) {
                          Linking.openURL(url);
                        }
                      }}
                    >
                      <Feather 
                        name="navigation" 
                        size={20} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.directionsButtonText, { 
                        color: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}>
                        Get Directions
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              )}
            </Animated.View>
            <AnimatedFlatList
              style={{ flex: 1 }}
              data={showSearch ? [...visibleAirports, 'load-more'] : dashboardData}
              keyExtractor={(item, index) => (showSearch ? index.toString() : item.id)}
              refreshing={isRefreshing}
              onRefresh={refreshData}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              contentContainerStyle={{ 
                paddingTop: showSearch ? searchHeaderHeight + 40 : defaultSearchHeight + 40,
                paddingHorizontal: 16, 
                paddingBottom: Platform.OS === 'ios' ? 100 : 80 
              }}
              renderItem={({ item, index }) => {
                if (showSearch) {
                  if (item === 'load-more') {
                    return renderLoadMore();
                  }
                  return (
                    <Animated.View
                      style={{
                        opacity: listOpacityAnim,
                        transform: [{ translateY: listTranslateYAnim }],
                      }}
                    >
                      {renderSearchResult(item)}
                    </Animated.View>
                  );
                } else if (item.type === "section") {
                  if (item.id === "users") {
                    return (
                      <View style={styles.section}>
                        <View style={styles.headerRow}>
                          <FontAwesome5 name="users" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.headerIcon} />
                          <Text style={[styles.sectionHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Nearby Users</Text>
                        </View>
                        {loading ? (
                          <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                            <Text style={[styles.loadingText, { color: theme === "light" ? "#000000" : "#64748B" }]}>
                              Finding travelers...
                            </Text>
                          </View>
                        ) : item.data.length > 0 ? (
                          <FlatList
                            horizontal
                            data={item.data}
                            keyExtractor={(user: NearbyUser) => user.id}
                            renderItem={({ item: user }: { item: NearbyUser }) => {
                              const handlePress = () => {
                                if (user.isInviteCard) {
                                  const appStoreLink = 'https://apps.apple.com/us/app/wingman-connect-on-layovers/id6743148488';
                                  const message = `Join me on Wingman! Connect with travelers during layovers: ${appStoreLink}`;
                                  Linking.openURL(`sms:&body=${encodeURIComponent(message)}`);
                                } else if (user.isViewMoreCard) {
                                  router.push('/explore');
                                } else {
                                  router.push(`profile/${user.id}`);
                                }
                              };

                              const renderUserCard = () => (
                                <View style={styles.userInfo}>
                                  <View style={styles.userSection}>
                                    <View style={[styles.avatar, { 
                                      backgroundColor: theme === "light" ? "#e6e6e6" : "#000000",
                                      borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                                      marginBottom: 4,
                                    }]}>
                                      {user.profilePicture ? (
                                        <Image 
                                          source={{ uri: user.profilePicture }} 
                                          style={styles.avatarImage}
                                        />
                                      ) : (
                                        <FontAwesome5 name="user" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                      )}
                                    </View>
                                    <View style={styles.nameRow}>
                                      <Text style={[styles.userName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                                        {user.name}
                                      </Text>
                                      {user.pronouns && (
                                        <Text style={[styles.pronouns, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                          {user.pronouns}
                                        </Text>
                                      )}
                                    </View>
                                  </View>

                                  {user.bio && (
                                    <Text 
                                      style={[styles.userBio, { 
                                        color: theme === "light" ? "#38a5c9" : "#38a5c9",
                                      }]}
                                      numberOfLines={2}
                                      ellipsizeMode="tail"
                                    >
                                      {user.bio.trim()}
                                    </Text>
                                  )}

                                  <View style={styles.userMetaContainer}>
                                    <View style={[styles.metaItem, { 
                                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                    }]}>
                                      <Feather name="heart" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                      <Text style={[styles.metaText, { color: theme === "light" ? "#37a4c9" : "#38a5c9" }]}>
                                        {user.status}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );

                              const renderInviteCard = () => (
                                <View style={[styles.inviteCardGradient, { 
                                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a"
                                }]}>
                                  <View style={[styles.inviteAvatar, { 
                                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                  }]}>
                                    <FontAwesome5 name="user-plus" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                  </View>
                                  <Text style={[styles.inviteTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                                    Invite Friends
                                  </Text>
                                  <Text style={[styles.inviteSubtitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                    Share Wingman
                                  </Text>
                                  <View style={[styles.inviteButton, { 
                                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
                                  }]}>
                                    <Feather name="share-2" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                    <Text style={[styles.inviteButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                      Share
                                    </Text>
                                  </View>
                                </View>
                              );

                              const renderViewMoreCard = () => (
                                <View style={[styles.inviteCardGradient, { 
                                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a"
                                }]}>
                                  <View style={[styles.inviteAvatar, { 
                                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                  }]}>
                                    <Feather name="users" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                  </View>
                                  <Text style={[styles.inviteTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                                    View More
                                  </Text>
                                  <Text style={[styles.inviteSubtitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                    See all travelers
                                  </Text>
                                  <View style={[styles.inviteButton, { 
                                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
                                  }]}>
                                    <Feather name="chevron-right" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                    <Text style={[styles.inviteButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                      Explore
                                    </Text>
                                  </View>
                                </View>
                              );

                              return (
                                <TouchableOpacity
                                  style={[styles.userCard, { 
                                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                  }]}
                                  activeOpacity={0.7}
                                  onPress={handlePress}
                                >
                                  <View style={styles.userCardGradient}>
                                    {user.isInviteCard ? renderInviteCard() : 
                                     user.isViewMoreCard ? renderViewMoreCard() : 
                                     renderUserCard()}
                                  </View>
                                </TouchableOpacity>
                              );
                            }}
                            showsHorizontalScrollIndicator={false}
                          />
                        ) : (
                          <Text style={[styles.noDataText, { color: theme === "light" ? "#000000" : "#64748B" }]}>No nearby users found.</Text>
                        )}
                      </View>
                    );
                  } else if (item.id === "events") {
                    return (
                      <View style={styles.section}>
                        <View style={styles.headerRow}>
                          <MaterialIcons name="event" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.headerIcon} />
                          <Text style={[styles.sectionHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                            Nearby Events
                          </Text>
                        </View>
                        {item.data.length > 0 ? (
                          <FlatList
                            horizontal
                            data={[...item.data]
                              .filter(event => {
                                // Only filter out events that have a start time and are more than 1 hour past
                                if (!event.startTime) return true;
                                const startTime = new Date(event.startTime);
                                const now = new Date();
                                const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                                return startTime > oneHourAgo;
                              })
                              .sort((a, b) => {
                                // First sort by whether user is attending
                                const userIsAttendingA = a.attendees?.includes(authUser?.uid);
                                const userIsAttendingB = b.attendees?.includes(authUser?.uid);
                                if (userIsAttendingA && !userIsAttendingB) return -1;
                                if (!userIsAttendingA && userIsAttendingB) return 1;
                                
                                // Then sort by whether user is organizer
                                const userIsOrganizerA = a.organizer === authUser?.uid;
                                const userIsOrganizerB = b.organizer === authUser?.uid;
                                if (userIsOrganizerA && !userIsOrganizerB) return -1;
                                if (!userIsOrganizerA && userIsOrganizerB) return 1;
                                
                                // Then sort by start time (events without start time go to the end)
                                if (!a.startTime && !b.startTime) return 0;
                                if (!a.startTime) return 1;
                                if (!b.startTime) return -1;
                                return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                              })}
                            keyExtractor={(event) => `${event.type}-${event.id}`}
                            renderItem={({ item: event }) => (
                              <TouchableOpacity
                                style={[styles.eventCard, { 
                                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                }]}
                                activeOpacity={0.8}
                                onPress={() => router.push(event.type === "sport" ? `/sport/${event.id}` : `/event/${event.id}`)}
                              >
                                <View style={styles.eventImageContainer}>
                                {event.eventImage ? (
                                  <LoadingImage 
                                    source={{ uri: event.eventImage }} 
                                    style={styles.eventImage}
                                  />
                                ) : (
                                  <View style={[styles.eventImagePlaceholder, {
                                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                  }]}>
                                    <MaterialIcons 
                                      name="event" 
                                      size={32} 
                                      color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                                    />
                                  </View>
                                )}
                                {event.organizer && event.organizer === authUser?.uid && (
                                  <View style={[styles.organizerBadge, {
                                    backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                  }]}>
                                    <Feather name="star" size={12} color="#FFFFFF" />
                                    <Text style={styles.organizerText}>Organized by you</Text>
                                  </View>
                                )}
                                {event.attendees?.includes(authUser?.uid) && event.organizer !== authUser?.uid && (
                                  <View style={[styles.attendingBadge, {
                                    backgroundColor: theme === "light" ? "#4CAF50" : "#45a049"
                                  }]}>
                                    <Feather name="check" size={12} color="#FFFFFF" />
                                    <Text style={styles.attendingText}>You're attending</Text>
                                  </View>
                                )}
                                </View>
                                <View style={styles.eventContent}>
                                  <View style={[styles.eventHeader, { 
                                    borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                  }]}>
                                    <View style={styles.eventTitleContainer}>
                                      <Text style={[styles.eventName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                                        {event.name}
                                      </Text>
                                      {event.category && (
                                        <View style={[styles.categoryTag, {
                                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                                          borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                        }]}>
                                          <Text style={[styles.categoryText, {
                                            color: theme === "light" ? "#37a4c8" : "#38a5c9"
                                          }]}>
                                            {event.category}
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  </View>
                                  <Text style={[styles.eventDescription, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                    {event.description}
                                  </Text>
                                  <View style={styles.eventMetaContainer}>
                                    {event.startTime && (
                                      <View style={[styles.eventMetaItem, { 
                                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                      }]}>
                                        <Feather name="clock" size={14} color={theme === "light" ? "#37a4c8" : "#64748B"} />
                                        <Text style={[styles.eventMeta, { color: theme === "light" ? "#37a4c8" : "#64748B" }]}>
                                          {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                      </View>
                                    )}
                                    {event.startTime && (
                                      <CountdownTimer startTime={new Date(event.startTime)} />
                                    )}
                                    {event.attendees && (
                                      <View style={[styles.eventMetaItem, { 
                                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                      }]}>
                                        <Feather name="users" size={14} color={theme === "light" ? "#37a4c8" : "#64748B"} />
                                        <Text style={[styles.eventMeta, { color: theme === "light" ? "#37a4c8" : "#64748B" }]}>
                                          {event.attendees.length} {event.attendees.length === 1 ? 'attendee' : 'attendees'}
                                        </Text>
                                      </View>
                                    )}
                                    {event.private && (
                                      <View style={[styles.eventMetaItem, { 
                                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                      }]}>
                                        <Feather name="lock" size={14} color={theme === "light" ? "#37a4c8" : "#64748B"} />
                                        <Text style={[styles.eventMeta, { color: theme === "light" ? "#37a4c8" : "#64748B" }]}>
                                          Private
                                        </Text>
                                      </View>
                                    )}
                                    {event.airportCode && (
                                      <View style={[styles.eventMetaItem, { 
                                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                      }]}>
                                        <Feather name="airplay" size={14} color={theme === "light" ? "#37a4c8" : "#64748B"} />
                                        <Text style={[styles.eventMeta, { color: theme === "light" ? "#37a4c8" : "#64748B" }]}>
                                          {event.airportCode}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </TouchableOpacity>
                            )}
                            showsHorizontalScrollIndicator={false}
                          />
                        ) : (
                          <Text style={[styles.noDataText, { color: theme === "light" ? "#000000" : "#64748B" }]}>No events at this airport.</Text>
                        )}
                      </View>
                    );
                  }
                } else if (item.type === "feature") {
                  return (
                    <View style={styles.featureSection}>
                      <View style={styles.featureGridContainer}>
                        {features.map((feature, index) => (
                      <TouchableOpacity
                            key={index}
                            style={[styles.featureGridItem, { 
                          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "#38a5c9"
                        }]}
                            activeOpacity={0.7}
                            onPress={() => router.push(feature.screen)}
                      >
                            <View style={[styles.featureIconContainer, {
                              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                            }]}>
                              {feature.icon}
                            </View>
                            <Text style={[styles.featureGridTitle, { 
                              color: theme === "light" ? "#000000" : "#e4fbfe" 
                            }]}>
                              {feature.title}
                            </Text>
                            <Text style={[styles.featureGridDescription, { 
                              color: theme === "light" ? "#64748B" : "#64748B" 
                            }]} numberOfLines={2}>
                              {feature.description}
                            </Text>
                      </TouchableOpacity>
                        ))}
                      </View>
                      <View style={[styles.footer, { 
                        position: 'relative',
                        marginBottom: 100 // Add space at the bottom to prevent scrolling past
                      }]}>
                        <Image
                          source={require('../../../assets/adaptive-icon.png')}
                          style={[
                            styles.footerLogo,
                            { tintColor: theme === "light" ? "#0F172A" : "#e4fbfe" }
                          ]}
                          resizeMode="contain"
                        />
                        <Text style={[styles.copyrightText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                          © 2025 Wingman. All rights reserved.
                        </Text>
                      </View>
                    </View>
                  );
                } else if (item.type === "spacer") {
                  return <View style={styles.spacer} />;
                }
                return null;
              }}
            />
            {/* Floating Action Button */}
            {!showSearch && (
              <Animated.View
                style={[
                  styles.fab,
                  {
                    opacity: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1],
                    }),
                    transform: [
                      {
                        scale: sheetAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1],
                        }),
                      },
                    ],
                    backgroundColor: "#1a1a1a",
                    borderWidth: 1,
                    borderColor: "#37a4c8",
                  },
                ]}
              >
                <TouchableOpacity onPress={toggleStatusSheet}>
                  {updatingMood ? (
                    <View style={styles.loadingDot}>
                      <Animated.View
                        style={[
                          styles.loadingDotInner,
                          {
                            transform: [
                              {
                                scale: sheetAnim.interpolate({
                                  inputRange: [0, 0.5, 1],
                                  outputRange: [1, 1.2, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    </View>
                  ) : userData?.moodStatus ? (
                    <Text style={{ fontSize: 24 }}>
                      {presetStatuses.find((status: PresetStatus) => status.label === userData.moodStatus)?.emoji || "✏️"}
                    </Text>
                  ) : (
                    <Feather name="edit" size={24} color="#e4fbfe" />
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}
            {/* Status Sheet Component */}
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
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 0,
    marginTop: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerIcon: {
    marginRight: 12,
    marginTop: -30,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e4fbfe",
    marginTop: -30,
    letterSpacing: 0.3,
  },
  userCard: {
    width: 168,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    marginRight: 8,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 16,
    overflow: 'hidden',
  },
  userCardGradient: {
    padding: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#38a5c9",
    overflow: 'hidden',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  userInfo: {
    padding: 12,
    alignItems: 'center',
  },
  userSection: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.1)',
    paddingBottom: 8,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pronouns: {
    fontSize: 13,
    fontWeight: '500',
  },
  userBio: {
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.1,
    textAlign: 'center',
    marginVertical: 6,
    paddingHorizontal: 4,
  },
  userMetaContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 3,
    marginTop: 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(56, 165, 201, 0.08)',
  },
  tagIcon: {
    marginRight: 2,
  },
  tagText: {
    fontSize: 9,
    color: "#38a5c9",
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  moreTags: {
    fontSize: 9,
    color: "#38a5c9",
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  inviteCardGradient: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.03)',
  },
  inviteAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 165, 201, 0.08)',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#38a5c9",
    overflow: 'hidden',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.1,
    marginBottom: 4,
    textAlign: 'center',
  },
  inviteSubtitle: {
    fontSize: 12,
    color: "#38a5c9",
    letterSpacing: 0.1,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.2)',
  },
  inviteButtonText: {
    fontSize: 12,
    color: "#38a5c9",
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  eventCard: {
    width: 280,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventImageContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  organizerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.3,
  },
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  eventMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  eventMeta: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 0,
  },
  featureItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  featureItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureItemTextContainer: {
    flex: 1,
  },
  featureItemText: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  featureItemDescription: {
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  featureChevronContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
  filterContainer: {
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 4,
  },
  filterButton: {
    flex: 1,
  },
  filterButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  defaultSearchContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchContainer: {
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: "#64748B",
    marginLeft: 14,
    letterSpacing: 0.3,
  },
  searchIcon: {
    marginLeft: 10,
  },
  directionsButton: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
  },
  directionsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
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
  organizedResultItemView: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#38a5c9",
    borderRadius: 24,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  resultIcon: {
    marginRight: 14,
  },
  resultText: {
    flex: 1,
    fontSize: 17,
    color: "#e4fbfe",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  organizedResultText: {
    flex: 1,
    fontSize: 17,
    color: "#000000",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 40 : 32,
    right: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#38a5c9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  airportResultContent: {
    flex: 1,
    marginRight: 12,
  },
  airportName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#e4fbfe",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  airportLocation: {
    fontSize: 15,
    color: "#38a5c9",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  airportCode: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    letterSpacing: 0.5,
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
  createEventName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#38a5c9",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  createEventDescription: {
    fontSize: 14,
    color: "#64748B",
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  loadMoreButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#38a5c9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#38a5c9",
    letterSpacing: 0.3,
  },
  searchHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
    paddingTop: Platform.OS === 'ios' ? 0 : 0, // Ensure no extra padding
  },
  noDataText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 24,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  organizedEventName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  organizedEventDescription: {
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 13,
    color: "#38a5c9",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  airportMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  airportDistance: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  featureSection: {
    marginBottom: 16,
  },
  featureGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    gap: 12,
  },
  featureGridItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureGridTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  featureGridDescription: {
    fontSize: 13,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  featureGridText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16, // Reduced from 40 to 16
    marginBottom: 20,
  },
  footerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 14,
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  loadingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#37a4c8",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e4fbfe",
  },
  profilePicturePopup: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -175 }, { translateY: -180 }],
    width: 350,
    padding: 32,
    paddingTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  popupLogo: {
    width: 128,
    height: 128,
    marginBottom: 16,
    marginTop: -16,
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  popupMessage: {
    fontSize: 16,
    marginBottom: 28,
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  popupButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  popupButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  popupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  attendingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  attendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export { Dashboard };