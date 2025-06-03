import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Text,
  View,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
  Easing,
  Alert,
  ImageBackground,
  ScrollView,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import useChats from "../../hooks/useChats";
import useUsers from "../../hooks/useUsers";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import { formatDistanceToNow } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';
import { doc, deleteDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import BottomNavBar from "../../components/BottomNavBar";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.18;

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date | Timestamp;
  unreadCount?: number;
  isPinned?: boolean;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
  status?: 'pending' | 'active';
  connectionId?: string;
  connectionType?: string;
}

interface Partner {
  id: string;
  name: string;
  profilePicture?: string;
  age: string;
  airportCode: string;
  interests?: string[];
  moodStatus?: string;
  isOnline?: boolean;
  lastSeen?: Date | Timestamp;
}

interface ChatItemProps {
  chat: Chat;
  currentUser: User;
  getUser: (userId: string) => Promise<Partner>;
  onPress: () => void;
  onPinPress: () => void;
  onDelete: () => void;
  onAccept: (updatedChat: Chat) => void;
}

// Helper function to convert any date-like value to a Date object
const toDate = (value: Date | Timestamp | string | number | undefined): Date | null => {
  if (!value) return null;
  
  try {
    if (value instanceof Date) {
      return value;
    }
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.error('Error converting to date:', error);
    return null;
  }
};

