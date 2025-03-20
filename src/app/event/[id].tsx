import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import useEvents from "../../hooks/useEvents";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import useUsers from "../../hooks/useUsers";
import useAuth from "../../hooks/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../firebaseConfig";
import DateTimePickerModal from "react-native-modal-datetime-picker";

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSettingLocation, setIsSettingLocation] = useState(false);
  const [showOrganizerConfirmation, setShowOrganizerConfirmation] = useState(false);

  useEffect(() => {
    if (event && user) {
      setIsAttending(event.attendees?.includes(user.uid));
    }
  }, [event, user]);

  const [authUser, setAuthUser] = useState<User | null>(null);

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
            setOrganizer(null); // Auto-created events have null organizer
          }
        }
      })();
    }
  }, [id]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "Not set";
    try {
      const date = timestamp?.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);
      const options = {
        timeZone: "America/New_York",
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      return new Intl.DateTimeFormat("en-US", options)
        .format(date)
        .replace(/,/g, "")
        .replace(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)( [AP]M)/, "$1/$2/$3 $4$5");
    } catch (error) {
      console.error("Invalid date:", error);
      return "Invalid Date";
    }
  };

  const handleAttend = async () => {
    if (!user?.uid || !event) return;
    setLoading(true);
    try {
      const currentAttendees = event.attendees || [];
      const newAttendees = isAttending
        ? currentAttendees.filter((uid: string) => uid !== user.uid)
        : [...currentAttendees, user.uid];
      await updateEvent(event.id, { attendees: newAttendees });
      setEvent((prev) => ({ ...prev, attendees: newAttendees }));
    } catch (error) {
      console.error("Error updating attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeOrganizer = async () => {
    if (!user?.uid || event.organizer !== null) return;
    setLoading(true);
    try {
      await updateEvent(event.id, { 
        organizer: user.uid,
        organizedAt: new Date().toISOString() 
      });
      const updatedEvent = await getEvent(id);
      setEvent(updatedEvent);
      const organizerData = await getUser(user.uid);
      setOrganizer(organizerData?.name || "You");
      Alert.alert(
        "Congratulations!",
        "You're now the official organizer of this event!",
        [{ text: "OK", onPress: () => console.log("OK Pressed") }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to claim organization. Please try again.",
        [{ text: "OK", onPress: () => console.log("OK Pressed") }]
      );
      console.error("Error becoming organizer:", error);
    } finally {
      setLoading(false);
      setShowOrganizerConfirmation(false);
    }
  };

  const confirmOrganizerTakeover = () => {
    Alert.alert(
      "Become Organizer",
      "By claiming organization, you'll be responsible for managing this event. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: handleBecomeOrganizer }
      ]
    );
  };

  const handleConfirmDate = async (date: Date) => {
    setShowDatePicker(false);
    if (!user?.uid || user.uid !== event.organizer) return;
    setLoading(true);
    try {
      const timestamp = date.toISOString();
      await updateEvent(event.id, { startTime: timestamp });
      setEvent((prev) => ({ ...prev, startTime: timestamp }));
    } catch (error) {
      console.error("Error updating start time:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = async (e) => {
    if (!isSettingLocation || !user?.uid || user.uid !== event.organizer) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLoading(true);
    try {
      await updateEvent(event.id, {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      });
      setEvent((prev) => ({
        ...prev,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      }));
      setFullScreenMap(false);
      setIsSettingLocation(false);
    } catch (error) {
      console.error("Error updating location:", error);
    } finally {
      setLoading(false);
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

  const isOrganizer = user?.uid === event.organizer;

  const renderOrganizerSection = () => (
    <View style={styles.organizerContainer}>
      <LinearGradient
        colors={event.organizer ? ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"] : ["#ff9a9e", "#fad0c4"]}
        style={[styles.organizerBadge, !event.organizer && styles.unclaimedBadge]}
      >
        <MaterialIcons 
          name={event.organizer ? "person" : "group-add"} 
          size={20} 
          color={event.organizer ? "#fff" : "#4a4a4a"} 
        />
        <Text style={[styles.organizerText, !event.organizer && styles.unclaimedText]}>
          {event.organizer 
            ? `Organized by ${organizer || "Unknown"}`
            : "This event needs an organizer!"}
        </Text>
      </LinearGradient>

      {event.organizer === null && (
        <TouchableOpacity
          style={[styles.becomeOrganizerButton, loading && styles.disabledButton]}
          onPress={confirmOrganizerTakeover}
          disabled={loading}
        >
          <LinearGradient
            colors={["#7F00FF", "#E100FF"]}
            style={styles.organizerButtonGradient}
          >
            <Feather name="star" size={20} color="#fff" />
            <Text style={styles.buttonText}>
              {loading ? "Claiming..." : "Become Organizer"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {event.organizedAt && (
        <Text style={styles.organizedTimestamp}>
          Organized on {formatDateTime(event.organizedAt)}
        </Text>
      )}
    </View>
  );

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Feather name="plus-circle" size={20} color="#fff" />
              <Text style={styles.detailText}>
                Created {formatDateTime(event.createdAt)}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="clock" size={20} color="#fff" />
              <Text style={styles.detailText}>
                Starts {formatDateTime(event.startTime)}
                {isOrganizer && (
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <Feather name="edit" size={16} color="#fff" style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                )}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Feather name="users" size={20} color="#fff" />
              <Text style={styles.detailText}>
                {event.attendees?.length || 0} attendees
              </Text>
            </View>
          </View>

          {renderOrganizerSection()}

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
                  latitude: parseFloat(event.latitude),
                  longitude: parseFloat(event.longitude),
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{
                    latitude: parseFloat(event.latitude),
                    longitude: parseFloat(event.longitude),
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
            {isOrganizer && (
              <TouchableOpacity
                style={styles.setLocationButton}
                onPress={() => {
                  setFullScreenMap(true);
                  setIsSettingLocation(true);
                }}
              >
                <Text style={styles.buttonText}>Set Location</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.attendButton}
        onPress={handleAttend}
        activeOpacity={0.9}
        disabled={loading}
      >
        <LinearGradient
          colors={isAttending ? ["#FF416C", "#FF4B2B"] : ["#ff6b6b", "#ff4757"]}
          style={styles.buttonGradient}
        >
          <Feather
            name={isAttending ? "x-circle" : "check-circle"}
            size={24}
            color="#fff"
          />
          <Text style={styles.buttonText}>
            {loading
              ? "Processing..."
              : isAttending
              ? "Remove Participation"
              : "Attend Event"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {fullScreenMap && (
        <View style={styles.fullScreenMapContainer}>
          <MapView
            style={styles.fullScreenMap}
            initialRegion={{
              latitude: parseFloat(event.latitude),
              longitude: parseFloat(event.longitude),
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={isSettingLocation ? handleMapPress : undefined}
          >
            <Marker
              coordinate={{
                latitude: parseFloat(event.latitude),
                longitude: parseFloat(event.longitude),
              }}
              title={event.name}
              description={event.description}
            >
              <MaterialIcons name="place" size={24} color="#6a11cb" />
            </Marker>
          </MapView>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setFullScreenMap(false);
              setIsSettingLocation(false);
            }}
          >
            <MaterialIcons name="close" size={32} color="#fff" />
          </TouchableOpacity>
          {isSettingLocation && (
            <View style={styles.instructionText}>
              <Text style={styles.instructionTextContent}>
                Tap on the map to set the location
              </Text>
            </View>
          )}
        </View>
      )}

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="datetime"
        onConfirm={handleConfirmDate}
        onCancel={() => setShowDatePicker(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flexGrow: 1, paddingBottom: 100 },
  imageContainer: { position: "relative", marginTop: 0 },
  eventImage: { width: "100%", height: 300, resizeMode: "cover" },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  detailsContainer: { padding: 24, marginTop: -40 },
  eventTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  categoryChip: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  eventCategory: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  eventDescription: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 24,
    marginBottom: 25,
    fontWeight: "500",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 25,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
  },
  detailText: { fontSize: 14, color: "#fff", fontWeight: "500" },
  organizerContainer: { marginBottom: 30 },
  organizerBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  unclaimedBadge: {
    borderColor: "#ff9a9e",
    borderWidth: 1,
  },
  unclaimedText: {
    color: "#4a4a4a",
    fontWeight: "700",
  },
  organizerText: { fontSize: 15, color: "#fff", fontWeight: "600" },
  becomeOrganizerButton: {
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden'
  },
  organizerButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  organizedTimestamp: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 8,
    alignSelf: 'flex-end'
  },
  disabledButton: {
    opacity: 0.6
  },
  setLocationButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  mapContainer: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  sectionHeaderText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  mapButton: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  map: { width: "100%", height: 220 },
  marker: {
    backgroundColor: "#fff",
    padding: 6,
    borderRadius: 20,
    elevation: 6,
  },
  attendButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fullScreenMapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.9)",
    zIndex: 1000,
  },
  fullScreenMap: { width: "100%", height: "100%" },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 10,
  },
  instructionText: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  instructionTextContent: {
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
  },
});