import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  ScrollView,
  Modal,
  Platform,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../context/ThemeContext";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

// Simplified mood type with just the essentials
export type PresetStatus = {
  label: string;
  emoji: string;
  category: string;
  radiusMultiplier: number;
  description: string;
};

// Streamlined mood list organized by behavior
export const presetStatuses: PresetStatus[] = [
  // SEEKING - Maximum reach
  { 
    label: "Looking for Company", 
    emoji: "👥",
    category: "seeking",
    radiusMultiplier: 2.0,
    description: "Widest reach"
  },
  { 
    label: "Available", 
    emoji: "✅",
    category: "seeking",
    radiusMultiplier: 1.5,
    description: "Wide reach"
  },
  { 
    label: "Food & Drinks?", 
    emoji: "🍽️",
    category: "seeking",
    radiusMultiplier: 1.5,
    description: "Food & social"
  },
  { 
    label: "Free to Chat", 
    emoji: "💬",
    category: "seeking",
    radiusMultiplier: 1.5,
    description: "Ready to connect"
  },
  { 
    label: "Group Activities", 
    emoji: "🎯",
    category: "seeking",
    radiusMultiplier: 1.8,
    description: "Activity focused"
  },
  { 
    label: "Down to Chat", 
    emoji: "💭",
    category: "seeking",
    radiusMultiplier: 1.5,
    description: "Open to talk"
  },

  // OPEN - Balanced
  { 
    label: "Exploring", 
    emoji: "✈️",
    category: "open",
    radiusMultiplier: 1.0,
    description: "Standard reach"
  },
  { 
    label: "Sightseeing", 
    emoji: "🗺️",
    category: "open",
    radiusMultiplier: 1.0,
    description: "Tourist mode"
  },
  { 
    label: "Restaurant Hunting", 
    emoji: "🔍",
    category: "open",
    radiusMultiplier: 1.0,
    description: "Finding food"
  },
  { 
    label: "Food Tour", 
    emoji: "🍕",
    category: "open",
    radiusMultiplier: 1.2,
    description: "Culinary adventure"
  },
  { 
    label: "Networking", 
    emoji: "🤝",
    category: "open",
    radiusMultiplier: 1.5,
    description: "Professional"
  },
  { 
    label: "Language Exchange", 
    emoji: "🌍",
    category: "open",
    radiusMultiplier: 1.2,
    description: "Practice language"
  },

  // SELECTIVE - Limited
  { 
    label: "Coffee Break", 
    emoji: "☕",
    category: "selective",
    radiusMultiplier: 0.7,
    description: "Nearby only"
  },
  { 
    label: "Snack Time", 
    emoji: "🍪",
    category: "selective",
    radiusMultiplier: 0.7,
    description: "Quick bite"
  },
  { 
    label: "Away", 
    emoji: "🚶",
    category: "selective",
    radiusMultiplier: 0.5,
    description: "Very close"
  },
  { 
    label: "Local Cuisine", 
    emoji: "🍜",
    category: "selective",
    radiusMultiplier: 0.9,
    description: "Local food"
  },
  { 
    label: "Airport Lounge", 
    emoji: "🛋️",
    category: "selective",
    radiusMultiplier: 0.5,
    description: "Limited"
  },
  { 
    label: "Shopping", 
    emoji: "🛍️",
    category: "selective",
    radiusMultiplier: 0.8,
    description: "Retail therapy"
  },

  // UNAVAILABLE - No notifications
  { 
    label: "Do Not Disturb", 
    emoji: "🔕",
    category: "unavailable",
    radiusMultiplier: 0,
    description: "No pings"
  },
  { 
    label: "Busy", 
    emoji: "⏳",
    category: "unavailable",
    radiusMultiplier: 0,
    description: "Not available"
  },
  { 
    label: "Work Mode", 
    emoji: "💼",
    category: "unavailable",
    radiusMultiplier: 0,
    description: "Deep focus"
  },
  { 
    label: "In a Meeting", 
    emoji: "📊",
    category: "unavailable",
    radiusMultiplier: 0,
    description: "Currently busy"
  },
  { 
    label: "On a Call", 
    emoji: "📞",
    category: "unavailable",
    radiusMultiplier: 0,
    description: "Can't talk"
  },
  { 
    label: "Deadline Mode", 
    emoji: "⏰",
    category: "unavailable",
    radiusMultiplier: 0,
    description: "Under pressure"
  },
];

interface StatusSheetProps {
  showStatusSheet: boolean;
  sheetAnim: Animated.Value;
  customStatus: string;
  setCustomStatus: (text: string) => void;
  handleUpdateMoodStatus: (status: string) => void;
  toggleStatusSheet: () => void;
}

