import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Modal,
  FlatList,
  KeyboardAvoidingView,
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
import { containsFilteredContent, getFilteredContentCategory, sanitizeText } from "../utils/contentFilter";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";
import * as ExpoNotifications from 'expo-notifications';

const avatarSize = 100;

type StepKey = "email" | "profile" | "travel" | "social" | "eula";

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
  type?: "text" | "password" | "image" | "tags" | "date" | "eula";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secure?: boolean;
  autoComplete?: "email" | "password" | "name" | "off";
  textContentType?: "emailAddress" | "password" | "name" | "none";
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
  | "calendar"
  | "file-text"
  | "shield"
  | "users";

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
  acceptedEula?: boolean;
  [key: string]: string | Date | boolean | undefined;
}

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia",
  "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt",
  "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon",
  "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel",
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo",
  "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania",
  "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia",
  "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan",
  "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan",
  "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
].sort();

const TRAVEL_INTERESTS = [
  "Adventure", "Backpacking", "Beach", "Camping", "City Breaks", "Cultural", "Ecotourism",
  "Food & Wine", "Hiking", "Historical", "Island Hopping", "Luxury", "Mountain Climbing",
  "Museums", "Nature", "Photography", "Road Trips", "Safari", "Sailing", "Skiing",
  "Solo Travel", "Spiritual", "Sports", "Theme Parks", "Volunteering", "Wildlife",
  "Yoga & Wellness", "Art & Architecture", "Music Festivals", "Nightlife", "Shopping",
  "Spa & Relaxation", "Surfing", "Trekking", "Water Sports", "Wine Tasting"
].sort();

