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
import LoadingScreen from "../../components/LoadingScreen";

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
  socialMedia: {
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
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
    socialMedia: {
      instagram: "",
      linkedin: "",
      twitter: "",
    },
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
              socialMedia: {
                instagram: data.socialMedia?.instagram || "",
                linkedin: data.socialMedia?.linkedin || "",
                twitter: data.socialMedia?.twitter || "",
              },
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

  // Add URL formatting functions
  const formatSocialUrl = (platform: string, username: string) => {
    if (!username) return "";
    const cleanUsername = username.trim().replace(/^@/, '');
    
    switch (platform) {
      case 'instagram':
        return `https://www.instagram.com/${cleanUsername}/`;
      case 'linkedin':
        return `https://www.linkedin.com/in/${cleanUsername}/`;
      case 'twitter':
        return `https://twitter.com/${cleanUsername}`;
      default:
        return username;
    }
  };

  const extractUsername = (url: string, platform: string) => {
    if (!url) return "";
    
    try {
      const urlObj = new URL(url);
      switch (platform) {
        case 'instagram':
          return urlObj.pathname.replace(/^\/|\/$/g, '');
        case 'linkedin':
          return urlObj.pathname.replace(/^\/in\/|\/$/g, '');
        case 'twitter':
          return urlObj.pathname.replace(/^\/|\/$/g, '');
        default:
          return url;
      }
    } catch {
      return url;
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

      // Format social media URLs before saving
      const formattedSocialMedia = {
        instagram: formatSocialUrl('instagram', formData.socialMedia.instagram),
        linkedin: formatSocialUrl('linkedin', formData.socialMedia.linkedin),
        twitter: formatSocialUrl('twitter', formData.socialMedia.twitter),
      };

      if (profilePicUrl && !profilePicUrl.startsWith("http")) {
        const response = await fetch(profilePicUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile_pictures/${userId}`);
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
        socialMedia: formattedSocialMedia,
        updatedAt: serverTimestamp(),
      };

      await updateUser(userId, updatedData);
      Alert.alert("Success", "Profile updated successfully", [
        {
          text: "OK",
          onPress: () => router.back()
        }
      ]);
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
    return <LoadingScreen message="Loading your profile..." />;
  }

  if (updating) {
    return <LoadingScreen message="Updating your profile..." />;
  }

  return (
    <LinearGradient colors={["#000000", "#1a1a1a"]} style={styles.gradient}>
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
              placeholderTextColor="#e4fbfe80"
            />
            <TextInput
              style={styles.input}
              placeholder="Age"
              value={formData.age}
              onChangeText={(text) =>
                setFormData({ ...formData, age: text })
              }
              keyboardType="numeric"
              placeholderTextColor="#e4fbfe80"
            />
            <TextInput
              style={styles.input}
              placeholder="Mood Status"
              value={formData.moodStatus}
              onChangeText={(text) =>
                setFormData({ ...formData, moodStatus: text })
              }
              placeholderTextColor="#e4fbfe80"
            />
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Bio"
              value={formData.bio}
              onChangeText={(text) =>
                setFormData({ ...formData, bio: text })
              }
              multiline
              placeholderTextColor="#e4fbfe80"
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
                      placeholderTextColor="#e4fbfe80"
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
                      color="#38a5c9"
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
                  placeholderTextColor="#e4fbfe80"
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

          {/* Social Media Section */}
          <View style={[styles.card, styles.sectionCard]}>
            <Text style={styles.cardTitle}>Social Media</Text>
            <View style={styles.socialMediaContainer}>
              <View style={styles.socialMediaInput}>
                <MaterialIcons name="photo-camera" size={24} color="#38a5c9" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="Instagram Username"
                  value={extractUsername(formData.socialMedia.instagram, 'instagram')}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, instagram: text },
                    }))
                  }
                  placeholderTextColor="#e4fbfe80"
                />
              </View>
              <View style={styles.socialMediaInput}>
                <MaterialIcons name="work" size={24} color="#38a5c9" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="LinkedIn Username"
                  value={extractUsername(formData.socialMedia.linkedin, 'linkedin')}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, linkedin: text },
                    }))
                  }
                  placeholderTextColor="#e4fbfe80"
                />
              </View>
              <View style={styles.socialMediaInput}>
                <MaterialIcons name="chat" size={24} color="#38a5c9" style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="Twitter Username"
                  value={extractUsername(formData.socialMedia.twitter, 'twitter')}
                  onChangeText={(text) =>
                    setFormData((prev) => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, twitter: text },
                    }))
                  }
                  placeholderTextColor="#e4fbfe80"
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleUpdateProfile}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#e4fbfe" />
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
    backgroundColor: "#000000",
  },
  scrollContent: {
    padding: 24,
    paddingTop: 56,
    paddingBottom: 160,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#38a5c9",
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 15,
    color: "#38a5c9",
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 24,
  },
  sectionCard: {},
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e4fbfe",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    color: "#e4fbfe",
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 12,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  flexInput: {
    flex: 1,
  },
  removeButton: {
    marginLeft: 12,
    padding: 4,
  },
  addButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(56, 165, 201, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  addButtonText: {
    color: "#38a5c9",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  saveButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 30,
    padding: 18,
    alignItems: "center",
    marginVertical: 24,
    borderWidth: 1,
    borderColor: "#38a5c9",
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "#e4fbfe",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  tripContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  photosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 8,
  },
  photoThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#38a5c9",
  },
  addPhotoText: {
    color: "#38a5c9",
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  socialMediaContainer: {
    gap: 16,
  },
  socialMediaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  socialIcon: {
    marginRight: 12,
  },
  socialInput: {
    flex: 1,
    marginBottom: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
});

export default EditProfile;