import React, { useEffect, useRef, useContext } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { ThemeContext } from '../../context/ThemeContext';

/**
 * SkeletonLoader Component
 * 
 * A fast, lightweight skeleton loader that mimics the UserCard layout.
 * Features:
 * - Shimmer animation effect
 * - Theme-aware styling
 * - Multiple skeleton cards
 * - Optimized performance with native driver
 */

interface SkeletonLoaderProps {
  count?: number;
}

const SkeletonCard: React.FC<{ index: number }> = ({ index }) => {
  const { theme } = useContext(ThemeContext);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fast staggered entrance animation
    const delay = index * 30; // Faster stagger
    
    setTimeout(() => {
      // Quick fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200, // Faster fade in
        useNativeDriver: true,
      }).start();

      // Faster shimmer animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 800, // Faster shimmer
            useNativeDriver: true,
          }),
          Animated.timing(shimmerAnim, {
            toValue: 0,
            duration: 800, // Faster shimmer
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);
  }, [index]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
          opacity: fadeAnim,
        }
      ]}
    >
      <View style={styles.skeletonHeader}>
        {/* Avatar skeleton */}
        <Animated.View
          style={[
            styles.skeletonAvatar,
            {
              backgroundColor: theme === "light" ? "#E2E8F0" : "#374151",
              opacity: shimmerOpacity,
            }
          ]}
        />
        
        <View style={styles.skeletonUserInfo}>
          {/* Name skeleton */}
          <Animated.View
            style={[
              styles.skeletonName,
              {
                backgroundColor: theme === "light" ? "#E2E8F0" : "#374151",
                opacity: shimmerOpacity,
              }
            ]}
          />
          
          {/* Location skeleton */}
          <Animated.View
            style={[
              styles.skeletonLocation,
              {
                backgroundColor: theme === "light" ? "#F1F5F9" : "#4B5563",
                opacity: shimmerOpacity,
              }
            ]}
          />
        </View>
      </View>

      {/* Bio skeleton */}
      <Animated.View
        style={[
          styles.skeletonBio,
          {
            backgroundColor: theme === "light" ? "#F1F5F9" : "#4B5563",
            opacity: shimmerOpacity,
          }
        ]}
      />

      {/* Interest tags skeleton */}
      <View style={styles.skeletonInterests}>
        {[1, 2, 3].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.skeletonTag,
              {
                backgroundColor: theme === "light" ? "#E2E8F0" : "#374151",
                opacity: shimmerOpacity,
              }
            ]}
          />
        ))}
      </View>

      {/* Button skeleton */}
      <Animated.View
        style={[
          styles.skeletonButton,
          {
            backgroundColor: theme === "light" ? "#E2E8F0" : "#374151",
            opacity: shimmerOpacity,
          }
        ]}
      />
    </Animated.View>
  );
};

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ count = 3 }) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} index={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonCard: {
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 2,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  skeletonAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  skeletonUserInfo: {
    flex: 1,
  },
  skeletonName: {
    height: 20,
    borderRadius: 10,
    marginBottom: 8,
    width: '70%',
  },
  skeletonLocation: {
    height: 14,
    borderRadius: 7,
    width: '40%',
  },
  skeletonBio: {
    height: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '90%',
  },
  skeletonInterests: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skeletonTag: {
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    width: 60,
  },
  skeletonButton: {
    height: 44,
    borderRadius: 16,
    width: '100%',
  },
});

export default SkeletonLoader;
