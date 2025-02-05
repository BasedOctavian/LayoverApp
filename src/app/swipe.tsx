import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import Swiper from "react-native-deck-swiper";
import useUsers from './../hooks/useUsers';

const { width, height } = Dimensions.get("window");

const Swipe = () => {
  const [users, setUsers] = useState<any[]>([]);
  const { getUsers, loading, error } = useUsers();
  const swiperRef = useRef<Swiper<any>>(null);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const users = await getUsers();
    if (users) {
      setUsers(users);
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

  if (!users.length) {
    return (
      <View style={styles.container}>
        <Text>No user data found.</Text>
      </View>
    );
  }

  const renderCard = (user: any) => {
    return (
      <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.cardContainer}>
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.sectionContent}>{user.bio}</Text>
        </View>

        {/* Languages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="language" size={20} color="#fff" /> Languages
          </Text>
          <Text style={styles.sectionContent}>
            {user.languages.join(", ")}
          </Text>
        </View>

        {/* Interests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="favorite" size={20} color="#fff" /> Interests
          </Text>
          <Text style={styles.sectionContent}>
            {user.interests.join(", ")}
          </Text>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <FontAwesome name="bullseye" size={20} color="#fff" /> Goals
          </Text>
          <Text style={styles.sectionContent}>
            {user.goals.join(", ")}
          </Text>
        </View>

        {/* Travel History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="flight" size={20} color="#fff" /> Travel History
          </Text>
          <Text style={styles.sectionContent}>
            {user.travelHistory.join(", ")}
          </Text>
        </View>

        {/* Member Since */}
        <Text style={styles.createdAtText}>
          Member since: {new Date(user.createdAt?.toDate()).toLocaleDateString()}
        </Text>
      </LinearGradient>
    );
  };

  return (
    <View style={styles.container}>
      <Swiper
        ref={swiperRef}
        cards={users}
        renderCard={renderCard}
        onSwipedLeft={(index) => console.log("Swiped left on user:", users[index].name)}
        onSwipedRight={(index) => console.log("Swiped right on user:", users[index].name)}
        onSwipedAll={() => console.log("All cards swiped!")}
        cardIndex={0}
        backgroundColor="transparent"
        stackSize={3}
        verticalSwipe={false}
        animateCardOpacity
        overlayLabels={{
          left: {
            title: "NOPE",
            style: {
              label: {
                backgroundColor: "red",
                borderColor: "red",
                color: "#fff",
                borderWidth: 1,
              },
              wrapper: {
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                marginTop: 30,
                marginLeft: -30,
              },
            },
          },
          right: {
            title: "LIKE",
            style: {
              label: {
                backgroundColor: "green",
                borderColor: "green",
                color: "#fff",
                borderWidth: 1,
              },
              wrapper: {
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
                marginTop: 30,
                marginLeft: 30,
              },
            },
          },
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  cardContainer: {
    flex: 1,
    borderRadius: 15,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
  section: {
    width: "100%",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  sectionContent: {
    fontSize: 16,
    color: "#fff",
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
});

export default Swipe;