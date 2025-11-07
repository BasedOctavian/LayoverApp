import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  theme: string;
}

export default function CountdownTimer({ targetDate, onComplete, theme }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsComplete(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onComplete) onComplete();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsComplete(false);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!timeLeft) {
    return null;
  }

  if (isComplete) {
    // Don't show anything when countdown completes - status will be updated to "completed"
    return null;
  }

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 2; // Less than 2 hours
  const urgentColor = isUrgent ? '#ef4444' : '#0284c7';
  const urgentBg = isUrgent 
    ? (theme === 'light' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.2)')
    : (theme === 'light' ? 'rgba(55, 164, 200, 0.12)' : 'rgba(55, 164, 200, 0.2)');
  const urgentBorder = isUrgent
    ? (theme === 'light' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)')
    : (theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)');

  return (
    <View style={[styles.container, {
      backgroundColor: urgentBg,
      borderColor: urgentBorder,
    }]}>
      <MaterialIcons 
        name={isUrgent ? "warning" : "schedule"} 
        size={18} 
        color={urgentColor} 
      />
      <View style={styles.timerContent}>
        <Text style={[styles.timerLabel, { 
          color: theme === 'light' ? '#64748b' : '#94a3b8' 
        }]}>
          {isUrgent ? 'Starting in' : 'Begins in'}
        </Text>
        <Text style={[styles.countdownText, { color: urgentColor }]}>
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {String(timeLeft.hours).padStart(2, '0')}:
          {String(timeLeft.minutes).padStart(2, '0')}:
          {String(timeLeft.seconds).padStart(2, '0')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countdownText: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  completeText: {
    fontSize: 14,
    fontWeight: '700',
  },
});









