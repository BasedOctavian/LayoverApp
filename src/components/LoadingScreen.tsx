import React, { useEffect, useContext } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import LoadingSpinner from './LoadingSpinner';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = new Animated.Value(0);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <LinearGradient
      colors={theme === "light" ? ['#e6e6e6', '#ffffff'] : ['#000000', '#1a1a1a']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                })
              }
            ]
          }
        ]}
      >
        <LoadingSpinner 
          size={120}
          color={theme === "light" ? "#37a4c8" : "#38a5c9"}
          textColor={theme === "light" ? "#37a4c8" : "#38a5c9"}
          message={message}
          showDots={true}
        />
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingScreen; 