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
import { Ionicons } from "@expo/vector-icons";
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme === "light" ? "#F8FAFC" : "#1E293B" }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <Text style={[styles.loadingText, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
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
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#E6F0FA", "#F8FAFC"] : ["#1E293B", "#2D3748"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar />
        {/* Settings Content */}
        <ScrollView contentContainerStyle={styles.settingsContainer}>
          {/* Header with Settings Title */}
          <View style={[styles.header, { backgroundColor: theme === "light" ? "#F8FAFC" : "#F8FAFC" }]}>
            <Text style={[styles.headerTitle, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
              Settings
            </Text>
          </View>
          {/* User Information Section */}
          {userData && (
            <TouchableOpacity onPress={() => router.push("profile/" + userId)}>
              <View style={[styles.userHeader, { backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748" }]}>
                {userData.profilePicture ? (
                  <Image source={{ uri: userData.profilePicture }} style={styles.profilePicture} />
                ) : (
                  <Ionicons name="person-circle" size={50} color={theme === "light" ? "#CBD5E1" : "#A0AEC0"} />
                )}
                <Text style={[styles.userName, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
                  {userData.name}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/* Account Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
              Account
            </Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("profile/editProfile")}
            >
              <LinearGradient colors={["#2F80ED", "#1A5FB4"]} style={styles.settingsGradient}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
                <Text style={styles.settingsText}>Edit Profile</Text>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("/settings/updatePassword")}
            >
              <LinearGradient colors={["#2F80ED", "#1A5FB4"]} style={styles.settingsGradient}>
                <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
                <Text style={styles.settingsText}>Change Password</Text>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* Privacy Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
              Privacy
            </Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("locked/lockedScreen")}
            >
              <LinearGradient colors={["#2F80ED", "#1A5FB4"]} style={styles.settingsGradient}>
                <Ionicons name="eye-off" size={24} color="#FFFFFF" />
                <Text style={styles.settingsText}>Privacy Settings</Text>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* Notifications Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
              Notifications
            </Text>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => router.push("locked/lockedScreen")}
            >
              <LinearGradient colors={["#2F80ED", "#1A5FB4"]} style={styles.settingsGradient}>
                <Ionicons name="notifications" size={24} color="#FFFFFF" />
                <Text style={styles.settingsText}>Notification Preferences</Text>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* App Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={[styles.sectionTitle, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
              App Settings
            </Text>
            {/* Theme Toggle */}
            <TouchableOpacity style={styles.settingsItem} onPress={handleThemeToggle}>
              <LinearGradient colors={["#2F80ED", "#1A5FB4"]} style={styles.settingsGradient}>
                <Ionicons name="color-palette" size={24} color="#FFFFFF" />
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
              <LinearGradient colors={["#2F80ED", "#1A5FB4"]} style={styles.settingsGradient}>
                <Ionicons name="language" size={24} color="#FFFFFF" />
                <Text style={styles.settingsText}>Language</Text>
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" style={styles.chevronIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LinearGradient colors={["#FF5A5F", "#C1134E"]} style={styles.logoutGradient}>
              <Ionicons name="log-out" size={24} color="#FFFFFF" />
              <Text style={styles.logoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#E6F0FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  settingsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginBottom: 16,
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
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  settingsItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingsText: {
    color: "#FFFFFF",
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
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    marginLeft: "auto",
    position: "relative",
    overflow: "hidden",
  },
  toggleCircle: {
    width: 40,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2F80ED",
    position: "absolute",
  },
  toggleText: {
    color: "#1E293B",
    fontSize: 12,
    textAlign: "center",
    position: "absolute",
    width: "100%",
    lineHeight: 30,
  },
  logoutButton: {
    marginTop: 24,
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
  },
});

export { Settings };
