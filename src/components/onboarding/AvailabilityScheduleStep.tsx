import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const scaleSize = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleFont = (size: number) => Math.round((SCREEN_WIDTH / 375) * size);
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;
const isSmallDevice = SCREEN_WIDTH < 375;

interface AvailabilitySchedule {
  monday: { start: string; end: string };
  tuesday: { start: string; end: string };
  wednesday: { start: string; end: string };
  thursday: { start: string; end: string };
  friday: { start: string; end: string };
  saturday: { start: string; end: string };
  sunday: { start: string; end: string };
}

interface Props {
  availabilitySchedule: AvailabilitySchedule;
  onScheduleChange: (schedule: AvailabilitySchedule) => void;
}

const PRESET_SCHEDULES = [
  {
    name: "Flexible (Anytime)",
    icon: "clock",
    schedule: {
      monday: { start: "00:00", end: "23:59" },
      tuesday: { start: "00:00", end: "23:59" },
      wednesday: { start: "00:00", end: "23:59" },
      thursday: { start: "00:00", end: "23:59" },
      friday: { start: "00:00", end: "23:59" },
      saturday: { start: "00:00", end: "23:59" },
      sunday: { start: "00:00", end: "23:59" },
    },
  },
  {
    name: "9-to-5 (Weekdays)",
    icon: "briefcase",
    schedule: {
      monday: { start: "17:00", end: "23:00" },
      tuesday: { start: "17:00", end: "23:00" },
      wednesday: { start: "17:00", end: "23:00" },
      thursday: { start: "17:00", end: "23:00" },
      friday: { start: "17:00", end: "23:59" },
      saturday: { start: "00:00", end: "23:59" },
      sunday: { start: "00:00", end: "23:59" },
    },
  },
  {
    name: "Evenings & Weekends",
    icon: "moon",
    schedule: {
      monday: { start: "18:00", end: "23:00" },
      tuesday: { start: "18:00", end: "23:00" },
      wednesday: { start: "18:00", end: "23:00" },
      thursday: { start: "18:00", end: "23:00" },
      friday: { start: "18:00", end: "23:59" },
      saturday: { start: "00:00", end: "23:59" },
      sunday: { start: "00:00", end: "23:59" },
    },
  },
  {
    name: "Weekends Only",
    icon: "calendar",
    schedule: {
      monday: { start: "00:00", end: "00:00" },
      tuesday: { start: "00:00", end: "00:00" },
      wednesday: { start: "00:00", end: "00:00" },
      thursday: { start: "00:00", end: "00:00" },
      friday: { start: "00:00", end: "00:00" },
      saturday: { start: "00:00", end: "23:59" },
      sunday: { start: "00:00", end: "23:59" },
    },
  },
];

