import React, { useContext, useRef, useCallback, useState, useEffect } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Platform, Animated } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../context/ThemeContext';
import useAuth from '../hooks/auth';
import useUsers from '../hooks/useUsers';
import { scaleWidth, scaleHeight } from '../utils/responsive';

// Define props interface
interface TopBarProps {
  onProfilePress?: () => void;
  showBackButton?: boolean;
  title?: string;
  showNotifications?: boolean;
  onNotificationPress?: () => void;
  notificationCount?: number;
  onBackPress?: () => void;
  showLogo?: boolean;
  centerLogo?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onProfilePress, 
  showBackButton = false,
  title,
  showNotifications = true,
  onNotificationPress,
  notificationCount = 0,
  onBackPress,
  showLogo = true,
  centerLogo = false
}): React.JSX.Element => {
  const insets = useSafeAreaInsets();
  const topBarHeight = scaleHeight(50) + insets.top;
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
  const centerLogoFadeAnim = useRef(new Animated.Value(1)).current;

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
    if (!showLogo) {
      // If logo is hidden, show TopBar immediately
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else if (isLogoLoaded) {
      // If logo is shown, wait for it to load
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [isLogoLoaded, showLogo]);

  // Initialize center logo fade animation when centerLogo is enabled
  useEffect(() => {
    if (centerLogo && showLogo) {
      centerLogoFadeAnim.setValue(1);
    }
  }, [centerLogo, showLogo]);

  // Track previous pathname to detect navigation transitions
  const prevPathname = useRef<string>(pathname);
  const shouldFadeInLeftLogo = useRef(false);
  
  useEffect(() => {
    // Check if we navigated from a center logo screen (chatExplore) to a left logo screen
    const wasOnCenterLogoScreen = prevPathname.current === '/chat/chatExplore';
    const isOnLeftLogoScreen = !centerLogo && showLogo;
    
    // If we just navigated from chatExplore to another screen, flag for fade-in
    if (wasOnCenterLogoScreen && pathname !== '/chat/chatExplore' && isOnLeftLogoScreen) {
      shouldFadeInLeftLogo.current = true;
    }
    
    prevPathname.current = pathname;
  }, [pathname, centerLogo, showLogo]);
  
  useEffect(() => {
    // Fade in left logo when flag is set and logo is loaded
    if (shouldFadeInLeftLogo.current && showLogo && !centerLogo && isLogoLoaded) {
      logoFadeAnim.setValue(0);
      Animated.timing(logoFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        shouldFadeInLeftLogo.current = false;
      });
    }
  }, [pathname, showLogo, centerLogo, isLogoLoaded]);

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
    
    // If center logo is shown, fade it out smoothly before navigation
    if (showLogo && centerLogo) {
      Animated.timing(centerLogoFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        router.back();
        setTimeout(() => {
          isNavigating.current = false;
          // Reset animation for next time
          centerLogoFadeAnim.setValue(1);
        }, 100);
      });
    } else {
      router.back();
      setTimeout(() => {
        isNavigating.current = false;
      }, 300);
    }
  }, [showLogo, centerLogo, centerLogoFadeAnim]);

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
            <Ionicons name="chevron-back" size={scaleWidth(28)} color={theme === "light" ? "#0F172A" : "#ffffff"} />
          </TouchableOpacity>
        )}
        {showLogo && !centerLogo && (
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
        )}
        {title && <Text style={[styles.title, { color: theme === "light" ? "#0F172A" : "#ffffff" }]}>{title}</Text>}
      </Animated.View>

      {showLogo && centerLogo && (
        <Animated.View style={[
          styles.centerSection, 
          { 
            opacity: centerLogoFadeAnim,
            top: insets.top,
            height: scaleHeight(50),
          }
        ]}>
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
                { 
                  opacity: centerLogoFadeAnim,
                  width: scaleWidth(95),
                  height: scaleWidth(95),
                }
              ]}
              resizeMode="contain"
              fadeDuration={0}
              onLoad={() => setIsLogoLoaded(true)}
            />
          </TouchableOpacity>
        </Animated.View>
      )}
      
      <Animated.View style={[styles.rightSection, { opacity: fadeAnim }]}>
        {showNotifications && (
          <TouchableOpacity 
            onPress={handleNotificationPress} 
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <View style={styles.notificationContainer}>
              <Ionicons name="notifications" size={scaleWidth(24)} color={theme === "light" ? "#0F172A" : "#ffffff"} />
              {notificationCount > 0 && (
                <View style={[styles.notificationBadge, { 
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
                  size={scaleWidth(20)} 
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

// Calculate responsive values
const responsivePadding = scaleWidth(16);
const responsiveGap = scaleWidth(12);
const responsiveLogoSize = scaleWidth(95);
const responsiveLogoWithBackSize = scaleWidth(65);
const responsiveProfileSize = scaleWidth(40);
const responsiveStatusIndicatorSize = scaleWidth(12);
const responsiveBackButtonPadding = scaleWidth(4);
const responsiveBackButtonMargin = scaleWidth(8);
const responsiveTitleMargin = scaleWidth(8);
const responsiveIconPadding = scaleWidth(4);
const responsiveNotificationBadgeSize = scaleWidth(20);
const responsiveNotificationBadgeRadius = scaleWidth(10);
const responsiveNotificationBadgeOffset = scaleWidth(4);
const responsiveNotificationTextSize = scaleWidth(12);
const responsiveNotificationTextPadding = scaleWidth(4);

// Type-safe styles
const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: responsivePadding,
    marginTop: 0,
    position: 'relative' as const,
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
    flex: 1,
  },
  centerSection: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    pointerEvents: 'box-none' as const,
  },
  logo: {
    width: responsiveLogoSize,
    height: responsiveLogoSize,
  },
  logoWithBack: {
    width: responsiveLogoWithBackSize,
    height: responsiveLogoWithBackSize,
  },
  logoCentered: {
    width: responsiveLogoWithBackSize,
    height: responsiveLogoWithBackSize,
  },
  backButton: {
    padding: responsiveBackButtonPadding,
    marginRight: responsiveBackButtonMargin,
  },
  title: {
    fontSize: scaleWidth(20),
    fontWeight: '600',
    marginLeft: responsiveTitleMargin,
  },
  rightSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: responsiveGap,
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  iconButton: {
    padding: responsiveIconPadding,
  },
  profileButton: {
    padding: responsiveIconPadding,
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
    width: responsiveProfileSize,
    height: responsiveProfileSize,
    borderRadius: responsiveProfileSize / 2,
    borderWidth: scaleWidth(2),
    borderColor: '#38a5c9',
  },
  profilePlaceholder: {
    width: responsiveProfileSize,
    height: responsiveProfileSize,
    borderRadius: responsiveProfileSize / 2,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scaleWidth(2),
    borderColor: '#38a5c9',
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: responsiveStatusIndicatorSize,
    height: responsiveStatusIndicatorSize,
    borderRadius: responsiveStatusIndicatorSize / 2,
    backgroundColor: "#37a4c8",
    borderWidth: scaleWidth(2),
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -responsiveNotificationBadgeOffset,
    right: -responsiveNotificationBadgeOffset,
    backgroundColor: '#FF3B30',
    borderRadius: responsiveNotificationBadgeRadius,
    minWidth: responsiveNotificationBadgeSize,
    height: responsiveNotificationBadgeSize,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  notificationText: {
    color: '#FFFFFF',
    fontSize: responsiveNotificationTextSize,
    fontWeight: '600',
    paddingHorizontal: responsiveNotificationTextPadding,
  },
});

export default TopBar;