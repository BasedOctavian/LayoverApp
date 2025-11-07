import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  Text,
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Alert,
  RefreshControl,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

import useAuth from "../../hooks/auth";
import useChats from "../../hooks/useChats";
import useUsers from "../../hooks/useUsers";
import TopBar from "../../components/TopBar";
import { ThemeContext } from "../../context/ThemeContext";
import useNotificationCount from "../../hooks/useNotificationCount";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from '../../../config/firebaseConfig';

// Import our new components
import {
  ChatItem,
  SearchBar,
  SectionHeader,
  Chat,
  ConnectionData,
  EventData,
  getPartner,
  getEventStatus,
  sortEventChats,
  getTimestampMs,
  preloadImages
} from "../../components/chatInbox";

// Filter types
type FilterType = 'all' | 'pending' | 'events' | 'groups' | 'active';

// Responsive scaling utilities - iPhone 15 as base (393x852)
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 393; // iPhone 15 width as base reference
const BASE_HEIGHT = 852; // iPhone 15 height as base reference

// Scale function for width-based dimensions (padding, margins, widths, icon sizes)
const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

// Scale function for height-based dimensions (vertical spacing, heights)
const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

// Moderate scaling for font sizes to prevent text from becoming too large/small
const scaleFontSize = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  return Math.round(size * scale);
};