export default function StatusSheet({
  showStatusSheet,
  sheetAnim,
  customStatus,
  setCustomStatus,
  handleUpdateMoodStatus,
  toggleStatusSheet,
}: StatusSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const [selectedCategory, setSelectedCategory] = React.useState<string>("seeking");
  const cardAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const primaryColor = "#38a5c9";
  const textPrimary = theme === "light" ? "#0F172A" : "#e4fbfe";
  const textSecondary = theme === "light" ? "#64748B" : "#CBD5E1";
  const textTertiary = theme === "light" ? "#94A3B8" : "#94A3B8";
  const bgMain = theme === "light" ? "#FFFFFF" : "#000000";
  const bgSecondary = theme === "light" ? "#f8fafc" : "#1a1a1a";
  const border = theme === "light" ? "#e2e8f0" : "#2a2a2a";

  useEffect(() => {
    if (showStatusSheet) {
      setSelectedCategory("seeking");
      // Animate overlay and sheet in
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(cardAnim, {
          toValue: 1,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate overlay and sheet out
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showStatusSheet, cardAnim, overlayAnim]);

  const categories = [
    { id: "seeking", label: "Seeking", indicator: "●●●" },
    { id: "open", label: "Open", indicator: "●●○" },
    { id: "selective", label: "Selective", indicator: "●○○" },
    { id: "unavailable", label: "Off", indicator: "○○○" },
  ];

  const filteredStatuses = presetStatuses.filter(
    status => status.category === selectedCategory
  );

  const getIndicatorOpacity = (multiplier: number) => {
    if (multiplier >= 1.5) return 1.0;
    if (multiplier >= 1.0) return 0.75;
    if (multiplier > 0) return 0.5;
    return 0.25;
  };

  return (
    <Modal
      visible={showStatusSheet}
      transparent
      animationType="none"
      onRequestClose={toggleStatusSheet}
    >
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: overlayAnim,
          }
        ]}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 20 : 50}
          tint={theme === "light" ? "light" : "dark"}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={toggleStatusSheet}
        />
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              opacity: cardAnim,
              transform: [
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0]
                  })
                },
                {
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }
              ]
            }
          ]}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.sheet, { backgroundColor: bgMain }]}
          >
            {/* Drag Handle */}
            <View style={[styles.dragHandle, { backgroundColor: border }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: textPrimary }]}>
                  Set Your Mood
                </Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  Controls how you receive pings
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: bgSecondary }]}
                onPress={toggleStatusSheet}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Category Selector */}
              <View style={styles.categoryContainer}>
                {categories.map((category) => {
                  const isSelected = selectedCategory === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        {
                          backgroundColor: isSelected ? primaryColor : bgSecondary,
                          borderColor: isSelected ? primaryColor : border,
                        }
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.categoryLabel,
                        { color: isSelected ? "#FFFFFF" : textSecondary }
                      ]}>
                        {category.label}
                      </Text>
                      <Text style={[
                        styles.categoryIndicator,
                        { 
                          color: isSelected ? "#FFFFFF" : textTertiary,
                          opacity: isSelected ? 0.8 : 0.5
                        }
                      ]}>
                        {category.indicator}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Mood List */}
              <View style={styles.moodList}>
                {filteredStatuses.map((status, index) => (
                  <TouchableOpacity
                    key={`${status.label}-${index}`}
                    style={[
                      styles.moodItem,
                      {
                        backgroundColor: bgMain,
                        borderColor: border,
                      }
                    ]}
                    onPress={() => {
                      handleUpdateMoodStatus(status.label);
                      toggleStatusSheet();
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={styles.moodLeft}>
                      <Text style={styles.moodEmoji}>{status.emoji}</Text>
                      <View style={styles.moodTextContainer}>
                        <Text style={[styles.moodLabel, { color: textPrimary }]}>
                          {status.label}
                        </Text>
                        <Text style={[styles.moodDescription, { color: textSecondary }]}>
                          {status.description}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Simple indicator */}
                    <View style={styles.moodRight}>
                      <Text style={[
                        styles.multiplier,
                        { 
                          color: primaryColor,
                          opacity: getIndicatorOpacity(status.radiusMultiplier)
                        }
                      ]}>
                        {status.radiusMultiplier > 0 ? `${status.radiusMultiplier}×` : '—'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Info Hint */}
              <View style={[styles.hint, {
                backgroundColor: bgSecondary,
                borderColor: border
              }]}>
                <Ionicons 
                  name="information-circle-outline" 
                  size={16} 
                  color={primaryColor} 
                />
                <Text style={[styles.hintText, { color: textSecondary }]}>
                  The multiplier shows how far pings will reach you
                </Text>
              </View>

              {/* Custom Status */}
              <View style={styles.customContainer}>
                <View style={styles.customInputWrapper}>
                  <TextInput
                    style={[styles.customInput, {
                      backgroundColor: bgSecondary,
                      color: textPrimary,
                      borderColor: border
                    }]}
                    value={customStatus}
                    onChangeText={setCustomStatus}
                    placeholder="Custom status..."
                    placeholderTextColor={textTertiary}
                    maxLength={50}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (customStatus.trim().length > 0) {
                        handleUpdateMoodStatus(customStatus);
                        toggleStatusSheet();
                      }
                    }}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      {
                        opacity: customStatus.trim().length > 0 ? 1 : 0.4,
                        backgroundColor: primaryColor
                      }
                    ]}
                    disabled={customStatus.trim().length === 0}
                    onPress={() => {
                      handleUpdateMoodStatus(customStatus);
                      toggleStatusSheet();
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="check" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    maxHeight: 560,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryIndicator: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  moodList: {
    gap: 8,
    marginBottom: 16,
  },
  moodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  moodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  moodDescription: {
    fontSize: 12,
    fontWeight: '500',
  },
  moodRight: {
    marginLeft: 12,
  },
  multiplier: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  customContainer: {
    marginBottom: 20,
  },
  customInputWrapper: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '500',
    borderWidth: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
