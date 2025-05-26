import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  textColor?: string;
  customTexts?: string[];
  showDots?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 100,
  color = '#2F80ED',
  textColor = '#2F80ED',
  customTexts,
  showDots = true,
}) => {
  const loadingAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const [loadingText, setLoadingText] = useState("Finding travelers near you...");
  
  const defaultTexts = [
    "Finding travelers near you...",
    "Discovering exciting connections...",
    "Matching you with fellow adventurers...",
    "Preparing your next journey...",
  ];
  
  const loadingTexts = customTexts || defaultTexts;
  
  // Animate loading text
  useEffect(() => {
    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % loadingTexts.length;
      setLoadingText(loadingTexts[textIndex]);
    }, 2000);
    
    return () => clearInterval(textInterval);
  }, [loadingTexts]);
  
  // Animate loading spinner
  useEffect(() => {
    // Rotate animation
    Animated.loop(
      Animated.timing(loadingAnimation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => {
      loadingAnimation.setValue(0);
      pulseAnimation.setValue(1);
    };
  }, []);
  
  const spin = loadingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  // Calculate lighter shade of the main color for gradient
  const lighterColor = color + '80'; // Adding 50% opacity
  
  return (
    <View style={styles.loadingContainer}>
      <Animated.View 
        style={[
          styles.loadingSpinnerContainer,
          { 
            transform: [{ rotate: spin }, { scale: pulseAnimation }],
            width: size,
            height: size,
            borderRadius: size / 2,
            marginBottom: 24,
            shadowColor: color,
          }
        ]}
      >
        <LinearGradient
          colors={[color, lighterColor]}
          style={[
            styles.loadingSpinner,
            { 
              width: size,
              height: size,
              borderRadius: size / 2,
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="flight-takeoff" size={size * 0.4} color="#FFF" />
        </LinearGradient>
      </Animated.View>
      
      <Animated.Text 
        style={[
          styles.loadingText,
          { 
            color: textColor,
            opacity: pulseAnimation.interpolate({
              inputRange: [1, 1.2],
              outputRange: [0.7, 1],
            })
          }
        ]}
      >
        {loadingText}
      </Animated.Text>
      
      {showDots && (
        <View style={styles.loadingDotsContainer}>
          <Animated.View 
            style={[
              styles.loadingDot,
              { 
                backgroundColor: color,
                opacity: pulseAnimation.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.5, 1],
                }),
                transform: [{ scale: pulseAnimation.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.8, 1.2],
                })}]
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.loadingDot,
              { 
                backgroundColor: color,
                opacity: pulseAnimation.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.5, 1],
                }),
                transform: [{ scale: pulseAnimation.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.8, 1.2],
                })}]
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.loadingDot,
              { 
                backgroundColor: color,
                opacity: pulseAnimation.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.5, 1],
                }),
                transform: [{ scale: pulseAnimation.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.8, 1.2],
                })}]
              }
            ]} 
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingSpinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: '100%',
  },
  loadingSpinner: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
    color: '#e4fbfe',
    fontFamily: 'Inter-Medium',
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
});

export default LoadingSpinner; 