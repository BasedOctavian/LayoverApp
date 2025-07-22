import React, { useEffect, useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, Easing, Modal, TextInput, Linking, Platform } from "react-native";
import useEvents from "../../hooks/useEvents";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import useUsers from "../../hooks/useUsers";
import useAuth from "../../hooks/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "react-native";
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
  title: string;
  description: string;
  category: string;
  eventImage?: string;
  createdAt: any;
  startTime: any;
  participants: string[];
  creatorId: string;
  creatorName: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  eventUID: string;
  status: string;
  pingType: string;
  template: string;
  duration: string;
  maxParticipants: string;
  participantCount: number;
  connectionIntents: string[];
  eventPreferences: {
    likesBars: boolean;
    prefersActiveLifestyles: boolean;
    prefersEveningEvents: boolean;
    prefersIndoorVenues: boolean;
    prefersIntellectualDiscussions: boolean;
    prefersLocalMeetups: boolean;
    prefersQuietEnvironments: boolean;
    prefersSmallGroups: boolean;
    prefersSpontaneousPlans: boolean;
    prefersStructuredActivities: boolean;
    prefersTravelEvents: boolean;
    prefersWeekendEvents: boolean;
  };
  visibilityRadius: string;
  updatedAt: any;
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
    if (!event?.participants?.length) return;

    // Get all participant documents
    const attendeeDocs = await Promise.all(
      event.participants.map((participantId: string) => getDoc(doc(db, 'users', participantId)))
    );

    // Process each attendee (excluding the organizer)
    const notificationPromises = attendeeDocs.map(async (attendeeDoc: any) => {
      if (!attendeeDoc.exists()) return;

      // Skip if this attendee is the creator/organizer of the event
      if (attendeeDoc.id === event.creatorId) return;

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
  const [participants, setParticipants] = useState<UserData[]>([]);
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

  // Edit functionality state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [selectionOptions, setSelectionOptions] = useState<Array<{id: string, label: string, icon?: string}>>([]);
  const [selectionType, setSelectionType] = useState<string>('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Privacy options for organizers
  const privacyOptions = [
    { id: 'open', label: 'Open', description: 'Anyone can join', icon: 'public' },
    { id: 'invite-only', label: 'Invite Only', description: 'You approve requests', icon: 'person-add' },
    { id: 'friends-only', label: 'Friends Only', description: 'Only your available connections', icon: 'people' }
  ];

  // Existing useEffect hooks
  useEffect(() => {
    if (event && user) {
      const isUserAttending = event.participants?.includes(user.uid) ?? false;
      setIsAttending(isUserAttending);
    }
  }, [event, user]);

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!event) return;
      const users = await Promise.all(
        (event.participants || []).map(async (uid: string) => {
          try {
            return await getUser(uid) as UserData;
          } catch {
            return null;
          }
        })
      );
      setParticipants(users.filter((user): user is UserData => user !== null));
    };
    if (event) fetchParticipants();
  }, [event]);

  useEffect(() => {
    if (eventId) {
      loadingStartTime.current = Date.now();
      (async () => {
        const eventData = await getEvent(eventId);
        if (eventData) {
          const typedEventData = eventData as Event;
          setEvent(typedEventData);
          const creatorID = typedEventData.creatorId;
          if (creatorID) {
            const creatorData = await getUser(creatorID) as UserData;
            setOrganizer(creatorData || null);
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
    
    setLoading(true);
    setLoadingMessage("Updating attendance...");
    try {
      const currentParticipants = event.participants || [];
      const newParticipants = isAttending
        ? currentParticipants.filter((uid: string) => uid !== user.uid)
        : [...currentParticipants, user.uid];

      const newParticipantCount = newParticipants.length;

      await updateEvent(event.id, { 
        participants: newParticipants,
        participantCount: newParticipantCount
      });
      setEvent((prev: Event | null) => prev ? { 
        ...prev, 
        participants: newParticipants,
        participantCount: newParticipantCount
      } : null);

      // If user is attending (not leaving) and there's a creator, notify them
      if (!isAttending && event.creatorId) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const attendeeName = userData?.name || 'Someone';
        
        await notifyOrganizer(event.creatorId, event.title, attendeeName, event.eventUID);
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomeOrganizer = async () => {
    if (!user?.uid || !event) return;
    setLoading(true);
    setLoadingMessage("Claiming organization...");
    try {
      const currentParticipants = event.participants || [];
      const newParticipants = [...currentParticipants, user.uid];
      const newParticipantCount = newParticipants.length;
      
      await updateEvent(event.id, {
        creatorId: user.uid,
        creatorName: user.displayName || 'Unknown',
        participants: newParticipants,
        participantCount: newParticipantCount,
        updatedAt: new Date().toISOString()
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
    if (!user?.uid || !event || user.uid !== event.creatorId) return;
    setLoading(true);
    setLoadingMessage("Updating event time...");
    try {
      const timestamp = date.toISOString();
      await updateEvent(event.id, { 
        startTime: timestamp,
        updatedAt: new Date().toISOString()
      });
      setEvent((prev: Event | null) => prev ? { ...prev, startTime: timestamp } : null);
      
      // Notify all participants about the update
      await notifyAttendees(event, event.title, 'startTime', event.eventUID);
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
                reportedEventName: event?.title || 'Unknown Event',
                reportedByUserName: authUser?.displayName || 'Anonymous',
                createdAt: serverTimestamp(),
                status: "pending",
                type: "event_report",
                lastUpdated: serverTimestamp(),
                reviewedBy: null,
                reviewNotes: null,
                reviewDate: null,
                reportedEvent: {
                  title: event?.title || 'Unknown Event',
                  description: event?.description,
                  category: event?.category,
                  creatorId: event?.creatorId,
                  location: event?.location,
                  createdAt: event?.createdAt,
                  startTime: event?.startTime,
                  participants: event?.participantCount || 0,
                }
              };
              
              await addDoc(collection(db, "reports"), reportData);
              
              // Notify admins about the report
              await notifyAdmins(event?.title || 'Unknown Event');
              
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
      
      // Add creator if exists
      if (event.creatorId && organizer) {
        allAttendees.push(organizer);
      }
      
      // Fetch all participant data
      const attendeePromises = event.participants
        .filter(participantId => participantId !== event.creatorId) // Don't duplicate creator
        .map(async (participantId) => {
          try {
            const attendeeData = await getUser(participantId) as UserData;
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

  const isOrganizer = user?.uid === event.creatorId;

  // Debug logging
  console.log('Event creator:', event.creatorId);
  console.log('Is attending:', isAttending);
  console.log('Should disable attend button:', !event.creatorId && !isAttending);

  // Attend button state variables
  const attendButtonDisabled = !event.creatorId && !isAttending;
  const attendButtonColors = attendButtonDisabled 
    ? ["#cccccc", "#999999"] as const
    : isAttending 
    ? ["#FF416C", "#FF4B2B"] as const
    : ["#37a4c8", "#37a4c8"] as const;



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
                                                {event.creatorId === attendee.id && (
                        <View style={[styles.organizerBadge, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.25)"
                        }]}>
                          <MaterialIcons name="star" size={10} color="#37a4c8" />
                          <Text style={styles.organizerBadgeText}>Creator</Text>
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

  // Edit functionality handlers
  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    
    // Check if this field should use selection instead of text input
    if (field === 'duration' || field === 'maxParticipants' || field === 'visibilityRadius') {
      setSelectionType(field);
      setSelectionOptions(getSelectionOptions(field));
      setShowSelectionModal(true);
    } else {
      setShowEditModal(true);
    }
  };

  const getSelectionOptions = (field: string) => {
    switch (field) {
      case 'duration':
        return [
          { id: '30 minutes', label: '30 minutes' },
          { id: '1 hour', label: '1 hour' },
          { id: '2 hours', label: '2 hours' },
          { id: '3 hours', label: '3 hours' },
          { id: '4 hours', label: '4 hours' },
          { id: 'All day', label: 'All day' }
        ];
      case 'maxParticipants':
        return [
          { id: '2 people', label: '2 people' },
          { id: '3 people', label: '3 people' },
          { id: '4 people', label: '4 people' },
          { id: '5 people', label: '5 people' },
          { id: '6 people', label: '6 people' },
          { id: 'Unlimited', label: 'Unlimited' }
        ];
      case 'visibilityRadius':
        return [
          { id: '5 miles', label: '5 miles' },
          { id: '10 miles', label: '10 miles' },
          { id: '15 miles', label: '15 miles' },
          { id: '20 miles', label: '20 miles' },
          { id: '25 miles', label: '25 miles' },
          { id: '50 miles', label: '50 miles' }
        ];
      default:
        return [];
    }
  };

  const handleSelection = (selectedValue: string) => {
    setEditValue(selectedValue);
    setShowSelectionModal(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingField || !event || !user) return;
    
    setLoading(true);
    setLoadingMessage("Updating event...");
    try {
      // Update the event document in Firestore
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        [editingField]: editValue,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setEvent(prev => prev ? { ...prev, [editingField]: editValue } : null);
      
      // Notify attendees about the update
      await notifyAttendees(event, event.title, editingField, event.eventUID);
      
      setShowEditModal(false);
      setEditingField(null);
      setEditValue('');
      
      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFieldDisplayName = (field: string) => {
    switch (field) {
      case 'title': return 'Title';
      case 'description': return 'Description';
      case 'duration': return 'Duration';
      case 'maxParticipants': return 'Max Participants';
      case 'visibilityRadius': return 'Visibility Radius';
      case 'location': return 'Location';
      case 'category': return 'Category';
      case 'template': return 'Template';
      case 'pingType': return 'Event Type';
      default: return field.charAt(0).toUpperCase() + field.slice(1);
    }
  };

  const getPrivacyTypeLabel = (pingType: string) => {
    switch (pingType) {
      case 'open':
        return 'Open';
      case 'invite-only':
        return 'Invite Only';
      case 'friends-only':
        return 'Friends Only';
      default:
        return pingType;
    }
  };

  // Handle opening directions in maps
  const handleGetDirections = async () => {
    if (!event?.coordinates) {
      Alert.alert(
        'No Location Available',
        'This event doesn\'t have location coordinates.',
        [{ text: 'OK' }]
      );
      return;
    }

    const { latitude, longitude } = event.coordinates;
    const label = event.title || 'Event Location';
    
    try {
      const url = Platform.OS === 'ios' 
        ? `http://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d`
        : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to generic maps URL
        const fallbackUrl = `https://maps.google.com/maps?daddr=${latitude},${longitude}`;
        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert(
        'Error',
        'Unable to open directions. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle privacy setting change
  const handlePrivacyChange = async (newPrivacyType: string) => {
    if (!event || !user) return;
    
    setLoading(true);
    setLoadingMessage("Updating privacy settings...");
    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        pingType: newPrivacyType,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setEvent(prev => prev ? { ...prev, pingType: newPrivacyType } : null);
      
      // Notify attendees about the privacy change
      await notifyAttendees(event, event.title, 'privacy', event.eventUID);
      
      setShowPrivacyModal(false);
      Alert.alert('Privacy Updated', `Event is now ${getPrivacyTypeLabel(newPrivacyType)}`);
      
      // Provide haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Error updating privacy setting:', error);
      Alert.alert('Error', 'Failed to update privacy setting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
                      {event.title}
                    </Text>
                    <Text style={[styles.category, { color: "#37a4c8" }]}>
                      {event.category}
                    </Text>
                  </View>
                  {isOrganizer && (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditField('title', event.title)}
                    >
                      <Feather name="edit-2" size={16} color="#37a4c8" />
                    </TouchableOpacity>
                  )}
                </View>
                

              </View>

              {/* Description Section */}
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Description
                  </Text>
                  {isOrganizer && (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditField('description', event.description)}
                    >
                      <Feather name="edit-2" size={16} color="#37a4c8" />
                    </TouchableOpacity>
                  )}
                </View>
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
                      Participants
                    </Text>
                    <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.participantCount || 0} / {event.maxParticipants ? (event.maxParticipants.includes('people') ? event.maxParticipants : `${event.maxParticipants} people`) : '∞ people'}
                    </Text>
                  </View>
                  {isOrganizer && (
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditField('maxParticipants', event.maxParticipants || '4 people')}
                    >
                      <Feather name="edit-2" size={14} color="#37a4c8" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={[styles.detailItem, { 
                  backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                }]}>
                  <View style={styles.detailIconContainer}>
                    <MaterialIcons name="location-on" size={18} color="#37a4c8" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={[styles.detailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Location
                    </Text>
                    <Text style={[styles.detailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.location || "Not set"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Creator Section */}
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  {event.creatorId ? 'Created by' : 'Organization'}
                </Text>
                {event.creatorId ? (
                  <View style={styles.creatorRow}>
                    <UserAvatar user={{ 
                      name: organizer?.name || event.creatorName || 'Unknown',
                      profilePicture: organizer?.profilePicture
                    }} size={50} />
                    <View style={styles.creatorInfo}>
                      <Text style={[styles.creatorName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                        {organizer?.name || event.creatorName || "Unknown"}
                      </Text>
                      <Text style={[styles.creatorDate, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Created {formatDateTime(event.createdAt)}
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

                {!event.creatorId && (
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

              {/* Participants Section */}
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <View style={styles.participantsHeader}>
                  <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Participants ({event.participantCount || 0})
                  </Text>
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={handleShowAttendees}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.participantsContainer}>
                  {participants.length > 0 ? (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      contentContainerStyle={styles.participantsScrollContent}
                      style={styles.participantsScroll}
                    >
                      {participants.slice(0, 5).map((participant, index) => (
                        <View key={participant.id || index} style={styles.participantCard}>
                          <View style={styles.participantAvatarContainer}>
                            <UserAvatar user={participant} size={48} />
                            {participant.id === event.creatorId && (
                              <View style={[styles.creatorBadge, { 
                                backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                              }]}>
                                <MaterialIcons name="star" size={12} color="#FFFFFF" />
                              </View>
                            )}
                          </View>
                          <Text style={[styles.participantName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]} numberOfLines={1}>
                            {participant.name}
                          </Text>
                          {participant.airportCode && (
                            <Text style={[styles.participantLocation, { color: theme === "light" ? "#64748B" : "#94A3B8" }]} numberOfLines={1}>
                              {participant.airportCode}
                            </Text>
                          )}
                        </View>
                      ))}
                      {participants.length > 5 && (
                        <View style={styles.moreParticipantsCard}>
                          <View style={[styles.moreParticipantsAvatar, { 
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                          }]}>
                            <Text style={[styles.moreParticipantsText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
                              +{participants.length - 5}
                            </Text>
                          </View>
                          <Text style={[styles.moreParticipantsLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                            More
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  ) : (
                    <View style={[styles.emptyParticipantsContainer, { 
                      backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                    }]}>
                      <View style={[styles.emptyParticipantsIcon, { 
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
                      }]}>
                        <MaterialIcons name="people-outline" size={24} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      </View>
                      <Text style={[styles.emptyParticipantsText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        No participants yet
                      </Text>
                      <Text style={[styles.emptyParticipantsSubtext, { color: theme === "light" ? "#94A3B8" : "#64748B" }]}>
                        Be the first to join this event!
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Event Details Section */}
              <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  Event Details
                </Text>
                
                <View style={styles.eventDetailsGrid}>
                  <View style={[styles.eventDetailItem, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                  }]}>
                    <View style={styles.eventDetailHeader}>
                      <MaterialIcons name="schedule" size={16} color="#37a4c8" />
                      <Text style={[styles.eventDetailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Duration
                      </Text>
                      {isOrganizer && (
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => handleEditField('duration', event.duration || '1 hour')}
                        >
                          <Feather name="edit-2" size={12} color="#37a4c8" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.eventDetailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.duration || "Not set"}
                    </Text>
                  </View>
                  
                  <View style={[styles.eventDetailItem, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                  }]}>
                    <View style={styles.eventDetailHeader}>
                      <MaterialIcons name="visibility" size={16} color="#37a4c8" />
                      <Text style={[styles.eventDetailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Visibility
                      </Text>
                      {isOrganizer && (
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => handleEditField('visibilityRadius', event.visibilityRadius || '10 miles')}
                        >
                          <Feather name="edit-2" size={12} color="#37a4c8" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.eventDetailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.visibilityRadius || "Not set"}
                    </Text>
                  </View>
                  
                  <View style={[styles.eventDetailItem, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                  }]}>
                    <View style={styles.eventDetailHeader}>
                      <MaterialIcons name="category" size={16} color="#37a4c8" />
                      <Text style={[styles.eventDetailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Template
                      </Text>
                    </View>
                    <Text style={[styles.eventDetailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {event.template || "Not set"}
                    </Text>
                  </View>
                  
                  <View style={[styles.eventDetailItem, { 
                    backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(55, 164, 200, 0.08)",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)"
                  }]}>
                    <View style={styles.eventDetailHeader}>
                      <MaterialIcons name="public" size={16} color="#37a4c8" />
                      <Text style={[styles.eventDetailLabel, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Type
                      </Text>
                      {isOrganizer && (
                        <TouchableOpacity 
                          style={styles.editButton}
                          onPress={() => setShowPrivacyModal(true)}
                        >
                          <Feather name="settings" size={12} color="#37a4c8" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={[styles.eventDetailText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {getPrivacyTypeLabel(event.pingType || 'open')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Connection Intents Section */}
              {event.connectionIntents && event.connectionIntents.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
                  <Text style={[styles.sectionTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Connection Goals
                  </Text>
                  <View style={styles.intentsContainer}>
                    {event.connectionIntents.map((intent, index) => (
                      <View key={index} style={[styles.intentChip, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.25)"
                      }]}>
                        <Text style={[styles.intentText, { color: "#37a4c8" }]}>
                          {intent}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Directions Button */}
              {event.coordinates && (isAttending || isOrganizer) && (
                <TouchableOpacity 
                  style={styles.directionsButton}
                  onPress={handleGetDirections}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.directionsButtonGradient,
                    { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }
                  ]}>
                    <MaterialIcons 
                      name="directions" 
                      size={20} 
                      color={theme === "light" ? "#0F172A" : "#e4fbfe"} 
                    />
                    <Text style={[
                      styles.directionsButtonText,
                      { color: theme === "light" ? "#0F172A" : "#e4fbfe" }
                    ]}>
                      Get Directions
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

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
                        : !event.creatorId
                        ? "Need Organizer"
                        : "Attend Event"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Report Button */}
              {authUser && event.creatorId !== authUser.uid && (
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

        {/* Selection Modal */}
        <Modal 
          visible={showSelectionModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowSelectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={[styles.editModalHeader, { 
                borderBottomColor: theme === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)" 
              }]}>
                <View style={styles.inviteModalHeaderContent}>
                  <Text style={[styles.editModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Select {selectionType ? getFieldDisplayName(selectionType) : 'Option'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.closeButton, { 
                    backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)" 
                  }]}
                  onPress={() => setShowSelectionModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.editModalBody}>
                <ScrollView 
                  style={styles.selectionOptionsContainer}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.selectionOptionsScrollContent}
                >
                {selectionOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.selectionOption,
                      {
                        backgroundColor: option.id === editValue 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                        borderColor: option.id === editValue 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                      }
                    ]}
                    onPress={() => handleSelection(option.id)}
                    activeOpacity={0.6}
                  >
                    <Text style={[
                      styles.selectionOptionText,
                      {
                        color: option.id === editValue 
                          ? "#FFFFFF"
                          : (theme === "light" ? "#37a4c8" : "#38a5c9")
                      }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>

        {/* Edit Modal */}
        <Modal 
          visible={showEditModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={[styles.editModalHeader, { 
                borderBottomColor: theme === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)" 
              }]}>
                <View style={styles.inviteModalHeaderContent}>
                  <Text style={[styles.editModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Edit {editingField ? getFieldDisplayName(editingField) : 'Field'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.closeButton, { 
                    backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)" 
                  }]}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.editModalBody}>
                {editingField === 'duration' || editingField === 'maxParticipants' || editingField === 'visibilityRadius' ? (
                  <View style={[styles.editInput, { 
                    backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a",
                    borderColor: theme === "light" ? "#e2e8f0" : "#404040",
                    justifyContent: 'center'
                  }]}>
                    <Text style={[styles.editValueText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                      {editValue}
                    </Text>
                  </View>
                ) : (
                  <TextInput
                    style={[styles.editInput, { 
                      backgroundColor: theme === "light" ? "#f8f9fa" : "#2a2a2a",
                      color: theme === "light" ? "#0F172A" : "#e4fbfe",
                      borderColor: theme === "light" ? "#e2e8f0" : "#404040"
                    }]}
                    value={editValue}
                    onChangeText={setEditValue}
                    multiline={editingField === 'description'}
                    numberOfLines={editingField === 'description' ? 4 : 1}
                    placeholder={`Enter ${editingField ? getFieldDisplayName(editingField).toLowerCase() : 'value'}...`}
                    placeholderTextColor={theme === "light" ? "#94A3B8" : "#64748B"}
                  />
                )}
                
                <View style={styles.editModalButtons}>
                  <TouchableOpacity 
                    style={[styles.editModalButton, styles.cancelButton]} 
                    onPress={() => setShowEditModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.editModalButton, styles.saveButton]} 
                    onPress={handleSaveEdit}
                  >
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Privacy Settings Modal */}
        <Modal 
          visible={showPrivacyModal} 
          animationType="slide" 
          transparent={true}
          onRequestClose={() => setShowPrivacyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.editModalContent, { backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a" }]}>
              <View style={[styles.editModalHeader, { 
                borderBottomColor: theme === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)" 
              }]}>
                <View style={styles.inviteModalHeaderContent}>
                  <Text style={[styles.editModalTitle, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                    Privacy Settings
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.closeButton, { 
                    backgroundColor: theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)" 
                  }]}
                  onPress={() => setShowPrivacyModal(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color={theme === "light" ? "#0F172A" : "#e4fbfe"} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.editModalBody}>
                <Text style={[styles.privacyDescription, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  Choose who can join this event
                </Text>
                
                <ScrollView 
                  style={styles.selectionOptionsContainer}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.selectionOptionsScrollContent}
                >
                {privacyOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.privacyOption,
                      {
                        backgroundColor: option.id === event?.pingType 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                        borderColor: option.id === event?.pingType 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                      }
                    ]}
                    onPress={() => handlePrivacyChange(option.id)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.privacyOptionContent}>
                      <View style={styles.privacyOptionHeader}>
                        <MaterialIcons 
                          name={option.icon as any} 
                          size={20} 
                          color={option.id === event?.pingType ? "#FFFFFF" : "#37a4c8"} 
                        />
                        <Text style={[
                          styles.privacyOptionTitle,
                          {
                            color: option.id === event?.pingType 
                              ? "#FFFFFF"
                              : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          }
                        ]}>
                          {option.label}
                        </Text>
                      </View>
                      <Text style={[
                        styles.privacyOptionDescription,
                        {
                          color: option.id === event?.pingType 
                            ? "rgba(255, 255, 255, 0.8)"
                            : (theme === "light" ? "#64748B" : "#94A3B8")
                        }
                      ]}>
                        {option.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>

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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
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
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
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
  eventDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  eventDetailItem: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  eventDetailText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  intentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  intentText: {
    fontSize: 13,
    fontWeight: '500',
  },
  participantsContainer: {
    flex: 1,
  },
  participantsScrollContent: {
    paddingHorizontal: 20,
  },
  participantCard: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 120,
    paddingVertical: 8,
  },
  participantAvatarContainer: {
    position: 'relative',
    marginBottom: 8,
    paddingTop: 4,
  },
  creatorBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#37a4c8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  participantLocation: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  moreParticipantsCard: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 120,
    paddingVertical: 8,
  },
  moreParticipantsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  moreParticipantsText: {
    color: '#37a4c8',
    fontSize: 14,
    fontWeight: '600',
  },
  moreParticipantsLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyParticipantsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  emptyParticipantsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyParticipantsText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyParticipantsSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Edit functionality styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    borderRadius: 20,
    padding: 0,
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  editModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
    flex: 1,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 50,
  },
  editModalBody: {
    maxHeight: 450,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  inviteModalHeaderContent: {
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  editValueText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.2)',
  },
  saveButton: {
    backgroundColor: '#37a4c8',
  },
  cancelButtonText: {
    color: '#37a4c8',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  selectionOptionsContainer: {
    maxHeight: 300,
  },
  selectionOptionsScrollContent: {
    paddingBottom: 24,
  },
  selectionOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  selectionOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Privacy modal styles
  privacyDescription: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 20,
    textAlign: 'center',
  },
  privacyOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  privacyOptionContent: {
    gap: 8,
  },
  privacyOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  privacyOptionDescription: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  directionsButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.1)',
  },
  directionsButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  directionsButtonText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});