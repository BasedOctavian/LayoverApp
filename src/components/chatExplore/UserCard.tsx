import React, { useEffect, useRef, useContext } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  Easing, 
  StyleSheet,
  Platform 
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeContext } from '../../context/ThemeContext';
import UserAvatar from '../UserAvatar';
import { UserCardProps } from './types';
import { scaleWidth, scaleHeight, moderateScale, scaleFontSize } from '../../utils/responsive';

/**
 * UserCard Component
 * 
 * A sophisticated user card with rich animations and interactions.
 * Features:
 * - Staggered entrance animations based on index
 * - Press animations with haptic feedback
 * - Profile picture with online indicator
 * - User info display (name, age, location, bio)
 * - Interest tags with overflow handling
 * - Mood status indicator
 * - Connect button with navigation
 * - Theme-aware styling
 */
const UserCard: React.FC<UserCardProps> = ({ item, onPress, index }) => {
  const { theme } = useContext(ThemeContext);
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(scaleHeight(30))).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  // Staggered bounce entrance animation based on card index
  useEffect(() => {
    const delay = index * 60; // Stagger delay for smooth cascade effect
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [index]);

  const handleCardPress = () => {
    // Add haptic feedback for better UX
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/profile/${item.id}`);
  };

  const handlePressIn = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Scale down animation on press (only modify cardScaleAnim to preserve entrance animation)
    Animated.timing(cardScaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    // Scale back to normal on release
    Animated.timing(cardScaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.userCard,
        {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
          opacity: opacityAnim,
          transform: [
            { scale: Animated.multiply(scaleAnim, cardScaleAnim) },
            { translateY: translateYAnim }
          ],
        }
      ]}
    >
      <TouchableOpacity
        style={styles.userCardContent}
        onPress={handleCardPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        {/* User Header with Avatar and Basic Info */}
        <View style={styles.userHeader}>
          <View style={styles.imageContainer}>
            {item.profilePicture ? (
              <UserAvatar
                user={item}
                size={moderateScale(56)}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.placeholderImage]}>
                <Text style={styles.placeholderText}>
                  {item.name?.charAt(0)?.toUpperCase() || "?"}
                </Text>
              </View>
            )}
            <View style={[styles.onlineIndicator, { backgroundColor: '#10B981' }]} />
          </View>
          
          <View style={styles.userMainInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                {item.name}
              </Text>
              <View style={styles.ageBadge}>
                <Text style={styles.ageBadgeText}>{item.age} years old</Text>
              </View>
            </View>
            
            <View style={styles.userDetails}>
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={moderateScale(14)} color="#37a4c8" />
                <Text style={[styles.userLocation, { color: "#37a4c8" }]}>{item.airportCode}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* User Bio Section */}
        {item.bio && (
          <View style={styles.userBioContainer}>
            <Text style={[styles.userBio, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={2}>
              {item.bio}
            </Text>
          </View>
        )}

        {/* User Interests Section */}
        {item.interests && item.interests.length > 0 && (
          <View style={styles.userInterestsContainer}>
            {item.interests?.slice(0, 3).map((interest: string, index: number) => (
              <Animated.View 
                key={index} 
                style={[
                  styles.interestTag,
                  {
                    transform: [{ scale: scaleAnim }],
                    opacity: opacityAnim
                  }
                ]}
              >
                <Text style={styles.interestText}>{interest}</Text>
              </Animated.View>
            ))}
            {item.interests.length > 3 && (
              <View style={styles.moreInterestsBadge}>
                <Text style={styles.moreInterestsText}>+{item.interests.length - 3}</Text>
              </View>
            )}
          </View>
        )}

        {/* User Mood Status */}
        <View style={styles.userMoodContainer}>
          <Animated.View 
            style={[
              styles.moodIndicator,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim
              }
            ]} 
          />
          <Text style={[styles.moodText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
            {item.moodStatus || "Available"}
          </Text>
        </View>

        {/* Connect Button */}
        <TouchableOpacity
          style={[styles.connectButton, { backgroundColor: '#37a4c8' }]}
          onPress={handleCardPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={moderateScale(16)} color="#FFFFFF" style={{ marginRight: moderateScale(8) }} />
          <Text style={styles.connectButtonText}>View Profile</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  userCard: {
    borderRadius: moderateScale(20),
    marginBottom: scaleHeight(16),
    borderWidth: moderateScale(1),
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: scaleHeight(6) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(16),
  },
  userCardContent: {
    padding: moderateScale(20),
    flex: 1,
    justifyContent: 'center',
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(16),
  },
  imageContainer: {
    marginRight: scaleWidth(16),
    position: 'relative',
    justifyContent: 'center',
  },
  profileImage: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
  },
  placeholderImage: {
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: scaleFontSize(24),
    fontWeight: "600",
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: scaleHeight(2),
    right: scaleWidth(2),
    width: moderateScale(14),
    height: moderateScale(14),
    borderRadius: moderateScale(7),
    borderWidth: moderateScale(2),
    borderColor: '#FFFFFF',
  },
  userMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(6),
  },
  userName: {
    fontSize: scaleFontSize(20),
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.3,
  },
  ageBadge: {
    backgroundColor: '#37a4c8',
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(12),
    marginLeft: scaleWidth(8),
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userLocation: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
    marginLeft: scaleWidth(4),
  },
  userBioContainer: {
    marginBottom: scaleHeight(16),
  },
  userBio: {
    fontSize: scaleFontSize(15),
    lineHeight: scaleFontSize(22),
    fontWeight: '400',
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: scaleHeight(16),
    alignItems: 'center',
  },
  interestTag: {
    backgroundColor: "#37a4c8",
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: moderateScale(16),
    marginRight: scaleWidth(8),
    marginBottom: scaleHeight(8),
  },
  interestText: {
    color: "#FFFFFF",
    fontSize: scaleFontSize(12),
    fontWeight: "600",
  },
  moreInterestsBadge: {
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(12),
    marginLeft: scaleWidth(4),
  },
  moreInterestsText: {
    color: '#37a4c8',
    fontSize: scaleFontSize(11),
    fontWeight: '600',
  },
  userMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(16),
  },
  moodIndicator: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#10B981',
    marginRight: scaleWidth(8),
  },
  moodText: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(20),
    borderRadius: moderateScale(16),
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: scaleHeight(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default UserCard;
