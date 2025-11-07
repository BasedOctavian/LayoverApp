import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

interface ProposalFormData {
  title: string;
  description?: string;
  location?: string;
  date?: Date;
  time?: Date;
}

interface CreateProposalModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ProposalFormData) => Promise<void>;
  theme: string;
}

export default function CreateProposalModal({
  visible,
  onClose,
  onSubmit,
  theme
}: CreateProposalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tempMarker, setTempMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  // Get user's current location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    if (visible) {
      getUserLocation();
    }
  }, [visible]);

  const handleMapPress = async (event: any) => {
    const coords = event.nativeEvent.coordinate;
    setTempMarker(coords);
    
    // Reverse geocode to get location name
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      if (results && results.length > 0) {
        const result = results[0];
        const locationParts = [];
        if (result.name) locationParts.push(result.name);
        if (result.street) locationParts.push(result.street);
        if (result.city) locationParts.push(result.city);
        const locationName = locationParts.join(', ') || 'Selected location';
        setLocation(locationName);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setLocation('Selected location');
    }
  };

  const handleConfirmLocation = () => {
    if (tempMarker) {
      setCoordinates(tempMarker);
      setShowMapPicker(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        date,
        time,
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setCoordinates(undefined);
      setDate(undefined);
      setTime(undefined);
      setTempMarker(null);
      setStep(1);
      onClose();
    } catch (error) {
      console.error('Error creating proposal:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isLight = theme === 'light';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView intensity={95} style={styles.blurOverlay} tint={isLight ? 'light' : 'dark'}>
        <TouchableOpacity 
          style={styles.modalOverlayInner} 
          activeOpacity={1} 
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        >
          <View style={styles.modalWrapper}>
            <TouchableOpacity 
              activeOpacity={1} 
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.modalContent, {
                backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                borderWidth: 1,
                borderColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
              }]}>
                {/* Header */}
              <View style={[styles.header, {
                borderBottomColor: isLight ? '#e2e8f0' : '#334155',
              }]}>
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    <View style={[styles.iconContainer, {
                      backgroundColor: isLight ? 'rgba(55, 164, 200, 0.12)' : 'rgba(55, 164, 200, 0.2)',
                    }]}>
                      <MaterialIcons name="event" size={24} color="#37a4c8" />
                    </View>
                    <View style={styles.headerTextContainer}>
                      <Text style={[styles.headerTitle, {
                        color: isLight ? '#0f172a' : '#f8fafc',
                      }]}>
                        Propose Event
                      </Text>
                      <Text style={[styles.headerSubtitle, {
                        color: isLight ? '#64748b' : '#94a3b8',
                      }]}>
                        {step === 1 ? 'Step 1 of 2: Event Details' : 'Step 2 of 2: Date & Time'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={onClose} 
                    style={[styles.closeButton, {
                      backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                    }]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="close" size={22} color={isLight ? '#64748b' : '#94a3b8'} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView 
                style={styles.scrollView} 
                showsVerticalScrollIndicator={true}
                contentContainerStyle={[
                  styles.scrollContent,
                  step === 2 && styles.scrollContentStep2
                ]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                bounces={true}
              >
                {step === 1 ? (
                  <>
                    {/* Title */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <MaterialIcons name="title" size={18} color="#37a4c8" />
                        <Text style={[styles.label, {
                          color: isLight ? '#1e293b' : '#f1f5f9',
                        }]}>
                          Event Title
                        </Text>
                        <Text style={styles.required}>*</Text>
                      </View>
                      <TextInput
                        style={[styles.input, {
                          backgroundColor: isLight ? '#f8f9fa' : '#0f172a',
                          color: isLight ? '#1e293b' : '#f1f5f9',
                          borderColor: title ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                        }]}
                        placeholder="e.g., Coffee meetup at Starbucks"
                        placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                        autoFocus
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <MaterialIcons name="description" size={18} color="#37a4c8" />
                        <Text style={[styles.label, {
                          color: isLight ? '#1e293b' : '#f1f5f9',
                        }]}>
                          Description
                        </Text>
                      </View>
                      <View style={[styles.textAreaContainer, {
                        backgroundColor: isLight ? '#f8f9fa' : '#0f172a',
                        borderColor: description ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                      }]}>
                        <TextInput
                          style={[styles.textArea, {
                            color: isLight ? '#1e293b' : '#f1f5f9',
                          }]}
                          placeholder="Add details about your proposal..."
                          placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                          value={description}
                          onChangeText={setDescription}
                          multiline
                          maxLength={500}
                          scrollEnabled={false}
                          textAlignVertical="top"
                        />
                        <Text style={[styles.charCount, {
                          color: isLight ? '#94a3b8' : '#64748b',
                        }]}>
                          {description.length} / 500
                        </Text>
                      </View>
                    </View>

                    {/* Location */}
                    <View style={styles.inputGroup}>
                      <View style={styles.labelRow}>
                        <MaterialIcons name="location-on" size={18} color="#37a4c8" />
                        <Text style={[styles.label, {
                          color: isLight ? '#1e293b' : '#f1f5f9',
                        }]}>
                          Location
                        </Text>
                      </View>
                      <View style={styles.locationInputContainer}>
                        <TextInput
                          style={[styles.locationInput, {
                            backgroundColor: isLight ? '#f8f9fa' : '#0f172a',
                            color: isLight ? '#1e293b' : '#f1f5f9',
                            borderColor: location ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                          }]}
                          placeholder="Enter location or select on map"
                          placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                          value={location}
                          onChangeText={(text) => {
                            setLocation(text);
                            // Clear coordinates when manually editing location
                            if (coordinates) {
                              setCoordinates(undefined);
                              setTempMarker(null);
                            }
                          }}
                          maxLength={200}
                        />
                        <TouchableOpacity
                          style={[styles.mapButton, {
                            backgroundColor: coordinates ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                          }]}
                          onPress={() => {
                            setTempMarker(coordinates || userLocation);
                            setShowMapPicker(true);
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons 
                            name="map" 
                            size={20} 
                            color={coordinates ? '#ffffff' : (isLight ? '#64748b' : '#94a3b8')} 
                          />
                        </TouchableOpacity>
                      </View>
                      {coordinates && (
                        <View style={[styles.locationConfirmation, {
                          backgroundColor: isLight ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.15)',
                          borderColor: isLight ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.3)',
                        }]}>
                          <MaterialIcons name="check-circle" size={16} color="#22c55e" />
                          <Text style={[styles.locationConfirmationText, {
                            color: isLight ? '#15803d' : '#86efac',
                          }]}>
                            📍 {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    {/* Date & Time Selection - Step 2 */}
                    <View style={styles.dateTimeSection}>
                      <View style={styles.step2Header}>
                        <View style={[styles.step2HeaderIcon, {
                          backgroundColor: isLight ? 'rgba(55, 164, 200, 0.12)' : 'rgba(55, 164, 200, 0.2)',
                        }]}>
                          <MaterialIcons name="event-available" size={24} color="#37a4c8" />
                        </View>
                        <View style={styles.step2HeaderText}>
                          <Text style={[styles.step2Title, {
                            color: isLight ? '#0f172a' : '#f8fafc',
                          }]}>
                            When is your event?
                          </Text>
                          <Text style={[styles.step2Subtitle, {
                            color: isLight ? '#64748b' : '#94a3b8',
                          }]}>
                            Select a date and time (optional)
                          </Text>
                        </View>
                      </View>

                      {/* Selected Date/Time Display */}
                      {(date || time) && (
                        <View style={[styles.selectedSummaryBig, {
                          backgroundColor: isLight ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.15)',
                          borderColor: isLight ? 'rgba(55, 164, 200, 0.25)' : 'rgba(55, 164, 200, 0.35)',
                        }]}>
                          <MaterialIcons name="check-circle" size={24} color="#37a4c8" />
                          <View style={styles.selectedSummaryTextContainer}>
                            <Text style={[styles.selectedSummaryLabel, {
                              color: isLight ? '#64748b' : '#94a3b8',
                            }]}>
                              Your event
                            </Text>
                            <Text style={[styles.selectedSummaryTextBig, {
                              color: isLight ? '#0f172a' : '#f8fafc',
                            }]}>
                              {date && time 
                                ? `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : date 
                                ? `${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`
                                : time
                                ? `Time: ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : ''}
                            </Text>
                          </View>
                        </View>
                      )}
                      
                      {/* Date Selection */}
                      <View style={styles.pickerSection}>
                        <View style={styles.pickerSectionHeader}>
                          <MaterialIcons name="calendar-today" size={20} color="#37a4c8" />
                          <Text style={[styles.pickerSectionTitle, {
                            color: isLight ? '#1e293b' : '#f1f5f9',
                          }]}>
                            Date
                          </Text>
                        </View>
                        
                        {!showDatePicker ? (
                          <TouchableOpacity
                            style={[styles.pickerToggleButton, {
                              backgroundColor: isLight ? '#f8f9fa' : '#0f172a',
                              borderColor: date ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                            }]}
                            onPress={() => setShowDatePicker(true)}
                          >
                            <Text style={[styles.pickerToggleButtonText, {
                              color: date ? '#37a4c8' : (isLight ? '#64748b' : '#94a3b8'),
                            }]}>
                              {date 
                                ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                                : 'Tap to select date'}
                            </Text>
                            <MaterialIcons 
                              name={date ? "check-circle" : "chevron-right"} 
                              size={22} 
                              color={date ? '#37a4c8' : (isLight ? '#cbd5e1' : '#3f3f46')} 
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.pickerWrapper, {
                            backgroundColor: isLight ? '#ffffff' : '#0f172a',
                            borderColor: isLight ? '#e2e8f0' : '#334155',
                          }]}>
                            <DateTimePicker
                              value={date || new Date()}
                              mode="date"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={(event, selectedDate) => {
                                if (Platform.OS === 'android') {
                                  setShowDatePicker(false);
                                  if (selectedDate) setDate(selectedDate);
                                } else if (selectedDate) {
                                  setDate(selectedDate);
                                }
                              }}
                              minimumDate={new Date()}
                              themeVariant={isLight ? 'light' : 'dark'}
                              style={styles.picker}
                            />
                            <View style={styles.pickerActions}>
                              <TouchableOpacity
                                style={[styles.pickerActionButton, styles.pickerCancelButton, {
                                  backgroundColor: isLight ? '#f8f9fa' : '#18181b',
                                  borderColor: isLight ? '#e2e8f0' : '#27272a',
                                }]}
                                onPress={() => setShowDatePicker(false)}
                              >
                                <MaterialIcons name="close" size={20} color={isLight ? '#64748b' : '#94a3b8'} />
                                <Text style={[styles.pickerActionButtonText, {
                                  color: isLight ? '#64748b' : '#94a3b8',
                                }]}>
                                  Close
                                </Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={[styles.pickerActionButton, styles.pickerConfirmButton]}
                                onPress={() => setShowDatePicker(false)}
                              >
                                <MaterialIcons name="check" size={20} color="#ffffff" />
                                <Text style={styles.pickerConfirmButtonText}>
                                  Confirm
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Time Selection */}
                      <View style={styles.pickerSection}>
                        <View style={styles.pickerSectionHeader}>
                          <MaterialIcons name="access-time" size={20} color="#37a4c8" />
                          <Text style={[styles.pickerSectionTitle, {
                            color: isLight ? '#1e293b' : '#f1f5f9',
                          }]}>
                            Time
                          </Text>
                        </View>
                        
                        {!showTimePicker ? (
                          <TouchableOpacity
                            style={[styles.pickerToggleButton, {
                              backgroundColor: isLight ? '#f8f9fa' : '#0f172a',
                              borderColor: time ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                            }]}
                            onPress={() => setShowTimePicker(true)}
                          >
                            <Text style={[styles.pickerToggleButtonText, {
                              color: time ? '#37a4c8' : (isLight ? '#64748b' : '#94a3b8'),
                            }]}>
                              {time 
                                ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Tap to select time'}
                            </Text>
                            <MaterialIcons 
                              name={time ? "check-circle" : "chevron-right"} 
                              size={22} 
                              color={time ? '#37a4c8' : (isLight ? '#cbd5e1' : '#3f3f46')} 
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={[styles.pickerWrapper, {
                            backgroundColor: isLight ? '#ffffff' : '#0f172a',
                            borderColor: isLight ? '#e2e8f0' : '#334155',
                          }]}>
                            <DateTimePicker
                              value={time || new Date()}
                              mode="time"
                              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                              onChange={(event, selectedTime) => {
                                if (Platform.OS === 'android') {
                                  setShowTimePicker(false);
                                  if (selectedTime) setTime(selectedTime);
                                } else if (selectedTime) {
                                  setTime(selectedTime);
                                }
                              }}
                              themeVariant={isLight ? 'light' : 'dark'}
                              style={styles.picker}
                            />
                            <View style={styles.pickerActions}>
                              <TouchableOpacity
                                style={[styles.pickerActionButton, styles.pickerCancelButton, {
                                  backgroundColor: isLight ? '#f8f9fa' : '#18181b',
                                  borderColor: isLight ? '#e2e8f0' : '#27272a',
                                }]}
                                onPress={() => setShowTimePicker(false)}
                              >
                                <MaterialIcons name="close" size={20} color={isLight ? '#64748b' : '#94a3b8'} />
                                <Text style={[styles.pickerActionButtonText, {
                                  color: isLight ? '#64748b' : '#94a3b8',
                                }]}>
                                  Close
                                </Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                style={[styles.pickerActionButton, styles.pickerConfirmButton]}
                                onPress={() => setShowTimePicker(false)}
                              >
                                <MaterialIcons name="check" size={20} color="#ffffff" />
                                <Text style={styles.pickerConfirmButtonText}>
                                  Confirm
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={[styles.footer, {
                borderTopColor: isLight ? '#e2e8f0' : '#334155',
                backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
              }]}>
                {step === 1 ? (
                  <>
                    <TouchableOpacity
                      style={[styles.cancelButton, {
                        backgroundColor: isLight ? '#f8f9fa' : '#18181b',
                        borderColor: isLight ? '#e2e8f0' : '#27272a',
                      }]}
                      onPress={onClose}
                    >
                      <Text style={[styles.cancelText, {
                        color: isLight ? '#64748b' : '#94a3b8',
                      }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.submitButton, {
                        backgroundColor: title.trim() ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                        opacity: title.trim() ? 1 : 0.6,
                      }]}
                      onPress={() => setStep(2)}
                      disabled={!title.trim()}
                    >
                      <Text style={styles.submitText}>Next</Text>
                      <MaterialIcons name="arrow-forward" size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.cancelButton, {
                        backgroundColor: isLight ? '#f8f9fa' : '#18181b',
                        borderColor: isLight ? '#e2e8f0' : '#27272a',
                      }]}
                      onPress={() => setStep(1)}
                      disabled={submitting}
                    >
                      <MaterialIcons name="arrow-back" size={20} color={isLight ? '#64748b' : '#94a3b8'} />
                      <Text style={[styles.cancelText, {
                        color: isLight ? '#64748b' : '#94a3b8',
                      }]}>
                        Back
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.submitButton, {
                        backgroundColor: !submitting ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                        opacity: !submitting ? 1 : 0.6,
                      }]}
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <MaterialIcons name="how-to-vote" size={20} color="#ffffff" />
                          <Text style={styles.submitText}>Create Proposal</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Map Picker Modal */}
        {showMapPicker && (
          <Modal
            visible={showMapPicker}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setShowMapPicker(false)}
          >
            <View style={styles.mapModalContainer}>
              <View style={[styles.mapHeader, {
                backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                borderBottomColor: isLight ? '#e2e8f0' : '#334155',
              }]}>
                <TouchableOpacity
                  onPress={() => setShowMapPicker(false)}
                  style={styles.mapBackButton}
                >
                  <MaterialIcons name="arrow-back" size={24} color={isLight ? '#0f172a' : '#f8fafc'} />
                </TouchableOpacity>
                <Text style={[styles.mapHeaderTitle, {
                  color: isLight ? '#0f172a' : '#f8fafc',
                }]}>
                  Select Location
                </Text>
                <TouchableOpacity
                  onPress={handleConfirmLocation}
                  disabled={!tempMarker}
                  style={[styles.mapDoneButton, {
                    opacity: tempMarker ? 1 : 0.5,
                  }]}
                >
                  <Text style={styles.mapDoneText}>Done</Text>
                </TouchableOpacity>
              </View>

              {userLocation ? (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: tempMarker?.latitude || userLocation.latitude,
                    longitude: tempMarker?.longitude || userLocation.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={handleMapPress}
                >
                  {tempMarker && (
                    <Marker coordinate={tempMarker} />
                  )}
                </MapView>
              ) : (
                <View style={styles.mapLoadingContainer}>
                  <ActivityIndicator size="large" color="#37a4c8" />
                  <Text style={[styles.mapLoadingText, {
                    color: isLight ? '#64748b' : '#94a3b8',
                  }]}>
                    Loading map...
                  </Text>
                </View>
              )}

              <View style={[styles.mapInstructionsBar, {
                backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 26, 26, 0.95)',
                borderTopColor: isLight ? '#e2e8f0' : '#334155',
              }]}>
                {location ? (
                  <View style={styles.selectedLocationDisplay}>
                    <MaterialIcons name="place" size={22} color="#22c55e" />
                    <View style={styles.selectedLocationTextContainer}>
                      <Text style={[styles.selectedLocationLabel, {
                        color: isLight ? '#64748b' : '#94a3b8',
                      }]}>
                        Selected Location:
                      </Text>
                      <Text style={[styles.selectedLocationText, {
                        color: isLight ? '#0f172a' : '#f8fafc',
                      }]} numberOfLines={2}>
                        {location}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <>
                    <MaterialIcons name="info-outline" size={20} color="#37a4c8" />
                    <Text style={[styles.mapInstructionsText, {
                      color: isLight ? '#1e293b' : '#f1f5f9',
                    }]}>
                      Tap on the map to set the event location
                    </Text>
                  </>
                )}
              </View>
            </View>
          </Modal>
        )}
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
  },
  modalOverlayInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalWrapper: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  modalContent: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 20,
    flexShrink: 1,
  },
  header: {
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 22,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
    paddingRight: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  headerTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 5,
    lineHeight: 28,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    padding: 28,
    paddingBottom: 24,
    flexGrow: 1,
  },
  scrollContentStep2: {
    minHeight: 500,
    justifyContent: 'flex-start',
  },
  inputGroup: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  required: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 2,
    fontWeight: '500',
  },
  textAreaContainer: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  textArea: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 100,
    textAlignVertical: 'top',
    fontWeight: '500',
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  dateTimeSection: {
    marginBottom: 24,
    minHeight: 400,
    gap: 24,
  },
  step2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  step2HeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  step2HeaderText: {
    flex: 1,
    gap: 4,
  },
  step2Title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  step2Subtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  selectedSummaryBig: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  selectedSummaryTextContainer: {
    flex: 1,
    gap: 6,
  },
  selectedSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedSummaryTextBig: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  pickerSection: {
    gap: 12,
  },
  pickerSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  pickerToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    minHeight: 56,
  },
  pickerToggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  pickerWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  picker: {
    width: '100%',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  pickerCancelButton: {
    borderWidth: 2,
  },
  pickerActionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pickerConfirmButton: {
    backgroundColor: '#37a4c8',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pickerConfirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  locationInputContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 2,
    fontWeight: '500',
    minHeight: 52,
  },
  mapButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locationConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  locationConfirmationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  mapModalContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'ios' ? 50 : 14,
    borderBottomWidth: 1,
  },
  mapBackButton: {
    padding: 4,
    width: 80,
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  mapDoneButton: {
    padding: 4,
    width: 80,
    alignItems: 'flex-end',
  },
  mapDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#37a4c8',
  },
  map: {
    flex: 1,
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  mapLoadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mapInstructionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    minHeight: 70,
  },
  mapInstructionsText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  selectedLocationDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  selectedLocationTextContainer: {
    flex: 1,
    gap: 4,
  },
  selectedLocationLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedLocationText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 22,
    paddingBottom: 26,
    borderTopWidth: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    minWidth: 130,
    gap: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
