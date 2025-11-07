import { Timestamp } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { Image } from 'react-native';
import { db } from '../../../config/firebaseConfig';
import { Partner, Chat, EventStatus } from './types';

// Helper function to convert any date-like value to a Date object
export const toDate = (value: Date | Timestamp | string | number | undefined): Date | null => {
  if (!value) return null;
  
  try {
    if (value instanceof Date) {
      return value;
    }
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error converting to date:', error);
    return null;
  }
};

// Helper function to get timestamp in milliseconds
export const getTimestampMs = (value: Date | Timestamp | string | number | undefined): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (value instanceof Timestamp) return value.toDate().getTime();
  // Handle string or number timestamps
  const date = toDate(value);
  return date ? date.getTime() : 0;
};

// Get partner user data
export const getPartner = async (userId: string): Promise<Partner> => {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) {
    throw new Error("User not found");
  }
  const data = userDoc.data();
  return {
    id: userDoc.id,
    name: data.name || "",
    profilePicture: data.profilePicture,
    age: data.age?.toString() || "",
    airportCode: data.airportCode || "",
    interests: data.interests || [],
    moodStatus: data.moodStatus,
    isOnline: data.isOnline,
    lastSeen: data.lastSeen
  };
};

// Get event status and time remaining
export const getEventStatus = (startTime: any, endTime?: any): { status: EventStatus; timeRemaining: string } => {
  const now = new Date();
  const start = startTime instanceof Timestamp ? startTime.toDate() : new Date(startTime);
  const end = endTime instanceof Timestamp ? endTime.toDate() : endTime ? new Date(endTime) : null;
  
  // Calculate time difference in hours
  const hoursSinceStart = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  if (now < start) {
    // Event hasn't started
    const diff = start.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      status: 'upcoming',
      timeRemaining: `${hours}h ${minutes}m until start`
    };
  } else if (hoursSinceStart <= 1 && (!end || now < end)) {
    // Event is in progress and started less than an hour ago
    return {
      status: 'in_progress',
      timeRemaining: 'In Progress'
    };
  } else {
    // Event has ended (either explicitly ended or started more than an hour ago)
    return {
      status: 'ended',
      timeRemaining: 'Ended'
    };
  }
};

// Sort event chats by status priority
export const sortEventChats = (chats: Chat[]) => {
  return [...chats].sort((a, b) => {
    const statusA = getEventStatus(a.startTime).status as EventStatus;
    const statusB = getEventStatus(b.startTime).status as EventStatus;
    
    const statusOrder: Record<EventStatus, number> = {
      'in_progress': 0,
      'upcoming': 1,
      'ended': 2
    };
    
    return statusOrder[statusA] - statusOrder[statusB];
  });
};

// Preload images utility
export const preloadImages = (urls: (string | null)[]) => {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<string | null>((resolve, reject) => {
          if (!url) {
            resolve(null);
            return;
          }
          Image.prefetch(url)
            .then(() => resolve(url))
            .catch((error) => {
              console.warn('Error preloading image:', error);
              resolve(null);
            });
        })
    )
  );
};
