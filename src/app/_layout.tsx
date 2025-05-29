import { Stack, usePathname } from "expo-router";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons"; // Import the required icons
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import "../../global.css";
import { ThemeProvider } from "../context/ThemeContext";
import BottomNavBar from "../components/BottomNavBar";

export default function RootLayout() {
  const pathname = usePathname();
  
  // Define routes where bottom nav should be hidden
  const hideBottomNavRoutes = ['/login/login', '/userOnboarding'];
  const shouldShowBottomNav = !hideBottomNavRoutes.includes(pathname) && !pathname.startsWith('/chat/');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <View style={styles.container}>
          <Stack
            screenOptions={{
              animation: "none",
              contentStyle: { backgroundColor: '#070707' },
              headerStyle: { backgroundColor: '#070707' },
              headerTintColor: '#fff'
            }}>
            {/* Main Screen (index) */}
            <Stack.Screen
              name="index"
              options={{
                headerShown: false,
              }}
            />

            {/* Home Screen */}
            <Stack.Screen
              name="home"
              options={{
                headerShown: false,
              }}
            />

            {/* Search Screen */}
            <Stack.Screen
              name="search"
              options={{
                headerShown: false,
              }}
            />

            {/* Event Creation Screen */}
            <Stack.Screen
              name="eventCreation"
              options={{
                headerShown: false,
              }}
            />

            {/* Event Creation Continued Screen */}
            <Stack.Screen
              name="eventCreationContinued"
              options={{
                headerShown: false,
              }}
            />

            {/* Profile Screen */}
            <Stack.Screen
              name="profile/[id]"
              options={{
                headerShown: false,
              }}
            />
            {/* User Onboarding */}
            <Stack.Screen
              name="userOnboarding"
              options={{
                headerShown: false,
              }}
            />
            {/* Swipe */}
            <Stack.Screen
              name="swipe"
              options={{
                headerShown: false,
              }}
            />
            {/* Event Screen */}
            <Stack.Screen
              name="event/[id]"
              options={{
                headerShown: false,
              }}
            />
            {/* Event Chat Screen */}
            <Stack.Screen
              name="event/eventChat/[id]"
              options={{
                headerShown: false,
              }}
            />
            {/* Notifications Screen */}
            <Stack.Screen
              name="notifications/notifications"
              options={{
                headerShown: false,
              }}
            />
            {/* Sport Event Screen */}
            <Stack.Screen
              name="sport/[id]"
              options={{
                headerShown: false,
              }}
            />
            {/* Chat explore Screen */}
            <Stack.Screen
              name="chat/chatExplore"
              options={{
                headerShown: false,
              }}
            />
            {/* Chat Inbox Screen */}
            <Stack.Screen
              name="chat/chatInbox"
              options={{
                headerShown: false,
              }}
            />
            {/* Chat Screen */}
            <Stack.Screen
              name="chat/[id]"
              options={{
                headerShown: false,
              }}
            />
            {/* Dashboard Screen */}
            <Stack.Screen
              name="home/dashboard"
              options={{
                headerShown: false,
              }}
            />
            {/* Edit Profile Screen */}
            <Stack.Screen
              name="profile/editProfile"
              options={{
                headerShown: false,
              }}
            />
            {/* Login Screen */}
            <Stack.Screen
              name="login/login"
              options={{
                headerShown: false,
              }}
            />
            {/* Locked Screen */}
            <Stack.Screen
              name="locked/lockedScreen"
              options={{
                headerShown: false,
              }}
            />
            {/* Settings Screen */}
            <Stack.Screen
              name="settings/settings"
              options={{
                headerShown: false,
              }}
            />
            {/* Update Password Screen */}
            <Stack.Screen
              name="settings/updatePassword"
              options={{
                headerShown: false,
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