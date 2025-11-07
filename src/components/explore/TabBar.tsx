import React, { useRef, useContext } from 'react';
import { View, TouchableOpacity, Text, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeContext } from '../../context/ThemeContext';

// SIMPLIFIED TO 3 TABS FOR EASIER NAVIGATION
export type TabType = 'all' | 'activities' | 'social';

interface TabBarProps {
  activeTab: TabType;
  onTabSelect: (tab: TabType) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabSelect,
}) => {
  const { theme } = useContext(ThemeContext);
  const tabBarAnim = useRef(new Animated.Value(1)).current;

  const handleTabSelect = (tab: TabType) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    onTabSelect(tab);
    
    // Animate tab bar
    Animated.sequence([
      Animated.timing(tabBarAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tabBarAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const tabs = [
    { key: 'all' as const, label: 'Discover', icon: 'compass-outline' },
    { key: 'activities' as const, label: 'Activities', icon: 'calendar-outline' },
    { key: 'social' as const, label: 'Social', icon: 'people-outline' }
  ];

  return (
    <Animated.View 
      style={[
        styles.tabBarContainer,
        { transform: [{ scale: tabBarAnim }] }
      ]}
    >
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
              {
                backgroundColor: activeTab === tab.key 
                  ? "#37a4c8" 
                  : theme === "light" ? "#F1F5F9" : "#374151"
                }
              ]}
              onPress={() => handleTabSelect(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.key ? "#FFFFFF" : "#37a4c8"} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
                { color: activeTab === tab.key ? "#FFFFFF" : "#37a4c8" }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 2,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabActive: {
    backgroundColor: '#37a4c8',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
