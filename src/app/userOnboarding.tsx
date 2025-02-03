import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import useAuth from "../hooks/auth";// Import your auth hook

const UserOnboarding = () => {
  const [step, setStep] = useState<number>(1);
  const [userData, setUserData] = useState<any>({});
  const { signup, loading, error } = useAuth();

  // Updated steps to include email/password first
  const steps = [
    { key: "email", label: "What's your email?", placeholder: "Enter your email", keyboardType: "email-address" },
    { key: "password", label: "Create a password", placeholder: "Enter your password", secure: true },
    { key: "name", label: "What's your name?", placeholder: "Enter your name" },
    { key: "age", label: "How old are you?", placeholder: "Enter your age", keyboardType: "numeric" },
    { key: "bio", label: "Tell us about yourself", placeholder: "Write a short bio" },
    { key: "languages", label: "What languages do you speak?", placeholder: "e.g., English, Spanish" },
    { key: "interests", label: "What are your interests?", placeholder: "e.g., Hiking, Photography" },
    { key: "goals", label: "What are your goals?", placeholder: "e.g., Travel the world, Learn a new language" },
    { key: "travelHistory", label: "Where have you traveled?", placeholder: "e.g., Italy, Japan" },
    { key: "moodStatus", label: "How are you feeling today?", placeholder: "e.g., Excited, Relaxed" },
    { key: "profilePicture", label: "Add a profile picture URL", placeholder: "Enter a URL for your profile picture" },
  ];

  const handleInputChange = (key: string, value: string) => {
    setUserData({ ...userData, [key]: value });
  };

  const handleNext = async () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      try {
        // Convert string inputs to proper formats
        const userProfile = {
          ...userData,
          age: Number(userData.age),
          languages: userData.languages.split(/,\s*/),
          interests: userData.interests.split(/,\s*/),
          goals: userData.goals.split(/,\s*/),
          travelHistory: userData.travelHistory.split(/,\s*/),
          isAnonymous: false,
        };

        await signup(
          userData.email,
          userData.password,
          userProfile
        );

        Alert.alert("Success", "Account created successfully!");
      } catch (err) {
        Alert.alert("Error", error || "Failed to create account");
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const currentStep = steps[step - 1];

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Step {step} of {steps.length}</Text>
          <Text style={styles.stepLabel}>{currentStep.label}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={currentStep.placeholder}
          value={userData[currentStep.key] || ""}
          onChangeText={(text) => handleInputChange(currentStep.key, text)}
          secureTextEntry={currentStep.secure}
         
          autoCapitalize="none"
        />

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#6a11cb" />
            ) : (
              <Text style={styles.nextButtonText}>
                {step === steps.length ? "Create Account" : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

// Keep your existing styles, add this new style
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  headerText: {
    fontSize: 18,
    color: "#fff",
    opacity: 0.8,
  },
  stepLabel: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 10,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  backButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 15,
    borderRadius: 10,
  },
  nextButton: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#6a11cb",
  },
});

export default UserOnboarding;