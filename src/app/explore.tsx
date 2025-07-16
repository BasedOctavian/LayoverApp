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
import useAirports, { Airport } from "../hooks/useAirports";
import { useFilteredEvents } from "../hooks/useFilteredEvents";
import { useNearestAirports } from "../hooks/useNearestAirports";
import * as Haptics from "expo-haptics";
import LoadingElement from "../components/LoadingElement";
import useLoadingMessages from "../hooks/useLoadingMessages";
import LoadingScreen from "../components/LoadingScreen";
import useNotificationCount from "../hooks/useNotificationCount";
import UserAvatar from "../components/UserAvatar";
import ExploreMap from "../components/ExploreMap";

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface Location {
  latitude: number;
  longitude: number;
}

interface Event {
  id: string;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  createdAt: Date;
  startTime: Date | null;
  organizer: string | null;
  organizerName: string;
  attendees: string[];
  airportCode: string;
  category: string;
  private: boolean;
  eventUID: string;
  eventImage: string | null;
  updatedAt: Date;
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
  airportCode: string;
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
}

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to check if user is currently available based on schedule
const isUserCurrentlyAvailable = (availabilitySchedule: any): boolean => {
  if (!availabilitySchedule) return false;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const todaySchedule = availabilitySchedule[currentDay];
  if (!todaySchedule) return false;
  
  const { start, end } = todaySchedule;
  
  // Check for invalid or zero times
  if (!start || !end || start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
    return false;
  }
  
  // Check if start and end are the same (no availability window)
  if (start === end) return false;
  
  // Normalize time formats to ensure consistent comparison
  const normalizeTime = (timeStr: string): string => {
    // Handle both "H:MM" and "HH:MM" formats
    const [hours, minutes] = timeStr.split(':').map(Number);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };
  
  const normalizedStart = normalizeTime(start);
  const normalizedEnd = normalizeTime(end);
  const normalizedCurrent = normalizeTime(currentTime);
  
  // Handle cases where availability spans midnight (e.g., 22:00 to 02:00)
  if (normalizedStart > normalizedEnd) {
    // Availability spans midnight, so check if current time is after start OR before end
    return normalizedCurrent >= normalizedStart || normalizedCurrent <= normalizedEnd;
  } else {
    // Normal case: availability within same day
    return normalizedCurrent >= normalizedStart && normalizedCurrent <= normalizedEnd;
  }
};

const CountdownTimer = ({ startTime }: { startTime: Date | null }) => {
  const { theme } = React.useContext(ThemeContext);

  // Memoize the TBD state to prevent re-renders
  const tbdState = useMemo(() => (
    <View style={[styles.metaItem, { 
      backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
      borderColor: "#37a4c8"
    }]}>
      <MaterialIcons name="schedule" size={16} color="#37a4c8" style={styles.metaIcon} />
      <Text style={[styles.metaText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
        TBD
      </Text>
    </View>
  ), [theme]);

  // If no start time, return memoized TBD state
  if (!startTime) {
    return tbdState;
  }

  const now = new Date();
  const diff = startTime.getTime() - now.getTime();
  let timeDisplay = '';

  if (diff <= 0) {
    timeDisplay = 'Now';
  } else {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      timeDisplay = `${days}d ${hours}h`;
    } else if (hours > 0) {
      timeDisplay = `${hours}h ${minutes}m`;
    } else {
      timeDisplay = `${minutes}m`;
    }
  }

  return (
    <View style={[styles.metaItem, { 
      backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
      borderColor: "#37a4c8"
    }]}>
      <MaterialIcons name="schedule" size={16} color="#37a4c8" style={styles.metaIcon} />
      <Text style={[styles.metaText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
        {timeDisplay}
      </Text>
    </View>
  );
};

const ModernLoadingIndicator = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    ]);

    Animated.loop(pulseAnimation).start();
  }, []);

  return (
    <View style={styles.loadingIndicatorContainer}>
      <Animated.View
        style={[
          styles.loadingCircle,
          {
            backgroundColor: color,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.7],
            }),
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
    </View>
  );
};

