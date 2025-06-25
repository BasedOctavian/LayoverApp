import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

// Define preset statuses with typed array
export type PresetStatus = {
  label: string;
  emoji: string;
  color: string;
  category: string;
};

export const presetStatuses: PresetStatus[] = [
  // Basic statuses (shown in "All" category)
  { 
    label: "Available", 
    emoji: "✅",
    color: "#4CAF50",
    category: "all"
  },
  { 
    label: "Busy", 
    emoji: "⏳",
    color: "#FF9800",
    category: "all"
  },
  { 
    label: "Away", 
    emoji: "🚶",
    color: "#9E9E9E",
    category: "all"
  },
  { 
    label: "Do Not Disturb", 
    emoji: "🔕",
    color: "#F44336",
    category: "all"
  },
  { 
    label: "Free to Chat", 
    emoji: "💬",
    color: "#38a5c9",
    category: "all"
  },
  { 
    label: "Exploring", 
    emoji: "✈️",
    color: "#9C27B0",
    category: "all"
  },
  // Social category
  { 
    label: "Down to Chat", 
    emoji: "💬",
    color: "#38a5c9",
    category: "social"
  },
  { 
    label: "Looking for Company", 
    emoji: "👥",
    color: "#38a5c9",
    category: "social"
  },
  { 
    label: "Sharing Stories", 
    emoji: "📖",
    color: "#38a5c9",
    category: "social"
  },
  { 
    label: "Networking", 
    emoji: "🤝",
    color: "#38a5c9",
    category: "social"
  },
  { 
    label: "Language Exchange", 
    emoji: "🌍",
    color: "#38a5c9",
    category: "social"
  },
  { 
    label: "Group Activities", 
    emoji: "🎯",
    color: "#38a5c9",
    category: "social"
  },
  // Food category
  { 
    label: "Food & Drinks?", 
    emoji: "🍽️",
    color: "#4CAF50",
    category: "food"
  },
  { 
    label: "Coffee Break", 
    emoji: "☕",
    color: "#4CAF50",
    category: "food"
  },
  { 
    label: "Restaurant Hunting", 
    emoji: "🔍",
    color: "#4CAF50",
    category: "food"
  },
  { 
    label: "Local Cuisine", 
    emoji: "🍜",
    color: "#4CAF50",
    category: "food"
  },
  { 
    label: "Snack Time", 
    emoji: "🍪",
    color: "#4CAF50",
    category: "food"
  },
  { 
    label: "Food Tour", 
    emoji: "🍕",
    color: "#4CAF50",
    category: "food"
  },
  // Work category
  { 
    label: "Work Mode", 
    emoji: "💼",
    color: "#FF9800",
    category: "work"
  },
  { 
    label: "In a Meeting", 
    emoji: "📊",
    color: "#FF9800",
    category: "work"
  },
  { 
    label: "Remote Work", 
    emoji: "💻",
    color: "#FF9800",
    category: "work"
  },
  { 
    label: "Business Trip", 
    emoji: "📈",
    color: "#FF9800",
    category: "work"
  },
  { 
    label: "Conference Call", 
    emoji: "📞",
    color: "#FF9800",
    category: "work"
  },
  { 
    label: "Project Deadline", 
    emoji: "⏰",
    color: "#FF9800",
    category: "work"
  },
  // Travel category
  { 
    label: "Exploring", 
    emoji: "✈️",
    color: "#9C27B0",
    category: "travel"
  },
  { 
    label: "Sightseeing", 
    emoji: "🗺️",
    color: "#9C27B0",
    category: "travel"
  },
  { 
    label: "Airport Tour", 
    emoji: "🏛️",
    color: "#9C27B0",
    category: "travel"
  },
  { 
    label: "Duty Free", 
    emoji: "🛍️",
    color: "#9C27B0",
    category: "travel"
  },
  { 
    label: "Lounge Access", 
    emoji: "🛋️",
    color: "#9C27B0",
    category: "travel"
  },
  { 
    label: "Gate Change", 
    emoji: "🔄",
    color: "#9C27B0",
    category: "travel"
  }
];

// Define props interface for the StatusSheet component
interface StatusSheetProps {
  showStatusSheet: boolean;
  sheetAnim: Animated.Value;
  customStatus: string;
  setCustomStatus: (text: string) => void;
  handleUpdateMoodStatus: (status: string) => void;
  toggleStatusSheet: () => void;
}

// StatusSheet component with TypeScript
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
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  // Reset category to "all" when sheet is shown
  useEffect(() => {
    if (showStatusSheet) {
      setSelectedCategory("all");
    }
  }, [showStatusSheet]);

  const categories = [
    { id: "all", label: "All" },
    { id: "social", label: "Social" },
    { id: "food", label: "Food" },
    { id: "work", label: "Work" },
    { id: "travel", label: "Travel" }
  ];

  // Get only the first 6 statuses for the selected category
  const filteredStatuses = presetStatuses
    .filter(status => status.category === selectedCategory)
    .slice(0, 6);

  return (
    showStatusSheet && (
      <Animated.View
        style={[
          styles.statusSheet,
          {
            transform: [
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
            paddingBottom: insets.bottom + 16,
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            zIndex: 2,
          },
        ]}
      >
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={toggleStatusSheet}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={24} 
              color={theme === "light" ? "#666666" : "#a0a0a0"} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={{
              alignItems: 'center',
              justifyContent: 'center',
              flexGrow: 1,
              paddingHorizontal: 16
            }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                  { 
                    backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                    borderColor: selectedCategory === category.id ? "#38a5c9" : "transparent"
                  }
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category.id && styles.categoryChipTextActive,
                  { color: theme === "light" ? "#666666" : "#a0a0a0" }
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.statusGrid}>
            {filteredStatuses.map((status, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.statusChip, { backgroundColor: status.color }]}
                onPress={() => {
                  handleUpdateMoodStatus(status.label);
                  toggleStatusSheet();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.statusEmoji}>{status.emoji}</Text>
                <Text style={styles.statusText} numberOfLines={3} ellipsizeMode="tail">{status.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customStatusContainer}>
            <TextInput
              style={[styles.customStatusInput, { 
                backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                color: theme === "light" ? "#000000" : "#e4fbfe",
              }]}
              value={customStatus}
              onChangeText={setCustomStatus}
              placeholder="Custom status..."
              placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
              maxLength={50}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                { 
                  opacity: customStatus.trim().length > 0 ? 1 : 0.5,
                  backgroundColor: "#38a5c9"
                }
              ]}
              disabled={customStatus.trim().length === 0}
              onPress={() => {
                handleUpdateMoodStatus(customStatus);
                toggleStatusSheet();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.submitButtonText}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    )
  );
}

const styles = StyleSheet.create({
  statusSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  contentContainer: {
    flex: 1,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: "#38a5c9",
    borderColor: "#38a5c9",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  statusChip: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  statusEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: 'center',
    lineHeight: 18,
    flexShrink: 1,
  },
  customStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customStatusInput: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
  },
  submitButton: {
    padding: 12,
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});