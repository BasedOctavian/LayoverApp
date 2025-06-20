import React, { useState } from 'react';
import { View, Image, ActivityIndicator, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { useContext } from 'react';

interface LoadingImageProps {
  source: { uri: string };
  style: ImageStyle;
  containerStyle?: ViewStyle;
}

export default function LoadingImage({ source, style, containerStyle }: LoadingImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useContext(ThemeContext);

  return (
    <View style={[styles.container, containerStyle]}>
      {isLoading && (
        <View style={[styles.loadingContainer, style]}>
          <ActivityIndicator 
            size="large" 
            color={theme === "light" ? "#37a4c8" : "#38a5c9"} 
          />
        </View>
      )}
      <Image
        source={source}
        style={[style, isLoading ? styles.hidden : styles.visible]}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
  },
}); 