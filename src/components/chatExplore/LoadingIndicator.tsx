import React, { useEffect, useRef, useContext } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { ThemeContext } from '../../context/ThemeContext';
import { LoadingIndicatorProps } from './types';

/**
 * ModernLoadingIndicator Component
 * 
 * A sophisticated loading indicator with multiple animations:
 * - Rotating circle with pulse effect
 * - Smooth fade-in entrance
 * - Scale and opacity animations
 * - Customizable color and message
 */
const ModernLoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  color, 
  message = "Finding amazing people..." 
}) => {
  const { theme } = useContext(ThemeContext);
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
          ]),
        ])
      ),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.View 
        style={[
          styles.loadingIndicatorContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1]
              })},
              { rotate: spin }
            ]
          }
        ]}
      >
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
      </Animated.View>
      <Text style={[styles.loadingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
    marginTop: 16,
  },
});

export default ModernLoadingIndicator;

