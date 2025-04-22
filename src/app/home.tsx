import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
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

// Haversine formula for distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  const [events, setEvents] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Request current location on mount
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

  // Fetch events and add organizer names
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        const fetchedEvents = await getEvents();
        if (fetchedEvents) {
          const eventsWithOrganizerNames = await Promise.all(
            fetchedEvents.map(async (event: any) => {
              const organizer = await getUser(event.organizer);
              return {
                id: event.id,
                name: event.name,
                description: event.description,
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
                eventImage: event.eventImage,
                createdAt: event.createdAt.toDate(),
                startTime: new Date(event.startTime),
                organizer: event.organizer,
                organizerName: organizer && 'name' in organizer ? organizer.name : "Auto Generated",
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

  // Compute sorted events based on distance (nearest first)
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

  const renderItem = ({ item }: { item: typeof events[0] }) => {
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
      <TouchableOpacity style={styles.eventCard} onPress={() => router.push("/event/" + item.id)}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.eventImage }} style={styles.eventImage} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={styles.imageOverlay} />
          <Text style={styles.eventDate}>
            <Feather name="calendar" size={14} color="white" />{" "}
            {item.startTime.toLocaleDateString("short")}
          </Text>
        </View>
        <View style={styles.eventDetails}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.name}</Text>
          <View style={styles.organizerContainer}>
            <FontAwesome name="user-circle-o" size={14} color="#64748B" />
            <Text style={styles.organizerText} numberOfLines={1}>
              {item.organizerName}
            </Text>
          </View>
          <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>
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

  // Show loading state
  if (isLoading || locationLoading) {
    return (
      <SafeAreaView style={styles.flex}>
        <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
          <View style={[styles.topBar, { paddingTop: insets.top }]}>
            <Text style={styles.logo}>Wingman</Text>
            <TouchableOpacity onPress={() => router.push("profile")}>
              <Feather name="user" size={32} color="#2F80ED" />
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <LoadingSpinner 
              size={120}
              color="#2F80ED"
              customTexts={[
                "Finding events near you...",
                "Discovering exciting activities...",
                "Loading your travel companions...",
                "Preparing your next adventure..."
              ]}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={styles.flex}>
        {/* Global Top Bar */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <Text style={styles.logo}>Wingman</Text>
          <TouchableOpacity onPress={() => router.push("profile")}>
            <Feather name="user" size={32} color="#2F80ED" />
          </TouchableOpacity>
        </View>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            mapType="hybrid"
            style={styles.map}
            initialRegion={{
              latitude: 42.9405,
              longitude: -78.7322,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
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
        <TouchableOpacity style={styles.searchButtonContainer} onPress={handleSearchPress}>
          <LinearGradient
            colors={["#2F80ED", "#1A5FB4"]}
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
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#E6F0FA",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#E6F0FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    height: 50,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#2F80ED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  imageContainer: {
    height: 160,
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
  },
  eventDate: {
    position: "absolute",
    bottom: 12,
    left: 16,
    color: "white",
    fontSize: 13,
  },
  eventDetails: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export { EventCreation };
