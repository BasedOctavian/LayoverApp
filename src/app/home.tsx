import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  Easing,
  Pressable,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, AntDesign, Feather, FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useEvents from "../hooks/useEvents";
import useUsers from "../hooks/useUsers";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../components/TopBar";
import LoadingScreen from "../components/LoadingScreen";
import { ThemeContext } from "../context/ThemeContext";

interface Location {
  latitude: number;
  longitude: number;
}

interface Event {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  startTime: Date;
  organizer: string;
  organizerName: string;
  attendees: string[];
}

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function EventCreation() {
  const router = useRouter();
  const { getUser } = useUsers();
  const { getEvents } = useEvents();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Add animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const mapScaleAnim = useRef(new Animated.Value(0.98)).current;
  const headerSlideAnim = useRef(new Animated.Value(20)).current;

  // Fetch current location and events
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Request location permission and get location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission to access location was denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        if (location && location.coords) {
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }

        // Fetch events and organizer names
        const fetchedEvents = await getEvents();
        if (fetchedEvents && Array.isArray(fetchedEvents)) {
          const eventsWithOrganizerNames = await Promise.all(
            fetchedEvents.map(async (event: any) => {
              try {
                const organizer = event.organizer ? await getUser(event.organizer) : null;
                return {
                  id: event.id || '',
                  name: event.name || '',
                  description: event.description || '',
                  latitude: parseFloat(event.latitude) || 0,
                  longitude: parseFloat(event.longitude) || 0,
                  createdAt: event.createdAt?.toDate() || new Date(),
                  startTime: new Date(event.startTime) || new Date(),
                  organizer: event.organizer || '',
                  organizerName: organizer && "name" in organizer ? String(organizer.name) : "Auto Generated",
                  attendees: Array.isArray(event.attendees) ? event.attendees : [],
                } as Event;
              } catch (error) {
                console.error("Error processing event:", error);
                return null;
              }
            })
          );
          const validEvents = eventsWithOrganizerNames.filter((event): event is Event => event !== null);
          setEvents(validEvents);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        Alert.alert("Error", "Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
        setInitialLoadComplete(true);
      }
    };

    initializeData();
  }, []);

  // Handle fade in animation when content is ready
  useEffect(() => {
    if (!isLoading && initialLoadComplete) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(mapScaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    }
  }, [isLoading, initialLoadComplete]);

  // Sort events by distance
  const sortedEvents = useMemo(() => {
    if (!currentLocation || !Array.isArray(events) || events.length === 0) return [];
    return events.slice().sort((a, b) => {
      const distanceA = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        a.latitude,
        a.longitude
      );
      const distanceB = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        b.latitude,
        b.longitude
      );
      return distanceA - distanceB;
    });
  }, [events, currentLocation]);

  // Update map region when location is available
  useEffect(() => {
    if (currentLocation) {
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [currentLocation]);

  // Loading state
  if (isLoading || !initialLoadComplete) {
    return <LoadingScreen message="Loading your events..." />;
  }

  // Animated card component
  const AnimatedCard = ({ item, index }: { item: Event; index: number }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const pressAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    if (!item || !currentLocation) return null;
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      item.latitude,
      item.longitude
    );
    
    const formattedDistance = distance > 1000
      ? `${(distance / 1000).toFixed(1)}km away`
      : `${Math.round(distance)}m away`;

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            })},
            { scale: pressAnim }
          ],
        }}
      >
        <Pressable
          style={[styles.eventCard, { 
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: "#37a4c8"
          }]}
          onPress={() => router.push("/event/" + item.id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.eventDetails}>
            <Text style={[styles.eventTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.organizerContainer}>
              <FontAwesome name="user-circle-o" size={16} color="#64748B" />
              <Text style={styles.organizerText} numberOfLines={1}>
                {item.organizerName}
              </Text>
            </View>
            <Text style={styles.eventDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <View style={styles.metaContainer}>
              <View style={[styles.metaItem, { 
                backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
                borderColor: "#37a4c8"
              }]}>
                <MaterialIcons name="location-pin" size={20} color="#37a4c8" style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{formattedDistance}</Text>
              </View>
              <View style={[styles.metaItem, { 
                backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
                borderColor: "#37a4c8"
              }]}>
                <MaterialIcons name="group" size={20} color="#37a4c8" style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{item.attendees?.length || 0} going</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <>
      <TopBar onProfilePress={() => router.push("profile")} />
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]}>
        <LinearGradient 
          colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} 
          style={styles.flex}
        >
          <Animated.View 
            style={{ 
              flex: 1, 
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }}
          >
            <FlatList
              data={sortedEvents}
              renderItem={({ item, index }) => <AnimatedCard item={item} index={index} />}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <>
                  <Animated.View 
                    style={[
                      styles.mapContainer, 
                      { 
                        borderColor: "#37a4c8",
                        transform: [
                          { scale: mapScaleAnim },
                          { translateY: headerSlideAnim }
                        ]
                      }
                    ]}
                  >
                    <MapView
                      mapType="hybrid"
                      style={styles.map}
                      region={mapRegion}
                      showsUserLocation={false}
                      showsMyLocationButton={true}
                      showsCompass={true}
                      rotateEnabled={true}
                      scrollEnabled={true}
                      zoomEnabled={true}
                      pitchEnabled={true}
                    >
                      {Array.isArray(events) && events.map((event) => (
                        <React.Fragment key={event.id}>
                          <Circle
                            center={{ latitude: event.latitude, longitude: event.longitude }}
                            radius={152.4}
                            strokeWidth={2}
                            strokeColor="rgba(55, 164, 201, 0.5)"
                            fillColor="rgba(55, 164, 201, 0.2)"
                          />
                          <Marker
                            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                            title={event.name}
                            description={event.description}
                          >
                            <View style={styles.eventMarkerContainer}>
                              <View style={styles.eventMarkerBackground}>
                                <MaterialIcons name="event" size={24} style={styles.eventMarkerIcon} />
                              </View>
                            </View>
                          </Marker>
                        </React.Fragment>
                      ))}
                      {currentLocation && (
                        <Marker
                          coordinate={{
                            latitude: currentLocation.latitude,
                            longitude: currentLocation.longitude,
                          }}
                          title="You are here"
                        >
                          <View style={styles.userMarkerContainer}>
                            <View style={styles.currentLocationPulse} />
                            <View style={styles.userMarkerBackground}>
                              <MaterialIcons name="my-location" size={24} style={styles.userMarkerIcon} />
                            </View>
                          </View>
                        </Marker>
                      )}
                    </MapView>
                  </Animated.View>
                  <Animated.Text 
                    style={[
                      styles.headerText, 
                      { 
                        color: theme === "light" ? "#000000" : "#e4fbfe",
                        transform: [{ translateY: headerSlideAnim }],
                        opacity: fadeAnim
                      }
                    ]}
                  >
                    Nearby Events
                  </Animated.Text>
                </>
              }
              ListEmptyComponent={
                <Animated.View 
                  style={[
                    styles.emptyContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: headerSlideAnim }]
                    }
                  ]}
                >
                  <Text style={styles.emptyText}>No events found nearby</Text>
                </Animated.View>
              }
            />
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    width: '100%',
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 24,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerText: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 24,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  eventCard: {
    borderRadius: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    transform: [{ scale: 1 }],
  },
  eventDetails: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  organizerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  organizerText: {
    fontSize: 14,
    color: "#37a4c8",
    marginLeft: 8,
    fontWeight: "500",
  },
  eventDescription: {
    fontSize: 15,
    color: "#37a4c8",
    lineHeight: 22,
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
  },
  metaText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#37a4c8',
    textAlign: 'center',
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(55, 164, 200, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(55, 164, 200, 0.3)',
  },
  eventMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventMarkerBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#37a4c8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  eventMarkerIcon: {
    color: '#ffffff',
  },
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#37a4c8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userMarkerIcon: {
    color: '#ffffff',
  },
  metaIcon: {
    marginRight: 8,
  },
});

export { EventCreation };