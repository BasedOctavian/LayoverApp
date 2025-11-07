import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemeContext } from '../../../context/ThemeContext';
import useAuth from '../../../hooks/auth';
import useGroups from '../../../hooks/useGroups';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebaseConfig';
import TopBar from '../../../components/TopBar';
import useNotificationCount from '../../../hooks/useNotificationCount';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../../utils/responsive';

export default function CreateProposal() {
  const { theme } = React.useContext(ThemeContext);
  const { user, userId } = useAuth();
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const { createProposal } = useGroups();
  const notificationCount = useNotificationCount(userId || null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<Date | undefined>();
  const [tempDate, setTempDate] = useState<Date | undefined>();
  const [tempTime, setTempTime] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [tempMarker, setTempMarker] = useState<{ latitude: number; longitude: number } | null>(null);

  const isLight = theme === 'light';

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
    getUserLocation();
  }, []);

  const handleMapPress = async (event: any) => {
    const coords = event.nativeEvent.coordinate;
    setTempMarker(coords);
    
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
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }
    
    if (!user || !groupId) return;

    setSubmitting(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      await createProposal(
        groupId as string,
        title.trim(),
        description.trim() || undefined,
        location.trim() || undefined,
        date,
        time,
        user.uid,
        userData.name || user.displayName || 'Anonymous',
        userData.profilePicture || user.photoURL || undefined
      );
      
      // Navigate back immediately - the feed will auto-refresh
      router.back();
    } catch (error) {
      console.error('Error creating proposal:', error);
      Alert.alert('Error', 'Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (title.trim() || description.trim() || location.trim() || date || time) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard this proposal?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, {
      backgroundColor: isLight ? '#f8f9fa' : '#000000',
    }]} edges={['bottom']}>
      <LinearGradient 
        colors={isLight ? ['#f8f9fa', '#ffffff'] : ['#000000', '#1a1a1a']} 
        style={styles.container}
      >
        <StatusBar 
          translucent 
          backgroundColor="transparent" 
          barStyle={isLight ? 'dark-content' : 'light-content'} 
        />
        
        {/* TopBar */}
        <TopBar 
          showBackButton={true} 
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, {
                color: isLight ? '#1e293b' : '#f1f5f9',
              }]}>
                Event Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, {
                  backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                  color: isLight ? '#1e293b' : '#f1f5f9',
                  borderColor: isLight ? '#e2e8f0' : '#334155',
                }]}
                placeholder="e.g., Coffee meetup at Starbucks"
                placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                autoFocus
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, {
                color: isLight ? '#1e293b' : '#f1f5f9',
              }]}>
                Description
              </Text>
              <TextInput
                style={[styles.textArea, {
                  backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                  color: isLight ? '#1e293b' : '#f1f5f9',
                  borderColor: isLight ? '#e2e8f0' : '#334155',
                }]}
                placeholder="Add details about your proposal..."
                placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, {
                color: isLight ? '#94a3b8' : '#64748b',
              }]}>
                {description.length} / 500
              </Text>
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, {
                color: isLight ? '#1e293b' : '#f1f5f9',
              }]}>
                Location
              </Text>
              <View style={styles.locationContainer}>
                <TextInput
                  style={[styles.locationInput, {
                    backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                    color: isLight ? '#1e293b' : '#f1f5f9',
                    borderColor: isLight ? '#e2e8f0' : '#334155',
                  }]}
                  placeholder="Enter location or select on map"
                  placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                  value={location}
                  onChangeText={(text) => {
                    setLocation(text);
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
                >
                  <MaterialIcons 
                    name="map" 
                    size={moderateScale(20)} 
                    color={coordinates ? '#ffffff' : (isLight ? '#64748b' : '#94a3b8')} 
                  />
                </TouchableOpacity>
              </View>
              {coordinates && (
                <Text style={[styles.hint, {
                  color: isLight ? '#22c55e' : '#86efac',
                }]}>
                  ✓ Location set on map
                </Text>
              )}
            </View>

            {/* Date */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, {
                color: isLight ? '#1e293b' : '#f1f5f9',
              }]}>
                Date <Text style={[styles.optional, { color: isLight ? '#94a3b8' : '#64748b' }]}>(optional)</Text>
              </Text>
              {!showDatePicker ? (
                <TouchableOpacity
                  style={[styles.dateButton, {
                    backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                    borderColor: isLight ? '#e2e8f0' : '#334155',
                  }]}
                  onPress={() => {
                    setTempDate(date || new Date());
                    setShowDatePicker(true);
                  }}
                >
                  <MaterialIcons name="calendar-today" size={20} color="#37a4c8" />
                  <Text style={[styles.dateText, {
                    color: date ? (isLight ? '#1e293b' : '#f1f5f9') : (isLight ? '#94a3b8' : '#64748b'),
                  }]}>
                    {date 
                      ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                      : 'Select date'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.pickerContainer, {
                  backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                  borderColor: isLight ? '#e2e8f0' : '#334155',
                }]}>
                  <DateTimePicker
                    value={tempDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setDate(selectedDate);
                          setTempDate(selectedDate);
                        }
                      } else if (selectedDate) {
                        setTempDate(selectedDate);
                      }
                    }}
                    minimumDate={new Date()}
                    themeVariant={isLight ? 'light' : 'dark'}
                  />
                  <View style={styles.pickerActions}>
                    <TouchableOpacity
                      style={[styles.pickerButton, styles.pickerCancelButton, {
                        backgroundColor: isLight ? '#f8f9fa' : '#1a1a1a',
                      }]}
                      onPress={() => {
                        setShowDatePicker(false);
                        setTempDate(date);
                      }}
                    >
                      <Text style={[styles.pickerButtonText, {
                        color: isLight ? '#64748b' : '#94a3b8',
                      }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pickerButton, styles.pickerConfirmButton]}
                      onPress={() => {
                        setDate(tempDate);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={styles.pickerConfirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Time */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, {
                color: isLight ? '#1e293b' : '#f1f5f9',
              }]}>
                Time <Text style={[styles.optional, { color: isLight ? '#94a3b8' : '#64748b' }]}>(optional)</Text>
              </Text>
              {!showTimePicker ? (
                <TouchableOpacity
                  style={[styles.dateButton, {
                    backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                    borderColor: isLight ? '#e2e8f0' : '#334155',
                  }]}
                  onPress={() => {
                    setTempTime(time || new Date());
                    setShowTimePicker(true);
                  }}
                >
                  <MaterialIcons name="access-time" size={20} color="#37a4c8" />
                  <Text style={[styles.dateText, {
                    color: time ? (isLight ? '#1e293b' : '#f1f5f9') : (isLight ? '#94a3b8' : '#64748b'),
                  }]}>
                    {time 
                      ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Select time'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.pickerContainer, {
                  backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                  borderColor: isLight ? '#e2e8f0' : '#334155',
                }]}>
                  <DateTimePicker
                    value={tempTime || new Date()}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedTime) => {
                      if (Platform.OS === 'android') {
                        setShowTimePicker(false);
                        if (selectedTime) {
                          setTime(selectedTime);
                          setTempTime(selectedTime);
                        }
                      } else if (selectedTime) {
                        setTempTime(selectedTime);
                      }
                    }}
                    themeVariant={isLight ? 'light' : 'dark'}
                  />
                  <View style={styles.pickerActions}>
                    <TouchableOpacity
                      style={[styles.pickerButton, styles.pickerCancelButton, {
                        backgroundColor: isLight ? '#f8f9fa' : '#1a1a1a',
                      }]}
                      onPress={() => {
                        setShowTimePicker(false);
                        setTempTime(time);
                      }}
                    >
                      <Text style={[styles.pickerButtonText, {
                        color: isLight ? '#64748b' : '#94a3b8',
                      }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pickerButton, styles.pickerConfirmButton]}
                      onPress={() => {
                        setTime(tempTime);
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={styles.pickerConfirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, {
                backgroundColor: (title.trim() && !submitting) ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                opacity: (title.trim() && !submitting) ? 1 : 0.6,
              }]}
              onPress={handleSubmit}
              disabled={!title.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="how-to-vote" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Create Proposal</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

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
                  <MaterialIcons name="arrow-back" size={moderateScale(24)} color={isLight ? '#0f172a' : '#f8fafc'} />
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
                <MaterialIcons name="info-outline" size={20} color="#37a4c8" />
                <Text style={[styles.mapInstructionsText, {
                  color: isLight ? '#1e293b' : '#f1f5f9',
                }]}>
                  {location || 'Tap on the map to set location'}
                </Text>
              </View>
            </View>
          </Modal>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: scaleHeight(40),
  },
  inputGroup: {
    marginBottom: spacing.xxl,
  },
  label: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  required: {
    color: '#ef4444',
  },
  optional: {
    fontWeight: '500',
  },
  input: {
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    borderRadius: borderRadius.md,
    fontSize: scaleFontSize(16),
    borderWidth: 1.5,
  },
  textArea: {
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    borderRadius: borderRadius.md,
    fontSize: scaleFontSize(16),
    borderWidth: 1.5,
    minHeight: scaleHeight(100),
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: scaleFontSize(12),
    marginTop: moderateScale(6),
    textAlign: 'right',
  },
  locationContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    borderRadius: borderRadius.md,
    fontSize: scaleFontSize(16),
    borderWidth: 1.5,
  },
  mapButton: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    fontSize: scaleFontSize(13),
    marginTop: moderateScale(6),
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  dateText: {
    fontSize: scaleFontSize(16),
    flex: 1,
    fontWeight: '500',
  },
  pickerContainer: {
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  pickerButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCancelButton: {
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pickerConfirmButton: {
    backgroundColor: '#37a4c8',
  },
  pickerButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
  },
  pickerConfirmText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#ffffff',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: moderateScale(14),
    marginTop: spacing.lg,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: spacing.sm,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: scaleFontSize(17),
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  mapModalContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    paddingTop: Platform.OS === 'ios' ? scaleHeight(50) : moderateScale(14),
    borderBottomWidth: 1,
  },
  mapBackButton: {
    padding: spacing.xs,
    width: scaleWidth(80),
  },
  mapHeaderTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  mapDoneButton: {
    padding: spacing.xs,
    width: scaleWidth(80),
    alignItems: 'flex-end',
  },
  mapDoneText: {
    fontSize: scaleFontSize(17),
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
    gap: spacing.md,
  },
  mapLoadingText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  mapInstructionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
  },
  mapInstructionsText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    flex: 1,
  },
});

