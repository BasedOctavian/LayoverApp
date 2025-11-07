import React, { useRef, useContext } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Animated, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeContext } from '../../context/ThemeContext';
import { PING_CATEGORIES } from '../../constants/pingCategories';

interface CategoryBarProps {
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  selectedCategory,
  onCategorySelect,
}) => {
  const { theme } = useContext(ThemeContext);
  const categoryBarAnim = useRef(new Animated.Value(1)).current;

  const handleCategorySelect = (categoryId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    onCategorySelect(categoryId);
    
    // Animate category bar
    Animated.sequence([
      Animated.timing(categoryBarAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(categoryBarAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  return (
    <Animated.View 
      style={[
        styles.categoryBarContainer,
        { transform: [{ scale: categoryBarAnim }] }
      ]}
    >
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.categoryBar}
      >
        {PING_CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
              {
                backgroundColor: selectedCategory === category.id 
                  ? "#37a4c8" 
                  : theme === "light" ? "#FFFFFF" : "#1a1a1a",
                borderColor: selectedCategory === category.id 
                  ? "#37a4c8" 
                  : theme === "light" ? "#E2E8F0" : "#374151"
              }
            ]}
            onPress={() => handleCategorySelect(category.id)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={category.icon as any} 
              size={16} 
              color={selectedCategory === category.id ? "#FFFFFF" : "#37a4c8"} 
            />
            <Text style={[
              styles.categoryChipText,
              selectedCategory === category.id && styles.categoryChipTextActive,
              { color: selectedCategory === category.id ? "#FFFFFF" : "#37a4c8" }
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  categoryBarContainer: {
    marginBottom: 16,
  },
  categoryBar: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  categoryChipActive: {
    backgroundColor: "#37a4c8",
    borderColor: "#37a4c8",
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.1,
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
});
