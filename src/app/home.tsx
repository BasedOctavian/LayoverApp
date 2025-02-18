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
      organizerName?: string;
    }[]
  >([]);

  useEffect(() => {
    const fetchEvents = async () => {
      console.log("Fetching events...");
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
              createdAt: new Date(event.createdAt),
              startTime: new Date(event.startTime),
              organizer: event.organizer,
              organizerName: organizer?.name || "Auto Generated",
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
          Organized by: {item.organizerName}
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
    <View style={styles.container}>
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
                <MaterialIcons name="event" size={24} color="#fff" />
              </Marker>
            </React.Fragment>
          ))}
        </MapView>
      </View>

      <Text style={styles.headerText}>Nearby Events</Text>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      <TouchableOpacity 
        style={styles.searchButtonContainer}
        onPress={handleSearchPress}
      >
        <LinearGradient
          colors={['#2F80ED', '#1A5FB4']}
          style={styles.searchButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <AntDesign name="search1" size={20} color="white" />
          <Text style={styles.searchText}>Search Events</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  mapContainer: {
    height: 300,
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 60,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  map: {
    flex: 1,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 15,
    paddingHorizontal: 16,
    fontFamily: 'Inter-SemiBold',
  },
  listContent: {
    paddingBottom: 80,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#2F80ED",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
    color: "#1E293B",
    marginBottom: 6,
    fontFamily: 'Inter-SemiBold',
  },
  eventDescription: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 6,
    fontFamily: 'Inter-Medium',
  },
  organizerText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  eventMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    color: "#1E293B",
    marginLeft: 6,
    opacity: 0.8,
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-SemiBold',
  },
});

export { EventCreation };
