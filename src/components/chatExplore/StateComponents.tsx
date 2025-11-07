import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../context/ThemeContext';
import { EmptyStateProps, ErrorStateProps } from './types';

/**
 * EmptyState Component
 * 
 * Displays when no users are found or list is empty.
 * Features:
 * - Theme-aware styling
 * - Customizable icon and text
 * - Clean, centered layout
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  iconColor
}) => {
  const { theme } = useContext(ThemeContext);
  const defaultIconColor = iconColor || (theme === "light" ? "#64748B" : "#94A3B8");

  return (
    <View style={styles.stateContainer}>
      <Ionicons 
        name={icon as any} 
        size={48} 
        color={defaultIconColor} 
        style={styles.stateIcon} 
      />
      <Text style={[styles.emptyText, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.emptySubtext, { color: theme === "light" ? "#94A3B8" : "#64748B" }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
};

/**
 * ErrorState Component
 * 
 * Displays error messages with optional retry functionality.
 * Features:
 * - Error icon with red color
 * - Retry button (optional)
 * - Theme-aware text styling
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry
}) => {
  const { theme } = useContext(ThemeContext);

  return (
    <View style={styles.stateContainer}>
      <Ionicons 
        name="alert-circle" 
        size={48} 
        color="#FF3B30" 
        style={styles.stateIcon} 
      />
      <Text style={[styles.errorText, { color: "#FF3B30" }]}>
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity 
          style={[styles.retryButton, { borderColor: "#FF3B30" }]}
          onPress={onRetry}
        >
          <Text style={[styles.retryButtonText, { color: "#FF3B30" }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  stateIcon: {
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: '400',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default { EmptyState, ErrorState };

