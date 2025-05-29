import React, { useContext, useRef, useCallback } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Platform } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import useAuth from '../hooks/auth';

// Define props interface
interface TopBarProps {
  onProfilePress?: () => void;
  showBackButton?: boolean;
  title?: string;
  showNotifications?: boolean;
  onNotificationPress?: () => void;
  notificationCount?: number;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onProfilePress, 
  showBackButton = false,
  title,
  showNotifications = true,
  onNotificationPress,
  notificationCount = 0
}) => {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const isNavigating = useRef(false);

  const handleNavigation = useCallback((route: string) => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.push(route);
    
    // Reset navigation lock after animation completes
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, []);

  const handleLogoPress = useCallback(() => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.replace("/home/dashboard");
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, []);

  const handleBackPress = useCallback(() => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.back();
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, []);

  const handleNotificationPress = useCallback(() => {
    if (isNavigating.current) return;
    
    isNavigating.current = true;
    router.push("/notifications/notifications");
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, []);

  return (
    <LinearGradient
      colors={theme === "light" ? ['#e6e6e6', '#e6e6e6'] : ['#000000', '#000000']}
      style={[styles.topBar, { 
        paddingTop: insets.top, 
        height: topBarHeight,
        backgroundColor: theme === "light" ? '#e6e6e6' : '#000000'
      }]}
    >
      <View style={styles.leftSection}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={handleBackPress} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={theme === "light" ? "#000000" : "#ffffff"} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={handleLogoPress}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../assets/adaptive-icon.png')}
            style={[
              styles.logo, 
              showBackButton && styles.logoWithBack,
              { tintColor: theme === "light" ? "#000000" : "#ffffff" }
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>
        {title && <Text style={[styles.title, { color: theme === "light" ? "#000000" : "#ffffff" }]}>{title}</Text>}
      </View>
      
      <View style={styles.rightSection}>
        {showNotifications && (
          <TouchableOpacity 
            onPress={handleNotificationPress} 
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <View style={styles.notificationContainer}>
              <Ionicons name="notifications" size={24} color={theme === "light" ? "#000000" : "#ffffff"} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        
        {onProfilePress && (
          <TouchableOpacity 
            onPress={onProfilePress} 
            style={styles.profileButton}
            activeOpacity={0.7}
          >
            <View style={styles.avatarContainer}>
              {user?.profilePicture ? (
                <Image
                  source={{ uri: user.profilePicture }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Ionicons name="person" size={20} color={theme === "light" ? "#000000" : "#ffffff"} />
                </View>
              )}
              <View style={[styles.statusIndicator, { borderColor: theme === "light" ? "#e6e6e6" : "#000000" }]} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

// Type-safe styles
const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(55, 164, 200, 0.3)',
    marginTop: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#37a4c8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  logo: {
    width: 85,
    height: 85,
  },
  logoWithBack: {
    width: 65,
    height: 65,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  rightSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  profileButton: {
    padding: 4,
  },
  avatarContainer: {
    position: 'relative',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#38a5c9',
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38a5c9',
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 4,
  }
});

export default TopBar;