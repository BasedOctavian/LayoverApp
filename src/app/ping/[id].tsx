import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { 
  Text, 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Animated, 
  Modal,
  Dimensions,
  StatusBar,
  Platform,
  TextInput,
  Linking
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import usePings from "../../hooks/usePings";
import useUsers from "../../hooks/useUsers";
import useAuth from "../../hooks/auth";
import useConnections from "../../hooks/useConnections";
import { doc, updateDoc, getDoc, arrayUnion, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import UserAvatar from "../../components/UserAvatar";

const { width, height } = Dimensions.get('window');

// Notification functions
const sendPushNotification = async (expoPushToken: string, activityTitle: string, updateType: string) => {
  try {
    const notificationContent = {
      title: 'Activity Updated',
      body: `The activity "${activityTitle}" has been updated`,
      data: { type: 'ping_update', updateType }
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: expoPushToken,
        ...notificationContent,
        sound: 'default',
        priority: 'high',
        data: { 
          ...notificationContent.data,
          timestamp: new Date().toISOString()
        },
      }),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

const notifyPingParticipants = async (ping: Ping, updateType: string) => {
  try {
    if (!ping?.participants?.length) return;

    // Get all participant documents
    const participantDocs = await Promise.all(
      ping.participants.map((participantId: string) => getDoc(doc(db, 'users', participantId)))
    );

    // Process each participant (excluding the creator)
    const notificationPromises = participantDocs.map(async (participantDoc: any) => {
      if (!participantDoc.exists()) return;

      // Skip if this participant is the creator of the ping
      if (participantDoc.id === ping.creatorId) return;

      const participantData = participantDoc.data();
      const notification = {
        type: 'ping_update',
        message: `The activity "${ping.title}" has been updated`,
        timestamp: new Date().toISOString(),
        read: false,
        pingId: ping.id,
        updateType: updateType
      };

      // Add notification to participant's notifications array
      await updateDoc(doc(db, 'users', participantDoc.id), {
        notifications: arrayUnion(notification)
      });

      // Send push notification if participant has token and notifications enabled
      if (participantData.expoPushToken && 
          participantData.notificationPreferences?.notificationsEnabled && 
          participantData.notificationPreferences?.events) {
        await sendPushNotification(
          participantData.expoPushToken,
          ping.title,
          updateType
        );
      }
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error notifying ping participants:", error);
  }
};

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

export default function PingEvent() {
  const { id } = useLocalSearchParams();
  const pingId = Array.isArray(id) ? id[0] : id;
  const { getPings } = usePings({ user: null });
  const { getUser } = useUsers();
  const { user } = useAuth();
  const { getUserConnections } = useConnections();
  const router = useRouter();
  const [ping, setPing] = useState<Ping | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionOptions, setSelectionOptions] = useState<Array<{id: string, label: string, icon?: string}>>([]);
  const [selectionType, setSelectionType] = useState<string>('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [creatorData, setCreatorData] = useState<any>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 40.7128, // Default to NYC until we get user's actual coordinates
    longitude: -74.0060,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const { theme } = React.useContext(ThemeContext);

  // New state for privacy settings and participant management
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showParticipantManagementModal, setShowParticipantManagementModal] = useState(false);
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const mapScaleAnim = useRef(new Animated.Value(0.95)).current;
  const loadingSpinnerAnim = useRef(new Animated.Value(0)).current;
  const invitingSpinnerAnim = useRef(new Animated.Value(0)).current;
  const removingSpinnerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchPing = async () => {
      setLoading(true);
      try {
        const allPings = await getPings();
        const found = allPings.find((p: Ping) => p.id === pingId);
        setPing(found || null);
        
        // If ping has coordinates, set map region
        if (found?.coordinates) {
          setMapRegion({
            latitude: found.coordinates.latitude,
            longitude: found.coordinates.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch (error) {
        console.error('Error fetching ping:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (pingId) fetchPing();
  }, [pingId]);

  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error getting current location:', error);
      }
    };
    
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (ping && user) {
      setIsAttending(ping.participants?.includes(user.uid));
    }
  }, [ping, user]);

  useEffect(() => {
    if (user?.uid) {
      fetchCurrentUserData();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (ping?.creatorId) {
      fetchCreatorData();
    }
  }, [ping?.creatorId]);

  useEffect(() => {
    if (showInviteModal && user?.uid) {
      fetchUserConnections();
    }
  }, [showInviteModal, user?.uid]);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!ping) return;
      const users = await Promise.all(
        (ping.participants || []).map(async (uid: string) => {
          try {
            return await getUser(uid);
          } catch {
            return null;
          }
        })
      );
      setParticipants(users.filter(Boolean));
    };
    if (ping) fetchParticipants();
  }, [ping]);

  useEffect(() => {
    if (!loading && ping) {
      // Animate in the content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(mapScaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, ping]);

  // Loading spinner animation
  useEffect(() => {
    if (loadingConnections) {
      Animated.loop(
        Animated.timing(loadingSpinnerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingSpinnerAnim.setValue(0);
    }
  }, [loadingConnections]);

  // Inviting spinner animation
  useEffect(() => {
    if (invitingUser) {
      Animated.loop(
        Animated.timing(invitingSpinnerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ).start();
    } else {
      invitingSpinnerAnim.setValue(0);
    }
  }, [invitingUser]);

  // Removing spinner animation
  useEffect(() => {
    if (removingParticipant) {
      Animated.loop(
        Animated.timing(removingSpinnerAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ).start();
    } else {
      removingSpinnerAnim.setValue(0);
    }
  }, [removingParticipant]);

  const handleJoinLeave = async () => {
    if (!user || !ping) return;
    setLoading(true);
    
    try {
      const pingRef = doc(db, 'pings', ping.id);
      const pingDoc = await getDoc(pingRef);
      
      if (!pingDoc.exists()) {
        Alert.alert('Error', 'Activity not found');
        return;
      }
      
      const pingData = pingDoc.data();
      const currentParticipants = pingData.participants || [];
      
      if (isAttending) {
        // Leave the activity
        const updatedParticipants = currentParticipants.filter((id: string) => id !== user.uid);
        await updateDoc(pingRef, {
          participants: updatedParticipants,
          participantCount: updatedParticipants.length
        });
        
        // Update local state
        setPing(prev => prev ? { 
          ...prev, 
          participants: updatedParticipants,
          participantCount: updatedParticipants.length
        } : null);
        
        Alert.alert('Left Activity', `You've left "${ping.title}"`);
      } else {
        // Join the activity
        if (currentParticipants.includes(user.uid)) {
          Alert.alert('Already Joined', 'You are already a participant in this activity');
          return;
        }
        
        const updatedParticipants = [...currentParticipants, user.uid];
        await updateDoc(pingRef, {
          participants: updatedParticipants,
          participantCount: updatedParticipants.length
        });
        
        // Update local state
        setPing(prev => prev ? { 
          ...prev, 
          participants: updatedParticipants,
          participantCount: updatedParticipants.length
        } : null);
        
        Alert.alert('Joined Activity', `You've joined "${ping.title}"!`);
      }
      
    } catch (error) {
      console.error('Error joining/leaving activity:', error);
      Alert.alert('Error', 'Failed to update activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUserData = async () => {
    if (!user?.uid) return;
    
    try {
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      if (currentUserDoc.exists()) {
        setCurrentUserData(currentUserDoc.data());
      }
    } catch (error) {
      console.error('Error fetching current user data:', error);
    }
  };

  const fetchCreatorData = async () => {
    if (!ping?.creatorId) return;
    
    try {
      const creatorDoc = await getDoc(doc(db, 'users', ping.creatorId));
      if (creatorDoc.exists()) {
        setCreatorData(creatorDoc.data());
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
    }
  };

  const isOrganizer = user?.uid === ping?.creatorId;

  // Privacy options for organizers
  const privacyOptions = [
    { id: 'open', label: 'Open', description: 'Anyone can join', icon: 'public' },
    { id: 'invite-only', label: 'Invite Only', description: 'You approve requests', icon: 'person-add' },
    { id: 'friends-only', label: 'Friends Only', description: 'Only your available connections', icon: 'people' }
  ];

  const fetchUserConnections = async () => {
    if (!user?.uid) return;
    
    setLoadingConnections(true);
    try {
      const userConnections = await getUserConnections(user.uid);
      
      // Get detailed user data for each connection
      const connectionsWithUserData = await Promise.all(
        userConnections
          .filter(connection => connection.status === 'active')
          .map(async (connection) => {
            const otherUserId = connection.participants.find(id => id !== user.uid);
            if (!otherUserId) return null;
            
            try {
              const userData = await getUser(otherUserId);
              return {
                ...connection,
                otherUser: userData
              };
            } catch (error) {
              console.error('Error fetching user data for connection:', error);
              return null;
            }
          })
      );
      
      setConnections(connectionsWithUserData.filter(Boolean));
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    
    // Check if this field should use selection instead of text input
    if (field === 'duration' || field === 'maxParticipants' || field === 'visibilityRadius') {
      setSelectionType(field);
      setSelectionOptions(getSelectionOptions(field));
      setShowSelectionModal(true);
    } else {
      setShowEditModal(true);
    }
  };

  const getSelectionOptions = (field: string) => {
    switch (field) {
      case 'duration':
        return [
          { id: '30 minutes', label: '30 minutes' },
          { id: '1 hour', label: '1 hour' },
          { id: '2 hours', label: '2 hours' },
          { id: '3 hours', label: '3 hours' },
          { id: '4 hours', label: '4 hours' },
          { id: 'All day', label: 'All day' }
        ];
      case 'maxParticipants':
        return [
          { id: '2 people', label: '2 people' },
          { id: '3 people', label: '3 people' },
          { id: '4 people', label: '4 people' },
          { id: '5 people', label: '5 people' },
          { id: '6 people', label: '6 people' },
          { id: 'Unlimited', label: 'Unlimited' }
        ];
      case 'visibilityRadius':
        return [
          { id: '5 miles', label: '5 miles' },
          { id: '10 miles', label: '10 miles' },
          { id: '15 miles', label: '15 miles' },
          { id: '20 miles', label: '20 miles' },
          { id: '25 miles', label: '25 miles' },
          { id: '50 miles', label: '50 miles' }
        ];
      default:
        return [];
    }
  };

  const handleSelection = (selectedValue: string) => {
    setEditValue(selectedValue);
    setShowSelectionModal(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingField || !ping || !user) return;
    
    setLoading(true);
    try {
      // Update the ping document in Firestore
      const pingRef = doc(db, 'pings', ping.id);
      await updateDoc(pingRef, {
        [editingField]: editValue,
        updatedAt: new Date()
      });
      
      // Update local state
      setPing(prev => prev ? { ...prev, [editingField]: editValue } : null);
      
      // Notify participants about the update
      await notifyPingParticipants(ping, editingField);
      
      setShowEditModal(false);
      setEditingField(null);
      setEditValue('');
      
    } catch (error) {
      console.error('Error updating ping:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle privacy setting change
  const handlePrivacyChange = async (newPrivacyType: string) => {
    if (!ping || !user) return;
    
    setLoading(true);
    try {
      const pingRef = doc(db, 'pings', ping.id);
      await updateDoc(pingRef, {
        pingType: newPrivacyType,
        updatedAt: new Date()
      });
      
      // Update local state
      setPing(prev => prev ? { ...prev, pingType: newPrivacyType } : null);
      
      // Notify participants about the privacy change
      await notifyPingParticipants(ping, 'privacy');
      
      setShowPrivacyModal(false);
      Alert.alert('Privacy Updated', `Activity is now ${getPrivacyTypeLabel(newPrivacyType)}`);
      
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      Alert.alert('Error', 'Failed to update privacy setting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle participant removal
  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!ping || !user) return;
    
    Alert.alert(
      'Remove Participant',
      `Are you sure you want to remove ${participantName} from this activity?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingParticipant(participantId);
            try {
              const pingRef = doc(db, 'pings', ping.id);
              const updatedParticipants = ping.participants.filter((id: string) => id !== participantId);
              
              await updateDoc(pingRef, {
                participants: updatedParticipants,
                participantCount: updatedParticipants.length,
                updatedAt: new Date()
              });
              
              // Update local state
              setPing(prev => prev ? { 
                ...prev, 
                participants: updatedParticipants,
                participantCount: updatedParticipants.length
              } : null);
              
              // Update participants list
              setParticipants(prev => prev.filter(p => p.id !== participantId));
              
              // Notify remaining participants
              await notifyPingParticipants(ping, 'participant_removed');
              
              Alert.alert('Participant Removed', `${participantName} has been removed from the activity.`);
              
            } catch (error) {
              console.error('Error removing participant:', error);
              Alert.alert('Error', 'Failed to remove participant. Please try again.');
            } finally {
              setRemovingParticipant(null);
            }
          }
        }
      ]
    );
  };

  const handleInviteConnection = async (connectionUserId: string, connectionUserName: string) => {
    if (!ping || !user) return;
    
    console.log('🚀 Starting invitation process:', {
      connectionUserId,
      connectionUserName,
      pingId: ping.id,
      pingTitle: ping.title,
      currentUserId: user.uid
    });
    
    setInvitingUser(connectionUserId);
    try {
      // Get the connection user's document
      const connectionUserRef = doc(db, 'users', connectionUserId);
      const connectionUserDoc = await getDoc(connectionUserRef);
      
      if (!connectionUserDoc.exists()) {
        console.error('❌ Connection user document not found:', connectionUserId);
        Alert.alert('Error', 'User not found');
        return;
      }
      
      const connectionUserData = connectionUserDoc.data();
      console.log('📄 Connection user data retrieved:', {
        userId: connectionUserId,
        userName: connectionUserData.name,
        hasPushToken: !!connectionUserData.expoPushToken,
        pushToken: connectionUserData.expoPushToken,
        notificationPreferences: connectionUserData.notificationPreferences,
        currentNotificationsCount: connectionUserData.notifications?.length || 0
      });
      
      // Create invitation notification
      const notification = {
        id: Date.now().toString(),
        title: `Activity Invitation`,
        body: `${currentUserData?.name || 'Someone'} invited you to join "${ping.title}"`,
        data: {
          type: 'ping_invitation',
          pingId: ping.id,
          pingTitle: ping.title,
          inviterId: user.uid,
          inviterName: currentUserData?.name || 'Someone',
          pingLocation: ping.location,
          pingCategory: ping.category
        },
        timestamp: new Date(),
        read: false
      };
      
      console.log('📝 Created notification object:', notification);
      
      // Add notification to connection user's notifications array
      await updateDoc(connectionUserRef, {
        notifications: arrayUnion(notification)
      });
      
      console.log('✅ Notification added to user document');
      
      // Send push notification if user has token and notifications enabled
      console.log('🔍 Checking push notification conditions:', {
        hasPushToken: !!connectionUserData.expoPushToken,
        pushToken: connectionUserData.expoPushToken,
        notificationsEnabled: connectionUserData.notificationPreferences?.notificationsEnabled,
        eventsEnabled: connectionUserData.notificationPreferences?.events,
        fullPreferences: connectionUserData.notificationPreferences
      });
      
      if (connectionUserData.expoPushToken && 
          connectionUserData.notificationPreferences?.notificationsEnabled && 
          connectionUserData.notificationPreferences?.events) {
        
        console.log('✅ All conditions met, sending push notification');
        
        const pushPayload = {
          to: connectionUserData.expoPushToken,
          title: `Activity Invitation`,
          body: `${currentUserData?.name || 'Someone'} invited you to join "${ping.title}"`,
          sound: 'default',
          priority: 'high',
          data: {
            type: 'ping_invitation',
            pingId: ping.id,
            pingTitle: ping.title,
            inviterId: user.uid,
            inviterName: currentUserData?.name || 'Someone',
            pingLocation: ping.location,
            pingCategory: ping.category
          },
        };

        console.log('📦 Push notification payload:', pushPayload);

        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify(pushPayload),
          });

          const responseData = await response.json();
          
          if (!response.ok) {
            console.error('❌ Push notification failed:', {
              status: response.status,
              statusText: response.statusText,
              data: responseData,
              requestPayload: pushPayload
            });
          } else {
            console.log('✅ Push notification sent successfully:', {
              responseData,
              receiverId: connectionUserId,
              senderName: currentUserData?.name
            });
          }
        } catch (error) {
          console.error('❌ Error sending push notification:', {
            error,
            receiverId: connectionUserId,
            token: connectionUserData.expoPushToken
          });
        }
      } else {
        console.log('❌ Push notification not sent because:', {
          hasToken: !!connectionUserData.expoPushToken,
          notificationsEnabled: connectionUserData.notificationPreferences?.notificationsEnabled,
          eventsEnabled: connectionUserData.notificationPreferences?.events,
          receiverId: connectionUserId
        });
      }
      
      console.log('🎉 Invitation process completed successfully');
      Alert.alert('Success', `Invitation sent to ${connectionUserName}!`);
      
    } catch (error) {
      console.error('❌ Error in invitation process:', {
        error,
        connectionUserId,
        connectionUserName,
        pingId: ping?.id
      });
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setInvitingUser(null);
    }
  };

  const getFieldDisplayName = (field: string) => {
    switch (field) {
      case 'title': return 'Title';
      case 'description': return 'Description';
      case 'location': return 'Location';
      case 'duration': return 'Duration';
      case 'maxParticipants': return 'Max Participants';
      case 'visibilityRadius': return 'Visibility Radius';
      default: return field;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'sports & games':
        return 'sports-soccer';
      case 'food & dining':
        return 'restaurant';
      case 'entertainment':
        return 'movie';
      case 'travel':
        return 'flight';
      case 'business':
        return 'business';
      default:
        return 'event';
    }
  };

  // Helper function to get user-friendly privacy type label
  const getPrivacyTypeLabel = (pingType: string) => {
    switch (pingType) {
      case 'open':
        return 'Open';
      case 'invite-only':
        return 'Invite Only';
      case 'friends-only':
        return 'Friends Only';
      default:
        return pingType;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLastActive = (lastLogin: any) => {
    if (!lastLogin) return 'Never active';
    
    const lastLoginDate = lastLogin.toDate ? lastLogin.toDate() : new Date(lastLogin);
    const now = new Date();
    const diffInMs = now.getTime() - lastLoginDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
  };

  // Handle opening directions in maps
  const handleGetDirections = async () => {
    if (!ping?.coordinates) {
      Alert.alert(
        'No Location Available',
        'This activity doesn\'t have location coordinates.',
        [{ text: 'OK' }]
      );
      return;
    }

    const { latitude, longitude } = ping.coordinates;
    const label = ping.title || 'Activity Location';
    
    try {
      const url = Platform.OS === 'ios' 
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to generic maps URL
        const fallbackUrl = `https://maps.google.com/maps?daddr=${latitude},${longitude}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert(
        'Error',
        'Unable to open directions. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (loading || !ping) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <LoadingScreen />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        
        <TopBar onProfilePress={() => router.push(`/profile/${user?.uid}`)} />

        <Animated.View 
          style={{ 
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }}
        >
          <ScrollView 
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Map Section */}
              <Animated.View 
                style={[
                  styles.mapContainer, 
                  { 
                    transform: [{ scale: mapScaleAnim }]
                  }
                ]}
              >
            <MapView
              style={styles.map}
              region={mapRegion}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsScale={true}
              showsBuildings={true}
              mapType="standard"
            >
              {/* Ping location marker */}
              {ping.coordinates && (
                <>
                  <Circle
                    center={{
                      latitude: ping.coordinates.latitude,
                      longitude: ping.coordinates.longitude,
                    }}
                    radius={parseInt(ping.visibilityRadius) * 1609.34} // Convert miles to meters
                    fillColor="rgba(55, 164, 200, 0.1)"
                    strokeColor="rgba(55, 164, 200, 0.3)"
                    strokeWidth={2}
                  />
                  <Marker
                    coordinate={{
                      latitude: ping.coordinates.latitude,
                      longitude: ping.coordinates.longitude,
                    }}
                    title={ping.title}
                    description={ping.location}
                  >
                    <View style={styles.pingMarker}>
                      <MaterialIcons name={getCategoryIcon(ping.category)} size={20} color="#FFFFFF" />
                    </View>
                  </Marker>
                </>
              )}
            </MapView>
            
            {/* Map overlay info */}
            <View style={[styles.mapOverlay, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={styles.mapOverlayContent}>
                <Ionicons name="location" size={16} color="#37a4c8" />
                <Text style={[styles.mapOverlayText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  {ping.location}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Content Section */}
            {/* Title and Category */}
            <View style={[styles.titleSection, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={styles.titleRow}>
                <MaterialIcons 
                  name={getCategoryIcon(ping.category)} 
                  size={24} 
                  color="#37a4c8" 
                  style={styles.categoryIcon}
                />
                <View style={styles.titleContent}>
                  <Text style={[styles.title, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {ping.title}
                  </Text>
                  <Text style={[styles.category, { color: "#37a4c8" }]}>
                    {ping.category}
                  </Text>
                </View>
                {isOrganizer && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditField('title', ping.title)}
                  >
                    <Feather name="edit-2" size={16} color="#37a4c8" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: ping.status === 'active' ? '#10B981' : '#F59E0B' }]}>
                <Text style={styles.statusText}>{ping.status}</Text>
              </View>
            </View>

            {/* Description */}
            <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Description
                </Text>
                {isOrganizer && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditField('description', ping.description)}
                  >
                    <Feather name="edit-2" size={16} color="#37a4c8" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.description, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                {ping.description}
              </Text>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={[styles.detailItem, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
              }]}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcons name="schedule" size={18} color="#37a4c8" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Duration
                  </Text>
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {ping.duration}
                  </Text>
                </View>
                {isOrganizer && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditField('duration', ping.duration)}
                  >
                    <Feather name="edit-2" size={14} color="#37a4c8" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={[styles.detailItem, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
              }]}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcons name="people" size={18} color="#37a4c8" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Participants
                  </Text>
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {ping.participantCount} / {ping.maxParticipants}
                  </Text>
                </View>
                {isOrganizer && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditField('maxParticipants', ping.maxParticipants)}
                  >
                    <Feather name="edit-2" size={14} color="#37a4c8" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={[styles.detailItem, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
              }]}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcons name="radio" size={18} color="#37a4c8" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Visibility
                  </Text>
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {ping.visibilityRadius}
                  </Text>
                </View>
                {isOrganizer && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditField('visibilityRadius', ping.visibilityRadius)}
                  >
                    <Feather name="edit-2" size={14} color="#37a4c8" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={[styles.detailItem, { 
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
              }]}>
                <View style={styles.detailIconContainer}>
                  <MaterialIcons name="public" size={18} color="#37a4c8" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Type
                  </Text>
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {getPrivacyTypeLabel(ping.pingType)}
                  </Text>
                </View>
                {isOrganizer && (
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => setShowPrivacyModal(true)}
                  >
                    <Feather name="settings" size={14} color="#37a4c8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Connection Intents */}
            {ping.connectionIntents && ping.connectionIntents.length > 0 && (
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Connection Interests
                </Text>
                <View style={styles.tagsContainer}>
                  {ping.connectionIntents.map((intent, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{intent}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Creator Info */}
            <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                Created by
              </Text>
              <View style={styles.creatorRow}>
                <UserAvatar 
                  user={{ 
                    name: creatorData?.name || ping.creatorName,
                    profilePicture: creatorData?.profilePicture 
                  }} 
                  size={50} 
                />
                <View style={styles.creatorInfo}>
                  <Text style={[styles.creatorName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {creatorData?.name || ping.creatorName}
                  </Text>
                  <Text style={[styles.creatorDate, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Created {formatDate(ping.createdAt)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Participants */}
            <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={styles.participantsHeader}>
                <View style={styles.participantsTitleContainer}>
                  <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Participants
                  </Text>
                  <View style={[styles.participantCountBadge, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                  }]}>
                    <Text style={[styles.participantCountText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      {ping.participantCount}
                    </Text>
                  </View>
                </View>
                <View style={styles.participantsHeaderButtons}>
                  {isOrganizer && (
                    <TouchableOpacity 
                      style={[styles.headerButton, { 
                        backgroundColor: theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.15)",
                        borderColor: theme === "light" ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.4)"
                      }]}
                      onPress={() => setShowParticipantManagementModal(true)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="manage-accounts" size={16} color="#ef4444" />
                      <Text style={[styles.headerButtonText, { color: "#ef4444" }]}>Manage</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={[styles.headerButton, { 
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                    }]}
                    onPress={() => setShowParticipantsModal(true)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="people" size={16} color="#37a4c8" />
                    <Text style={[styles.headerButtonText, { color: "#37a4c8" }]}>View All</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.participantsContainer}>
                {participants.length > 0 ? (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.participantsScrollContent}
                    style={styles.participantsScroll}
                  >
                    {participants.slice(0, 5).map((participant, index) => (
                      <View key={participant.id || index} style={styles.participantCard}>
                        <View style={styles.participantAvatarContainer}>
                          <UserAvatar user={participant} size={48} />
                          {participant.id === ping.creatorId && (
                            <View style={[styles.creatorBadge, { 
                              backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                            }]}>
                              <MaterialIcons name="star" size={12} color="#FFFFFF" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.participantName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]} numberOfLines={1}>
                          {participant.name}
                        </Text>
                        {participant.airportCode && (
                          <Text style={[styles.participantLocation, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={1}>
                            {participant.airportCode}
                          </Text>
                        )}
                      </View>
                    ))}
                    {participants.length > 5 && (
                      <View style={styles.moreParticipantsCard}>
                        <View style={[styles.moreParticipantsAvatar, { 
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                        }]}>
                          <Text style={[styles.moreParticipantsText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                            +{participants.length - 5}
                          </Text>
                        </View>
                        <Text style={[styles.moreParticipantsLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          More
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                ) : (
                  <View style={[styles.emptyParticipantsContainer, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                  }]}>
                    <View style={[styles.emptyParticipantsIcon, { 
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                    }]}>
                      <MaterialIcons name="people-outline" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    </View>
                    <Text style={[styles.emptyParticipantsText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      No participants yet
                    </Text>
                    <Text style={[styles.emptyParticipantsSubtext, { color: theme === "light" ? "#94A3B8" : "#64748B" }]}>
                      Be the first to join this activity!
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.bottomButtons}>
              {/* Directions Button */}
              {ping.coordinates && (isAttending || isOrganizer) && (
                <TouchableOpacity 
                  style={styles.directionsButton}
                  onPress={handleGetDirections}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.directionsButtonGradient,
                    { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
                  ]}>
                    <MaterialIcons 
                      name="directions" 
                      size={20} 
                      color={theme === "light" ? "#0F172A" : "#e4fbfe"} 
                    />
                    <Text style={[
                      styles.directionsButtonText,
                      { color: theme === "light" ? "#0F172A" : "#e4fbfe" }
                    ]}>
                      Get Directions
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {(isAttending || isOrganizer) && (
                <View style={styles.topButtonRow}>
                  <TouchableOpacity
                    style={styles.topButtonContainer}
                    onPress={() => setShowInviteModal(true)}
                    accessibilityLabel="Invite Connections"
                    accessibilityHint="Open invite connections modal"
                    activeOpacity={0.7}
                  >
                    <LinearGradient 
                      colors={["#9C27B0", "#673AB7"]} 
                      style={styles.buttonGradient}
                    >
                      <MaterialIcons name="person-add" size={20} color="#ffffff" />
                      <Text style={styles.buttonText}>
                        Invite
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.topButtonContainer, (!isAttending) && styles.buttonContainerDisabled]}
                    onPress={() => router.push(`ping/pingChat/${pingId}`)}
                    accessibilityLabel="Ping Chat"
                    accessibilityHint="Navigate to ping discussion"
                    disabled={!isAttending}
                    activeOpacity={0.7}
                  >
                    <LinearGradient 
                      colors={(!isAttending) ? ["#cccccc", "#999999"] : ["#37a4c8", "#37a4c8"]} 
                      style={styles.buttonGradient}
                    >
                      <Ionicons name="chatbubbles" size={20} color="#ffffff" />
                      <Text style={styles.buttonText}>
                        {(!isAttending) ? "Join to Chat" : "Activity Chat"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity style={styles.buttonContainer} onPress={handleJoinLeave}>
                <LinearGradient 
                  colors={isAttending ? ["#FF416C", "#FF4B2B"] : ["#37a4c8", "#37a4c8"]} 
                  style={styles.buttonGradient}
                >
                  <Feather name={isAttending ? "x-circle" : "check-circle"} size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    {isAttending ? "Leave Activity" : "Join Activity"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            </Animated.View>
          </ScrollView>
        </Animated.View>

        {/* Selection Modal */}
        <Modal 
          visible={showSelectionModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowSelectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Select {selectionType ? getFieldDisplayName(selectionType) : 'Option'}
                </Text>
                <TouchableOpacity onPress={() => setShowSelectionModal(false)}>
                  <Ionicons name="close" size={24} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.selectionOptionsContainer}>
                {selectionOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.selectionOption,
                      {
                        backgroundColor: option.id === editValue 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                        borderColor: option.id === editValue 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                      }
                    ]}
                    onPress={() => handleSelection(option.id)}
                    activeOpacity={0.6}
                  >
                    <Text style={[
                      styles.selectionOptionText,
                      {
                        color: option.id === editValue 
                          ? "#FFFFFF"
                          : (theme === "light" ? "#37a4c8" : "#38a5c9")
                      }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit Modal */}
        <Modal 
          visible={showEditModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Edit {editingField ? getFieldDisplayName(editingField) : 'Field'}
                </Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              {editingField === 'duration' || editingField === 'maxParticipants' || editingField === 'visibilityRadius' ? (
                <View style={[styles.editInput, { 
                  backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a",
                  borderColor: theme === "light" ? "#e2e8f0" : "#404040",
                  justifyContent: 'center'
                }]}>
                  <Text style={[styles.editValueText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {editValue}
                  </Text>
                </View>
              ) : (
                <TextInput
                  style={[styles.editInput, { 
                    backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a",
                    color: theme === "light" ? "#0F172A" : "#e4fbfe",
                    borderColor: theme === "light" ? "#e2e8f0" : "#404040"
                  }]}
                  value={editValue}
                  onChangeText={setEditValue}
                  multiline={editingField === 'description'}
                  numberOfLines={editingField === 'description' ? 4 : 1}
                  placeholder={`Enter ${editingField ? getFieldDisplayName(editingField).toLowerCase() : 'value'}...`}
                  placeholderTextColor={theme === "light" ? "#94A3B8" : "#64748B"}
                />
              )}
              
              <View style={styles.editModalButtons}>
                <TouchableOpacity 
                  style={[styles.editModalButton, styles.cancelButton]} 
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editModalButton, styles.saveButton]} 
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Participants Modal */}
        <Modal 
          visible={showParticipantsModal} 
          animationType="slide" 
          onRequestClose={() => setShowParticipantsModal(false)}
        >
          <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#fff" : "#000" }]}> 
            <View style={[styles.modalHeader, { backgroundColor: theme === "light" ? "#fff" : "#1a1a1a" }]}>
              <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
                <Ionicons name="close" size={24} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                Participants ({ping.participantCount})
              </Text>
              <View style={styles.modalSpacer} />
            </View>
            
            <ScrollView style={styles.modalContent}>
              {participants.map((participant, idx) => (
                <View key={participant.id || idx} style={styles.modalParticipant}>
                  <UserAvatar user={participant} size={50} style={{ marginRight: 16 }} />
                  <View style={styles.modalParticipantInfo}>
                    <Text style={[styles.modalParticipantName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {participant.name}
                    </Text>
                    <Text style={[styles.modalParticipantSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {participant.airportCode || 'Unknown location'}
                    </Text>
                  </View>
                </View>
              ))}
              {participants.length === 0 && (
                <Text style={[styles.noParticipants, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  No participants yet.
                </Text>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Invite Connections Modal */}
        <Modal 
          visible={showInviteModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.inviteModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              {/* Header */}
              <View style={[styles.inviteModalHeader, { 
                borderBottomColor: theme === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)" 
              }]}>
                <View style={styles.inviteModalHeaderContent}>
                  <Text style={[styles.inviteModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Invite Connections
                  </Text>
                  <Text style={[styles.inviteModalSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Share this activity with your connections
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.closeButton, { 
                    backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)" 
                  }]}
                  onPress={() => setShowInviteModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              {/* Content */}
              <ScrollView 
                style={styles.inviteModalBody} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.inviteModalScrollContent}
              >
                {loadingConnections ? (
                  <View style={styles.loadingContainer}>
                    <Animated.View 
                      style={[
                        styles.loadingSpinner, 
                        { 
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
                          borderTopColor: "#37a4c8",
                          transform: [{
                            rotate: loadingSpinnerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            })
                          }]
                        }
                      ]} 
                    />
                    <Text style={[styles.loadingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Loading your connections...
                    </Text>
                  </View>
                ) : connections.length > 0 ? (
                  <>
                    <Text style={[styles.connectionsCount, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {connections.length} connection{connections.length !== 1 ? 's' : ''} available
                    </Text>
                                         {connections.map((connection, idx) => (
                       <View key={connection.id || idx} style={[styles.inviteConnectionItem, { 
                         backgroundColor: theme === "light" ? "#ffffff" : "#2a2a2a",
                         borderColor: theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)",
                       }]}>
                         {/* Top Row: Avatar and User Info */}
                         <View style={styles.topRow}>
                           {/* Avatar */}
                           <View style={styles.avatarContainer}>
                             <UserAvatar user={connection.otherUser} size={48} />
                             <View style={[
                               styles.onlineIndicator,
                               { 
                                 backgroundColor: (() => {
                                   if (!connection.otherUser.lastLogin) return '#94A3B8';
                                   const lastLogin = connection.otherUser.lastLogin.toDate ? 
                                     connection.otherUser.lastLogin.toDate() : 
                                     new Date(connection.otherUser.lastLogin);
                                   const now = new Date();
                                   const diffInMinutes = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
                                   return diffInMinutes <= 30 ? '#10B981' : '#94A3B8';
                                 })()
                               }
                             ]} />
                           </View>
                           
                           {/* User Info */}
                           <View style={styles.userInfoContainer}>
                             <View style={styles.nameRow}>
                               <Text style={[styles.inviteConnectionName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                                 {connection.otherUser.name}
                               </Text>
                               {connection.otherUser.age && (
                                 <Text style={[styles.ageText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                                   {connection.otherUser.age}
                                 </Text>
                               )}
                             </View>
                             
                             <View style={styles.metaRow}>
                               <View style={styles.metaItem}>
                                 <Ionicons 
                                   name="location" 
                                   size={12} 
                                   color={theme === "light" ? "#64748B" : "#94A3B8"} 
                                   style={styles.metaIcon}
                                 />
                                 <Text style={[styles.metaText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                                   {connection.otherUser.airportCode || 'Unknown'}
                                 </Text>
                               </View>
                               
                               <View style={styles.metaDivider} />
                               
                               <View style={styles.metaItem}>
                                 <Ionicons 
                                   name="time" 
                                   size={12} 
                                   color={theme === "light" ? "#64748B" : "#94A3B8"} 
                                   style={styles.metaIcon}
                                 />
                                 <Text style={[styles.metaText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                                   {formatLastActive(connection.otherUser.lastLogin)}
                                 </Text>
                               </View>
                             </View>
                           </View>
                         </View>
                         
                         {/* Bottom Row: Invite Button */}
                         <View style={styles.buttonRow}>
                           <TouchableOpacity
                             style={[
                               styles.inviteButton,
                               { 
                                 backgroundColor: invitingUser === connection.otherUser.id 
                                   ? "#9C27B0"
                                   : theme === "light" 
                                     ? "#f8f9fa" 
                                     : "#3a3a3a",
                                 borderColor: invitingUser === connection.otherUser.id 
                                   ? "#9C27B0"
                                   : theme === "light" 
                                     ? "rgba(156, 39, 176, 0.2)" : 
                                     "rgba(156, 39, 176, 0.3)"
                               }
                             ]}
                             onPress={() => handleInviteConnection(connection.otherUser.id, connection.otherUser.name)}
                             disabled={invitingUser === connection.otherUser.id}
                             activeOpacity={0.7}
                           >
                             {invitingUser === connection.otherUser.id ? (
                               <View style={styles.invitingContent}>
                                 <Animated.View 
                                   style={[
                                     styles.invitingSpinner, 
                                     { 
                                       borderTopColor: "#ffffff",
                                       transform: [{
                                         rotate: invitingSpinnerAnim.interpolate({
                                           inputRange: [0, 1],
                                           outputRange: ['0deg', '360deg']
                                         })
                                       }]
                                     }
                                   ]} 
                                 />
                                 <Text style={styles.inviteButtonTextActive}>Inviting...</Text>
                               </View>
                             ) : (
                               <>
                                 <Ionicons name="paper-plane" size={16} color="#9C27B0" />
                                 <Text style={[styles.inviteButtonText, { color: "#9C27B0" }]}>
                                   Invite
                                 </Text>
                               </>
                             )}
                           </TouchableOpacity>
                         </View>
                       </View>
                     ))}
                  </>
                ) : (
                  <View style={[styles.noConnectionsContainer, { 
                    backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a",
                    borderColor: theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)",
                  }]}>
                    <View style={[styles.noConnectionsIcon, { 
                      backgroundColor: theme === "light" ? "rgba(156, 39, 176, 0.1)" : "rgba(156, 39, 176, 0.15)" 
                    }]}>
                      <MaterialIcons name="people-outline" size={32} color="#9C27B0" />
                    </View>
                    <Text style={[styles.noConnectionsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      No connections yet
                    </Text>
                    <Text style={[styles.noConnectionsSubtext, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Connect with people first to invite them to activities
                    </Text>
                    <TouchableOpacity 
                      style={[styles.exploreButton, { 
                        backgroundColor: "#9C27B0",
                        borderColor: "#9C27B0"
                      }]}
                      onPress={() => {
                        setShowInviteModal(false);
                        router.push('/explore');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.exploreButtonText}>Explore People</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Privacy Settings Modal */}
        <Modal 
          visible={showPrivacyModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowPrivacyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Privacy Settings
                </Text>
                <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                  <Ionicons name="close" size={24} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.privacyDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                Choose who can join this activity
              </Text>
              
              <ScrollView style={styles.selectionOptionsContainer}>
                {privacyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.privacyOption,
                      {
                        backgroundColor: option.id === ping?.pingType 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                        borderColor: option.id === ping?.pingType 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                      }
                    ]}
                    onPress={() => handlePrivacyChange(option.id)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.privacyOptionContent}>
                      <View style={styles.privacyOptionHeader}>
                        <MaterialIcons 
                          name={option.icon as any} 
                          size={20} 
                          color={option.id === ping?.pingType ? "#FFFFFF" : "#37a4c8"} 
                        />
                        <Text style={[
                          styles.privacyOptionTitle,
                          {
                            color: option.id === ping?.pingType 
                              ? "#FFFFFF"
                              : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          }
                        ]}>
                          {option.label}
                        </Text>
                      </View>
                      <Text style={[
                        styles.privacyOptionDescription,
                        {
                          color: option.id === ping?.pingType 
                            ? "rgba(255, 255, 255, 0.8)"
                            : (theme === "light" ? "#64748B" : "#94A3B8")
                        }
                      ]}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Participant Management Modal */}
        <Modal 
          visible={showParticipantManagementModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowParticipantManagementModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.inviteModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              {/* Header */}
              <View style={[styles.inviteModalHeader, { 
                borderBottomColor: theme === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)" 
              }]}>
                <View style={styles.inviteModalHeaderContent}>
                  <Text style={[styles.inviteModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Manage Participants
                  </Text>
                  <Text style={[styles.inviteModalSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Remove participants from this activity
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.closeButton, { 
                    backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)" 
                  }]}
                  onPress={() => setShowParticipantManagementModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              {/* Content */}
              <ScrollView 
                style={styles.inviteModalBody} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.inviteModalScrollContent}
              >
                {participants.length > 0 ? (
                  <>
                    <Text style={[styles.connectionsCount, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {participants.length} participant{participants.length !== 1 ? 's' : ''} in this activity
                    </Text>
                    {participants.map((participant, idx) => (
                      <View key={participant.id || idx} style={[styles.inviteConnectionItem, { 
                        backgroundColor: theme === "light" ? "#ffffff" : "#2a2a2a",
                        borderColor: theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)",
                      }]}>
                        {/* Top Row: Avatar and User Info */}
                        <View style={styles.topRow}>
                          {/* Avatar */}
                          <View style={styles.avatarContainer}>
                            <UserAvatar user={participant} size={48} />
                            {participant.id === ping?.creatorId && (
                              <View style={[styles.creatorBadge, { 
                                backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                              }]}>
                                <MaterialIcons name="star" size={12} color="#FFFFFF" />
                              </View>
                            )}
                            <View style={[
                              styles.onlineIndicator,
                              { 
                                backgroundColor: (() => {
                                  if (!participant.lastLogin) return '#94A3B8';
                                  const lastLogin = participant.lastLogin.toDate ? 
                                    participant.lastLogin.toDate() : 
                                    new Date(participant.lastLogin);
                                  const now = new Date();
                                  const diffInMinutes = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
                                  return diffInMinutes <= 30 ? '#10B981' : '#94A3B8';
                                })()
                              }
                            ]} />
                          </View>
                          
                          {/* User Info */}
                          <View style={styles.userInfoContainer}>
                            <View style={styles.nameRow}>
                              <Text style={[styles.inviteConnectionName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                                {participant.name}
                              </Text>
                              {participant.age && (
                                <Text style={[styles.ageText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                                  {participant.age}
                                </Text>
                              )}

                            </View>
                            
                            <View style={styles.metaRow}>
                              <View style={styles.metaItem}>
                                <Ionicons 
                                  name="location" 
                                  size={12} 
                                  color={theme === "light" ? "#64748B" : "#94A3B8"} 
                                  style={styles.metaIcon}
                                />
                                <Text style={[styles.metaText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                                  {participant.airportCode || 'Unknown'}
                                </Text>
                              </View>
                              
                              <View style={styles.metaDivider} />
                              
                              <View style={styles.metaItem}>
                                <Ionicons 
                                  name="time" 
                                  size={12} 
                                  color={theme === "light" ? "#64748B" : "#94A3B8"} 
                                  style={styles.metaIcon}
                                />
                                <Text style={[styles.metaText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                                  {formatLastActive(participant.lastLogin)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                        
                        {/* Bottom Row: Remove Button */}
                        <View style={styles.buttonRow}>
                          {participant.id !== ping?.creatorId ? (
                            <TouchableOpacity
                              style={[
                                styles.removeButton,
                                { 
                                  backgroundColor: removingParticipant === participant.id 
                                    ? "#ef4444"
                                    : theme === "light" 
                                      ? "#f8f9fa" 
                                      : "#3a3a3a",
                                  borderColor: removingParticipant === participant.id 
                                    ? "#ef4444"
                                    : theme === "light" 
                                      ? "rgba(239, 68, 68, 0.2)" : 
                                      "rgba(239, 68, 68, 0.3)"
                                }
                              ]}
                              onPress={() => handleRemoveParticipant(participant.id, participant.name)}
                              disabled={removingParticipant === participant.id}
                              activeOpacity={0.7}
                            >
                              {removingParticipant === participant.id ? (
                                <View style={styles.invitingContent}>
                                  <Animated.View 
                                    style={[
                                      styles.invitingSpinner, 
                                      { 
                                        borderTopColor: "#ffffff",
                                        transform: [{
                                          rotate: removingSpinnerAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg']
                                          })
                                        }]
                                      }
                                    ]} 
                                  />
                                  <Text style={styles.removeButtonTextActive}>Removing...</Text>
                                </View>
                              ) : (
                                <>
                                  <MaterialIcons name="person-remove" size={16} color="#ef4444" />
                                  <Text style={[styles.removeButtonText, { color: "#ef4444" }]}>
                                    Remove
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <View style={[styles.organizerNote, { 
                              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                            }]}>
                              <MaterialIcons name="star" size={16} color="#37a4c8" />
                              <Text style={[styles.organizerNoteText, { color: "#37a4c8" }]}>
                                Activity Organizer
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                  <View style={[styles.noConnectionsContainer, { 
                    backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a",
                    borderColor: theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.06)",
                  }]}>
                    <View style={[styles.noConnectionsIcon, { 
                      backgroundColor: theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.15)" 
                    }]}>
                      <MaterialIcons name="people-outline" size={32} color="#ef4444" />
                    </View>
                    <Text style={[styles.noConnectionsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      No participants yet
                    </Text>
                    <Text style={[styles.noConnectionsSubtext, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Participants will appear here once they join the activity
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { 
    flex: 1, 
    paddingHorizontal: 16 
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  mapContainer: {
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 16,
    elevation: 8,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapOverlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapOverlayText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  pingMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#37a4c8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  categoryIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 30,
  },
  category: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  section: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400",
  },
  detailsGrid: {
    marginBottom: 20,
    gap: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.2)',
  },
  tagText: {
    color: '#37a4c8',
    fontSize: 14,
    fontWeight: '500',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorInfo: {
    marginLeft: 16,
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  creatorDate: {
    fontSize: 14,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  participantsHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  manageButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  viewAllText: {
    color: '#37a4c8',
    fontSize: 14,
    fontWeight: '600',
  },
  participantsContainer: {
    flex: 1,
    paddingTop: 8,
  },
  participantsScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  participantsScroll: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  participantLocation: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  noParticipants: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  joinButton: {
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  joinButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  bottomButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  topButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
    width: '100%',
  },
  buttonContainer: {
    flex: 1,
    minWidth: 0,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  topButtonContainer: {
    flex: 1,
    minWidth: 0,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonContainerDisabled: {
    opacity: 0.4,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  chatButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chatIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalSpacer: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalParticipant: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.1)',
  },
  modalParticipantInfo: {
    flex: 1,
  },
  modalParticipantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalParticipantSubtitle: {
    fontSize: 14,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    textAlignVertical: 'top',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  saveButton: {
    backgroundColor: '#37a4c8',
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectionOptionsContainer: {
    maxHeight: 300,
    paddingHorizontal: 4,
  },
  selectionOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionOptionText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  editValueText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  inviteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    shadowColor: "#9C27B0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  noConnectionsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  noConnectionsText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  noConnectionsSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inviteModalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 20,
    padding: 0,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  inviteModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  inviteModalHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  inviteModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  inviteModalSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  inviteModalBody: {
    maxHeight: 450,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  inviteModalScrollContent: {
    paddingBottom: 24,
  },
  connectionsCount: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteConnectionItem: {
    flexDirection: 'column',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  inviteConnectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  inviteConnectionName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metaIcon: {
    marginRight: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfoContainer: {
    flex: 1,
    marginRight: 16,
  },
  buttonRow: {
    alignItems: 'center',
  },
  inviteConnectionContent: {
    flex: 1,
    justifyContent: 'space-between',
    height: 52,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    marginHorizontal: 8,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageText: {
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },

  loadingSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
    alignSelf: 'center',
  },
  invitingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invitingSpinner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inviteButtonTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  noConnectionsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  exploreButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#9C27B0",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  privacyDescription: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
  },
  privacyOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  privacyOptionContent: {
    flex: 1,
  },
  privacyOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyOptionDescription: {
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 28,
  },
  managementParticipant: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.1)',
  },
  managementParticipantInfo: {
    flex: 1,
  },
  managementParticipantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  managementParticipantSubtitle: {
    fontSize: 14,
  },
  removeButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    gap: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  removeButtonTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  organizerNote: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  organizerNoteText: {
    color: '#37a4c8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  creatorLabel: {
    color: '#37a4c8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  participantsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantCountText: {
    color: '#37a4c8',
    fontSize: 14,
    fontWeight: '600',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  headerButtonText: {
    color: '#37a4c8',
    fontSize: 14,
    fontWeight: '600',
  },
  participantsContainer: {
    flex: 1,
  },
  participantsScrollContent: {
    paddingHorizontal: 20,
  },
  participantCard: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 120,
    paddingVertical: 8,
  },
  participantAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
    paddingTop: 4,
  },
  creatorBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#37a4c8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  moreParticipantsCard: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 120,
    paddingVertical: 8,
  },
  moreParticipantsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moreParticipantsText: {
    color: '#37a4c8',
    fontSize: 14,
    fontWeight: '600',
  },
  moreParticipantsLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyParticipantsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  emptyParticipantsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyParticipantsText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyParticipantsSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  removeParticipantButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    gap: 8,
  },
  directionsButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.1)',
  },
  directionsButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  directionsButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
}); 