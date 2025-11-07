import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Animated, { FadeIn, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

// Responsive scaling utilities
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 393; // iPhone 15 width as base reference
const BASE_HEIGHT = 852; // iPhone 15 height as base reference

const scaleWidth = (size: number): number => (SCREEN_WIDTH / BASE_WIDTH) * size;
const scaleHeight = (size: number): number => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85);
};
const scale = (size: number): number => {
  const widthScale = SCREEN_WIDTH / BASE_WIDTH;
  const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
  return size * ((widthScale + heightScale) / 2);
};

interface EmptyStateProps {
  theme: string;
  onResetHistory: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ theme, onResetHistory }) => {
  return (
    <Animated.View 
      entering={FadeIn.duration(500).easing(Easing.out(Easing.cubic))}
      style={[
        styles.emptyStateContainer,
        {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderWidth: scale(1),
          borderColor: theme === "light" ? "rgba(56, 165, 201, 0.15)" : "rgba(56, 165, 201, 0.3)",
        }
      ]}
    >
      <LinearGradient
        colors={theme === "light" 
          ? ["#FFFFFF", "#f8fafb"] 
          : ["#1a1a1a", "#0f0f0f"]}
        style={styles.cardContent}
      >
        {/* Content Container - Empty State */}
        <View style={styles.contentContainer}>
          {/* Icon Circle */}
          <View style={[styles.iconCircle, {
            backgroundColor: theme === "light" 
              ? "rgba(56, 165, 201, 0.1)" 
              : "rgba(56, 165, 201, 0.15)",
            borderColor: theme === "light" 
              ? "rgba(56, 165, 201, 0.2)" 
              : "rgba(56, 165, 201, 0.4)",
          }]}>
            <MaterialIcons name="people-outline" size={scale(40)} color="#37a4c8" />
          </View>
          
          <View style={styles.profileHeader}>
            <Text style={[styles.nameText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
              No Nearby Users
            </Text>
            <Text style={[styles.subtitleText, { color: theme === "light" ? "#64748b" : "#94a3b8" }]}>
              We couldn't find anyone in your area right now
            </Text>
          </View>
          
          <View style={styles.messageSection}>
            <View style={[styles.messageItem, {
              backgroundColor: theme === "light" 
                ? "rgba(56, 165, 201, 0.05)" 
                : "rgba(56, 165, 201, 0.08)",
            }]}>
              <MaterialIcons name="schedule" size={scale(18)} color="#37a4c8" />
              <Text style={[styles.messageText, { color: theme === "light" ? "#334155" : "#cbd5e1" }]}>
                Check back later for new users
              </Text>
            </View>
            
            <View style={[styles.messageItem, {
              backgroundColor: theme === "light" 
                ? "rgba(56, 165, 201, 0.05)" 
                : "rgba(56, 165, 201, 0.08)",
            }]}>
              <MaterialIcons name="refresh" size={scale(18)} color="#37a4c8" />
              <Text style={[styles.messageText, { color: theme === "light" ? "#334155" : "#cbd5e1" }]}>
                Tap the button below to reset
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.moodContainer, { 
              backgroundColor: theme === "light" 
                ? "rgba(56, 165, 201, 0.12)" 
                : "rgba(56, 165, 201, 0.15)",
              borderColor: theme === "light" 
                ? "rgba(56, 165, 201, 0.25)" 
                : "rgba(56, 165, 201, 0.4)",
            }]}
            onPress={onResetHistory}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={scale(16)} color="#37a4c8" />
            <Text style={[styles.moodText, { color: theme === "light" ? "#37a4c8" : "#5bc0de" }]}>
              Reset Swipe History
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: scale(24),
    marginHorizontal: 'auto',
    marginBottom: scaleHeight(48),
    width: scaleWidth(340),
    minHeight: scaleHeight(420),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.2,
    shadowRadius: scale(16),
    elevation: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    width: '100%',
    borderRadius: scale(24),
  },
  contentContainer: {
    flex: 1,
    padding: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    gap: scaleHeight(16),
  },
  iconCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(2),
    marginBottom: scaleHeight(4),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(3) },
    shadowOpacity: 0.12,
    shadowRadius: scale(6),
    elevation: 4,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: scaleHeight(4),
    gap: scaleHeight(6),
  },
  nameText: {
    fontSize: scaleFont(22),
    fontWeight: "800",
    letterSpacing: scale(-0.5),
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: scaleFont(14),
    fontWeight: "500",
    letterSpacing: scale(0.1),
    textAlign: 'center',
    lineHeight: scaleFont(20),
    paddingHorizontal: scaleWidth(12),
  },
  messageSection: {
    width: '100%',
    gap: scaleHeight(10),
    marginTop: scaleHeight(4),
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(12),
    borderRadius: scale(12),
    gap: scaleWidth(8),
  },
  messageText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: scale(0.1),
    textAlign: 'center',
    flex: 1,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(18),
    borderRadius: scale(20),
    marginTop: scaleHeight(8),
    borderWidth: scale(2),
    gap: scaleWidth(8),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  moodText: {
    fontSize: scaleFont(13),
    fontWeight: "700",
    letterSpacing: scale(0.2),
  },
});

export default EmptyState;
