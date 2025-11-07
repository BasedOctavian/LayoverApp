import { Stack, usePathname } from "expo-router";
import { TouchableOpacity, View, StyleSheet, StatusBar } from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons"; // Import the required icons
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../../global.css";
import { ThemeProvider } from "../context/ThemeContext";
import BottomNavBar from "../components/BottomNavBar";
import React, { useContext, useEffect, useCallback } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { initializeExternalRoutes } from "../utils/externalRoutes";
import * as SplashScreen from 'expo-splash-screen';

// Prevent the splash screen from auto-hiding.
SplashScreen.preventAutoHideAsync();

// Create a wrapper component that uses ThemeContext
const ThemeAwareStatusBar = () => {
  const { theme } = useContext(ThemeContext);
  const pathname = usePathname();
  
  // Force light-content (white) status bar for userOnboarding
  const isUserOnboarding = pathname === '/userOnboarding';
  
  return (
    <StatusBar
      barStyle={isUserOnboarding ? "light-content" : theme === "light" ? "dark-content" : "light-content"}
      backgroundColor="transparent"
      translucent
    />
  );
};

// Create a wrapper component for Stack screenOptions
const ThemeAwareStack = () => {
  const { theme } = useContext(ThemeContext);
  const pathname = usePathname();
  
  // Define routes where bottom nav should be hidden
  const hideBottomNavRoutes = ['/login/login', '/userOnboarding', '/profileComplete'];
  // Check if it's an individual chat conversation (not chatInbox or chatExplore)
  const isIndividualChat = pathname.startsWith('/chat/') && 
    pathname !== '/chat/chatInbox' && 
    pathname !== '/chat/chatExplore';
  
  const shouldShowBottomNav = !hideBottomNavRoutes.includes(pathname) && 
    !isIndividualChat && // Hide for individual chat conversations
    !pathname.startsWith('/event/eventChat/') && 
    !pathname.startsWith('/ping/pingChat/') &&
    !pathname.startsWith('/group/chat/') && // Hide for group chat
    !pathname.includes('loading');

  return (
    <Stack
      screenOptions={{
        animation: "fade",
        animationDuration: 200,
        contentStyle: { backgroundColor: theme === "light" ? '#ffffff' : '#070707' },
        headerStyle: { backgroundColor: theme === "light" ? '#ffffff' : '#070707' },
        headerTintColor: theme === "light" ? '#000000' : '#ffffff',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
        animationTypeForReplace: 'push',
        presentation: 'card',
        freezeOnBlur: true,
      }}>
      {/* Main Screen (index) */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />

      {/* Explore Screen */}
      <Stack.Screen
        name="explore"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />

      {/* Search Screen */}
      <Stack.Screen
        name="search"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />

      {/* Event Creation Screen */}
      <Stack.Screen
        name="eventCreation"
        options={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
        }}
      />

      {/* Event Creation Continued Screen */}
      <Stack.Screen
        name="eventCreationContinued"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />

      {/* Profile Screen */}
      <Stack.Screen
        name="profile/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* User Onboarding */}
      <Stack.Screen
        name="userOnboarding"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Profile Complete Screen */}
      <Stack.Screen
        name="profileComplete"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Swipe */}
      <Stack.Screen
        name="swipe"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Event Screen */}
      <Stack.Screen
        name="eventScreen"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Event Screen */}
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Event Chat Screen */}
      <Stack.Screen
        name="event/eventChat/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Notifications Screen */}
      <Stack.Screen
        name="notifications/notifications"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />

      {/* Sport Event Screen */}
      <Stack.Screen
        name="sport/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Chat explore Screen */}
      <Stack.Screen
        name="chat/chatExplore"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Chat Inbox Screen */}
      <Stack.Screen
        name="chat/chatInbox"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Chat Screen */}
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Dashboard Screen */}
      <Stack.Screen
        name="home/dashboard"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Edit Profile Screen */}
      <Stack.Screen
        name="profile/editProfile"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Login Screen */}
      <Stack.Screen
        name="login/login"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Locked Screen */}
      <Stack.Screen
        name="locked/lockedScreen"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Settings Screen */}
      <Stack.Screen
        name="settings/settings"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Notification Preferences Screen */}
      <Stack.Screen
        name="settings/notificationPreferences"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Feedback Screen */}
      <Stack.Screen
        name="settings/feedback"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* About Screen */}
      <Stack.Screen
        name="settings/about"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* TOS Screen */}
      <Stack.Screen
        name="settings/tos"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Update Password Screen */}
      <Stack.Screen
        name="settings/updatePassword"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Blocked Users Screen */}
      <Stack.Screen
        name="settings/blockedUsers"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Admin Tools Screen */}
      <Stack.Screen
        name="settings/adminTools"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="settings/settingsTest"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="sandbox"
        options={{
          headerShown: false,
        }}
      />
      {/* Ping Event Screen */}
      <Stack.Screen
        name="ping/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Ping Chat Screen */}
      <Stack.Screen
        name="ping/pingChat/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      {/* Groups Screens */}
      <Stack.Screen
        name="group/index"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/explore"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/chat/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/create"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/post/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/proposal/[id]"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/proposal/create"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="group/post/create"
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
    </Stack>
  );
};

function AppContent() {
  const { theme } = useContext(ThemeContext);

  const onLayoutRootView = useCallback(async () => {
    if (theme) {
      // This will hide the splash screen once the theme is loaded
      await SplashScreen.hideAsync();
    }
  }, [theme]);

  if (!theme) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeAwareStatusBar />
      <MainLayout />
    </View>
  );
}

function MainLayout() {
  const pathname = usePathname();
  
  // Define routes where bottom nav should be hidden
  const hideBottomNavRoutes = ['/login/login', '/userOnboarding', '/profileComplete'];
  // Check if it's an individual chat conversation (not chatInbox or chatExplore)
  const isIndividualChat = pathname.startsWith('/chat/') && 
    pathname !== '/chat/chatInbox' && 
    pathname !== '/chat/chatExplore';
  
  // Hide bottom nav for settings sub-routes (but not the main settings page)
  const isSettingsSubRoute = pathname.startsWith('/settings/') && pathname !== '/settings/settings';
  const isProfileEditRoute = pathname.startsWith('/profile/editProfile');
  
  const shouldShowBottomNav = !hideBottomNavRoutes.includes(pathname) && 
    !isIndividualChat && // Hide for individual chat conversations
    !pathname.startsWith('/event/eventChat/') && 
    !pathname.startsWith('/ping/pingChat/') &&
    !pathname.startsWith('/group/chat/') && // Hide for group chat
    !pathname.startsWith('/group/post/') && // Hide for group post detail
    !pathname.startsWith('/group/proposal/') && // Hide for group proposal detail
    !isSettingsSubRoute && // Hide for settings sub-routes
    !isProfileEditRoute && // Hide for profile edit route
    !pathname.includes('loading');

  // Initialize external routes handler
  useEffect(() => {
    const initExternalRoutes = async () => {
      try {
        // Add a small delay to ensure app is loaded
        setTimeout(async () => {
          await initializeExternalRoutes();
        }, 500);
      } catch (error) {
        console.error('Failed to initialize external routes:', error);
      }
    };

    initExternalRoutes();
  }, []);

  return (
    <View style={styles.container}>
      <ThemeAwareStack />
      {shouldShowBottomNav && <BottomNavBar />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});