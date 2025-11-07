import React from "react";
import { View, Text, StyleSheet, Switch, Dimensions } from "react-native";
import { MaterialIcons, Feather } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const scaleSize = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleFont = (size: number) => Math.round((SCREEN_WIDTH / 375) * size);
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size;

interface EventPreferences {
  likesBars: boolean;
  prefersSmallGroups: boolean;
  prefersWeekendEvents: boolean;
  prefersEveningEvents: boolean;
  prefersIndoorVenues: boolean;
  prefersStructuredActivities: boolean;
  prefersSpontaneousPlans: boolean;
  prefersLocalMeetups: boolean;
  prefersTravelEvents: boolean;
  prefersQuietEnvironments: boolean;
  prefersActiveLifestyles: boolean;
  prefersIntellectualDiscussions: boolean;
}

interface Props {
  eventPreferences: EventPreferences;
  onPreferencesChange: (preferences: EventPreferences) => void;
}

const EVENT_PREFERENCES_OPTIONS = [
  // Social & Environment (0-3)
  { key: "likesBars" as keyof EventPreferences, label: "Enjoys bars & nightlife", icon: "local-bar" },
  { key: "prefersSmallGroups" as keyof EventPreferences, label: "Prefers small groups", icon: "groups" },
  { key: "prefersQuietEnvironments" as keyof EventPreferences, label: "Prefers quiet settings", icon: "volume-off" },
  { key: "prefersIndoorVenues" as keyof EventPreferences, label: "Prefers indoor venues", icon: "home" },
  
  // Timing & Schedule (4-7)
  { key: "prefersWeekendEvents" as keyof EventPreferences, label: "Prefers weekend events", icon: "weekend" },
  { key: "prefersEveningEvents" as keyof EventPreferences, label: "Prefers evening events", icon: "nightlight" },
  { key: "prefersStructuredActivities" as keyof EventPreferences, label: "Likes structured activities", icon: "event-note" },
  { key: "prefersSpontaneousPlans" as keyof EventPreferences, label: "Enjoys spontaneous plans", icon: "flash-on" },
  
  // Location & Travel (8-9)
  { key: "prefersLocalMeetups" as keyof EventPreferences, label: "Prefers local meetups", icon: "place" },
  { key: "prefersTravelEvents" as keyof EventPreferences, label: "Enjoys travel events", icon: "flight" },
  
  // Lifestyle & Interests (10-11)
  { key: "prefersActiveLifestyles" as keyof EventPreferences, label: "Active lifestyle", icon: "directions-run" },
  { key: "prefersIntellectualDiscussions" as keyof EventPreferences, label: "Intellectual discussions", icon: "psychology" },
];

export default function EventPreferencesStep({ eventPreferences, onPreferencesChange }: Props) {
  const handleToggle = (key: keyof EventPreferences) => {
    onPreferencesChange({
      ...eventPreferences,
      [key]: !eventPreferences[key],
    });
  };

  const hasSelectionInCategory = (startIdx: number, endIdx: number) => {
    return EVENT_PREFERENCES_OPTIONS.slice(startIdx, endIdx).some(
      (opt) => eventPreferences[opt.key]
    );
  };

  const renderSection = (
    title: string,
    startIdx: number,
    endIdx: number,
    icon: string
  ) => {
    const hasSelection = hasSelectionInCategory(startIdx, endIdx);

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={styles.sectionIconContainer}>
              <MaterialIcons name={icon as any} size={20} color="#38a5c9" />
            </View>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          {hasSelection ? (
            <View style={styles.validationSuccess}>
              <Feather name="check-circle" size={16} color="#22c55e" />
              <Text style={styles.validationSuccessText}>Complete</Text>
            </View>
          ) : (
            <View style={styles.validationError}>
              <Text style={styles.validationErrorText}>Required</Text>
            </View>
          )}
        </View>
        {EVENT_PREFERENCES_OPTIONS.slice(startIdx, endIdx).map((opt) => (
          <View key={opt.key} style={styles.preferenceRow}>
            <View style={styles.preferenceContent}>
              <MaterialIcons name={opt.icon as any} size={20} color="#38a5c9" />
              <Text style={styles.preferenceLabel}>{opt.label}</Text>
            </View>
            <Switch
              value={eventPreferences[opt.key]}
              onValueChange={() => handleToggle(opt.key)}
              trackColor={{ false: "#374151", true: "#38a5c9" }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Tell us how you prefer to connect and what environments you enjoy. Select at least one
        option in each category.
      </Text>

      {renderSection("Social & Environment", 0, 4, "people")}
      {renderSection("Timing & Schedule", 4, 8, "schedule")}
      {renderSection("Location & Travel", 8, 10, "explore")}
      {renderSection("Lifestyle & Interests", 10, 12, "favorite")}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  description: {
    fontSize: scaleFont(14),
    fontFamily: "Inter-Regular",
    color: "#94A3B8",
    marginBottom: verticalScale(20),
    lineHeight: scaleFont(20),
    textAlign: "center",
  },
  section: {
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    borderRadius: scaleSize(16),
    padding: scaleSize(16),
    borderWidth: 1.5,
    borderColor: "rgba(56, 165, 201, 0.3)",
    marginBottom: verticalScale(16),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 165, 201, 0.2)",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(12),
    flex: 1,
  },
  sectionIconContainer: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: scaleSize(18),
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontFamily: "Inter-SemiBold",
    color: "#e4fbfe",
    flex: 1,
  },
  validationSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(6),
    paddingHorizontal: scaleSize(10),
    paddingVertical: verticalScale(4),
    borderRadius: scaleSize(12),
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  validationSuccessText: {
    fontSize: scaleFont(12),
    fontFamily: "Inter-Medium",
    color: "#22c55e",
  },
  validationError: {
    paddingHorizontal: scaleSize(10),
    paddingVertical: verticalScale(4),
    borderRadius: scaleSize(12),
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  validationErrorText: {
    fontSize: scaleFont(12),
    fontFamily: "Inter-Medium",
    color: "#ef4444",
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scaleSize(12),
    backgroundColor: "rgba(56, 165, 201, 0.05)",
    borderRadius: scaleSize(10),
    borderWidth: 1,
    borderColor: "rgba(56, 165, 201, 0.2)",
    marginBottom: verticalScale(10),
  },
  preferenceContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSize(12),
    flex: 1,
  },
  preferenceLabel: {
    fontSize: scaleFont(14),
    fontFamily: "Inter-Medium",
    color: "#e4fbfe",
    flex: 1,
  },
});

