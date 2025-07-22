import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Pressable,
  Dimensions,
  Image,
  ScrollView,
  TextInput,
  Platform,
  ViewStyle,
  TextStyle,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useEvents from "../hooks/useEvents";
import useUsers from "../hooks/useUsers";
import useAuth from "../hooks/auth";
import useConnections from "../hooks/useConnections";
import usePings from "../hooks/usePings";
import * as Location from "expo-location";
import TopBar from "../components/TopBar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../context/ThemeContext";
import { useFilteredEvents } from "../hooks/useFilteredEvents";
import * as Haptics from "expo-haptics";
import LoadingElement from "../components/LoadingElement";
import useLoadingMessages from "../hooks/useLoadingMessages";
import LoadingScreen from "../components/LoadingScreen";
import useNotificationCount from "../hooks/useNotificationCount";
import UserAvatar from "../components/UserAvatar";
import ExploreMap from "../components/ExploreMap";
import { PING_CATEGORIES } from "../constants/pingCategories";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface Location {
  latitude: number;
  longitude: number;
}

interface Event {
  id: string;
  title: string;
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  createdAt: any;
  startTime: string | null;
  creatorId: string;
  creatorName: string;
  participants: string[];
  participantCount: number;
  location: string;
  category: string;
  eventUID: string;
  eventImage: string | null;
  updatedAt: any;
  duration: string;
  maxParticipants: string;
  status: string;
  template: string;
  pingType: string;
  visibilityRadius: string;
  connectionIntents: string[];
  eventPreferences: any;
}

interface Ping {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  category: string;
  template: string;
  duration: string;
  maxParticipants: string;
  pingType: string;
  visibilityRadius: string;
  connectionIntents: string[];
  eventPreferences: any;
  createdAt: any;
  status: string;
  participants: string[];
  participantCount: number;
}

interface User {
  id: string;
  name: string;
  age: number;
  bio: string;
  profilePicture: string;
  interests: string[];
  moodStatus: string;
  languages?: string[];
  goals?: string[];
  travelHistory?: string[];
  availabilitySchedule?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
  lastKnownCoordinates?: {
    latitude: number;
    longitude: number;
  };
  currentCity?: string;
  personalTags?: string[]; // Added personalTags
}

interface UnifiedItem {
  id: string;
  type: 'event' | 'ping';
  data: Event | Ping;
  createdAt: any;
  distance?: number;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// --- Update isUserCurrentlyAvailable to handle 24-hour time strings correctly ---
const isUserCurrentlyAvailable = (availabilitySchedule: any): boolean => {
  if (!availabilitySchedule) return false;

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof availabilitySchedule;
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

  const daySchedule = availabilitySchedule[currentDay];
  if (!daySchedule || !daySchedule.start || !daySchedule.end) return false;

  // If both start and end are '00:00', treat as unavailable
  if (daySchedule.start === '00:00' && daySchedule.end === '00:00') return false;

  // Parse start and end as minutes since midnight
  const parseMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const startMinutes = parseMinutes(daySchedule.start);
  const endMinutes = parseMinutes(daySchedule.end);

  // Handle overnight schedules (e.g., 22:00-02:00)
  if (endMinutes < startMinutes) {
    return currentTime >= startMinutes || currentTime <= endMinutes;
  }

  return currentTime >= startMinutes && currentTime <= endMinutes;
};

const CountdownTimer = ({ startTime }: { startTime: Date | null }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!startTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const difference = start - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } else {
        setTimeLeft('Starting now');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <View style={styles.countdownContainer}>
      <Ionicons name="time-outline" size={12} color="#37a4c8" />
      <Text style={styles.countdownText}>{timeLeft}</Text>
    </View>
  );
};

const ModernLoadingIndicator = ({ color }: { color: string }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <ActivityIndicator size="small" color={color} />
    </Animated.View>
  );
};

// Helper to calculate event end time from startTime and duration
function getEventEndTime(startTime: string, duration: string): Date | null {
  if (!startTime || !duration) return null;
  const start = new Date(startTime);
  let minutes = 0;
  const d = duration.trim().toLowerCase();
  if (d.endsWith('h')) {
    minutes = parseFloat(d) * 60;
  } else if (d.endsWith('m')) {
    minutes = parseFloat(d);
  } else if (!isNaN(Number(d))) {
    minutes = Number(d);
  }
  return new Date(start.getTime() + minutes * 60000);
}

