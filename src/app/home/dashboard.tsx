import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import MapView from "react-native-maps";
import { Ionicons, FontAwesome5, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

type FeatureButton = {
  icon: React.ReactNode;
  title: string;
  screen: string;
  size?: 'half' | 'full';
};

const Dashboard: React.FC = () => {
  const features: FeatureButton[] = [
    { 
      icon: <FontAwesome5 name="user-friends" size={28} color="#FFFFFF" />, 
      title: 'Nearby Users', 
      screen: '/Swipe',
      size: 'full'
    },
    { 
      icon: <Feather name="plus" size={28} color="#FFFFFF" />, 
      title: 'Create Event', 
      screen: 'CreateEvent',
      size: 'full'
    },
    { 
      icon: <MaterialIcons name="event" size={28} color="#FFFFFF" />, 
      title: 'View Events', 
      screen: 'Events',
      size: 'full'
    },
    { 
      icon: <MaterialIcons name="message" size={28} color="#FFFFFF" />, 
      title: 'Messages', 
      screen: 'Messages',
      size: 'full'
    },
    { 
      icon: <Feather name="edit" size={22} color="#FFFFFF" />, 
      title: 'Status', 
      screen: 'Status',
      size: 'half'
    },
    { 
      icon: <Feather name="user" size={22} color="#FFFFFF" />, 
      title: 'Profile', 
      screen: 'Profile',
      size: 'half'
    },
    { 
      icon: <Ionicons name="settings" size={28} color="#FFFFFF" />, 
      title: 'Settings', 
      screen: 'Settings',
      size: 'full'
    },
  ];

  return (
    <View style={styles.container}>
      {/* Map Section with Header */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.5)', 'transparent']}
          style={styles.mapOverlay}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Layover</Text>
            <TouchableOpacity style={styles.locationButton}>
              <Feather name="navigation" size={20} color="#2F80ED" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Dashboard Features Grid */}
      <ScrollView 
        contentContainerStyle={styles.featuresContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View style={styles.gridRow}>
          {features.slice(0, 2).map((feature, index) => (
            <TouchableOpacity 
              key={index}
              style={[styles.featureButton, styles.fullButton]}
              onPress={() => router.push("/swipe")}
            >
              <View style={styles.iconContainer}>
                {feature.icon}
              </View>
              <Text style={styles.buttonText}>{feature.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.gridRow}>
          {features.slice(2, 4).map((feature, index) => (
            <TouchableOpacity 
              key={index}
              style={[styles.featureButton, styles.fullButton]}
              onPress={() => router.push("/eventCreation")}
            >
              <View style={styles.iconContainer}>
                {feature.icon}
              </View>
              <Text style={styles.buttonText}>{feature.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.gridRow}>
          <View style={styles.halfButtonContainer}>
            {features.slice(4, 6).map((feature, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.featureButton, styles.halfButton]}
                onPress={() => router.push(feature.screen)}
              >
                <View style={styles.iconContainer}>
                  {feature.icon}
                </View>
                <Text style={styles.smallButtonText}>{feature.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity 
            style={[styles.featureButton, styles.fullButton]}
            onPress={() => console.log('Navigate to Settings')}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="settings" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.buttonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mapContainer: {
    height: '35%',
    borderRadius: 24,
    overflow: 'hidden',
    margin: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 75,
  },
  map: {
    flex: 1,
    borderRadius: 24,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    letterSpacing: -0.5,
  },
  locationButton: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  featuresContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  featureButton: {
    backgroundColor: '#2F80ED',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#2F80ED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  fullButton: {
    width: '48%',
    height: 140,
  },
  halfButtonContainer: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    width: '48%',
    height: 140,
    backgroundColor: '#2F80ED',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginTop: 8,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default Dashboard;