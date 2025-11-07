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
  StatusBar,
  Dimensions,
} from "react-native";
import { validateEmail, normalizeEmail, isDisposableEmail } from "../utils/emailValidation";
import { validatePassword, PasswordStrength } from "../utils/passwordValidation";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
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
import * as Location from 'expo-location';
import useUsers from "../hooks/useUsers";
import TopBar from "../components/TopBar";
import SafeAreaWrapper from "../components/SafeAreaWrapper";
import { ThemeContext } from "../context/ThemeContext";
import LoadingElement from "../components/LoadingElement";
import useNotificationCount from "../hooks/useNotificationCount";
import UserAvatar from "../components/UserAvatar";
import AvailabilityScheduleStep from "../components/onboarding/AvailabilityScheduleStep";
import EventPreferencesStep from "../components/onboarding/EventPreferencesStep";

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive sizing utilities
const scaleSize = (size: number) => (SCREEN_WIDTH / 375) * size; // Base on iPhone X width
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  return Math.round(size * scale);
};
const verticalScale = (size: number) => (SCREEN_HEIGHT / 812) * size; // Base on iPhone X height

// Responsive sizes
const avatarSize = scaleSize(100);
const isSmallDevice = SCREEN_WIDTH < 375; // iPhone SE
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414; // iPhone X/11 Pro
const isLargeDevice = SCREEN_WIDTH >= 414; // iPhone 11/12/13/14 Pro Max

type StepKey = "email" | "profile" | "connectionTemplate" | "connection" | "personalityTemplate" | "personality" | "schedule" | "availability" | "preferences" | "eula";

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
  type?: "text" | "password" | "image" | "tags" | "date" | "eula" | "schedule" | "radius" | "preferences" | "connectionTemplate" | "personalityTemplate" | "radiusTemplate";
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
  | "users"
  | "target"
  | "tag"
  | "clock"
  | "settings"
  | "list";

interface AvailabilitySchedule {
  monday: { start: string; end: string };
  tuesday: { start: string; end: string };
  wednesday: { start: string; end: string };
  thursday: { start: string; end: string };
  friday: { start: string; end: string };
  saturday: { start: string; end: string };
  sunday: { start: string; end: string };
}

interface EventPreferences {
  likesBars: boolean;
  prefersSmallGroups: boolean;
  prefersWeekendEvents: boolean;
  prefersEveningEvents: boolean;
  prefersIndoorVenues: boolean;
  prefersStructuredActivities: boolean;
  prefersSpontaneousPlans: boolean;
  prefersLocalMeetups: boolean;
  prefersTravelEvents: boolean;
  prefersQuietEnvironments: boolean;
  prefersActiveLifestyles: boolean;
  prefersIntellectualDiscussions: boolean;
}

interface UserData {
  email?: string;
  password?: string;
  name?: string;
  dateOfBirth?: Date;
  bio?: string;
  profilePicture?: string;
  connectionIntents?: string;
  personalTags?: string;
  languages?: string;
  availabilitySchedule?: AvailabilitySchedule;
  preferredMeetupRadius?: number;
  eventPreferences?: EventPreferences;
  acceptedEula?: boolean;
  [key: string]: string | Date | boolean | number | AvailabilitySchedule | EventPreferences | undefined;
}

const CONNECTION_INTENTS = [
  "Bar Hopping & Nightlife",
  "Sports & Athletics", 
  "Outdoor Adventures",
  "Networking & Business",
  "Creative Projects",
  "Deep Discussions",
  "Food & Dining",
  "Music & Concerts",
  "Travel & Exploration",
  "Gaming & Entertainment",
  "Fitness & Wellness",
  "Art & Culture",
  "Technology & Innovation",
  "Volunteering & Community",
  "Learning & Education",
  "Photography & Media",
  "Dancing & Social Events",
  "Board Games & Strategy",
  "Coffee & Casual Meetups",
  "Festivals & Events"
].sort();

