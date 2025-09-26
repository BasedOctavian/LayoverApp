import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";

interface ProfileTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme: "light" | "dark";
  sectionsFadeAnim: Animated.Value;
  cardScaleAnim: Animated.Value;
}

const tabs = ['about', 'interests', 'social', 'gallery'];

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
  theme,
  sectionsFadeAnim,
  cardScaleAnim,
}) => {
  return (
    <Animated.View 
      style={[
        styles.tabContainer,
        {
          opacity: sectionsFadeAnim,
          transform: [{ scale: cardScaleAnim }]
        }
      ]}
    >
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && styles.activeTab,
            { 
              backgroundColor: activeTab === tab 
                ? (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)")
                : (theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"),
              borderColor: activeTab === tab 
                ? "#37a4c8" 
                : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"),
              shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
            }
          ]}
          onPress={() => onTabChange(tab)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            { 
              color: activeTab === tab 
                ? "#37a4c8" 
                : (theme === "light" ? "#666666" : "#999999")
            }
          ]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = {
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
    paddingHorizontal: 0,
    gap: 6,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(55, 164, 200, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 1 }],
  },
  activeTab: {
    backgroundColor: 'rgba(55, 164, 200, 0.12)',
    borderColor: '#37a4c8',
    shadowColor: '#37a4c8',
    shadowOpacity: 0.15,
    transform: [{ scale: 1.01 }],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  activeTabText: {
    fontWeight: '700',
    color: '#37a4c8',
  },
} as any;

export default ProfileTabs;

