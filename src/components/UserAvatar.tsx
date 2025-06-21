import React from 'react';
import { View, Text, Image, StyleSheet, ImageStyle, ViewStyle, TextStyle } from 'react-native';

interface UserAvatarProps {
  user: {
    name: string;
    profilePicture?: string | null;
  };
  size?: number;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  textStyle?: TextStyle;
}

// Array of colors for avatar backgrounds
const avatarColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Gold
  '#BB8FCE', // Purple
  '#85C1E9', // Sky Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
  '#F1948A', // Salmon
  '#85C1E9', // Light Blue
  '#FAD7A0', // Peach
];

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 50, 
  style, 
  imageStyle, 
  textStyle 
}) => {
  // Generate a consistent color based on the user's name
  const getAvatarColor = (name: string): string => {
    if (!name) return avatarColors[0];
    
    // Simple hash function to get consistent color for same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    const index = Math.abs(hash) % avatarColors.length;
    return avatarColors[index];
  };

  // Get the first letter of the name
  const getInitial = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    return name.trim().charAt(0).toUpperCase();
  };

  const avatarColor = getAvatarColor(user.name);
  const initial = getInitial(user.name);

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...style,
  };

  const defaultTextStyle: TextStyle = {
    fontSize: size * 0.4,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    ...textStyle,
  };

  const defaultImageStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...imageStyle,
  };

  // If user has a profile picture, show it
  if (user.profilePicture && user.profilePicture !== 'https://via.placeholder.com/150') {
    return (
      <Image
        source={{ uri: user.profilePicture }}
        style={defaultImageStyle}
        defaultSource={require('../../assets/adaptive-icon.png')}
      />
    );
  }

  // Otherwise, show the avatar with initial
  return (
    <View style={[containerStyle, { backgroundColor: avatarColor }]}>
      <Text style={defaultTextStyle}>
        {initial}
      </Text>
    </View>
  );
};

export default UserAvatar; 