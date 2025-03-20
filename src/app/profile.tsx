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
import useAuth from "../hooks/auth"; // Import the useAuth hook
import { db } from "../../firebaseConfig";

interface ProfileProps {
  profileUid: string; // UID of the profile being viewed
}

const Profile: React.FC<ProfileProps> = ({ profileUid }) => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const { user, userId } = useAuth();

  useEffect(() => {
    
  }, [userData]);

  // These are the preset prompts you want to offer
  const presetPrompts = [
    "Hi there!",
    "How's it going?",
    "Would love to chat!",
  ];

  // Fetch the profile user's data from Firestore using profileUid prop
  useEffect(() => {
    const fetchUserData = async () => {
      if (profileUid) {
        setLoading(true);
        try {
          const userDocRef = doc(db, "users", profileUid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserData(userDoc.data());
            console.log("User data:", userDoc.data());
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
  }, [profileUid]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text>No user data found.</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <ScrollView style={styles.scrollContainer}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <Image
              source={{
                uri:
                  userData.profilePicture ||
                  "https://via.placeholder.com/150",
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

        {/* If the profile being viewed is not the active auth user, show messaging options */}
        {profileUid !== userId && (
          <View style={styles.messageContainer}>
            <TouchableOpacity style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
            <View style={styles.promptContainer}>
              {presetPrompts.map((prompt, index) => (
                <TouchableOpacity key={index} style={styles.promptButton}>
                  <Text style={styles.promptButtonText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
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
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    alignItems: "center",
  },
  messageButton: {
    backgroundColor: "#6a11cb",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  promptContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  promptButton: {
    backgroundColor: "#2575fc",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  promptButtonText: {
    color: "#fff",
    fontSize: 14,
  },
});

export default Profile;
