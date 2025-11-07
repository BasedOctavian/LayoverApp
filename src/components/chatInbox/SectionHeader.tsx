import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SectionHeaderProps } from './types';

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  isCollapsed, 
  onToggle, 
  theme, 
  count 
}) => {
  const handleToggle = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle();
  };

  const displayTitle = count !== undefined ? `${title} (${count})` : title;
  const isLightTheme = theme === "light";

  return (
    <View style={styles.sectionTitleContainer}>
      <Text style={[
        styles.sectionTitle,
        { color: isLightTheme ? "#0F172A" : "#e4fbfe" }
      ]}>
        {displayTitle}
      </Text>
      <TouchableOpacity 
        style={styles.sectionToggle}
        onPress={handleToggle}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons 
          name={isCollapsed ? "add" : "remove"} 
          size={20} 
          color={isLightTheme ? "#0F172A" : "#e4fbfe"} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#37a4c8',
  },
  sectionToggle: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
});

export default SectionHeader;
