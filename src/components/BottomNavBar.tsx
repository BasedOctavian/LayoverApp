import React, { useContext, useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text, Animated, Easing, Dimensions } from 'react-native';
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

  // Helper function to check if device is iPhone 15 or larger
  const isIPhone15OrLarger = () => {
    const { width, height } = Dimensions.get('window');
    const screenHeight = Math.max(width, height);
    
    // iPhone 15 screen height is 844pt, iPhone 15 Plus is 926pt
    // We'll use 844 as the threshold for iPhone 15 and larger
    return Platform.OS === 'ios' && screenHeight >= 844;
  };

  // Animate when theme changes
  useEffect(() => {
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
    // For settings, check if we're on any settings-related route only
    if (path === "/settings/settings") {
      return pathname === path || pathname.startsWith("/settings/");
    }
    // For chat, check if we're on any chat-related route
    if (path === "/chat/chatInbox") {
      return pathname === path || pathname.startsWith("/chat/");
    }
    return pathname === path;
  }, [pathname]);

  const handleNavigation = useCallback((path: string) => {
    if (isNavigating.current || pathname === path) return;
    
    isNavigating.current = true;
    router.push(path);
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [pathname]);

  const navItems = [
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "home-sharp" : "home-outline"} 
          size={24} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      label: "Home",
      path: "/home/dashboard"
    },
    {
      icon: (active: boolean) => (
        <Feather 
          name="compass" 
          size={22} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      label: "Explore",
      path: "/explore"
    },
    {
      icon: (active: boolean) => (
        <MaterialIcons 
          name="people-outline" 
          size={24} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      label: "Connect",
      path: "/swipe"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "chatbubble-ellipses" : "chatbubble-outline"} 
          size={24} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      label: "Chat",
      path: "/chat/chatInbox"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "settings-sharp" : "settings-outline"} 
          size={24} 
          color={active ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff"} 
        />
      ),
      label: "Settings",
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
            <View style={styles.iconContainer}>
              {item.icon(isActive(item.path))}
              {isIPhone15OrLarger() && (
                <Text style={[
                  styles.label,
                  { color: isActive(item.path) ? "#37a4c8" : theme === "light" ? "#0F172A" : "#ffffff" }
                ]}>
                  {item.label}
                </Text>
              )}
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
    paddingTop: 8,
    paddingHorizontal: 16,
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
    paddingVertical: 6,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  }
});

export default BottomNavBar; 