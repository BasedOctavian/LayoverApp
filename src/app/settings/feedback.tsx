import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";
import * as Haptics from "expo-haptics";

const ADMIN_IDS = ['hDn74gYZCdZu0efr3jMGTIWGrRQ2', 'WhNhj8WPUpbomevJQ7j69rnLbDp2'];

export default function Feedback() {
  const { user } = useAuth();
  const { theme } = React.useContext(ThemeContext);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;

  const sendPushNotification = async (expoPushToken: string, feedbackContent: string) => {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify({
          to: expoPushToken,
          title: 'New Feedback Received',
          body: feedbackContent.length > 100 ? feedbackContent.substring(0, 97) + '...' : feedbackContent,
          sound: 'default',
          priority: 'high',
          data: { 
            type: 'feedback',
            timestamp: new Date().toISOString()
          },
        }),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  };

  const notifyAdmins = async (feedbackContent: string) => {
    try {
      const adminTokens = await Promise.all(
        ADMIN_IDS.map(async (adminId) => {
          const adminDoc = await getDoc(doc(db, 'users', adminId));
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            return adminData.expoPushToken;
          }
          return null;
        })
      );

      const notificationPromises = adminTokens
        .filter(token => token)
        .map(token => sendPushNotification(token!, feedbackContent));

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please enter your feedback");
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid,
        content: feedback.trim(),
        createdAt: serverTimestamp(),
        status: "pending"
      });

      await notifyAdmins(feedback.trim());

      Alert.alert(
        "Success",
        "Thank you for your feedback!",
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Start entrance animation
  React.useEffect(() => {
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
  }, []);

  return (
    <LinearGradient
      colors={theme === "light" ? ["#f8f9fa", "#ffffff", "#f8f9fa"] : ["#000000", "#1a1a1a", "#000000"]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <TopBar />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: contentBounceAnim,
                transform: [
                  { scale: contentScaleAnim },
                  {
                    translateY: contentBounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.header}>
                <Text
                  style={[
                    styles.title,
                    { color: theme === "light" ? "#000000" : "#e4fbfe" },
                  ]}
                >
                  Send Feedback
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme === "light" ? "#64748B" : "#94A3B8" },
                  ]}
                >
                  Help us improve Wingman by sharing your thoughts
                </Text>
              </View>

              <View style={styles.form}>
                <Animated.View
                  style={[
                    styles.inputContainer,
                    {
                      transform: [{
                        scale: inputFocusAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.02]
                        })
                      }],
                      borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    }
                  ]}
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: theme === "light" ? "#000000" : "#e4fbfe",
                      },
                    ]}
                    placeholder="Type your feedback here..."
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#64748B"}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    value={feedback}
                    onChangeText={setFeedback}
                    onFocus={() => {
                      Animated.spring(inputFocusAnim, {
                        toValue: 1,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 7,
                      }).start();
                    }}
                    onBlur={() => {
                      Animated.spring(inputFocusAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 50,
                        friction: 7,
                      }).start();
                    }}
                  />
                </Animated.View>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    { opacity: loading ? 0.7 : 1 }
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#37a4c8", "#37a4c8"]}
                    style={styles.gradient}
                  >
                    <View style={styles.buttonContent}>
                      {loading ? (
                        <MaterialIcons name="hourglass-empty" size={24} color="#ffffff" />
                      ) : (
                        <MaterialIcons name="send" size={24} color="#ffffff" />
                      )}
                      <Text style={styles.submitButtonText}>
                        {loading ? "Submitting..." : "Submit Feedback"}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  input: {
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    textAlignVertical: "top",
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  gradient: {
    padding: 16,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
}); 