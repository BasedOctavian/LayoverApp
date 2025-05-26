import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5, Feather } from '@expo/vector-icons';

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
          size={24} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      label: "Home",
      path: "/home/dashboard"
    },
    {
      icon: (active: boolean) => (
        <MaterialIcons 
          name={active ? "event" : "event-available"} 
          size={24} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      label: "Events",
      path: "/home"
    },
    {
      icon: (active: boolean) => (
        <FontAwesome5 
          name="user-friends" 
          size={22} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      label: "Swipe",
      path: "/swipe"
    },
    {
      icon: (active: boolean) => (
        <Ionicons 
          name={active ? "chatbubble" : "chatbubble-outline"} 
          size={24} 
          color={active ? "#38a5c9" : "#e4fbfe"} 
        />
      ),
      label: "Chat",
      path: "/chat/chatInbox"
    }
  ];

  return (
    <View style={[
      styles.container,
      { 
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
        borderTopWidth: 1,
        borderTopColor: '#38a5c9',
      }
    ]}>
      {navItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.navItem}
          onPress={() => router.push(item.path)}
        >
          {item.icon(isActive(item.path))}
          <Text style={[
            styles.navLabel,
            { color: isActive(item.path) ? "#38a5c9" : "#e4fbfe" }
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#000000',
    paddingTop: 12,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -35,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 0,
  },
  navLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  }
});

export default BottomNavBar; 