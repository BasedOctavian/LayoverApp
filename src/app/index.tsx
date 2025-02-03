import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router"; // Import Expo Router
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";

export default function MainScreen() {
  const router = useRouter(); // Initialize the router

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Testing Dashboard</Text>

        {/* View Events Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/home")} // Navigate to the "home" screen
        >
          <MaterialIcons name="event" size={24} color="white" />
          <Text style={styles.buttonText}>View Events</Text>
        </TouchableOpacity>

        {/* Create Event Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/eventCreation")} // Navigate to the "eventCreation" screen
        >
          <MaterialIcons name="create" size={24} color="white" />
          <Text style={styles.buttonText}>Create Event</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/LoginScreen")} // Navigate to the "loginScreen" screen
        >
          <MaterialIcons name="login" size={24} color="white" />
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        {/* Profile Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/profile")} // Navigate to the "profile" screen
        >
          <FontAwesome name="user" size={24} color="white" />
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>

        {/* Create User Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/userOnboarding")} // Navigate to the "userOnboarding" screen
        >
          <MaterialIcons name="person-add" size={24} color="white" />
          <Text style={styles.buttonText}>Create User</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
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
});