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
import useEvents from '../hooks/useEvents';
import useAuth from '../hooks/auth';
import useAirports, { Airport } from '../hooks/useAirports';
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

const categories = ['Wellness', 'Food & Drink', 'Entertainment', 'Travel Tips', 'Activity', 'Misc'];

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
  const { getAirports } = useAirports();
  const { addEvent, loading, error } = useEvents();
  const { theme } = React.useContext(ThemeContext);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    category: '',
    startTime: new Date(),
    private: false,
    latitude: '',
    longitude: '',
    organizer: user?.uid || '',
    attendees: [user?.uid || ''],
    createdAt: new Date(),
    eventImage: null as string | null,
    airportCode: '',
  });

  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(0.95)).current;
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const loadAirports = async () => {
      const airports = await getAirports();
      setAllAirports(airports || []);
    };
    loadAirports();
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        long: location.coords.longitude,
      });
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

  useEffect(() => {
    if (userLocation && allAirports.length > 0 && !selectedAirport) {
      const airportsWithDistance = allAirports.map(airport => ({
        ...airport,
        distance: haversineDistance(
          userLocation.lat,
          userLocation.long,
          airport.lat,
          airport.long
        ),
      }));
      airportsWithDistance.sort((a, b) => a.distance - b.distance);
      const nearestAirport = airportsWithDistance[0];
      setSelectedAirport(nearestAirport);
      setEventData(prev => ({ ...prev, airportCode: nearestAirport.airportCode }));
    }
  }, [userLocation, allAirports, selectedAirport]);

  const filteredAirports = allAirports.filter(airport =>
    airport.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setEventData(prev => ({ 
      ...prev, 
      airportCode: airport.airportCode,
      latitude: airport.lat.toString(),
      longitude: airport.long.toString()
    }));
    setShowSearch(false);
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
    if (!eventData.name.trim()) {
      Alert.alert('Error', 'Please enter an event name');
      return;
    }
    if (!eventData.description.trim()) {
      Alert.alert('Error', 'Please enter an event description');
      return;
    }
    if (!eventData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!selectedAirport) {
      Alert.alert('Error', 'Please select an airport');
      return;
    }

    try {
      setIsSubmitting(true);
      let imageUrl = null;
      if (eventData.eventImage) {
        imageUrl = await uploadImage(eventData.eventImage);
      }

      const newEvent = {
        ...eventData,
        startTime: eventData.startTime.toISOString(),
        createdAt: new Date().toISOString(),
        organizer: user.uid,
        attendees: [user.uid],
        private: false,
        eventImage: imageUrl,
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

  return (
    <>
    <TopBar onProfilePress={() => {}} notificationCount={notificationCount} showBackButton={true} />
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={[{ flex: 1 }, screenStyle]}>
              <ScrollView contentContainerStyle={styles.contentContainer}>
                <Animated.View style={{ opacity: fadeAnim }}>
                  {/* Header Section */}
                  <View style={styles.headerSection}>
                    <Text style={[styles.headerTitle, { 
                      color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                    }]}>
                      Create Event
                    </Text>
                    <Text style={[styles.headerSubtitle, { 
                      color: theme === "light" ? "#64748B" : "#94A3B8" 
                    }]}>
                      Share your layover experience with fellow travelers
                    </Text>
                  </View>

                  {/* Airport Selection */}
                  <View style={styles.settingsSection}>
                    <Text style={[styles.sectionTitle, { 
                      color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                    }]}>Location</Text>
                    <TouchableOpacity 
                      style={[styles.airportSelector, {
                        backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                        borderColor: "#37a4c8"
                      }]}
                      onPress={() => setShowSearch(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.airportSelectorContent}>
                        <View style={styles.airportIconContainer}>
                          <Feather name="airplay" size={24} color="#37a4c8" />
                        </View>
                        <View style={styles.airportSelectorTextContainer}>
                          <Text style={[styles.airportSelectorTitle, { 
                            color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                          }]} numberOfLines={1} ellipsizeMode="tail">
                            {selectedAirport?.name || "Select Airport"}
                          </Text>
                          {selectedAirport && (
                            <Text style={styles.airportSelectorCode}>
                              {selectedAirport.airportCode}
                            </Text>
                          )}
                        </View>
                        <View style={styles.airportSelectorArrow}>
                          <Feather name="chevron-right" size={24} color="#37a4c8" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Event Details */}
                  <View style={styles.settingsSection}>
                    <Text style={[styles.sectionTitle, { 
                      color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                    }]}>Event Details</Text>
                    
                    <View style={[styles.settingsItem, {
                      backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
                      borderColor: fieldErrors['name'] ? "#ff4444" : "#37a4c8"
                    }]}>
                      <View style={[styles.settingsGradient, { backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a" }]}>
                        <Feather name="edit-3" size={24} color="#37a4c8" />
                        <TextInput
                          style={[styles.settingsTextInput, { 
                            color: theme === "light" ? "#0F172A" : "#e4fbfe"
                          }]}
                          placeholder="Event Name"
                          placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                          value={eventData.name}
                          onChangeText={(text) => {
                            if (containsFilteredContent(text)) {
                              setFieldErrors(prev => ({ ...prev, name: true }));
                            } else {
                              setFieldErrors(prev => ({ ...prev, name: false }));
                            }
                            setEventData({ ...eventData, name: text });
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

                  {/* Category Selection */}
                  <View style={styles.settingsSection}>
                    <Text style={[styles.sectionTitle, { 
                      color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                    }]}>Category</Text>
                    <View style={styles.categoryContainer}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryButton,
                            { 
                              backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                              borderColor: "#37a4c8"
                            },
                            eventData.category === category && styles.selectedCategory
                          ]}
                          onPress={() => setEventData({ ...eventData, category })}
                        >
                          <Text style={[
                            styles.categoryText,
                            { color: theme === "light" ? "#0F172A" : "#e4fbfe" },
                            eventData.category === category && styles.selectedCategoryText
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Event Time */}
                  <View style={styles.settingsSection}>
                    <Text style={[styles.sectionTitle, { 
                      color: theme === "light" ? "#0F172A" : "#e4fbfe" 
                    }]}>Event Time</Text>
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
                </Animated.View>

                {/* Create Button */}
                <TouchableOpacity 
                  style={[styles.createButton, { borderColor: "#37a4c8" }]} 
                  onPress={handleSubmit}
                  disabled={loading || isSubmitting || Object.values(fieldErrors).some(error => error)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#37a4c8', '#38a5c9']}
                    style={styles.createButtonGradient}
                  >
                    {loading || isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.createButtonText}>Create Event</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Airport Search Modal */}
        {showSearch && (
          <View style={[styles.searchModal, {
            backgroundColor: theme === "light" ? "#ffffff" : "#000000"
          }]}>
            <View style={[styles.searchModalHeader, { 
              borderBottomColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              backgroundColor: theme === "light" ? "#ffffff" : "#000000",
              paddingTop: Platform.OS === 'ios' ? 20 : 10
            }]}>
              <View style={[styles.searchInputContainer, {
                backgroundColor: theme === "light" ? "#F8FAFC" : "#1a1a1a",
                borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8"
              }]}>
                <Feather name="search" size={20} color={theme === "light" ? "#64748B" : "#37a4c8"} />
                <TextInput
                  style={[styles.searchInput, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe"
                  }]}
                  placeholder="Search airports..."
                  placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Feather name="x" size={20} color={theme === "light" ? "#64748B" : "#37a4c8"} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowSearch(false)}
              >
                <Text style={[styles.cancelButtonText, {
                  color: theme === "light" ? "#64748B" : "#37a4c8"
                }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.searchResultsContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchResultsContent}
              keyboardShouldPersistTaps="handled"
            >
              {filteredAirports.map((airport) => (
                <TouchableOpacity
                  key={airport.airportCode}
                  style={[styles.airportItem, { 
                    borderBottomColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
                    backgroundColor: theme === "light" ? "#ffffff" : "#000000"
                  }]}
                  onPress={() => handleSelectAirport(airport)}
                  activeOpacity={0.7}
                >
                  <View style={styles.airportItemContent}>
                    <Feather name="airplay" size={20} color="#37a4c8" />
                    <View style={styles.airportItemInfo}>
                      <Text style={[styles.airportName, { 
                        color: theme === "light" ? "#000000" : "#e4fbfe" 
                      }]} numberOfLines={1} ellipsizeMode="tail">
                        {airport.name}
                      </Text>
                      <Text style={styles.airportCode}>{airport.airportCode}</Text>
                    </View>
                    <Feather name="chevron-right" size={20} color="#37a4c8" />
                  </View>
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
  contentContainer: {
    padding: 24,
    paddingBottom: 120,
  },
  settingsSection: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
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
  airportSelectorTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  airportSelectorCode: {
    fontSize: 14,
    color: "#37a4c8",
    marginTop: 4,
    fontWeight: "600",
    letterSpacing: 0.3,
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
  airportSelector: {
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
  airportSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
  },
  airportIconContainer: {
    marginRight: 18,
  },
  airportSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  airportSelectorArrow: {
    marginLeft: "auto",
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
});

export default EventCreation;
