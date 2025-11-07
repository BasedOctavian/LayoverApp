import React, { useContext } from 'react';
import { View, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';

interface FilterBarProps {
  showAvailableOnly: boolean;
  filterDistance: number;
  onToggleAvailableOnly: () => void;
  onDistanceChange: (distance: number) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  showAvailableOnly,
  filterDistance,
  onToggleAvailableOnly,
  onDistanceChange,
}) => {
  const { theme } = useContext(ThemeContext);

  const handleDistanceFilter = () => {
    Alert.alert(
      "Filter by Distance",
      "Select maximum distance",
      [
        { text: "Cancel", style: "cancel" },
        { text: "10 mi", onPress: () => onDistanceChange(10) },
        { text: "25 mi", onPress: () => onDistanceChange(25) },
        { text: "50 mi", onPress: () => onDistanceChange(50) },
        { text: "100 mi", onPress: () => onDistanceChange(100) },
      ]
    );
  };

  return (
    <View style={styles.filtersContainer}>
      <TouchableOpacity
        style={[
          styles.filterChip,
          showAvailableOnly && styles.filterChipActive,
          {
            backgroundColor: showAvailableOnly 
              ? "#37a4c8" 
              : theme === "light" ? "#F1F5F9" : "#374151",
            borderColor: showAvailableOnly 
              ? "#37a4c8" 
              : theme === "light" ? "#E2E8F0" : "#374151"
          }
        ]}
        onPress={onToggleAvailableOnly}
        activeOpacity={0.7}
      >
        <Ionicons 
          name="time-outline" 
          size={16} 
          color={showAvailableOnly ? "#FFFFFF" : "#37a4c8"} 
        />
        <Text style={[
          styles.filterChipText,
          showAvailableOnly && styles.filterChipTextActive,
          { color: showAvailableOnly ? "#FFFFFF" : "#37a4c8" }
        ]}>
          Available Now
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: theme === "light" ? "#F1F5F9" : "#374151",
            borderColor: theme === "light" ? "#E2E8F0" : "#374151"
          }
        ]}
        onPress={handleDistanceFilter}
        activeOpacity={0.7}
      >
        <Ionicons name="location-outline" size={16} color="#37a4c8" />
        <Text style={[styles.filterChipText, { color: "#37a4c8" }]}>
          {filterDistance} mi
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  filterChipActive: {
    backgroundColor: '#37a4c8',
    borderColor: '#37a4c8',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.1,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
});
