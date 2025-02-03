import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
} from "react-native";
import useFirestore from "../hooks/useFirestore";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";

const Profile = () => {
  const [users, setUsers] = useState<any[]>([]);
  const { getUsers, loading, error } = useFirestore();
  const fadeAnim = useState(new Animated.Value(0))[0]; // For fade-in animation

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchUsers = async () => {
    const users = await getUsers();
    if (users) {
      setUsers(users);
      console.log(users);
    }
  };

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

  // Use the first user as a static example
  const user = users[0];

  if (!user) {
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
              source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }}
              style={styles.profileImage}
            />
            <Text style={styles.nameText}>
              {user.name}, {user.age}
            </Text>
            <Text style={styles.moodText}>
              <MaterialIcons name="mood" size={16} color="#fff" /> {user.moodStatus}
            </Text>
          </View>

          {/* Bio Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About Me</Text>
            <Text style={styles.cardContent}>{user.bio}</Text>
          </View>

          {/* Languages Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <MaterialIcons name="language" size={20} color="#6a11cb" /> Languages
            </Text>
            <Text style={styles.cardContent}>
              {user.languages.join(", ")}
            </Text>
          </View>

          {/* Interests Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <MaterialIcons name="favorite" size={20} color="#6a11cb" /> Interests
            </Text>
            <Text style={styles.cardContent}>
              {user.interests.join(", ")}
            </Text>
          </View>

          {/* Goals Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <FontAwesome name="bullseye" size={20} color="#6a11cb" /> Goals
            </Text>
            <Text style={styles.cardContent}>
              {user.goals.join(", ")}
            </Text>
          </View>

          {/* Travel History Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <MaterialIcons name="flight" size={20} color="#6a11cb" /> Travel History
            </Text>
            <Text style={styles.cardContent}>
              {user.travelHistory.join(", ")}
            </Text>
          </View>

          {/* Member Since */}
          <Text style={styles.createdAtText}>
            Member since: {new Date(user.createdAt?.toDate()).toLocaleDateString()}
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
    color: "red",
    fontSize: 16,
    textAlign: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Profile;