import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Define props interface
interface TopBarProps {
  onProfilePress?: () => void;
  showBackButton?: boolean;
  title?: string;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onProfilePress, 
  showBackButton = false,
  title
}) => {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  const handleLogoPress = () => {
    // Navigate to the home screen when the logo is pressed
    console.log("Logo pressed");
    router.replace("/home/dashboard"); // Adjust the route name as needed
  };

  const handleBackPress = () => {
    router.back();
  };

  return (
    <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
      <View style={styles.leftSection}>
        {showBackButton ? (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color="#e4fbfe" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleLogoPress}>
            <Image
              source={require('../../assets/adaptive-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        {title && <Text style={styles.title}>{title}</Text>}
      </View>
      
      {onProfilePress && (
        <TouchableOpacity onPress={onProfilePress} style={styles.profileButton}>
          <Ionicons name="person-circle" size={32} color="#e4fbfe" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Type-safe styles
const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#38a5c9',
  },
  leftSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  logo: {
    width: 85,
    height: 85,
    tintColor: '#e4fbfe', // This will tint the logo to match the theme
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e4fbfe',
    marginLeft: 8,
  },
  profileButton: {
    padding: 4,
  }
});

export default TopBar;