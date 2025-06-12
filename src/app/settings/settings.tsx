import React, { useEffect, useState, useRef, useCallback } from "react";
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
  RefreshControl,
  Platform,
  AccessibilityInfo,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";
import { onAuthStateChanged, User, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import * as Haptics from 'expo-haptics';
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";

export default function Settings() {
  const { user, logout } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const { getUser } = useUsers();
  const [userData, setUserData] = useState<any>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Access ThemeContext
  const { theme, toggleTheme } = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  
  // Animation for theme toggle
  const [toggleAnimation] = useState(new Animated.Value(theme === "light" ? 0 : 1));
  
  // New fade animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      if (user) {
        const data = await getUser(user.uid);
        setUserData(data);
        setError(null);
      }
    } catch (err) {
      setError("Failed to load user data. Please try again.");
      console.error("Error fetching user data:", err);
    } finally {
      setInitialLoadComplete(true);
      setRefreshing(false);
    }
  }, [user, getUser]);

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
    }
  }, [user]);

  // Fetch user data when user is available
  useEffect(() => {
    fetchUserData();
  }, [user, fetchUserData]);

  // Animate toggle when theme changes
  useEffect(() => {
    Animated.timing(toggleAnimation, {
      toValue: theme === "light" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [theme]);

  // Handle fade in animation when content is ready
  useEffect(() => {
    if (!loading && initialLoadComplete) {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);
    }
  }, [loading, initialLoadComplete]);

  // Handle theme toggle with fade effect and haptic feedback
  const handleThemeToggle = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsThemeChanging(true);
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
        }).start(() => {
          setIsThemeChanging(false);
        });
      }, 50);
    });
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [fetchUserData]);

  // Handle navigation with haptic feedback
  const handleNavigation = (route: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(route);
  };

  // Handle logout with haptic feedback
  const handleLogout = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await logout();
  };

  // Handle account deletion with confirmation and re-authentication
  const handleDeleteAccount = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!authUser || !authUser.email) {
                throw new Error("No authenticated user found");
              }

              // Prompt for password
              Alert.prompt(
                "Confirm Password",
                "Please enter your password to confirm account deletion",
                [
                  {
                    text: "Cancel",
                    style: "cancel"
                  },
                  {
                    text: "Confirm",
                    onPress: async (password) => {
                      if (!password) {
                        Alert.alert("Error", "Password is required");
                        return;
                      }

                      try {
                        // Re-authenticate user
                        const credential = EmailAuthProvider.credential(
                          authUser.email,
                          password
                        );
                        await reauthenticateWithCredential(authUser, credential);

                        // Delete user document from Firestore
                        const userDocRef = doc(db, "users", authUser.uid);
                        await deleteDoc(userDocRef);

                        // Delete Firebase Auth user
                        await deleteUser(authUser);

                        // Logout and redirect to login
                        await logout();
                        router.replace("login/login");
                      } catch (error: any) {
                        console.error("Error during deletion:", error);
                        if (error.code === 'auth/wrong-password') {
                          Alert.alert("Error", "Incorrect password. Please try again.");
                        } else {
                          Alert.alert(
                            "Error",
                            "Failed to delete account. Please try again later."
                          );
                        }
                      }
                    }
                  }
                ],
                "secure-text"
              );
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error",
                "Failed to delete account. Please try again later."
              );
            }
          }
        }
      ]
    );
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

  // Show black screen during auth check
  if (!userId) {
    return <View style={{ flex: 1, backgroundColor: theme === "light" ? "#e6e6e6" : "#000000" }} />;
  }

  // Show loading screen during initial load or theme change
  if (loading || !initialLoadComplete || isThemeChanging) {
    return <LoadingScreen message={isThemeChanging ? "Updating theme..." : "Loading settings..."} />;
  }

  // Interpolate animation for sliding effect
  const slideInterpolate = toggleAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar onProfilePress={() => handleNavigation("profile/" + userId)} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          {/* Settings Content */}
          <ScrollView 
            contentContainerStyle={styles.settingsContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme === "light" ? "#000000" : "#ffffff"}
                colors={["#37a4c8"]}
              />
            }
          >
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: theme === "light" ? "#ffebee" : "#1a1a1a" }]}>
                <Ionicons name="alert-circle" size={24} color="#ff5252" />
                <Text style={[styles.errorText, { color: "#ff5252" }]}>{error}</Text>
              </View>
            )}
            {/* Header with Settings Title */}
            <View style={styles.header}>
              <Animated.Text 
                style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Settings
              </Animated.Text>
            </View>
            {/* User Information Section */}
            {userData && (
              <TouchableOpacity 
                onPress={() => handleNavigation("profile/" + userId)}
                accessibilityRole="button"
                accessibilityLabel={`View profile of ${userData.name}`}
              >
                <Animated.View style={[styles.userHeader, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}>
                  {userData.profilePicture ? (
                    <Image 
                      source={{ uri: userData.profilePicture }} 
                      style={styles.profilePicture}
                      accessibilityLabel={`Profile picture of ${userData.name}`}
                    />
                  ) : (
                    <Ionicons name="person-circle" size={50} color="#37a4c8" />
                  )}
                  <Animated.Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {userData.name}
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            )}
            {/* Account Section */}
            <View style={styles.settingsSection}>
              <Animated.Text 
                style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Account
              </Animated.Text>
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("profile/editProfile")}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="person" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Edit Profile</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("/settings/updatePassword")}
                accessibilityRole="button"
                accessibilityLabel="Change password"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="lock-closed" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Change Password</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("/settings/blockedUsers")}
                accessibilityRole="button"
                accessibilityLabel="Manage blocked users"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="person-remove" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Blocked Users</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Notifications Section */}
            <View style={styles.settingsSection}>
              <Animated.Text 
                style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Notifications
              </Animated.Text>
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("locked/lockedScreen")}
                accessibilityRole="button"
                accessibilityLabel="Notification preferences coming soon"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="notifications" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Notification Preferences</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* App Settings Section */}
            <View style={styles.settingsSection}>
              <Animated.Text 
                style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                App Settings
              </Animated.Text>
              {/* Theme Toggle */}
              <TouchableOpacity 
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]} 
                onPress={handleThemeToggle}
                accessibilityRole="switch"
                accessibilityLabel={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
                accessibilityState={{ checked: theme === "dark" }}
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="color-palette" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Theme</Animated.Text>
                  <View style={[styles.toggleContainer, { 
                    backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                    borderColor: "#37a4c8"
                  }]}>
                    <Animated.View
                      style={[
                        styles.toggleCircle,
                        { transform: [{ translateX: slideInterpolate }] },
                      ]}
                    />
                    <Animated.Text style={[styles.toggleText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {theme === "light" ? "Light" : "Dark"}
                    </Animated.Text>
                  </View>
                </Animated.View>
              </TouchableOpacity>
              {/* Feedback Button */}
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("settings/feedback")}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Send Feedback</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
              {/* About Button */}
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("settings/about")}
                accessibilityRole="button"
                accessibilityLabel="About Wingman"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="information-circle" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>About Wingman</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
              {/* TOS/EULA Button */}
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("settings/tos")}
                accessibilityRole="button"
                accessibilityLabel="Terms of Service and EULA"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="document-text" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Terms of Service & EULA</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Delete Account Button */}
            <TouchableOpacity 
              style={[styles.deleteButton, { borderColor: "#ff4444" }]} 
              onPress={handleDeleteAccount}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
            >
              <LinearGradient colors={["#ff4444", "#ff0000"]} style={styles.deleteGradient}>
                <Ionicons name="trash" size={24} color="#ffffff" />
                <Text style={styles.deleteText}>Delete Account</Text>
              </LinearGradient>
            </TouchableOpacity>
            {/* Logout Button */}
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: "#37a4c8" }]} 
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <LinearGradient colors={["#37a4c8", "#37a4c8"]} style={styles.logoutGradient}>
                <Ionicons name="log-out" size={24} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                <Animated.Text style={[styles.logoutText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Logout</Animated.Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Logo and Copyright Section */}
            <View style={styles.footer}>
              <Image
                source={require('../../../assets/adaptive-icon.png')}
                style={[
                  styles.footerLogo,
                  { tintColor: theme === "light" ? "#0F172A" : "#e4fbfe" }
                ]}
                resizeMode="contain"
              />
              <Animated.Text style={[styles.copyrightText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                © 2025 Wingman. All rights reserved.
              </Animated.Text>
            </View>
          </ScrollView>
        </Animated.View>
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
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
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
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ff5252",
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  footerLogo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 14,
    opacity: 0.7,
  },
  deleteButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  deleteGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  deleteText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "600",
    color: "#ffffff",
  },
});

export { Settings };