// Moderate scaling for general measurements (border radius, etc.)
const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scaleWidth(size) - size) * factor;
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: scaleHeight(-20),
  },
  container: {
    flex: 1,
    padding: scaleWidth(16),
  },
  filterContainer: {
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(4),
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterPill: {
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(20),
    marginRight: scaleWidth(10),
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: scaleWidth(80),
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#37a4c8',
    borderColor: '#37a4c8',
  },
  filterPillInactive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(55, 164, 200, 0.3)',
  },
  filterText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterTextInactive: {
    color: '#37a4c8',
  },
  filterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: moderateScale(10),
    minWidth: scaleWidth(20),
    height: scaleHeight(20),
    paddingHorizontal: scaleWidth(6),
    marginLeft: scaleWidth(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeInactive: {
    backgroundColor: 'rgba(55, 164, 200, 0.15)',
  },
  filterBadgeText: {
    color: '#37a4c8',
    fontSize: scaleFontSize(11),
    fontWeight: '700',
  },
  filterBadgeTextInactive: {
    color: '#37a4c8',
  },
  chatCard: {
    borderRadius: moderateScale(20),
    marginBottom: scaleHeight(16),
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: scaleHeight(6) },
    shadowOpacity: 0.2,
    shadowRadius: scaleWidth(16),
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
    padding: scaleWidth(20),
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(16),
  },
  imageContainer: {
    marginRight: scaleWidth(16),
    position: 'relative',
    justifyContent: 'center',
  },
  profileImage: {
    width: scaleWidth(56),
    height: scaleHeight(56),
    borderRadius: moderateScale(28),
  },
  chatMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: scaleFontSize(20),
    fontWeight: "700",
    marginBottom: scaleHeight(6),
    letterSpacing: -0.3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scaleHeight(6),
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: 'wrap',
  },
  userAge: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  userLocation: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
    marginLeft: scaleWidth(4),
  },
  chatInfo: {
    marginBottom: scaleHeight(16),
  },
  chatLastMessage: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleHeight(20),
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: scaleHeight(16),
    alignItems: 'center',
  },
  interestTag: {
    backgroundColor: "#37a4c8",
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(6),
    borderRadius: moderateScale(16),
    marginRight: scaleWidth(8),
    marginBottom: scaleHeight(8),
  },
  interestText: {
    color: "#FFFFFF",
    fontSize: scaleFontSize(12),
    fontWeight: "600",
  },
  userMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodIndicator: {
    width: scaleWidth(8),
    height: scaleHeight(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#10B981',
    marginRight: scaleWidth(8),
  },
  moodText: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: scaleHeight(2),
    right: scaleWidth(2),
    width: scaleWidth(14),
    height: scaleHeight(14),
    borderRadius: moderateScale(7),
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
    marginLeft: scaleWidth(8),
  },
  messageTime: {
    fontSize: scaleFontSize(12),
    marginLeft: scaleWidth(4),
  },
  lastSeen: {
    fontSize: scaleFontSize(12),
    marginLeft: scaleWidth(8),
  },
  unreadBadge: {
    position: 'absolute',
    top: scaleHeight(20),
    right: scaleWidth(20),
    backgroundColor: '#37a4c8',
    borderRadius: moderateScale(12),
    minWidth: scaleWidth(24),
    height: scaleHeight(24),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(8),
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  pinButton: {
    padding: scaleWidth(8),
    marginLeft: scaleWidth(8),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  pinButtonActive: {
    backgroundColor: '#37a4c8',
  },
  pinIcon: {
    width: scaleWidth(24),
    height: scaleHeight(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scaleWidth(32),
  },
  errorText: {
    fontSize: scaleFontSize(16),
    textAlign: "center",
    marginBottom: scaleHeight(8),
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: "#37a4c8",
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  listContent: {
    // paddingBottom: 80, // Removed - now handled dynamically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingLogo: {
    width: scaleWidth(100),
    height: scaleHeight(100),
    marginBottom: scaleHeight(16),
  },
  loadingText: {
    fontSize: scaleFontSize(15),
    fontWeight: '500',
    opacity: 0.8,
  },
  emptyText: {
    fontSize: scaleFontSize(18),
    textAlign: "center",
    marginBottom: scaleHeight(8),
    fontWeight: '600',
  },
  emptyIcon: {
    marginBottom: scaleHeight(16),
  },
  emptySubtext: {
    fontSize: scaleFontSize(14),
    textAlign: "center",
    fontWeight: '400',
  },
  placeholderImage: {
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: scaleFontSize(24),
    fontWeight: "600",
  },
  sectionContainer: {
    marginBottom: scaleHeight(24),
  },
  pendingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: scaleHeight(4),
    paddingVertical: scaleHeight(8),
    backgroundColor: 'rgba(55, 164, 200, 0.05)',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.1)',
  },
  pendingText: {
    fontSize: scaleFontSize(14),
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: scaleHeight(8),
    lineHeight: scaleHeight(18),
  },
  connectionTypeText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: '#37a4c8',
    color: '#FFFFFF',
    paddingVertical: scaleHeight(4),
    paddingHorizontal: scaleWidth(10),
    borderRadius: moderateScale(14),
    overflow: 'hidden',
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleHeight(6),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(4),
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: moderateScale(16),
  },
  pendingStatusDot: {
    width: scaleWidth(6),
    height: scaleHeight(6),
    borderRadius: moderateScale(3),
    backgroundColor: '#FFA500',
    marginRight: scaleWidth(6),
  },
  pendingStatusText: {
    fontSize: scaleFontSize(12),
    color: '#FFA500',
    fontWeight: '600',
  },
  deleteAction: {}, // Empty style object instead of undefined
  deleteActionText: {}, // Empty style object instead of undefined 
  pendingActionsContainer: {
    marginTop: scaleHeight(2),
    paddingHorizontal: scaleWidth(6),
    alignItems: 'center',
    width: '100%',
  },
  pendingActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: scaleWidth(16),
  },
  pendingActionButton: {
    flex: 1,
    maxWidth: scaleWidth(120),
    height: scaleHeight(80),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(6),
    borderRadius: moderateScale(14),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.15,
    shadowRadius: scaleWidth(8),
    elevation: 4,
  },
  pendingActionText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    marginTop: scaleHeight(6),
    textAlign: 'center',
  },
  pendingActionIcon: {
    width: scaleWidth(36),
    height: scaleHeight(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(4),
  },
  connectionTypeContainer: {
    marginBottom: scaleHeight(8),
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    // paddingBottom: 120, // Removed - now handled dynamically
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
    shadowOffset: { width: 0, height: scaleHeight(-4) },
    shadowOpacity: 0.15,
    shadowRadius: scaleWidth(12)
  },
  loadMoreButton: {
    padding: scaleWidth(12),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(16),
    marginHorizontal: scaleWidth(8),
    borderWidth: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: scaleWidth(4),
    elevation: 2,
  },
  loadMoreText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  eventImage: {
    backgroundColor: '#37a4c8',
    justifyContent: 'center',
    alignItems: 'center',
    width: scaleWidth(56),
    height: scaleHeight(56),
    borderRadius: moderateScale(28),
  },
  sectionHeader: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    marginBottom: scaleHeight(12),
    marginTop: scaleHeight(16),
    paddingHorizontal: scaleWidth(4),
    color: '#37a4c8',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(12),
    marginTop: scaleHeight(16),
    paddingHorizontal: scaleWidth(4),
    paddingVertical: scaleHeight(8),
    backgroundColor: 'transparent',
  },
  sectionHeaderLine: {
    flex: 1,
    height: scaleHeight(1),
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    marginLeft: scaleWidth(12),
  },
  sectionHeaderText: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
    color: '#37a4c8',
  },
  eventStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scaleHeight(2),
  },
  eventStatusText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  eventDescriptionContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  categoryBadge: {
    backgroundColor: '#37a4c8',
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(12),
    marginBottom: scaleHeight(4),
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(4),
    marginLeft: scaleWidth(8),
  },
  ageBadge: {
    backgroundColor: '#37a4c8',
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(12),
    marginBottom: scaleHeight(4),
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  moreInterestsBadge: {
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: moderateScale(12),
    marginLeft: scaleWidth(4),
  },
  moreInterestsText: {
    color: '#37a4c8',
    fontSize: scaleFontSize(11),
    fontWeight: '600',
  },
  sectionDivider: {
    height: scaleHeight(2),
    backgroundColor: 'rgba(55, 164, 200, 0.3)',
    marginVertical: scaleHeight(12),
    marginHorizontal: scaleWidth(4),
    borderRadius: moderateScale(1),
  },
  fixedDivider: {
    height: scaleHeight(1),
    backgroundColor: 'rgba(55, 164, 200, 0.3)',
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(2.4),
    marginHorizontal: scaleWidth(4),
    borderRadius: moderateScale(1),
  },
});


