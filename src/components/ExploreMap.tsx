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
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
  startTime: Date | null;
  attendees: string[];
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
  onEventPress: (event: Event) => void;
  currentUserId?: string; // Add current user ID prop
}

export default function ExploreMap({
  events,
  onEventPress,
  currentUserId,
}: ExploreMapProps) {
  const { theme } = React.useContext(ThemeContext);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 40.7128, // Default to NYC until we get user's actual coordinates
    longitude: -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Get current location on component mount
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        // First, try to get user's last known coordinates from their auth document
        let userLastKnownCoords = null;
        if (currentUserId) {
          try {
            const userDocRef = doc(db, 'users', currentUserId);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData?.lastKnownCoordinates?.latitude && userData?.lastKnownCoordinates?.longitude) {
                userLastKnownCoords = {
                  latitude: userData.lastKnownCoordinates.latitude,
                  longitude: userData.lastKnownCoordinates.longitude,
                };
                
                // Set initial region to user's last known location
                setRegion({
                  latitude: userLastKnownCoords.latitude,
                  longitude: userLastKnownCoords.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                });
              }
            }
          } catch (error) {
            console.error('Error getting user last known coordinates:', error);
          }
        }

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
        // Keep the default user location if getting current location fails
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentLocation();
  }, [currentUserId]);

  const handleMapPress = () => {
    // Optional: Handle map press events
  };

  const handleMarkerPress = (event: Event) => {
    onEventPress(event);
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
              onPress={() => handleMarkerPress(event)}
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
            <Ionicons name="calendar" size={16} color="#37a4c8" />
            <Text style={[styles.mapInfoText, { 
              color: theme === "light" ? "#0F172A" : "#e4fbfe" 
            }]}>
              {events.length} {events.length === 1 ? 'event found' : 'events found'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
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