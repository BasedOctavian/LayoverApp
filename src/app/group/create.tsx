import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import MapView, { Marker, Circle } from 'react-native-maps';
import { ThemeContext } from '../../context/ThemeContext';
import useAuth from '../../hooks/auth';
import useGroups from '../../hooks/useGroups';
import { GroupFormData, GROUP_CATEGORIES, SUGGESTED_TAGS } from '../../types/groupTypes';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import TopBar from '../../components/TopBar';
import useNotificationCount from '../../hooks/useNotificationCount';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../utils/responsive';

export default function CreateGroup() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = React.useContext(ThemeContext);
  const { createGroup, loading } = useGroups();
  const notificationCount = useNotificationCount(user?.uid || null);

  // Form state
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    category: 'social',
    tags: [],
    location: '',
    coordinates: undefined,
    radius: 30, // Default 30 miles
    isPrivate: false,
    requiresApproval: false,
    visibility: 'public',
    rules: '',
    groupImage: undefined,
    coverImage: undefined,
  });

  // Location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [tempMarker, setTempMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Animation
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    // Set initial load complete after component mounts
    setInitialLoadComplete(true);
  }, []);

  useEffect(() => {
    if (initialLoadComplete) {
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }
  }, [initialLoadComplete, contentBounceAnim, contentScaleAnim]);

  // Reverse geocode to get location name from coordinates
  const reverseGeocode = async (coords: { latitude: number; longitude: number }) => {
    try {
      const results = await Location.reverseGeocodeAsync(coords);
      if (results && results.length > 0) {
        const result = results[0];
        const locationParts = [];
        if (result.city) locationParts.push(result.city);
        if (result.region) locationParts.push(result.region);
        return locationParts.join(', ') || 'Unknown Location';
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
    return 'Unknown Location';
  };

  // Get user's location on mount
  React.useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(coords);
          
          // Auto-fill location and coordinates in form
          const locationName = await reverseGeocode(coords);
          setFormData(prev => ({
            ...prev,
            location: locationName,
            coordinates: coords,
          }));
        } else {
          // If permission denied, try to get from user profile
          if (user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data()?.lastKnownCoordinates) {
              const coords = userDoc.data().lastKnownCoordinates;
              setUserLocation(coords);
              
              // Auto-fill location and coordinates in form
              const locationName = await reverseGeocode(coords);
              setFormData(prev => ({
                ...prev,
                location: locationName,
                coordinates: coords,
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getUserLocation();
  }, [user]);

  // Handle image picker
  const pickImage = async (type: 'profile' | 'cover') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'profile' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'profile') {
        setFormData(prev => ({ ...prev, groupImage: result.assets[0].uri }));
      } else {
        setFormData(prev => ({ ...prev, coverImage: result.assets[0].uri }));
      }
    }
  };

  // Handle tag toggle
  const toggleTag = (tag: string) => {
    if (formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== tag),
      }));
    } else if (formData.tags.length < 10) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    } else {
      Alert.alert('Limit Reached', 'You can select up to 10 tags');
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Alert.alert('Missing Information', 'Please enter a group name');
      return false;
    }

    if (formData.name.length < 3) {
      Alert.alert('Invalid Name', 'Group name must be at least 3 characters');
      return false;
    }

    if (!formData.description.trim()) {
      Alert.alert('Missing Information', 'Please enter a group description');
      return false;
    }

    if (formData.description.length < 20) {
      Alert.alert('Invalid Description', 'Description must be at least 20 characters');
      return false;
    }

    return true;
  };

  // Handle map marker placement
  const handleMapPress = async (event: any) => {
    const coords = event.nativeEvent.coordinate;
    setTempMarker(coords);
    
    // Get location name for the selected point
    const locationName = await reverseGeocode(coords);
    setFormData(prev => ({
      ...prev,
      location: locationName,
      coordinates: coords,
    }));
  };

  // Confirm map selection
  const handleConfirmLocation = () => {
    if (tempMarker) {
      setFormData(prev => ({
        ...prev,
        coordinates: tempMarker,
      }));
      setShowMap(false);
    }
  };

  // Handle create group
  const handleCreateGroup = async () => {
    if (!validateForm() || !user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userName = userDoc.exists() ? userDoc.data()?.name : 'Unknown';

      const groupId = await createGroup(formData, user.uid, userName);
      
      if (groupId) {
        router.replace(`/group/${groupId}`);
      }
    } catch (err) {
      console.error('Error creating group:', err);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    }
  };

  const handleBack = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === 'light' ? '#f8f9fa' : '#000000' }]} edges={['bottom']}>
      <LinearGradient colors={theme === 'light' ? ['#f8f9fa', '#ffffff'] : ['#000000', '#1a1a1a']} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {!initialLoadComplete ? (
          <View style={styles.flex} />
        ) : (
          <Animated.View 
            style={[
              styles.flex, 
              {
                opacity: contentBounceAnim,
                transform: [
                  { scale: contentScaleAnim },
                  {
                    translateY: contentBounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {/* Cover Image */}
            <TouchableOpacity
              style={[styles.coverImageContainer, {
                backgroundColor: theme === 'light' ? '#e2e8f0' : '#334155',
              }]}
              onPress={() => pickImage('cover')}
              activeOpacity={0.9}
            >
              {formData.coverImage ? (
                <Image source={{ uri: formData.coverImage }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <MaterialIcons name="image" size={moderateScale(48)} color={theme === 'light' ? '#cbd5e1' : '#475569'} />
                  <Text style={[styles.placeholderText, {
                    color: theme === 'light' ? '#94a3b8' : '#64748b',
                  }]}>
                    Add cover image
                  </Text>
                </View>
              )}
              {formData.coverImage && (
                <View style={styles.imageOverlay}>
                  <MaterialIcons name="edit" size={moderateScale(20)} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Profile Image */}
            <View style={styles.profileSection}>
              <TouchableOpacity
                style={[styles.profileImageContainer, {
                  backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
                  borderColor: theme === 'light' ? '#ffffff' : '#000000',
                }]}
                onPress={() => pickImage('profile')}
                activeOpacity={0.9}
              >
                {formData.groupImage ? (
                  <Image source={{ uri: formData.groupImage }} style={styles.profileImage} />
                ) : (
                  <View style={[styles.profilePlaceholder, {
                    backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                  }]}>
                    <MaterialIcons name="groups" size={moderateScale(36)} color="#37a4c8" />
                  </View>
                )}
                <View style={[styles.editBadge, {
                  backgroundColor: theme === 'light' ? '#37a4c8' : '#37a4c8',
                }]}>
                  <MaterialIcons name="camera-alt" size={moderateScale(16)} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              {/* Group Name */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Text style={[styles.sectionTitle, {
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}>
                    Group Name
                  </Text>
                  <Text style={[styles.requiredBadge, {
                    color: theme === 'light' ? '#dc2626' : '#ef4444',
                  }]}>
                    *
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme === 'light' ? '#f8f9fa' : '#0f172a',
                    borderColor: formData.name ? '#37a4c8' : (theme === 'light' ? '#e2e8f0' : '#334155'),
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}
                  placeholder="e.g., NYC Coffee Lovers"
                  placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  maxLength={50}
                  autoFocus
                />
                <Text style={[styles.helperText, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  {formData.name.length}/50 characters
                </Text>
              </View>

              {/* Description */}
              <View style={styles.section}>
                <View style={styles.sectionLabelRow}>
                  <Text style={[styles.sectionTitle, {
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}>
                    Description
                  </Text>
                  <Text style={[styles.requiredBadge, {
                    color: theme === 'light' ? '#dc2626' : '#ef4444',
                  }]}>
                    *
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea, {
                    backgroundColor: theme === 'light' ? '#f8f9fa' : '#0f172a',
                    borderColor: formData.description.length >= 20 ? '#37a4c8' : (theme === 'light' ? '#e2e8f0' : '#334155'),
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}
                  placeholder="Tell people what this group is about..."
                  placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  maxLength={500}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={[styles.helperText, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  {formData.description.length}/500 • Min 20 characters
                </Text>
              </View>

              {/* Category */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  Category
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {GROUP_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[styles.categoryChip, {
                        backgroundColor: formData.category === category.id
                          ? (theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)')
                          : (theme === 'light' ? '#ffffff' : '#1a1a1a'),
                        borderColor: formData.category === category.id
                          ? '#37a4c8'
                          : (theme === 'light' ? '#e2e8f0' : '#334155'),
                      }]}
                      onPress={() => setFormData(prev => ({ ...prev, category: category.id }))}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={category.icon as any}
                        size={moderateScale(20)}
                        color={formData.category === category.id ? '#37a4c8' : (theme === 'light' ? '#64748b' : '#94a3b8')}
                      />
                      <Text style={[styles.categoryText, {
                        color: formData.category === category.id
                          ? '#37a4c8'
                          : (theme === 'light' ? '#64748b' : '#94a3b8'),
                      }]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Interest Tags */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  Interest Tags
                </Text>
                <Text style={[styles.sectionSubtitle, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Select up to 10 tags ({formData.tags.length}/10)
                </Text>
                <View style={styles.tagsContainer}>
                  {SUGGESTED_TAGS.map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, {
                        backgroundColor: formData.tags.includes(tag)
                          ? (theme === 'light' ? '#37a4c8' : '#37a4c8')
                          : (theme === 'light' ? '#ffffff' : '#1a1a1a'),
                        borderColor: formData.tags.includes(tag)
                          ? (theme === 'light' ? '#37a4c8' : '#37a4c8')
                          : (theme === 'light' ? '#e2e8f0' : '#334155'),
                      }]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tagText, {
                        color: formData.tags.includes(tag)
                          ? '#ffffff'
                          : (theme === 'light' ? '#64748b' : '#94a3b8'),
                      }]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  Group Location
                </Text>
                <Text style={[styles.sectionSubtitle, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Set where your group is based
                </Text>
                <View style={[styles.inputWithIcon, {
                  backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
                  borderColor: formData.location ? '#37a4c8' : (theme === 'light' ? '#e2e8f0' : '#334155'),
                }]}>
                  <MaterialIcons name="location-on" size={moderateScale(20)} color="#37a4c8" />
                  <TextInput
                    style={[styles.inputText, {
                      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                    }]}
                    placeholder="Auto-detected location"
                    placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
                    value={formData.location}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                    maxLength={100}
                  />
                  <TouchableOpacity
                    style={[styles.mapButton, {
                      backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.2)',
                    }]}
                    onPress={() => {
                      setTempMarker(formData.coordinates || userLocation);
                      setShowMap(true);
                    }}
                  >
                    <MaterialIcons name="map" size={moderateScale(18)} color="#37a4c8" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Visibility Radius */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  Visibility Radius
                </Text>
                <Text style={[styles.sectionSubtitle, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  How far can people see your group? ({formData.radius} miles)
                </Text>
                <View style={styles.radiusOptions}>
                  {[10, 20, 30, 50, 100].map((radius) => (
                    <TouchableOpacity
                      key={radius}
                      style={[styles.radiusChip, {
                        backgroundColor: formData.radius === radius
                          ? (theme === 'light' ? '#37a4c8' : '#37a4c8')
                          : (theme === 'light' ? '#ffffff' : '#1a1a1a'),
                        borderColor: formData.radius === radius
                          ? '#37a4c8'
                          : (theme === 'light' ? '#e2e8f0' : '#334155'),
                      }]}
                      onPress={() => setFormData(prev => ({ ...prev, radius }))}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.radiusText, {
                        color: formData.radius === radius
                          ? '#ffffff'
                          : (theme === 'light' ? '#64748b' : '#94a3b8'),
                      }]}>
                        {radius} mi
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Privacy Settings */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  Privacy
                </Text>
                
                <TouchableOpacity
                  style={[styles.privacyOption, {
                    backgroundColor: !formData.isPrivate
                      ? (theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)')
                      : (theme === 'light' ? '#ffffff' : '#1a1a1a'),
                    borderColor: !formData.isPrivate
                      ? '#37a4c8'
                      : (theme === 'light' ? '#e2e8f0' : '#334155'),
                  }]}
                  onPress={() => setFormData(prev => ({ ...prev, isPrivate: false, visibility: 'public' }))}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="public"
                    size={moderateScale(24)}
                    color={!formData.isPrivate ? '#37a4c8' : (theme === 'light' ? '#94a3b8' : '#64748b')}
                  />
                  <View style={styles.privacyContent}>
                    <Text style={[styles.privacyTitle, {
                      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                    }]}>
                      Public
                    </Text>
                    <Text style={[styles.privacyDescription, {
                      color: theme === 'light' ? '#64748b' : '#94a3b8',
                    }]}>
                      Anyone can find and join this group
                    </Text>
                  </View>
                  {!formData.isPrivate && (
                    <MaterialIcons name="check-circle" size={24} color="#37a4c8" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.privacyOption, {
                    backgroundColor: formData.isPrivate
                      ? (theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)')
                      : (theme === 'light' ? '#ffffff' : '#1a1a1a'),
                    borderColor: formData.isPrivate
                      ? '#37a4c8'
                      : (theme === 'light' ? '#e2e8f0' : '#334155'),
                  }]}
                  onPress={() => setFormData(prev => ({ ...prev, isPrivate: true, visibility: 'private', requiresApproval: true }))}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="lock"
                    size={moderateScale(24)}
                    color={formData.isPrivate ? '#37a4c8' : (theme === 'light' ? '#94a3b8' : '#64748b')}
                  />
                  <View style={styles.privacyContent}>
                    <Text style={[styles.privacyTitle, {
                      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                    }]}>
                      Private
                    </Text>
                    <Text style={[styles.privacyDescription, {
                      color: theme === 'light' ? '#64748b' : '#94a3b8',
                    }]}>
                      Members must be approved by organizers
                    </Text>
                  </View>
                  {formData.isPrivate && (
                    <MaterialIcons name="check-circle" size={24} color="#37a4c8" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Group Rules (Optional) */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  Group Rules <Text style={[styles.optional, { color: theme === 'light' ? '#94a3b8' : '#64748b' }]}>(Optional)</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea, {
                    backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
                    borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}
                  placeholder="Set community guidelines and rules..."
                  placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
                  value={formData.rules}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, rules: text }))}
                  maxLength={1000}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={{ height: 100 }} />
            </View>
            </ScrollView>
          </Animated.View>
        )}
      </KeyboardAvoidingView>

      {/* Floating Create Button */}
      <LinearGradient
        colors={theme === 'light' 
          ? ['rgba(248, 249, 250, 0.95)', 'rgba(255, 255, 255, 0.98)'] 
          : ['rgba(0, 0, 0, 0.95)', 'rgba(26, 26, 26, 0.98)']}
        style={styles.floatingButtonContainer}
      >
        <TouchableOpacity
          style={[
            styles.floatingCreateButton,
            {
              backgroundColor: formData.name && formData.description && !loading
                ? '#37a4c8'
                : (theme === 'light' ? '#e2e8f0' : '#334155'),
              shadowColor: formData.name && formData.description && !loading ? '#37a4c8' : '#000000',
            }
          ]}
          onPress={handleCreateGroup}
          disabled={loading || !formData.name || !formData.description}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <MaterialIcons 
                name="check-circle" 
                size={moderateScale(22)} 
                color={formData.name && formData.description ? '#ffffff' : (theme === 'light' ? '#94a3b8' : '#64748b')} 
              />
              <Text style={[
                styles.floatingCreateButtonText,
                {
                  color: formData.name && formData.description ? '#ffffff' : (theme === 'light' ? '#94a3b8' : '#64748b'),
                }
              ]}>
                Create Group
              </Text>
            </>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Map Modal */}
      {showMap && userLocation && (
        <View style={styles.mapModal}>
          <View style={[styles.mapModalContent, {
            backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
          }]}>
            <View style={[styles.mapHeader, {
              borderBottomColor: theme === 'light' ? '#e2e8f0' : '#334155',
            }]}>
              <Text style={[styles.mapHeaderTitle, {
                color: theme === 'light' ? '#1e293b' : '#f1f5f9',
              }]}>
                Select Group Location
              </Text>
              <TouchableOpacity
                style={styles.mapCloseButton}
                onPress={() => setShowMap(false)}
              >
                <MaterialIcons name="close" size={moderateScale(24)} color={theme === 'light' ? '#1e293b' : '#f1f5f9'} />
              </TouchableOpacity>
            </View>
            
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: tempMarker?.latitude || userLocation.latitude,
                longitude: tempMarker?.longitude || userLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={handleMapPress}
            >
              {tempMarker && (
                <>
                  <Marker coordinate={tempMarker} />
                  <Circle
                    center={tempMarker}
                    radius={(formData.radius || 30) * 1609.34} // Convert miles to meters
                    fillColor="rgba(55, 164, 200, 0.2)"
                    strokeColor="rgba(55, 164, 200, 0.5)"
                    strokeWidth={2}
                  />
                </>
              )}
            </MapView>

            <View style={styles.mapFooter}>
              <Text style={[styles.mapInstructions, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                Tap on the map to set your group's location
              </Text>
              <TouchableOpacity
                style={[styles.confirmButton, {
                  backgroundColor: tempMarker ? '#37a4c8' : (theme === 'light' ? '#e2e8f0' : '#334155'),
                }]}
                onPress={handleConfirmLocation}
                disabled={!tempMarker}
                activeOpacity={0.8}
              >
                <Text style={[styles.confirmButtonText, {
                  color: tempMarker ? '#ffffff' : (theme === 'light' ? '#94a3b8' : '#64748b'),
                }]}>
                  Confirm Location
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaleHeight(40),
  },
  coverImageContainer: {
    width: '100%',
    height: scaleHeight(200),
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  placeholderText: {
    fontSize: scaleFontSize(15),
    fontWeight: '500',
  },
  imageOverlay: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: scaleHeight(-50),
    marginBottom: spacing.xl,
  },
  profileImageContainer: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    borderWidth: moderateScale(4),
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(50),
    overflow: 'hidden',
  },
  profilePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(50),
    overflow: 'hidden',
  },
  editBadge: {
    position: 'absolute',
    bottom: scaleHeight(-4),
    right: scaleWidth(-4),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: moderateScale(3),
    borderColor: '#ffffff',
  },
  formContainer: {
    paddingHorizontal: spacing.xl,
  },
  section: {
    marginBottom: moderateScale(28),
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  requiredBadge: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: scaleFontSize(13),
    marginBottom: spacing.md,
  },
  optional: {
    fontSize: scaleFontSize(15),
    fontWeight: '400',
  },
  input: {
    borderRadius: moderateScale(14),
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    fontSize: scaleFontSize(16),
    marginTop: spacing.sm,
  },
  textArea: {
    minHeight: scaleHeight(100),
    paddingTop: moderateScale(14),
  },
  helperText: {
    fontSize: scaleFontSize(12),
    marginTop: moderateScale(6),
    textAlign: 'right',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  inputText: {
    flex: 1,
    fontSize: scaleFontSize(16),
  },
  mapButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  radiusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  radiusChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
  },
  radiusText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  mapModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  mapModalContent: {
    width: '90%',
    height: '80%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(12),
    elevation: 10,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    borderBottomWidth: 1,
  },
  mapHeaderTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  mapCloseButton: {
    padding: spacing.xs,
  },
  map: {
    flex: 1,
  },
  mapFooter: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  mapInstructions: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    textAlign: 'center',
  },
  confirmButton: {
    paddingVertical: moderateScale(14),
    paddingHorizontal: spacing.xxl,
    borderRadius: moderateScale(14),
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
  },
  categoryScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    gap: moderateScale(6),
  },
  categoryText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
  },
  tagText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    marginBottom: moderateScale(2),
  },
  privacyDescription: {
    fontSize: scaleFontSize(13),
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 164, 200, 0.1)',
  },
  floatingCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: spacing.sm,
    elevation: 6,
  },
  floatingCreateButtonText: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
