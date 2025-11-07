/**
 * Dashboard Helper Functions
 * Utility functions for dashboard-related operations
 */

import { AvailabilitySchedule } from '../types/dashboard';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param long1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param long2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  long1: number,
  lat2: number,
  long2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLong = toRad(long2 - long1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLong / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if user is currently available based on their schedule
 * @param availabilitySchedule - User's availability schedule
 * @returns True if user is currently available
 */
export function isUserAvailable(availabilitySchedule: AvailabilitySchedule | undefined): boolean {
  if (!availabilitySchedule) return false;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const currentTime = now.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });

  const todaySchedule = availabilitySchedule[currentDay];
  if (!todaySchedule) return false;

  const { start, end } = todaySchedule;

  // Check for invalid or zero times
  if (!start || !end || start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
    return false;
  }

  // Check if start and end are the same (no availability window)
  if (start === end) return false;

  return currentTime >= start && currentTime <= end;
}

/**
 * Format military time to AM/PM format
 * @param militaryTime - Time in 24-hour format (HH:MM)
 * @returns Time in 12-hour format with AM/PM
 */
export function formatTimeToAMPM(militaryTime: string): string {
  if (!militaryTime || militaryTime === "00:00") return "12:00 AM";

  const [hours, minutes] = militaryTime.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Validate if availability schedule has at least one valid day
 * @param availabilitySchedule - User's availability schedule
 * @returns True if schedule has at least one valid day
 */
export function isValidAvailabilitySchedule(availabilitySchedule: AvailabilitySchedule | undefined): boolean {
  if (!availabilitySchedule || typeof availabilitySchedule !== 'object') return false;

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // Check if at least one day has valid availability
  for (const day of days) {
    const daySchedule = availabilitySchedule[day];
    if (daySchedule && daySchedule.start && daySchedule.end) {
      const { start, end } = daySchedule;

      // Skip invalid or zero times
      if (start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
        continue;
      }

      // Skip if start and end are the same
      if (start === end) {
        continue;
      }

      // If we find at least one valid day, the schedule is valid
      return true;
    }
  }

  return false;
}

/**
 * Get availability time range for today
 * @param availabilitySchedule - User's availability schedule
 * @returns Formatted time range string or null
 */
export function getTodayAvailability(availabilitySchedule: AvailabilitySchedule | undefined): string | null {
  if (!availabilitySchedule) return null;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const todaySchedule = availabilitySchedule[currentDay];

  if (!todaySchedule) return null;

  const { start, end } = todaySchedule;

  // Check for invalid or zero times
  if (!start || !end || start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
    return null;
  }

  // Check if start and end are the same
  if (start === end) return null;

  return `${formatTimeToAMPM(start)} - ${formatTimeToAMPM(end)}`;
}

/**
 * Get remaining time until availability ends
 * @param availabilitySchedule - User's availability schedule
 * @returns Formatted remaining time string or null
 */
export function getRemainingTime(availabilitySchedule: AvailabilitySchedule | undefined): string | null {
  if (!availabilitySchedule) return null;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const todaySchedule = availabilitySchedule[currentDay];

  if (!todaySchedule) return null;

  const { end } = todaySchedule;

  // Check for invalid or zero times
  if (!end || end === '0:00' || end === '00:00') {
    return null;
  }

  const [endHour, endMinute] = end.split(':').map(Number);
  const endTime = new Date();
  endTime.setHours(endHour, endMinute, 0, 0);

  const diffMs = endTime.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m left`;
  } else {
    return `${diffMinutes}m left`;
  }
}

/**
 * Get next available time for user
 * @param availabilitySchedule - User's availability schedule
 * @returns Formatted next available time string or null
 */
export function getNextAvailableTime(availabilitySchedule: AvailabilitySchedule | undefined): string | null {
  if (!availabilitySchedule) return null;

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayIndex = now.getDay();

  // Check today and the next 7 days
  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const dayName = days[dayIndex];
    const daySchedule = availabilitySchedule[dayName];

    if (daySchedule && daySchedule.start && daySchedule.end) {
      const { start, end } = daySchedule;

      // Skip invalid or zero times
      if (start === '0:00' || end === '0:00' || start === '00:00' || end === '00:00') {
        continue;
      }

      // Skip if start and end are the same
      if (start === end) {
        continue;
      }

      const [startHour, startMinute] = start.split(':').map(Number);
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + i);
      startTime.setHours(startHour, startMinute, 0, 0);

      // If this is today, check if the start time is in the future
      if (i === 0 && startTime <= now) {
        continue;
      }

      // Format the day name
      const dayNames = ['Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const displayDay = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[dayIndex + 2];

      return `${displayDay} at ${formatTimeToAMPM(start)}`;
    }
  }

  return null;
}

/**
 * Format user rating score
 * @param score - Rating score object
 * @returns Formatted rating string
 */
export function formatRating(score: { average: number; count: number } | undefined): string {
  if (!score || score.count === 0) return 'No ratings yet';
  return `${score.average.toFixed(1)} (${score.count} ${score.count === 1 ? 'rating' : 'ratings'})`;
}

/**
 * Retry async function with exponential backoff
 * @param fn - Async function to retry
 * @param retries - Number of retries (default: 3)
 * @returns Result of the function
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  // This should never be reached, but TypeScript needs it
  throw new Error('Retry failed');
}

/**
 * Check if data is stale based on timestamp
 * @param timestamp - Last fetch timestamp
 * @param maxAge - Maximum age in milliseconds (default: 5 minutes)
 * @returns True if data is stale
 */
export function isDataStale(timestamp: number, maxAge = 5 * 60 * 1000): boolean {
  return Date.now() - timestamp > maxAge;
}


