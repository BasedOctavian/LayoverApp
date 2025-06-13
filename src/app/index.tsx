import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import useAuth from "../hooks/auth"; // Import your auth hook
import { useGetProfilePicUrl } from "../hooks/useSupabase";
import LoadingScreen from "../components/LoadingScreen";
import TopBar from "../components/TopBar";
import useUsers from "../hooks/useUsers";

// Preload the logo image
const logoSource = require('../../assets/adaptive-icon.png');
Image.prefetch(Image.resolveAssetSource(logoSource).uri);

// Pre-render the TopBar to ensure it's ready
const PreloadedTopBar = () => {
  return (
    <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
      <TopBar />
    </View>
  );
};

export default function MainScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // Get the authenticated user and loading state
  const { getProfilePicUrl } = useGetProfilePicUrl();
  const { getUser } = useUsers();
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (user) {
          // Fetch user profile data
          const userData = await getUser(user.uid);
          if (userData) {
            setProfileLoaded(true);
          }
        } else {
          // If no user, we don't need to load profile data
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        // Even if there's an error, we should stop loading
        setProfileLoaded(true);
      } finally {
        // Ensure minimum loading time for smooth transition
        setTimeout(() => {
          setIsLoading(false);
        }, 1500);
      }
    };

    loadUserData();
  }, [user]);

  // Show loading screen while either auth is loading or we're loading profile data for a logged-in user
  if (isLoading || authLoading || (user && !profileLoaded)) {
    return <LoadingScreen />;
  }

  // If user is not logged in, redirect to login page
  if (!user) {
    return <Redirect href="/login/login" />;
  }

  // If user is logged in and profile is loaded, redirect to dashboard
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