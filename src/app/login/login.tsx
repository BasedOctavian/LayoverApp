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
  KeyboardEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import useAuth from "../../hooks/auth";
import { useRouter } from "expo-router";
import LoadingScreen from "../../components/LoadingScreen";
import { AuthError } from "firebase/auth";
import { validateEmail, normalizeEmail } from "../../utils/emailValidation";
import { isPasswordValid } from "../../utils/passwordValidation";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { user, loading: isAuthLoading, login, loading: isLoggingIn } = useAuth();
  const router = useRouter();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight] = useState(new Animated.Value(0));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const hasRedirectedRef = useRef(false);

  // Only check auth on initial mount - don't redirect when user changes after login
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
        
        // Only redirect if user is already logged in on initial mount (not after login)
        if (user && !hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
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

    // Only check if auth is done loading (initial state check)
    if (!isAuthLoading) {
      checkAuth();
    }
  }, [isAuthLoading]); // Removed 'user' dependency to prevent re-triggering after login

  useEffect(() => {
    const keyboardWillShow = (event: KeyboardEvent) => {
      setKeyboardVisible(true);
      Animated.timing(keyboardHeight, {
        toValue: event.endCoordinates.height,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };

    const keyboardWillHide = () => {
      setKeyboardVisible(false);
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardWillShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardWillHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleFocus = useCallback((field: string) => {
    setFocusedField(field);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  // Validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Field validation functions
  const validateEmailField = (value: string): boolean => {
    const validation = validateEmail(value);
    setEmailError(validation.isValid ? null : validation.message);
    return validation.isValid;
  };

  const validatePasswordField = (value: string): boolean => {
    if (!value.trim()) {
      setPasswordError("Password is required");
      return false;
    }
    setPasswordError(null);
    return true;
  };

  const handleLogin = async () => {
    // Reset all errors
    setError(null);
    setEmailError(null);
    setPasswordError(null);

    // Validate required fields
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // Validate email format
    if (!validateEmailField(email)) {
      return;
    }

    // Validate password format
    if (!validatePasswordField(password)) {
      return;
    }

    try {
      setIsRefreshing(true);
      const normalizedEmail = normalizeEmail(email);
      await login(normalizedEmail, password);
      setEmail("");
      setPassword("");
      setFocusedField(null);
      hasRedirectedRef.current = true;
      router.replace("/home/dashboard");
    } catch (error) {
      const authError = error as AuthError;
      setError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isAuthLoading || isLoggingIn || isRefreshing) {
    return <LoadingScreen message="Signing you in..." forceDarkMode={true} />;
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
              <Text style={styles.title}>Welcome Back!</Text>

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
                    keyboardAppearance="dark"
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
                    keyboardAppearance="dark"
                  />
                </View>
              </TouchableOpacity>

              {(error || emailError || passwordError) && (
                <View style={styles.errorContainer}>
                  <Feather name="alert-circle" size={16} color="#ff6b6b" />
                  <Text style={styles.errorText}>
                    {error || emailError || passwordError}
                  </Text>
                </View>
              )}

              <Animated.View style={[
                styles.loginButtonContainer,
                {
                  transform: [{
                    translateY: keyboardHeight.interpolate({
                      inputRange: [0, 300],
                      outputRange: [0, 100]
                    })
                  }]
                }
              ]}>
                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  disabled={isLoggingIn}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <LinearGradient
                    colors={["#38a5c9", "#2d8ba8"]}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>Login</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.signUpContainer}>
                  <TouchableOpacity 
                    onPress={() => router.push("/userOnboarding")}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.signUpText}>Don't have an account? Sign up</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
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
  loginButtonContainer: {
    width: '100%',
    marginTop: 20,
  },
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 56,
    shadowColor: "#38a5c9",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#000000",
    fontFamily: "Inter-Bold",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  signUpText: {
    color: "#38a5c9",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    textAlign: "center",
  },
  signUpContainer: {
    width: "100%",
    alignItems: "center",
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