import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated } from "react-native";
import useEvents from "../../hooks/useEvents";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import useUsers from "../../hooks/useUsers";
import useAuth from "../../hooks/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
import TopBar from "../../components/TopBar";

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
  const [authUser, setAuthUser] = useState<User | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  // Existing useEffect hooks
  useEffect(() => {
    if (event && user) {
      setIsAttending(event.attendees?.includes(user.uid));
    }
  }, [event, user]);

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
            setOrganizer(null);
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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Existing handler functions
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
        organizedAt: new Date().toISOString(),
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
    }
  };

  const confirmOrganizerTakeover = () => {
    Alert.alert(
      "Become Organizer",
      "By claiming organization, you'll be responsible for managing this event. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: handleBecomeOrganizer },
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
      <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </LinearGradient>
    );
  }

  const isOrganizer = user?.uid === event.organizer;

  const renderOrganizerSection = () => (
    <View style={styles.organizerContainer}>
      <View style={styles.organizerBadge}>
        <MaterialIcons
          name={event.organizer ? "person" : "group-add"}
          size={20}
          color="#6a11cb"
        />
        <Text style={styles.organizerText}>
          {event.organizer
            ? `Organized by ${organizer || "Unknown"}`
            : "This event needs an organizer!"}
        </Text>
      </View>

      {event.organizer === null && (
        <TouchableOpacity
          style={styles.becomeOrganizerButton}
          onPress={confirmOrganizerTakeover}
          disabled={loading}
        >
          <LinearGradient
            colors={["#7F5AFF", "#5A7CFF"]}
            style={styles.buttonGradient}
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
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <TopBar />
        {/* ScrollView */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {event.eventImage && (
              <View style={styles.imageContainer}>
                <Image source={{ uri: event.eventImage }} style={styles.eventImage} />
              </View>
            )}
            <View
              style={[
                styles.detailsCard,
                { marginTop: event.eventImage ? -40 : 0 },
              ]}
            >
              <Text style={styles.eventTitle}>{event.name}</Text>
              <View style={styles.categoryChip}>
                <Text style={styles.eventCategory}>{event.category}</Text>
              </View>
              <Text style={styles.eventDescription}>{event.description}</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="event" size={20} color="#6a11cb" />
                  <Text style={styles.detailText}>
                    Created {formatDateTime(event.createdAt)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="schedule" size={20} color="#6a11cb" />
                  <Text style={styles.detailText}>
                    Starts {formatDateTime(event.startTime)}
                    {isOrganizer && (
                      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <MaterialIcons name="edit" size={16} color="#6a11cb" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    )}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="people" size={20} color="#6a11cb" />
                  <Text style={styles.detailText}>
                    {event.attendees?.length || 0} attendees
                  </Text>
                </View>
              </View>
              {renderOrganizerSection()}
              <View style={styles.mapCard}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="place" size={20} color="#6a11cb" />
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
                      <MaterialIcons name="place" size={28} color="#6a11cb" />
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
                    <Text style={styles.setLocationText}>Set Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => router.push(`event/eventChat/${id}`)}
            accessibilityLabel="Event Chat"
            accessibilityHint="Navigate to event discussion"
          >
            <LinearGradient colors={["#7F5AFF", "#5A7CFF"]} style={styles.buttonGradient}>
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              <Text style={styles.buttonText}>Event Chat</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={handleAttend}
            activeOpacity={0.9}
            disabled={loading}
          >
            <LinearGradient
              colors={isAttending ? ["#FF416C", "#FF4B2B"] : ["#7F5AFF", "#5A7CFF"]}
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
        </View>
        {/* Full Screen Map */}
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
        {/* Date Picker */}
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          onConfirm={handleConfirmDate}
          onCancel={() => setShowDatePicker(false)}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa", // Matches gradient start color
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 160,
  },
  imageContainer: {
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  detailsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: "rgba(106,17,203,0.1)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  eventCategory: {
    fontSize: 14,
    color: "#6a11cb",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: "#718096",
    lineHeight: 22,
    marginBottom: 25,
  },
  detailsGrid: {
    marginBottom: 25,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#718096",
    fontWeight: "500",
  },
  organizerContainer: {
    marginBottom: 30,
  },
  organizerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(106,17,203,0.1)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  organizerText: {
    fontSize: 15,
    color: "#6a11cb",
    fontWeight: "600",
  },
  becomeOrganizerButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  organizedTimestamp: {
    fontSize: 12,
    color: "#718096",
    marginTop: 8,
    alignSelf: "flex-end",
  },
  mapCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },
  mapButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: 220,
  },
  setLocationButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "rgba(106,17,203,0.1)",
    alignItems: "center",
  },
  setLocationText: {
    color: "#6a11cb",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomButtons: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  buttonContainer: {
    width: "48%",
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  attendButton: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
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
  fullScreenMap: {
    width: "100%",
    height: "100%",
  },
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#2D3748",
  },
});