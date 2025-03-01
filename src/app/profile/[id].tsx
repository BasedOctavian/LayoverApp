import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import useAuth from "../../hooks/auth";
import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth"; // Added auth imports
import { auth } from "../../../firebaseConfig"; // Adjust path as needed

const Profile = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { user, userId } = useAuth();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const params = useLocalSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  
  const router = useRouter();

  // Added auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("/LoginScreen");
      }
      setAuthLoading(false);
    });
    return unsubscribe; // Cleanup subscription
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId && id) {
        setLoading(true);
        try {
          const userDocRef = doc(db, "users", id);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            setError("No user data found.");
          }
        } catch (error) {
          setError("Failed to fetch user data.");
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [userId, id, fadeAnim]);

  if (authLoading) {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
        <View style={styles.container}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!userData) {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
        <View style={styles.container}>
          <Text style={styles.noDataText}>No user data found.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <TouchableOpacity
        style={styles.settingsIcon}
        onPress={() => router.push("profile/editProfile")}
      >
        <MaterialIcons name="settings" size={24} color="#fff" />
      </TouchableOpacity>
      <ScrollView style={styles.scrollContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <Image
              source={{
                uri:
                  userData.profilePicture || "https://via.placeholder.com/150",
              }}
              style={styles.profileImage}
            />
            <Text style={styles.nameText}>
              {userData.name}, {userData.age}
            </Text>
            <Text style={styles.moodText}>
              <MaterialIcons name="mood" size={16} color="#fff" />{" "}
              {userData.moodStatus}
            </Text>
          </View>

          {/* Bio Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About Me</Text>
            <Text style={styles.cardContent}>{userData.bio}</Text>
          </View>

          {/* Languages Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <MaterialIcons name="language" size={20} color="#6a11cb" /> Languages
            </Text>
            <Text style={styles.cardContent}>
              {userData.languages.join(", ")}
            </Text>
          </View>

          {/* Interests Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <MaterialIcons name="favorite" size={20} color="#6a11cb" /> Interests
            </Text>
            <Text style={styles.cardContent}>
              {userData.interests.join(", ")}
            </Text>
          </View>

          {/* Goals Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <FontAwesome name="bullseye" size={20} color="#6a11cb" /> Goals
            </Text>
            <Text style={styles.cardContent}>
              {userData.goals.join(", ")}
            </Text>
          </View>

          {/* Travel History Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <MaterialIcons name="flight" size={20} color="#6a11cb" /> Travel History
            </Text>
            <Text style={styles.cardContent}>
              {userData.travelHistory.join(", ")}
            </Text>
          </View>

          {/* Member Since */}
          <Text style={styles.createdAtText}>
            Member since:{" "}
            {new Date(userData.createdAt?.toDate()).toLocaleDateString()}
          </Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
    marginTop: 60,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 10,
  },
  nameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  moodText: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.8,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6a11cb",
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 16,
    color: "#555",
  },
  createdAtText: {
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    marginTop: 10,
    opacity: 0.8,
  },
  errorText: {
    color: "#ff4444",
    fontSize: 16,
    textAlign: "center",
  },
  noDataText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  settingsIcon: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 100,
    padding: 10,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Profile;