import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ThemeContext } from "../../ThemeContext"; // Import ThemeContext

export default function UpdatePassword() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Access ThemeContext
  const { theme } = useContext(ThemeContext);

  const handleUpdatePassword = async () => {
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
      // Create a credential using the user's email and the entered current password
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      
      // Reauthenticate the user
      await reauthenticateWithCredential(user, credential);
      console.log("Reauthenticated successfully.");

      // Now update the password using the custom hook function
      await changePassword(newPassword);
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
    <View style={[styles.container, { backgroundColor: theme === "light" ? "#F8FAFC" : "#1E293B" }]}>
      <Text style={[styles.header, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>
        Update Password
      </Text>
      <View style={styles.form}>
        <TextInput
          placeholder="Current Password"
          placeholderTextColor={theme === "light" ? "#A0AEC0" : "#718096"}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748", color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          placeholder="New Password"
          placeholderTextColor={theme === "light" ? "#A0AEC0" : "#718096"}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748", color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          placeholder="Confirm New Password"
          placeholderTextColor={theme === "light" ? "#A0AEC0" : "#718096"}
          secureTextEntry
          style={[styles.input, { backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748", color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error ? <Text style={[styles.errorText, { color: "#FF5A5F" }]}>{error}</Text> : null}
        <TouchableOpacity
          style={styles.button}
          onPress={handleUpdatePassword}
          disabled={loading}
        >
          <LinearGradient colors={["#2F80ED", "#1A5FB4"]} style={styles.buttonGradient}>
            <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {loading ? "Updating..." : "Update Password"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: "center", // Centers vertically
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
  input: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  errorText: {
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
  },
});