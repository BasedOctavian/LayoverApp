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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../context/ThemeContext";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";

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
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showStatusSheet) {
      setSelectedCategory("all");
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }
  }, [showStatusSheet, cardAnim]);

  const categories = [
    { id: "all", label: "All" },
    { id: "social", label: "Social" },
    { id: "food", label: "Food" },
    { id: "work", label: "Work" },
    { id: "travel", label: "Travel" }
  ];

  const filteredStatuses = presetStatuses
    .filter(status => status.category === selectedCategory)
    .slice(0, 6);

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
            opacity: cardAnim,
            backgroundColor: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]
            })
          }
        ]}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme === "light" ? "#fff" : "#1a1a1a",
              shadowColor: theme === "light" ? "#38a5c9" : "#000",
              transform: [
                {
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                },
                {
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }
              ],
              opacity: cardAnim
            }
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={[styles.headerIconContainer, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}> 
              <MaterialIcons name="mood" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
            </View>
            <Text style={[styles.headerTitle, { color: theme === "light" ? "#000" : "#e4fbfe" }]}>Set Mood Status</Text>
            <TouchableOpacity
              style={[styles.closeButton, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}
              onPress={toggleStatusSheet}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Feather name="x" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
            </TouchableOpacity>
          </View>

          {/* Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                  {
                    backgroundColor: selectedCategory === category.id
                      ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                      : (theme === "light" ? "#f5f5f5" : "#2a2a2a"),
                    borderColor: selectedCategory === category.id ? "#38a5c9" : "transparent"
                  }
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === category.id && styles.categoryChipTextActive,
                  { color: selectedCategory === category.id ? "#fff" : (theme === "light" ? "#666" : "#a0a0a0") }
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Status Grid */}
          <View style={styles.statusGrid}>
            {filteredStatuses.map((status, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.statusCard,
                  {
                    backgroundColor: status.color,
                    shadowColor: status.color,
                  }
                ]}
                onPress={() => {
                  handleUpdateMoodStatus(status.label);
                  toggleStatusSheet();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.statusEmoji}>{status.emoji}</Text>
                <Text style={styles.statusText} numberOfLines={2} ellipsizeMode="tail">{status.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Status Input */}
          <View style={styles.customStatusContainer}>
            <TextInput
              style={[styles.customStatusInput, {
                backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                color: theme === "light" ? "#000" : "#e4fbfe",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
              }]}
              value={customStatus}
              onChangeText={setCustomStatus}
              placeholder="Custom status..."
              placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
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
                styles.setButton,
                {
                  opacity: customStatus.trim().length > 0 ? 1 : 0.5,
                  backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                }
              ]}
              disabled={customStatus.trim().length === 0}
              onPress={() => {
                handleUpdateMoodStatus(customStatus);
                toggleStatusSheet();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.setButtonText}>Set</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: -0.2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  categoriesContainer: {
    marginBottom: 18,
    marginHorizontal: -8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    borderColor: '#38a5c9',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10,
  },
  statusCard: {
    width: '48%',
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  statusEmoji: {
    fontSize: 26,
    marginBottom: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
    flexShrink: 1,
  },
  customStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  customStatusInput: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    fontSize: 15,
    borderWidth: 1.5,
    marginRight: 6,
  },
  setButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  setButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});