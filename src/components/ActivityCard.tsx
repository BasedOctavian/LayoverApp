import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, FlatList, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import { haversineDistance } from '../utils/haversineDistance';
import PingEventModal from './PingEventModal';
import { LinearGradient } from 'expo-linear-gradient';

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
  pingType: string;
  status: string;
  createdAt: any;
  connectionIntents: string[];
}

interface ActivityCardProps {
  userLocation: { lat: number; long: number } | null;
  userId: string | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  const router = useRouter();
  const [activities, setActivities] = useState<PingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPingModal, setShowPingModal] = useState(false);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const panRef = useRef(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;

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
        limit(5)
      ),
      (snapshot) => {
        try {
          const activitiesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PingActivity[];

          // Filter activities within 50 miles and sort by distance
          const nearbyActivities = activitiesData
            .filter(activity => {
              if (!activity.coordinates) return false;
              const distanceKm = haversineDistance(
                userLocation.lat,
                userLocation.long,
                activity.coordinates.latitude,
                activity.coordinates.longitude
              );
              const distanceMiles = distanceKm * 0.621371;
              return distanceMiles <= 50;
            })
            .sort((a, b) => {
              if (!a.coordinates || !b.coordinates) return 0;
              const distanceA = haversineDistance(
                userLocation.lat,
                userLocation.long,
                a.coordinates.latitude,
                a.coordinates.longitude
              );
              const distanceB = haversineDistance(
                userLocation.lat,
                userLocation.long,
                b.coordinates.latitude,
                b.coordinates.longitude
              );
              return distanceA - distanceB;
            })
            .slice(0, 3); // Show only top 3 closest activities

          setActivities(nearbyActivities);
          setLoading(false);
        } catch (err) {
          console.error('Error processing activities:', err);
          setError('Failed to load activities');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error fetching activities:', err);
        setError('Failed to load activities');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userLocation]);

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

  if (loading) {
    return (
      <View style={[styles.container, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
      }]}>
        <View style={styles.loadingContainer}>
          <ModernLoadingDot color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text style={[styles.loadingText, { color: theme === "light" ? "#000000" : "#64748B" }]}>
            Finding activities...
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

  const renderActivity = (activity: PingActivity) => {
    const distance = activity.coordinates && userLocation 
      ? formatDistance(userLocation.lat, userLocation.long, activity.coordinates.latitude, activity.coordinates.longitude)
      : null;

    return (
      <View style={styles.activityWrapper}>
        <TouchableOpacity
          style={[styles.activityItem, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
          }]}
          onPress={() => router.push(`/ping/${activity.id}`)}
          activeOpacity={0.9}
        >
          {/* Header with gradient background */}
          <LinearGradient
            colors={theme === "light" 
              ? ['rgba(55, 164, 200, 0.1)', 'rgba(55, 164, 200, 0.05)'] 
              : ['rgba(56, 165, 201, 0.1)', 'rgba(56, 165, 201, 0.05)']
            }
            style={styles.activityHeaderGradient}
          >
            <View style={styles.activityHeader}>
              <View style={[styles.activityIconContainer, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(56, 165, 201, 0.15)"
              }]}>
                {getTemplateIcon(activity.template)}
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]} numberOfLines={2}>
                  {activity.title}
                </Text>
                <Text style={[styles.activityCreator, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]} numberOfLines={1}>
                  by {activity.creatorName}
                </Text>
                <View style={styles.activityMeta}>
                  {distance && (
                    <View style={[styles.metaBadge, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                    }]}>
                      <Ionicons name="location" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.distanceText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                        {distance}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.metaBadge, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                  }]}>
                    <Ionicons name="time" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.timeText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      {formatTimeAgo(activity.createdAt)}
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
          <View style={styles.activityFooter}>
            <View style={[styles.categoryTag, { 
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}>
              {getCategoryIcon(activity.category)}
              <Text style={[styles.categoryText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                {activity.category}
              </Text>
            </View>
            
            <View style={[styles.participantInfo, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}>
              <Ionicons name="people" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              <Text style={[styles.participantText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                {activity.participantCount}/{activity.maxParticipants}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Enhanced Create Ping Button */}
        <TouchableOpacity
          style={[styles.createPingButton, { 
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
            style={styles.createPingGradient}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createPingText}>Create Ping</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
      borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
    }]}>
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
                    { translateX: constrainedTranslateX },
                    { scale: swipeScale }
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

          {/* Enhanced Pagination Dots */}
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
      ) : (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, {
            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
          }]}>
            <Ionicons 
              name="calendar-outline" 
              size={32} 
              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
            />
          </View>
          <Text style={[styles.emptyText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
            No activities nearby
          </Text>
          <Text style={[styles.emptySubtext, { color: theme === "light" ? "#64748B" : "#64748B" }]}>
            Create a ping to start connecting!
          </Text>
          
          {/* Enhanced Create Ping Button for empty state */}
          <TouchableOpacity
            style={[styles.createPingButton, { 
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
              style={styles.createPingGradient}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createPingText}>Create Ping</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  activityContainer: {
    position: 'relative',
  },
  activityWrapper: {
    position: 'relative',
  },
  activityItem: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
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
    elevation: 2,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 6,
    lineHeight: 24,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  participantText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  createPingButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createPingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  createPingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    paddingVertical: 32,
    gap: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 22,
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
}); 