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
import { containsFilteredContent, getFilteredContentCategory } from "../../utils/contentFilter";

interface Trip {
  id: string;
  name: string;
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
  const [saveProgress, setSaveProgress] = useState(0);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});

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

    // Check for any field errors
    if (Object.values(fieldErrors).some(error => error)) {
      Alert.alert(
        "Inappropriate Content",
        "Please remove any inappropriate content before saving.",
        [{ text: "OK" }]
      );
      return;
    }

    setUpdating(true);
    setSaveProgress(0);
    try {
      let profilePicUrl = formData.profilePicture;

      // Format social media URLs before saving
      const formattedSocialMedia = {
        instagram: formatSocialUrl('instagram', formData.socialMedia.instagram || ''),
        linkedin: formatSocialUrl('linkedin', formData.socialMedia.linkedin || ''),
        twitter: formatSocialUrl('twitter', formData.socialMedia.twitter || ''),
      };

      setSaveProgress(20);

      if (profilePicUrl && !profilePicUrl.startsWith("http")) {
        const response = await fetch(profilePicUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile_pictures/${userId}`);
        await uploadBytes(storageRef, blob);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      setSaveProgress(60);

      const updatedData = {
        ...formData,
        profilePicture: profilePicUrl,
        age: parseInt(formData.age, 10),
        languages: formData.languages.filter((l) => l.trim() !== ""),
        interests: formData.interests.filter((i) => i.trim() !== ""),
        goals: formData.goals.filter((g) => g.trim() !== ""),
        socialMedia: formattedSocialMedia,
        updatedAt: serverTimestamp(),
      };

      setSaveProgress(80);

      await updateUser(userId, updatedData);
      setSaveProgress(100);

      // Show success message and smoothly transition back
      Alert.alert(
        "Success",
        "Profile updated successfully",
        [
          {
            text: "OK",
            onPress: () => {
              // Add a small delay for better UX
              setTimeout(() => {
                router.back();
              }, 300);
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update profile. Please try again.",
        [{ text: "OK" }],
        { cancelable: false }
      );
      console.error(error);
    } finally {
      setUpdating(false);
      setSaveProgress(0);
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
    // Check for filtered content
    if (containsFilteredContent(text)) {
      setFieldErrors(prev => ({ ...prev, [`${field}_${index}`]: true }));
    } else {
      setFieldErrors(prev => ({ ...prev, [`${field}_${index}`]: false }));
    }

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
            <Text style={styles.fieldLabel}>Your Full Name</Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors['name'] && styles.inputError
              ]}
              placeholder="Name"
              value={formData.name}
              onChangeText={(text) => {
                if (containsFilteredContent(text)) {
                  setFieldErrors(prev => ({ ...prev, name: true }));
                } else {
                  setFieldErrors(prev => ({ ...prev, name: false }));
                }
                setFormData({ ...formData, name: text });
              }}
              placeholderTextColor={fieldErrors['name'] ? "#ff4444" : "#e4fbfe80"}
            />
            <Text style={styles.fieldLabel}>Your Current Mood</Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors['moodStatus'] && styles.inputError
              ]}
              placeholder="Mood Status"
              value={formData.moodStatus}
              onChangeText={(text) => {
                if (containsFilteredContent(text)) {
                  setFieldErrors(prev => ({ ...prev, moodStatus: true }));
                } else {
                  setFieldErrors(prev => ({ ...prev, moodStatus: false }));
                }
                setFormData({ ...formData, moodStatus: text });
              }}
              placeholderTextColor={fieldErrors['moodStatus'] ? "#ff4444" : "#e4fbfe80"}
            />
            <Text style={styles.fieldLabel}>Tell us about yourself</Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                fieldErrors['bio'] && styles.inputError
              ]}
              placeholder="Bio"
              value={formData.bio}
              onChangeText={(text) => {
                if (containsFilteredContent(text)) {
                  setFieldErrors(prev => ({ ...prev, bio: true }));
                } else {
                  setFieldErrors(prev => ({ ...prev, bio: false }));
                }
                setFormData({ ...formData, bio: text });
              }}
              multiline
              placeholderTextColor={fieldErrors['bio'] ? "#ff4444" : "#e4fbfe80"}
            />
          </View>

          {/* Dynamic Fields Section */}
          {(["languages", "interests", "goals"] as ProfileArrayField[]).map(
            (field) => (
              <View key={field} style={[styles.card, styles.sectionCard]}>
                <Text style={styles.cardTitle}>
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                </Text>
                <Text style={styles.fieldLabel}>
                  {field === "languages" 
                    ? "Languages you speak" 
                    : field === "interests" 
                    ? "Your interests and hobbies"
                    : "Your travel goals"}
                </Text>
                {formData[field].map((value, index) => (
                  <View key={index} style={styles.fieldRow}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.flexInput,
                        fieldErrors[`${field}_${index}`] && styles.inputError
                      ]}
                      value={value}
                      onChangeText={(text) =>
                        handleFieldChange(field, index, text)
                      }
                      placeholder={`Enter ${field.slice(0, -1)}`}
                      placeholderTextColor={fieldErrors[`${field}_${index}`] ? "#ff4444" : "#e4fbfe80"}
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
            <Text style={styles.fieldLabel}>Places you've visited</Text>
            {formData.travelHistory.map((trip, index) => (
              <View key={trip.id} style={styles.tripContainer}>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors[`trip_${index}`] && styles.inputError
                  ]}
                  placeholder="Trip Name"
                  value={trip.name}
                  onChangeText={(text) => {
                    if (containsFilteredContent(text)) {
                      setFieldErrors(prev => ({ ...prev, [`trip_${index}`]: true }));
                    } else {
                      setFieldErrors(prev => ({ ...prev, [`trip_${index}`]: false }));
                    }
                    handleTripNameChange(index, text);
                  }}
                  placeholderTextColor={fieldErrors[`trip_${index}`] ? "#ff4444" : "#e4fbfe80"}
                />
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
            <Text style={styles.fieldLabel}>Connect your social media accounts</Text>
            <View style={styles.socialMediaContainer}>
              <View style={[
                styles.socialMediaInput,
                fieldErrors['instagram'] && styles.inputError
              ]}>
                <MaterialIcons name="photo-camera" size={24} color={fieldErrors['instagram'] ? "#ff4444" : "#38a5c9"} style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="Instagram Username"
                  value={extractUsername(formData.socialMedia.instagram || '', 'instagram')}
                  onChangeText={(text) => {
                    if (containsFilteredContent(text)) {
                      setFieldErrors(prev => ({ ...prev, instagram: true }));
                    } else {
                      setFieldErrors(prev => ({ ...prev, instagram: false }));
                    }
                    setFormData((prev) => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, instagram: text },
                    }));
                  }}
                  placeholderTextColor={fieldErrors['instagram'] ? "#ff4444" : "#e4fbfe80"}
                />
              </View>
              <View style={[
                styles.socialMediaInput,
                fieldErrors['linkedin'] && styles.inputError
              ]}>
                <MaterialIcons name="work" size={24} color={fieldErrors['linkedin'] ? "#ff4444" : "#38a5c9"} style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="LinkedIn Username"
                  value={extractUsername(formData.socialMedia.linkedin || '', 'linkedin')}
                  onChangeText={(text) => {
                    if (containsFilteredContent(text)) {
                      setFieldErrors(prev => ({ ...prev, linkedin: true }));
                    } else {
                      setFieldErrors(prev => ({ ...prev, linkedin: false }));
                    }
                    setFormData((prev) => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, linkedin: text },
                    }));
                  }}
                  placeholderTextColor={fieldErrors['linkedin'] ? "#ff4444" : "#e4fbfe80"}
                />
              </View>
              <View style={[
                styles.socialMediaInput,
                fieldErrors['twitter'] && styles.inputError
              ]}>
                <MaterialIcons name="chat" size={24} color={fieldErrors['twitter'] ? "#ff4444" : "#38a5c9"} style={styles.socialIcon} />
                <TextInput
                  style={[styles.input, styles.socialInput]}
                  placeholder="Twitter Username"
                  value={extractUsername(formData.socialMedia.twitter || '', 'twitter')}
                  onChangeText={(text) => {
                    if (containsFilteredContent(text)) {
                      setFieldErrors(prev => ({ ...prev, twitter: true }));
                    } else {
                      setFieldErrors(prev => ({ ...prev, twitter: false }));
                    }
                    setFormData((prev) => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, twitter: text },
                    }));
                  }}
                  placeholderTextColor={fieldErrors['twitter'] ? "#ff4444" : "#e4fbfe80"}
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (updating || Object.values(fieldErrors).some(error => error)) && styles.saveButtonDisabled
            ]}
            onPress={handleUpdateProfile}
            disabled={updating || Object.values(fieldErrors).some(error => error)}
          >
            {updating ? (
              <View style={styles.saveButtonContent}>
                <ActivityIndicator color="#e4fbfe" />
                <Text style={[styles.saveButtonText, styles.saveButtonTextLoading]}>
                  Saving... {saveProgress}%
                </Text>
              </View>
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
  saveButtonDisabled: {
    opacity: 0.7,
    borderColor: "#38a5c980",
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButtonText: {
    color: "#e4fbfe",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  saveButtonTextLoading: {
    fontSize: 16,
  },
  tripContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#38a5c9",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  fieldLabel: {
    color: '#e4fbfe',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  inputError: {
    borderColor: "#ff4444",
    backgroundColor: "rgba(255, 68, 68, 0.1)",
  },
});

export default EditProfile;