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
import LoadingScreen from "../../components/LoadingScreen";
import * as Haptics from 'expo-haptics';

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
    <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
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
                style={[styles.headerTitle, { color: textColor }]}
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
                  backgroundColor: backgroundColor,
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
                  <Animated.Text style={[styles.userName, { color: textColor }]}>
                    {userData.name}
                  </Animated.Text>
                </Animated.View>
              </TouchableOpacity>
            )}
            {/* Account Section */}
            <View style={styles.settingsSection}>
              <Animated.Text 
                style={[styles.sectionTitle, { color: textColor }]}
                accessibilityRole="header"
              >
                Account
              </Animated.Text>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => handleNavigation("profile/editProfile")}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="person" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Edit Profile</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => handleNavigation("/settings/updatePassword")}
                accessibilityRole="button"
                accessibilityLabel="Change password"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="lock-closed" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Change Password</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Notifications Section */}
            <View style={styles.settingsSection}>
              <Animated.Text 
                style={[styles.sectionTitle, { color: textColor }]}
                accessibilityRole="header"
              >
                Notifications
              </Animated.Text>
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => handleNavigation("locked/lockedScreen")}
                accessibilityRole="button"
                accessibilityLabel="Notification preferences"
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
              <Animated.Text 
                style={[styles.sectionTitle, { color: textColor }]}
                accessibilityRole="header"
              >
                App Settings
              </Animated.Text>
              {/* Theme Toggle */}
              <TouchableOpacity 
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]} 
                onPress={handleThemeToggle}
                accessibilityRole="switch"
                accessibilityLabel={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
                accessibilityState={{ checked: theme === "dark" }}
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
              {/* Feedback Button */}
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => handleNavigation("settings/feedback")}
                accessibilityRole="button"
                accessibilityLabel="Send feedback"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>Send Feedback</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
              {/* About Button */}
              <TouchableOpacity
                style={[styles.settingsItem, { borderColor: "#37a4c8" }]}
                onPress={() => handleNavigation("settings/about")}
                accessibilityRole="button"
                accessibilityLabel="About Wingman"
              >
                <Animated.View style={[styles.settingsGradient, { backgroundColor: backgroundColor }]}>
                  <Ionicons name="information-circle" size={24} color="#37a4c8" />
                  <Animated.Text style={[styles.settingsText, { color: textColor }]}>About Wingman</Animated.Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </Animated.View>
              </TouchableOpacity>
            </View>
            {/* Logout Button */}
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: "#37a4c8" }]} 
              onPress={handleLogout}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <LinearGradient colors={["#37a4c8", "#37a4c8"]} style={styles.logoutGradient}>
                <Ionicons name="log-out" size={24} color={theme === "light" ? "#000000" : "#ffffff"} />
                <Animated.Text style={[styles.logoutText, { color: textColor }]}>Logout</Animated.Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Logo and Copyright Section */}
            <View style={styles.footer}>
              <Image
                source={require('../../../assets/adaptive-icon.png')}
                style={[
                  styles.footerLogo,
                  { tintColor: theme === "light" ? "#000000" : "#ffffff" }
                ]}
                resizeMode="contain"
              />
              <Animated.Text style={[styles.copyrightText, { color: textColor }]}>
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
});

export { Settings };
