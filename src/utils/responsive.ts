import { Dimensions, PixelRatio, Platform } from 'react-native';
import { useState, useEffect } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 15 - design reference)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

/**
 * Scale size based on screen width
 * Use for: horizontal margins, padding, widths, icon sizes
 */
export const scaleWidth = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Scale size based on screen height
 * Use for: vertical spacing, heights
 */
export const scaleHeight = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Scale font size with moderation
 * Use for: all text sizes
 * Note: Applies a moderate scaling to prevent text from becoming too large/small
 */
export const scaleFontSize = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
  const newSize = size * scale;
  
  // Moderate the scaling - don't scale as aggressively
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(newSize);
};

/**
 * Moderate scaling for general measurements
 * Ensures elements don't shrink/grow too drastically
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  return size + (scaleWidth(size) - size) * factor;
};

/**
 * Check if device is a small screen (iPhone SE, mini models)
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH < 375 || SCREEN_HEIGHT < 667;
};

/**
 * Check if device is a large screen (iPhone Plus/Pro Max models)
 */
export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 428;
};

/**
 * Get safe padding values based on screen size
 */
export const getSafePadding = () => ({
  horizontal: isSmallDevice() ? 12 : isLargeDevice() ? 20 : 16,
  vertical: isSmallDevice() ? 16 : isLargeDevice() ? 24 : 20,
});

/**
 * Hook to handle dimension changes
 * Use this when you need to respond to orientation changes
 */
export const useDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return {
    width: dimensions.width,
    height: dimensions.height,
    isSmall: isSmallDevice(),
    isLarge: isLargeDevice(),
  };
};

// Common spacing values
export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(20),
  xxl: moderateScale(24),
};

// Common border radius values
export const borderRadius = {
  sm: moderateScale(4),
  md: moderateScale(8),
  lg: moderateScale(12),
  xl: moderateScale(16),
  xxl: moderateScale(24),
  round: moderateScale(999),
};

// Common font sizes
export const fontSize = {
  xs: scaleFontSize(12),
  sm: scaleFontSize(14),
  md: scaleFontSize(16),
  lg: scaleFontSize(18),
  xl: scaleFontSize(20),
  xxl: scaleFontSize(24),
  xxxl: scaleFontSize(32),
};
