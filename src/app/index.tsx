import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router"; // Import Expo Router

export default function MainScreen() {
  const router = useRouter(); // Initialize the router

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Testing Dashboard</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/home")} // Navigate to the "home" screen
      >
        <Text style={styles.buttonText}>View Events</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/eventCreation")} // Navigate to the "eventCreation" screen
      >
        <Text style={styles.buttonText}>Create Event</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/LoginScreen")} // Navigate to the "loginScreen" screen
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/profile")} // Navigate to the "loginScreen" screen
      >
        <Text style={styles.buttonText}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "white",
  },
  button: {
    backgroundColor: "#1E90FF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
