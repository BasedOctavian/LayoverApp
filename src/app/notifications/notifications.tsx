import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../../components/TopBar';
import { router } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';
import * as ExpoNotifications from 'expo-notifications';
import { doc, setDoc, serverTimestamp, collection, query, where, orderBy, onSnapshot, deleteDoc, writeBatch, getDocs, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { auth } from '../../../config/firebaseConfig';

interface Notification {
  id: string;
  title: string;
  body: string;
  data: {
    type: 'chat' | 'eventChat' | 'match';
    chatId?: string;
    eventId?: string;
    matchedUserId?: string;
    matchedUserName?: string;
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

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const notificationListener = useRef<ExpoNotifications.Subscription | null>(null);
  const responseListener = useRef<ExpoNotifications.Subscription | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    registerForPushNotificationsAsync();
    setupNotificationListeners();
    setupNotificationsListener();

    return () => {
      if (notificationListener.current) {
        ExpoNotifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        ExpoNotifications.removeNotificationSubscription(responseListener.current);
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
        setNotifications(notificationList);
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
    }
  };

  const clearNotification = async (notificationId: string) => {
    if (!auth.currentUser) return;
    
    try {
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
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { notifications: [] });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, { 
        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
        borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
      }]}
      onPress={() => {
        if (item.data.type === 'chat') {
          router.push(`/chat/${item.data.chatId}`);
        } else if (item.data.type === 'eventChat') {
          router.push(`/event/eventChat/${item.data.eventId}`);
        } else if (item.data.type === 'match') {
          router.push('/chat/chatInbox');
        }
      }}
    >
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { 
          color: theme === "light" ? "#000000" : "#ffffff",
          fontWeight: item.read ? "400" : "600"
        }]}>
          {item.title}
        </Text>
        <Text style={[styles.notificationBody, { 
          color: theme === "light" ? "#666666" : "#a0a0a0"
        }]}>
          {item.body}
        </Text>
        <Text style={[styles.notificationTime, { 
          color: theme === "light" ? "#999999" : "#666666"
        }]}>
          {new Date(item.timestamp?.seconds * 1000).toLocaleString()}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => clearNotification(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#37a4c8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <>
      <TopBar onProfilePress={() => router.push(`/profile/${auth.currentUser?.uid}`)} />
      <SafeAreaView style={[styles.container, { 
        paddingTop: insets.top,
        backgroundColor: theme === "light" ? "#ffffff" : "#000000"
      }]}>
        <LinearGradient
          colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {notifications.length === 0 ? (
              <>
                <Ionicons name="notifications-off" size={64} color="#37a4c8" />
                <Text style={[styles.title, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                  No new notifications!
                </Text>
                <Text style={[styles.subtitle, { color: "#37a4c8" }]}>
                  We'll notify you when something important happens
                </Text>
              </>
            ) : (
              <>
                <View style={styles.header}>
                  <Text style={[styles.title, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Notifications
                  </Text>
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={clearAllNotifications}
                  >
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={notifications}
                  renderItem={renderNotification}
                  keyExtractor={item => item.id}
                  style={styles.notificationList}
                  contentContainerStyle={styles.notificationListContent}
                />
              </>
            )}
          </View>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await ExpoNotifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: ExpoNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#37a4c8',
    });
  }

  const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }

  token = (await ExpoNotifications.getExpoPushTokenAsync()).data;
  
  // Save the token to Firestore if user is logged in
  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        expoPushToken: token,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  clearAllButton: {
    padding: 8,
  },
  clearAllText: {
    color: '#37a4c8',
    fontSize: 16,
    fontWeight: '600',
  },
  notificationList: {
    width: '100%',
  },
  notificationListContent: {
    paddingBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
}); 