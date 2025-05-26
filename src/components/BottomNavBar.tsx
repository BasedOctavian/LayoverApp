import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const BottomNavBar = () => {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navItems = [
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "home" : "home-outline"} 
          size={28} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      path: "/home/dashboard"
    },
    {
      icon: (active: boolean) => (
        <MaterialIcons 
          name={active ? "event" : "event-available"} 
          size={28} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      path: "/home"
    },
    {
      icon: (active: boolean) => (
        <FontAwesome5 
          name="user-friends" 
          size={26} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      path: "/swipe"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "chatbubble" : "chatbubble-outline"} 
          size={28} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      path: "/chat/chatInbox"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "settings" : "settings-outline"} 
          size={28} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      path: "/settings/settings"
    }
  ];

  return (
    <LinearGradient
      colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
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
    borderTopColor: 'rgba(56, 165, 201, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#38a5c9',
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
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
  }
});

export default BottomNavBar; 