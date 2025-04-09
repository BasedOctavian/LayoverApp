import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        <Text style={styles.logo}>Wingman</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onProfilePress}>
        <Ionicons name="person-circle" size={32} color="#2F80ED" />
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
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#2F80ED',
  },
});

export default TopBar;