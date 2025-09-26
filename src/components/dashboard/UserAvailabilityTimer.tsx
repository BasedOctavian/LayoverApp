import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface UserAvailabilityTimerProps {
  availabilitySchedule: any;
  theme: string;
}

export default function UserAvailabilityTimer({ availabilitySchedule, theme }: UserAvailabilityTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!availabilitySchedule) {
        setTimeLeft('');
        return;
      }
      
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()];
      const todaySchedule = availabilitySchedule[currentDay];
      
      if (!todaySchedule) {
        setTimeLeft('');
        return;
      }
      
      const { end } = todaySchedule;
      
      // Check for invalid or zero times
      if (!end || end === '0:00' || end === '00:00') {
        setTimeLeft('');
        return;
      }
      
      const [endHour, endMinute] = end.split(':').map(Number);
      const endTime = new Date();
      endTime.setHours(endHour, endMinute, 0, 0);
      
      const diffMs = endTime.getTime() - now.getTime();
      if (diffMs <= 0) {
        setTimeLeft('');
        return;
      }
      
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        setTimeLeft(`${diffHours}h ${diffMinutes}m left`);
      } else {
        setTimeLeft(`${diffMinutes}m left`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [availabilitySchedule]);

  if (!timeLeft) return null;

  return (
    <View style={[styles.metaItem, { 
      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"
    }]}>
      <Feather name="clock" size={9} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
      <Text 
        style={[styles.metaText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {timeLeft}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
    minHeight: 24,
    maxWidth: '100%',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: 0.1,
  },
});
