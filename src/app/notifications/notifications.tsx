import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, Alert, Animated, RefreshControl, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { router } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';
import * as ExpoNotifications from 'expo-notifications';
import { doc, setDoc, serverTimestamp, collection, query, where, orderBy, onSnapshot, deleteDoc, writeBatch, getDocs, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { auth } from '../../../config/firebaseConfig';
import * as Haptics from 'expo-haptics';
import useAuth from '../../hooks/auth';
import useUsers from '../../hooks/useUsers';
import useNotificationCount from '../../hooks/useNotificationCount';

interface Notification {
  id: string;
  title: string;
  body: string;
  data: {
    type: 'chat' | 'eventChat' | 'match' | 'ping_invitation' | 'ping_event';
    chatId?: string;
    eventId?: string;
    matchedUserId?: string;
    matchedUserName?: string;
    pingId?: string;
    pingTitle?: string;
    inviterId?: string;
    inviterName?: string;
    pingLocation?: string;
    pingCategory?: string;
    creatorName?: string;
    pingDescription?: string;
    distanceMiles?: number;
  };
  timestamp: any;
  read: boolean;
}

// Configure notification handler
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Skeleton loading component
const NotificationSkeleton = ({ theme }: { theme: string }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, []);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.notificationCard, { 
      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
      borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
    }]}>
      <View style={styles.notificationContent}>
        <Animated.View 
          style={[
            styles.skeletonTitle, 
            { 
              backgroundColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
              opacity: shimmerOpacity 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonBody, 
            { 
              backgroundColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
              opacity: shimmerOpacity 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonTime, 
            { 
              backgroundColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
              opacity: shimmerOpacity 
            }
          ]} 
        />
      </View>
    </View>
  );
};

