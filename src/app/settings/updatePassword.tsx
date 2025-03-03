import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

export default function UpdatePassword() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    <View style={styles.container}>
      <Text style={styles.header}>Update Password</Text>
      <View style={styles.form}>
        <TextInput
          placeholder="Current Password"
          secureTextEntry
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          placeholder="New Password"
          secureTextEntry
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          placeholder="Confirm New Password"
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    backgroundColor: "#F8FAFC",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 20,
  },
  form: {
    marginTop: 20,
  },
  input: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  errorText: {
    color: "#FF5A5F",
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
