import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import useAuth from "../hooks/auth"; // Import your auth hook
import { useGetProfilePicUrl } from "../hooks/useSupabase";
import LoadingScreen from "../components/LoadingScreen";

export default function MainScreen() {
  const router = useRouter();
  const { user, logout } = useAuth(); // Get the authenticated user and logout function
  const { getProfilePicUrl } = useGetProfilePicUrl();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate a minimum loading time to ensure smooth transition
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Redirect href="/login/login" />;
  }

  // If user is logged in, redirect to dashboard
  return <Redirect href="/home/dashboard" />;
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