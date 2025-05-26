import React, { useState, useEffect } from 'react';
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
import { auth } from '../../config/firebaseConfig';
import { useRouter } from 'expo-router';
import TopBar from '../components/TopBar';
import LoadingScreen from '../components/LoadingScreen';

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEventData({ ...eventData, startTime: selectedDate });
    }
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

  const handleSubmit = async () => {
    if (!selectedAirport) {
      Alert.alert('Error', 'Please select an airport');
      return;
    }
    try {
      const newEvent = {
        ...eventData,
        startTime: eventData.startTime.toISOString(),
        createdAt: new Date(),
        organizer: user?.uid || '',
        attendees: [user?.uid || ''],
      };
      await addEvent(newEvent);
      Alert.alert('Success', 'Event created successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create event');
    }
  };

  // Show loading state
  if (authLoading || loading) {
    return <LoadingScreen message="Creating your event..." />;
  }

  return (
    <>
    <TopBar onProfilePress={() => {}} />
    <SafeAreaView style={styles.flex}>
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={styles.contentContainer}>
              <LinearGradient
                colors={['#1a1a1a', '#000000']}
                style={styles.backgroundGradient}
              >
                {/* Select Airport Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Select Airport</Text>
                  <TouchableOpacity 
                    style={styles.searchContainer}
                    onPress={() => setShowSearch(true)}
                  >
                    <LinearGradient
                      colors={['#1a1a1a', '#000000']}
                      style={styles.searchInputGradient}
                    >
                      <Text style={styles.searchPlaceholder}>
                        {selectedAirport?.name || 'Search airports...'}
                      </Text>
                      <Feather name="search" size={20} color="#38a5c9" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Event Details Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Event Details</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Event Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter event name"
                      placeholderTextColor="#64748B"
                      value={eventData.name}
                      onChangeText={(text) => setEventData({ ...eventData, name: text })}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      placeholder="Describe your event"
                      placeholderTextColor="#64748B"
                      multiline
                      value={eventData.description}
                      onChangeText={(text) => setEventData({ ...eventData, description: text })}
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Event Image</Text>
                    <TouchableOpacity style={styles.input} onPress={handleSelectEventImage}>
                      <Text style={styles.dateText}>
                        {eventData.eventImage ? "Image selected" : "Select an image"}
                      </Text>
                      <Feather name="image" size={18} color="#38a5c9" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Category Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Category</Text>
                  <View style={styles.categoryContainer}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryButton,
                          eventData.category === category && styles.selectedCategory
                        ]}
                        onPress={() => setEventData({ ...eventData, category })}
                      >
                        <Text style={[
                          styles.categoryText,
                          eventData.category === category && styles.selectedCategoryText
                        ]}>{category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Event Time Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Event Time</Text>
                  <TouchableOpacity 
                    style={styles.input} 
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {eventData.startTime.toLocaleString()}
                    </Text>
                    <Feather name="clock" size={18} color="#38a5c9" />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={eventData.startTime}
                      mode="datetime"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </View>

                {/* Privacy Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Privacy</Text>
                  <View style={styles.privacyContainer}>
                    <View style={styles.switchContainer}>
                      <MaterialIcons 
                        name={eventData.private ? 'lock' : 'public'} 
                        size={24} 
                        color="#38a5c9" 
                      />
                      <Text style={styles.privacyText}>
                        {eventData.private ? 'Private Event' : 'Public Event'}
                      </Text>
                    </View>
                    <Switch
                      value={eventData.private}
                      onValueChange={(value) => setEventData({ ...eventData, private: value })}
                      trackColor={{ false: '#1a1a1a', true: '#38a5c9' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              </LinearGradient>

              {/* Create Button */}
              <LinearGradient
                colors={['#38a5c9', '#2F80ED']}
                style={styles.createButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <TouchableOpacity 
                  onPress={handleSubmit}
                  disabled={loading}
                  style={styles.buttonInner}
                >
                  <Text style={styles.createButtonText}>Create Event</Text>
                </TouchableOpacity>
              </LinearGradient>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>

        {/* Airport Search Modal */}
        {showSearch && (
          <LinearGradient
            colors={['#1a1a1a', '#000000']}
            style={styles.searchModal}
          >
            <View style={styles.searchModalHeader}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search airports..."
                placeholderTextColor="#64748B"
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
                  style={styles.airportItem}
                  onPress={() => handleSelectAirport(airport)}
                >
                  <Text style={styles.airportName}>{airport.name}</Text>
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
    backgroundColor: "#000000",
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
    gap: 8,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  selectedCategory: {
    backgroundColor: '#38a5c9',
  },
  categoryText: {
    color: '#e4fbfe',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#000000',
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
    color: '#e4fbfe',
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
    marginTop: 24,
    marginBottom: 32,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EventCreation;
