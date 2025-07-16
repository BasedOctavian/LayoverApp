import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Marker, Region, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const { width } = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
}

interface Event {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  airportCode: string;
  startTime: Date | null;
  attendees: string[];
}

interface Airport {
  airportCode: string;
  name: string;
  lat: number;
  long: number;
  location?: string;
}

interface User {
  id: string;
  lastKnownCoordinates?: {
    latitude: number | null;
    longitude: number | null;
  } | null;
  [key: string]: any; // Allow additional fields
}

interface ExploreMapProps {
  events: Event[];
  airports: Airport[];
  selectedAirport: Airport | null;
  onAirportSelect: (airport: Airport) => void;
  onEventPress: (event: Event) => void;
  currentUserId?: string; // Add current user ID prop
}

export default function ExploreMap({
  events,
  airports,
  selectedAirport,
  onAirportSelect,
  onEventPress,
  currentUserId,
}: ExploreMapProps) {
  const { theme } = React.useContext(ThemeContext);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 40.7128, // New York City as default
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [usersWithNullCoordinates, setUsersWithNullCoordinates] = useState<number>(0);
  const [usersWithLocation, setUsersWithLocation] = useState<User[]>([]);

  // Function to count users with location data
  const countUsersWithLocationData = async () => {
    try {
      const usersCollection = collection(db, "users");
      const snapshot = await getDocs(usersCollection);
      const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as User[];
      
      const usersWithLocationData = users.filter(user => 
        user.lastKnownCoordinates !== null && 
        user.lastKnownCoordinates !== undefined &&
        typeof user.lastKnownCoordinates === 'object' && 
        user.lastKnownCoordinates.latitude !== null && 
        user.lastKnownCoordinates.longitude !== null &&
        user.id !== currentUserId // Exclude the authenticated user
      );
      
      setUsersWithLocation(usersWithLocationData);
      setUsersWithNullCoordinates(usersWithLocationData.length);
    } catch (error) {
      console.error('Error counting users with location data:', error);
      setUsersWithNullCoordinates(0);
      setUsersWithLocation([]);
    }
  };

  // Get current location on component mount
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Please enable location services to see nearby events and airports.',
            [{ text: 'OK' }]
          );
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setCurrentLocation(newLocation);
        
        // Update map region to show current location immediately
        const newRegion = {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        };
        
        setRegion(newRegion);
      } catch (error) {
        console.error('Error getting location:', error);
        // Keep the default New York location if getting user location fails
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentLocation();
    countUsersWithLocationData();
  }, []);

  const handleMapPress = () => {
    // Optional: Handle map press events
  };

  const handleMarkerPress = (markerType: 'event' | 'airport', data: Event | Airport) => {
    if (markerType === 'event') {
      onEventPress(data as Event);
    } else if (markerType === 'airport') {
      onAirportSelect(data as Airport);
    }
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation) {
      const newRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01, // Tighter zoom for better snapping
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
    }
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" 
    }]}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          showsScale={true}
          showsBuildings={true}
          showsTraffic={false}
          showsIndoors={true}
          mapType="standard"
          userLocationPriority="high"
          userLocationUpdateInterval={5000}
          userLocationFastestInterval={2000}
        >
          {/* Current location marker */}
          {currentLocation && (
            <Marker
              coordinate={currentLocation}
              title="Your Location"
              description="You are here"
              pinColor="#37a4c8"
            >
              <View style={styles.currentLocationMarker}>
                <View style={styles.currentLocationDot} />
                <View style={styles.currentLocationPulse} />
              </View>
            </Marker>
          )}

          {/* User markers */}
          {usersWithLocation.map((user) => (
            <React.Fragment key={`user-${user.id}`}>
              {/* User location circle */}
              <Circle
                center={{
                  latitude: user.lastKnownCoordinates!.latitude!,
                  longitude: user.lastKnownCoordinates!.longitude!,
                }}
                radius={100}
                fillColor="rgba(55, 164, 200, 0.6)"
                strokeColor="rgba(55, 164, 200, 0.8)"
                strokeWidth={1}
              />
              <Marker
                coordinate={{
                  latitude: user.lastKnownCoordinates!.latitude!,
                  longitude: user.lastKnownCoordinates!.longitude!,
                }}
                title={user.name || 'Anonymous User'}
                description={user.airportCode || 'Unknown location'}
              >
                <View style={styles.userMarker}>
                  <MaterialIcons name="person" size={16} color="#FFFFFF" />
                </View>
              </Marker>
            </React.Fragment>
          ))}

          {/* Event markers */}
          {events.map((event) => (
            <Marker
              key={`event-${event.id}`}
              coordinate={{
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
              }}
              title={event.name}
              description={`${event.attendees?.length || 0} attending`}
              onPress={() => handleMarkerPress('event', event)}
            >
              <View style={styles.eventMarker}>
                <MaterialIcons name="event" size={20} color="#FFFFFF" />
                <View style={styles.eventMarkerBadge}>
                  <Text style={styles.eventMarkerText}>
                    {event.attendees?.length || 0}
                  </Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlButton, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
            }]}
            onPress={centerOnCurrentLocation}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="my-location" 
              size={20} 
              color={theme === "light" ? "#0F172A" : "#e4fbfe"} 
            />
          </TouchableOpacity>
        </View>

        {/* Map info overlay */}
        <View style={[styles.mapInfo, { 
          backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
        }]}>
          <View style={styles.mapInfoContent}>
            <Ionicons name="people" size={16} color="#37a4c8" />
            <Text style={[styles.mapInfoText, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe" 
            }]}>
              {usersWithNullCoordinates} users with location data
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    marginBottom: 16,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#37a4c8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  currentLocationPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.5)',
  },
  eventMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#37a4c8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  eventMarkerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#10B981',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  eventMarkerText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapInfoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  airportLocation: {
    fontSize: 12,
    fontWeight: '400',
  },
  userMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#37a4c8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
}); 