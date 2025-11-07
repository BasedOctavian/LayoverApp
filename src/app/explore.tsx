import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  LayoutAnimation,
  UIManager,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useEvents from "../hooks/useEvents";
import useUsers from "../hooks/useUsers";
import useAuth from "../hooks/auth";
import useConnections from "../hooks/useConnections";
import usePings from "../hooks/usePings";
import useGroups from "../hooks/useGroups";
import { Group } from "../types/groupTypes";
import * as Location from "expo-location";
import TopBar from "../components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../context/ThemeContext";
import useNotificationCount from "../hooks/useNotificationCount";
import ExploreMap from "../components/ExploreMap";
import {
  SearchBar,
  CategoryBar,
  TabBar,
  FilterBar,
  ActivityCard,
  UserCard,
  GroupCard,
  type TabType,
  type Event,
  type Ping,
  type UnifiedItem,
  type User
} from "../components/explore";
import { PING_CATEGORIES } from "../constants/pingCategories";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { scaleWidth, scaleHeight, scaleFontSize as scaleFont, moderateScale as scale, spacing, borderRadius } from '../utils/responsive';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Location {
  latitude: number;
  longitude: number;
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


const ModernLoadingIndicator = ({ color }: { color: string }) => {
  return <ActivityIndicator size="small" color={color} />;
};

// Helper to calculate interest match score
const calculateInterestMatch = (userInterests: string[], groupTags: string[]): number => {
  if (!userInterests || !groupTags || userInterests.length === 0 || groupTags.length === 0) {
    return 0;
  }
  
  const userInterestsLower = userInterests.map(i => i.toLowerCase());
  const groupTagsLower = groupTags.map(t => t.toLowerCase());
  
  const matches = userInterestsLower.filter(interest => 
    groupTagsLower.some(tag => 
      tag.includes(interest) || interest.includes(tag)
    )
  ).length;
  
  return (matches / Math.max(userInterests.length, groupTags.length)) * 100;
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
  const { getGroups } = useGroups();
  const { theme } = React.useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [enrichedGroups, setEnrichedGroups] = useState<(Group & { distance?: number; interestMatch?: number })[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userConnectionStatus, setUserConnectionStatus] = useState<{[key: string]: 'connected' | 'pending' | 'none'}>({});
  const [isCheckingConnections, setIsCheckingConnections] = useState(false);
  const [availableUsersCount, setAvailableUsersCount] = useState(0);
  
  // New state for improved UX - SIMPLIFIED TAB STRUCTURE
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'activities' | 'social'>('all');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [filterDistance, setFilterDistance] = useState<number>(50); // miles
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  
  // Enhanced filtering states
  const [activityType, setActivityType] = useState<'all' | 'events' | 'pings'>('all'); // For Activities tab sub-filter
  const [socialType, setSocialType] = useState<'all' | 'users' | 'groups'>('all'); // For Social tab sub-filter
  const [timeFilter, setTimeFilter] = useState<'all' | 'now' | 'today' | 'week'>('all');
  const [distancePreset, setDistancePreset] = useState<'nearby' | 'local' | 'regional' | 'custom'>('regional');
  const [showFilters, setShowFilters] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const ITEMS_PER_PAGE = 20;
  
  // Refs for scroll management
  const scrollViewRef = useRef<ScrollView>(null);
  const searchSectionRef = useRef<View>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  // Animation values - only for map scale effect
  const contentScaleAnim = useRef(new Animated.Value(1)).current;

  // State for user connections (for friends-only filtering)
  const [userConnections, setUserConnections] = useState<Set<string>>(new Set());

  // Helper function to get distance value from preset
  const getDistanceFromPreset = useCallback((preset: typeof distancePreset): number => {
    switch (preset) {
      case 'nearby': return 5;
      case 'local': return 20;
      case 'regional': return 50;
      case 'custom': return filterDistance;
      default: return 50;
    }
  }, [filterDistance]);

  // Helper function to check if an item matches time filter
  const matchesTimeFilter = useCallback((item: UnifiedItem): boolean => {
    if (timeFilter === 'all') return true;
    
    const now = new Date();
    let itemTime: Date | null = null;
    
    if (item.type === 'event') {
      const event = item.data as Event;
      if (event.startTime) {
        itemTime = new Date(event.startTime);
      }
    } else if (item.type === 'ping') {
      const ping = item.data as Ping;
      if (ping.createdAt) {
        itemTime = ping.createdAt?.toDate ? ping.createdAt.toDate() : new Date(ping.createdAt);
      }
    }
    
    if (!itemTime) return true; // If no time, show it
    
    if (timeFilter === 'now') {
      // Happening within the next 2 hours
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      return itemTime <= twoHoursFromNow && itemTime >= now;
    } else if (timeFilter === 'today') {
      // Happening today
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
      return itemTime >= startOfToday && itemTime < endOfToday;
    } else if (timeFilter === 'week') {
      // Happening within next 7 days
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return itemTime >= now && itemTime <= sevenDaysFromNow;
    }
    
    return true;
  }, [timeFilter]);

  // Update active filters tracking
  useEffect(() => {
    const hasFilters = 
      selectedCategory !== null ||
      showAvailableOnly ||
      timeFilter !== 'all' ||
      searchQuery.trim() !== '' ||
      (activeTab === 'activities' && activityType !== 'all') ||
      (activeTab === 'social' && socialType !== 'all');
    
    setHasActiveFilters(hasFilters);
  }, [selectedCategory, showAvailableOnly, timeFilter, searchQuery, activeTab, activityType, socialType]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(null);
    setShowAvailableOnly(false);
    setTimeFilter('all');
    setActivityType('all');
    setSocialType('all');
    setSearchQuery('');
    setDistancePreset('regional');
    setFilterDistance(50);
  }, []);

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUserData = async () => {
      if (!user?.uid) return;
      
      try {
        const userData = await getUser(user.uid);
        setCurrentUserData(userData);
      } catch (error) {
        console.error('Error fetching current user data:', error);
      }
    };
    
    fetchCurrentUserData();
  }, [user?.uid, getUser]);

  // Fetch user connections for filtering friends-only content
  useEffect(() => {
    let mounted = true;
    
    const fetchUserConnections = async () => {
      if (!user?.uid) return;
      
      try {
        const connectedUserIds = new Set<string>();
        
        // Query connections where user is a participant
        const connectionsRef = collection(db, 'connections');
        const q = query(
          connectionsRef, 
          where('participants', 'array-contains', user.uid),
          limit(100) // Limit to prevent massive queries
        );
        const snapshot = await getDocs(q);
        
        if (!mounted) return;
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // Only include active connections
          if (data.status === 'active') {
            // Add the other user ID (not the current user)
            const otherUserId = data.participants.find((id: string) => id !== user.uid);
            if (otherUserId) {
              connectedUserIds.add(otherUserId);
            }
          }
        });
        
        setUserConnections(connectedUserIds);
      } catch (error) {
        console.error('Error fetching user connections:', error);
      }
    };
    
    fetchUserConnections();
    
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Enrich groups with distance and interest matching
  useEffect(() => {
    const enrichGroupsWithData = async () => {
      if (!groups || groups.length === 0) {
        setEnrichedGroups([]);
        return;
      }
      
      const enriched = await Promise.all(
        groups.map(async (group) => {
          const enrichedGroup: Group & { distance?: number; interestMatch?: number } = { ...group };
          
          // Use group's stored coordinates (organizer's location at creation)
          if (group.coordinates && currentLocation) {
            enrichedGroup.distance = calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              group.coordinates.latitude,
              group.coordinates.longitude
            );
          }
          
          // Calculate interest match
          if (currentUserData?.interests && group.tags) {
            enrichedGroup.interestMatch = calculateInterestMatch(
              currentUserData.interests,
              group.tags
            );
          }
          
          return enrichedGroup;
        })
      );
      
      // Filter groups based on each group's visibility radius
      const filteredByDistance = enriched.filter(group => {
        // If no distance calculated, exclude the group
        if (group.distance === undefined) return false;
        // Only show groups within their specified visibility radius
        const groupRadius = group.radius || 30; // Default to 30 miles if not set
        return group.distance <= groupRadius;
      });
      
      // Sort by interest match and distance
      filteredByDistance.sort((a, b) => {
        const matchA = a.interestMatch || 0;
        const matchB = b.interestMatch || 0;
        
        // If both have similar interest matches (within 10%), sort by distance
        if (Math.abs(matchA - matchB) < 10) {
          const distA = a.distance || Infinity;
          const distB = b.distance || Infinity;
          return distA - distB;
        }
        
        // Otherwise sort by interest match
        return matchB - matchA;
      });
      
      setEnrichedGroups(filteredByDistance);
    };
    
    enrichGroupsWithData();
  }, [groups, currentLocation, currentUserData]);

  // Create unified list of events and pings
  const unifiedItems = useMemo(() => {
    const items: UnifiedItem[] = [];
    
    // Add events
    events.forEach(event => {
      // Filter out events based on privacy settings
      if (event.pingType === 'friends-only') {
        // Friends-only: Only show to creator, their active connections, or existing participants
        // Non-connected users will not see these events at all
        if (!user?.uid) return; // Hide if no user ID
        const isCreator = user.uid === event.creatorId;
        const isConnected = userConnections.has(event.creatorId); // Check if user has active connection with creator
        const isParticipant = event.participants?.includes(user.uid);
        if (!isCreator && !isConnected && !isParticipant) {
          return; // Hide from non-connected, non-participant users
        }
      } else if (event.pingType === 'invite-only') {
        // Invite-only: Only show to creator or participants (no connection check needed)
        if (!user?.uid) return; // Hide if no user ID
        if (user.uid !== event.creatorId && !event.participants?.includes(user.uid)) {
          return;
        }
      }
      
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
      // Filter out pings based on privacy settings
      if (ping.pingType === 'friends-only') {
        // Friends-only: Only show to creator, their active connections, or existing participants
        // Non-connected users will not see these pings at all
        if (!user?.uid) return; // Hide if no user ID
        const isCreator = user.uid === ping.creatorId;
        const isConnected = userConnections.has(ping.creatorId); // Check if user has active connection with creator
        const isParticipant = ping.participants?.includes(user.uid);
        if (!isCreator && !isConnected && !isParticipant) {
          return; // Hide from non-connected, non-participant users
        }
      } else if (ping.pingType === 'invite-only') {
        // Invite-only: Only show to creator or participants (no connection check needed)
        if (!user?.uid) return; // Hide if no user ID
        if (user.uid !== ping.creatorId && !ping.participants?.includes(user.uid)) {
          return;
        }
      }
      
      // Filter out full pings (unless user is already a participant or creator)
      if (ping.maxParticipants && !ping.maxParticipants.toLowerCase().includes('unlimited')) {
        const maxNum = parseInt(ping.maxParticipants.replace(/\D/g, ''));
        if (!isNaN(maxNum)) {
          const currentCount = ping.participantCount || ping.participants?.length || 0;
          const isFull = currentCount >= maxNum;
          
          // Still show if user is creator or already participating
          if (isFull && user?.uid && user.uid !== ping.creatorId && !ping.participants?.includes(user.uid)) {
            return; // Hide full pings from non-participants
          }
        }
      }
      
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
  }, [events, pings, currentLocation, user?.uid, userConnections]);

  // Filter items based on selected category, tab, and other filters
  const filteredItems = useMemo(() => {
    let filtered = unifiedItems;

    // Exclude events/pings that are over (privacy filtering is now done in unifiedItems)
    filtered = filtered.filter(item => {
      if (item.type === 'event') {
        const event = item.data as Event;
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
    
    // Filter by tab and activity type (UPDATED FOR NEW TAB STRUCTURE)
    if (activeTab === 'activities') {
      // Activities tab: show events and pings only
      if (activityType === 'events') {
        filtered = filtered.filter(item => item.type === 'event');
      } else if (activityType === 'pings') {
        filtered = filtered.filter(item => item.type === 'ping');
      }
      // If activityType is 'all', show both events and pings (no additional filter needed)
    }
    // Note: 'social' tab filtering is handled in searchResults logic
    // Note: 'all' tab shows everything (handled in searchResults)
    
    // Filter by time
    filtered = filtered.filter(item => matchesTimeFilter(item));
    
    // Filter by distance using preset
    const currentDistance = getDistanceFromPreset(distancePreset);
    if (currentLocation) {
      filtered = filtered.filter(item => {
        if (!item.distance) return true;
        return item.distance <= currentDistance;
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
  }, [unifiedItems, selectedCategory, activeTab, activityType, filterDistance, showAvailableOnly, currentLocation, timeFilter, distancePreset, matchesTimeFilter, getDistanceFromPreset]);

  // --- Update searchResults to filter users by availability if showAvailableOnly is true ---
  // --- Update searchResults type for type safety ---
  type SearchResult =
    | { kind: 'activity'; item: UnifiedItem }
    | { kind: 'user'; user: User }
    | { kind: 'group'; group: Group };

  const searchResults: SearchResult[] = useMemo(() => {
    // Helper for user distance filtering
    const currentDistance = getDistanceFromPreset(distancePreset);
    const isUserWithinDistance = (user: User) => {
      if (!currentLocation) return true;
      if (!user.lastKnownCoordinates) return true; // No location, always include
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        user.lastKnownCoordinates.latitude,
        user.lastKnownCoordinates.longitude
      );
      return distance <= currentDistance;
    };

    if (!searchQuery.trim()) {
      // No search: filter based on active tab (UPDATED FOR NEW 3-TAB STRUCTURE)
      let userResults = users;
      if (showAvailableOnly) {
        userResults = userResults.filter(user => isUserCurrentlyAvailable(user.availabilitySchedule));
      }
      // Location filter for users
      userResults = userResults.filter(isUserWithinDistance);
      
      if (activeTab === 'social') {
        // Social tab: show users and groups
        if (socialType === 'users') {
          return userResults.map(user => ({ kind: 'user' as const, user }));
        } else if (socialType === 'groups') {
          return enrichedGroups.map(group => ({ kind: 'group' as const, group }));
        } else {
          // socialType === 'all': show both
          return [
            ...userResults.map(user => ({ kind: 'user' as const, user })),
            ...enrichedGroups.map(group => ({ kind: 'group' as const, group }))
          ];
        }
      } else if (activeTab === 'activities') {
        // Activities tab: only show events/pings (already filtered by activityType in filteredItems)
        return filteredItems.map(item => ({ kind: 'activity' as const, item }));
      } else {
        // All tab: show everything
        const base = filteredItems.map(item => ({ kind: 'activity' as const, item }));
        
        // Only include users and groups if no category is selected (categories don't apply to them)
        if (!selectedCategory) {
          return [
            ...base,
            ...userResults.map(user => ({ kind: 'user' as const, user })),
            ...enrichedGroups.map(group => ({ kind: 'group' as const, group }))
          ];
        } else {
          // Category is selected, only show activities
          return base;
        }
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

    // Filter enriched groups by name, description, or tags
    const groupMatches = enrichedGroups.filter(group =>
      group.name?.toLowerCase().includes(lowerQuery) ||
      group.description?.toLowerCase().includes(lowerQuery) ||
      group.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    ).map(group => ({ kind: 'group' as const, group }));

    // Include results based on active tab (UPDATED FOR NEW 3-TAB STRUCTURE)
    if (activeTab === 'social') {
      // Social tab: show users and/or groups based on socialType
      if (socialType === 'users') {
        return userMatches.map(user => ({ kind: 'user' as const, user }));
      } else if (socialType === 'groups') {
        return groupMatches;
      } else {
        // socialType === 'all': show both
        return [
          ...userMatches.map(user => ({ kind: 'user' as const, user })),
          ...groupMatches
        ];
      }
    } else if (activeTab === 'activities') {
      // Activities tab: only show events/pings
      return activityMatches;
    } else {
      // All tab: show everything, but exclude users/groups when category is selected
      if (!selectedCategory) {
        // No category selected, show everything
        return [
          ...activityMatches,
          ...userMatches.map(user => ({ kind: 'user' as const, user })),
          ...groupMatches
        ];
      } else {
        // Category is selected, only show activities
        return activityMatches;
      }
    }
  }, [searchQuery, filteredItems, users, enrichedGroups, showAvailableOnly, currentLocation, filterDistance, activeTab, selectedCategory, distancePreset, getDistanceFromPreset, socialType]);

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

      // Fetch groups (including private groups that require approval)
      const fetchedGroups = await getGroups();
      if (fetchedGroups && Array.isArray(fetchedGroups)) {
        // Filter to show public and private groups (exclude only 'hidden' groups)
        const visibleGroups = fetchedGroups.filter(g => g.visibility !== 'hidden');
        setGroups(visibleGroups);
      }
      
      // Fetch current user data for interest matching
      if (user?.uid) {
        const userData = await getUser(user.uid);
        setCurrentUserData(userData);
      }
      } catch (error) {
        console.error("Error initializing data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setHasInitiallyLoaded(true);
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
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
    // Very gentle scroll to results section when category changes
    if (scrollViewRef.current) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scaleHeight(380), // Slightly less aggressive
          animated: true
        });
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [selectedCategory]);

  // Handle tab selection
  const handleTabSelect = useCallback((tab: TabType) => {
    setActiveTab(tab);
    // Very gentle scroll to results section when tab changes
    if (scrollViewRef.current) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scaleHeight(380), // Slightly less aggressive
          animated: true
        });
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, []);

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

      // Refresh groups (including private groups that require approval)
      const fetchedGroups = await getGroups();
      if (fetchedGroups && Array.isArray(fetchedGroups)) {
        // Filter to show public and private groups (exclude only 'hidden' groups)
        const visibleGroups = fetchedGroups.filter(g => g.visibility !== 'hidden');
        setGroups(visibleGroups);
      }
      
      // Refresh current user data
      if (user?.uid) {
        const userData = await getUser(user.uid);
        setCurrentUserData(userData);
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  }, [getEvents, getPings, getGroups]);

  // Keyboard visibility listeners with animations
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        // Very subtle scale animation when keyboard appears
        Animated.spring(contentScaleAnim, {
          toValue: 0.97,
          friction: 9,
          tension: 35,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        // Restore animation when keyboard hides
        Animated.spring(contentScaleAnim, {
          toValue: 1,
          friction: 9,
          tension: 35,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [contentScaleAnim]);

  // Gently scroll to search section when keyboard opens (only if needed)
  useEffect(() => {
    if (isKeyboardVisible && searchSectionRef.current && scrollViewRef.current && !searchQuery) {
      // Only auto-scroll if search is empty (user just focused)
      // Longer delay for smoother experience
      const timer = setTimeout(() => {
        searchSectionRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            // Only scroll if search section is not visible
            if (y > scaleHeight(100)) {
              scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - scaleHeight(80)), // More gentle offset
                animated: true
              });
            }
          },
          () => {}
        );
      }, 200); // Slightly longer delay for smoother feel
      
      return () => clearTimeout(timer);
    }
  }, [isKeyboardVisible, searchQuery]);

  // Handle search
  const handleSearchFocus = useCallback(() => {
    setIsSearching(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearching(false);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    Keyboard.dismiss();
    // Gently scroll back to top when search is cleared
    if (scrollViewRef.current) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: 0,
          animated: true
        });
      }, 250); // Longer delay for smoother transition
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Dismiss keyboard when scrolling
  const handleScrollBeginDrag = useCallback(() => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    }
  }, [isKeyboardVisible]);

  // Gently scroll to results when user starts typing (only once per session)
  const hasAutoScrolledRef = useRef(false);
  
  useEffect(() => {
    if (searchQuery && scrollViewRef.current && isKeyboardVisible && !hasAutoScrolledRef.current) {
      // Only auto-scroll once when user starts typing
      hasAutoScrolledRef.current = true;
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: scaleHeight(350), // More gentle position
          animated: true
        });
      }, 300); // Longer delay for smoother feel
      
      return () => clearTimeout(timer);
    }
    
    // Reset when search is cleared
    if (!searchQuery) {
      hasAutoScrolledRef.current = false;
    }
  }, [searchQuery, isKeyboardVisible]);



  // Removed loading screen - show content immediately


  // Render empty state (UPDATED FOR NEW 3-TAB STRUCTURE)
  const renderEmptyState = () => {
    const getEmptyStateContent = () => {
      if (activeTab === 'activities') {
        if (activityType === 'events') {
          return { icon: 'calendar-outline', type: 'events', message: 'No events match your criteria' };
        } else if (activityType === 'pings') {
          return { icon: 'flash-outline', type: 'pings', message: 'No pings available right now' };
        } else {
          return { icon: 'calendar-outline', type: 'activities', message: 'No activities match your criteria' };
        }
      } else if (activeTab === 'social') {
        if (socialType === 'users') {
          return { icon: 'people-outline', type: 'users', message: 'No users found nearby' };
        } else if (socialType === 'groups') {
          return { icon: 'people-circle-outline', type: 'groups', message: 'No groups found' };
        } else {
          return { icon: 'people-circle-outline', type: 'people & groups', message: 'No users or groups found' };
        }
      } else {
        return { icon: 'search-outline', type: 'content', message: 'No content found' };
      }
    };

    const { icon, type, message } = getEmptyStateContent();

    return (
      <View style={styles.emptyStateContainer}>
        <View style={[styles.emptyStateIconContainer, {
          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.12)"
        }]}>
          <Ionicons 
            name={icon as any} 
            size={scale(48)} 
            color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
          />
        </View>
        <Text style={[styles.emptyStateTitle, { 
          color: theme === "light" ? "#1e293b" : "#f1f5f9" 
        }]}>
          {selectedCategory 
            ? `No ${type} in ${PING_CATEGORIES.find((cat: any) => cat.id === selectedCategory)?.label}`
            : message
          }
        </Text>
        <Text style={[styles.emptyStateSubtitle, { 
          color: theme === "light" ? "#64748b" : "#94a3b8" 
        }]}>
          {selectedCategory || searchQuery.trim() 
            ? 'Try adjusting your search or filters' 
            : 'Check back later for new content'
          }
        </Text>
      </View>
    );
  };



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={[]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          
          {/* Header Section */}
          <View style={styles.headerContainer}>
            <TopBar 
              showNotifications={notificationCount > 0}
              notificationCount={notificationCount}
            />
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onScrollBeginDrag={handleScrollBeginDrag}
            bounces={true}
            alwaysBounceVertical={true}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#37a4c8"
                colors={["#37a4c8"]}
                progressBackgroundColor={theme === "light" ? "#ffffff" : "#1a1a1a"}
              />
            }
          >
          {/* Map Section - with subtle scale animation when keyboard appears */}
          <Animated.View 
            style={[
              styles.mapContainer, 
              {
                shadowColor: theme === "light" ? "#000000" : "#37a4c8",
                transform: [{ scale: contentScaleAnim }]
              }
            ]}
          >
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
              pings={filteredItems.filter(item => item.type === 'ping').map(item => {
                const pingData = item.data as Ping;
                return {
                  id: pingData.id,
                  name: pingData.title,
                  latitude: pingData.coordinates?.latitude?.toString() || '0',
                  longitude: pingData.coordinates?.longitude?.toString() || '0',
                  participants: pingData.participants || []
                };
              })}
              onEventPress={(event) => router.push("/event/" + event.id)}
              onPingPress={(ping) => router.push("/ping/" + ping.id)}
              currentUserId={user?.uid}
            />
          </Animated.View>

          {/* Main Content Section */}
          <View style={styles.mainContent}>
            {/* Search and Filter Section */}
            <View 
              ref={searchSectionRef}
              style={styles.searchFilterSection}
              collapsable={false}
            >
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchFocus={handleSearchFocus}
                onSearchBlur={handleSearchBlur}
                onSearchClear={handleSearchClear}
              />

              {/* Main Tabs */}
              <View style={styles.filterGroup}>
                <TabBar
                  activeTab={activeTab}
                  onTabSelect={handleTabSelect}
                />
              </View>

              {/* Quick Filter Pills - Time & Distance Presets (ONLY FOR ACTIVITIES TAB) */}
              {activeTab === 'activities' && (
                <View style={styles.quickFiltersContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickFiltersScrollContent}
                  >
                    {/* Time Filters */}
                    <TouchableOpacity
                      style={[
                        styles.quickFilterPill,
                        timeFilter === 'all' && styles.quickFilterPillActive,
                        { 
                          backgroundColor: timeFilter === 'all' 
                            ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                            : (theme === "light" ? "#f1f5f9" : "#1e293b"),
                          borderColor: timeFilter === 'all' ? "#37a4c8" : (theme === "light" ? "#e2e8f0" : "#334155")
                        }
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setTimeFilter('all');
                      }}
                    >
                      <Ionicons 
                        name="time-outline" 
                        size={16} 
                        color={timeFilter === 'all' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                      />
                      <Text style={[
                        styles.quickFilterPillText,
                        { color: timeFilter === 'all' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                      ]}>
                        All Time
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickFilterPill,
                        timeFilter === 'now' && styles.quickFilterPillActive,
                        { 
                          backgroundColor: timeFilter === 'now' 
                            ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                            : (theme === "light" ? "#f1f5f9" : "#1e293b"),
                          borderColor: timeFilter === 'now' ? "#37a4c8" : (theme === "light" ? "#e2e8f0" : "#334155")
                        }
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setTimeFilter('now');
                      }}
                    >
                      <Ionicons 
                        name="flash" 
                        size={16} 
                        color={timeFilter === 'now' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                      />
                      <Text style={[
                        styles.quickFilterPillText,
                        { color: timeFilter === 'now' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                      ]}>
                        Now
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickFilterPill,
                        timeFilter === 'today' && styles.quickFilterPillActive,
                        { 
                          backgroundColor: timeFilter === 'today' 
                            ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                            : (theme === "light" ? "#f1f5f9" : "#1e293b"),
                          borderColor: timeFilter === 'today' ? "#37a4c8" : (theme === "light" ? "#e2e8f0" : "#334155")
                        }
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setTimeFilter('today');
                      }}
                    >
                      <Ionicons 
                        name="calendar" 
                        size={16} 
                        color={timeFilter === 'today' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                      />
                      <Text style={[
                        styles.quickFilterPillText,
                        { color: timeFilter === 'today' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                      ]}>
                        Today
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickFilterPill,
                        timeFilter === 'week' && styles.quickFilterPillActive,
                        { 
                          backgroundColor: timeFilter === 'week' 
                            ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                            : (theme === "light" ? "#f1f5f9" : "#1e293b"),
                          borderColor: timeFilter === 'week' ? "#37a4c8" : (theme === "light" ? "#e2e8f0" : "#334155")
                        }
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setTimeFilter('week');
                      }}
                    >
                      <Ionicons 
                        name="calendar-outline" 
                        size={16} 
                        color={timeFilter === 'week' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                      />
                      <Text style={[
                        styles.quickFilterPillText,
                        { color: timeFilter === 'week' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                      ]}>
                        This Week
                      </Text>
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={[styles.filterDivider, { backgroundColor: theme === "light" ? "#e2e8f0" : "#334155" }]} />

                    {/* Distance Presets */}
                    <TouchableOpacity
                      style={[
                        styles.quickFilterPill,
                        distancePreset === 'nearby' && styles.quickFilterPillActive,
                        { 
                          backgroundColor: distancePreset === 'nearby' 
                            ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                            : (theme === "light" ? "#f1f5f9" : "#1e293b"),
                          borderColor: distancePreset === 'nearby' ? "#37a4c8" : (theme === "light" ? "#e2e8f0" : "#334155")
                        }
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setDistancePreset('nearby');
                      }}
                    >
                      <Ionicons 
                        name="locate" 
                        size={16} 
                        color={distancePreset === 'nearby' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                      />
                      <Text style={[
                        styles.quickFilterPillText,
                        { color: distancePreset === 'nearby' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                      ]}>
                        Nearby (5mi)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickFilterPill,
                        distancePreset === 'local' && styles.quickFilterPillActive,
                        { 
                          backgroundColor: distancePreset === 'local' 
                            ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                            : (theme === "light" ? "#f1f5f9" : "#1e293b"),
                          borderColor: distancePreset === 'local' ? "#37a4c8" : (theme === "light" ? "#e2e8f0" : "#334155")
                        }
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setDistancePreset('local');
                      }}
                    >
                      <Ionicons 
                        name="navigate" 
                        size={16} 
                        color={distancePreset === 'local' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                      />
                      <Text style={[
                        styles.quickFilterPillText,
                        { color: distancePreset === 'local' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                      ]}>
                        Local (20mi)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.quickFilterPill,
                        distancePreset === 'regional' && styles.quickFilterPillActive,
                        { 
                          backgroundColor: distancePreset === 'regional' 
                            ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                            : (theme === "light" ? "#f1f5f9" : "#1e293b"),
                          borderColor: distancePreset === 'regional' ? "#37a4c8" : (theme === "light" ? "#e2e8f0" : "#334155")
                        }
                      ]}
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setDistancePreset('regional');
                      }}
                    >
                      <Ionicons 
                        name="map" 
                        size={16} 
                        color={distancePreset === 'regional' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                      />
                      <Text style={[
                        styles.quickFilterPillText,
                        { color: distancePreset === 'regional' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                      ]}>
                        Regional (50mi)
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}

              {/* Activity Type Sub-Filter (for 'activities' tab) */}
              {activeTab === 'activities' && (
                <View style={styles.activityTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.activityTypeButton,
                      activityType === 'all' && styles.activityTypeButtonActive,
                      { 
                        backgroundColor: activityType === 'all' 
                          ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                          : (theme === "light" ? "transparent" : "transparent"),
                        borderColor: activityType === 'all' ? "#37a4c8" : (theme === "light" ? "#cbd5e1" : "#475569")
                      }
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setActivityType('all');
                    }}
                  >
                    <Text style={[
                      styles.activityTypeButtonText,
                      { color: activityType === 'all' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                    ]}>
                      All Activities
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.activityTypeButton,
                      activityType === 'events' && styles.activityTypeButtonActive,
                      { 
                        backgroundColor: activityType === 'events' 
                          ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                          : (theme === "light" ? "transparent" : "transparent"),
                        borderColor: activityType === 'events' ? "#37a4c8" : (theme === "light" ? "#cbd5e1" : "#475569")
                      }
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setActivityType('events');
                    }}
                  >
                    <Ionicons 
                      name="calendar" 
                      size={14} 
                      color={activityType === 'events' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                    />
                    <Text style={[
                      styles.activityTypeButtonText,
                      { color: activityType === 'events' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                    ]}>
                      Events Only
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.activityTypeButton,
                      activityType === 'pings' && styles.activityTypeButtonActive,
                      { 
                        backgroundColor: activityType === 'pings' 
                          ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                          : (theme === "light" ? "transparent" : "transparent"),
                        borderColor: activityType === 'pings' ? "#37a4c8" : (theme === "light" ? "#cbd5e1" : "#475569")
                      }
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setActivityType('pings');
                    }}
                  >
                    <Ionicons 
                      name="flash" 
                      size={14} 
                      color={activityType === 'pings' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                    />
                    <Text style={[
                      styles.activityTypeButtonText,
                      { color: activityType === 'pings' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                    ]}>
                      Pings Only
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Social Type Sub-Filter (for 'social' tab) */}
              {activeTab === 'social' && (
                <View style={styles.activityTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.activityTypeButton,
                      socialType === 'all' && styles.activityTypeButtonActive,
                      { 
                        backgroundColor: socialType === 'all' 
                          ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                          : (theme === "light" ? "transparent" : "transparent"),
                        borderColor: socialType === 'all' ? "#37a4c8" : (theme === "light" ? "#cbd5e1" : "#475569")
                      }
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setSocialType('all');
                    }}
                  >
                    <Text style={[
                      styles.activityTypeButtonText,
                      { color: socialType === 'all' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                    ]}>
                      Everyone
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.activityTypeButton,
                      socialType === 'users' && styles.activityTypeButtonActive,
                      { 
                        backgroundColor: socialType === 'users' 
                          ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                          : (theme === "light" ? "transparent" : "transparent"),
                        borderColor: socialType === 'users' ? "#37a4c8" : (theme === "light" ? "#cbd5e1" : "#475569")
                      }
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setSocialType('users');
                    }}
                  >
                    <Ionicons 
                      name="person" 
                      size={14} 
                      color={socialType === 'users' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                    />
                    <Text style={[
                      styles.activityTypeButtonText,
                      { color: socialType === 'users' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                    ]}>
                      Users Only
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.activityTypeButton,
                      socialType === 'groups' && styles.activityTypeButtonActive,
                      { 
                        backgroundColor: socialType === 'groups' 
                          ? (theme === "light" ? "#37a4c8" : "#37a4c8")
                          : (theme === "light" ? "transparent" : "transparent"),
                        borderColor: socialType === 'groups' ? "#37a4c8" : (theme === "light" ? "#cbd5e1" : "#475569")
                      }
                    ]}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setSocialType('groups');
                    }}
                  >
                    <Ionicons 
                      name="people" 
                      size={14} 
                      color={socialType === 'groups' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8")} 
                    />
                    <Text style={[
                      styles.activityTypeButtonText,
                      { color: socialType === 'groups' ? "#ffffff" : (theme === "light" ? "#64748b" : "#94a3b8") }
                    ]}>
                      Groups Only
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Advanced Filters Toggle & Categories */}
              <View style={styles.advancedFiltersHeader}>
                <TouchableOpacity
                  style={styles.advancedFiltersToggle}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowFilters(!showFilters);
                  }}
                >
                  <Text style={[
                    styles.advancedFiltersToggleText,
                    { color: theme === "light" ? "#64748b" : "#94a3b8" }
                  ]}>
                    {showFilters ? 'Hide' : 'Show'} Advanced Filters
                  </Text>
                  <Ionicons 
                    name={showFilters ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color={theme === "light" ? "#64748b" : "#94a3b8"} 
                  />
                </TouchableOpacity>

                {hasActiveFilters && (
                  <TouchableOpacity
                    style={[
                      styles.clearFiltersButton,
                      { 
                        backgroundColor: theme === "light" ? "#fee2e2" : "#450a0a",
                        borderColor: theme === "light" ? "#fecaca" : "#7f1d1d"
                      }
                    ]}
                    onPress={clearAllFilters}
                  >
                    <Ionicons 
                      name="close-circle" 
                      size={16} 
                      color={theme === "light" ? "#dc2626" : "#f87171"} 
                    />
                    <Text style={[
                      styles.clearFiltersButtonText,
                      { color: theme === "light" ? "#dc2626" : "#f87171" }
                    ]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Collapsible Advanced Filters */}
              {showFilters && (
                <View style={styles.advancedFiltersContainer}>
                  <CategoryBar
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                  />

                  <FilterBar
                    showAvailableOnly={showAvailableOnly}
                    filterDistance={filterDistance}
                    onToggleAvailableOnly={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowAvailableOnly(!showAvailableOnly);
                    }}
                    onDistanceChange={setFilterDistance}
                  />
                </View>
              )}

              {/* Active Filters Chips */}
              {hasActiveFilters && (
                <View style={styles.activeFiltersContainer}>
                  <Text style={[
                    styles.activeFiltersLabel,
                    { color: theme === "light" ? "#64748b" : "#94a3b8" }
                  ]}>
                    Active Filters:
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.activeFiltersScrollContent}
                  >
                    {selectedCategory && (
                      <TouchableOpacity
                        style={[
                          styles.activeFilterChip,
                          { 
                            backgroundColor: theme === "light" ? "#dbeafe" : "#1e3a8a",
                            borderColor: theme === "light" ? "#93c5fd" : "#3b82f6"
                          }
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setSelectedCategory(null);
                        }}
                      >
                        <Text style={[
                          styles.activeFilterChipText,
                          { color: theme === "light" ? "#1e40af" : "#93c5fd" }
                        ]}>
                          {PING_CATEGORIES.find((cat: any) => cat.id === selectedCategory)?.label}
                        </Text>
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={theme === "light" ? "#1e40af" : "#93c5fd"} 
                        />
                      </TouchableOpacity>
                    )}

                    {showAvailableOnly && (
                      <TouchableOpacity
                        style={[
                          styles.activeFilterChip,
                          { 
                            backgroundColor: theme === "light" ? "#dcfce7" : "#14532d",
                            borderColor: theme === "light" ? "#86efac" : "#16a34a"
                          }
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setShowAvailableOnly(false);
                        }}
                      >
                        <Text style={[
                          styles.activeFilterChipText,
                          { color: theme === "light" ? "#166534" : "#86efac" }
                        ]}>
                          Available Now
                        </Text>
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={theme === "light" ? "#166534" : "#86efac"} 
                        />
                      </TouchableOpacity>
                    )}

                    {timeFilter !== 'all' && (
                      <TouchableOpacity
                        style={[
                          styles.activeFilterChip,
                          { 
                            backgroundColor: theme === "light" ? "#fef3c7" : "#713f12",
                            borderColor: theme === "light" ? "#fcd34d" : "#f59e0b"
                          }
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setTimeFilter('all');
                        }}
                      >
                        <Text style={[
                          styles.activeFilterChipText,
                          { color: theme === "light" ? "#92400e" : "#fcd34d" }
                        ]}>
                          {timeFilter === 'now' ? 'Happening Now' : timeFilter === 'today' ? 'Today' : 'This Week'}
                        </Text>
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={theme === "light" ? "#92400e" : "#fcd34d"} 
                        />
                      </TouchableOpacity>
                    )}

                    {activeTab === 'activities' && activityType !== 'all' && (
                      <TouchableOpacity
                        style={[
                          styles.activeFilterChip,
                          { 
                            backgroundColor: theme === "light" ? "#e9d5ff" : "#581c87",
                            borderColor: theme === "light" ? "#c084fc" : "#a855f7"
                          }
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setActivityType('all');
                        }}
                      >
                        <Text style={[
                          styles.activeFilterChipText,
                          { color: theme === "light" ? "#6b21a8" : "#e9d5ff" }
                        ]}>
                          {activityType === 'events' ? 'Events Only' : 'Pings Only'}
                        </Text>
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={theme === "light" ? "#6b21a8" : "#e9d5ff"} 
                        />
                      </TouchableOpacity>
                    )}

                    {activeTab === 'social' && socialType !== 'all' && (
                      <TouchableOpacity
                        style={[
                          styles.activeFilterChip,
                          { 
                            backgroundColor: theme === "light" ? "#fce7f3" : "#831843",
                            borderColor: theme === "light" ? "#f9a8d4" : "#ec4899"
                          }
                        ]}
                        onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setSocialType('all');
                        }}
                      >
                        <Text style={[
                          styles.activeFilterChipText,
                          { color: theme === "light" ? "#9f1239" : "#fce7f3" }
                        ]}>
                          {socialType === 'users' ? 'Users Only' : 'Groups Only'}
                        </Text>
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={theme === "light" ? "#9f1239" : "#fce7f3"} 
                        />
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Results Summary */}
            <View style={styles.resultsSummaryContainer}>
              <Text style={[styles.resultsSummaryText, { 
                color: theme === "light" ? "#64748B" : "#94A3B8" 
              }]}>
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} found
              </Text>
            </View>

            {/* Results List */}
            <View style={styles.resultsContainer}>
              {paginatedResults.map((result, index) => {
                if (result.kind === 'user') {
                  return (
                    <View key={`user-${result.user.id}`} style={styles.resultItem}>
                      <UserCard 
                        user={result.user} 
                        isAvailable={isUserCurrentlyAvailable(result.user.availabilitySchedule)}
                      />
                    </View>
                  );
                } else if (result.kind === 'activity') {
                  return (
                    <View key={`${result.item.type}-${result.item.id}`} style={styles.resultItem}>
                      <ActivityCard item={result.item} />
                    </View>
                  );
                } else if (result.kind === 'group') {
                  return (
                    <View key={`group-${result.group.id}`} style={styles.resultItem}>
                      <GroupCard group={result.group} currentUserId={user?.uid} />
                    </View>
                  );
                } else {
                  return null;
                }
              })}
            </View>

            {/* Load More Section */}
            {resultsToShow < searchResults.length && (
              <View style={styles.loadMoreSection}>
                <TouchableOpacity
                  style={[
                    styles.loadMoreButton,
                    {
                      backgroundColor: theme === "light" ? "#37a4c8" : "#1a1a1a",
                      borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                      shadowColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                    }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setResultsToShow(r => Math.min(r + 10, searchResults.length))}
                >
                  <View style={styles.loadMoreButtonContent}>
                    <Ionicons 
                      name="chevron-down" 
                      size={20} 
                      color={theme === "light" ? "#ffffff" : "#37a4c8"} 
                    />
                    <Text style={[
                      styles.loadMoreButtonText,
                      { color: theme === "light" ? "#ffffff" : "#37a4c8" }
                    ]}>
                      Load More ({searchResults.length - resultsToShow} remaining)
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Loading State */}
            {isLoadingMore && (
              <View style={styles.loadingSection}>
                <ModernLoadingIndicator color="#37a4c8" />
                <Text style={[styles.loadingText, { 
                  color: theme === "light" ? "#64748B" : "#94A3B8" 
                }]}>
                  Loading more results...
                </Text>
              </View>
            )}

            {/* Empty State */}
            {searchResults.length === 0 && hasInitiallyLoaded && (
              <View style={styles.emptyStateSection}>
                {renderEmptyState()}
              </View>
            )}
          </View>
          </ScrollView>
        </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(8),
    paddingBottom: scaleHeight(12),
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: scaleHeight(80),
  },
  mapContainer: {
    height: scaleHeight(340),
    marginHorizontal: scaleWidth(16),
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(24),
    borderRadius: scale(20),
    overflow: 'hidden',
    elevation: 6,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.12,
    shadowRadius: scale(12),
  },
  mainContent: {
    paddingHorizontal: scaleWidth(16),
  },
  searchFilterSection: {
    marginBottom: scaleHeight(24),
  },
  filterGroup: {
    marginTop: scaleHeight(16),
    gap: scale(12),
  },
  resultsSummaryContainer: {
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(20),
    paddingHorizontal: scaleWidth(4),
  },
  resultsSummaryText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  resultsContainer: {
    gap: scale(16),
  },
  resultItem: {
    marginBottom: 0,
  },
  loadMoreSection: {
    marginTop: scaleHeight(32),
    marginBottom: scaleHeight(24),
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(32),
    borderRadius: scale(16),
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: scale(8),
    minWidth: scaleWidth(200),
  },
  loadMoreButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  loadMoreButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scaleHeight(32),
    gap: scale(12),
  },
  loadingText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  emptyStateSection: {
    marginTop: scaleHeight(40),
    marginBottom: scaleHeight(40),
  },
  headerSection: {
    marginBottom: scaleHeight(24),
    paddingHorizontal: scaleWidth(4),
  },
  headerTitle: {
    fontSize: scaleFont(28),
    fontWeight: '700',
    marginBottom: scaleHeight(8),
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: scaleFont(16),
    fontWeight: '400',
    lineHeight: scale(22),
    marginBottom: scaleHeight(12),
  },
  resultsCountContainer: {
    marginBottom: scaleHeight(16),
    paddingHorizontal: scaleWidth(4),
  },
  resultsCountText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: scaleHeight(100),
  },
  joinButton: {
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(16),
    borderRadius: scale(12),
    backgroundColor: '#37a4c8',
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.2,
    shadowRadius: scale(4),
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(60),
    paddingHorizontal: scaleWidth(32),
  },
  emptyStateIconContainer: {
    width: scaleWidth(96),
    height: scaleHeight(96),
    borderRadius: scale(48),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(24),
  },
  emptyStateTitle: {
    fontSize: scaleFont(22),
    fontWeight: '700',
    marginBottom: scaleHeight(12),
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: scale(28),
  },
  emptyStateSubtitle: {
    fontSize: scaleFont(16),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: scale(24),
    letterSpacing: 0.1,
    maxWidth: scaleWidth(300),
  },
  // Legacy styles - kept for compatibility
  itemSeparator: {
    height: scaleHeight(16),
  },
  // New improved filtering UI styles
  quickFiltersContainer: {
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(12),
  },
  quickFiltersScrollContent: {
    paddingHorizontal: scaleWidth(4),
    gap: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(8),
    borderRadius: scale(20),
    borderWidth: 1.5,
    gap: scale(6),
    elevation: 1,
    shadowOffset: { width: 0, height: scale(1) },
    shadowOpacity: 0.05,
    shadowRadius: scale(2),
  },
  quickFilterPillActive: {
    elevation: 3,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.15,
    shadowRadius: scale(4),
  },
  quickFilterPillText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  filterDivider: {
    width: scaleWidth(1.5),
    height: scaleHeight(24),
    marginHorizontal: scaleWidth(4),
    borderRadius: scale(1),
  },
  activityTypeContainer: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(8),
  },
  activityTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(12),
    borderRadius: scale(12),
    borderWidth: 1.5,
    gap: scale(6),
  },
  activityTypeButtonActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(3),
  },
  activityTypeButtonText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  advancedFiltersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scaleHeight(16),
    marginBottom: scaleHeight(8),
  },
  advancedFiltersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  advancedFiltersToggleText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: scale(12),
    borderWidth: 1,
    gap: scale(6),
  },
  clearFiltersButtonText: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  advancedFiltersContainer: {
    marginTop: scaleHeight(12),
    gap: scale(12),
  },
  activeFiltersContainer: {
    marginTop: scaleHeight(16),
  },
  activeFiltersLabel: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: scaleHeight(8),
  },
  activeFiltersScrollContent: {
    paddingHorizontal: scaleWidth(2),
    gap: scale(8),
    flexDirection: 'row',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: scale(16),
    borderWidth: 1,
    gap: scale(6),
  },
  activeFilterChipText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
}); 