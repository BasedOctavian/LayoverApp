import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, FlatList, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { collection, query, where, orderBy, limit, onSnapshot, getDocs, doc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { haversineDistance } from '../utils/haversineDistance';
import PingEventModal from './PingEventModal';
import { LinearGradient } from 'expo-linear-gradient';
import useAuth from '../hooks/auth';
import useDashboardActivity from '../hooks/useDashboardActivity';

const { width: screenWidth } = Dimensions.get('window');

interface PingActivity {
  id: string;
  title: string;
  description: string;
  category: string;
  template: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  creatorName: string;
  creatorId: string;
  duration: string;
  maxParticipants: string;
  participantCount: number;
  participants?: string[];
  pingType: string;
  status: string;
  createdAt: any;
  connectionIntents: string[];
  type?: 'ping';
}

interface EventActivity {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  creatorName: string;
  creatorId: string;
  startTime: any;
  participantCount: number;
  participants?: string[];
  pingType?: string;
  maxParticipants?: string;
  status: string;
  createdAt: any;
  eventImage?: string;
  type?: 'event';
}

interface ActivityCardProps {
  userLocation: { lat: number; long: number } | null;
  userId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  data: {
    type:
      | "chat"
      | "eventChat"
      | "match"
      | "ping_invitation"
      | "ping_event"
      | "join_request"
      | "member_joined"
      | "join_request_approved"
      | "join_request_rejected"
      | "group_invite"
      | "promoted_to_organizer"
      | "new_post"
      | "new_proposal"
      | "proposal_confirmed";
    chatId?: string;
    eventId?: string;
    matchedUserId?: string;
    matchedUserName?: string;
    pingId?: string;
    pingTitle?: string;
    inviterId?: string;
    inviterName?: string;
    pingLocation?: string;
    pingCategory?: string;
    creatorName?: string;
    pingDescription?: string;
    distanceMiles?: number;
    groupId?: string;
    actorId?: string;
    invitedBy?: string;
    postId?: string;
    proposalId?: string;
  };
  timestamp: any;
  read: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Wellness':
      return <Ionicons name="fitness" size={20} color="#38a5c9" />;
    case 'Food & Drink':
      return <Ionicons name="restaurant" size={20} color="#38a5c9" />;
    case 'Entertainment':
      return <Ionicons name="game-controller" size={20} color="#38a5c9" />;
    case 'Travel Tips':
      return <Ionicons name="airplane" size={20} color="#38a5c9" />;
    case 'Activity':
      return <Ionicons name="basketball" size={20} color="#38a5c9" />;
    case 'Networking':
      return <Ionicons name="people" size={20} color="#38a5c9" />;
    case 'Social':
      return <Ionicons name="happy" size={20} color="#38a5c9" />;
    case 'Learning':
      return <Ionicons name="school" size={20} color="#38a5c9" />;
    case 'Business':
      return <Ionicons name="briefcase" size={20} color="#38a5c9" />;
    case 'Misc':
      return <Ionicons name="ellipsis-horizontal" size={20} color="#38a5c9" />;
    default:
      return <Ionicons name="calendar" size={20} color="#38a5c9" />;
  }
};

const getTemplateIcon = (template: string) => {
  const name = template.toLowerCase();
  if (name.includes('comedy')) {
    return <Ionicons name="happy" size={20} color="#38a5c9" />;
  }
  if (name.includes('coffee') || name.includes('drink')) {
    return <Ionicons name="cafe" size={20} color="#38a5c9" />;
  }
  if (name.includes('food') || name.includes('dinner') || name.includes('lunch')) {
    return <Ionicons name="restaurant" size={20} color="#38a5c9" />;
  }
  if (name.includes('game') || name.includes('gaming')) {
    return <Ionicons name="game-controller" size={20} color="#38a5c9" />;
  }
  if (name.includes('music') || name.includes('concert')) {
    return <Ionicons name="musical-notes" size={20} color="#38a5c9" />;
  }
  if (name.includes('dance') || name.includes('club')) {
    return <Ionicons name="musical-note" size={20} color="#38a5c9" />;
  }
  if (name.includes('sport') || name.includes('fitness')) {
    return <Ionicons name="fitness" size={20} color="#38a5c9" />;
  }
  if (name.includes('work') || name.includes('business')) {
    return <Ionicons name="briefcase" size={20} color="#38a5c9" />;
  }
  return <Ionicons name="calendar" size={20} color="#38a5c9" />;
};

