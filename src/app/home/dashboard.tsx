import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
import useUsers from "../../hooks/useUsers";
import useNotificationCount from "../../hooks/useNotificationCount";
import useActivityCollapse from "../../hooks/useActivityCollapse";


import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import ActivityCard from "../../components/ActivityCard";
import { ThemeContext } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from 'expo-notifications';
import LoadingImage from "../../components/LoadingImage";
import PingEventModal from "../../components/PingEventModal";
import { isProfileComplete } from "../../utils/profileCompletionCheck";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  availabilitySchedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
  linkRatingScore?: {
    average: number;
    count: number;
  };
  currentCity?: string;
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
  availabilitySchedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
  linkRatingScore?: {
    average: number;
    count: number;
  };
  currentCity?: string;
  lastKnownCoordinates?: {
    latitude: number;
    longitude: number;
  };
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

// Helper function to check if user is currently available
const isUserAvailable = (availabilitySchedule: any): boolean => {
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
  
  return currentTime >= start && currentTime <= end;
};

// Helper function to format military time to AM/PM format
const formatTimeToAMPM = (militaryTime: string): string => {
  if (!militaryTime || militaryTime === "00:00") return "12:00 AM";
  
  const [hours, minutes] = militaryTime.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Helper function to validate availability schedule
const isValidAvailabilitySchedule = (availabilitySchedule: any): boolean => {
  if (!availabilitySchedule || typeof availabilitySchedule !== 'object') return false;
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Check if at least one day has valid availability
  for (const day of days) {
    const daySchedule = availabilitySchedule[day];
    if (daySchedule && daySchedule.start && daySchedule.end) {
      const { start, end } = daySchedule;
      
      // Skip invalid or zero times
      if (start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
        continue;
      }
      
      // Skip if start and end are the same
      if (start === end) {
        continue;
      }
      
      // If we find at least one valid day, the schedule is valid
      return true;
    }
  }
  
  return false;
};

// Helper function to get availability time range for today
const getTodayAvailability = (availabilitySchedule: any): string | null => {
  if (!availabilitySchedule) return null;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const todaySchedule = availabilitySchedule[currentDay];
  
  if (!todaySchedule) return null;
  
  const { start, end } = todaySchedule;
  
  // Check for invalid or zero times
  if (!start || !end || start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
    return null;
  }
  
  // Check if start and end are the same
  if (start === end) return null;
  
  return `${formatTimeToAMPM(start)} - ${formatTimeToAMPM(end)}`;
};

// Helper function to get remaining availability time
const getRemainingTime = (availabilitySchedule: any): string | null => {
  if (!availabilitySchedule) return null;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const todaySchedule = availabilitySchedule[currentDay];
  
  if (!todaySchedule) return null;
  
  const { end } = todaySchedule;
  
  // Check for invalid or zero times
  if (!end || end === '0:00' || end === '00:00') {
    return null;
  }
  
  const [endHour, endMinute] = end.split(':').map(Number);
  const endTime = new Date();
  endTime.setHours(endHour, endMinute, 0, 0);
  
  const diffMs = endTime.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m left`;
  } else {
    return `${diffMinutes}m left`;
  }
};

// Helper function to format rating display
const formatRating = (ratingScore: any): string => {
  if (!ratingScore || !ratingScore.average) return 'No ratings';
  return `${ratingScore.average.toFixed(1)} (${ratingScore.count})`;
};

// Helper function to get next available time
const getNextAvailableTime = (availabilitySchedule: any): string | null => {
  if (!availabilitySchedule) return null;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayIndex = now.getDay();
  
  // Check today and the next 7 days
  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const dayName = days[dayIndex];
    const daySchedule = availabilitySchedule[dayName];
    
    if (daySchedule && daySchedule.start && daySchedule.end) {
      const { start, end } = daySchedule;
      
      // Skip invalid or zero times
      if (start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
        continue;
      }
      
      // Skip if start and end are the same
      if (start === end) {
        continue;
      }
      
      const [startHour, startMinute] = start.split(':').map(Number);
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + i);
      startTime.setHours(startHour, startMinute, 0, 0);
      
      // If this is today, check if the start time is in the future
      if (i === 0 && startTime <= now) {
        continue;
      }
      
      // Format the day name
      const dayNames = ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const displayDay = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[dayIndex + 2];
      
      return `${displayDay} at ${formatTimeToAMPM(start)}`;
    }
  }
  
  return null;
};

type DashboardItem = {
  type: "section" | "feature" | "spacer" | "activity";
  id: string;
  data: any;
};

type SearchItem = {
  id: string;
  name: string;
  description: string;
  isCreateEvent: boolean;
  type?: string;
  startTime?: string;
};

type FlatListItem = DashboardItem | SearchItem;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<FlatListItem>);

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
      return <MaterialIcons name="people" size={20} color="#38a5c9" />;
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
    return <MaterialIcons name="rocket" size={20} color="#38a5c9" />;
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
    return <MaterialIcons name="people" size={20} color="#38a5c9" />;
  }
  if (name.includes('freelancer')) {
    return <MaterialIcons name="work" size={20} color="#38a5c9" />;
  }
  if (name.includes('book')) {
    return <MaterialIcons name="book" size={20} color="#38a5c9" />;
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

// Real-time updating component for user availability time
const UserAvailabilityTimer = ({ availabilitySchedule, theme }: { availabilitySchedule: any; theme: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!availabilitySchedule) {
        setTimeLeft('');
        return;
      }
      
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      const todaySchedule = availabilitySchedule[currentDay];
      
      if (!todaySchedule) {
        setTimeLeft('');
        return;
      }
      
      const { end } = todaySchedule;
      
      // Check for invalid or zero times
      if (!end || end === '0:00' || end === '00:00') {
        setTimeLeft('');
        return;
      }
      
      const [endHour, endMinute] = end.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(endHour, endMinute, 0, 0);
      
      const diffMs = endTime.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft('');
        return;
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        setTimeLeft(`${diffHours}h ${diffMinutes}m left`);
      } else {
        setTimeLeft(`${diffMinutes}m left`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [availabilitySchedule]);

  if (!timeLeft) return null;

  return (
    <View style={[styles.metaItem, { 
      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"
    }]}>
      <Feather name="clock" size={9} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
      <Text 
        style={[styles.metaText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
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
  }, [theme, backgroundAnim, textAnim]);

  const { user: authUser, userId } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"events">("events");
  const { updateUser, updateUserLocationAndLogin, getNearbyUsers, getUsers } = useUsers();
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];
  const [customStatus, setCustomStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
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
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [pingStep, setPingStep] = useState(1);

  // Ping Modal State
  const [showPingModal, setShowPingModal] = useState(false);

  // Handle ping modal open/close
  const handleOpenPingModal = () => {
    setShowPingModal(true);
    toggleFabExpansion();
  };

  const handleClosePingModal = () => {
    setShowPingModal(false);
  };

  const [displayText, setDisplayText] = useState<string>("");
  const [isShowingRandom, setIsShowingRandom] = useState(false);
  const textFadeAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // FAB expansion state and animations
  const [fabExpanded, setFabExpanded] = useState(false);
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  const eventButtonAnim = useRef(new Animated.Value(0)).current;
  const pingButtonAnim = useRef(new Animated.Value(0)).current;
  const eventButtonOpacity = useRef(new Animated.Value(0)).current;
  const pingButtonOpacity = useRef(new Animated.Value(0)).current;

  // Random messages for alternating display
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

  // Function to handle FAB expansion
  const toggleFabExpansion = useCallback(() => {
    if (fabExpanded) {
      // Collapse FAB
      Animated.parallel([
        Animated.timing(fabRotateAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Expand FAB
      Animated.parallel([
        Animated.timing(fabRotateAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(eventButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pingButtonOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    setFabExpanded(!fabExpanded);
  }, [fabExpanded, fabRotateAnim, eventButtonAnim, pingButtonAnim, eventButtonOpacity, pingButtonOpacity]);

  // Function to handle text transition with fade
  const transitionText = useCallback((newText: string) => {
    // Fade out
    Animated.timing(textFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Change text
      setDisplayText(newText);
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
    // Don't start alternating until userData is loaded
    if (!userData) {
      setDisplayText("Set your mood status");
      return;
    }

    // If no mood status is set, just show the placeholder
    if (!userData.moodStatus) {
      setDisplayText("Set your mood status");
      return;
    }

    // Set initial text to mood status with prefix
    setDisplayText(`Current status: ${userData.moodStatus}`);
    setIsShowingRandom(false);

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
    // Only start interval if we have userData and moodStatus
    if (!userData?.moodStatus) {
      return;
    }

    const interval = setInterval(() => {
      // If current text starts with "Current status:", show random message
      if (displayText.startsWith("Current status:")) {
        const randomIndex = Math.floor(Math.random() * randomMessages.length);
        transitionText(randomMessages[randomIndex]);
      } else {
        // If current text is a random message, show mood status with prefix
        transitionText(`Current status: ${userData.moodStatus}`);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [userData?.moodStatus, displayText, transitionText]);

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
  const { isCollapsed: activityCollapsed, isLoading: activityCollapseLoading, toggleCollapse: toggleActivityCollapse } = useActivityCollapse();

  const showPopup = useCallback((title: string, message: string, type: "success" | "error") => {
    setPopupData({ visible: true, title, message, type });
    setTimeout(() => setPopupData((prev) => ({ ...prev, visible: false })), 3000);
  }, []);

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
    } finally {
      setUpdatingMood(false);
      setIsUpdating(false);
    }
  }, [userId, updateUser]);

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

  // Initialize dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
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
  }, [userId, showPopup]);

  useEffect(() => {
    const fetchNearbyUsers = async () => {
      if (!userId || !userLocation) return;
      
      // Prevent multiple fetches
      if (usersLoaded) return;
      
      try {
        const users = await getUsers() as UserData[];
     

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

        // Get current user's coordinates
        const myLat = userLocation?.lat;
        const myLong = userLocation?.long;

        // Helper: check if user is available right now
        const isAvailableNow = (availabilitySchedule: any) => {
          if (!availabilitySchedule) return false;
          const now = new Date();
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const currentDay = days[now.getDay()];
          const todaySchedule = availabilitySchedule[currentDay];
          if (!todaySchedule) return false;
          const { start, end } = todaySchedule;
          if (!start || !end || start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') return false;
          if (start === end) return false;
          const currentTime = now.toTimeString().slice(0,5);
          return currentTime >= start && currentTime <= end;
        };

        // Filter users by block, distance, and availability
        const formattedUsers: NearbyUser[] = users
          .filter(user => {
            if (user.id === userId) {
              return false;
            }
            if (blockedUsers.includes(user.id)) {
              return false;
            }
            if (hasMeBlocked.includes(user.id)) {
              return false;
            }
            // Availability filter
            if (!isAvailableNow(user.availabilitySchedule)) {
              return false;
            }
            // Distance filter
            if (!user.lastKnownCoordinates || myLat == null || myLong == null) {
              return false;
            }
            const { latitude, longitude } = user.lastKnownCoordinates;
            if (typeof latitude !== 'number' || typeof longitude !== 'number') {
              return false;
            }
            const dist = haversineDistance(myLat, myLong, latitude, longitude);
            if (dist > 40) {
              return false;
            }
            return true;
          })
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
            availabilitySchedule: user.availabilitySchedule,
            linkRatingScore: user.linkRatingScore,
            currentCity: user.currentCity,
          }));



        // Generate a unique timestamp for this batch of invite cards
        const timestamp = Date.now();
        let finalUsers: NearbyUser[] = [...formattedUsers];
        if (formattedUsers.length >= 5) {
          finalUsers = [
            ...formattedUsers,
            {
              id: `view-more-${timestamp}`,
              name: 'View More',
              status: 'See all travelers',
              isViewMoreCard: true,
              profilePicture: undefined,
              age: undefined,
              bio: undefined,
              languages: [],
              interests: [], 
              goals: [],
              pronouns: undefined,
              lastLogin: null,
              availabilitySchedule: {},
              linkRatingScore: { average: 0, count: 0 },
              currentCity: '',
            }
          ];
        } else {
          // If we have fewer than 5 users, add "Invite Friends" cards
          const inviteFriendsCards = Array(5 - formattedUsers.length)
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
              lastLogin: null,
              availabilitySchedule: {},
              linkRatingScore: { average: 0, count: 0 },
              currentCity: '',
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
  }, [userId, getNearbyUsers, userLocation, usersLoaded, getUsers]);

  // Update loading state based on users loading status
  useEffect(() => {
    if (usersLoaded) {
      setLoading(false);
    }
  }, [usersLoaded]);

  const features: FeatureButton[] = useMemo(() => [
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
      screen: "eventScreen",
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
  ], [userId]);

  const refreshData = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Refresh logic can be added here if needed
    } catch (error) {
      console.error("Error refreshing data:", error);
      showPopup("Error", "Failed to refresh data", "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, showPopup]);

  const filteredResults: SearchItem[] = useMemo(() => [
    {
      id: 'create-event',
      name: 'Create Event',
      description: 'Start a new event',
      isCreateEvent: true
    }
  ], [searchQuery]);

  const visibleResults: SearchItem[] = useMemo(() => filteredResults, [filteredResults]);

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
  }, [searchTransitionAnim, listOpacityAnim, listTranslateYAnim]);

  const handleMoodPress = useCallback(() => {
    toggleStatusSheet();
  }, [toggleStatusSheet]);

  const renderSearchResult = useCallback((item: SearchItem) => {
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

  const dashboardData: DashboardItem[] = useMemo(() => [
    { type: "activity", id: "activity", data: { userLocation, userId, isCollapsed: activityCollapsed } },
    { type: "section", id: "users", data: nearbyUsers || [] },
    { type: "spacer", id: "spacer1", data: null },
    { type: "feature", id: "feature-grid", data: features },
  ], [userLocation, userId, activityCollapsed, nearbyUsers, features]);

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

  // Add state to track if profile completion has been checked
  const [profileCompletionChecked, setProfileCompletionChecked] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (userId) {
      const userRef = doc(db, "users", userId);
      unsubscribe = onSnapshot(userRef, async (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserData;
          setUserData(data);
          
          // Only check profile completion once per device
          if (!profileCompletionChecked && data) {
            console.log('🔄 Dashboard - Checking profile completion...');
            
            // Check if we've already verified this user's profile completion
            const storageKey = `profileComplete_${userId}`;
            try {
              const storedCompletionStatus = await AsyncStorage.getItem(storageKey);
              
              if (storedCompletionStatus === 'true') {
                // Profile was previously verified as complete, skip check
                console.log('✅ Dashboard - Profile completion previously verified, skipping check');
                setProfileCompletionChecked(true);
                return;
              }
              
              // Check profile completion
              const isComplete = isProfileComplete(data);
              
              if (!isComplete) {
                console.log('🔄 Dashboard - Profile incomplete, redirecting to /profileComplete');
                router.replace("/profileComplete");
              } else {
                console.log('✅ Dashboard - Profile complete, saving to storage');
                // Save completion status to AsyncStorage
                await AsyncStorage.setItem(storageKey, 'true');
                setProfileCompletionChecked(true);
              }
            } catch (error) {
              console.error('Error checking profile completion status:', error);
              // Fallback to checking without storage
              if (!isProfileComplete(data)) {
                console.log('🔄 Dashboard - Profile incomplete, redirecting to /profileComplete');
                router.replace("/profileComplete");
              } else {
                console.log('✅ Dashboard - Profile complete');
                setProfileCompletionChecked(true);
              }
            }
          }
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, router, profileCompletionChecked]);



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
            {/* Removed Profile Picture Popup and Notifications Popup */}
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

                </Animated.View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleMoodPress}
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
                    <Animated.Text style={[styles.searchPlaceholder, { 
                      color: theme === "light" ? "#37a4c8" : "#38a5c9",
                      opacity: textFadeAnim
                    }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayText}
                    </Animated.Text>
                  </View>
                </TouchableOpacity>
              )}
            </Animated.View>
            <AnimatedFlatList
              style={{ flex: 1 }}
              data={showSearch ? visibleResults : dashboardData}
              keyExtractor={(item: FlatListItem, index) => {
                if (showSearch) {
                  return `search-${index}`;
                }
                return item.id;
              }}
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
              renderItem={({ item, index }) => {
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
                  // Type guard to check if item is a DashboardItem
                  if ('type' in item && 'data' in item) {
                    const dashboardItem = item as DashboardItem;
                  if (dashboardItem.type === "activity") {
                    return (
                      <View style={styles.section}>
                        <View style={styles.headerRow}>
                          <View style={styles.headerLeft}>
                            <MaterialIcons name="local-activity" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.headerIcon} />
                            <Text style={[styles.sectionHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                              Nearby Activities
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

                  } else if (dashboardItem.type === "section") {
                    if (dashboardItem.id === "users") {
                      return (
                        <View style={styles.section}>
                          <View style={styles.headerRow}>
                            <View style={styles.headerLeft}>
                            <Feather name="clock" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.headerIcon} />
                            <Text style={[styles.sectionHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Available Now</Text>
                            </View>
                            <TouchableOpacity 
                              style={[styles.filterButton, { 
                                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                                borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                                marginTop: 2,
                              }]}
                              onPress={() => router.push('/explore')}
                              activeOpacity={0.7}
                            >
                              <Feather name="filter" size={14} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                              <Text style={[styles.filterButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                Filter
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {loading ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator size="small" color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                              <Text style={[styles.loadingText, { color: theme === "light" ? "#000000" : "#64748B" }]}>
                                Finding available travelers...
                              </Text>
                            </View>
                          ) : dashboardItem.data.length > 0 ? (
                            <FlatList
                              horizontal
                              data={dashboardItem.data}
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
                                    {/* Avatar and Basic Info Section */}
                                    <View style={styles.userSection}>
                                      <View style={[styles.avatar, { 
                                        backgroundColor: theme === "light" ? "#e6e6e6" : "#000000",
                                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                                        marginBottom: 12,
                                      }]}>
                                        {user.profilePicture ? (
                                          <Image 
                                            source={{ uri: user.profilePicture }} 
                                            style={styles.avatarImage}
                                          />
                                        ) : (
                                          <FontAwesome5 name="user" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                        )}
                                      </View>
                                      
                                      {/* Name and Age Row */}
                                      <View style={styles.nameAgeContainer}>
                                        <Text 
                                          style={[styles.userName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}
                                          numberOfLines={1}
                                          ellipsizeMode="tail"
                                        >
                                          {user.name}
                                        </Text>
                                        {user.age && (
                                          <Text style={[styles.userAge, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                            {user.age}
                                          </Text>
                                        )}
                                      </View>
                                      
                                      {/* Available Tag */}
                                      <View style={[styles.availableTag, { 
                                        backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                      }]}>
                                        <Feather name="check-circle" size={8} color="#FFFFFF" />
                                        <Text style={styles.availableText}>Available</Text>
                                      </View>
                                    </View>

                                    {/* Meta Information Section */}
                                    <View style={styles.userMetaContainer}>
                                      {/* Time Left */}
                                      <UserAvailabilityTimer 
                                        availabilitySchedule={user.availabilitySchedule} 
                                        theme={theme || "light"} 
                                      />

                                      {/* Rating */}
                                      <View style={[styles.metaItem, { 
                                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"
                                      }]}>
                                        <Feather name="star" size={9} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                        <Text 
                                          style={[styles.metaText, { color: theme === "light" ? "#37a4c9" : "#38a5c9" }]}
                                          numberOfLines={1}
                                          ellipsizeMode="tail"
                                        >
                                          {formatRating(user.linkRatingScore)}
                                        </Text>
                                      </View>

                                      {/* Current City */}
                                      {user.currentCity && (
                                        <View style={[styles.metaItem, { 
                                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"
                                        }]}>
                                          <Feather name="map-pin" size={9} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                          <Text 
                                            style={[styles.metaText, { color: theme === "light" ? "#37a4c9" : "#38a5c9" }]}
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                          >
                                            {user.currentCity}
                                          </Text>
                                        </View>
                                      )}
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
                                      <FontAwesome5 name="user-plus" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
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
                                      <Feather name="share-2" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                      <Text style={[styles.inviteButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                        Share
                                      </Text>
                                    </View>
                                  </View>
                                );

                                const renderViewMoreCard = () => (
                                  <View style={[styles.viewMoreCard, { 
                                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a"
                                  }]}>
                                    <View style={[styles.viewMoreIconContainer, { 
                                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)",
                                      borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                    }]}>
                                      <Feather name="users" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                                    </View>
                                    <Text style={[styles.viewMoreTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                                      View More
                                    </Text>
                                    <Text style={[styles.viewMoreSubtitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                                      See all travelers
                                    </Text>
                                    <View style={[styles.inviteButton, { 
                                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
                                    }]}>
                                      <Feather name="chevron-right" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
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
                            <Text style={[styles.noDataText, { color: theme === "light" ? "#000000" : "#64748B" }]}>No travelers available now.</Text>
                          )}
                        </View>
                      );
                    } else if (dashboardItem.id === "events") {
                      return (
                        <View style={styles.section}>
                          <View style={styles.headerRow}>
                            <MaterialIcons name="event" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.headerIcon} />
                            <Text style={[styles.sectionHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                              Nearby Events
                            </Text>
                          </View>
                          {dashboardItem.data.length > 0 ? (
                            <FlatList
                              horizontal
                              data={[...dashboardItem.data]
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
                                            {new Date(event.startTime).toLocaleDateString()} at {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
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
                  } else if (dashboardItem.type === "feature") {
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
                            source={theme === "light" 
                              ? require('../../../assets/images/splash-icon.png')
                              : require('../../../assets/images/splash-icon-dark.png')
                            }
                            style={[
                              styles.footerLogo
                              
                            ]}
                            resizeMode="contain"
                          />
                          <Text style={[styles.copyrightText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                            © 2025 Wingman. All rights reserved.
                          </Text>
                        </View>
                      </View>
                    );
                  } else if (dashboardItem.type === "spacer") {
                    return <View style={styles.spacer} />;
                  }
                  return null;
                }
                return null;
              }
              return null;
              }}
            />
            {/* Floating Action Button */}
            {!showSearch && (
              <View style={styles.fabContainer}>
                {/* Event Button */}
                <Animated.View
                  style={[
                    styles.fabOption,
                    styles.eventFabOption,
                    {
                      opacity: eventButtonOpacity,
                      transform: [
                        {
                          translateX: eventButtonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -100 * Math.cos(Math.PI / 8)],
                          }),
                        },
                        {
                          translateY: eventButtonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -100 * Math.sin(Math.PI / 8)],
                          }),
                        },
                        {
                          scale: eventButtonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.fabOptionButton, { 
                      backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                      borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                    }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      // Do nothing for now as requested
                      console.log("Event button pressed");
                    }}
                  >
                    <MaterialIcons 
                      name="event" 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </Animated.View>

                {/* Ping Button */}
                <Animated.View
                  style={[
                    styles.fabOption,
                    styles.pingFabOption,
                    {
                      opacity: pingButtonOpacity,
                      transform: [
                        {
                          translateX: pingButtonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -100 * Math.cos(Math.PI / 2.2)],
                          }),
                        },
                        {
                          translateY: pingButtonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -100 * Math.sin(Math.PI / 2.2)],
                          }),
                        },
                        {
                          scale: pingButtonAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.fabOptionButton, { 
                      backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                      borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                    }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      handleOpenPingModal();
                      toggleFabExpansion(); // Close the FAB
                    }}
                  >
                    <MaterialIcons 
                      name="send" 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </TouchableOpacity>
                </Animated.View>

                {/* Main FAB */}
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
                        {
                          rotate: fabRotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '45deg'],
                          }),
                        },
                      ],
                      backgroundColor: theme === "light" ? "#37a4c8" : "#000000",
                      borderWidth: 0,
                    },
                  ]}
                >
                  <TouchableOpacity 
                    onPress={toggleFabExpansion}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons 
                      name="add" 
                      size={28} 
                      color={theme === "light" ? "#FFFFFF" : "#38a5c9"} 
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
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

            {/* Ping Event Modal */}
            <PingEventModal
              visible={showPingModal}
              onClose={handleClosePingModal}
              onSuccess={showPopup}
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
  userCard: {
    width: 140,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    marginRight: 10,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 12,
    overflow: 'hidden',
  },
  userCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#38a5c9",
    overflow: 'hidden',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    padding: 0,
    alignItems: 'center',
    width: '100%',
  },
  userSection: {
    borderBottomWidth: 0,
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
  nameAgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    width: '100%',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  userAge: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
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
    marginTop: 0,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
    minHeight: 24,
    maxWidth: '100%',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: 0.1,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    shadowRadius: 4,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: -0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  inviteSubtitle: {
    fontSize: 11,
    color: "#38a5c9",
    letterSpacing: 0.1,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.25)',
  },
  inviteButtonText: {
    fontSize: 11,
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
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  organizerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  attendingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  attendingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  eventContent: {
    padding: 20,
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
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
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
    justifyContent: "center",
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
    letterSpacing: 0.3,
    textAlign: "center",
    flex: 1,
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
    gap: 16,
    marginBottom: 40,
  },
  featureGridItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  featureGridTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  featureGridDescription: {
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 20,
    fontWeight: '400',
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
    width: 95,
    height: 95,
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
  availableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  availableText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 0 : 0,
    right: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',

  },
  fabOption: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabOptionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabOptionLabel: {
    position: 'absolute',
    left: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  fabOptionText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  eventFabOption: {
    // Positioned above the main FAB
  },
  pingFabOption: {
    // Positioned above the event FAB
  },
  viewMoreCard: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.02)',
  },
  viewMoreIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 165, 201, 0.08)',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#38a5c9",
    overflow: 'hidden',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewMoreTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: -0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  viewMoreSubtitle: {
    fontSize: 11,
    color: "#38a5c9",
    letterSpacing: 0.1,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  viewMoreButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

});

export { Dashboard };