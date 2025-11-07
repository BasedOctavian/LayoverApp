import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  FlatList,
  Alert,
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";
import { router } from "expo-router";
import { ThemeContext } from "../../context/ThemeContext";
import * as ExpoNotifications from "expo-notifications";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  writeBatch,
  getDocs,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { auth } from "../../../config/firebaseConfig";
import * as Haptics from "expo-haptics";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";
import useNotificationCount from "../../hooks/useNotificationCount";

interface Notification {
  id: string;
  title: string;
  body: string;
  data: {
    type:
      | "chat"
      | "eventChat"
      | "match"
      | "connection"
      | "ping_invitation"
      | "ping_event"
      | "ping_acceptance"
      | "ping_join"
      | "ping_decline"
      | "ping_cancelled"
      | "join_request"
      | "member_joined"
      | "join_request_approved"
      | "join_request_rejected"
      | "group_invite"
      | "promoted_to_organizer"
      | "new_post"
      | "new_proposal"
      | "proposal_confirmed"
      | "proposal_comment"
      | "postLike"
      | "post_comment"
      | "member_removed"
      | "admin_transferred";
    chatId?: string;
    eventId?: string;
    matchedUserId?: string;
    matchedUserName?: string;
    pingId?: string;
    pingTitle?: string;
    inviterId?: string;
    inviterName?: string;
    pingLocation?: string;
    pingCategory?: string;
    creatorName?: string;
    pingDescription?: string;
    distanceMiles?: number;
    groupId?: string;
    actorId?: string;
    invitedBy?: string;
    postId?: string;
    proposalId?: string;
    acceptedUserId?: string;
    acceptedUserName?: string;
    joinedUserId?: string;
    joinedUserName?: string;
    declinedUserId?: string;
    declinedUserName?: string;
    commentId?: string;
    authorId?: string;
    authorName?: string;
    likerId?: string;
    likerName?: string;
  };
  timestamp: any;
  read: boolean;
}

// Validation function to check if a notification is properly formatted
const isValidNotification = (
  notification: any,
): notification is Notification => {
  try {
    // Check if notification exists and has required fields
    if (!notification || typeof notification !== "object") return false;

    // Check required string fields
    if (!notification.id || typeof notification.id !== "string") return false;
    if (!notification.title || typeof notification.title !== "string")
      return false;
    if (!notification.body || typeof notification.body !== "string")
      return false;

    // Check data object
    if (!notification.data || typeof notification.data !== "object")
      return false;
    if (!notification.data.type || typeof notification.data.type !== "string")
      return false;

    // Validate notification type
    const validTypes = [
      "chat",
      "eventChat",
      "match",
      "connection",
      "ping_invitation",
      "ping_event",
      "ping_acceptance",
      "ping_join",
      "ping_decline",
      "ping_cancelled",
      "join_request",
      "member_joined",
      "join_request_approved",
      "join_request_rejected",
      "group_invite",
      "promoted_to_organizer",
      "new_post",
      "new_proposal",
      "proposal_confirmed",
      "proposal_comment",
      "postLike",
      "post_comment",
      "member_removed",
      "admin_transferred",
    ];
    if (!validTypes.includes(notification.data.type)) return false;

    // Check timestamp (can be Firestore timestamp or Date)
    if (!notification.timestamp) return false;

    // Check read status
    if (typeof notification.read !== "boolean") return false;

    return true;
  } catch (error) {
    console.warn("Error validating notification:", error);
    return false;
  }
};

// Safe data access function with fallbacks
const getSafeNotificationData = (notification: any): Notification | null => {
  try {
    if (!isValidNotification(notification)) {
      return {
        id: "invalid_" + Date.now(),
        title: "Invalid Notification",
        body: "This notification could not be displayed properly",
        data: { type: "chat" },
        timestamp: new Date(),
        read: false,
      };
    }

    return notification;
  } catch (error) {
    console.warn("Error accessing notification data:", error);
    return {
      id: "error_" + Date.now(),
      title: "Error Loading Notification",
      body: "There was a problem loading this notification",
      data: { type: "chat" },
      timestamp: new Date(),
      read: false,
    };
  }
};

// Safe timestamp formatting with fallback
const formatTimestamp = (timestamp: any): string => {
  try {
    if (!timestamp) return "Unknown time";

    // Handle Firestore timestamp
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }

    // Handle regular Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }

    // Handle timestamp number
    if (typeof timestamp === "number") {
      return new Date(timestamp).toLocaleString();
    }

    // Handle string timestamp
    if (typeof timestamp === "string") {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }

    return "Unknown time";
  } catch (error) {
    console.warn("Error formatting timestamp:", error);
    return "Unknown time";
  }
};

