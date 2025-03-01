import { Stack } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons"; // Import the required icons
import "../../global.css";

export default function RootLayout() {
  return (
    <Stack>
      {/* Main Screen (index) */}
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "black", // Background color of the top bar
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="menu" size={30} color="white" /> {/* Hamburger menu icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "black" }}>
              <AntDesign name="home" size={30} color="white" /> {/* Home icon in the center */}
            </TouchableOpacity>
          ),
        }}
      />

      {/* Home Screen */}
      <Stack.Screen
        name="home"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "black",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="white" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "black" }}>
              <AntDesign name="home" size={30} color="white" /> {/* Calendar icon */}
            </TouchableOpacity>
          ),
        }}
      />

      {/* Search Screen */}
      <Stack.Screen
        name="search"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "black",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="white" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "black" }}>
              <AntDesign name="home" size={30} color="white" /> {/* Calendar icon */}
            </TouchableOpacity>
          ),
        }}
      />

      {/* Event Creation Screen */}
      <Stack.Screen
        name="eventCreation"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "black",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="white" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "black" }}>
              <AntDesign name="home" size={30} color="white" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />

      {/* Event Creation Continued Screen */}
      <Stack.Screen
        name="eventCreationContinued"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "black",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="white" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "black" }}>
              <AntDesign name="home" size={30} color="white" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />

      {/* Profile Screen */}
      <Stack.Screen
        name="profile/[id]"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* User Onboarding */}
      <Stack.Screen
        name="userOnboarding"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Swipe */}
      <Stack.Screen
        name="swipe"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Event Screen */}
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Sport Event Screen */}
      <Stack.Screen
        name="sport/[id]"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Chat explore Screen */}
      <Stack.Screen
        name="chat/chatExplore"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Chat Inbox Screen */}
      <Stack.Screen
        name="chat/chatInbox"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Chat Screen */}
      <Stack.Screen
        name="chat/[id]"
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Dashboard Screen */}
      <Stack.Screen
        name="home/dashboard"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Edit Profile Screen */}
      <Stack.Screen
        name="profile/editProfile"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Login Screen */}
      <Stack.Screen
        name="login/login"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
      {/* Settings Screen */}
      <Stack.Screen
        name="settings/settings"
        options={{
          headerShown: false,
          headerStyle: {
            backgroundColor: "white",
          },
          headerLeft: () => (
            <TouchableOpacity style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={30} color="black" /> {/* Back icon */}
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <TouchableOpacity style={{ alignItems: "center", backgroundColor: "white" }}>
              <AntDesign name="home" size={30} color="black" /> {/* Plus icon */}
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}