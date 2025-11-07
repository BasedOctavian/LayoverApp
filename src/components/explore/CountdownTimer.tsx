import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CountdownTimerProps {
  startTime: Date | null;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ startTime }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!startTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const difference = start - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } else {
        setTimeLeft('Starting now');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <View style={styles.countdownContainer}>
      <Ionicons name="time-outline" size={12} color="#37a4c8" />
      <Text style={styles.countdownText}>{timeLeft}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#37a4c8',
  },
});
