import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  Alert,
  Switch,
  Modal,
  Image,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ThemeContext } from "../context/ThemeContext";

import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebaseConfig";
import useAuth from "../hooks/auth";
import LoadingScreen from "../components/LoadingScreen";

// Import options/constants from onboarding

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

const GROUP_AFFILIATIONS = [
  "Solo Traveler", "Family", "Business Group", "Tour Group", "Friends"
];

const EVENT_PREFERENCES_OPTIONS: Array<{
  key: keyof EventPreferences;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}> = [
  { key: 'likesBars', label: 'Like Bars & Nightlife', icon: 'local-bar' },
  { key: 'prefersSmallGroups', label: 'Prefer Small Groups', icon: 'group' },
  { key: 'prefersQuietEnvironments', label: 'Prefer Quiet Environments', icon: 'volume-off' },
  { key: 'prefersIndoorVenues', label: 'Prefer Indoor Venues', icon: 'home' },
  { key: 'prefersWeekendEvents', label: 'Prefer Weekend Events', icon: 'weekend' },
  { key: 'prefersEveningEvents', label: 'Prefer Evening Events', icon: 'nights-stay' },
  { key: 'prefersStructuredActivities', label: 'Prefer Structured Activities', icon: 'schedule' },
  { key: 'prefersSpontaneousPlans', label: 'Prefer Spontaneous Plans', icon: 'flash-on' },
  { key: 'prefersLocalMeetups', label: 'Prefer Local Meetups', icon: 'location-on' },
  { key: 'prefersTravelEvents', label: 'Prefer Travel Events', icon: 'flight' },
  { key: 'prefersActiveLifestyles', label: 'Prefer Active Lifestyles', icon: 'fitness-center' },
  { key: 'prefersIntellectualDiscussions', label: 'Prefer Intellectual Discussions', icon: 'psychology' },
];

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

const defaultEventPreferences: EventPreferences = {
  likesBars: false,
  prefersSmallGroups: true,
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

const EVENT_PREFERENCES = [
  { key: "likesBars", label: "Likes Bars" },
  { key: "prefersSmallGroups", label: "Prefers Small Groups" },
];

const steps = [
  { key: "welcome", label: "Welcome Back", title: "Welcome Back!" },
  { key: "availabilitySchedule", label: "Set Your Weekly Availability", title: "When Are You Available?" },
  { key: "connectionTemplate", label: "Choose Your Type", title: "What Type Are You?" },
  { key: "connectionIntents", label: "Customize Your Interests", title: "Fine-tune Your Selection" },
  { key: "eventPreferences", label: "Event Preferences", title: "How Do You Like to Connect?" },
  { key: "personalTagsTemplate", label: "Choose Your Personality", title: "What's Your Personality Type?" },
  { key: "personalTags", label: "Customize Your Tags", title: "Fine-tune Your Personality" },
  { key: "meetupRadius", label: "Meetup Radius", title: "How Far Will You Travel?" },
  { key: "profilePicture", label: "Upload Profile Picture", title: "Add Your Photo & Bio" },
];

const defaultAvailability: AvailabilitySchedule = {
  sunday: { start: "10:00", end: "22:00" },
  monday: { start: "17:00", end: "22:00" },
  tuesday: { start: "17:00", end: "22:00" },
  wednesday: { start: "17:00", end: "22:00" },
  thursday: { start: "17:00", end: "22:00" },
  friday: { start: "17:00", end: "22:00" },
  saturday: { start: "10:00", end: "22:00" },
};

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
      "Tech-Savvy", "Career-Focused", "Family-Oriented", "Remote Worker"
    ],
  },
  {
    label: "Interests & Activities",
    tags: [
      "Adventure Seeker", "Homebody", "Thrift Shopper", "Luxury Lover", "Budget-Conscious",
      "Fashion-Forward", "Casual Style", "Old School", "Christian", "Straight Edge"
    ],
  },
];

