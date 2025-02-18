import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Animated,
  Easing
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from '@expo/vector-icons';
import useAuth from "../hooks/auth";
import * as ImagePicker from 'expo-image-picker';

const UserOnboarding = () => {
  const [step, setStep] = useState<number>(1);
  const [userData, setUserData] = useState<any>({});
  const { signup, loading, error } = useAuth();
  const fadeAnim = useState(new Animated.Value(1))[0];
  const progressWidth = useState(new Animated.Value(0))[0];

  const steps = [
    { key: "email", label: "Email Address", placeholder: "Enter your email", icon: "mail", keyboardType: "email-address" },
    { key: "password", label: "Password", placeholder: "Create a password", icon: "lock", secure: true },
    { key: "name", label: "Full Name", placeholder: "Enter your name", icon: "user" },
    { key: "age", label: "Age", placeholder: "Enter your age", icon: "calendar", keyboardType: "numeric" },
    { key: "bio", label: "Bio", placeholder: "Tell us about yourself", icon: "edit-3" },
    { key: "languages", label: "Languages", placeholder: "English, Spanish", icon: "globe" },
    { key: "interests", label: "Interests", placeholder: "Hiking, Photography", icon: "heart" },
    { key: "goals", label: "Goals", placeholder: "Travel, Learn", icon: "target" },
    { key: "travelHistory", label: "Travel History", placeholder: "Italy, Japan", icon: "map-pin" },
    { key: "moodStatus", label: "Current Mood", placeholder: "Excited, Relaxed", icon: "smile" },
    { key: "profilePicture", label: "Profile Photo", placeholder: "Image URL", icon: "camera" },
  ];

  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: (step / steps.length) * 100,
      duration: 500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false
    }).start();
  }, [step]);

  const animateStepChange = (direction: 'next' | 'back') => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleInputChange = (key: string, value: string) => {
    setUserData({ ...userData, [key]: value });
  };

  const handleNext = async () => {
    if (step < steps.length) {
      animateStepChange('next');
      setStep(step + 1);
    } else {
      try {
        const userProfile = {
          ...userData,
          age: Number(userData.age),
          languages: userData.languages?.split(/,\s*/) || [],
          interests: userData.interests?.split(/,\s*/) || [],
          goals: userData.goals?.split(/,\s*/) || [],
          travelHistory: userData.travelHistory?.split(/,\s*/) || [],
          isAnonymous: false,
        };

        await signup(userData.email, userData.password, userProfile);
        Alert.alert("Success", "Account created successfully!");
      } catch (err) {
        Alert.alert("Error", error || "Failed to create account");
      }
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'We need access to your photos to set a profile picture');
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
  
      if (!result.canceled) {
        // Just print the selected image info
        console.log('Selected image:', {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          type: result.assets[0].type,
        });
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };
  

  const handleBack = () => {
    if (step > 1) {
      animateStepChange('back');
      setStep(step - 1);
    }
  };

  const currentStep = steps[step - 1];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.fullScreen}>
          <LinearGradient
            colors={['#F8FAFC', '#FFFFFF']}
            style={styles.backgroundGradient}
          >
            {/* Progress Header */}
            <View style={styles.progressContainer}>
              <Text style={styles.stepCount}>Step {step} of {steps.length}</Text>
              <View style={styles.progressBar}>
                <Animated.View style={[styles.progressFill, { 
                  width: progressWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })
                }]}/>
              </View>
            </View>

            {/* Animated Content */}
            <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
              <View style={styles.stepContainer}>
                <Feather name={currentStep.icon} size={32} color="#2F80ED" style={styles.stepIcon} />
                <Text style={styles.sectionTitle}>{currentStep.label}</Text>
                <LinearGradient
                  colors={['#FFFFFF', '#F1F5F9']}
                  style={styles.inputGradient}
                >
                  {currentStep.key === 'profilePicture' ? (
                    <TouchableOpacity 
                      style={styles.photoButton}
                      onPress={handleSelectPhoto}
                    >
                      <Feather name="upload" size={24} color="#2F80ED" />
                      <Text style={styles.photoButtonText}>Select from Gallery</Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder={currentStep.placeholder}
                      placeholderTextColor="#94A3B8"
                      value={userData[currentStep.key] || ""}
                      onChangeText={(text) => handleInputChange(currentStep.key, text)}
                      secureTextEntry={currentStep.secure}
                      autoCapitalize="none"
                      multiline={currentStep.key === 'bio'}
                    />
                  )}
                </LinearGradient>
              </View>

              {/* Navigation Controls */}
              <View style={styles.buttonGroup}>
                {step > 1 && (
                  <TouchableOpacity 
                    style={styles.secondaryButton} 
                    onPress={handleBack}
                    activeOpacity={0.9}
                  >
                    <Feather name="arrow-left" size={20} color="#2F80ED" />
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  onPress={handleNext}
                  disabled={loading}
                  activeOpacity={0.9}
                  style={styles.primaryButton}
                >
                  <LinearGradient
                    colors={['#2F80ED', '#1A5FB4']}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        {step === steps.length ? "Create Account" : "Continue"}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  fullScreen: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    padding: 24,
  },
  progressContainer: {
    marginBottom: 32,
    marginTop: 40,
  },
  stepCount: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2F80ED',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    color: '#1E293B',
    fontSize: 28,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 24,
    textAlign: 'center',
  },
  stepIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  inputGradient: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    color: '#1E293B',
    fontSize: 16,
    minHeight: 48,
    fontFamily: 'Inter-Regular',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 12,
    marginBottom: 54,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#2F80ED',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  primaryButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2F80ED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  photoButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  photoButtonText: {
    color: '#2F80ED',
    fontSize: 16,
    marginTop: 8,
    fontFamily: 'Inter-SemiBold',
  },
});

export default UserOnboarding;