// Helper to calculate ping end time from createdAt and duration
function getPingEndTime(createdAt: any, duration: string): Date | null {
  if (!createdAt || !duration) return null;
  let start: Date;
  if (typeof createdAt === 'string' || createdAt instanceof String) {
    start = new Date(createdAt as string);
  } else if (createdAt?.toDate) {
    start = createdAt.toDate();
  } else if (createdAt instanceof Date) {
    start = createdAt;
  } else {
    return null;
  }
  let minutes = 0;
  const d = duration.trim().toLowerCase();
  if (d.endsWith('h')) {
    minutes = parseFloat(d) * 60;
  } else if (d.endsWith('m')) {
    minutes = parseFloat(d);
  } else if (d.includes('hour')) {
    // e.g. '1 hour', '2 hours'
    const match = d.match(/(\d+(?:\.\d+)?)/);
    if (match) minutes = parseFloat(match[1]) * 60;
  } else if (!isNaN(Number(d))) {
    minutes = Number(d);
  }
  return new Date(start.getTime() + minutes * 60000);
}

export default function Explore() {
  const router = useRouter();
  const { getUser, getUsers } = useUsers();
  const { getEvents } = useEvents();
  const { user } = useAuth();
  const { checkConnection } = useConnections();
  const { getPings } = usePings({ user });
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userConnectionStatus, setUserConnectionStatus] = useState<{[key: string]: 'connected' | 'pending' | 'none'}>({});
  const [isCheckingConnections, setIsCheckingConnections] = useState(false);
  const [availableUsersCount, setAvailableUsersCount] = useState(0);
  
  // New state for improved UX
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'pings' | 'map'>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filterDistance, setFilterDistance] = useState<number>(50); // miles
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  
  // Animation values
  const categoryBarAnim = useRef(new Animated.Value(1)).current;
  const tabBarAnim = useRef(new Animated.Value(1)).current;
  const searchInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const ITEMS_PER_PAGE = 20;

  // Create unified list of events and pings
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];
    
    // Add events
    events.forEach(event => {
      let distance: number | undefined;
      if (currentLocation && event.coordinates) {
        distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          event.coordinates.latitude,
          event.coordinates.longitude
        );
      }
      
      items.push({
        id: event.id,
        type: 'event',
        data: event,
        createdAt: event.createdAt,
        distance
      });
    });
    
    // Add pings
    pings.forEach(ping => {
      let distance: number | undefined;
      if (currentLocation && ping.coordinates) {
        distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          ping.coordinates.latitude,
          ping.coordinates.longitude
        );
      }
      
      items.push({
        id: ping.id,
        type: 'ping',
        data: ping,
        createdAt: ping.createdAt,
        distance
      });
    });
    
    // Sort by creation date (newest first)
    return items.sort((a, b) => {
      const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt);
      const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [events, pings, currentLocation]);

  // Filter items based on selected category, tab, and other filters
  const filteredItems = useMemo(() => {
    let filtered = unifiedItems;

    // Exclude events that are over and friends-only events
    filtered = filtered.filter(item => {
      if (item.type === 'event') {
        const event = item.data as Event;
        // Exclude friends-only events
        if (event.pingType === 'friends-only') return false;
        // Exclude events that are over
        if (event.startTime && event.duration) {
          const endTime = getEventEndTime(event.startTime, event.duration);
          if (endTime && new Date() > endTime) return false;
        }
        return true;
      } else if (item.type === 'ping') {
        const ping = item.data as Ping;
        // Exclude pings that are over
        if (ping.createdAt && ping.duration) {
          const endTime = getPingEndTime(ping.createdAt, ping.duration);
          if (endTime) {
            // Add a small buffer (30 minutes) to allow for some flexibility
            const bufferMs = 30 * 60 * 1000; // 30 minutes in milliseconds
            const now = new Date();
            if (now.getTime() > (endTime.getTime() + bufferMs)) return false;
          }
        }
        return true;
      }
      return true;
    });

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(item => item.data.category === selectedCategory);
    }
    
    // Filter by tab
    if (activeTab === 'events') {
      filtered = filtered.filter(item => item.type === 'event');
    } else if (activeTab === 'pings') {
      filtered = filtered.filter(item => item.type === 'ping');
    }
    
    // Filter by distance
    if (currentLocation) {
      filtered = filtered.filter(item => {
        if (!item.distance) return true;
        return item.distance <= filterDistance;
      });
    }
    
    // Filter by availability (for events with start times)
    if (showAvailableOnly) {
      filtered = filtered.filter(item => {
        if (item.type === 'event') {
          const event = item.data as Event;
          if (!event.startTime) return true;
          const startTime = new Date(event.startTime);
          const now = new Date();
          return startTime > now;
        }
        return true;
      });
    }
    
    return filtered;
  }, [unifiedItems, selectedCategory, activeTab, filterDistance, showAvailableOnly, currentLocation]);

  // --- Update searchResults to filter users by availability if showAvailableOnly is true ---
  // --- Update searchResults type for type safety ---
  type SearchResult =
    | { kind: 'activity'; item: UnifiedItem }
    | { kind: 'user'; user: User };

  const searchResults: SearchResult[] = useMemo(() => {
    // Helper for user distance filtering
    const isUserWithinDistance = (user: User) => {
      if (!currentLocation) return true;
      if (!user.lastKnownCoordinates) return true; // No location, always include
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        user.lastKnownCoordinates.latitude,
        user.lastKnownCoordinates.longitude
      );
      return distance <= filterDistance;
    };

    if (!searchQuery.trim()) {
      // No search: only filter users by availability if showAvailableOnly is true, and by location
      const base = filteredItems.map(item => ({ kind: 'activity' as const, item }));
      let userResults = users;
      if (showAvailableOnly) {
        userResults = userResults.filter(user => isUserCurrentlyAvailable(user.availabilitySchedule));
      }
      // Location filter for users
      userResults = userResults.filter(isUserWithinDistance);
      // Only include users if activeTab is 'all'
      if (activeTab === 'all') {
        return [
          ...base,
          ...userResults.map(user => ({ kind: 'user' as const, user }))
        ];
      } else {
        return base;
      }
    }

    const lowerQuery = searchQuery.toLowerCase();

    // Filter activities (events/pings)
    const activityMatches = filteredItems.filter(item => {
      const data = item.data;
      return (
        data.title?.toLowerCase().includes(lowerQuery) ||
        data.description?.toLowerCase().includes(lowerQuery) ||
        (data.location && data.location.toLowerCase().includes(lowerQuery))
      );
    }).map(item => ({ kind: 'activity' as const, item }));

    // Filter users by name only, and by availability/location if needed
    let userMatches = users.filter(user =>
      user.name?.toLowerCase().includes(lowerQuery)
    );
    if (showAvailableOnly) {
      userMatches = userMatches.filter(user => isUserCurrentlyAvailable(user.availabilitySchedule));
    }
    // Location filter for users
    userMatches = userMatches.filter(isUserWithinDistance);

    // Only include users if activeTab is 'all'
    if (activeTab === 'all') {
      return [
        ...activityMatches,
        ...userMatches.map(user => ({ kind: 'user' as const, user }))
      ];
    } else {
      return activityMatches;
    }
  }, [searchQuery, filteredItems, users, showAvailableOnly, currentLocation, filterDistance, activeTab]);

  // --- Add state for pagination ---
  const [resultsToShow, setResultsToShow] = useState(10);

  // Reset pagination when searchResults changes
  useEffect(() => {
    setResultsToShow(10);
  }, [searchResults]);

  const paginatedResults = useMemo(() => searchResults.slice(0, resultsToShow), [searchResults, resultsToShow]);

  // Fetch current location, events, and pings
  useEffect(() => {
    const initializeData = async () => {
      try {
        setError(null);
        // Request location permission and get current location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission is required to show nearby events.");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Fetch events
        const fetchedEvents = await getEvents();
        if (fetchedEvents && Array.isArray(fetchedEvents)) {
          const processedEvents = fetchedEvents.map((event: any) => {
            try {
              return {
                id: event.id || '',
                title: event.title || '',
                description: (event.description || '').trim(),
                coordinates: event.coordinates || { latitude: 0, longitude: 0 },
                createdAt: event.createdAt,
                startTime: event.startTime || null,
                creatorId: event.creatorId || '',
                creatorName: event.creatorName || '',
                participants: Array.isArray(event.participants) ? event.participants : [],
                participantCount: event.participantCount || 0,
                location: event.location || '',
                category: event.category || '',
                eventUID: event.eventUID || '',
                eventImage: event.eventImage || null,
                updatedAt: event.updatedAt,
                duration: event.duration || '',
                maxParticipants: event.maxParticipants || '',
                status: event.status || '',
                template: event.template || '',
                pingType: event.pingType || '',
                visibilityRadius: event.visibilityRadius || '',
                connectionIntents: Array.isArray(event.connectionIntents) ? event.connectionIntents : [],
                eventPreferences: event.eventPreferences || {},
              } as Event;
            } catch (error) {
              console.error("Error processing event:", error);
              return null;
            }
          });
          const validEvents = processedEvents.filter((event): event is Event => event !== null);
          setEvents(validEvents);
        }

        // Fetch pings
        const fetchedPings = await getPings();
        if (fetchedPings && Array.isArray(fetchedPings)) {
          const processedPings = fetchedPings.map((ping: any) => ({
            ...ping,
            description: (ping.description || '').trim()
          }));
          setPings(processedPings);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
        setInitialLoadComplete(true);
      }
    };

    initializeData();
  }, []);

  // Fetch users when location changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (currentLocation) {
        const allUsers = await getUsers();
        const filteredUsers = allUsers
          .filter((userDoc: any) => userDoc.id !== user?.uid)
          .map((userDoc: any) => ({
            id: userDoc.id,
            name: userDoc.name || 'Anonymous',
            age: userDoc.age || 0,
            bio: userDoc.bio || '',
            profilePicture: userDoc.profilePicture || 'https://via.placeholder.com/150',
            interests: userDoc.interests || [],
            moodStatus: userDoc.moodStatus || 'neutral',
            languages: userDoc.languages || [],
            goals: userDoc.goals || [],
            travelHistory: userDoc.travelHistory || [],
            availabilitySchedule: userDoc.availabilitySchedule || null,
            lastKnownCoordinates: userDoc.lastKnownCoordinates || null,
            currentCity: userDoc.currentCity || undefined,
            personalTags: userDoc.personalTags || [] // Add personalTags
          }))
          .sort((a, b) => {
            const aHasProfilePic = a.profilePicture && a.profilePicture !== 'https://via.placeholder.com/150';
            const bHasProfilePic = b.profilePicture && b.profilePicture !== 'https://via.placeholder.com/150';
            
            if (aHasProfilePic && !bHasProfilePic) return -1;
            if (!aHasProfilePic && bHasProfilePic) return 1;
            return 0;
          });
        setUsers(filteredUsers);
        
        // Calculate available users count
        const availableCount = filteredUsers.filter(user => {
          const isAvailable = isUserCurrentlyAvailable(user.availabilitySchedule);
          if (!isAvailable) return false;
          
          if (currentLocation && user.lastKnownCoordinates) {
            const distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              user.lastKnownCoordinates.latitude,
              user.lastKnownCoordinates.longitude
            );
            return distance <= 20; // Within 20 miles
          }
          return true;
        }).length;
        
        setAvailableUsersCount(availableCount);
      }
    };

    fetchUsers();
  }, [currentLocation]);

  // Check connection status for users
  useEffect(() => {
    const checkConnectionStatusForUsers = async (usersList: User[], currentUserId: string) => {
      if (!currentUserId || usersList.length === 0) return;
      
      setIsCheckingConnections(true);
      const connectionStatus: {[key: string]: 'connected' | 'pending' | 'none'} = {};
      
      try {
        await Promise.all(
          usersList.map(async (user) => {
            try {
              const connection = await checkConnection(currentUserId, user.id);
              connectionStatus[user.id] = connection ? (connection.status === 'active' ? 'connected' : 'pending') : 'none';
            } catch (error) {
              console.error(`Error checking connection status for user ${user.id}:`, error);
              connectionStatus[user.id] = 'none';
            }
          })
        );
        
        setUserConnectionStatus(connectionStatus);
      } catch (error) {
        console.error("Error checking connection statuses:", error);
      } finally {
        setIsCheckingConnections(false);
      }
    };

    if (users.length > 0 && user?.uid) {
      checkConnectionStatusForUsers(users, user.uid);
    }
  }, [users, user?.uid]);

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
    
    // Animate category bar
    Animated.sequence([
      Animated.timing(categoryBarAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(categoryBarAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Handle tab selection
  const handleTabSelect = (tab: 'all' | 'events' | 'pings' | 'map') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setActiveTab(tab);
    
    // Animate tab bar
    Animated.sequence([
      Animated.timing(tabBarAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tabBarAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Handle infinite scroll
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMoreData) return;
    
    setIsLoadingMore(true);
    
    // Simulate loading more data
    setTimeout(() => {
      setIsLoadingMore(false);
      // In a real implementation, you would fetch more data here
      // For now, we'll just set hasMoreData to false after a certain point
      if (filteredItems.length > 100) {
        setHasMoreData(false);
      }
    }, 1000);
  }, [isLoadingMore, hasMoreData, filteredItems.length]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refetch data
      const [fetchedEvents, fetchedPings] = await Promise.all([
        getEvents(),
        getPings()
      ]);
      
      if (fetchedEvents && Array.isArray(fetchedEvents)) {
        const processedEvents = fetchedEvents.map((event: any) => ({
          id: event.id || '',
          title: event.title || '',
          description: (event.description || '').trim(),
          coordinates: event.coordinates || { latitude: 0, longitude: 0 },
          createdAt: event.createdAt,
          startTime: event.startTime || null,
          creatorId: event.creatorId || '',
          creatorName: event.creatorName || '',
          participants: Array.isArray(event.participants) ? event.participants : [],
          participantCount: event.participantCount || 0,
          location: event.location || '',
          category: event.category || '',
          eventUID: event.eventUID || '',
          eventImage: event.eventImage || null,
          updatedAt: event.updatedAt,
          duration: event.duration || '',
          maxParticipants: event.maxParticipants || '',
          status: event.status || '',
          template: event.template || '',
          pingType: event.pingType || '',
          visibilityRadius: event.visibilityRadius || '',
          connectionIntents: Array.isArray(event.connectionIntents) ? event.connectionIntents : [],
          eventPreferences: event.eventPreferences || {},
        } as Event));
        setEvents(processedEvents);
      }
      
      if (fetchedPings && Array.isArray(fetchedPings)) {
        const processedPings = fetchedPings.map((ping: any) => ({
          ...ping,
          description: (ping.description || '').trim()
        }));
        setPings(processedPings);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [getEvents, getPings]);

  // Handle search
  const handleSearchFocus = () => {
    setIsSearching(true);
  };

  const handleSearchBlur = () => {
    setIsSearching(false);
  };

  const handleSearchClear = () => {
    setSearchQuery("");
    searchInputRef.current?.blur();
  };



  // Show loading screen during initial load
  if (isLoading || !initialLoadComplete) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <LoadingScreen />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // Modern Activity Card Component
  const ActivityCard = ({ item }: { item: UnifiedItem }) => {
    const { theme } = React.useContext(ThemeContext);
    const isEvent = item.type === 'event';
    const data = item.data as Event | Ping;

    return (
      <TouchableOpacity
        style={[
          styles.activityCard,
          {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#E2E8F0" : "#374151",
          },
        ]}
        onPress={() => {
          if (isEvent) {
            router.push(`/event/${item.id}`);
          } else {
            router.push(`/ping/${item.id}`);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.activityCardHeader}>
          <View style={styles.activityBadge}>
            <Ionicons 
              name={isEvent ? "calendar" : "flash"} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.activityBadgeText}>
              {isEvent ? "EVENT" : "PING"}
            </Text>
          </View>
          
          {item.distance && (
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={12} color="#37a4c8" />
              <Text style={styles.distanceText}>
                {item.distance.toFixed(1)} mi
              </Text>
            </View>
          )}
        </View>

        <View style={styles.activityCardContent}>
          <Text style={[styles.activityTitle, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]} numberOfLines={2}>
            {data.title}
          </Text>
          
          <Text style={[styles.activityDescription, { 
            color: theme === "light" ? "#64748B" : "#94A3B8" 
          }]} numberOfLines={2}>
            {data.description}
          </Text>

          <View style={styles.activityMeta}>
            <View style={styles.organizerContainer}>
              <Ionicons name="person" size={14} color={theme === "light" ? "#64748B" : "#94A3B8"} />
              <Text style={[styles.organizerText, { 
                color: theme === "light" ? "#64748B" : "#94A3B8" 
              }]}>
                {data.creatorName}
              </Text>
            </View>
          </View>

          {isEvent && (data as Event).startTime && (
            <CountdownTimer startTime={new Date((data as Event).startTime!)} />
          )}

          <View style={styles.activityFooter}>
            <View style={styles.categoryTag}>
              <MaterialIcons 
                name={PING_CATEGORIES.find(cat => cat.id === data.category)?.icon as any || "category"} 
                size={14} 
                color="#37a4c8" 
              />
              <Text style={styles.categoryTagText}>
                {PING_CATEGORIES.find(cat => cat.id === data.category)?.label || data.category}
              </Text>
            </View>

            <View style={styles.participantsContainer}>
              <Ionicons name="people" size={14} color="#37a4c8" />
              <Text style={styles.participantsText}>
                {data.participantCount}/{data.maxParticipants}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons 
        name={activeTab === 'events' ? "calendar-outline" : activeTab === 'pings' ? "flash-outline" : "search-outline"} 
        size={64} 
        color={theme === "light" ? "#CBD5E1" : "#374151"} 
      />
      <Text style={[styles.emptyStateTitle, { 
        color: theme === "light" ? "#0F172A" : "#e4fbfe" 
      }]}>
        {selectedCategory 
          ? `No ${activeTab === 'events' ? 'events' : activeTab === 'pings' ? 'pings' : 'activities'} in ${PING_CATEGORIES.find(cat => cat.id === selectedCategory)?.label}`
          : `No ${activeTab === 'events' ? 'events' : activeTab === 'pings' ? 'pings' : 'activities'} found`
        }
      </Text>
      <Text style={[styles.emptyStateSubtitle, { 
        color: theme === "light" ? "#64748B" : "#94A3B8" 
      }]}>
        Try adjusting your filters or check back later
      </Text>
    </View>
  );

  // Render loading footer
  const renderLoadingFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ModernLoadingIndicator color="#37a4c8" />
        <Text style={[styles.loadingFooterText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const UserCard = ({ user }: { user: User }) => {
    const { theme } = React.useContext(ThemeContext);
    const router = useRouter();
    const availableNow = isUserCurrentlyAvailable(user.availabilitySchedule);

    return (
      <TouchableOpacity
        style={[
          {
            borderRadius: 20,
            marginBottom: 12,
            borderWidth: 1,
            overflow: 'hidden',
            position: 'relative',
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#E2E8F0" : "#374151",
          },
        ]}
        onPress={() => router.push(`/profile/${user.id}`)}
        activeOpacity={0.8}
      >
        {/* Available Now Tag */}
        {availableNow && (
          <View style={styles.availableNowTag}>
            <Text style={styles.availableNowTagText}>Available Now</Text>
          </View>
        )}
        <View style={styles.userCardContent}>
          <View style={styles.userHeader}>
            <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
            <View style={styles.userMainInfo}>
              <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>{user.name}</Text>
              <Text style={[styles.userAge, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>{user.age} yrs</Text>
              {user.currentCity && (
                <Text style={[styles.userLocation, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>{user.currentCity}</Text>
              )}
            </View>
          </View>
          <Text style={[styles.userBio, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={2}>{user.bio}</Text>
          {/* Render first 3 personalTags as tags, if present */}
          {user.personalTags && user.personalTags.length > 0 && (
            <View style={styles.userInterestsContainer}>
              {user.personalTags.slice(0, 3).map((tag, idx) => (
                <View key={idx} style={[styles.interestTag, { borderColor: theme === "light" ? "#E2E8F0" : "#374151" }]}> 
                  <Text style={[styles.interestText, { color: theme === "light" ? "#37a4c8" : "#e4fbfe" }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        
        <TopBar 
          showNotifications={notificationCount > 0}
          notificationCount={notificationCount}
        />

        {/* Scrollable Content - Everything scrolls together */}
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={{ paddingBottom: 64 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#37a4c8"
              colors={["#37a4c8"]}
            />
          }
        >
          {/* Map Section - Now scrolls with content */}
          <View style={styles.mapSection}>
            <ExploreMap
              events={filteredItems.filter(item => item.type === 'event').map(item => {
                const eventData = item.data as Event;
                return {
                  id: eventData.id,
                  name: eventData.title,
                  latitude: eventData.coordinates.latitude.toString(),
                  longitude: eventData.coordinates.longitude.toString(),
                  startTime: eventData.startTime ? new Date(eventData.startTime) : null,
                  attendees: eventData.participants
                };
              })}
              onEventPress={(event) => router.push("/event/" + event.id)}
              currentUserId={user?.uid}
            />
          </View>

          {/* Content Section - Below map */}
          <View style={styles.contentSection}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIcon}>
              <Ionicons name="search" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} />
            </View>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, {
                backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                color: theme === "light" ? "#0F172A" : "#e4fbfe"
              }]}
              placeholder="Search activities, people, or places..."
              placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
            {searchQuery ? (
              <TouchableOpacity 
                onPress={handleSearchClear}
                style={styles.searchClearButton}
              >
                <Ionicons name="close" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Sticky Category Bar */}
          <Animated.View 
            style={[
              styles.categoryBarContainer,
              { transform: [{ scale: categoryBarAnim }] }
            ]}
          >
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.categoryBar}
            >
              {PING_CATEGORIES.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipActive,
                    {
                      backgroundColor: selectedCategory === category.id 
                        ? "#37a4c8" 
                        : theme === "light" ? "#FFFFFF" : "#1a1a1a",
                      borderColor: selectedCategory === category.id 
                        ? "#37a4c8" 
                        : theme === "light" ? "#E2E8F0" : "#374151"
                    }
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={category.icon as any} 
                    size={16} 
                    color={selectedCategory === category.id ? "#FFFFFF" : "#37a4c8"} 
                  />
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === category.id && styles.categoryChipTextActive,
                    { color: selectedCategory === category.id ? "#FFFFFF" : "#37a4c8" }
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Tab Bar */}
          <Animated.View 
            style={[
              styles.tabBarContainer,
              { transform: [{ scale: tabBarAnim }] }
            ]}
          >
            <View style={[
              styles.tabBar,
              {
                // No border or background, just layout
              }
            ]}>
              {[
                { key: 'all', label: 'All', icon: 'grid-outline' },
                { key: 'events', label: 'Events', icon: 'calendar-outline' },
                { key: 'pings', label: 'Pings', icon: 'flash-outline' }
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tab,
                    activeTab === tab.key && styles.tabActive,
                    {
                      backgroundColor: activeTab === tab.key 
                        ? "#37a4c8" 
                        : theme === "light" ? "#F1F5F9" : "#374151"
                      }
                    ]}
                    onPress={() => handleTabSelect(tab.key as 'all' | 'events' | 'pings')}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={tab.icon as any} 
                      size={16} 
                      color={activeTab === tab.key ? "#FFFFFF" : "#37a4c8"} 
                    />
                    <Text style={[
                      styles.tabText,
                      activeTab === tab.key && styles.tabTextActive,
                      { color: activeTab === tab.key ? "#FFFFFF" : "#37a4c8" }
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Quick Filters */}
            <View style={styles.filtersContainer}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  showAvailableOnly && styles.filterChipActive,
                  {
                    backgroundColor: showAvailableOnly 
                      ? "#37a4c8" 
                      : theme === "light" ? "#F1F5F9" : "#374151",
                    borderColor: showAvailableOnly 
                      ? "#37a4c8" 
                      : theme === "light" ? "#E2E8F0" : "#374151"
                  }
                ]}
                onPress={() => setShowAvailableOnly(!showAvailableOnly)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="time-outline" 
                  size={14} 
                  color={showAvailableOnly ? "#FFFFFF" : "#37a4c8"} 
                />
                <Text style={[
                  styles.filterChipText,
                  showAvailableOnly && styles.filterChipTextActive,
                  { color: showAvailableOnly ? "#FFFFFF" : "#37a4c8" }
                ]}>
                  Available Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: theme === "light" ? "#F1F5F9" : "#374151",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                  }
                ]}
                onPress={() => {
                  // Show distance picker
                  Alert.alert(
                    "Filter by Distance",
                    "Select maximum distance",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "10 mi", onPress: () => setFilterDistance(10) },
                      { text: "25 mi", onPress: () => setFilterDistance(25) },
                      { text: "50 mi", onPress: () => setFilterDistance(50) },
                      { text: "100 mi", onPress: () => setFilterDistance(100) },
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={14} color="#37a4c8" />
                <Text style={[styles.filterChipText, { color: "#37a4c8" }]}> {filterDistance} mi </Text>
              </TouchableOpacity>
            </View>

            {/* Results Count */}
            <View style={styles.resultsCountContainer}>
              <Text style={[styles.resultsCountText, { 
                color: theme === "light" ? "#64748B" : "#94A3B8" 
              }]}> {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found </Text>
            </View>

            {/* Activity & User Cards */}
            {paginatedResults.map((result) => {
              if (result.kind === 'user') {
                return (
                  <View key={`user-${result.user.id}`}>
                    <UserCard user={result.user} />
                    <View style={styles.itemSeparator} />
                  </View>
                );
              } else if (result.kind === 'activity') {
                return (
                  <View key={`${result.item.type}-${result.item.id}`}>
                    <ActivityCard item={result.item} />
                    <View style={styles.itemSeparator} />
                  </View>
                );
              } else {
                return null;
              }
            })}

            {/* Load More Button */}
            {resultsToShow < searchResults.length && (
              <TouchableOpacity
                style={[
                  styles.loadMoreButtonPolished,
                  {
                    backgroundColor: theme === "light" ? "#37a4c8" : "#1a1a1a",
                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                    shadowColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                  }
                ]}
                activeOpacity={0.85}
                onPress={() => setResultsToShow(r => Math.min(r + 10, searchResults.length))}
              >
                <View style={styles.loadMoreButtonContentPolished}>
                  <Ionicons name="chevron-down" size={18} color={theme === "light" ? "#fff" : "#37a4c8"} style={{ marginRight: 6 }} />
                  <Text style={[
                    styles.loadMoreTextPolished,
                    { color: theme === "light" ? "#fff" : "#37a4c8" }
                  ]}>
                    Load More
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Loading Footer */}
            {isLoadingMore && (
              <View style={styles.loadingFooter}>
                <ModernLoadingIndicator color="#37a4c8" />
                <Text style={[styles.loadingFooterText, { 
                  color: theme === "light" ? "#64748B" : "#94A3B8" 
                }]}>
                  Loading more...
                </Text>
              </View>
            )}

            {/* Empty State */}
            {searchResults.length === 0 && renderEmptyState()}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 12,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  searchInput: {
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
  },
  searchClearButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    zIndex: 1,
  },
  categoryBarContainer: {
    marginBottom: 16,
  },
  categoryBar: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryChipActive: {
    backgroundColor: "#37a4c8",
    borderColor: "#37a4c8",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  tabBarContainer: {
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // No border or background, just layout
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabActive: {
    backgroundColor: '#37a4c8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  filterChipActive: {
    backgroundColor: '#37a4c8',
    borderColor: '#37a4c8',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  resultsCountContainer: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  resultsCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
  },
  itemSeparator: {
    height: 16,
  },
  activityCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    // Blue glow to match loadMoreButtonPolished
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#37a4c8',
  },
  activityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  distanceText: {
    color: '#37a4c8',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  activityCardContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    color: '#37a4c8',
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  categoryTagText: {
    color: '#37a4c8',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  joinButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#37a4c8',
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#37a4c8',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 24,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingFooterText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },

  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: '600',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 4,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginRight: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  gridContent: {
    paddingHorizontal: 16,
    marginTop: 0,
    marginBottom: 16
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  usersListContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    marginTop: 8
  },
  userCard: {
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    // Blue glow to match loadMoreButtonPolished
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  userCardContent: {
    padding: 16,
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    height: 48,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 0,
  },
  userMainInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAge: {
    fontSize: 13,
    fontWeight: '500',
  },
  userLocation: {
    fontSize: 13,
    fontWeight: '500',
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 6,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 11,
    fontWeight: "600",
  },
  userMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  moodIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  moodText: {
    fontSize: 12,
    fontWeight: "500",
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  toggleButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    backgroundColor: 'transparent',
  },
  toggleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  eventCard: {
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  eventCardContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  eventDetails: {
    padding: 16,
    height: '100%',
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  eventDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(55, 164, 200, 0.05)',
  },
  metaText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  metaIcon: {
    marginRight: 4,
  },
  attendeesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  attendeesText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  usersWrapper: {
    position: 'relative',
    minHeight: 200,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 80,
    width: '100%',
  },
  loadMoreContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginVertical: 16,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventsWrapper: {
    position: 'relative',
    minHeight: 200,
  },
  searchResultsCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#37a4c8',
  },
  searchDivider: {
    height: 1,
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    marginVertical: 16,
  },

  eventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  eventMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  eventDescriptionContainer: {
    marginBottom: 16,
  },
  eventMetaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  eventsListContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 24,
  },
  createEventButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  createEventText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#37a4c8",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicatorContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  loadingTextContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  loadingIndicator: {
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  loadMoreButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchResultsSummary: {
    padding: 16,
    marginBottom: 16,
  },
  searchResultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  availableUsersContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  availableUsersContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availableUsersTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  availableUsersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  availableUsersCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  pingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#37a4c8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  pingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    width: (width - 80) / 2, // 2 columns with padding and margin
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    marginHorizontal: 4,
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  categoryButtonContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  headerTextContainer: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  categoryHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  categoryHeaderSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  categoryContent: {
    paddingHorizontal: 16,
  },
  emptyStateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
    lineHeight: 20,
  },
  mapSection: {
    height: 320,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  contentSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  fixedHeader: {
    paddingBottom: 16,
  },

  switchToListButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  switchToListButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  availableNowTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#37a4c8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 2,
    elevation: 3,
  },
  availableNowTagText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  // --- Polished Load More Button Styles ---
  loadMoreButtonPolished: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    marginVertical: 20,
    alignSelf: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    minWidth: 160,
    minHeight: 48,
  },
  loadMoreButtonContentPolished: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadMoreTextPolished: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
}); 