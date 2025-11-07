import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { 
  FadeIn, 
  FadeOut,
  SlideOutLeft,
  SlideOutRight,
  Layout,
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from "react-native-reanimated";
import UserAvatar from "../UserAvatar";
import ScheduleSection from "./ScheduleSection";
import SharedItemsSection from "./SharedItemsSection";

interface User {
  id: string;
  name: string;
  age?: number;
  profilePicture?: string;
  bio?: string;
  currentCity?: string;
  airportCode?: string;
  availableNow?: boolean;
  availabilitySchedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
}

interface UserCardProps {
  user: User;
  index: number;
  theme: string;
  isProcessing: boolean;
  isDismissing?: boolean;
  dismissDirection?: 'left' | 'right' | null;
  sharedConnectionIntents: string[];
  sharedPersonalTags: string[];
  sharedEventPreferences: string[];
  onLike: (index: number) => void;
  onDislike: (index: number) => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  index,
  theme,
  isProcessing,
  isDismissing = false,
  dismissDirection = null,
  sharedConnectionIntents,
  sharedPersonalTags,
  sharedEventPreferences,
  onLike,
  onDislike,
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scaleAnim = useSharedValue(1);

  // Trigger exit animation when dismissing
  useEffect(() => {
    if (isDismissing && dismissDirection) {
      const targetX = dismissDirection === 'left' ? -400 : 400;
      
      translateX.value = withSpring(targetX, {
        damping: 20,
        stiffness: 90,
      });
      
      opacity.value = withTiming(0, { 
        duration: 400,
        easing: Easing.out(Easing.cubic)
      });
      
      scaleAnim.value = withTiming(0.85, {
        duration: 400,
        easing: Easing.out(Easing.cubic)
      });
    }
  }, [isDismissing, dismissDirection]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scaleAnim.value },
        { rotateZ: `${translateX.value * 0.05}deg` }
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View 
      key={user.id}
      entering={FadeIn.duration(400).delay(index * 100).easing(Easing.out(Easing.cubic))}
      layout={Layout.springify().damping(20).stiffness(90)}
      style={[styles.verticalCard, animatedStyle]}
    >
      <View style={[styles.cardContainer, { 
        backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
      }]}>
        {/* Profile Image Section */}
        <View style={styles.profileImageSection}>
          <View style={styles.profileImageContainer}>
            <UserAvatar
              user={user}
              size={130}
              style={styles.profileImage}
            />
            {/* Status indicator ring */}
            <View style={[styles.statusRing, { 
              borderColor: user.availableNow ? "#37a4c8" : "rgba(55, 164, 200, 0.3)"
            }]} />
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Header with Name and Age */}
          <View style={styles.userHeader}>
            <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
              {user.name}
            </Text>
            <Text style={[styles.userAge, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
              {user.age}
            </Text>
          </View>

          {/* Location and Status Row */}
          <View style={styles.statusRow}>
            {/* Location */}
            {(user.currentCity || user.airportCode) && (
              <View style={[styles.locationBadge, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.15)",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
              }]}>
                <MaterialIcons name="location-on" size={14} color="#37a4c8" />
                <Text style={[styles.locationText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                  {user.currentCity || user.airportCode}
                </Text>
              </View>
            )}
            
            {/* Availability Status */}
            {user.availableNow && (
              <View style={[styles.availabilityBadge, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.15)",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
              }]}>
                <View style={[styles.availabilityDot, { backgroundColor: "#37a4c8" }]} />
                <Text style={[styles.availabilityText, { color: "#37a4c8" }]}>Now</Text>
              </View>
            )}
          </View>

          {/* Today's Schedule */}
          <ScheduleSection 
            availabilitySchedule={user.availabilitySchedule}
            theme={theme}
          />

          {/* Shared Items Section */}
          <SharedItemsSection
            sharedConnectionIntents={sharedConnectionIntents}
            sharedPersonalTags={sharedPersonalTags}
            sharedEventPreferences={sharedEventPreferences}
            theme={theme}
          />

          {/* Bio Section */}
          {user.bio && (
            <View style={styles.bioSection}>
              <Text 
                style={[styles.bioText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {user.bio}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dislikeButton, { 
                backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                borderColor: theme === "light" ? "#64748B" : "#94A3B8",
                opacity: isProcessing || isDismissing ? 0.5 : 1
              }]}
              onPress={() => onDislike(index)}
              disabled={isProcessing || isDismissing}
            >
              <MaterialIcons name="close" size={24} color={theme === "light" ? "#64748B" : "#94A3B8"} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton, { 
                backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                borderColor: "#37a4c8",
                opacity: isProcessing || isDismissing ? 0.5 : 1
              }]}
              onPress={() => onLike(index)}
              disabled={isProcessing || isDismissing}
            >
              <MaterialIcons name="favorite" size={24} color="#37a4c8" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 393; // iPhone 15 width as base reference
const BASE_HEIGHT = 852; // iPhone 15 height as base reference

const scaleWidth = (size: number): number => (SCREEN_WIDTH / BASE_WIDTH) * size;
const scaleHeight = (size: number): number => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85);
};
const scale = (size: number): number => {
  const widthScale = SCREEN_WIDTH / BASE_WIDTH;
  const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
  return size * ((widthScale + heightScale) / 2);
};

const styles = StyleSheet.create({
  verticalCard: {
    width: '100%',
    maxWidth: scaleWidth(400),
    marginBottom: scaleHeight(24),
  },
  cardContainer: {
    borderRadius: scale(24),
    borderWidth: scale(1.5),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.2,
    shadowRadius: scale(16),
    elevation: 6,
    overflow: 'hidden',
  },
  profileImageSection: {
    alignItems: 'center',
    paddingTop: scaleHeight(28),
    paddingBottom: scaleHeight(20),
    backgroundColor: 'transparent',
  },
  profileImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: scale(130),
    height: scale(130),
    resizeMode: 'cover',
    borderRadius: scale(65),
  },
  statusRing: {
    position: 'absolute',
    width: scale(142),
    height: scale(142),
    borderRadius: scale(71),
    borderWidth: scale(3.5),
    top: scale(-6),
    left: scale(-6),
  },
  contentSection: {
    paddingHorizontal: scaleWidth(28),
    paddingBottom: scaleHeight(24),
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: scaleHeight(12),
    gap: scaleWidth(8),
  },
  userName: {
    fontSize: scaleFont(26),
    fontWeight: '800',
    letterSpacing: scale(-0.6),
  },
  userAge: {
    fontSize: scaleFont(19),
    fontWeight: '600',
    opacity: 0.8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleWidth(12),
    marginBottom: scaleHeight(16),
    flexWrap: 'wrap',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(14),
    borderRadius: scale(18),
    borderWidth: scale(1.5),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(4),
    elevation: 1,
  },
  locationText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    marginLeft: scaleWidth(4),
    letterSpacing: scale(0.2),
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(14),
    borderRadius: scale(18),
    borderWidth: scale(1.5),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(4),
    elevation: 1,
  },
  availabilityDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    marginRight: scaleWidth(4),
  },
  availabilityText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: scale(0.2),
  },
  bioSection: {
    marginBottom: scaleHeight(24),
    paddingHorizontal: scaleWidth(4),
  },
  bioText: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(24),
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: scale(0.2),
    opacity: 0.9,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleWidth(16),
  },
  actionButton: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    borderWidth: scale(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: scale(8),
    elevation: 4,
  },
  dislikeButton: {
    // Additional styles if needed
  },
  likeButton: {
    // Additional styles if needed
  },
});

export default UserCard;
