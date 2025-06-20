import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing } from "react-native";
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
import useChat from "../../hooks/useChat";
import { doc, getDoc, updateDoc, arrayUnion, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import LoadingImage from "../../components/LoadingImage";

interface Event {
  id: string;
  name: string;
  description: string;
  category: string;
  eventImage?: string;
  createdAt: any;
  startTime: any;
  attendees: string[];
  organizer: string | null;
  organizedAt?: any;
  airportCode?: string;
  eventUID: string;
}

interface UserData {
  id: string;
  name: string;
}

const ADMIN_IDS = ['hDn74gYZCdZu0efr3jMGTIWGrRQ2', 'WhNhj8WPUpbomevJQ7j69rnLbDp2'];

const sendPushNotification = async (expoPushToken: string, eventName: string, attendeeName: string, notificationType: 'event_attendee' | 'event_update') => {
  try {
    const notificationContent = notificationType === 'event_attendee' 
      ? {
          title: 'New Event Attendee',
          body: `${attendeeName} is attending your event "${eventName}"`,
          data: { type: 'event_attendee' }
        }
      : {
          title: 'Event Updated',
          body: `The event "${eventName}" has been updated`,
          data: { type: 'event_update' }
        };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: expoPushToken,
        ...notificationContent,
        sound: 'default',
        priority: 'high',
        data: { 
          ...notificationContent.data,
          timestamp: new Date().toISOString()
        },
      }),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
};

const notifyOrganizer = async (organizerId: string, eventName: string, attendeeName: string, eventUID: string) => {
  try {
    const organizerDoc = await getDoc(doc(db, 'users', organizerId));
    if (organizerDoc.exists()) {
      const organizerData = organizerDoc.data();
      
      // Check if organizer has notifications enabled and has a push token
      if (organizerData.expoPushToken && 
          organizerData.notificationPreferences?.notificationsEnabled && 
          organizerData.notificationPreferences?.events) {
        await sendPushNotification(organizerData.expoPushToken, eventName, attendeeName, 'event_attendee');
      }

      // Add notification to organizer's notifications array
      const notification = {
        type: 'event_attendee',
        message: `${attendeeName} is attending your event "${eventName}"`,
        timestamp: serverTimestamp(),
        read: false,
        eventUID: eventUID
      };

      await updateDoc(doc(db, 'users', organizerId), {
        notifications: arrayUnion(notification)
      });
    }
  } catch (error) {
    console.error('Error notifying organizer:', error);
  }
};

