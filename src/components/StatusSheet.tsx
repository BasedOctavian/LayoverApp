import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Feather, FontAwesome5, MaterialIcons, Ionicons } from "@expo/vector-icons";

// Define the interface for preset status items
interface PresetStatus {
  label: string;
  icon: React.ReactNode;
}

// Define preset statuses with typed array
const presetStatuses: PresetStatus[] = [
  { label: "Down to Chat", icon: <FontAwesome5 name="comment" size={18} color="#6a11cb" /> },
  { label: "Food & Drinks?", icon: <MaterialIcons name="restaurant" size={18} color="#6a11cb" /> },
  { label: "Work Mode", icon: <Feather name="briefcase" size={18} color="#6a11cb" /> },
  { label: "Exploring the Airport", icon: <Ionicons name="airplane" size={18} color="#6a11cb" /> },
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
  return (
    showStatusSheet && (
      <Animated.View
        style={[
          styles.statusSheet,
          {
            transform: [
              {
                scale: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
            opacity: sheetAnim,
          },
        ]}
      >
        <Text style={styles.statusTitle}>Update Status</Text>
        <View style={styles.statusGrid}>
          {presetStatuses.map((status, index) => (
            <TouchableOpacity
              key={index}
              style={styles.statusChip}
              onPress={() => {
                handleUpdateMoodStatus(status.label);
                toggleStatusSheet();
              }}
            >
              <View style={styles.statusChipContent}>
                {status.icon}
                <Text style={styles.statusText}>{status.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.customStatusLabel}>Custom Status</Text>
        <TextInput
          style={styles.customStatusInput}
          value={customStatus}
          onChangeText={setCustomStatus}
          placeholder="Enter your status..."
          placeholderTextColor="#718096"
        />
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            handleUpdateMoodStatus(customStatus);
            toggleStatusSheet();
          }}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </Animated.View>
    )
  );
}

// Define typed styles
const styles = StyleSheet.create({
  statusSheet: {
    position: "absolute",
    bottom: 72,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    padding: 20,
    width: 240,
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 101,
  } as ViewStyle,
  statusTitle: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  } as TextStyle,
  statusGrid: {
    gap: 12,
  } as ViewStyle,
  statusChip: {
    backgroundColor: "rgba(106,17,203,0.05)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  } as ViewStyle,
  statusChipContent: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  statusText: {
    fontSize: 14,
    color: "#6a11cb",
    fontWeight: "500",
    marginLeft: 8,
  } as TextStyle,
  customStatusLabel: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  } as TextStyle,
  customStatusInput: {
    backgroundColor: "rgba(106,17,203,0.05)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#6a11cb",
    marginBottom: 12,
  } as TextStyle,
  submitButton: {
    backgroundColor: "#6a11cb",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  } as ViewStyle,
  submitButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  } as TextStyle,
});