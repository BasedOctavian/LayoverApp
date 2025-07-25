import React, { useContext, useRef, useCallback, useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Platform, Animated } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import useAuth from '../hooks/auth';
import useUsers from '../hooks/useUsers';

// Define props interface
interface TopBarProps {
  onProfilePress?: () => void;
  showBackButton?: boolean;
  title?: string;
  showNotifications?: boolean;
  onNotificationPress?: () => void;
  notificationCount?: number;
  onBackPress?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onProfilePress, 
  showBackButton = false,
  title,
  showNotifications = true,
  onNotificationPress,
  notificationCount = 0,
  onBackPress
}): React.JSX.Element => {
  const insets = useSafeAreaInsets();
  const topBarHeight = 50 + insets.top;
  const { theme } = useContext(ThemeContext);
  const { user } = useAuth();
  const { getUser } = useUsers();
  const pathname = usePathname();
  const isNavigating = useRef(false);
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoFadeAnim = useRef(new Animated.Value(1)).current;

  // Check if we're on a profile page
  const isOnProfilePage = pathname.startsWith('/profile/');

  // Fetch user data when user changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        setIsLoadingUserData(true);
        try {
          const data = await getUser(user.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data for TopBar:', error);
        } finally {
          setIsLoadingUserData(false);
        }
      } else {
        setUserData(null);
      }
    };

    fetchUserData();
  }, [user?.uid, getUser]);

  useEffect(() => {
    if (isLogoLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isLogoLoaded]);

  // Fade out and fade in when theme changes
  useEffect(() => {
    // Fade out
    Animated.timing(logoFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Fade in
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [theme]);

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

  const handleProfilePress = useCallback(() => {
    if (isNavigating.current || !user?.uid) return;
    
    isNavigating.current = true;
    router.push(`/profile/${user.uid}`);
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [user?.uid]);

  return (
    <LinearGradient
      colors={theme === "light" ? ['#F8FAFC', '#FFFFFF'] : ['#000000', '#000000']}
      style={[styles.topBar, { 
        paddingTop: insets.top, 
        height: topBarHeight,
        backgroundColor: theme === "light" ? '#F8FAFC' : '#000000',
        borderBottomColor: theme === "light" ? '#E2E8F0' : 'rgba(55, 164, 200, 0.3)'
      }]}
    >
      <Animated.View style={[styles.leftSection, { opacity: fadeAnim }]}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={onBackPress || handleBackPress} 
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={theme === "light" ? "#0F172A" : "#ffffff"} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={handleLogoPress}
          activeOpacity={0.7}
        >
          <Animated.Image
            source={theme === "light" 
              ? require('../../assets/images/splash-icon.png')
              : require('../../assets/images/splash-icon-dark.png')
            }
            style={[
              styles.logo, 
              showBackButton && styles.logoWithBack,
              { opacity: logoFadeAnim }
            ]}
            resizeMode="contain"
            fadeDuration={0}
            onLoad={() => setIsLogoLoaded(true)}
          />
        </TouchableOpacity>
        {title && <Text style={[styles.title, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{title}</Text>}
      </Animated.View>
      
      <Animated.View style={[styles.rightSection, { opacity: fadeAnim }]}>
        {showNotifications && (
          <TouchableOpacity 
            onPress={handleNotificationPress} 
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <View style={styles.notificationContainer}>
              <Ionicons name="notifications" size={24} color={theme === "light" ? "#0F172A" : "#ffffff"} />
              {notificationCount > 0 && (
                <View style={[styles.notificationBadge, { 
                  borderColor: theme === "light" ? "#FFFFFF" : "#000000",
                  backgroundColor: "#37a4c8"
                }]}>
                  <Text style={[styles.notificationText, { 
                    color: "#FFFFFF" 
                  }]}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={handleProfilePress} 
          style={styles.profileButton}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {userData?.profilePicture ? (
              <Image
                source={{ uri: userData.profilePicture }}
                style={[
                  styles.profileImage,
                  { 
                    borderColor: isOnProfilePage ? "#37a4c8" : (theme === "light" ? "#E2E8F0" : "#38a5c9")
                  }
                ]}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.profilePlaceholder, { 
                backgroundColor: theme === "light" ? "#F8FAFC" : "#1a1a1a",
                borderColor: isOnProfilePage ? "#37a4c8" : (theme === "light" ? "#E2E8F0" : "#38a5c9")
              }]}>
                <Ionicons 
                  name="person" 
                  size={20} 
                  color={isOnProfilePage ? "#37a4c8" : (theme === "light" ? "#0F172A" : "#ffffff")} 
                />
              </View>
            )}
            <View style={[styles.statusIndicator, { 
              borderColor: theme === "light" ? "#FFFFFF" : "#000000",
              backgroundColor: "#37a4c8"
            }]} />
          </View>
        </TouchableOpacity>
      </Animated.View>
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
    marginTop: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  logo: {
    width: 95,
    height: 95,
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
    backgroundColor: "#37a4c8",
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
  },
});

export default TopBar;