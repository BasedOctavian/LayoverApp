import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
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
import { MediaType } from "expo-image-picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import useAuth from "../hooks/auth";
import { useRouter } from "expo-router";
import LoadingScreen from "../components/LoadingScreen";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "../../config/firebaseConfig";

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
  type?: "text" | "password" | "image" | "tags" | "date";
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
  | "briefcase"
  | "calendar";

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  dateOfBirth?: Date;
  bio?: string;
  profilePicture?: string;
  travelHistory?: string;
  goals?: string;
  interests?: string;
  languages?: string;
  [key: string]: string | Date | undefined;
}

const UserOnboarding = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [userData, setUserData] = useState<UserData>({});
  const { user, signup, loading } = useAuth();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  useEffect(() => {
    if (user !== undefined) {
      setIsAuthChecked(true);
      if (user) router.replace("/home/dashboard");
    }
  }, [user]);

  const handleInputChange = useCallback((key: string, value: string | Date) => {
    setUserData((prev: UserData) => ({ ...prev, [key]: value }));
  }, []);

  const handleFocus = useCallback((key: string) => {
    setFocusedField(key);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handleBlur = useCallback(() => {
    setFocusedField(null);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        handleInputChange("dateOfBirth", selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirmDate = () => {
    if (tempDate) {
      handleInputChange("dateOfBirth", tempDate);
    }
    setShowDatePicker(false);
    setTempDate(null);
  };

  const handleCancelDate = () => {
    setShowDatePicker(false);
    setTempDate(null);
  };

  const handleOpenDatePicker = () => {
    Keyboard.dismiss();
    setTempDate(userData.dateOfBirth as Date || new Date());
    setShowDatePicker(true);
  };

  const handleNext = async () => {
    Keyboard.dismiss();
    if (stepIndex < steps.length - 1) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
      ]).start(() => {
        setStepIndex((prev) => prev + 1);
      });
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

      // Calculate age from date of birth
      const age = userData.dateOfBirth 
        ? Math.floor((new Date().getTime() - (userData.dateOfBirth as Date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

      // First create the user document without the profile picture
      const userProfile = {
        email: userData.email,
        name: userData.name || "",
        dateOfBirth: userData.dateOfBirth,
        age: age,
        bio: userData.bio || "",
        profilePicture: "", // Will be updated after upload
        travelHistory: userData.travelHistory?.split(/,\s*/) || [],
        goals: userData.goals?.split(/,\s*/) || [],
        interests: userData.interests?.split(/,\s*/) || [],
        languages: userData.languages?.split(/,\s*/) || [],
        isAnonymous: false,
        moodStatus: "neutral",
      };

      // Create user account and get the user ID
      const userCredential = await signup(userData.email, userData.password, userProfile);
      
      if (!userCredential?.user?.uid) {
        throw new Error("Failed to create user account");
      }

      // Upload profile picture if one was selected
      if (userData.profilePicture && !userData.profilePicture.startsWith("http")) {
        try {
          const response = await fetch(userData.profilePicture);
          const blob = await response.blob();
          const storageRef = ref(storage, `profilePictures/${userCredential.user.uid}`);
          await uploadBytes(storageRef, blob);
          const profilePicUrl = await getDownloadURL(storageRef);

          // Update user document with profile picture URL
          const userDocRef = doc(db, "users", userCredential.user.uid);
          await updateDoc(userDocRef, {
            profilePicture: profilePicUrl,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error("Error uploading profile picture:", error);
          // Continue even if profile picture upload fails
        }
      }

      // Navigate to dashboard
      router.replace("/home/dashboard");
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
              <Feather name="camera" size={16} color="#000000" />
            </View>
          </TouchableOpacity>
        );
      case "date":
        return (
          <View>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused
              ]}
              onPress={handleOpenDatePicker}
              activeOpacity={0.7}
            >
              <Feather 
                name={field.icon} 
                size={20} 
                color={isFocused ? "#e4fbfe" : "#38a5c9"} 
              />
              <Text style={[
                styles.dateText,
                !userData.dateOfBirth && styles.datePlaceholder
              ]}>
                {userData.dateOfBirth 
                  ? (userData.dateOfBirth as Date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : field.placeholder}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tempDate || userData.dateOfBirth as Date || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  textColor="#e4fbfe"
                  themeVariant="dark"
                />
                {Platform.OS === 'ios' && (
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity 
                      style={styles.datePickerButton} 
                      onPress={handleCancelDate}
                    >
                      <Text style={styles.datePickerButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.datePickerButton, styles.datePickerButtonConfirm]} 
                      onPress={handleConfirmDate}
                    >
                      <Text style={[styles.datePickerButtonText, styles.datePickerButtonTextConfirm]}>
                        Confirm
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
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
              value={userData[field.key] as string}
              onFocus={() => handleFocus(field.key)}
              onBlur={handleBlur}
              multiline={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.tagsPreview}>
              {(userData[field.key] as string)
                ?.split(",")
                .filter((tag: string) => tag.trim())
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
            <Feather 
              name={field.icon} 
              size={20} 
              color={isFocused ? "#e4fbfe" : "#38a5c9"} 
            />
            <TextInput
              style={styles.input}
              placeholder={field.placeholder}
              placeholderTextColor="#38a5c9"
              secureTextEntry={field.secure}
              keyboardType={field.keyboardType}
              onChangeText={(text) => handleInputChange(field.key, text)}
              value={userData[field.key] as string}
              onFocus={() => handleFocus(field.key)}
              onBlur={handleBlur}
              autoCapitalize={field.key === "name" ? "words" : "sentences"}
              autoCorrect={field.key === "bio"}
              spellCheck={field.key === "bio"}
              multiline={field.key === "bio"}
              numberOfLines={field.key === "bio" ? 3 : 1}
              textAlignVertical={field.key === "bio" ? "top" : "center"}
            />
          </View>
        );
    }
  };

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
          key: "dateOfBirth",
          label: "Date of Birth",
          icon: "calendar",
          placeholder: "Select your date of birth",
          type: "date",
        },
        {
          key: "bio",
          label: "Short Bio",
          icon: "edit-3",
          placeholder: "Digital nomad & coffee enthusiast...",
          type: "text",
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

  if (loading) {
    return <LoadingScreen message="Creating your account..." />;
  }

  if (!isAuthChecked) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Animated.View 
            style={[
              styles.contentContainer,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
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
                  onPress={() => {
                    Animated.sequence([
                      Animated.timing(scaleAnim, {
                        toValue: 0.95,
                        duration: 100,
                        useNativeDriver: true,
                        easing: Easing.ease,
                      }),
                      Animated.spring(scaleAnim, {
                        toValue: 1,
                        useNativeDriver: true,
                        speed: 50,
                        bounciness: 4,
                      }),
                    ]).start(() => {
                      setStepIndex((prev) => prev - 1);
                    });
                  }}
                  activeOpacity={0.7}
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
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#38a5c9", "#38a5c9"]}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {stepIndex === steps.length - 1
                      ? "Start Exploring! ✈️"
                      : "Continue Journey →"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {stepIndex === 0 && (
              <TouchableOpacity 
                onPress={() => router.push("login/login")}
                activeOpacity={0.7}
              >
                <Text style={styles.loginText}>
                  Already have an account? Log in
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: "center",
    marginTop: '22%',
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
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainerFocused: {
    borderColor: "#e4fbfe",
    backgroundColor: "#1a1a1a",
    shadowColor: "#38a5c9",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
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
    backgroundColor: "#1a1a1a",
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
    backgroundColor: "#38a5c9",
    padding: 8,
    borderRadius: 20,
  },
  tagsContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 56,
  },
  tagsContainerFocused: {
    borderColor: "#e4fbfe",
    backgroundColor: "#1a1a1a",
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
    backgroundColor: "#1a1a1a",
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
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextButton: {
    borderRadius: 12,
    overflow: "hidden",
    flex: 1,
    borderWidth: 1,
    borderColor: "#38a5c9",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#000000",
    fontFamily: "Inter-Bold",
    fontSize: 16,
  },
  loginText: {
    color: "#38a5c9",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    marginTop: 20,
  },
  dateText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#e4fbfe",
    fontFamily: "Inter-Regular",
  },
  datePlaceholder: {
    color: "#38a5c9",
  },
  datePickerContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  datePickerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  datePickerButtonConfirm: {
    backgroundColor: '#38a5c9',
  },
  datePickerButtonText: {
    color: '#e4fbfe',
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  datePickerButtonTextConfirm: {
    color: '#000000',
  },
});

export default UserOnboarding;