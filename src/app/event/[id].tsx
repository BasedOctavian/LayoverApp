import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated } from "react-native";
import useEvents from "../../hooks/useEvents";
import { useEffect, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import useUsers from "../../hooks/useUsers";
import useAuth from "../../hooks/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar, Platform } from "react-native";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";

export default function Event() {
  const { id } = useLocalSearchParams();
  const { getEvent, updateEvent } = useEvents();
  const { getUser } = useUsers();
  const [event, setEvent] = useState<any>(null);
  const [organizer, setOrganizer] = useState<string | null>(null);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading event details...");
  const { user } = useAuth();
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
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
    setLoadingMessage("Updating attendance...");
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
    setLoadingMessage("Claiming organization...");
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
    setLoadingMessage("Updating event time...");
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

  if (!event || loading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  const isOrganizer = user?.uid === event.organizer;

  const renderOrganizerSection = () => (
    <View style={styles.organizerContainer}>
      <View style={styles.organizerBadge}>
        <MaterialIcons
          name={event.organizer ? "person" : "group-add"}
          size={20}
          color="#38a5c9"
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
            colors={["#38a5c9", "#2F80ED"]}
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
      <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <TopBar />
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
                  <MaterialIcons name="event" size={20} color="#38a5c9" />
                  <Text style={styles.detailText}>
                    Created {formatDateTime(event.createdAt)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="schedule" size={20} color="#38a5c9" />
                  <Text style={styles.detailText}>
                    Starts {formatDateTime(event.startTime)}
                    {isOrganizer && (
                      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <MaterialIcons name="edit" size={16} color="#38a5c9" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    )}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="people" size={20} color="#38a5c9" />
                  <Text style={styles.detailText}>
                    {event.attendees?.length || 0} attendees
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="flight" size={20} color="#38a5c9" />
                  <Text style={styles.detailText}>
                    {event.airportCode || "No airport set"}
                  </Text>
                </View>
              </View>
              {renderOrganizerSection()}
            </View>
          </Animated.View>
        </ScrollView>
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => router.push(`event/eventChat/${id}`)}
            accessibilityLabel="Event Chat"
            accessibilityHint="Navigate to event discussion"
          >
            <LinearGradient colors={["#38a5c9", "#2F80ED"]} style={styles.buttonGradient}>
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
              colors={isAttending ? ["#FF416C", "#FF4B2B"] : ["#38a5c9", "#2F80ED"]}
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
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          onConfirm={handleConfirmDate}
          onCancel={() => setShowDatePicker(false)}
          textColor="#e4fbfe"
          themeVariant="dark"
          isDarkModeEnabled={true}
          buttonTextColorIOS="#38a5c9"
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
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
    backgroundColor: "#1a1a1a",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e4fbfe",
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: "rgba(56,165,201,0.1)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  eventCategory: {
    fontSize: 14,
    color: "#38a5c9",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  eventDescription: {
    fontSize: 14,
    color: "#e4fbfe",
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
    color: "#e4fbfe",
    fontWeight: "500",
  },
  organizerContainer: {
    marginBottom: 30,
  },
  organizerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56,165,201,0.1)",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  organizerText: {
    fontSize: 15,
    color: "#38a5c9",
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
    color: "#38a5c9",
    marginTop: 8,
    alignSelf: "flex-end",
  },
  bottomButtons: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 40 : 32,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 50,
  },
  buttonContainer: {
    width: "48%",
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
});