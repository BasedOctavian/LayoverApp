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
import useAirports, { Airport } from "../hooks/useAirports";
import { useFilteredEvents } from "../hooks/useFilteredEvents";
import { useNearestAirports } from "../hooks/useNearestAirports";

interface Location {
  latitude: number;
  longitude: number;
}

interface Event {
  id: string;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  createdAt: Date;
  startTime: Date | null;
  organizer: string | null;
  organizerName: string;
  attendees: string[];
  airportCode: string;
  category: string;
  private: boolean;
  eventUID: string;
  eventImage: string | null;
  updatedAt: Date;
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

// Add this new component before the main component
const CountdownTimer = ({ startTime }: { startTime: Date | null }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    if (!startTime) {
      setTimeLeft('TBD');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diff = startTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Starting now');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <View style={[styles.metaItem, { 
      backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
      borderColor: "#37a4c8"
    }]}>
      <MaterialIcons name="schedule" size={20} color="#37a4c8" style={styles.metaIcon} />
      <Text style={[styles.metaText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
        {timeLeft}
      </Text>
    </View>
  );
};

export default function EventCreation() {
  const router = useRouter();
  const { getUser } = useUsers();
  const { getEvents } = useEvents();
  const { getAirports } = useAirports();
  const [events, setEvents] = useState<Event[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const [mapRegion, setMapRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [showAirportList, setShowAirportList] = useState(false);
  const [airportListAnim] = useState(new Animated.Value(0));
  const [eventListAnim] = useState(new Animated.Value(1));

  // Add animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const mapScaleAnim = useRef(new Animated.Value(0.98)).current;
  const headerSlideAnim = useRef(new Animated.Value(20)).current;
  const listSlideAnim = useRef(new Animated.Value(30)).current;

  // Get nearest airports when location and airports are available
  const nearestAirports = useNearestAirports(
    currentLocation ? { lat: currentLocation.latitude, long: currentLocation.longitude } : null,
    allAirports
  );

  // Set initial airport when nearest airports are calculated
  useEffect(() => {
    if (!selectedAirport && nearestAirports.closest) {
      setSelectedAirport(nearestAirports.closest);
    }
  }, [nearestAirports.closest, selectedAirport]);

  // Fetch current location, events, and airports
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Request location permission and get current location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required to show nearby events.");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Fetch airports
        const fetchedAirports = await getAirports();
        if (fetchedAirports) {
          setAllAirports(fetchedAirports);
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
                  latitude: event.latitude || '0',
                  longitude: event.longitude || '0',
                  createdAt: event.createdAt?.toDate() || new Date(),
                  startTime: event.startTime ? new Date(event.startTime) : null,
                  organizer: event.organizer || null,
                  organizerName: organizer && "name" in organizer ? String(organizer.name) : "Auto Generated",
                  attendees: Array.isArray(event.attendees) ? event.attendees : [],
                  airportCode: event.airportCode || '',
                  category: event.category || '',
                  private: event.private || false,
                  eventUID: event.eventUID || '',
                  eventImage: event.eventImage || null,
                  updatedAt: event.updatedAt?.toDate() || new Date(),
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
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(mapScaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(headerSlideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(listSlideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    }
  }, [isLoading, initialLoadComplete]);

  // Filter events based on selected airport
  const { filteredRegularEvents } = useFilteredEvents(selectedAirport, events, []);

  // Sort events by distance
  const sortedEvents = useMemo(() => {
    if (!currentLocation || !Array.isArray(filteredRegularEvents) || filteredRegularEvents.length === 0) return [];
    return filteredRegularEvents.slice().sort((a, b) => {
      // First sort by whether they have attendees
      const aHasAttendees = a.attendees && a.attendees.length > 0;
      const bHasAttendees = b.attendees && b.attendees.length > 0;
      
      if (aHasAttendees && !bHasAttendees) return -1;
      if (!aHasAttendees && bHasAttendees) return 1;
      
      // If both have attendees or both don't have attendees, sort by attendee count
      if (aHasAttendees && bHasAttendees) {
        const attendeeDiff = b.attendees.length - a.attendees.length;
        if (attendeeDiff !== 0) return attendeeDiff;
      }
      
      // If attendee counts are equal or both have no attendees, sort by distance
      const distanceA = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        parseFloat(a.latitude),
        parseFloat(a.longitude)
      );
      const distanceB = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        parseFloat(b.latitude),
        parseFloat(b.longitude)
      );
      return distanceA - distanceB;
    });
  }, [filteredRegularEvents, currentLocation]);

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

  // Animation handlers
  const handleAirportSelectorPress = () => {
    // Animate out events list
    Animated.timing(eventListAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setShowAirportList(true);
      // Animate in airport list
      Animated.timing(airportListAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    });
  };

  const handleAirportSelect = (airport: Airport) => {
    // Animate out airport list
    Animated.timing(airportListAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start(() => {
      setSelectedAirport(airport);
      setShowAirportList(false);
      // Animate in events list
      Animated.timing(eventListAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    });
  };

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
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 0.97,
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
      parseFloat(item.latitude),
      parseFloat(item.longitude)
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
                <Text style={[styles.metaText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                  {item.airportCode}
                </Text>
              </View>
              <CountdownTimer startTime={item.startTime} />
              <View style={[styles.metaItem, { 
                backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
                borderColor: "#37a4c8"
              }]}>
                <MaterialIcons name="group" size={20} color="#37a4c8" style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                  {item.attendees?.length || 0} going
                </Text>
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
            {showAirportList ? (
              <Animated.View
                style={{
                  flex: 1,
                  opacity: airportListAnim,
                  transform: [
                    {
                      translateY: airportListAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <FlatList
                  data={nearestAirports.tenClosest}
                  keyExtractor={(item: Airport) => item.airportCode}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <View style={styles.headerSection}>
                      <View style={styles.headerTop}>
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
                          Select Airport
                        </Animated.Text>
                      </View>
                    </View>
                  }
                  renderItem={({ item: airport }: { item: Airport }) => (
                    <TouchableOpacity
                      style={[styles.airportCard, {
                        backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                        borderColor: "#37a4c8"
                      }]}
                      onPress={() => handleAirportSelect(airport)}
                    >
                      <View style={styles.airportCardContent}>
                        <Feather name="airplay" size={24} color="#37a4c8" />
                        <View style={styles.airportInfo}>
                          <Text style={[styles.airportName, { 
                            color: theme === "light" ? "#000000" : "#e4fbfe" 
                          }]}>
                            {airport.name}
                          </Text>
                          <Text style={styles.airportCode}>{airport.airportCode}</Text>
                          <Text style={styles.airportLocation}>{airport.location || 'Location not available'}</Text>
                        </View>
                        <Feather name="chevron-right" size={20} color="#37a4c8" />
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Animated.View 
                      style={[
                        styles.emptyContainer,
                        {
                          opacity: fadeAnim,
                          transform: [{ translateY: listSlideAnim }]
                        }
                      ]}
                    >
                      <Text style={styles.emptyText}>No airports found nearby</Text>
                    </Animated.View>
                  }
                />
              </Animated.View>
            ) : (
              <Animated.View
                style={{
                  flex: 1,
                  opacity: eventListAnim,
                  transform: [
                    {
                      translateY: eventListAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <FlatList
                  data={sortedEvents}
                  renderItem={({ item, index }) => {
                    return (
                      <React.Fragment>
                        <AnimatedCard item={item} index={index} />
                        {(index === 3 || index === 12) && (
                          <Animated.View
                            style={{
                              opacity: fadeAnim,
                              transform: [{ translateY: listSlideAnim }],
                            }}
                          >
                            <TouchableOpacity
                              style={[styles.createButton, { 
                                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                                borderColor: "#37a4c8"
                              }]}
                              onPress={() => router.push("/eventCreation")}
                              activeOpacity={0.7}
                            >
                              <LinearGradient
                                colors={theme === "light" 
                                  ? ['#ffffff', '#f8f9fa']
                                  : ['#1a1a1a', '#000000']}
                                style={styles.createButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                              >
                                <View style={styles.createButtonContent}>
                                  <View style={styles.createButtonIconContainer}>
                                    <MaterialIcons name="add-circle" size={24} color="#37a4c8" />
                                  </View>
                                  <View style={styles.createButtonTextContainer}>
                                    <Text style={[styles.createButtonTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                                      Create New Event
                                    </Text>
                                    <Text style={styles.createButtonSubtitle}>
                                      Start planning your next gathering
                                    </Text>
                                  </View>
                                </View>
                              </LinearGradient>
                            </TouchableOpacity>
                          </Animated.View>
                        )}
                      </React.Fragment>
                    );
                  }}
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
                          {Array.isArray(filteredRegularEvents) && filteredRegularEvents.map((event) => (
                            <React.Fragment key={event.id}>
                              <Circle
                                center={{ latitude: parseFloat(event.latitude), longitude: parseFloat(event.longitude) }}
                                radius={152.4}
                                strokeWidth={2}
                                strokeColor="rgba(55, 164, 201, 0.5)"
                                fillColor="rgba(55, 164, 201, 0.2)"
                              />
                              <Marker
                                coordinate={{ latitude: parseFloat(event.latitude), longitude: parseFloat(event.longitude) }}
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
                      <View style={styles.headerSection}>
                        <View style={styles.headerTop}>
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
                          <Animated.View
                            style={{
                              transform: [{ translateY: headerSlideAnim }],
                              opacity: fadeAnim
                            }}
                          >
                            <TouchableOpacity
                              style={[styles.headerButton, { 
                                backgroundColor: theme === "light" ? "#f8f9fa" : "#000000",
                                borderColor: "#37a4c8"
                              }]}
                              onPress={() => router.push("/eventCreation")}
                              activeOpacity={0.7}
                            >
                              <MaterialIcons name="add" size={24} color="#37a4c8" />
                            </TouchableOpacity>
                          </Animated.View>
                        </View>
                        <TouchableOpacity
                          style={[styles.airportSelector, {
                            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                            borderColor: "#37a4c8"
                          }]}
                          onPress={handleAirportSelectorPress}
                        >
                          <View style={styles.airportSelectorContent}>
                            <Feather name="airplay" size={20} color="#37a4c8" />
                            <Text style={[styles.airportSelectorText, { 
                              color: theme === "light" ? "#000000" : "#e4fbfe" 
                            }]}>
                              {selectedAirport ? selectedAirport.name : "Select Airport"}
                            </Text>
                            <Feather name="chevron-down" size={20} color="#37a4c8" />
                          </View>
                        </TouchableOpacity>
                      </View>
                    </>
                  }
                  ListEmptyComponent={
                    <Animated.View 
                      style={[
                        styles.emptyContainer,
                        {
                          opacity: fadeAnim,
                          transform: [{ translateY: listSlideAnim }]
                        }
                      ]}
                    >
                      <Text style={styles.emptyText}>No events found at this airport</Text>
                    </Animated.View>
                  }
                />
              </Animated.View>
            )}
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
    marginBottom: 16,
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
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingRight: 4,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginRight: 12,
  },
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  createButtonGradient: {
    padding: 20,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  createButtonTextContainer: {
    flex: 1,
  },
  createButtonTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  createButtonSubtitle: {
    fontSize: 15,
    color: "#37a4c8",
    lineHeight: 22,
    letterSpacing: 0.2,
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
    fontSize: 20,
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
    fontWeight: "600",
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
    fontWeight: "600",
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
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginLeft: 8,
  },
  airportSelector: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  airportSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  airportSelectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  airportCard: {
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  airportCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  airportInfo: {
    flex: 1,
    marginLeft: 16,
  },
  airportName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  airportCode: {
    fontSize: 15,
    color: "#37a4c8",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  airportLocation: {
    fontSize: 14,
    color: "#64748B",
    letterSpacing: 0.2,
  },
});