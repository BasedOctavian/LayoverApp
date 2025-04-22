import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../config/firebaseConfig";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import { useRouter } from "expo-router";
import TopBar from "../../components/TopBar";

interface Trip {
  id: string;
  name: string;
  photos: string[];
}

interface FormData {
  name: string;
  age: string;
  moodStatus: string;
  bio: string;
  languages: string[];
  interests: string[];
  goals: string[];
  travelHistory: Trip[];
  profilePicture: string;
}

type ProfileArrayField = "languages" | "interests" | "goals";

const EditProfile = () => {
  const { userId } = useAuth();
  const { updateUser } = useUsers();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    age: "",
    moodStatus: "",
    bio: "",
    languages: [""],
    interests: [""],
    goals: [""],
    travelHistory: [],
    profilePicture: "",
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("login/login");
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        try {
          const userDocRef = doc(db, "users", userId);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFormData({
              name: data.name || "",
              age: data.age?.toString() || "",
              moodStatus: data.moodStatus || "",
              bio: data.bio || "",
              languages: data.languages || [""],
              interests: data.interests || [""],
              goals: data.goals || [""],
              travelHistory: data.travelHistory
                ? Array.isArray(data.travelHistory) && typeof data.travelHistory[0] === "string"
                  ? data.travelHistory.map((name) => ({
                      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      name,
                      photos: [],
                    }))
                  : data.travelHistory
                : [],
              profilePicture: data.profilePicture || "",
            });
          }
        } catch (error) {
          Alert.alert("Error", "Failed to load user data");
        } finally {
          setLoading(false);
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }).start();
        }
      }
    };

    fetchUserData();
  }, [userId]);

  const handleSelectPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "We need access to your photos to set a profile picture"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri ?? "";
        setFormData((prev) => ({ ...prev, profilePicture: selectedUri }));
      }
    } catch (err) {
      console.log("Image picker error:", err);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const handleAddTrip = () => {
    const newTrip = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: "",
      photos: [],
    };
    setFormData((prev) => ({
      ...prev,
      travelHistory: [...prev.travelHistory, newTrip],
    }));
  };

  const handleRemoveTrip = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      travelHistory: prev.travelHistory.filter((_, i) => i !== index),
    }));
  };

  const handleTripNameChange = (index: number, text: string) => {
    setFormData((prev) => {
      const updatedTrips = [...prev.travelHistory];
      updatedTrips[index] = { ...updatedTrips[index], name: text };
      return { ...prev, travelHistory: updatedTrips };
    });
  };

  const handleAddPhoto = async (tripIndex: number) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "We need access to your photos");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri ?? "";
        setFormData((prev) => {
          const updatedTrips = [...prev.travelHistory];
          const currentPhotos = updatedTrips[tripIndex].photos;
          if (currentPhotos.includes(selectedUri)) {
            Alert.alert("Photo already added", "This photo is already in the gallery.");
            return prev; // Skip adding the duplicate
          }
          updatedTrips[tripIndex].photos = [...currentPhotos, selectedUri];
          return { ...prev, travelHistory: updatedTrips };
        });
      }
    } catch (err) {
      console.log("Image picker error:", err);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const handleUpdateProfile = async () => {
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }
    setUpdating(true);
    try {
      let profilePicUrl = formData.profilePicture;

      if (profilePicUrl && !profilePicUrl.startsWith("http")) {
        const response = await fetch(profilePicUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `profilePictures/${userId}`);
        await uploadBytes(storageRef, blob);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      const updatedTravelHistory = await Promise.all(
        formData.travelHistory.map(async (trip) => {
          const updatedPhotos = await Promise.all(
            trip.photos.map(async (photo) => {
              if (photo.startsWith("http")) {
                return photo;
              } else {
                const response = await fetch(photo);
                const blob = await response.blob();
                const storageRef = ref(
                  storage,
                  `trips/${userId}/${trip.id}/${Date.now()}.jpg`
                );
                await uploadBytes(storageRef, blob);
                return await getDownloadURL(storageRef);
              }
            })
          );
          return { ...trip, photos: updatedPhotos };
        })
      );

      const updatedData = {
        ...formData,
        profilePicture: profilePicUrl,
        age: parseInt(formData.age, 10),
        languages: formData.languages.filter((l) => l.trim() !== ""),
        interests: formData.interests.filter((i) => i.trim() !== ""),
        goals: formData.goals.filter((g) => g.trim() !== ""),
        travelHistory: updatedTravelHistory,
        updatedAt: serverTimestamp(),
      };

      await updateUser(userId, updatedData);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddField = (field: ProfileArrayField) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const handleRemoveField = (field: ProfileArrayField, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((value: string, i: number) => i !== index),
    }));
  };

  const handleFieldChange = (
    field: ProfileArrayField,
    index: number,
    text: string
  ) => {
    const updatedFields = [...formData[field]];
    updatedFields[index] = text;
    setFormData((prev) => ({
      ...prev,
      [field]: updatedFields,
    }));
  };

  if (authLoading || loading) {
    return (
      <LinearGradient colors={["#f8f9fa", "#e9ecef"]} style={styles.gradient}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6a11cb" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#E6F0FA", "#E6F0FA"]} style={styles.gradient}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handleSelectPhoto}>
              <Image
                source={{
                  uri:
                    formData.profilePicture ||
                    "https://via.placeholder.com/150",
                }}
                style={styles.profileImage}
              />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Basic Info Section */}
          <View style={[styles.card, styles.sectionCard]}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={formData.name}
              onChangeText={(text) =>
                setFormData({ ...formData, name: text })
              }
              placeholderTextColor="#718096"
            />
            <TextInput
              style={styles.input}
              placeholder="Age"
              value={formData.age}
              onChangeText={(text) =>
                setFormData({ ...formData, age: text })
              }
              keyboardType="numeric"
              placeholderTextColor="#718096"
            />
            <TextInput
              style={styles.input}
              placeholder="Mood Status"
              value={formData.moodStatus}
              onChangeText={(text) =>
                setFormData({ ...formData, moodStatus: text })
              }
              placeholderTextColor="#718096"
            />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Bio"
              value={formData.bio}
              onChangeText={(text) =>
                setFormData({ ...formData, bio: text })
              }
              multiline
              placeholderTextColor="#718096"
            />
          </View>

          {/* Dynamic Fields Section */}
          {(["languages", "interests", "goals"] as ProfileArrayField[]).map(
            (field) => (
              <View key={field} style={[styles.card, styles.sectionCard]}>
                <Text style={styles.cardTitle}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
                {formData[field].map((value, index) => (
                  <View key={index} style={styles.fieldRow}>
                    <TextInput
                      style={[styles.input, styles.flexInput]}
                      value={value}
                      onChangeText={(text) =>
                        handleFieldChange(field, index, text)
                      }
                      placeholder={`Enter ${field.slice(0, -1)}`}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      onPress={() => handleRemoveField(field, index)}
                      style={styles.removeButton}
                    >
                      <MaterialIcons
                        name="remove-circle"
                        size={24}
                        color="#ff4444"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddField(field)}
                >
                  <Text style={styles.addButtonText}>
                    <MaterialIcons
                      name="add-circle"
                      size={18}
                      color="#6a11cb"
                    />{" "}
                    Add {field.slice(0, -1)}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}

          {/* Travel History Section */}
          <View style={[styles.card, styles.sectionCard]}>
            <Text style={styles.cardTitle}>Travel History</Text>
            {formData.travelHistory.map((trip, index) => (
              <View key={trip.id} style={styles.tripContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Trip Name"
                  value={trip.name}
                  onChangeText={(text) => handleTripNameChange(index, text)}
                />
                <View style={styles.photosContainer}>
                  {trip.photos.map((photo, photoIndex) => (
                    <Image
                      key={photoIndex}
                      source={{ uri: photo }}
                      style={styles.photoThumbnail}
                    />
                  ))}
                </View>
                <TouchableOpacity onPress={() => handleAddPhoto(index)}>
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleRemoveTrip(index)}>
                  <MaterialIcons
                    name="remove-circle"
                    size={24}
                    color="#ff4444"
                  />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={handleAddTrip}>
              <Text style={styles.addButtonText}>Add Trip</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleUpdateProfile}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 160,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  profileImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  changePhotoText: {
    marginTop: 8,
    fontSize: 14,
    color: "#6a11cb",
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#6a11cb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 24,
  },
  sectionCard: {},
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: "#2D3748",
    marginBottom: 10,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  flexInput: {
    flex: 1,
  },
  removeButton: {
    marginLeft: 10,
  },
  addButton: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  addButtonText: {
    color: "#6a11cb",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#6a11cb",
    borderRadius: 25,
    padding: 15,
    alignItems: "center",
    marginVertical: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  tripContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
  },
  photosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    margin: 5,
    borderRadius: 5,
  },
  addPhotoText: {
    color: "#6a11cb",
    marginTop: 10,
    fontSize: 16,
  },
});

export default EditProfile;