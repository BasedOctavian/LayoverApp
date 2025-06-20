import { Stack, usePathname } from "expo-router";
import { TouchableOpacity, View, StyleSheet, StatusBar } from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons"; // Import the required icons
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../../global.css";
import { ThemeProvider } from "../context/ThemeContext";
import BottomNavBar from "../components/BottomNavBar";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

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
  const hideBottomNavRoutes = ['/login/login', '/userOnboarding'];
  const shouldShowBottomNav = !hideBottomNavRoutes.includes(pathname) && 
    !pathname.startsWith('/chat/') && 
    !pathname.startsWith('/event/eventChat/') && 
    !pathname.includes('loading') ||
    pathname === '/chat/chatInbox';

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

      {/* Home Screen */}
      <Stack.Screen
        name="home"
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
    </Stack>
  );
};

export default function RootLayout() {
  const pathname = usePathname();
  
  // Define routes where bottom nav should be hidden
  const hideBottomNavRoutes = ['/login/login', '/userOnboarding'];
  const shouldShowBottomNav = !hideBottomNavRoutes.includes(pathname) && 
    !pathname.startsWith('/chat/') && 
    !pathname.startsWith('/event/eventChat/') && 
    !pathname.includes('loading') ||
    pathname === '/chat/chatInbox';

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <ThemeAwareStatusBar />
          <View style={styles.container}>
            <ThemeAwareStack />
            {shouldShowBottomNav && <BottomNavBar />}
          </View>
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