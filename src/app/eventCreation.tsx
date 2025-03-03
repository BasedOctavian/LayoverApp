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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons } from '@expo/vector-icons';
import useEvents from '../hooks/useEvents';
import useAuth from '../hooks/auth';
import useAirports, { Airport } from '../hooks/useAirports';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'expo-router';

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
  const [eventCoords, setEventCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [region, setRegion] = useState({
    latitude: 40.6895,
    longitude: -74.1745,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
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
    airportCode: '', // Added to store the selected airport's code
  });

  const searchType = 'events';

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
    return unsubscribe; // Cleanup on unmount
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
      setEventData(prev => ({ ...prev, airportCode: nearestAirport.airportCode })); // Set airportCode
    }
  }, [userLocation, allAirports, selectedAirport]);

  const filteredAirports = allAirports.filter(airport =>
    airport.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mapRegion = selectedAirport ? {
    latitude: selectedAirport.lat,
    longitude: selectedAirport.long,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  } : null;

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setEventCoords({ lat: latitude, lng: longitude });
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setEventCoords({ lat: latitude, lng: longitude });
  };

  const handleSelectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setEventData(prev => ({ ...prev, airportCode: airport.airportCode })); // Set airportCode
    setShowSearch(false);
    setRegion({
      latitude: airport.lat,
      longitude: airport.long,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
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
    if (!eventCoords || !selectedAirport) {
      Alert.alert('Error', 'Please select an airport and event location');
      return;
    }

    try {
      const newEvent = {
        ...eventData,
        latitude: eventCoords.lat.toString(),
        longitude: eventCoords.lng.toString(),
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.contentContainer}>
          <LinearGradient
            colors={['#F8FAFC', '#FFFFFF']}
            style={styles.backgroundGradient}
          >
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Select Airport</Text>
              <TouchableOpacity 
                style={styles.searchContainer}
                onPress={() => setShowSearch(true)}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F1F5F9']}
                  style={styles.searchInputGradient}
                >
                  <Text style={styles.searchPlaceholder}>
                    {selectedAirport?.name || 'Search airports...'}
                  </Text>
                  <Feather name="search" size={20} color="#64748B" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Event Location</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={mapRegion || {
                    latitude: 40.6895,
                    longitude: -74.1745,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                  onLongPress={handleMapPress}
                >
                  {selectedAirport && (
                    <Marker
                      coordinate={{
                        latitude: selectedAirport.lat,
                        longitude: selectedAirport.long,
                      }}
                      title="Selected Airport"
                      pinColor="#2F80ED"
                    />
                  )}
                  {eventCoords && (
                    <Marker
                      coordinate={{
                        latitude: eventCoords.lat,
                        longitude: eventCoords.lng,
                      }}
                      title="Event Location"
                      pinColor="#ff6b6b"
                      draggable
                      onDragEnd={handleMarkerDragEnd}
                    />
                  )}
                </MapView>
                <Text style={styles.mapHelperText}>Hold on the map to place a pin</Text>
              </View>
            </View>

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
                  <Feather name="image" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>

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
                    <Text style={styles.categoryText}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Event Time</Text>
              <TouchableOpacity 
                style={styles.input} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {eventData.startTime.toLocaleString()}
                </Text>
                <Feather name="clock" size={18} color="#64748B" />
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

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Privacy</Text>
              <View style={styles.privacyContainer}>
                <View style={styles.switchContainer}>
                  <MaterialIcons 
                    name={eventData.private ? 'lock' : 'public'} 
                    size={24} 
                    color="#2F80ED" 
                  />
                  <Text style={styles.privacyText}>
                    {eventData.private ? 'Private Event' : 'Public Event'}
                  </Text>
                </View>
                <Switch
                  value={eventData.private}
                  onValueChange={(value) => setEventData({ ...eventData, private: value })}
                  trackColor={{ false: '#CBD5E1', true: '#2F80ED' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </LinearGradient>
        </ScrollView>
      </TouchableWithoutFeedback>

      {showSearch && (
        <LinearGradient
          colors={['rgba(255,255,255,0.98)', 'rgba(241,245,249,0.98)']}
          style={styles.searchModal}
        >
          <View style={styles.searchHeader}>
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
              <Feather name="x" size={24} color="#2F80ED" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {filteredAirports.map((airport, index) => (
              <TouchableOpacity
                key={index}
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

      <LinearGradient
        colors={['#2F80ED', '#1A5FB4']}
        style={styles.createButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading}
          style={styles.buttonInner}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Event</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    marginTop: 25
  },
  backgroundGradient: {
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 0,
    marginTop: 20,
    shadowColor: '#2F80ED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  contentContainer: {
    padding: 0,
    paddingBottom: 100,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  sectionTitle: {
    color: '#1E293B',
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
  },
  searchPlaceholder: {
    color: '#64748B',
    fontSize: 14,
  },
  mapContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  mapHelperText: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 4,
    borderRadius: 8,
    fontSize: 12,
    color: '#1E293B',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#F1F5F9',
  },
  selectedCategory: {
    backgroundColor: '#2F80ED',
  },
  categoryText: {
    color: '#1E293B',
    fontSize: 14,
  },
  dateText: {
    color: '#1E293B',
    fontSize: 14,
  },
  privacyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyText: {
    color: '#1E293B',
    fontSize: 16,
  },
  searchModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    zIndex: 1000,
    padding: 16,
    marginTop: 35,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
  },
  cancelButton: {
    padding: 8,
  },
  airportItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  airportName: {
    color: '#1E293B',
    fontSize: 16,
  },
  airportCode: {
    color: '#64748B',
    fontSize: 14,
  },
  createButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#2F80ED',
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