import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
  Alert,
  Animated,
  StatusBar,
  Easing,
  SafeAreaView,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import useEvents from '../hooks/useEvents';
import useAuth from '../hooks/auth';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, storage } from '../../config/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'expo-router';
import TopBar from '../components/TopBar';
import LoadingScreen from '../components/LoadingScreen';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { ThemeContext } from '../context/ThemeContext';
import { containsFilteredContent, getFilteredContentCategory } from '../utils/contentFilter';
import useNotificationCount from '../hooks/useNotificationCount';
import { PING_CATEGORIES, CONNECTION_INTENTS } from '../constants/pingCategories';
import { EventPreferences } from '../types/pingTypes';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

// Step definitions for the wizard
const EVENT_CREATION_STEPS = [
  {
    key: 'location',
    title: 'Where is your event?',
    subtitle: 'Choose the location for your event',
    icon: 'map-pin'
  },
  {
    key: 'details',
    title: 'What\'s your event about?',
    subtitle: 'Tell people what they can expect',
    icon: 'edit-3'
  },
  {
    key: 'category',
    title: 'What type of event?',
    subtitle: 'Select a category and template',
    icon: 'tag'
  },
  {
    key: 'settings',
    title: 'Event settings',
    subtitle: 'Configure duration, participants, and privacy',
    icon: 'settings'
  },
  {
    key: 'preferences',
    title: 'Event preferences',
    subtitle: 'Fine-tune your event preferences',
    icon: 'heart'
  },
  {
    key: 'schedule',
    title: 'When is your event?',
    subtitle: 'Set the date and time',
    icon: 'calendar'
  },
  {
    key: 'review',
    title: 'Review & create',
    subtitle: 'Double-check everything and create your event',
    icon: 'check-circle'
  }
];

const ModernLoadingIndicator = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Complex animation sequence
    const pulseAnimation = Animated.sequence([
      // First phase: grow and fade in
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ]),
      // Second phase: shrink and fade out
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ]),
    ]);

    // Continuous rotation animation
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );

    // Start both animations
    Animated.loop(pulseAnimation).start();
    rotationAnimation.start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingIndicatorContainer}>
      <Animated.View
        style={[
          styles.loadingCircle,
          {
            backgroundColor: color,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            transform: [
              { scale: scaleAnim },
              { rotate: spin }
            ],
            shadowOpacity: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.5],
            }),
            shadowRadius: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 8],
            }),
          },
        ]}
      />
    </View>
  );
};

