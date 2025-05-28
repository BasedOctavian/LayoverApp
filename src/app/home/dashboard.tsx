import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  Modal,
  Linking,
} from "react-native";
import { Ionicons, FontAwesome5, MaterialIcons, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import * as Location from "expo-location";
import useAirports, { Airport } from "../../hooks/useAirports";
import useEvents from "../../hooks/useEvents";
import useSportEvents from "../../hooks/useSportEvents";
import useUsers from "../../hooks/useUsers";
import { serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNearestAirports } from "../../hooks/useNearestAirports";
import { useFilteredEvents } from "../../hooks/useFilteredEvents";
import StatusSheet from "../../components/StatusSheet";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";

type FeatureButton = {
  icon: React.ReactNode;
  title: string;
  screen: string;
};

type NearbyUser = {
  id: string;
  name: string;
  status: string;
  isInviteCard?: boolean;
};

interface UserData {
  id: string;
  name?: string;
  moodStatus?: string;
  airportCode?: string;
  lastLogin?: any;
}

function haversineDistance(lat1: number, long1: number, lat2: number, long2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLong = toRad(long2 - long1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLong / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"airports" | "events">("airports");
  const { getEvents } = useEvents();
  const [events, setEvents] = useState<any[]>([]);
  const { updateUser, updateUserLocationAndLogin, getNearbyUsers } = useUsers();
  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const { getSportEvents } = useSportEvents();
  const [allSportEvents, setAllSportEvents] = useState<any[]>([]);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];
  const [customStatus, setCustomStatus] = useState("");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [updatingMood, setUpdatingMood] = useState(false);
  const [searchHeaderHeight, setSearchHeaderHeight] = useState(0);
  const [defaultSearchHeight, setDefaultSearchHeight] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [popupData, setPopupData] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  }>({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);

  const hasUpdatedRef = useRef(false);

  const showPopup = (title: string, message: string, type: "success" | "error") => {
    setPopupData({ visible: true, title, message, type });
    setTimeout(() => setPopupData((prev) => ({ ...prev, visible: false })), 3000);
  };

  const handleUpdateMoodStatus = async (status: string) => {
    if (!userId) return;
    setUpdatingMood(true);
    setIsUpdating(true);
    try {
      const updatedData = {
        moodStatus: status,
        updatedAt: serverTimestamp(),
      };
      await updateUser(userId, updatedData);
    } catch (error) {
      console.error(error);
    } finally {
      setUpdatingMood(false);
      setIsUpdating(false);
    }
  };

  const toggleStatusSheet = () => {
    Animated.spring(sheetAnim, {
      toValue: showStatusSheet ? 0 : 1,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
    setShowStatusSheet(!showStatusSheet);
  };
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setUserId(user.uid);
      } else {
        router.replace("login/login");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Request location permission and get location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            lat: location.coords.latitude,
            long: location.coords.longitude,
          });
        }

        // Load events and sport events in parallel
        const [eventsData, sportEventsData] = await Promise.all([
          getEvents(),
          getSportEvents(),
        ]);

        if (eventsData) setEvents(eventsData);
        if (sportEventsData) setAllSportEvents(sportEventsData);

        // Load airports
        const fetchedAirports = await getAirports();
        if (fetchedAirports) setAllAirports(fetchedAirports);

        // Set initial load complete
        setInitialLoadComplete(true);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        showPopup("Error", "Failed to load dashboard data", "error");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      initializeDashboard();
    }
  }, [userId]);

  useEffect(() => {
    const loadEvents = async () => {
      const eventsData = await getEvents();
      if (eventsData) setEvents(eventsData);
    };
    loadEvents();
  }, []);

  useEffect(() => {
    const loadSportEvents = async () => {
      const eventsData = await getSportEvents();
      if (eventsData) setAllSportEvents(eventsData);
    };
    loadSportEvents();
  }, [getSportEvents]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: location.coords.latitude,
        long: location.coords.longitude,
      });
    })();
  }, []);

  const { getAirports } = useAirports();
  useEffect(() => {
    const fetchAirports = async () => {
      const fetchedAirports = await getAirports();
      if (fetchedAirports) setAllAirports(fetchedAirports);
    };
    fetchAirports();
  }, [getAirports]);

  const nearestAirports = useNearestAirports(userLocation, allAirports);

  useEffect(() => {
    if (!selectedAirport && nearestAirports.closest) {
      setSelectedAirport(nearestAirports.closest);
    }
  }, [nearestAirports.closest, selectedAirport]);

  useEffect(() => {
    if (userId && nearestAirports.closest && !hasUpdatedRef.current) {
      hasUpdatedRef.current = true; // Mark as updated to prevent re-runs
      updateUserLocationAndLogin(userId, nearestAirports.closest.airportCode);
      console.log("Updated user location and login");
    }
  }, [userId, nearestAirports.closest, updateUserLocationAndLogin]);

  const { filteredRegularEvents, matchingSportEvents } = useFilteredEvents(selectedAirport, events, allSportEvents);
  const allEvents = [...matchingSportEvents, ...filteredRegularEvents];

  useEffect(() => {
    const fetchNearbyUsers = async () => {
      if (!selectedAirport?.airportCode) return;
      
      try {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const users = await getNearbyUsers(selectedAirport.airportCode, thirtyMinutesAgo) as UserData[];
        
        // Convert users to NearbyUser format and limit to 3
        const formattedUsers = users
          .filter(user => user.id !== userId) // Exclude current user
          .slice(0, 3)
          .map(user => ({
            id: user.id,
            name: user.name || 'Anonymous',
            status: user.moodStatus || 'Available'
          }));

        // Generate a unique timestamp for this batch of invite cards
        const timestamp = Date.now();
        
        // If we have fewer than 3 users, add "Invite Friends" cards with unique IDs
        const inviteFriendsCards = Array(3 - formattedUsers.length)
          .fill(null)
          .map((_, index) => ({
            id: `invite-${timestamp}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            name: 'Invite Friends',
            status: 'Click to invite',
            isInviteCard: true
          }));

        setNearbyUsers([...formattedUsers, ...inviteFriendsCards]);
      } catch (error) {
        console.error('Error fetching nearby users:', error);
        setNearbyUsers([]);
      }
    };

    fetchNearbyUsers();
  }, [selectedAirport?.airportCode, userId]);

  const features: FeatureButton[] = [
    { icon: <FontAwesome5 name="user-friends" size={24} color="#38a5c9" />, title: "Nearby Users", screen: "swipe" },
    { icon: <Feather name="plus" size={24} color="#38a5c9" />, title: "Create Event", screen: "eventCreation" },
    { icon: <MaterialIcons name="event" size={24} color="#38a5c9" />, title: "Events", screen: "home" },
    { icon: <MaterialIcons name="message" size={24} color="#38a5c9" />, title: "Messages", screen: "chat/chatInbox" },
    { icon: <Feather name="user" size={24} color="#38a5c9" />, title: "Profile", screen: userId ? `profile/${userId}` : "profile" },
    { icon: <Ionicons name="settings" size={24} color="#38a5c9" />, title: "Settings", screen: "settings/settings" },
  ];

  const refreshData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const [eventsData, sportEventsData] = await Promise.all([
        getEvents(),
        getSportEvents(),
      ]);

      if (eventsData) setEvents(eventsData);
      if (sportEventsData) setAllSportEvents(sportEventsData);

      const fetchedAirports = await getAirports();
      if (fetchedAirports) setAllAirports(fetchedAirports);
    } catch (error) {
      console.error("Error refreshing data:", error);
      showPopup("Error", "Failed to refresh data", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredResults =
    searchType === "airports"
      ? (nearestAirports?.tenClosest || []).filter((airport: Airport) => 
          airport?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
      : (allEvents || []).filter((event) => 
          event?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const dashboardData = [
    { type: "section", id: "users", data: nearbyUsers || [] },
    { type: "section", id: "events", data: allEvents || [] },
    { type: "spacer", id: "spacer1" },
    ...features.map((feature, index) => ({ type: "feature", id: index.toString(), data: feature })),
  ];

  // Show black screen during auth check
  if (!userId) {
    return <View style={{ flex: 1, backgroundColor: '#000000' }} />;
  }

  // Show loading screen during auth check or updates
  if (!userId || isUpdating) {
    return <LoadingScreen message={!userId ? "Loading your dashboard..." : "Updating..."} />;
  }

  // Show loading screen only during data loading
  if (loading || !initialLoadComplete) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <TopBar onProfilePress={() => router.push(`profile/${authUser?.uid}`)}  />
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, position: "relative" }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <FlatList
                style={{ flex: 1 }}
                data={showSearch ? filteredResults : dashboardData}
                keyExtractor={(item, index) => (showSearch ? index.toString() : item.id)}
                refreshing={isRefreshing}
                onRefresh={refreshData}
                ListHeaderComponent={
                  <View>
                    {showSearch ? (
                      <View
                        style={styles.searchHeader}
                        onLayout={(event) => {
                          const { height } = event.nativeEvent.layout;
                          setSearchHeaderHeight(height);
                        }}
                      >
                        <View style={styles.searchInputContainer}>
                          <TextInput
                            style={styles.searchInput}
                            placeholder={`Search ${searchType}...`}
                            placeholderTextColor="#64748B"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                          />
                          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSearch(false)}>
                            <Feather name="x" size={24} color="#38a5c9" />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.filterContainer}>
                          <TouchableOpacity style={styles.filterButton} onPress={() => setSearchType("airports")}>
                            <View style={[styles.filterButtonInner, { backgroundColor: searchType === "airports" ? "#38a5c9" : "#F1F5F9" }]}>
                              <Feather name="airplay" size={18} color={searchType === "airports" ? "#FFFFFF" : "#64748B"} />
                              <Text style={[styles.filterText, { color: searchType === "airports" ? "#FFFFFF" : "#64748B" }]}>Airports</Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.filterButton} onPress={() => setSearchType("events")}>
                            <View style={[styles.filterButtonInner, { backgroundColor: searchType === "events" ? "#38a5c9" : "#F1F5F9" }]}>
                              <Feather name="calendar" size={18} color={searchType === "events" ? "#FFFFFF" : "#64748B"} />
                              <Text style={[styles.filterText, { color: searchType === "events" ? "#FFFFFF" : "#64748B" }]}>Events</Text>
                            </View>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setShowSearch(true)}
                        style={styles.defaultSearchContainer}
                        onLayout={(event) => {
                          const { height } = event.nativeEvent.layout;
                          setDefaultSearchHeight(height);
                        }}
                      >
                        <View style={styles.searchContainer}>
                          <Feather name="search" size={18} color="#64748B" />
                          <Text style={styles.searchPlaceholder}>
                            {selectedAirport ? selectedAirport.name : "Select an airport"}
                          </Text>
                          <Feather name="chevron-down" size={20} color="#64748B" style={styles.searchIcon} />
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                }
                renderItem={({ item }) => {
                  if (showSearch) {
                    return (
                      <TouchableOpacity
                        style={styles.resultItem}
                        activeOpacity={0.9}
                        onPress={() => {
                          if (searchType === "airports") {
                            setSelectedAirport(item);
                            setShowSearch(false);
                          } else {
                            const route = item.type === "sport" ? `/sport/${item.id}` : `/event/${item.id}`;
                            router.push(route);
                          }
                        }}
                      >
                        <View style={searchType === "events" && item.organizer !== null ? styles.organizedResultItemView : styles.resultItemView}>
                          <Feather
                            name={searchType === "airports" ? "airplay" : "calendar"}
                            size={20}
                            color={searchType === "events" && item.organizer !== null ? "#FFFFFF" : "#38a5c9"}
                            style={styles.resultIcon}
                          />
                          <Text style={searchType === "events" && item.organizer !== null ? styles.organizedResultText : styles.resultText}>
                            {item.name}
                          </Text>
                          <Feather
                            name="chevron-right"
                            size={18}
                            color={searchType === "events" && item.organizer !== null ? "#FFFFFF" : "#CBD5E1"}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  } else if (item.type === "section") {
                    if (item.id === "users") {
                      return (
                        <View style={styles.section}>
                          <View style={styles.headerRow}>
                            <FontAwesome5 name="users" size={20} color="#38a5c9" style={styles.headerIcon} />
                            <Text style={styles.sectionHeader}>Nearby Users</Text>
                          </View>
                          {item.data.length > 0 ? (
                            <FlatList
                              horizontal
                              data={item.data}
                              keyExtractor={(user: NearbyUser) => user.id}
                              renderItem={({ item: user }: { item: NearbyUser }) => (
                                <TouchableOpacity
                                  style={styles.userCard}
                                  activeOpacity={0.8}
                                  onPress={() => {
                                    if (user.isInviteCard) {
                                      // Open Google.com when invite card is clicked
                                      Linking.openURL('https://www.google.com');
                                    } else {
                                      router.push(`profile/${user.id}`);
                                    }
                                  }}
                                >
                                  <View style={styles.avatar}>
                                    <FontAwesome5 name="user" size={24} color="#38a5c9" />
                                  </View>
                                  <Text style={styles.userName}>{user.name}</Text>
                                  <Text style={styles.userStatus}>{user.status}</Text>
                                </TouchableOpacity>
                              )}
                              showsHorizontalScrollIndicator={false}
                            />
                          ) : (
                            <Text style={styles.noDataText}>No nearby users found.</Text>
                          )}
                        </View>
                      );
                    } else if (item.id === "events") {
                      return (
                        <View style={styles.section} >
                          <View style={styles.headerRow}>
                            <MaterialIcons name="event" size={20} color="#38a5c9" style={styles.headerIcon} />
                            <Text style={styles.sectionHeader}>
                              Nearby Events
                            </Text>
                          </View>
                          {item.data.length > 0 ? (
                            <FlatList
                              horizontal
                              data={[...item.data].sort((a, b) => {
                                // Sort organized events first
                                if (a.organizer && !b.organizer) return -1;
                                if (!a.organizer && b.organizer) return 1;
                                return 0;
                              })}
                              keyExtractor={(event) => `${event.type}-${event.id}`}
                              renderItem={({ item: event }) => (
                                <TouchableOpacity
                                  style={event.organizer !== null ? styles.organizedEventCard : styles.eventCard}
                                  activeOpacity={0.8}
                                  onPress={() => router.push(event.type === "sport" ? `/sport/${event.id}` : `/event/${event.id}`)}
                                >
                                  <Text style={event.organizer !== null ? styles.organizedEventName : styles.eventName}>
                                    {event.name}
                                  </Text>
                                  <Text style={event.organizer !== null ? styles.organizedEventDescription : styles.eventDescription}>
                                    {event.description}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              showsHorizontalScrollIndicator={false}
                            />
                          ) : (
                            <Text style={styles.noDataText}>No events at this airport.</Text>
                          )}
                        </View>
                      );
                    }
                  } else if (item.type === "feature") {
                    return (
                      <TouchableOpacity
                        style={styles.featureItem}
                        activeOpacity={0.8}
                        onPress={() => router.push(item.data.screen)}
                      >
                        <View style={styles.featureItemContent}>
                          {item.data.icon}
                          <Text style={styles.featureItemText}>{item.data.title}</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color="#CBD5E1" />
                      </TouchableOpacity>
                    );
                  } else if (item.type === "spacer") {
                    return <View style={styles.spacer} />;
                  }
                  return null;
                }}
                contentContainerStyle={{ 
                  paddingHorizontal: 16, 
                  paddingBottom: Platform.OS === 'ios' ? 100 : 80 
                }}
              />
            </TouchableWithoutFeedback>
            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={toggleStatusSheet}>
              <Feather name="edit" size={24} color="#FFF" />
            </TouchableOpacity>
            {/* Status Sheet Component */}
            {showStatusSheet && (
              <TouchableWithoutFeedback onPress={toggleStatusSheet}>
                <View style={styles.overlay} />
              </TouchableWithoutFeedback>
            )}
            <StatusSheet
              showStatusSheet={showStatusSheet}
              sheetAnim={sheetAnim}
              customStatus={customStatus}
              setCustomStatus={setCustomStatus}
              handleUpdateMoodStatus={handleUpdateMoodStatus}
              toggleStatusSheet={toggleStatusSheet}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 0,
    marginTop: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  headerIcon: {
    marginRight: 10,
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: "#e4fbfe",
    marginTop: 20,
    letterSpacing: 0.3,
  },
  userCard: {
    width: 160,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#38a5c9",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e4fbfe",
    textAlign: "center",
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: "#38a5c9",
    textAlign: "center",
  },
  eventCard: {
    width: 220,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  organizedEventCard: {
    width: 220,
    backgroundColor: "#38a5c9",
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  eventName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#e4fbfe",
    marginBottom: 6,
  },
  organizedEventName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 14,
    color: "#38a5c9",
    lineHeight: 20,
  },
  organizedEventDescription: {
    fontSize: 14,
    color: "#000000",
    lineHeight: 20,
  },
  noDataText: {
    fontSize: 15,
    color: "#38a5c9",
    textAlign: "center",
    marginVertical: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  featureItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  featureItemText: {
    marginLeft: 14,
    fontSize: 16,
    color: "#e4fbfe",
    fontWeight: "600",
  },
  searchHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 12,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000000",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#e4fbfe",
    paddingVertical: 8,
  },
  cancelButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
  },
  filterButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#000000",
  },
  filterText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  defaultSearchContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  searchContainer: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: "#38a5c9",
    marginLeft: 12,
  },
  searchIcon: {
    marginLeft: 8,
  },
  resultItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: "hidden",
    padding: 5,
  },
  resultItemView: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#38a5c9",
    borderRadius: 16,
  },
  organizedResultItemView: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#38a5c9",
    borderRadius: 16,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 16,
    color: "#e4fbfe",
    fontWeight: "500",
  },
  organizedResultText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: Platform.OS === 'ios' ? 40 : 32,
    right: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#38a5c9",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  spacer: {
    height: 18,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1,
  },
});

export { Dashboard };