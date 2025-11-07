import React, { useContext, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';

export interface FeatureButton {
  icon: React.ReactNode;
  title: string;
  screen: string;
  description: string;
}

interface FeatureGridProps {
  features: FeatureButton[];
}

/**
 * Feature Grid Component
 * Displays a grid of features with icons and descriptions
 * Memoized for performance optimization
 */
const FeatureGrid = memo(({ features }: FeatureGridProps) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();

  const handleFeaturePress = useCallback((screen: string) => {
    router.push(screen);
  }, [router]);

  return (
    <View style={styles.featureSection}>
      <View style={styles.featureGridContainer}>
        {features.map((feature, index) => (
          <TouchableOpacity
            key={`feature-${index}-${feature.title}`}
            style={[styles.featureGridItem, { 
              backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
              borderColor: theme === "light" ? "rgba(55, 164, 200, 0.2)" : "#38a5c9"
            }]}
            activeOpacity={0.7}
            onPress={() => handleFeaturePress(feature.screen)}
            accessible={true}
            accessibilityLabel={`${feature.title}. ${feature.description}`}
            accessibilityRole="button"
            accessibilityHint={`Navigate to ${feature.title} screen`}
          >
            <View style={[styles.featureIconContainer, {
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)"
            }]}>
              {feature.icon}
            </View>
            <Text style={[styles.featureGridTitle, { 
              color: theme === "light" ? "#000000" : "#e4fbfe" 
            }]}>
              {feature.title}
            </Text>
            <Text style={[styles.featureGridDescription, { 
              color: theme === "light" ? "#64748B" : "#64748B" 
            }]} numberOfLines={2}>
              {feature.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.footer, { 
        position: 'relative',
        marginBottom: 100
      }]}>
        <Image
          source={theme === "light" 
            ? require('../../../assets/images/splash-icon.png')
            : require('../../../assets/images/splash-icon-dark.png')
          }
          style={styles.footerLogo}
          resizeMode="contain"
          accessible={true}
          accessibilityLabel="Wingman logo"
        />
        <Text 
          style={[styles.copyrightText, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}
          accessible={true}
          accessibilityLabel="Copyright 2025 Wingman. All rights reserved"
        >
          © 2025 Wingman. All rights reserved.
        </Text>
      </View>
    </View>
  );
});

FeatureGrid.displayName = 'FeatureGrid';

export default FeatureGrid;

const styles = StyleSheet.create({
  featureSection: {
    marginBottom: 16,
  },
  featureGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 0,
    gap: 16,
    marginBottom: 40,
  },
  featureGridItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  featureGridTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  featureGridDescription: {
    fontSize: 14,
    letterSpacing: 0.2,
    lineHeight: 20,
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16, // Reduced from 40 to 16
    marginBottom: 20,
  },
  footerLogo: {
    width: 95,
    height: 95,
    marginBottom: 12,
  },
  copyrightText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