// Configure notification handler
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Skeleton loading component
const NotificationSkeleton = ({
  theme,
  index,
}: {
  theme: string;
  index: number;
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    // Shimmer animation
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmerAnimation.start();

    // Fade and slide in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();

    return () => shimmerAnimation.stop();
  }, [shimmerAnim, fadeAnim, slideAnim, index]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: slideAnim,
          },
        ],
      }}
    >
      <View
        style={[
          styles.notificationCard,
          {
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
          },
        ]}
      >
        <View style={styles.notificationContent}>
          <Animated.View
            style={[
              styles.skeletonTitle,
              {
                backgroundColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
                opacity: shimmerOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonBody,
              {
                backgroundColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
                opacity: shimmerOpacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.skeletonTime,
              {
                backgroundColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
                opacity: shimmerOpacity,
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

// Animated notification item component
const AnimatedNotificationItem = ({
  item,
  index,
  theme,
  onPress,
  onClear,
  onAccept,
  onDecline,
}: {
  item: Notification;
  index: number;
  theme: string;
  onPress: () => void;
  onClear: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 80, // Stagger animation with shorter delay for smoother effect
      useNativeDriver: true,
    }).start();
  }, [index, itemAnim]);

  const isInvitation = item.data.type === "ping_invitation";
  const isEvent = item.data.type === "ping_event";

  const getNotificationIcon = () => {
    switch (item.data.type) {
      case "chat":
        return "chatbubble-ellipses";
      case "eventChat":
        return "calendar";
      case "match":
        return "heart";
      case "connection":
        return "person-add";
      case "ping_invitation":
        return "people";
      case "ping_event":
        return "calendar";
      case "ping_acceptance":
        return "checkmark-circle";
      case "ping_join":
        return "person-add";
      case "ping_decline":
        return "close-circle";
      case "ping_cancelled":
        return "alert-circle";
      case "join_request":
        return "person-add";
      case "member_joined":
        return "people";
      case "join_request_approved":
        return "checkmark-circle";
      case "join_request_rejected":
        return "close-circle";
      case "group_invite":
        return "mail";
      case "promoted_to_organizer":
        return "star";
      case "new_post":
        return "document-text";
      case "new_proposal":
        return "calendar";
      case "proposal_confirmed":
        return "checkmark-done-circle";
      case "proposal_comment":
        return "chatbubble";
      case "postLike":
        return "heart";
      case "post_comment":
        return "chatbubble-ellipses";
      case "member_removed":
        return "person-remove";
      case "admin_transferred":
        return "shield";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = () => {
    switch (item.data.type) {
      case "chat":
        return "#37a4c8";
      case "eventChat":
        return "#4CAF50";
      case "match":
        return "#FF6B6B";
      case "connection":
        return "#9C27B0";
      case "ping_invitation":
        return "#FFA726";
      case "ping_event":
        return "#4CAF50";
      case "ping_acceptance":
        return "#4CAF50";
      case "ping_join":
        return "#4CAF50";
      case "ping_decline":
        return "#FF6B6B";
      case "ping_cancelled":
        return "#FF9500";
      case "join_request":
        return "#9C27B0";
      case "member_joined":
        return "#4CAF50";
      case "join_request_approved":
        return "#4CAF50";
      case "join_request_rejected":
        return "#FF6B6B";
      case "group_invite":
        return "#2196F3";
      case "promoted_to_organizer":
        return "#FFD700";
      case "new_post":
        return "#37a4c8";
      case "new_proposal":
        return "#9C27B0";
      case "proposal_confirmed":
        return "#4CAF50";
      case "proposal_comment":
        return "#37a4c8";
      case "postLike":
        return "#FF6B6B";
      case "post_comment":
        return "#37a4c8";
      case "member_removed":
        return "#ef4444";
      case "admin_transferred":
        return "#37a4c8";
      default:
        return "#37a4c8";
    }
  };

  return (
    <Animated.View
      style={{
        opacity: itemAnim,
        transform: [
          {
            translateY: itemAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0], // Slide down from top
            }),
          },
        ],
      }}
    >
      <View
        style={[
          styles.notificationCard,
          {
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: theme === "light" ? "#e0e0e0" : "#2a2a2a",
          },
        ]}
      >
        <TouchableOpacity
          style={styles.notificationTouchable}
          onPress={onPress}
          activeOpacity={isInvitation || isEvent ? 1 : 0.7}
          disabled={isInvitation || isEvent}
        >
          <View style={styles.notificationIconContainer}>
            <View
              style={[
                styles.notificationIcon,
                { backgroundColor: `${getNotificationColor()}20` },
              ]}
            >
              <Ionicons
                name={getNotificationIcon()}
                size={20}
                color={getNotificationColor()}
              />
            </View>
          </View>

          <View style={styles.notificationContent}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: theme === "light" ? "#0F172A" : "#e4fbfe",
                  fontWeight: item.read ? "500" : "600",
                },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.notificationBody,
                { color: theme === "light" ? "#666666" : "#a0a0a0" },
              ]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
            <Text
              style={[
                styles.notificationTime,
                { color: theme === "light" ? "#999999" : "#666666" },
              ]}
            >
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>

          {!isInvitation && !isEvent && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={onClear}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={24} color="#37a4c8" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {isInvitation && (
          <View style={styles.invitationActionsContainer}>
            <TouchableOpacity
              style={[styles.invitationButton, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <MaterialIcons name="check" size={20} color="#ffffff" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.invitationButton,
                styles.declineButton,
                {
                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                  backgroundColor: theme === "light" ? "#f8f9fa" : "#23272b",
                },
              ]}
              onPress={onDecline}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={theme === "light" ? "#37a4c8" : "#38a5c9"}
              />
              <Text
                style={[
                  styles.declineButtonText,
                  {
                    color: theme === "light" ? "#37a4c8" : "#38a5c9",
                  },
                ]}
              >
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {isEvent && (
          <View style={styles.invitationActionsContainer}>
            <TouchableOpacity
              style={[styles.invitationButton, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <MaterialIcons name="check" size={20} color="#ffffff" />
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.invitationButton,
                styles.declineButton,
                {
                  borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                  backgroundColor: theme === "light" ? "#f8f9fa" : "#23272b",
                },
              ]}
              onPress={onDecline}
              activeOpacity={0.85}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={theme === "light" ? "#37a4c8" : "#38a5c9"}
              />
              <Text
                style={[
                  styles.declineButtonText,
                  {
                    color: theme === "light" ? "#37a4c8" : "#38a5c9",
                  },
                ]}
              >
                Decline
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const currentTheme = theme || "dark";
  const notificationListener = useRef<ExpoNotifications.Subscription | null>(
    null,
  );
  const responseListener = useRef<ExpoNotifications.Subscription | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;

  // Add the same hooks as settings
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const { getUser } = useUsers();
  const [userData, setUserData] = useState<any>(null);

  // Get notification count
  const notificationCount = useNotificationCount(userId);

  // Handle back button press
  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // Set userId when user is available
  useEffect(() => {
    if (user) {
      setUserId(user.uid);
    }
  }, [user]);

  // Fetch user data when user is available
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (user) {
          const data = await getUser(user.uid);
          setUserData(data);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUserData();
  }, [user, getUser]);

  const setupNotificationListeners = useCallback(() => {
    // Listen for incoming notifications while the app is foregrounded
    notificationListener.current =
      ExpoNotifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
        // Only save notifications that are meant for this user and they are the receiver
        if (
          notification.request.content.data?.receiverId ===
            auth.currentUser?.uid &&
          notification.request.content.data?.senderId !== auth.currentUser?.uid
        ) {
          saveNotificationToFirestore(notification);
        }
      });

    // Listen for user interactions with notifications
    responseListener.current =
      ExpoNotifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification response:", response);
        // Only handle notifications that are meant for this user and they are the receiver
        if (
          response.notification.request.content.data?.receiverId ===
            auth.currentUser?.uid &&
          response.notification.request.content.data?.senderId !==
            auth.currentUser?.uid
        ) {
          handleNotificationResponse(response);
        }
      });
  }, []);

  const setupNotificationsListener = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return () => {}; // Return empty unsubscribe function
    }

    const userRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        try {
          const userData = doc.data();
          const notificationList = userData.notifications || [];

          // Filter out invalid notifications and validate each one
          const validNotifications = notificationList
            .filter((notification: unknown) =>
              isValidNotification(notification),
            )
            .map((notification: unknown) =>
              getSafeNotificationData(notification),
            )
            .filter(
              (
                notification: Notification | null,
              ): notification is Notification => notification !== null,
            );

          // Sort notifications by timestamp in descending order (newest first)
          const sortedNotifications = [...validNotifications].sort(
            (a: Notification, b: Notification) => {
              try {
                // Handle Firestore timestamp
                const timeA = a.timestamp?.seconds 
                  ? a.timestamp.seconds * 1000 
                  : a.timestamp instanceof Date 
                    ? a.timestamp.getTime() 
                    : typeof a.timestamp === 'number' 
                      ? a.timestamp 
                      : new Date(a.timestamp).getTime();
                
                const timeB = b.timestamp?.seconds 
                  ? b.timestamp.seconds * 1000 
                  : b.timestamp instanceof Date 
                    ? b.timestamp.getTime() 
                    : typeof b.timestamp === 'number' 
                      ? b.timestamp 
                      : new Date(b.timestamp).getTime();
                
                return timeB - timeA;
              } catch (error) {
                console.warn(
                  "Error sorting notifications by timestamp:",
                  error,
                );
                return 0;
              }
            },
          );

          // Smooth transition when data loads
          setNotifications(sortedNotifications);
          setLoading(false);
          // Fade in animation will be handled by AnimatedNotificationItem components
        } catch (error) {
          console.error("Error processing notifications:", error);
          setNotifications([]);
          setLoading(false);
        }
      } else {
        setNotifications([]);
        setLoading(false);
      }
    }, (error) => {
      console.error("Error in notifications listener:", error);
      setNotifications([]);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  const saveNotificationToFirestore = async (
    notification: ExpoNotifications.Notification,
  ) => {
    if (!auth.currentUser) return;

    try {
      const data = notification.request.content.data;

      // Validate required fields before saving
      if (!data || !data.receiverId || !data.senderId) {
        console.warn("Invalid notification data, skipping save:", data);
        return;
      }

      const senderName = data.senderName || "Unknown User";
      const notificationData = {
        title: senderName ? `Message from ${senderName}` : "New Message",
        body: notification.request.content.body || "New notification",
        data: data,
        timestamp: serverTimestamp(),
        userId: data.receiverId,
        senderId: data.senderId,
        senderName: senderName,
        read: false,
      };

      // Only save if this notification is for the current user
      if (notificationData.userId === auth.currentUser.uid) {
        const notificationsRef = collection(db, "notifications");
        await setDoc(doc(notificationsRef), notificationData);
      }
    } catch (error) {
      console.error("Error saving notification:", error);
    }
  };

  const handleNotificationResponse = (
    response: ExpoNotifications.NotificationResponse,
  ) => {
    try {
      const data = response.notification.request.content.data;

      if (!data || !data.type) {
        console.warn("Invalid notification data received");
        return;
      }

      if (data.type === "chat" && data.chatId) {
        router.push(`/chat/${data.chatId}`);
      } else if (data.type === "eventChat" && data.eventId) {
        router.push(`/event/eventChat/${data.eventId}`);
      } else if (data.type === "match" || data.type === "connection") {
        // For match and connection notifications, navigate to chat inbox with pending filter
        router.push("/chat/chatInbox?filter=pending");
      } else if (
        (data.type === "ping_invitation" || 
         data.type === "ping_event" ||
         data.type === "ping_acceptance" ||
         data.type === "ping_join" ||
         data.type === "ping_decline" ||
         data.type === "ping_cancelled") &&
        data.pingId
      ) {
        router.push(`/ping/${data.pingId}`);
      } else if (
        data.type === "proposal_comment" &&
        data.groupId &&
        data.proposalId
      ) {
        router.push(
          `/group/proposal/${data.proposalId}?groupId=${data.groupId}`,
        );
      } else if (
        (data.type === "join_request" ||
          data.type === "member_joined" ||
          data.type === "join_request_approved" ||
          data.type === "join_request_rejected" ||
          data.type === "group_invite" ||
          data.type === "promoted_to_organizer" ||
          data.type === "new_post" ||
          data.type === "new_proposal" ||
          data.type === "proposal_confirmed" ||
          data.type === "postLike" ||
          data.type === "post_comment" ||
          data.type === "member_removed" ||
          data.type === "admin_transferred") &&
        data.groupId
      ) {
        // For post-related notifications, navigate to the post if postId is available
        if ((data.type === "postLike" || data.type === "post_comment") && data.postId) {
          router.push(`/group/${data.groupId}?postId=${data.postId}`);
        } else {
          router.push(`/group/${data.groupId}`);
        }
      } else {
        console.warn(
          "Unknown notification type or missing required data:",
          data,
        );
      }
    } catch (error) {
      console.error("Error handling notification response:", error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    if (!auth.currentUser) return;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const userRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedNotifications = (userData.notifications || []).filter(
          (n: unknown) => {
            try {
              return isValidNotification(n) && n.id !== notificationId;
            } catch (error) {
              console.warn("Error filtering notification:", error);
              return false;
            }
          },
        );
        await updateDoc(userRef, { notifications: updatedNotifications });
      }
    } catch (error) {
      console.error("Error clearing notification:", error);
    }
  };

  const clearAllNotifications = async () => {
    if (!auth.currentUser) return;

    Alert.alert(
      "Clear All Notifications",
      "Are you sure you want to clear all notifications?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }

              const userRef = doc(db, "users", auth.currentUser!.uid);
              await updateDoc(userRef, { notifications: [] });
            } catch (error) {
              console.error("Error clearing all notifications:", error);
              Alert.alert(
                "Error",
                "Failed to clear notifications. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleNotificationPress = (item: Notification) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (!item.data || !item.data.type) {
        console.warn("Invalid notification data for press:", item);
        return;
      }

      if (item.data.type === "chat" && item.data.chatId) {
        router.push(`/chat/${item.data.chatId}`);
      } else if (item.data.type === "eventChat" && item.data.eventId) {
        router.push(`/event/eventChat/${item.data.eventId}`);
      } else if (item.data.type === "match" || item.data.type === "connection") {
        router.push("/chat/chatInbox?filter=pending");
      } else if (
        (item.data.type === "ping_invitation" ||
          item.data.type === "ping_event" ||
          item.data.type === "ping_acceptance" ||
          item.data.type === "ping_join" ||
          item.data.type === "ping_decline" ||
          item.data.type === "ping_cancelled") &&
        item.data.pingId
      ) {
        router.push(`/ping/${item.data.pingId}`);
      } else if (
        item.data.type === "proposal_comment" &&
        item.data.groupId &&
        item.data.proposalId
      ) {
        router.push(
          `/group/proposal/${item.data.proposalId}?groupId=${item.data.groupId}`,
        );
      } else if (
        (item.data.type === "join_request" ||
          item.data.type === "member_joined" ||
          item.data.type === "join_request_approved" ||
          item.data.type === "join_request_rejected" ||
          item.data.type === "group_invite" ||
          item.data.type === "promoted_to_organizer" ||
          item.data.type === "new_post" ||
          item.data.type === "new_proposal" ||
          item.data.type === "proposal_confirmed" ||
          item.data.type === "postLike" ||
          item.data.type === "post_comment" ||
          item.data.type === "member_removed" ||
          item.data.type === "admin_transferred") &&
        item.data.groupId
      ) {
        // For post-related notifications, navigate to the post if postId is available
        if ((item.data.type === "postLike" || item.data.type === "post_comment") && item.data.postId) {
          router.push(`/group/${item.data.groupId}?postId=${item.data.postId}`);
        } else {
          router.push(`/group/${item.data.groupId}`);
        }
      } else {
        console.warn(
          "Unknown notification type or missing required data for press:",
          item.data,
        );
      }
    } catch (error) {
      console.error("Error handling notification press:", error);
    }
  };

  const handleAcceptInvitation = async (item: Notification) => {
    if (!auth.currentUser) return;

    try {
      // Validate notification data before proceeding
      if (!item.data || !item.data.pingId || !item.data.pingTitle) {
        console.warn("Invalid invitation data:", item);
        Alert.alert("Error", "Invalid invitation data. Please try again.");
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      // Remove the notification first
      await clearNotification(item.id);

      // Get the ping document
      const pingRef = doc(db, "pings", item.data.pingId);
      const pingDoc = await getDoc(pingRef);
      if (!pingDoc.exists()) {
        Alert.alert("Error", "Activity not found");
        return;
      }

      const pingData = pingDoc.data();
      const currentParticipants = pingData.participants || [];

      // Check if user is already a participant
      if (currentParticipants.includes(auth.currentUser.uid)) {
        Alert.alert(
          "Already Joined",
          "You are already a participant in this activity",
        );
        router.push(`/ping/${item.data.pingId}`);
        return;
      }

      // Check if ping is full before accepting invitation
      const maxParticipants = pingData.maxParticipants || '';
      if (maxParticipants && !maxParticipants.toLowerCase().includes('unlimited')) {
        const maxNum = parseInt(maxParticipants.replace(/\D/g, ''));
        if (!isNaN(maxNum) && currentParticipants.length >= maxNum) {
          Alert.alert(
            "Activity Full",
            "This activity has reached its maximum number of participants. The invitation is no longer valid.",
          );
          router.push(`/ping/${item.data.pingId}`);
          return;
        }
      }

      // Add user to participants
      await updateDoc(pingRef, {
        participants: arrayUnion(auth.currentUser.uid),
        participantCount: currentParticipants.length + 1,
      });

      // For ping_invitation notifications, send notification to inviter
      if (item.data.type === "ping_invitation" && item.data.inviterId) {
        try {
          const inviterRef = doc(db, "users", item.data.inviterId);
          const inviterDoc = await getDoc(inviterRef);
          if (inviterDoc.exists()) {
            const inviterData = inviterDoc.data();
            const currentUserDoc = await getDoc(
              doc(db, "users", auth.currentUser.uid),
            );
            const currentUserData = currentUserDoc.data();
            const acceptanceNotification = {
              id: Date.now().toString(),
              title: "Invitation Accepted! 🎉",
              body: `${currentUserData?.name || "Someone"} accepted your invitation to "${item.data.pingTitle}"`,
              data: {
                type: "ping_acceptance",
                pingId: item.data.pingId,
                pingTitle: item.data.pingTitle,
                acceptedUserId: auth.currentUser.uid,
                acceptedUserName: currentUserData?.name || "Someone",
              },
              timestamp: new Date(),
              read: false,
            };
            await updateDoc(inviterRef, {
              notifications: arrayUnion(acceptanceNotification),
            });

            // Send push notification to inviter
            if (
              inviterData?.expoPushToken &&
              inviterData?.notificationPreferences?.notificationsEnabled &&
              (inviterData?.notificationPreferences?.activities ||
                inviterData?.notificationPreferences?.events)
            ) {
              const pushPayload = {
                to: inviterData.expoPushToken,
                title: "Invitation Accepted! 🎉",
                body: `${currentUserData?.name || "Someone"} accepted your invitation to "${item.data.pingTitle}"`,
                sound: "default",
                priority: "high",
                data: {
                  type: "ping_acceptance",
                  pingId: item.data.pingId,
                  pingTitle: item.data.pingTitle,
                  acceptedUserId: auth.currentUser.uid,
                  acceptedUserName: currentUserData?.name || "Someone",
                },
              };
              await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              });
            }
          }
        } catch (error) {
          console.warn("Error sending acceptance notification:", error);
          // Don't fail the whole operation for notification errors
        }
      }

      // For ping_event notifications, send notification to creator
      if (item.data.type === "ping_event" && pingData.creatorId) {
        try {
          const creatorRef = doc(db, "users", pingData.creatorId);
          const creatorDoc = await getDoc(creatorRef);
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            const currentUserDoc = await getDoc(
              doc(db, "users", auth.currentUser.uid),
            );
            const currentUserData = currentUserDoc.data();
            const joinNotification = {
              id: Date.now().toString(),
              title: "Someone Joined Your Activity! 🎉",
              body: `${currentUserData?.name || "Someone"} joined your activity "${item.data.pingTitle}"`,
              data: {
                type: "ping_join",
                pingId: item.data.pingId,
                pingTitle: item.data.pingTitle,
                joinedUserId: auth.currentUser.uid,
                joinedUserName: currentUserData?.name || "Someone",
              },
              timestamp: new Date(),
              read: false,
            };
            await updateDoc(creatorRef, {
              notifications: arrayUnion(joinNotification),
            });

            // Send push notification to creator
            if (
              creatorData?.expoPushToken &&
              creatorData?.notificationPreferences?.notificationsEnabled &&
              (creatorData?.notificationPreferences?.activities ||
                creatorData?.notificationPreferences?.events)
            ) {
              const pushPayload = {
                to: creatorData.expoPushToken,
                title: "Someone Joined Your Activity! 🎉",
                body: `${currentUserData?.name || "Someone"} joined your activity "${item.data.pingTitle}"`,
                sound: "default",
                priority: "high",
                data: {
                  type: "ping_join",
                  pingId: item.data.pingId,
                  pingTitle: item.data.pingTitle,
                  joinedUserId: auth.currentUser.uid,
                  joinedUserName: currentUserData?.name || "Someone",
                },
              };
              await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              });
            }
          }
        } catch (error) {
          console.warn("Error sending join notification:", error);
          // Don't fail the whole operation for notification errors
        }
      }

      // Show success message and navigate to the activity screen
      const successMessage =
        item.data.type === "ping_event"
          ? `You've joined "${item.data.pingTitle}"!`
          : `You've accepted the invitation to "${item.data.pingTitle}"!`;

      Alert.alert("Success", successMessage);
      router.push(`/ping/${item.data.pingId}`);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      Alert.alert("Error", "Failed to accept invitation. Please try again.");
    }
  };

  const handleDeclineInvitation = async (item: Notification) => {
    if (!auth.currentUser) return;

    try {
      // Validate notification data before proceeding
      if (!item.data || !item.data.pingId || !item.data.pingTitle) {
        console.warn("Invalid invitation data for decline:", item);
        Alert.alert("Error", "Invalid invitation data. Please try again.");
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Remove the notification first
      await clearNotification(item.id);

      // For ping_invitation notifications, send notification to inviter
      if (item.data.type === "ping_invitation" && item.data.inviterId) {
        try {
          const inviterRef = doc(db, "users", item.data.inviterId);
          const inviterDoc = await getDoc(inviterRef);
          if (inviterDoc.exists()) {
            const inviterData = inviterDoc.data();
            const currentUserDoc = await getDoc(
              doc(db, "users", auth.currentUser.uid),
            );
            const currentUserData = currentUserDoc.data();
            const declineNotification = {
              id: Date.now().toString(),
              title: "Invitation Declined",
              body: `${currentUserData?.name || "Someone"} declined your invitation to "${item.data.pingTitle}"`,
              data: {
                type: "ping_decline",
                pingId: item.data.pingId,
                pingTitle: item.data.pingTitle,
                declinedUserId: auth.currentUser.uid,
                declinedUserName: currentUserData?.name || "Someone",
              },
              timestamp: new Date(),
              read: false,
            };
            await updateDoc(inviterRef, {
              notifications: arrayUnion(declineNotification),
            });

            // Send push notification to inviter
            if (
              inviterData?.expoPushToken &&
              inviterData?.notificationPreferences?.notificationsEnabled &&
              (inviterData?.notificationPreferences?.activities ||
                inviterData?.notificationPreferences?.events)
            ) {
              const pushPayload = {
                to: inviterData.expoPushToken,
                title: "Invitation Declined",
                body: `${currentUserData?.name || "Someone"} declined your invitation to "${item.data.pingTitle}"`,
                sound: "default",
                priority: "high",
                data: {
                  type: "ping_decline",
                  pingId: item.data.pingId,
                  pingTitle: item.data.pingTitle,
                  declinedUserId: auth.currentUser.uid,
                  declinedUserName: currentUserData?.name || "Someone",
                },
              };
              await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                  "Accept-encoding": "gzip, deflate",
                },
                body: JSON.stringify(pushPayload),
              });
            }
          }
        } catch (error) {
          console.warn("Error sending decline notification:", error);
          // Don't fail the whole operation for notification errors
        }
      }

      // For ping_event notifications, no need to notify the creator since it's just declining to join
      // Show appropriate message based on notification type
      const declineMessage =
        item.data.type === "ping_event"
          ? `You've declined to join "${item.data.pingTitle}"`
          : `You've declined the invitation to "${item.data.pingTitle}"`;

      Alert.alert("Declined", declineMessage);
    } catch (error) {
      console.error("Error declining invitation:", error);
      Alert.alert("Error", "Failed to decline invitation. Please try again.");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh logic here if needed
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderNotification = ({
    item,
    index,
  }: {
    item: Notification;
    index: number;
  }) => (
    <AnimatedNotificationItem
      item={item}
      index={index}
      theme={currentTheme}
      onPress={() => handleNotificationPress(item)}
      onClear={() => clearNotification(item.id)}
      onAccept={
        item.data.type === "ping_invitation" || item.data.type === "ping_event"
          ? () => handleAcceptInvitation(item)
          : undefined
      }
      onDecline={
        item.data.type === "ping_invitation" || item.data.type === "ping_event"
          ? () => handleDeclineInvitation(item)
          : undefined
      }
    />
  );

  useEffect(() => {
    setupNotificationListeners();
    const unsubscribe = setupNotificationsListener();

    // Start smooth entrance animations for header
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Start smooth entrance animations for content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [
    fadeAnim,
    slideAnim,
    headerFadeAnim,
    headerSlideAnim,
    setupNotificationsListener,
    setupNotificationListeners,
    userId,
  ]);

  const renderSkeletonList = () => {
    const skeletonItems = Array.from({ length: 5 }, (_, index) => (
      <NotificationSkeleton key={index} index={index} theme={currentTheme} />
    ));

    return <View style={styles.notificationList}>{skeletonItems}</View>;
  };

  try {
    return (
      <LinearGradient
        colors={
          theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]
        }
        style={{ flex: 1 }}
      >
        <TopBar
          showBackButton={true}
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push("profile/" + userId)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <StatusBar
            translucent
            backgroundColor="transparent"
            barStyle={theme === "light" ? "dark-content" : "light-content"}
          />
          <Animated.View
            style={{
              flex: 1,
            }}
          >
            <ScrollView
              contentContainerStyle={styles.notificationsContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={currentTheme === "light" ? "#37a4c8" : "#37a4c8"}
                  colors={["#37a4c8"]}
                />
              }
            >
              {notifications.length > 0 && (
                <Animated.View
                  style={[
                    styles.clearAllContainer,
                    {
                      opacity: headerFadeAnim,
                      transform: [
                        {
                          translateY: headerSlideAnim,
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.clearAllButton}
                    onPress={clearAllNotifications}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.clearAllText,
                        {
                          color:
                            currentTheme === "light" ? "#37a4c8" : "#37a4c8",
                        },
                      ]}
                    >
                      Clear All
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}

              {loading ? (
                renderSkeletonList()
              ) : notifications.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <Animated.View
                    style={[
                      styles.emptyState,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: slideAnim,
                          },
                        ],
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.emptyStateIcon,
                        {
                          backgroundColor:
                            currentTheme === "light"
                              ? "rgba(55, 164, 200, 0.1)"
                              : "rgba(55, 164, 200, 0.2)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="notifications-off"
                        size={48}
                        color="#37a4c8"
                      />
                    </View>
                    <Text
                      style={[
                        styles.emptyStateTitle,
                        {
                          color:
                            currentTheme === "light" ? "#0F172A" : "#e4fbfe",
                        },
                      ]}
                    >
                      No notifications yet
                    </Text>
                    <Text
                      style={[
                        styles.emptyStateSubtitle,
                        {
                          color:
                            currentTheme === "light" ? "#666666" : "#a0a0a0",
                        },
                      ]}
                    >
                      We'll notify you when something important happens
                    </Text>
                  </Animated.View>
                </View>
              ) : (
                <View style={styles.notificationList}>
                  {notifications.map((item, index) => {
                    try {
                      // Validate item before rendering
                      if (!isValidNotification(item)) {
                        console.warn("Skipping invalid notification:", item);
                        return null;
                      }

                      return (
                        <AnimatedNotificationItem
                          key={item.id}
                          item={item}
                          index={index}
                          theme={currentTheme}
                          onPress={() => handleNotificationPress(item)}
                          onClear={() => clearNotification(item.id)}
                          onAccept={
                            item.data.type === "ping_invitation" ||
                            item.data.type === "ping_event"
                              ? () => handleAcceptInvitation(item)
                              : undefined
                          }
                          onDecline={
                            item.data.type === "ping_invitation" ||
                            item.data.type === "ping_event"
                              ? () => handleDeclineInvitation(item)
                              : undefined
                          }
                        />
                      );
                    } catch (error) {
                      console.error(
                        "Error rendering notification item:",
                        error,
                        item,
                      );
                      return null;
                    }
                  })}
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    );
  } catch (error) {
    console.error("Critical error in Notifications component:", error);
    // Fallback UI in case of critical errors
    return (
      <LinearGradient
        colors={
          theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]
        }
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <View style={styles.emptyStateContainer}>
            <Text
              style={[
                styles.emptyStateTitle,
                { color: currentTheme === "light" ? "#0F172A" : "#e4fbfe" },
              ]}
            >
              Something went wrong
            </Text>
            <Text
              style={[
                styles.emptyStateSubtitle,
                { color: currentTheme === "light" ? "#666666" : "#a0a0a0" },
              ]}
            >
              Please try refreshing the app
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  notificationsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  clearAllContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  clearAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(55, 164, 200, 0.1)",
    alignSelf: "flex-end",
  },
  clearAllText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },

  notificationList: {
    flex: 1,
  },

  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Inter-Regular",
  },
  notificationCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationTouchable: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notificationIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationContent: {
    flex: 1,
    paddingRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 6,
    fontFamily: "Inter-SemiBold",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: "Inter-Regular",
    lineHeight: 18,
    opacity: 0.7,
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    opacity: 0.5,
    letterSpacing: 0.1,
  },
  clearButton: {
    padding: 6,
    marginLeft: 4,
  },
  invitationActionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    width: "100%",
  },
  invitationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#37a4c8",
    borderColor: "transparent",
  },
  declineButton: {
    borderColor: "#37a4c8",
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    fontFamily: "Inter-SemiBold",
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
  // Skeleton loading styles
  skeletonTitle: {
    height: 16,
    borderRadius: 8,
    marginBottom: 6,
    width: "80%",
  },
  skeletonBody: {
    height: 14,
    borderRadius: 8,
    marginBottom: 8,
    width: "90%",
  },
  skeletonTime: {
    height: 12,
    borderRadius: 6,
    width: "60%",
  },
});
