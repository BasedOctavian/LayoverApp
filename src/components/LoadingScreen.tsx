import React, { useEffect, useContext } from 'react';
import { View, Image, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message }) => {
  const insets = useSafeAreaInsets();
  const spinValue = new Animated.Value(0);
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    // Create infinite spinning animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Interpolate the spin value to create a rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={theme === "light" ? ['#e6e6e6', '#ffffff'] : ['#000000', '#1a1a1a']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.content}>
        <Image
          source={require('../../assets/adaptive-icon.png')}
          style={[styles.logo, { tintColor: theme === "light" ? "#000000" : "#ffffff" }]}
          resizeMode="contain"
        />
        <Animated.View
          style={[
            styles.loadingRing,
            {
              transform: [{ rotate: spin }],
              borderColor: theme === "light" ? "#000000" : "#37a4c8",
            },
          ]}
        >
          <View style={[styles.ringInner, { backgroundColor: theme === "light" ? "#000000" : "#37a4c8" }]} />
        </Animated.View>
        {message && <View style={styles.messageContainer}>
          <View style={[styles.messageDot, { backgroundColor: theme === "light" ? "#000000" : "#37a4c8" }]} />
          <View style={[styles.messageDot, { backgroundColor: theme === "light" ? "#000000" : "#37a4c8" }]} />
          <View style={[styles.messageDot, { backgroundColor: theme === "light" ? "#000000" : "#37a4c8" }]} />
        </View>}
      </View>
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  loadingRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.3,
  },
  messageContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  messageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.6,
  },
});

export default LoadingScreen; 