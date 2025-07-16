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

const usePings = ({ user }: UsePingsProps) => {
  const { getUsers } = useUsers();
  const { getUserConnections } = useConnections();
  const [isCreatingPing, setIsCreatingPing] = useState(false);

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

  // Function to find users who match the ping criteria
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
      
      // If ping type is "friends-only", only get connections
      if (pingFormData.pingType === 'friends-only') {
        if (!user) {
          console.log('No authenticated user for friends-only ping');
          return [];
        }
        
        // Get user's connections
        const connections = await getUserConnections(user.uid);
        const activeConnections = connections.filter(conn => conn.status === 'active');
        
        // Get the other user IDs from connections
        const connectedUserIds = activeConnections.map(conn => {
          const otherUserId = conn.participants.find(id => id !== user.uid);
          return otherUserId;
        }).filter(Boolean) as string[];
        
        if (connectedUserIds.length === 0) {
          console.log('No active connections found for friends-only ping');
          return [];
        }
        
        // Get user data for each connection
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
        // For other ping types, get all users
        allUsers = await getUsers();
      }
      
      // Filter users based on ping criteria (intents, preferences, and availability)
      const matchingUsers = allUsers.filter((userDoc: any) => {
        const user = userDoc as any;
        
        // Detailed logging for friends-only pings
        if (pingFormData.pingType === 'friends-only') {
          console.log(`\n=== Checking friend: ${user.name || 'Unknown'} (${user.id}) ===`);
          
          // Skip users without a name
          if (!user.name) {
            console.log(`❌ FAILED: No name found`);
            return false;
          }
          console.log(`✅ PASSED: Has name (${user.name})`);
          
          // Check if user is currently available based on their schedule
          const userSchedule = user.availabilitySchedule;
          const isCurrentlyAvailable = isUserCurrentlyAvailable(userSchedule);
          
          console.log(`📅 Availability Schedule:`, userSchedule);
          
          // Add detailed time debugging
          if (userSchedule && userSchedule.tuesday) {
            const now = new Date();
            const currentTime = now.toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            const startTime = userSchedule.tuesday.start;
            const endTime = userSchedule.tuesday.end;
            const isOvernight = endTime < startTime;
            
            console.log(`🕐 Current time: ${currentTime}`);
            console.log(`🌅 Start time: ${startTime}`);
            console.log(`🌙 End time: ${endTime}`);
            console.log(`🌃 Overnight schedule: ${isOvernight}`);
            console.log(`⏰ Is Currently Available: ${isCurrentlyAvailable}`);
          }
          
          if (!isCurrentlyAvailable) {
            console.log(`❌ FAILED: Not currently available`);
            return false;
          }
          console.log(`✅ PASSED: Currently available`);
          
          // For friends-only pings, we only need to check availability
          console.log(`✅ PASSED: All availability checks passed for friends-only ping`);
          return true;
        }
        
        // For other ping types, check connection intents and preferences
        // Check if user has any of the connection intents
        const userConnectionIntents = user.connectionIntents || [];
        
        // Check if user has any matching connection intents
        const matchingIntents = pingFormData.connectionIntents.filter(intent => 
          userConnectionIntents.some((userIntent: string) => userIntent.toLowerCase() === intent.toLowerCase())
        );
        const hasMatchingIntent = matchingIntents.length > 0;
        
        // Check event preferences (use explicit preferences only)
        const userExplicitPreferences = user.eventPreferences || {};
        const userPreferences = {
          likesBars: userExplicitPreferences.likesBars ?? false,
          prefersSmallGroups: userExplicitPreferences.prefersSmallGroups ?? false,
          prefersWeekendEvents: userExplicitPreferences.prefersWeekendEvents ?? false,
          prefersEveningEvents: userExplicitPreferences.prefersEveningEvents ?? false,
          prefersIndoorVenues: userExplicitPreferences.prefersIndoorVenues ?? false,
          prefersStructuredActivities: userExplicitPreferences.prefersStructuredActivities ?? false,
          prefersSpontaneousPlans: userExplicitPreferences.prefersSpontaneousPlans ?? false,
          prefersLocalMeetups: userExplicitPreferences.prefersLocalMeetups ?? false,
          prefersTravelEvents: userExplicitPreferences.prefersTravelEvents ?? false,
          prefersQuietEnvironments: userExplicitPreferences.prefersQuietEnvironments ?? false,
          prefersActiveLifestyles: userExplicitPreferences.prefersActiveLifestyles ?? false,
          prefersIntellectualDiscussions: userExplicitPreferences.prefersIntellectualDiscussions ?? false,
        };
        
        // Check if user preferences match ping preferences
        const pingTruePreferences = Object.entries(pingFormData.eventPreferences)
          .filter(([key, value]) => value === true);
        
        const matchingPreferences = pingTruePreferences.filter(([key, value]) => 
          userPreferences[key as keyof typeof userPreferences] === true
        );
        const hasMatchingPreferences = matchingPreferences.length > 0;
        
        // User matches if they have matching intents (preferences are optional)
        const isMatch = hasMatchingIntent;
        
        return isMatch;
      });
      
      // Get users who pass all filters (availability and within range)
      const finalMatches = matchingUsers.filter((userDoc: any) => {
        const user = userDoc as any;
        const isAvailable = isUserCurrentlyAvailable(user.availabilitySchedule);
        const userCoordinates = user.lastKnownCoordinates;
        
        if (!isAvailable) return false;
        
        // For friends-only pings, be more lenient about location requirements
        if (pingFormData.pingType === 'friends-only') {
          console.log(`\n=== Location check for friend: ${user.name || 'Unknown'} (${user.id}) ===`);
          
          // If user has coordinates, check distance; otherwise, include them anyway
          if (selectedMapLocation && userCoordinates?.latitude && userCoordinates?.longitude) {
            const distanceKm = haversineDistance(
              selectedMapLocation.latitude,
              selectedMapLocation.longitude,
              userCoordinates.latitude,
              userCoordinates.longitude
            );
            const distanceMiles = distanceKm * 0.621371; // Convert km to miles
            
            // Extract the numeric value from the visibility radius (e.g., "10 miles" -> 10)
            const radiusValue = parseInt(pingFormData.visibilityRadius.split(' ')[0]);
            
            console.log(`📍 User coordinates: ${userCoordinates.latitude}, ${userCoordinates.longitude}`);
            console.log(`🎯 Ping location: ${selectedMapLocation.latitude}, ${selectedMapLocation.longitude}`);
            console.log(`📏 Distance: ${distanceMiles.toFixed(2)} miles`);
            console.log(`🔍 Visibility radius: ${radiusValue} miles`);
            
            const withinRadius = distanceMiles <= radiusValue;
            console.log(`✅ PASSED: Within radius (${withinRadius})`);
            return withinRadius;
          } else {
            // For friends without location data, include them anyway
            console.log(`📍 User coordinates: ${userCoordinates ? 'Has coordinates but missing lat/lng' : 'No coordinates'}`);
            console.log(`✅ PASSED: No location data, but including friend anyway`);
            return true;
          }
        } else {
          // For other ping types, require location data
          if (selectedMapLocation && userCoordinates?.latitude && userCoordinates?.longitude) {
            const distanceKm = haversineDistance(
              selectedMapLocation.latitude,
              selectedMapLocation.longitude,
              userCoordinates.latitude,
              userCoordinates.longitude
            );
            const distanceMiles = distanceKm * 0.621371; // Convert km to miles
            
            // Extract the numeric value from the visibility radius (e.g., "10 miles" -> 10)
            const radiusValue = parseInt(pingFormData.visibilityRadius.split(' ')[0]);
            return distanceMiles <= radiusValue;
          }
          
          return false;
        }
      });
      
      // Log detailed information about the filtering process
      if (pingFormData.pingType === 'friends-only') {
        console.log(`\n=== FRIENDS-ONLY PING SUMMARY ===`);
        console.log(`👥 Initial connected users: ${allUsers.length}`);
        console.log(`✅ After availability filter: ${matchingUsers.length}`);
        console.log(`🎯 After location filter: ${finalMatches.length}`);
        
        if (finalMatches.length > 0) {
          console.log('\n🎉 FINAL MATCHING FRIENDS:');
          finalMatches.forEach((userDoc: any) => {
            const user = userDoc as any;
            console.log(`  ✅ ${user.name || 'Unknown'} (${user.id})`);
          });
        } else {
          console.log('\n❌ NO MATCHING FRIENDS FOUND');
          // Log why users were filtered out
          matchingUsers.forEach((userDoc: any) => {
            const user = userDoc as any;
            const userCoordinates = user.lastKnownCoordinates;
            const hasLocation = userCoordinates?.latitude && userCoordinates?.longitude;
            console.log(`  ❌ Filtered out: ${user.name || 'Unknown'} (${user.id}) - Has location: ${hasLocation}`);
          });
        }
        console.log(`=== END FRIENDS-ONLY PING SUMMARY ===\n`);
      } else {
        console.log(`Initial users: ${allUsers.length}`);
        console.log(`After availability filter: ${matchingUsers.length}`);
        console.log(`After location filter: ${finalMatches.length}`);
        
        if (finalMatches.length > 0) {
          console.log('Matching users:');
          finalMatches.forEach((userDoc: any) => {
            const user = userDoc as any;
            console.log(`${user.name || 'Unknown'} (${user.id})`);
          });
        } else {
          console.log('No matching users found');
          // Log why users were filtered out
          matchingUsers.forEach((userDoc: any) => {
            const user = userDoc as any;
            const userCoordinates = user.lastKnownCoordinates;
            const hasLocation = userCoordinates?.latitude && userCoordinates?.longitude;
            console.log(`Filtered out: ${user.name || 'Unknown'} (${user.id}) - Has location: ${hasLocation}`);
          });
        }
      }
      
      return finalMatches;
      
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
      
      // Send push notifications to matching users
      if (matchingUsers.length > 0) {
        const notificationPromises = matchingUsers.map(async (userDoc: any) => {
          const user = userDoc as any;
          
          // Skip if user doesn't have a push token or notifications are disabled
          if (!user.expoPushToken || 
              !user.notificationPreferences?.notificationsEnabled || 
              !user.notificationPreferences?.events) {
            return;
          }
          
          // Skip if this is the creator
          if (user.id === user.uid) {
            return;
          }
          
          // Calculate distance from user to ping location
          let distanceMiles = 0;
          if (selectedMapLocation && user.lastKnownCoordinates) {
            const distanceKm = haversineDistance(
              selectedMapLocation.latitude,
              selectedMapLocation.longitude,
              user.lastKnownCoordinates.latitude,
              user.lastKnownCoordinates.longitude
            );
            distanceMiles = distanceKm * 0.621371; // Convert km to miles
          }
          
          // Create notification title with emoji and distance
          const notificationTitle = `🎯 ${pingFormData.title} - ${distanceMiles.toFixed(1)} miles away`;
          
          // Use description as notification body with creator name, fallback to creator info if no description
          const notificationBody = pingFormData.description && pingFormData.description.trim() 
            ? `${creatorName}: ${pingFormData.description}` 
            : `${creatorName} created a new ping event`;
          
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
              distanceMiles: distanceMiles
            },
            timestamp: new Date(),
            read: false
          };
          
          try {
            // Add in-app notification to user's document first
            const userNotifications = user.notifications || [];
            
            await updateDoc(doc(db, 'users', user.id), {
              notifications: [...userNotifications, notification]
            });
            
            // Send push notification
            await sendPushNotification(
              user.expoPushToken,
              pingFormData.title,
              pingFormData.description,
              creatorName,
              pingRef.id,
              distanceMiles
            );
            
          } catch (error) {
            console.error('Error processing notification for user:', user.name, error);
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