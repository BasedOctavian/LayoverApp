import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";
import { onAuthStateChanged, User } from "firebase/auth"; // Added auth imports
import { auth } from "../../../firebaseConfig"; // Adjust path as needed

export default function Settings() {
  const { user, logout } = useAuth();
  const { getUser } = useUsers();
  const [userData, setUserData] = React.useState(null);
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Added auth state listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    });
    return unsubscribe; // Cleanup subscription
  }, []);

  // Fetch user data when the user object is available
  React.useEffect(() => {
    if (user) {
      getUser(user.uid).then((data) => setUserData(data));
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Settings Title */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* User Information Section */}
      {userData && (
        <View style={styles.userHeader}>
          {userData.profilePicture ? (
            <Image source={{ uri: userData.profilePicture }} style={styles.profilePicture} />
          ) : (
            <Ionicons name="person-circle" size={50} color="#CBD5E1" />
          )}
          <Text style={styles.userName}>{userData.name}</Text>
        </View>
      )}

      {/* Settings Options */}
      <ScrollView contentContainerStyle={styles.settingsContainer}>
        {/* Account Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push("/profile/edit")}
          >
            <LinearGradient
              colors={["#2F80ED", "#1A5FB4"]}
              style={styles.settingsGradient}
            >
              <Ionicons name="person" size={24} color="#FFFFFF" />
              <Text style={styles.settingsText}>Edit Profile</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="#FFFFFF"
                style={styles.chevronIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push("/account/password")}
          >
            <LinearGradient
              colors={["#2F80ED", "#1A5FB4"]}
              style={styles.settingsGradient}
            >
              <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
              <Text style={styles.settingsText}>Change Password</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="#FFFFFF"
                style={styles.chevronIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push("/privacy")}
          >
            <LinearGradient
              colors={["#2F80ED", "#1A5FB4"]}
              style={styles.settingsGradient}
            >
              <Ionicons name="eye-off" size={24} color="#FFFFFF" />
              <Text style={styles.settingsText}>Privacy Settings</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="#FFFFFF"
                style={styles.chevronIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push("/notifications")}
          >
            <LinearGradient
              colors={["#2F80ED", "#1A5FB4"]}
              style={styles.settingsGradient}
            >
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
              <Text style={styles.settingsText}>Notification Preferences</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="#FFFFFF"
                style={styles.chevronIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* App Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push("/app/theme")}
          >
            <LinearGradient
              colors={["#2F80ED", "#1A5FB4"]}
              style={styles.settingsGradient}
            >
              <Ionicons name="color-palette" size={24} color="#FFFFFF" />
              <Text style={styles.settingsText}>Theme</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="#FFFFFF"
                style={styles.chevronIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => router.push("/app/language")}
          >
            <LinearGradient
              colors={["#2F80ED", "#1A5FB4"]}
              style={styles.settingsGradient}
            >
              <Ionicons name="language" size={24} color="#FFFFFF" />
              <Text style={styles.settingsText}>Language</Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color="#FFFFFF"
                style={styles.chevronIcon}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <LinearGradient
            colors={["#FF5A5F", "#C1134E"]}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out" size={24} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E293B",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
  },
  settingsContainer: {
    padding: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  settingsItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingsText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
  },
  chevronIcon: {
    marginLeft: "auto",
  },
  logoutButton: {
    marginTop: 24,
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginLeft: 12,
  },
  loadingText: {
    fontSize: 18,
    color: "#1E293B",
    textAlign: "center",
  },
});