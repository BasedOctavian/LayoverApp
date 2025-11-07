import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';
import { PING_CATEGORIES } from '../../constants/pingCategories';
import { CountdownTimer } from './CountdownTimer';

export interface Event {
  id: string;
  title: string;
  description: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  createdAt: any;
  startTime: string | null;
  creatorId: string;
  creatorName: string;
  participants: string[];
  participantCount: number;
  location: string;
  category: string;
  eventUID: string;
  eventImage: string | null;
  updatedAt: any;
  duration: string;
  maxParticipants: string;
  status: string;
  template: string;
  pingType: string;
  visibilityRadius: string;
  connectionIntents: string[];
  eventPreferences: any;
}

export interface Ping {
  id: string;
  creatorId: string;
  creatorName: string;
  title: string;
  description: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  category: string;
  template: string;
  duration: string;
  maxParticipants: string;
  pingType: string;
  visibilityRadius: string;
  connectionIntents: string[];
  eventPreferences: any;
  createdAt: any;
  status: string;
  participants: string[];
  participantCount: number;
}

export interface UnifiedItem {
  id: string;
  type: 'event' | 'ping';
  data: Event | Ping;
  createdAt: any;
  distance?: number;
}

interface ActivityCardProps {
  item: UnifiedItem;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ item }) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const isEvent = item.type === 'event';
  const data = item.data as Event | Ping;

  const handlePress = () => {
    if (isEvent) {
      router.push(`/event/${item.id}`);
    } else {
      router.push(`/ping/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.activityCard,
        {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: theme === "light" ? "#E2E8F0" : "#374151",
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.activityCardHeader}>
        <View style={styles.activityBadge}>
          <Ionicons 
            name={isEvent ? "calendar" : "flash"} 
            size={12} 
            color="#FFFFFF" 
          />
          <Text style={styles.activityBadgeText}>
            {isEvent ? "EVENT" : "PING"}
          </Text>
        </View>
        
        {item.distance && (
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={12} color="#37a4c8" />
            <Text style={styles.distanceText}>
              {item.distance.toFixed(1)} mi
            </Text>
          </View>
        )}
      </View>

      <View style={styles.activityCardContent}>
        <Text style={[styles.activityTitle, { 
          color: theme === "light" ? "#0F172A" : "#e4fbfe" 
        }]} numberOfLines={2}>
          {data.title}
        </Text>
        
        <Text style={[styles.activityDescription, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]} numberOfLines={2}>
          {data.description}
        </Text>

        <View style={styles.activityMeta}>
          <View style={styles.organizerContainer}>
            <Ionicons name="person" size={14} color={theme === "light" ? "#64748B" : "#94A3B8"} />
            <Text style={[styles.organizerText, { 
              color: theme === "light" ? "#64748B" : "#94A3B8" 
            }]}>
              {data.creatorName}
            </Text>
          </View>
        </View>

        {isEvent && (data as Event).startTime && (
          <CountdownTimer startTime={new Date((data as Event).startTime!)} />
        )}

        <View style={styles.activityFooter}>
          <View style={styles.categoryTag}>
            <MaterialIcons 
              name={PING_CATEGORIES.find(cat => cat.id === data.category)?.icon as any || "category"} 
              size={14} 
              color="#37a4c8" 
            />
            <Text style={styles.categoryTagText}>
              {PING_CATEGORIES.find(cat => cat.id === data.category)?.label || data.category}
            </Text>
          </View>

          <View style={styles.participantsContainer}>
            <Ionicons name="people" size={14} color="#37a4c8" />
            <Text style={styles.participantsText}>
              {data.participantCount}/{data.maxParticipants}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  activityCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#37a4c8',
  },
  activityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  distanceText: {
    color: '#37a4c8',
    fontSize: 10,
    fontWeight: '500',
    marginLeft: 4,
  },
  activityCardContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  activityDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  organizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    color: '#37a4c8',
  },
  activityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  categoryTagText: {
    color: '#37a4c8',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    letterSpacing: 0.2,
  },
});
