import React, { useState, useEffect } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useAuth from "../hooks/auth";
import { useRouter } from "expo-router";

const avatarSize = 100; // Fixed size for better control

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
  keyboardType?: string;
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

const UserOnboarding = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [userData, setUserData] = useState<any>({});
  const { user, signup, loading } = useAuth();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    if (user !== undefined) {
      setIsAuthChecked(true);
      if (user) router.replace("/home/dashboard");
    }
  }, [user]);

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

  const handleInputChange = (key: string, value: string) => {
    setUserData({ ...userData, [key]: value });
  };

  const handleSelectPhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      const userProfile = {
        ...userData,
        age: parseInt(userData.age, 10) || null,
        interests: userData.interests?.split(/,\s*/) || [],
        languages: userData.languages?.split(/,\s*/) || [],
        travelHistory: userData.travelHistory?.split(/,\s*/) || [],
        goals: userData.goals?.split(/,\s*/) || [],
        isAnonymous: false,
      };

      await signup(userData.email, userData.password, userProfile);
      router.replace("/home/dashboard");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create account");
    }
  };

  const renderField = (field: Field) => {
    switch (field.type) {
      case "image":
        return (
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleSelectPhoto}
          >
            {userData.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={32} color="#4F46E5" />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>
        );
      case "tags":
        return (
          <View style={styles.tagsContainer}>
            <TextInput
              style={styles.tagsInput}
              placeholder={field.placeholder}
              placeholderTextColor="#94A3B8"
              onChangeText={(text) => handleInputChange(field.key, text)}
              value={userData[field.key]}
            />
            <View style={styles.tagsPreview}>
              {userData[field.key]
                ?.split(",")
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
          <View style={styles.inputContainer}>
            <Feather name={field.icon} size={20} color="#64748B" />
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              placeholderTextColor="#94A3B8"
              secureTextEntry={field.secure}
              keyboardType={field.keyboardType}
              onChangeText={(text) => handleInputChange(field.key, text)}
              value={userData[field.key]}
            />
          </View>
        );
    }
  };

  return (
    <LinearGradient colors={["#F8FAFF", "#EFF2FF"]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.contentContainer}>
              {!isAuthChecked ? (
                <ActivityIndicator size="large" color="#6366F1" />
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
                          color="#4F46E5"
                        />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.nextButton}
                      onPress={handleNext}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={["#6366F1", "#4F46E5"]}
                        style={styles.buttonGradient}
                      >
                        {loading ? (
                          <ActivityIndicator color="white" />
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
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 40,
  },
  fieldContainer: {
    marginBottom: 24,
    width: "100%",
  },
  fieldLabel: {
    color: "#64748B",
    fontFamily: "Inter-Medium",
    marginBottom: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
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
    backgroundColor: "#E0E7FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4F46E5",
    padding: 8,
    borderRadius: 20,
  },
  tagsContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tagsInput: {
    fontSize: 16,
    color: "#1E293B",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tagsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  tag: {
    backgroundColor: "#E0E7FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: "#4F46E5",
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
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 16,
  },
  nextButton: {
    borderRadius: 12,
    overflow: "hidden",
    flex: 1,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Inter-Bold",
    fontSize: 16,
  },
  loginText: {
    color: "#4F46E5",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    marginTop: 20,
  },
});

export default UserOnboarding;