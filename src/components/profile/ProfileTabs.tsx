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
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 0,
    gap: 8,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 14,
    backgroundColor: 'rgba(55, 164, 200, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(55, 164, 200, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    transform: [{ scale: 1 }],
  },
  activeTab: {
    backgroundColor: 'rgba(55, 164, 200, 0.18)',
    borderColor: '#37a4c8',
    shadowColor: '#37a4c8',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  activeTabText: {
    fontWeight: '800',
    color: '#37a4c8',
  },
} as any;

export default ProfileTabs;

