import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import useSportEvents from "../../hooks/useSportEvents";
import { onAuthStateChanged, User } from "firebase/auth"; // Added auth imports
import { auth } from "../../../config/firebaseConfig"; // Adjust path as needed
import useAuth from "../../hooks/auth";
import { router } from "expo-router"; // Added router import

export default function Sport() {
  const { id } = useLocalSearchParams();
  const { getSportEvent } = useSportEvents();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Added auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setAuthLoading(false);
    });
    return unsubscribe; // Cleanup subscription
  }, []);

  // Fetch sport event data using eventUID
  useEffect(() => {
    if (id) {
      (async () => {
        setLoading(true);
        const eventData = await getSportEvent(id as string);
        if (eventData) {
          setEvent(eventData);
        }
        setLoading(false);
      })();
    }
  }, [id, getSportEvent]);

  // Format the localTime to a readable string
  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const options: Intl.DateTimeFormatOptions = {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    } catch (error) {
      console.error("Invalid date:", error);
      return "Date TBD";
    }
  };

  if (authLoading) {
    return (
      <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.gradient}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Event not found state
  if (!event) {
    return (
      <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.gradient}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Sport event not found.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Watch Party Header */}
        <View style={styles.header}>
          <Text style={styles.matchupText}>
            Watch Party: {event.awayTeam} @ {event.homeTeam}
          </Text>
          <Text style={styles.eventLabel}>At [Bar Name] in [Airport Name]</Text>
        </View>

        {/* Event Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: "https://via.placeholder.com/400x200?text=Watch+Party" }}
            style={styles.eventImage}
          />
          <View style={styles.imageOverlay} />
        </View>

        {/* Event Details */}
        <View style={styles.detailsSection}>
          {/* Date and Time */}
          <View style={styles.detailRow}>
            <Feather name="calendar" size={24} color="#fff" />
            <Text style={styles.detailText}>
              {formatDateTime(event.localTime)}
            </Text>
          </View>

          {/* Venue */}
          <View style={styles.detailRow}>
            <MaterialIcons name="sports-bar" size={24} color="#fff" />
            <Text style={styles.detailText}>[Bar Name]</Text>
          </View>

          {/* Attendees */}
          <View style={styles.detailRow}>
            <Feather name="users" size={24} color="#fff" />
            <Text style={styles.detailText}>42 attendees</Text>
          </View>
        </View>

        {/* Attend Button */}
        <TouchableOpacity style={styles.attendButton}>
          <LinearGradient
            colors={["#ff6b6b", "#ff4757"]}
            style={styles.buttonGradient}
          >
            <Feather name="check-circle" size={24} color="#fff" />
            <Text style={styles.buttonText}>Join the Watch Party</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Attendees Section */}
        <View style={styles.attendeesSection}>
          <View style={styles.sectionHeader}>
            <Feather name="users" size={20} color="#fff" />
            <Text style={styles.sectionHeaderText}>Who's Coming</Text>
          </View>
          <View style={styles.attendeesList}>
            <View style={styles.attendeePlaceholder} />
            <View style={styles.attendeePlaceholder} />
            <View style={styles.attendeePlaceholder} />
            <Text style={styles.moreAttendees}>+39 more</Text>
          </View>
        </View>

        {/* Event UID */}
        <Text style={styles.eventUID}>Event ID: {event.eventUID}</Text>
      </ScrollView>
    </LinearGradient>
  );
}

// Styles for the sport event UI
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 100, // Space for floating elements
  },
  header: {
    alignItems: "center",
    marginVertical: 30,
  },
  matchupText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  eventLabel: {
    fontSize: 16,
    color: "#d1d1d1",
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    marginBottom: 20,
  },
  eventImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  detailsSection: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 20,
    gap: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "500",
  },
  attendButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  attendeesSection: {
    width: "100%",
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  sectionHeaderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  attendeesList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attendeePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  moreAttendees: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  eventUID: {
    fontSize: 12,
    color: "#a1a1a1",
    marginTop: 20,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginTop: 50,
  },
});