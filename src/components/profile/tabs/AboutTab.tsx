import React from "react";
import { View, Text, Animated } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface UserData {
  name: string;
  bio?: string;
  currentCity?: string;
  preferredMeetupRadius?: number;
  availabilitySchedule?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
  languages: string[];
}

interface AboutTabProps {
  userData: UserData;
  theme: "light" | "dark";
  tabFadeAnim: Animated.Value;
  tabScaleAnim: Animated.Value;
  isUserCurrentlyAvailable: (schedule: any) => boolean;
  formatTimeToAMPM: (time: string) => string;
}

const AboutTab: React.FC<AboutTabProps> = ({
  userData,
  theme,
  tabFadeAnim,
  tabScaleAnim,
  isUserCurrentlyAvailable,
  formatTimeToAMPM,
}) => {
  return (
    <Animated.View style={[styles.tabContent, { opacity: tabFadeAnim, transform: [{ scale: tabScaleAnim }] }]}>
      <View style={[styles.card, styles.aboutCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>About</Text>
        <Text style={[styles.cardContent, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
          {userData.bio || "No bio provided"}
        </Text>
      </View>
      
      {/* Current City */}
      {userData.currentCity && (
        <View style={[styles.card, styles.locationCard, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
          shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
          shadowOpacity: theme === "light" ? 0.2 : 0.1,
        }]}>
          <View style={styles.locationHeader}>
            <MaterialIcons name="location-on" size={24} color="#37a4c8" style={styles.headerIcon} />
            <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Location</Text>
          </View>
          <Text style={[styles.locationText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
            {userData.currentCity}
          </Text>
          {userData.preferredMeetupRadius && (
            <View style={styles.meetupRadiusContainer}>
              <MaterialIcons name="radar" size={16} color={theme === "light" ? "#666666" : "#999999"} style={styles.headerIcon} />
              <Text style={[styles.meetupRadiusText, { color: theme === "light" ? "#666666" : "#999999" }]}>
                Prefers meetups within {userData.preferredMeetupRadius} miles
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Availability Status */}
      <View style={[styles.card, styles.availabilityCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <View style={styles.availabilityHeader}>
          <MaterialIcons name="schedule" size={24} color="#37a4c8" style={styles.headerIcon} />
          <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Availability</Text>
        </View>
        <View style={styles.availabilityContainer}>
          <View style={[styles.availabilityIndicator, { 
            backgroundColor: isUserCurrentlyAvailable(userData.availabilitySchedule)
              ? (theme === "light" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.2)")
              : (theme === "light" ? "rgba(244, 67, 54, 0.1)" : "rgba(244, 67, 54, 0.2)"),
            borderColor: isUserCurrentlyAvailable(userData.availabilitySchedule) ? "#4CAF50" : "#F44336",
          }]}>
            <View style={[styles.availabilityDot, { 
              backgroundColor: isUserCurrentlyAvailable(userData.availabilitySchedule) ? "#4CAF50" : "#F44336" 
            }]} />
            <Text style={[styles.availabilityText, { 
              color: isUserCurrentlyAvailable(userData.availabilitySchedule) ? "#4CAF50" : "#F44336" 
            }]}>
              {isUserCurrentlyAvailable(userData.availabilitySchedule) ? "Available Now" : "Not Available"}
            </Text>
          </View>
        </View>
        {userData.availabilitySchedule && (
          <View style={styles.scheduleContainer}>
            <Text style={[styles.scheduleTitle, { color: theme === "light" ? "#666666" : "#999999" }]}>
              Weekly Schedule
            </Text>
            <View style={styles.scheduleGrid}>
              {Object.entries(userData.availabilitySchedule).map(([day, schedule]) => (
                <View key={day} style={[styles.scheduleItem, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.1)",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                }]}>
                  <Text style={[styles.scheduleDay, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </Text>
                  <Text style={[styles.scheduleTime, { color: theme === "light" ? "#666666" : "#999999" }]}>
                    {schedule.start === "00:00" && schedule.end === "00:00" ? "Unavailable" : 
                     (schedule.start === "00:00" && schedule.end === "23:59") ? "All day" :
                     `${formatTimeToAMPM(schedule.start)} - ${formatTimeToAMPM(schedule.end)}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={[styles.card, styles.languagesCard, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
        shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "#37a4c8",
        shadowOpacity: theme === "light" ? 0.2 : 0.1,
      }]}>
        <Text style={[styles.cardTitle, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>Languages</Text>
        <View style={styles.tagsContainer}>
          {userData.languages.map((language, index) => (
            <View key={index} style={[styles.tag, { 
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.1)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              shadowColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "transparent",
              shadowOpacity: theme === "light" ? 0.1 : 0,
            }]}>
              <Text style={[styles.tagText, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{language}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = {
  tabContent: {
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.08,
    overflow: 'hidden',
  },
  aboutCard: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  cardContent: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.1,
    fontWeight: "400",
  },
  locationCard: {
    marginTop: 20,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  headerIcon: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  meetupRadiusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  meetupRadiusText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 0,
  },
  availabilityCard: {
    marginTop: 20,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availabilityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleContainer: {
    marginTop: 16,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  scheduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  scheduleItem: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  scheduleDay: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  languagesCard: {
    marginTop: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 0.5,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 1 }],
    shadowColor: 'rgba(0, 0, 0, 0.04)',
    shadowOpacity: 0.06,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
} as any;

export default AboutTab;

