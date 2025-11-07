import { useState } from 'react';
import { db } from '../../config/firebaseConfig';
import { collection, addDoc, doc, getDoc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { haversineDistance } from '../utils/haversineDistance';
import useUsers from './useUsers';
import { PingFormData } from '../types/pingTypes';
import { User } from 'firebase/auth';
import useConnections from './useConnections';

interface UsePingsProps {
  user: User | null;
}

interface Ping {
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

// Mood Profile Definitions for Dynamic Matching
interface MoodProfile {
  category: 'seeking' | 'neutral' | 'selective' | 'unavailable';
  radiusMultiplier: number;      // Adjust search radius
  notificationWeight: number;    // Priority in queue (0-10)
  requireInterestMatch: boolean; // Must have interest overlap
  minMatchThreshold: number;     // Minimum match quality (0-5)
  description: string;           // Human-readable description
}

interface UserMatch {
  user: any;
  moodProfile: MoodProfile;
  distanceMiles: number;
  interestMatches: number;
  effectiveRadius: number;
  weight: number;
  moodStatus: string | undefined;
}

// Define mood profiles with dynamic properties
const moodProfiles: Record<string, MoodProfile> = {
  // SEEKING MOODS - Cast wider net, high priority notifications
  "Available": { 
    category: 'seeking', 
    radiusMultiplier: 1.5,
    notificationWeight: 10,
    requireInterestMatch: false,
    minMatchThreshold: 0,
    description: "Actively seeking activities"
  },
  "Looking for Company": { 
    category: 'seeking', 
    radiusMultiplier: 2.0,    // Search 2x further
    notificationWeight: 10,
    requireInterestMatch: false,
    minMatchThreshold: 0,
    description: "Eager to connect"
  },
  "Free to Chat": { 
    category: 'seeking', 
    radiusMultiplier: 1.5,
    notificationWeight: 9,
    requireInterestMatch: false,
    minMatchThreshold: 0,
    description: "Open to conversations"
  },
  "Down to Chat": { 
    category: 'seeking', 
    radiusMultiplier: 1.5,
    notificationWeight: 9,
    requireInterestMatch: false,
    minMatchThreshold: 0,
    description: "Ready to socialize"
  },
  "Group Activities": { 
    category: 'seeking', 
    radiusMultiplier: 1.8,
    notificationWeight: 9,
    requireInterestMatch: false,
    minMatchThreshold: 0,
    description: "Looking for group fun"
  },
  "Food & Drinks?": { 
    category: 'seeking', 
    radiusMultiplier: 1.5,
    notificationWeight: 9,
    requireInterestMatch: false,
    minMatchThreshold: 0,
    description: "Ready for food/drinks"
  },
  "Sharing Stories": { 
    category: 'seeking', 
    radiusMultiplier: 1.3,
    notificationWeight: 8,
    requireInterestMatch: false,
    minMatchThreshold: 0,
    description: "Open to conversations"
  },
  "Networking": { 
    category: 'seeking', 
    radiusMultiplier: 1.5,
    notificationWeight: 8,
    requireInterestMatch: true,
    minMatchThreshold: 1,
    description: "Professional connections"
  },
  
  // NEUTRAL MOODS - Normal radius, moderate requirements
  "Exploring": { 
    category: 'neutral', 
    radiusMultiplier: 1.0,
    notificationWeight: 6,
    requireInterestMatch: true,
    minMatchThreshold: 1,
    description: "Open to suggestions"
  },
  "Sightseeing": { 
    category: 'neutral', 
    radiusMultiplier: 1.0,
    notificationWeight: 6,
    requireInterestMatch: true,
    minMatchThreshold: 1,
    description: "Exploring the area"
  },
  "Airport Tour": { 
    category: 'neutral', 
    radiusMultiplier: 0.8,    // Stay closer to airport
    notificationWeight: 5,
    requireInterestMatch: true,
    minMatchThreshold: 1,
    description: "Exploring airport area"
  },
  "Language Exchange": { 
    category: 'neutral', 
    radiusMultiplier: 1.2,
    notificationWeight: 6,
    requireInterestMatch: true,
    minMatchThreshold: 2,
    description: "Seeking language practice"
  },
  "Restaurant Hunting": { 
    category: 'neutral', 
    radiusMultiplier: 1.0,
    notificationWeight: 6,
    requireInterestMatch: true,
    minMatchThreshold: 1,
    description: "Looking for food"
  },
  "Remote Work": { 
    category: 'neutral', 
    radiusMultiplier: 1.0,
    notificationWeight: 4,
    requireInterestMatch: true,
    minMatchThreshold: 2,
    description: "Working but flexible"
  },
  "Food Tour": { 
    category: 'neutral', 
    radiusMultiplier: 1.2,
    notificationWeight: 6,
    requireInterestMatch: true,
    minMatchThreshold: 1,
    description: "Food adventure"
  },
  
  // SELECTIVE MOODS - Smaller radius, higher requirements
  "Coffee Break": { 
    category: 'selective', 
    radiusMultiplier: 0.7,    // Only nearby
    notificationWeight: 5,
    requireInterestMatch: true,
    minMatchThreshold: 2,
    description: "Quick coffee only"
  },
  "Away": { 
    category: 'selective', 
    radiusMultiplier: 0.5,
    notificationWeight: 3,
    requireInterestMatch: true,
    minMatchThreshold: 3,
    description: "Limited availability"
  },
  "Snack Time": { 
    category: 'selective', 
    radiusMultiplier: 0.7,
    notificationWeight: 5,
    requireInterestMatch: true,
    minMatchThreshold: 2,
    description: "Quick snack only"
  },
  "Local Cuisine": { 
    category: 'selective', 
    radiusMultiplier: 0.9,
    notificationWeight: 5,
    requireInterestMatch: true,
    minMatchThreshold: 2,
    description: "Specific food interest"
  },
  "Duty Free": { 
    category: 'selective', 
    radiusMultiplier: 0.5,
    notificationWeight: 3,
    requireInterestMatch: true,
    minMatchThreshold: 3,
    description: "Shopping focused"
  },
  "Lounge Access": { 
    category: 'selective', 
    radiusMultiplier: 0.5,
    notificationWeight: 3,
    requireInterestMatch: true,
    minMatchThreshold: 3,
    description: "In lounge"
  },
  "Gate Change": { 
    category: 'selective', 
    radiusMultiplier: 0.3,
    notificationWeight: 2,
    requireInterestMatch: true,
    minMatchThreshold: 4,
    description: "Travel disruption"
  },
  
  // UNAVAILABLE MOODS - No notifications
  "Busy": { 
    category: 'unavailable', 
    radiusMultiplier: 0,
    notificationWeight: 0,
    requireInterestMatch: true,
    minMatchThreshold: 999,
    description: "Not available"
  },
  "Do Not Disturb": { 
    category: 'unavailable', 
    radiusMultiplier: 0,
    notificationWeight: 0,
    requireInterestMatch: true,
    minMatchThreshold: 999,
    description: "Do not contact"
  },
  "Work Mode": { 
    category: 'unavailable', 
    radiusMultiplier: 0,
    notificationWeight: 0,
    requireInterestMatch: true,
    minMatchThreshold: 999,
    description: "Deep work mode"
  },
  "In a Meeting": { 
    category: 'unavailable', 
    radiusMultiplier: 0,
    notificationWeight: 0,
    requireInterestMatch: true,
    minMatchThreshold: 999,
    description: "Currently busy"
  },
  "Conference Call": { 
    category: 'unavailable', 
    radiusMultiplier: 0,
    notificationWeight: 0,
    requireInterestMatch: true,
    minMatchThreshold: 999,
    description: "On a call"
  },
  "Project Deadline": { 
    category: 'unavailable', 
    radiusMultiplier: 0,
    notificationWeight: 0,
    requireInterestMatch: true,
    minMatchThreshold: 999,
    description: "Deadline pressure"
  },
  "Business Trip": { 
    category: 'unavailable', 
    radiusMultiplier: 0,
    notificationWeight: 0,
    requireInterestMatch: true,
    minMatchThreshold: 999,
    description: "Business focused"
  },
};

// Get default profile for unknown moods
const getDefaultMoodProfile = (): MoodProfile => ({
  category: 'neutral',
  radiusMultiplier: 1.0,
  notificationWeight: 5,
  requireInterestMatch: true,
  minMatchThreshold: 1,
  description: "Standard availability"
});

const usePings = ({ user }: UsePingsProps) => {
  const { getUsers } = useUsers();
  const { getUserConnections } = useConnections();
  const [isCreatingPing, setIsCreatingPing] = useState(false);

  // Helper function to get mood profile for a user
  const getMoodProfile = (moodStatus: string | undefined): MoodProfile => {
    if (!moodStatus) return getDefaultMoodProfile();
    return moodProfiles[moodStatus] || getDefaultMoodProfile();
  };

  // Helper function to calculate interest matches
  const calculateInterestMatches = (user: any, pingFormData: PingFormData): number => {
    const userConnectionIntents = user.connectionIntents || [];
    const userEventPreferences = user.eventPreferences || {};
    
    // Count matching connection intents
    const intentMatches = pingFormData.connectionIntents.filter(intent => 
      userConnectionIntents.some((userIntent: string) => 
        userIntent.toLowerCase() === intent.toLowerCase()
      )
    ).length;
    
    // Count matching event preferences
    const pingTruePreferences = Object.entries(pingFormData.eventPreferences)
      .filter(([key, value]) => value === true);
    
    const preferenceMatches = pingTruePreferences.filter(([key, value]) => 
      userEventPreferences[key] === true
    ).length;
    
    // Total matches (intents are worth more)
    return intentMatches * 2 + preferenceMatches;
  };

  // Get all pings
  const getPings = async (): Promise<Ping[]> => {
    try {
      const pingsCollection = collection(db, "pings");
      const snapshot = await getDocs(pingsCollection);
      const pings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Ping[];
      return pings;
    } catch (error) {
      console.error('Error fetching pings:', error);
      return [];
    }
  };

  // Helper function to check if user is currently available based on their schedule
  const isUserCurrentlyAvailable = (userSchedule: any): boolean => {
    if (!userSchedule || typeof userSchedule !== 'object') {
      return true; // If no schedule, assume available
    }

    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof userSchedule;
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    // Check if the current day exists in the schedule
    const daySchedule = userSchedule[currentDay];
    if (!daySchedule || !daySchedule.start || !daySchedule.end) {
      return false; // No schedule for this day means not available
    }

    // Parse start and end times
    const startTime = daySchedule.start;
    const endTime = daySchedule.end;

    // Handle overnight schedules (end time is earlier than start time)
    if (endTime < startTime) {
      // Overnight schedule: available from start time until end time next day
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      // Regular schedule: available from start time to end time same day
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  // Function to send push notification to a user
  const sendPushNotification = async (
    expoPushToken: string, 
    pingTitle: string, 
    pingDescription: string, 
    creatorName: string, 
    pingId: string,
    distanceMiles: number
  ) => {
    try {
      // Create notification title with emoji and distance
      const notificationTitle = `🎯 ${pingTitle} - ${distanceMiles.toFixed(1)} miles away`;
      
      // Use description as notification body with creator name, fallback to creator info if no description
      const notificationBody = pingDescription && pingDescription.trim() 
        ? `${creatorName}: ${pingDescription}` 
        : `${creatorName} created a new ping event`;

      const pushPayload = {
        to: expoPushToken,
        title: notificationTitle,
        body: notificationBody,
        sound: 'default',
        priority: 'high',
        data: {
          type: 'ping_event',
          pingId: pingId,
          creatorName: creatorName,
          pingTitle: pingTitle,
          pingDescription: pingDescription,
          distanceMiles: distanceMiles,
          timestamp: new Date().toISOString()
        },
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify(pushPayload),
      });

      if (!response.ok) {
        console.error('Push notification failed:', response.status);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };

  // Function to find users who match the ping criteria with MOOD-BASED DYNAMIC MATCHING
  const findMatchingUsers = async (
    pingFormData: PingFormData,
    selectedMapLocation: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    } | null
  ) => {
    try {
      let allUsers;
      const baseRadiusValue = parseInt(pingFormData.visibilityRadius.split(' ')[0]);
      
      console.log('\n=== MOOD-BASED PING MATCHING STARTED ===');
      console.log(`Base radius: ${baseRadiusValue} miles`);
      console.log(`Ping category: ${pingFormData.category}`);
      
      // If ping type is "friends-only", only get connections
      if (pingFormData.pingType === 'friends-only') {
        if (!user) {
          console.log('No authenticated user for friends-only ping');
          return [];
        }
        
        const connections = await getUserConnections(user.uid);
        const activeConnections = connections.filter(conn => conn.status === 'active');
        
        const connectedUserIds = activeConnections.map(conn => {
          const otherUserId = conn.participants.find(id => id !== user.uid);
          return otherUserId;
        }).filter(Boolean) as string[];
        
        if (connectedUserIds.length === 0) {
          console.log('No active connections found for friends-only ping');
          return [];
        }
        
        const connectedUsers = await Promise.all(
          connectedUserIds.map(async (userId) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                return { id: userId, ...userDoc.data() };
              }
              return null;
            } catch (error) {
              console.error('Error fetching user data for connection:', userId, error);
              return null;
            }
          })
        );
        
        allUsers = connectedUsers.filter(Boolean);
        console.log(`Found ${allUsers.length} connected users for friends-only ping`);
      } else {
        allUsers = await getUsers();
      }
      
      // Process each user with mood-based matching
      const userMatches: UserMatch[] = [];
      
      for (const userDoc of allUsers) {
        const targetUser = userDoc as any;
        
        // Skip users without a name
        if (!targetUser.name) continue;
        
        // Get user's mood profile
        const moodProfile = getMoodProfile(targetUser.moodStatus);
        
        console.log(`\n--- Checking user: ${targetUser.name} ---`);
        console.log(`Mood: ${targetUser.moodStatus || 'None'} (${moodProfile.category})`);
        console.log(`Radius multiplier: ${moodProfile.radiusMultiplier}x`);
        console.log(`Notification weight: ${moodProfile.notificationWeight}/10`);
        
        // Skip unavailable users
        if (moodProfile.category === 'unavailable') {
          console.log(`❌ SKIPPED: User in unavailable mood`);
          continue;
        }
        
        // Check availability schedule
        const isAvailable = isUserCurrentlyAvailable(targetUser.availabilitySchedule);
        if (!isAvailable) {
          console.log(`❌ SKIPPED: Not in availability window`);
          continue;
        }
        console.log(`✅ Available according to schedule`);
        
        // Calculate adjusted radius for this user based on their mood
        const adjustedRadius = baseRadiusValue * moodProfile.radiusMultiplier;
        console.log(`Adjusted radius: ${adjustedRadius.toFixed(1)} miles`);
        
        // Check location and distance
        const userCoordinates = targetUser.lastKnownCoordinates;
        let distanceMiles = 0;
        
        if (pingFormData.pingType === 'friends-only') {
          // For friends, be lenient with location
          if (selectedMapLocation && userCoordinates?.latitude && userCoordinates?.longitude) {
            const distanceKm = haversineDistance(
              selectedMapLocation.latitude,
              selectedMapLocation.longitude,
              userCoordinates.latitude,
              userCoordinates.longitude
            );
            distanceMiles = distanceKm * 0.621371;
            
            if (distanceMiles > adjustedRadius) {
              console.log(`❌ SKIPPED: ${distanceMiles.toFixed(1)} miles > ${adjustedRadius.toFixed(1)} miles`);
              continue;
            }
            console.log(`✅ Within radius: ${distanceMiles.toFixed(1)} miles`);
          } else {
            console.log(`✅ Friend without location - including anyway`);
          }
        } else {
          // For open pings, require location data
          if (!selectedMapLocation || !userCoordinates?.latitude || !userCoordinates?.longitude) {
            console.log(`❌ SKIPPED: Missing location data`);
            continue;
          }
          
          const distanceKm = haversineDistance(
            selectedMapLocation.latitude,
            selectedMapLocation.longitude,
            userCoordinates.latitude,
            userCoordinates.longitude
          );
          distanceMiles = distanceKm * 0.621371;
          
          if (distanceMiles > adjustedRadius) {
            console.log(`❌ SKIPPED: ${distanceMiles.toFixed(1)} miles > ${adjustedRadius.toFixed(1)} miles`);
            continue;
          }
          console.log(`✅ Within radius: ${distanceMiles.toFixed(1)} miles`);
        }
        
        // Calculate interest matches
        const interestMatches = calculateInterestMatches(targetUser, pingFormData);
        console.log(`Interest match score: ${interestMatches}`);
        
        // Check if user meets minimum match threshold
        if (moodProfile.requireInterestMatch && interestMatches < moodProfile.minMatchThreshold) {
          console.log(`❌ SKIPPED: ${interestMatches} matches < ${moodProfile.minMatchThreshold} required`);
          continue;
        }
        
        // User passed all checks!
        console.log(`✅ MATCH! Adding to notification queue`);
        
        userMatches.push({
          user: targetUser,
          moodProfile: moodProfile,
          distanceMiles: distanceMiles,
          interestMatches: interestMatches,
          effectiveRadius: adjustedRadius,
          weight: moodProfile.notificationWeight,
          moodStatus: targetUser.moodStatus
        });
      }
      
      // Sort by notification weight (higher weight = more eager users get notified first)
      userMatches.sort((a, b) => b.weight - a.weight);
      
      // Log summary
      console.log(`\n=== MATCHING SUMMARY ===`);
      console.log(`Total users checked: ${allUsers.length}`);
      console.log(`Final matches: ${userMatches.length}`);
      
      if (userMatches.length > 0) {
        console.log('\n🎉 MATCHED USERS (sorted by eagerness):');
        userMatches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match.user.name} - Mood: ${match.moodStatus || 'None'}`);
          console.log(`     Weight: ${match.weight}/10, Distance: ${match.distanceMiles.toFixed(1)}mi, Interests: ${match.interestMatches}`);
        });
      } else {
        console.log('❌ No matching users found');
      }
      console.log('=== END MATCHING ===\n');
      
      // Return the matched users (not the full UserMatch objects)
      return userMatches.map(match => match.user);
      
    } catch (error) {
      console.error('Error finding matching users:', error);
      return [];
    }
  };

  // Function to create a ping event
  const createPing = async (
    pingFormData: PingFormData,
    selectedMapLocation: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    } | null
  ) => {
    setIsCreatingPing(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const organizerUid = user.uid; // Store organizer UID for notification filtering

      // Find matching users first
      const matchingUsers = await findMatchingUsers(pingFormData, selectedMapLocation);
      
      // Get user's name from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const creatorName = userData?.name || user.displayName || user.email || 'Unknown';

      // Create ping document in Firestore
      const pingData = {
        creatorId: user.uid,
        creatorName: creatorName,
        title: pingFormData.title,
        description: pingFormData.description,
        location: pingFormData.location,
        coordinates: selectedMapLocation ? {
          latitude: selectedMapLocation.latitude,
          longitude: selectedMapLocation.longitude
        } : null,
        category: pingFormData.category,
        template: pingFormData.template,
        duration: pingFormData.duration,
        maxParticipants: pingFormData.maxParticipants,
        pingType: pingFormData.pingType,
        visibilityRadius: pingFormData.visibilityRadius,
        connectionIntents: pingFormData.connectionIntents,
        eventPreferences: pingFormData.eventPreferences,
        createdAt: serverTimestamp(),
        status: 'active',
        participants: [user.uid], // Creator is automatically a participant
        participantCount: 1
      };

      const pingRef = await addDoc(collection(db, 'pings'), pingData);
      console.log('Ping created with ID:', pingRef.id);
      
      // Send mood-aware push notifications to matching users
      // Skip notifications for invite-only pings - users must be invited manually
      if (pingFormData.pingType !== 'invite-only' && matchingUsers.length > 0) {
        const notificationPromises = matchingUsers.map(async (userDoc: any) => {
          const targetUser = userDoc as any;
          
          // Skip if user doesn't have a push token or notifications are disabled
          if (!targetUser.expoPushToken || 
              !targetUser.notificationPreferences?.notificationsEnabled || 
              (!targetUser.notificationPreferences?.activities && !targetUser.notificationPreferences?.events)) {
            return;
          }
          
          // Skip if this is the organizer/authUser
          if (targetUser.id === organizerUid) {
            return;
          }
          
          // Get user's mood profile
          const moodProfile = getMoodProfile(targetUser.moodStatus);
          
          // Calculate distance from user to ping location
          let distanceMiles = 0;
          if (selectedMapLocation && targetUser.lastKnownCoordinates) {
            const distanceKm = haversineDistance(
              selectedMapLocation.latitude,
              selectedMapLocation.longitude,
              targetUser.lastKnownCoordinates.latitude,
              targetUser.lastKnownCoordinates.longitude
            );
            distanceMiles = distanceKm * 0.621371; // Convert km to miles
          }
          
          // Create mood-aware notification title with context
          let notificationTitle = `🎯 ${pingFormData.title}`;
          if (distanceMiles > 0) {
            notificationTitle += ` - ${distanceMiles.toFixed(1)} miles away`;
          }
          
          // Create mood-aware notification body
          let notificationBody = '';
          if (moodProfile.category === 'seeking') {
            // Enthusiastic message for seeking users
            notificationBody = pingFormData.description && pingFormData.description.trim()
              ? `Perfect match! ${creatorName}: ${pingFormData.description}`
              : `Great opportunity from ${creatorName}! Join this ${pingFormData.category} activity.`;
          } else if (moodProfile.category === 'selective') {
            // More casual message for selective users
            notificationBody = pingFormData.description && pingFormData.description.trim()
              ? `${creatorName}: ${pingFormData.description}`
              : `${creatorName} invited you to a ${pingFormData.category} activity nearby.`;
          } else {
            // Neutral message for other users
            notificationBody = pingFormData.description && pingFormData.description.trim()
              ? `${creatorName}: ${pingFormData.description}`
              : `${creatorName} created a new ping event`;
          }
          
          // Determine notification priority based on mood category
          const notificationPriority = moodProfile.category === 'seeking' ? 'high' : 
                                       moodProfile.category === 'selective' ? 'normal' : 'high';
          const notificationSound = moodProfile.category === 'selective' ? null : 'default';
          
          // Create notification object for in-app notification
          const notification = {
            id: Date.now().toString(),
            title: notificationTitle,
            body: notificationBody,
            data: {
              type: 'ping_event',
              pingId: pingRef.id,
              creatorName: creatorName,
              pingTitle: pingFormData.title,
              pingDescription: pingFormData.description,
              distanceMiles: distanceMiles,
              yourMoodCategory: moodProfile.category,
              notificationWeight: moodProfile.notificationWeight,
              moodDescription: moodProfile.description
            },
            timestamp: new Date(),
            read: false
          };
          
          try {
            // Add in-app notification to user's document first
            const userNotifications = targetUser.notifications || [];
            
            await updateDoc(doc(db, 'users', targetUser.id), {
              notifications: [...userNotifications, notification]
            });
            
            // Send mood-aware push notification
            const pushPayload = {
              to: targetUser.expoPushToken,
              title: notificationTitle,
              body: notificationBody,
              sound: notificationSound,
              priority: notificationPriority,
              data: {
                type: 'ping_event',
                pingId: pingRef.id,
                creatorName: creatorName,
                pingTitle: pingFormData.title,
                pingDescription: pingFormData.description,
                distanceMiles: distanceMiles,
                timestamp: new Date().toISOString(),
                moodCategory: moodProfile.category
              },
            };

            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
              },
              body: JSON.stringify(pushPayload),
            });

            if (!response.ok) {
              console.error('Push notification failed:', response.status);
            }
            
          } catch (error) {
            console.error('Error processing notification for user:', targetUser.name, error);
          }
        });
        
        await Promise.allSettled(notificationPromises);
        
      }
      
      return pingRef.id;
      
    } catch (error) {
      console.error('Error creating ping:', error);
      throw error;
    } finally {
      setIsCreatingPing(false);
    }
  };

  return {
    isCreatingPing,
    createPing,
    findMatchingUsers,
    getPings
  };
};

export default usePings; 