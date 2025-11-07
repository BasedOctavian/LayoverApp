import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

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

interface ScheduleSectionProps {
  availabilitySchedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
  theme: string;
}

const ScheduleSection: React.FC<ScheduleSectionProps> = ({ availabilitySchedule, theme }) => {
  if (!availabilitySchedule) return null;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const todaySchedule = availabilitySchedule[currentDay];

  if (!todaySchedule || !todaySchedule.start || !todaySchedule.end) {
    return null;
  }

  const formatTimeToAMPM = (militaryTime: string): string => {
    if (!militaryTime || militaryTime === "00:00") return "12:00 AM";
    
    const [hours, minutes] = militaryTime.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const startTime = formatTimeToAMPM(todaySchedule.start);
  const endTime = formatTimeToAMPM(todaySchedule.end);

  return (
    <View style={[styles.scheduleSection, { 
      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.06)" : "rgba(55, 164, 200, 0.1)",
      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.25)"
    }]}>
      <View style={styles.scheduleHeader}>
        <MaterialIcons name="schedule" size={scale(18)} color="#37a4c8" />
        <Text style={[styles.scheduleTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
          Available Today
        </Text>
      </View>
      <Text style={[styles.scheduleTime, { color: "#37a4c8" }]}>
        {startTime} - {endTime}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scheduleSection: {
    padding: scale(18),
    borderRadius: scale(16),
    borderWidth: scale(1.5),
    marginBottom: scaleHeight(18),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(4),
    elevation: 1,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(10),
    gap: scaleWidth(8),
  },
  scheduleTitle: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    letterSpacing: scale(0.3),
  },
  scheduleTime: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    letterSpacing: scale(0.3),
  },
});

export default ScheduleSection;
