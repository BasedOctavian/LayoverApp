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
  Easing,
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
  
  // New fade animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

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

  // Handle theme toggle with fade effect
  const handleThemeToggle = () => {
    // First fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      // After fade out, change theme and start fade in
      toggleTheme();
      
      // Update animation values for new theme
      backgroundAnim.setValue(theme === "light" ? 1 : 0);
      textAnim.setValue(theme === "light" ? 1 : 0);
      toggleAnimation.setValue(theme === "light" ? 1 : 0);
      
      // Fade back in with a slight delay
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }).start();
      }, 50);
    });
  };

  // Interpolate colors for smooth transitions
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e6e6e6', '#000000'],
    extrapolate: 'clamp'
  });

  const textColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#ffffff'],
    extrapolate: 'clamp'
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme === "light" ? "#e6e6e6" : "#000000" }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <Text style={[styles.loadingText, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
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
    <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
      <LinearGradient 
        colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} 
        style={styles.flex}
      >
        <SafeAreaView style={styles.flex} edges={["bottom"]}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <TopBar />
          {/* Settings Content */}
          <ScrollView contentContainerStyle={styles.settingsContainer}>
            {/* Header with Settings Title */}
            <View style={styles.header}>
              <Animated.Text style={[styles.headerTitle, { color: textColor }]}>
                Settings
              </Animated.Text>
            </View>
            {/* User Information Section */}
            {userData && (
              <TouchableOpacity onPress={() => router.push("profile/" + userId)}>
                <Animated.View style={[styles.userHeader, { 
                  backgroundColor: backgroundColor,
                  borderColor: "#37a4c8"
                }]}>
                  {userData.profilePicture ? (
                    <Image source={{ uri: userData.profilePicture }} style={styles.profilePicture} />
                  ) : (
                    <Ionicons name="person-circle" size={50} color="#37a4c8" />
                  )}
                  <Animated.Text style={[styles.userName, { color: textColor }]}>
                    {userData.name}
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            )}
            {/* Account Section */}
            <View style={styles.settingsSection}>
              <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
                Account
              </Animated.Text>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => router.push("profile/editProfile")}
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="person" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Edit Profile</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => router.push("/settings/updatePassword")}
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="lock-closed" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Change Password</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Privacy Section */}
            <View style={styles.settingsSection}>
              <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
                Privacy
              </Animated.Text>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => router.push("locked/lockedScreen")}
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="eye-off" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Privacy Settings</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Notifications Section */}
            <View style={styles.settingsSection}>
              <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
                Notifications
              </Animated.Text>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => router.push("locked/lockedScreen")}
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="notifications" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Notification Preferences</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* App Settings Section */}
            <View style={styles.settingsSection}>
              <Animated.Text style={[styles.sectionTitle, { color: textColor }]}>
                App Settings
              </Animated.Text>
              {/* Theme Toggle */}
              <TouchableOpacity 
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]} 
                onPress={handleThemeToggle}
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="color-palette" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Theme</Animated.Text>
                  <View style={[styles.toggleContainer, { 
                    backgroundColor: theme === "light" ? "#e6e6e6" : "#000000",
                    borderColor: "#37a4c8"
                  }]}>
                    <Animated.View
                      style={[
                        styles.toggleCircle,
                        { transform: [{ translateX: slideInterpolate }] },
                      ]}
                    />
                    <Animated.Text style={[styles.toggleText, { color: textColor }]}>
                      {theme === "light" ? "Light" : "Dark"}
                    </Animated.Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => router.push("locked/lockedScreen")}
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="language" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Language</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Logout Button */}
            <TouchableOpacity style={[styles.logoutButton, { borderColor: "#37a4c8" }]} onPress={logout}>
              <LinearGradient colors={["#37a4c8", "#37a4c8"]} style={styles.logoutGradient}>
                <Ionicons name="log-out" size={24} color={theme === "light" ? "#000000" : "#ffffff"} />
                <Animated.Text style={[styles.logoutText, { color: textColor }]}>Logout</Animated.Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
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
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
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
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  settingsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingsText: {
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
    justifyContent: "center",
    marginLeft: "auto",
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
  },
  toggleCircle: {
    width: 40,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#37a4c8",
    position: "absolute",
  },
  toggleText: {
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
    borderWidth: 1,
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  logoutText: {
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
