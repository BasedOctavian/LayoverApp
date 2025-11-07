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
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import TopBar from "../../components/TopBar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import LoadingScreen from "../../components/LoadingScreen";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";
import useNotificationCount from "../../hooks/useNotificationCount";
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

export default function About() {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  // Handle back button press
  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };
  
  // Enhanced animation values
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;
  const contentOpacityAnim = useRef(new Animated.Value(0)).current;
  const contentTranslateAnim = useRef(new Animated.Value(30)).current;
  const featureAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;
  const versionAnim = useRef(new Animated.Value(0)).current;

  // Simulate loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setInitialLoadComplete(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Enhanced entrance animation sequence
  useEffect(() => {
    if (!isLoading && initialLoadComplete) {
      // Logo animation
      Animated.parallel([
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2)),
        }),
        Animated.timing(logoOpacityAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();

      // Content animation with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(contentOpacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(contentTranslateAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          })
        ]).start();
      }, 300);

      // Staggered feature animations
      setTimeout(() => {
        featureAnimations.forEach((anim, index) => {
          Animated.timing(anim, {
            toValue: 1,
            duration: 350,
            delay: index * 150,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }).start();
        });
      }, 600);

      // Version animation
      setTimeout(() => {
        Animated.timing(versionAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }).start();
      }, 1000);
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
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Enhanced Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: logoOpacityAnim,
                transform: [{
                  scale: logoScaleAnim
                }]
              }
            ]}
          >
            <View style={[styles.logoContainer, {
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
            }]}>
              <Image
                source={theme === "light" 
                  ? require('../../../assets/images/splash-icon.png')
                  : require('../../../assets/images/splash-icon-dark.png')
                }
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[
                styles.title,
                { color: theme === "light" ? "#000000" : "#e4fbfe" },
              ]}
            >
              Wingman
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme === "light" ? "#64748B" : "#94A3B8" },
              ]}
            >
              Connect with Like-Minded People
            </Text>
          </Animated.View>

          {/* Enhanced Content */}
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: contentOpacityAnim,
                transform: [{
                  translateY: contentTranslateAnim
                }]
              }
            ]}
          >
            {/* Description Section */}
            <View style={[styles.descriptionContainer, {
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
            }]}>
              <View style={[styles.sectionHeader, {
                borderBottomColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              }]}>
                <Ionicons name="information-circle" size={24} color="#37a4c8" />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme === "light" ? "#000000" : "#e4fbfe" },
                  ]}
                >
                  About Wingman
                </Text>
              </View>
              <Text
                style={[
                  styles.description,
                  { color: theme === "light" ? "#000000" : "#e4fbfe" },
                ]}
              >
                Wingman is a comprehensive mobile app that connects people with similar interests through spontaneous connections and local events. Our advanced matching system considers your personality, interests, availability, and preferences to connect you with like-minded individuals in your area. Whether you're seeking professional networking, social activities, or meaningful companionship, Wingman's intelligent algorithms and detailed profile system ensure authentic connections that match your lifestyle and goals.
              </Text>
            </View>

            {/* Enhanced Features Section */}
            <View style={[styles.featuresContainer, {
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
            }]}>
              <View style={[styles.sectionHeader, {
                borderBottomColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              }]}>
                <Ionicons name="star" size={24} color="#37a4c8" />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme === "light" ? "#000000" : "#e4fbfe" },
                  ]}
                >
                  Key Features
                </Text>
              </View>
              
              <Animated.View style={[styles.featureItem, {
                opacity: featureAnimations[0],
                transform: [{
                  translateX: featureAnimations[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })
                }]
              }]}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="people" size={24} color="#37a4c8" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: theme === "light" ? "#000000" : "#e4fbfe" },
                    ]}
                  >
                    Smart Matching System
                  </Text>
                  <Text
                    style={[
                      styles.featureText,
                      { color: theme === "light" ? "#64748B" : "#94A3B8" },
                    ]}
                  >
                    Advanced algorithms match you with compatible people based on personality, interests, and preferences
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureItem, {
                opacity: featureAnimations[1],
                transform: [{
                  translateX: featureAnimations[1].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })
                }]
              }]}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="calendar" size={24} color="#37a4c8" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: theme === "light" ? "#000000" : "#e4fbfe" },
                    ]}
                  >
                    Personalized Availability
                  </Text>
                  <Text
                    style={[
                      styles.featureText,
                      { color: theme === "light" ? "#64748B" : "#94A3B8" },
                    ]}
                  >
                    Set your weekly schedule and preferences to find connections that fit your timeline and location
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureItem, {
                opacity: featureAnimations[2],
                transform: [{
                  translateX: featureAnimations[2].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })
                }]
              }]}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="heart" size={24} color="#37a4c8" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: theme === "light" ? "#000000" : "#e4fbfe" },
                    ]}
                  >
                    Personality Matching
                  </Text>
                  <Text
                    style={[
                      styles.featureText,
                      { color: theme === "light" ? "#64748B" : "#94A3B8" },
                    ]}
                  >
                    Connect based on personality types, lifestyle preferences, and personal tags for meaningful relationships
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureItem, {
                opacity: featureAnimations[3],
                transform: [{
                  translateX: featureAnimations[3].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })
                }]
              }]}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="location" size={24} color="#37a4c8" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: theme === "light" ? "#000000" : "#e4fbfe" },
                    ]}
                  >
                    Flexible Meetup Radius
                  </Text>
                  <Text
                    style={[
                      styles.featureText,
                      { color: theme === "light" ? "#64748B" : "#94A3B8" },
                    ]}
                  >
                    Choose how far you're willing to travel for connections, from spontaneous local meetups to planned regional events
                  </Text>
                </View>
              </Animated.View>

              <Animated.View style={[styles.featureItem, {
                opacity: featureAnimations[4],
                transform: [{
                  translateX: featureAnimations[4].interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0]
                  })
                }]
              }]}>
                <View style={[styles.featureIconContainer, {
                  backgroundColor: theme === "light" ? "#F8FAFC" : "#000000",
                  borderColor: "#37a4c8"
                }]}>
                  <Ionicons name="chatbubbles" size={24} color="#37a4c8" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: theme === "light" ? "#000000" : "#e4fbfe" },
                    ]}
                  >
                    Rich Communication
                  </Text>
                  <Text
                    style={[
                      styles.featureText,
                      { color: theme === "light" ? "#64748B" : "#94A3B8" },
                    ]}
                  >
                    Send pings for spontaneous connections or chat to coordinate local events with detailed preferences
                  </Text>
                </View>
              </Animated.View>
            </View>

            {/* Enhanced Version Section */}
            <Animated.View style={[styles.versionContainer, {
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              opacity: versionAnim,
              transform: [{
                scale: versionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1]
                })
              }]
            }]}>
              <View style={[styles.sectionHeader, {
                borderBottomColor: theme === "light" ? "#E2E8F0" : "#37a4c8",
              }]}>
                <Ionicons name="settings" size={24} color="#37a4c8" />
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme === "light" ? "#000000" : "#e4fbfe" },
                  ]}
                >
                  App Information
                </Text>
              </View>
              <Text
                style={[
                  styles.versionText,
                  { color: theme === "light" ? "#64748B" : "#94A3B8" },
                ]}
              >
                Version 2.0.0
              </Text>
              <Text
                style={[
                  styles.copyrightText,
                  { color: theme === "light" ? "#64748B" : "#94A3B8" },
                ]}
              >
                © 2025 Wingman. All rights reserved.
              </Text>
            </Animated.View>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 8,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500",
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    gap: 24,
  },
  descriptionContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    elevation: 6,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  featuresContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    elevation: 6,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  featureIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  featureText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  versionContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    elevation: 6,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  versionText: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  copyrightText: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: 'center',
  },
}); 