export default function Explore() {
  const router = useRouter();
  const { getUser, getUsers } = useUsers();
  const { getEvents } = useEvents();
  const { getAirports } = useAirports();
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
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const [showAirportList, setShowAirportList] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleAirportCount, setVisibleAirportCount] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleEventsCount, setVisibleEventsCount] = useState(3);
  const [visibleUsersCount, setVisibleUsersCount] = useState(3);
  const [userConnectionStatus, setUserConnectionStatus] = useState<{[key: string]: 'connected' | 'pending' | 'none'}>({});
  const [isCheckingConnections, setIsCheckingConnections] = useState(false);
  const [availableUsersCount, setAvailableUsersCount] = useState(0);
  
  // Animation values
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const additionalEventsAnim = useRef(new Animated.Value(0)).current;
  const additionalUsersAnim = useRef(new Animated.Value(0)).current;
  const buttonPositionAnim = useRef(new Animated.Value(0)).current;
  const usersButtonPositionAnim = useRef(new Animated.Value(0)).current;
  const eventListAnim = useRef(new Animated.Value(1)).current;
  const airportListAnim = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const loadingStartTime = useRef<number | null>(null);

  const AIRPORTS_PER_PAGE = 10;

  // Get nearest airports when location and airports are available
  const nearestAirports = useNearestAirports(
    currentLocation ? { lat: currentLocation.latitude, long: currentLocation.longitude } : null,
    allAirports
  );

  // Set initial airport when nearest airports are calculated
  useEffect(() => {
    if (!selectedAirport && nearestAirports.closest) {
      setSelectedAirport(nearestAirports.closest);
    }
  }, [nearestAirports.closest]);

  // Fetch current location, events, and airports
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

        // Fetch airports
        const fetchedAirports = await getAirports();
        if (fetchedAirports) {
          setAllAirports(fetchedAirports);
        }

        // Fetch events and organizer names
        const fetchedEvents = await getEvents();
        if (fetchedEvents && Array.isArray(fetchedEvents)) {
          const eventsWithOrganizerNames = await Promise.all(
            fetchedEvents.map(async (event: any) => {
              try {
                const organizer = event.organizer ? await getUser(event.organizer) : null;
                return {
                  id: event.id || '',
                  name: event.name || '',
                  description: event.description || '',
                  latitude: event.latitude || '0',
                  longitude: event.longitude || '0',
                  createdAt: event.createdAt?.toDate() || new Date(),
                  startTime: event.startTime ? new Date(event.startTime) : null,
                  organizer: event.organizer || null,
                  organizerName: organizer && "name" in organizer ? String(organizer.name) : "Auto Generated",
                  attendees: Array.isArray(event.attendees) ? event.attendees : [],
                  airportCode: event.airportCode || '',
                  category: event.category || '',
                  private: event.private || false,
                  eventUID: event.eventUID || '',
                  eventImage: event.eventImage || null,
                  updatedAt: event.updatedAt?.toDate() || new Date(),
                } as Event;
              } catch (error) {
                console.error("Error processing event:", error);
                return null;
              }
            })
          );
          const validEvents = eventsWithOrganizerNames.filter((event): event is Event => event !== null);
          setEvents(validEvents);
        }

        // Fetch pings
        const fetchedPings = await getPings();
        if (fetchedPings && Array.isArray(fetchedPings)) {
          setPings(fetchedPings);
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

  // Fetch users when airport changes
  useEffect(() => {
    const fetchUsers = async () => {
      if (selectedAirport) {
        const allUsers = await getUsers();
        const filteredUsers = allUsers
          .filter((userDoc: any) => 
            userDoc.airportCode === selectedAirport.airportCode && 
            userDoc.id !== user?.uid // Filter out the authenticated user using document ID
          )
          .map((userDoc: any) => ({
            id: userDoc.id,
            name: userDoc.name || 'Anonymous',
            age: userDoc.age || 0,
            airportCode: userDoc.airportCode || '',
            bio: userDoc.bio || '',
            profilePicture: userDoc.profilePicture || 'https://via.placeholder.com/150',
            interests: userDoc.interests || [],
            moodStatus: userDoc.moodStatus || 'neutral',
            languages: userDoc.languages || [],
            goals: userDoc.goals || [],
            travelHistory: userDoc.travelHistory || [],
            availabilitySchedule: userDoc.availabilitySchedule || null,
            lastKnownCoordinates: userDoc.lastKnownCoordinates || null
          }))
          .sort((a, b) => {
            // Sort users with profile pictures first
            const aHasProfilePic = a.profilePicture && a.profilePicture !== 'https://via.placeholder.com/150';
            const bHasProfilePic = b.profilePicture && b.profilePicture !== 'https://via.placeholder.com/150';
            
            if (aHasProfilePic && !bHasProfilePic) return -1;
            if (!aHasProfilePic && bHasProfilePic) return 1;
            return 0;
          });
        setUsers(filteredUsers);
        
        // Calculate available users count (within 20 miles and currently available)
        const availableCount = filteredUsers.filter(user => {
          // Check if user is currently available
          const isAvailable = isUserCurrentlyAvailable(user.availabilitySchedule);
          if (!isAvailable) return false;
          
          // Check if user has coordinates and is within 20 miles
          if (!user.lastKnownCoordinates || !currentLocation) return false;
          
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            user.lastKnownCoordinates.latitude,
            user.lastKnownCoordinates.longitude
          );
          
          // Convert meters to miles (1 mile = 1609.34 meters)
          const distanceInMiles = distance / 1609.34;
          
          return distanceInMiles <= 20;
        }).length;
        setAvailableUsersCount(availableCount);
        
        // Check connection status for all users
        if (user?.uid) {
          checkConnectionStatusForUsers(filteredUsers, user.uid);
        }
      }
    };
    fetchUsers();
  }, [selectedAirport?.airportCode, user?.uid]);

  // Function to check connection status for multiple users
  const checkConnectionStatusForUsers = async (usersList: User[], currentUserId: string) => {
    if (!currentUserId || usersList.length === 0) return;
    
    setIsCheckingConnections(true);
    const connectionStatusMap: {[key: string]: 'connected' | 'pending' | 'none'} = {};
    
    // Check connection status for each user
    for (const userItem of usersList) {
      try {
        const connection = await checkConnection(currentUserId, userItem.id);
        if (connection) {
          connectionStatusMap[userItem.id] = connection.status === 'active' ? 'connected' : 'pending';
        } else {
          connectionStatusMap[userItem.id] = 'none';
        }
      } catch (error) {
        console.error(`Error checking connection with user ${userItem.id}:`, error);
        connectionStatusMap[userItem.id] = 'none';
      }
    }
    
    setUserConnectionStatus(prevStatus => ({
      ...prevStatus,
      ...connectionStatusMap
    }));
    setIsCheckingConnections(false);
  };

  // Filter events based on selected airport
  const { filteredRegularEvents } = useFilteredEvents(selectedAirport, events, []);

  // Sort events by distance
  const sortedEvents = useMemo(() => {
    if (!currentLocation || !Array.isArray(filteredRegularEvents) || filteredRegularEvents.length === 0) return [];
    return filteredRegularEvents
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
        const userIsAttendingA = a.attendees?.includes(user?.uid);
        const userIsAttendingB = b.attendees?.includes(user?.uid);
        if (userIsAttendingA && !userIsAttendingB) return -1;
        if (!userIsAttendingA && userIsAttendingB) return 1;
        
        // Then sort by whether user is organizer
        const userIsOrganizerA = a.organizer === user?.uid;
        const userIsOrganizerB = b.organizer === user?.uid;
        if (userIsOrganizerA && !userIsOrganizerB) return -1;
        if (!userIsOrganizerA && userIsOrganizerB) return 1;
        
        // Then sort by start time (events without start time go to the end)
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });
  }, [filteredRegularEvents, currentLocation, user?.uid]);

  // Filter events and users based on search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return sortedEvents;
    
    const query = searchQuery.toLowerCase().trim();
    return sortedEvents.filter(event => 
      (event.name?.toLowerCase() || '').includes(query) ||
      (event.description?.toLowerCase() || '').includes(query) ||
      (event.organizerName?.toLowerCase() || '').includes(query) ||
      (event.airportCode?.toLowerCase() || '').includes(query) ||
      (event.category?.toLowerCase() || '').includes(query)
    );
  }, [sortedEvents, searchQuery]);

  // Filter pings based on search query, distance, and participant availability
  const filteredPings = useMemo(() => {
    let filtered = pings;
    
    // Filter by participant availability first
    filtered = pings.filter(ping => {
      // Extract max participants number (e.g., "4 people" -> 4)
      const maxParticipantsMatch = ping.maxParticipants.match(/(\d+)/);
      const maxParticipants = maxParticipantsMatch ? parseInt(maxParticipantsMatch[1]) : 0;
      const currentParticipants = ping.participantCount || 0;
      
      const needsMorePeople = currentParticipants < maxParticipants;
      console.log(`Ping ${ping.title}: ${currentParticipants}/${maxParticipants} people = ${needsMorePeople ? 'NEEDS MORE' : 'FULL'}`);
      
      return needsMorePeople;
    });

    // Filter by time (remove expired pings)
    filtered = filtered.filter(ping => {
      const now = new Date();
      const createdAt = ping.createdAt?.toDate ? ping.createdAt.toDate() : new Date(ping.createdAt);
      
      // Calculate end time based on duration
      let endTime = new Date(createdAt);
      const duration = ping.duration;
      
      if (duration === '30 minutes') {
        endTime.setMinutes(endTime.getMinutes() + 30);
      } else if (duration === '1 hour') {
        endTime.setHours(endTime.getHours() + 1);
      } else if (duration === '2 hours') {
        endTime.setHours(endTime.getHours() + 2);
      } else if (duration === '3 hours') {
        endTime.setHours(endTime.getHours() + 3);
      } else if (duration === '4 hours') {
        endTime.setHours(endTime.getHours() + 4);
      } else if (duration === 'All day') {
        // For "All day", consider it expired after 24 hours
        endTime.setHours(endTime.getHours() + 24);
      } else {
        // Default to 1 hour if duration is unknown
        endTime.setHours(endTime.getHours() + 1);
      }
      
      const isExpired = now > endTime;
      console.log(`Ping ${ping.title}: ${duration} (${createdAt.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}) = ${isExpired ? 'EXPIRED' : 'ACTIVE'}`);
      
      return !isExpired;
    });
    
    // Filter by distance
    if (currentLocation) {
      filtered = filtered.filter(ping => {
        if (!ping.coordinates) {
          console.log(`Ping ${ping.title}: No coordinates, filtered out`);
          return false;
        }
        
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          ping.coordinates.latitude,
          ping.coordinates.longitude
        );
        
        // Convert meters to miles
        const distanceInMiles = distance / 1609.34;
        
        // Extract radius value (e.g., "15 miles" -> 15)
        const radiusValue = parseInt(ping.visibilityRadius.split(' ')[0]);
        
        const isWithinRadius = distanceInMiles <= radiusValue;
        console.log(`Ping ${ping.title}: ${distanceInMiles.toFixed(1)}mi/${radiusValue}mi = ${isWithinRadius ? 'SHOW' : 'HIDE'}`);
        
        return isWithinRadius;
      });
    }
    
    // Then filter by search query if needed
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(ping => 
        (ping.title?.toLowerCase() || '').includes(query) ||
        (ping.description?.toLowerCase() || '').includes(query) ||
        (ping.creatorName?.toLowerCase() || '').includes(query) ||
        (ping.location?.toLowerCase() || '').includes(query) ||
        (ping.category?.toLowerCase() || '').includes(query) ||
        (ping.template?.toLowerCase() || '').includes(query)
      );
    }
    
    return filtered;
  }, [pings, searchQuery, currentLocation]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => 
      (user.name?.toLowerCase() || '').includes(query) ||
      (user.bio?.toLowerCase() || '').includes(query) ||
      (user.airportCode?.toLowerCase() || '').includes(query) ||
      (user.interests || []).some(interest => 
        (interest?.toLowerCase() || '').includes(query)
      ) ||
      (user.languages || []).some(language => 
        (language?.toLowerCase() || '').includes(query)
      )
    );
  }, [users, searchQuery]);

  // Check if we're actively searching
  const isActivelySearching = searchQuery.trim().length > 0;
  const hasSearchResults = filteredEvents.length > 0 || filteredPings.length > 0 || filteredUsers.length > 0;

  // Handle search focus
  const handleSearchFocus = useCallback(() => {
    setIsSearching(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Handle search blur
  const handleSearchBlur = useCallback(() => {
    if (!searchQuery.trim()) {
      // Add a small delay before hiding the search UI
      setTimeout(() => {
      setIsSearching(false);
      }, 100);
    }
  }, [searchQuery]);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    setIsSearching(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Animation handlers
  const handleAirportSelectorPress = () => {
    // Animate out events list
    Animated.timing(eventListAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setShowAirportList(true);
      // Animate in airport list
      Animated.timing(airportListAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    });
  };

  const handleAirportSelect = (airport: Airport) => {
    // Animate out airport list
    Animated.timing(airportListAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setSelectedAirport(airport);
      setShowAirportList(false);
      // Animate in events list
      Animated.timing(eventListAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    });
  };

  const handleLoadMore = () => {
    setShowAllEvents(true);
    Animated.parallel([
      Animated.spring(buttonPositionAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.spring(buttonPositionAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      })
    ]).start();
  };

  const handleShowLess = () => {
    Animated.parallel([
      Animated.spring(buttonPositionAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.spring(buttonPositionAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      })
    ]).start(() => {
      setShowAllEvents(false);
    });
  };

  const handleToggleEvents = () => {
    if (!expandedEvents) {
      // Fade in additional events
      Animated.timing(additionalEventsAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
      
      // Move button down
      Animated.spring(buttonPositionAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // Fade out additional events
      Animated.timing(additionalEventsAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start();
      
      // Move button up
      Animated.spring(buttonPositionAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
    setExpandedEvents(!expandedEvents);
  };

  const handleToggleUsers = () => {
    if (!expandedUsers) {
      // Fade in additional users
      Animated.timing(additionalUsersAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
      
      // Move button down
      Animated.spring(usersButtonPositionAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      // Fade out additional users
      Animated.timing(additionalUsersAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start();
      
      // Move button up
      Animated.spring(usersButtonPositionAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }
    setExpandedUsers(!expandedUsers);
  };

  const remainingEvents = sortedEvents.length - 4;
  const remainingUsers = users.length - 3;

  // Add effect for seamless animation when loading completes
  useEffect(() => {
    if (!isLoading && initialLoadComplete) {
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }
  }, [isLoading, initialLoadComplete]);

  // Add the filtered airports logic
  const filteredAirports = useMemo(() => {
    if (!allAirports) return [];
    
    // First filter the airports based on search query
    const filtered = allAirports.filter((airport: Airport) => 
      airport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      airport?.airportCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      airport?.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // If we have current location, calculate distances and sort
    if (currentLocation) {
      const withDistances = filtered.map(airport => ({
        ...airport,
        distance: calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
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

    // If no location, just put selected airport at top
    return filtered.sort((a, b) => {
      if (selectedAirport && a.airportCode === selectedAirport.airportCode) return -1;
      if (selectedAirport && b.airportCode === selectedAirport.airportCode) return 1;
      return 0;
    });
  }, [allAirports, searchQuery, currentLocation, selectedAirport]);

  const visibleAirports = filteredAirports.slice(0, visibleAirportCount);

  const handleLoadMoreAirports = () => {
    setVisibleAirportCount(prev => prev + AIRPORTS_PER_PAGE);
  };

  const handleLoadMoreEvents = () => {
    setVisibleEventsCount(prev => prev + 3);
  };

  const handleLoadMoreUsers = () => {
    setVisibleUsersCount(prev => prev + 3);
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

  // Ping card component
  const PingCard = ({ item, index }: { item: Ping; index: number }) => {
    const { theme } = React.useContext(ThemeContext);

    if (!item) return null;

    return (
      <View style={[styles.eventCard, { 
        backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
        borderColor: theme === "light" ? "#E2E8F0" : "#374151",
        shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
      }]}>
        <View style={styles.eventCardContent}>
          <View style={styles.eventHeader}>
            <View style={styles.eventMainInfo}>
              <View style={styles.pingBadge}>
                <Ionicons name="flash" size={12} color="#FFFFFF" />
                <Text style={styles.pingBadgeText}>PING</Text>
              </View>
              <Text style={[styles.eventTitle, { 
                color: theme === "light" ? "#0F172A" : "#e4fbfe" 
              }]} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.organizerContainer}>
                <Ionicons name="person" size={14} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                <Text style={[styles.organizerText, { 
                  color: theme === "light" ? "#64748B" : "#94A3B8" 
                }]}>
                  {item.creatorName}
                </Text>
              </View>
            </View>
            <View style={styles.eventStatus}>
              <View style={[styles.statusBadge, { backgroundColor: '#37a4c8' }]}>
                <Text style={styles.statusText}>
                  {item.participantCount}/{item.maxParticipants}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.eventDescriptionContainer}>
            <Text style={[styles.eventDescription, { 
              color: theme === "light" ? "#64748B" : "#94A3B8" 
            }]} numberOfLines={2}>
              {item.description}
            </Text>
          </View>

          <View style={styles.eventMetaContainer}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={16} color="#37a4c8" />
              <Text style={[styles.metaText, { color: "#37a4c8" }]}>
                {item.location}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color={theme === "light" ? "#64748B" : "#94A3B8"} />
              <Text style={[styles.metaText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                {item.duration}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Regular card component without animations
  const EventCard = ({ item, index }: { item: Event; index: number }) => {
    const { theme } = React.useContext(ThemeContext);

    if (!item || !currentLocation) return null;
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      parseFloat(item.latitude),
      parseFloat(item.longitude)
    );
    
    const formattedDistance = distance > 1000
      ? `${(distance / 1000).toFixed(1)}km away`
      : `${Math.round(distance)}m away`;

    return (
      <View style={[styles.eventCard, { 
        backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
        borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
        shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
      }]}>
          <View style={styles.eventDetails}>
          <Text 
            style={[styles.eventTitle, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe" 
            }]} 
            numberOfLines={1} 
            ellipsizeMode="tail"
          >
              {item.name}
            </Text>
            <View style={styles.organizerContainer}>
            <FontAwesome name="user-circle-o" size={14} color={theme === "light" ? "#64748B" : "#64748B"} />
            <Text style={[styles.organizerText, { 
              color: theme === "light" ? "#0F172A" : "#37a4c8" 
            }]}>
                {item.organizerName}
              </Text>
            </View>
          <Text style={[styles.eventDescription, { 
            color: theme === "light" ? "#475569" : "#37a4c8" 
          }]} 
            numberOfLines={2}
            ellipsizeMode="tail"
          >
              {item.description}
            </Text>
            {/* Airport section */}
            <View style={styles.attendeesContainer}>
              <MaterialIcons name="airplay" size={16} color={theme === "light" ? "#0F172A" : "#37a4c8"} />
              <Text style={[styles.attendeesText, { 
                color: theme === "light" ? "#0F172A" : "#e4fbfe" 
              }]}>
                {item.airportCode} Airport
              </Text>
            </View>
            {/* Duplicate people attending section */}
            <View style={styles.attendeesContainer}>
            <MaterialIcons name="group" size={16} color={theme === "light" ? "#0F172A" : "#37a4c8"} />
            <Text style={[styles.attendeesText, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe" 
            }]}>
                {item.attendees?.length || 0} people attending
              </Text>
            </View>
            {/* Bottom section - countdown if startTime exists, otherwise show no start time */}
            {item.startTime ? (
              <View style={styles.attendeesContainer}>
                <MaterialIcons name="schedule" size={16} color={theme === "light" ? "#0F172A" : "#37a4c8"} />
                <Text style={[styles.attendeesText, { 
                  color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                }]}>
                  {(() => {
                    const now = new Date();
                    const diff = item.startTime.getTime() - now.getTime();
                    if (diff <= 0) return 'Starting now';
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
                    return `Starts in ${minutes}m`;
                  })()}
                </Text>
              </View>
            ) : (
              <View style={styles.attendeesContainer}>
                <MaterialIcons name="schedule" size={16} color={theme === "light" ? "#0F172A" : "#37a4c8"} />
                <Text style={[styles.attendeesText, { 
                  color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                }]}>
                  No start time
                </Text>
              </View>
            )}
          </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          onProfilePress={() => router.push("profile")} 
          notificationCount={notificationCount} 
        />
        <Animated.View 
          style={{ 
            flex: 1,
            opacity: contentBounceAnim,
            transform: [
              { scale: contentScaleAnim },
              {
                translateY: contentBounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }
            ]
          }}
        >
          <View style={styles.container}>
            {showAirportList ? (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={visibleAirports}
                  keyExtractor={(item: Airport) => item.airportCode}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <View style={styles.headerSection}>
                      <Text style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                        Select Airport
                      </Text>
                      <Text style={[styles.headerSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Choose your location to explore events and travelers
                      </Text>
                      <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} style={styles.searchIcon} />
                        <TextInput
                          style={[
                            styles.searchInput,
                            {
                              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                              color: theme === "light" ? "#0F172A" : "#e4fbfe",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                            }
                          ]}
                          placeholder="Search airports..."
                          placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                      </View>
                    </View>
                  }
                  renderItem={({ item: airport }: { item: Airport }) => (
                    <TouchableOpacity
                      style={[styles.airportCard, {
                        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                      }]}
                      onPress={() => handleAirportSelect(airport)}
                    >
                      <View style={styles.airportCardContent}>
                        <Ionicons name="airplane" size={24} color="#37a4c8" />
                        <View style={styles.airportInfo}>
                          <Text style={[styles.airportName, { 
                            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                          }]}>
                            {airport.name}
                          </Text>
                          <Text style={[styles.airportCode, { color: "#37a4c8" }]}>{airport.airportCode}</Text>
                          <Text style={[styles.airportLocation, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            {airport.location || 'Location not available'}
                          </Text>
                          {airport.distance !== undefined && (
                            <Text style={[styles.airportDistance, { 
                              color: theme === "light" ? "#64748B" : "#94A3B8" 
                            }]}>
                              {(airport.distance * 0.621371).toFixed(1)} mi away
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#37a4c8" />
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.stateContainer}>
                      <Ionicons name="airplane" size={48} color={theme === "light" ? "#64748B" : "#94A3B8"} style={styles.emptyIcon} />
                      <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        No airports found
                      </Text>
                    </View>
                  }
                  ListFooterComponent={
                    visibleAirports.length < filteredAirports.length ? (
                      <TouchableOpacity
                        style={[styles.loadMoreButton, {
                          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                        }]}
                        onPress={handleLoadMoreAirports}
                      >
                        <Text style={[styles.loadMoreText, { color: "#37a4c8" }]}>
                          Load More Airports
                        </Text>
                      </TouchableOpacity>
                    ) : null
                  }
                />
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <ScrollView 
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => {
                        // Add refresh logic here if needed
                      }}
                      tintColor={theme === "light" ? "#37a4c8" : "#4db8d4"}
                    />
                  }
                >
                  <View style={styles.headerSection}>
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} style={styles.searchIcon} />
                      <TextInput
                        ref={searchInputRef}
                        style={[
                          styles.searchInput,
                          {
                            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                            color: theme === "light" ? "#0F172A" : "#e4fbfe",
                            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                          }
                        ]}
                        placeholder="Search users or activities..."
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
                  </View>

                  {/* Map Component */}
                  {!isActivelySearching && (
                    <ExploreMap
                      events={filteredEvents}
                      airports={allAirports}
                      selectedAirport={selectedAirport}
                      onAirportSelect={handleAirportSelect}
                      onEventPress={(event) => router.push("/event/" + event.id)}
                      currentUserId={user?.uid}
                    />
                  )}

                  {/* Available Users Count */}
                  {!isActivelySearching && selectedAirport && (
                    <View style={[styles.availableUsersContainer, {
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                    }]}>
                      <View style={styles.availableUsersContent}>
                        <Ionicons name="people" size={20} color="#37a4c8" />
                        <View style={styles.availableUsersTextContainer}>
                          <Text style={[styles.availableUsersTitle, { 
                            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                          }]}>
                            Available Now
                          </Text>
                          <Text style={[styles.availableUsersCount, { color: "#37a4c8" }]}>
                            {availableUsersCount} {availableUsersCount === 1 ? 'user' : 'users'} nearby
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Search Results Summary */}
                  {isActivelySearching && (
                    <View style={styles.searchResultsSummary}>
                      <Text style={[styles.searchResultsText, { 
                        color: theme === "light" ? "#64748B" : "#94A3B8" 
                      }]}>
                        Found {filteredEvents.length + filteredUsers.length} results for "{searchQuery}"
                      </Text>
                    </View>
                  )}

                  {/* Events Section */}
                  <View style={styles.sectionHeader}>
                    <View style={styles.headerLeft}>
                      <Text style={[styles.headerText, { 
                        color: theme === "light" ? "#0F172A" : "#e4fbfe"
                      }]}>
                        {isActivelySearching ? "Search Results" : "What's Happening?"}
                      </Text>
                      <Text style={[styles.sectionSubtitle, { 
                        color: theme === "light" ? "#475569" : "#94A3B8" 
                      }]}>
                        {isActivelySearching 
                          ? `${filteredEvents.length + filteredPings.length} activities found`
                          : `${filteredEvents.length + filteredPings.length} activities available`
                        }
                      </Text>
                    </View>
                    {!isActivelySearching && (
                      <TouchableOpacity
                        style={[styles.headerButton, { 
                          backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                        }]}
                        onPress={() => router.push("/eventCreation")}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="add" size={24} color={theme === "light" ? "#0F172A" : "#37a4c8"} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.gridContent}>
                    {(filteredEvents.length > 0 || filteredPings.length > 0) ? (
                      <View>
                        {/* Render pings first (with priority) */}
                        {filteredPings.slice(0, visibleEventsCount).map((ping, index) => (
                          <TouchableOpacity
                            key={`ping-${ping.id}`}
                            onPress={() => router.push(`/ping/${ping.id}`)}
                            activeOpacity={0.7}
                          >
                            <PingCard item={ping} index={index} />
                          </TouchableOpacity>
                        ))}
                        
                        {/* Then render events */}
                        {filteredEvents.slice(0, visibleEventsCount).map((item, index) => (
                          <TouchableOpacity
                            key={`event-${item.id}`}
                            style={[styles.eventCard, { 
                              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                            }]}
                            onPress={() => router.push("/event/" + item.id)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.eventCardContent}>
                              <View style={styles.eventHeader}>
                                <View style={styles.eventMainInfo}>
                                  <Text style={[styles.eventTitle, { 
                                    color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                                  }]} numberOfLines={1}>
                                    {item.name}
                                  </Text>
                                  <View style={styles.organizerContainer}>
                                    <Ionicons name="person" size={14} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                                    <Text style={[styles.organizerText, { 
                                      color: theme === "light" ? "#64748B" : "#94A3B8" 
                                    }]}>
                                      {item.organizerName}
                                    </Text>
                                  </View>
                                </View>
                                <View style={styles.eventStatus}>
                                  {item.startTime ? (
                                    <View style={[styles.statusBadge, { backgroundColor: '#37a4c8' }]}>
                                      <Text style={styles.statusText}>
                                        {(() => {
                                          const now = new Date();
                                          const diff = item.startTime.getTime() - now.getTime();
                                          if (diff <= 0) return 'Now';
                                          const hours = Math.floor(diff / (1000 * 60 * 60));
                                          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                          if (hours > 0) return `${hours}h`;
                                          return `${minutes}m`;
                                        })()}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View style={[styles.statusBadge, { backgroundColor: '#37a4c8' }]}>
                                      <Text style={styles.statusText}>TBD</Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                              
                              <View style={styles.eventDescriptionContainer}>
                                <Text style={[styles.eventDescription, { 
                                  color: theme === "light" ? "#64748B" : "#94A3B8" 
                                }]} numberOfLines={2}>
                                  {item.description}
                                </Text>
                              </View>

                              <View style={styles.eventMetaContainer}>
                                <View style={styles.metaItem}>
                                  <Ionicons name="airplane" size={16} color="#37a4c8" />
                                  <Text style={[styles.metaText, { color: "#37a4c8" }]}>
                                    {item.airportCode}
                                  </Text>
                                </View>
                                <View style={styles.metaItem}>
                                  <Ionicons name="people" size={16} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                                  <Text style={[styles.metaText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                                    {item.attendees?.length || 0}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                        
                        {(filteredEvents.length + filteredPings.length) > visibleEventsCount && (
                          <TouchableOpacity
                            style={[styles.loadMoreButton, {
                              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                            }]}
                            onPress={handleLoadMoreEvents}
                            activeOpacity={0.7}
                          >
                            <View style={styles.loadMoreButtonContent}>
                              <Text style={[styles.loadMoreText, { color: "#37a4c8" }]}>
                                Load More
                              </Text>
                              <MaterialIcons name="expand-more" size={20} color="#37a4c8" />
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View style={[styles.stateContainer, { display: isSearching ? 'none' : 'flex' }]}>
                        <Ionicons 
                          name={isActivelySearching ? "search" : "calendar"} 
                          size={48} 
                          color={theme === "light" ? "#64748B" : "#94A3B8"} 
                          style={styles.emptyIcon} 
                        />
                        <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            {isActivelySearching 
                              ? "No events match your search"
                              : "No events found at this airport"
                            }
                          </Text>
                          {!isActivelySearching && !isSearching && (
                        <TouchableOpacity
                          style={[styles.createEventButton, {
                            backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                          }]}
                          onPress={() => router.push("/eventCreation")}
                        >
                          <Text style={[styles.createEventText, { color: "#37a4c8" }]}>Create an Event</Text>
                        </TouchableOpacity>
                          )}
                      </View>
                    )}
                  </View>

                  {/* Users Section */}
                  <View style={styles.sectionHeader}>
                    <View style={styles.headerLeft}>
                      <Text style={[styles.headerText, { 
                        color: theme === "light" ? "#0F172A" : "#e4fbfe"
                      }]}>
                        {isActivelySearching ? "Search Results" : "Nearby Users"}
                      </Text>
                      <Text style={[styles.sectionSubtitle, { 
                        color: theme === "light" ? "#475569" : "#94A3B8" 
                      }]}>
                        {isActivelySearching 
                          ? `${filteredUsers.length} travelers found`
                          : `${filteredUsers.length} travelers available`
                        }
                      </Text>
                    </View>
                  </View>

                  <View style={styles.gridContent}>
                    {filteredUsers.length > 0 ? (
                      <View>
                        {filteredUsers.slice(0, visibleUsersCount).map((user, index) => (
                          <TouchableOpacity
                            key={`user-${user.id}`}
                            style={[styles.userCard, { 
                              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                            }]}
                            onPress={() => router.push(`/profile/${user.id}`)}
                          >
                            <View style={styles.userCardContent}>
                              <View style={styles.userHeader}>
                                <UserAvatar
                                  user={user}
                                  size={48}
                                  style={styles.profileImage}
                                />
                                <View style={styles.userMainInfo}>
                                  <View style={styles.userNameRow}>
                                    <Text style={[styles.userName, { 
                                      color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                                    }]}>
                                      {user.name}
                                    </Text>
                                    {/* Connection Status Badge */}
                                    {isCheckingConnections && !userConnectionStatus[user.id] ? (
                                      <View style={[
                                        styles.connectionBadge,
                                        {
                                          backgroundColor: theme === "light" ? '#F8FAFC' : '#1a1a1a',
                                          borderColor: theme === "light" ? '#E2E8F0' : '#374151'
                                        }
                                      ]}>
                                        <ActivityIndicator size={8} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                                        <Text style={[
                                          styles.connectionText,
                                          { color: theme === "light" ? "#64748B" : "#94A3B8" }
                                        ]}>
                                          Checking...
                                        </Text>
                                      </View>
                                    ) : userConnectionStatus[user.id] && (
                                      <View style={[
                                        styles.connectionBadge,
                                        {
                                          backgroundColor: userConnectionStatus[user.id] === 'connected' 
                                            ? '#10B981' 
                                            : userConnectionStatus[user.id] === 'pending'
                                            ? '#F59E0B'
                                            : theme === "light" ? '#F8FAFC' : '#1a1a1a',
                                          borderColor: userConnectionStatus[user.id] === 'connected'
                                            ? '#10B981'
                                            : userConnectionStatus[user.id] === 'pending'
                                            ? '#F59E0B'
                                            : theme === "light" ? '#E2E8F0' : '#374151'
                                        }
                                      ]}>
                                        <Ionicons 
                                          name={userConnectionStatus[user.id] === 'connected' 
                                            ? 'checkmark-circle' 
                                            : userConnectionStatus[user.id] === 'pending'
                                            ? 'time'
                                            : 'person-add'
                                          } 
                                          size={12} 
                                          color={userConnectionStatus[user.id] === 'none' 
                                            ? (theme === "light" ? "#64748B" : "#94A3B8")
                                            : '#FFFFFF'
                                          } 
                                        />
                                        <Text style={[
                                          styles.connectionText,
                                          {
                                            color: userConnectionStatus[user.id] === 'none' 
                                              ? (theme === "light" ? "#64748B" : "#94A3B8")
                                              : '#FFFFFF'
                                          }
                                        ]}>
                                          {userConnectionStatus[user.id] === 'connected' 
                                            ? 'Connected' 
                                            : userConnectionStatus[user.id] === 'pending'
                                            ? 'Pending'
                                            : 'Connect'
                                          }
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={styles.userDetails}>
                                    <Text style={[styles.userAge, { color: "#37a4c8" }]}>
                                      {user.age} years old
                                    </Text>
                                    <Text style={[styles.userLocation, { color: "#37a4c8" }]}>
                                      • {user.airportCode}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              
                              {user.interests && user.interests.length > 0 && (
                                <View style={styles.userInterestsContainer}>
                                  {user.interests.slice(0, 3).map((interest: string, index: number) => (
                                    <View 
                                      key={index} 
                                      style={[styles.interestTag, {
                                        backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                                        borderColor: "#37a4c8"
                                      }]}
                                    >
                                      <Text style={[styles.interestText, { color: "#37a4c8" }]}>
                                        {interest}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              <View style={styles.userMoodContainer}>
                                <View style={[styles.moodIndicator, { backgroundColor: "#10B981" }]} />
                                <Text style={[styles.moodText, { 
                                  color: theme === "light" ? "#64748B" : "#94A3B8" 
                                }]}>
                                  {user.moodStatus || "Available"}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                        
                        {filteredUsers.length > visibleUsersCount && (
                          <TouchableOpacity
                            style={[styles.loadMoreButton, {
                              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
                            }]}
                            onPress={handleLoadMoreUsers}
                            activeOpacity={0.7}
                          >
                            <View style={styles.loadMoreButtonContent}>
                              <Text style={[styles.loadMoreText, { color: "#37a4c8" }]}>
                                Load More
                              </Text>
                              <MaterialIcons name="expand-more" size={20} color="#37a4c8" />
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View style={styles.stateContainer}>
                        <Ionicons 
                          name={isActivelySearching ? "search" : "people"} 
                          size={48} 
                          color={theme === "light" ? "#64748B" : "#94A3B8"} 
                          style={styles.emptyIcon} 
                        />
                        <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          {isActivelySearching 
                            ? "No travelers match your search"
                            : "No travelers found at this airport"
                          }
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </Animated.View>
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
    marginBottom: 16,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
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
  organizerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  organizerText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
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
  },
  metaText: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: "500",
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
  airportSelector: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  airportSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  airportSelectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  airportCard: {
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  airportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  airportInfo: {
    flex: 1,
    marginLeft: 16,
  },
  airportName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  airportCode: {
    fontSize: 15,
    color: "#37a4c8",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  airportLocation: {
    fontSize: 14,
    color: "#64748B",
    letterSpacing: 0.2,
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
  airportDistance: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  loadMoreButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchClearButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    zIndex: 1,
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
}); 