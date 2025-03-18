import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
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

type FeatureButton = {
  icon: React.ReactNode;
  title: string;
  screen: string;
  size?: "half" | "full";
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
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"airports" | "events">("airports");
  const { getEvents } = useEvents();
  const [events, setEvents] = useState<any[]>([]);
  const [airportsNearBUF, setAirportsNearBUF] = useState<Airport[]>([]);
  const { updateUser } = useUsers();
  const [userLocation, setUserLocation] = useState<{ lat: number; long: number } | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [allAirports, setAllAirports] = useState<Airport[]>([]);
  const { getSportEvents } = useSportEvents();
  const [allSportEvents, setAllSportEvents] = useState<any[]>([]);
  const [matchingEvents, setMatchingEvents] = useState<any[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [customStatus, setCustomStatus] = useState("");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingMood, setUpdatingMood] = useState(false);
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

  const presetStatuses = [
    { label: "Down to Chat", icon: <FontAwesome5 name="comment" size={18} color="#FFFFFF" /> },
    { label: "Food & Drinks?", icon: <MaterialIcons name="restaurant" size={18} color="#FFFFFF" /> },
    { label: "Work Mode", icon: <Feather name="briefcase" size={18} color="#FFFFFF" /> },
    { label: "Exploring the Airport", icon: <Ionicons name="airplane" size={18} color="#FFFFFF" /> },
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
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
    if (selectedAirport?.airportCode === "BUF") {
      const bufLat = selectedAirport.lat;
      const bufLong = selectedAirport.long;
      const nearby = allAirports.filter((airport) => {
        if (airport.airportCode === "BUF") return false;
        const distance = haversineDistance(bufLat, bufLong, airport.lat, airport.long);
        return distance <= 10;
      });
      setAirportsNearBUF(nearby);
    } else {
      setAirportsNearBUF([]);
    }
  }, [selectedAirport, allAirports]);

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

  useEffect(() => {
    if (user) setUserId(user.uid);
  }, [user]);

  const features: FeatureButton[] = [
    { icon: <FontAwesome5 name="user-friends" size={24} color="#FFFFFF" />, title: "Nearby Users", screen: "locked/lockedScreen", size: "full" },
    { icon: <Feather name="plus" size={24} color="#FFFFFF" />, title: "Create Event", screen: "eventCreation", size: "full" },
    { icon: <MaterialIcons name="event" size={24} color="#FFFFFF" />, title: "Events", screen: "home", size: "full" },
    { icon: <MaterialIcons name="message" size={24} color="#FFFFFF" />, title: "Messages", screen: "chat/chatInbox", size: "full" },
    { icon: <Feather name="edit" size={18} color="#FFFFFF" />, title: "Status", screen: "locked/lockedScreen", size: "half" },
    { icon: <Feather name="user" size={18} color="#FFFFFF" />, title: "Profile", screen: userId ? `profile/${userId}` : "profile", size: "half" },
    { icon: <Ionicons name="settings" size={24} color="#FFFFFF" />, title: "Settings", screen: "settings/settings", size: "full" },
  ];

  const filteredRegularEvents = useMemo(() => {
    if (!selectedAirport) return [];
    return events.filter((event) => event.airportCode === selectedAirport.airportCode).map((event) => ({
      id: event.id,
      name: event.name,
      description: event.description,
      type: "regular",
      latitude: event.latitude,
      longitude: event.longitude,
      airportCode: event.airportCode,
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
      latitude: event.latitude,
      longitude: event.longitude,
    }));
    setMatchingEvents(filteredSportEvents);
  }, [selectedAirport, allSportEvents]);

  const allEvents = [...matchingEvents, ...filteredRegularEvents];

  const filteredResults =
    searchType === "airports"
      ? nearestAirports.tenClosest.filter((airport) => airport.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : allEvents.filter((event) => event.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const mapRegion = useMemo(() => {
    if (!selectedAirport) return null;
    return {
      latitude: selectedAirport.lat,
      longitude: selectedAirport.long,
      latitudeDelta: 0.0522,
      longitudeDelta: 0.0321,
    };
  }, [selectedAirport]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          {/* Search Header */}
          {showSearch && (
            <View style={styles.searchHeader}>
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

          {/* Default Search Bar */}
          {!showSearch && (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShowSearch(true)} style={styles.defaultSearchContainer}>
              <View style={styles.searchContainer}>
                <Feather name="search" size={18} color="#64748B" />
                <Text style={styles.searchPlaceholder}>{selectedAirport ? selectedAirport.name : "Select an airport"}</Text>
                <Feather name="chevron-down" size={20} color="#64748B" style={styles.searchIcon} />
              </View>
            </TouchableOpacity>
          )}

          {/* Map Section */}
          <View style={styles.mapContainer}>
            {mapRegion ? (
              <MapView style={styles.map} region={mapRegion}>
                {selectedAirport && (
                  <Marker
                    coordinate={{ latitude: selectedAirport.lat, longitude: selectedAirport.long }}
                    title={selectedAirport.name}
                    description={selectedAirport.airportCode}
                  />
                )}
                {airportsNearBUF.map((airport, index) => (
                  <Marker
                    key={`nearby-${index}`}
                    coordinate={{ latitude: airport.lat, longitude: airport.long }}
                    title={airport.name}
                    description={airport.airportCode}
                  />
                ))}
                {allEvents.map((event, index) => (
                  <Marker
                    key={`${event.type}-${event.id}-${index}`}
                    coordinate={{ latitude: Number(event.latitude), longitude: Number(event.longitude) }}
                    title={event.name}
                    description={event.description}
                  />
                ))}
              </MapView>
            ) : (
              <Text>Loading map...</Text>
            )}
          </View>

          {/* Search Results or Dashboard Features */}
          {showSearch ? (
            <FlatList
              data={filteredResults}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
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
                  <View style={styles.resultItemView}>
                    <Feather name={searchType === "airports" ? "airplay" : "calendar"} size={20} color="#2F80ED" style={styles.resultIcon} />
                    <Text style={styles.resultText}>{item.name}</Text>
                    <Feather name="chevron-right" size={18} color="#CBD5E1" />
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.searchResultsContainer}
            />
          ) : (
            <ScrollView contentContainerStyle={styles.featuresContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.gridRow}>
                {features.slice(0, 2).map((feature, index) => (
                  <View key={index} style={[styles.featureButton, styles.fullButton, { backgroundColor: "#2F80ED" }]}>
                    <TouchableOpacity style={styles.buttonInner} onPress={() => router.push(feature.screen)}>
                      {feature.icon}
                      <Text style={styles.buttonText}>{feature.title}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.gridRow}>
                {features.slice(2, 4).map((feature, index) => (
                  <View key={index} style={[styles.featureButton, styles.fullButton, { backgroundColor: "#2F80ED" }]}>
                    <TouchableOpacity style={styles.buttonInner} onPress={() => router.push(feature.screen)}>
                      {feature.icon}
                      <Text style={styles.buttonText}>{feature.title}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.gridRow}>
                <View style={styles.halfButtonContainer}>
                  {features.slice(4, 6).map((feature, index) => (
                    <View key={index} style={[styles.featureButton, styles.halfButton, { backgroundColor: "#2F80ED" }]}>
                      <TouchableOpacity
                        style={styles.buttonInner}
                        onPress={() => {
                          if (feature.title === "Status") setShowStatusModal(true);
                          else router.push(feature.screen);
                        }}
                      >
                        {feature.icon}
                        <Text style={styles.smallButtonText}>{feature.title}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={[styles.featureButton, styles.fullButton, { backgroundColor: "#2F80ED" }]}>
                  <TouchableOpacity style={styles.buttonInner} onPress={() => router.push(features[6].screen)}>
                    <Ionicons name="settings" size={24} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Settings</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          {/* Status Modal */}
          <Modal visible={showStatusModal} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalHeader}>Update Your Status</Text>
                <View style={styles.modalSeparator} />
                <View style={styles.statusOptions}>
                  {presetStatuses.map((status, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.statusOptionButton}
                      onPress={() => {
                        handleUpdateMoodStatus(status.label);
                        setShowStatusModal(false);
                      }}
                    >
                      <View style={styles.statusOptionContent}>
                        {status.icon}
                        <Text style={styles.statusOptionText}>{status.label}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.customStatusLabel}>Or enter a custom status</Text>
                <TextInput
                  style={styles.customStatusInput}
                  value={customStatus}
                  onChangeText={setCustomStatus}
                  placeholder="Type your status here..."
                  placeholderTextColor="#999"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalActionButton}
                    onPress={() => {
                      handleUpdateMoodStatus(customStatus);
                      setShowStatusModal(false);
                    }}
                  >
                    <Feather name="check" size={18} color="#FFFFFF" style={styles.modalActionIcon} />
                    <Text style={styles.modalActionButtonText}>Submit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionButton, styles.modalCancelButton]} onPress={() => setShowStatusModal(false)}>
                    <Feather name="x" size={18} color="#2F80ED" style={styles.modalActionIcon} />
                    <Text style={[styles.modalActionButtonText, styles.modalCancelButtonText]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Popup Notification */}
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
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  innerContainer: {
    flex: 1,
  },
  searchHeader: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    zIndex: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
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
    top: 50,
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
  mapContainer: {
    height: "37%",
    borderRadius: 24,
    overflow: "hidden",
    margin: 16,
    marginTop: 115,
    marginBottom: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  featuresContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  featureButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  fullButton: {
    width: "48%",
    height: 120,
  },
  halfButtonContainer: {
    width: "48%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfButton: {
    width: "48%",
    height: 120,
  },
  buttonInner: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  smallButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  searchResultsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
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
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: "#1E293B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
    color: "#1E293B",
  },
  modalSeparator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    width: "100%",
    marginBottom: 15,
  },
  statusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statusOptionButton: {
    width: "48%",
    backgroundColor: "#2F80ED",
    marginVertical: 4,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statusOptionContent: {
    alignItems: "center",
  },
  statusOptionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    marginTop: 5,
  },
  customStatusLabel: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    marginTop: 15,
    textAlign: "center",
  },
  customStatusInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#2F80ED",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    fontSize: 14,
    color: "#1E293B",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalActionButton: {
    flex: 1,
    backgroundColor: "#2F80ED",
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  modalActionIcon: {
    marginRight: 8,
  },
  modalActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  modalCancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2F80ED",
  },
  modalCancelButtonText: {
    color: "#2F80ED",
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