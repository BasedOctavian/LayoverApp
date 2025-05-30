import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";
import { Ionicons } from "@expo/vector-icons";

export default function About() {
  const { theme } = React.useContext(ThemeContext);

  return (
    <LinearGradient
      colors={theme === "light" ? ["#e6e6e6", "#ffffff"] : ["#000000", "#1a1a1a"]}
      style={styles.container}
    >
      <TopBar />
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Image
              source={require('../../../assets/adaptive-icon.png')}
              style={[
                styles.logo,
                { tintColor: theme === "light" ? "#000000" : "#ffffff" }
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.subtitle,
                { color: theme === "light" ? "#666666" : "#999999" },
              ]}
            >
              Connect on Layovers
            </Text>
          </View>

          <View style={styles.content}>
            <Text
              style={[
                styles.description,
                { color: theme === "light" ? "#000000" : "#ffffff" },
              ]}
            >
             Wingman is a mobile app that connects travelers during layovers, fostering meaningful interactions at airports worldwide. Users can discover nearby travelers, match with those sharing similar interests, join or create local events, and chat seamlessly to plan meetups or share travel tips. With an intuitive interface and real-time updates, Wingman enhances the layover experience by turning downtime into opportunities for connection and adventure.
            </Text>

            <View style={styles.featuresContainer}>
              <Text
                style={[
                  styles.featuresTitle,
                  { color: theme === "light" ? "#000000" : "#ffffff" },
                ]}
              >
                Key Features
              </Text>
              <View style={styles.featureItem}>
                <Ionicons name="airplane" size={24} color="#37a4c8" />
                <Text
                  style={[
                    styles.featureText,
                    { color: theme === "light" ? "#000000" : "#ffffff" },
                  ]}
                >
                  Connect with fellow travelers at your airport
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="calendar" size={24} color="#37a4c8" />
                <Text
                  style={[
                    styles.featureText,
                    { color: theme === "light" ? "#000000" : "#ffffff" },
                  ]}
                >
                  Join or create events during your layover
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="chatbubbles" size={24} color="#37a4c8" />
                <Text
                  style={[
                    styles.featureText,
                    { color: theme === "light" ? "#000000" : "#ffffff" },
                  ]}
                >
                  Chat with travelers who share your interests
                </Text>
              </View>
            </View>

            <View style={styles.versionContainer}>
              <Text
                style={[
                  styles.versionText,
                  { color: theme === "light" ? "#666666" : "#999999" },
                ]}
              >
                Version 1.0.0
              </Text>
              <Text
                style={[
                  styles.copyrightText,
                  { color: theme === "light" ? "#666666" : "#999999" },
                ]}
              >
                © 2025 Wingman. All rights reserved.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  versionContainer: {
    marginTop: 40,
    alignItems: "center",
  },
  versionText: {
    fontSize: 14,
    marginBottom: 8,
  },
  copyrightText: {
    fontSize: 14,
  },
}); 