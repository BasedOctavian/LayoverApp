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
} from 'react-native';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { PingFormData } from '../types/pingTypes';
import { PING_CATEGORIES, getCategoryById, getTemplateById } from '../constants/pingCategories';
import useAuth from '../hooks/auth';
import usePings from '../hooks/usePings';

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
  const { isCreatingPing, createPing } = usePings({ user });
  
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
    { id: 'invite-only', label: 'Invite Only', description: 'You approve requests', icon: 'person-add' },
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
      if (pingStep < 8) {
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
            {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
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
                {step < 8 && (
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
            
            {pingStep < 8 ? (
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
                  Next
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.pingCreateButton,
                  {
                    backgroundColor: isCreatingPing 
                      ? (theme === "light" ? "#94a3b8" : "#64748B")
                      : (theme === "light" ? "#37a4c8" : "#38a5c9")
                  }
                ]}
                onPress={handleCreatePing}
                activeOpacity={0.7}
                disabled={isCreatingPing}
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
    paddingHorizontal: 20,
    paddingVertical: 20, // Reduced from 40 to better center the modal
  },
  pingModal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '78.75%', // Increased by 5% from 75%
    borderRadius: 24,
    borderWidth: 0,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    overflow: 'hidden',
  },
  pingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 0,
  },
  pingModalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pingModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.2,
  },
  pingModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingModalContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 80, // Add bottom padding to account for fixed footer
    minHeight: 400, // Ensure minimum height for consistency
  },
  pingModalSubtitle: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 16,
    letterSpacing: 0.2,
    fontWeight: '600',
  },
  pingInputContainer: {
    marginBottom: 24, // Increased from 20 for more spacing
  },
  pingInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  pingInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  pingTextArea: {
    height: 120, // Increased from 90 for more content area
    paddingTop: 14,
    paddingBottom: 14,
  },
  pingRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  pingPickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pingPickerText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
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
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pingCreateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 10,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  pingCreateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  pingStepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  pingStepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(56, 165, 201, 0.2)',
  },
  pingStepLine: {
    width: 16,
    height: 1,
    backgroundColor: 'rgba(56, 165, 201, 0.2)',
    marginHorizontal: 3,
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
    borderRadius: 24,
  },
  pingSuccessContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pingSuccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  pingSuccessTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  pingSuccessMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  pingInputError: {
    borderColor: '#ef4444',
  },
  pingErrorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingInputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  pingCharCount: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  pingCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 20, // Added bottom margin for consistency
  },
  pingCategoryCard: {
    width: '48%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pingCategoryCardText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  pingTemplateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    marginBottom: 20, // Added bottom margin for consistency
  },
  pingTemplateCard: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pingTemplateContent: {
    alignItems: 'center',
  },
  pingTemplateLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pingTemplateDescription: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pingTypeContainer: {
    gap: 12,
    marginTop: 12,
    marginBottom: 20, // Added bottom margin for consistency
  },
  pingTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pingTypeCardSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11, // 30% smaller (16 * 0.7)
    paddingHorizontal: 11, // 30% smaller (16 * 0.7)
    borderRadius: 8, // 30% smaller (12 * 0.7)
    borderWidth: 1,
    gap: 8, // 30% smaller (12 * 0.7)
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 }, // 30% smaller
    shadowOpacity: 0.1,
    shadowRadius: 3, // 30% smaller (4 * 0.7)
    elevation: 1, // 30% smaller
  },
  pingTypeContent: {
    flex: 1,
  },
  pingTypeLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  pingTypeLabelSmall: {
    fontSize: 12, // 30% smaller (16 * 0.75)
    fontWeight: '600',
    marginBottom: 2, // 30% smaller
    letterSpacing: 0.3,
  },
  pingTypeDescription: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  pingTypeDescriptionSmall: {
    fontSize: 10, // 30% smaller (14 * 0.75)
    lineHeight: 15, // 30% smaller (20 * 0.75)
    letterSpacing: 0.2,
  },
  pingLocationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
  },
  pingLocationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pingLocationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  pingLocationOptions: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    marginTop: 8,
    overflow: 'hidden',
  },
  pingLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.1)',
  },
  pingLocationOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pingLocationOptionText: {
    marginLeft: 12,
  },
  pingLocationOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  pingLocationOptionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  pingLocationCancel: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(56, 165, 201, 0.1)',
  },
  pingLocationCancelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pingLocationSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
    marginBottom: 20,
  },
  pingLocationEditButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
  },
  pingLocationEditButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  mapContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  mapCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  mapTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  mapSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  mapConfirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapConfirmText: {
    fontSize: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapInstructionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapInstructionsText: {
    fontSize: 14,
    flex: 1,
  },
  locationPreview: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationPreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationPreviewText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pingMapContainer: {
    height: 310, // Reduced by 3% from 320
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 6,
  },
  pingMapLocationText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pingConnectionIntentsInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.3)',
  },
  pingConnectionIntentsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pingConnectionIntentsText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  pingConnectionIntentsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  pingConnectionIntentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#38a5c9',
    gap: 6,
  },
  pingConnectionIntentTagText: {
    color: '#e4fbfe',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  pingEventPreferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  pingEventPreferenceCard: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pingEventPreferenceText: {
    fontSize: 11,
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
    borderRadius: 20,
    margin: 20,
    maxHeight: '90%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#38a5c9',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#e4fbfe',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: '#38a5c9',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
    paddingVertical: 4,
  },
  countryList: {
    maxHeight: 400,
    borderRadius: 12,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#38a5c9',
    margin: 16,
    marginTop: 0,
  },
  countryListContent: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56, 165, 201, 0.2)',
  },
  countryItemText: {
    fontSize: 16,
    color: '#e4fbfe',
    fontFamily: 'Inter-Regular',
  },
  countryItemIcon: {
    opacity: 0.7,
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    padding: 6,
    borderRadius: 12,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#38a5c9',
    fontFamily: 'Inter-Medium',
  },

  pingOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    marginBottom: 20, // Added bottom margin for consistency
  },
  pingOptionCard: {
    width: '48%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pingOptionCardText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },




});

export default PingEventModal; 