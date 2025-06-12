import React, { useContext, useRef, useEffect, useCallback } from 'react';
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
  const isNavigating = useRef(false);
  
  // Add fade animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

  // Animate when theme changes
  useEffect(() => {
    // Update animation values for new theme
    backgroundAnim.setValue(theme === "light" ? 0 : 1);
    textAnim.setValue(theme === "light" ? 0 : 1);
  }, [theme]);

  // Interpolate colors for smooth transitions
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F8FAFC', '#000000'],
    extrapolate: 'clamp'
  });

  const textColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#0F172A', '#ffffff'],
    extrapolate: 'clamp'
  });

  const isActive = useCallback((path: string) => {
    return pathname === path;
  }, [pathname]);

  const handleNavigation = useCallback((path: string) => {
    if (isNavigating.current || pathname === path) return;
    
    isNavigating.current = true;
    router.push(path);
    
    // Reset navigation lock after animation completes
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [pathname]);

  const navItems = [
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "home" : "home-outline"} 
          size={28} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      path: "/home/dashboard"
    },
    {
      icon: (active: boolean) => (
        <Feather 
          name="compass" 
          size={26} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      path: "/explore"
    },
    {
      icon: (active: boolean) => (
        <FontAwesome5 
          name="user-friends" 
          size={26} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      path: "/swipe"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "chatbubble" : "chatbubble-outline"} 
          size={28} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      path: "/chat/chatInbox"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "settings" : "settings-outline"} 
          size={28} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      path: "/settings/settings"
    }
  ];

  return (
    <View>
      <LinearGradient
        colors={theme === "light" ? ['#F8FAFC', '#FFFFFF'] : ['#000000', '#000000']}
        style={[
          styles.container,
          { 
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
            borderTopColor: theme === "light" ? '#E2E8F0' : 'rgba(55, 164, 200, 0.3)'
          }
        ]}
      >
        {navItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.navItem}
            onPress={() => handleNavigation(item.path)}
            activeOpacity={0.7}
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
    </View>
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
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
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