import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, AntDesign } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useEvents from "./../hooks/useEvents";
import useUsers from "../hooks/useUsers";

export default function EventCreation() {
  const router = useRouter();
  const { getUser } = useUsers();
  const { getEvents } = useEvents();
  const [events, setEvents] = useState<
    {
      id: string;
      name: string;
      description: string;
      latitude: number;
      longitude: number;
      eventImage: string;
      createdAt: Date;
      startTime: Date;
      organizer: string;
      organizerName?: string; // Add organizerName to the event object
    }[]
  >([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const fetchedEvents = await getEvents();
      if (fetchedEvents) {
        const eventsWithOrganizerNames = await Promise.all(
          fetchedEvents.map(async (event: any) => {
            const organizer = await getUser(event.organizer); // Fetch organizer details
            console.log(organizer.name);
            return {
              id: event.id,
              name: event.name,
              description: event.description,
              latitude: parseFloat(event.latitude),
              longitude: parseFloat(event.longitude),
              eventImage: event.eventImage,
              createdAt: new Date(event.createdAt),
              startTime: new Date(event.startTime),
              organizer: event.organizer,
              organizerName: organizer?.name || "Unknown Organizer", // Add organizerName
            };
          })
        );
        setEvents(eventsWithOrganizerNames);
      }
    };
    fetchEvents();
  }, []);

  const renderItem = ({ item }: { item: typeof events[0] }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => router.push("/event/" + item.id)}>
      <Image source={{ uri: item.eventImage }} style={styles.eventImage} />
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{item.name}</Text>
        <Text style={styles.eventDescription}>{item.description}</Text>
        <Text style={styles.organizerText}>
          Organized by: {item.organizerName} {/* Use organizerName */}
        </Text>
        <View style={styles.eventMeta}>
          <View style={styles.metaItem}>
            <MaterialIcons name="access-time" size={16} color="#fff" />
            <Text style={styles.metaText}>
              Starts: {item.startTime.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="calendar-today" size={16} color="#fff" />
            <Text style={styles.metaText}>
              Created: {item.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleSearchPress = () => {
    router.push("/search");
  };

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <View style={styles.container}>
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
                center={{
                  latitude: event.latitude,
                  longitude: event.longitude,
                }}
                radius={152.4}
                strokeWidth={2}
                strokeColor="rgba(255, 255, 255, 0.5)"
                fillColor="rgba(255, 255, 255, 0.2)"
              />
              <Marker
                coordinate={{
                  latitude: event.latitude,
                  longitude: event.longitude,
                }}
                title={event.name}
                description={event.description}
              >
                <MaterialIcons name="event" size={24} color="#6a11cb" />
              </Marker>
            </React.Fragment>
          ))}
        </MapView>

        <Text style={styles.headerText}>Nearby Events</Text>
        <FlatList
          data={events}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />

        <TouchableOpacity 
          style={styles.searchButton}
          onPress={handleSearchPress}
        >
          <AntDesign name="search1" size={20} color="white" />
          <Text style={styles.searchText}>Search Events</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  map: {
    width: "100%",
    height: 300,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    marginTop: 60,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 15,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 80,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 6,
  },
  organizerText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: "white",
    marginLeft: 6,
    opacity: 0.8,
  },
  searchButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  searchText: {
    fontSize: 16,
    color: "white",
    marginLeft: 10,
    fontWeight: '500',
  },
});