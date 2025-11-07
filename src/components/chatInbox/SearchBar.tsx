import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBarProps } from './types';

const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, theme }) => {
  const isLightTheme = theme === "light";
  
  return (
    <View style={styles.searchContainer}>
      <Ionicons 
        name="search" 
        size={20} 
        color={isLightTheme ? "#64748B" : "#94A3B8"} 
        style={styles.searchIcon} 
      />
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: isLightTheme ? "#FFFFFF" : "#1a1a1a",
            color: isLightTheme ? "#0F172A" : "#e4fbfe",
            borderColor: isLightTheme ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)"
          }
        ]}
        placeholder="Search chats..."
        placeholderTextColor={isLightTheme ? "#666666" : "#a0a0a0"}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  searchInput: {
    borderRadius: 16,
    paddingHorizontal: 48,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
});

export default SearchBar;