// Helper function to get timestamp in milliseconds
const getTimestampMs = (value: Date | Timestamp | undefined): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (value instanceof Timestamp) return value.toDate().getTime();
  return 0;
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  searchInput: {
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  chatCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  pinnedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(55, 164, 200, 0.03)',
  },
  chatCardContent: {
    padding: 16,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 16,
    position: 'relative',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  chatMainInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: 'wrap',
  },
  userAge: {
    fontSize: 14,
    fontWeight: "500",
  },
  userLocation: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  chatInfo: {
    marginBottom: 12,
  },
  chatLastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  interestTag: {
    backgroundColor: "#37a4c8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  userMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  moodText: {
    fontSize: 14,
    fontWeight: "500",
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  lastSeen: {
    fontSize: 12,
    marginLeft: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#37a4c8',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  pinButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  pinButtonActive: {
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
  },
  pinIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#37a4c8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 20,
  },
  newChatButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  placeholderImage: {
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "600",
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  pendingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 8,
  },
  pendingText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  connectionTypeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#37a4c8',
    color: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  pendingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFA500',
    marginRight: 6,
  },
  pendingStatusText: {
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '500',
  },
  deleteAction: {
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  pendingActionsContainer: {
    marginTop: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    width: '100%',
  },
  pendingActionsHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  pendingActionButton: {
    flex: 1,
    maxWidth: 140,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  pendingActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  connectionTypeContainer: {
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});

const ChatItem = React.memo(({ chat, currentUser, getUser, onPress, onPinPress, onDelete, onAccept }: ChatItemProps) => {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSelectedType, setHasSelectedType] = useState(!!chat.connectionType);
  const [isInitiator, setIsInitiator] = useState(false);
  const { theme } = React.useContext(ThemeContext);
  const swipeableRef = useRef<Swipeable>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pinScaleAnim = useRef(new Animated.Value(1)).current;

  // Add press animation
  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePendingAction = async (action: string) => {
    try {
      if (chat.status !== 'pending') {
        return;
      }

      if (chat.connectionId) {
        // Update the connection document with the selected type
        await updateDoc(doc(db, 'connections', chat.connectionId), {
          connectionType: action
        });
        
        // Update the chat document with the connection type
        await updateDoc(doc(db, 'chats', chat.id), {
          connectionType: action
        });

        setHasSelectedType(true);
      }
    } catch (error) {
      console.error('Error saving connection type:', error);
    }
  };

  const handleDelete = async () => {
    try {
      // Delete the chat document
      await deleteDoc(doc(db, 'chats', chat.id));
      
      // If there's a connection, delete it too
      if (chat.connectionId) {
        await deleteDoc(doc(db, 'connections', chat.connectionId));
      }
      
      // Close the swipeable
      swipeableRef.current?.close();

      // Call the onDelete callback to update parent state
      onDelete();
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  useEffect(() => {
    const checkInitiator = async () => {
      if (chat.connectionId) {
        const connectionDoc = await getDoc(doc(db, 'connections', chat.connectionId));
        if (connectionDoc.exists()) {
          const data = connectionDoc.data();
          setIsInitiator(data.initiator === currentUser.uid);
        }
      }
    };
    checkInitiator();
  }, [chat.connectionId, currentUser.uid]);

  const handleAcceptConnection = async () => {
    try {
      if (chat.connectionId) {
        // Get connection data first
        const connectionDoc = await getDoc(doc(db, 'connections', chat.connectionId));
        if (!connectionDoc.exists()) {
          throw new Error('Connection not found');
        }

        const connectionData = connectionDoc.data();
        const initiatorId = connectionData.initiator;
        const connectionType = connectionData.connectionType || 'Local Experiences'; // Default to Local Experiences if not set

        // Update connection status
        await updateDoc(doc(db, 'connections', chat.connectionId), {
          status: 'active'
        });
        
        // Update chat status with the connection type
        await updateDoc(doc(db, 'chats', chat.id), {
          status: 'active' as const,
          connectionType: connectionType
        });

        // Get the current user's data for the notification
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data();
          
          // Create the notification
          const notification = {
            id: Date.now().toString(),
            title: "Connection Accepted! 🎉",
            body: `${currentUserData.name} accepted your connection request`,
            data: {
              type: 'match',
              matchedUserId: currentUser.uid,
              matchedUserName: currentUserData.name
            },
            timestamp: new Date(),
            read: false
          };

          // Add notification to initiator's user document
          const initiatorRef = doc(db, 'users', initiatorId);
          const initiatorDoc = await getDoc(initiatorRef);
          if (initiatorDoc.exists()) {
            const initiatorData = initiatorDoc.data();
            const notifications = initiatorData.notifications || [];
            await updateDoc(initiatorRef, {
              notifications: [...notifications, notification]
            });
          }
        }

        // Create updated chat object with proper typing
        const updatedChat: Chat = {
          ...chat,
          status: 'active' as const,
          connectionType: connectionType
        };

        // Call the onAccept callback with the updated chat
        onAccept(updatedChat);

        // Navigate to the chat
        router.push("/chat/" + chat.id);
      }
    } catch (error) {
      console.error('Error accepting connection:', error);
      Alert.alert('Error', 'Failed to accept connection. Please try again.');
    }
  };

  const handleDeclineConnection = async () => {
    try {
      if (chat.connectionId) {
        // Get connection data before deleting
        const connectionDoc = await getDoc(doc(db, 'connections', chat.connectionId));
        if (connectionDoc.exists()) {
          const connectionData = connectionDoc.data();
          const initiatorId = connectionData.initiator;
          
          // Get the current user's data for the notification
          const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (currentUserDoc.exists()) {
            const currentUserData = currentUserDoc.data();
            
            // Create the notification
            const notification = {
              id: Date.now().toString(),
              title: "Connection Declined",
              body: `${currentUserData.name} declined your connection request`,
              data: {
                type: 'match',
                matchedUserId: currentUser.uid,
                matchedUserName: currentUserData.name
              },
              timestamp: new Date(),
              read: false
            };

            // Add notification to initiator's user document
            const initiatorRef = doc(db, 'users', initiatorId);
            const initiatorDoc = await getDoc(initiatorRef);
            if (initiatorDoc.exists()) {
              const initiatorData = initiatorDoc.data();
              const notifications = initiatorData.notifications || [];
              await updateDoc(initiatorRef, {
                notifications: [...notifications, notification]
              });
            }
          }
        }

        // Delete the connection
        await deleteDoc(doc(db, 'connections', chat.connectionId));
        // Delete the chat
        await deleteDoc(doc(db, 'chats', chat.id));
        // Update local state
        onDelete();
      }
    } catch (error) {
      console.error('Error declining connection:', error);
    }
  };

  const handlePinPress = () => {
    // Animate the pin button
    Animated.sequence([
      Animated.timing(pinScaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pinScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Call the original onPinPress
    onPinPress();
  };

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={[styles.deleteAction, { backgroundColor: '#FF3B30' }]}
        onPress={handleDelete}
      >
        <MaterialIcons name="delete" size={24} color="#FFF" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    const loadPartner = async () => {
      if (chat?.participants && currentUser) {
        const partnerId = chat.participants.find(
          (id: string) => id !== currentUser.uid
        );
        if (partnerId) {
          try {
            const fetchedPartner = await getUser(partnerId);
            setPartner(fetchedPartner);
          } catch (error) {
            console.error("Error fetching partner:", error);
          } finally {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    loadPartner();
  }, [chat, currentUser, getUser]);

  if (isLoading) {
    return (
      <View style={[styles.chatCard, { justifyContent: "center" }]}>
        <ActivityIndicator color="#37a4c8" />
      </View>
    );
  }

  if (!partner) {
    return (
      <View style={[styles.chatCard, { justifyContent: "center" }]}>
        <Text style={styles.errorText}>Failed to load chat</Text>
      </View>
    );
  }

  const getMessageStatusIcon = () => {
    switch (chat.lastMessageStatus) {
      case 'read':
        return <Ionicons name="checkmark-done" size={16} color="#37a4c8" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={16} color="#64748B" />;
      case 'sent':
        return <Ionicons name="checkmark" size={16} color="#64748B" />;
      default:
        return null;
    }
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
    >
      <Animated.View
        style={[
          styles.chatCard,
          {
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: "#37a4c8",
            borderWidth: 1,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {chat.isPinned && (
          <View style={styles.pinnedBackground} />
        )}
        <TouchableOpacity
          style={[
            styles.chatCardContent,
            chat.status === 'pending' && { opacity: 0.9 }
          ]}
          onPress={() => {
            if (chat.status === 'pending') {
              const partnerId = chat.participants.find(id => id !== currentUser.uid);
              if (partnerId) {
                router.push(`/profile/${partnerId}`);
              }
            } else {
              onPress();
            }
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <View style={styles.chatHeader}>
            <View style={styles.imageContainer}>
              {partner.profilePicture ? (
                <Image
                  source={{ uri: partner.profilePicture }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>
                    {partner.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              {partner.isOnline && (
                <Animated.View 
                  style={[
                    styles.onlineIndicator,
                    {
                      backgroundColor: '#10B981',
                      transform: [{ scale: scaleAnim }]
                    }
                  ]} 
                />
              )}
            </View>
            <View style={styles.chatMainInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.chatName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                  {partner.name || "Unknown User"}
                </Text>
                {chat.status !== 'pending' && (
                  <TouchableOpacity 
                    onPress={handlePinPress} 
                    style={[
                      styles.pinButton,
                      chat.isPinned && styles.pinButtonActive
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Animated.View 
                      style={[
                        styles.pinIcon,
                        { transform: [{ scale: pinScaleAnim }] }
                      ]}
                    >
                      <Ionicons 
                        name={chat.isPinned ? "pin" : "pin-outline"} 
                        size={24} 
                        color={chat.isPinned ? "#37a4c8" : "#64748B"} 
                      />
                    </Animated.View>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userAge, { color: "#37a4c8" }]}>{partner.age} years old</Text>
                <Text style={[styles.userLocation, { color: "#37a4c8" }]}>• {partner.airportCode}</Text>
                {partner.lastSeen && (
                  <Text style={[styles.lastSeen, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                    • Last seen {(() => {
                      try {
                        const date = toDate(partner.lastSeen);
                        if (!date) {
                          console.error('Invalid date value:', partner.lastSeen);
                          return 'recently';
                        }
                        return formatDistanceToNow(date, { addSuffix: true });
                      } catch (error) {
                        console.error('Error formatting last seen:', error, 'Raw value:', partner.lastSeen);
                        return 'recently';
                      }
                    })()}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.chatInfo}>
            {chat.status === 'pending' ? (
              <>
                <View style={styles.pendingContainer}>
                  {isInitiator ? (
                    <>
                      <Text style={[styles.pendingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        Waiting for them to accept your connection request
                      </Text>
                      {hasSelectedType && (
                        <>
                          <Text style={styles.connectionTypeText}>
                            {chat.connectionType}
                          </Text>
                          <View style={styles.pendingStatusContainer}>
                            <View style={styles.pendingStatusDot} />
                            <Text style={styles.pendingStatusText}>Pending Acceptance</Text>
                          </View>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={[styles.pendingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        {partner?.name} wants to connect with you
                      </Text>
                      {chat.connectionType && (
                        <Text style={styles.connectionTypeText}>
                          {chat.connectionType}
                        </Text>
                      )}
                      <View style={styles.pendingActionsContainer}>
                        <View style={styles.pendingActionsRow}>
                          <TouchableOpacity 
                            style={[styles.pendingActionButton, { backgroundColor: '#4CAF50' }]}
                            onPress={handleAcceptConnection}
                          >
                            <View style={styles.pendingActionIcon}>
                              <MaterialIcons name="check" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.pendingActionText}>Accept</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.pendingActionButton, { backgroundColor: '#FF3B30' }]}
                            onPress={handleDeclineConnection}
                          >
                            <View style={styles.pendingActionIcon}>
                              <MaterialIcons name="close" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.pendingActionText}>Decline</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </View>
                {!hasSelectedType && isInitiator && chat.status === 'pending' && (
                  <View style={styles.pendingActionsContainer}>
                    <Text style={[styles.pendingActionsHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                      Type of Connection
                    </Text>
                    <View style={styles.pendingActionsRow}>
                      <TouchableOpacity 
                        style={[styles.pendingActionButton, { backgroundColor: '#4CAF50' }]}
                        onPress={() => handlePendingAction('Local Experiences')}
                      >
                        <View style={styles.pendingActionIcon}>
                          <MaterialIcons name="explore" size={24} color="#FFF" />
                        </View>
                        <Text style={styles.pendingActionText}>Local Experiences</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.pendingActionButton, { backgroundColor: '#FF9800' }]}
                        onPress={() => handlePendingAction('Networking')}
                      >
                        <View style={styles.pendingActionIcon}>
                          <MaterialIcons name="groups" size={24} color="#FFF" />
                        </View>
                        <Text style={styles.pendingActionText}>Networking</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.pendingActionButton, { backgroundColor: '#9C27B0' }]}
                        onPress={() => handlePendingAction('Adventure')}
                      >
                        <View style={styles.pendingActionIcon}>
                          <MaterialIcons name="directions-run" size={24} color="#FFF" />
                        </View>
                        <Text style={styles.pendingActionText}>Adventure</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : chat.lastMessage ? (
              <View style={styles.messageContainer}>
                <Text 
                  style={[
                    styles.chatLastMessage, 
                    { 
                      color: theme === "light" ? "#64748B" : "#94A3B8",
                      fontWeight: chat.unreadCount ? '600' : '400'
                    }
                  ]} 
                  numberOfLines={1}
                >
                  {chat.lastMessage}
                </Text>
                <View style={styles.messageMeta}>
                  {getMessageStatusIcon()}
                  {chat.lastMessageTime && (
                    <Text style={[styles.messageTime, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {(() => {
                        try {
                          const date = toDate(chat.lastMessageTime);
                          if (!date) {
                            console.error('Invalid date value:', chat.lastMessageTime);
                            return 'recently';
                          }
                          return formatDistanceToNow(date, { addSuffix: true });
                        } catch (error) {
                          console.error('Error formatting message time:', error, 'Raw value:', chat.lastMessageTime);
                          return 'recently';
                        }
                      })()}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>

          {chat.status !== 'pending' && (
            <>
              <View style={styles.userInterestsContainer}>
                {partner.interests?.slice(0, 2).map((interest: string, index: number) => (
                  <Animated.View 
                    key={index} 
                    style={[
                      styles.interestTag,
                      {
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim
                      }
                    ]}
                  >
                    <Text style={styles.interestText}>{interest}</Text>
                  </Animated.View>
                ))}
              </View>

              <View style={styles.userMoodContainer}>
                <Animated.View 
                  style={[
                    styles.moodIndicator,
                    {
                      transform: [{ scale: scaleAnim }],
                      opacity: opacityAnim
                    }
                  ]} 
                />
                <Text style={[styles.moodText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  {partner.moodStatus || "Available"}
                </Text>
              </View>
            </>
          )}

          {chat.unreadCount ? (
            <Animated.View 
              style={[
                styles.unreadBadge,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim
                }
              ]}
            >
              <Text style={styles.unreadCount}>{chat.unreadCount}</Text>
            </Animated.View>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    </Swipeable>
  );
}, (prevProps: ChatItemProps, nextProps: ChatItemProps) => {
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
    prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
    prevProps.chat.isPinned === nextProps.chat.isPinned &&
    prevProps.chat.status === nextProps.chat.status
  );
});

// Add image preloading utility
const preloadImages = (urls: (string | null)[]) => {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<string | null>((resolve, reject) => {
          if (!url) {
            resolve(null);
            return;
          }
          Image.prefetch(url)
            .then(() => resolve(url))
            .catch((error) => {
              console.warn('Error preloading image:', error);
              resolve(null);
            });
        })
    )
  );
};

export default function ChatInbox() {
  const { user } = useAuth();
  const { getChats, subscribeToChat, loading: chatsLoading, error: chatsError } = useChats();
  const { getUser } = useUsers();
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const { theme } = React.useContext(ThemeContext);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [pendingChats, setPendingChats] = useState<Chat[]>([]);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Add fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const backgroundAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;
  const textAnim = useRef(new Animated.Value(theme === "light" ? 0 : 1)).current;

  // Add auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Add refresh function
  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      const allChats = await getChats();
      if (allChats) {
        const userChats = allChats.filter(
          (chat: any) => chat.participants && chat.participants.includes(user.uid)
        ) as Chat[];

        const pending = userChats.filter(chat => chat.status === 'pending');
        const active = userChats.filter(chat => chat.status !== 'pending');
        
        setPendingChats(pending);
        setActiveChats(active);
        setChats(userChats);
        setFilteredChats(userChats);
      }
    } catch (error) {
      console.error('Error refreshing chats:', error);
      Alert.alert(
        "Error",
        "Failed to refresh chats. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Subscribe to real-time updates for all chats
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    const setupChatSubscriptions = async () => {
      try {
        const allChats = await getChats();
        
        if (allChats) {
          const userChats = allChats.filter(
            (chat: any) => chat.participants && chat.participants.includes(user.uid)
          ) as Chat[];

          // Set up real-time subscriptions for each chat
          userChats.forEach(chat => {
            const unsubscribe = subscribeToChat(chat.id, (updatedChat: Chat) => {
              setChats(prevChats => {
                const newChats = prevChats.map(c => 
                  c.id === updatedChat.id ? { ...c, ...updatedChat } : c
                );
                
                // Update filtered chats
                setFilteredChats(prevFiltered => 
                  prevFiltered.map(c => c.id === updatedChat.id ? { ...c, ...updatedChat } : c)
                );

                // Update pending and active chats
                const pending = newChats.filter(c => c.status === 'pending');
                const active = newChats.filter(c => c.status !== 'pending');
                setPendingChats(pending);
                setActiveChats(active);

                return newChats;
              });
            });
            unsubscribers.push(unsubscribe);
          });

          // Initial state setup
          const pending = userChats.filter(chat => chat.status === 'pending');
          const active = userChats.filter(chat => chat.status !== 'pending');
          
          setPendingChats(pending);
          setActiveChats(active);
          setChats(userChats);
          setFilteredChats(userChats);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        Alert.alert(
          "Error",
          "Failed to load chats. Please try again.",
          [
            {
              text: "Retry",
              onPress: () => {
                setInitialLoadComplete(false);
                setupChatSubscriptions();
              }
            }
          ]
        );
      } finally {
        setInitialLoadComplete(true);
      }
    };

    setupChatSubscriptions();

    // Cleanup subscriptions
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [user]);

  // Add image preloading effect
  useEffect(() => {
    const preloadChatImages = async () => {
      const imagePromises = chats.map(async (chat: Chat) => {
        const partnerId = chat.participants.find((id: string) => id !== user?.uid);
        if (!partnerId) return null;
        const userData = await getUser(partnerId);
        return (userData as Partner)?.profilePicture || null;
      });

      const imageUrls = await Promise.all(imagePromises);
      const validUrls = imageUrls.filter((url): url is string => url !== null);
      
      // Preload images in batches to avoid overwhelming the device
      const batchSize = 5;
      for (let i = 0; i < validUrls.length; i += batchSize) {
        const batch = validUrls.slice(i, i + batchSize);
        await Promise.all(batch.map(url => Image.prefetch(url)));
      }
    };

    if (chats.length > 0 && user?.uid) {
      preloadChatImages();
    }
  }, [chats, user?.uid, getUser]);

  const handlePinChat = async (chatId: string) => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const currentData = chatDoc.data();
        const newIsPinned = !currentData.isPinned;
        
        await updateDoc(chatRef, {
          isPinned: newIsPinned
        });

        // Update local state
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId ? { ...chat, isPinned: newIsPinned } : chat
          )
        );
        
        setFilteredChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId ? { ...chat, isPinned: newIsPinned } : chat
          )
        );
        
        setActiveChats(prevChats => 
          prevChats.map(chat => 
            chat.id === chatId ? { ...chat, isPinned: newIsPinned } : chat
          )
        );
      }
    } catch (error) {
      console.error('Error toggling pin status:', error);
      Alert.alert('Error', 'Failed to update pin status. Please try again.');
    }
  };

  const handleDeleteChat = (chatId: string) => {
    // Update all relevant state arrays
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    setFilteredChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    setPendingChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    setActiveChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
  };

  const handleAcceptChat = (updatedChat: Chat) => {
    // Remove from pending chats and add to active chats
    setPendingChats(prevChats => prevChats.filter(chat => chat.id !== updatedChat.id));
    setActiveChats(prevChats => [updatedChat, ...prevChats]);
    setChats(prevChats => {
      const filtered = prevChats.filter(chat => chat.id !== updatedChat.id);
      return [updatedChat, ...filtered];
    });
    setFilteredChats(prevChats => {
      const filtered = prevChats.filter(chat => chat.id !== updatedChat.id);
      return [updatedChat, ...filtered];
    });
  };

  // Optimize FlatList rendering
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  }), []);

  const keyExtractor = useCallback((item: Chat) => item.id, []);

  // Update the sorting function to always return a number
  const sortChats = useCallback((a: Chat, b: Chat) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = getTimestampMs(a.lastMessageTime);
    const timeB = getTimestampMs(b.lastMessageTime);
    return timeB - timeA;
  }, []);

  // Add performance optimizations for chat list
  const memoizedActiveChats = useMemo(() => {
    return activeChats.sort(sortChats);
  }, [activeChats, sortChats]);

  const memoizedPendingChats = useMemo(() => {
    return pendingChats;
  }, [pendingChats]);

  // Add debounced search
  const debouncedSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setFilteredChats(chats);
        return;
      }
      const filtered = chats.filter(chat => {
        const partnerId = chat.participants.find(id => id !== user?.uid);
        if (!partnerId) return false;
        return getUser(partnerId).then(userData => {
          const name = (userData as Partner)?.name?.toLowerCase() || '';
          return name.includes(query.toLowerCase());
        });
      });
      setFilteredChats(filtered);
    },
    [chats, user?.uid, getUser]
  );

  // Update search handler with manual debouncing
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    const timeoutId = setTimeout(() => {
      debouncedSearch(text);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [debouncedSearch]);

  // Optimize animations
  const animateIn = useCallback(() => {
    fadeAnim.setValue(0);
    translateYAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      })
    ]).start();
  }, [fadeAnim, translateYAnim]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(translateYAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      })
    ]).start();
  }, [fadeAnim, translateYAnim]);

  // Update useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      animateIn();
      return () => {
        animateOut();
      };
    }, [animateIn, animateOut])
  );

  // Update handleBack
  const handleBack = useCallback(() => {
    animateOut();
    router.back();
  }, [animateOut]);

  // Update handleNavigateToExplore
  const handleNavigateToExplore = useCallback(() => {
    animateOut();
    router.push("/chat/chatExplore");
  }, [animateOut]);

  // Update ListHeaderComponent
  const ListHeaderComponent = useCallback(() => (
    memoizedActiveChats.length > 0 ? (
      <TextInput
        style={[styles.searchInput, { 
          backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
          color: theme === "light" ? "#000000" : "#e4fbfe",
          borderColor: "#37a4c8"
        }]}
        placeholder="Search chats..."
        placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
        value={searchQuery}
        onChangeText={handleSearch}
      />
    ) : null
  ), [theme, searchQuery, handleSearch, memoizedActiveChats.length]);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.stateContainer}>
      <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#64748B" }]}>
        No active chats
      </Text>
      <TouchableOpacity 
        style={[styles.retryButton, { marginTop: 16 }]} 
        onPress={handleNavigateToExplore}
      >
        <Text style={styles.retryButtonText}>Find People</Text>
      </TouchableOpacity>
    </View>
  ), [theme, handleNavigateToExplore]);

  const renderItem = useCallback(({ item }: { item: Chat }) => (
    <ChatItem
      chat={item}
      currentUser={user!}
      getUser={async (userId: string) => {
        const userData = await getUser(userId);
        if (!userData) throw new Error("User not found");
        return userData as Partner;
      }}
      onPress={() => {
        router.push("/chat/" + item.id);
      }}
      onPinPress={() => handlePinChat(item.id)}
      onDelete={() => handleDeleteChat(item.id)}
      onAccept={handleAcceptChat}
    />
  ), [user, handlePinChat, handleDeleteChat, handleAcceptChat]);

  // Interpolate colors for smooth transitions
  const backgroundColor = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e6e6e6', '#000000'],
    extrapolate: 'clamp'
  });

  const textColor = textAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#000000', '#ffffff'],
    extrapolate: 'clamp'
  });

  // Add error boundary
  const handleError = useCallback((error: Error) => {
    console.error('Chat list error:', error);
    Alert.alert(
      'Error',
      'An error occurred while loading chats. Please try again.',
      [{ text: 'OK', onPress: handleRefresh }]
    );
  }, [handleRefresh]);

  // Add loading state optimization
  const isLoading = isAuthLoading || chatsLoading || !initialLoadComplete;

  // Add error state optimization
  const hasError = !!chatsError;

  // Add empty state optimization
  const isEmpty = !isLoading && !hasError && activeChats.length === 0 && pendingChats.length === 0;

  if (isLoading) {
    return (
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading your chats..." />
      </LinearGradient>
    );
  }

  // Add a safety check for user
  if (!user || !authUser) {
    router.replace("login/login");
    return null;
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true} 
          title="Chats"
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          onBackPress={handleBack}
        />
        <Animated.View 
          style={[
            styles.container, 
            { 
              opacity: fadeAnim,
              transform: [{
                translateY: translateYAnim
              }]
            }
          ]}
        >
          {isLoading ? (
            <LoadingScreen message="Loading your chats..." />
          ) : hasError ? (
            <View style={styles.stateContainer}>
              <Text style={styles.errorText}>{chatsError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : isEmpty ? (
            <View style={styles.stateContainer}>
              <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#64748B" }]}>
                No chats yet
              </Text>
              <TouchableOpacity 
                style={[styles.retryButton, { marginTop: 16 }]} 
                onPress={handleNavigateToExplore}
              >
                <Text style={styles.retryButtonText}>Find People</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={["#37a4c8"]}
                  tintColor={theme === "light" ? "#37a4c8" : "#ffffff"}
                />
              }
            >
              {memoizedPendingChats.length > 0 && (
                <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Pending Connections
                  </Text>
                  {memoizedPendingChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      currentUser={user!}
                      getUser={async (userId: string) => {
                        const userData = await getUser(userId);
                        if (!userData) throw new Error("User not found");
                        return userData as Partner;
                      }}
                      onPress={() => {
                        router.push("/chat/" + chat.id);
                      }}
                      onPinPress={() => handlePinChat(chat.id)}
                      onDelete={() => handleDeleteChat(chat.id)}
                      onAccept={handleAcceptChat}
                    />
                  ))}
                </View>
              )}

              {memoizedActiveChats.length > 0 ? (
                <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
                    Active Chats
                  </Text>
                  <TextInput
                    style={[styles.searchInput, { 
                      backgroundColor: theme === "light" ? "#e6e6e6" : "#1a1a1a",
                      color: theme === "light" ? "#000000" : "#e4fbfe",
                      borderColor: "#37a4c8"
                    }]}
                    placeholder="Search chats..."
                    placeholderTextColor={theme === "light" ? "#64748B" : "#64748B"}
                    value={searchQuery}
                    onChangeText={handleSearch}
                  />
                  {memoizedActiveChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={chat}
                      currentUser={user!}
                      getUser={async (userId: string) => {
                        const userData = await getUser(userId);
                        if (!userData) throw new Error("User not found");
                        return userData as Partner;
                      }}
                      onPress={() => {
                        router.push("/chat/" + chat.id);
                      }}
                      onPinPress={() => handlePinChat(chat.id)}
                      onDelete={() => handleDeleteChat(chat.id)}
                      onAccept={handleAcceptChat}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.stateContainer}>
                  <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#64748B" }]}>
                    No active chats
                  </Text>
                  <TouchableOpacity 
                    style={[styles.retryButton, { marginTop: 16 }]} 
                    onPress={handleNavigateToExplore}
                  >
                    <Text style={styles.retryButtonText}>Find People</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.newChatButton, { backgroundColor: "#37a4c8" }]}
            onPress={handleNavigateToExplore}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
        <BottomNavBar />
      </LinearGradient>
    </SafeAreaView>
  );
}
