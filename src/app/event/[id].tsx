import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated } from "react-native";
import useEvents from "../../hooks/useEvents";
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
import { ThemeContext } from "../../context/ThemeContext";

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  eventImage?: string;
  createdAt: any;
  startTime: any;
  attendees?: string[];
  organizer: string | null;
  organizedAt?: any;
  airportCode?: string;
}

interface UserData {
  id: string;
  name: string;
}

export default function Event() {
  const { id } = useLocalSearchParams();
  const eventId = Array.isArray(id) ? id[0] : id;
  const { getEvent, updateEvent } = useEvents();
  const { getUser } = useUsers();
  const [event, setEvent] = useState<Event | null>(null);
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const { theme } = React.useContext(ThemeContext);

  // Existing useEffect hooks
  useEffect(() => {
    if (event && user) {
      const isUserAttending = event.attendees?.includes(user.uid) ?? false;
      setIsAttending(isUserAttending);
    }
  }, [event, user]);

  useEffect(() => {
    if (eventId) {
      (async () => {
        const eventData = await getEvent(eventId);
        if (eventData) {
          const typedEventData = eventData as Event;
          setEvent(typedEventData);
          const organizerID = typedEventData.organizer;
          if (organizerID) {
            const organizerData = await getUser(organizerID) as UserData;
            setOrganizer(organizerData?.name || "Unknown");
          } else {
            setOrganizer(null);
          }
          setInitialLoadComplete(true);
        }
      })();
    }
  }, [eventId]);

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
    if (!loading && initialLoadComplete && event) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, initialLoadComplete, event, fadeAnim]);

  // Existing handler functions
  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return "Not set";
    try {
      const date = timestamp?.seconds
        ? new Date(timestamp.seconds * 1000)
        : new Date(timestamp);
      const options: Intl.DateTimeFormatOptions = {
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
      setEvent((prev: Event | null) => prev ? { ...prev, attendees: newAttendees } : null);
    } catch (error) {
      console.error("Error updating attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeOrganizer = async () => {
    if (!user?.uid || !event || event.organizer !== null) return;
    setLoading(true);
    setLoadingMessage("Claiming organization...");
    try {
      await updateEvent(event.id, {
        organizer: user.uid,
        organizedAt: new Date().toISOString(),
      });
      const updatedEvent = await getEvent(eventId) as Event;
      setEvent(updatedEvent);
      const organizerData = await getUser(user.uid) as UserData;
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
    if (!user?.uid || !event || user.uid !== event.organizer) return;
    setLoading(true);
    setLoadingMessage("Updating event time...");
    try {
      const timestamp = date.toISOString();
      await updateEvent(event.id, { startTime: timestamp });
      setEvent((prev: Event | null) => prev ? { ...prev, startTime: timestamp } : null);
    } catch (error) {
      console.error("Error updating start time:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!event) {
    return null;
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
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar />
        {event.eventImage && (
          <View style={[styles.imageContainer, { top: topBarHeight }]}>
            <Image 
              source={{ uri: event.eventImage }} 
              style={styles.eventImage}
            />
            <LinearGradient
              colors={['transparent', theme === "light" ? '#ffffff' : '#1a1a1a']}
              style={styles.imageGradient}
            />
          </View>
        )}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: event.eventImage ? 100 : 24 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={[styles.detailsCard, { 
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: "#37a4c8"
            }]}>
              <Text style={[styles.eventTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{event.name}</Text>
              <View style={[styles.categoryChip, { 
                backgroundColor: theme === "light" ? "rgba(56,165,201,0.1)" : "rgba(56,165,201,0.1)",
                borderColor: "#37a4c8"
              }]}>
                <Text style={styles.eventCategory}>{event.category}</Text>
              </View>
              <Text style={[styles.eventDescription, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{event.description}</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="event" size={20} color="#37a4c8" />
                  <Text style={[styles.detailText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Created {formatDateTime(event.createdAt)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="schedule" size={20} color="#37a4c8" />
                  <Text style={[styles.detailText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Starts {formatDateTime(event.startTime)}
                    {isOrganizer && (
                      <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <MaterialIcons name="edit" size={16} color="#37a4c8" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    )}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="people" size={20} color="#37a4c8" />
                  <Text style={[styles.detailText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    {event.attendees?.length || 0} attendees
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="flight" size={20} color="#37a4c8" />
                  <Text style={[styles.detailText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    {event.airportCode || "No airport set"}
                  </Text>
                </View>
              </View>
              {renderOrganizerSection()}
            </View>
            <View style={styles.bottomButtons}>
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={() => router.push(`event/eventChat/${id}`)}
                accessibilityLabel="Event Chat"
                accessibilityHint="Navigate to event discussion"
              >
                <LinearGradient 
                  colors={["#37a4c8", "#2F80ED"]} 
                  style={[styles.buttonGradient, { borderRadius: 12 }]}
                >
                  <Ionicons name="chatbubbles" size={24} color="#ffffff" />
                  <Text style={[styles.buttonText, { color: "#ffffff" }]}>Event Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleAttend}
                activeOpacity={0.9}
                disabled={loading}
              >
                <LinearGradient
                  colors={isAttending ? ["#FF416C", "#FF4B2B"] : ["#37a4c8", "#2F80ED"]}
                  style={[styles.buttonGradient, { borderRadius: 12 }]}
                >
                  <Feather
                    name={isAttending ? "x-circle" : "check-circle"}
                    size={24}
                    color="#ffffff"
                  />
                  <Text style={[styles.buttonText, { color: "#ffffff" }]}>
                    {loading
                      ? "Processing..."
                      : isAttending
                      ? "Leave Event"
                      : "Attend Event"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          onConfirm={handleConfirmDate}
          onCancel={() => setShowDatePicker(false)}
          textColor={theme === "light" ? "#000000" : "#e4fbfe"}
          themeVariant="dark"
          isDarkModeEnabled={theme === "dark"}
          buttonTextColorIOS="#37a4c8"
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
  imageContainer: {
    position: "absolute",
    left: 24,
    right: 24,
    height: 200,
    zIndex: 0,
    borderRadius: 20,
    overflow: "hidden",
  },
  eventImage: {
    marginTop: 20,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  scrollContainer: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
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
    marginTop: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    height: 52,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  organizedTimestamp: {
    fontSize: 12,
    color: "#38a5c9",
    marginTop: 8,
    alignSelf: "flex-end",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 40 : 32,
  },
  buttonContainer: {
    width: "48%",
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    borderRadius: 12,
    overflow: "hidden",
  },
});