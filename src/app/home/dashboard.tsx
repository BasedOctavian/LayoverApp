import React, { useEffect, useState, useMemo, useContext } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Animated, 
  Modal 
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons, FontAwesome5, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import * as Location from "expo-location";
import useAirports, { Airport } from "../../hooks/useAirports";
import useEvents from "../../hooks/useEvents";
import useSportEvents from "../../hooks/useSportEvents";
import useUsers from "../../hooks/useUsers";
import { serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../firebaseConfig";
import { ThemeContext } from "../../ThemeContext";

type FeatureButton = {
  icon: React.ReactNode;
  title: string;
  screen: string;
  size?: 'half' | 'full';
};

function haversineDistance(lat1: number, long1: number, lat2: number, long2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLong = toRad(long2 - long1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLong / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<'airports' | 'events'>('airports');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-100))[0];
  const { getEvents } = useEvents();
  const [events, setEvents] = useState<any[]>([]);
  const [airportsNearBUF, setAirportsNearBUF] = useState<Airport[]>([]);
  const { updateUser } = useUsers();
  const { theme } = useContext(ThemeContext);

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

  const presetStatuses = [
    { label: "Down to Chat", icon: <FontAwesome5 name="comment" size={18} color="#FFFFFF" /> },
    { label: "Food & Drinks?", icon: <MaterialIcons name="restaurant" size={18} color="#FFFFFF" /> },
    { label: "Work Mode", icon: <Feather name="briefcase" size={18} color="#FFFFFF" /> },
    { label: "Exploring the Airport", icon: <Ionicons name="airplane" size={18} color="#FFFFFF" /> },
  ];

  const [updatingMood, setUpdatingMood] = useState(false);
  const [popupData, setPopupData] = useState<{ visible: boolean; title: string; message: string; type: "success" | "error" }>({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });

  const showPopup = (title: string, message: string, type: "success" | "error") => {
    setPopupData({ visible: true, title, message, type });
    setTimeout(() => {
      setPopupData(prev => ({ ...prev, visible: false }));
    }, 3000);
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
    if (selectedAirport) {
      console.log("Selected airport:", selectedAirport);
    }
  }, [selectedAirport]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user){
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    })
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      const eventsData = await getEvents();
      if (eventsData) {
        setEvents(eventsData);
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    const loadSportEvents = async () => {
      const eventsData = await getSportEvents();
      if (eventsData) {
        setAllSportEvents(eventsData);
      }
    };
    loadSportEvents();
  }, [getSportEvents]);

  useEffect(() => {
    if (selectedAirport?.airportCode === 'BUF') {
      const bufLat = selectedAirport.lat;
      const bufLong = selectedAirport.long;
      const nearby = allAirports.filter(airport => {
        if (airport.airportCode === 'BUF') return false;
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
      console.log("User location:", location);
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
      if (fetchedAirports) {
        setAllAirports(fetchedAirports);
      }
    };
    fetchAirports();
  }, [getAirports]);

  const [nearestAirports, setNearestAirports] = useState<{ closest: Airport | null, tenClosest: Airport[] }>({ closest: null, tenClosest: [] });
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
      console.log("Default selected airport set:", nearestAirports.closest);
    }
  }, [nearestAirports.closest, selectedAirport]);

  const mapRegion = selectedAirport
    ? {
        latitude: selectedAirport.lat,
        longitude: selectedAirport.long,
        latitudeDelta: 0.0522,
        longitudeDelta: 0.0321,
      }
    : null;

  useEffect(() => {
    if (user) {
      setUserId(user.uid);
      console.log("User ID:", user.uid);
    }
  }, [user]);

  const features: FeatureButton[] = [
    { 
      icon: <FontAwesome5 name="user-friends" size={24} color="#FFFFFF" />, 
      title: 'Nearby Users', 
      screen: 'locked/lockedScreen',
      size: 'full'
    },
    { 
      icon: <Feather name="plus" size={24} color="#FFFFFF" />, 
      title: 'Create Event', 
      screen: 'eventCreation',
      size: 'full'
    },
    { 
      icon: <MaterialIcons name="event" size={24} color="#FFFFFF" />, 
      title: 'Events', 
      screen: 'home',
      size: 'full'
    },
    { 
      icon: <MaterialIcons name="message" size={24} color="#FFFFFF" />, 
      title: 'Messages', 
      screen: 'chat/chatInbox',
      size: 'full'
    },
    { 
      icon: <Feather name="edit" size={18} color="#FFFFFF" />, 
      title: 'Status', 
      screen: 'locked/lockedScreen',
      size: 'half'
    },
    { 
      icon: <Feather name="user" size={18} color="#FFFFFF" />, 
      title: 'Profile', 
      screen: 'profile/' + userId,
      size: 'half'
    },
    { 
      icon: <Ionicons name="settings" size={24} color="#FFFFFF" />, 
      title: 'Settings', 
      screen: 'settings/settings',
      size: 'full'
    },
  ];

  const toggleSearch = (show: boolean) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: show ? 0 : -100,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    setShowSearch(show);
    if (!show) setSearchQuery("");
  };

  useEffect(() => {
    if (!selectedAirport) {
      setMatchingEvents([]);
      return;
    }

    const airportCity = selectedAirport.location.split(",")[0].trim().toLowerCase();
    const filteredSportEvents = allSportEvents.filter(event => {
      const awayTeam = event.awayTeam ? event.awayTeam.toLowerCase() : "";
      const homeTeam = event.homeTeam ? event.homeTeam.toLowerCase() : "";
      return awayTeam.includes(airportCity) || homeTeam.includes(airportCity);
    }).map(event => ({
      id: event.eventUID,
      name: `${event.awayTeam} vs. ${event.homeTeam}`,
      description: `Venue: ${event.venue}, Local Time: ${new Date(event.localTime).toLocaleString()}`,
      type: 'sport',
      latitude: event.latitude,
      longitude: event.longitude,
    }));

    setMatchingEvents(filteredSportEvents);
  }, [selectedAirport, allSportEvents]);

  const filteredRegularEvents = useMemo(() => {
    if (!selectedAirport) return [];

    const airportLat = selectedAirport.lat;
    const airportLong = selectedAirport.long;
    const maxDistance = 10;

    return events.filter(event => {
      const lat = Number(event.latitude);
      const long = Number(event.longitude);
      if (isNaN(lat) || isNaN(long)) return false;
      const distance = haversineDistance(airportLat, airportLong, lat, long);
      return distance <= maxDistance;
    }).map(event => ({
      id: event.eventUID,
      name: event.name,
      description: event.description,
      type: 'regular',
      latitude: event.latitude,
      longitude: event.longitude,
    }));
  }, [selectedAirport, events]);

  const allEvents = [...matchingEvents, ...filteredRegularEvents];

  const filteredResults = searchType === 'airports'
    ? nearestAirports.tenClosest.filter((airport) =>
        airport.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allEvents.filter((event) =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <View style={[styles.container, { backgroundColor: theme === "light" ? "#F8FAFC" : "#1E293B" }]}>
      {/* Search Header */}
      <Animated.View style={[styles.searchHeader, { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748",
      }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={[styles.searchInput, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}
            placeholder={`Search ${searchType}...`}
            placeholderTextColor={theme === "light" ? "#64748B" : "#A0AEC0"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
          />
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => toggleSearch(false)}
          >
            <Feather name="x" size={24} color={theme === "light" ? "#2F80ED" : "#90CDF4"} />
          </TouchableOpacity>
        </View>
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setSearchType('airports')}
          >
            <LinearGradient
              colors={searchType === 'airports' ? ['#2F80ED', '#1A5FB4'] : [theme === "light" ? '#F1F5F9' : '#2D3748', theme === "light" ? '#FFFFFF' : '#1E293B']}
              style={[styles.filterGradient, styles.filterButtonInner]}
            >
              <Feather 
                name="airplay" 
                size={18} 
                color={searchType === 'airports' ? '#FFFFFF' : (theme === "light" ? '#64748B' : '#CBD5E1')} 
              />
              <Text style={[
                styles.filterText,
                searchType === 'airports' && styles.activeFilterText,
                { color: searchType === 'airports' ? '#FFFFFF' : (theme === "light" ? '#64748B' : '#CBD5E1') }
              ]}>
                Airports
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setSearchType('events')}
          >
            <LinearGradient
              colors={searchType === 'events' ? ['#2F80ED', '#1A5FB4'] : [theme === "light" ? '#F1F5F9' : '#2D3748', theme === "light" ? '#FFFFFF' : '#1E293B']}
              style={[styles.filterGradient, styles.filterButtonInner]}
            >
              <Feather 
                name="calendar" 
                size={18} 
                color={searchType === 'events' ? '#FFFFFF' : (theme === "light" ? '#64748B' : '#CBD5E1')} 
              />
              <Text style={[
                styles.filterText,
                searchType === 'events' && styles.activeFilterText,
                { color: searchType === 'events' ? '#FFFFFF' : (theme === "light" ? '#64748B' : '#CBD5E1') }
              ]}>
                Events
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Default Search Bar */}
      {!showSearch && (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => toggleSearch(true)}
          style={styles.defaultSearchContainer}
        >
          <LinearGradient
            colors={theme === "light" ? ['#FFFFFF', '#F8FAFC'] : ['#2D3748', '#1E293B']}
            style={styles.searchContainer}
          >
            <Feather name="search" size={18} color={theme === "light" ? "#64748B" : "#A0AEC0"} />
            <Text style={[styles.searchPlaceholder, { color: theme === "light" ? "#64748B" : "#A0AEC0" }]}>
              {selectedAirport ? selectedAirport.name : "Select an airport"}
            </Text>
            <Feather name="chevron-down" size={20} color={theme === "light" ? "#64748B" : "#A0AEC0"} style={styles.searchIcon} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion || { latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
        >
          {selectedAirport && (
            <Marker
              coordinate={{
                latitude: selectedAirport.lat,
                longitude: selectedAirport.long,
              }}
              title={selectedAirport.name}
              description={selectedAirport.airportCode}
            />
          )}
          {airportsNearBUF.map((airport, index) => (
            <Marker
              key={`nearby-${index}`}
              coordinate={{
                latitude: airport.lat,
                longitude: airport.long,
              }}
              title={airport.name}
              description={airport.airportCode}
            />
          ))}
          {allEvents.map((event, index) => (
            <Marker
              key={`${event.type}-${event.id}-${index}`}
              coordinate={{
                latitude: Number(event.latitude),
                longitude: Number(event.longitude),
              }}
              title={event.name}
              description={event.description}
            />
          ))}
        </MapView>
      </View>

      {/* Search Results or Dashboard Features */}
      {showSearch ? (
        <Animated.ScrollView 
          contentContainerStyle={[styles.searchResultsContainer, { backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748" }]}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {filteredResults.map((result, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.resultItem}
              activeOpacity={0.9}
              onPress={() => {
                if (searchType === "airports") {
                  setSelectedAirport(result);
                  toggleSearch(false);
                } else {
                  const route = result.type === 'sport' ? `/sport/${result.id}` : `/event/${result.id}`;
                  router.push(route);
                }
              }}
            >
              <LinearGradient
                colors={theme === "light" ? ['#FFFFFF', '#F8FAFC'] : ['#2D3748', '#1E293B']}
                style={styles.resultGradient}
              >
                <Feather 
                  name={searchType === "airports" ? "airplay" : "calendar"} 
                  size={20} 
                  color={theme === "light" ? "#2F80ED" : "#90CDF4"} 
                  style={styles.resultIcon}
                />
                <Text style={[styles.resultText, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>{result.name}</Text>
                <Feather name="chevron-right" size={18} color={theme === "light" ? "#CBD5E1" : "#4A5568"} />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.featuresContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridRow}>
            {features.slice(0, 2).map((feature, index) => (
              <LinearGradient
                key={index}
                colors={['#2F80ED', '#1A5FB4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.featureButton, styles.fullButton]}
              >
                <TouchableOpacity 
                  style={styles.buttonInner}
                  onPress={() => router.push(feature.screen)}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                    style={styles.iconContainer}
                  >
                    {feature.icon}
                  </LinearGradient>
                  <Text style={styles.buttonText}>{feature.title}</Text>
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>
          <View style={styles.gridRow}>
            {features.slice(2, 4).map((feature, index) => (
              <LinearGradient
                key={index}
                colors={['#2F80ED', '#1A5FB4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.featureButton, styles.fullButton]}
              >
                <TouchableOpacity 
                  style={styles.buttonInner}
                  onPress={() => router.push(feature.screen)}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                    style={styles.iconContainer}
                  >
                    {feature.icon}
                  </LinearGradient>
                  <Text style={styles.buttonText}>{feature.title}</Text>
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>
          <View style={styles.gridRow}>
            <View style={styles.halfButtonContainer}>
              {features.slice(4, 6).map((feature, index) => (
                <LinearGradient
                  key={index}
                  colors={['#2F80ED', '#1A5FB4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.featureButton, styles.halfButton]}
                >
                  <TouchableOpacity
                    style={styles.buttonInner}
                    onPress={() => {
                      if (feature.title === "Status") {
                        setShowStatusModal(true);
                      } else {
                        router.push(feature.screen);
                      }
                    }}
                  >
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                      style={styles.iconContainer}
                    >
                      {feature.icon}
                    </LinearGradient>
                    <Text style={styles.smallButtonText}>{feature.title}</Text>
                  </TouchableOpacity>
                </LinearGradient>
              ))}
            </View>
            <LinearGradient
              colors={['#2F80ED', '#1A5FB4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureButton, styles.fullButton]}
            >
              <TouchableOpacity 
                style={styles.buttonInner}
                onPress={() => router.push(features[6].screen)}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.iconContainer}
                >
                  <Ionicons name="settings" size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.buttonText}>Settings</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
          {/* Events Section */}
          <View style={styles.eventsSection}>
            <Text style={[styles.sectionTitle, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>Events</Text>
            {allEvents.map((event, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.eventItem}
                onPress={() => router.push(event.type === 'sport' ? `/sport/${event.id}` : `/event/${event.id}`)}
              >
                <LinearGradient
                  colors={theme === "light" ? ['#FFFFFF', '#F8FAFC'] : ['#2D3748', '#1E293B']}
                  style={styles.eventGradient}
                >
                  <Feather 
                    name={event.type === 'sport' ? 'activity' : 'calendar'} 
                    size={20} 
                    color={theme === "light" ? "#2F80ED" : "#90CDF4"} 
                    style={styles.eventIcon}
                  />
                  <Text style={[styles.eventText, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>{event.name}</Text>
                  <Feather name="chevron-right" size={18} color={theme === "light" ? "#CBD5E1" : "#4A5568"} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748" }]}>
            <Text style={[styles.modalHeader, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>Update Your Status</Text>
            <View style={[styles.modalSeparator, { backgroundColor: theme === "light" ? "#E2E8F0" : "#4A5568" }]} />
            <View style={styles.statusOptions}>
              {presetStatuses.map((status, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.statusOptionButton, { backgroundColor: theme === "light" ? "#2F80ED" : "#1A5FB4" }]}
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
            <Text style={[styles.customStatusLabel, { color: theme === "light" ? "#1E293B" : "#CBD5E1" }]}>Or enter a custom status</Text>
            <TextInput
              style={[styles.customStatusInput, { 
                borderColor: theme === "light" ? "#2F80ED" : "#1A5FB4",
                color: theme === "light" ? "#1E293B" : "#FFFFFF",
                backgroundColor: theme === "light" ? "#F8FAFC" : "#1E293B"
              }]}
              value={customStatus}
              onChangeText={setCustomStatus}
              placeholder="Type your status here..."
              placeholderTextColor={theme === "light" ? "#A0AEC0" : "#718096"}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, { backgroundColor: theme === "light" ? "#2F80ED" : "#1A5FB4" }]}
                onPress={() => {
                  handleUpdateMoodStatus(customStatus);
                  setShowStatusModal(false);
                }}
              >
                <Feather name="check" size={18} color="#FFFFFF" style={styles.modalActionIcon} />
                <Text style={styles.modalActionButtonText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.modalCancelButton, { 
                  backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748",
                  borderColor: theme === "light" ? "#2F80ED" : "#1A5FB4"
                }]}
                onPress={() => setShowStatusModal(false)}
              >
                <Feather name="x" size={18} color={theme === "light" ? "#2F80ED" : "#90CDF4"} style={styles.modalActionIcon} />
                <Text style={[styles.modalActionButtonText, styles.modalCancelButtonText, { color: theme === "light" ? "#2F80ED" : "#90CDF4" }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Styled Popup Notification */}
      {popupData.visible && (
        <Modal transparent animationType="fade">
          <View style={styles.popupOverlay}>
            <View style={[styles.popupContainer, popupData.type === "error" ? styles.popupError : styles.popupSuccess, { 
              backgroundColor: theme === "light" ? "#FFFFFF" : "#2D3748",
              borderLeftColor: popupData.type === "error" ? "#FF5A5F" : "#2F80ED"
            }]}>
              <Text style={[styles.popupTitle, { color: theme === "light" ? "#1E293B" : "#FFFFFF" }]}>{popupData.title}</Text>
              <Text style={[styles.popupMessage, { color: theme === "light" ? "#64748B" : "#CBD5E1" }]}>{popupData.message}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 2,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    paddingVertical: 8,
  },
  cancelButton: {
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterGradient: {
    borderRadius: 12,
    padding: 12,
  },
  filterButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  defaultSearchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 2,
  },
  searchContainer: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Inter-Medium',
  },
  searchIcon: {
    marginLeft: 8,
  },
  mapContainer: {
    height: '37%',
    borderRadius: 24,
    overflow: 'hidden',
    margin: 16,
    marginTop: 115,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  map: {
    flex: 1,
    borderRadius: 24,
  },
  featuresContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featureButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#2F80ED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fullButton: {
    width: '48%',
    height: 120,
  },
  halfButtonContainer: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    width: '48%',
    height: 120,
  },
  buttonInner: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  smallButtonText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  searchResultsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  resultItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  eventsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    marginRight: 12,
  },
  eventText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSeparator: {
    height: 1,
    width: '100%',
    marginBottom: 15,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusOptionButton: {
    width: '48%',
    marginVertical: 4,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOptionContent: {
    alignItems: 'center',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 5,
    textAlign: 'center',
  },
  customStatusLabel: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 15,
    textAlign: 'center',
  },
  customStatusInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActionIcon: {
    marginRight: 8,
  },
  modalActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  popupOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  popupContainer: {
    borderRadius: 12,
    padding: 20,
    minWidth: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
  },
  popupError: {
    borderLeftWidth: 6,
  },
});

export { Dashboard };