function haversineDistance(lat1: number, long1: number, lat2: number, long2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLong = toRad(long2 - long1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLong / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const EventCreation: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { addEvent, loading, error } = useEvents();
  const { theme } = React.useContext(ThemeContext);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }>({
    latitude: 40.7128, // Default to NYC until we get user's actual coordinates
    longitude: -74.0060,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    template: '',
    duration: '1 hour',
    maxParticipants: '4 people',
    pingType: 'open',
    visibilityRadius: '10 miles',
    connectionIntents: [] as string[],
    eventPreferences: {
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
    } as EventPreferences,
    coordinates: {
      latitude: 0,
      longitude: 0
    },
    creatorId: user?.uid || '',
    creatorName: '',
    participants: [user?.uid || ''],
    participantCount: 1,
    status: 'active',
    createdAt: new Date(),
    // Event-specific fields
    startTime: new Date(),
    eventImage: null as string | null,
  });

  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(0.95)).current;
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});

  // Step wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [showConnectionIntents, setShowConnectionIntents] = useState(false);
  const [showEventPreferences, setShowEventPreferences] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionType, setSelectionType] = useState('');
  const [selectionOptions, setSelectionOptions] = useState<Array<{id: string, label: string}>>([]);
  const stepAnim = useRef(new Animated.Value(1)).current;

  // Options for form fields
  const durationOptions = ['30 minutes', '1 hour', '2 hours', '3 hours', '4 hours', 'All day'];
  const participantOptions = ['2 people', '3 people', '4 people', '5 people', '6 people', 'Unlimited'];
  const radiusOptions = ['5 miles', '10 miles', '15 miles', '20 miles', '25 miles', '50 miles'];
  const pingTypeOptions = [
    { id: 'open', label: 'Open', description: 'Anyone can join' },
    { id: 'invite-only', label: 'Invite Only', description: 'You approve requests' },
    { id: 'friends-only', label: 'Friends Only', description: 'Only your connections' }
  ];

  // Get category options from centralized config
  const categoryOptions = PING_CATEGORIES.map(category => ({
    id: category.id,
    label: category.label,
    icon: category.icon
  }));

  // Get template options based on selected category
  const getTemplateOptions = (categoryLabel: string) => {
    const category = PING_CATEGORIES.find(cat => cat.label === categoryLabel);
    return category?.templates || [];
  };

  // Step validation
  const isStepValid = () => {
    const step = EVENT_CREATION_STEPS[currentStep];
    
    switch (step.key) {
      case 'location':
        return eventData.location.trim() !== '';
      case 'details':
        return eventData.title.trim() !== '' && eventData.description.trim() !== '';
      case 'category':
        return eventData.category.trim() !== '' && eventData.template.trim() !== '';
      case 'settings':
        return true; // All settings have defaults
      case 'preferences':
        return true; // Preferences are optional
      case 'schedule':
        return eventData.startTime > new Date();
      case 'review':
        return true; // Review step is always valid
      default:
        return false;
    }
  };

  // Step navigation
  const handleNextStep = () => {
    if (currentStep < EVENT_CREATION_STEPS.length - 1) {
      Animated.sequence([
        Animated.timing(stepAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(stepAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      Animated.sequence([
        Animated.timing(stepAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(stepAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    (async () => {
      try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
      setUserLocation({
        lat: location.coords.latitude,
        long: location.coords.longitude,
      });
        
        // Set map region to current location
        const currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setMapRegion(currentLocation);
        setSelectedMapLocation(currentLocation);
        
        // Get address for current location
        const addressResponse = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addressResponse.length > 0) {
          const address = addressResponse[0];
          const locationName = formatAddress(address);
          
          setEventData(prev => ({ 
            ...prev, 
            location: locationName === 'Selected Location' ? 'Current Location' : locationName,
            coordinates: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            }
          }));
        } else {
          setEventData(prev => ({ 
            ...prev, 
            location: 'Current Location',
            coordinates: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude
            }
          }));
        }
      } catch (error) {
        console.error('Error getting current location:', error);
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Helper function to format address without duplicates
  const formatAddress = (address: any) => {
    const parts = [];
    
    // Prioritize name field (usually contains full address with street number)
    if (address.name) {
      parts.push(address.name);
    }
    
    // Add city if available and not already included
    if (address.city && (!address.name || !address.name.includes(address.city))) {
      parts.push(address.city);
    }
    
    // Add region/state if available and not already included
    if (address.region && (!address.name || !address.name.includes(address.region))) {
      parts.push(address.region);
    }
    
    // If we have no parts yet, try street as fallback
    if (parts.length === 0 && address.street) {
      parts.push(address.street);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Selected Location';
  };

  // Handle current location
  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to use your current location.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationName = [
          address.name,
          address.street,
          address.city,
          address.region
        ].filter(Boolean).join(', ');
        
        setEventData(prev => ({ 
          ...prev, 
          location: locationName || 'Current Location',
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }
        }));
      } else {
        setEventData(prev => ({ 
          ...prev, 
          location: 'Current Location',
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }
        }));
      }
      
      setShowLocationOptions(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again or enter manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Handle map tap to update location
  const handleMapTap = async (latitude: number, longitude: number) => {
    setSelectedMapLocation({
      latitude,
      longitude,
      latitudeDelta: selectedMapLocation?.latitudeDelta || 0.01,
      longitudeDelta: selectedMapLocation?.longitudeDelta || 0.01,
    });

    try {
      // Reverse geocode to get address
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationName = formatAddress(address);
        
    setEventData(prev => ({ 
      ...prev, 
          location: locationName,
          coordinates: {
            latitude,
            longitude
          }
        }));
      } else {
        setEventData(prev => ({ 
          ...prev, 
          location: 'Selected Location',
          coordinates: {
            latitude,
            longitude
          }
        }));
      }
    } catch (error) {
      console.error('Error getting address for tapped location:', error);
      setEventData(prev => ({ 
        ...prev, 
        location: 'Selected Location',
        coordinates: {
          latitude,
          longitude
        }
      }));
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = PING_CATEGORIES.find(cat => cat.id === categoryId);
    setEventData(prev => ({ 
      ...prev, 
      category: category?.label || categoryId, // Store the label, not the ID
      template: '', // Reset template when category changes
      connectionIntents: category?.connectionIntents || []
    }));
  };

  const handleTemplateChange = (templateId: string) => {
    // Find the category by looking through all categories since we store the label
    const category = PING_CATEGORIES.find(cat => cat.label === eventData.category);
    const template = category?.templates.find(t => t.id === templateId);
    
    if (template) {
      // Apply template preference weights
      const newPreferences = { ...eventData.eventPreferences };
      template.preferenceWeights.forEach(({ key, weight }) => {
        if (key in newPreferences) {
          newPreferences[key as keyof EventPreferences] = weight > 0.5;
        }
      });

      setEventData(prev => ({ 
        ...prev, 
        template: template.label, // Store the label, not the ID
        eventPreferences: newPreferences
      }));
    }
  };

  const handleConnectionIntentToggle = (intent: string) => {
    setEventData(prev => ({
      ...prev,
      connectionIntents: prev.connectionIntents.includes(intent)
        ? prev.connectionIntents.filter(i => i !== intent)
        : [...prev.connectionIntents, intent]
    }));
  };

  const handleEventPreferenceToggle = (preference: keyof EventPreferences) => {
    setEventData(prev => ({
      ...prev,
      eventPreferences: {
        ...prev.eventPreferences,
        [preference]: !prev.eventPreferences[preference]
      }
    }));
  };

  const formatDateTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-US', options);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const handleDateConfirm = () => {
    setEventData({ ...eventData, startTime: tempDate });
    setShowDatePicker(false);
  };

  const handleSelectEventImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "We need access to your photos to set an event image"
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
        const selectedUri = result.assets[0].uri;
        setEventData({ ...eventData, eventImage: selectedUri });
      }
    } catch (err) {
      console.log("Image picker error:", err);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Generate a unique filename with timestamp
      const timestamp = new Date().getTime();
      const filename = `event_${timestamp}.jpg`;
      
      // Match the exact path structure from the rules: eventImages/{userId}/{fileName}
      const storageRef = ref(storage, `eventImages/${user?.uid}/${filename}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    if (!user?.uid) {
      Alert.alert('Error', 'You must be logged in to create an event');
      return;
    }

    // Check for any field errors
    if (Object.values(fieldErrors).some(error => error)) {
      Alert.alert(
        "Inappropriate Content",
        "Please remove any inappropriate content before creating the event.",
        [{ text: "OK" }]
      );
      return;
    }

    // Validate required fields
    if (!eventData.title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }
    if (!eventData.description.trim()) {
      Alert.alert('Error', 'Please enter an event description');
      return;
    }
    if (!eventData.category.trim()) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!eventData.template.trim()) {
      Alert.alert('Error', 'Please select a template');
      return;
    }
    if (!eventData.location.trim()) {
      Alert.alert('Error', 'Please select a location');
      return;
    }

    try {
      setIsSubmitting(true);
      let imageUrl = null;
      if (eventData.eventImage) {
        imageUrl = await uploadImage(eventData.eventImage);
      }

      // Get user's name
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const creatorName = userData?.name || user.displayName || user.email || 'Unknown';

      const newEvent = {
        creatorId: user.uid,
        creatorName: creatorName,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        coordinates: eventData.coordinates,
        category: eventData.category,
        template: eventData.template,
        duration: eventData.duration,
        maxParticipants: eventData.maxParticipants,
        pingType: eventData.pingType,
        visibilityRadius: eventData.visibilityRadius,
        connectionIntents: eventData.connectionIntents,
        eventPreferences: eventData.eventPreferences,
        startTime: eventData.startTime.toISOString(),
        eventImage: imageUrl,
        createdAt: new Date().toISOString(),
        status: 'active',
        participants: [user.uid],
        participantCount: 1,
      };

      await addEvent(newEvent);
      router.replace('/');
    } catch (err: any) {
      console.error('Error creating event:', err);
      Alert.alert('Error', err.message || 'Failed to create event. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Add new useEffect for fade animation
  useEffect(() => {
    if (!authLoading && !loading) {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(screenOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(screenScale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        ]).start();
        setInitialLoadComplete(true);
      }, 400);
    }
  }, [authLoading, loading]);

  // Show black screen during auth check
  if (!user?.uid) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <View style={styles.loadingContainer}>
          <ModernLoadingIndicator color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
        </View>
      </LinearGradient>
    );
  }

  // Show loading state
  if (authLoading || loading || !initialLoadComplete) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <View style={styles.loadingContainer}>
          <ModernLoadingIndicator color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
        </View>
      </LinearGradient>
    );
  }

  const screenStyle = {
    opacity: screenOpacity,
    transform: [{ scale: screenScale }],
  };

  // Render step content
  const renderStepContent = () => {
    const step = EVENT_CREATION_STEPS[currentStep];
    
    switch (step.key) {
      case 'location':
        return renderLocationStep();
      case 'details':
        return renderDetailsStep();
      case 'category':
        return renderCategoryStep();
      case 'settings':
        return renderSettingsStep();
      case 'preferences':
        return renderPreferencesStep();
      case 'schedule':
        return renderScheduleStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  const renderLocationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepDescription}>
        <Text style={[styles.stepDescriptionText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Choose where your event will take place. You can use your current location or select a specific spot on the map.
        </Text>
      </View>
      
      {/* Map Container */}
      <View style={[styles.mapContainer, {
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
      }]}>
        <MapView
          style={styles.map}
          region={mapRegion}
          onPress={(event) => {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            handleMapTap(latitude, longitude);
          }}
          onRegionChangeComplete={(region) => {
            setMapRegion(region);
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          showsBuildings={true}
          showsTraffic={false}
          showsIndoors={true}
        >
          {selectedMapLocation && (
            <Marker
              coordinate={{
                latitude: selectedMapLocation.latitude,
                longitude: selectedMapLocation.longitude,
              }}
              pinColor={theme === "light" ? "#37a4c8" : "#38a5c9"}
              title="Selected Location"
              description="This is your chosen location"
            />
          )}
        </MapView>
        
        {/* Map Instructions */}
        <View style={[styles.mapInstructions, {
          backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.95)",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
        }]}>
          <MaterialIcons 
            name="touch-app" 
            size={16} 
            color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
          />
          <Text style={[styles.mapInstructionsText, { 
            color: theme === "light" ? "#000000" : "#ffffff" 
          }]}>
            Tap on the map to select location
          </Text>
        </View>
        
        {/* Location Indicator */}
        {selectedMapLocation && (
          <View style={[styles.mapLocationIndicator, {
            backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.95)",
            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
          }]}>
            <MaterialIcons 
              name="check-circle" 
              size={16} 
              color={theme === "light" ? "#10b981" : "#34d399"} 
            />
            <Text style={[styles.mapLocationText, { 
              color: theme === "light" ? "#000000" : "#ffffff" 
            }]}>
              Location selected
            </Text>
          </View>
        )}
      </View>

      {/* Location Options */}
      {eventData.location ? (
        <View style={[styles.locationSelected, { 
          backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
        }]}>
          <View style={styles.locationContent}>
            <MaterialIcons 
              name="location-on" 
              size={20} 
              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
            />
            <Text style={[styles.locationText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{eventData.location}</Text>
          </View>
          <TouchableOpacity
            style={[styles.locationEditButton, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}
            onPress={() => setShowLocationOptions(true)}
          >
            <Feather name="edit-2" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[
            styles.locationInput,
            { 
              backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
            }
          ]}
          onPress={() => setShowLocationOptions(true)}
          activeOpacity={0.6}
        >
          <View style={styles.locationContent}>
            <MaterialIcons 
              name="location-on" 
              size={20} 
              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
            />
            <Text style={[styles.locationText, { color: theme === "light" ? "#94a3b8" : "#64748B" }]}>Choose location</Text>
          </View>
          <Feather name="chevron-down" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepDescription}>
        <Text style={[styles.stepDescriptionText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Give your event a catchy title and describe what people can expect. Be specific about activities, requirements, and what makes your event special.
        </Text>
      </View>
      
      <View style={[styles.settingsItem, {
        backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
        borderColor: fieldErrors['title'] ? "#ff4444" : "#37a4c8"
      }]}>
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="edit-3" size={24} color="#37a4c8" />
          <TextInput
            style={[styles.settingsTextInput, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe"
            }]}
            placeholder="Event Title"
            placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
            value={eventData.title}
            onChangeText={(text) => {
              if (containsFilteredContent(text)) {
                setFieldErrors(prev => ({ ...prev, title: true }));
              } else {
                setFieldErrors(prev => ({ ...prev, title: false }));
              }
              setEventData({ ...eventData, title: text });
            }}
          />
        </View>
      </View>

      <View style={[styles.settingsItem, {
        backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
        borderColor: fieldErrors['description'] ? "#ff4444" : "#37a4c8"
      }]}>
        <View style={[styles.descriptionContainer, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <View style={styles.descriptionHeader}>
            <Feather name="file-text" size={24} color="#37a4c8" />
            <Text style={[styles.descriptionLabel, { 
              color: theme === "light" ? "#64748B" : "#94A3B8" 
            }]}>
              Event Description
            </Text>
          </View>
          <TextInput
            style={[styles.descriptionInput, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe",
              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000"
            }]}
            placeholder="Share the details of your event... What will people be doing? What should they bring? Any special requirements?"
            placeholderTextColor={theme === "light" ? "#94A3B8" : "#64748B"}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={eventData.description}
            onChangeText={(text) => {
              if (containsFilteredContent(text)) {
                setFieldErrors(prev => ({ ...prev, description: true }));
              } else {
                setFieldErrors(prev => ({ ...prev, description: false }));
              }
              setEventData({ ...eventData, description: text });
            }}
          />
          <Text style={[styles.characterCount, { 
            color: theme === "light" ? "#94A3B8" : "#64748B" 
          }]}>
            {eventData.description.length}/500 characters
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={handleSelectEventImage}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="image" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            {eventData.eventImage ? "Change Image" : "Add Event Image"}
          </Text>
          <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderCategoryStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepDescription}>
        <Text style={[styles.stepDescriptionText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Choose a category that best describes your event, then select a template to get started with predefined settings.
        </Text>
      </View>
      
      <View style={styles.categorySection}>
        <Text style={[styles.categorySectionTitle, { 
          color: theme === "light" ? "#0F172A" : "#e4fbfe" 
        }]}>Event Category</Text>
        <View style={styles.categoryContainer}>
          {categoryOptions.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                { 
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                },
                eventData.category === category.label && styles.selectedCategory
              ]}
              onPress={() => handleCategoryChange(category.id)}
            >
              <Text style={[
                styles.categoryText,
                { color: theme === "light" ? "#0F172A" : "#e4fbfe" },
                eventData.category === category.label && styles.selectedCategoryText
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {eventData.category && (
        <View style={styles.categorySection}>
          <Text style={[styles.categorySectionTitle, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>Event Template</Text>
          <View style={styles.categoryContainer}>
            {getTemplateOptions(eventData.category).map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.categoryButton,
                  { 
                    backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                    borderColor: "#37a4c8"
                  },
                  eventData.template === template.label && styles.selectedCategory
                ]}
                onPress={() => handleTemplateChange(template.id)}
              >
                <Text style={[
                  styles.categoryText,
                  { color: theme === "light" ? "#0F172A" : "#e4fbfe" },
                  eventData.template === template.label && styles.selectedCategoryText
                ]}>
                  {template.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderSettingsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepDescription}>
        <Text style={[styles.stepDescriptionText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Configure the basic settings for your event including duration, maximum participants, visibility radius, and privacy settings.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={() => {
          setSelectionType('duration');
          setSelectionOptions(durationOptions.map(opt => ({ id: opt, label: opt })));
          setShowSelectionModal(true);
        }}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="clock" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            Duration: {eventData.duration}
          </Text>
          <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={() => {
          setSelectionType('participants');
          setSelectionOptions(participantOptions.map(opt => ({ id: opt, label: opt })));
          setShowSelectionModal(true);
        }}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="users" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            Max Participants: {eventData.maxParticipants}
          </Text>
          <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={() => {
          setSelectionType('radius');
          setSelectionOptions(radiusOptions.map(opt => ({ id: opt, label: opt })));
          setShowSelectionModal(true);
        }}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="map-pin" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            Visibility: {eventData.visibilityRadius}
          </Text>
          <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={() => {
          setSelectionType('pingType');
          setSelectionOptions(pingTypeOptions.map(opt => ({ id: opt.id, label: opt.label })));
          setShowSelectionModal(true);
        }}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="shield" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            Privacy: {pingTypeOptions.find(opt => opt.id === eventData.pingType)?.label}
          </Text>
          <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPreferencesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepDescription}>
        <Text style={[styles.stepDescriptionText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Fine-tune your event preferences to help match with the right people. These settings help create better connections.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={() => setShowConnectionIntents(!showConnectionIntents)}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="heart" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            {eventData.connectionIntents.length} intent{eventData.connectionIntents.length !== 1 ? 's' : ''} selected
          </Text>
          <Feather 
            name={showConnectionIntents ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#37a4c8" 
            style={styles.chevronIcon} 
          />
        </View>
      </TouchableOpacity>
      
      {showConnectionIntents && (
        <View style={[styles.connectionIntentsContainer, {
          backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
          borderColor: "#37a4c8"
        }]}>
          {CONNECTION_INTENTS.map((intent) => (
            <TouchableOpacity
              key={intent}
              style={[
                styles.intentButton,
                { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                  borderColor: "#37a4c8"
                },
                eventData.connectionIntents.includes(intent) && styles.selectedIntent
              ]}
              onPress={() => handleConnectionIntentToggle(intent)}
            >
              <Text style={[
                styles.intentText,
                { color: theme === "light" ? "#0F172A" : "#e4fbfe" },
                eventData.connectionIntents.includes(intent) && styles.selectedIntentText
              ]}>
                {intent}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={() => setShowEventPreferences(!showEventPreferences)}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="settings" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            Customize event preferences
          </Text>
          <Feather 
            name={showEventPreferences ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#37a4c8" 
            style={styles.chevronIcon} 
          />
        </View>
      </TouchableOpacity>
      
      {showEventPreferences && (
        <View style={[styles.preferencesContainer, {
          backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
          borderColor: "#37a4c8"
        }]}>
          {Object.entries(eventData.eventPreferences).map(([key, value]) => (
            <View key={key} style={styles.preferenceItem}>
              <Text style={[styles.preferenceText, { 
                color: theme === "light" ? "#0F172A" : "#e4fbfe" 
              }]}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Text>
              <Switch
                value={value}
                onValueChange={() => handleEventPreferenceToggle(key as keyof EventPreferences)}
                trackColor={{ false: "#767577", true: "#37a4c8" }}
                thumbColor={value ? "#ffffff" : "#f4f3f4"}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderScheduleStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepDescription}>
        <Text style={[styles.stepDescriptionText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Choose when your event will take place. Make sure to give people enough notice to plan ahead.
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.settingsItem, {
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: "#37a4c8"
        }]} 
        onPress={() => {
          setTempDate(eventData.startTime);
          setShowDatePicker(true);
        }}
      >
        <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
          <Feather name="calendar" size={24} color="#37a4c8" />
          <Text style={[styles.settingsText, { 
            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
          }]}>
            {formatDateTime(eventData.startTime)}
          </Text>
          <Feather name="chevron-right" size={24} color="#37a4c8" style={styles.chevronIcon} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepDescription}>
        <Text style={[styles.stepDescriptionText, { 
          color: theme === "light" ? "#64748B" : "#94A3B8" 
        }]}>
          Review all the details of your event before creating it. Make sure everything looks perfect!
        </Text>
      </View>
      
      <View style={[styles.reviewCard, {
        backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
      }]}>
        <Text style={[styles.reviewTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
          {eventData.title || 'Untitled Event'}
        </Text>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Location</Text>
          <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            {eventData.location || 'Not set'}
          </Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Date & Time</Text>
          <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            {formatDateTime(eventData.startTime)}
          </Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Duration</Text>
          <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            {eventData.duration}
          </Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Max Participants</Text>
          <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            {eventData.maxParticipants}
          </Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Category</Text>
          <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            {eventData.category}
          </Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Template</Text>
          <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            {eventData.template}
          </Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Privacy</Text>
          <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
            {pingTypeOptions.find(opt => opt.id === eventData.pingType)?.label}
          </Text>
        </View>
        
        {eventData.description && (
          <View style={styles.reviewSection}>
            <Text style={[styles.reviewLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>Description</Text>
            <Text style={[styles.reviewValue, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
              {eventData.description}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <>
    <TopBar onProfilePress={() => {}} notificationCount={notificationCount} showBackButton={false} />
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Animated.View style={[{ flex: 1 }, screenStyle]}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              bounces={true}
              alwaysBounceVertical={false}
              keyboardShouldPersistTaps="handled"
            >
              <Animated.View style={{ opacity: fadeAnim }}>
                {/* Progress Header */}
                <View style={styles.progressHeader}>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${((currentStep + 1) / EVENT_CREATION_STEPS.length) * 100}%`,
                            backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.progressText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Step {currentStep + 1} of {EVENT_CREATION_STEPS.length}
                    </Text>
                  </View>
                  
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepIconContainer, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                    }]}>
                      <Feather 
                        name={EVENT_CREATION_STEPS[currentStep].icon as any} 
                        size={24} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                    </View>
                    <View style={styles.stepHeaderText}>
                      <Text style={[styles.stepTitle, { 
                        color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                      }]}>
                        {EVENT_CREATION_STEPS[currentStep].title}
                      </Text>
                      <Text style={[styles.stepSubtitle, { 
                        color: theme === "light" ? "#64748B" : "#94A3B8" 
                      }]}>
                        {EVENT_CREATION_STEPS[currentStep].subtitle}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Step Content */}
                <Animated.View style={[{ opacity: stepAnim }]}>
                  {renderStepContent()}
                </Animated.View>

                {/* Navigation Buttons */}
                <View style={styles.navigationContainer}>
                  {currentStep > 0 && (
                    <TouchableOpacity
                      style={[styles.navButton, styles.backButton, {
                        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                      }]}
                      onPress={handlePrevStep}
                      activeOpacity={0.7}
                    >
                      <Feather name="chevron-left" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.navButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                        Back
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.navButton, styles.nextButton, {
                      backgroundColor: isStepValid() ? (theme === "light" ? "#37a4c8" : "#38a5c9") : "#64748B",
                      opacity: (loading || isSubmitting || Object.values(fieldErrors).some(error => error)) ? 0.6 : 1
                    }]}
                    onPress={handleNextStep}
                    disabled={!isStepValid() || loading || isSubmitting || Object.values(fieldErrors).some(error => error)}
                    activeOpacity={0.7}
                  >
                    {loading || isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Text style={[styles.navButtonText, { color: "#FFFFFF" }]}>
                          {currentStep === EVENT_CREATION_STEPS.length - 1 ? 'Create Event' : 'Continue'}
                        </Text>
                        <Feather name="chevron-right" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {Object.values(fieldErrors).some(error => error) && (
                  <Text style={[styles.errorMessage, { 
                    color: theme === "light" ? "#ef4444" : "#f87171" 
                  }]}>
                    Please fix the highlighted errors before continuing
                  </Text>
                )}
              </Animated.View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>

        {/* Location Options Modal */}
        {showLocationOptions && (
          <View style={[styles.locationOptions, { 
            backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
          }]}>
            <TouchableOpacity
              style={[
                styles.locationOption,
                {
                  backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                }
              ]}
              onPress={handleGetCurrentLocation}
              activeOpacity={0.6}
              disabled={isGettingLocation}
            >
              <View style={styles.locationOptionContent}>
                <MaterialIcons 
                  name="my-location" 
                  size={20} 
                  color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                />
                <View style={styles.locationOptionText}>
                  <Text style={[styles.locationOptionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Use Current Location</Text>
                  <Text style={[styles.locationOptionSubtitle, { color: theme === "light" ? "#64748B" : "#64748B" }]}>Automatically detect your location</Text>
                </View>
              </View>
              {isGettingLocation ? (
                <ActivityIndicator size="small" color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              ) : (
                <Feather name="chevron-right" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.locationCancel}
              onPress={() => setShowLocationOptions(false)}
            >
              <Text style={[styles.locationCancelText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selection Modal */}
        {showSelectionModal && (
          <View style={[styles.selectionModal, {
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: "#37a4c8"
          }]}>
            <View style={[styles.selectionModalHeader, { 
              borderBottomColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              backgroundColor: theme === "light" ? "#ffffff" : "#000000"
            }]}>
              <Text style={[styles.selectionModalTitle, { 
                color: theme === "light" ? "#0F172A" : "#e4fbfe" 
              }]}>
                Select {selectionType === 'duration' ? 'Duration' : 
                       selectionType === 'participants' ? 'Max Participants' :
                       selectionType === 'radius' ? 'Visibility Radius' : 'Privacy Type'}
              </Text>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowSelectionModal(false)}
              >
                <Text style={[styles.cancelButtonText, {
                  color: theme === "light" ? "#64748B" : "#37a4c8"
                }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.selectionOptionsContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.selectionOptionsContent}
            >
              {selectionOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.selectionOption, { 
                    borderBottomColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                    backgroundColor: theme === "light" ? "#ffffff" : "#000000"
                  }]}
                  onPress={() => {
                    if (selectionType === 'duration') {
                      setEventData(prev => ({ ...prev, duration: option.id }));
                    } else if (selectionType === 'participants') {
                      setEventData(prev => ({ ...prev, maxParticipants: option.id }));
                    } else if (selectionType === 'radius') {
                      setEventData(prev => ({ ...prev, visibilityRadius: option.id }));
                    } else if (selectionType === 'pingType') {
                      setEventData(prev => ({ ...prev, pingType: option.id }));
                    }
                    setShowSelectionModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.selectionOptionText, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <View style={[styles.datePickerContainer, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: "#37a4c8"
          }]}>
            <View style={styles.datePickerWrapper}>
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={new Date()}
                textColor={theme === "light" ? "#000000" : "#e4fbfe"}
              />
            </View>
            <View style={[styles.datePickerButtons, { borderTopColor: "#37a4c8" }]}>
              <TouchableOpacity 
                style={[styles.datePickerButton, styles.datePickerCancelButton]} 
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.datePickerButton, styles.datePickerDoneButton]} 
                onPress={handleDateConfirm}
              >
                <Text style={styles.datePickerDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.5,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  backgroundGradient: {
    borderRadius: 24,
    padding: 16,
    marginVertical: 20,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  
  // Progress and Step Header Styles
  progressHeader: {
    marginBottom: 32,
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepHeaderText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 16,
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  
  // Step Content Styles
  stepContainer: {
    marginBottom: 32,
  },
  stepDescription: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  stepDescriptionText: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  categorySection: {
    marginBottom: 24,
  },
  categorySectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  
  // Review Step Styles
  reviewCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  reviewSection: {
    marginBottom: 12,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
  },
  
  // Navigation Styles
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginTop: 32,
    marginBottom: 24,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 120,
    elevation: 4,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    gap: 8,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  nextButton: {
    flex: 1,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // Existing styles from the original component
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSection: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: 'left',
  },
  settingsItem: {
    marginBottom: 18,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  settingsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
  },
  settingsText: {
    fontSize: 16,
    marginLeft: 18,
    flex: 1,
    fontWeight: "500",
  },
  settingsTextInput: {
    flex: 1,
    marginLeft: 18,
    fontSize: 16,
    padding: 0,
    fontWeight: "400",
  },
  chevronIcon: {
    marginLeft: "auto",
  },
  searchContainer: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchInputGradient: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  searchPlaceholder: {
    color: '#e4fbfe',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#e4fbfe',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
    paddingTop: 4,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  categoryButton: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1.5,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  selectedCategory: {
    backgroundColor: '#37a4c8',
    elevation: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  selectedCategoryText: {
    color: '#FFFFFF',
    fontWeight: "700",
  },
  dateText: {
    color: '#e4fbfe',
    fontSize: 14,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyText: {
    color: '#e4fbfe',
    fontSize: 16,
  },
  searchModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1.5,
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 16,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 14,
    fontSize: 16,
    padding: 0,
    fontWeight: "500",
  },
  searchResultsContainer: {
    flex: 1,
  },
  searchResultsContent: {
    paddingBottom: 24,
  },
  airportItem: {
    borderBottomWidth: 1,
  },
  airportItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 22,
  },
  airportItemInfo: {
    flex: 1,
    marginLeft: 18,
    marginRight: 14,
  },
  airportName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  airportCode: {
    fontSize: 14,
    color: "#37a4c8",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  cancelButton: {
    padding: 14,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    marginTop: 40,
    marginBottom: 50,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1.5,
    elevation: 10,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginLeft: 8,
  },
  createButtonContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 50,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  datePickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1.5,
  },
  datePickerButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    minWidth: 130,
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#38a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  datePickerCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#37a4c8',
  },
  datePickerDoneButton: {
    backgroundColor: '#37a4c8',
  },
  datePickerCancelText: {
    color: '#37a4c8',
    fontSize: 16,
    fontWeight: "600",
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: "700",
  },
  inputError: {
    borderColor: "#ff4444",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicatorContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerSection: {
    marginBottom: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'left',
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748B",
    letterSpacing: 0.2,
    textAlign: 'left',
    lineHeight: 22,
  },
  descriptionContainer: {
    padding: 20,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
    letterSpacing: 0.2,
  },
  descriptionInput: {
    minHeight: 120,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
    fontWeight: "400",
    borderWidth: 1,
    borderColor: 'transparent',
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: 8,
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  connectionIntentsContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intentButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedIntent: {
    backgroundColor: '#37a4c8',
  },
  intentText: {
    fontSize: 12,
    fontWeight: "500",
  },
  selectedIntentText: {
    color: '#FFFFFF',
    fontWeight: "600",
  },
  preferencesContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.2)',
  },
  preferenceText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  mapContainer: {
    height: 310,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.15)',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLocationIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  mapLocationText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  mapInstructions: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  mapInstructionsText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  locationSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    marginBottom: 20,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  locationOptions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    marginTop: 8,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.1)',
  },
  locationOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationOptionText: {
    marginLeft: 12,
  },
  locationOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  locationOptionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  locationCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 165, 201, 0.1)',
  },
  locationCancelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
  },
  locationEditButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  selectionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1.5,
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  selectionModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  selectionOptionsContainer: {
    flex: 1,
  },
  selectionOptionsContent: {
    paddingBottom: 24,
  },
  selectionOption: {
    borderBottomWidth: 1,
    padding: 22,
  },
  selectionOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});

export default EventCreation;
