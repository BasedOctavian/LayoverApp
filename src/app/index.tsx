import React from "react";
import { StyleSheet, View, Text, FlatList, Image } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps"; // Import Circle and Marker components
import { events } from "../data";
import AntDesign from '@expo/vector-icons/AntDesign';
import { useRouter } from 'expo-router'; // Import useRouter for navigation

export default function HomeScreen() {
  const router = useRouter(); // Initialize the router

  const renderItem = ({ item }: { item: typeof events[0] }) => (
    <View style={styles.eventCard}>
      <Image source={{ uri: item.image }} style={styles.eventImage} />
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle}>{item.title}</Text>
        <Text style={styles.eventDescription}>{item.description}</Text>
        <Text style={styles.eventDate}>{item.date}</Text>
        <Text style={styles.eventLocation}>{item.location} {item.distance} mi away</Text>
      </View>
    </View>
  );

  const handleSearchPress = () => {
    router.push('/search'); // Navigate to the search screen
  };

  return (
    <View style={styles.container}>
      <MapView
        mapType="hybrid"
        style={styles.map}
        initialRegion={{
          latitude: 42.9405, // Latitude for BUF Niagara Airport
          longitude: -78.7322, // Longitude for BUF Niagara Airport
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        {/* Loop through events and add a Circle and Marker for each event */}
        {events.map((event) => (
          <React.Fragment key={event.id}>
            <Circle
              center={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              radius={152.4} // 500 feet in meters
              strokeWidth={2}
              strokeColor="rgba(255, 0, 0, 0.5)"
              fillColor="rgba(255, 0, 0, 0.2)"
            />
            <Marker
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              title={event.title}
              description={event.description}
            />
          </React.Fragment>
        ))}
      </MapView>
      <Text style={styles.headerText}>Nearby Events</Text>
      {/* FlatList below the text */}
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
      
      {/* Icon and text positioned together */}
      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={24} color="white" />
        <Text style={styles.searchText} onPress={handleSearchPress}>Search</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black", // Set background color to black
  },
  map: {
    width: "100%",
    height: "50%", // Adjust map height if needed
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
    color: "white", // Set text color to white
  },
  listContent: {
    padding: 10,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#333", // Dark background for the event card
    marginVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 10,
  },
  eventImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 10,
  },
  eventDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white", // Set text color to white
  },
  eventDescription: {
    fontSize: 14,
    color: "white", // Set text color to white
  },
  eventDate: {
    fontSize: 12,
    color: "white", // Set text color to white
  },
  eventLocation: {
    fontSize: 12,
    color: "white", // Set text color to white
  },
  searchContainer: {
    position: "absolute",
    bottom: 20,
    left: 135,
    flexDirection: "row",
    alignItems: "center",
  },
  searchText: {
    fontSize: 23,
    marginLeft: 20, // Space between the icon and the text
    color: "white", // Set text color to white
  },
});
