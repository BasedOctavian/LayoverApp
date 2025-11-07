/**
 * Error Boundary Component
 * Catches and handles React errors gracefully
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Wraps components to catch and display errors gracefully
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
interface DefaultErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: DefaultErrorFallbackProps) {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <MaterialIcons name="error-outline" size={64} color="#ef4444" />
        
        <Text style={styles.errorTitle}>Something went wrong</Text>
        
        <Text style={styles.errorMessage}>
          We encountered an unexpected error. Please try again.
        </Text>
        
        {__DEV__ && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorDetailsTitle}>Error Details (Dev Only):</Text>
            <Text style={styles.errorDetailsText}>{error.message}</Text>
            {error.stack && (
              <Text style={styles.errorStackText} numberOfLines={5}>
                {error.stack}
              </Text>
            )}
          </View>
        )}
        
        <TouchableOpacity
          style={styles.retryButton}
          onPress={resetError}
          activeOpacity={0.8}
        >
          <MaterialIcons name="refresh" size={20} color="#ffffff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 32,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e4fbfe',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333333',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  errorStackText: {
    fontSize: 10,
    color: '#64748b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38a5c9',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});


