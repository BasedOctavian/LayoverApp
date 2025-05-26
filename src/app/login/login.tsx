import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import useAuth from "../../hooks/auth";
import { useRouter } from "expo-router";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { user, isAuthLoading, login, loading: isLoggingIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace("/home/dashboard");
    }
  }, [isAuthLoading, user]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    try {
      await login(email, password);
      router.replace("/home/dashboard");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to log in");
    }
  };

  return (
    <LinearGradient colors={["#070707", "#38a5c9"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.contentContainer}>
              {isAuthLoading ? (
                <ActivityIndicator size="large" color="#e4fbfe" />
              ) : (
                <>
                  <Text style={styles.title}>Welcome Back! ✈️</Text>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Email</Text>
                    <View style={styles.inputContainer}>
                      <Feather name="mail" size={20} color="#38a5c9" />
                      <TextInput
                        style={styles.input}
                        placeholder="flyer@skyconnect.com"
                        placeholderTextColor="#38a5c9"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Password</Text>
                    <View style={styles.inputContainer}>
                      <Feather name="lock" size={20} color="#38a5c9" />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#38a5c9"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                    disabled={isLoggingIn}
                  >
                    <LinearGradient
                      colors={["#070707", "#070707"]}
                      style={styles.buttonGradient}
                    >
                      {isLoggingIn ? (
                        <ActivityIndicator color="#e4fbfe" />
                      ) : (
                        <Text style={styles.buttonText}>Login</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => router.push("/userOnboarding")}>
                    <Text style={styles.signUpText}>Don't have an account? Sign up</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  contentContainer: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter-Bold",
    color: "#e4fbfe",
    textAlign: "center",
    marginBottom: 32,
  },
  fieldContainer: {
    marginBottom: 24,
    width: "100%",
  },
  fieldLabel: {
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
    marginBottom: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(228, 251, 254, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 56,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#e4fbfe",
    fontFamily: "Inter-Regular",
  },
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#e4fbfe",
    fontFamily: "Inter-Bold",
    fontSize: 16,
  },
  signUpText: {
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    marginTop: 20,
  },
});

export default Login;