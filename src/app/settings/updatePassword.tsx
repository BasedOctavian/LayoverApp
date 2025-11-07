import React, { useState, useContext, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import { getAuth, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { ThemeContext } from "../../context/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar";
import * as Haptics from 'expo-haptics';
import { validatePassword, PasswordStrength } from "../../utils/passwordValidation";
import useNotificationCount from "../../hooks/useNotificationCount";

export default function UpdatePassword() {
  const { changePassword, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  // Access ThemeContext
  const { theme } = useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  // Handle back button press
  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // Handle password input with validation
  const handlePasswordChange = (value: string) => {
    setNewPassword(value);
    const strength = validatePassword(value);
    setPasswordStrength(strength);
    if (confirmPassword && value !== confirmPassword) {
      setError("Passwords do not match");
    } else {
      setError("");
    }
  };

  // Handle confirm password input
  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (newPassword !== value) {
      setError("Passwords do not match");
    } else {
      setError("");
    }
  };
  

  const handleUpdatePassword = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Reset error state
    setError("");

    // Validate current password
    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.feedback.join('\n'));
      return;
    }

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

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
    <LinearGradient 
      colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} 
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true} 
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.header, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
              Update Password
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
              Keep your account secure
            </Text>
          </View>

          {/* Password Form Card */}
          <View style={[styles.card, { 
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: theme === "light" ? "#E2E8F0" : "#374151",
            shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
          }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                Password Information
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Current Password
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
                }]}>
                  <Ionicons name="lock-closed" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter current password"
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                    secureTextEntry
                    style={[styles.input, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  New Password
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
                }]}>
                  <Ionicons name="key" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Enter new password"
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                    secureTextEntry
                    style={[styles.input, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                    value={newPassword}
                    onChangeText={handlePasswordChange}
                  />
                </View>
                {passwordStrength && (
                  <View style={[styles.strengthIndicator, { 
                    backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                  }]}>
                    <Text style={[styles.strengthText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Password Strength: {passwordStrength.strength}
                    </Text>
                    <View style={styles.strengthBar}>
                      {[...Array(5)].map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.strengthSegment,
                            {
                              backgroundColor: index < passwordStrength.score ? "#38a5c9" : 
                                theme === "light" ? "#E2E8F0" : "#1a1a1a"
                            }
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Confirm New Password
                </Text>
                <View style={[styles.inputContainer, { 
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
                }]}>
                  <Ionicons name="key" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Re-enter new password"
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                    secureTextEntry
                    style={[styles.input, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                  />
                </View>
              </View>

              {error ? (
                <View style={[styles.errorContainer, { 
                  backgroundColor: theme === "light" ? "#FEF2F2" : "rgba(239, 68, 68, 0.1)",
                  borderColor: "#ff4444"
                }]}>
                  <Ionicons name="alert-circle" size={24} color="#ff4444" />
                  <Text style={[styles.errorText, { color: "#ff4444" }]}>{error}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={[styles.button, { 
              backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
              borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9",
              opacity: loading ? 0.7 : 1
            }]}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            <View style={styles.buttonContent}>
              <Ionicons 
                name="lock-closed" 
                size={24} 
                color="#FFFFFF" 
              />
              <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                {loading ? "Updating..." : "Update Password"}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  headerContainer: {
    padding: 20,
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  form: {
    gap: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    marginBottom: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  strengthIndicator: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  strengthText: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
  },
  strengthBar: {
    flexDirection: "row",
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginTop: 4,
    borderWidth: 1,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    fontWeight: "500",
  },
  button: {
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    marginVertical: 24,
    borderWidth: 2,
    elevation: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});