export default function ChatInbox() {
  const { user } = useAuth();
  const { getChats, subscribeToChat } = useChats();
  const { getUser } = useUsers();
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const params = useLocalSearchParams();
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  // State variables
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [pendingChats, setPendingChats] = useState<Chat[]>([]);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Helper function to get filter from params
  const getFilterFromParams = (): FilterType => {
    if (params.filter && typeof params.filter === 'string') {
      const filterParam = params.filter as FilterType;
      if (['all', 'pending', 'events', 'groups', 'active'].includes(filterParam)) {
        return filterParam;
      }
    }
    return 'all';
  };
  
  const [activeFilter, setActiveFilter] = useState<FilterType>(() => {
    // Initialize from URL params if available
    if (params.filter && typeof params.filter === 'string') {
      const filterParam = params.filter as FilterType;
      if (['all', 'pending', 'events', 'groups', 'active'].includes(filterParam)) {
        return filterParam;
      }
    }
    return 'all';
  });

  // Animation values for bounce effect
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  
  // Track filter changes for item animations
  const [filterChangeKey, setFilterChangeKey] = useState(0);
  const prevFilterRef = useRef<FilterType>(activeFilter);

  // Dynamic styles that depend on safe area insets
  const dynamicStyles = useMemo(() => ({
    listContent: {
      paddingTop: scaleHeight(16),
      paddingBottom: scaleHeight(80) + insets.bottom,
    },
    newChatButton: {
      position: "absolute" as const,
      bottom: scaleHeight(40) + insets.bottom,
      right: scaleWidth(32),
      width: scaleWidth(56),
      height: scaleHeight(56),
      borderRadius: moderateScale(28),
      alignItems: "center" as const,
      justifyContent: "center" as const,
      elevation: 4,
      shadowColor: "#38a5c9",
      shadowOffset: { width: 0, height: scaleHeight(4) },
      shadowOpacity: 0.15,
      shadowRadius: scaleWidth(12),
    },
    scrollViewContent: {
      flexGrow: 1,
      paddingBottom: scaleHeight(120) + insets.bottom,
    },
  }), [insets.bottom]);

  // Update filter when URL params change (only when params.filter actually changes)
  useEffect(() => {
    // Only respond to URL param changes, not to activeFilter or chats changes
    if (!params.filter) {
      // No filter param in URL - don't override user's manual selection
      return;
    }
    
    const newFilter = getFilterFromParams();
    // Only update if URL param is explicitly set
    // If no chats and trying to set to pending, default to 'all' instead
    if (chats.length === 0 && newFilter === 'pending') {
      setActiveFilter('all');
    } else {
      setActiveFilter(newFilter);
    }
  }, [params.filter]); // Only depend on params.filter, not activeFilter or chats

  useEffect(() => {
    if (user) {
      handleRefresh();
    }
  }, [user]);

  // Set up real-time listeners for new messages and chat updates
  useEffect(() => {
    if (!user) return;

    const unsubscribes: Unsubscribe[] = [];

    // Helper function to refresh chats without showing loading indicator
    const refreshChatsSilently = async () => {
      try {
        // Query pending connections where user is a participant (received requests only)
        const pendingConnectionsQuery = query(
          collection(db, 'connections'),
          where('participants', 'array-contains', user.uid),
          where('status', '==', 'pending')
        );

        // Query pending group join requests where user is the requester
        const pendingGroupJoinRequestsQuery = query(
          collection(db, 'groupJoinRequests'),
          where('userId', '==', user.uid),
          where('status', '==', 'pending')
        );

        const [allChats, connectionsSnapshot, eventsSnapshot, groupsSnapshot, groupJoinRequestsSnapshot] = await Promise.all([
          getChats(),
          getDocs(pendingConnectionsQuery),
          getDocs(query(collection(db, 'events'), where('attendees', 'array-contains', user.uid))),
          getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid))),
          getDocs(pendingGroupJoinRequestsQuery)
        ]);

        let eventChats: Chat[] = [];
        if (eventsSnapshot) {
          eventChats = eventsSnapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
              id: data.eventUID || doc.id,
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
        }

        // Process group chats
        let groupChats: Chat[] = [];
        if (groupsSnapshot) {
          const groupChatPromises = groupsSnapshot.docs.map(async (groupDoc: any) => {
            const data = groupDoc.data();
            let lastMessage = data.lastMessage;
            let lastMessageTime = data.lastMessageTime || data.updatedAt || data.createdAt;
            
            if (data.chatRoomId) {
              try {
                const chatDocRef = doc(db, 'chats', data.chatRoomId);
                const chatDoc = await getDoc(chatDocRef);
                if (chatDoc.exists()) {
                  const chatData = chatDoc.data();
                  if (chatData.lastMessage) {
                    lastMessage = chatData.lastMessage;
                  }
                  if (chatData.lastMessageTime) {
                    lastMessageTime = chatData.lastMessageTime;
                  }
                  const chatUnreadCount = chatData.unreadCount?.[user.uid] || 0;
                  return {
                    id: groupDoc.id,
                    isGroupChat: true,
                    groupId: groupDoc.id,
                    groupName: data.name,
                    groupImage: data.groupImage,
                    description: data.description,
                    type: 'group' as const,
                    lastMessage: lastMessage,
                    lastMessageTime: lastMessageTime,
                    unreadCount: chatUnreadCount || data.unreadCount?.[user.uid] || 0,
                    participants: data.members || [],
                    memberCount: data.memberCount || (data.members?.length || 0),
                    status: 'active' as const,
                    isPinned: false,
                  } as Chat;
                }
              } catch (error) {
                console.error('Error fetching chat data for group:', groupDoc.id, error);
              }
            }
            
            return {
              id: groupDoc.id,
              isGroupChat: true,
              groupId: groupDoc.id,
              groupName: data.name,
              groupImage: data.groupImage,
              description: data.description,
              type: 'group' as const,
              lastMessage: lastMessage,
              lastMessageTime: lastMessageTime,
              unreadCount: data.unreadCount?.[user.uid] || 0,
              participants: data.members || [],
              memberCount: data.memberCount || (data.members?.length || 0),
              status: 'active' as const,
              isPinned: false,
            } as Chat;
          });
          
          groupChats = await Promise.all(groupChatPromises);
        }

        if (allChats) {
          const userChats = allChats
            .filter((chat: any) => 
              chat.participants && 
              Array.isArray(chat.participants) && 
              chat.participants.includes(user.uid) &&
              !chat.isGroupChat &&
              !chat.isEventChat
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
                status: 'pending' as const,
                lastMessage: data.lastMessage,
                lastMessageTime: data.lastMessageTime,
                unreadCount: data.unreadCount || 0,
                isPinned: data.isPinned || false,
                lastMessageStatus: data.lastMessageStatus,
                participants: data.participants || [],
                connectionId: doc.id,
                initiator: data.initiator
              } as Chat;
            });

          const pendingGroupJoinRequests: Chat[] = [];
          if (groupJoinRequestsSnapshot && groupJoinRequestsSnapshot.docs.length > 0) {
            const groupRequestPromises = groupJoinRequestsSnapshot.docs.map(async (requestDoc: any) => {
              const requestData = requestDoc.data();
              try {
                const groupDocRef = doc(db, 'groups', requestData.groupId);
                const groupDoc = await getDoc(groupDocRef);
                if (groupDoc.exists()) {
                  const groupData = groupDoc.data();
                  return {
                    id: `group-request-${requestDoc.id}`,
                    status: 'pending' as const,
                    isGroupChat: true,
                    groupId: requestData.groupId,
                    groupName: groupData.name,
                    groupImage: groupData.groupImage,
                    groupDescription: groupData.description,
                    lastMessage: `Request to join ${groupData.name}`,
                    lastMessageTime: requestData.createdAt || Timestamp.now(),
                    unreadCount: 0,
                    isPinned: false,
                    participants: [user.uid],
                    memberCount: groupData.memberCount || (groupData.members?.length || 0),
                    type: 'group' as const,
                  } as Chat;
                }
              } catch (error) {
                console.error('Error fetching group for join request:', requestData.groupId, error);
              }
              return null;
            });
            
            const groupRequests = await Promise.all(groupRequestPromises);
            pendingGroupJoinRequests.push(...groupRequests.filter((req): req is Chat => req !== null));
          }

          const userChatsPending = userChats.filter((chat: Chat) => chat.status === 'pending');
          const pending = [...pendingConnections, ...pendingGroupJoinRequests, ...userChatsPending];
          const active = userChats.filter((chat: Chat) => chat.status === 'active');
          
          const allNonEventChats = [...pending, ...active];
          const partnerIds = new Set<string>();
          
          allNonEventChats.forEach(chat => {
            if (!chat.isEventChat && !chat.isGroupChat && chat.participants) {
              const partnerId = chat.participants.find(id => id !== user.uid);
              if (partnerId) {
                partnerIds.add(partnerId);
              }
            }
          });

          const partnerDataPromises = Array.from(partnerIds).map(async (partnerId) => {
            try {
              const partner = await getPartner(partnerId);
              return { partnerId, partner };
            } catch (error) {
              console.error('Error loading partner:', partnerId, error);
              return { partnerId, partner: null };
            }
          });

          const partnerResults = await Promise.all(partnerDataPromises);
          const partnerDataMap = new Map(
            partnerResults
              .filter(result => result.partner !== null)
              .map(result => [result.partnerId, result.partner])
          );

          const chatsWithPartnerData = allNonEventChats.map(chat => {
            if (!chat.isEventChat && !chat.isGroupChat && chat.participants) {
              const partnerId = chat.participants.find(id => id !== user.uid);
              if (partnerId && partnerDataMap.has(partnerId)) {
                return {
                  ...chat,
                  partnerData: partnerDataMap.get(partnerId)
                };
              }
            }
            return chat;
          });

          const pendingWithData = chatsWithPartnerData.filter(chat => chat.status === 'pending');
          const activeWithData = chatsWithPartnerData.filter(chat => chat.status === 'active');
          
          const allCombined = [...pendingWithData, ...eventChats, ...groupChats, ...activeWithData];
          setPendingChats(pendingWithData);
          setActiveChats(activeWithData);
          setChats(allCombined);
        }
      } catch (error) {
        console.error('Error refreshing chats silently:', error);
      }
    };

    // Listen to chats collection where user is a participant
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribeChats = onSnapshot(
      chatsQuery,
      () => {
        refreshChatsSilently();
      },
      (error) => {
        console.error('Error listening to chats:', error);
      }
    );
    unsubscribes.push(unsubscribeChats);

    // Listen to connections collection where user is a participant
    const connectionsQuery = query(
      collection(db, 'connections'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubscribeConnections = onSnapshot(
      connectionsQuery,
      () => {
        refreshChatsSilently();
      },
      (error) => {
        console.error('Error listening to connections:', error);
      }
    );
    unsubscribes.push(unsubscribeConnections);

    // Listen to events collection where user is an attendee
    const eventsQuery = query(
      collection(db, 'events'),
      where('attendees', 'array-contains', user.uid)
    );
    const unsubscribeEvents = onSnapshot(
      eventsQuery,
      () => {
        refreshChatsSilently();
      },
      (error) => {
        console.error('Error listening to events:', error);
      }
    );
    unsubscribes.push(unsubscribeEvents);

    // Listen to groups collection where user is a member
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );
    const unsubscribeGroups = onSnapshot(
      groupsQuery,
      () => {
        refreshChatsSilently();
      },
      (error) => {
        console.error('Error listening to groups:', error);
      }
    );
    unsubscribes.push(unsubscribeGroups);

    // Listen to group join requests where user is the requester
    const groupJoinRequestsQuery = query(
      collection(db, 'groupJoinRequests'),
      where('userId', '==', user.uid)
    );
    const unsubscribeGroupJoinRequests = onSnapshot(
      groupJoinRequestsQuery,
      () => {
        refreshChatsSilently();
      },
      (error) => {
        console.error('Error listening to group join requests:', error);
      }
    );
    unsubscribes.push(unsubscribeGroupJoinRequests);

    // Cleanup all listeners on unmount
    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user, getChats, getPartner]);

  // Set initialLoadComplete when data is ready
  useEffect(() => {
    if (hasLoadedOnce && chats.length >= 0) {
      setInitialLoadComplete(true);
    }
  }, [hasLoadedOnce, chats.length]);

  // Trigger bounce animation when loading completes
  useEffect(() => {
    if (initialLoadComplete) {
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
  }, [initialLoadComplete]);

  const handleRefresh = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      // Query pending connections where user is a participant (received requests only)
      const pendingConnectionsQuery = query(
        collection(db, 'connections'),
        where('participants', 'array-contains', user.uid),
        where('status', '==', 'pending')
      );

      // Query pending group join requests where user is the requester
      const pendingGroupJoinRequestsQuery = query(
        collection(db, 'groupJoinRequests'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );

      const [allChats, connectionsSnapshot, eventsSnapshot, groupsSnapshot, groupJoinRequestsSnapshot] = await Promise.all([
        getChats(),
        getDocs(pendingConnectionsQuery),
        getDocs(query(collection(db, 'events'), where('attendees', 'array-contains', user.uid))),
        getDocs(query(collection(db, 'groups'), where('members', 'array-contains', user.uid))),
        getDocs(pendingGroupJoinRequestsQuery)
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

      // Process group chats
      let groupChats: Chat[] = [];
      if (groupsSnapshot) {
        console.log('👥 Processing group chats for user:', user.uid);
        
        // Fetch chat data for each group in parallel
        const groupChatPromises = groupsSnapshot.docs.map(async (groupDoc: any) => {
          const data = groupDoc.data();
          let lastMessage = data.lastMessage;
          let lastMessageTime = data.lastMessageTime || data.updatedAt || data.createdAt;
          
          // If group has a chatRoomId, fetch the chat document to get the actual lastMessage
          if (data.chatRoomId) {
            try {
              const chatDocRef = doc(db, 'chats', data.chatRoomId);
              const chatDoc = await getDoc(chatDocRef);
              if (chatDoc.exists()) {
                const chatData = chatDoc.data();
                // Use chat document's lastMessage and lastMessageTime if available
                if (chatData.lastMessage) {
                  lastMessage = chatData.lastMessage;
                }
                if (chatData.lastMessageTime) {
                  lastMessageTime = chatData.lastMessageTime;
                }
                // Also get unreadCount from chat document if it exists
                const chatUnreadCount = chatData.unreadCount?.[user.uid] || 0;
                return {
                  id: groupDoc.id, // Use group ID directly
                  isGroupChat: true,
                  groupId: groupDoc.id,
                  groupName: data.name,
                  groupImage: data.groupImage,
                  description: data.description,
                  type: 'group' as const,
                  lastMessage: lastMessage,
                  lastMessageTime: lastMessageTime,
                  unreadCount: chatUnreadCount || data.unreadCount?.[user.uid] || 0,
                  participants: data.members || [],
                  memberCount: data.memberCount || (data.members?.length || 0),
                  status: 'active' as const,
                  isPinned: false,
                } as Chat;
              }
            } catch (error) {
              console.error('Error fetching chat data for group:', groupDoc.id, error);
            }
          }
          
          // Fallback to group document data if chatRoomId doesn't exist or fetch failed
          return {
            id: groupDoc.id, // Use group ID directly
            isGroupChat: true,
            groupId: groupDoc.id,
            groupName: data.name,
            groupImage: data.groupImage,
            description: data.description,
            type: 'group' as const,
            lastMessage: lastMessage,
            lastMessageTime: lastMessageTime,
            unreadCount: data.unreadCount?.[user.uid] || 0,
            participants: data.members || [],
            memberCount: data.memberCount || (data.members?.length || 0),
            status: 'active' as const,
            isPinned: false,
          } as Chat;
        });
        
        groupChats = await Promise.all(groupChatPromises);
        console.log('👥 Converted groups to chats:', groupChats.length);
      }

      if (allChats) {
        const userChats = allChats
          .filter((chat: any) => 
            chat.participants && 
            Array.isArray(chat.participants) && 
            chat.participants.includes(user.uid) &&
            !chat.isGroupChat && // Exclude group chats as they're fetched separately
            !chat.isEventChat    // Exclude event chats as they're fetched separately
          )
          .map((chat: any) => ({
            ...chat,
            status: chat.status || 'active',
            participants: chat.participants || []
          })) as Chat[];

        // Process pending connections - show both sent and received requests
        console.log('📥 Processing pending connections:', connectionsSnapshot.docs.length);
        const pendingConnections = connectionsSnapshot.docs
          .map((doc: any) => {
            const data = doc.data() as ConnectionData;
            return {
              id: doc.id,
              status: 'pending' as const,
              lastMessage: data.lastMessage,
              lastMessageTime: data.lastMessageTime,
              unreadCount: data.unreadCount || 0,
              isPinned: data.isPinned || false,
              lastMessageStatus: data.lastMessageStatus,
              participants: data.participants || [],
              connectionId: doc.id,
              initiator: data.initiator // Store initiator to avoid re-fetching in ChatItem
            } as Chat;
          });
        console.log('✅ Processed pending connections:', pendingConnections.length);

        // Process pending group join requests
        console.log('👥 Processing pending group join requests:', groupJoinRequestsSnapshot.docs.length);
        const pendingGroupJoinRequests: Chat[] = [];
        if (groupJoinRequestsSnapshot && groupJoinRequestsSnapshot.docs.length > 0) {
          // Fetch group data for each join request
          const groupRequestPromises = groupJoinRequestsSnapshot.docs.map(async (requestDoc: any) => {
            const requestData = requestDoc.data();
            try {
              // Fetch the group to get its details
              const groupDocRef = doc(db, 'groups', requestData.groupId);
              const groupDoc = await getDoc(groupDocRef);
              if (groupDoc.exists()) {
                const groupData = groupDoc.data();
                return {
                  id: `group-request-${requestDoc.id}`, // Unique ID for the request
                  status: 'pending' as const,
                  isGroupChat: true,
                  groupId: requestData.groupId,
                  groupName: groupData.name,
                  groupImage: groupData.groupImage,
                  groupDescription: groupData.description,
                  lastMessage: `Request to join ${groupData.name}`,
                  lastMessageTime: requestData.createdAt || Timestamp.now(),
                  unreadCount: 0,
                  isPinned: false,
                  participants: [user.uid], // User who made the request
                  memberCount: groupData.memberCount || (groupData.members?.length || 0),
                  type: 'group' as const,
                } as Chat;
              }
            } catch (error) {
              console.error('Error fetching group for join request:', requestData.groupId, error);
            }
            return null;
          });
          
          const groupRequests = await Promise.all(groupRequestPromises);
          pendingGroupJoinRequests.push(...groupRequests.filter((req): req is Chat => req !== null));
        }
        console.log('✅ Processed pending group join requests:', pendingGroupJoinRequests.length);

        // Separate user chats into pending and active
        const userChatsPending = userChats.filter((chat: Chat) => chat.status === 'pending');
        const pending = [...pendingConnections, ...pendingGroupJoinRequests, ...userChatsPending];
        const active = userChats.filter((chat: Chat) => chat.status === 'active');
        
        // Preload all partner data for regular user chats (not events or groups)
        const allNonEventChats = [...pending, ...active];
        const partnerIds = new Set<string>();
        
        allNonEventChats.forEach(chat => {
          if (!chat.isEventChat && !chat.isGroupChat && chat.participants) {
            const partnerId = chat.participants.find(id => id !== user.uid);
            if (partnerId) {
              partnerIds.add(partnerId);
            }
          }
        });

        console.log('📥 Preloading partner data for', partnerIds.size, 'users');
        
        // Load all partner data in parallel
        const partnerDataPromises = Array.from(partnerIds).map(async (partnerId) => {
          try {
            const partner = await getPartner(partnerId);
            return { partnerId, partner };
          } catch (error) {
            console.error('Error loading partner:', partnerId, error);
            return { partnerId, partner: null };
          }
        });

        const partnerResults = await Promise.all(partnerDataPromises);
        const partnerDataMap = new Map(
          partnerResults
            .filter(result => result.partner !== null)
            .map(result => [result.partnerId, result.partner])
        );

        console.log('✅ Loaded partner data for', partnerDataMap.size, 'users');

        // Preload all profile pictures
        const profilePictureUrls = Array.from(partnerDataMap.values())
          .map(partner => partner?.profilePicture ?? null)
          .filter((url): url is string => url !== null);

        console.log('🖼️ Preloading', profilePictureUrls.length, 'profile pictures');
        await preloadImages(profilePictureUrls);
        console.log('✅ Profile pictures preloaded');

        // Attach partner data to regular user chats only
        const chatsWithPartnerData = allNonEventChats.map(chat => {
          if (!chat.isEventChat && !chat.isGroupChat && chat.participants) {
            const partnerId = chat.participants.find(id => id !== user.uid);
            if (partnerId && partnerDataMap.has(partnerId)) {
              return {
                ...chat,
                partnerData: partnerDataMap.get(partnerId)
              };
            }
          }
          return chat;
        });

        // Separate back into pending and active with partner data
        const pendingWithData = chatsWithPartnerData.filter(chat => chat.status === 'pending');
        const activeWithData = chatsWithPartnerData.filter(chat => chat.status === 'active');
        
        // Combine chats in the correct order: pending first, then events, then groups, then active chats
        const allCombined = [...pendingWithData, ...eventChats, ...groupChats, ...activeWithData];
        console.log('📊 Chat counts:', {
          pending: pendingWithData.length,
          events: eventChats.length,
          groups: groupChats.length,
          active: activeWithData.length,
          total: allCombined.length
        });
        setPendingChats(pendingWithData);
        setActiveChats(activeWithData);
        setChats(allCombined);
        // Initial filter will be applied by the useEffect
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
      setHasLoadedOnce(true);
    }
  };

  const applyFilters = useCallback((searchText: string = searchQuery, filter: FilterType = activeFilter) => {
    let filtered = [...chats];

    // Apply type filter first
    if (filter === 'all') {
      // "All" filter shows only active chats (excludes pending)
      filtered = filtered.filter(chat => chat.status !== 'pending');
    } else {
      filtered = filtered.filter(chat => {
        switch (filter) {
          case 'pending':
            return chat.status === 'pending';
          case 'events':
            return chat.isEventChat;
          case 'groups':
            return chat.isGroupChat;
          case 'active':
            return chat.status === 'active' && !chat.isEventChat && !chat.isGroupChat;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(chat => {
        if (chat.isEventChat) {
          return (
            chat.eventName?.toLowerCase().includes(searchLower) ||
            chat.category?.toLowerCase().includes(searchLower) ||
            chat.airportCode?.toLowerCase().includes(searchLower)
          );
        }
        if (chat.isGroupChat) {
          return (
            chat.groupName?.toLowerCase().includes(searchLower) ||
            chat.description?.toLowerCase().includes(searchLower)
          );
        }
        // For regular chats, search in partner name if available
        if (chat.partnerData?.name) {
          return chat.partnerData.name.toLowerCase().includes(searchLower);
        }
        return false;
      });
    }

    setFilteredChats(filtered);
  }, [chats, searchQuery, activeFilter]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(text, activeFilter);
  };

  const handleFilterChange = (filter: FilterType) => {
    // Prevent switching to pending when there are no chats and no explicit filter param
    if (filter === 'pending' && chats.length === 0 && !params.filter) {
      // Keep it on 'all' if no chats and no explicit filter param
      return;
    }
    
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Trigger animation when filter changes
    if (prevFilterRef.current !== filter) {
      setFilterChangeKey(prev => prev + 1);
      prevFilterRef.current = filter;
    }
    
    setActiveFilter(filter);
    applyFilters(searchQuery, filter);
  };

  // Reapply filters when chats change
  useEffect(() => {
    applyFilters(searchQuery, activeFilter);
  }, [chats]);

  const handlePinChat = async (chat: Chat) => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
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

  const getFlattenedList = () => {
    // Sort chats based on type and recency
    const sortedChats = [...filteredChats].sort((a, b) => {
      // Pending first
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      
      // Then pinned chats for active
      if (a.status === 'active' && b.status === 'active') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      
      // Events sorted by time
      if (a.isEventChat && b.isEventChat) {
        const aStatus = getEventStatus(a.startTime);
        const bStatus = getEventStatus(b.startTime);
        const aTime = getTimestampMs(a.startTime as any);
        const bTime = getTimestampMs(b.startTime as any);
        return aTime - bTime; // Earlier events first
      }
      
      // Sort by last message time
      const aTime = getTimestampMs(a.lastMessageTime);
      const bTime = getTimestampMs(b.lastMessageTime);
      return bTime - aTime; // Most recent first
    });
    
    return sortedChats;
  };

  // Get counts for filter badges
  const filterCounts = useMemo(() => {
    return {
      pending: chats.filter(c => c.status === 'pending').length,
      events: chats.filter(c => c.isEventChat).length,
      groups: chats.filter(c => c.isGroupChat).length,
      active: chats.filter(c => c.status === 'active' && !c.isEventChat && !c.isGroupChat).length,
    };
  }, [chats]);

  const renderItem = ({ item, index }: { item: Chat, index: number }) => {
    return (
      <ChatItem
        key={`${item.id}-${activeFilter}-${filterChangeKey}`}
        chat={item}
        currentUser={user!}
        getUser={getPartner}
        onPress={() => {
          if (item.isEventChat) {
            router.push(`/event/eventChat/${item.eventId}`);
          } else if (item.isGroupChat) {
            // For pending group join requests, navigate to group profile
            // For active group chats, navigate to group chat
            if (item.status === 'pending' && item.groupId) {
              router.push(`/group/${item.groupId}`);
            } else if (item.groupId) {
              router.push(`/group/chat/${item.groupId}`);
            }
          } else {
            router.push(`/chat/${item.id}`);
          }
        }}
        onPinPress={() => handlePinChat(item)}
        onAccept={handleAcceptChat}
        setPendingChats={setPendingChats}
        setChats={setChats}
        setFilteredChats={setFilteredChats}
        index={index}
      />
    );
  };

  const renderFilterPill = (filter: FilterType, label: string, count?: number) => {
    const isActive = activeFilter === filter;
    // Show count badge on pending filter even when not active
    const showBadge = count !== undefined && count > 0 && (isActive || filter === 'pending');
    
    return (
      <TouchableOpacity
        key={filter}
        style={[
          styles.filterPill,
          isActive ? styles.filterPillActive : styles.filterPillInactive,
        ]}
        onPress={() => handleFilterChange(filter)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.filterText,
            isActive ? styles.filterTextActive : styles.filterTextInactive,
          ]}
        >
          {label}
        </Text>
        {showBadge && (
          <View style={[
            styles.filterBadge,
            !isActive && filter === 'pending' && styles.filterBadgeInactive
          ]}>
            <Text style={[
              styles.filterBadgeText,
              !isActive && filter === 'pending' && styles.filterBadgeTextInactive
            ]}>
              {count > 99 ? '99+' : count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <TopBar 
          showBackButton={false}
          title=""
          showNotifications={true}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
        />
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        
        {/* Show loading screen during initial load */}
        {!initialLoadComplete ? (
          <View style={{ flex: 1, backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }} />
        ) : (
          <Animated.View 
            style={{ 
              flex: 1,
              opacity: contentBounceAnim,
              transform: [
                { scale: contentScaleAnim },
                {
                  translateY: contentBounceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [scaleHeight(30), 0]
                  })
                }
              ]
            }}
          >
            {/* Chat Inbox Content */}
            <View style={styles.container}>
              <SearchBar 
                value={searchQuery}
                onChangeText={handleSearch}
                theme={theme}
              />
              
              {/* Filter Pills */}
              <View style={styles.filterContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterScrollView}
                >
                  {renderFilterPill('all', 'All')}
                  {renderFilterPill('pending', 'Pending', filterCounts.pending)}
                  {renderFilterPill('events', 'Events', filterCounts.events)}
                  {renderFilterPill('groups', 'Groups', filterCounts.groups)}
                  {renderFilterPill('active', 'Active', filterCounts.active)}
                </ScrollView>
              </View>
              
              <FlatList
                data={getFlattenedList()}
                renderItem={renderItem}
                keyExtractor={(item) => `${item.id}-${activeFilter}`}
                contentContainerStyle={dynamicStyles.listContent}
                showsVerticalScrollIndicator={false}
                extraData={filterChangeKey}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    tintColor={theme === "light" ? "#37a4c8" : "#4db8d4"}
                  />
                }
                ListEmptyComponent={
                  // Only show empty state after we've loaded data at least once
                  !isRefreshing && filteredChats.length === 0 ? (
                    <View style={styles.stateContainer}>
                      <Ionicons 
                        name={
                          activeFilter === 'pending' ? 'hourglass-outline' :
                          activeFilter === 'events' ? 'calendar-outline' :
                          activeFilter === 'groups' ? 'people-outline' :
                          'chatbubbles-outline'
                        } 
                        size={scaleWidth(64)} 
                        color={theme === "light" ? "#64748B" : "#94A3B8"} 
                        style={styles.emptyIcon} 
                      />
                      <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                        {searchQuery ? "No matching chats" : 
                         activeFilter === 'pending' ? "No pending requests" :
                         activeFilter === 'events' ? "No event chats" :
                         activeFilter === 'groups' ? "No group chats" :
                         activeFilter === 'active' ? "No active chats" :
                         "No chats found"}
                      </Text>
                      <Text style={[styles.emptySubtext, { color: theme === "light" ? "#94A3B8" : "#64748B" }]}>
                        {searchQuery ? "Try a different search term" : 
                         activeFilter === 'pending' ? "Pending connection requests will appear here" :
                         activeFilter === 'events' ? "Join an event to start chatting" :
                         activeFilter === 'groups' ? "Create or join a group to get started" :
                         "Start a conversation to see your chats here"}
                      </Text>
                    </View>
                  ) : null
                }
              />
              <TouchableOpacity
                style={[
                  dynamicStyles.newChatButton,
                  { backgroundColor: theme === "light" ? "#37a4c8" : "#4db8d4" }
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  router.push("/chat/chatExplore");
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={scaleWidth(32)} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

