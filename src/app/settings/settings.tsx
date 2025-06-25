import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  StatusBar,
  RefreshControl,
  Platform,
  Alert,
  Animated,
  Easing,
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
import * as Haptics from 'expo-haptics';
import { doc, deleteDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import * as LocalAuthentication from 'expo-local-authentication';
import useNotificationCount from "../../hooks/useNotificationCount";
import UserAvatar from "../../components/UserAvatar";

export default function Settings() {
  const { user, logout } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const { getUser } = useUsers();
  const [userData, setUserData] = useState<any>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfilePictureLoading, setIsProfilePictureLoading] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profilePictureOpacity = useRef(new Animated.Value(0)).current;
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const loadingLineOpacity = useRef(new Animated.Value(0)).current;
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // Access ThemeContext
  const { theme, toggleTheme } = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  // Get notification count
  const notificationCount = useNotificationCount(userId);

  // Animation values
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in animation for profile picture
  const fadeInProfilePicture = () => {
    Animated.timing(profilePictureOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  };

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
      setIsLoading(false);
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

  // Add effect for bounce animation when loading completes
  useEffect(() => {
    if (!isLoading && initialLoadComplete) {
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }
  }, [isLoading, initialLoadComplete]);

  // Set initial load complete after data is fetched
  useEffect(() => {
    if (!isLoading && userData) {
      setInitialLoadComplete(true);
    }
  }, [isLoading, userData]);

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
                        if (!authUser.email) {
                          throw new Error("User email is required for re-authentication");
                        }
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

  // Add loading progress animation
  useEffect(() => {
    if (isLoading || !userData) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingProgress, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(loadingProgress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      loadingProgress.setValue(0);
    }
  }, [isLoading, userData]);

  // Check if biometric authentication is available
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      console.log('Biometric check:', { compatible, enrolled });
      setIsBiometricAvailable(compatible && enrolled);
    };
    checkBiometricAvailability();
  }, []);

  // Handle admin tools navigation with biometric authentication
  const handleAdminToolsNavigation = async () => {
    console.log('Admin tools navigation attempted, biometric available:', isBiometricAvailable);
    if (!isBiometricAvailable) {
      Alert.alert(
        "Biometric Authentication Not Available",
        "Please set up Face ID/Touch ID in your device settings to access admin tools.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      console.log('Attempting biometric authentication...');
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Admin Tools',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      console.log('Biometric authentication result:', result);

      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        handleNavigation("settings/adminTools");
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert(
          "Authentication Failed",
          "You must authenticate to access admin tools.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      Alert.alert(
        "Authentication Error",
        "An error occurred during authentication. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Handle update user document
  const handleUpdateUserDoc = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      if (!authUser) {
        Alert.alert("Error", "No authenticated user found");
        return;
      }

      // Get all users except the authUser
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      
      const updatePromises = usersSnapshot.docs
        .filter(doc => doc.id !== 'hDn74gYZCdZu0efr3jMGTIWGrRQ2') // Exclude authUser
        .map(async (userDoc) => {
          const userDocRef = doc(db, "users", userDoc.id);
          
          const updateData = {
            currentCity: null,
            connectionIntents: [],
            personalTags: [],
            availableNow: false,
            availabilitySchedule: {
              monday: { start: "00:00", end: "00:00" },
              tuesday: { start: "00:00", end: "00:00" },
              wednesday: { start: "00:00", end: "00:00" },
              thursday: { start: "00:00", end: "00:00" },
              friday: { start: "00:00", end: "00:00" },
              saturday: { start: "00:00", end: "00:00" },
              sunday: { start: "00:00", end: "00:00" }
            },
            groupAffiliations: [],
            lastKnownCoordinates: null,
            preferredMeetupRadius: null,
            linkRatingScore: {
              average: 0,
              count: 0
            },
            reputationTags: [],
            eventPreferences: {
              prefersSmallGroups: null,
              likesBars: null
            }
          };

          return updateDoc(userDocRef, updateData);
        });

      await Promise.all(updatePromises);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        "Success", 
        `Updated ${updatePromises.length} user documents with default values!`,
        [{ text: "OK" }]
      );
      
      // Refresh user data
      fetchUserData();
      
    } catch (error) {
      console.error("Error updating user documents:", error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert(
        "Error",
        "Failed to update user documents. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Show black screen during auth check
  if (!userId) {
    return <View style={{ flex: 1, backgroundColor: theme === "light" ? "#e6e6e6" : "#000000" }} />;
  }

  // Show loading screen during initial load
  if (isLoading || !initialLoadComplete) {
    return (
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }} />
    );
  }

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar onProfilePress={() => handleNavigation("profile/" + userId)} notificationCount={notificationCount} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <Animated.View 
          style={{ 
            flex: 1,
            opacity: contentBounceAnim,
            transform: [
              { scale: contentScaleAnim },
              {
                translateY: contentBounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }
            ]
          }}
        >
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
              <Text 
                style={[styles.headerTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Settings
              </Text>
            </View>
            {/* User Information Section */}
            <TouchableOpacity 
              onPress={() => userData && handleNavigation("profile/" + userId)}
              accessibilityRole="button"
              accessibilityLabel={userData ? `View profile of ${userData.name}` : "Loading profile"}
            >
              <View style={[styles.userHeader, { 
                backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                borderColor: "#37a4c8"
              }]}>
                <View style={styles.profilePictureContainer}>
                  <UserAvatar
                    user={userData || { name: 'User', profilePicture: null }}
                    size={50}
                    style={styles.profilePicture}
                  />
                  {isProfilePictureLoading && (
                    <View style={[styles.profilePictureLoading, { backgroundColor: theme === "light" ? "#f8f9fa" : "#1a1a1a" }]} />
                  )}
                </View>
                <View style={styles.userNameContainer}>
                  {userData ? (
                    <Text style={[styles.userName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {userData.name}
                    </Text>
                  ) : (
                    <View style={[styles.userNamePlaceholder, { backgroundColor: theme === "light" ? "#e6e6e6" : "#2a2a2a" }]} />
                  )}
                  <Animated.View 
                    style={[
                      styles.loadingLine,
                      {
                        backgroundColor: theme === "light" ? "#37a4c8" : "#4db8d4",
                        transform: [{
                          translateX: loadingProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-100, 100]
                          })
                        }]
                      }
                    ]}
                  />
                </View>
              </View>
            </TouchableOpacity>
            {/* Account Section */}
            <View style={styles.settingsSection}>
              <Text 
                style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Account
              </Text>
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("profile/editProfile")}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="person" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Edit Profile</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
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
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="lock-closed" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Change Password</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
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
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="person-remove" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Blocked Users</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
              </TouchableOpacity>
            </View>
            {/* Notifications Section */}
            <View style={styles.settingsSection}>
              <Text 
                style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                Notifications
              </Text>
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={() => handleNavigation("settings/notificationPreferences")}
                accessibilityRole="button"
                accessibilityLabel="Notification preferences"
              >
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="notifications" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Notification Preferences</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
              </TouchableOpacity>
            </View>
            {/* App Settings Section */}
            <View style={styles.settingsSection}>
              <Text 
                style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                accessibilityRole="header"
              >
                App Settings
              </Text>
              {/* Theme Toggle */}
              <TouchableOpacity 
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]} 
                onPress={toggleTheme}
                accessibilityRole="switch"
                accessibilityLabel={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
                accessibilityState={{ checked: theme === "dark" }}
              >
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="color-palette" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Theme</Text>
                  <View style={[styles.toggleContainer, { 
                    backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                    borderColor: "#37a4c8"
                  }]}>
                    <View
                      style={[
                        styles.toggleCircle,
                        { transform: [{ translateX: theme === "light" ? 0 : 40 }] },
                      ]}
                    />
                    <Text style={[styles.toggleText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {theme === "light" ? "Light" : "Dark"}
                    </Text>
                  </View>
                </View>
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
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Send Feedback</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
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
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="information-circle" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>About Wingman</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
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
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="document-text" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Terms of Service & EULA</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
              </TouchableOpacity>
              {/* Update User Doc Button */}
              <TouchableOpacity
                style={[styles.settingsItem, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                }]}
                onPress={handleUpdateUserDoc}
                accessibilityRole="button"
                accessibilityLabel="Update user document with default values"
              >
                <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                  <Ionicons name="refresh" size={24} color="#37a4c8" />
                  <Text style={[styles.settingsText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Update User Doc</Text>
                  <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Admin Tools Section - Only visible to admin users */}
            {(authUser?.uid === 'hDn74gYZCdZu0efr3jMGTIWGrRQ2' || authUser?.uid === 'WhNhj8WPUpbomevJQ7j69rnLbDp2') && (
              <View style={styles.adminSection}>
                <Text 
                  style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
                  accessibilityRole="header"
                >
                  Admin Access
                </Text>
                <TouchableOpacity
                  style={[styles.adminItem, { 
                    backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                    borderColor: "#37a4c8"
                  }]}
                  onPress={handleAdminToolsNavigation}
                  accessibilityRole="button"
                  accessibilityLabel="Admin Tools"
                >
                  <LinearGradient
                    colors={theme === "light" 
                      ? ["#37a4c8", "#2d8ba8"] 
                      : ["#1a1a1a", "#0d0d0d"]}
                    style={styles.adminGradient}
                  >
                    <View style={styles.adminContent}>
                      <View style={styles.adminIconContainer}>
                        <Ionicons name="shield" size={28} color="#ffffff" />
                      </View>
                      <View style={styles.adminTextContainer}>
                        <Text style={styles.adminTitle}>Admin Tools</Text>
                        <Text style={styles.adminSubtitle}>
                          {isBiometricAvailable ? "Protected Access" : "Setup Required"}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={24} color="#ffffff" style={styles.chevronIcon} />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

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
                <Text style={[styles.logoutText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>Logout</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Logo and Copyright Section */}
            <View style={styles.footer}>
              <Image
                source={theme === "light" 
                  ? require('../../../assets/images/splash-icon.png')
                  : require('../../../assets/images/splash-icon-dark.png')
                }
                style={[
                  styles.footerLogo
                  
                ]}
                resizeMode="contain"
              />
              <Text style={[styles.copyrightText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                © 2025 Wingman. All rights reserved.
              </Text>
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
  profilePictureContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    position: 'relative',
  },
  profilePicture: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  profilePictureLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 25,
  },
  userNameContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 10,
  },
  userNamePlaceholder: {
    height: 20,
    width: '80%',
    borderRadius: 4,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicatorContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 95,
    height: 95,
    marginBottom: 0,
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
  loadingLine: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 3,
    width: '100%',
    borderRadius: 1.5,
  },
  adminSection: {
    marginBottom: 24,
    marginTop: 8,
  },
  adminItem: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 8,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  adminGradient: {
    padding: 16,
  },
  adminContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  adminTextContainer: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  adminSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
});

export { Settings };
