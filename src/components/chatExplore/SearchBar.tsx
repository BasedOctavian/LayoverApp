import React, { useContext } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { SearchBarProps } from './types';
import { scaleWidth, scaleHeight, moderateScale, scaleFontSize } from '../../utils/responsive';

/**
 * SearchBar Component
 * 
 * A reusable search input component with icon and theme support.
 * Features:
 * - Theme-aware styling (light/dark mode)
 * - Search icon integration
 * - Customizable placeholder text
 * - Smooth animations and shadows
 */
const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  placeholder = "Search by name..."
}) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={styles.searchContainer}>
      <Ionicons 
        name="search" 
        size={moderateScale(20)} 
        color={theme === "light" ? "#64748B" : "#94A3B8"} 
        style={styles.searchIcon} 
      />
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            color: theme === "light" ? "#0F172A" : "#e4fbfe",
            borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
          }
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
        value={searchQuery}
        onChangeText={onSearchChange}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'relative',
    marginBottom: scaleHeight(20),
  },
  searchIcon: {
    position: 'absolute',
    left: scaleWidth(16),
    top: scaleHeight(18),
    zIndex: 1,
  },
  searchInput: {
    borderRadius: moderateScale(16),
    paddingHorizontal: scaleWidth(48),
    paddingVertical: scaleHeight(16),
    fontSize: scaleFontSize(16),
    borderWidth: moderateScale(1),
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: scaleHeight(4) },
    shadowOpacity: 0.15,
    shadowRadius: moderateScale(12),
  },
});

export default SearchBar;

