import React, { useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { ThemeContext } from '../../context/ThemeContext';

interface MoodStatusBarProps {
  displayText: string;
  onPress: () => void;
  textFadeAnim: Animated.Value;
}

export default function MoodStatusBar({ 
  displayText, 
  onPress, 
  textFadeAnim 
}: MoodStatusBarProps) {
  const { theme } = useContext(ThemeContext);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={styles.defaultSearchContainer}
      accessible={true}
      accessibilityLabel={displayText}
      accessibilityHint="Double tap to update your mood status"
      accessibilityRole="button"
    >
      <View style={[styles.searchContainer, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
      }]}>
        <Animated.Text style={[styles.searchPlaceholder, { 
          color: theme === "light" ? "#37a4c8" : "#38a5c9",
          opacity: textFadeAnim
        }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displayText}
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  defaultSearchContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchContainer: {
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: "#64748B",
    letterSpacing: 0.3,
    textAlign: "center",
    flex: 1,
  },
});
