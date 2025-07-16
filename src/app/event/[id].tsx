import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing, Modal } from "react-native";
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
import UserAvatar from "../../components/UserAvatar";
import * as Haptics from 'expo-haptics';

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
  age?: number;
  bio?: string;
  interests?: string[];
  profilePicture?: string;
  airportCode?: string;
  moodStatus?: string;
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

  useEffect(() => {
    const pulseAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    ]);

    Animated.loop(pulseAnimation).start();
  }, []);

  return (
    <View style={styles.loadingIndicatorContainer}>
      <Animated.View
        style={[
          styles.loadingCircle,
          {
            backgroundColor: color,
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.7],
            }),
            transform: [{ scale: scaleAnim }],
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
  const [organizer, setOrganizer] = useState<UserData | null>(null);
  const [isAttending, setIsAttending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading event details...");
  const { user } = useAuth();
  const router = useRouter();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAttendeesModal, setShowAttendeesModal] = useState(false);
  const [attendeesList, setAttendeesList] = useState<UserData[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const insets = useSafeAreaInsets();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const themeContext = React.useContext(ThemeContext);
  const theme = themeContext?.theme || "light";
  const { messages } = useChat(eventId);
  const messageCount = messages?.length || 0;

  // Animation values for bounce effect
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const loadingStartTime = useRef<number | null>(null);

  // Existing useEffect hooks
  useEffect(() => {
    if (event && user) {
      const isUserAttending = event.attendees?.includes(user.uid) ?? false;
      setIsAttending(isUserAttending);
    }
  }, [event, user]);

  useEffect(() => {
    if (eventId) {
      loadingStartTime.current = Date.now();
      (async () => {
        const eventData = await getEvent(eventId);
        if (eventData) {
          const typedEventData = eventData as Event;
          setEvent(typedEventData);
          const organizerID = typedEventData.organizer;
          if (organizerID) {
            const organizerData = await getUser(organizerID) as UserData;
            setOrganizer(organizerData || null);
          } else {
            setOrganizer(null);
          }
          
          // Ensure minimum loading time of 1.5 seconds
          const elapsedTime = Date.now() - (loadingStartTime.current || 0);
          const minLoadingTime = 1500; // 1.5 seconds
          
          if (elapsedTime < minLoadingTime) {
            setTimeout(() => {
              setInitialLoadComplete(true);
            }, minLoadingTime - elapsedTime);
          } else {
            setInitialLoadComplete(true);
          }
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

  // Handle fade in animation when content is ready
  useEffect(() => {
    if (!loading && initialLoadComplete && event) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, initialLoadComplete, event, fadeAnim]);

  // Add effect for bounce animation when loading completes
  useEffect(() => {
    if (!loading && initialLoadComplete && event) {
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }
  }, [loading, initialLoadComplete, event]);

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
    
    // Prevent attending if there's no organizer
    if (!event.organizer) {
      Alert.alert(
        "No Organizer",
        "This event needs an organizer before you can attend. Please wait for someone to claim organization or become the organizer yourself.",
        [{ text: "OK" }]
      );
      return;
    }
    
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
      setOrganizer(organizerData || null);
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

  // Fetch attendees data when modal opens
  const handleShowAttendees = async () => {
    if (!event) return;
    
    setShowAttendeesModal(true);
    setLoading(true);
    
    try {
      const allAttendees: UserData[] = [];
      
      // Add organizer if exists
      if (event.organizer && organizer) {
        allAttendees.push(organizer);
      }
      
      // Fetch all attendee data
      const attendeePromises = event.attendees
        .filter(attendeeId => attendeeId !== event.organizer) // Don't duplicate organizer
        .map(async (attendeeId) => {
          try {
            const attendeeData = await getUser(attendeeId) as UserData;
            return attendeeData;
          } catch (error) {
            console.error("Error fetching attendee:", error);
            return null;
          }
        });
      
      const attendeeResults = await Promise.all(attendeePromises);
      const validAttendees = attendeeResults.filter((attendee): attendee is UserData => attendee !== null);
      
      setAttendeesList([...allAttendees, ...validAttendees]);
    } catch (error) {
      console.error("Error fetching attendees:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen during initial load
  if (!initialLoadComplete || !event) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <LoadingScreen />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const isOrganizer = user?.uid === event.organizer;

  // Debug logging
  console.log('Event organizer:', event.organizer);
  console.log('Is attending:', isAttending);
  console.log('Should disable attend button:', !event.organizer && !isAttending);

  // Attend button state variables
  const attendButtonDisabled = !event.organizer && !isAttending;
  const attendButtonColors = attendButtonDisabled 
    ? ["#cccccc", "#999999"] 
    : isAttending 
    ? ["#FF416C", "#FF4B2B"] 
    : ["#37a4c8", "#37a4c8"];



  const renderAttendeesModal = () => (
    <Modal
      visible={showAttendeesModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAttendeesModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.modalGradient}>
          <View style={[styles.modalHeader, {
            borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.15)"
          }]}>
            <TouchableOpacity
              style={[styles.modalCloseButton, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.06)" : "rgba(55, 164, 200, 0.1)"
              }]}
              onPress={() => setShowAttendeesModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
              Event Attendees
            </Text>
            <View style={styles.modalSpacer} />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.modalLoadingContainer}>
                <View style={[styles.modalLoadingIcon, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                }]}>
                  <MaterialIcons name="people" size={24} color="#37a4c8" />
                </View>
                <Text style={[styles.modalLoadingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Loading attendees...
                </Text>
              </View>
            ) : attendeesList.length > 0 ? (
              <View style={styles.attendeesList}>
                {attendeesList.map((attendee, index) => (
                  <TouchableOpacity
                    key={attendee.id}
                    style={[styles.attendeeItem, { 
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                    }]}
                    onPress={() => {
                      setShowAttendeesModal(false);
                      router.push(`/profile/${attendee.id}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.attendeeHeader}>
                      <View style={[styles.attendeeAvatarContainer, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.06)" : "rgba(55, 164, 200, 0.1)"
                      }]}>
                        <UserAvatar
                          user={attendee}
                          size={44}
                          style={styles.attendeeAvatar}
                        />
                      </View>
                      <View style={styles.attendeeInfo}>
                        <View style={styles.attendeeNameRow}>
                          <Text style={[styles.attendeeName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                            {attendee.name}
                          </Text>
                          {event.organizer === attendee.id && (
                            <View style={[styles.organizerBadge, {
                              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.25)"
                            }]}>
                              <MaterialIcons name="star" size={10} color="#37a4c8" />
                              <Text style={styles.organizerBadgeText}>Organizer</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.attendeeDetails}>
                          {attendee.age && (
                            <Text style={[styles.attendeeDetail, { color: "#37a4c8" }]}>
                              {attendee.age} years old
                            </Text>
                          )}
                          {attendee.age && attendee.airportCode && (
                            <View style={[styles.attendeeDetailDot, { 
                              backgroundColor: theme === "light" ? "#64748B" : "#94A3B8" 
                            }]} />
                          )}
                          {attendee.airportCode && (
                            <Text style={[styles.attendeeDetail, { color: "#37a4c8" }]}>
                              {attendee.airportCode}
                            </Text>
                          )}
                        </View>
                        {attendee.bio && (
                          <Text style={[styles.attendeeBio, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={2}>
                            {attendee.bio}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.attendeeChevron, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.06)" : "rgba(55, 164, 200, 0.1)"
                      }]}>
                        <Ionicons name="chevron-forward" size={16} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.modalEmptyContainer}>
                <View style={[styles.modalEmptyIcon, {
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                }]}>
                  <Ionicons name="people" size={32} color={theme === "light" ? "#64748B" : "#94A3B8"} />
                </View>
                <Text style={[styles.modalEmptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  No attendees yet
                </Text>
                <Text style={[styles.modalEmptySubtext, { color: theme === "light" ? "#94A3B8" : "#64748B" }]}>
                  Be the first to join this event!
                </Text>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar onProfilePress={() => router.push(`/profile/${authUser?.uid}`)} />
        
        <Animated.View 
          style={{ 
            flex: 1,
            opacity: contentBounceAnim,
            transform: [
              { scale: contentScaleAnim },
              {
                translateY: contentBounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }
            ]
          }}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Event Image */}
              {event.eventImage && (
                <View style={styles.imageContainer}>
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

              {/* Title and Category Section */}
              <View style={[styles.titleSection, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <View style={styles.titleRow}>
                  <MaterialIcons 
                    name="event" 
                    size={24} 
                    color="#37a4c8" 
                    style={styles.categoryIcon}
                  />
                  <View style={styles.titleContent}>
                    <Text style={[styles.title, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.name}
                    </Text>
                    <Text style={[styles.category, { color: "#37a4c8" }]}>
                      {event.category}
                    </Text>
                  </View>
                </View>
                
                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: event.organizer ? '#10B981' : '#F59E0B' }]}>
                  <Text style={styles.statusText}>{event.organizer ? 'Organized' : 'Needs Organizer'}</Text>
                </View>
              </View>

              {/* Description Section */}
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Description
                </Text>
                <Text style={[styles.description, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  {event.description}
                </Text>
              </View>

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={[styles.detailItem, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                }]}>
                  <View style={styles.detailIconContainer}>
                    <MaterialIcons name="event" size={18} color="#37a4c8" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Created
                    </Text>
                    <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {formatDateTime(event.createdAt)}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.detailItem, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                }]}>
                  <View style={styles.detailIconContainer}>
                    <MaterialIcons name="schedule" size={18} color="#37a4c8" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Starts
                    </Text>
                    <View style={styles.detailTextContainer}>
                      <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                        {formatDateTime(event.startTime)}
                      </Text>
                      {isOrganizer && (
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => setShowDatePicker(true)}
                        >
                          <MaterialIcons name="edit" size={14} color="#37a4c8" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
                
                <View style={[styles.detailItem, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                }]}>
                  <View style={styles.detailIconContainer}>
                    <MaterialIcons name="people" size={18} color="#37a4c8" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Attendees
                    </Text>
                    <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.attendees?.length || 0} people
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.detailItem, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                }]}>
                  <View style={styles.detailIconContainer}>
                    <MaterialIcons name="flight" size={18} color="#37a4c8" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Airport
                    </Text>
                    <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.airportCode || "Not set"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Organizer Section */}
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  {event.organizer ? 'Organized by' : 'Organization'}
                </Text>
                {event.organizer ? (
                  <View style={styles.creatorRow}>
                    <UserAvatar user={{ name: organizer?.name || 'Unknown' }} size={50} />
                    <View style={styles.creatorInfo}>
                      <Text style={[styles.creatorName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                        {organizer?.name || "Unknown"}
                      </Text>
                      <Text style={[styles.creatorDate, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Organized {formatDateTime(event.organizedAt)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.creatorRow}>
                    <View style={[styles.organizerIconContainer, {
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.12)"
                    }]}>
                      <MaterialIcons name="group-add" size={24} color="#37a4c8" />
                    </View>
                    <View style={styles.creatorInfo}>
                      <Text style={[styles.creatorName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                        This event needs an organizer!
                      </Text>
                      <Text style={[styles.creatorDate, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Be the first to claim organization and set the event time
                      </Text>
                    </View>
                  </View>
                )}

                {event.organizer === null && (
                  <TouchableOpacity
                    style={styles.becomeOrganizerButton}
                    onPress={confirmOrganizerTakeover}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={["#37a4c8", "#37a4c8"]}
                      style={styles.buttonGradient}
                    >
                      <Feather name="star" size={20} color="#fff" />
                      <Text style={styles.buttonText}>
                        {loading ? "Claiming..." : "Become Organizer"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              {/* Attendees Section */}
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <View style={styles.participantsHeader}>
                  <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Attendees ({event.attendees?.length || 0})
                  </Text>
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={handleShowAttendees}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.participantsScroll}>
                  {attendeesList.slice(0, 5).map((attendee, index) => (
                    <View key={attendee.id || index} style={styles.participantItem}>
                      <UserAvatar user={attendee} size={40} />
                      <Text style={[styles.participantName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                        {attendee.name}
                      </Text>
                    </View>
                  ))}
                  {attendeesList.length === 0 && (
                    <Text style={[styles.noParticipants, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      No attendees yet
                    </Text>
                  )}
                </ScrollView>
              </View>

              {/* Action Buttons */}
              <View style={styles.bottomButtons}>
                <TouchableOpacity
                  style={[styles.buttonContainer, (!isAttending && !isOrganizer) && styles.buttonContainerDisabled]}
                  onPress={() => router.push(`event/eventChat/${id}`)}
                  accessibilityLabel="Event Chat"
                  accessibilityHint="Navigate to event discussion"
                  disabled={!isAttending && !isOrganizer}
                  activeOpacity={0.7}
                >
                  <LinearGradient 
                    colors={(!isAttending && !isOrganizer) ? ["#cccccc", "#999999"] : ["#37a4c8", "#37a4c8"]} 
                    style={styles.buttonGradient}
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
                      <Text style={styles.buttonText}>
                        {(!isAttending && !isOrganizer) ? "Join to Chat" : "Event Chat"}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.buttonContainer, attendButtonDisabled && styles.buttonContainerDisabled]}
                  onPress={handleAttend}
                  activeOpacity={0.7}
                  disabled={loading || attendButtonDisabled}
                >
                  <LinearGradient
                    colors={attendButtonColors}
                    style={styles.buttonGradient}
                  >
                    <Feather
                      name={isAttending ? "x-circle" : "check-circle"}
                      size={24}
                      color="#ffffff"
                    />
                    <Text style={styles.buttonText}>
                      {loading
                        ? "Processing..."
                        : isAttending
                        ? "Leave Event"
                        : !event.organizer
                        ? "Need Organizer"
                        : "Attend Event"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Report Button */}
              {authUser && event.organizer !== authUser.uid && (
                <View style={styles.reportButtonContainer}>
                  <TouchableOpacity
                    style={[styles.reportButton, { 
                      backgroundColor: theme === "light" ? "rgba(255, 68, 68, 0.1)" : "rgba(255, 102, 102, 0.1)",
                      borderColor: theme === "light" ? "#ff4444" : "#ff6666",
                    }]}
                    onPress={handleReport}
                    activeOpacity={0.7}
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
        </Animated.View>
        
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

        {renderAttendeesModal()}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  headerSection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  imageContainer: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 6,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  eventImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },

  detailsGrid: {
    marginBottom: 20,
    gap: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
  },

  becomeOrganizerButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    marginTop: 12,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  buttonContainer: {
    flex: 1,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderRadius: 16,
    overflow: "hidden",
  },
  chatButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 16,
    marginBottom: 16,
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
    opacity: 0.4,
  },
  loadingIndicatorContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalSpacer: {
    width: 36,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalLoadingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalLoadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  attendeesList: {
    paddingVertical: 20,
    gap: 12,
  },
  attendeeItem: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  attendeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  attendeeAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  attendeeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  attendeeDetail: {
    fontSize: 12,
    fontWeight: '500',
  },
  attendeeDetailDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 6,
  },
  attendeeBio: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  attendeeChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  organizerBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#37a4c8',
  },

  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  modalEmptySubtext: {
    fontSize: 12,
    fontWeight: '400',
    opacity: 0.7,
  },

  titleSection: {
    borderRadius: 20,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  categoryIcon: {
    marginTop: 4,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#37a4c8',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  section: {
    borderRadius: 20,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 18,
    fontWeight: '600',
  },
  creatorDate: {
    fontSize: 13,
    fontWeight: '400',
    opacity: 0.7,
  },
  viewAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#37a4c8',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#37a4c8',
  },
  participantsScroll: {
    paddingVertical: 10,
  },
  participantItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  participantName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  noParticipants: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  organizerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});