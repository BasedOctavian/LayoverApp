import React, { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";

export default function Feedback() {
  const { user } = useAuth();
  const { theme } = React.useContext(ThemeContext);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert("Error", "Please enter your feedback");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid,
        content: feedback.trim(),
        createdAt: serverTimestamp(),
        status: "pending"
      });

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

  return (
    <LinearGradient
      colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]}
      style={styles.container}
    >
      <TopBar />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text
                style={[
                  styles.title,
                  { color: theme === "light" ? "#000000" : "#ffffff" },
                ]}
              >
                Send Feedback
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: theme === "light" ? "#666666" : "#999999" },
                ]}
              >
                Help us improve Wingman by sharing your thoughts
              </Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    color: theme === "light" ? "#000000" : "#ffffff",
                    borderColor: theme === "light" ? "#dddddd" : "#333333",
                  },
                ]}
                placeholder="Type your feedback here..."
                placeholderTextColor={theme === "light" ? "#999999" : "#666666"}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={feedback}
                onChangeText={setFeedback}
              />

              <TouchableOpacity
                style={[styles.submitButton, { opacity: loading ? 0.7 : 1 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#37a4c8", "#37a4c8"]}
                  style={styles.gradient}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Submitting..." : "Submit Feedback"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
  },
  gradient: {
    padding: 16,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
}); 