const notifyAdmins = async (eventName: string) => {
  try {
    // Get push tokens for admin users
    const adminTokens = await Promise.all(
      ADMIN_IDS.map(async (adminId) => {
        const adminDoc = await getDoc(doc(db, 'users', adminId));
        if (adminDoc.exists()) {
          const adminData = adminDoc.data();
          return adminData.expoPushToken;
        }
        return null;
      })
    );

    // Send notifications to admins with valid push tokens
    const notificationPromises = adminTokens
      .filter(token => token) // Filter out null tokens
      .map(token => sendPushNotification(token!, eventName, "", 'event_update'));

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
};

const notifyAttendees = async (event: Event, eventName: string, updateType: string, eventUID: string) => {
  try {
    if (!event?.attendees?.length) return;

    // Get all attendee documents
    const attendeeDocs = await Promise.all(
      event.attendees.map((attendeeId: string) => getDoc(doc(db, 'users', attendeeId)))
    );

    // Process each attendee
    const notificationPromises = attendeeDocs.map(async (attendeeDoc: any) => {
      if (!attendeeDoc.exists()) return;

      const attendeeData = attendeeDoc.data();
      const notification = {
        type: 'event_update',
        message: `The event "${eventName}" has been updated`,
        timestamp: new Date().toISOString(),
        read: false,
        eventUID: eventUID,
        updateType: updateType
      };

      // Add notification to attendee's notifications array
      await updateDoc(doc(db, 'users', attendeeDoc.id), {
        notifications: arrayUnion(notification)
      });

      // Send push notification if attendee has token and notifications enabled
      if (attendeeData.expoPushToken && 
          attendeeData.notificationPreferences?.notificationsEnabled && 
          attendeeData.notificationPreferences?.events) {
        await sendPushNotification(
          attendeeData.expoPushToken,
          eventName,
          '', // No attendee name needed for event updates
          'event_update'
        );
      }
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error("Error notifying attendees:", error);
  }
};

const ModernLoadingIndicator = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Complex animation sequence
    const pulseAnimation = Animated.sequence([
      // First phase: grow and fade in
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ]),
      // Second phase: shrink and fade out
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
        }),
      ]),
    ]);

    // Continuous rotation animation
    const rotationAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    );

    // Start both animations
    Animated.loop(pulseAnimation).start();
    rotationAnimation.start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingIndicatorContainer}>
      <Animated.View
        style={[
          styles.loadingCircle,
          {
            backgroundColor: color,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            transform: [
              { scale: scaleAnim },
              { rotate: spin }
            ],
            shadowOpacity: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.5],
            }),
            shadowRadius: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 8],
            }),
          },
        ]}
      />
    </View>
  );
};

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
  const { messages } = useChat(eventId);
  const messageCount = messages?.length || 0;

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

      // If user is attending (not leaving) and there's an organizer, notify them
      if (!isAttending && event.organizer) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const attendeeName = userData?.name || 'Someone';
        
        await notifyOrganizer(event.organizer, event.name, attendeeName, event.eventUID);
      }
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
      const currentAttendees = event.attendees || [];
      const newAttendees = [...currentAttendees, user.uid];
      await updateEvent(event.id, {
        organizer: user.uid,
        organizedAt: new Date().toISOString(),
        attendees: newAttendees
      });
      const updatedEvent = await getEvent(eventId) as Event;
      setEvent(updatedEvent);
      const organizerData = await getUser(user.uid) as UserData;
      setOrganizer(organizerData?.name || "You");
      setIsAttending(true);
      
      // Show date picker after successful organizer claim
      setShowDatePicker(true);
      
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
      
      // Notify all attendees about the update
      await notifyAttendees(event, event.name, 'startTime', event.eventUID);
    } catch (error) {
      console.error("Error updating start time:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add report handler
  const handleReport = () => {
    Alert.alert(
      "Report Event",
      "Are you sure you want to report this event?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Report",
          style: "destructive",
          onPress: async () => {
            try {
              const reportData = {
                reportedEventId: eventId,
                reportedBy: authUser?.uid,
                reportedEventName: event?.name || 'Unknown Event',
                reportedByUserName: authUser?.displayName || 'Anonymous',
                createdAt: serverTimestamp(),
                status: "pending",
                type: "event_report",
                lastUpdated: serverTimestamp(),
                reviewedBy: null,
                reviewNotes: null,
                reviewDate: null,
                reportedEvent: {
                  name: event?.name || 'Unknown Event',
                  description: event?.description,
                  category: event?.category,
                  organizer: event?.organizer,
                  airportCode: event?.airportCode,
                  createdAt: event?.createdAt,
                  startTime: event?.startTime,
                  attendees: event?.attendees?.length || 0,
                }
              };
              
              await addDoc(collection(db, "reports"), reportData);
              
              // Notify admins about the report
              await notifyAdmins(event?.name || 'Unknown Event');
              
              Alert.alert(
                "Report Submitted",
                "Thank you for your report. Our team will review it shortly.",
                [{ text: "OK" }]
              );
            } catch (error) {
              console.error("Error reporting event:", error);
              Alert.alert(
                "Error",
                "Failed to submit report. Please try again.",
                [{ text: "OK" }]
              );
            }
          }
        }
      ]
    );
  };

  if (!event) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <TopBar onProfilePress={() => router.push(`/profile/${authUser?.uid}`)} />
          <View style={styles.loadingContainer}>
            <ModernLoadingIndicator color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
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
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar onProfilePress={() => router.push(`/profile/${authUser?.uid}`)} />
        {event.eventImage && (
          <View style={[styles.imageContainer, { top: topBarHeight }]}>
            <LoadingImage 
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
              <Text style={[styles.eventTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>{event.name}</Text>
              <View style={[styles.categoryChip, { 
                backgroundColor: theme === "light" ? "rgba(56,165,201,0.1)" : "rgba(56,165,201,0.1)",
                borderColor: "#37a4c8"
              }]}>
                <Text style={styles.eventCategory}>{event.category}</Text>
              </View>
              <Text style={[styles.eventDescription, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>{event.description}</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="event" size={20} color="#37a4c8" />
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Created {formatDateTime(event.createdAt)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="schedule" size={20} color="#37a4c8" />
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
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
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {event.attendees?.length || 0} attendees
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="flight" size={20} color="#37a4c8" />
                  <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    {event.airportCode || "No airport set"}
                  </Text>
                </View>
              </View>
              {renderOrganizerSection()}
            </View>
            <View style={styles.bottomButtons}>
              <TouchableOpacity
                style={[styles.buttonContainer, (!isAttending && !isOrganizer) && styles.buttonContainerDisabled]}
                onPress={() => router.push(`event/eventChat/${id}`)}
                accessibilityLabel="Event Chat"
                accessibilityHint="Navigate to event discussion"
                disabled={!isAttending && !isOrganizer}
              >
                <LinearGradient 
                  colors={(!isAttending && !isOrganizer) ? ["#cccccc", "#999999"] : ["#37a4c8", "#2F80ED"]} 
                  style={[styles.buttonGradient, { borderRadius: 12 }]}
                >
                  <View style={styles.chatButtonContent}>
                    <View style={styles.chatIconContainer}>
                      <Ionicons name="chatbubbles" size={24} color="#ffffff" />
                      {messageCount > 0 && (
                        <View style={styles.messageBadge}>
                          <Text style={styles.messageBadgeText}>
                            {messageCount > 99 ? '99+' : messageCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.buttonText, { color: "#ffffff" }]}>
                      {(!isAttending && !isOrganizer) ? "Join to Chat" : "Event Chat"}
                    </Text>
                  </View>
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

            {/* Add report button for non-organizer users */}
            {authUser && event.organizer !== authUser.uid && (
              <View style={styles.reportButtonContainer}>
                <TouchableOpacity
                  style={[styles.reportButton, { 
                    backgroundColor: theme === "light" ? "rgba(255, 68, 68, 0.1)" : "rgba(255, 102, 102, 0.1)",
                    borderColor: theme === "light" ? "#ff4444" : "#ff6666",
                  }]}
                  onPress={handleReport}
                >
                  <MaterialIcons name="report" size={16} color={theme === "light" ? "#ff4444" : "#ff6666"} />
                  <Text style={[styles.reportButtonText, { color: theme === "light" ? "#ff4444" : "#ff6666" }]}>
                    Report Event
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="datetime"
          onConfirm={handleConfirmDate}
          onCancel={() => setShowDatePicker(false)}
          textColor={theme === "light" ? "#0F172A" : "#e4fbfe"}
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
    borderRadius: 16,
    padding: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#38a5c8",
    marginBottom: 8,
    marginTop: 16,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e4fbfe",
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: "rgba(56,165,201,0.1)",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#38a5c8",
  },
  eventCategory: {
    fontSize: 12,
    color: "#38a5c8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  eventDescription: {
    fontSize: 13,
    color: "#e4fbfe",
    lineHeight: 20,
    marginBottom: 20,
  },
  detailsGrid: {
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    color: "#e4fbfe",
    fontWeight: "500",
  },
  organizerContainer: {
    marginBottom: 24,
  },
  organizerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56,165,201,0.1)",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#38a5c8",
  },
  organizerText: {
    fontSize: 13,
    color: "#38a5c8",
    fontWeight: "600",
  },
  becomeOrganizerButton: {
    marginTop: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  organizedTimestamp: {
    fontSize: 11,
    color: "#38a5c8",
    marginTop: 6,
    alignSelf: "flex-end",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 12 : 8,
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
  chatButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
  },
  messageBadge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  messageBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  reportButtonContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainerDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicatorContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});