import React, { useRef, useContext, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onSearchClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onSearchClear,
}) => {
  const { theme } = useContext(ThemeContext);
  const searchInputRef = useRef<TextInput>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const clearButtonScale = useRef(new Animated.Value(0)).current;

  // Animate on focus/blur
  const handleFocus = () => {
    onSearchFocus();
    Animated.spring(focusAnim, {
      toValue: 1,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    onSearchBlur();
    Animated.spring(focusAnim, {
      toValue: 0,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  // Animate clear button in/out
  useEffect(() => {
    Animated.spring(clearButtonScale, {
      toValue: searchQuery ? 1 : 0,
      friction: 6,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [searchQuery, clearButtonScale]);

  const handleClear = () => {
    onSearchClear();
    searchInputRef.current?.blur();
  };

  const handleSubmitEditing = () => {
    // Dismiss keyboard when user presses return/search
    Keyboard.dismiss();
  };

  const borderColorInterpolation = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      theme === "light" ? "#E2E8F0" : "#374151",
      theme === "light" ? "#37a4c8" : "#38a5c9"
    ],
  });

  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchIcon}>
        <Ionicons name="search" size={20} color={theme === "light" ? "#64748B" : "#94A3B8"} />
      </View>
      <Animated.View
        style={[
          styles.searchInputWrapper,
          {
            borderColor: borderColorInterpolation,
            transform: [
              {
                scale: focusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.01],
                })
              }
            ]
          }
        ]}
      >
        <TextInput
          ref={searchInputRef}
          style={[styles.searchInput, {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            color: theme === "light" ? "#0F172A" : "#e4fbfe"
          }]}
          placeholder="Search activities, people, or places..."
          placeholderTextColor={theme === "light" ? "#666666" : "#a0a0a0"}
          value={searchQuery}
          onChangeText={onSearchChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="search"
          blurOnSubmit={true}
          enablesReturnKeyAutomatically={true}
          autoCorrect={true}
          autoCapitalize="none"
          spellCheck={true}
          textContentType="none"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.searchClearButton,
          {
            transform: [
              { scale: clearButtonScale },
              { 
                rotate: clearButtonScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['90deg', '0deg'],
                })
              }
            ],
            opacity: clearButtonScale,
          }
        ]}
      >
        <TouchableOpacity 
          onPress={handleClear}
          activeOpacity={0.7}
          disabled={!searchQuery}
        >
          <Ionicons name="close-circle" size={22} color={theme === "light" ? "#64748B" : "#94A3B8"} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 2,
  },
  searchInputWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    elevation: 2,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchInput: {
    paddingHorizontal: 48,
    paddingVertical: 12,
    fontSize: 16,
    borderRadius: 12,
  },
  searchClearButton: {
    position: 'absolute',
    right: 14,
    top: 13,
    zIndex: 2,
  },
});
