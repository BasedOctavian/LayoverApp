import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  Keyboard,
  FlatList,
  ScrollView,
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { PingFormData } from '../types/pingTypes';
import { PING_CATEGORIES, getCategoryById, getTemplateById } from '../constants/pingCategories';
import useAuth from '../hooks/auth';
import usePings from '../hooks/usePings';
import { haversineDistance } from '../utils/haversineDistance';
import { scaleWidth, scaleHeight, scaleFontSize, moderateScale, spacing, borderRadius } from '../utils/responsive';

interface PingEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (title: string, message: string, type: 'success' | 'error') => void;
}

const PingEventModal: React.FC<PingEventModalProps> = ({ 
  visible, 
  onClose, 
  onSuccess 
}) => {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const { isCreatingPing, createPing, findMatchingUsers } = usePings({ user });
  
  // Form state
  const [pingFormData, setPingFormData] = useState<PingFormData>({
    title: '',
    description: '',
    location: '',
    category: '',
    template: '',
    interests: '',
    duration: '1 hour',
    maxParticipants: '4 people',
    pingType: 'open',
    visibilityRadius: '10 miles',
    connectionIntents: [],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true, // Default to true since maxParticipants is '4 people'
      prefersWeekendEvents: false,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: false,
      prefersTravelEvents: false,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: false,
    }
  });
  
  const [pingFormErrors, setPingFormErrors] = useState<{[key: string]: string}>({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedPingType, setSelectedPingType] = useState('open');
  const [pingStep, setPingStep] = useState(1);
  const [allowAutoAdvance, setAllowAutoAdvance] = useState(true);

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const [matchingUsers, setMatchingUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [showLocationOptions, setShowLocationOptions] = useState(false);
  const [selectedMapLocation, setSelectedMapLocation] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  

  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }>({
    latitude: 40.7128, // Default to NYC until we get user's actual coordinates
    longitude: -74.0060,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  
  // Animations
  const pingModalAnim = useRef(new Animated.Value(0)).current;
  const pingContentAnim = useRef(new Animated.Value(0)).current;
  const pingStepAnim = useRef(new Animated.Value(0)).current;
  const pingSuccessAnim = useRef(new Animated.Value(0)).current;

  // Options
  const durationOptions = ['30 minutes', '1 hour', '2 hours', '3 hours', '4 hours', 'All day'];
  const participantOptions = ['2 people', '3 people', '4 people', '5 people', '6 people', 'Unlimited'];
  const radiusOptions = ['5 miles', '10 miles', '15 miles', '20 miles', '25 miles', '50 miles'];

  // Use centralized connection intents from pingCategories
  const CONNECTION_INTENTS = PING_CATEGORIES.flatMap(cat => cat.connectionIntents).filter((v, i, a) => a.indexOf(v) === i).sort();

  // Use the centralized category configuration
  const categoryOptions = PING_CATEGORIES.map(category => ({
    id: category.id,
    label: category.label,
    icon: category.icon
  }));

  // Get template options from centralized config
  const getTemplateOptions = (categoryId: string) => {
    const category = getCategoryById(categoryId);
    return category?.templates || [];
  };

  const pingTypeOptions = [
    { id: 'open', label: 'Open', description: 'Anyone can join', icon: 'public' },
    { id: 'invite-only', label: 'Invite Only', description: 'Only invited users can join', icon: 'person-add' },
    { id: 'friends-only', label: 'Friends Only', description: 'Only your available connections', icon: 'people' }
  ];

  // Form validation
  const validateForm = (step: number) => {
    const errors: {[key: string]: string} = {};
    
    if (step === 1) {
      if (!selectedCategory) {
        errors.category = 'Please select a category';
      }
    }
    
    if (step === 2) {
      if (!selectedTemplate) {
        errors.template = 'Please select a template';
      }
    }
    
    if (step === 3) {
      if (!pingFormData.location.trim()) {
        errors.location = 'Location is required';
      }
    }
    
    if (step === 4) {
      if (!pingFormData.title.trim()) {
        errors.title = 'Title is required';
      } else if (pingFormData.title.length < 3) {
        errors.title = 'Title must be at least 3 characters';
      } else if (pingFormData.title.length > 50) {
        errors.title = 'Title must be less than 50 characters';
      }
      // Description is optional - no validation needed
    }
    // Step 5: no required fields (event settings)
    // Step 6: no required fields (visibility settings)
    
    setPingFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handlePingInputChange = (field: string, value: string) => {
    setPingFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (pingFormErrors[field]) {
      setPingFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };



  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = getCategoryById(categoryId);
    const categoryLabel = category?.label || '';
    
    setPingFormData(prev => ({ 
      ...prev, 
      category: categoryLabel,
      connectionIntents: category?.connectionIntents || []
    }));
    
    if (pingFormErrors.category) {
      setPingFormErrors(prev => ({ ...prev, category: '' }));
    }
    
    // Re-enable auto-advance when user selects a category
    setAllowAutoAdvance(true);
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = getTemplateById(selectedCategory, templateId);
    
    if (template) {
      setPingFormData(prev => ({ 
        ...prev, 
        template: templateId,
        title: template.label,
        description: template.description
      }));
    }
    
    if (pingFormErrors.template) {
      setPingFormErrors(prev => ({ ...prev, template: '' }));
    }
    
    // Re-enable auto-advance when user selects a template
    setAllowAutoAdvance(true);
  };

  // Handle ping type selection
  const handlePingTypeSelect = (typeId: string) => {
    setSelectedPingType(typeId);
    setPingFormData(prev => ({ ...prev, pingType: typeId }));
  };

  // Handle duration selection
  const handleDurationSelect = (duration: string) => {
    setPingFormData(prev => ({ ...prev, duration }));
  };

  // Handle participants selection
  const handleParticipantsSelect = (maxParticipants: string) => {
    // Determine if this is a small group based on participant count
    const isSmallGroup = maxParticipants === '2 people' || maxParticipants === '3 people' || maxParticipants === '4 people';
    
    setPingFormData(prev => ({ 
      ...prev, 
      maxParticipants,
      eventPreferences: {
        ...prev.eventPreferences,
        prefersSmallGroups: isSmallGroup
      }
    }));
  };

  // Handle radius selection
  const handleRadiusSelect = (visibilityRadius: string) => {
    setPingFormData(prev => ({ ...prev, visibilityRadius }));
  };



  // Handle current location
  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to use your current location.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationName = [
          address.name,
          address.street,
          address.city,
          address.region
        ].filter(Boolean).join(', ');
        
        setPingFormData(prev => ({ 
          ...prev, 
          location: locationName || 'Current Location'
        }));
      } else {
        setPingFormData(prev => ({ 
          ...prev, 
          location: 'Current Location'
        }));
      }
      
      setShowLocationOptions(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again or enter manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Helper function to format address without duplicates
  const formatAddress = (address: any) => {
    const parts = [];
    
    // Prioritize name field (usually contains full address with street number)
    if (address.name) {
      parts.push(address.name);
    }
    
    // Add city if available and not already included
    if (address.city && (!address.name || !address.name.includes(address.city))) {
      parts.push(address.city);
    }
    
    // Add region/state if available and not already included
    if (address.region && (!address.name || !address.name.includes(address.region))) {
      parts.push(address.region);
    }
    
    // If we have no parts yet, try street as fallback
    if (parts.length === 0 && address.street) {
      parts.push(address.street);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Selected Location';
  };

  // Handle map tap to update location
  const handleMapTap = async (latitude: number, longitude: number) => {
    setSelectedMapLocation({
      latitude,
      longitude,
      latitudeDelta: selectedMapLocation?.latitudeDelta || 0.01,
      longitudeDelta: selectedMapLocation?.longitudeDelta || 0.01,
    });

    try {
      // Reverse geocode to get address
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationName = formatAddress(address);
        
        setPingFormData(prev => ({ 
          ...prev, 
          location: locationName
        }));
      } else {
        setPingFormData(prev => ({ 
          ...prev, 
          location: 'Selected Location'
        }));
      }
    } catch (error) {
      console.error('Error getting address for tapped location:', error);
      setPingFormData(prev => ({ 
        ...prev, 
        location: 'Selected Location'
      }));
    }
  };



  // Handle manual location input - REMOVED
  // const handleManualLocation = () => {
  //   setShowLocationOptions(false);
  //   // Show manual input field
  //   setPingFormData(prev => ({ ...prev, location: '' }));
  //   // Set a flag to show manual input
  //   setShowManualInput(true);
  // };

  // Handle step navigation
  const handleNextStep = () => {
    Keyboard.dismiss();
    const isValid = validateForm(pingStep);
    if (isValid) {
      if (pingStep < 9) {
        // Re-enable auto-advance when manually going forward
        setAllowAutoAdvance(true);
        
        // Enhanced step transition animation
        Animated.sequence([
          Animated.timing(pingStepAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(pingStepAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
        setPingStep(pingStep + 1);
      } else {
        handleCreatePing();
      }
    }
  };

  const handlePrevStep = () => {
    if (pingStep > 1) {
      // Disable auto-advance when going back
      setAllowAutoAdvance(false);
      
      // Enhanced step transition animation
      Animated.sequence([
        Animated.timing(pingStepAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pingStepAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      setPingStep(pingStep - 1);
    }
  };

  // Handle ping creation
  const handleCreatePing = async () => {
    try {
      await createPing(pingFormData, selectedMapLocation);
      
      // Enhanced success animation
      Animated.timing(pingSuccessAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      
      // Close modal after success
      setTimeout(() => {
        handleCloseModal();
        onSuccess('Success', 'Ping event created successfully!', 'success');
      }, 1200);
      
    } catch (error) {
      console.error('Error creating ping:', error);
      onSuccess('Error', 'Failed to create ping event', 'error');
    }
  };



  // Handle modal open/close
  const handleCloseModal = () => {
    // Enhanced modal closing animation
    Animated.parallel([
      Animated.timing(pingModalAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(pingContentAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      // Reset form state
      setPingStep(1);
      setAllowAutoAdvance(true);
      setPingFormData({
        title: '',
        description: '',
        location: '',
        category: '',
        template: '',
        interests: '',
        duration: '1 hour',
        maxParticipants: '4 people',
        pingType: 'open',
        visibilityRadius: '10 km',
        connectionIntents: [],
        eventPreferences: {
          likesBars: false,
          prefersSmallGroups: true, // Default to true since maxParticipants is '4 people'
          prefersWeekendEvents: false,
          prefersEveningEvents: false,
          prefersIndoorVenues: false,
          prefersStructuredActivities: false,
          prefersSpontaneousPlans: false,
          prefersLocalMeetups: false,
          prefersTravelEvents: false,
          prefersQuietEnvironments: false,
          prefersActiveLifestyles: false,
          prefersIntellectualDiscussions: false,
        }
      });
      setPingFormErrors({});
      setSelectedCategory('');
      setSelectedTemplate('');
      setSelectedPingType('open');
      pingSuccessAnim.setValue(0);
      setShowLocationOptions(false);
      setMatchingUsers([]);
      setShowUserList(false);
      setIsFindingMatches(false);
    });
  };

  // Handle modal open
  useEffect(() => {
    if (visible) {
      // Enhanced modal opening animation
      Animated.parallel([
        Animated.timing(pingModalAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(pingContentAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset step animation
      pingStepAnim.setValue(1);
    }
  }, [visible, pingModalAnim, pingContentAnim, pingStepAnim]);

  // Auto-advance when category is selected on step 1
  useEffect(() => {
    if (pingStep === 1 && selectedCategory && visible && allowAutoAdvance) {
      setTimeout(() => {
        handleNextStep();
      }, 300);
    }
  }, [selectedCategory, pingStep, visible, allowAutoAdvance]);

  // Auto-advance when template is selected on step 2
  useEffect(() => {
    if (pingStep === 2 && selectedTemplate && visible && allowAutoAdvance) {
      setTimeout(() => {
        handleNextStep();
      }, 300);
    }
  }, [selectedTemplate, pingStep, visible, allowAutoAdvance]);

  // Get current location when reaching step 2
  useEffect(() => {
    if (pingStep === 2 && visible) {
      const getCurrentLocationForMap = async () => {
        try {
          // Request location permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            return;
          }

          // Get current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          // Set the map location to current location
          const currentLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          
          setSelectedMapLocation(currentLocation);
          setMapRegion(currentLocation);

          // Also set the location text to current location
          const addressResponse = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (addressResponse.length > 0) {
            const address = addressResponse[0];
            const locationName = formatAddress(address);
            
            setPingFormData(prev => ({ 
              ...prev, 
              location: locationName === 'Selected Location' ? 'Current Location' : locationName
            }));
          } else {
            setPingFormData(prev => ({ 
              ...prev, 
              location: 'Current Location'
            }));
          }
        } catch (error) {
          // Keep default location if getting current location fails
        }
      };

      getCurrentLocationForMap();
    }
  }, [pingStep, visible]);

  // Find matching users when reaching step 9 (review step)
  useEffect(() => {
    if (pingStep === 9 && visible) {
      const fetchMatchingUsers = async () => {
        setIsFindingMatches(true);
        try {
          const matches = await findMatchingUsers(pingFormData, selectedMapLocation);
          // Filter out the current user (organizer) from the list
          const filteredMatches = matches.filter((matchUser: any) => matchUser.id !== user?.uid);
          setMatchingUsers(filteredMatches);
        } catch (error) {
          console.error('Error finding matching users:', error);
          setMatchingUsers([]);
        } finally {
          setIsFindingMatches(false);
        }
      };

      fetchMatchingUsers();
    }
  }, [pingStep, visible]);





  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            opacity: pingModalAnim,
            backgroundColor: pingModalAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.6)'],
            }),
          }
        ]}
      >
                  <Animated.View 
            style={[
              styles.pingModal, 
              { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                transform: [
                  {
                    scale: pingContentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                  {
                    translateY: pingContentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: pingContentAnim,
              }
            ]}
          >
          {/* Success State Overlay */}
          <Animated.View 
            style={[
              styles.pingSuccessOverlay,
              {
                opacity: pingSuccessAnim,
                backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.95)" : "rgba(26, 26, 26, 0.95)",
              }
            ]}
          >
            <View style={styles.pingSuccessContent}>
              <Animated.View 
                style={[
                  styles.pingSuccessIcon,
                  {
                    transform: [
                      {
                        scale: pingSuccessAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                        }),
                      },
                    ],
                    backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9",
                  }
                ]}
              >
                <Feather name="check" size={32} color="#FFFFFF" />
              </Animated.View>
              <Text style={[styles.pingSuccessTitle, { 
                color: theme === "light" ? "#000000" : "#e4fbfe" 
              }]}>
                Ping Created!
              </Text>
              <Text style={[styles.pingSuccessMessage, { 
                color: theme === "light" ? "#64748B" : "#64748B" 
              }]}>
                Your ping event has been created successfully and is now visible to nearby travelers.
              </Text>
            </View>
          </Animated.View>

          {/* Header */}
          <View style={styles.pingModalHeader}>
            <View style={[styles.pingModalIconContainer, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}>
              <MaterialIcons 
                name="send" 
                size={18} 
                color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
              />
            </View>
            <Text style={[styles.pingModalTitle, { 
              color: theme === "light" ? "#000000" : "#e4fbfe" 
            }]}>
              Send a Ping
            </Text>
            <TouchableOpacity 
              style={[styles.pingModalCloseButton, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
              }]}
              onPress={handleCloseModal}
              activeOpacity={0.6}
            >
              <Feather name="x" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
            </TouchableOpacity>
          </View>

          {/* Enhanced Step Indicator */}
          <View style={styles.pingStepIndicator}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
              <React.Fragment key={step}>
                <Animated.View 
                  style={[
                    styles.pingStepDot, 
                    { 
                      backgroundColor: pingStep >= step 
                        ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                        : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"),
                      transform: [
                        {
                          scale: pingStep === step ? 1.2 : 1,
                        },
                      ],
                    }
                  ]} 
                />
                {step < 9 && (
                  <Animated.View 
                    style={[
                      styles.pingStepLine, 
                      { 
                        backgroundColor: pingStep > step 
                          ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                      }
                    ]} 
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Content */}
          <Animated.View 
            style={[
              styles.pingModalContent,
              {
                opacity: pingStepAnim,
                transform: [
                  {
                    translateX: pingStepAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            {pingStep === 1 && (
              // Step 1: Category Selection
              <>
                {/* Category */}
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    What type of event are you planning? *
                  </Text>
                  <View style={styles.pingCategoryGrid}>
                    {categoryOptions.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.pingCategoryCard,
                          {
                            backgroundColor: category.id === selectedCategory 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                            borderColor: category.id === selectedCategory 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                          }
                        ]}
                        activeOpacity={0.6}
                        onPress={() => handleCategorySelect(category.id)}
                      >
                        <MaterialIcons 
                          name={category.icon as any} 
                          size={16}
                          color={category.id === selectedCategory 
                            ? "#FFFFFF"
                            : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          } 
                        />
                        <Text style={[
                          styles.pingCategoryCardText, 
                          {
                            color: category.id === selectedCategory 
                              ? "#FFFFFF"
                              : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          }
                        ]}>
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {pingFormErrors.category && (
                    <Text style={[styles.pingErrorText, { 
                      color: theme === "light" ? "#ef4444" : "#f87171" 
                    }]}>
                      {pingFormErrors.category}
                    </Text>
                  )}
                </View>
              </>
            )}
            {pingStep === 2 && (
              // Step 2: Template Selection
              <>
                {/* Template */}
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    Choose a template for your {categoryOptions.find(c => c.id === selectedCategory)?.label.toLowerCase()} event *
                  </Text>
                  <View style={styles.pingTemplateGrid}>
                    {getTemplateOptions(selectedCategory).map((template) => (
                      <TouchableOpacity
                        key={template.id}
                        style={[
                          styles.pingTemplateCard,
                          {
                            backgroundColor: template.id === selectedTemplate 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                            borderColor: template.id === selectedTemplate 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                          }
                        ]}
                        activeOpacity={0.6}
                        onPress={() => handleTemplateSelect(template.id)}
                      >
                        <MaterialIcons 
                          name={template.icon as any} 
                          size={14}
                          color={template.id === selectedTemplate 
                            ? "#FFFFFF"
                            : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          } 
                        />
                        <View style={styles.pingTemplateContent}>
                          <Text style={[
                            styles.pingTemplateLabel, 
                            {
                              color: template.id === selectedTemplate 
                                ? "#FFFFFF"
                                : (theme === "light" ? "#37a4c8" : "#38a5c9")
                            }
                          ]}>
                            {template.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {pingFormErrors.template && (
                    <Text style={[styles.pingErrorText, { 
                      color: theme === "light" ? "#ef4444" : "#f87171" 
                    }]}>
                      {pingFormErrors.template}
                    </Text>
                  )}
                </View>


              </>
            )}
            {pingStep === 3 && (
              // Step 3: Location
              <>
                {/* Map with expand functionality */}
                <View style={styles.pingMapContainer}>
                  <MapView
                    style={styles.pingMap}
                    region={mapRegion}
                    onPress={(event) => {
                      const { latitude, longitude } = event.nativeEvent.coordinate;
                      handleMapTap(latitude, longitude);
                    }}
                    onRegionChangeComplete={(region) => {
                      setMapRegion(region);
                    }}
                    showsUserLocation={true}
                    showsMyLocationButton={true}
                    showsCompass={true}
                    showsScale={true}
                    showsBuildings={true}
                    showsTraffic={false}
                    showsIndoors={true}
                  >
                    {selectedMapLocation && (
                      <Marker
                        coordinate={{
                          latitude: selectedMapLocation.latitude,
                          longitude: selectedMapLocation.longitude,
                        }}
                        pinColor={theme === "light" ? "#37a4c8" : "#38a5c9"}
                        title="Selected Location"
                        description="This is your chosen location"
                      />
                    )}
                  </MapView>
                  

                  
                  {/* Location Indicator */}
                  {selectedMapLocation && (
                    <View style={[styles.pingMapLocationIndicator, {
                      backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.95)",
                      borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                    }]}>
                      <MaterialIcons 
                        name="location-on" 
                        size={12} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.pingMapLocationText, { 
                        color: theme === "light" ? "#000000" : "#ffffff" 
                      }]}>
                        Location selected
                      </Text>
                    </View>
                  )}
                </View>

                {/* Only show one of: options or selected location */}
                {pingFormData.location ? (
                  <View style={[styles.pingLocationSelected, { backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a" }]}>
                    <View style={styles.pingLocationContent}>
                      <MaterialIcons 
                        name="location-on" 
                        size={18} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.pingLocationText, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>{pingFormData.location}</Text>
                    </View>
                  </View>
                ) : showLocationOptions ? (
                  <View style={[styles.pingLocationOptions, { backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a" }]}>
                    <TouchableOpacity
                      style={[
                        styles.pingLocationOption,
                        {
                          backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                          borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                        }
                      ]}
                      onPress={handleGetCurrentLocation}
                      activeOpacity={0.6}
                      disabled={isGettingLocation}
                    >
                      <View style={styles.pingLocationOptionContent}>
                        <MaterialIcons 
                          name="my-location" 
                          size={20} 
                          color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                        />
                        <View style={styles.pingLocationOptionText}>
                          <Text style={[styles.pingLocationOptionTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>Use Current Location</Text>
                          <Text style={[styles.pingLocationOptionSubtitle, { color: theme === "light" ? "#64748B" : "#64748B" }]}>Automatically detect your location</Text>
                        </View>
                      </View>
                      {isGettingLocation ? (
                        <ActivityIndicator size="small" color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      ) : (
                        <Feather name="chevron-right" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      )}
                    </TouchableOpacity>


                    <TouchableOpacity
                      style={styles.pingLocationCancel}
                      onPress={() => setShowLocationOptions(false)}
                    >
                      <Text style={[styles.pingLocationCancelText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.pingInput,
                      styles.pingLocationInput,
                      pingFormErrors.location && styles.pingInputError,
                      { 
                        backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                        borderColor: pingFormErrors.location 
                          ? (theme === "light" ? "#ef4444" : "#f87171")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)")
                      }
                    ]}
                    onPress={() => setShowLocationOptions(true)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.pingLocationContent}>
                      <MaterialIcons 
                        name="location-on" 
                        size={18} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.pingLocationText, { color: theme === "light" ? "#94a3b8" : "#64748B" }]}>Choose location</Text>
                    </View>
                    <Feather name="chevron-down" size={16} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                  </TouchableOpacity>
                )}
                {pingFormErrors.location && (
                  <Text style={[styles.pingErrorText, { color: theme === "light" ? "#ef4444" : "#f87171" }]}>{pingFormErrors.location}</Text>
                )}
              </>
            )}
            {pingStep === 4 && (
              // Step 4: Basic Info (Title & Description)
              <>
                {/* Title and Description */}
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    Title *
                  </Text>
                  <TextInput
                    style={[
                      styles.pingInput, 
                      pingFormErrors.title && styles.pingInputError,
                      { 
                        backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                        borderColor: pingFormErrors.title 
                          ? (theme === "light" ? "#ef4444" : "#f87171")
                          : (theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"),
                        color: theme === "light" ? "#000000" : "#e4fbfe"
                      }
                    ]}
                    placeholder="e.g., Need a 4th for Basketball"
                    placeholderTextColor={theme === "light" ? "#94a3b8" : "#64748B"}
                    value={pingFormData.title}
                    onChangeText={(value) => handlePingInputChange('title', value)}
                    maxLength={50}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit={true}
                  />
                  {pingFormErrors.title && (
                    <Text style={[styles.pingErrorText, { 
                      color: theme === "light" ? "#ef4444" : "#f87171" 
                    }]}>
                      {pingFormErrors.title}
                    </Text>
                  )}
                </View>

                {/* Description - Now Optional */}
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    Description (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.pingInput, 
                      styles.pingTextArea,
                      { 
                        backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                        borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)",
                        color: theme === "light" ? "#000000" : "#e4fbfe"
                      }
                    ]}
                    placeholder="Tell people what you have in mind... (optional)"
                    placeholderTextColor={theme === "light" ? "#94a3b8" : "#64748B"}
                    multiline={true}
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={pingFormData.description}
                    onChangeText={(value) => handlePingInputChange('description', value)}
                    maxLength={200}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    blurOnSubmit={true}
                  />
                  <View style={styles.pingInputFooter}>
                    <Text style={[styles.pingCharCount, { 
                      color: theme === "light" ? "#64748B" : "#64748B" 
                    }]}>
                      {pingFormData.description.length}/200
                    </Text>
                  </View>
                </View>
              </>
            )}
            {pingStep === 5 && (
              // Step 5: Duration Selection
              <>
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    How long will your event last?
                  </Text>
                  <View style={styles.pingOptionGrid}>
                    {durationOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.pingOptionCard,
                          {
                            backgroundColor: option === pingFormData.duration 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                            borderColor: option === pingFormData.duration 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                          }
                        ]}
                        activeOpacity={0.6}
                        onPress={() => handleDurationSelect(option)}
                      >
                        <Feather 
                          name="clock" 
                          size={16} 
                          color={option === pingFormData.duration 
                            ? "#FFFFFF"
                            : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          } 
                        />
                        <Text style={[
                          styles.pingOptionCardText, 
                          {
                            color: option === pingFormData.duration 
                              ? "#FFFFFF"
                              : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          }
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
            {pingStep === 6 && (
              // Step 6: Max Participants Selection
              <>
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    How many people can join your event?
                  </Text>
                  <View style={styles.pingOptionGrid}>
                    {participantOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.pingOptionCard,
                          {
                            backgroundColor: option === pingFormData.maxParticipants 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                            borderColor: option === pingFormData.maxParticipants 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                          }
                        ]}
                        activeOpacity={0.6}
                        onPress={() => handleParticipantsSelect(option)}
                      >
                        <Feather 
                          name="users" 
                          size={16} 
                          color={option === pingFormData.maxParticipants 
                            ? "#FFFFFF"
                            : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          } 
                        />
                        <Text style={[
                          styles.pingOptionCardText, 
                          {
                            color: option === pingFormData.maxParticipants 
                              ? "#FFFFFF"
                              : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          }
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
            {pingStep === 7 && (
              // Step 7: Ping Type Selection
              <>
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    Who can join your event?
                  </Text>
                  <View style={styles.pingTypeContainer}>
                    {pingTypeOptions.map((option) => (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.pingTypeCard,
                          {
                            backgroundColor: option.id === selectedPingType 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                            borderColor: option.id === selectedPingType 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                          }
                        ]}
                        activeOpacity={0.6}
                        onPress={() => handlePingTypeSelect(option.id)}
                      >
                        <MaterialIcons 
                          name={option.icon as any} 
                          size={20} 
                          color={option.id === selectedPingType 
                            ? "#FFFFFF"
                            : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          } 
                        />
                        <View style={styles.pingTypeContent}>
                          <Text style={[
                            styles.pingTypeLabel, 
                            {
                              color: option.id === selectedPingType 
                                ? "#FFFFFF"
                                : (theme === "light" ? "#37a4c8" : "#38a5c9")
                            }
                          ]}>
                            {option.label}
                          </Text>
                          <Text style={[
                            styles.pingTypeDescription, 
                            {
                              color: option.id === selectedPingType 
                                ? "rgba(255, 255, 255, 0.8)"
                                : (theme === "light" ? "#64748B" : "#64748B")
                            }
                          ]}>
                            {option.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
            {pingStep === 8 && (
              // Step 8: Visibility Settings
              <>
                <View style={styles.pingInputContainer}>
                  <Text style={[styles.pingInputLabel, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe" 
                  }]}>
                    How far should your event be visible?
                  </Text>
                  <View style={styles.pingOptionGrid}>
                    {radiusOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.pingOptionCard,
                          {
                            backgroundColor: option === pingFormData.visibilityRadius 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"),
                            borderColor: option === pingFormData.visibilityRadius 
                              ? (theme === "light" ? "#37a4c8" : "#38a5c9")
                              : (theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)")
                          }
                        ]}
                        activeOpacity={0.6}
                        onPress={() => handleRadiusSelect(option)}
                      >
                        <Feather 
                          name="map-pin" 
                          size={16} 
                          color={option === pingFormData.visibilityRadius 
                            ? "#FFFFFF"
                            : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          } 
                        />
                        <Text style={[
                          styles.pingOptionCardText, 
                          {
                            color: option === pingFormData.visibilityRadius 
                              ? "#FFFFFF"
                              : (theme === "light" ? "#37a4c8" : "#38a5c9")
                          }
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
            {pingStep === 9 && (
              // Step 9: Review - Show matching users
              <>
                <ScrollView 
                  style={styles.pingReviewContainer}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pingReviewScrollContent}
                >
                  <Text style={[styles.pingReviewTitle, { 
                    color: theme === "light" ? "#000000" : "#e4fbfe",
                  }]}>
                    Review Your Ping
                  </Text>

                  {/* Ping Summary Details */}
                  <View style={[styles.pingReviewDetailsCard, {
                    backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                    borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(56, 165, 201, 0.2)"
                  }]}>
                    <View style={styles.pingReviewDetailRow}>
                      <MaterialIcons 
                        name="title" 
                        size={16} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.pingReviewDetailLabel, { 
                        color: theme === "light" ? "#64748B" : "#94a3b8" 
                      }]}>
                        Title:
                      </Text>
                      <Text style={[styles.pingReviewDetailValue, { 
                        color: theme === "light" ? "#000000" : "#e4fbfe" 
                      }]}>
                        {pingFormData.title}
                      </Text>
                    </View>
                    <View style={styles.pingReviewDetailRow}>
                      <MaterialIcons 
                        name="location-on" 
                        size={16} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.pingReviewDetailLabel, { 
                        color: theme === "light" ? "#64748B" : "#94a3b8" 
                      }]}>
                        Location:
                      </Text>
                      <Text style={[styles.pingReviewDetailValue, { 
                        color: theme === "light" ? "#000000" : "#e4fbfe" 
                      }]}>
                        {pingFormData.location}
                      </Text>
                    </View>
                    <View style={styles.pingReviewDetailRow}>
                      <MaterialIcons 
                        name="schedule" 
                        size={16} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.pingReviewDetailLabel, { 
                        color: theme === "light" ? "#64748B" : "#94a3b8" 
                      }]}>
                        Duration:
                      </Text>
                      <Text style={[styles.pingReviewDetailValue, { 
                        color: theme === "light" ? "#000000" : "#e4fbfe" 
                      }]}>
                        {pingFormData.duration}
                      </Text>
                    </View>
                    <View style={styles.pingReviewDetailRow}>
                      <MaterialIcons 
                        name="people" 
                        size={16} 
                        color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                      />
                      <Text style={[styles.pingReviewDetailLabel, { 
                        color: theme === "light" ? "#64748B" : "#94a3b8" 
                      }]}>
                        Max:
                      </Text>
                      <Text style={[styles.pingReviewDetailValue, { 
                        color: theme === "light" ? "#000000" : "#e4fbfe" 
                      }]}>
                        {pingFormData.maxParticipants}
                      </Text>
                    </View>
                  </View>

                  {isFindingMatches ? (
                    <View style={styles.pingMatchingLoader}>
                      <ActivityIndicator size="large" color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                      <Text style={[styles.pingMatchingLoaderText, { 
                        color: theme === "light" ? "#64748B" : "#94a3b8" 
                      }]}>
                        Finding nearby people...
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Notification Summary Card - Hidden for invite-only pings */}
                      {pingFormData.pingType !== 'invite-only' && (
                        <View style={[styles.pingReviewSummary, {
                          backgroundColor: theme === "light" ? "#f0f9ff" : "#1a2332",
                          borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                        }]}>
                          <View style={styles.pingReviewSummaryRow}>
                            <MaterialIcons 
                              name="notifications-active" 
                              size={22} 
                              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.pingReviewSummaryText, { 
                                color: theme === "light" ? "#000000" : "#e4fbfe" 
                              }]}>
                                {matchingUsers.length} {matchingUsers.length === 1 ? 'person' : 'people'} will be notified
                              </Text>
                              <Text style={[styles.pingReviewSummarySubtext, { 
                                color: theme === "light" ? "#64748B" : "#94a3b8" 
                              }]}>
                                {pingFormData.pingType === 'friends-only' 
                                  ? 'Available friends within range'
                                  : 'Anyone nearby can join'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {/* User List - Hidden for invite-only pings */}
                      {pingFormData.pingType !== 'invite-only' && matchingUsers.length > 0 && (
                        <View style={styles.pingUserListContainer}>
                          <TouchableOpacity 
                            style={[styles.pingUserListHeader, {
                              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.05)" : "rgba(56, 165, 201, 0.05)",
                              borderRadius: moderateScale(8)
                            }]}
                            onPress={() => setShowUserList(!showUserList)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.pingUserListHeaderText, { 
                              color: theme === "light" ? "#37a4c8" : "#38a5c9" 
                            }]}>
                              {showUserList ? 'Hide' : 'View'} User List
                            </Text>
                            <Feather 
                              name={showUserList ? "chevron-up" : "chevron-down"} 
                              size={18} 
                              color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                            />
                          </TouchableOpacity>

                          {showUserList && (
                            <View style={[styles.pingUserList, {
                              backgroundColor: theme === "light" ? "#f8fafc" : "#2a2a2a",
                              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(56, 165, 201, 0.15)"
                            }]}>
                              {matchingUsers.map((item, index) => (
                                <View 
                                  key={item.id}
                                  style={[
                                    styles.pingUserItem,
                                    {
                                      borderBottomColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
                                      borderBottomWidth: index < matchingUsers.length - 1 ? 1 : 0
                                    }
                                  ]}
                                >
                                  <View style={[styles.pingUserAvatar, {
                                    backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                                  }]}>
                                    <Text style={styles.pingUserAvatarText}>
                                      {item.name?.charAt(0).toUpperCase() || '?'}
                                    </Text>
                                  </View>
                                  <View style={styles.pingUserInfo}>
                                    <Text style={[styles.pingUserName, { 
                                      color: theme === "light" ? "#000000" : "#e4fbfe" 
                                    }]}>
                                      {item.name || 'Unknown User'}
                                    </Text>
                                    {item.lastKnownCoordinates && selectedMapLocation && (
                                      <Text style={[styles.pingUserDistance, { 
                                        color: theme === "light" ? "#64748B" : "#94a3b8" 
                                      }]}>
                                        {(() => {
                                          const distanceKm = haversineDistance(
                                            selectedMapLocation.latitude,
                                            selectedMapLocation.longitude,
                                            item.lastKnownCoordinates.latitude,
                                            item.lastKnownCoordinates.longitude
                                          );
                                          const distanceMiles = distanceKm * 0.621371;
                                          return `${distanceMiles.toFixed(1)} miles away`;
                                        })()}
                                      </Text>
                                    )}
                                  </View>
                                  <Feather 
                                    name="bell" 
                                    size={16} 
                                    color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
                                  />
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}

                      {matchingUsers.length === 0 && (
                        <View style={styles.pingNoMatchesContainer}>
                          <MaterialIcons 
                            name="info-outline" 
                            size={48} 
                            color={theme === "light" ? "#94a3b8" : "#64748B"} 
                          />
                          <Text style={[styles.pingNoMatchesTitle, { 
                            color: theme === "light" ? "#000000" : "#e4fbfe" 
                          }]}>
                            No Immediate Matches
                          </Text>
                          <Text style={[styles.pingNoMatchesText, { 
                            color: theme === "light" ? "#64748B" : "#94a3b8" 
                          }]}>
                            No users matching your criteria are currently available nearby. Don't worry—your ping will still be created and visible to users who match when they become available!
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </Animated.View>

          {/* Enhanced Footer */}
          <View style={styles.pingModalFooter}>
            {pingStep > 1 ? (
              <TouchableOpacity 
                style={[styles.pingCancelButton, {
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                }]}
                onPress={handlePrevStep}
                activeOpacity={0.6}
                disabled={isCreatingPing}
              >
                <Feather name="arrow-left" size={14} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
                <Text style={[styles.pingCancelButtonText, { 
                  color: theme === "light" ? "#37a4c8" : "#38a5c9" 
                }]}>
                  Back
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.pingCancelButton, {
                  borderColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "rgba(56, 165, 201, 0.3)"
                }]}
                onPress={handleCloseModal}
                activeOpacity={0.6}
                disabled={isCreatingPing}
              >
                <Text style={[styles.pingCancelButtonText, { 
                  color: theme === "light" ? "#37a4c8" : "#38a5c9" 
                }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
            
            {pingStep < 9 ? (
              <TouchableOpacity 
                style={[styles.pingCreateButton, {
                  backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
                }]}
                onPress={handleNextStep}
                activeOpacity={0.7}
                disabled={isCreatingPing}
              >
                <Feather name="arrow-right" size={14} color="#FFFFFF" />
                <Text style={styles.pingCreateButtonText}>
                  {pingStep === 8 ? 'Review' : 'Next'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.pingCreateButton,
                  {
                    backgroundColor: (isCreatingPing || isFindingMatches)
                      ? (theme === "light" ? "#94a3b8" : "#64748B")
                      : (theme === "light" ? "#37a4c8" : "#38a5c9")
                  }
                ]}
                onPress={handleCreatePing}
                activeOpacity={0.7}
                disabled={isCreatingPing || isFindingMatches}
              >
                {isCreatingPing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="send" size={14} color="#FFFFFF" />
                )}
                <Text style={styles.pingCreateButtonText}>
                  {isCreatingPing ? 'Creating...' : 'Create Ping'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>


    </Modal>

  </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(20), // Reduced from 40 to better center the modal
  },
  pingModal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '78.75%', // Increased by 5% from 75%
    borderRadius: moderateScale(24),
    borderWidth: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(12) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(24),
    elevation: 16,
    overflow: 'hidden',
  },
  pingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleHeight(20),
    borderBottomWidth: 0,
  },
  pingModalIconContainer: {
    width: scaleWidth(36),
    height: scaleHeight(36),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(12),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  pingModalTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  pingModalCloseButton: {
    width: scaleWidth(32),
    height: scaleHeight(32),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingModalContent: {
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleHeight(20),
    paddingBottom: scaleHeight(80), // Add bottom padding to account for fixed footer
    minHeight: scaleHeight(400), // Ensure minimum height for consistency
  },
  pingModalSubtitle: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleHeight(18),
    marginBottom: scaleHeight(16),
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  pingInputContainer: {
    marginBottom: scaleHeight(24), // Increased from 20 for more spacing
  },
  pingInputLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    marginBottom: scaleHeight(10),
    letterSpacing: 0.2,
  },
  pingInput: {
    borderWidth: 1,
    borderRadius: moderateScale(10),
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    fontSize: scaleFontSize(14),
    letterSpacing: 0.2,
  },
  pingTextArea: {
    height: scaleHeight(120), // Increased from 90 for more content area
    paddingTop: 14,
    paddingBottom: 14,
  },
  pingRow: {
    flexDirection: 'row',
    marginBottom: scaleHeight(16),
    gap: moderateScale(12),
  },
  pingPickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pingPickerText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleHeight(20),
    gap: moderateScale(12),
    borderTopWidth: 0,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'inherit',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  pingCancelButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: scaleHeight(16),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
  },
  pingCancelButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pingCreateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(16),
    borderRadius: moderateScale(10),
    gap: moderateScale(8),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(4) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(8),
    elevation: 4,
  },
  pingCreateButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  pingStepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scaleHeight(20),
    paddingHorizontal: scaleWidth(24),
  },
  pingStepDot: {
    width: scaleWidth(6),
    height: scaleHeight(6),
    borderRadius: moderateScale(3),
    backgroundColor: 'rgba(56, 165, 201, 0.2)',
  },
  pingStepLine: {
    width: scaleWidth(16),
    height: scaleHeight(1),
    backgroundColor: 'rgba(56, 165, 201, 0.2)',
    marginHorizontal: scaleWidth(3),
  },
  pingSuccessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(24),
  },
  pingSuccessContent: {
    alignItems: 'center',
    paddingHorizontal: scaleWidth(40),
  },
  pingSuccessIcon: {
    width: scaleWidth(80),
    height: scaleHeight(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleHeight(24),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(6) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(12),
    elevation: 6,
  },
  pingSuccessTitle: {
    fontSize: scaleFontSize(22),
    fontWeight: '600',
    marginBottom: scaleHeight(12),
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  pingSuccessMessage: {
    fontSize: scaleFontSize(15),
    textAlign: 'center',
    lineHeight: scaleHeight(22),
    letterSpacing: -0.2,
  },
  pingInputError: {
    borderColor: '#ef4444',
  },
  pingErrorText: {
    fontSize: scaleFontSize(12),
    marginTop: scaleHeight(6),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingInputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scaleHeight(6),
  },
  pingCharCount: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(10),
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(20), // Added bottom margin for consistency
  },
  pingCategoryCard: {
    width: '48%',
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    alignItems: 'center',
    gap: moderateScale(8),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  pingCategoryCardText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  pingTemplateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(10),
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(20), // Added bottom margin for consistency
  },
  pingTemplateCard: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: scaleHeight(20),
    paddingHorizontal: scaleWidth(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    gap: moderateScale(8),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  pingTemplateContent: {
    alignItems: 'center',
  },
  pingTemplateLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pingTemplateDescription: {
    fontSize: scaleFontSize(10),
    lineHeight: scaleHeight(14),
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pingTypeContainer: {
    gap: moderateScale(12),
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(20), // Added bottom margin for consistency
  },
  pingTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(20),
    paddingHorizontal: scaleWidth(20),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    gap: moderateScale(16),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  pingTypeCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(11), // 30% smaller (16 * 0.7)
    paddingHorizontal: scaleWidth(11), // 30% smaller (16 * 0.7)
    borderRadius: moderateScale(8), // 30% smaller (12 * 0.7)
    borderWidth: 1,
    gap: moderateScale(8), // 30% smaller (12 * 0.7)
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: scaleHeight(1) }, // 30% smaller
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(3), // 30% smaller (4 * 0.7)
    elevation: 1, // 30% smaller
  },
  pingTypeContent: {
    flex: 1,
  },
  pingTypeLabel: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    marginBottom: scaleHeight(4),
    letterSpacing: 0.2,
  },
  pingTypeLabelSmall: {
    fontSize: scaleFontSize(12), // 30% smaller (16 * 0.75)
    fontWeight: '600',
    marginBottom: scaleHeight(2), // 30% smaller
    letterSpacing: 0.3,
  },
  pingTypeDescription: {
    fontSize: scaleFontSize(13),
    lineHeight: scaleHeight(18),
    letterSpacing: 0.2,
  },
  pingTypeDescriptionSmall: {
    fontSize: scaleFontSize(10), // 30% smaller (14 * 0.75)
    lineHeight: scaleHeight(15), // 30% smaller (20 * 0.75)
    letterSpacing: 0.2,
  },
  pingLocationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
  },
  pingLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pingLocationText: {
    marginLeft: scaleWidth(8),
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  pingLocationOptions: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    marginTop: scaleHeight(8),
    overflow: 'hidden',
  },
  pingLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.1)',
  },
  pingLocationOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pingLocationOptionText: {
    marginLeft: scaleWidth(12),
  },
  pingLocationOptionTitle: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    marginBottom: scaleHeight(2),
    letterSpacing: 0.2,
  },
  pingLocationOptionSubtitle: {
    fontSize: scaleFontSize(13),
    lineHeight: scaleHeight(18),
    letterSpacing: 0.1,
  },
  pingLocationCancel: {
    alignItems: 'center',
    paddingVertical: scaleHeight(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 165, 201, 0.1)',
  },
  pingLocationCancelText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pingLocationSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    marginBottom: scaleHeight(20),
  },
  pingLocationEditButton: {
    width: scaleWidth(28),
    height: scaleHeight(28),
    borderRadius: moderateScale(6),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
  },
  pingLocationEditButtons: {
    flexDirection: 'row',
    gap: moderateScale(4),
  },
  mapContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(16),
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  mapCloseButton: {
    width: scaleWidth(40),
    height: scaleHeight(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '600',
  },
  mapTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  mapSubtitle: {
    fontSize: scaleFontSize(12),
    marginTop: scaleHeight(2),
  },
  mapConfirmButton: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(20),
  },
  mapConfirmText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
  },
  mapInstructionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  mapInstructionsText: {
    fontSize: scaleFontSize(14),
    flex: 1,
  },
  locationPreview: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(8),
    borderWidth: 1,
  },
  locationPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  locationPreviewText: {
    fontSize: scaleFontSize(12),
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pingMapContainer: {
    height: scaleHeight(310), // Reduced by 3% from 320
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    marginBottom: scaleHeight(20),
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.15)',
    position: 'relative',
  },
  pingMap: {
    flex: 1,
  },

  pingMapLocationIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 3,
    gap: moderateScale(6),
  },
  pingMapLocationText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pingConnectionIntentsInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    borderRadius: moderateScale(10),
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
  },
  pingConnectionIntentsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pingConnectionIntentsText: {
    marginLeft: scaleWidth(8),
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  pingConnectionIntentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: scaleHeight(12),
    gap: moderateScale(6),
  },
  pingConnectionIntentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(10),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#38a5c9',
    gap: moderateScale(6),
  },
  pingConnectionIntentTagText: {
    color: '#e4fbfe',
    fontFamily: 'Inter-Medium',
    fontSize: scaleFontSize(12),
  },
  pingEventPreferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(6),
    marginTop: scaleHeight(8),
  },
  pingEventPreferenceCard: {
    width: '48%',
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(8),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    alignItems: 'center',
    gap: moderateScale(4),
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  pingEventPreferenceText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: moderateScale(20),
    margin: scaleHeight(20),
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: moderateScale(-2),
    },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(3.84),
    elevation: 5,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  modalTitle: {
    fontSize: scaleFontSize(20),
    fontFamily: 'Inter-Bold',
    color: '#e4fbfe',
  },
  closeButton: {
    padding: moderateScale(8),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: moderateScale(12),
    padding: moderateScale(12),
    margin: scaleHeight(16),
    borderWidth: 1,
    borderColor: '#38a5c9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: scaleHeight(2),
    },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(3.84),
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: scaleWidth(8),
    fontSize: scaleFontSize(16),
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
    paddingVertical: scaleHeight(4),
  },
  countryList: {
    maxHeight: 400,
    borderRadius: moderateScale(12),
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#38a5c9',
    margin: scaleHeight(16),
    marginTop: 0,
  },
  countryListContent: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  countryItemText: {
    fontSize: scaleFontSize(16),
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
  },
  countryItemIcon: {
    opacity: 0.7,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    padding: moderateScale(6),
    borderRadius: moderateScale(12),
  },
  emptyState: {
    padding: moderateScale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: scaleHeight(12),
    fontSize: scaleFontSize(16),
    color: '#38a5c9',
    fontFamily: 'Inter-Medium',
  },

  pingOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
    marginTop: scaleHeight(12),
    marginBottom: scaleHeight(20), // Added bottom margin for consistency
  },
  pingOptionCard: {
    width: '48%',
    paddingVertical: scaleHeight(18),
    paddingHorizontal: scaleWidth(12),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    alignItems: 'center',
    gap: moderateScale(8),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  pingOptionCardText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Review Step Styles
  pingReviewContainer: {
    flex: 1,
  },
  pingReviewScrollContent: {
    paddingBottom: 100, // Increased to account for fixed footer buttons
  },
  pingReviewTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    marginBottom: scaleHeight(16),
    letterSpacing: 0.2,
  },
  pingReviewDetailsCard: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    padding: moderateScale(16),
    marginBottom: scaleHeight(16),
    gap: moderateScale(12),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  pingReviewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  pingReviewDetailLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    letterSpacing: 0.2,
    minWidth: 70,
  },
  pingReviewDetailValue: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    letterSpacing: 0.2,
    flex: 1,
  },
  pingMatchingLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(60),
    gap: moderateScale(16),
  },
  pingMatchingLoaderText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingReviewSummary: {
    borderRadius: moderateScale(12),
    borderWidth: 2,
    padding: moderateScale(18),
    marginBottom: scaleHeight(16),
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(3) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(6),
    elevation: 3,
  },
  pingReviewSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: moderateScale(12),
  },
  pingReviewSummaryText: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: scaleHeight(4),
  },
  pingReviewSummarySubtext: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingUserListContainer: {
    marginBottom: scaleHeight(16),
  },
  pingUserListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(16),
    marginBottom: scaleHeight(8),
  },
  pingUserListHeaderText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pingUserList: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    overflow: 'hidden',
  },
  pingUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(16),
    gap: moderateScale(12),
  },
  pingUserAvatar: {
    width: scaleWidth(44),
    height: scaleHeight(44),
    borderRadius: moderateScale(22),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: scaleHeight(2) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(3),
    elevation: 2,
  },
  pingUserAvatarText: {
    fontSize: scaleFontSize(18),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pingUserInfo: {
    flex: 1,
  },
  pingUserName: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    letterSpacing: 0.2,
    marginBottom: scaleHeight(3),
  },
  pingUserDistance: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingNoMatchesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(50),
    paddingHorizontal: scaleWidth(24),
    gap: moderateScale(12),
  },
  pingNoMatchesTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: scaleHeight(8),
  },
  pingNoMatchesText: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: scaleHeight(22),
    letterSpacing: 0.2,
  },
});

export default PingEventModal; 