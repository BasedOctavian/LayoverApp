import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, Alert, ScrollView, Animated, Image, TextInput, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';
import TopBar from '../../components/TopBar';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { auth } from '../../../config/firebaseConfig';
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import useUsers from '../../hooks/useUsers';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';

interface NotificationPreferences {
  announcements: boolean;
  chats: boolean;
  events: boolean;
  connections: boolean;
  notificationsEnabled: boolean;
}

interface User {
  id: string;
  name: string;
  expoPushToken: string;
  profilePicture?: string;
  email?: string;
  airportCode?: string;
}

interface ExpoPushToken {
  data: string;
  type: 'expo' | 'apns' | 'fcm';
}

export default function NotificationPreferences() {
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    announcements: true,
    chats: true,
    events: true,
    connections: true,
    notificationsEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [userData, setUserData] = useState<any>(null);
  const { getUser } = useUsers();
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const ADMIN_UIDS = ['hDn74gYZCdZu0efr3jMGTIWGrRQ2', 'WhNhj8WPUpbomevJQ7j69rnLbDp2'];
  const isAdmin = auth.currentUser?.uid ? ADMIN_UIDS.includes(auth.currentUser.uid) : false;

  useEffect(() => {
    const initializeData = async () => {
      if (isInitialized) return;
      
      try {
        // First check permissions
        const { status } = await ExpoNotifications.getPermissionsAsync();
        if (status === 'granted') {
          // Get the token if permissions are granted
          const token = await getExpoPushToken();
        }

        // Load other data
        await loadNotificationPreferences();
        await loadUsers();
        if (auth.currentUser) {
          const data = await getUser(auth.currentUser.uid);
          setUserData(data);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };
    
    initializeData();
    
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isInitialized]); // Only re-run if isInitialized changes

  const loadNotificationPreferences = async () => {
    if (!auth.currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const { status } = await ExpoNotifications.getPermissionsAsync();

        // Check if notificationPreferences exists and has all required fields
        const hasNotificationPreferences = data.notificationPreferences && 
          typeof data.notificationPreferences === 'object' &&
          'announcements' in data.notificationPreferences &&
          'chats' in data.notificationPreferences &&
          'connections' in data.notificationPreferences &&
          'events' in data.notificationPreferences;

        // If notification preferences don't exist or are incomplete, create/update them
        if (!hasNotificationPreferences) {
          const defaultPreferences = {
            announcements: true,
            chats: true,
            connections: true,
            events: true,
            notificationsEnabled: status === 'granted' && !!data.expoPushToken
          };

          // Update the user document with default preferences
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            notificationPreferences: defaultPreferences
          });

          setPreferences(defaultPreferences);
        } else {
          // Use existing preferences with fallback to true
          const currentPreferences = {
            announcements: data.notificationPreferences?.announcements ?? true,
            chats: data.notificationPreferences?.chats ?? true,
            events: data.notificationPreferences?.events ?? true,
            connections: data.notificationPreferences?.connections ?? true,
            notificationsEnabled: status === 'granted' && !!data.expoPushToken,
          };

          // If we have a push token but notificationsEnabled is false, update it
          if (data.expoPushToken && !currentPreferences.notificationsEnabled) {
            currentPreferences.notificationsEnabled = true;
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              notificationPreferences: currentPreferences
            });
          }

          setPreferences(currentPreferences);
        }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('expoPushToken', '!=', null)
      );
      const querySnapshot = await getDocs(usersQuery);
      const usersList: User[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== auth.currentUser?.uid) {
          usersList.push({
            id: doc.id,
            name: data.name,
            expoPushToken: data.expoPushToken,
            profilePicture: data.profilePicture,
            email: data.email,
            airportCode: data.airportCode,
          });
        }
      });
      
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const getExpoPushToken = async () => {
    try {
      const projectId = '61cfadd9-25bb-4566-abec-1e9679ef882b';
      const token = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
      if (isAdmin) {
        setCurrentToken(token.data);
      }
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  };

  const openAppSettings = async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (!auth.currentUser) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      if (value) {
        const { status } = await ExpoNotifications.getPermissionsAsync();
        
        if (status === 'denied') {
          Alert.alert(
            'Permission Required',
            'Notifications are currently disabled in your device settings. Would you like to open settings to enable them?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: openAppSettings }
            ]
          );
          return;
        }

        if (status !== 'granted') {
          const { status: newStatus } = await ExpoNotifications.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            Alert.alert(
              'Permission Required',
              'Please enable notifications to receive updates.',
              [{ text: 'OK' }]
            );
            return;
          }
        }

        const token = await getExpoPushToken();
        
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          expoPushToken: token.data,
          notificationPreferences: {
            ...preferences,
            notificationsEnabled: true,
          }
        });

        setPreferences(prev => ({ ...prev, notificationsEnabled: true }));
      } else {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          expoPushToken: null,
          notificationPreferences: {
            ...preferences,
            notificationsEnabled: false,
          }
        });

        setPreferences(prev => ({ ...prev, notificationsEnabled: false }));
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert(
        'Error', 
        'Failed to update notification settings. Please try again.'
      );
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!auth.currentUser || !preferences.notificationsEnabled) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        notificationPreferences: {
          announcements: newPreferences.announcements,
          chats: newPreferences.chats,
          events: newPreferences.events,
          connections: newPreferences.connections,
          notificationsEnabled: newPreferences.notificationsEnabled,
        }
      });
    } catch (error) {
      console.error('Error updating notification preference:', error);
      setPreferences(preferences);
      Alert.alert('Error', 'Failed to update notification preference. Please try again.');
    }
  };

  const renderPreferenceItem = (
    title: string,
    description: string,
    key: keyof NotificationPreferences,
    icon: string
  ) => {
    const isDisabled = !preferences.notificationsEnabled;
    const disabledMessage = !preferences.notificationsEnabled ? 'Enable notifications to configure this setting' : '';

    return (
      <Animated.View 
        style={[
          styles.preferenceItem, 
          { 
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }
        ]}
      >
        <View style={[
          styles.preferenceContent,
          isDisabled && { opacity: 0.7 }
        ]}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a" }
          ]}>
            <Ionicons name={icon as any} size={24} color="#37a4c8" />
          </View>
          <View style={styles.preferenceText}>
            <Text style={[styles.preferenceTitle, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe"
            }]}>
              {title}
            </Text>
            <Text style={[styles.preferenceDescription, { 
              color: theme === "light" ? "#666666" : "#a0a0a0"
            }]}>
              {disabledMessage || description}
            </Text>
          </View>
        </View>
        <Switch
          value={preferences[key]}
          onValueChange={(value) => updatePreference(key, value)}
          disabled={isDisabled}
          trackColor={{ false: '#767577', true: '#37a4c8' }}
          thumbColor={preferences[key] ? '#ffffff' : '#f4f3f4'}
        />
      </Animated.View>
    );
  };

  const sendTestNotification = async (token: string, userName: string) => {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: token,
          title: '[Admin] Test Notification',
          body: `This is a test notification from the admin panel to ${userName}`,
          sound: 'default',
          priority: 'high',
          data: { type: 'admin_test' },
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`Failed to send test notification: ${responseData.message || 'Unknown error'}`);
      }

      Alert.alert('Success', `Test notification sent successfully to ${userName}`);
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert(
        'Error',
        `Failed to send test notification to ${userName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar onProfilePress={() => router.push(`/profile/${auth.currentUser?.uid}`)} />
      <SafeAreaView style={[styles.container]} edges={["bottom"]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.settingsContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={[styles.title, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
              Notification Preferences
            </Text>
            <Text style={[styles.subtitle, { color: theme === "light" ? "#666666" : "#a0a0a0" }]}>
              Choose what you want to be notified about
            </Text>
          </Animated.View>

          <Animated.View style={[styles.preferenceItem, { 
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
            transform: [{ translateY: slideAnim }],
            opacity: fadeAnim
          }]}>
            <View style={styles.preferenceContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a" }]}>
                <Ionicons name="notifications" size={24} color="#37a4c8" />
              </View>
              <View style={styles.preferenceText}>
                <Text style={[styles.preferenceTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Notifications
                </Text>
                <Text style={[styles.preferenceDescription, { color: theme === "light" ? "#666666" : "#a0a0a0" }]}>
                  Enable or disable all notifications
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: '#767577', true: '#37a4c8' }}
              thumbColor={preferences.notificationsEnabled ? '#ffffff' : '#f4f3f4'}
            />
          </Animated.View>

          <View style={styles.preferencesContainer}>
            {renderPreferenceItem(
              'Announcements',
              'Get notified about important updates and announcements',
              'announcements',
              'megaphone'
            )}
            {renderPreferenceItem(
              'Chats',
              'Receive notifications for new messages and chat requests',
              'chats',
              'chatbubble'
            )}
            {renderPreferenceItem(
              'Events',
              'Stay updated about event updates and reminders',
              'events',
              'calendar'
            )}
            {renderPreferenceItem(
              'Connections',
              'Get notified about new matches and connection requests',
              'connections',
              'people'
            )}
          </View>

          {isAdmin && (
            <Animated.View 
              style={[
                styles.adminSection,
                { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <Text style={[styles.adminTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                Your Push Token
              </Text>
              <View style={[styles.tokenContainer, { backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a" }]}>
                <Text style={[styles.tokenText, { color: theme === "light" ? "#666666" : "#a0a0a0" }]}>
                  {currentToken || 'No token available'}
                </Text>
                {currentToken && (
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => {
                      Clipboard.setStringAsync(currentToken);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                  >
                    <Ionicons name="copy-outline" size={20} color="#37a4c8" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={[styles.adminTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe", marginTop: 24 }]}>
                Users with Push Tokens
              </Text>
              <ScrollView style={styles.usersList}>
                {users.map((user) => (
                  <View 
                    key={user.id} 
                    style={[
                      styles.userItem,
                      { backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a" }
                    ]}
                  >
                    <View style={styles.userInfo}>
                      {user.profilePicture ? (
                        <Image 
                          source={{ uri: user.profilePicture }} 
                          style={styles.userAvatar}
                        />
                      ) : (
                        <View style={[styles.userAvatar, { backgroundColor: '#37a4c8' }]}>
                          <Text style={styles.userAvatarText}>
                            {user.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userDetails}>
                        <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                          {user.name}
                        </Text>
                        {user.email && (
                          <Text style={[styles.userEmail, { color: theme === "light" ? "#666666" : "#a0a0a0" }]}>
                            {user.email}
                          </Text>
                        )}
                        {user.airportCode && (
                          <Text style={[styles.userAirport, { color: theme === "light" ? "#666666" : "#a0a0a0" }]}>
                            Airport: {user.airportCode}
                          </Text>
                        )}
                        <Text style={[styles.userToken, { color: theme === "light" ? "#666666" : "#a0a0a0" }]}>
                          Token: {user.expoPushToken}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.sendButton, { backgroundColor: "#37a4c8" }]}
                      onPress={() => sendTestNotification(user.expoPushToken, user.name)}
                    >
                      <Ionicons name="notifications" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                      <Text style={styles.sendButtonText}>Send Test</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  settingsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  preferencesContainer: {
    padding: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  preferenceText: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  adminSection: {
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  usersList: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 2,
  },
  userAirport: {
    fontSize: 12,
    marginBottom: 2,
  },
  userToken: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
}); 