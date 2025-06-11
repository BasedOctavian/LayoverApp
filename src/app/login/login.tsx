import React, { useState, useEffect, useCallback, useRef } from "react";
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
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import useAuth from "../../hooks/auth";
import { useRouter } from "expo-router";
import LoadingScreen from "../../components/LoadingScreen";
import { AuthError } from "firebase/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { user, loading: isAuthLoading, login, loading: isLoggingIn } = useAuth();
  const router = useRouter();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
        
        if (user) {
          setEmail("");
          setPassword("");
          setFocusedField(null);
          router.replace("/home/dashboard");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsRefreshing(false);
      }
    };

    checkAuth();
  }, [isAuthLoading, user]);

  const handleFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const getFriendlyErrorMessage = (error: AuthError): string => {
    switch (error.code) {
      case 'auth/invalid-credentials':
        return 'Incorrect email or password';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'Unable to sign in. Please try again';
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      setError(null);
      setIsRefreshing(true);
      await login(email, password);
      setEmail("");
      setPassword("");
      setFocusedField(null);
      router.replace("/home/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      setError(getFriendlyErrorMessage(authError));
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isAuthLoading || isLoggingIn || isRefreshing) {
    return <LoadingScreen message="Signing you in..." />;
  }

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.contentContainer}>
              <Text style={styles.title}>Welcome Back! ✈️</Text>

              <TouchableOpacity
                style={styles.fieldContainer}
                onPress={() => handleFocus('email')}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'email' && styles.inputContainerFocused
                ]}>
                  <Feather 
                    name="mail" 
                    size={20} 
                    color={focusedField === 'email' ? "#e4fbfe" : "#38a5c9"} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="flyer@skyconnect.com"
                    placeholderTextColor="#38a5c9"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => handleFocus('email')}
                    onBlur={handleBlur}
                  />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fieldContainer}
                onPress={() => handleFocus('password')}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[
                  styles.inputContainer,
                  focusedField === 'password' && styles.inputContainerFocused
                ]}>
                  <Feather 
                    name="lock" 
                    size={20} 
                    color={focusedField === 'password' ? "#e4fbfe" : "#38a5c9"} 
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#38a5c9"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    onFocus={() => handleFocus('password')}
                    onBlur={handleBlur}
                  />
                </View>
              </TouchableOpacity>

              {error && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={16} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isLoggingIn}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <LinearGradient
                  colors={["#38a5c9", "#38a5c9"]}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Login</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => router.push("/userOnboarding")}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.signUpText}>Don't have an account? Sign up</Text>
              </TouchableOpacity>
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
    minHeight: Platform.OS === 'ios' ? '100%' : 'auto',
    marginTop: '52%',
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
    paddingHorizontal: 4,
  },
  fieldLabel: {
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
    marginBottom: 12,
    fontSize: 14,
    paddingLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 64,
  },
  inputContainerFocused: {
    borderColor: "#e4fbfe",
    backgroundColor: "#1a1a1a",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#e4fbfe",
    fontFamily: "Inter-Regular",
    minHeight: 40,
    paddingVertical: 8,
  },
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 56,
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "#000000",
    fontFamily: "Inter-Bold",
    fontSize: 16,
  },
  signUpText: {
    color: "#38a5c9",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    marginTop: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
});

export default Login;