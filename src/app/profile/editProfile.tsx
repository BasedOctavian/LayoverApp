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
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebaseConfig";
import useAuth from "../../hooks/auth";
import useUsers from "../../hooks/useUsers";

// Define an interface for our form data
interface FormData {
  name: string;
  age: string;
  moodStatus: string;
  bio: string;
  languages: string[];
  interests: string[];
  goals: string[];
  travelHistory: string[];
  profilePicture: string;
}

// Define a union type for the keys that hold array data
type ProfileArrayField = "languages" | "interests" | "goals" | "travelHistory";

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
    travelHistory: [""],
    profilePicture: "",
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

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
              travelHistory: data.travelHistory || [""],
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
        // Ensure that the URI is not null
        const selectedUri = result.assets[0].uri ?? "";
        setFormData((prev) => ({ ...prev, profilePicture: selectedUri }));
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

      // Upload new image if it's a local URI
      if (profilePicUrl && !profilePicUrl.startsWith("http")) {
        const response = await fetch(profilePicUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `profilePictures/${userId}`);
        await uploadBytes(storageRef, blob);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      const updatedData = {
        ...formData,
        profilePicture: profilePicUrl,
        age: parseInt(formData.age, 10),
        languages: formData.languages.filter((l) => l.trim() !== ""),
        interests: formData.interests.filter((i) => i.trim() !== ""),
        goals: formData.goals.filter((g) => g.trim() !== ""),
        travelHistory: formData.travelHistory.filter((t) => t.trim() !== ""),
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

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <ScrollView style={styles.scrollContainer}>
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={formData.name}
              onChangeText={(text) =>
                setFormData({ ...formData, name: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Age"
              value={formData.age}
              onChangeText={(text) =>
                setFormData({ ...formData, age: text })
              }
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Mood Status"
              value={formData.moodStatus}
              onChangeText={(text) =>
                setFormData({ ...formData, moodStatus: text })
              }
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Bio"
              value={formData.bio}
              onChangeText={(text) =>
                setFormData({ ...formData, bio: text })
              }
              multiline
            />
          </View>

          {/* Dynamic Fields Section */}
          {(["languages", "interests", "goals", "travelHistory"] as ProfileArrayField[]).map(
            (field) => (
              <View key={field} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
                {formData[field].map((value, index) => (
                  <View key={index} style={styles.fieldRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
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
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
    marginTop: 60,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6a11cb",
    marginBottom: 10,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    fontSize: 16,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
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
  changePhotoText: {
    color: "#fff",
    textAlign: "center",
    marginTop: 5,
    fontSize: 14,
  },
});

export default EditProfile;
