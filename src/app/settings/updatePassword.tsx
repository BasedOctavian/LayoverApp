import React, { useState, useContext, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Animated, Easing, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ThemeContext } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar";
import * as Haptics from 'expo-haptics';

export default function UpdatePassword() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Access ThemeContext
  const { theme } = useContext(ThemeContext);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

  // Start fade in animation
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const handleUpdatePassword = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Basic validation
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      setError("No user found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await changePassword(newPassword);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert("Success", "Password updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff", "#f8f9fa"] : ["#000000", "#1a1a1a", "#000000"]} locations={[0, 0.5, 1]} style={{ flex: 1 }}>
      <TopBar showBackButton={true} />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <Text style={[styles.header, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            Update Password
          </Text>
          <View style={styles.form}>
            <Animated.View style={[styles.inputContainer, { 
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
            }]}>
              <Ionicons name="lock-closed" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.inputIcon} />
              <TextInput
                placeholder="Current Password"
                placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                secureTextEntry
                style={[styles.input, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </Animated.View>
            <Animated.View style={[styles.inputContainer, { 
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
            }]}>
              <Ionicons name="key" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.inputIcon} />
              <TextInput
                placeholder="New Password"
                placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                secureTextEntry
                style={[styles.input, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </Animated.View>
            <Animated.View style={[styles.inputContainer, { 
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
            }]}>
              <Ionicons name="key" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.inputIcon} />
              <TextInput
                placeholder="Confirm New Password"
                placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                secureTextEntry
                style={[styles.input, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </Animated.View>
            {error ? (
              <View style={[styles.errorContainer, { 
                backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                borderColor: "#ff4444"
              }]}>
                <Ionicons name="alert-circle" size={24} color="#ff4444" />
                <Text style={[styles.errorText, { color: "#ff4444" }]}>{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.button, { 
                backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
              }]}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              <View style={styles.buttonContent}>
                <Ionicons 
                  name="lock-closed" 
                  size={24} 
                  color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                />
                <Text style={[styles.buttonText, { 
                  color: theme === "light" ? "#37a4c8" : "#38a5c9"
                }]}>
                  {loading ? "Updating..." : "Update Password"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  form: {
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  button: {
    borderRadius: 30,
    padding: 18,
    alignItems: "center",
    marginVertical: 24,
    borderWidth: 1,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});