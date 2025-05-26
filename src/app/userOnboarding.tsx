import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  Alert,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useAuth from "../hooks/auth";
import { useRouter } from "expo-router";
import LoadingSpinner from "../components/LoadingSpinner";

const avatarSize = 100;

type StepKey = "email" | "profile" | "travel" | "social";

interface Step {
  key: StepKey;
  title: string;
  icon: IconName;
  fields: Field[];
}

interface Field {
  key: string;
  label: string;
  icon: IconName;
  placeholder: string;
  type?: "text" | "password" | "image" | "tags";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secure?: boolean;
}

type IconName =
  | "mail"
  | "lock"
  | "user"
  | "edit-3"
  | "camera"
  | "heart"
  | "globe"
  | "send"
  | "map-pin"
  | "briefcase";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  age?: string;
  bio?: string;
  profilePicture?: string;
  travelHistory?: string;
  goals?: string;
  interests?: string;
  languages?: string;
  [key: string]: string | undefined;
}

const UserOnboarding = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [userData, setUserData] = useState<UserData>({});
  const { user, signup, loading } = useAuth();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (user !== undefined) {
      setIsAuthChecked(true);
      if (user) router.replace("/home/dashboard");
    }
  }, [user]);

  useEffect(() => {
    if (!keyboardVisible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [stepIndex, keyboardVisible]);

  const steps: Step[] = [
    {
      key: "email",
      title: "Let's Get You Boarded! ✈️",
      icon: "send",
      fields: [
        {
          key: "email",
          label: "Email",
          icon: "mail",
          placeholder: "flyer@skyconnect.com",
          keyboardType: "email-address",
        },
        {
          key: "password",
          label: "Password",
          icon: "lock",
          placeholder: "••••••••",
          type: "password",
          secure: true,
        },
      ],
    },
    {
      key: "profile",
      title: "Your Travel Persona 🌍",
      icon: "user",
      fields: [
        {
          key: "name",
          label: "Full Name",
          icon: "user",
          placeholder: "Alex Wanderlust",
        },
        {
          key: "age",
          label: "Age",
          icon: "edit-3",
          placeholder: "Enter your age",
          keyboardType: "numeric",
        },
        {
          key: "bio",
          label: "Short Bio",
          icon: "edit-3",
          placeholder: "Digital nomad & coffee enthusiast...",
        },
        {
          key: "profilePicture",
          label: "Profile Photo",
          icon: "camera",
          type: "image",
          placeholder: "",
        },
      ],
    },
    {
      key: "travel",
      title: "Share Your Travel Experience ✈️",
      icon: "map-pin",
      fields: [
        {
          key: "travelHistory",
          label: "Travel History",
          icon: "map-pin",
          placeholder: "Countries visited, adventures experienced...",
          type: "tags",
        },
        {
          key: "goals",
          label: "Travel Goals",
          icon: "heart",
          placeholder: "Your dream destinations, bucket-list goals...",
          type: "tags",
        },
      ],
    },
    {
      key: "social",
      title: "Connect Your Interests 🧳",
      icon: "briefcase",
      fields: [
        {
          key: "interests",
          label: "Travel Interests",
          icon: "heart",
          placeholder: "Hiking, Local cuisine...",
          type: "tags",
        },
        {
          key: "languages",
          label: "Languages",
          icon: "globe",
          placeholder: "English, Spanish...",
          type: "tags",
        },
      ],
    },
  ];

  const handleInputChange = useCallback((key: string, value: string) => {
    setUserData((prev: UserData) => ({ ...prev, [key]: value }));
  }, []);

  const handleFocus = useCallback((key: string) => {
    setFocusedField(key);
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const handleSelectPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "We need access to your photos to set a profile picture"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        handleInputChange("profilePicture", result.assets[0].uri);
      }
    } catch (err) {
      console.log("Image picker error:", err);
    }
  };

  const handleNext = async () => {
    Keyboard.dismiss();
    if (stepIndex < steps.length - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      if (!userData.email || !userData.password) {
        Alert.alert("Error", "Email and password are required");
        return;
      }

      const userProfile = {
        email: userData.email,
        name: userData.name || "",
        age: parseInt(userData.age, 10) || 0,
        bio: userData.bio || "",
        profilePicture: userData.profilePicture || "",
        travelHistory: userData.travelHistory?.split(/,\s*/) || [],
        goals: userData.goals?.split(/,\s*/) || [],
        interests: userData.interests?.split(/,\s*/) || [],
        languages: userData.languages?.split(/,\s*/) || [],
        isAnonymous: false,
        moodStatus: "neutral",
      };

      await signup(userData.email, userData.password, userProfile);
      if (user) {
        router.replace("/home/dashboard");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create account");
    }
  };

  const renderField = (field: Field) => {
    const isFocused = focusedField === field.key;

    switch (field.type) {
      case "image":
        return (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleSelectPhoto}
            activeOpacity={0.7}
          >
            {userData.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Image 
                  source={require("../../assets/adaptive-icon.png")}
                  style={styles.defaultAvatar}
                />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={16} color="#070707" />
            </View>
          </TouchableOpacity>
        );
      case "tags":
        return (
          <View style={[
            styles.tagsContainer,
            isFocused && styles.tagsContainerFocused
          ]}>
            <TextInput
              style={styles.tagsInput}
              placeholder={field.placeholder}
              placeholderTextColor="#38a5c9"
              onChangeText={(text) => handleInputChange(field.key, text)}
              value={userData[field.key]}
              onFocus={() => handleFocus(field.key)}
              onBlur={handleBlur}
              multiline={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.tagsPreview}>
              {userData[field.key]
                ?.split(",")
                .filter(tag => tag.trim())
                .map((tag: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.trim()}</Text>
                  </View>
                ))}
            </View>
          </View>
        );
      default:
        return (
          <View style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused
          ]}>
            <Feather name={field.icon} size={20} color={isFocused ? "#e4fbfe" : "#38a5c9"} />
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              placeholderTextColor="#38a5c9"
              secureTextEntry={field.secure}
              keyboardType={field.keyboardType}
              onChangeText={(text) => handleInputChange(field.key, text)}
              value={userData[field.key]}
              onFocus={() => handleFocus(field.key)}
              onBlur={handleBlur}
              autoCapitalize={field.key === "name" ? "words" : "none"}
              autoCorrect={false}
            />
          </View>
        );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#070707", "#38a5c9"]} style={styles.flex}>
          <LoadingSpinner 
            size={120}
            color="#e4fbfe"
            customTexts={[
              "Creating your profile...",
              "Setting up your account...",
              "Almost ready to take off...",
              "Preparing your journey..."
            ]}
          />
        </LinearGradient>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#070707", "#38a5c9"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            keyboardVisible && styles.scrollContentKeyboardVisible
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View 
              style={[
                styles.contentContainer, 
                { opacity: fadeAnim }
              ]}
            >
              {!isAuthChecked ? (
                <ActivityIndicator size="large" color="#e4fbfe" />
              ) : (
                <>
                  <Text style={styles.title}>{steps[stepIndex].title}</Text>
                  {steps[stepIndex].fields.map((field) => (
                    <View key={field.key} style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      {renderField(field)}
                    </View>
                  ))}
                  <View style={styles.footer}>
                    {stepIndex > 0 && (
                      <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setStepIndex((prev) => prev - 1)}
                      >
                        <Feather
                          name="chevron-left"
                          size={24}
                          color="#e4fbfe"
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.nextButton}
                      onPress={handleNext}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={["#070707", "#070707"]}
                        style={styles.buttonGradient}
                      >
                        {loading ? (
                          <ActivityIndicator color="#e4fbfe" />
                        ) : (
                          <Text style={styles.buttonText}>
                            {stepIndex === steps.length - 1
                              ? "Start Exploring! ✈️"
                              : "Continue Journey →"}
                          </Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  {stepIndex === 0 && (
                    <TouchableOpacity onPress={() => router.push("login/login")}>
                      <Text style={styles.loginText}>
                        Already have an account? Log in
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </Animated.View>
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
  scrollContentKeyboardVisible: {
    justifyContent: "flex-start",
    paddingTop: 20,
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
  inputContainerFocused: {
    borderColor: "#e4fbfe",
    backgroundColor: "rgba(228, 251, 254, 0.15)",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#e4fbfe",
    fontFamily: "Inter-Regular",
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 24,
  },
  avatarPlaceholder: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: "rgba(228, 251, 254, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#38a5c9",
  },
  defaultAvatar: {
    width: avatarSize * 0.8,
    height: avatarSize * 0.8,
    borderRadius: avatarSize / 2,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    borderWidth: 2,
    borderColor: "#38a5c9",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#e4fbfe",
    padding: 8,
    borderRadius: 20,
  },
  tagsContainer: {
    backgroundColor: "rgba(228, 251, 254, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 56,
  },
  tagsContainerFocused: {
    borderColor: "#e4fbfe",
    backgroundColor: "rgba(228, 251, 254, 0.15)",
  },
  tagsInput: {
    fontSize: 16,
    color: "#e4fbfe",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#38a5c9",
    minHeight: 40,
  },
  tagsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  tag: {
    backgroundColor: "rgba(56, 165, 201, 0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  tagText: {
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    width: "100%",
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(228, 251, 254, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginRight: 16,
  },
  nextButton: {
    borderRadius: 12,
    overflow: "hidden",
    flex: 1,
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
  loginText: {
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex: {
    flex: 1,
  },
});

export default UserOnboarding;