export default function ProfileComplete() {
  const router = useRouter();
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Time picker state
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [currentTimePicker, setCurrentTimePicker] = useState<{ day: string; type: 'start' | 'end' } | null>(null);

  // Form state for each field
  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>(defaultAvailability);
  const [availableNow, setAvailableNow] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string>("");

  const [connectionIntents, setConnectionIntents] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [eventPreferences, setEventPreferences] = useState<EventPreferences>({ ...defaultEventPreferences });
  const [personalTags, setPersonalTags] = useState<string[]>([]);
  const [preferredMeetupRadius, setPreferredMeetupRadius] = useState<number>(10);
  const [expandedPersonalTagCategories, setExpandedPersonalTagCategories] = useState<string[]>([]);
  const [userBio, setUserBio] = useState<string>("");
  const scrollViewRef = useRef<any>(null);

  // Animation values for content
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

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

  // Personality Templates for Personal Tags
  const PERSONALITY_TEMPLATES = [
    {
      name: "The Social Butterfly",
      description: "You're outgoing, love meeting new people, and thrive in social settings.",
      icon: "users",
      color: "#8b5cf6",
      tags: [
        "Extroverted", "Optimist", "Humor-Loving", "Spontaneous", "Creative", 
        "Team Player", "Fashion-Forward", "Coffee Addict", "Foodie", "Pet Lover"
      ]
    },
    {
      name: "The Professional",
      description: "You're career-focused, ambitious, and value meaningful professional connections.",
      icon: "briefcase", 
      color: "#3b82f6",
      tags: [
        "Analytical", "Leader", "Career-Focused", "Planner", "Tech-Savvy",
        "Student", "Entrepreneur", "Remote Worker", "Early Bird", "Minimalist"
      ]
    },
    {
      name: "The Creative Soul",
      description: "You're artistic, imaginative, and drawn to cultural experiences and self-expression.",
      icon: "image",
      color: "#ec4899", 
      tags: [
        "Creative", "Deep Thinker", "Artist", "Musician", "Writer", "Photographer",
        "Art & Culture", "Meditation", "Plant Parent", "DIY Enthusiast"
      ]
    },
    {
      name: "The Wellness Enthusiast",
      description: "You prioritize health, mindfulness, and living a balanced, active lifestyle.",
      icon: "heart",
      color: "#22c55e",
      tags: [
        "Gym Rat", "Yoga Practitioner", "Meditation", "Vegan", "Vegetarian",
        "Fitness & Wellness", "Early Bird", "Minimalist", "Pet Lover", "Plant Parent"
      ]
    },
    {
      name: "The Homebody",
      description: "You enjoy quiet, comfortable environments and meaningful connections close to home.",
      icon: "home",
      color: "#f59e0b",
      tags: [
        "Introverted", "Homebody", "Bookworm", "Tea Enthusiast", "Night Owl",
        "Minimalist", "Family-Oriented", "Casual Style", "Pet Lover", "DIY Enthusiast"
      ]
    },
    {
      name: "The Adventurer",
      description: "You're always seeking new experiences, travel, and outdoor adventures.",
      icon: "compass",
      color: "#06b6d4",
      tags: [
        "Adventure Seeker", "Action-Oriented", "Spontaneous", "Travel & Exploration",
        "Outdoor Activities", "Photographer", "Thrift Shopper", "Budget-Conscious"
      ]
    }
  ];

  // Meetup Radius Templates
  const MEETUP_RADIUS_TEMPLATES = [
    {
      name: "Local Explorer",
      description: "You prefer to stay close to home and discover hidden gems in your neighborhood.",
      icon: "home",
      color: "#22c55e",
      radius: 5,
      badge: "Local"
    },
    {
      name: "City Adventurer", 
      description: "You're willing to explore your city and nearby areas for great connections.",
      icon: "location-city",
      color: "#3b82f6",
      radius: 10,
      badge: "Popular"
    },
    {
      name: "Regional Traveler",
      description: "You don't mind traveling further for meaningful connections and unique experiences.",
      icon: "public",
      color: "#8b5cf6", 
      radius: 25,
      badge: "Regional"
    },
    {
      name: "Long-Distance Seeker",
      description: "You're open to traveling significant distances for exceptional connections.",
      icon: "flight",
      color: "#ec4899",
      radius: 50,
      badge: "Extended"
    }
  ];

  // Load user data
  useEffect(() => {
    const fetchUser = async () => {
      if (!user) return;
      setLoading(true);
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        
        // Check if notificationPreferences exists and has all required fields
        const hasNotificationPreferences = data.notificationPreferences && 
          typeof data.notificationPreferences === 'object' &&
          'announcements' in data.notificationPreferences &&
          'chats' in data.notificationPreferences &&
          'connections' in data.notificationPreferences &&
          'events' in data.notificationPreferences &&
          'notificationsEnabled' in data.notificationPreferences;

        // If notification preferences don't exist, create them with all values set to true
        if (!hasNotificationPreferences) {
          const defaultNotificationPreferences = {
            announcements: true,
            chats: true,
            connections: true,
            events: true,
            notificationsEnabled: true
          };

          // Update the user document with default notification preferences
          await updateDoc(userRef, {
            notificationPreferences: defaultNotificationPreferences
          });

          console.log('✅ Added default notificationPreferences to user document');
        }
        
        // Check if existing availability schedule is valid (has at least one day with non-zero times)
        const existingSchedule = data.availabilitySchedule;
        const isValidSchedule = existingSchedule && 
          Object.values(existingSchedule).some((d: any) => 
            d.start !== "00:00" && d.end !== "00:00" && d.start !== d.end
          );
        
        setAvailabilitySchedule(isValidSchedule ? existingSchedule : defaultAvailability);
        setAvailableNow(data.availableNow ?? true);
        setProfilePicture(data.profilePicture || "");
        setConnectionIntents(data.connectionIntents || []);
        setEventPreferences(data.eventPreferences || { ...defaultEventPreferences });
        setPersonalTags(data.personalTags || []);
        setPreferredMeetupRadius(data.preferredMeetupRadius || 10);
        setUserBio(data.bio || "");
      }
      setLoading(false);
    };
    fetchUser();
  }, [user]);



  // Add effect for bounce animation when loading completes
  useEffect(() => {
    if (!loading && userData) {
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
    }
  }, [loading, userData]);

  // Get location when reaching step 7 (profile picture)
  useEffect(() => {
    const getCurrentLocation = async () => {
      if (stepIndex === 7) { // Step 8 (profile picture)
        try {
          // Request location permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('Location permission denied');
            return;
          }

          // Get current position
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          const { latitude, longitude } = location.coords;
          console.log('Current coordinates:', { latitude, longitude });

          // Reverse geocode to get city
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });

          if (reverseGeocode.length > 0) {
            const address = reverseGeocode[0];
            const currentCity = address.city || address.subregion || address.region || 'Unknown';
            const currentState = address.region || address.subregion || 'Unknown';
            const stateAbbreviation = address.region || 'Unknown';
            
            const locationString = currentCity && currentState && currentCity !== currentState 
              ? `${currentCity}, ${stateAbbreviation}`
              : currentCity || currentState || 'Unknown';
              
            console.log('Current city:', currentCity);
            console.log('Current state:', currentState);
            console.log('Location:', locationString);
          } else {
            console.log('Could not determine current city');
          }
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }
    };

    getCurrentLocation();
  }, [stepIndex]);

  // Time picker handlers
  const formatTimeForDisplay = (militaryTime: string): string => {
    const [hour, minute] = militaryTime.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  const handleAvailabilityChange = (day: keyof AvailabilitySchedule, type: 'start' | 'end', time: string) => {
    setAvailabilitySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: time,
      },
    }));
  };

  const openTimePicker = (day: string, type: 'start' | 'end') => {
    setCurrentTimePicker({ day, type });
    setShowTimePickerModal(true);
  };

  const handleTimeSelection = (hour: number, minute: number, period: 'AM' | 'PM') => {
    if (!currentTimePicker) return;
    
    let militaryHour = hour;
    if (period === 'PM' && hour !== 12) {
      militaryHour += 12;
    } else if (period === 'AM' && hour === 12) {
      militaryHour = 0;
    }
    
    const militaryTime = `${militaryHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    handleAvailabilityChange(
      currentTimePicker.day as keyof AvailabilitySchedule, 
      currentTimePicker.type, 
      militaryTime
    );
    
    setShowTimePickerModal(false);
    setCurrentTimePicker(null);
  };

  const handleApplyToAllDays = () => {
    if (!currentTimePicker) return;
    
    const currentTime = availabilitySchedule[currentTimePicker.day as keyof AvailabilitySchedule][currentTimePicker.type];
    
    const updatedSchedule = { ...availabilitySchedule };
    Object.keys(updatedSchedule).forEach((day) => {
      updatedSchedule[day as keyof AvailabilitySchedule] = {
        ...updatedSchedule[day as keyof AvailabilitySchedule],
        [currentTimePicker.type]: currentTime,
      };
    });
    
    setAvailabilitySchedule(updatedSchedule);
    setShowTimePickerModal(false);
    setCurrentTimePicker(null);
  };

  const handleSetForAllDays = (startTime: string, endTime: string) => {
    const updatedSchedule = { ...availabilitySchedule };
    Object.keys(updatedSchedule).forEach((day) => {
      updatedSchedule[day as keyof AvailabilitySchedule] = {
        start: startTime,
        end: endTime,
      };
    });
    setAvailabilitySchedule(updatedSchedule);
  };



  // Connection Intents handlers
  const handleConnectionIntentSelect = (intent: string) => {
    if (!connectionIntents.includes(intent)) {
      setConnectionIntents(prev => [...prev, intent]);
    }
  };

  const handleConnectionIntentRemove = (intent: string) => {
    setConnectionIntents(prev => prev.filter(i => i !== intent));
  };

  // Personal Tags handlers
  const handlePersonalTagSelect = (tag: string) => {
    if (!personalTags.includes(tag)) {
      setPersonalTags(prev => [...prev, tag]);
    }
  };

  const handlePersonalTagRemove = (tag: string) => {
    setPersonalTags(prev => prev.filter(t => t !== tag));
  };

  const togglePersonalTagSelection = (tag: string) => {
    setPersonalTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Validation for each step
  const isStepValid = useCallback(() => {
    switch (steps[stepIndex].key) {
      case "welcome":
        return true; // Welcome step is always valid
      case "availabilitySchedule":
        // At least one day with a valid time window (start and end are different, and end is not 00:00)
        return Object.values(availabilitySchedule).some((d: any) => d.start !== d.end && d.end !== "00:00");
      case "connectionTemplate":
        // At least one template selected (connection intents should have at least 3 items)
        return connectionIntents.length >= 3;
      case "connectionIntents":
        // At least three connection intents selected
        return connectionIntents.length >= 3;
      case "eventPreferences":
        // At least one selection from each category
        const socialEnvSelected = EVENT_PREFERENCES_OPTIONS.slice(0, 4).some(opt => eventPreferences[opt.key]);
        const timingScheduleSelected = EVENT_PREFERENCES_OPTIONS.slice(4, 8).some(opt => eventPreferences[opt.key]);
        const locationTravelSelected = EVENT_PREFERENCES_OPTIONS.slice(8, 10).some(opt => eventPreferences[opt.key]);
        const lifestyleInterestsSelected = EVENT_PREFERENCES_OPTIONS.slice(10, 12).some(opt => eventPreferences[opt.key]);
        return socialEnvSelected && timingScheduleSelected && locationTravelSelected && lifestyleInterestsSelected;
      case "personalTagsTemplate":
        // At least one personality template selected (personal tags should have at least 3 items)
        return personalTags.length >= 3;
      case "personalTags":
        // At least three personal tags selected
        return personalTags.length >= 3;
      case "meetupRadius":
        // Radius is set
        return preferredMeetupRadius > 0;
      case "profilePicture":
        // Profile picture and bio are required
        return profilePicture.length > 0 && userBio.trim().length > 0;
      default:
        return false;
    }
  }, [stepIndex, availabilitySchedule, connectionIntents, eventPreferences, personalTags, preferredMeetupRadius, profilePicture, userBio]);

  // Handlers for each field
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
        const selectedUri = result.assets[0].uri ?? "";
        setProfilePicture(selectedUri);
      }
    } catch (err) {
      console.log("Image picker error:", err);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let profilePicUrl = profilePicture;

      // Upload profile picture if it's a local URI
      if (profilePicUrl && !profilePicUrl.startsWith("http")) {
        const response = await fetch(profilePicUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile_pictures/${user.uid}`);
        await uploadBytes(storageRef, blob);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      // Get current location for lastKnownCoordinates and currentCity
      let lastKnownCoordinates = null;
      let currentCity = null;
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          const { latitude, longitude } = location.coords;
          lastKnownCoordinates = { latitude, longitude };

          // Reverse geocode to get city
          const reverseGeocode = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });

          if (reverseGeocode.length > 0) {
            const address = reverseGeocode[0];
            const city = address.city || address.subregion || address.region || 'Unknown';
            const state = address.region || address.subregion || 'Unknown';
            
            currentCity = city && state && city !== state 
              ? `${city}, ${state}`
              : city || state || 'Unknown';
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
        // Set default values if location fails
        lastKnownCoordinates = { latitude: 0, longitude: 0 };
        currentCity = 'Unknown';
      }

      const userRef = doc(db, "users", user.uid);
      const updateData = {
        availabilitySchedule,
        availableNow: true, // HARDCODED as true
        profilePicture: profilePicUrl,
        connectionIntents,
        eventPreferences,
        personalTags,
        preferredMeetupRadius,
        bio: userBio,
        currentCity,
        lastKnownCoordinates,
        groupAffiliations: [], // Add missing field
        updatedAt: serverTimestamp(),
      };
      
      console.log('💾 ProfileComplete - Saving user data with bio field:', JSON.stringify(updateData, null, 2));
      
      await updateDoc(userRef, updateData);
      
      router.replace("/home/dashboard");
    } catch (e) {
      console.error("Error updating profile:", e);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
    setSaving(false);
  };

  // Renderers for each step
  const renderStep = () => {
    switch (steps[stepIndex].key) {
      case "welcome":
        return (
          <View style={{ width: "100%" }}>
            {/* Welcome Header */}
            <View style={[styles.welcomeHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.welcomeIconContainer, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <Feather name="zap" size={28} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <Text style={[styles.welcomeTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                Welcome Back!
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                We've got some exciting updates for you
              </Text>
            </View>

            {/* Main Content Card */}
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#000000"
            }]}>
              <Text style={[styles.welcomeDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                To give you the best possible experience, we'd like to learn a bit more about your preferences. This helps us connect you with people who share your interests and availability.
              </Text>
              
              {/* What You'll Get Section */}
              <View style={styles.welcomeBenefitsSection}>
                <Text style={[styles.welcomeBenefitsTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  What you'll get:
                </Text>
                
                <View style={styles.welcomeBenefitsList}>
                  <View style={styles.welcomeBenefitItem}>
                    <View style={[styles.welcomeBenefitIcon, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                    }]}>
                      <Feather name="clock" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    </View>
                    <View style={styles.welcomeBenefitContent}>
                      <Text style={[styles.welcomeBenefitTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        Better Matches
                      </Text>
                      <Text style={[styles.welcomeBenefitDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Connect with people who are available when you are
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.welcomeBenefitItem}>
                    <View style={[styles.welcomeBenefitIcon, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                    }]}>
                      <Feather name="target" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    </View>
                    <View style={styles.welcomeBenefitContent}>
                      <Text style={[styles.welcomeBenefitTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        Shared Interests
                      </Text>
                      <Text style={[styles.welcomeBenefitDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Find people with similar goals and hobbies
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.welcomeBenefitItem}>
                    <View style={[styles.welcomeBenefitIcon, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                    }]}>
                      <Feather name="map-pin" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    </View>
                    <View style={styles.welcomeBenefitContent}>
                      <Text style={[styles.welcomeBenefitTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        Local Discovery
                      </Text>
                      <Text style={[styles.welcomeBenefitDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Discover meetups and events near you
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {/* Quick Info Box */}
              <View style={[styles.welcomeInfoBox, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.03)" : "rgba(56, 165, 201, 0.03)",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(56, 165, 201, 0.15)"
              }]}>
                <View style={styles.welcomeInfoHeader}>
                  <Feather name="clock" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.welcomeInfoTitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                    Quick & Easy
                  </Text>
                </View>
                <Text style={[styles.welcomeInfoText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  This will only take about 2-3 minutes to complete
                </Text>
              </View>
            </View>
          </View>
        );
      case "availabilitySchedule":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <Feather name="clock" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Set Your Schedule
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Tell us when you're typically available to meet new people
                </Text>
              </View>
            </View>
            
            {/* Preset Buttons */}
            <View style={{ marginBottom: 24 }}>
              <Text style={[
                {
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 12,
                  textAlign: "center",
                },
                { color: theme === "light" ? "#1E293B" : "#e4fbfe" }
              ]}>
                Quick Presets
              </Text>
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={[
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      borderWidth: 2,
                      gap: 12,
                    },
                    {
                      backgroundColor: theme === "light" ? "#F8FAFC" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                    }
                  ]}
                  onPress={() => {
                    const workWeekSchedule = {
                      monday: { start: "17:00", end: "22:00" },
                      tuesday: { start: "17:00", end: "22:00" },
                      wednesday: { start: "17:00", end: "22:00" },
                      thursday: { start: "17:00", end: "22:00" },
                      friday: { start: "17:00", end: "22:00" },
                      saturday: { start: "10:00", end: "22:00" },
                      sunday: { start: "10:00", end: "22:00" },
                    };
                    setAvailabilitySchedule(workWeekSchedule);
                    // Scroll to day-by-day schedule after a short delay
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 680, animated: true });
                    }, 100);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    {
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    { backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)" }
                  ]}>
                    <Feather name="briefcase" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      {
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 2,
                      },
                      { color: theme === "light" ? "#1E293B" : "#e4fbfe" }
                    ]}>
                      Work Week
                    </Text>
                    <Text style={[
                      {
                        fontSize: 13,
                        fontWeight: "500",
                      },
                      { color: theme === "light" ? "#64748B" : "#94A3B8" }
                    ]}>
                      Weekdays 5-10 PM, Weekends 10 AM-10 PM
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      borderWidth: 2,
                      gap: 12,
                    },
                    {
                      backgroundColor: theme === "light" ? "#F8FAFC" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                    }
                  ]}
                  onPress={() => {
                    const weekendSchedule = {
                      monday: { start: "00:00", end: "00:00" },
                      tuesday: { start: "00:00", end: "00:00" },
                      wednesday: { start: "00:00", end: "00:00" },
                      thursday: { start: "00:00", end: "00:00" },
                      friday: { start: "00:00", end: "00:00" },
                      saturday: { start: "10:00", end: "22:00" },
                      sunday: { start: "10:00", end: "20:00" },
                    };
                    setAvailabilitySchedule(weekendSchedule);
                    // Scroll to day-by-day schedule after a short delay
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 680, animated: true });
                    }, 100);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    {
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    { backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)" }
                  ]}>
                    <Feather name="calendar" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      {
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 2,
                      },
                      { color: theme === "light" ? "#1E293B" : "#e4fbfe" }
                    ]}>
                      Weekends Only
                    </Text>
                    <Text style={[
                      {
                        fontSize: 13,
                        fontWeight: "500",
                      },
                      { color: theme === "light" ? "#64748B" : "#94A3B8" }
                    ]}>
                      Saturday 10 AM-10 PM, Sunday 10 AM-8 PM
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      borderWidth: 2,
                      gap: 12,
                    },
                    {
                      backgroundColor: theme === "light" ? "#F8FAFC" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                    }
                  ]}
                  onPress={() => {
                    const alwaysAvailableSchedule = {
                      monday: { start: "00:00", end: "23:59" },
                      tuesday: { start: "00:00", end: "23:59" },
                      wednesday: { start: "00:00", end: "23:59" },
                      thursday: { start: "00:00", end: "23:59" },
                      friday: { start: "00:00", end: "23:59" },
                      saturday: { start: "00:00", end: "23:59" },
                      sunday: { start: "00:00", end: "23:59" },
                    };
                    setAvailabilitySchedule(alwaysAvailableSchedule);
                    // Scroll to day-by-day schedule after a short delay
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 680, animated: true });
                    }, 100);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[
                    {
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    { backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)" }
                  ]}>
                    <Feather name="clock" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      {
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 2,
                      },
                      { color: theme === "light" ? "#1E293B" : "#e4fbfe" }
                    ]}>
                      Always Available
                    </Text>
                    <Text style={[
                      {
                        fontSize: 13,
                        fontWeight: "500",
                      },
                      { color: theme === "light" ? "#64748B" : "#94A3B8" }
                    ]}>
                      Available 24/7 every day
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Set for All Days */}
            <View style={[styles.polishedQuickSetContainer, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.03)" : "rgba(56, 165, 201, 0.03)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}>
              <View style={styles.polishedQuickSetHeader}>
                <View style={[styles.polishedQuickSetIconContainer, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <Feather name="zap" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.polishedQuickSetTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Quick Set for All Days
                  </Text>
                  <Text style={[styles.polishedQuickSetSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Apply the same schedule to every day of the week
                  </Text>
                </View>
              </View>
              
              <View style={styles.polishedQuickSetButtons}>
                <TouchableOpacity
                  style={[styles.polishedQuickSetButton, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                    shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                  }]}
                  onPress={() => {
                    handleSetForAllDays("09:00", "17:00");
                    // Scroll to day-by-day schedule after a short delay
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 680, animated: true });
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.polishedQuickSetButtonIcon, {
                    backgroundColor: theme === "light" ? "rgba(251, 191, 36, 0.1)" : "rgba(251, 191, 36, 0.2)"
                  }]}>
                    <Feather name="sun" size={18} color="#fbbf24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.polishedQuickSetButtonLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      9 AM - 5 PM
                    </Text>
                    <Text style={[styles.polishedQuickSetButtonDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Business hours
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme === "light" ? "#94A3B8" : "#64748B"} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.polishedQuickSetButton, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                    shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                  }]}
                  onPress={() => {
                    handleSetForAllDays("10:00", "22:00");
                    // Scroll to day-by-day schedule after a short delay
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 680, animated: true });
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.polishedQuickSetButtonIcon, {
                    backgroundColor: theme === "light" ? "rgba(139, 92, 246, 0.1)" : "rgba(139, 92, 246, 0.2)"
                  }]}>
                    <Feather name="moon" size={18} color="#8b5cf6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.polishedQuickSetButtonLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      10 AM - 10 PM
                    </Text>
                    <Text style={[styles.polishedQuickSetButtonDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Extended hours
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme === "light" ? "#94A3B8" : "#64748B"} />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.polishedQuickSetButton, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                    shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                  }]}
                  onPress={() => {
                    handleSetForAllDays("00:00", "23:59");
                    // Scroll to day-by-day schedule after a short delay
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 680, animated: true });
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.polishedQuickSetButtonIcon, {
                    backgroundColor: theme === "light" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.2)"
                  }]}>
                    <Feather name="clock" size={18} color="#22c55e" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.polishedQuickSetButtonLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      All Day
                    </Text>
                    <Text style={[styles.polishedQuickSetButtonDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      24/7 availability
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={theme === "light" ? "#94A3B8" : "#64748B"} />
                </TouchableOpacity>
              </View>
            </View>



            {/* Day-by-Day Schedule */}
            <View style={styles.scheduleContainer}>
              <Text style={[styles.scheduleInstruction, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                💡 Set your availability for each day of the week
              </Text>
              {Object.entries(availabilitySchedule).map(([day, times]) => (
                <View key={day} style={[styles.availabilityRow, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                }]}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayLabelContainer}>
                      <Text style={[styles.dayLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.toggleDayButton, {
                        backgroundColor: (times.start === "00:00" && times.end === "00:00") 
                          ? (theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.2)")
                          : (theme === "light" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.2)")
                      }]}
                      onPress={() => {
                        const newTimes = (times.start === "00:00" && times.end === "00:00") 
                          ? { start: "09:00", end: "17:00" }
                          : { start: "00:00", end: "00:00" };
                        handleAvailabilityChange(day as keyof AvailabilitySchedule, 'start', newTimes.start);
                        handleAvailabilityChange(day as keyof AvailabilitySchedule, 'end', newTimes.end);
                      }}
                    >
                      <Text style={[styles.toggleDayText, {
                        color: (times.start === "00:00" && times.end === "00:00") 
                          ? "#ef4444" 
                          : "#22c55e"
                      }]}>
                        {(times.start === "00:00" && times.end === "00:00") ? "Unavailable" : "Available"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {(times.start !== "00:00" || times.end !== "00:00") && (
                    <View>
                      <View style={styles.timeInputs}>
                        <View style={styles.timeInputGroup}>
                          <Text style={[styles.timeLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            Start
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.timeButton,
                              {
                                backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                              }
                            ]}
                            onPress={() => openTimePicker(day, 'start')}
                          >
                            <Text style={[styles.timeButtonText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                              {formatTimeForDisplay(times.start)}
                            </Text>
                            <MaterialIcons 
                              name="access-time" 
                              size={16} 
                              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                            />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.timeSeparatorContainer}>
                          <Text style={[styles.timeSeparator, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>to</Text>
                        </View>
                        
                        <View style={styles.timeInputGroup}>
                          <Text style={[styles.timeLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            End
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.timeButton,
                              {
                                backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                              }
                            ]}
                            onPress={() => openTimePicker(day, 'end')}
                          >
                            <Text style={[styles.timeButtonText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                              {formatTimeForDisplay(times.end)}
                            </Text>
                            <MaterialIcons 
                              name="access-time" 
                              size={16} 
                              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                        style={[
                          {
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 8,
                            borderWidth: 1,
                            marginTop: 12,
                            gap: 6,
                          },
                          {
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                          }
                        ]}
                        onPress={() => handleSetForAllDays(times.start, times.end)}
                        activeOpacity={0.7}
                      >
                        <Feather name="copy" size={14} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                        <Text style={[
                          {
                            fontSize: 13,
                            fontWeight: "600",
                          },
                          { color: theme === "light" ? "#37a4c8" : "#38a5c9" }
                        ]}>
                          Apply to All Days
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      case "connectionTemplate":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <Feather name="target" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Choose Your Type
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Select a personality type that best matches you. You can customize this in the next step.
                </Text>
              </View>
            </View>
            
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#000000"
            }]}>
              
              {/* Enhanced Person Type Templates */}
              <View style={styles.polishedTemplateHeader}>
                <View style={styles.polishedTemplateHeaderContent}>
                  <Text style={[styles.polishedTemplateTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Choose Your Personality Type
                  </Text>
                  <Text style={[styles.polishedTemplateSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Select the type that best describes you. We'll customize your interests accordingly.
                  </Text>
                </View>
                <View style={[styles.polishedTemplateIcon, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <Feather name="zap" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </View>
              </View>
              
              <View style={styles.polishedTemplateGrid}>
                {/* Social Butterfly */}
                <TouchableOpacity
                  style={[styles.polishedTemplateCard, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                    shadowColor: theme === "light" ? "#0F172A" : "#000000"
                  }]}
                  onPress={() => {
                    setConnectionIntents([
                      "Bar Hopping & Nightlife",
                      "Dancing & Social Events",
                      "Coffee & Casual Meetups",
                      "Festivals & Events",
                      "Food & Dining",
                      "Music & Concerts"
                    ]);
                    setTimeout(() => {
                      setStepIndex((prev) => prev + 1);
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.polishedTemplateCardHeader}>
                    <View style={[styles.polishedTemplateIconContainer, {
                      backgroundColor: "rgba(139, 92, 246, 0.15)",
                      shadowColor: "#8b5cf6"
                    }]}>
                      <Feather name="users" size={28} color="#8b5cf6" />
                    </View>
                    <View style={[styles.polishedTemplateBadge, {
                      backgroundColor: "rgba(139, 92, 246, 0.1)"
                    }]}>
                      <Text style={[styles.polishedTemplateBadgeText, { color: "#8b5cf6" }]}>
                        Popular
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.polishedTemplateCardContent}>
                    <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Social Butterfly
                    </Text>
                    <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      You thrive in social settings and love meeting new people at events, parties, and gatherings.
                    </Text>
                    
                    <View style={styles.polishedTemplateFeatures}>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#8b5cf6" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Nightlife & Entertainment
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#8b5cf6" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Casual Meetups
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#8b5cf6" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Music & Festivals
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.polishedTemplateCardFooter, {
                    backgroundColor: "rgba(139, 92, 246, 0.05)"
                  }]}>
                    <Text style={[styles.polishedTemplateCardFooterText, { color: "#8b5cf6" }]}>
                      6 interests selected
                    </Text>
                    <Feather name="arrow-right" size={18} color="#8b5cf6" />
                  </View>
                </TouchableOpacity>

                {/* Professional Networker */}
                <TouchableOpacity
                  style={[styles.polishedTemplateCard, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                    shadowColor: theme === "light" ? "#0F172A" : "#000000"
                  }]}
                  onPress={() => {
                    setConnectionIntents([
                      "Networking & Business",
                      "Creative Projects",
                      "Technology & Innovation",
                      "Learning & Education",
                      "Deep Discussions"
                    ]);
                    setTimeout(() => {
                      setStepIndex((prev) => prev + 1);
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.polishedTemplateCardHeader}>
                    <View style={[styles.polishedTemplateIconContainer, {
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      shadowColor: "#3b82f6"
                    }]}>
                      <Feather name="briefcase" size={28} color="#3b82f6" />
                    </View>
                    <View style={[styles.polishedTemplateBadge, {
                      backgroundColor: "rgba(59, 130, 246, 0.1)"
                    }]}>
                      <Text style={[styles.polishedTemplateBadgeText, { color: "#3b82f6" }]}>
                        Career
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.polishedTemplateCardContent}>
                    <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Professional
                    </Text>
                    <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      You're focused on career growth, networking, and building meaningful professional relationships.
                    </Text>
                    
                    <View style={styles.polishedTemplateFeatures}>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#3b82f6" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Business Networking
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#3b82f6" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Skill Development
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#3b82f6" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Innovation & Tech
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.polishedTemplateCardFooter, {
                    backgroundColor: "rgba(59, 130, 246, 0.05)"
                  }]}>
                    <Text style={[styles.polishedTemplateCardFooterText, { color: "#3b82f6" }]}>
                      5 interests selected
                    </Text>
                    <Feather name="arrow-right" size={18} color="#3b82f6" />
                  </View>
                </TouchableOpacity>

                {/* Adventure Seeker */}
                <TouchableOpacity
                  style={[styles.polishedTemplateCard, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                    shadowColor: theme === "light" ? "#0F172A" : "#000000"
                  }]}
                  onPress={() => {
                    setConnectionIntents([
                      "Outdoor Adventures",
                      "Sports & Athletics",
                      "Travel & Exploration",
                      "Fitness & Wellness",
                      "Photography & Media"
                    ]);
                    setTimeout(() => {
                      setStepIndex((prev) => prev + 1);
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.polishedTemplateCardHeader}>
                    <View style={[styles.polishedTemplateIconContainer, {
                      backgroundColor: "rgba(34, 197, 94, 0.15)",
                      shadowColor: "#22c55e"
                    }]}>
                      <Feather name="compass" size={28} color="#22c55e" />
                    </View>
                    <View style={[styles.polishedTemplateBadge, {
                      backgroundColor: "rgba(34, 197, 94, 0.1)"
                    }]}>
                      <Text style={[styles.polishedTemplateBadgeText, { color: "#22c55e" }]}>
                        Active
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.polishedTemplateCardContent}>
                    <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Adventure Seeker
                    </Text>
                    <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      You love outdoor activities, sports, and exploring new places with like-minded adventurers.
                    </Text>
                    
                    <View style={styles.polishedTemplateFeatures}>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#22c55e" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Outdoor Activities
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#22c55e" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Sports & Fitness
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#22c55e" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Travel & Exploration
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.polishedTemplateCardFooter, {
                    backgroundColor: "rgba(34, 197, 94, 0.05)"
                  }]}>
                    <Text style={[styles.polishedTemplateCardFooterText, { color: "#22c55e" }]}>
                      5 interests selected
                    </Text>
                    <Feather name="arrow-right" size={18} color="#22c55e" />
                  </View>
                </TouchableOpacity>

                {/* Creative Soul */}
                <TouchableOpacity
                  style={[styles.polishedTemplateCard, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                    shadowColor: theme === "light" ? "#0F172A" : "#000000"
                  }]}
                  onPress={() => {
                    setConnectionIntents([
                      "Creative Projects",
                      "Art & Culture",
                      "Music & Concerts",
                      "Photography & Media",
                      "Deep Discussions"
                    ]);
                    setTimeout(() => {
                      setStepIndex((prev) => prev + 1);
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.polishedTemplateCardHeader}>
                    <View style={[styles.polishedTemplateIconContainer, {
                      backgroundColor: "rgba(236, 72, 153, 0.15)",
                      shadowColor: "#ec4899"
                    }]}>
                      <Feather name="image" size={28} color="#ec4899" />
                    </View>
                    <View style={[styles.polishedTemplateBadge, {
                      backgroundColor: "rgba(236, 72, 153, 0.1)"
                    }]}>
                      <Text style={[styles.polishedTemplateBadgeText, { color: "#ec4899" }]}>
                        Creative
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.polishedTemplateCardContent}>
                    <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Creative Soul
                    </Text>
                    <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      You're drawn to artistic expression, cultural experiences, and meaningful creative collaborations.
                    </Text>
                    
                    <View style={styles.polishedTemplateFeatures}>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#ec4899" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Art & Culture
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#ec4899" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Creative Projects
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#ec4899" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Music & Media
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.polishedTemplateCardFooter, {
                    backgroundColor: "rgba(236, 72, 153, 0.05)"
                  }]}>
                    <Text style={[styles.polishedTemplateCardFooterText, { color: "#ec4899" }]}>
                      5 interests selected
                    </Text>
                    <Feather name="arrow-right" size={18} color="#ec4899" />
                  </View>
                </TouchableOpacity>

                {/* Community Builder */}
                <TouchableOpacity
                  style={[styles.polishedTemplateCard, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                    shadowColor: theme === "light" ? "#0F172A" : "#000000"
                  }]}
                  onPress={() => {
                    setConnectionIntents([
                      "Volunteering & Community",
                      "Learning & Education",
                      "Board Games & Strategy",
                      "Coffee & Casual Meetups",
                      "Deep Discussions"
                    ]);
                    setTimeout(() => {
                      setStepIndex((prev) => prev + 1);
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.polishedTemplateCardHeader}>
                    <View style={[styles.polishedTemplateIconContainer, {
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                      shadowColor: "#f59e0b"
                    }]}>
                      <Feather name="heart" size={28} color="#f59e0b" />
                    </View>
                    <View style={[styles.polishedTemplateBadge, {
                      backgroundColor: "rgba(245, 158, 11, 0.1)"
                    }]}>
                      <Text style={[styles.polishedTemplateBadgeText, { color: "#f59e0b" }]}>
                        Caring
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.polishedTemplateCardContent}>
                    <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Community Builder
                    </Text>
                    <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      You value meaningful connections, giving back to the community, and helping others grow.
                    </Text>
                    
                    <View style={styles.polishedTemplateFeatures}>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#f59e0b" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Volunteering
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#f59e0b" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Learning & Growth
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#f59e0b" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Casual Meetups
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.polishedTemplateCardFooter, {
                    backgroundColor: "rgba(245, 158, 11, 0.05)"
                  }]}>
                    <Text style={[styles.polishedTemplateCardFooterText, { color: "#f59e0b" }]}>
                      5 interests selected
                    </Text>
                    <Feather name="arrow-right" size={18} color="#f59e0b" />
                  </View>
                </TouchableOpacity>

                {/* Tech Enthusiast */}
                <TouchableOpacity
                  style={[styles.polishedTemplateCard, {
                    backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                    borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                    shadowColor: theme === "light" ? "#0F172A" : "#000000"
                  }]}
                  onPress={() => {
                    setConnectionIntents([
                      "Technology & Innovation",
                      "Gaming & Entertainment",
                      "Creative Projects",
                      "Deep Discussions",
                      "Learning & Education"
                    ]);
                    setTimeout(() => {
                      setStepIndex((prev) => prev + 1);
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 300);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.polishedTemplateCardHeader}>
                    <View style={[styles.polishedTemplateIconContainer, {
                      backgroundColor: "rgba(6, 182, 212, 0.15)",
                      shadowColor: "#06b6d4"
                    }]}>
                      <Feather name="cpu" size={28} color="#06b6d4" />
                    </View>
                    <View style={[styles.polishedTemplateBadge, {
                      backgroundColor: "rgba(6, 182, 212, 0.1)"
                    }]}>
                      <Text style={[styles.polishedTemplateBadgeText, { color: "#06b6d4" }]}>
                        Tech
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.polishedTemplateCardContent}>
                    <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                      Tech Enthusiast
                    </Text>
                    <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      You're passionate about technology, innovation, gaming, and digital culture connections.
                    </Text>
                    
                    <View style={styles.polishedTemplateFeatures}>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#06b6d4" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Technology & Innovation
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#06b6d4" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Gaming & Entertainment
                        </Text>
                      </View>
                      <View style={styles.polishedTemplateFeature}>
                        <Feather name="check-circle" size={14} color="#06b6d4" />
                        <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                          Creative Projects
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={[styles.polishedTemplateCardFooter, {
                    backgroundColor: "rgba(6, 182, 212, 0.05)"
                  }]}>
                    <Text style={[styles.polishedTemplateCardFooterText, { color: "#06b6d4" }]}>
                      5 interests selected
                    </Text>
                    <Feather name="arrow-right" size={18} color="#06b6d4" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case "connectionIntents":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <Feather name="edit-3" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Customize Your Selection
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Fine-tune your interests by removing what doesn't fit and adding more options.
                </Text>
              </View>
            </View>
            
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#000000"
            }]}>
              
              {/* Current Selection Overview */}
              <View style={[styles.polishedProgressContainer, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
              }]}>
                <View style={styles.polishedProgressHeader}>
                  <View style={styles.polishedProgressInfo}>
                    <Text style={[styles.polishedProgressTitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Your Current Selection
                    </Text>
                    <Text style={[styles.polishedProgressSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {connectionIntents.length} interests selected
                    </Text>
                  </View>
                  <View style={[styles.polishedProgressCircle, {
                    backgroundColor: connectionIntents.length >= 3 
                      ? (theme === "light" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.2)")
                      : (theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)")
                  }]}>
                    <Text style={[styles.polishedProgressNumber, {
                      color: connectionIntents.length >= 3 ? "#22c55e" : (theme === "light" ? "#37a4c8" : "#38a5c9")
                    }]}>
                      {connectionIntents.length}
                    </Text>
                  </View>
                </View>
                <View style={[styles.polishedProgressBar, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <View style={[styles.polishedProgressFill, {
                    backgroundColor: connectionIntents.length >= 3 ? "#22c55e" : (theme === "light" ? "#37a4c8" : "#38a5c9"),
                    width: `${Math.min((connectionIntents.length / 8) * 100, 100)}%`
                  }]} />
                </View>
              </View>
              
              {/* Quick Actions */}
              <View style={styles.polishedQuickActionsContainer}>
                <Text style={[styles.polishedQuickActionsTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Quick Actions
                </Text>
                <View style={styles.polishedQuickActionsGrid}>
                  <TouchableOpacity
                    style={[styles.polishedQuickActionButton, {
                      backgroundColor: theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      borderColor: theme === "light" ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.3)"
                    }]}
                    onPress={() => setConnectionIntents([])}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={20} color="#ef4444" />
                    <Text style={[styles.polishedQuickActionText, { color: "#ef4444" }]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.polishedQuickActionButton, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                    }]}
                    onPress={() => setExpandedCategories(CONNECTION_INTENT_CATEGORIES.map(cat => cat.label))}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.polishedQuickActionText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Add More
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Selected Items with Easy Removal */}
              {connectionIntents.length > 0 && (
                <View style={[styles.polishedSelectedContainer, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                }]}>
                  <View style={styles.polishedSelectedHeader}>
                    <Feather name="check-circle" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.polishedSelectedTitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Selected Interests ({connectionIntents.length})
                    </Text>
                  </View>
                  <Text style={[styles.polishedSelectedSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Tap any item to remove it from your selection
                  </Text>
                  <View style={styles.polishedSelectedTags}>
                    {connectionIntents.map((intent, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.polishedSelectedTag, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                        }]}
                        onPress={() => setConnectionIntents(prev => prev.filter(i => i !== intent))}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.polishedSelectedTagText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                          {intent}
                        </Text>
                        <Feather name="x" size={14} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Connection Intent Categories for Adding More */}
              {CONNECTION_INTENT_CATEGORIES.map((category, index) => (
                <View key={category.label} style={{ 
                  marginBottom: 24,
                  marginTop: index === 0 ? 24 : 0
                }}>
                  <TouchableOpacity
                    style={[styles.polishedCategoryButton, {
                      backgroundColor: theme === "light" ? "#F8FAFC" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                    }]}
                    onPress={() => setExpandedCategories(prev => prev.includes(category.label) ? prev.filter(l => l !== category.label) : [...prev, category.label])}
                    activeOpacity={0.8}
                  >
                    <View style={styles.polishedCategoryContent}>
                      <View style={styles.polishedCategoryHeader}>
                        <Text style={[styles.polishedCategoryTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                          {category.label}
                        </Text>
                        <View style={[styles.polishedCategoryBadge, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                        }]}>
                          <Text style={[styles.polishedCategoryBadgeText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                            {category.intents.length}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.polishedCategoryCount, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        {category.intents.filter(intent => connectionIntents.includes(intent)).length} selected
                      </Text>
                    </View>
                    <Feather 
                      name={expandedCategories.includes(category.label) ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                    />
                  </TouchableOpacity>
                  
                  {expandedCategories.includes(category.label) && (
                    <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
                      <Text style={[
                        {
                          fontSize: 13,
                          fontWeight: "500",
                          lineHeight: 18,
                          marginBottom: 12,
                          fontStyle: "italic",
                        },
                        { color: theme === "light" ? "#64748B" : "#94A3B8" }
                      ]}>
                        {category.label === "Social & Nightlife" && "Connect with people who enjoy social activities, nightlife, and entertainment."}
                        {category.label === "Professional & Learning" && "Find connections for career growth, skill development, and knowledge sharing."}
                        {category.label === "Activities & Hobbies" && "Meet people who share your interests in sports, arts, gaming, and active lifestyles."}
                        {category.label === "Personal Growth" && "Connect with individuals interested in meaningful conversations and personal development."}
                      </Text>
                      <View style={styles.polishedIntentGrid}>
                        {category.intents.map((intent) => (
                          <TouchableOpacity
                            key={intent}
                            style={[
                              styles.polishedIntentCard,
                              connectionIntents.includes(intent)
                                ? (theme === "light" ? styles.polishedIntentCardSelectedLight : styles.polishedIntentCardSelectedDark)
                                : (theme === "light" ? styles.polishedIntentCardUnselectedLight : styles.polishedIntentCardUnselectedDark)
                            ]}
                            onPress={() =>
                              connectionIntents.includes(intent)
                                ? setConnectionIntents(prev => prev.filter(i => i !== intent))
                                : setConnectionIntents(prev => [...prev, intent])
                            }
                            activeOpacity={0.8}
                          >
                            <View style={styles.polishedIntentContent}>
                              <Text style={[
                                styles.polishedIntentText,
                                { color: connectionIntents.includes(intent) ? '#fff' : (theme === "light" ? "#1E293B" : "#e4fbfe") }
                              ]}>
                                {intent}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      case "eventPreferences":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <MaterialIcons name="event" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Your Event Style
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Tell us how you prefer to connect and what environments you enjoy.
                </Text>
              </View>
            </View>
            
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#000000"
            }]}>
              
              {/* Social & Environment */}
              <View style={styles.polishedPreferenceSection}>
                <View style={styles.polishedPreferenceHeader}>
                  <Text style={[styles.polishedPreferenceTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Social & Environment
                  </Text>
                  {EVENT_PREFERENCES_OPTIONS.slice(0, 4).some(opt => eventPreferences[opt.key]) ? (
                    <View style={styles.polishedValidationSuccess}>
                      <Feather name="check-circle" size={16} color="#22c55e" />
                      <Text style={[styles.polishedValidationText, { color: "#22c55e" }]}>Complete</Text>
                    </View>
                  ) : (
                    <View style={styles.polishedValidationError}>
                      <Text style={[styles.polishedValidationText, { color: "#ef4444" }]}>Required</Text>
                    </View>
                  )}
                </View>
                {EVENT_PREFERENCES_OPTIONS.slice(0, 4).map(opt => (
                  <View key={opt.key} style={[styles.polishedPreferenceRow, {
                    backgroundColor: theme === "light" ? '#F8FAFC' : 'rgba(56, 165, 201, 0.05)',
                    borderColor: theme === "light" ? '#E2E8F0' : '#37a4c8'
                  }]}>
                    <View style={styles.polishedPreferenceContent}>
                      <MaterialIcons name={opt.icon} size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.polishedPreferenceLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {opt.label}
                      </Text>
                    </View>
                    <Switch
                      value={eventPreferences[opt.key]}
                      onValueChange={v => setEventPreferences(prev => ({ ...prev, [opt.key]: v }))}
                      trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                      thumbColor={eventPreferences[opt.key] ? "#FFFFFF" : "#FFFFFF"}
                    />
                  </View>
                ))}
              </View>

              {/* Timing & Schedule */}
              <View style={styles.polishedPreferenceSection}>
                <View style={styles.polishedPreferenceHeader}>
                  <Text style={[styles.polishedPreferenceTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Timing & Schedule
                  </Text>
                  {EVENT_PREFERENCES_OPTIONS.slice(4, 8).some(opt => eventPreferences[opt.key]) ? (
                    <View style={styles.polishedValidationSuccess}>
                      <Feather name="check-circle" size={16} color="#22c55e" />
                      <Text style={[styles.polishedValidationText, { color: "#22c55e" }]}>Complete</Text>
                    </View>
                  ) : (
                    <View style={styles.polishedValidationError}>
                      <Text style={[styles.polishedValidationText, { color: "#ef4444" }]}>Required</Text>
                    </View>
                  )}
                </View>
                {EVENT_PREFERENCES_OPTIONS.slice(4, 8).map(opt => (
                  <View key={opt.key} style={[styles.polishedPreferenceRow, {
                    backgroundColor: theme === "light" ? '#F8FAFC' : 'rgba(56, 165, 201, 0.05)',
                    borderColor: theme === "light" ? '#E2E8F0' : '#37a4c8'
                  }]}>
                    <View style={styles.polishedPreferenceContent}>
                      <MaterialIcons name={opt.icon} size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.polishedPreferenceLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {opt.label}
                      </Text>
                    </View>
                    <Switch
                      value={eventPreferences[opt.key]}
                      onValueChange={v => setEventPreferences(prev => ({ ...prev, [opt.key]: v }))}
                      trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                      thumbColor={eventPreferences[opt.key] ? "#FFFFFF" : "#FFFFFF"}
                    />
                  </View>
                ))}
              </View>

              {/* Location & Travel */}
              <View style={styles.polishedPreferenceSection}>
                <View style={styles.polishedPreferenceHeader}>
                  <Text style={[styles.polishedPreferenceTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Location & Travel
                  </Text>
                  {EVENT_PREFERENCES_OPTIONS.slice(8, 10).some(opt => eventPreferences[opt.key]) ? (
                    <View style={styles.polishedValidationSuccess}>
                      <Feather name="check-circle" size={16} color="#22c55e" />
                      <Text style={[styles.polishedValidationText, { color: "#22c55e" }]}>Complete</Text>
                    </View>
                  ) : (
                    <View style={styles.polishedValidationError}>
                      <Text style={[styles.polishedValidationText, { color: "#ef4444" }]}>Required</Text>
                    </View>
                  )}
                </View>
                {EVENT_PREFERENCES_OPTIONS.slice(8, 10).map(opt => (
                  <View key={opt.key} style={[styles.polishedPreferenceRow, {
                    backgroundColor: theme === "light" ? '#F8FAFC' : 'rgba(56, 165, 201, 0.05)',
                    borderColor: theme === "light" ? '#E2E8F0' : '#37a4c8'
                  }]}>
                    <View style={styles.polishedPreferenceContent}>
                      <MaterialIcons name={opt.icon} size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.polishedPreferenceLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {opt.label}
                      </Text>
                    </View>
                    <Switch
                      value={eventPreferences[opt.key]}
                      onValueChange={v => setEventPreferences(prev => ({ ...prev, [opt.key]: v }))}
                      trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                      thumbColor={eventPreferences[opt.key] ? "#FFFFFF" : "#FFFFFF"}
                    />
                  </View>
                ))}
              </View>

              {/* Lifestyle & Interests */}
              <View style={styles.polishedPreferenceSection}>
                <View style={styles.polishedPreferenceHeader}>
                  <Text style={[styles.polishedPreferenceTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Lifestyle & Interests
                  </Text>
                  {EVENT_PREFERENCES_OPTIONS.slice(10, 12).some(opt => eventPreferences[opt.key]) ? (
                    <View style={styles.polishedValidationSuccess}>
                      <Feather name="check-circle" size={16} color="#22c55e" />
                      <Text style={[styles.polishedValidationText, { color: "#22c55e" }]}>Complete</Text>
                    </View>
                  ) : (
                    <View style={styles.polishedValidationError}>
                      <Text style={[styles.polishedValidationText, { color: "#ef4444" }]}>Required</Text>
                    </View>
                  )}
                </View>
                {EVENT_PREFERENCES_OPTIONS.slice(10, 12).map(opt => (
                  <View key={opt.key} style={[styles.polishedPreferenceRow, {
                    backgroundColor: theme === "light" ? '#F8FAFC' : 'rgba(56, 165, 201, 0.05)',
                    borderColor: theme === "light" ? '#E2E8F0' : '#37a4c8'
                  }]}>
                    <View style={styles.polishedPreferenceContent}>
                      <MaterialIcons name={opt.icon} size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.polishedPreferenceLabel, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {opt.label}
                      </Text>
                    </View>
                    <Switch
                      value={eventPreferences[opt.key]}
                      onValueChange={v => setEventPreferences(prev => ({ ...prev, [opt.key]: v }))}
                      trackColor={{ false: theme === "light" ? "#E2E8F0" : "#374151", true: theme === "light" ? "#37a4c8" : "#38a5c9" }}
                      thumbColor={eventPreferences[opt.key] ? "#FFFFFF" : "#FFFFFF"}
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        );
      case "personalTagsTemplate":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <Feather name="user" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Choose Your Personality Type
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Select the personality type that best describes you. We'll customize your tags accordingly.
                </Text>
              </View>
            </View>
            
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#000000"
            }]}>
              
              {/* Enhanced Personality Type Templates */}
              <View style={styles.polishedTemplateHeader}>
                <View style={styles.polishedTemplateHeaderContent}>
                  <Text style={[styles.polishedTemplateTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Choose Your Personality Type
                  </Text>
                  <Text style={[styles.polishedTemplateSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Select the type that best describes you. We'll customize your personality tags accordingly.
                  </Text>
                </View>
                <View style={[styles.polishedTemplateIcon, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <Feather name="zap" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </View>
              </View>
              
              <View style={styles.polishedTemplateGrid}>
                {PERSONALITY_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.name}
                    style={[styles.polishedTemplateCard, {
                      backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                      shadowColor: theme === "light" ? "#0F172A" : "#000000"
                    }]}
                    onPress={() => {
                      setPersonalTags(template.tags);
                      setTimeout(() => {
                        setStepIndex((prev) => prev + 1);
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }, 300);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.polishedTemplateCardHeader}>
                      <View style={[styles.polishedTemplateIconContainer, {
                        backgroundColor: `${template.color}20`,
                        shadowColor: template.color
                      }]}>
                        <Feather name={template.icon as any} size={28} color={template.color} />
                      </View>
                      <View style={[styles.polishedTemplateBadge, {
                        backgroundColor: `${template.color}20`
                      }]}>
                        <Text style={[styles.polishedTemplateBadgeText, { color: template.color }]}>
                          {template.tags.length} tags
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.polishedTemplateCardContent}>
                      <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {template.name}
                      </Text>
                      <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        {template.description}
                      </Text>
                      
                      <View style={styles.polishedTemplateFeatures}>
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <View key={index} style={styles.polishedTemplateFeature}>
                            <Feather name="check-circle" size={14} color={template.color} />
                            <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                              {tag}
                            </Text>
                          </View>
                        ))}
                        {template.tags.length > 3 && (
                          <View style={styles.polishedTemplateFeature}>
                            <Feather name="plus" size={14} color={template.color} />
                            <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                              +{template.tags.length - 3} more
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={[styles.polishedTemplateCardFooter, {
                      backgroundColor: `${template.color}10`
                    }]}>
                      <Text style={[styles.polishedTemplateCardFooterText, { color: template.color }]}>
                        {template.tags.length} personality tags
                      </Text>
                      <Feather name="arrow-right" size={18} color={template.color} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      case "personalTags":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <Feather name="edit-3" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Customize Your Personality
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Fine-tune your personality tags by removing what doesn't fit and adding more options.
                </Text>
              </View>
            </View>
            
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#000000"
            }]}>
              
              {/* Current Selection Overview */}
              <View style={[styles.polishedProgressContainer, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
              }]}>
                <View style={styles.polishedProgressHeader}>
                  <View style={styles.polishedProgressInfo}>
                    <Text style={[styles.polishedProgressTitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Your Current Selection
                    </Text>
                    <Text style={[styles.polishedProgressSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {personalTags.length} personality tags selected
                    </Text>
                  </View>
                  <View style={[styles.polishedProgressCircle, {
                    backgroundColor: personalTags.length >= 3 
                      ? (theme === "light" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.2)")
                      : (theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)")
                  }]}>
                    <Text style={[styles.polishedProgressNumber, {
                      color: personalTags.length >= 3 ? "#22c55e" : (theme === "light" ? "#37a4c8" : "#38a5c9")
                    }]}>
                      {personalTags.length}
                    </Text>
                  </View>
                </View>
                <View style={[styles.polishedProgressBar, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <View style={[styles.polishedProgressFill, {
                    backgroundColor: personalTags.length >= 3 ? "#22c55e" : (theme === "light" ? "#37a4c8" : "#38a5c9"),
                    width: `${Math.min((personalTags.length / 8) * 100, 100)}%`
                  }]} />
                </View>
              </View>
              
              {/* Quick Actions */}
              <View style={styles.polishedQuickActionsContainer}>
                <Text style={[styles.polishedQuickActionsTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Quick Actions
                </Text>
                <View style={styles.polishedQuickActionsGrid}>
                  <TouchableOpacity
                    style={[styles.polishedQuickActionButton, {
                      backgroundColor: theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.1)",
                      borderColor: theme === "light" ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.3)"
                    }]}
                    onPress={() => setPersonalTags([])}
                    activeOpacity={0.8}
                  >
                    <Feather name="trash-2" size={20} color="#ef4444" />
                    <Text style={[styles.polishedQuickActionText, { color: "#ef4444" }]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.polishedQuickActionButton, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                    }]}
                    onPress={() => setExpandedPersonalTagCategories(PERSONAL_TAG_CATEGORIES.map(cat => cat.label))}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.polishedQuickActionText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Add More
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Selected Items with Easy Removal */}
              {personalTags.length > 0 && (
                <View style={[styles.polishedSelectedContainer, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                }]}>
                  <View style={styles.polishedSelectedHeader}>
                    <Feather name="check-circle" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.polishedSelectedTitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Selected Personality Tags ({personalTags.length})
                    </Text>
                  </View>
                  <Text style={[styles.polishedSelectedSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Tap any item to remove it from your selection
                  </Text>
                  <View style={styles.polishedSelectedTags}>
                    {personalTags.map((tag, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.polishedSelectedTag, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                        }]}
                        onPress={() => setPersonalTags(prev => prev.filter(t => t !== tag))}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.polishedSelectedTagText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                          {tag}
                        </Text>
                        <Feather name="x" size={14} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Personal Tag Categories for Adding More */}
              {PERSONAL_TAG_CATEGORIES.map((category, index) => (
                <View key={category.label} style={{ 
                  marginBottom: 24,
                  marginTop: index === 0 ? 24 : 0
                }}>
                  <TouchableOpacity
                    style={[styles.polishedCategoryButton, {
                      backgroundColor: theme === "light" ? "#F8FAFC" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#374151"
                    }]}
                    onPress={() => setExpandedPersonalTagCategories(prev => prev.includes(category.label) ? prev.filter(l => l !== category.label) : [...prev, category.label])}
                    activeOpacity={0.8}
                  >
                    <View style={styles.polishedCategoryContent}>
                      <View style={styles.polishedCategoryHeader}>
                        <Text style={[styles.polishedCategoryTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                          {category.label}
                        </Text>
                        <View style={[styles.polishedCategoryBadge, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                        }]}>
                          <Text style={[styles.polishedCategoryBadgeText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                            {category.tags.length}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.polishedCategoryCount, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        {category.tags.filter(tag => personalTags.includes(tag)).length} selected
                      </Text>
                    </View>
                    <Feather 
                      name={expandedPersonalTagCategories.includes(category.label) ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                    />
                  </TouchableOpacity>
                  
                  {expandedPersonalTagCategories.includes(category.label) && (
                    <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
                      <Text style={[
                        {
                          fontSize: 13,
                          fontWeight: "500",
                          lineHeight: 18,
                          marginBottom: 12,
                          fontStyle: "italic",
                        },
                        { color: theme === "light" ? "#64748B" : "#94A3B8" }
                      ]}>
                        {category.label === "Personality & Lifestyle" && "Select tags that describe your personality traits and daily lifestyle choices."}
                        {category.label === "Daily Habits & Preferences" && "Choose tags that reflect your daily routines, preferences, and habits."}
                        {category.label === "Professional & Life Stage" && "Select tags that describe your current professional status and life stage."}
                        {category.label === "Interests & Activities" && "Pick tags that represent your interests, hobbies, and activity preferences."}
                      </Text>
                      <View style={styles.polishedChipsContainer}>
                        {category.tags.map((tag) => (
                          <TouchableOpacity
                            key={tag}
                            style={[
                              styles.polishedChip,
                              personalTags.includes(tag)
                                ? (theme === "light" ? styles.polishedChipSelectedLight : styles.polishedChipSelectedDark)
                                : (theme === "light" ? styles.polishedChipUnselectedLight : styles.polishedChipUnselectedDark)
                            ]}
                            onPress={() => togglePersonalTagSelection(tag)}
                            activeOpacity={0.8}
                          >
                            <Text style={[
                              styles.polishedChipText,
                              { color: personalTags.includes(tag) ? '#fff' : (theme === "light" ? "#37a4c8" : "#38a5c9") }
                            ]}>
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      case "meetupRadius":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <MaterialIcons name="location-on" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  How Far Will You Travel?
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Choose how far you're willing to travel for meetups and connections.
                </Text>
              </View>
            </View>
            
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#374151",
              shadowColor: theme === "light" ? "#0F172A" : "#000000"
            }]}>
              
              {/* Enhanced Meetup Radius Templates */}
              <View style={styles.polishedTemplateHeader}>
                <View style={styles.polishedTemplateHeaderContent}>
                  <Text style={[styles.polishedTemplateTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                    Choose Your Travel Style
                  </Text>
                  <Text style={[styles.polishedTemplateSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    Select the travel style that best matches your preferences for meetups.
                  </Text>
                </View>
                <View style={[styles.polishedTemplateIcon, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <MaterialIcons name="location-on" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </View>
              </View>
              
              <View style={styles.polishedTemplateGrid}>
                {MEETUP_RADIUS_TEMPLATES.map((template) => (
                  <TouchableOpacity
                    key={template.name}
                    style={[styles.polishedTemplateCard, {
                      backgroundColor: theme === "light" ? "#FFFFFF" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#374151",
                      shadowColor: theme === "light" ? "#0F172A" : "#000000"
                    }]}
                    onPress={() => {
                      setPreferredMeetupRadius(template.radius);
                      setTimeout(() => {
                        setStepIndex((prev) => prev + 1);
                        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                      }, 300);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.polishedTemplateCardHeader}>
                      <View style={[styles.polishedTemplateIconContainer, {
                        backgroundColor: `${template.color}20`,
                        shadowColor: template.color
                      }]}>
                        <MaterialIcons name={template.icon as any} size={28} color={template.color} />
                      </View>
                      <View style={[styles.polishedTemplateBadge, {
                        backgroundColor: `${template.color}20`
                      }]}>
                        <Text style={[styles.polishedTemplateBadgeText, { color: template.color }]}>
                          {template.badge}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.polishedTemplateCardContent}>
                      <Text style={[styles.polishedTemplateCardTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {template.name}
                      </Text>
                      <Text style={[styles.polishedTemplateCardDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        {template.description}
                      </Text>
                      
                      <View style={styles.polishedTemplateFeatures}>
                        <View style={styles.polishedTemplateFeature}>
                          <Feather name="map-pin" size={14} color={template.color} />
                          <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            {template.radius} mile radius
                          </Text>
                        </View>
                        <View style={styles.polishedTemplateFeature}>
                          <Feather name="clock" size={14} color={template.color} />
                          <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            {template.radius <= 10 ? "Quick meetups" : template.radius <= 25 ? "Day trips" : "Weekend adventures"}
                          </Text>
                        </View>
                        <View style={styles.polishedTemplateFeature}>
                          <Feather name="users" size={14} color={template.color} />
                          <Text style={[styles.polishedTemplateFeatureText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            {template.radius <= 10 ? "Local community" : template.radius <= 25 ? "Regional network" : "Extended network"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={[styles.polishedTemplateCardFooter, {
                      backgroundColor: `${template.color}10`
                    }]}>
                      <Text style={[styles.polishedTemplateCardFooterText, { color: template.color }]}>
                        {template.radius} mile radius
                      </Text>
                      <Feather name="arrow-right" size={18} color={template.color} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      case "profilePicture":
        return (
          <View style={{ width: "100%" }}>
            <View style={[styles.stepHeader, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
            }]}>
              <View style={[styles.stepHeaderIcon, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}>
                <Feather name="camera" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              </View>
              <View style={styles.stepHeaderContent}>
                <Text style={[styles.stepHeaderTitle, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                  Your Profile
                </Text>
                <Text style={[styles.stepHeaderDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Add a photo and tell others about yourself to complete your profile.
                </Text>
              </View>
            </View>
            
            {/* Profile Picture Section */}
            <View style={[styles.polishedCard, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9",
              marginBottom: 20
            }]}>
              
              {/* Progress Indicator */}
              <View style={[styles.polishedProgressContainer, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
              }]}>
                <View style={styles.polishedProgressHeader}>
                  <View style={styles.polishedProgressInfo}>
                    <Text style={[styles.polishedProgressTitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      Profile Picture Status
                    </Text>
                    <Text style={[styles.polishedProgressSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {profilePicture ? "Photo uploaded successfully" : "Photo required to continue"}
                    </Text>
                  </View>
                  <View style={[styles.polishedProgressCircle, {
                    backgroundColor: profilePicture 
                      ? (theme === "light" ? "rgba(34, 197, 94, 0.1)" : "rgba(34, 197, 94, 0.2)")
                      : (theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.2)")
                  }]}>
                    {profilePicture ? (
                      <Feather name="check" size={20} color="#22c55e" />
                    ) : (
                      <Feather name="camera" size={20} color="#ef4444" />
                    )}
                  </View>
                </View>
                <View style={[styles.polishedProgressBar, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                }]}>
                  <View style={[styles.polishedProgressFill, {
                    backgroundColor: profilePicture ? "#22c55e" : "#ef4444",
                    width: profilePicture ? "100%" : "0%"
                  }]} />
                </View>
              </View>
              
              {/* Enhanced Profile Picture Upload */}
              <View style={styles.polishedProfilePictureContainer}>
                <View style={styles.polishedProfilePictureWrapper}>
                <TouchableOpacity
                  style={[styles.polishedProfilePictureButton, {
                    borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                      backgroundColor: theme === "light" ? "#F8FAFC" : "rgba(56, 165, 201, 0.05)",
                      shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
                  }]}
                  onPress={handleSelectPhoto}
                  activeOpacity={0.8}
                >
                  {profilePicture ? (
                    <Image
                      source={{ uri: profilePicture }}
                      style={styles.polishedProfilePicture}
                      resizeMode="cover"
                    />
                  ) : (
                    <Feather name="camera" size={48} color={theme === "light" ? "#94A3B8" : "#64748B"} />
                  )}
                </TouchableOpacity>
                
                  {profilePicture && (
                    <View style={[styles.polishedProfilePictureOverlay, {
                      backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.3)"
                    }]}>
                      <TouchableOpacity
                        style={[styles.polishedProfilePictureEditButton, {
                          backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.9)" : "rgba(56, 165, 201, 0.9)"
                        }]}
                        onPress={handleSelectPhoto}
                        activeOpacity={0.8}
                      >
                        <Feather name="edit-3" size={16} color={theme === "light" ? "#37a4c8" : "#FFFFFF"} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                
                <View style={styles.polishedProfilePictureActions}>
                <TouchableOpacity
                  style={[styles.polishedChangePhotoButton, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                  }]}
                  onPress={handleSelectPhoto}
                  activeOpacity={0.8}
                >
                    <Feather name="upload" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.polishedChangePhotoText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                    {profilePicture ? "Change Photo" : "Upload Photo"}
                  </Text>
                </TouchableOpacity>
                  
                  {profilePicture && (
                    <TouchableOpacity
                      style={[styles.polishedRemovePhotoButton, {
                        backgroundColor: theme === "light" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        borderColor: theme === "light" ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.3)"
                      }]}
                      onPress={() => setProfilePicture("")}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={16} color="#ef4444" />
                      <Text style={[styles.polishedRemovePhotoText, { color: "#ef4444" }]}>
                        Remove Photo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              </View>
              
              {/* User Description Section */}
              <View style={[styles.polishedCard, { 
                backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              shadowColor: theme === "light" ? "#0F172A" : "#38a5c9"
              }]}>
                <View style={styles.polishedSectionHeader}>
                  <Feather name="edit-3" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  <Text style={[styles.polishedSectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    About Me
                  </Text>
                </View>
                              <Text style={[styles.polishedSectionSubtitle, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                Tell others a bit about yourself. What makes you unique? This is required to complete your profile.
              </Text>
              

                
                <TextInput
                  style={[
                    {
                      borderWidth: 2,
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      minHeight: 120,
                      textAlignVertical: "top",
                      marginTop: 16,
                    },
                    {
                    backgroundColor: theme === "light" ? "#F8FAFC" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                      color: theme === "light" ? "#1E293B" : "#e4fbfe",
                    }
                  ]}
                  placeholder="Share your interests, what you're looking for, or anything else you'd like others to know about you..."
                  placeholderTextColor={theme === "light" ? "#94A3B8" : "#64748B"}
                  value={userBio}
                  onChangeText={setUserBio}
                  multiline={true}
                  numberOfLines={6}
                  maxLength={500}
                  textAlignVertical="top"
                />
                
              {/* Character Count with Enhanced Styling */}
              <View style={styles.polishedCharacterCount}>
                <Text style={[
                  {
                    fontSize: 12,
                    fontWeight: "500",
                  },
                  {
                    color: userBio.length >= 450 
                      ? "#ef4444" 
                      : userBio.trim().length > 0
                      ? "#22c55e"
                      : "#ef4444"
                  }
                ]}>
                  {userBio.length >= 450 && "⚠️ "}
                  {userBio.trim().length === 0 && "⚠️ "}
                  {userBio.length}/500 characters
                  {userBio.trim().length > 0 && userBio.length < 450 && " ✅"}
                </Text>
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (saving) {
    return <LoadingScreen message="Saving your profile..." />;
  }

  return (
    <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.container}>
      <Animated.View 
        style={{ 
          flex: 1,
          opacity: contentBounceAnim,
          transform: [
            { scale: contentScaleAnim },
            {
              translateY: contentBounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })
            }
          ]
        }}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={theme === "light" 
                ? require('../../assets/images/splash-icon.png')
                : require('../../assets/images/splash-icon-dark.png')
              }
              style={styles.logo}
              resizeMode="contain"
              fadeDuration={0}
            />
          </View>
          
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${((stepIndex + 1) / steps.length) * 100}%`,
                    backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
              {stepIndex + 1} of {steps.length} completed
            </Text>
          </View>
          
          {stepIndex > 0 && (
            <Text style={[styles.title, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
              {steps[stepIndex].title}
            </Text>
          )}
          {renderStep()}
          <View style={{ height: 40 }} />
          {steps[stepIndex].key !== "connectionTemplate" && steps[stepIndex].key !== "personalTagsTemplate" && steps[stepIndex].key !== "meetupRadius" && (
            <TouchableOpacity
              style={[styles.button, { 
                backgroundColor: isStepValid() ? (theme === "light" ? "#37a4c8" : "#38a5c9") : "#64748B",
                borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
              }]}
              onPress={async () => {
                if (stepIndex === steps.length - 1) {
                  await handleSubmit();
                } else {
                  setStepIndex((prev) => prev + 1);
                  // Scroll to top when moving to next step
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                  }, 100);
                }
              }}
              activeOpacity={isStepValid() ? 0.8 : 1}
              disabled={!isStepValid() || saving}
            >
              <Text style={[styles.buttonText, { color: "#FFFFFF" }]}>
                {stepIndex === steps.length - 1 ? (saving ? "Saving..." : "Finish") : "Continue"}
              </Text>
            </TouchableOpacity>
          )}
          {stepIndex > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
              setStepIndex((prev) => prev - 1);
              // Scroll to top when moving to previous step
              setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              }, 100);
            }}
              activeOpacity={0.7}
              disabled={saving}
            >
              <Text style={[styles.skipButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>Back</Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 60 }} />
          </ScrollView>
        </Animated.View>

        {/* Time Picker Modal */}
        <Modal
          visible={showTimePickerModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowTimePickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              height: '100%',
            }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <MaterialIcons name="access-time" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.modalTitleIcon} />
                  <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Select Time
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowTimePickerModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.closeButton, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                  }]}
                >
                  <Feather name="x" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timePickerContainer}>
                <Text style={[styles.timePickerLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  {currentTimePicker?.type === 'start' ? 'Start Time' : 'End Time'}
                </Text>
                
                <ScrollView 
                  style={styles.timePickerScrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.timePickerGrid}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                      <View key={hour} style={styles.timePickerRow}>
                        <TouchableOpacity
                          style={[styles.timePickerButton, {
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                          }]}
                          onPress={() => handleTimeSelection(hour, 0, 'AM')}
                        >
                          <Text style={[styles.timePickerButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                            {hour}:00 AM
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.timePickerButton, {
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                          }]}
                          onPress={() => handleTimeSelection(hour, 0, 'PM')}
                        >
                          <Text style={[styles.timePickerButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                            {hour}:00 PM
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  

                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>

        {/* Connection Intents Selection Modal */}
        {/* This modal is no longer needed as connection intents are now collapsible */}
        {/* <Modal
          visible={showConnectionIntentsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowConnectionIntentsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
            }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Feather name="target" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.modalTitleIcon} />
                  <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Select Connection Intents
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowConnectionIntentsModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.closeButton, {
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                  }]}
                >
                  <Feather name="x" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                </TouchableOpacity>
              </View>
              
              <View style={[styles.searchContainer, {
                backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
              }]}>
                <Feather name="search" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <TextInput
                  style={[styles.searchInput, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}
                  placeholder="Search connection intents..."
                  placeholderTextColor={theme === "light" ? "#94A3B8" : "#94A3B8"}
                  value={connectionIntentsSearchQuery}
                  onChangeText={setConnectionIntentsSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="off"
                  returnKeyType="done"
                  onSubmitEditing={() => setShowConnectionIntentsModal(false)}
                  blurOnSubmit={true}
                  keyboardAppearance={theme === "light" ? "light" : "dark"}
                />
              </View>

              <ScrollView
                style={[styles.languageList, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
                }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                contentContainerStyle={styles.languageListContent}
                showsVerticalScrollIndicator={false}
              >
                {filteredConnectionIntents.length > 0 ? (
                  filteredConnectionIntents.map((intent, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.languageItem, {
                        borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                      }]}
                      onPress={() => handleConnectionIntentSelect(intent)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.languageItemText, { color: theme === "light" ? "#1E293B" : "#e4fbfe" }]}>
                        {intent}
                      </Text>
                      <View style={[styles.languageItemIcon, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                      }]}>
                        <Feather name="plus" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Feather name="search" size={32} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                    <Text style={[styles.emptyStateText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                      No connection intents found
                    </Text>
                    <Text style={[styles.emptyStateSubtext, { color: theme === "light" ? "#94A3B8" : "#94A3B8" }]}>
                      Try a different search term
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal> */}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
    paddingBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  stepLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
    width: "100%",
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    minWidth: 200,
    alignItems: "center",
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },

  tagSelected: {
    backgroundColor: "#38a5c9",
    borderColor: "#38a5c9",
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#38a5c9",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    backgroundColor: "transparent",
    width: "100%",
  },
  presetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  scheduleContainer: {
    width: "100%",
    alignItems: "center",
  },
  availabilityRow: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    width: "100%",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  toggleDayButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  toggleDayText: {
    fontSize: 12,
    fontWeight: "500",
  },
  timeInputs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
    textAlign: "center",
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  timeSeparatorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  timeSeparator: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    paddingTop: "20%",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    height: '100%',
    margin: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 165, 201, 0.2)",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitleIcon: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  timePickerContainer: {
    flex: 1,
    padding: 20,
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  timePickerScrollView: {
    flex: 1,
  },
  timePickerScrollContent: {
    paddingBottom: 20,
  },
  timePickerGrid: {
    gap: 12,
  },
  timePickerRow: {
    flexDirection: "row",
    gap: 12,
  },
  timePickerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  timePickerButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  applyToAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  applyToAllButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  quickSetContainer: {
    marginBottom: 24,
    alignItems: "center",
    width: "100%",
  },
  quickSetLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
    textAlign: "center",
  },
  quickSetButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quickSetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickSetButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedDaysContainer: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(55, 164, 200, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(55, 164, 200, 0.2)",
    alignItems: "center",
    width: "100%",
  },
  selectedDaysLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
    textAlign: "center",
  },
  dayLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  scheduleInstruction: {
    fontSize: 12,
    fontWeight: "400",
    marginBottom: 16,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 16,
  },
  selectionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    backgroundColor: "transparent",
  },
  selectionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 10,
  },
  languageList: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  languageListContent: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  languageItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  languageItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 10,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontWeight: "400",
    marginTop: 5,
    textAlign: "center",
  },
  intentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  intentChipSelectedLight: {
    backgroundColor: '#37a4c8',
    borderColor: '#37a4c8',
  },
  intentChipSelectedDark: {
    backgroundColor: '#38a5c9',
    borderColor: '#38a5c9',
  },
  intentChipUnselectedLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  intentChipUnselectedDark: {
    backgroundColor: '#18181b',
    borderColor: '#37a4c8',
  },
  polishedCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  polishedSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  polishedSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  polishedSectionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 20,
    lineHeight: 20,
  },
  polishedPreferenceSection: {
    marginBottom: 24,
  },
  polishedPreferenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  polishedPreferenceTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  polishedPreferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  polishedPreferenceContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  polishedPreferenceLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  polishedValidationSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  polishedValidationError: {
    flexDirection: "row",
    alignItems: "center",
  },
  polishedValidationText: {
    fontSize: 12,
    fontWeight: "600",
  },
  polishedValidationSuccessText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#22c55e",
  },
  polishedValidationErrorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
  polishedSelectedContainer: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 16,
  },
  polishedSelectedTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  polishedSelectedText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  polishedCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  polishedCategoryContent: {
    flex: 1,
  },
  polishedCategoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  polishedCategoryCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  polishedChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  polishedChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
  },
  polishedChipSelectedLight: {
    backgroundColor: '#37a4c8',
    borderColor: '#37a4c8',
  },
  polishedChipSelectedDark: {
    backgroundColor: '#38a5c9',
    borderColor: '#38a5c9',
  },
  polishedChipUnselectedLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  polishedChipUnselectedDark: {
    backgroundColor: '#18181b',
    borderColor: '#37a4c8',
  },
  polishedChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  polishedProfilePictureContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  polishedProfilePictureButton: {
    borderWidth: 3,
    borderRadius: 60,
    width: 120,
    height: 120,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  polishedProfilePicture: {
    width: "100%",
    height: "100%",
  },
  polishedProfilePicturePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  polishedProfilePictureText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  polishedChangePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 25,
    gap: 8,
  },
  polishedChangePhotoText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  polishedRadiusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 8,
  },
  polishedRadiusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  polishedRadiusButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 20,
  },
  logo: {
    width: 160,
    height: 160,
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(55, 164, 200, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 16,
  },
  stepHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stepHeaderContent: {
    flex: 1,
  },
  stepHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  stepHeaderDescription: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  // Polished Quick Set Styles
  polishedQuickSetContainer: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  polishedQuickSetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  polishedQuickSetIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  polishedQuickSetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  polishedQuickSetSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  polishedQuickSetButtons: {
    gap: 12,
  },
  polishedQuickSetButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  polishedQuickSetButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  polishedQuickSetButtonLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  polishedQuickSetButtonDescription: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Polished Connection Intents Styles
  polishedProgressContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  polishedProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  polishedProgressInfo: {
    flex: 1,
  },
  polishedProgressTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  polishedProgressSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  polishedProgressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  polishedProgressNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  polishedProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  polishedProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  polishedCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  polishedCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  polishedCategoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  polishedIntentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  polishedIntentCard: {
    width: "48%",
    minHeight: 80,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  polishedIntentCardSelectedLight: {
    backgroundColor: '#37a4c8',
    borderColor: '#37a4c8',
  },
  polishedIntentCardSelectedDark: {
    backgroundColor: '#38a5c9',
    borderColor: '#38a5c9',
  },
  polishedIntentCardUnselectedLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  polishedIntentCardUnselectedDark: {
    backgroundColor: 'rgba(56, 165, 201, 0.05)',
    borderColor: '#37a4c8',
  },
  polishedIntentContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  polishedIntentText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  polishedIntentCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  polishedSelectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  polishedSelectedTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  polishedSelectedTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  polishedSelectedTagText: {
    fontSize: 13,
    fontWeight: "500",
  },
  polishedQuickActionsContainer: {
    marginBottom: 24,
  },
  polishedQuickActionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  polishedQuickActionsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  polishedQuickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  polishedQuickActionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  polishedSelectedSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 12,
    fontStyle: "italic",
  },

  // Polished Radius Styles
  polishedRadiusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  polishedRadiusCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Polished Profile Picture Styles
  polishedProfilePictureWrapper: {
    position: "relative",
    alignItems: "center",
    marginBottom: 16,
  },
  polishedProfilePictureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  polishedProfilePictureSubtext: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
  },
  polishedProfilePictureOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  polishedProfilePictureEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  polishedProfilePictureActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  polishedRemovePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 25,
    gap: 8,
  },
  polishedRemovePhotoText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  polishedDescriptionProgress: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  polishedDescriptionProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  polishedDescriptionProgressTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  polishedDescriptionProgressSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  polishedDescriptionProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  polishedDescriptionProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  polishedCharacterCount: {
    alignItems: "flex-end",
    marginTop: 8,
  },

  // Welcome Screen Styles
  welcomeHeader: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  welcomeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  welcomeDescription: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 24,
  },
  welcomeBenefitsSection: {
    marginBottom: 24,
  },
  welcomeBenefitsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  welcomeBenefitsList: {
    gap: 16,
  },
  welcomeBenefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  welcomeBenefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  welcomeBenefitContent: {
    flex: 1,
  },
  welcomeBenefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  welcomeBenefitDescription: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  welcomeInfoBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  welcomeInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  welcomeInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  welcomeInfoText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  presetPersonTypesTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  presetPersonTypesSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 16,
  },
  presetPersonTypesList: {
    gap: 12,
    marginBottom: 24,
  },
  presetPersonTypeCard: {
    width: "100%",
    height: 100,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
    overflow: "hidden",
  },
  presetPersonTypeCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    height: "100%",
  },
  presetPersonTypeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  presetPersonTypeTextContent: {
    flex: 1,
  },
  presetPersonTypeTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  presetPersonTypeDescription: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
    opacity: 0.9,
  },
  presetPersonTypeArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  // Polished Template Styles
  polishedTemplateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(55, 164, 200, 0.03)",
    borderColor: "rgba(55, 164, 200, 0.1)",
  },
  polishedTemplateHeaderContent: {
    flex: 1,
  },
  polishedTemplateTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  polishedTemplateSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  polishedTemplateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
  },
  polishedTemplateGrid: {
    gap: 16,
  },
  polishedTemplateCard: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  polishedTemplateCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 16,
  },
  polishedTemplateIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  polishedTemplateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  polishedTemplateBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  polishedTemplateCardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  polishedTemplateCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  polishedTemplateCardDescription: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: 16,
  },
  polishedTemplateFeatures: {
    gap: 8,
  },
  polishedTemplateFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  polishedTemplateFeatureText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  polishedTemplateCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  polishedTemplateCardFooterText: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

}); 