const formatDistance = (userLat: number, userLong: number, pingLat: number, pingLong: number): string => {
  const distanceKm = haversineDistance(userLat, userLong, pingLat, pingLong);
  const distanceMiles = distanceKm * 0.621371;
  return `${distanceMiles.toFixed(1)} mi`;
};

const formatTimeAgo = (timestamp: any): string => {
  if (!timestamp) return 'Just now';
  
  const now = new Date();
  const created = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return created.toLocaleDateString();
};

const formatNotificationTime = (timestamp: any): string => {
  try {
    if (!timestamp) return "Just now";

    // Handle Firestore timestamp
    if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return formatTimeAgo(timestamp);
    }

    // Handle regular Date object or other formats
    return formatTimeAgo(timestamp);
  } catch (error) {
    console.warn("Error formatting notification timestamp:", error);
    return "Just now";
  }
};

// Helper to calculate ping end time from createdAt and duration
const getPingEndTime = (createdAt: any, duration: string): Date | null => {
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
  } else if (d.includes('all day')) {
    minutes = 24 * 60; // 24 hours
  } else if (!isNaN(Number(d))) {
    minutes = Number(d);
  }
  
  return new Date(start.getTime() + minutes * 60000);
};

const ModernLoadingDot = ({ color }: { color: string }) => {
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

export default function ActivityCard({ userLocation, userId, isCollapsed, onToggleCollapse }: ActivityCardProps) {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const router = useRouter();
  const [pings, setPings] = useState<PingActivity[]>([]);
  const [events, setEvents] = useState<EventActivity[]>([]);
  const [activities, setActivities] = useState<(PingActivity | EventActivity)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPingModal, setShowPingModal] = useState(false);
  const [userConnections, setUserConnections] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const panRef = useRef(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

  // Fetch dashboard activity counts
  const { activity: dashboardActivity, loading: activityLoading } = useDashboardActivity(userId, userLocation);

  // Fetch user connections for filtering friends-only content (with caching)
  useEffect(() => {
    let mounted = true;
    
    const fetchUserConnections = async () => {
      if (!user?.uid) return;
      
      try {
        const connectedUserIds = new Set<string>();
        
        // Query connections where user is a participant with a limit
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

  // Fetch pings (optimized with smaller limit for faster initial load)
  useEffect(() => {
    if (!userLocation) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'pings'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(5) // Reduced from 10 to 5 for faster loading
      ),
      (snapshot) => {
        try {
          const pingsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            type: 'ping',
          })) as PingActivity[];
          // Filter by distance, time, and privacy settings
          const now = new Date();
          const filtered = pingsData.filter(activity => {
            if (!activity.coordinates) return false;
            
            // Filter by privacy settings
            if (activity.pingType === 'friends-only') {
              // Friends-only: Only show to creator, their active connections, or existing participants
              // Non-connected users will not see these pings at all
              if (!user?.uid) return false; // Hide if no user ID
              const isCreator = user.uid === activity.creatorId;
              const isConnected = userConnections.has(activity.creatorId); // Check if user has active connection with creator
              const isParticipant = activity.participants?.includes(user.uid);
              if (!isCreator && !isConnected && !isParticipant) {
                return false; // Hide from non-connected, non-participant users
              }
            } else if (activity.pingType === 'invite-only') {
              // Invite-only: Only show to creator or participants (no connection check needed)
              if (!user?.uid) return false; // Hide if no user ID
              if (user.uid !== activity.creatorId && !activity.participants?.includes(user.uid)) {
                return false;
              }
            }
            
            // Check distance
            const distanceKm = haversineDistance(
              userLocation.lat,
              userLocation.long,
              activity.coordinates.latitude,
              activity.coordinates.longitude
            );
            const distanceMiles = distanceKm * 0.621371;
            if (distanceMiles > 50) return false;
            
            // Check if ping is still active based on duration
            const endTime = getPingEndTime(activity.createdAt, activity.duration);
            if (!endTime) return false; // Skip if we can't calculate end time
            
            // Add a small buffer (30 minutes) to allow for some flexibility
            const bufferMs = 30 * 60 * 1000; // 30 minutes in milliseconds
            const isStillActive = now.getTime() < (endTime.getTime() + bufferMs);
            
            if (!isStillActive) {
              console.log('[ActivityCard] Ping expired:', activity.title, 'End time:', endTime, 'Now:', now);
              return false;
            }
            
            // Filter out full pings (unless user is already a participant or creator)
            if (activity.maxParticipants && !activity.maxParticipants.toLowerCase().includes('unlimited')) {
              const maxNum = parseInt(activity.maxParticipants.replace(/\D/g, ''));
              if (!isNaN(maxNum)) {
                const currentCount = activity.participantCount || activity.participants?.length || 0;
                const isFull = currentCount >= maxNum;
                
                // Still show if user is creator or already participating
                if (isFull && user?.uid && user.uid !== activity.creatorId && !activity.participants?.includes(user.uid)) {
                  return false; // Hide full pings from non-participants
                }
              }
            }
            
            return true;
          });
          setPings(filtered);
        } catch (err) {
          setError('Failed to load pings');
        }
      },
      (err) => {
        setError('Failed to load pings');
      }
    );
    return () => unsubscribe();
  }, [userLocation, user?.uid, userConnections]);

  // Fetch events (optimized with smaller limit for faster initial load)
  useEffect(() => {
    if (!userLocation) return;
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'events'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(5) // Reduced from 10 to 5 for faster loading
      ),
      (snapshot) => {
        try {
          console.log('[ActivityCard] Events snapshot size:', snapshot.size);
          const eventsData = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('[ActivityCard] Event doc:', doc.id, data);
            return {
              id: doc.id,
              title: data.name || data.title || '',
              description: (data.description || '').trim(),
              category: data.category || '',
              location: data.location || '',
              coordinates: data.coordinates || (data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : undefined),
              creatorName: data.organizerName || data.creatorName || '',
              creatorId: data.organizer || data.creatorId || '',
              startTime: data.startTime,
              participantCount: Array.isArray(data.attendees) ? data.attendees.length : (data.participantCount || 0),
              participants: Array.isArray(data.attendees) ? data.attendees : (data.participants || []),
              pingType: data.pingType || 'open',
              maxParticipants: data.maxParticipants || '',
              status: data.status || '',
              createdAt: data.createdAt,
              eventImage: data.eventImage,
              type: 'event',
            } as EventActivity;
          });
          // Filter by distance, time, and privacy settings
          const now = new Date();
          const filtered = eventsData.filter(event => {
            if (!event.coordinates) {
              console.log('[ActivityCard] Event missing coordinates:', event);
              return false;
            }
            
            // Filter by privacy settings
            const pingType = (event as any).pingType || 'open';
            if (pingType === 'friends-only') {
              // Friends-only: Only show to creator, their active connections, or existing participants
              // Non-connected users will not see these events at all
              if (!user?.uid) return false; // Hide if no user ID
              const isCreator = user.uid === event.creatorId;
              const isConnected = userConnections.has(event.creatorId); // Check if user has active connection with creator
              const participants = (event as any).participants || [];
              const isParticipant = participants.includes(user.uid);
              if (!isCreator && !isConnected && !isParticipant) {
                return false; // Hide from non-connected, non-participant users
              }
            } else if (pingType === 'invite-only') {
              // Invite-only: Only show to creator or participants (no connection check needed)
              if (!user?.uid) return false; // Hide if no user ID
              const participants = (event as any).participants || [];
              if (user.uid !== event.creatorId && !participants.includes(user.uid)) {
                return false;
              }
            }
            
            const distanceKm = haversineDistance(
              userLocation.lat,
              userLocation.long,
              event.coordinates.latitude,
              event.coordinates.longitude
            );
            const distanceMiles = distanceKm * 0.621371;
            let isUpcoming = true;
            if (event.startTime) {
              const start = event.startTime.toDate ? event.startTime.toDate() : new Date(event.startTime);
              isUpcoming = start > now;
              if (!isUpcoming) {
                console.log('[ActivityCard] Event expired:', event.title, start, now);
              }
            }
            if (distanceMiles > 50) {
              console.log('[ActivityCard] Event too far:', event.title, distanceMiles, 'miles');
            }
            return distanceMiles <= 50 && isUpcoming;
          });
          console.log('[ActivityCard] Filtered events:', filtered);
          setEvents(filtered);
        } catch (err) {
          console.error('[ActivityCard] Error processing events:', err);
          setError('Failed to load events');
        }
      },
      (err) => {
        console.error('[ActivityCard] Error fetching events:', err);
        setError('Failed to load events');
      }
    );
    return () => unsubscribe();
  }, [userLocation, user?.uid, userConnections]);

  // Fetch notifications
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        try {
          const userData = docSnapshot.data();
          const notificationList = userData.notifications || [];
          
          // Filter and validate notifications
          const validNotifications = notificationList
            .filter((n: any) => n && n.id && n.title && n.body && n.data && n.timestamp)
            .map((n: any, index: number) => ({
              id: n.id || `notification-${index}`,
              title: n.title || '',
              body: n.body || '',
              data: n.data || { type: 'chat' },
              timestamp: n.timestamp,
              read: n.read !== undefined ? n.read : false,
            } as Notification));

          // Sort by timestamp (newest first)
          const sortedNotifications = [...validNotifications].sort((a, b) => {
            try {
              const timeA = a.timestamp?.seconds || (a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0);
              const timeB = b.timestamp?.seconds || (b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0);
              return timeB - timeA;
            } catch {
              return 0;
            }
          });

          // Keep only the most recent 3 notifications
          setNotifications(sortedNotifications.slice(0, 3));
        } catch (error) {
          console.error('Error processing notifications:', error);
          setNotifications([]);
        }
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Merge and sort activities
  useEffect(() => {
    // Combine, sort by createdAt/startTime (most recent/upcoming first)
    const combined = [...pings, ...events].sort((a, b) => {
      const aTime = a.type === 'event' ? (a.startTime ? (a.startTime.toDate ? a.startTime.toDate() : new Date(a.startTime)) : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt))) : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt));
      const bTime = b.type === 'event' ? (b.startTime ? (b.startTime.toDate ? b.startTime.toDate() : new Date(b.startTime)) : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt))) : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt));
      return bTime.getTime() - aTime.getTime();
    });
    setActivities(combined.slice(0, 3)); // Show top 3
    setLoading(false);
  }, [pings, events]);

  // Auto-scroll effect - changed to 10 seconds
  useEffect(() => {
    if (activities.length <= 1) return;

    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % activities.length);
      }, 10000); // Changed from 5000 to 10000 (10 seconds)
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [activities.length]);

  const resetAutoScroll = () => {
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
    }
    autoScrollRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % activities.length);
    }, 10000);
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const handleGestureStateChange = (event: any) => {
    if (activities.length <= 1) return;

    const { state, translationX } = event.nativeEvent;
    
    if (state === State.END) {
      const swipeThreshold = 80; // Increased threshold for more intentional swipes
      
      if (translationX > swipeThreshold) {
        // Swipe right - go to previous
        setCurrentIndex((prevIndex) => (prevIndex - 1 + activities.length) % activities.length);
      } else if (translationX < -swipeThreshold) {
        // Swipe left - go to next
        setCurrentIndex((prevIndex) => (prevIndex + 1) % activities.length);
      }
      
      // Reset auto-scroll timer
      resetAutoScroll();
      
      // Smooth reset animation
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  };

  // Constrain the translation to prevent cards from going too far
  const constrainedTranslateX = translateX.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: [-50, 0, 50], // Limit the maximum translation
    extrapolate: 'clamp',
  });

  // Add opacity and scale effects for better visual feedback
  const swipeOpacity = translateX.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [0.7, 1, 0.7],
    extrapolate: 'clamp',
  });

  const swipeScale = translateX.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });

  const handleOpenPingModal = () => {
    setShowPingModal(true);
  };

  const handleClosePingModal = () => {
    setShowPingModal(false);
  };

  const handleCreateEvent = () => {
    router.push('/eventCreation');
  };

  if (loading) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
      }]}>
        <View style={styles.loadingContainer}>
          <ModernLoadingDot color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text style={[styles.loadingText, { color: theme === "light" ? "#000000" : "#64748B" }]}>
            Discovering what's happening nearby...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
      }]}>
        <View style={styles.errorContainer}>
          <Ionicons 
            name="alert-circle-outline" 
            size={24} 
            color={theme === "light" ? "#64748B" : "#64748B"} 
          />
          <Text style={[styles.errorText, { color: theme === "light" ? "#64748B" : "#64748B" }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  const renderActivity = (activity: PingActivity | EventActivity) => {
    const distance = activity.coordinates && userLocation 
      ? formatDistance(userLocation.lat, userLocation.long, activity.coordinates.latitude, activity.coordinates.longitude)
      : null;
    const isPing = activity.type === 'ping';
    const isEvent = activity.type === 'event';
    return (
      <View style={styles.activityWrapper}>
        <TouchableOpacity
          style={[styles.activityItem, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
          }]}
          onPress={() => router.push(isPing ? `/ping/${activity.id}` : `/event/${activity.id}`)}
          activeOpacity={0.9}
        >
          {/* Header with enhanced gradient background */}
          <LinearGradient
            colors={theme === "light" 
              ? ['rgba(55, 164, 200, 0.15)', 'rgba(55, 164, 200, 0.08)', 'rgba(55, 164, 200, 0.02)'] 
              : ['rgba(56, 165, 201, 0.15)', 'rgba(56, 165, 201, 0.08)', 'rgba(56, 165, 201, 0.02)']
            }
            style={styles.activityHeaderGradient}
          >
            <View style={styles.activityHeader}>
              <View style={[styles.activityIconContainer, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
              }]}> 
                <LinearGradient
                  colors={theme === "light" 
                    ? ['rgba(55, 164, 200, 0.3)', 'rgba(55, 164, 200, 0.1)'] 
                    : ['rgba(56, 165, 201, 0.3)', 'rgba(56, 165, 201, 0.1)']
                  }
                  style={styles.iconGradient}
                >
                  {isPing ? getTemplateIcon((activity as PingActivity).template) : <Ionicons name="calendar" size={20} color="#38a5c9" />}
                </LinearGradient>
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]} numberOfLines={1} ellipsizeMode="tail">
                  {activity.title}
                </Text>
                <Text style={[styles.activityCreator, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]} numberOfLines={1}>
                  by {activity.creatorName}
                </Text>
                <View style={styles.activityMeta}>
                  {distance && (
                    <View style={[styles.metaBadge, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
                    }]}> 
                      <Ionicons name="location" size={13} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.distanceText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}> {distance} </Text>
                    </View>
                  )}
                  <View style={[styles.metaBadge, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
                  }]}> 
                    <Ionicons name="time" size={13} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.timeText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}> 
                      {isPing ? formatTimeAgo(activity.createdAt) : (activity as EventActivity).startTime ? (() => {
                        const now = new Date();
                        const start = (activity as EventActivity).startTime?.toDate ? (activity as EventActivity).startTime.toDate() : new Date((activity as EventActivity).startTime);
                        const diff = start.getTime() - now.getTime();
                        if (diff <= 0) return 'Now';
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        if (hours > 0) return `${hours}h ${minutes}m`;
                        return `${minutes}m`;
                      })() : 'No start time'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
          {/* Description */}
          {activity.description && (
            <View style={styles.descriptionContainer}>
              <Text style={[styles.activityDescription, { color: theme === "light" ? "#374151" : "#9CA3AF" }]} numberOfLines={2}>
                {activity.description}
              </Text>
            </View>
          )}
          {/* Footer with category and participants */}
          <View style={styles.activityFooterRow}>
            <View style={[
              styles.metaBadge,
              styles.badgeUniform,
              {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
              }
            ]}>
              {getCategoryIcon(activity.category)}
            </View>
            {/* Styled Ping/Event Badge */}
            <View style={[
              styles.metaBadge,
              styles.badgeUniform,
              {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
              }
            ]}>
              <Ionicons name={isPing ? 'flash' : 'calendar'} size={13} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              <Text style={[
                styles.participantText,
                { color: theme === "light" ? "#37a4c8" : "#38a5c9" }
              ]}>{isPing ? 'PING' : 'EVENT'}</Text>
            </View>
            <View style={[
              styles.metaBadge,
              styles.badgeUniform,
              {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
              }
            ]}>
              <Ionicons name="people" size={13} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              {activity.maxParticipants && String(activity.maxParticipants).toLowerCase().includes('unlimited') ? (
                <View style={styles.unlimitedContainer}>
                  <Text
                    style={[
                      styles.participantText,
                      styles.participantTextPolished,
                      { color: theme === "light" ? "#37a4c8" : "#38a5c9" }
                    ]}
                  >
                    {activity.participantCount}
                  </Text>
                  <Ionicons 
                    name="infinite" 
                    size={14} 
                    color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                    style={styles.infiniteIcon}
                  />
                </View>
              ) : (
                <Text
                  style={[
                    styles.participantText,
                    styles.participantTextPolished,
                    { color: theme === "light" ? "#37a4c8" : "#38a5c9" }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {activity.participantCount}{activity.maxParticipants ? `/${String(activity.maxParticipants).replace(/ people/i, '')}` : ''}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
      borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
    }]}> 
      {/* Compact Activity Summary */}
      <View style={[styles.summaryRow, {
        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.06)" : "rgba(56, 165, 201, 0.06)"
      }]}>
        <TouchableOpacity
          style={styles.summaryItemCompact}
          onPress={() => router.push('/chat/chatInbox')}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text style={[styles.summaryCountCompact, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
            {dashboardActivity.pendingConnectionsCount}
          </Text>
          <Text style={[styles.summaryLabelCompact, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
            Pending
          </Text>
        </TouchableOpacity>

        <View style={[styles.summaryDividerVertical, {
          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(56, 165, 201, 0.15)"
        }]} />

        <TouchableOpacity
          style={styles.summaryItemCompact}
          onPress={() => router.push('/chat/chatInbox')}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text style={[styles.summaryCountCompact, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
            {dashboardActivity.unreadMessagesCount}
          </Text>
          <Text style={[styles.summaryLabelCompact, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
            Unread
          </Text>
        </TouchableOpacity>

        <View style={[styles.summaryDividerVertical, {
          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(56, 165, 201, 0.15)"
        }]} />

        <TouchableOpacity
          style={styles.summaryItemCompact}
          onPress={() => router.push('/explore')}
          activeOpacity={0.7}
        >
          <Ionicons name="location-outline" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text style={[styles.summaryCountCompact, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
            {pings.length + events.length}
          </Text>
          <Text style={[styles.summaryLabelCompact, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
            Nearby
          </Text>
        </TouchableOpacity>
      </View>

      {activities.length > 0 ? (
        <View style={styles.activityContainer}>
          {/* Swipeable Activity Content */}
          {activities.length > 1 ? (
            <PanGestureHandler
              ref={panRef}
              onGestureEvent={handleGestureEvent}
              onHandlerStateChange={handleGestureStateChange}
            >
              <Animated.View
                style={{
                  transform: [
                    { translateX: constrainedTranslateX }
                    // Removed scale: swipeScale to prevent card resizing
                  ],
                  opacity: swipeOpacity,
                }}
              >
                {renderActivity(activities[currentIndex])}
              </Animated.View>
            </PanGestureHandler>
          ) : (
            <View>
              {renderActivity(activities[currentIndex])}
            </View>
          )}

          {/* Always show create buttons below activities */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
              }]}
              onPress={handleOpenPingModal}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme === "light" 
                  ? ['#37a4c8', '#2d8bb8'] 
                  : ['#38a5c9', '#2d8bb8']
                }
                style={styles.createButtonGradient}
              >
                <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Ping</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.createButton, { 
                backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
              }]}
              onPress={handleCreateEvent}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme === "light" 
                  ? ['#37a4c8', '#2d8bb8'] 
                  : ['#38a5c9', '#2d8bb8']
                }
                style={styles.createButtonGradient}
              >
                <Ionicons name="calendar" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Move pagination dots below the create buttons */}
          {activities.length > 1 && (
            <View style={styles.paginationContainer}>
              {activities.map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.paginationDot,
                    {
                      backgroundColor: index === currentIndex 
                        ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                        : (theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"),
                      transform: [{
                        scale: index === currentIndex ? 1.2 : 1
                      }]
                    }
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      ) : notifications.length > 0 ? (
        <View style={styles.notificationsContainer}>
          <View style={styles.notificationsHeader}>
            <Ionicons 
              name="notifications-outline" 
              size={16} 
              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
            />
            <Text style={[styles.notificationsHeaderText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
              Recent Notifications
            </Text>
          </View>
          {notifications.map((notification, index) => {
            const getNotificationIcon = () => {
              switch (notification.data.type) {
                case "chat":
                  return "chatbubble-ellipses";
                case "eventChat":
                  return "calendar";
                case "match":
                  return "heart";
                case "ping_invitation":
                  return "people";
                case "ping_event":
                  return "calendar";
                case "join_request":
                  return "person-add";
                case "member_joined":
                  return "people";
                case "join_request_approved":
                  return "checkmark-circle";
                case "join_request_rejected":
                  return "close-circle";
                case "group_invite":
                  return "mail";
                case "promoted_to_organizer":
                  return "star";
                case "new_post":
                  return "document-text";
                case "new_proposal":
                  return "calendar";
                case "proposal_confirmed":
                  return "checkmark-done-circle";
                default:
                  return "notifications";
              }
            };

            const getNotificationColor = () => {
              switch (notification.data.type) {
                case "chat":
                  return "#37a4c8";
                case "eventChat":
                  return "#4CAF50";
                case "match":
                  return "#FF6B6B";
                case "ping_invitation":
                  return "#FFA726";
                case "ping_event":
                  return "#4CAF50";
                case "join_request":
                  return "#9C27B0";
                case "member_joined":
                  return "#4CAF50";
                case "join_request_approved":
                  return "#4CAF50";
                case "join_request_rejected":
                  return "#FF6B6B";
                case "group_invite":
                  return "#2196F3";
                case "promoted_to_organizer":
                  return "#FFD700";
                case "new_post":
                  return "#37a4c8";
                case "new_proposal":
                  return "#9C27B0";
                case "proposal_confirmed":
                  return "#4CAF50";
                default:
                  return "#37a4c8";
              }
            };

            const handleNotificationPress = () => {
              // Navigate based on notification type (matching notifications.tsx logic)
              if (notification.data.type === "chat" && notification.data.chatId) {
                router.push(`/chat/${notification.data.chatId}`);
              } else if (notification.data.type === "eventChat" && notification.data.eventId) {
                router.push(`/event/eventChat/${notification.data.eventId}`);
              } else if (notification.data.type === "match") {
                router.push("/chat/chatInbox");
              } else if (
                (notification.data.type === "ping_invitation" || notification.data.type === "ping_event") &&
                notification.data.pingId
              ) {
                router.push(`/ping/${notification.data.pingId}`);
              } else if (
                notification.data.type === "proposal_comment" &&
                notification.data.groupId &&
                notification.data.proposalId
              ) {
                router.push(`/group/proposal/${notification.data.proposalId}?groupId=${notification.data.groupId}`);
              } else if (
                (notification.data.type === "join_request" ||
                  notification.data.type === "member_joined" ||
                  notification.data.type === "join_request_approved" ||
                  notification.data.type === "join_request_rejected" ||
                  notification.data.type === "group_invite" ||
                  notification.data.type === "promoted_to_organizer" ||
                  notification.data.type === "new_post" ||
                  notification.data.type === "new_proposal" ||
                  notification.data.type === "proposal_confirmed") &&
                notification.data.groupId
              ) {
                router.push(`/group/${notification.data.groupId}`);
              } else if (notification.data.matchedUserId) {
                router.push(`/profile/${notification.data.matchedUserId}`);
              } else {
                router.push('/notifications/notifications');
              }
            };

            const iconName = getNotificationIcon();
            const iconColor = getNotificationColor();

            return (
              <TouchableOpacity
                key={notification.id || index}
                style={[styles.notificationItem, {
                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                  shadowColor: theme === "light" ? "#000" : "#000",
                }]}
                onPress={handleNotificationPress}
                activeOpacity={0.7}
              >
                <View style={[styles.notificationIconWrapper]}>
                  <View style={[styles.notificationIconContainer, {
                    backgroundColor: `${iconColor}20`
                  }]}>
                    <Ionicons name={iconName} size={14} color={iconColor} />
                  </View>
                </View>
                <View style={styles.notificationContent}>
                  <Text 
                    style={[styles.notificationTitle, { 
                      color: theme === "light" ? "#0F172A" : "#e4fbfe",
                      fontWeight: notification.read ? "500" : "600"
                    }]}
                    numberOfLines={1}
                  >
                    {notification.title}
                  </Text>
                  <Text 
                    style={[styles.notificationBody, { 
                      color: theme === "light" ? "#666666" : "#a0a0a0"
                    }]}
                    numberOfLines={1}
                  >
                    {notification.body}
                  </Text>
                  <Text style={[styles.notificationTime, { 
                    color: theme === "light" ? "#999999" : "#666666"
                  }]}>
                    {formatNotificationTime(notification.timestamp)}
                  </Text>
                </View>
                {!notification.read && (
                  <View style={[styles.unreadDot, {
                    backgroundColor: iconColor
                  }]} />
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.viewAllButton, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"
            }]}
            onPress={() => router.push('/notifications/notifications')}
            activeOpacity={0.7}
          >
            <Text style={[styles.viewAllButtonText, {
              color: theme === "light" ? "#37a4c8" : "#38a5c9"
            }]}>
              View All
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={12} 
              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, {
            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
          }]}>
            <Ionicons 
              name="calendar-outline" 
              size={24} 
              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
            />
          </View>
          <Text style={[styles.emptyText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
            Nothing happening nearby
          </Text>
          <Text style={[styles.emptySubtext, { color: theme === "light" ? "#64748B" : "#64748B" }]}>
            Be the first to create something exciting!
          </Text>
          
          {/* Compact Create Buttons for empty state */}
          <View style={styles.emptyButtonContainer}>
            <TouchableOpacity
              style={[styles.emptyCreateButton, { 
                backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
              }]}
              onPress={handleOpenPingModal}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme === "light" 
                  ? ['#37a4c8', '#2d8bb8'] 
                  : ['#38a5c9', '#2d8bb8']
                }
                style={styles.emptyCreateButtonGradient}
              >
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.emptyCreateButtonText}>Create Ping</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.emptyCreateButton, { 
                backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
              }]}
              onPress={handleCreateEvent}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={theme === "light" 
                  ? ['#37a4c8', '#2d8bb8'] 
                  : ['#38a5c9', '#2d8bb8']
                }
                style={styles.emptyCreateButtonGradient}
              >
                <Ionicons name="calendar" size={18} color="#FFFFFF" />
                <Text style={styles.emptyCreateButtonText}>Create Event</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Ping Event Modal */}
      <PingEventModal
        visible={showPingModal}
        onClose={handleClosePingModal}
        onSuccess={(title, message, type) => {
          // Handle success callback if needed
          console.log(`${type}: ${title} - ${message}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.13)',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
  },
  activityContainer: {
    position: 'relative',
    width: '100%',
  },
  activityWrapper: {
    position: 'relative',
    width: '100%',
    height: 260, // Fixed height for consistent card size
  },
  activityItem: {
    borderRadius: 22,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.10)',
    marginBottom: 8,
    width: '100%',
    height: 260, // Fixed height for consistent card size
  },
  activityHeaderGradient: {
    padding: 20,
    paddingBottom: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    elevation: 3,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
    flexShrink: 1, // Allow container to shrink if needed
  },
  activityTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
    lineHeight: 22, // Reduced line height to prevent wrapping
  },
  activityCreator: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 5,
    elevation: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  activityDescription: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
    fontWeight: '400',
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 12,
  },
  activityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10, // Polished, even spacing between badges
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 12,
    justifyContent: 'space-between',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 7,
    elevation: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 5,
    elevation: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  participantText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 28,
    marginBottom: 10,
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
    marginBottom: 2,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(56, 165, 201, 0.10)',
    marginTop: 18,
    marginBottom: 2,
    alignSelf: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 16,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyButtonContainer: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 20,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCreateButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  emptyCreateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 7,
  },
  emptyCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  loadingIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  participantBadgePolished: {
    minWidth: 44,
    // Remove maxWidth to allow auto width for all values
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantTextPolished: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'], // Monospace numbers for better alignment (if supported)
  },
  badgeUniform: {
    flex: 1,
    height: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 0, // Ensures flex works well in row
  },
  unlimitedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  infiniteIcon: {
    marginLeft: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  summaryItemCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  summaryCountCompact: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  summaryLabelCompact: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  summaryDividerVertical: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  notificationsContainer: {
    paddingVertical: 2,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  notificationsHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 0,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationIconWrapper: {
    marginRight: 10,
    marginTop: 1,
  },
  notificationIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    paddingRight: 4,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 16,
    marginBottom: 3,
  },
  notificationBody: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.1,
    marginBottom: 4,
    opacity: 0.7,
  },
  notificationTime: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
    opacity: 0.5,
  },
  unreadDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
    flexShrink: 0,
    marginLeft: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 2,
    gap: 5,
  },
  viewAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
}); 