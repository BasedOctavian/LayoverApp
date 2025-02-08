import { useLocalSearchParams } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import useEvents from "../../hooks/useEvents";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import useUsers from "../../hooks/useUsers";

export default function Event() {
  const { id } = useLocalSearchParams();
  const { getEvent } = useEvents();
  const { getUser } = useUsers();
  const [event, setEvent] = useState<any>(null);
  const [organizer, setOrganizer] = useState<string | null>(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);

  useEffect(() => {
    if (id) {
      (async () => {
        const eventData = await getEvent(id);
        if (eventData) {
          setEvent(eventData);
          const organizerID = eventData.organizer;
          if (organizerID) {
            const organizerData = await getUser(organizerID);
            setOrganizer(organizerData?.name || "Unknown");
          } else {
            setOrganizer("Unknown");
          }
        }
      })();
    }
  }, [id]);

  if (!event) {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Event Image */}
        <Image source={{ uri: event.eventImage }} style={styles.eventImage} />

        {/* Event Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.eventTitle}>{event.name}</Text>
          <Text style={styles.eventCategory}>{event.category}</Text>
          <Text style={styles.eventDescription}>{event.description}</Text>

          {/* Organizer Info */}
          <View style={styles.organizerContainer}>
            <MaterialIcons name="person" size={20} color="#fff" />
            <Text style={styles.organizerText}>
              Organized by: {organizer || "Unknown"}
            </Text>
          </View>

          {/* Event Time */}
          <View style={styles.timeContainer}>
            <MaterialIcons name="access-time" size={20} color="#fff" />
            <Text style={styles.timeText}>
              Starts: {new Date(event.startTime.seconds * 1000).toLocaleString()}
            </Text>
          </View>

          {/* Event Location Map */}
          <View style={styles.mapContainer}>
            <Text style={styles.sectionHeader}>Location</Text>
            <TouchableOpacity onPress={() => setFullScreenMap(true)}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: event.latitude,
                  longitude: event.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: event.latitude,
                    longitude: event.longitude,
                  }}
                  title={event.name}
                  description={event.description}
                >
                  <MaterialIcons name="place" size={24} color="#6a11cb" />
                </Marker>
              </MapView>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Map Overlay */}
      {fullScreenMap && (
        <View style={styles.fullScreenMapContainer}>
          <MapView
            style={styles.fullScreenMap}
            initialRegion={{
              latitude: event.latitude,
              longitude: event.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: event.latitude,
                longitude: event.longitude,
              }}
              title={event.name}
              description={event.description}
            >
              <MaterialIcons name="place" size={24} color="#6a11cb" />
            </Marker>
          </MapView>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setFullScreenMap(false)}
          >
            <MaterialIcons name="close" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
    gradient: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      paddingBottom: 20,
    },
    loadingText: {
      color: "#fff",
      fontSize: 18,
      textAlign: "center",
    },
    eventImage: {
      width: "100%",
      height: 250,
      resizeMode: "cover",
      marginTop: 45,
    },
    detailsContainer: {
      padding: 16,
    },
    eventTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 8,
    },
    eventCategory: {
      fontSize: 16,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 16,
      textTransform: "capitalize",
    },
    eventDescription: {
      fontSize: 16,
      color: "rgba(255,255,255,0.9)",
      lineHeight: 24,
      marginBottom: 20,
    },
    organizerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    organizerText: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginLeft: 8,
    },
    timeContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
    },
    timeText: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginLeft: 8,
    },
    mapContainer: {
      marginBottom: 20,
    },
    sectionHeader: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#fff",
      marginBottom: 12,
    },
    map: {
      width: "100%",
      height: 200,
      borderRadius: 12,
    },
    fullScreenMapContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.9)',
        zIndex: 1000,
      },
      fullScreenMap: {
        width: '100%',
        height: '100%',
      },
      closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 20,
        padding: 10,
      },
  });