export default function AvailabilityScheduleStep({ availabilitySchedule, onScheduleChange }: Props) {
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [currentTimePicker, setCurrentTimePicker] = useState<{
    day: keyof AvailabilitySchedule;
    type: "start" | "end";
  } | null>(null);

  const formatTimeForDisplay = (militaryTime: string): string => {
    if (militaryTime === "00:00") return "12:00 AM";
    const [hours, minutes] = militaryTime.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const handleAvailabilityChange = (
    day: keyof AvailabilitySchedule,
    type: "start" | "end",
    time: string
  ) => {
    onScheduleChange({
      ...availabilitySchedule,
      [day]: {
        ...availabilitySchedule[day],
        [type]: time,
      },
    });
  };

  const openTimePicker = (day: keyof AvailabilitySchedule, type: "start" | "end") => {
    setCurrentTimePicker({ day, type });
    setShowTimePickerModal(true);
  };

  const handleTimeSelection = (hour: number, minute: number, period: "AM" | "PM") => {
    if (!currentTimePicker) return;

    let militaryHour = hour;
    if (period === "PM" && hour !== 12) {
      militaryHour += 12;
    } else if (period === "AM" && hour === 12) {
      militaryHour = 0;
    }

    const timeString = `${militaryHour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;

    handleAvailabilityChange(currentTimePicker.day, currentTimePicker.type, timeString);
    setShowTimePickerModal(false);
  };

  const handleSetForAllDays = (startTime: string, endTime: string) => {
    const newSchedule: AvailabilitySchedule = {
      monday: { start: startTime, end: endTime },
      tuesday: { start: startTime, end: endTime },
      wednesday: { start: startTime, end: endTime },
      thursday: { start: startTime, end: endTime },
      friday: { start: startTime, end: endTime },
      saturday: { start: startTime, end: endTime },
      sunday: { start: startTime, end: endTime },
    };
    onScheduleChange(newSchedule);
  };

  const capitalizeDay = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <View style={styles.container}>
      {/* Preset Buttons */}
      <View style={styles.presetsContainer}>
        <Text style={styles.presetsTitle}>Quick Presets</Text>
        <View style={styles.presetsGrid}>
          {PRESET_SCHEDULES.map((preset) => (
            <TouchableOpacity
              key={preset.name}
              style={styles.presetButton}
              onPress={() => onScheduleChange(preset.schedule)}
              activeOpacity={0.8}
            >
              <View style={styles.presetIconContainer}>
                <Feather name={preset.icon as any} size={scaleSize(20)} color="#38a5c9" />
              </View>
              <Text style={styles.presetText}>{preset.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom Schedule */}
      <View style={styles.scheduleContainer}>
        <Text style={styles.scheduleTitle}>Custom Schedule</Text>
        <Text style={styles.scheduleSubtitle}>
          Set when you're available for each day. Tap "00:00" to mark as unavailable.
        </Text>

        {(Object.keys(availabilitySchedule) as Array<keyof AvailabilitySchedule>).map((day) => (
          <View key={day} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{capitalizeDay(day)}</Text>
            <View style={styles.timeButtons}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => openTimePicker(day, "start")}
                activeOpacity={0.7}
              >
                <Text style={styles.timeButtonText}>
                  {formatTimeForDisplay(availabilitySchedule[day].start)}
                </Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>to</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => openTimePicker(day, "end")}
                activeOpacity={0.7}
              >
                <Text style={styles.timeButtonText}>
                  {formatTimeForDisplay(availabilitySchedule[day].end)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.applyAllButton}
          onPress={() =>
            handleSetForAllDays(
              availabilitySchedule.monday.start,
              availabilitySchedule.monday.end
            )
          }
          activeOpacity={0.7}
        >
          <Feather name="copy" size={scaleSize(16)} color="#38a5c9" />
          <Text style={styles.applyAllText}>Apply Monday's times to all days</Text>
        </TouchableOpacity>
      </View>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePickerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MaterialIcons name="access-time" size={24} color="#38a5c9" />
                <Text style={styles.modalTitle}>Select Time</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTimePickerModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <Feather name="x" size={20} color="#38a5c9" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContainer}>
              <Text style={styles.timePickerLabel}>
                {currentTimePicker?.type === "start" ? "Start Time" : "End Time"}
              </Text>

              <ScrollView
                style={styles.timePickerScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <View style={styles.timePickerGrid}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                    <View key={hour} style={styles.timePickerRow}>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => handleTimeSelection(hour, 0, "AM")}
                      >
                        <Text style={styles.timePickerButtonText}>{hour}:00 AM</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => handleTimeSelection(hour, 0, "PM")}
                      >
                        <Text style={styles.timePickerButtonText}>{hour}:00 PM</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  presetsContainer: {
    marginBottom: verticalScale(24),
  },
  presetsTitle: {
    fontSize: scaleFont(16),
    fontFamily: "Inter-SemiBold",
    color: "#e4fbfe",
    marginBottom: verticalScale(12),
    textAlign: "center",
  },
  presetsGrid: {
    gap: scaleSize(12),
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(16),
    paddingHorizontal: scaleSize(20),
    borderRadius: scaleSize(12),
    borderWidth: 2,
    borderColor: "rgba(56, 165, 201, 0.3)",
    backgroundColor: "rgba(26, 26, 26, 0.6)",
    gap: scaleSize(12),
  },
  presetIconContainer: {
    width: scaleSize(40),
    height: scaleSize(40),
    borderRadius: scaleSize(20),
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  presetText: {
    flex: 1,
    fontSize: scaleFont(15),
    fontFamily: "Inter-Medium",
    color: "#e4fbfe",
  },
  scheduleContainer: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    borderWidth: 1.5,
    borderColor: "rgba(56, 165, 201, 0.3)",
  },
  scheduleTitle: {
    fontSize: scaleFont(16),
    fontFamily: "Inter-SemiBold",
    color: "#e4fbfe",
    marginBottom: verticalScale(8),
  },
  scheduleSubtitle: {
    fontSize: scaleFont(13),
    fontFamily: "Inter-Regular",
    color: "#94A3B8",
    marginBottom: verticalScale(16),
    lineHeight: scaleFont(18),
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 165, 201, 0.1)",
  },
  dayLabel: {
    fontSize: scaleFont(15),
    fontFamily: "Inter-Medium",
    color: "#e4fbfe",
    width: scaleSize(90),
  },
  timeButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(8),
  },
  timeButton: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scaleSize(12),
    borderRadius: scaleSize(8),
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    borderWidth: 1,
    borderColor: "#38a5c9",
    minWidth: scaleSize(85),
  },
  timeButtonText: {
    fontSize: scaleFont(13),
    fontFamily: "Inter-Medium",
    color: "#38a5c9",
    textAlign: "center",
  },
  timeSeparator: {
    fontSize: scaleFont(13),
    fontFamily: "Inter-Regular",
    color: "#94A3B8",
  },
  applyAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    marginTop: verticalScale(16),
    gap: scaleSize(8),
  },
  applyAllText: {
    fontSize: scaleFont(14),
    fontFamily: "Inter-Medium",
    color: "#38a5c9",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: scaleSize(20),
    width: SCREEN_WIDTH * 0.9,
    maxHeight: SCREEN_HEIGHT * 0.7,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scaleSize(20),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 165, 201, 0.2)",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(12),
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontFamily: "Inter-Bold",
    color: "#e4fbfe",
  },
  closeButton: {
    padding: scaleSize(8),
    borderRadius: scaleSize(20),
    backgroundColor: "rgba(56, 165, 201, 0.1)",
  },
  timePickerContainer: {
    padding: scaleSize(20),
  },
  timePickerLabel: {
    fontSize: scaleFont(14),
    fontFamily: "Inter-Medium",
    color: "#94A3B8",
    marginBottom: verticalScale(16),
    textAlign: "center",
  },
  timePickerScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  timePickerGrid: {
    gap: scaleSize(12),
  },
  timePickerRow: {
    flexDirection: "row",
    gap: scaleSize(12),
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    paddingHorizontal: scaleSize(16),
    borderRadius: scaleSize(12),
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 165, 201, 0.3)",
    alignItems: "center",
  },
  timePickerButtonText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter-Medium",
    color: "#38a5c9",
  },
});

