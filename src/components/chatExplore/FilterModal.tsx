import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeContext } from '../../context/ThemeContext';
import { FilterModalProps, FilterOptions } from './types';
import { BlurView } from 'expo-blur';

/**
 * FilterModal Component
 * 
 * A comprehensive modal for advanced filtering options.
 * Features:
 * - Age range slider
 * - Interest selection (multi-select)
 * - Profile completeness filters
 * - Clear all filters option
 * - Apply/Cancel actions
 * - Theme-aware styling
 */
const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  availableInterests,
}) => {
  const { theme } = useContext(ThemeContext);
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  // Update local filters when prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setLocalFilters({});
  };

  const toggleInterest = (interest: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalFilters((prev) => {
      const currentInterests = prev.interests || [];
      const newInterests = currentInterests.includes(interest)
        ? currentInterests.filter((i) => i !== interest)
        : [...currentInterests, interest];
      return { ...prev, interests: newInterests.length > 0 ? newInterests : undefined };
    });
  };

  const updateAgeRange = (type: 'min' | 'max', value: string) => {
    const numValue = parseInt(value) || 18;
    setLocalFilters((prev) => ({
      ...prev,
      ageRange: {
        min: type === 'min' ? numValue : prev.ageRange?.min || 18,
        max: type === 'max' ? numValue : prev.ageRange?.max || 99,
      },
    }));
  };

  const toggleProfileFilter = (filterType: 'hasBio' | 'hasProfilePicture') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLocalFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType] ? undefined : true,
    }));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint={theme === 'light' ? 'light' : 'dark'} />
        ) : (
          <View style={[styles.androidBlur, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]} />
        )}
        
        <View 
          style={[
            styles.modalContent,
            { backgroundColor: theme === 'light' ? '#f8f9fa' : '#0a0a0a' }
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <Ionicons name="options" size={24} color="#37a4c8" />
              <Text style={[styles.modalTitle, { color: theme === 'light' ? '#0F172A' : '#e4fbfe' }]}>
                Filters
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme === 'light' ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Age Range Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#0F172A' : '#e4fbfe' }]}>
                Age Range
              </Text>
              <View style={styles.ageRangeContainer}>
                <View style={styles.ageInput}>
                  <Text style={[styles.ageLabel, { color: theme === 'light' ? '#64748B' : '#94A3B8' }]}>
                    Min
                  </Text>
                  <TextInput
                    style={[
                      styles.ageTextInput,
                      {
                        backgroundColor: theme === 'light' ? '#FFFFFF' : '#1a1a1a',
                        color: theme === 'light' ? '#0F172A' : '#e4fbfe',
                        borderColor: theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
                      }
                    ]}
                    keyboardType="number-pad"
                    value={localFilters.ageRange?.min?.toString() || '18'}
                    onChangeText={(val) => updateAgeRange('min', val)}
                    maxLength={2}
                  />
                </View>
                <Text style={[styles.ageSeparator, { color: theme === 'light' ? '#64748B' : '#94A3B8' }]}>
                  to
                </Text>
                <View style={styles.ageInput}>
                  <Text style={[styles.ageLabel, { color: theme === 'light' ? '#64748B' : '#94A3B8' }]}>
                    Max
                  </Text>
                  <TextInput
                    style={[
                      styles.ageTextInput,
                      {
                        backgroundColor: theme === 'light' ? '#FFFFFF' : '#1a1a1a',
                        color: theme === 'light' ? '#0F172A' : '#e4fbfe',
                        borderColor: theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
                      }
                    ]}
                    keyboardType="number-pad"
                    value={localFilters.ageRange?.max?.toString() || '99'}
                    onChangeText={(val) => updateAgeRange('max', val)}
                    maxLength={2}
                  />
                </View>
              </View>
            </View>

            {/* Profile Completeness Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#0F172A' : '#e4fbfe' }]}>
                Profile Completeness
              </Text>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => toggleProfileFilter('hasProfilePicture')}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    {
                      backgroundColor: localFilters.hasProfilePicture ? '#37a4c8' : theme === 'light' ? '#FFFFFF' : '#1a1a1a',
                      borderColor: theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
                    }
                  ]}>
                    {localFilters.hasProfilePicture && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: theme === 'light' ? '#0F172A' : '#e4fbfe' }]}>
                    Has Profile Picture
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => toggleProfileFilter('hasBio')}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    {
                      backgroundColor: localFilters.hasBio ? '#37a4c8' : theme === 'light' ? '#FFFFFF' : '#1a1a1a',
                      borderColor: theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
                    }
                  ]}>
                    {localFilters.hasBio && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: theme === 'light' ? '#0F172A' : '#e4fbfe' }]}>
                    Has Bio
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Interests Section */}
            {availableInterests.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme === 'light' ? '#0F172A' : '#e4fbfe' }]}>
                  Interests
                </Text>
                <View style={styles.tagsContainer}>
                  {availableInterests.map((interest) => {
                    const isSelected = localFilters.interests?.includes(interest);
                    return (
                      <TouchableOpacity
                        key={interest}
                        style={[
                          styles.tag,
                          {
                            backgroundColor: isSelected ? '#37a4c8' : theme === 'light' ? '#FFFFFF' : '#1a1a1a',
                            borderColor: isSelected ? '#37a4c8' : theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
                          }
                        ]}
                        onPress={() => toggleInterest(interest)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tagText, { color: isSelected ? '#FFFFFF' : theme === 'light' ? '#0F172A' : '#e4fbfe' }]}>
                          {interest}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.clearButton,
                {
                  backgroundColor: theme === 'light' ? '#FFFFFF' : '#1a1a1a',
                  borderColor: theme === 'light' ? 'rgba(55, 164, 200, 0.3)' : 'rgba(55, 164, 200, 0.4)',
                }
              ]}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Text style={[styles.clearButtonText, { color: '#37a4c8' }]}>
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  androidBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    maxHeight: height * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  ageRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ageInput: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  ageTextInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  ageSeparator: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 16,
    marginTop: 20,
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(55, 164, 200, 0.1)',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#37a4c8',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default FilterModal;