const PERSONAL_TAGS = [
  "Christian",
  "Night Owl",
  "Straight Edge",
  "Introverted",
  "Extroverted",
  "Early Bird",
  "Coffee Addict",
  "Tea Enthusiast",
  "Bookworm",
  "Gym Rat",
  "Yoga Practitioner",
  "Meditation",
  "Vegan",
  "Vegetarian",
  "Foodie",
  "Adventure Seeker",
  "Homebody",
  "Minimalist",
  "Creative",
  "Analytical",
  "Empathetic",
  "Leader",
  "Team Player",
  "Independent",
  "Family-Oriented",
  "Career-Focused",
  "Student",
  "Entrepreneur",
  "Artist",
  "Musician",
  "Writer",
  "Photographer",
  "Tech-Savvy",
  "Old School",
  "Fashion-Forward",
  "Casual Style",
  "Pet Lover",
  "Plant Parent",
  "DIY Enthusiast",
  "Thrift Shopper",
  "Luxury Lover",
  "Budget-Conscious",
  "Spontaneous",
  "Planner",
  "Optimist",
  "Realist",
  "Sarcastic",
  "Humor-Loving",
  "Deep Thinker",
  "Action-Oriented"
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

const defaultAvailabilitySchedule: AvailabilitySchedule = {
  monday: { start: "09:00", end: "17:00" },
  tuesday: { start: "09:00", end: "17:00" },
  wednesday: { start: "09:00", end: "17:00" },
  thursday: { start: "09:00", end: "17:00" },
  friday: { start: "09:00", end: "17:00" },
  saturday: { start: "00:00", end: "00:00" },
  sunday: { start: "00:00", end: "00:00" },
};

const defaultEventPreferences: EventPreferences = {
  likesBars: false,
  prefersSmallGroups: false,
  prefersWeekendEvents: false,
  prefersEveningEvents: false,
  prefersIndoorVenues: false,
  prefersStructuredActivities: false,
  prefersSpontaneousPlans: false,
  prefersLocalMeetups: false,
  prefersTravelEvents: false,
  prefersQuietEnvironments: false,
  prefersActiveLifestyles: false,
  prefersIntellectualDiscussions: false,
};

// Grouped categories for connection intents
const CONNECTION_INTENT_CATEGORIES = [
  {
    label: "Social & Nightlife",
    intents: [
      "Bar Hopping & Nightlife",
      "Dancing & Social Events",
      "Coffee & Casual Meetups",
      "Festivals & Events",
      "Food & Dining",
      "Music & Concerts",
    ],
  },
  {
    label: "Professional & Learning",
    intents: [
      "Networking & Business",
      "Creative Projects",
      "Learning & Education",
      "Technology & Innovation",
      "Volunteering & Community",
    ],
  },
  {
    label: "Activities & Hobbies",
    intents: [
      "Sports & Athletics",
      "Outdoor Adventures",
      "Gaming & Entertainment",
      "Fitness & Wellness",
      "Art & Culture",
      "Photography & Media",
      "Board Games & Strategy",
    ],
  },
  {
    label: "Personal Growth",
    intents: [
      "Deep Discussions",
      "Travel & Exploration",
    ],
  },
];

// Personality Templates
const PERSONALITY_TEMPLATES = [
  {
    name: "The Social Butterfly",
    description: "You're outgoing, love meeting new people, and thrive in social settings.",
    icon: "users" as IconName,
    color: "#8b5cf6",
    tags: [
      "Extroverted", "Optimist", "Humor-Loving", "Spontaneous", "Creative", 
      "Team Player", "Fashion-Forward", "Coffee Addict", "Foodie", "Pet Lover"
    ]
  },
  {
    name: "The Professional",
    description: "You're career-focused, ambitious, and value meaningful professional connections.",
    icon: "briefcase" as IconName,
    color: "#3b82f6",
    tags: [
      "Analytical", "Leader", "Career-Focused", "Planner", "Tech-Savvy",
      "Student", "Entrepreneur", "Early Bird", "Minimalist"
    ]
  },
  {
    name: "The Creative Soul",
    description: "You're artistic, imaginative, and drawn to cultural experiences and self-expression.",
    icon: "camera" as IconName,
    color: "#ec4899",
    tags: [
      "Creative", "Deep Thinker", "Artist", "Musician", "Writer", "Photographer",
      "Meditation", "Plant Parent", "DIY Enthusiast"
    ]
  },
  {
    name: "The Wellness Enthusiast",
    description: "You prioritize health, mindfulness, and living a balanced, active lifestyle.",
    icon: "heart" as IconName,
    color: "#22c55e",
    tags: [
      "Gym Rat", "Yoga Practitioner", "Meditation", "Vegan", "Vegetarian",
      "Early Bird", "Minimalist", "Pet Lover", "Plant Parent"
    ]
  },
  {
    name: "The Homebody",
    description: "You enjoy quiet, comfortable environments and meaningful connections close to home.",
    icon: "user" as IconName,
    color: "#f59e0b",
    tags: [
      "Introverted", "Homebody", "Bookworm", "Tea Enthusiast", "Night Owl",
      "Minimalist", "Family-Oriented", "Casual Style", "Pet Lover", "DIY Enthusiast"
    ]
  },
  {
    name: "The Adventurer",
    description: "You're always seeking new experiences, travel, and outdoor adventures.",
    icon: "map-pin" as IconName,
    color: "#06b6d4",
    tags: [
      "Adventure Seeker", "Action-Oriented", "Spontaneous", "Photographer", 
      "Thrift Shopper", "Budget-Conscious"
    ]
  }
];

// Grouped categories for personal tags
const PERSONAL_TAG_CATEGORIES = [
  {
    label: "Personality & Lifestyle",
    tags: [
      "Introverted", "Extroverted", "Optimist", "Realist", "Sarcastic", "Humor-Loving", 
      "Deep Thinker", "Action-Oriented", "Spontaneous", "Planner", "Minimalist", "Creative",
      "Analytical", "Empathetic", "Leader", "Team Player", "Independent"
    ],
  },
  {
    label: "Daily Habits & Preferences",
    tags: [
      "Night Owl", "Early Bird", "Coffee Addict", "Tea Enthusiast", "Bookworm", "Gym Rat",
      "Yoga Practitioner", "Meditation", "Vegan", "Vegetarian", "Foodie", "Pet Lover", 
      "Plant Parent", "DIY Enthusiast"
    ],
  },
  {
    label: "Professional & Life Stage",
    tags: [
      "Student", "Entrepreneur", "Artist", "Musician", "Writer", "Photographer", 
      "Tech-Savvy", "Career-Focused", "Family-Oriented"
    ],
  },
  {
    label: "Interests & Activities",
    tags: [
      "Adventure Seeker", "Homebody", "Thrift Shopper", "Luxury Lover", "Budget-Conscious",
      "Old School", "Christian", "Straight Edge"
    ],
  },
];

// Meetup Radius Templates
const MEETUP_RADIUS_TEMPLATES = [
  {
    name: "Local Explorer",
    description: "You prefer to stay close to home and discover hidden gems in your neighborhood.",
    icon: "user" as IconName,
    color: "#22c55e",
    radius: 5,
    badge: "Local"
  },
  {
    name: "City Adventurer",
    description: "You're willing to explore your city and nearby areas for great connections.",
    icon: "map-pin" as IconName,
    color: "#3b82f6",
    radius: 10,
    badge: "Popular"
  },
  {
    name: "Regional Traveler",
    description: "You don't mind traveling further for meaningful connections and unique experiences.",
    icon: "globe" as IconName,
    color: "#8b5cf6",
    radius: 25,
    badge: "Regional"
  },
  {
    name: "Long-Distance Seeker",
    description: "You're open to traveling significant distances for exceptional connections.",
    icon: "send" as IconName,
    color: "#ec4899",
    radius: 50,
    badge: "Extended"
  }
];

const UserOnboarding = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const [userData, setUserData] = useState<UserData>({
    preferredMeetupRadius: 10, // Default radius
    availabilitySchedule: defaultAvailabilitySchedule,
    eventPreferences: defaultEventPreferences,
  });
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
    connectionIntents: [],
    personalTags: [],
    languages: []
  });
  const [showFullEula, setShowFullEula] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string | null }>({});
  const [fieldValidation, setFieldValidation] = useState<{ [key: string]: boolean }>({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedPersonalityTemplate, setSelectedPersonalityTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (user !== undefined) {
      setIsAuthChecked(true);
      if (user) router.replace("/home/dashboard");
    }
  }, [user]);

  // Listen for keyboard events
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
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  // Fade animation when changing steps
  const animateStepChange = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

  const validateCurrentStep = useCallback(() => {
    const currentStepFields = steps[stepIndex].fields;
    const validation: { [key: string]: boolean } = {};
    let isValid = true;

    // Template steps are always valid (selecting a template is optional, can proceed with manual selection)
    const currentStepKey = steps[stepIndex].key;
    if (currentStepKey === "connectionTemplate" || 
        currentStepKey === "personalityTemplate") {
      currentStepFields.forEach(field => {
        validation[field.key] = true;
      });
      return { validation, isValid: true };
    }

    currentStepFields.forEach(field => {
      let fieldIsValid = true;
      
      if (field.type === "tags") {
        // Require at least 3 selections for connection intents and personal tags
        const minSelections = (field.key === "connectionIntents" || field.key === "personalTags") ? 3 : 1;
        fieldIsValid = (selectedOptions[field.key] || []).length >= minSelections;
      } else if (field.type === "eula") {
        fieldIsValid = !!userData.acceptedEula;
      } else if (field.type === "image") {
        fieldIsValid = !!userData.profilePicture;
      } else if (field.type === "date") {
        fieldIsValid = !!userData.dateOfBirth;
      } else if (field.type === "connectionTemplate") {
        // Template steps are optional - always valid
        fieldIsValid = true;
      } else if (field.type === "personalityTemplate") {
        // Template steps are optional - always valid
        fieldIsValid = true;
      } else if (field.type === "radiusTemplate") {
        // Has a default value, always valid
        fieldIsValid = true;
      } else if (field.type === "schedule") {
        // At least one day with a valid time window
        const schedule = userData.availabilitySchedule || defaultAvailabilitySchedule;
        fieldIsValid = Object.values(schedule).some((d: any) => d.start !== d.end && d.end !== "00:00");
      } else if (field.type === "preferences") {
        // At least one selection from each category
        const prefs = userData.eventPreferences || defaultEventPreferences;
        const hasAnySocialEnv = prefs.likesBars || prefs.prefersSmallGroups || prefs.prefersQuietEnvironments || prefs.prefersIndoorVenues;
        const hasAnyTiming = prefs.prefersWeekendEvents || prefs.prefersEveningEvents || prefs.prefersStructuredActivities || prefs.prefersSpontaneousPlans;
        const hasAnyLocation = prefs.prefersLocalMeetups || prefs.prefersTravelEvents;
        const hasAnyLifestyle = prefs.prefersActiveLifestyles || prefs.prefersIntellectualDiscussions;
        fieldIsValid = hasAnySocialEnv && hasAnyTiming && hasAnyLocation && hasAnyLifestyle;
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
    if (key === "email" && typeof value === "string") {
      const emailValidation = validateEmail(value);
      setFieldErrors(prev => ({ ...prev, [key]: emailValidation.isValid ? null : emailValidation.message }));
      if (emailValidation.isValid && isDisposableEmail(value)) {
        setFieldErrors(prev => ({ ...prev, [key]: "Temporary or disposable email addresses are not allowed" }));
      }
      value = normalizeEmail(value);
    } else if (key === "password" && typeof value === "string") {
      const passwordValidation = validatePassword(value);
      setPasswordStrength(passwordValidation);
      setFieldErrors(prev => ({ ...prev, [key]: passwordValidation.isValid ? null : passwordValidation.feedback.join('. ') }));
    } else if (key === "name" && typeof value === "string") {
      if (containsFilteredContent(value)) {
        setFieldErrors(prev => ({ ...prev, [key]: "Name contains inappropriate content" }));
        value = value
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");
      } else {
        setFieldErrors(prev => ({ ...prev, [key]: null }));
      }
    } else if (key === "bio" && typeof value === "string") {
      if (containsFilteredContent(value)) {
        setFieldErrors(prev => ({ ...prev, [key]: "Bio contains inappropriate content" }));
        value = value.charAt(0).toUpperCase() + value.slice(1);
      } else {
        setFieldErrors(prev => ({ ...prev, [key]: null }));
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
      animateStepChange(() => setStepIndex((prev) => prev + 1));
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    try {
      // Reset all errors
      setFieldErrors({});

      // Validate required fields
      if (!userData.email || !userData.password) {
        Alert.alert("Error", "Email and password are required");
        return;
      }

      // Validate email
      const emailValidation = validateEmail(userData.email);
      if (!emailValidation.isValid) {
        Alert.alert("Invalid Email", emailValidation.message);
        return;
      }

      // Check for disposable email
      if (isDisposableEmail(userData.email)) {
        Alert.alert("Invalid Email", "Temporary or disposable email addresses are not allowed");
        return;
      }

      // Validate password strength
      const passwordValidation = validatePassword(userData.password);
      if (!passwordValidation.isValid) {
        Alert.alert("Weak Password", passwordValidation.feedback.join('\n'));
        return;
      }

      if (!userData.acceptedEula) {
        Alert.alert("Error", "You must accept the terms and conditions");
        return;
      }

      const age = userData.dateOfBirth 
        ? Math.floor((new Date().getTime() - (userData.dateOfBirth as Date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

      // Get location
      let currentCity = null;
      let lastKnownCoordinates = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          lastKnownCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          };
          
          // Get city from reverse geocoding
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          });
          
          if (reverseGeocode.length > 0) {
            currentCity = reverseGeocode[0].city || reverseGeocode[0].subregion || reverseGeocode[0].region || 'Unknown';
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
        // Set default values if location fails
        currentCity = 'Unknown';
        lastKnownCoordinates = { latitude: 0, longitude: 0 };
      }

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
        connectionIntents: userData.connectionIntents?.split(/,\s*/).filter(i => i.length > 0) || [],
        personalTags: userData.personalTags?.split(/,\s*/).filter(t => t.length > 0) || [],
        languages: userData.languages?.split(/,\s*/).filter(l => l.length > 0) || [],
        availabilitySchedule: userData.availabilitySchedule || defaultAvailabilitySchedule,
        preferredMeetupRadius: userData.preferredMeetupRadius || 10,
        eventPreferences: userData.eventPreferences || defaultEventPreferences,
        currentCity: currentCity || 'Unknown',
        lastKnownCoordinates: lastKnownCoordinates || { latitude: 0, longitude: 0 },
        availableNow: true,
        groupAffiliations: [],
        isAnonymous: false,
        moodStatus: "neutral",
        acceptedEula: true,
        eulaAcceptedAt: serverTimestamp(),
        lastLogin: serverTimestamp(), // Set lastLogin when user is created so they appear in swipe/swipe
        expoPushToken: expoPushToken,
        notifications: [], // Initialize notifications array for new users
        notificationPreferences: {
          announcements: true,
          chats: true,
          connections: true,
          activities: true,
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
      case "connectionIntents":
        return CONNECTION_INTENTS;
      case "personalTags":
        return PERSONAL_TAGS;
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
                <UserAvatar
                  user={userData}
                  size={avatarSize}
                  style={styles.avatar}
                />
                <View style={styles.cameraBadge}>
                  <Feather name="camera" size={scaleSize(16)} color="#000000" />
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
                    size={scaleSize(20)} 
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
                <Feather name="file-text" size={scaleSize(24)} color="#38a5c9" />
                <Text style={styles.eulaSummaryTitle}>Terms & Conditions</Text>
              </View>
              <Text style={styles.eulaSummaryText}>
                By using Wingman, you agree to our Terms of Service and Privacy Policy. Here are the key points you should know:
              </Text>
              <View style={styles.eulaSummaryPoints}>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="user" size={scaleSize(16)} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>You must be 18 or older</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="lock" size={scaleSize(16)} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>One account per person</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="shield" size={scaleSize(16)} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>Zero tolerance for harassment</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="map-pin" size={scaleSize(16)} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>Location services required</Text>
                </View>
                <View style={styles.eulaSummaryPoint}>
                  <Feather name="users" size={scaleSize(16)} color="#38a5c9" style={styles.eulaPointIcon} />
                  <Text style={styles.eulaPointText}>Meet in public places</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewFullTermsButton}
                onPress={() => setShowFullEula(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewFullTermsText}>View Full Terms</Text>
                <Feather name="chevron-right" size={scaleSize(20)} color="#38a5c9" />
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
                    <Feather name="check" size={scaleSize(20)} color="#e4fbfe" />
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
                      <Feather name="file-text" size={scaleSize(24)} color="#38a5c9" style={styles.fullScreenTitleIcon} />
                      <Text style={styles.fullScreenTitle}>Terms & Conditions</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowFullEula(false)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.fullScreenCloseButton}
                    >
                      <Feather name="x" size={scaleSize(24)} color="#e4fbfe" />
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
            <UserAvatar
              user={userData}
              size={avatarSize}
              style={styles.avatar}
            />
            <View style={styles.cameraBadge}>
              <Feather name="camera" size={scaleSize(16)} color="#000000" />
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
                size={scaleSize(20)} 
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
        const minRequired = (field.key === "connectionIntents" || field.key === "personalTags") ? 3 : 1;
        const isComplete = fieldOptions.length >= minRequired;
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
                    ? `${fieldOptions.length} ${field.key === "languages" ? "languages" : field.key === "connectionIntents" ? "interests" : field.key === "personalTags" ? "tags" : "items"} selected`
                    : field.placeholder}
                </Text>
                <Text style={[
                  styles.tagsInputSubtext,
                  isComplete && styles.tagsInputSubtextComplete
                ]}>
                  {isComplete 
                    ? "✓ Complete - Tap to add more" 
                    : `Required: ${fieldOptions.length}/${minRequired} minimum`}
                </Text>
              </View>
              <Feather name="chevron-right" size={scaleSize(20)} color="#38a5c9" />
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
                      <Feather name="x" size={scaleSize(16)} color="#e4fbfe" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      case "schedule":
        return (
          <AvailabilityScheduleStep
            availabilitySchedule={userData.availabilitySchedule || defaultAvailabilitySchedule}
            onScheduleChange={(schedule) => {
              setUserData(prev => ({ ...prev, availabilitySchedule: schedule }));
            }}
          />
        );
      case "connectionTemplate":
        return (
          <View style={styles.templateContainer}>
            <Text style={styles.templateSubtitle}>
              Tap any category to quickly select related interests. You can customize these on the next step.
            </Text>
            {CONNECTION_INTENT_CATEGORIES.map((category, index) => (
              <View key={index} style={styles.categorySection}>
                <View style={styles.categoryHeaderRow}>
                  <Text style={styles.categoryLabel}>{category.label}</Text>
                  <Text style={styles.categoryCount}>
                    {category.intents.filter(i => selectedOptions.connectionIntents?.includes(i)).length}/{category.intents.length} selected
                  </Text>
                </View>
                <View style={styles.intentChipsContainer}>
                  {category.intents.map((intent) => {
                    const isSelected = selectedOptions.connectionIntents?.includes(intent);
                    return (
                      <TouchableOpacity
                        key={intent}
                        style={[
                          styles.intentChip,
                          isSelected && styles.intentChipSelected
                        ]}
                        onPress={() => {
                          const currentIntents = selectedOptions.connectionIntents || [];
                          let newIntents;
                          if (isSelected) {
                            newIntents = currentIntents.filter(i => i !== intent);
                          } else {
                            newIntents = [...currentIntents, intent];
                          }
                          setSelectedOptions(prev => ({
                            ...prev,
                            connectionIntents: newIntents
                          }));
                          handleInputChange("connectionIntents", newIntents.join(", "));
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.intentChipText,
                          isSelected && styles.intentChipTextSelected
                        ]}>
                          {intent}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        );
      case "personalityTemplate":
        return (
          <View style={styles.templateContainer}>
            <Text style={styles.templateSubtitle}>
              Select a personality type that best describes you. You can fine-tune your tags on the next step.
            </Text>
            <View style={styles.personalityTemplatesGrid}>
              {PERSONALITY_TEMPLATES.map((template, index) => {
                const isSelected = selectedPersonalityTemplate === template.name;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.personalityTemplateCard,
                      isSelected && styles.templateCardSelected
                    ]}
                    onPress={() => {
                      // Set the tags from the template
                      setSelectedPersonalityTemplate(template.name);
                      setSelectedOptions(prev => ({
                        ...prev,
                        personalTags: template.tags
                      }));
                      handleInputChange("personalTags", template.tags.join(", "));
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.templateCardHeader, { backgroundColor: template.color + '20' }]}>
                      <Feather name={template.icon} size={scaleSize(isSmallDevice ? 20 : 24)} color={template.color} />
                    </View>
                    <Text style={styles.templateCardTitle}>{template.name}</Text>
                    <Text style={styles.templateCardDescription}>{template.description}</Text>
                    {isSelected && (
                      <View style={styles.templateSelectedBadge}>
                        <Feather name="check-circle" size={scaleSize(20)} color="#22c55e" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      case "radiusTemplate":
        return (
          <View style={styles.templateContainer}>
            <Text style={styles.templateSubtitle}>
              Choose how far you're willing to travel for meetups and connections. You can change this anytime in settings.
            </Text>
            <View style={styles.radiusTemplatesContainer}>
              {MEETUP_RADIUS_TEMPLATES.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.radiusTemplateCard,
                    (userData.preferredMeetupRadius || 10) === template.radius && styles.radiusTemplateCardSelected
                  ]}
                  onPress={() => handleInputChange("preferredMeetupRadius", template.radius)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radiusTemplateHeader, { backgroundColor: template.color + '20' }]}>
                    <Feather name={template.icon} size={scaleSize(isSmallDevice ? 24 : 28)} color={template.color} />
                    <View style={[styles.radiusBadge, { backgroundColor: template.color }]}>
                      <Text style={styles.radiusBadgeText}>{template.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.radiusTemplateTitle}>{template.name}</Text>
                  <Text style={styles.radiusTemplateDescription}>{template.description}</Text>
                  <View style={styles.radiusTemplateFooter}>
                    <Text style={[styles.radiusTemplateValue, { color: template.color }]}>
                      {template.radius} miles
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case "radius":
        return (
          <View style={styles.radiusContainer}>
            {[5, 10, 25, 50].map((radius) => (
              <TouchableOpacity
                key={radius}
                style={[
                  styles.radiusOption,
                  (userData.preferredMeetupRadius || 10) === radius && styles.radiusOptionSelected
                ]}
                onPress={() => handleInputChange("preferredMeetupRadius", radius)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.radiusOptionText,
                  (userData.preferredMeetupRadius || 10) === radius && styles.radiusOptionTextSelected
                ]}>
                  {radius} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      case "preferences":
        return (
          <EventPreferencesStep
            eventPreferences={userData.eventPreferences || defaultEventPreferences}
            onPreferencesChange={(preferences) => {
              setUserData(prev => ({ ...prev, eventPreferences: preferences }));
            }}
          />
        );
      default:
        return (
          <View style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
            hasError && styles.inputContainerError,
            showValidation && styles.fieldInvalid,
            field.key === "bio" && styles.bioInputContainer,
          ]}>
            <Feather 
              name={field.icon} 
              size={scaleSize(20)} 
              color={hasError ? "#ff4444" : isFocused ? "#e4fbfe" : "#38a5c9"} 
              style={field.key === "bio" && styles.bioIcon}
            />
            <TextInput
              style={[
                styles.input, 
                hasError && styles.inputError,
                field.key === "bio" && styles.bioInput
              ]}
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
      title: "Let's Get You Started! 🚀",
      icon: "send",
      fields: [
        {
          key: "email",
          label: "Email",
          icon: "mail",
          placeholder: "your@email.com",
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
      title: "Tell Us About You 👤",
      icon: "user",
      fields: [
        {
          key: "name",
          label: "Full Name",
          icon: "user",
          placeholder: "Alex Johnson",
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
          placeholder: "Tell us a bit about yourself...",
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
      key: "connectionTemplate",
      title: "Choose Your Connection Type 🎯",
      icon: "users",
      fields: [
        {
          key: "connectionTemplate",
          label: "Connection Categories",
          icon: "target",
          placeholder: "Select from categories...",
          type: "connectionTemplate",
        },
      ],
    },
    {
      key: "connection",
      title: "Fine-tune Your Interests ⚡",
      icon: "target",
      fields: [
        {
          key: "connectionIntents",
          label: "Connection Interests",
          icon: "target",
          placeholder: "Select what you're interested in...",
          type: "tags",
        },
      ],
    },
    {
      key: "personalityTemplate",
      title: "What's Your Personality Type? 🌟",
      icon: "heart",
      fields: [
        {
          key: "personalityTemplate",
          label: "Personality Template",
          icon: "heart",
          placeholder: "Choose a template...",
          type: "personalityTemplate",
        },
      ],
    },
    {
      key: "personality",
      title: "Fine-tune Your Personality 💫",
      icon: "tag",
      fields: [
        {
          key: "personalTags",
          label: "Personal Tags",
          icon: "tag",
          placeholder: "Tags that describe you...",
          type: "tags",
        },
        {
          key: "languages",
          label: "Languages",
          icon: "globe",
          placeholder: "Languages you speak...",
          type: "tags",
        },
      ],
    },
    {
      key: "schedule",
      title: "When Are You Available? ⏰",
      icon: "clock",
      fields: [
        {
          key: "availabilitySchedule",
          label: "Availability Schedule",
          icon: "clock",
          placeholder: "Set your weekly availability...",
          type: "schedule",
        },
      ],
    },
    {
      key: "availability",
      title: "How Far Will You Travel? 📍",
      icon: "map-pin",
      fields: [
        {
          key: "preferredMeetupRadius",
          label: "Meetup Radius",
          icon: "map-pin",
          placeholder: "How far will you travel?",
          type: "radiusTemplate",
        },
      ],
    },
    {
      key: "preferences",
      title: "How Do You Like to Connect? 🎉",
      icon: "settings",
      fields: [
        {
          key: "eventPreferences",
          label: "Event Preferences",
          icon: "list",
          placeholder: "Your preferences...",
          type: "preferences",
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
                     currentField === "connectionIntents" ? "Select Connection Interests" :
                     currentField === "personalTags" ? "Select Personal Tags" :
                     "Select Options"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCountryModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeButton}
                  >
                    <Feather name="x" size={scaleSize(24)} color="#e4fbfe" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Feather name="search" size={scaleSize(20)} color="#38a5c9" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${currentField === "languages" ? "languages" : 
                                              currentField === "connectionIntents" ? "connection interests" : 
                                              currentField === "personalTags" ? "personal tags" :
                                              "options"}...`}
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
                      <Feather name="plus" size={scaleSize(20)} color="#38a5c9" style={styles.countryItemIcon} />
                    </TouchableOpacity>
                  )}
                  style={styles.countryList}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                  contentContainerStyle={styles.countryListContent}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Feather name="search" size={scaleSize(24)} color="#38a5c9" />
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

  // Render progress indicator
  const renderProgressIndicator = () => {
    const progress = ((stepIndex + 1) / steps.length) * 100;
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Step {stepIndex + 1} of {steps.length} • {Math.round(progress)}% Complete
        </Text>
      </View>
    );
  };

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.gradient}>
      <LinearGradient
        colors={['#000000', 'transparent']}
        style={styles.fadeOverlay}
        pointerEvents="none"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        enabled={true}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View 
              style={[
                styles.contentContainer,
                { opacity: fadeAnim }
              ]}
            >
            {renderProgressIndicator()}
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
                  onPress={() => animateStepChange(() => setStepIndex((prev) => prev - 1))}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.backButtonContent}>
                    <Feather
                      name="chevron-left"
                      size={scaleSize(20)}
                      color="#e4fbfe"
                    />
                    <Text style={styles.backButtonText}>Back</Text>
                  </View>
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
                    ? ["#333", "#1a1a1a"] 
                    : ["#38a5c9", "#2a8aa8"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={[
                    styles.buttonText,
                    (!validateCurrentStep().isValid || (stepIndex === steps.length - 1 && !userData.acceptedEula)) && styles.buttonTextDisabled
                  ]}>
                    {stepIndex === steps.length - 1
                      ? "Get Started 🚀"
                      : "Continue"}
                  </Text>
                  {!(stepIndex === steps.length - 1) && (
                    <Feather name="arrow-right" size={scaleSize(18)} color={
                      (!validateCurrentStep().isValid || (stepIndex === steps.length - 1 && !userData.acceptedEula))
                        ? "#666"
                        : "#fff"
                    } style={styles.buttonIcon} />
                  )}
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
    paddingTop: verticalScale(5),
    paddingBottom: verticalScale(20),
  },
  contentContainer: {
    width: "100%",
    paddingHorizontal: scaleSize(20),
    paddingVertical: verticalScale(15),
    paddingBottom: verticalScale(20),
    alignItems: "center",
    marginTop: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(30),
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  progressBarContainer: {
    width: '100%',
    height: verticalScale(4),
    backgroundColor: 'rgba(56, 165, 201, 0.2)',
    borderRadius: scaleSize(2),
    marginBottom: verticalScale(12),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38a5c9',
    borderRadius: scaleSize(2),
  },
  progressText: {
    color: '#38a5c9',
    fontSize: scaleFont(12),
    fontFamily: 'Inter-Medium',
  },
  title: {
    fontSize: scaleFont(isSmallDevice ? 22 : 24),
    fontFamily: "Inter-Bold",
    color: "#e4fbfe",
    textAlign: "center",
    marginBottom: verticalScale(16),
    paddingHorizontal: scaleSize(8),
    lineHeight: scaleFont(isSmallDevice ? 28 : 30),
  },
  fieldContainer: {
    marginBottom: verticalScale(12),
    width: "100%",
    paddingHorizontal: scaleSize(4),
  },
  fieldLabel: {
    color: "#e4fbfe",
    fontFamily: "Inter-Medium",
    marginBottom: verticalScale(8),
    fontSize: scaleFont(14),
    paddingLeft: scaleSize(4),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: scaleSize(12),
    padding: scaleSize(isSmallDevice ? 12 : 16),
    borderWidth: 1,
    borderColor: "#38a5c9",
    minHeight: verticalScale(isSmallDevice ? 56 : 64),
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
    marginLeft: scaleSize(12),
    fontSize: scaleFont(16),
    color: "#e4fbfe",
    fontFamily: "Inter-Regular",
    minHeight: verticalScale(40),
    paddingVertical: verticalScale(8),
  },
  bioInputContainer: {
    minHeight: verticalScale(110),
    alignItems: "flex-start",
    paddingVertical: scaleSize(14),
  },
  bioIcon: {
    marginTop: scaleSize(4),
  },
  bioInput: {
    minHeight: verticalScale(90),
    maxHeight: verticalScale(140),
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: verticalScale(11),
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
  tagsInputSubtext: {
    fontSize: scaleFont(12),
    color: '#ef4444',
    fontFamily: 'Inter-Regular',
    marginTop: verticalScale(4),
  },
  tagsInputSubtextComplete: {
    color: '#22c55e',
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
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: verticalScale(20),
    marginBottom: verticalScale(10),
    width: "100%",
    gap: scaleSize(12),
  },
  backButton: {
    paddingVertical: verticalScale(12),
    paddingHorizontal: scaleSize(isSmallDevice ? 12 : 16),
    borderRadius: scaleSize(12),
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    borderWidth: 1,
    borderColor: "#38a5c9",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(6),
  },
  backButtonText: {
    color: '#e4fbfe',
    fontSize: scaleFont(14),
    fontFamily: 'Inter-SemiBold',
  },
  nextButton: {
    borderRadius: scaleSize(12),
    overflow: "hidden",
    flex: 1,
    shadowColor: "#38a5c9",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minHeight: verticalScale(isSmallDevice ? 52 : 56),
  },
  nextButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    paddingVertical: verticalScale(isSmallDevice ? 14 : 16),
    paddingHorizontal: scaleSize(isSmallDevice ? 20 : 24),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: 'row',
    gap: scaleSize(8),
  },
  buttonIcon: {
    marginLeft: scaleSize(4),
  },
  buttonText: {
    color: "#ffffff",
    fontFamily: "Inter-Bold",
    fontSize: scaleFont(16),
  },
  buttonTextDisabled: {
    color: "#666666",
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
  radiusContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  radiusOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#38a5c9',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusOptionSelected: {
    backgroundColor: '#38a5c9',
    borderColor: '#38a5c9',
  },
  radiusOptionText: {
    color: '#38a5c9',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  radiusOptionTextSelected: {
    color: '#000000',
  },
  // Template Styles
  templateContainer: {
    width: '100%',
  },
  templateSubtitle: {
    color: '#38a5c9',
    fontSize: scaleFont(13),
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: verticalScale(16),
    paddingHorizontal: scaleSize(12),
  },
  categorySection: {
    marginBottom: verticalScale(16),
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  categoryLabel: {
    color: '#e4fbfe',
    fontSize: scaleFont(15),
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
  },
  categoryCount: {
    color: '#38a5c9',
    fontSize: scaleFont(12),
    fontFamily: 'Inter-Medium',
  },
  intentChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleSize(8),
  },
  intentChip: {
    paddingVertical: verticalScale(isSmallDevice ? 8 : 10),
    paddingHorizontal: scaleSize(isSmallDevice ? 12 : 16),
    borderRadius: scaleSize(20),
    borderWidth: 1.5,
    borderColor: 'rgba(56, 165, 201, 0.5)',
    backgroundColor: 'rgba(26, 26, 26, 0.6)',
  },
  intentChipSelected: {
    borderColor: '#38a5c9',
    backgroundColor: 'rgba(56, 165, 201, 0.2)',
    shadowColor: '#38a5c9',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  intentChipText: {
    color: '#9ca3af',
    fontSize: scaleFont(isSmallDevice ? 12 : 13),
    fontFamily: 'Inter-SemiBold',
  },
  intentChipTextSelected: {
    color: '#e4fbfe',
  },
  personalityTemplatesGrid: {
    gap: scaleSize(10),
  },
  personalityTemplateCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: scaleSize(16),
    padding: scaleSize(isSmallDevice ? 14 : 16),
    borderWidth: 1.5,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  templateCardSelected: {
    borderColor: '#22c55e',
    borderWidth: 2,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    shadowColor: '#22c55e',
    shadowOpacity: 0.3,
    elevation: 6,
  },
  templateSelectedBadge: {
    position: 'absolute',
    top: scaleSize(12),
    right: scaleSize(12),
  },
  templateCardHeader: {
    width: scaleSize(isSmallDevice ? 40 : 44),
    height: scaleSize(isSmallDevice ? 40 : 44),
    borderRadius: scaleSize(isSmallDevice ? 20 : 22),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(10),
  },
  templateCardTitle: {
    color: '#e4fbfe',
    fontSize: scaleFont(isSmallDevice ? 15 : 16),
    fontFamily: 'Inter-Bold',
    marginBottom: verticalScale(6),
  },
  templateCardDescription: {
    color: '#9ca3af',
    fontSize: scaleFont(isSmallDevice ? 12 : 13),
    fontFamily: 'Inter-Regular',
    lineHeight: scaleFont(isSmallDevice ? 16 : 18),
  },
  radiusTemplatesContainer: {
    gap: scaleSize(10),
  },
  radiusTemplateCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: scaleSize(16),
    padding: scaleSize(isSmallDevice ? 14 : 16),
    borderWidth: 2,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  radiusTemplateCardSelected: {
    borderColor: '#38a5c9',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    shadowColor: '#38a5c9',
    shadowOpacity: 0.4,
    elevation: 6,
  },
  radiusTemplateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(10),
    padding: scaleSize(10),
    borderRadius: scaleSize(12),
  },
  radiusBadge: {
    paddingVertical: verticalScale(3),
    paddingHorizontal: scaleSize(10),
    borderRadius: scaleSize(10),
  },
  radiusBadgeText: {
    color: '#000',
    fontSize: scaleFont(11),
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  radiusTemplateTitle: {
    color: '#e4fbfe',
    fontSize: scaleFont(isSmallDevice ? 15 : 16),
    fontFamily: 'Inter-Bold',
    marginBottom: verticalScale(6),
  },
  radiusTemplateDescription: {
    color: '#9ca3af',
    fontSize: scaleFont(isSmallDevice ? 12 : 13),
    fontFamily: 'Inter-Regular',
    lineHeight: scaleFont(isSmallDevice ? 16 : 18),
    marginBottom: verticalScale(10),
  },
  radiusTemplateFooter: {
    alignItems: 'flex-start',
  },
  radiusTemplateValue: {
    fontSize: scaleFont(15),
    fontFamily: 'Inter-Bold',
  },
});

export default UserOnboarding;