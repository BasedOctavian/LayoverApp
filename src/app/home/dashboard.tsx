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
} from "react-native";
import { Ionicons, FontAwesome5, MaterialIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import * as Location from "expo-location";
import useAirports, { Airport } from "../../hooks/useAirports";
import useEvents from "../../hooks/useEvents";
import useSportEvents from "../../hooks/useSportEvents";
import useUsers from "../../hooks/useUsers";
import { serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNearestAirports } from "../../hooks/useNearestAirports";
import { useFilteredEvents } from "../../hooks/useFilteredEvents";
import StatusSheet from "../../components/StatusSheet";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";

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
  profilePicture?: string;
};

interface UserData {
  id: string;
  name?: string;
  moodStatus?: string;
  airportCode?: string;
  lastLogin?: any;
  profilePicture?: string;
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

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { theme } = React.useContext(ThemeContext);

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

  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"airports" | "events">("airports");
  const { getEvents } = useEvents();
  const [events, setEvents] = useState<any[]>([]);
  const { updateUser, updateUserLocationAndLogin, getNearbyUsers } = useUsers();
  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const { getSportEvents } = useSportEvents();
  const [allSportEvents, setAllSportEvents] = useState<any[]>([]);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];
  const [customStatus, setCustomStatus] = useState("");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
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
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setUserId(user.uid);
      } else {
        router.replace("login/login");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Request location permission and get location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            lat: location.coords.latitude,
            long: location.coords.longitude,
          });
        }

        // Load events and sport events in parallel
        const [eventsData, sportEventsData] = await Promise.all([
          getEvents(),
          getSportEvents(),
        ]);

        if (eventsData) setEvents(eventsData);
        if (sportEventsData) setAllSportEvents(sportEventsData);

        // Load airports
        const fetchedAirports = await getAirports();
        if (fetchedAirports) setAllAirports(fetchedAirports);

        // Set initial load complete
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        showPopup("Error", "Failed to load dashboard data", "error");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      initializeDashboard();
    }
  }, [userId]);

  useEffect(() => {
    const loadEvents = async () => {
      const eventsData = await getEvents();
      if (eventsData) setEvents(eventsData);
    };
    loadEvents();
  }, []);

  useEffect(() => {
    const loadSportEvents = async () => {
      const eventsData = await getSportEvents();
      if (eventsData) setAllSportEvents(eventsData);
    };
    loadSportEvents();
  }, [getSportEvents]);

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

  const { getAirports } = useAirports();
  useEffect(() => {
    const fetchAirports = async () => {
      const fetchedAirports = await getAirports();
      if (fetchedAirports) setAllAirports(fetchedAirports);
    };
    fetchAirports();
  }, [getAirports]);

  const nearestAirports = useNearestAirports(userLocation, allAirports);

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

  const { filteredRegularEvents, matchingSportEvents } = useFilteredEvents(selectedAirport, events, allSportEvents);
  const allEvents = [...matchingSportEvents, ...filteredRegularEvents];

  useEffect(() => {
    const fetchNearbyUsers = async () => {
      if (!selectedAirport?.airportCode) return;
      
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const users = await getNearbyUsers(selectedAirport.airportCode, thirtyMinutesAgo) as UserData[];
        
        // Convert users to NearbyUser format and limit to 3
        const formattedUsers = users
          .filter(user => user.id !== userId) // Exclude current user
          .slice(0, 3)
          .map(user => ({
            id: user.id,
            name: user.name || 'Anonymous',
            status: user.moodStatus || 'Available',
            profilePicture: user.profilePicture
          }));

        // Generate a unique timestamp for this batch of invite cards
        const timestamp = Date.now();
        
        // If we have fewer than 3 users, add "Invite Friends" cards with unique IDs
        const inviteFriendsCards = Array(3 - formattedUsers.length)
          .fill(null)
          .map((_, index) => ({
            id: `invite-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Invite Friends',
            status: 'Click to invite',
            isInviteCard: true,
            profilePicture: undefined
          }));

        setNearbyUsers([...formattedUsers, ...inviteFriendsCards]);
      } catch (error) {
        console.error('Error fetching nearby users:', error);
        setNearbyUsers([]);
      }
    };

    fetchNearbyUsers();
  }, [selectedAirport?.airportCode, userId]);

  const features: FeatureButton[] = [
    { 
      icon: <FontAwesome5 name="user-friends" size={24} color="#38a5c9" />, 
      title: "Nearby Users", 
      screen: "swipe",
      description: "Connect with travelers at your airport"
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
      icon: <Ionicons name="settings" size={24} color="#38a5c9" />, 
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
      ? (allAirports || []).filter((airport: Airport) => 
          airport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          airport?.airportCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          airport?.location?.toLowerCase().includes(searchQuery.toLowerCase()))
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
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
          }]}>
            <Feather name="airplay" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.resultIcon} />
            <View style={styles.airportResultContent}>
              <Text style={[styles.airportName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{item.name}</Text>
              <Text style={[styles.airportLocation, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>{item.location}</Text>
              <Text style={[styles.airportCode, { color: theme === "light" ? "#37a4c8" : "#64748B" }]}>{item.airportCode}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={theme === "light" ? "#37a4c8" : "#CBD5E1"} />
          </View>
        </TouchableOpacity>
      );
    } else {
      const isOrganized = item.organizer !== null;
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
            isCreateEvent ? styles.createEventItemView : (isOrganized ? styles.organizedResultItemView : styles.resultItemView),
            { 
              backgroundColor: isOrganized 
                ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                : (theme === "light" ? "#ffffff" : "#1a1a1a"),
              borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
            }
          ]}>
            <Feather 
              name={isCreateEvent ? "plus-circle" : "calendar"} 
              size={20} 
              color={isCreateEvent 
                ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                : (isOrganized ? "#FFFFFF" : (theme === "light" ? "#37a4c8" : "#38a5c9"))} 
              style={styles.resultIcon} 
            />
            <View style={styles.eventResultContent}>
              <Text style={[
                isCreateEvent ? styles.createEventName : (isOrganized ? styles.organizedEventName : styles.eventName),
                { 
                  color: isOrganized 
                    ? "#FFFFFF" 
                    : (theme === "light" ? "#000000" : "#e4fbfe")
                }
              ]}>
                {item.name}
              </Text>
              <Text style={[
                isCreateEvent ? styles.createEventDescription : (isOrganized ? styles.organizedEventDescription : styles.eventDescription),
                { 
                  color: isOrganized 
                    ? "#FFFFFF" 
                    : (theme === "light" ? "#37a4c8" : "#38a5c9")
                }
              ]}>
                {item.description}
              </Text>
            </View>
            <Feather 
              name="chevron-right" 
              size={18} 
              color={isCreateEvent 
                ? (theme === "light" ? "#37a4c8" : "#CBD5E1")
                : (isOrganized ? "#FFFFFF" : (theme === "light" ? "#37a4c8" : "#CBD5E1"))} 
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
    ...features.map((feature, index) => ({ type: "feature", id: index.toString(), data: feature })),
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
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar onProfilePress={() => router.push(`profile/${authUser?.uid}`)} />
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
                    }]}>
                      {selectedAirport ? selectedAirport.name : "Select an airport"}
                    </Text>
                    <Feather name="chevron-down" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.searchIcon} />
                  </View>
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
                        {item.data.length > 0 ? (
                          <FlatList
                            horizontal
                            data={item.data}
                            keyExtractor={(user: NearbyUser) => user.id}
                            renderItem={({ item: user }: { item: NearbyUser }) => (
                              <TouchableOpacity
                                style={[styles.userCard, { 
                                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                  if (user.isInviteCard) {
                                    Linking.openURL('https://www.google.com');
                                  } else {
                                    router.push(`profile/${user.id}`);
                                  }
                                }}
                              >
                                <View style={[styles.avatar, { 
                                  backgroundColor: theme === "light" ? "#e6e6e6" : "#000000",
                                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
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
                                <Text style={[styles.userName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{user.name}</Text>
                                <Text style={[styles.userStatus, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>{user.status}</Text>
                              </TouchableOpacity>
                            )}
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
                            data={[...item.data].sort((a, b) => {
                              if (a.organizer && !b.organizer) return -1;
                              if (!a.organizer && b.organizer) return 1;
                              return 0;
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
                                {event.eventImage ? (
                                  <Image 
                                    source={{ uri: event.eventImage }} 
                                    style={styles.eventImage}
                                  />
                                ) : (
                                  <View style={[styles.eventImagePlaceholder, { 
                                    backgroundColor: theme === "light" ? "#e6e6e6" : "#000000",
                                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                  }]}>
                                    {React.cloneElement(getEventIcon(event.name), { size: 24 })}
                                  </View>
                                )}
                                <View style={styles.eventContent}>
                                  <View style={[styles.eventHeader, { 
                                    borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                  }]}>
                                    {React.cloneElement(getEventIcon(event.name), { size: 24 })}
                                    <Text style={[styles.eventName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                                      {event.name}
                                    </Text>
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
                                    {event.category && (
                                      <View style={[styles.eventMetaItem, { 
                                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                                      }]}>
                                        {React.cloneElement(getEventIcon(event.name), { size: 24 })}
                                        <Text style={[styles.eventMeta, { color: theme === "light" ? "#37a4c8" : "#64748B" }]}>
                                          {event.category}
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
                    <View style={styles.featureItem}>
                      <TouchableOpacity
                        style={[styles.featureItemContent, { 
                          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                          borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                        }]}
                        activeOpacity={0.8}
                        onPress={() => router.push(item.data.screen)}
                      >
                        <View style={styles.featureItemLeft}>
                          {item.data.icon}
                          <View style={styles.featureItemTextContainer}>
                            <Text style={[styles.featureItemText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                              {item.data.title}
                            </Text>
                            <Text style={[styles.featureItemDescription, { color: theme === "light" ? "#64748B" : "#64748B" }]}>
                              {item.data.description}
                            </Text>
                          </View>
                        </View>
                        <Feather name="chevron-right" size={18} color={theme === "light" ? "#37a4c8" : "#CBD5E1"} />
                      </TouchableOpacity>
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
                      outputRange: [1, 0],
                    }),
                    transform: [
                      {
                        scale: sheetAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.8],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <TouchableOpacity onPress={toggleStatusSheet}>
                  <Feather name="edit" size={24} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>
            )}
            {/* Status Sheet Component */}
            {showStatusSheet && (
              <TouchableWithoutFeedback onPress={toggleStatusSheet}>
                <View style={styles.overlay} />
              </TouchableWithoutFeedback>
            )}
            <StatusSheet
              showStatusSheet={showStatusSheet}
              sheetAnim={sheetAnim}
              customStatus={customStatus}
              setCustomStatus={setCustomStatus}
              handleUpdateMoodStatus={handleUpdateMoodStatus}
              toggleStatusSheet={toggleStatusSheet}
            />
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
    width: 160,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 40,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#38a5c9",
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e4fbfe",
    textAlign: "center",
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: "#38a5c9",
    textAlign: "center",
  },
  eventCard: {
    width: 320,
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    marginRight: 16,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  eventContent: {
    padding: 24,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.1)',
  },
  eventName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e4fbfe",
    marginBottom: 8,
    letterSpacing: 0.3,
    flex: 1,
  },
  eventDescription: {
    fontSize: 15,
    color: "#38a5c9",
    marginBottom: 16,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  eventMetaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  eventMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  eventMeta: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  featureItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  featureItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  featureItemTextContainer: {
    marginLeft: 14,
    flex: 1,
  },
  featureItemText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  featureItemDescription: {
    fontSize: 13,
    letterSpacing: 0.2,
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
    flex: 1,
    fontSize: 17,
    marginLeft: 14,
    letterSpacing: 0.3,
  },
  searchIcon: {
    marginLeft: 10,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  eventImagePlaceholder: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
});

export { Dashboard };