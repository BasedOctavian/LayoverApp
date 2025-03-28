import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { auth } from "../../../firebaseConfig";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type FeatureButton = {
  icon: React.ReactNode;
  title: string;
  screen: string;
};

type NearbyUser = {
  id: string;
  name: string;
  status: string;
};

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
  const { updateUser, updateUserLocationAndLogin } = useUsers();
  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const { getSportEvents } = useSportEvents();
  const [allSportEvents, setAllSportEvents] = useState<any[]>([]);
  const [matchingEvents, setMatchingEvents] = useState<any[]>([]);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const sheetAnim = useState(new Animated.Value(0))[0];
  const [customStatus, setCustomStatus] = useState("");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingMood, setUpdatingMood] = useState(false);
  const [searchHeaderHeight, setSearchHeaderHeight] = useState(0);
  const [defaultSearchHeight, setDefaultSearchHeight] = useState(0);
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

  const hasUpdatedRef = useRef(false); // Tracks if the Firestore update has run

  const presetStatuses = [
    { label: "Down to Chat", icon: <FontAwesome5 name="comment" size={18} color="#6a11cb" /> },
    { label: "Food & Drinks?", icon: <MaterialIcons name="restaurant" size={18} color="#6a11cb" /> },
    { label: "Work Mode", icon: <Feather name="briefcase" size={18} color="#6a11cb" /> },
    { label: "Exploring the Airport", icon: <Ionicons name="airplane" size={18} color="#6a11cb" /> },
  ];

  const nearbyUsers: NearbyUser[] = [
    { id: "1", name: "Alex Johnson", status: "Down to Chat" },
    { id: "2", name: "Sam Carter", status: "Food & Drinks?" },
    { id: "3", name: "Taylor Lee", status: "Work Mode" },
  ];

  const showPopup = (title: string, message: string, type: "success" | "error") => {
    setPopupData({ visible: true, title, message, type });
    setTimeout(() => setPopupData((prev) => ({ ...prev, visible: false })), 3000);
  };

  const handleUpdateMoodStatus = async (status: string) => {
    if (!userId) {
      showPopup("Error", "User not logged in", "error");
      return;
    }
    setUpdatingMood(true);
    try {
      const updatedData = {
        moodStatus: status,
        updatedAt: serverTimestamp(),
      };
      await updateUser(userId, updatedData);
      showPopup("Success", "Mood status updated successfully", "success");
    } catch (error) {
      showPopup("Error", "Failed to update mood status", "error");
      console.error(error);
    } finally {
      setUpdatingMood(false);
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
        setUserId(user.uid); // Set userId here
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const [nearestAirports, setNearestAirports] = useState<{
    closest: Airport | null;
    tenClosest: Airport[];
  }>({ closest: null, tenClosest: [] });
  useEffect(() => {
    if (!userLocation || allAirports.length === 0) return;
    const airportsWithDistance = allAirports.map((airport) => ({
      ...airport,
      distance: haversineDistance(userLocation.lat, userLocation.long, airport.lat, airport.long),
    }));
    airportsWithDistance.sort((a, b) => a.distance! - b.distance!);
    setNearestAirports({
      closest: airportsWithDistance[0] || null,
      tenClosest: airportsWithDistance.slice(0, 10),
    });
  }, [userLocation, allAirports]);

  useEffect(() => {
    if (!selectedAirport && nearestAirports.closest) {
      setSelectedAirport(nearestAirports.closest);
    }
  }, [nearestAirports.closest, selectedAirport]);

  // Note: In development, due to hot reloading, this effect may run multiple times as the component remounts.
  // In a production build, this effect will run only once per app launch when the component mounts.
  useEffect(() => {
    
    if (userId && nearestAirports.closest && !hasUpdatedRef.current) {
      hasUpdatedRef.current = true; // Mark as updated to prevent re-runs
      updateUserLocationAndLogin(userId, nearestAirports.closest.airportCode);
      console.log('Updated user location and login');
    } else {
      
    }
  }, [userId, nearestAirports.closest, updateUserLocationAndLogin]);

  const features: FeatureButton[] = [
    { icon: <FontAwesome5 name="user-friends" size={24} color="#2F80ED" />, title: "Nearby Users", screen: "locked/lockedScreen" },
    { icon: <Feather name="plus" size={24} color="#2F80ED" />, title: "Create Event", screen: "eventCreation" },
    { icon: <MaterialIcons name="event" size={24} color="#2F80ED" />, title: "Events", screen: "home" },
    { icon: <MaterialIcons name="message" size={24} color="#2F80ED" />, title: "Messages", screen: "chat/chatInbox" },
    { icon: <Feather name="user" size={24} color="#2F80ED" />, title: "Profile", screen: userId ? `profile/${userId}` : "profile" },
    { icon: <Ionicons name="settings" size={24} color="#2F80ED" />, title: "Settings", screen: "settings/settings" },
  ];

  const filteredRegularEvents = useMemo(() => {
    if (!selectedAirport) return [];
    return events.filter((event) => event.airportCode === selectedAirport.airportCode).map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description || "No description",
      type: "regular",
      organizer: event.organizer,
    }));
  }, [selectedAirport, events]);

  useEffect(() => {
    if (!selectedAirport) {
      setMatchingEvents([]);
      return;
    }
    const airportCity = selectedAirport.location.split(",")[0].trim().toLowerCase();
    const filteredSportEvents = allSportEvents.filter((event) => {
      const awayTeam = event.awayTeam ? event.awayTeam.toLowerCase() : "";
      const homeTeam = event.homeTeam ? event.homeTeam.toLowerCase() : "";
      return awayTeam.includes(airportCity) || homeTeam.includes(airportCity);
    }).map((event) => ({
      id: event.eventUID,
      name: `${event.awayTeam} vs. ${event.homeTeam}`,
      description: `Venue: ${event.venue}, Local Time: ${new Date(event.localTime).toLocaleString()}`,
      type: "sport",
      organizer: null,
    }));
    setMatchingEvents(filteredSportEvents);
  }, [selectedAirport, allSportEvents]);

  const allEvents = [...matchingEvents, ...filteredRegularEvents];

  const filteredResults =
    searchType === "airports"
      ? nearestAirports.tenClosest.filter((airport) => airport.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : allEvents.filter((event) => event.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const dashboardData = useMemo(() => [
    { type: "section", id: "users", data: nearbyUsers },
    { type: "section", id: "events", data: allEvents },
    ...features.map((feature, index) => ({ type: "feature", id: index.toString(), data: feature })),
  ], [nearbyUsers, allEvents, features]);

  return (
    <LinearGradient colors={["#E6F0FA", "#F8FAFC"]} style={{ flex: 1 }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
        <Text style={styles.logo}>Wingman</Text>
        <TouchableOpacity onPress={() => router.push(`profile/${userId}`)}>
          <Ionicons name="person-circle" size={32} color="#2F80ED" />
        </TouchableOpacity>
      </View>
      {showSearch && (
        <View
          style={[styles.searchHeader, { top: topBarHeight }]}
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
              <Feather name="x" size={24} color="#2F80ED" />
            </TouchableOpacity>
          </View>
          <View style={styles.filterContainer}>
            <TouchableOpacity style={styles.filterButton} onPress={() => setSearchType("airports")}>
              <View style={[styles.filterButtonInner, { backgroundColor: searchType === "airports" ? "#2F80ED" : "#F1F5F9" }]}>
                <Feather name="airplay" size={18} color={searchType === "airports" ? "#FFFFFF" : "#64748B"} />
                <Text style={[styles.filterText, { color: searchType === "airports" ? "#FFFFFF" : "#64748B" }]}>Airports</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterButton} onPress={() => setSearchType("events")}>
              <View style={[styles.filterButtonInner, { backgroundColor: searchType === "events" ? "#2F80ED" : "#F1F5F9" }]}>
                <Feather name="calendar" size={18} color={searchType === "events" ? "#FFFFFF" : "#64748B"} />
                <Text style={[styles.filterText, { color: searchType === "events" ? "#FFFFFF" : "#64748B" }]}>Events</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {!showSearch && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setShowSearch(true)}
          style={[styles.defaultSearchContainer, { top: topBarHeight }]}
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
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={{ flex: 1, position: "relative" }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <FlatList
                style={{ flex: 1 }}
                data={showSearch ? filteredResults : dashboardData}
                keyExtractor={(item, index) => (showSearch ? index.toString() : item.id)}
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
                            color={searchType === "events" && item.organizer !== null ? "#FFFFFF" : "#2F80ED"}
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
                            <FontAwesome5 name="users" size={20} color="#2F80ED" style={styles.headerIcon} />
                            <Text style={styles.sectionHeader}>Nearby Users</Text>
                          </View>
                          {item.data.length > 0 ? (
                            <FlatList
                              horizontal
                              data={item.data}
                              keyExtractor={(user) => user.id}
                              renderItem={({ item: user }) => (
                                <TouchableOpacity
                                  style={styles.userCard}
                                  activeOpacity={0.8}
                                  onPress={() => router.push(`profile/${user.id}`)}
                                >
                                  <View style={styles.avatar}>
                                    <FontAwesome5 name="user" size={24} color="#2F80ED" />
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
                        <View style={styles.section}>
                          <View style={styles.headerRow}>
                            <MaterialIcons name="event" size={20} color="#2F80ED" style={styles.headerIcon} />
                            <Text style={styles.sectionHeader}>
                              Events at {selectedAirport ? selectedAirport.name : "Your Location"}
                            </Text>
                          </View>
                          {item.data.length > 0 ? (
                            <FlatList
                              horizontal
                              data={item.data}
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
                  }
                  return null;
                }}
                ListHeaderComponent={
                  showSearch ? <View style={{ height: searchHeaderHeight }} /> : <View style={{ height: defaultSearchHeight }} />
                }
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              />
            </TouchableWithoutFeedback>
            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fab} onPress={toggleStatusSheet}>
              <Feather name="edit" size={24} color="#FFF" />
            </TouchableOpacity>
            {/* Status Sheet */}
            {showStatusSheet && (
              <Animated.View
                style={[
                  styles.statusSheet,
                  {
                    transform: [
                      {
                        scale: sheetAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        translateY: sheetAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, 0],
                        }),
                      },
                    ],
                    opacity: sheetAnim,
                  },
                ]}
              >
                <Text style={styles.statusTitle}>Update Status</Text>
                <View style={styles.statusGrid}>
                  {presetStatuses.map((status, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.statusChip}
                      onPress={() => {
                        handleUpdateMoodStatus(status.label);
                        toggleStatusSheet();
                      }}
                    >
                      <View style={styles.statusChipContent}>
                        {status.icon}
                        <Text style={styles.statusText}>{status.label}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.customStatusLabel}>Custom Status</Text>
                <TextInput
                  style={styles.customStatusInput}
                  value={customStatus}
                  onChangeText={setCustomStatus}
                  placeholder="Enter your status..."
                  placeholderTextColor="#718096"
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => {
                    handleUpdateMoodStatus(customStatus);
                    toggleStatusSheet();
                  }}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {/* Popup Modal */}
      {popupData.visible && (
        <Modal transparent animationType="fade">
          <View style={styles.popupOverlay}>
            <View style={[styles.popupContainer, popupData.type === "error" ? styles.popupError : styles.popupSuccess]}>
              <Text style={styles.popupTitle}>{popupData.title}</Text>
              <Text style={styles.popupMessage}>{popupData.message}</Text>
            </View>
          </View>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#E6F0FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2F80ED",
  },
  section: {
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIcon: {
    marginRight: 8,
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 20,
  },
  userCard: {
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E6F0FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
    textAlign: "center",
  },
  userStatus: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  eventCard: {
    width: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  organizedEventCard: {
    width: 200,
    backgroundColor: "#2F80ED",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1E293B",
    marginBottom: 4,
  },
  organizedEventName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: "#64748B",
  },
  organizedEventDescription: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  noDataText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginVertical: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  featureItemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  featureItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  searchHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
    paddingVertical: 8,
  },
  cancelButton: {
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: "row",
    marginTop: 12,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 12,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  defaultSearchContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 2,
  },
  searchContainer: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
  },
  searchIcon: {
    marginLeft: 8,
  },
  resultItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  resultItemView: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  organizedResultItemView: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2F80ED",
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
  },
  organizedResultText: {
    flex: 1,
    fontSize: 14,
    color: "#FFFFFF",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2F80ED",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  statusSheet: {
    position: "absolute",
    bottom: 72,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderRadius: 28,
    padding: 20,
    width: 240,
    shadowColor: "#2D3748",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    zIndex: 101,
  },
  statusTitle: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statusGrid: {
    gap: 12,
  },
  statusChip: {
    backgroundColor: "rgba(106,17,203,0.05)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statusChipContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 14,
    color: "#6a11cb",
    fontWeight: "500",
    marginLeft: 8,
  },
  customStatusLabel: {
    fontSize: 13,
    color: "#718096",
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  customStatusInput: {
    backgroundColor: "rgba(106,17,203,0.05)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#6a11cb",
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: "#6a11cb",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  popupOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    minWidth: "70%",
    marginBottom: 650,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  popupMessage: {
    fontSize: 16,
    textAlign: "center",
  },
  popupSuccess: {
    borderLeftWidth: 6,
    borderLeftColor: "#2F80ED",
  },
  popupError: {
    borderLeftWidth: 6,
    borderLeftColor: "#FF5A5F",
  },
});

export { Dashboard };