// Animated notification item component
const AnimatedNotificationItem = ({ item, index, theme, onPress, onClear, onAccept, onDecline }: { 
  item: Notification; 
  index: number; 
  theme: string; 
  onPress: () => void; 
  onClear: () => void; 
  onAccept?: () => void; 
  onDecline?: () => void; 
}) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 100, // Stagger animation
      useNativeDriver: true,
    }).start();
  }, [index]);

  const isInvitation = item.data.type === 'ping_invitation';
  const isEvent = item.data.type === 'ping_event';

  const getNotificationIcon = () => {
    switch (item.data.type) {
      case 'chat':
        return 'chatbubble-ellipses';
      case 'eventChat':
        return 'calendar';
      case 'match':
        return 'heart';
      case 'ping_invitation':
        return 'people';
      case 'ping_event':
        return 'calendar';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = () => {
    switch (item.data.type) {
      case 'chat':
        return '#37a4c8';
      case 'eventChat':
        return '#4CAF50';
      case 'match':
        return '#FF6B6B';
      case 'ping_invitation':
        return '#FFA726';
      case 'ping_event':
        return '#4CAF50';
      default:
        return '#37a4c8';
    }
  };

  return (
    <Animated.View
      style={{
        opacity: itemAnim,
        transform: [{
          translateY: itemAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          }),
        }],
      }}
    >
      <View
        style={[styles.notificationCard, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
          borderColor: theme === 'light' ? '#e0e0e0' : '#2a2a2a',
        }]}
      >
        <TouchableOpacity
          style={styles.notificationTouchable}
          onPress={onPress}
          activeOpacity={isInvitation || isEvent ? 1 : 0.7}
          disabled={isInvitation || isEvent}
        >
          <View style={styles.notificationIconContainer}>
            <View style={[styles.notificationIcon, { backgroundColor: `${getNotificationColor()}20` }]}>
              <Ionicons name={getNotificationIcon()} size={20} color={getNotificationColor()} />
            </View>
          </View>
          
          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: theme === 'light' ? '#0F172A' : '#e4fbfe',
                  fontWeight: item.read ? '500' : '600',
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.notificationBody,
                { color: theme === 'light' ? '#666666' : '#a0a0a0' },
              ]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
            <Text
              style={[
                styles.notificationTime,
                { color: theme === 'light' ? '#999999' : '#666666' },
              ]}
            >
              {new Date(item.timestamp?.seconds * 1000).toLocaleString()}
            </Text>
          </View>

          {!isInvitation && !isEvent && (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={onClear}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={24} color="#37a4c8" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {isInvitation && (
          <View style={styles.invitationActionsContainer}>
            <TouchableOpacity
              style={[styles.invitationButton, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <MaterialIcons name="check" size={20} color="#ffffff" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.invitationButton, styles.declineButton, {
                borderColor: theme === 'light' ? '#37a4c8' : '#38a5c9',
                backgroundColor: theme === 'light' ? '#f8f9fa' : '#23272b',
              }]}
              onPress={onDecline}
              activeOpacity={0.85}
            >
              <MaterialIcons 
                name="close" 
                size={20} 
                color={theme === 'light' ? '#37a4c8' : '#38a5c9'} 
              />
              <Text style={[styles.declineButtonText, {
                color: theme === 'light' ? '#37a4c8' : '#38a5c9',
              }]}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {isEvent && (
          <View style={styles.invitationActionsContainer}>
            <TouchableOpacity
              style={[styles.invitationButton, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <MaterialIcons name="check" size={20} color="#ffffff" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.invitationButton, styles.declineButton, {
                borderColor: theme === 'light' ? '#37a4c8' : '#38a5c9',
                backgroundColor: theme === 'light' ? '#f8f9fa' : '#23272b',
              }]}
              onPress={onDecline}
              activeOpacity={0.85}
            >
              <MaterialIcons 
                name="close" 
                size={20} 
                color={theme === 'light' ? '#37a4c8' : '#38a5c9'} 
              />
              <Text style={[styles.declineButtonText, {
                color: theme === 'light' ? '#37a4c8' : '#38a5c9',
              }]}>
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const currentTheme = theme || 'dark';
  const notificationListener = useRef<ExpoNotifications.Subscription | null>(null);
  const responseListener = useRef<ExpoNotifications.Subscription | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Add the same hooks as settings
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const { getUser } = useUsers();
  const [userData, setUserData] = useState<any>(null);
  
  // Get notification count
  const notificationCount = useNotificationCount(userId);

  // Set userId when user is available
  useEffect(() => {
    if (user) {
      setUserId(user.uid);
    }
  }, [user]);

  // Fetch user data when user is available
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (user) {
          const data = await getUser(user.uid);
          setUserData(data);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [user, getUser]);

  useEffect(() => {
    setupNotificationListeners();
    setupNotificationsListener();

    // Start smooth entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const setupNotificationListeners = () => {
    // Listen for incoming notifications while the app is foregrounded
    notificationListener.current = ExpoNotifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      // Only save notifications that are meant for this user and they are the receiver
      if (notification.request.content.data?.receiverId === auth.currentUser?.uid && 
          notification.request.content.data?.senderId !== auth.currentUser?.uid) {
        saveNotificationToFirestore(notification);
      }
    });

    // Listen for user interactions with notifications
    responseListener.current = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
      // Only handle notifications that are meant for this user and they are the receiver
      if (response.notification.request.content.data?.receiverId === auth.currentUser?.uid &&
          response.notification.request.content.data?.senderId !== auth.currentUser?.uid) {
        handleNotificationResponse(response);
      }
    });
  };

  const setupNotificationsListener = () => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        const notificationList = userData.notifications || [];
        // Sort notifications by timestamp in descending order (newest first)
        const sortedNotifications = [...notificationList].sort((a, b) => {
          const timeA = a.timestamp?.seconds || 0;
          const timeB = b.timestamp?.seconds || 0;
          return timeB - timeA;
        });
        
        // Smooth transition when data loads
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setNotifications(sortedNotifications);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return unsubscribe;
  };

  const saveNotificationToFirestore = async (notification: ExpoNotifications.Notification) => {
    if (!auth.currentUser) return;

    try {
      const senderName = notification.request.content.data.senderName;
      const notificationData = {
        title: senderName ? `Message from ${senderName}` : 'New Message',
        body: notification.request.content.body,
        data: notification.request.content.data,
        timestamp: serverTimestamp(),
        userId: notification.request.content.data.receiverId,
        senderId: notification.request.content.data.senderId,
        senderName: senderName,
        read: false
      };

      // Only save if this notification is for the current user
      if (notificationData.userId === auth.currentUser.uid) {
        const notificationsRef = collection(db, 'notifications');
        await setDoc(doc(notificationsRef), notificationData);
      }
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  const handleNotificationResponse = (response: ExpoNotifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'chat') {
      router.push(`/chat/${data.chatId}`);
    } else if (data.type === 'eventChat') {
      router.push(`/event/eventChat/${data.eventId}`);
    } else if (data.type === 'match') {
      // For match notifications, navigate to chat inbox
      router.push('/chat/chatInbox');
    } else if (data.type === 'ping_invitation' || data.type === 'ping_event') {
      router.push(`/ping/${data.pingId}`);
    }
  };

  const clearNotification = async (notificationId: string) => {
    if (!auth.currentUser) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedNotifications = (userData.notifications || []).filter(
          (n: Notification) => n.id !== notificationId
        );
        await updateDoc(userRef, { notifications: updatedNotifications });
      }
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!auth.currentUser) return;
    
    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              
              const userRef = doc(db, 'users', auth.currentUser!.uid);
              await updateDoc(userRef, { notifications: [] });
            } catch (error) {
              console.error('Error clearing all notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleNotificationPress = (item: Notification) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (item.data.type === 'chat') {
      router.push(`/chat/${item.data.chatId}`);
    } else if (item.data.type === 'eventChat') {
      router.push(`/event/eventChat/${item.data.eventId}`);
    } else if (item.data.type === 'match') {
      router.push('/chat/chatInbox');
    } else if (item.data.type === 'ping_invitation' || item.data.type === 'ping_event') {
      router.push(`/ping/${item.data.pingId}`);
    }
  };

  const handleAcceptInvitation = async (item: Notification) => {
    if (!auth.currentUser || !item.data.pingId) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      
      // Remove the notification first
      await clearNotification(item.id);
      
      // Get the ping document
      const pingRef = doc(db, 'pings', item.data.pingId);
      const pingDoc = await getDoc(pingRef);
      if (!pingDoc.exists()) {
        Alert.alert('Error', 'Activity not found');
        return;
      }
      
      const pingData = pingDoc.data();
      const currentParticipants = pingData.participants || [];
      
      // Check if user is already a participant
      if (currentParticipants.includes(auth.currentUser.uid)) {
        Alert.alert('Already Joined', 'You are already a participant in this activity');
        router.push(`/ping/${item.data.pingId}`);
        return;
      }
      
      // Add user to participants
      await updateDoc(pingRef, {
        participants: arrayUnion(auth.currentUser.uid),
        participantCount: currentParticipants.length + 1
      });
      
      // For ping_invitation notifications, send notification to inviter
      if (item.data.type === 'ping_invitation' && item.data.inviterId) {
        const inviterRef = doc(db, 'users', item.data.inviterId);
        const inviterDoc = await getDoc(inviterRef);
        if (inviterDoc.exists()) {
          const inviterData = inviterDoc.data();
          const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          const currentUserData = currentUserDoc.data();
          const acceptanceNotification = {
            id: Date.now().toString(),
            title: 'Invitation Accepted! 🎉',
            body: `${currentUserData?.name || 'Someone'} accepted your invitation to "${item.data.pingTitle}"`,
            data: {
              type: 'ping_acceptance',
              pingId: item.data.pingId,
              pingTitle: item.data.pingTitle,
              acceptedUserId: auth.currentUser.uid,
              acceptedUserName: currentUserData?.name || 'Someone'
            },
            timestamp: new Date(),
            read: false
          };
          await updateDoc(inviterRef, {
            notifications: arrayUnion(acceptanceNotification)
          });
          
          // Send push notification to inviter
          if (inviterData?.expoPushToken && 
              inviterData?.notificationPreferences?.notificationsEnabled && 
              inviterData?.notificationPreferences?.events) {
            const pushPayload = {
              to: inviterData.expoPushToken,
              title: 'Invitation Accepted! 🎉',
              body: `${currentUserData?.name || 'Someone'} accepted your invitation to "${item.data.pingTitle}"`,
              sound: 'default',
              priority: 'high',
              data: {
                type: 'ping_acceptance',
                pingId: item.data.pingId,
                pingTitle: item.data.pingTitle,
                acceptedUserId: auth.currentUser.uid,
                acceptedUserName: currentUserData?.name || 'Someone'
              },
            };
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
              },
              body: JSON.stringify(pushPayload),
            });
          }
        }
      }
      
      // For ping_event notifications, send notification to creator
      if (item.data.type === 'ping_event' && pingData.creatorId) {
        const creatorRef = doc(db, 'users', pingData.creatorId);
        const creatorDoc = await getDoc(creatorRef);
        if (creatorDoc.exists()) {
          const creatorData = creatorDoc.data();
          const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          const currentUserData = currentUserDoc.data();
          const joinNotification = {
            id: Date.now().toString(),
            title: 'Someone Joined Your Activity! 🎉',
            body: `${currentUserData?.name || 'Someone'} joined your activity "${item.data.pingTitle}"`,
            data: {
              type: 'ping_join',
              pingId: item.data.pingId,
              pingTitle: item.data.pingTitle,
              joinedUserId: auth.currentUser.uid,
              joinedUserName: currentUserData?.name || 'Someone'
            },
            timestamp: new Date(),
            read: false
          };
          await updateDoc(creatorRef, {
            notifications: arrayUnion(joinNotification)
          });
          
          // Send push notification to creator
          if (creatorData?.expoPushToken && 
              creatorData?.notificationPreferences?.notificationsEnabled && 
              creatorData?.notificationPreferences?.events) {
            const pushPayload = {
              to: creatorData.expoPushToken,
              title: 'Someone Joined Your Activity! 🎉',
              body: `${currentUserData?.name || 'Someone'} joined your activity "${item.data.pingTitle}"`,
              sound: 'default',
              priority: 'high',
              data: {
                type: 'ping_join',
                pingId: item.data.pingId,
                pingTitle: item.data.pingTitle,
                joinedUserId: auth.currentUser.uid,
                joinedUserName: currentUserData?.name || 'Someone'
              },
            };
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
              },
              body: JSON.stringify(pushPayload),
            });
          }
        }
      }
      
      // Show success message and navigate to the activity screen
      const successMessage = item.data.type === 'ping_event' 
        ? `You've joined "${item.data.pingTitle}"!`
        : `You've accepted the invitation to "${item.data.pingTitle}"!`;
      
      Alert.alert('Success', successMessage);
      router.push(`/ping/${item.data.pingId}`);
      
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation. Please try again.');
    }
  };

  const handleDeclineInvitation = async (item: Notification) => {
    if (!auth.currentUser || !item.data.pingId) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Remove the notification first
      await clearNotification(item.id);
      
      // For ping_invitation notifications, send notification to inviter
      if (item.data.type === 'ping_invitation' && item.data.inviterId) {
        const inviterRef = doc(db, 'users', item.data.inviterId);
        const inviterDoc = await getDoc(inviterRef);
        if (inviterDoc.exists()) {
          const inviterData = inviterDoc.data();
          const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          const currentUserData = currentUserDoc.data();
          const declineNotification = {
            id: Date.now().toString(),
            title: 'Invitation Declined',
            body: `${currentUserData?.name || 'Someone'} declined your invitation to "${item.data.pingTitle}"`,
            data: {
              type: 'ping_decline',
              pingId: item.data.pingId,
              pingTitle: item.data.pingTitle,
              declinedUserId: auth.currentUser.uid,
              declinedUserName: currentUserData?.name || 'Someone'
            },
            timestamp: new Date(),
            read: false
          };
          await updateDoc(inviterRef, {
            notifications: arrayUnion(declineNotification)
          });
          
          // Send push notification to inviter
          if (inviterData?.expoPushToken && 
              inviterData?.notificationPreferences?.notificationsEnabled && 
              inviterData?.notificationPreferences?.events) {
            const pushPayload = {
              to: inviterData.expoPushToken,
              title: 'Invitation Declined',
              body: `${currentUserData?.name || 'Someone'} declined your invitation to "${item.data.pingTitle}"`,
              sound: 'default',
              priority: 'high',
              data: {
                type: 'ping_decline',
                pingId: item.data.pingId,
                pingTitle: item.data.pingTitle,
                declinedUserId: auth.currentUser.uid,
                declinedUserName: currentUserData?.name || 'Someone'
              },
            };
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
              },
              body: JSON.stringify(pushPayload),
            });
          }
        }
      }
      
      // For ping_event notifications, no need to notify the creator since it's just declining to join
      // Show appropriate message based on notification type
      const declineMessage = item.data.type === 'ping_event' 
        ? `You've declined to join "${item.data.pingTitle}"`
        : `You've declined the invitation to "${item.data.pingTitle}"`;
      
      Alert.alert('Declined', declineMessage);
      
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh logic here if needed
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => (
    <AnimatedNotificationItem
      item={item}
      index={index}
      theme={currentTheme}
      onPress={() => handleNotificationPress(item)}
      onClear={() => clearNotification(item.id)}
      onAccept={item.data.type === 'ping_invitation' || item.data.type === 'ping_event' ? () => handleAcceptInvitation(item) : undefined}
      onDecline={item.data.type === 'ping_invitation' || item.data.type === 'ping_event' ? () => handleDeclineInvitation(item) : undefined}
    />
  );

  const renderSkeletonList = () => {
    const skeletonItems = Array.from({ length: 5 }, (_, index) => (
      <NotificationSkeleton key={index} theme={currentTheme} />
    ));

    return (
      <View style={styles.notificationList}>
        {skeletonItems}
      </View>
    );
  };

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar onProfilePress={() => router.push("profile/" + userId)} notificationCount={notificationCount} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <Animated.View 
          style={{ 
            flex: 1,
            
           
          }}
        >
          <ScrollView 
            contentContainerStyle={styles.notificationsContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={currentTheme === "light" ? "#37a4c8" : "#37a4c8"}
                colors={["#37a4c8"]}
              />
            }
          >
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: currentTheme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                Notifications
              </Text>
              {notifications.length > 0 && (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={clearAllNotifications}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.clearAllText, { color: currentTheme === "light" ? "#37a4c8" : "#37a4c8" }]}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            {loading ? (
              renderSkeletonList()
            ) : notifications.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
                  <View style={[styles.emptyStateIcon, {
                    backgroundColor: currentTheme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
                  }]}>
                    <Ionicons name="notifications-off" size={48} color="#37a4c8" />
                  </View>
                  <Text style={[styles.emptyStateTitle, { color: currentTheme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    No notifications yet
                  </Text>
                  <Text style={[styles.emptyStateSubtitle, { color: currentTheme === "light" ? "#666666" : "#a0a0a0" }]}>
                    We'll notify you when something important happens
                  </Text>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.notificationList}>
                {notifications.map((item, index) => (
                  <AnimatedNotificationItem
                    key={item.id}
                    item={item}
                    index={index}
                    theme={currentTheme}
                    onPress={() => handleNotificationPress(item)}
                    onClear={() => clearNotification(item.id)}
                    onAccept={item.data.type === 'ping_invitation' || item.data.type === 'ping_event' ? () => handleAcceptInvitation(item) : undefined}
                    onDecline={item.data.type === 'ping_invitation' || item.data.type === 'ping_event' ? () => handleDeclineInvitation(item) : undefined}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  notificationsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 20,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  clearAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    alignSelf: 'flex-start',
  },
  clearAllText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },

  notificationList: {
    flex: 1,
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
  },
  notificationCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    paddingRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 6,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
    opacity: 0.7,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    opacity: 0.5,
    letterSpacing: 0.1,
  },
  clearButton: {
    padding: 6,
    marginLeft: 4,
  },
  invitationActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    width: '100%',
  },
  invitationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#37a4c8',
    borderColor: 'transparent',
  },
  declineButton: {
    borderColor: '#37a4c8',
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  // Skeleton loading styles
  skeletonTitle: {
    height: 16,
    borderRadius: 8,
    marginBottom: 6,
    width: '80%',
  },
  skeletonBody: {
    height: 14,
    borderRadius: 8,
    marginBottom: 8,
    width: '90%',
  },
  skeletonTime: {
    height: 12,
    borderRadius: 6,
    width: '60%',
  },
}); 