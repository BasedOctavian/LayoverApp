import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image, Alert } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import useAuth from "../hooks/auth"; // Import your auth hook
import { useGetProfilePicUrl } from "../hooks/useSupabase";
import LoadingScreen from "../components/LoadingScreen";
import TopBar from "../components/TopBar";
import useUsers from "../hooks/useUsers";
import * as ExpoNotifications from 'expo-notifications';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { isProfileComplete } from "../utils/profileCompletionCheck";

// Configure notification handler
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Preload the logo image
const logoSource = require('../../assets/adaptive-icon.png');
Image.prefetch(Image.resolveAssetSource(logoSource).uri);

// Pre-render the TopBar to ensure it's ready
const PreloadedTopBar = () => {
  return (
    <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
      <TopBar />
    </View>
  );
};

export default function MainScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // Get the authenticated user and loading state
  const { getProfilePicUrl } = useGetProfilePicUrl();
  const { getUser } = useUsers();
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // Set up notification response handler
    const subscription = ExpoNotifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Handle different notification types
      if (data.type === 'chat' && data.chatId) {
        // Navigate to the chat
        router.push(`/chat/${data.chatId}`);
      }
    });

    // Clean up subscription
    return () => {
      subscription.remove();
    };
  }, []);

  const handleNotificationToken = async (userId: string) => {
    try {
      // Check current permission status
      const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
      
      // If not determined, request permission
      if (existingStatus !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        if (status !== 'granted') {
          console.log('Notification permission not granted');
          return;
        }
      }

      // Get the current token
      const projectId = '61cfadd9-25bb-4566-abec-1e9679ef882b';
      const token = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
      
      // Get user document
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const currentToken = userData.expoPushToken;

        // Check if notificationPreferences exists
        const hasNotificationPreferences = userData.notificationPreferences && 
          typeof userData.notificationPreferences === 'object' &&
          'announcements' in userData.notificationPreferences &&
          'chats' in userData.notificationPreferences &&
          'connections' in userData.notificationPreferences &&
          'events' in userData.notificationPreferences &&
          'notificationsEnabled' in userData.notificationPreferences;

        // Prepare update data
        const updateData: any = {};

        // If no token exists or token is different, update it
        if (!currentToken || currentToken !== token.data) {
          updateData.expoPushToken = token.data;
        }

        // If notification preferences don't exist, create them
        if (!hasNotificationPreferences) {
          updateData.notificationPreferences = {
            announcements: true,
            chats: true,
            connections: true,
            events: true,
            notificationsEnabled: true
          };
        }

        // Only update if there are changes to make
        if (Object.keys(updateData).length > 0) {
          await updateDoc(userRef, updateData);
          console.log('Updated user document with:', updateData);
        }
      }
    } catch (error) {
      console.error('Error handling notification token:', error);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (user) {
          // Handle notification token
          await handleNotificationToken(user.uid);
          
          // Fetch user profile data
          const fetchedUserData = await getUser(user.uid);
          if (fetchedUserData) {
            setUserData(fetchedUserData);
            setProfileLoaded(true);
          }
        } else {
          // If no user, we don't need to load profile data
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        // Even if there's an error, we should stop loading
        setProfileLoaded(true);
      } finally {
        // Ensure minimum loading time for smooth transition
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      }
    };

    loadUserData();
  }, [user]);

  // Show loading screen while either auth is loading or we're loading profile data for a logged-in user
  if (isLoading || authLoading || (user && !profileLoaded)) {
    return <LoadingScreen />;
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Redirect href="/login/login" />;
  }

  // If user is logged in and profile is loaded, check if profile is complete
  if (user && userData) {
    const profileComplete = isProfileComplete(userData);
    if (profileComplete) {
      return <Redirect href="/home/dashboard" />;
    } else {
      return <Redirect href="/profileComplete" />;
    }
  }

  // If user is logged in but no userData yet, redirect to dashboard (will be checked there)
  if (user) {
    return <Redirect href="/home/dashboard" />;
  }
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "white",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginVertical: 10,
    width: "80%",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  userEmail: {
    color: "white",
    fontSize: 14,
    marginTop: 20,
    opacity: 0.8,
  },
  logoutButton: {
    backgroundColor: "rgba(255, 69, 58, 0.3)", // Slightly red background for logout
    marginTop: 15,
  }
});