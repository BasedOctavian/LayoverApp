import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";

const UserOnboarding = () => {
  const [step, setStep] = useState<number>(1); // Current step in the walkthrough
  const [userData, setUserData] = useState<any>({}); // Object to store user data

  // Fields to collect
  const steps = [
    { key: "name", label: "What's your name?", placeholder: "Enter your name" },
    { key: "age", label: "How old are you?", placeholder: "Enter your age" },
    { key: "bio", label: "Tell us about yourself", placeholder: "Write a short bio" },
    { key: "languages", label: "What languages do you speak?", placeholder: "e.g., English, Spanish" },
    { key: "interests", label: "What are your interests?", placeholder: "e.g., Hiking, Photography" },
    { key: "goals", label: "What are your goals?", placeholder: "e.g., Travel the world, Learn a new language" },
    { key: "travelHistory", label: "Where have you traveled?", placeholder: "e.g., Italy, Japan" },
    { key: "moodStatus", label: "How are you feeling today?", placeholder: "e.g., Excited, Relaxed" },
    { key: "profilePicture", label: "Add a profile picture URL", placeholder: "Enter a URL for your profile picture" },
  ];

  // Handle input change
  const handleInputChange = (key: string, value: string) => {
    setUserData({ ...userData, [key]: value });
  };

  // Move to the next step
  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      // On the last step, print the user data to the console
      console.log("User Data:", userData);
    }
  };

  // Move to the previous step
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <LinearGradient colors={["#6a11cb", "#2575fc"]} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Step {step} of {steps.length}</Text>
          <Text style={styles.stepLabel}>{steps[step - 1].label}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder={steps[step - 1].placeholder}
          value={userData[steps[step - 1].key] || ""}
          onChangeText={(text) => handleInputChange(steps[step - 1].key, text)}
        />

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {step === steps.length ? "Finish" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

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