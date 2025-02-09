import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Animated } from "react-native";
import MapView from "react-native-maps";
import { Ionicons, FontAwesome5, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import useAuth from "../../hooks/auth";

type FeatureButton = {
  icon: React.ReactNode;
  title: string;
  screen: string;
  size?: 'half' | 'full';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<'airports' | 'events'>('airports');
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-100))[0];

  const sampleResults = {
    airports: [
      { name: "Buffalo Niagara International", icon: "airport" },
      { name: "Terminal Map", icon: "map" },
      { name: "Parking Information", icon: "parking" },
      { name: "Airport Lounges", icon: "star" },
      { name: "Security Wait Times", icon: "clock" }
    ],
    events: [
      { name: "Music Festival", icon: "music" },
      { name: "Business Conference", icon: "briefcase" },
      { name: "Food Tasting", icon: "coffee" },
      { name: "Networking Mixer", icon: "users" },
      { name: "Art Exhibition", icon: "palette" }
    ]
  };

  const toggleSearch = (show: boolean) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: show ? 1 : 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: show ? 0 : -100,
        duration: 400,
        useNativeDriver: true
      })
    ]).start();
    setShowSearch(show);
    if (!show) setSearchQuery("");
  };

  useEffect(() => {
    if (user) {
      setUserId(user.uid);
      console.log("User ID:", user.uid);
    }
  }, [user]);

  const features: FeatureButton[] = [
    { 
      icon: <FontAwesome5 name="user-friends" size={24} color="#FFFFFF" />, 
      title: 'Nearby Users', 
      screen: 'swipe',
      size: 'full'
    },
    { 
      icon: <Feather name="plus" size={24} color="#FFFFFF" />, 
      title: 'Create Event', 
      screen: 'eventCreation',
      size: 'full'
    },
    { 
      icon: <MaterialIcons name="event" size={24} color="#FFFFFF" />, 
      title: 'Events', 
      screen: 'home',
      size: 'full'
    },
    { 
      icon: <MaterialIcons name="message" size={24} color="#FFFFFF" />, 
      title: 'Messages', 
      screen: 'chat/chatInbox',
      size: 'full'
    },
    { 
      icon: <Feather name="edit" size={18} color="#FFFFFF" />, 
      title: 'Status', 
      screen: 'Status',
      size: 'half'
    },
    { 
      icon: <Feather name="user" size={18} color="#FFFFFF" />, 
      title: 'Profile', 
      screen: 'profile/' + userId,
      size: 'half'
    },
    { 
      icon: <Ionicons name="settings" size={24} color="#FFFFFF" />, 
      title: 'Settings', 
      screen: 'settings',
      size: 'full'
    },
  ];

  const filteredResults = sampleResults[searchType].filter(result =>
    result.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <Animated.View style={[styles.searchHeader, { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${searchType}...`}
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={false}
          />
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => toggleSearch(false)}
          >
            <Feather name="x" size={24} color="#2F80ED" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setSearchType('airports')}
          >
            <LinearGradient
              colors={searchType === 'airports' ? ['#2F80ED', '#1A5FB4'] : ['#F1F5F9', '#FFFFFF']}
              style={[styles.filterGradient, styles.filterButtonInner]}
            >
              <Feather 
                name="airplay" 
                size={18} 
                color={searchType === 'airports' ? '#FFFFFF' : '#64748B'} 
              />
              <Text style={[
                styles.filterText,
                searchType === 'airports' && styles.activeFilterText
              ]}>
                Airports
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setSearchType('events')}
          >
            <LinearGradient
              colors={searchType === 'events' ? ['#2F80ED', '#1A5FB4'] : ['#F1F5F9', '#FFFFFF']}
              style={[styles.filterGradient, styles.filterButtonInner]}
            >
              <Feather 
                name="calendar" 
                size={18} 
                color={searchType === 'events' ? '#FFFFFF' : '#64748B'} 
              />
              <Text style={[
                styles.filterText,
                searchType === 'events' && styles.activeFilterText
              ]}>
                Events
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Default Search Bar */}
      {!showSearch && (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => toggleSearch(true)}
          style={styles.defaultSearchContainer}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.searchContainer}
          >
            <Feather name="search" size={18} color="#64748B" />
            <Text style={styles.searchPlaceholder}>
              Buffalo Niagara International Airport
            </Text>
            <Feather name="chevron-down" size={20} color="#64748B" style={styles.searchIcon} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 42.9405,
            longitude: -78.7322,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      </View>

      {/* Search Results or Dashboard Features */}
      {showSearch ? (
        <Animated.ScrollView 
          contentContainerStyle={styles.searchResultsContainer}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        >
          {filteredResults.map((result, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.resultItem}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                style={styles.resultGradient}
              >
                <Feather 
                  name={result.icon} 
                  size={20} 
                  color="#2F80ED" 
                  style={styles.resultIcon}
                />
                <Text style={styles.resultText}>{result.name}</Text>
                <Feather name="chevron-right" size={18} color="#CBD5E1" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.featuresContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* Dashboard Features Grid */}
          <View style={styles.gridRow}>
            {features.slice(0, 2).map((feature, index) => (
              <LinearGradient
                key={index}
                colors={['#2F80ED', '#1A5FB4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.featureButton, styles.fullButton]}
              >
                <TouchableOpacity 
                  style={styles.buttonInner}
                  onPress={() => router.push(feature.screen)}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                    style={styles.iconContainer}
                  >
                    {feature.icon}
                  </LinearGradient>
                  <Text style={styles.buttonText}>{feature.title}</Text>
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>

          <View style={styles.gridRow}>
            {features.slice(2, 4).map((feature, index) => (
              <LinearGradient
                key={index}
                colors={['#2F80ED', '#1A5FB4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.featureButton, styles.fullButton]}
              >
                <TouchableOpacity 
                  style={styles.buttonInner}
                  onPress={() => router.push(feature.screen)}
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                    style={styles.iconContainer}
                  >
                    {feature.icon}
                  </LinearGradient>
                  <Text style={styles.buttonText}>{feature.title}</Text>
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>

          <View style={styles.gridRow}>
            <View style={styles.halfButtonContainer}>
              {features.slice(4, 6).map((feature, index) => (
                <LinearGradient
                  key={index}
                  colors={['#2F80ED', '#1A5FB4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.featureButton, styles.halfButton]}
                >
                  <TouchableOpacity
                    style={styles.buttonInner}
                    onPress={() => router.push(feature.screen)}
                  >
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                      style={styles.iconContainer}
                    >
                      {feature.icon}
                    </LinearGradient>
                    <Text style={styles.smallButtonText}>{feature.title}</Text>
                  </TouchableOpacity>
                </LinearGradient>
              ))}
            </View>
            <LinearGradient
              colors={['#2F80ED', '#1A5FB4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.featureButton, styles.fullButton]}
            >
              <TouchableOpacity 
                style={styles.buttonInner}
                onPress={() => router.push(features[6].screen)}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.iconContainer}
                >
                  <Ionicons name="settings" size={24} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.buttonText}>Settings</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
    paddingVertical: 8,
  },
  cancelButton: {
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterGradient: {
    borderRadius: 12,
    padding: 12,
  },
  filterButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  defaultSearchContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 2,
  },
  searchContainer: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    fontFamily: 'Inter-Medium',
  },
  searchIcon: {
    marginLeft: 8,
  },
  mapContainer: {
    height: '37%',
    borderRadius: 24,
    overflow: 'hidden',
    margin: 16,
    marginTop: 115,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  map: {
    flex: 1,
    borderRadius: 24,
  },
  featuresContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featureButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#2F80ED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fullButton: {
    width: '48%',
    height: 120,
  },
  halfButtonContainer: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    width: '48%',
    height: 120,
  },
  buttonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  searchResultsContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  resultItem: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
  },
});