import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";

export default function Settings() {
  const { user, logout } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const { getUser } = useUsers();
  const [userData, setUserData] = useState<any>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Access ThemeContext
  const { theme, toggleTheme } = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  
  // Animation for theme toggle
  const [toggleAnimation] = useState(new Animated.Value(theme === "light" ? 0 : 1));

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Set userId when user is available
  useEffect(() => {
    if (user) {
      setUserId(user.uid);
      console.log("User ID:", user.uid);
    }
  }, [user]);

  // Fetch user data when user is available
  useEffect(() => {
    if (user) {
      getUser(user.uid).then((data) => setUserData(data));
    }
  }, [user]);

  // Animate toggle when theme changes
  useEffect(() => {
    Animated.timing(toggleAnimation, {
      toValue: theme === "light" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [theme]);

  // Handle theme toggle
  const handleThemeToggle = () => {
    toggleTheme();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#000000" }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Text style={[styles.loadingText, { color: "#e4fbfe" }]}>
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  // Interpolate animation for sliding effect
  const slideInterpolate = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <TopBar />
        {/* Settings Content */}
        <ScrollView contentContainerStyle={styles.settingsContainer}>
          {/* Header with Settings Title */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Settings
            </Text>
          </View>
          {/* User Information Section */}
          {userData && (
            <TouchableOpacity onPress={() => router.push("profile/" + userId)}>
              <View style={styles.userHeader}>
                {userData.profilePicture ? (
                  <Image source={{ uri: userData.profilePicture }} style={styles.profilePicture} />
                ) : (
                  <Ionicons name="person-circle" size={50} color="#38a5c9" />
                )}
                <Text style={styles.userName}>
                  {userData.name}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/* Account Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>
              Account
            </Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("profile/editProfile")}
            >
              <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.settingsGradient}>
                <Ionicons name="person" size={24} color="#38a5c9" />
                <Text style={styles.settingsText}>Edit Profile</Text>
                <Feather name="chevron-right" size={24} color="#38a5c9" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/settings/updatePassword")}
            >
              <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.settingsGradient}>
                <Ionicons name="lock-closed" size={24} color="#38a5c9" />
                <Text style={styles.settingsText}>Change Password</Text>
                <Feather name="chevron-right" size={24} color="#38a5c9" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* Privacy Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>
              Privacy
            </Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("locked/lockedScreen")}
            >
              <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.settingsGradient}>
                <Ionicons name="eye-off" size={24} color="#38a5c9" />
                <Text style={styles.settingsText}>Privacy Settings</Text>
                <Feather name="chevron-right" size={24} color="#38a5c9" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* Notifications Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>
              Notifications
            </Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("locked/lockedScreen")}
            >
              <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.settingsGradient}>
                <Ionicons name="notifications" size={24} color="#38a5c9" />
                <Text style={styles.settingsText}>Notification Preferences</Text>
                <Feather name="chevron-right" size={24} color="#38a5c9" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* App Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>
              App Settings
            </Text>
            {/* Theme Toggle */}
            <TouchableOpacity style={styles.settingsItem} onPress={handleThemeToggle}>
              <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.settingsGradient}>
                <Ionicons name="color-palette" size={24} color="#38a5c9" />
                <Text style={styles.settingsText}>Theme</Text>
                <View style={styles.toggleContainer}>
                  <Animated.View
                    style={[
                      styles.toggleCircle,
                      { transform: [{ translateX: slideInterpolate }] },
                    ]}
                  />
                  <Text style={styles.toggleText}>
                    {theme === "light" ? "Light" : "Dark"}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("locked/lockedScreen")}
            >
              <LinearGradient colors={["#1a1a1a", "#1a1a1a"]} style={styles.settingsGradient}>
                <Ionicons name="language" size={24} color="#38a5c9" />
                <Text style={styles.settingsText}>Language</Text>
                <Feather name="chevron-right" size={24} color="#38a5c9" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LinearGradient colors={["#38a5c9", "#38a5c9"]} style={styles.logoutGradient}>
              <Ionicons name="log-out" size={24} color="#000000" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  settingsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#e4fbfe",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#e4fbfe",
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#e4fbfe",
  },
  settingsItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  settingsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingsText: {
    color: "#e4fbfe",
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  chevronIcon: {
    marginLeft: "auto",
  },
  toggleContainer: {
    width: 80,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#000000",
    justifyContent: "center",
    marginLeft: "auto",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  toggleCircle: {
    width: 40,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#38a5c9",
    position: "absolute",
  },
  toggleText: {
    color: "#e4fbfe",
    fontSize: 12,
    textAlign: "center",
    position: "absolute",
    width: "100%",
    lineHeight: 30,
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  logoutText: {
    color: "#000000",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
  },
});

export { Settings };
