import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import LoadingScreen from "../../components/LoadingScreen";

export default function About() {
  const { theme } = React.useContext(ThemeContext);
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Animation values
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.9)).current;

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setInitialLoadComplete(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Start entrance animation
  useEffect(() => {
    if (!isLoading && initialLoadComplete) {
      Animated.sequence([
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.parallel([
          Animated.timing(contentBounceAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(contentScaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          })
        ])
      ]).start();
    }
  }, [isLoading, initialLoadComplete]);

  // Show loading screen during initial load
  if (isLoading || !initialLoadComplete) {
    return <LoadingScreen />;
  }

  return (
    <LinearGradient
      colors={theme === "light" ? ["#f8f9fa", "#ffffff", "#f8f9fa"] : ["#000000", "#1a1a1a", "#000000"]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <TopBar />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.header,
              {
                transform: [{
                  scale: logoScaleAnim
                }]
              }
            ]}
          >
            <Image
              source={require('../../../assets/adaptive-icon.png')}
              style={[
                styles.logo,
                { tintColor: theme === "light" ? "#000000" : "#e4fbfe" }
              ]}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.subtitle,
                { color: theme === "light" ? "#64748B" : "#94A3B8" },
              ]}
            >
              Connect on Layovers
            </Text>
          </Animated.View>

          <Animated.View 
            style={[
              styles.content,
              {
                opacity: contentBounceAnim,
                transform: [
                  { scale: contentScaleAnim },
                  {
                    translateY: contentBounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={[styles.descriptionContainer, {
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
            }]}>
              <Text
                style={[
                  styles.description,
                  { color: theme === "light" ? "#000000" : "#e4fbfe" },
                ]}
              >
                Wingman is a mobile app that connects travelers during layovers, fostering meaningful interactions at airports worldwide. Users can discover nearby travelers, match with those sharing similar interests, join or create local events, and chat seamlessly to plan meetups or share travel tips. With an intuitive interface and real-time updates, Wingman enhances the layover experience by turning downtime into opportunities for connection and adventure.
              </Text>
            </View>

            <View style={[styles.featuresContainer, {
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
            }]}>
              <Text
                style={[
                  styles.featuresTitle,
                  { color: theme === "light" ? "#000000" : "#e4fbfe" },
                ]}
              >
                Key Features
              </Text>
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="airplane" size={24} color="#37a4c8" />
                </View>
                <Text
                  style={[
                    styles.featureText,
                    { color: theme === "light" ? "#000000" : "#e4fbfe" },
                  ]}
                >
                  Connect with fellow travelers at your airport
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="calendar" size={24} color="#37a4c8" />
                </View>
                <Text
                  style={[
                    styles.featureText,
                    { color: theme === "light" ? "#000000" : "#e4fbfe" },
                  ]}
                >
                  Join or create events during your layover
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="chatbubbles" size={24} color="#37a4c8" />
                </View>
                <Text
                  style={[
                    styles.featureText,
                    { color: theme === "light" ? "#000000" : "#e4fbfe" },
                  ]}
                >
                  Chat with travelers who share your interests
                </Text>
              </View>
            </View>

            <View style={[styles.versionContainer, {
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
            }]}>
              <Text
                style={[
                  styles.versionText,
                  { color: theme === "light" ? "#64748B" : "#94A3B8" },
                ]}
              >
                Version 1.1.1
              </Text>
              <Text
                style={[
                  styles.copyrightText,
                  { color: theme === "light" ? "#64748B" : "#94A3B8" },
                ]}
              >
                © 2025 Wingman. All rights reserved.
              </Text>
            </View>
          </Animated.View>
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
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  descriptionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  featuresContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  versionContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  versionText: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  copyrightText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
}); 