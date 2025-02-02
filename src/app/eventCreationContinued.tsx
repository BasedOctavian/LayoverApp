import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, Button, Switch, FlatList, Image, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useRouter } from "expo-router";

export default function EventCreationContinued() {
  const router = useRouter(); // Initialize the router
  const [pin] = useState({
    latitude: 42.93495821728902, // Latitude of Anchor Bar, Buffalo, NY
    longitude: -78.73171933068465, // Longitude of Anchor Bar, Buffalo, NY
  });

  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [tags, setTags] = useState([]);

  const availableTags = ["Music", "Food", "Sports", "Networking", "Party"];

  const toggleTag = (tag) => {
    setTags((prevTags) =>
      prevTags.includes(tag) ? prevTags.filter((t) => t !== tag) : [...prevTags, tag]
    );
  };

  const handleFinishPress = () => {
    // Logic for finishing the event creation
    console.log({
      eventName,
      eventDescription,
      eventDate,
      isPrivate,
      tags,
      location: pin,
    });
    router.push("/search"); // Navigate to the next screen
  };

  return (
    <View style={styles.container}>
      <MapView
        mapType="hybrid"
        style={styles.map}
        initialRegion={{
          latitude: pin.latitude,
          longitude: pin.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        region={{
          latitude: pin.latitude,
          longitude: pin.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{
            latitude: pin.latitude,
            longitude: pin.longitude,
          }}
          title="Anchor Bar"
          description="The birthplace of Buffalo Wings"
        />
      </MapView>
      <Text style={styles.headerText}>Create Event</Text>
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Event Name"
          placeholderTextColor="gray"
          value={eventName}
          onChangeText={setEventName}
        />
        <TextInput
          style={styles.input}
          placeholder="Description"
          placeholderTextColor="gray"
          value={eventDescription}
          onChangeText={setEventDescription}
        />
        <TextInput
          style={styles.input}
          placeholder="Date and Time (e.g., 2025-01-14 18:30)"
          placeholderTextColor="gray"
          value={eventDate}
          onChangeText={setEventDate}
        />
        <View style={styles.tagContainer}>
          <Text style={styles.label}>Select Tags:</Text>
          <View style={styles.tagList}>
            {availableTags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tag,
                  tags.includes(tag) && styles.selectedTag,
                ]}
                onPress={() => toggleTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    tags.includes(tag) && styles.selectedTagText,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.switchContainer}>
          <Text style={styles.label}>
            Event is {isPrivate ? "Private" : "Public"}
          </Text>
          <Switch
            value={isPrivate}
            onValueChange={setIsPrivate}
            thumbColor={isPrivate ? "green" : "gray"}
          />
        </View>
        <Button title="Finish" onPress={handleFinishPress} color="green" />
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
    height: "40%",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
    color: "white",
  },
  formContainer: {
    padding: 15,
    backgroundColor: "black",
  },
  input: {
    backgroundColor: "#222",
    color: "white",
    padding: 10,
    borderRadius: 5,
    marginBottom: 25,
  },
  tagContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  tagList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    backgroundColor: "#444",
    borderRadius: 20,
    padding: 10,
    margin: 5,
  },
  selectedTag: {
    backgroundColor: "green",
  },
  tagText: {
    color: "white",
  },
  selectedTagText: {
    color: "white",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
});
