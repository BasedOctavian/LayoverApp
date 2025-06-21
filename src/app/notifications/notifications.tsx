import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, FlatList, Alert, Animated } from 'react-native';
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
    <View style={[styles.notificationItem, { 
      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
      borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
    }]}>
      <View style={styles.notificationContent}>
        <Animated.View 
          style={[
            styles.skeletonTitle, 
            { 
              backgroundColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
              opacity: shimmerOpacity 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonBody, 
            { 
              backgroundColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
              opacity: shimmerOpacity 
            }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonTime, 
            { 
              backgroundColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
              opacity: shimmerOpacity 
            }
          ]} 
        />
      </View>
    </View>
  );
};

// Animated notification item component
const AnimatedNotificationItem = ({ item, index, theme, onPress, onClear }: { 
  item: Notification; 
  index: number; 
  theme: string; 
  onPress: () => void; 
  onClear: () => void; 
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
      <TouchableOpacity
        style={[styles.notificationItem, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a"
        }]}
        onPress={onPress}
      >
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe",
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
            color: theme === "light" ? "#666666" : "#a0a0a0"
          }]}>
            {new Date(item.timestamp?.seconds * 1000).toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={onClear}
        >
          <Ionicons name="close-circle" size={24} color="#37a4c8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const notificationListener = useRef<ExpoNotifications.Subscription | null>(null);
  const responseListener = useRef<ExpoNotifications.Subscription | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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

  const handleNotificationPress = (item: Notification) => {
    if (item.data.type === 'chat') {
      router.push(`/chat/${item.data.chatId}`);
    } else if (item.data.type === 'eventChat') {
      router.push(`/event/eventChat/${item.data.eventId}`);
    } else if (item.data.type === 'match') {
      router.push('/chat/chatInbox');
    }
  };

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => (
    <AnimatedNotificationItem
      item={item}
      index={index}
      theme={theme}
      onPress={() => handleNotificationPress(item)}
      onClear={() => clearNotification(item.id)}
    />
  );

  const renderSkeletonList = () => {
    const skeletonItems = Array.from({ length: 5 }, (_, index) => (
      <NotificationSkeleton key={index} theme={theme} />
    ));

    return (
      <View style={styles.notificationList}>
        {skeletonItems}
      </View>
    );
  };

  return (
    <>
      <TopBar onProfilePress={() => router.push(`/profile/${auth.currentUser?.uid}`)} />
      <SafeAreaView style={[styles.container, { 
        paddingTop: insets.top,
        backgroundColor: theme === "light" ? "#f8f9fa" : "#000000"
      }]}>
        <LinearGradient
          colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]}
          style={styles.gradient}
        >
          <Animated.View 
            style={[
              styles.content, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {loading ? (
              <>
                <View style={styles.header}>
                  <Text style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Notifications
                  </Text>
                </View>
                {renderSkeletonList()}
              </>
            ) : notifications.length === 0 ? (
              <Animated.View style={{ opacity: fadeAnim }}>
                <Ionicons name="notifications-off" size={64} color="#37a4c8" />
                <Text style={[styles.title, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  No new notifications!
                </Text>
                <Text style={[styles.subtitle, { color: "#37a4c8" }]}>
                  We'll notify you when something important happens
                </Text>
              </Animated.View>
            ) : (
              <>
                <View style={styles.header}>
                  <Text style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
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
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
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
    paddingHorizontal: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  clearAllButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 40,
  },
  clearAllText: {
    color: '#37a4c8',
    fontSize: 16,
    fontWeight: '600',
    textAlignVertical: 'center',
    includeFontPadding: false,
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
  // Skeleton loading styles
  skeletonTitle: {
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonBody: {
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
    width: '90%',
  },
  skeletonTime: {
    height: 12,
    borderRadius: 4,
    width: '60%',
  },
}); 