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
  SafeAreaView,
  Animated,
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
import { ThemeContext } from '../context/ThemeContext';

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
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
        setInitialLoadComplete(true);
      }, 400);
    }
  }, [authLoading, loading]);

  // Show black screen during auth check
  if (!user?.uid) {
    return <View style={{ flex: 1, backgroundColor: theme === "light" ? "#ffffff" : "#000000" }} />;
  }

  // Show loading state
  if (authLoading || loading || !initialLoadComplete) {
    return <View style={{ flex: 1, backgroundColor: theme === "light" ? "#ffffff" : "#000000" }} />;
  }

  return (
    <>
    <TopBar onProfilePress={() => {}} />
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]}>
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
              <ScrollView contentContainerStyle={styles.contentContainer}>
                <LinearGradient
                  colors={theme === "light" ? ['#ffffff', '#e6e6e6'] : ['#1a1a1a', '#000000']}
                  style={styles.backgroundGradient}
                >
                  {/* Select Airport Section */}
                  <View style={[styles.sectionContainer, { 
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    borderColor: "#37a4c8"
                  }]}>
                    <Text style={[styles.sectionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Select Airport</Text>
                    <TouchableOpacity 
                      style={styles.searchContainer}
                      onPress={() => setShowSearch(true)}
                    >
                      <LinearGradient
                        colors={theme === "light" ? ['#ffffff', '#e6e6e6'] : ['#1a1a1a', '#000000']}
                        style={styles.searchInputGradient}
                      >
                        <Text style={[styles.searchPlaceholder, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                          {selectedAirport?.name || 'Search airports...'}
                        </Text>
                        <Feather name="search" size={20} color="#37a4c8" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>

                  {/* Event Details Section */}
                  <View style={[styles.sectionContainer, { 
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    borderColor: "#37a4c8"
                  }]}>
                    <Text style={[styles.sectionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Event Details</Text>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Event Name</Text>
                      <TextInput
                        style={[styles.input, styles.textInput, { 
                          backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
                          color: theme === "light" ? "#000000" : "#e4fbfe",
                          borderColor: "#37a4c8"
                        }]}
                        placeholder="Enter event name"
                        placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                        value={eventData.name}
                        onChangeText={(text) => setEventData({ ...eventData, name: text })}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.multilineInput, styles.textInput, { 
                          backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
                          color: theme === "light" ? "#000000" : "#e4fbfe",
                          borderColor: "#37a4c8"
                        }]}
                        placeholder="Describe your event"
                        placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                        multiline
                        value={eventData.description}
                        onChangeText={(text) => setEventData({ ...eventData, description: text })}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.label, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Event Image</Text>
                      <TouchableOpacity style={[styles.input, { 
                        backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
                        borderColor: "#37a4c8"
                      }]} onPress={handleSelectEventImage}>
                        <Text style={[styles.dateText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                          {eventData.eventImage ? "Image selected" : "Select an image"}
                        </Text>
                        <Feather name="image" size={18} color="#37a4c8" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Category Section */}
                  <View style={[styles.sectionContainer, { 
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    borderColor: "#37a4c8"
                  }]}>
                    <Text style={[styles.sectionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Category</Text>
                    <View style={styles.categoryContainer}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.categoryButton,
                            { 
                              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                              borderColor: "#37a4c8"
                            },
                            eventData.category === category && styles.selectedCategory
                          ]}
                          onPress={() => setEventData({ ...eventData, category })}
                        >
                          <Text style={[
                            styles.categoryText,
                            { color: theme === "light" ? "#000000" : "#e4fbfe" },
                            eventData.category === category && styles.selectedCategoryText
                          ]}>
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Event Time Section */}
                  <View style={[styles.sectionContainer, { 
                    backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    borderColor: "#37a4c8"
                  }]}>
                    <Text style={[styles.sectionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Event Time</Text>
                    <View style={[styles.timeContainer, { 
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a"
                    }]}>
                      <TouchableOpacity 
                        style={[styles.timeInput, { 
                          backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
                          borderColor: "#37a4c8"
                        }]} 
                        onPress={() => {
                          setTempDate(eventData.startTime);
                          setShowDatePicker(true);
                        }}
                      >
                        <View style={styles.timeContent}>
                          <Feather name="calendar" size={20} color="#37a4c8" />
                          <View style={styles.timeTextContainer}>
                            <Text style={[styles.timeLabel, { color: theme === "light" ? "#64748B" : "#64748B" }]}>Date & Time</Text>
                            <Text style={[styles.timeValue, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                              {formatDateTime(eventData.startTime)}
                            </Text>
                          </View>
                        </View>
                        <Feather name="chevron-right" size={20} style={{ marginLeft: -20 }} color="#37a4c8" />
                      </TouchableOpacity>
                    </View>
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
                  </View>
                </LinearGradient>

                {/* Create Button */}
                <LinearGradient
                  colors={['#37a4c8', '#2F80ED']}
                  style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <TouchableOpacity 
                    onPress={handleSubmit}
                    disabled={loading || isSubmitting}
                    style={[styles.buttonInner, isSubmitting && styles.buttonInnerDisabled]}
                    activeOpacity={0.7}
                  >
                    {loading || isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.createButtonText}>Create Event</Text>
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Airport Search Modal */}
        {showSearch && (
          <LinearGradient
            colors={theme === "light" ? ['#ffffff', '#e6e6e6'] : ['#1a1a1a', '#000000']}
            style={styles.searchModal}
          >
            <View style={[styles.searchModalHeader, { borderBottomColor: "#37a4c8" }]}>
              <TextInput
                style={[styles.searchInput, styles.textInput, { 
                  backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
                  color: theme === "light" ? "#000000" : "#e4fbfe",
                  borderColor: "#37a4c8"
                }]}
                placeholder="Search airports..."
                placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowSearch(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {filteredAirports.map((airport) => (
                <TouchableOpacity
                  key={airport.airportCode}
                  style={[styles.airportItem, { borderBottomColor: "#37a4c8" }]}
                  onPress={() => handleSelectAirport(airport)}
                >
                  <Text style={[styles.airportName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{airport.name}</Text>
                  <Text style={styles.airportCode}>{airport.airportCode}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>
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
    padding: 0,
    paddingBottom: 100,
  },
  sectionContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  sectionTitle: {
    color: '#e4fbfe',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#38a5c9',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCategory: {
    backgroundColor: '#38a5c9',
    borderColor: '#38a5c9',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryText: {
    color: '#e4fbfe',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: '#000000',
    fontWeight: '600',
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
    backgroundColor: '#1a1a1a',
    zIndex: 1000,
    padding: 16,
    marginTop: 35,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38a5c9',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#38a5c9',
    fontSize: 16,
  },
  airportItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#38a5c9',
  },
  airportName: {
    color: '#e4fbfe',
    fontSize: 16,
  },
  airportCode: {
    color: '#38a5c9',
    fontSize: 14,
  },
  createButton: {
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 32,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  buttonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInnerDisabled: {
    opacity: 0.8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    color: '#e4fbfe',
  },
  timeContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#38a5c9',
    borderRadius: 12,
  },
  timeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  timeTextContainer: {
    flex: 1,
  },
  timeLabel: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 4,
  },
  timeValue: {
    color: '#e4fbfe',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  datePickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#38a5c9',
  },
  datePickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  datePickerCancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  datePickerDoneButton: {
    backgroundColor: '#38a5c9',
  },
  datePickerCancelText: {
    color: '#38a5c9',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default EventCreation;
