import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
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

interface StatsSectionProps {
  userCount: number;
  theme: string;
  delay: number;
  onResetHistory: () => void;
}

const StatsSection: React.FC<StatsSectionProps> = ({ 
  userCount, 
  theme, 
  delay, 
  onResetHistory 
}) => {
  return (
    <Animated.View 
      entering={FadeIn.duration(800).delay(delay).easing(Easing.out(Easing.cubic))}
      style={styles.bottomSection}
    >
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={theme === "light" 
            ? ["rgba(55, 164, 200, 0.12)", "rgba(55, 164, 200, 0.06)"] 
            : ["rgba(55, 164, 200, 0.2)", "rgba(55, 164, 200, 0.1)"]
          }
          style={[styles.statCard, { 
            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(55, 164, 200, 0.5)"
          }]}
        >
          <View style={[styles.iconContainer, { backgroundColor: "rgba(55, 164, 200, 0.15)" }]}>
            <MaterialIcons name="people" size={scale(22)} color="#37a4c8" />
          </View>
          <Text style={[styles.statNumber, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
            {userCount}
          </Text>
          <Text 
            style={[styles.statLabel, { color: theme === "light" ? "#37a4c8" : "#37a4c8" }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Available
          </Text>
        </LinearGradient>
        
        <LinearGradient
          colors={theme === "light" 
            ? ["rgba(76, 217, 100, 0.12)", "rgba(76, 217, 100, 0.06)"] 
            : ["rgba(76, 217, 100, 0.2)", "rgba(76, 217, 100, 0.1)"]
          }
          style={[styles.statCard, { 
            borderColor: theme === "light" ? "rgba(76, 217, 100, 0.3)" : "rgba(76, 217, 100, 0.5)"
          }]}
        >
          <View style={[styles.iconContainer, { backgroundColor: "rgba(76, 217, 100, 0.15)" }]}>
            <MaterialIcons name="schedule" size={scale(22)} color="#4CD964" />
          </View>
          <Text style={[styles.statNumber, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
            Now
          </Text>
          <Text 
            style={[styles.statLabel, { color: theme === "light" ? "#4CD964" : "#4CD964" }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            Active
          </Text>
        </LinearGradient>
      </View>

      {/* Reset History Button */}
      <LinearGradient
        colors={theme === "light" 
          ? ["#FFFFFF", "#F8FAFC"] 
          : ["#1a1a1a", "#2a2a2a"]
        }
        style={[
          styles.verticalResetButton,
          { 
            borderColor: "#37a4c8"
          }
        ]}
      >
        <TouchableOpacity
          style={styles.resetButtonTouchable}
          onPress={onResetHistory}
        >
          <View style={[styles.resetIconContainer, { backgroundColor: "rgba(55, 164, 200, 0.1)" }]}>
            <MaterialIcons name="history" size={scale(20)} color="#37a4c8" />
          </View>
          <Text style={[styles.verticalResetButtonText, { color: theme === "light" ? "#37a4c8" : "#37a4c8" }]}>
            Reset History
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bottomSection: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(32),
    paddingBottom: scaleHeight(48),
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleHeight(28),
    gap: scaleWidth(20),
    width: '100%',
    maxWidth: scaleWidth(320),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(20),
    paddingHorizontal: scaleWidth(16),
    borderRadius: scale(20),
    borderWidth: scale(2),
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.2,
    shadowRadius: scale(16),
    elevation: 4,
    minHeight: scaleHeight(110),
    width: scaleWidth(140),
  },
  iconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(6),
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.15,
    shadowRadius: scale(4),
    elevation: 2,
  },
  statNumber: {
    fontSize: scaleFont(24),
    fontWeight: '800',
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(4),
    letterSpacing: scale(-0.3),
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: scale(1) },
    textShadowRadius: scale(2),
    width: '100%',
  },
  statLabel: {
    fontSize: scaleFont(11),
    fontWeight: '700',
    letterSpacing: scale(0.3),
    textTransform: 'uppercase',
    opacity: 0.9,
    textAlign: 'center',
    width: '100%',
  },
  verticalResetButton: {
    borderRadius: scale(24),
    borderWidth: scale(2),
    marginTop: scaleHeight(20),
    marginBottom: scaleHeight(36),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.2,
    shadowRadius: scale(8),
    elevation: 4,
    overflow: 'hidden',
  },
  resetButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(32),
  },
  resetIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
  },
  verticalResetButtonText: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: scale(0.3),
  },
});

export default StatsSection;
