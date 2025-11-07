import React from 'react';

// Simplified loading components - no complex animations
// These are kept minimal for potential future use

interface SimpleLoadingProps {
  color?: string;
}

export const SimpleLoading: React.FC<SimpleLoadingProps> = ({ color = "#37a4c8" }) => {
  return null; // No loading indicator needed - instant loading
};

// Export empty components to maintain compatibility
export const ModernLoadingIndicator = SimpleLoading;
export const PendingConnectionSkeleton = () => null;
