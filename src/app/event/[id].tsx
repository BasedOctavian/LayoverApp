import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import useEvents from "../../hooks/useEvents";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import useUsers from "../../hooks/useUsers";
import useAuth from "../../hooks/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../firebaseConfig";

export default function Event() {
  const { id } = useLocalSearchParams();
  const { getEvent, updateEvent } = useEvents();
  const { getUser } = useUsers();
  const [event, setEvent] = useState<any>(null);
  const [organizer, setOrganizer] = useState<string | null>(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (event && user) {
      setIsAttending(event.attendees?.includes(user.uid));
    }
  }, [event, user]);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const handleAttend = async () => {
    if (!user?.uid || !event) return;
    
    setLoading(true);
    try {
      const currentAttendees = event.attendees || [];
      const newAttendees = isAttending 
        ? currentAttendees.filter((uid: string) => uid !== user.uid)
        : [...currentAttendees, user.uid];

      await updateEvent(event.id, { attendees: newAttendees });
      setEvent(prev => ({ ...prev, attendees: newAttendees }));
    } catch (error) {
      console.error("Error updating attendance:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (id) {
      (async () => {
        const eventData = await getEvent(id);
        if (eventData) {
          setEvent(eventData);
          const organizerID = eventData.organizer;
          if (organizerID) {
            const organizerData = await getUser(organizerID);
            setOrganizer(organizerData?.name || "Auto Generated");
          } else {
            setOrganizer("Unknown");
          }
        }
      })();
    }
  }, [id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user){
    setAuthUser(user);
    } else {
    router.replace("login/login");
    }
    setLoading(false);
    })
    }, []);

  const formatDateTime = (timestamp: any) => {
    try {
      // Handle both Firestore timestamps and ISO strings
      const date = timestamp?.seconds 
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);
        
      // For UTC-5 display (Eastern Time), add:
      const options = { 
        timeZone: 'America/New_York', // UTC-5
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      };
      
      return new Intl.DateTimeFormat('en-US', options).format(date)
        .replace(/,/g, '') // Remove commas
        .replace(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)( [AP]M)/, '$1/$2/$3 $4$5');
    } catch (error) {
      console.error("Invalid date:", error);
      return "Invalid Date";
    }
  };
       
  

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
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.eventImage }} style={styles.eventImage} />
          <View style={styles.imageOverlay} />
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.eventTitle}>{event.name}</Text>
          
          <View style={styles.categoryChip}>
            <Text style={styles.eventCategory}>{event.category}</Text>
          </View>

          <Text style={styles.eventDescription}>{event.description}</Text>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            {/* Created At */}
            <View style={styles.detailItem}>
              <Feather name="plus-circle" size={20} color="#fff" />
              <Text style={styles.detailText}>
              Created {formatDateTime(event.createdAt)}
              </Text>
            </View>

            {/* Start Time */}
            <View style={styles.detailItem}>
              <Feather name="clock" size={20} color="#fff" />
              <Text style={styles.detailText}>
              Starts {formatDateTime(event.startTime)}
              </Text>
            </View>

            
            <View style={styles.detailItem}>
              <Feather name="users" size={20} color="#fff" />
              <Text style={styles.detailText}>
                {event.attendees?.length || 0} attendees
              </Text>
            </View>
          </View>

          {/* Organizer Info */}
          <View style={styles.organizerContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.organizerBadge}
            >
              <MaterialIcons name="person" size={20} color="#fff" />
              <Text style={styles.organizerText}>
                Organized by {organizer || "Unknown"}
              </Text>
            </LinearGradient>
          </View>

         

          {/* Event Location Map */}
          <View style={styles.mapContainer}>
            <View style={styles.sectionHeader}>
              <Feather name="map-pin" size={20} color="#fff" />
              <Text style={styles.sectionHeaderText}>Event Location</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setFullScreenMap(true)}
              style={styles.mapButton}
            >
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
                  <View style={styles.marker}>
                    <Feather name="map-pin" size={28} color="#6a11cb" />
                  </View>
                </Marker>
              </MapView>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Attend Button */}
      <TouchableOpacity 
        style={styles.attendButton}
        onPress={handleAttend}
        activeOpacity={0.9}
        disabled={loading}
      >
        <LinearGradient
          colors={isAttending ? ['#FF416C', '#FF4B2B'] : ['#ff6b6b', '#ff4757']}
          style={styles.buttonGradient}
        >
          <Feather 
            name={isAttending ? "x-circle" : "check-circle"} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.buttonText}>
            {loading ? 'Processing...' : 
            isAttending ? 'Remove Participation' : 'Attend Event'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

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
  // Full-screen gradient background
  gradient: {
    flex: 1,
  },

  // Main container for the ScrollView
  container: {
    flexGrow: 1,
    paddingBottom: 100, // Extra space for the floating button
  },

  // Event image container
  imageContainer: {
    position: 'relative',
    marginTop: 0,
  },
  eventImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Event details container
  detailsContainer: {
    padding: 24,
    marginTop: -40,
  },
  eventTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },

  // Category chip styling
  categoryChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  eventCategory: {
    fontSize: 14,
    color: "#fff",
    fontWeight: '600',
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Event description
  eventDescription: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 24,
    marginBottom: 25,
    fontWeight: '500',
  },

  // Time container and text
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: '500',
  },

  // Details grid (time, date, attendees)
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 25,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: '500',
  },

  // Organizer section
  organizerContainer: {
    marginBottom: 30,
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  organizerText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: '600',
  },

  // Map section
  mapContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  mapButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  map: {
    width: "100%",
    height: 220,
  },
  marker: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 20,
    elevation: 6,
  },

  // Floating "Attend" button
  attendButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  // Fullscreen map overlay
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