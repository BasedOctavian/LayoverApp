import { Stack, usePathname } from "expo-router";
import { TouchableOpacity, View, StyleSheet, StatusBar } from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons"; // Import the required icons
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "../../global.css";
import { ThemeProvider } from "../context/ThemeContext";
import BottomNavBar from "../components/BottomNavBar";
import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

// Create a wrapper component that uses ThemeContext
const ThemeAwareStatusBar = () => {
  const { theme } = useContext(ThemeContext);
  return (
    <StatusBar
      barStyle={theme === "light" ? "dark-content" : "light-content"}
      backgroundColor="transparent"
      translucent
    />
  );
};

export default function RootLayout() {
  const pathname = usePathname();
  
  // Define routes where bottom nav should be hidden
  const hideBottomNavRoutes = ['/login/login', '/userOnboarding'];
  const shouldShowBottomNav = !hideBottomNavRoutes.includes(pathname) && !pathname.startsWith('/chat/');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ThemeAwareStatusBar />
        <View style={styles.container}>
          <Stack
            screenOptions={{
              animation: "fade",
              animationDuration: 200,
              contentStyle: { backgroundColor: '#070707' },
              headerStyle: { backgroundColor: '#070707' },
              headerTintColor: '#fff',
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
                animation: 'slide_from_right',
              }}
            />

            {/* Search Screen */}
            <Stack.Screen
              name="search"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />

            {/* Event Creation Screen */}
            <Stack.Screen
              name="eventCreation"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />

            {/* Event Creation Continued Screen */}
            <Stack.Screen
              name="eventCreationContinued"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />

            {/* Profile Screen */}
            <Stack.Screen
              name="profile/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
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
                animation: 'slide_from_right',
              }}
            />
            {/* Event Screen */}
            <Stack.Screen
              name="event/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Event Chat Screen */}
            <Stack.Screen
              name="event/eventChat/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Notifications Screen */}
            <Stack.Screen
              name="notifications/notifications"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Sport Event Screen */}
            <Stack.Screen
              name="sport/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Chat explore Screen */}
            <Stack.Screen
              name="chat/chatExplore"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Chat Inbox Screen */}
            <Stack.Screen
              name="chat/chatInbox"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Chat Screen */}
            <Stack.Screen
              name="chat/[id]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Dashboard Screen */}
            <Stack.Screen
              name="home/dashboard"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Edit Profile Screen */}
            <Stack.Screen
              name="profile/editProfile"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
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
                animation: 'slide_from_right',
              }}
            />
            {/* Settings Screen */}
            <Stack.Screen
              name="settings/settings"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            {/* Update Password Screen */}
            <Stack.Screen
              name="settings/updatePassword"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
          </Stack>
          {shouldShowBottomNav && <BottomNavBar />}
        </View>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070707',
  },
});