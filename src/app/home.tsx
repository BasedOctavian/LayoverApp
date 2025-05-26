import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
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
  const insets = useSafeAreaInsets();

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
      }
    };

    initializeData();
  }, []);

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

  // Loading state
  if (isLoading) {
    return <LoadingScreen message="Loading your events..." />;
  }

  // Render each event card (no image)
  const renderItem = ({ item }: { item: Event }) => {
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
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => router.push("/event/" + item.id)}
      >
        <View style={styles.eventDetails}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.organizerContainer}>
            <FontAwesome name="user-circle-o" size={14} color="#64748B" />
            <Text style={styles.organizerText} numberOfLines={1}>
              {item.organizerName}
            </Text>
          </View>
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <MaterialIcons name="location-pin" size={18} color="#2F80ED" />
              <Text style={styles.metaText}>{formattedDistance}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="group" size={18} color="#2F80ED" />
              <Text style={styles.metaText}>{item.attendees?.length || 0} going</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TopBar onProfilePress={() => router.push("profile")} />
      <SafeAreaView style={styles.flex}>
        <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
          <FlatList
            data={sortedEvents}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <>
                <View style={styles.mapContainer}>
                  <MapView
                    mapType="hybrid"
                    style={styles.map}
                    initialRegion={{
                      latitude: currentLocation?.latitude || 39.8283,
                      longitude: currentLocation?.longitude || -98.5795,
                      latitudeDelta: 25,
                      longitudeDelta: 60,
                    }}
                  >
                    {Array.isArray(events) && events.map((event) => (
                      <React.Fragment key={event.id}>
                        <Circle
                          center={{ latitude: event.latitude, longitude: event.longitude }}
                          radius={152.4}
                          strokeWidth={2}
                          strokeColor="rgba(56, 165, 201, 0.5)"
                          fillColor="rgba(56, 165, 201, 0.2)"
                        />
                        <Marker
                          coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                          title={event.name}
                          description={event.description}
                        >
                          <MaterialIcons name="event" size={24} color="#38a5c9" />
                        </Marker>
                      </React.Fragment>
                    ))}
                  </MapView>
                </View>
                <Text style={styles.headerText}>Nearby Events</Text>
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No events found nearby</Text>
              </View>
            }
          />
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#000000",
  },
  mapContainer: {
    height: 300,
    width: '100%',
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 20,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  map: {
    flex: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e4fbfe",
    marginBottom: 20,
    paddingHorizontal: 8,
    letterSpacing: 0.3,
  },
  listContent: {
    paddingBottom: 80,
  },
  eventCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
    overflow: "hidden",
  },
  eventDetails: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#e4fbfe",
    marginBottom: 8,
  },
  organizerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  organizerText: {
    fontSize: 14,
    color: "#38a5c9",
    marginLeft: 6,
  },
  eventDescription: {
    fontSize: 14,
    color: "#38a5c9",
    lineHeight: 20,
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  metaText: {
    fontSize: 13,
    color: "#e4fbfe",
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#38a5c9',
    textAlign: 'center',
  },
});

export { EventCreation };