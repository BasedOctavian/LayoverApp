import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Platform, Alert, ScrollView, Animated, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';
import TopBar from '../../components/TopBar';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { auth } from '../../../config/firebaseConfig';
import * as ExpoNotifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import useAuth from '../../hooks/auth';
import useNotificationCount from '../../hooks/useNotificationCount';

interface NotificationPreferences {
  announcements: boolean;
  chats: boolean;
  activities: boolean;
  connections: boolean;
  notificationsEnabled: boolean;
}

export default function NotificationPreferences() {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    announcements: true,
    chats: true,
    activities: true,
    connections: true,
    notificationsEnabled: false,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  // Handle back button press
  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

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

        // Load notification preferences
        await loadNotificationPreferences();
        
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
          ('activities' in data.notificationPreferences || 'events' in data.notificationPreferences);

        // If notification preferences don't exist or are incomplete, create/update them
        if (!hasNotificationPreferences) {
          const defaultPreferences = {
            announcements: true,
            chats: true,
            connections: true,
            activities: true,
            notificationsEnabled: status === 'granted' && !!data.expoPushToken
          };

          // Update the user document with default preferences
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            notificationPreferences: defaultPreferences
          });

          setPreferences(defaultPreferences);
        } else {
          // Use existing preferences with fallback to true
          // Support both 'activities' (new) and 'events' (legacy) field names
          const currentPreferences = {
            announcements: data.notificationPreferences?.announcements ?? true,
            chats: data.notificationPreferences?.chats ?? true,
            activities: data.notificationPreferences?.activities ?? data.notificationPreferences?.events ?? true,
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
    }
  };

  const getExpoPushToken = async () => {
    try {
      const projectId = '61cfadd9-25bb-4566-abec-1e9679ef882b';
      const token = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
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
          activities: newPreferences.activities,
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

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container]} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${user?.uid || auth.currentUser?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />
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
              'Activities',
              'Get notified about pings, events, groups, and activity updates',
              'activities',
              'calendar'
            )}
            {renderPreferenceItem(
              'Connections',
              'Get notified about new matches and connection requests',
              'connections',
              'people'
            )}
          </View>
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
}); 