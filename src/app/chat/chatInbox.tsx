import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Text,
  View,
  FlatList,
  SectionList,
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
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { onAuthStateChanged, User, getAuth } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import useChats from "../../hooks/useChats";
import useUsers from "../../hooks/useUsers";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import { formatDistanceToNow } from 'date-fns';
import { Swipeable } from 'react-native-gesture-handler';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, Timestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import BottomNavBar from "../../components/BottomNavBar";
import * as Haptics from 'expo-haptics';
import useNotificationCount from "../../hooks/useNotificationCount";

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.18;

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: number;
  isPinned?: boolean;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
  status: 'active' | 'pending';
  connectionId?: string;
  isEventChat?: boolean;
  eventId?: string;
  eventName?: string;
  eventAirportCode?: string;
  category?: string;
  airportCode?: string;
  eventImage?: string;
  description?: string;
  startTime?: string;
  organizedAt?: string;
  organizer?: string;
}

interface EventChat {
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
  lastMessage?: string;
  lastMessageTime?: Date | Timestamp;
  unreadCount?: number;
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
  onAccept: (updatedChat: Chat) => void;
  setPendingChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  setFilteredChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  preloadedData?: { partner: Partner, isInitiator: boolean };
}

interface ConnectionData {
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: number;
  isPinned?: boolean;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
  status?: 'active' | 'pending';
}

interface EventData {
  attendees: string[];
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount?: number;
  name: string;
  airportCode: string;
  category: string;
  eventImage?: string;
}

interface Section {
  title: string;
  data: Chat[];
}

type EventStatus = 'in_progress' | 'upcoming' | 'ended';

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

const ModernLoadingIndicator = ({ color }: { color: string }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(scaleAnim, {
              toValue: 1.2,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
              easing: Easing.linear,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.ease),
            }),
          ]),
        ])
      ),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View 
      style={[
        styles.loadingIndicatorContainer,
        {
          opacity: fadeAnim,
          transform: [
            { scale: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1]
            })},
            { rotate: spin }
          ]
        }
      ]}
    >
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
    </Animated.View>
  );
};

