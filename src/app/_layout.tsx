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
          headerShown: true,
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
          headerShown: true,
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
          headerShown: true,
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
          headerShown: true,
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

      {/* Login Screen */}
      <Stack.Screen
        name="profile"
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
    </Stack>
  );
}