import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router"; // Import useRouter for navigation

export default function EventCreation() {
  const [pin, setPin] = useState(null); // State to hold the current pin
  const router = useRouter(); // Initialize router for navigation

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setPin({ latitude, longitude }); // Set a new pin location
  };

  const handleContinue = () => {
    router.push({
        pathname: "/eventCreationContinued",
        params: { latitude: pin.latitude, longitude: pin.longitude },
      });
  };

  const handleBack = () => {
    router.back(); // Navigate back to the previous screen
  };

  return (
    <View style={styles.container}>
      <MapView
        mapType="hybrid"
        style={styles.map}
        initialRegion={{
          latitude: 42.9405, // Latitude for BUF Niagara Airport
          longitude: -78.7322, // Longitude for BUF Niagara Airport
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        onPress={handleMapPress} // Add a pin when the map is pressed
      >
        {pin && (
          <Marker
            coordinate={{
              latitude: pin.latitude,
              longitude: pin.longitude,
            }}
          />
        )}
      </MapView>
      <View style={styles.infoContainer}>
        {pin ? (
          <>
            <Text style={styles.infoText}>
              Selected Location:
              {"\n"}Latitude: {pin.latitude.toFixed(5)}
              {"\n"}Longitude: {pin.longitude.toFixed(5)}
            </Text>
            <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.infoText}>Tap on the map to select a location.</Text>
        )}
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  map: {
    width: "100%",
    height: "70%", // Adjust map height
  },
  infoContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a", // Dark background for contrast
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: "#007AFF", // Blue button color
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginBottom: 10, // Space between buttons
  },
  backButton: {
    backgroundColor: "#FF3B30", // Red button color for back
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});
