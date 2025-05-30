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
    <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          <Text style={[styles.header, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
            Update Password
          </Text>
          <View style={styles.form}>
            <Animated.View style={[styles.inputContainer, { backgroundColor: backgroundColor }]}>
              <Ionicons name="lock-closed" size={24} color="#37a4c8" style={styles.inputIcon} />
              <TextInput
                placeholder="Current Password"
                placeholderTextColor={theme === "light" ? "#A0AEC0" : "#718096"}
                secureTextEntry
                style={[styles.input, { color: theme === "light" ? "#000000" : "#ffffff" }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
            </Animated.View>
            <Animated.View style={[styles.inputContainer, { backgroundColor: backgroundColor }]}>
              <Ionicons name="key" size={24} color="#37a4c8" style={styles.inputIcon} />
              <TextInput
                placeholder="New Password"
                placeholderTextColor={theme === "light" ? "#A0AEC0" : "#718096"}
                secureTextEntry
                style={[styles.input, { color: theme === "light" ? "#000000" : "#ffffff" }]}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </Animated.View>
            <Animated.View style={[styles.inputContainer, { backgroundColor: backgroundColor }]}>
              <Ionicons name="key" size={24} color="#37a4c8" style={styles.inputIcon} />
              <TextInput
                placeholder="Confirm New Password"
                placeholderTextColor={theme === "light" ? "#A0AEC0" : "#718096"}
                secureTextEntry
                style={[styles.input, { color: theme === "light" ? "#000000" : "#ffffff" }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </Animated.View>
            {error ? (
              <View style={[styles.errorContainer, { backgroundColor: theme === "light" ? "#ffebee" : "#1a1a1a" }]}>
                <Ionicons name="alert-circle" size={24} color="#ff5252" />
                <Text style={[styles.errorText, { color: "#ff5252" }]}>{error}</Text>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.button, { borderColor: "#37a4c8" }]}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              <LinearGradient colors={["#37a4c8", "#37a4c8"]} style={styles.buttonGradient}>
                <Ionicons name="lock-closed" size={24} color={theme === "light" ? "#000000" : "#ffffff"} />
                <Text style={[styles.buttonText, { color: theme === "light" ? "#000000" : "#ffffff" }]}>
                  {loading ? "Updating..." : "Update Password"}
                </Text>
              </LinearGradient>
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
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
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
    borderColor: "#37a4c8",
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
  button: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  buttonText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "600",
  },
});