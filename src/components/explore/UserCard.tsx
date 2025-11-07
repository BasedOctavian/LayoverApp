import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';

export interface User {
  id: string;
  name: string;
  age: number;
  bio: string;
  profilePicture: string;
  interests: string[];
  moodStatus: string;
  languages?: string[];
  goals?: string[];
  travelHistory?: string[];
  availabilitySchedule?: {
    monday?: { start: string; end: string };
    tuesday?: { start: string; end: string };
    wednesday?: { start: string; end: string };
    thursday?: { start: string; end: string };
    friday?: { start: string; end: string };
    saturday?: { start: string; end: string };
    sunday?: { start: string; end: string };
  };
  lastKnownCoordinates?: {
    latitude: number;
    longitude: number;
  };
  currentCity?: string;
  personalTags?: string[];
}

interface UserCardProps {
  user: User;
  isAvailable?: boolean;
}

// Helper function to check if user is currently available
const isUserCurrentlyAvailable = (availabilitySchedule: any): boolean => {
  if (!availabilitySchedule) return false;

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof availabilitySchedule;
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

  const daySchedule = availabilitySchedule[currentDay];
  if (!daySchedule || !daySchedule.start || !daySchedule.end) return false;

  // If both start and end are '00:00', treat as unavailable
  if (daySchedule.start === '00:00' && daySchedule.end === '00:00') return false;

  // Parse start and end as minutes since midnight
  const parseMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const startMinutes = parseMinutes(daySchedule.start);
  const endMinutes = parseMinutes(daySchedule.end);

  // Handle overnight schedules (e.g., 22:00-02:00)
  if (endMinutes < startMinutes) {
    return currentTime >= startMinutes || currentTime <= endMinutes;
  }

  return currentTime >= startMinutes && currentTime <= endMinutes;
};

export const UserCard: React.FC<UserCardProps> = ({ user, isAvailable }) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const availableNow = isAvailable ?? isUserCurrentlyAvailable(user.availabilitySchedule);

  const handlePress = () => {
    router.push(`/profile/${user.id}`);
  };

  return (
    <TouchableOpacity
      style={[
        styles.userCard,
        {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: theme === "light" ? "#E2E8F0" : "#374151",
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Available Now Tag */}
      {availableNow && (
        <View style={styles.availableNowTag}>
          <Text style={styles.availableNowTagText}>Available Now</Text>
        </View>
      )}
      
      <View style={styles.userCardContent}>
        <View style={styles.userHeader}>
          <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
          <View style={styles.userMainInfo}>
            <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
              {user.name}
            </Text>
            <Text style={[styles.userAge, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
              {user.age} yrs
            </Text>
            {user.currentCity && (
              <Text style={[styles.userLocation, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                {user.currentCity}
              </Text>
            )}
          </View>
        </View>
        
        <Text style={[styles.userBio, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={2}>
          {user.bio}
        </Text>
        
        {/* Render first 3 personalTags as tags, if present */}
        {user.personalTags && user.personalTags.length > 0 && (
          <View style={styles.userInterestsContainer}>
            {user.personalTags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={[styles.interestTag, { borderColor: theme === "light" ? "#E2E8F0" : "#374151" }]}> 
                <Text style={[styles.interestText, { color: theme === "light" ? "#37a4c8" : "#e4fbfe" }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  userCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  userCardContent: {
    padding: 18,
    flex: 1,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    height: 48,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 0,
  },
  userMainInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  userAge: {
    fontSize: 13,
    fontWeight: '500',
  },
  userLocation: {
    fontSize: 13,
    fontWeight: '500',
  },
  userBio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 6,
  },
  interestTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  availableNowTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#37a4c8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 2,
    elevation: 2,
  },
  availableNowTagText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
