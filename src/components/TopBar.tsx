import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Define props interface
interface TopBarProps {
  onProfilePress: () => void; // Function type for the press handler
}

const TopBar: React.FC<TopBarProps> = ({ onProfilePress }) => {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;

  const handleLogoPress = () => {
    // Navigate to the home screen when the logo is pressed
    console.log("Logo pressed");
    router.replace("/home/dashboard"); // Adjust the route name as needed
  };

  return (
    <View style={[styles.topBar, { paddingTop: insets.top, height: topBarHeight }]}>
      <TouchableOpacity onPress={handleLogoPress}>
        <Image
          source={require('../../assets/adaptive-icon-black-removebg-preview.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onProfilePress}>
        <Ionicons name="person-circle" size={32} color="#1F5B6F" />
      </TouchableOpacity>
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
    backgroundColor: '#E6F0FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  logo: {
    width: 85,
    height: 85,
  },
});

export default TopBar;