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
import LoadingSpinner from "../components/LoadingSpinner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../components/TopBar"; // Imported the TopBar component

// Haversine formula for distance calculation
const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
  const [events, setEvents] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Fetch current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission to access location was denied");
        setLocationLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLocationLoading(false);
    })();
  }, []);

  // Fetch events and organizer names
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const fetchedEvents = await getEvents();
        if (fetchedEvents) {
          const eventsWithOrganizerNames = await Promise.all(
            fetchedEvents.map(async (event) => {
              const organizer = await getUser(event.organizer);
              return {
                id: event.id,
                name: event.name,
                description: event.description,
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
                createdAt: event.createdAt.toDate(),
                startTime: new Date(event.startTime),
                organizer: event.organizer,
                organizerName: organizer && "name" in organizer ? organizer.name : "Auto Generated",
                attendees: event.attendees || [],
              };
            })
          );
          setEvents(eventsWithOrganizerNames);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
        Alert.alert("Error", "Failed to load events. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  // Sort events by distance
  const sortedEvents = useMemo(() => {
    if (!currentLocation) return events;
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

  // Render each event card (no image)
  const renderItem = ({ item }) => {
    const distance = currentLocation
      ? calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          item.latitude,
          item.longitude
        )
      : null;
    const formattedDistance = distance
      ? distance > 1000
        ? `${(distance / 1000).toFixed(1)}km away`
        : `${Math.round(distance)}m away`
      : "Calculating...";
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
              <Text style={styles.metaText}>{item.attendees.length} going</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const handleSearchPress = () => {
    router.push("locked/lockedScreen");
  };

  // Loading state
  if (isLoading || locationLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
          <TopBar onProfilePress={() => router.push("profile")} />
          <View style={styles.loadingContainer}>
            <LoadingSpinner
              size={120}
              color="#38a5c9"
              customTexts={[
                "Finding events near you...",
                "Discovering exciting activities...",
                "Loading your travel companions...",
                "Preparing your next adventure...",
              ]}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <>
    <TopBar onProfilePress={() => router.push("profile")} />
    <SafeAreaView style={styles.flex}>
      <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
        {/* TopBar Component */}
        {/* Map Section */}
        <View style={styles.mapContainer}>
        <MapView
            mapType="hybrid"
            style={styles.map}
            initialRegion={{
              latitude: 39.8283, // Center of mainland US
              longitude: -98.5795, // Center of mainland US
              latitudeDelta: 25, // Zoom level for mainland US
              longitudeDelta: 60, // Zoom level for mainland US
            }}
          >
            {events.map((event) => (
              <React.Fragment key={event.id}>
                <Circle
                  center={{ latitude: event.latitude, longitude: event.longitude }}
                  radius={152.4}
                  strokeWidth={2}
                  strokeColor="rgba(255,255,255,0.5)"
                  fillColor="rgba(255,255,255,0.2)"
                />
                <Marker
                  coordinate={{ latitude: event.latitude, longitude: event.longitude }}
                  title={event.name}
                  description={event.description}
                >
                  <MaterialIcons name="event" size={24} color="#fff" />
                </Marker>
              </React.Fragment>
            ))}
          </MapView>
        </View>
        <Text style={styles.headerText}>Nearby Events</Text>
        <FlatList
          data={sortedEvents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
        <TouchableOpacity
          style={styles.searchButtonContainer}
          onPress={handleSearchPress}
        >
          <LinearGradient
            colors={["#38a5c9", "#1F5B6F"]}
            style={styles.searchButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <AntDesign name="search1" size={20} color="white" />
            <Text style={styles.searchText}>Search Events</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#E6F0FA",
  },
  mapContainer: {
    height: 300,
    maxWidth: 370,
    marginLeft: 11,
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    flex: 1,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    overflow: "hidden",
  },
  eventDetails: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
    marginBottom: 8,
  },
  organizerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  organizerText: {
    fontSize: 13,
    color: "#64748B",
    marginLeft: 6,
  },
  eventDescription: {
    fontSize: 14,
    color: "#64748B",
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
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  metaText: {
    fontSize: 13,
    color: "#1E293B",
    marginLeft: 6,
  },
  searchButtonContainer: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    width: "90%",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 25,
  },
  searchText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 10,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export { EventCreation };