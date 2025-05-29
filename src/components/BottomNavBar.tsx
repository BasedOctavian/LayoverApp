import React, { useContext, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';

const BottomNavBar = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { theme } = useContext(ThemeContext);
  
  // Add fade animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

  // Animate when theme changes
  useEffect(() => {
    // First fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // Update animation values for new theme
      backgroundAnim.setValue(theme === "light" ? 0 : 1);
      textAnim.setValue(theme === "light" ? 0 : 1);
      
      // Fade back in with a slight delay
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 50);
    });
  }, [theme]);

  // Interpolate colors for smooth transitions
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e6e6e6', '#000000'],
    extrapolate: 'clamp'
  });

  const textColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#ffffff'],
    extrapolate: 'clamp'
  });

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navItems = [
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "home" : "home-outline"} 
          size={28} 
          color={active ? "#37a4c8" : theme === "light" ? "#000000" : "#ffffff"} 
        />
      ),
      path: "/home/dashboard"
    },
    {
      icon: (active: boolean) => (
        <MaterialIcons 
          name={active ? "event" : "event-available"} 
          size={28} 
          color={active ? "#37a4c8" : theme === "light" ? "#000000" : "#ffffff"} 
        />
      ),
      path: "/home"
    },
    {
      icon: (active: boolean) => (
        <FontAwesome5 
          name="user-friends" 
          size={26} 
          color={active ? "#37a4c8" : theme === "light" ? "#000000" : "#ffffff"} 
        />
      ),
      path: "/swipe"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "chatbubble" : "chatbubble-outline"} 
          size={28} 
          color={active ? "#37a4c8" : theme === "light" ? "#000000" : "#ffffff"} 
        />
      ),
      path: "/chat/chatInbox"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "settings" : "settings-outline"} 
          size={28} 
          color={active ? "#37a4c8" : theme === "light" ? "#000000" : "#ffffff"} 
        />
      ),
      path: "/settings/settings"
    }
  ];

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <LinearGradient
        colors={theme === "light" ? ['#e6e6e6', '#e6e6e6'] : ['#000000', '#000000']}
        style={[
          styles.container,
          { 
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
          }
        ]}
      >
        {navItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            onPress={() => router.push(item.path)}
          >
            <View style={[
              styles.iconContainer,
              isActive(item.path) && styles.activeIconContainer
            ]}>
              {item.icon(isActive(item.path))}
            </View>
          </TouchableOpacity>
        ))}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -35,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 164, 200, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#37a4c8',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  }
});

export default BottomNavBar; 