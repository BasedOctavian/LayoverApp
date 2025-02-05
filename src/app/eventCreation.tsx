import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import useEvents from '../hooks/useEvents';
import useAuth from '../hooks/auth';

interface EventData {
  name?: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  eventImage?: string;
  startTime?: string;
}

const EventCreation: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [eventData, setEventData] = useState<EventData>({});
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const { addEvent, loading, error } = useEvents();
  const { user } = useAuth();

  const steps = [
    { key: 'name', label: 'Event Name', placeholder: 'Enter event name' },
    { key: 'description', label: 'Description', placeholder: 'Describe your event' },
    { key: 'latitude', label: 'Latitude', placeholder: 'Enter latitude', keyboardType: 'numeric' },
    { key: 'longitude', label: 'Longitude', placeholder: 'Enter longitude', keyboardType: 'numeric' },
    { key: 'eventImage', label: 'Event Image URL', placeholder: 'Enter image URL' },
    { key: 'startTime', label: 'Start Time', placeholder: 'Select start time' },
  ];

  const handleInputChange = (key: string, value: string) => {
    setEventData({ ...eventData, [key]: value });
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || startTime;
    setShowDatePicker(false);
    setStartTime(currentDate);
    handleInputChange('startTime', currentDate.toISOString());
  };

  const handleSubmit = async () => {
    try {
      const newEvent = {
        ...eventData,
        latitude: parseFloat(eventData.latitude || '0'),
        longitude: parseFloat(eventData.longitude || '0'),
        startTime: new Date(eventData.startTime || ''),
        createdAt: new Date(),
        organizer: user?.uid || '',
        organizerName: user?.displayName || 'Unknown Organizer',
      };

      await addEvent(newEvent);
      Alert.alert('Success', 'Event created successfully!');
    } catch (err) {
      Alert.alert('Error', error || 'Failed to create event');
    }
  };

  const handleNext = () => {
    if (step < steps.length) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const currentStep = steps[step - 1];

  return (
    <LinearGradient colors={['#6a11cb', '#2575fc']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Step {step} of {steps.length}</Text>
          <Text style={styles.stepLabel}>{currentStep.label}</Text>
        </View>

        {currentStep.key === 'startTime' ? (
          <>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text>{startTime.toLocaleString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={startTime}
                mode="datetime"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </>
        ) : (
          <TextInput
            style={styles.input}
            placeholder={currentStep.placeholder}
            value={eventData[currentStep.key] || ''}
            onChangeText={(text) => handleInputChange(currentStep.key, text)}
            keyboardType={currentStep.keyboardType || 'default'}
            autoCapitalize="none"
          />
        )}

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
                {step === steps.length ? 'Create Event' : 'Next'}
              </Text>
            )}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
  },
  stepLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    justifyContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 10,
  },
  nextButton: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6a11cb',
  },
});

export default EventCreation;