const LANGUAGES = [
  "Afrikaans", "Albanian", "Arabic", "Armenian", "Bengali", "Bulgarian", "Burmese",
  "Catalan", "Chinese (Mandarin)", "Croatian", "Czech", "Danish", "Dutch", "English",
  "Estonian", "Filipino", "Finnish", "French", "Georgian", "German", "Greek", "Hebrew",
  "Hindi", "Hungarian", "Icelandic", "Indonesian", "Italian", "Japanese", "Korean",
  "Latvian", "Lithuanian", "Malay", "Malayalam", "Maltese", "Marathi", "Mongolian",
  "Nepali", "Norwegian", "Persian", "Polish", "Portuguese", "Punjabi", "Romanian",
  "Russian", "Serbian", "Slovak", "Slovenian", "Spanish", "Swedish", "Tamil",
  "Telugu", "Thai", "Turkish", "Ukrainian", "Urdu", "Vietnamese", "Welsh"
].sort();

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
  const [eulaScrollPosition, setEulaScrollPosition] = useState(0);
  const [eulaScrollEnd, setEulaScrollEnd] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [currentField, setCurrentField] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string[] }>({
    travelHistory: [],
    goals: [],
    interests: [],
    languages: []
  });
  const [showFullEula, setShowFullEula] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});
  const [fieldValidation, setFieldValidation] = useState<{ [key: string]: boolean }>({});
  const [validationAttempted, setValidationAttempted] = useState(false);

  useEffect(() => {
    if (user !== undefined) {
      setIsAuthChecked(true);
      if (user) router.replace("/home/dashboard");
    }
  }, [user]);

  const validateCurrentStep = useCallback(() => {
    const currentStepFields = steps[stepIndex].fields;
    const validation: { [key: string]: boolean } = {};
    let isValid = true;

    currentStepFields.forEach(field => {
      let fieldIsValid = true;
      
      if (field.type === "tags") {
        fieldIsValid = (selectedOptions[field.key] || []).length > 0;
      } else if (field.type === "eula") {
        fieldIsValid = !!userData.acceptedEula;
      } else if (field.type === "image") {
        fieldIsValid = !!userData.profilePicture;
      } else if (field.type === "date") {
        fieldIsValid = !!userData.dateOfBirth;
      } else {
        fieldIsValid = !!userData[field.key] && (userData[field.key] as string).trim().length > 0;
      }

      validation[field.key] = fieldIsValid;
      if (!fieldIsValid) isValid = false;
    });

    return { validation, isValid };
  }, [stepIndex, userData, selectedOptions]);

  useEffect(() => {
    const { validation } = validateCurrentStep();
    setFieldValidation(validation);
  }, [userData, selectedOptions, stepIndex, validateCurrentStep]);

  const handleInputChange = useCallback((key: string, value: string | Date | boolean) => {
    if (key === "name" && typeof value === "string") {
      if (containsFilteredContent(value)) {
        setFieldErrors(prev => ({ ...prev, [key]: true }));
        value = value
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
      } else {
        setFieldErrors(prev => ({ ...prev, [key]: false }));
      }
    } else if (key === "bio" && typeof value === "string") {
      if (containsFilteredContent(value)) {
        setFieldErrors(prev => ({ ...prev, [key]: true }));
        value = value.charAt(0).toUpperCase() + value.slice(1);
      } else {
        setFieldErrors(prev => ({ ...prev, [key]: false }));
      }
    }
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
        const today = new Date();
        const birthDate = new Date(selectedDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 18) {
          Alert.alert(
            "Age Restriction",
            "You must be at least 18 years old to use Wingman.",
            [{ text: "OK" }]
          );
          return;
        }

        handleInputChange("dateOfBirth", selectedDate);
      }
    } else {
      if (selectedDate) {
        const today = new Date();
        const birthDate = new Date(selectedDate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (age < 18) {
          Alert.alert(
            "Age Restriction",
            "You must be at least 18 years old to use Wingman.",
            [{ text: "OK" }]
          );
          return;
        }

        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirmDate = () => {
    if (tempDate) {
      const today = new Date();
      const birthDate = new Date(tempDate);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        Alert.alert(
          "Age Restriction",
          "You must be at least 18 years old to use Wingman.",
          [{ text: "OK" }]
        );
        return;
      }

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
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() - 18);
    setTempDate(userData.dateOfBirth as Date || maxDate);
    setShowDatePicker(true);
  };

  const handleNext = async () => {
    Keyboard.dismiss();
    
    setValidationAttempted(true);
    const { isValid } = validateCurrentStep();
    
    if (steps[stepIndex].key === "eula" && !userData.acceptedEula) {
      return;
    }

    const currentStepFields = steps[stepIndex].fields;
    const hasErrors = currentStepFields.some(field => fieldErrors[field.key]);
    
    if (hasErrors) {
      return;
    }

    if (!isValid) {
      return;
    }

    setValidationAttempted(false);

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

      if (!userData.acceptedEula) {
        Alert.alert("Error", "You must accept the terms and conditions");
        return;
      }

      const age = userData.dateOfBirth 
        ? Math.floor((new Date().getTime() - (userData.dateOfBirth as Date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

      // Get push token if permissions are granted
      let expoPushToken = null;
      try {
        const { status } = await ExpoNotifications.getPermissionsAsync();
        if (status === 'granted') {
          const projectId = '61cfadd9-25bb-4566-abec-1e9679ef882b';
          const token = await ExpoNotifications.getExpoPushTokenAsync({ projectId });
          expoPushToken = token.data;
        }
      } catch (error) {
        console.error('Error getting push token:', error);
      }

      const userProfile = {
        email: userData.email,
        name: userData.name || "",
        dateOfBirth: userData.dateOfBirth,
        age: age,
        bio: userData.bio || "",
        profilePicture: "",
        travelHistory: userData.travelHistory?.split(/,\s*/) || [],
        goals: userData.goals?.split(/,\s*/) || [],
        interests: userData.interests?.split(/,\s*/) || [],
        languages: userData.languages?.split(/,\s*/) || [],
        isAnonymous: false,
        moodStatus: "neutral",
        acceptedEula: true,
        eulaAcceptedAt: serverTimestamp(),
        expoPushToken: expoPushToken,
        notificationPreferences: {
          announcements: true,
          chats: true,
          connections: true,
          events: true,
          notificationsEnabled: !!expoPushToken
        }
      };

      const userCredential = await signup(userData.email, userData.password, userProfile);
      
      if (!userCredential?.user?.uid) {
        throw new Error("Failed to create user account");
      }

      if (userData.profilePicture && !userData.profilePicture.startsWith("http")) {
        try {
          const response = await fetch(userData.profilePicture);
          const blob = await response.blob();
          const storageRef = ref(storage, `profilePictures/${userCredential.user.uid}`);
          await uploadBytes(storageRef, blob);
          const profilePicUrl = await getDownloadURL(storageRef);

          const userDocRef = doc(db, "users", userCredential.user.uid);
          await updateDoc(userDocRef, {
            profilePicture: profilePicUrl,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          console.error("Error uploading profile picture:", error);
        }
      }

      router.replace("/home/dashboard");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create account");
    }
  };

  const handleOptionSelect = (option: string) => {
    if (currentField) {
      const currentOptions = selectedOptions[currentField] || [];
      setSelectedOptions(prev => ({
        ...prev,
        [currentField]: [...currentOptions, option]
      }));
      handleInputChange(currentField, [...currentOptions, option].join(", "));
    }
  };

  const handleOptionRemove = (option: string, field: string) => {
    const currentOptions = selectedOptions[field] || [];
    setSelectedOptions(prev => ({
      ...prev,
      [field]: currentOptions.filter(o => o !== option)
    }));
    handleInputChange(field, currentOptions.filter(o => o !== option).join(", "));
  };

  const openSelectionModal = (field: string) => {
    setCurrentField(field);
    setSearchQuery("");
    setShowCountryModal(true);
  };

  const getOptionsForField = (field: string) => {
    switch (field) {
      case "travelHistory":
      case "goals":
        return COUNTRIES;
      case "interests":
        return TRAVEL_INTERESTS;
      case "languages":
        return LANGUAGES;
      default:
        return [];
    }
  };

  const filteredOptions = getOptionsForField(currentField || "").filter(option => 
    option.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !(selectedOptions[currentField || ""] || []).includes(option)
  );

  const renderField = (field: Field) => {
    const isFocused = focusedField === field.key;
    const hasError = fieldErrors[field.key];
    const isValid = fieldValidation[field.key];
    const showValidation = validationAttempted && !isValid;

    if (steps[stepIndex].key === "profile") {
      if (field.key === "name" || field.key === "profilePicture") {
        return (
          <View style={styles.profileRow}>
            {field.key === "profilePicture" ? (
              <TouchableOpacity
                style={[
                  styles.avatarContainer,
                  showValidation && styles.fieldInvalid,
                  styles.avatarContainerCompact
                ]}
                onPress={handleSelectPhoto}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
            ) : (
              <View style={styles.nameInputContainer}>
                <View style={[
                  styles.inputContainer,
                  isFocused && styles.inputContainerFocused,
                  hasError && styles.inputContainerError,
                  showValidation && styles.fieldInvalid,
                  
                ]}>
                  <Feather 
                    name={field.icon} 
                    size={20} 
                    color={hasError ? "#ff4444" : isFocused ? "#e4fbfe" : "#38a5c9"} 
                  />
                  <TextInput
                    style={[styles.input, hasError && styles.inputError]}
                    placeholder={field.placeholder}
                    placeholderTextColor={hasError ? "#ff4444" : "#38a5c9"}
                    onChangeText={(text) => handleInputChange(field.key, text)}
                    value={userData[field.key] as string}
                    onFocus={() => handleFocus(field.key)}
                    onBlur={handleBlur}
                    autoCapitalize="words"
                    keyboardAppearance="dark"
                  />
                </View>
              </View>
            )}
          </View>
        );
      }
    }

    switch (field.type) {
      case "eula":
        return (
          <View style={styles.eulaContainer}>
            <View style={[
              styles.eulaSummary,
              showValidation && styles.fieldInvalid
            ]}>
              <View style={styles.eulaHeader}>
                <Feather name="file-text" size={24} color="#38a5c9" />
                <Text style={styles.eulaSummaryTitle}>Terms & Conditions</Text>
              </View>
              <Text style={styles.eulaSummaryText}>
                By using Wingman, you agree to our Terms of Service and Privacy Policy. Here are the key points you should know:
              </Text>
              <View style={styles.eulaSummaryPoints}>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="user" size={16} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>You must be 18 or older</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="lock" size={16} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>One account per person</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="shield" size={16} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>Zero tolerance for harassment</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="map-pin" size={16} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>Location services required</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="users" size={16} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>Meet in public places</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewFullTermsButton}
                onPress={() => setShowFullEula(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewFullTermsText}>View Full Terms</Text>
                <Feather name="chevron-right" size={20} color="#38a5c9" />
              </TouchableOpacity>
              <View style={styles.eulaAcceptanceContainer}>
                <TouchableOpacity
                  style={[
                    styles.eulaCheckbox,
                    userData.acceptedEula && styles.eulaCheckboxChecked
                  ]}
                  onPress={() => handleInputChange("acceptedEula", !userData.acceptedEula)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {userData.acceptedEula && (
                    <Feather name="check" size={20} color="#e4fbfe" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleInputChange("acceptedEula", !userData.acceptedEula)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eulaAcceptanceText}>
                    I have read and agree to the Terms of Service and Privacy Policy
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <Modal
              visible={showFullEula}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowFullEula(false)}
            >
              <View style={styles.fullScreenContainer}>
                <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.fullScreenGradient}>
                  <View style={styles.fullScreenHeader}>
                    <View style={styles.fullScreenTitleContainer}>
                      <Feather name="file-text" size={24} color="#38a5c9" style={styles.fullScreenTitleIcon} />
                      <Text style={styles.fullScreenTitle}>Terms & Conditions</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowFullEula(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.fullScreenCloseButton}
                    >
                      <Feather name="x" size={24} color="#e4fbfe" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView 
                    style={styles.fullScreenScrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.fullScreenScrollContent}
                  >
                    <Text style={styles.fullScreenText}>
                      Wingman – End User License Agreement (EULA) & Terms of Use{'\n\n'}
                      Effective Date: 6/6/2026{'\n'}
                      Last Updated: June 6, 2025{'\n\n'}
                      1. Acceptance of Terms{'\n'}
                      By downloading, accessing, or using Wingman, you agree to this End User License Agreement (EULA) and our Privacy Policy. If you do not agree, do not use the app.{'\n\n'}
                      2. Eligibility{'\n'}
                      You must be 18 years or older to use Wingman.{'\n\n'}
                      By using the app, you confirm that:{'\n\n'}
                      • You are at least 18 years old.{'\n'}
                      • You are legally allowed to use the app under your local laws.{'\n'}
                      • You are not impersonating another person or submitting false information.{'\n\n'}
                      We reserve the right to suspend or terminate your access immediately if these conditions are violated.{'\n\n'}
                      3. Account Usage{'\n'}
                      • You may only create one personal account.{'\n'}
                      • You are fully responsible for all activity under your account.{'\n'}
                      • Sharing accounts or credentials is strictly prohibited.{'\n\n'}
                      4. Zero-Tolerance Policy{'\n'}
                      Wingman enforces a strict no-tolerance policy for the following:{'\n\n'}
                      • Harassment, threats, stalking, or verbal abuse{'\n'}
                      • Sexual content or unsolicited sexual advances{'\n'}
                      • Hate speech, discrimination, or bullying{'\n'}
                      • Misrepresentation of age, identity, or location{'\n'}
                      • Spamming, scamming, or phishing attempts{'\n'}
                      • Linking to third-party platforms for self-promotion or solicitation{'\n'}
                      • Tampering with or falsifying GPS/location data{'\n\n'}
                      Violations may result in an instant ban and user report to appropriate authorities.{'\n\n'}
                      5. Location Use{'\n'}
                      Wingman relies on location services to show airport-specific content. You must:{'\n\n'}
                      • Enable location access to use the app's core features{'\n'}
                      • Not spoof, falsify, or manipulate your location{'\n'}
                      • Not use the app for interactions outside intended airport zones{'\n\n'}
                      6. User Content{'\n'}
                      You retain rights to content you post, but by uploading it to Wingman, you grant us a non-exclusive, royalty-free, worldwide license to use, share, and display it within the app.{'\n\n'}
                      You may not post:{'\n\n'}
                      • Any illegal or explicit material{'\n'}
                      • Copyrighted material without permission{'\n'}
                      • Content that misleads or endangers others{'\n\n'}
                      We may remove or moderate content at our sole discretion.{'\n\n'}
                      7. Meetups, Events, and Chats{'\n'}
                      Wingman allows users to match, message, and join public or private events.{'\n\n'}
                      We are not responsible for:{'\n\n'}
                      • In-person meetings or what happens during them{'\n'}
                      • The accuracy or intent of user-generated events or chats{'\n'}
                      • The behavior of other users, whether online or offline{'\n\n'}
                      Always meet in public, well-lit places and use good judgment when engaging with strangers.{'\n\n'}
                      8. Termination{'\n'}
                      We may suspend, limit, or terminate your access at any time if:{'\n\n'}
                      • You breach these terms{'\n'}
                      • You behave in a way that threatens user safety{'\n'}
                      • You use the app for unintended or unlawful purposes{'\n\n'}
                      9. License Grant{'\n'}
                      You are granted a limited, non-transferable, revocable license to use the app for personal, non-commercial use only.{'\n\n'}
                      You may not:{'\n\n'}
                      • Copy, modify, or reverse engineer the app{'\n'}
                      • Use bots, scripts, or automated tools on the platform{'\n'}
                      • Sell or redistribute Wingman or its data{'\n\n'}
                      10. Limitation of Liability{'\n'}
                      Wingman is provided "as is" without warranties. We make no guarantees regarding:{'\n\n'}
                      • Matches, events, or user conduct{'\n'}
                      • Availability, uptime, or accuracy of content{'\n\n'}
                      You use Wingman at your own risk.{'\n\n'}
                      11. Changes to Terms{'\n'}
                      We may update this agreement at any time. Continued use of the app means you accept the updated terms.{'\n\n'}
                      12. Contact{'\n'}
                      For questions, concerns, or to report abuse:{'\n'}
                      matthewryan716@gmail.com{'\n\n'}
                      By using Wingman, you agree to these Terms and certify you are 18 or older.
                    </Text>
                  </ScrollView>
                </LinearGradient>
              </View>
            </Modal>
          </View>
        );
      case "image":
        return (
          <TouchableOpacity
            style={[
              styles.avatarContainer,
              showValidation && styles.fieldInvalid
            ]}
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
                isFocused && styles.inputContainerFocused,
                showValidation && styles.fieldInvalid
              ]}
              onPress={handleOpenDatePicker}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                  maximumDate={(() => {
                    const maxDate = new Date();
                    maxDate.setFullYear(maxDate.getFullYear() - 18);
                    return maxDate;
                  })()}
                  textColor="#e4fbfe"
                  themeVariant="dark"
                />
                {Platform.OS === 'ios' && (
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity 
                      style={styles.datePickerButton} 
                      onPress={handleCancelDate}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.datePickerButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.datePickerButton, styles.datePickerButtonConfirm]} 
                      onPress={handleConfirmDate}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
        const fieldOptions = selectedOptions[field.key] || [];
        return (
          <View style={[
            styles.tagsContainer,
            isFocused && styles.tagsContainerFocused,
            showValidation && styles.fieldInvalid
          ]}>
            <TouchableOpacity
              style={styles.tagsInput}
              onPress={() => openSelectionModal(field.key)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.tagsInputText,
                  !fieldOptions.length && styles.tagsInputPlaceholder
                ]}>
                  {fieldOptions.length 
                    ? `${fieldOptions.length} ${field.key === "languages" ? "languages" : field.key === "interests" ? "interests" : "countries"} selected`
                    : field.placeholder}
                </Text>
                {fieldOptions.length > 0 && (
                  <Text style={[styles.tagsInputText, { fontSize: 12, opacity: 0.7, marginTop: 4 }]}>
                    Tap to add more
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={20} color="#38a5c9" />
            </TouchableOpacity>
            {fieldOptions.length > 0 && (
              <View style={styles.tagsPreview}>
                {fieldOptions.map((option, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{option}</Text>
                    <TouchableOpacity
                      onPress={() => handleOptionRemove(option, field.key)}
                      hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                    >
                      <Feather name="x" size={16} color="#e4fbfe" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      default:
        return (
          <View style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            hasError && styles.inputContainerError,
            showValidation && styles.fieldInvalid,
          ]}>
            <Feather 
              name={field.icon} 
              size={20} 
              color={hasError ? "#ff4444" : isFocused ? "#e4fbfe" : "#38a5c9"} 
            />
            <TextInput
              style={[styles.input, hasError && styles.inputError]}
              placeholder={field.placeholder}
              placeholderTextColor={hasError ? "#ff4444" : "#38a5c9"}
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
              returnKeyType={field.key === "bio" ? "done" : "next"}
              blurOnSubmit={field.key !== "bio"}
              onSubmitEditing={() => {
                if (field.key === "bio") {
                  Keyboard.dismiss();
                  handleBlur();
                } else {
                  const currentFieldIndex = steps[stepIndex].fields.findIndex(f => f.key === field.key);
                  if (currentFieldIndex < steps[stepIndex].fields.length - 1) {
                    const nextField = steps[stepIndex].fields[currentFieldIndex + 1];
                    handleFocus(nextField.key);
                  } else {
                    Keyboard.dismiss();
                    handleBlur();
                  }
                }
              }}
              onKeyPress={({ nativeEvent }) => {
                if (field.key === "bio" && nativeEvent.key === "Enter") {
                  Keyboard.dismiss();
                  handleBlur();
                }
              }}
              keyboardAppearance="dark"
              autoComplete={field.autoComplete}
              textContentType={field.textContentType}
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
          autoComplete: "email",
          textContentType: "emailAddress",
        },
        {
          key: "password",
          label: "Password",
          icon: "lock",
          placeholder: "••••••••",
          type: "password",
          secure: true,
          autoComplete: "password",
          textContentType: "password",
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
    {
      key: "eula",
      title: "Terms & Conditions 📜",
      icon: "file-text",
      fields: [
        {
          key: "eula",
          label: "Terms of Service",
          icon: "file-text",
          type: "eula",
          placeholder: "",
        },
      ],
    },
  ];

  const renderCountryModal = () => (
    <Modal
      visible={showCountryModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCountryModal(false)}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableWithoutFeedback onPress={() => setShowCountryModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {currentField === "languages" ? "Select Languages" :
                     currentField === "interests" ? "Select Interests" :
                     currentField === "goals" ? "Select Travel Goals" :
                     "Select Countries Visited"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCountryModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeButton}
                  >
                    <Feather name="x" size={24} color="#e4fbfe" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Feather name="search" size={20} color="#38a5c9" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${currentField === "languages" ? "languages" : 
                                              currentField === "interests" ? "interests" : 
                                              currentField === "goals" ? "travel goals" :
                                              "countries"}...`}
                    placeholderTextColor="#38a5c9"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    autoComplete="off"
                    returnKeyType="done"
                    onSubmitEditing={() => setShowCountryModal(false)}
                    blurOnSubmit={true}
                    keyboardAppearance="dark"
                  />
                </View>

                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.countryItem}
                      onPress={() => handleOptionSelect(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.countryItemText}>{item}</Text>
                      <Feather name="plus" size={20} color="#38a5c9" style={styles.countryItemIcon} />
                    </TouchableOpacity>
                  )}
                  style={styles.countryList}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  contentContainerStyle={styles.countryListContent}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Feather name="search" size={24} color="#38a5c9" />
                      <Text style={styles.emptyStateText}>No results found</Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );

  if (loading) {
    return <LoadingScreen message="Creating your account..." forceDarkMode={true} />;
  }

  if (!isAuthChecked) {
    return <LoadingScreen message="Checking authentication..." forceDarkMode={true} />;
  }

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.gradient}>
      <LinearGradient
        colors={['#000000', 'transparent']}
        style={styles.fadeOverlay}
        pointerEvents="none"
      />
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
              <TouchableOpacity
                key={field.key}
                style={styles.fieldContainer}
                onPress={() => {
                  if (field.type === "date") {
                    handleOpenDatePicker();
                  } else if (field.type !== "eula") {
                    handleFocus(field.key);
                  }
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {renderField(field)}
              </TouchableOpacity>
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
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name="chevron-left"
                    size={24}
                    color="#e4fbfe"
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  (!validateCurrentStep().isValid || (stepIndex === steps.length - 1 && !userData.acceptedEula)) && styles.nextButtonDisabled
                ]}
                onPress={handleNext}
                disabled={loading || !validateCurrentStep().isValid || (stepIndex === steps.length - 1 && !userData.acceptedEula)}
                activeOpacity={0.8}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <LinearGradient
                  colors={(!validateCurrentStep().isValid || (stepIndex === steps.length - 1 && !userData.acceptedEula))
                    ? ["#1a1a1a", "#1a1a1a"] 
                    : ["#38a5c9", "#38a5c9"]}
                  style={styles.buttonGradient}
                >
                  <Text style={[
                    styles.buttonText,
                    (!validateCurrentStep().isValid || (stepIndex === steps.length - 1 && !userData.acceptedEula)) && styles.buttonTextDisabled
                  ]}>
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
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.loginText}>
                  Already have an account? Log in
                </Text>
              </TouchableOpacity>
            )}
            {renderCountryModal()}
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
    paddingTop: 20,
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
    marginBottom: 16,
    width: "100%",
    paddingHorizontal: 4,
  },
  fieldLabel: {
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
    marginBottom: 8,
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
  inputContainerError: {
    borderColor: "#ff4444",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  fieldInvalid: {
    borderColor: "#ff4444",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  inputError: {
    color: "#ff4444",
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
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 11,
    position: 'relative',
    width: avatarSize,
    height: avatarSize,
  },
  avatarContainerCompact: {
    marginBottom: 0,
    marginTop: 0,
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  defaultAvatar: {
    width: avatarSize * 0.8,
    height: avatarSize * 0.8,
    borderRadius: avatarSize / 2,
    opacity: 0.7,
  },
  avatar: {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    borderWidth: 2,
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
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#38a5c9",
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 2,
    borderColor: "#000000",
  },
  nameInputContainer: {
    flex: 1,
  },
  tagsContainer: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: 64,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tagsContainerFocused: {
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
  tagsInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.3)',
    minHeight: 48,
  },
  tagsInputText: {
    flex: 1,
    fontSize: 16,
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
  },
  tagsInputPlaceholder: {
    color: '#38a5c9',
  },
  tagsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38a5c9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tagText: {
    color: '#e4fbfe',
    fontFamily: 'Inter-Medium',
    marginRight: 8,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  backButton: {
    width: 56,
    height: 56,
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
    marginTop: 20,
    gap: 16,
  },
  datePickerButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minHeight: 48,
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
  eulaContainer: {
    width: "100%",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
    overflow: "hidden",
  },
  eulaSummary: {
    padding: 24,
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  eulaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  eulaSummaryTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#e4fbfe',
    marginLeft: 12,
  },
  eulaSummaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#e4fbfe',
    marginBottom: 20,
    lineHeight: 20,
  },
  eulaSummaryPoints: {
    marginBottom: 24,
    gap: 12,
  },
  eulaSummaryPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.2)',
  },
  eulaPointIcon: {
    marginRight: 12,
  },
  eulaPointText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#e4fbfe',
    flex: 1,
  },
  viewFullTermsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 165, 201, 0.2)',
    backgroundColor: 'rgba(56, 165, 201, 0.05)',
    borderRadius: 8,
    marginBottom: 20,
  },
  viewFullTermsText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#38a5c9',
    marginRight: 8,
  },
  eulaAcceptanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 165, 201, 0.2)',
  },
  eulaCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#38a5c9",
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  eulaCheckboxChecked: {
    backgroundColor: "#38a5c9",
  },
  eulaAcceptanceText: {
    flex: 1,
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  eulaModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    margin: 20,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitleIcon: {
    marginRight: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#e4fbfe',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#38a5c9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
    paddingVertical: 4,
  },
  countryList: {
    maxHeight: 400,
    borderRadius: 12,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#38a5c9',
    margin: 16,
    marginTop: 0,
  },
  countryListContent: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  countryItemText: {
    fontSize: 16,
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
  },
  countryItemIcon: {
    opacity: 0.7,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    padding: 6,
    borderRadius: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#38a5c9',
    fontFamily: 'Inter-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    margin: 20,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  nextButtonDisabled: {
    opacity: 0.7,
    borderColor: "#38a5c9",
    borderWidth: 1,
  },
  buttonTextDisabled: {
    color: "#38a5c9",
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenGradient: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  fullScreenTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullScreenTitleIcon: {
    marginRight: 12,
  },
  fullScreenTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#e4fbfe',
  },
  fullScreenCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
  },
  fullScreenScrollView: {
    flex: 1,
  },
  fullScreenScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  fullScreenText: {
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 4,
    width: '100%',
    justifyContent: 'center',
  },
});

export default UserOnboarding;