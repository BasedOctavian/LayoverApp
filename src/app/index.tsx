import React, { useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import useAuth from "../hooks/auth"; // Import your auth hook
import { useGetProfilePicUrl } from "../hooks/useSupabase";

export default function MainScreen() {
  const router = useRouter();
  const { user, logout } = useAuth(); // Get the authenticated user and logout function
  const { getProfilePicUrl } = useGetProfilePicUrl();

 

  useEffect(() => {

    console.log("User:", user);
    if (user) {
      const imageUrl = getProfilePicUrl(user.uid);
      console.log(imageUrl);
    }
  }, [user]);

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <View style={styles.container}>
        <Text style={styles.title}>Testing Dashboard</Text>

        {/* View Events Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/home")}
        >
          <MaterialIcons name="event" size={24} color="white" />
          <Text style={styles.buttonText}>View Events</Text>
        </TouchableOpacity>

        {/* Create Event Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/eventCreation")}
        >
          <MaterialIcons name="create" size={24} color="white" />
          <Text style={styles.buttonText}>Create Event</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("login/login")}
        >
          <MaterialIcons name="login" size={24} color="white" />
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        {/* Profile Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/profile/" + user?.uid)}
        >
          <FontAwesome name="user" size={24} color="white" />
          <Text style={styles.buttonText}>Profile</Text>
        </TouchableOpacity>

        {/* Swipe Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/swipe")}
        >
          <FontAwesome name="user" size={24} color="white" />
          <Text style={styles.buttonText}>User Swipe</Text>
        </TouchableOpacity>

        {/* Chat Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("chat/chatInbox")}
        >
          <FontAwesome name="comments" size={24} color="white" />
          <Text style={styles.buttonText}>Chat</Text>
        </TouchableOpacity>

        {/* Create User Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/userOnboarding")}
        >
          <MaterialIcons name="person-add" size={24} color="white" />
          <Text style={styles.buttonText}>Create User</Text>
        </TouchableOpacity>

        {/* Dashboard Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("home/dashboard")}
        >
          <MaterialIcons name="home" size={24} color="white" />
          <Text style={styles.buttonText}>Dashboard</Text>
        </TouchableOpacity>

        {/* Display authenticated user's email */}
        {user?.email && (
          <>
            <Text style={styles.userEmail}>
              Logged in as: {user.email}
            </Text>
            
            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={logout}
            >
              <MaterialIcons name="logout" size={24} color="white" />
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
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