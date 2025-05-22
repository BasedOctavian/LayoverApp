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
  Platform,
} from "react-native";
import { Feather, FontAwesome5, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  
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
            paddingBottom: insets.bottom + 24,
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
    bottom: 0,
    right: 0,
    left: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    shadowColor: "#2F80ED",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 101,
  } as ViewStyle,
  statusTitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  } as TextStyle,
  statusGrid: {
    gap: 14,
  } as ViewStyle,
  statusChip: {
    backgroundColor: "rgba(47,128,237,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  } as ViewStyle,
  statusChipContent: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  statusText: {
    fontSize: 15,
    color: "#2F80ED",
    fontWeight: "600",
    marginLeft: 10,
  } as TextStyle,
  customStatusLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  } as TextStyle,
  customStatusInput: {
    backgroundColor: "rgba(47,128,237,0.08)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 15,
    color: "#2F80ED",
    marginBottom: 16,
  } as TextStyle,
  submitButton: {
    backgroundColor: "#2F80ED",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#2F80ED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  submitButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
  } as TextStyle,
});