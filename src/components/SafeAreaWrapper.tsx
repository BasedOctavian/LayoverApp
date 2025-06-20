import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  style?: any;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  excludeTop?: boolean;
  excludeBottom?: boolean;
}

/**
 * SafeAreaWrapper - A consistent wrapper for handling safe areas across the app
 * 
 * This component provides:
 * - Consistent safe area handling for all screens
 * - Theme-aware background colors
 * - Configurable edge exclusions
 * - Proper flex layout
 * 
 * Usage:
 * <SafeAreaWrapper>
 *   <YourScreenContent />
 * </SafeAreaWrapper>
 * 
 * Or with custom edges:
 * <SafeAreaWrapper edges={['bottom']} excludeTop>
 *   <YourScreenContent />
 * </SafeAreaWrapper>
 */
const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  style,
  edges = ['top', 'bottom', 'left', 'right'],
  backgroundColor,
  excludeTop = false,
  excludeBottom = false,
}) => {
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();

  // Determine background color based on theme if not provided
  const bgColor = backgroundColor || (theme === "light" ? "#ffffff" : "#000000");

  // Filter edges based on exclusions
  const filteredEdges = edges.filter(edge => {
    if (excludeTop && edge === 'top') return false;
    if (excludeBottom && edge === 'bottom') return false;
    return true;
  });

  // If we're excluding top or bottom, we need to handle padding manually
  if (excludeTop || excludeBottom) {
    const paddingTop = excludeTop ? 0 : insets.top;
    const paddingBottom = excludeBottom ? 0 : insets.bottom;
    const paddingLeft = insets.left;
    const paddingRight = insets.right;

    return (
      <View 
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            paddingTop,
            paddingBottom,
            paddingLeft,
            paddingRight,
          },
          style
        ]}
      >
        {children}
      </View>
    );
  }

  // Use SafeAreaView for full edge protection
  return (
    <SafeAreaView 
      style={[
        styles.container,
        { backgroundColor: bgColor },
        style
      ]} 
      edges={filteredEdges}
    >
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SafeAreaWrapper; 