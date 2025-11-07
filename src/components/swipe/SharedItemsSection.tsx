import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

// Responsive scaling utilities
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 393; // iPhone 15 width as base reference
const BASE_HEIGHT = 852; // iPhone 15 height as base reference

const scaleWidth = (size: number): number => (SCREEN_WIDTH / BASE_WIDTH) * size;
const scaleHeight = (size: number): number => (SCREEN_HEIGHT / BASE_HEIGHT) * size;
const scaleFont = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.max(newSize, size * 0.85);
};
const scale = (size: number): number => {
  const widthScale = SCREEN_WIDTH / BASE_WIDTH;
  const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;
  return size * ((widthScale + heightScale) / 2);
};

interface SharedItemsSectionProps {
  sharedConnectionIntents: string[];
  sharedPersonalTags: string[];
  sharedEventPreferences: string[];
  theme: string;
}

const SharedItemsSection: React.FC<SharedItemsSectionProps> = ({
  sharedConnectionIntents,
  sharedPersonalTags,
  sharedEventPreferences,
  theme
}) => {
  const totalSharedItems = sharedConnectionIntents.length + sharedPersonalTags.length + sharedEventPreferences.length;
  
  if (totalSharedItems === 0) return null;

  const renderSharedItems = () => {
    const items: React.ReactNode[] = [];
    
    // Connection Intents
    sharedConnectionIntents.slice(0, 3).forEach((intent, index) => {
      items.push(
        <View key={`intent-${index}`} style={[styles.sharedItemTag, { 
          backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)",
          borderColor: "#4CAF50"
        }]}>
          <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
            {intent}
          </Text>
        </View>
      );
    });
    
    // Personal Tags
    sharedPersonalTags.slice(0, 3).forEach((tag, index) => {
      items.push(
        <View key={`tag-${index}`} style={[styles.sharedItemTag, { 
          backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)",
          borderColor: "#4CAF50"
        }]}>
          <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
            {tag}
          </Text>
        </View>
      );
    });
    
    // Event Preferences
    sharedEventPreferences.slice(0, 2).forEach((pref, index) => {
      items.push(
        <View key={`pref-${index}`} style={[styles.sharedItemTag, { 
          backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.15)" : "rgba(76, 175, 80, 0.25)",
          borderColor: "#4CAF50"
        }]}>
          <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
            {pref}
          </Text>
        </View>
      );
    });
    
    // Show more indicator if there are more items
    if (totalSharedItems > 8) {
      items.push(
        <View key="more" style={[styles.sharedItemTag, { 
          backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.1)" : "rgba(76, 175, 80, 0.2)",
          borderColor: "#4CAF50"
        }]}>
          <Text style={[styles.sharedItemText, { color: "#4CAF50" }]}>
            +{totalSharedItems - 8} more
          </Text>
        </View>
      );
    }
    
    return items;
  };

  return (
    <View style={[styles.sharedItemsSection, { 
      backgroundColor: theme === "light" ? "rgba(76, 175, 80, 0.06)" : "rgba(76, 175, 80, 0.12)",
      borderColor: theme === "light" ? "rgba(76, 175, 80, 0.25)" : "rgba(76, 175, 80, 0.35)"
    }]}>
      <View style={styles.sharedItemsHeader}>
        <MaterialIcons name="check-circle" size={scale(18)} color="#4CAF50" />
        <Text style={[styles.sharedItemsTitle, { color: "#4CAF50" }]}>
          {totalSharedItems} shared interest{totalSharedItems !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <View style={styles.sharedItemsContainer}>
        {renderSharedItems()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sharedItemsSection: {
    padding: scale(18),
    borderRadius: scale(16),
    borderWidth: scale(1.5),
    marginBottom: scaleHeight(18),
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(4),
    elevation: 1,
  },
  sharedItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleHeight(14),
    gap: scaleWidth(8),
  },
  sharedItemsTitle: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    letterSpacing: scale(0.3),
  },
  sharedItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaleWidth(10),
  },
  sharedItemTag: {
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(12),
    borderRadius: scale(14),
    borderWidth: scale(1.5),
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: scale(1) },
    shadowOpacity: 0.05,
    shadowRadius: scale(2),
    elevation: 1,
  },
  sharedItemText: {
    fontSize: scaleFont(13),
    fontWeight: '700',
    letterSpacing: scale(0.3),
  },
});

export default SharedItemsSection;