const PendingConnectionSkeleton = ({ index }: { index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const { theme } = React.useContext(ThemeContext);

  useEffect(() => {
    const delay = index * 100;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
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
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.chatCard,
        {
          backgroundColor: theme === "light" ? "#f0f0f0" : "#1a1a1a",
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      <View style={styles.chatCardContent}>
        <View style={styles.chatHeader}>
          <View style={styles.imageContainer}>
            <View style={[styles.profileImage, { backgroundColor: theme === "light" ? "#e0e0e0" : "#2a2a2a" }]} />
          </View>
          <View style={styles.chatMainInfo}>
            <View style={[styles.skeletonText, { width: '60%', height: 20, marginBottom: 8, backgroundColor: theme === "light" ? "#e0e0e0" : "#2a2a2a" }]} />
            <View style={[styles.skeletonText, { width: '40%', height: 16, backgroundColor: theme === "light" ? "#e0e0e0" : "#2a2a2a" }]} />
          </View>
        </View>
        <View style={styles.pendingContainer}>
          <View style={[styles.skeletonText, { width: '80%', height: 16, marginBottom: 12, backgroundColor: theme === "light" ? "#e0e0e0" : "#2a2a2a" }]} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: -20,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
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
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageContainer: {
    marginRight: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  chatMainInfo: {
    flex: 1,
    justifyContent: 'center',
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
    alignItems: 'flex-start',
    flex: 1,
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
    bottom: 80,
    right: 20,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.8,
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
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#37a4c8',
  },
  sectionToggle: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  pendingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.1)',
  },
  pendingText: {
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 20,
  },
  pendingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFA500',
    marginRight: 8,
  },
  pendingStatusText: {
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '600',
  },
  deleteAction: {}, // Empty style object instead of undefined
  deleteActionText: {}, // Empty style object instead of undefined 
  pendingActionsContainer: {
    marginTop: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    width: '100%',
  },
  pendingActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 20,
  },
  pendingActionButton: {
    flex: 1,
    maxWidth: 140,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pendingActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  pendingActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  connectionTypeContainer: {
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#37a4c8",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12
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
  skeletonText: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  loadMoreButton: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  eventImage: {
    backgroundColor: '#37a4c8',
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16,
    paddingHorizontal: 4,
    color: '#37a4c8',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    marginLeft: 12,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#37a4c8',
  },
  eventStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventStatusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  eventDescriptionContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
});

const ChatItem = React.memo(({ 
  chat, 
  currentUser, 
  getUser: getPartner,
  onPress, 
  onPinPress, 
  onAccept, 
  setPendingChats, 
  setChats, 
  setFilteredChats,
  index,
  preloadedData
}: ChatItemProps & { index: number }) => {
  const [partner, setPartner] = useState<Partner | null>(preloadedData?.partner || null);
  const [isLoading, setIsLoading] = useState(!preloadedData && !chat.isEventChat);
  const [isInitiator, setIsInitiator] = useState(preloadedData?.isInitiator || false);
  const { theme } = React.useContext(ThemeContext);
  const swipeableRef = useRef<Swipeable>(null);
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pinScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!preloadedData && !chat.isEventChat) {
      const loadPartner = async () => {
        if (chat?.participants && currentUser) {
          const partnerId = chat.participants.find(
            (id: string) => id !== currentUser.uid
          );
          if (partnerId) {
            try {
              const fetchedPartner = await getPartner(partnerId);
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
    } else if (chat.isEventChat) {
      // For event chats, we don't need to load partner data
      setIsLoading(false);
    }
  }, [chat, currentUser, getPartner, preloadedData]);

  useEffect(() => {
    if (!preloadedData && !chat.isEventChat) {
      const checkInitiator = async () => {
        if (chat.id) {
          const connectionDoc = await getDoc(doc(db, 'connections', chat.id));
          if (connectionDoc.exists()) {
            const data = connectionDoc.data();
            setIsInitiator(data.initiator === currentUser.uid);
          }
        }
      };
      checkInitiator();
    }
  }, [chat.id, currentUser.uid, preloadedData]);

  // Add staggered animation with loading state
  useEffect(() => {
    const delay = index * 100;
    const timer = setTimeout(() => {
      if (partner || chat.isEventChat) {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          })
        ]).start();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [partner, chat.isEventChat, index]);

  const handleAcceptConnection = async () => {
    console.log('Accept button pressed for chat:', chat.id);
    try {
      const connectionId = chat.connectionId || chat.id;
      
      if (!connectionId) {
        console.error('No connectionId found in chat:', chat);
        Alert.alert('Error', 'Invalid connection request');
        return;
      }

      // Immediately remove from pending state
      setPendingChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setFilteredChats(prevChats => prevChats.filter(c => c.id !== connectionId));

      console.log('Processing accept for connection:', connectionId);
      const connectionRef = doc(db, 'connections', connectionId);
      const connectionDoc = await getDoc(connectionRef);
      
      if (!connectionDoc.exists()) {
        console.error('Connection document not found:', connectionId);
        Alert.alert('Error', 'Connection request not found');
        return;
      }

      const connectionData = connectionDoc.data();
      console.log('Connection data:', connectionData);
      
      if (!connectionData.initiator) {
        console.error('No initiator found in connection data:', connectionData);
        Alert.alert('Error', 'Invalid connection data');
        return;
      }

      const initiatorId = connectionData.initiator;

      // Create a new chat document
      const chatRef = doc(collection(db, 'chats'));
      console.log('Creating new chat document with ID:', chatRef.id);
      
      const newChatData = {
        id: chatRef.id,
        participants: chat.participants,
        status: 'active' as const,
        connectionId: connectionId,
        createdAt: Timestamp.now(),
        lastMessageTime: Timestamp.now(),
        isPinned: false
      };

      // Start a batch write
      const batch = writeBatch(db);

      // Update connection status
      console.log('Updating connection status to active');
      batch.update(connectionRef, {
        status: 'active',
        chatId: chatRef.id
      });

      // Create the new chat document
      console.log('Creating new chat document');
      batch.set(chatRef, newChatData);

      // Get the current user's data for the notification
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        console.log('Creating notification for initiator:', initiatorId);
        
        // Get initiator's data to check notification preferences and push token
        const initiatorRef = doc(db, 'users', initiatorId);
        const initiatorDoc = await getDoc(initiatorRef);
        
        if (initiatorDoc.exists()) {
          const initiatorData = initiatorDoc.data();
          
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
          const notifications = initiatorData.notifications || [];
          batch.update(initiatorRef, {
            notifications: [...notifications, notification]
          });
          console.log('Notification added to initiator');

          // Send push notification if initiator has token and notifications enabled
          if (initiatorData?.expoPushToken && 
              initiatorData?.notificationPreferences?.notificationsEnabled && 
              initiatorData?.notificationPreferences?.connections) {
            
            console.log('📱 Push notification conditions met:', {
              hasToken: true,
              token: initiatorData.expoPushToken,
              notificationsEnabled: true,
              connectionsEnabled: true
            });

            try {
              const pushPayload = {
                to: initiatorData.expoPushToken,
                title: "Connection Accepted! 🎉",
                body: `${currentUserData.name} accepted your connection request`,
                sound: 'default',
                priority: 'high',
                data: {
                  type: 'match',
                  matchedUserId: currentUser.uid,
                  matchedUserName: currentUserData.name
                },
              };

              console.log('📦 Push notification payload:', pushPayload);

              const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Accept-encoding': 'gzip, deflate',
                },
                body: JSON.stringify(pushPayload),
              });

              const responseData = await response.json();
              
              if (!response.ok) {
                console.error('❌ Push notification failed:', {
                  status: response.status,
                  statusText: response.statusText,
                  data: responseData,
                  requestPayload: pushPayload
                });
              } else {
                console.log('✅ Push notification sent successfully:', {
                  responseData,
                  receiverId: initiatorId,
                  senderName: currentUserData.name
                });
              }
            } catch (error: any) {
              console.error('❌ Error sending push notification:', {
                error,
                errorMessage: error.message,
                errorStack: error.stack,
                receiverId: initiatorId,
                token: initiatorData.expoPushToken,
                senderName: currentUserData.name
              });
            }
          } else {
            console.log('ℹ️ Push notification not sent. Reason:', {
              hasToken: !!initiatorData?.expoPushToken,
              token: initiatorData?.expoPushToken,
              notificationsEnabled: initiatorData?.notificationPreferences?.notificationsEnabled,
              connectionsEnabled: initiatorData?.notificationPreferences?.connections,
              receiverId: initiatorId,
              receiverName: initiatorData.name,
              fullPreferences: initiatorData?.notificationPreferences
            });
          }
        }
      }

      // Commit all changes
      console.log('Committing batch write');
      await batch.commit();
      console.log('Batch write successful');

      // Create updated chat object with proper typing
      const updatedChat: Chat = {
        ...newChatData,
        participants: chat.participants,
        status: 'active' as const,
        connectionId: connectionId
      };

      // Call onAccept with the updated chat
      onAccept(updatedChat);

      console.log('Navigating to new chat');
      // Navigate to the new chat
      router.push("/chat/" + chatRef.id);
    } catch (error: any) {
      console.error('Error accepting connection:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      Alert.alert('Error', 'Failed to accept connection. Please try again.');
    }
  };

  const handleDeclineConnection = async () => {
    console.log('Decline button pressed for connection:', chat.id);
    try {
      // For pending connections, the chat.id is actually the connection document ID
      const connectionId = chat.id;
      console.log('Processing decline for connection:', connectionId);
      
      // Immediately remove from pending state
      setPendingChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setFilteredChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      
      // Get connection data before deleting
      const connectionDoc = await getDoc(doc(db, 'connections', connectionId));
      if (connectionDoc.exists()) {
        const connectionData = connectionDoc.data();
        console.log('Connection data:', connectionData);
        const initiatorId = connectionData.initiator;
        
        // Get the current user's data for the notification
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data();
          console.log('Creating notification for initiator:', initiatorId);
          
          // Get initiator's data to check notification preferences and push token
          const initiatorRef = doc(db, 'users', initiatorId);
          const initiatorDoc = await getDoc(initiatorRef);
          
          if (initiatorDoc.exists()) {
            const initiatorData = initiatorDoc.data();
            
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

            // Start a batch write
            const batch = writeBatch(db);

            // Add notification to initiator's user document
            const notifications = initiatorData.notifications || [];
            batch.update(initiatorRef, {
              notifications: [...notifications, notification]
            });
            console.log('Notification added to initiator');

            // Send push notification if initiator has token and notifications enabled
            if (initiatorData?.expoPushToken && 
                initiatorData?.notificationPreferences?.notificationsEnabled && 
                initiatorData?.notificationPreferences?.connections) {
              
              console.log('📱 Push notification conditions met:', {
                hasToken: true,
                token: initiatorData.expoPushToken,
                notificationsEnabled: true,
                connectionsEnabled: true
              });

              try {
                const pushPayload = {
                  to: initiatorData.expoPushToken,
                  title: "Connection Declined",
                  body: `${currentUserData.name} declined your connection request`,
                  sound: 'default',
                  priority: 'high',
                  data: {
                    type: 'match',
                    matchedUserId: currentUser.uid,
                    matchedUserName: currentUserData.name
                  },
                };

                console.log('📦 Push notification payload:', pushPayload);

                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                  },
                  body: JSON.stringify(pushPayload),
                });

                const responseData = await response.json();
                
                if (!response.ok) {
                  console.error('❌ Push notification failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: responseData,
                    requestPayload: pushPayload
                  });
                } else {
                  console.log('✅ Push notification sent successfully:', {
                    responseData,
                    receiverId: initiatorId,
                    senderName: currentUserData.name
                  });
                }
              } catch (error: any) {
                console.error('❌ Error sending push notification:', {
                  error,
                  errorMessage: error.message,
                  errorStack: error.stack,
                  receiverId: initiatorId,
                  token: initiatorData.expoPushToken,
                  senderName: currentUserData.name
                });
              }
            } else {
              console.log('ℹ️ Push notification not sent. Reason:', {
                hasToken: !!initiatorData?.expoPushToken,
                token: initiatorData?.expoPushToken,
                notificationsEnabled: initiatorData?.notificationPreferences?.notificationsEnabled,
                connectionsEnabled: initiatorData?.notificationPreferences?.connections,
                receiverId: initiatorId,
                receiverName: initiatorData.name,
                fullPreferences: initiatorData?.notificationPreferences
              });
            }

            // Remove current user from initiator's likedUsers array
            const likedUsers = initiatorData.likedUsers || [];
            const updatedLikedUsers = likedUsers.filter((id: string) => id !== currentUser.uid);
            batch.update(initiatorRef, {
              likedUsers: updatedLikedUsers
            });
            console.log('Removed user from likedUsers array');

            // Delete the connection document
            batch.delete(doc(db, 'connections', connectionId));
            console.log('Connection document marked for deletion');

            // Commit all changes
            await batch.commit();
            console.log('Batch write successful');
          }
        }
      }
    } catch (error: any) {
      console.error('Error declining connection:', error);
      Alert.alert('Error', 'Failed to decline connection. Please try again.');
    }
  };

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

  const handlePress = useCallback(() => {
    if (chat.status === 'pending') {
      const partnerId = chat.participants.find(id => id !== currentUser.uid);
      if (partnerId) {
        router.push(`/profile/${partnerId}`);
      }
    } else if (chat.isEventChat) {
      console.log('Navigating to event chat:', chat.eventId);
      router.push(`/event/eventChat/${chat.eventId}`);
    } else {
      onPress();
    }
  }, [chat, currentUser.uid, onPress]);

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
    return null;
  };

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

  const handleAcceptPressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleAcceptPressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  if (isLoading) {
    return <PendingConnectionSkeleton index={index} />;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      enabled={false}
    >
      <Animated.View
        style={[
          styles.chatCard,
          {
            backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
            borderColor: chat.status === 'pending' ? 'rgba(55, 164, 200, 0.3)' : "#37a4c8",
            borderWidth: 1,
            opacity: opacityAnim,
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
            chat.status === 'pending' && { opacity: 0.95 }
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <View style={styles.chatHeader}>
            <View style={styles.imageContainer}>
              {chat.isEventChat ? (
                <View style={[styles.profileImage, styles.eventImage]}>
                  <Ionicons name="calendar" size={24} color="#ffffff" />
                </View>
              ) : partner?.profilePicture ? (
                <Image
                  source={{ uri: partner.profilePicture }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>
                    {partner?.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              {!chat.isEventChat && partner?.isOnline && (
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
                  {chat.isEventChat ? chat.eventName : (partner?.name || "Unknown User")}
                </Text>
                {chat.status !== 'pending' && !chat.isEventChat && (
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
                {chat.isEventChat ? (
                  <>
                    <Text style={[styles.userAge, { color: "#37a4c8" }]}>{chat.category}</Text>
                    <Text style={[styles.userLocation, { color: "#37a4c8" }]}>• {chat.airportCode}</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.userAge, { color: "#37a4c8" }]}>{partner?.age} years old</Text>
                    <Text style={[styles.userLocation, { color: "#37a4c8" }]}>• {partner?.airportCode}</Text>
                    {partner?.lastSeen && (
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
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.chatInfo}>
            {chat.status === 'pending' ? (
              <View style={styles.pendingContainer}>
                {isInitiator ? (
                  <>
                    <Text style={[styles.pendingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      Waiting for them to accept your connection request
                    </Text>
                    <View style={styles.pendingStatusContainer}>
                      <View style={styles.pendingStatusDot} />
                      <Text style={styles.pendingStatusText}>Pending</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.pendingText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {partner?.name} wants to connect with you
                    </Text>
                    <View style={styles.pendingActionsContainer}>
                      <View style={styles.pendingActionsRow}>
                        <TouchableOpacity 
                          style={[styles.pendingActionButton, { backgroundColor: '#4CAF50' }]}
                          onPress={handleAcceptConnection}
                          onPressIn={handleAcceptPressIn}
                          onPressOut={handleAcceptPressOut}
                          activeOpacity={0.7}
                        >
                          <View style={styles.pendingActionIcon}>
                            <MaterialIcons name="check" size={28} color="#FFF" />
                          </View>
                          <Text style={styles.pendingActionText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.pendingActionButton, { backgroundColor: '#FF3B30' }]}
                          onPress={handleDeclineConnection}
                          onPressIn={handleAcceptPressIn}
                          onPressOut={handleAcceptPressOut}
                          activeOpacity={0.7}
                        >
                          <View style={styles.pendingActionIcon}>
                            <MaterialIcons name="close" size={28} color="#FFF" />
                          </View>
                          <Text style={styles.pendingActionText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            ) : chat.isEventChat ? (
              <View style={[styles.messageContainer, { marginTop: 4 }]}>
                <View style={styles.eventDescriptionContainer}>
                  <Text 
                    style={[
                      styles.chatLastMessage, 
                      { 
                        color: theme === "light" ? "#64748B" : "#94A3B8",
                        fontWeight: '400',
                        fontSize: 13,
                        lineHeight: 18,
                        fontStyle: 'italic',
                        marginBottom: 6
                      }
                    ]} 
                    numberOfLines={2}
                  >
                    {chat.description}
                  </Text>
                  <View style={styles.eventStatusContainer}>
                    <Text 
                      style={[
                        styles.eventStatusText,
                        { 
                          color: (() => {
                            const status = getEventStatus(chat.startTime).status;
                            switch (status) {
                              case 'in_progress': return '#4CAF50';
                              case 'upcoming': return '#37a4c8';
                              case 'ended': return '#FF3B30';
                              default: return theme === "light" ? "#64748B" : "#94A3B8";
                            }
                          })()
                        }
                      ]}
                    >
                      {getEventStatus(chat.startTime).timeRemaining}
                    </Text>
                  </View>
                </View>
              </View>
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
                  {!chat.isEventChat && getMessageStatusIcon()}
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

          {chat.status !== 'pending' && !chat.isEventChat && (
            <>
              <View style={styles.userInterestsContainer}>
                {partner?.interests?.slice(0, 2).map((interest: string, index: number) => (
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
                  {partner?.moodStatus || "Available"}
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

const getPartner = async (userId: string): Promise<Partner> => {
  const userDoc = await getDoc(doc(db, "users", userId));
  if (!userDoc.exists()) {
    throw new Error("User not found");
  }
  const data = userDoc.data();
  return {
    id: userDoc.id,
    name: data.name || "",
    profilePicture: data.profilePicture,
    age: data.age?.toString() || "",
    airportCode: data.airportCode || "",
    interests: data.interests || [],
    moodStatus: data.moodStatus,
    isOnline: data.isOnline,
    lastSeen: data.lastSeen
  };
};

const getEventStatus = (startTime: any, endTime?: any): { status: EventStatus; timeRemaining: string } => {
  const now = new Date();
  const start = startTime instanceof Timestamp ? startTime.toDate() : new Date(startTime);
  const end = endTime instanceof Timestamp ? endTime.toDate() : endTime ? new Date(endTime) : null;
  
  // Calculate time difference in hours
  const hoursSinceStart = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  if (now < start) {
    // Event hasn't started
    const diff = start.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return {
      status: 'upcoming',
      timeRemaining: `${hours}h ${minutes}m until start`
    };
  } else if (hoursSinceStart <= 1 && (!end || now < end)) {
    // Event is in progress and started less than an hour ago
    return {
      status: 'in_progress',
      timeRemaining: 'In Progress'
    };
  } else {
    // Event has ended (either explicitly ended or started more than an hour ago)
    return {
      status: 'ended',
      timeRemaining: 'Ended'
    };
  }
};

const sortEventChats = (chats: Chat[]) => {
  return [...chats].sort((a, b) => {
    const statusA = getEventStatus(a.startTime).status as EventStatus;
    const statusB = getEventStatus(b.startTime).status as EventStatus;
    
    const statusOrder: Record<EventStatus, number> = {
      'in_progress': 0,
      'upcoming': 1,
      'ended': 2
    };
    
    return statusOrder[statusA] - statusOrder[statusB];
  });
};

export default function ChatInbox() {
  const { user } = useAuth();
  const { getChats, subscribeToChat } = useChats();
  const { getUser } = useUsers();
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  // State variables
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [pendingChats, setPendingChats] = useState<Chat[]>([]);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [displayedActiveChats, setDisplayedActiveChats] = useState<Chat[]>([]);
  const [hasMoreChats, setHasMoreChats] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const loadingStartTime = useRef<number | null>(null);
  const [unsubscribers, setUnsubscribers] = useState<(() => void)[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [foldedSections, setFoldedSections] = useState<{ [key: string]: boolean }>({
    'Events': true,
    'Pending Connections': false,
    'Active Chats': false
  });

  useEffect(() => {
    if (user) {
      handleRefresh();
    }
  }, [user]);

  useEffect(() => {
    // Start fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    loadingStartTime.current = Date.now();
    try {
      const [allChats, connectionsSnapshot, eventsSnapshot] = await Promise.all([
        getChats(),
        getDocs(collection(db, 'connections')),
        getDocs(query(collection(db, 'events'), where('attendees', 'array-contains', user.uid)))
      ]);

      let eventChats: Chat[] = [];
      if (eventsSnapshot) {
        console.log('📅 Processing event chats for user:', user.uid);
        eventsSnapshot.docs.forEach((doc: any) => {
          try {
            const data = doc.data();
            console.log('Event document:', {
              id: doc.id,
              name: data.name,
              description: data.description,
              category: data.category,
              airportCode: data.airportCode,
              startTime: data.startTime,
              attendees: data.attendees,
              organizer: data.organizer,
              organizedAt: data.organizedAt,
              eventImage: data.eventImage,
              eventUID: data.eventUID
            });
          } catch (error) {
            console.error('Error processing event document:', {
              eventId: doc.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        });

        eventChats = eventsSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            id: data.eventUID || doc.id, // Use eventUID as the ID for consistency
            isEventChat: true,
            eventId: data.eventUID || doc.id,
            eventName: data.name,
            eventAirportCode: data.airportCode,
            category: data.category,
            airportCode: data.airportCode,
            eventImage: data.eventImage,
            lastMessage: data.lastMessage,
            lastMessageTime: data.lastMessageTime,
            unreadCount: data.unreadCount || 0,
            participants: data.attendees || [],
            status: 'active',
            description: data.description,
            startTime: data.startTime,
            organizedAt: data.organizedAt,
            organizer: data.organizer
          } as Chat;
        });
        console.log('📅 Converted events to chats:', eventChats.length);
      }

      if (allChats) {
        const userChats = allChats
          .filter((chat: any) => 
            chat.participants && 
            Array.isArray(chat.participants) && 
            chat.participants.includes(user.uid)
          )
          .map((chat: any) => ({
            ...chat,
            status: chat.status || 'active',
            participants: chat.participants || []
          })) as Chat[];

        const pendingConnections = connectionsSnapshot.docs
          .map((doc: any) => {
            const data = doc.data() as ConnectionData;
            return {
              id: doc.id,
              status: data.status || 'pending',
              lastMessage: data.lastMessage,
              lastMessageTime: data.lastMessageTime,
              unreadCount: data.unreadCount || 0,
              isPinned: data.isPinned || false,
              lastMessageStatus: data.lastMessageStatus,
              participants: data.participants || [],
              connectionId: doc.id
            } as Chat;
          })
          .filter((connection: Chat) => 
            connection.participants && 
            connection.participants.includes(user.uid) &&
            connection.status === 'pending'
          );

        const pending = [...pendingConnections, ...userChats.filter((chat: Chat) => chat.status === 'pending')];
        const active = userChats.filter((chat: Chat) => chat.status === 'active');
        // Combine chats in the correct order: pending first, then events, then active chats
        const allCombined = [...pending, ...eventChats, ...active];
        console.log('📊 Chat counts:', {
          pending: pending.length,
          events: eventChats.length,
          active: active.length,
          total: allCombined.length
        });
        setPendingChats(pending);
        setActiveChats(active);
        setChats(allCombined);
        setFilteredChats(allCombined);
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
      setIsLoading(false);
      
      // Ensure minimum loading time of 2 seconds
      const elapsed = Date.now() - (loadingStartTime.current || 0);
      const minDuration = 2000; // 2 seconds
      const remaining = Math.max(0, minDuration - elapsed);
      
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      
      setInitialLoadComplete(true);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredChats(chats);
      return;
    }

    const filtered = chats.filter(chat => {
      const searchLower = text.toLowerCase();
      if (chat.isEventChat) {
        return (
          chat.eventName?.toLowerCase().includes(searchLower) ||
          chat.category?.toLowerCase().includes(searchLower) ||
          chat.airportCode?.toLowerCase().includes(searchLower)
        );
      }
      return chat.participants.some(participantId => 
        participantId.toLowerCase().includes(searchLower)
      );
    });

    setFilteredChats(filtered);
  };

  const handlePinChat = async (chat: Chat) => {
    try {
      const chatRef = doc(db, 'chats', chat.id);
      await updateDoc(chatRef, {
        isPinned: !chat.isPinned
      });

      setChats(prevChats => 
        prevChats.map(c => 
          c.id === chat.id ? { ...c, isPinned: !c.isPinned } : c
        )
      );
      setFilteredChats(prevChats => 
        prevChats.map(c => 
          c.id === chat.id ? { ...c, isPinned: !c.isPinned } : c
        )
      );
    } catch (error) {
      console.error('Error pinning chat:', error);
      Alert.alert('Error', 'Failed to pin chat. Please try again.');
    }
  };

  const handleAcceptChat = (updatedChat: Chat) => {
    setPendingChats(prevChats => prevChats.filter(chat => chat.id !== updatedChat.id));
    setActiveChats(prevChats => [...prevChats, updatedChat]);
    setChats(prevChats => {
      const filtered = prevChats.filter(chat => chat.id !== updatedChat.id);
      return [...filtered, updatedChat];
    });
    setFilteredChats(prevChats => {
      const filtered = prevChats.filter(chat => chat.id !== updatedChat.id);
      return [...filtered, updatedChat];
    });
  };

  const toggleSection = (sectionTitle: string) => {
    console.log('Toggling section:', sectionTitle, 'Current state:', foldedSections[sectionTitle]);
    setFoldedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  const getFlattenedList = () => {
    const items: (Chat | { type: 'section'; title: string })[] = [];
    
    // Pending Connections Section
    const pendingChats = filteredChats.filter(chat => chat.status === 'pending');
    if (pendingChats.length > 0) {
      items.push({ type: 'section', title: 'Pending Connections' });
      if (!foldedSections['Pending Connections']) {
        items.push(...pendingChats);
      }
    }

    // Events Section
    const eventChats = filteredChats.filter(chat => chat.isEventChat);
    if (eventChats.length > 0) {
      items.push({ type: 'section', title: 'Events' });
      if (!foldedSections['Events']) {
        items.push(...sortEventChats(eventChats));
      }
    }

    // Active Chats Section
    const activeChats = filteredChats.filter(chat => chat.status === 'active' && !chat.isEventChat);
    if (activeChats.length > 0) {
      items.push({ type: 'section', title: 'Active Chats' });
      if (!foldedSections['Active Chats']) {
        items.push(...activeChats);
      }
    }

    return items;
  };

  const renderItem = ({ item, index }: { item: Chat | { type: 'section'; title: string }, index: number }) => {
    if ('type' in item && item.type === 'section') {
      const isFolded = foldedSections[item.title];
      return (
        <View style={styles.sectionTitleContainer}>
          <Text style={[
            styles.sectionTitle,
            { color: theme === "light" ? "#1a1a1a" : "#ffffff" }
          ]}>
            {item.title}
          </Text>
          <TouchableOpacity 
            style={styles.sectionToggle}
            onPress={() => toggleSection(item.title)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={isFolded ? "add" : "remove"} 
              size={20} 
              color={theme === "light" ? "#1a1a1a" : "#ffffff"} 
            />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ChatItem
        chat={item as Chat}
        currentUser={user!}
        getUser={getPartner}
        onPress={() => {
          if ((item as Chat).isEventChat) {
            router.push(`/event/eventChat/${(item as Chat).eventId}`);
          } else {
            router.push(`/chat/${(item as Chat).id}`);
          }
        }}
        onPinPress={() => handlePinChat(item as Chat)}
        onAccept={handleAcceptChat}
        setPendingChats={setPendingChats}
        setChats={setChats}
        setFilteredChats={setFilteredChats}
        index={index}
      />
    );
  };

  if (isLoading || !initialLoadComplete) {
    return (
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <LoadingScreen />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#ffffff", "#f8f8f8"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={false}
          title=""
          showNotifications={true}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
        />
        <View style={[styles.container, { paddingBottom: 100 }]}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme === "light" ? "#ffffff" : "#2a2a2a",
                color: theme === "light" ? "#1a1a1a" : "#ffffff",
                borderColor: theme === "light" ? "#e0e0e0" : "#3a3a3a"
              }
            ]}
            placeholder="Search chats..."
            placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          
          <FlatList
            data={getFlattenedList()}
            renderItem={renderItem}
            keyExtractor={(item) => 'type' in item ? `section-${item.title}` : item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme === "light" ? "#37a4c8" : "#4db8d4"}
              />
            }
            ListEmptyComponent={
              <View style={styles.stateContainer}>
                <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                  No chats found
                </Text>
              </View>
            }
          />
          <TouchableOpacity
            style={[
              styles.newChatButton,
              { backgroundColor: theme === "light" ? "#37a4c8" : "#4db8d4" }
            ]}
            onPress={() => router.push("/chat/chatExplore")}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

export { ModernLoadingIndicator };
