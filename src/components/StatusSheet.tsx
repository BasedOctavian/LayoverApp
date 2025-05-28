import React, { useRef } from "react";
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
import { PanGestureHandler, State } from "react-native-gesture-handler";

// Define the interface for preset status items
interface PresetStatus {
  label: string;
  icon: React.ReactNode;
  color: string;
}

// Define preset statuses with typed array
const presetStatuses: PresetStatus[] = [
  { 
    label: "Down to Chat", 
    icon: <FontAwesome5 name="comment" size={16} color="#FFFFFF" />,
    color: "#38a5c9"
  },
  { 
    label: "Food & Drinks?", 
    icon: <MaterialIcons name="restaurant" size={16} color="#FFFFFF" />,
    color: "#4CAF50"
  },
  { 
    label: "Work Mode", 
    icon: <Feather name="briefcase" size={16} color="#FFFFFF" />,
    color: "#FF9800"
  },
  { 
    label: "Exploring", 
    icon: <Ionicons name="airplane" size={16} color="#FFFFFF" />,
    color: "#9C27B0"
  },
  { 
    label: "Relaxing", 
    icon: <Feather name="coffee" size={16} color="#FFFFFF" />,
    color: "#795548"
  },
  { 
    label: "Shopping", 
    icon: <Feather name="shopping-bag" size={16} color="#FFFFFF" />,
    color: "#E91E63"
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
  const translateY = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationY } = event.nativeEvent;

      if (translationY > 100 && !isClosing.current) {
        isClosing.current = true;
        translateY.setValue(translationY);
        
        Animated.parallel([
          Animated.timing(sheetAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 1000,
            duration: 200,
            useNativeDriver: true,
          })
        ]).start(() => {
          translateY.setValue(0);
          isClosing.current = false;
          toggleStatusSheet();
        });
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 8,
        }).start();
      }
    }
  };

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
                  outputRange: [0.9, 1],
                }),
              },
              {
                translateY: Animated.add(
                  sheetAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                  translateY
                ),
              },
            ],
            opacity: sheetAnim,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View style={styles.handleContainer}>
            <View style={styles.handle} />
          </Animated.View>
        </PanGestureHandler>
        <Text style={styles.statusTitle}>Update Status</Text>
        <View style={styles.statusGrid}>
          {presetStatuses.map((status, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.statusChip, { backgroundColor: status.color }]}
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
          placeholderTextColor="#64748B"
          maxLength={50}
        />
        <TouchableOpacity
          style={[
            styles.submitButton,
            { opacity: customStatus.trim().length > 0 ? 1 : 0.5 }
          ]}
          disabled={customStatus.trim().length === 0}
          onPress={() => {
            handleUpdateMoodStatus(customStatus);
            toggleStatusSheet();
          }}
        >
          <Text style={styles.submitButtonText}>Update Status</Text>
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
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 101,
    borderWidth: 1,
    borderColor: "#38a5c9",
  } as ViewStyle,
  handleContainer: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#38a5c9",
    borderRadius: 2,
    opacity: 0.8,
  } as ViewStyle,
  statusTitle: {
    fontSize: 14,
    color: "#e4fbfe",
    fontWeight: "600",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  } as TextStyle,
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  } as ViewStyle,
  statusChip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: "48%",
    flex: 1,
  } as ViewStyle,
  statusChipContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  } as ViewStyle,
  statusText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  } as TextStyle,
  customStatusLabel: {
    fontSize: 14,
    color: "#e4fbfe",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  } as TextStyle,
  customStatusInput: {
    backgroundColor: "#000000",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#e4fbfe",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
  } as TextStyle,
  submitButton: {
    backgroundColor: "#38a5c9",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#38a5c9",
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