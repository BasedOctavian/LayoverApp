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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useEvents from "../hooks/useEvents";
import useUsers from "../hooks/useUsers";
import useAuth from "../hooks/auth";
import * as Location from "expo-location";
import TopBar from "../components/TopBar";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { ThemeContext } from "../context/ThemeContext";
import useAirports, { Airport } from "../hooks/useAirports";
import { useFilteredEvents } from "../hooks/useFilteredEvents";
import { useNearestAirports } from "../hooks/useNearestAirports";
import * as Haptics from "expo-haptics";
import BottomNavBar from "../components/BottomNavBar";
import LoadingElement from "../components/LoadingElement";
import useLoadingMessages from "../hooks/useLoadingMessages";
import LoadingScreen from "../components/LoadingScreen";
import useNotificationCount from "../hooks/useNotificationCount";

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
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const { theme } = React.useContext(ThemeContext);
  const [showAirportList, setShowAirportList] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState(false);
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const additionalEventsAnim = useRef(new Animated.Value(0)).current;
  const additionalUsersAnim = useRef(new Animated.Value(0)).current;
  const buttonPositionAnim = useRef(new Animated.Value(0)).current;
  const usersButtonPositionAnim = useRef(new Animated.Value(0)).current;
  const [showAllEvents, setShowAllEvents] = useState(false);
  const loadMoreAnim = useRef(new Animated.Value(0)).current;
  const gridHeightAnim = useRef(new Animated.Value(0)).current;
  const eventsAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const newEventsAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerSlideAnim = useRef(new Animated.Value(20)).current;
  const listSlideAnim = useRef(new Animated.Value(30)).current;
  const eventListAnim = useRef(new Animated.Value(1)).current;
  const airportListAnim = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const eventsHeaderAnim = useRef(new Animated.Value(0)).current;
  const travelersHeaderAnim = useRef(new Animated.Value(0)).current;
  const loadingMessage = useLoadingMessages();
  const messageFadeAnim = useRef(new Animated.Value(1)).current;
  const [error, setError] = useState<string | null>(null);
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const [visibleAirportCount, setVisibleAirportCount] = useState(10);
  const AIRPORTS_PER_PAGE = 10;

  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

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
            travelHistory: userDoc.travelHistory || []
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
      }
    };
    fetchUsers();
  }, [selectedAirport?.airportCode, user?.uid]);

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
      (event.airportCode?.toLowerCase() || '').includes(query)
    );
  }, [sortedEvents, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => 
      (user.name?.toLowerCase() || '').includes(query) ||
      (user.bio?.toLowerCase() || '').includes(query) ||
      (user.airportCode?.toLowerCase() || '').includes(query) ||
      (user.interests || []).some(interest => 
        (interest?.toLowerCase() || '').includes(query)
      )
    );
  }, [users, searchQuery]);

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
      Animated.spring(loadMoreAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.spring(gridHeightAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 40,
        friction: 7,
      })
    ]).start();
  };

  const handleShowLess = () => {
    Animated.parallel([
      Animated.spring(loadMoreAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }),
      Animated.spring(gridHeightAnim, {
        toValue: 0,
        useNativeDriver: false,
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

  // Add this effect to handle the section headers animation
  useEffect(() => {
    const animations = Animated.parallel([
      Animated.timing(eventsHeaderAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      }),
      Animated.timing(travelersHeaderAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      })
    ]);

    animations.start();
    return () => animations.stop();
  }, []);

  // Add effect for message fade animation
  useEffect(() => {
    Animated.sequence([
      Animated.timing(messageFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(messageFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loadingMessage]);

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

  // Show loading screen during initial load
  if (isLoading || !initialLoadComplete) {
    return <LoadingScreen />;
  }

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
            <View style={styles.metaContainer}>
              <View style={[styles.metaItem, { 
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
              }]}>
              <MaterialIcons name="location-pin" size={16} color={theme === "light" ? "#0F172A" : "#37a4c8"} style={styles.metaIcon} />
              <Text style={[styles.metaText, { 
                color: theme === "light" ? "#0F172A" : "#e4fbfe" 
              }]}>
                  {item.airportCode}
                </Text>
              </View>
              <CountdownTimer startTime={item.startTime} />
            </View>
            <View style={styles.attendeesContainer}>
            <MaterialIcons name="group" size={16} color={theme === "light" ? "#0F172A" : "#37a4c8"} />
            <Text style={[styles.attendeesText, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe" 
            }]}>
                {item.attendees?.length || 0} people attending
              </Text>
            </View>
          </View>
      </View>
    );
  };

  return (
    <LinearGradient 
      colors={theme === "light" 
        ? ["#f8f9fa", "#ffffff", "#f8f9fa"] 
        : ["#000000", "#1a1a1a", "#000000"]} 
      locations={[0, 0.5, 1]}
      style={{ flex: 1 }}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
      <SafeAreaWrapper edges={["bottom"]}>
        <Animated.View 
          style={{ 
            flex: 1,
            opacity: contentBounceAnim,
            transform: [
              { scale: contentScaleAnim },
              {
                translateY: contentBounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }
            ]
          }}
        >
          <TopBar onProfilePress={() => router.push("profile")} notificationCount={notificationCount} />
          <View style={{ flex: 1 }}>
            {showAirportList ? (
              <View style={{ flex: 1 }}>
                <FlatList
                  data={visibleAirports}
                  keyExtractor={(item: Airport) => item.airportCode}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <View style={styles.headerSection}>
                      <View style={styles.headerTop}>
                        <Text 
                          style={[
                            styles.headerText, 
                            { color: theme === "light" ? "#000000" : "#e4fbfe" }
                          ]}
                        >
                          Select Airport
                        </Text>
                      </View>
                      <View style={[styles.searchContainer, {
                        backgroundColor: theme === "light" ? "#F8FAFC" : "#1a1a1a",
                        borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                        marginBottom: 16
                      }]}>
                        <Feather name="search" size={20} color={theme === "light" ? "#64748B" : "#37a4c8"} />
                        <TextInput
                          style={[styles.searchInput, {
                            color: theme === "light" ? "#1E293B" : "#e4fbfe"
                          }]}
                          placeholder="Search airports..."
                          placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          keyboardAppearance={theme === "light" ? "light" : "dark"}
                        />
                        {searchQuery ? (
                          <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Feather name="x" size={20} color={theme === "light" ? "#64748B" : "#37a4c8"} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  }
                  renderItem={({ item: airport }: { item: Airport }) => (
                    <TouchableOpacity
                      style={[styles.airportCard, {
                        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                        borderColor: "#37a4c8"
                      }]}
                      onPress={() => handleAirportSelect(airport)}
                    >
                      <View style={styles.airportCardContent}>
                        <Feather name="airplay" size={24} color="#37a4c8" />
                        <View style={styles.airportInfo}>
                          <Text style={[styles.airportName, { 
                            color: theme === "light" ? "#000000" : "#e4fbfe" 
                          }]}>
                            {airport.name}
                          </Text>
                          <Text style={styles.airportCode}>{airport.airportCode}</Text>
                          <Text style={styles.airportLocation}>{airport.location || 'Location not available'}</Text>
                          {airport.distance !== undefined && (
                            <Text style={[styles.airportDistance, { 
                              color: theme === "light" ? "#64748B" : "#94A3B8" 
                            }]}>
                              {(airport.distance * 0.621371).toFixed(1)} mi away
                            </Text>
                          )}
                        </View>
                        <Feather name="chevron-right" size={20} color="#37a4c8" />
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No airports found</Text>
                    </View>
                  }
                  ListFooterComponent={
                    visibleAirports.length < filteredAirports.length ? (
                      <TouchableOpacity
                        style={[styles.loadMoreButton, {
                          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                          borderColor: "#37a4c8"
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
                >
                  <Animated.View 
                    style={[
                      styles.headerSection,
                      {
                        opacity: contentBounceAnim,
                        transform: [
                          {
                            translateY: contentBounceAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [30, 0]
                            })
                          }
                        ]
                      }
                    ]}
                >
                  <View style={styles.headerSection}>
                    <TouchableOpacity
                      style={[styles.airportSelector, {
                        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                        borderColor: "#37a4c8",
                        marginBottom: 16
                      }]}
                      onPress={handleAirportSelectorPress}
                    >
                      <View style={styles.airportSelectorContent}>
                        <Feather name="airplay" size={20} color="#37a4c8" />
                        <Text style={[styles.airportSelectorText, { 
                          color: theme === "light" ? "#000000" : "#e4fbfe" 
                        }]}>
                          {selectedAirport ? selectedAirport.name : "Select Airport"}
                        </Text>
                        <Feather name="chevron-down" size={20} color="#37a4c8" />
                      </View>
                    </TouchableOpacity>

                      {/* Search Bar */}
                      <View style={[styles.searchContainer, {
                      backgroundColor: theme === "light" ? "#F8FAFC" : "#1a1a1a",
                      borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
                      }]}>
                      <Feather name="search" size={20} color={theme === "light" ? "#64748B" : "#37a4c8"} />
                        <TextInput
                          ref={searchInputRef}
                          style={[styles.searchInput, {
                          color: theme === "light" ? "#1E293B" : "#e4fbfe"
                          }]}
                          placeholder="Search events and travelers..."
                        placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          onFocus={handleSearchFocus}
                          onBlur={handleSearchBlur}
                        keyboardAppearance={theme === "light" ? "light" : "dark"}
                        />
                        {searchQuery ? (
                          <TouchableOpacity onPress={handleSearchClear}>
                          <Feather name="x" size={20} color={theme === "light" ? "#64748B" : "#37a4c8"} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </Animated.View>

                    {/* Events Section */}
                    <Animated.View 
                      style={[
                        styles.sectionHeader,
                        {
                          transform: [{
                            translateY: 0
                          }]
                        }
                      ]}
                    >
                      <View style={styles.headerLeft}>
                        <Text style={[styles.headerText, { 
                          color: theme === "light" ? "#0F172A" : "#e4fbfe"
                        }]}>
                          Explore Events
                        </Text>
                        <Text style={[styles.sectionSubtitle, { 
                          color: theme === "light" ? "#475569" : "#94A3B8" 
                        }]}>
                            {filteredEvents.length} events available
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.headerButton, { 
                          backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                          borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
                        }]}
                        onPress={() => router.push("/eventCreation")}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="add" size={24} color={theme === "light" ? "#0F172A" : "#37a4c8"} />
                      </TouchableOpacity>
                    </Animated.View>

                  <Animated.View 
                    style={[
                      styles.gridContent,
                      {
                        opacity: contentBounceAnim,
                        transform: [
                          {
                            translateY: contentBounceAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [40, 0]
                            })
                          }
                        ]
                      }
                    ]}
                  >
                      {filteredEvents.length > 0 ? (
                      <View style={styles.eventsWrapper}>
                        <View style={styles.gridContainer}>
                          {/* Initial 4 events */}
                            {filteredEvents.slice(0, 4).map((item, index) => (
                            <View key={`event-${item.id}`} style={{ width: CARD_WIDTH, marginBottom: 16 }}>
                              <TouchableOpacity
                                style={[styles.eventCard, { 
                                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                                  shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                                }]}
                                onPress={() => router.push("/event/" + item.id)}
                              >
                                <EventCard item={item} index={index} />
                              </TouchableOpacity>
                            </View>
                          ))}
                          
                          {/* Additional events with fade animation */}
                            {filteredEvents.slice(4).map((item, index) => (
                            <Animated.View 
                              key={`additional-event-${item.id}`}
                              style={{
                                opacity: additionalEventsAnim,
                                display: expandedEvents ? 'flex' : 'none',
                                width: CARD_WIDTH,
                                marginBottom: 16,
                              }}
                            >
                              <TouchableOpacity
                                style={[styles.eventCard, { 
                                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                                  shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                                }]}
                                onPress={() => router.push("/event/" + item.id)}
                            >
                              <EventCard item={item} index={index + 4} />
                              </TouchableOpacity>
                            </Animated.View>
                          ))}
                        </View>
                        
                          {filteredEvents.length > 4 && (
                          <Animated.View 
                            style={[
                              styles.toggleButtonContainer,
                              {
                                transform: [{
                                  translateY: buttonPositionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 16]
                                  })
                                }]
                              }
                            ]}
                          >
                            <TouchableOpacity
                              style={[styles.toggleButton, {
                                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                                borderColor: "#37a4c8"
                              }]}
                              onPress={handleToggleEvents}
                              activeOpacity={0.7}
                            >
                              <View style={styles.toggleButtonContent}>
                                <Text style={[styles.toggleButtonText, { color: "#37a4c8" }]}>
                                    {expandedEvents ? "Show Less" : `Show ${filteredEvents.length - 4} More`}
                                </Text>
                                <MaterialIcons 
                                  name={expandedEvents ? "expand-less" : "expand-more"}
                                  size={24} 
                                  color="#37a4c8" 
                                />
                              </View>
                            </TouchableOpacity>
                          </Animated.View>
                        )}
                      </View>
                    ) : (
                      <View style={[styles.emptyContainer, { display: isSearching ? 'none' : 'flex' }]}>
                        <MaterialIcons name="event-busy" size={48} color="#37a4c8" style={styles.emptyIcon} />
                          <Text style={styles.emptyText}>
                            No events found at this airport
                          </Text>
                          {!isSearching && (
                        <TouchableOpacity
                          style={[styles.createEventButton, {
                            backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
                            borderColor: "#37a4c8"
                          }]}
                          onPress={() => router.push("/eventCreation")}
                        >
                          <Text style={[styles.createEventText, { color: "#37a4c8" }]}>Create an Event</Text>
                        </TouchableOpacity>
                          )}
                      </View>
                    )}
                  </Animated.View>

                  {/* Users Section */}
                  <Animated.View 
                    style={[
                      styles.sectionHeader,
                      {
                        transform: [{
                          translateY: 0
                        }]
                      }
                    ]}
                  >
                    <View style={styles.headerLeft}>
                      <Text style={[styles.headerText, { 
                        color: theme === "light" ? "#0F172A" : "#e4fbfe"
                      }]}>
                        Nearby Travelers
                      </Text>
                      <Text style={[styles.sectionSubtitle, { 
                        color: theme === "light" ? "#475569" : "#94A3B8" 
                      }]}>
                        {filteredUsers.length} travelers available
                      </Text>
                    </View>
                  </Animated.View>

                  <Animated.View 
                    style={[
                      styles.gridContent,
                      {
                        opacity: contentBounceAnim,
                        transform: [
                          {
                            translateY: contentBounceAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [40, 0]
                            })
                          }
                        ]
                      }
                    ]}
                  >
                    {filteredUsers.length > 0 ? (
                      <View style={styles.usersWrapper}>
                        {/* Initial 3 users */}
                        {filteredUsers.slice(0, 3).map((user, index) => (
                          <TouchableOpacity
                            key={`user-${user.id}`}
                            style={[styles.userCard, { 
                              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                            }]}
                            onPress={() => router.push(`/profile/${user.id}`)}
                          >
                            <View style={styles.userCardContent}>
                              <View style={styles.userHeader}>
                                <Image
                                  source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
                                  style={styles.profileImage}
                                />
                                <View style={styles.userMainInfo}>
                                  <Text style={[styles.userName, { 
                                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                                  }]}>
                                    {user.name}
                                  </Text>
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
                              
                              <View style={styles.userBioContainer}>
                                <Text style={[styles.userBio, { 
                                  color: theme === "light" ? "#64748B" : "#94A3B8" 
                                }]} 
                                numberOfLines={2}>
                                  {user.bio || "No bio available"}
                                </Text>
                              </View>

                              <View style={styles.userInterestsContainer}>
                                {user.interests?.slice(0, 3).map((interest: string, index: number) => (
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

                        {/* Additional users with fade animation */}
                        {filteredUsers.slice(3).map((user, index) => (
                          <Animated.View 
                            key={`additional-user-${user.id}`}
                            style={{
                              opacity: additionalUsersAnim,
                              display: expandedUsers ? 'flex' : 'none',
                              marginBottom: 16,
                            }}
                          >
                            <TouchableOpacity
                              style={[styles.userCard, { 
                                backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                                shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                              }]}
                              onPress={() => router.push(`/profile/${user.id}`)}
                            >
                              <View style={styles.userCardContent}>
                                <View style={styles.userHeader}>
                                  <Image
                                    source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
                                    style={styles.profileImage}
                                  />
                                  <View style={styles.userMainInfo}>
                                    <Text style={[styles.userName, { 
                                      color: theme === "light" ? "#000000" : "#e4fbfe" 
                                    }]}>
                                      {user.name}
                                    </Text>
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
                                
                                <View style={styles.userBioContainer}>
                                  <Text style={[styles.userBio, { 
                                    color: theme === "light" ? "#64748B" : "#94A3B8" 
                                  }]} 
                                  numberOfLines={2}>
                                    {user.bio || "No bio available"}
                                  </Text>
                                </View>

                                <View style={styles.userInterestsContainer}>
                                  {user.interests?.slice(0, 3).map((interest: string, index: number) => (
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
                          </Animated.View>
                        ))}

                        {filteredUsers.length > 3 && (
                          <Animated.View 
                            style={[
                              styles.toggleButtonContainer,
                              {
                                transform: [{
                                  translateY: usersButtonPositionAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 16]
                                  })
                                }]
                              }
                            ]}
                          >
                            <TouchableOpacity
                              style={[styles.toggleButton, {
                                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                                borderColor: "#37a4c8"
                              }]}
                              onPress={handleToggleUsers}
                              activeOpacity={0.7}
                            >
                              <View style={styles.toggleButtonContent}>
                                <Text style={[styles.toggleButtonText, { color: "#37a4c8" }]}>
                                  {expandedUsers ? "Show Less" : `Show ${filteredUsers.length - 3} More`}
                                </Text>
                                <MaterialIcons 
                                  name={expandedUsers ? "expand-less" : "expand-more"}
                                  size={24} 
                                  color="#37a4c8" 
                                />
                              </View>
                            </TouchableOpacity>
                          </Animated.View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.emptyContainer}>
                        <MaterialIcons name="people" size={48} color="#37a4c8" style={styles.emptyIcon} />
                        <Text style={styles.emptyText}>
                          {isSearching ? "No travelers match your search" : "No travelers found at this airport"}
                        </Text>
                      </View>
                    )}
                  </Animated.View>
                </ScrollView>
              </View>
            )}
          </View>
        </Animated.View>
      </SafeAreaWrapper>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 4,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginRight: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: -20,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  gridContent: {
    paddingHorizontal: 16,
    marginTop: 0,
    marginBottom: 16
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  eventCard: {
    borderRadius: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    transform: [{ scale: 1 }],
    width: '100%',
    height: 220,
    backgroundColor: '#FFFFFF',
  },
  eventDetails: {
    padding: 16,
    height: '100%',
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  organizerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  organizerText: {
    fontSize: 13,
    color: "#37a4c8",
    marginLeft: 6,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  eventDescription: {
    fontSize: 13,
    color: "#37a4c8",
    lineHeight: 18,
    marginBottom: 8,
    letterSpacing: 0.2,
    flex: 1,
    minHeight: 36,
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
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  metaText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: "600",
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
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  userCardContent: {
    padding: 16,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userMainInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userAge: {
    fontSize: 14,
    fontWeight: '500',
  },
  userLocation: {
    fontSize: 14,
    fontWeight: '500',
  },
  userBioContainer: {
    marginBottom: 12,
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  userInterestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userMoodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 164, 200, 0.2)',
  },
  moodIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodText: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
    color: "#64748B",
  },
  emptyIcon: {
    marginBottom: 16,
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
    gap: 16,
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
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    padding: 0,
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
    marginTop: 12,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expandedContent: {
    overflow: 'hidden',
    marginTop: 12,
  },
  expandedDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 164, 200, 0.2)',
  },
  viewEventButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  viewEventText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 24,
  },
  emptyText: {
    fontSize: 18,
    color: '#37a4c8',
    textAlign: 'center',
    fontWeight: "500",
    letterSpacing: 0.3,
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
  usersWrapper: {
    position: 'relative',
    minHeight: 200,
    paddingBottom: 80,
  },
}); 