import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import UserAvatar from "../UserAvatar";
import * as Haptics from 'expo-haptics';

interface ProfileHeaderProps {
  userData: any;
  authUser: any;
  id: string;
  isOwnProfile: boolean;
  connections: any[];
  isConnected: "connected" | "pending" | "not_connected";
  isProcessing: boolean;
  uploadingImage: boolean;
  theme: "light" | "dark";
  headerFadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  buttonScaleAnim: Animated.Value;
  buttonOpacityAnim: Animated.Value;
  loadingRotationAnim: Animated.Value;
  onProfilePictureUpload: () => void;
  onMoodStatusPress: () => void;
  onConnectionsPress: () => void;
  onShareProfile: () => void;
  onConnect: () => void;
  onRemoveConnection: () => void;
  isUserCurrentlyAvailable: (schedule: any) => boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userData,
  authUser,
  id,
  isOwnProfile,
  connections,
  isConnected,
  isProcessing,
  uploadingImage,
  theme,
  headerFadeAnim,
  scaleAnim,
  buttonScaleAnim,
  buttonOpacityAnim,
  loadingRotationAnim,
  onProfilePictureUpload,
  onMoodStatusPress,
  onConnectionsPress,
  onShareProfile,
  onConnect,
  onRemoveConnection,
  isUserCurrentlyAvailable,
}) => {
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS !== 'web') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }
  };

  const textColor = theme === "light" ? "#0F172A" : "#ffffff";
  const secondaryTextColor = theme === "light" ? "#666666" : "#999999";

  return (
    <Animated.View 
      style={[
        styles.profileHeader, 
        { 
          opacity: headerFadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.avatarContainer}
        onPress={isOwnProfile ? onProfilePictureUpload : undefined}
        disabled={uploadingImage}
        activeOpacity={0.8}
      >
        {uploadingImage ? (
          <View style={[styles.profileImage, styles.uploadingContainer]}>
            <ActivityIndicator size="large" color={theme === "light" ? "#000000" : "#ffffff"} />
          </View>
        ) : (
          <UserAvatar
            user={userData || { name: 'User', profilePicture: null }}
            size={140}
            style={styles.profileImage}
          />
        )}
        {isOwnProfile && (
          <Animated.View 
            style={[
              styles.editImageOverlay,
              {
                opacity: headerFadeAnim,
                transform: [{ scale: scaleAnim }],
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                borderColor: "#37a4c8",
              }
            ]}
          >
            <MaterialIcons name="camera-alt" size={22} color="#ffffff" />
          </Animated.View>
        )}
        <View style={[styles.statusIndicator, { 
          borderColor: "transparent",
          opacity: (() => {
            // Never show for own profile
            if (isOwnProfile) return 0;
            
            // Check if user is currently available based on schedule
            const isAvailableBySchedule = isUserCurrentlyAvailable(userData?.availabilitySchedule);
            
            // Check if user was active within last 30 minutes
            const isRecentlyActive = (() => {
              if (!userData?.lastLogin) return false;
              const lastLogin = userData.lastLogin.toDate ? userData.lastLogin.toDate() : new Date(userData.lastLogin);
              const now = new Date();
              const diffInMinutes = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
              return diffInMinutes <= 30;
            })();
            
            return (isAvailableBySchedule || isRecentlyActive) ? 1 : 0;
          })(),
          backgroundColor: (() => {
            // Check if user is currently available based on schedule
            const isAvailableBySchedule = isUserCurrentlyAvailable(userData?.availabilitySchedule);
            
            // Check if user was active within last 30 minutes
            const isRecentlyActive = (() => {
              if (!userData?.lastLogin) return false;
              const lastLogin = userData.lastLogin.toDate ? userData.lastLogin.toDate() : new Date(userData.lastLogin);
              const now = new Date();
              const diffInMinutes = (now.getTime() - lastLogin.getTime()) / (1000 * 60);
              return diffInMinutes <= 30;
            })();
            
            return (isAvailableBySchedule || isRecentlyActive) ? "#37a4c8" : "transparent";
          })(),
          borderWidth: 0,
        }]} />
      </TouchableOpacity>

      <Animated.View 
        style={[
          styles.nameContainer,
          {
            opacity: headerFadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.nameRow}>
          <Animated.Text style={[styles.nameText, { color: textColor }]}>
            {userData?.name}
            <Animated.Text style={[styles.pronounsText, { color: secondaryTextColor }]}>
              {userData?.pronouns && ` (${userData.pronouns})`}
            </Animated.Text>
          </Animated.Text>
        </View>
        
        {/* Age */}
        <Animated.Text style={[styles.ageTextUnderName, { 
          color: secondaryTextColor,
          marginTop: 8,
        }]}>
          {userData?.age} years old
        </Animated.Text>
        
        {/* Mood Status */}
        {isOwnProfile ? (
          <TouchableOpacity
            style={[styles.moodContainer, styles.moodContainerUnderName, { 
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.1)",
              borderColor: "#37a4c8",
              marginTop: 20,
              alignSelf: 'center',
              paddingHorizontal: 16,
              paddingVertical: 8,
              minWidth: 200,
              maxWidth: '120%',
              marginHorizontal: -20,
            }]}
            onPress={onMoodStatusPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="mood" size={16} color="#37a4c8" />
            <Animated.Text style={[styles.moodText, styles.moodTextUnderName, { color: "#37a4c8" }]}>
              {userData?.moodStatus || "No status set"}
            </Animated.Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.moodContainer, styles.moodContainerUnderName, { 
            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.1)",
            borderColor: "#37a4c8",
            marginTop: 20,
            alignSelf: 'center',
            paddingHorizontal: 16,
            paddingVertical: 8,
            minWidth: 200,
            maxWidth: '120%',
            marginHorizontal: -20,
          }]}>
            <MaterialIcons name="mood" size={16} color="#37a4c8" />
            <Animated.Text style={[styles.moodText, styles.moodTextUnderName, { color: "#37a4c8" }]}>
              {userData?.moodStatus || "No status set"}
            </Animated.Text>
          </View>
        )}
        
        <Animated.View 
          style={[
            styles.nameSeparator, 
            { 
              marginBottom: 24,
              marginTop: 20,
              opacity: headerFadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]} 
        >
          <LinearGradient
            colors={theme === "light" 
              ? ["rgba(55, 164, 200, 0.1)", "rgba(55, 164, 200, 0.3)", "rgba(55, 164, 200, 0.1)"]
              : ["rgba(55, 164, 200, 0.2)", "rgba(55, 164, 200, 0.4)", "rgba(55, 164, 200, 0.2)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.separatorGradient}
          />
        </Animated.View>
        
        <View style={styles.badgeContainer}>
          <TouchableOpacity 
            style={[styles.statusButton, styles.connectionCountButton, { 
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.2)",
              borderColor: "#37a4c8",
              shadowColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              shadowOpacity: theme === "light" ? 0.2 : 0.3,
            }]}
            onPress={() => {
              triggerHapticFeedback('light');
              onConnectionsPress();
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="people" size={20} color="#37a4c8" />
            <Text style={[styles.statusButtonText, styles.connectionCountText, { 
              color: "#37a4c8",
              fontSize: 18,
              fontWeight: '800',
              marginLeft: 8,
            }]}>
              {connections.length}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statusButton, styles.shareButton, { 
              backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(55, 164, 200, 0.2)",
              borderColor: "#37a4c8",
              shadowColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
              shadowOpacity: theme === "light" ? 0.2 : 0.3,
            }]}
            onPress={() => {
              triggerHapticFeedback('light');
              onShareProfile();
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="share" size={20} color="#37a4c8" />
            <Text style={[styles.statusButtonText, styles.shareButtonText, { 
              color: "#37a4c8",
              fontSize: 16,
              fontWeight: '700',
              marginLeft: 8,
            }]}>
              Share
            </Text>
          </TouchableOpacity>
          
          {!isOwnProfile && (
            <Animated.View style={{
              transform: [{ scale: buttonScaleAnim }],
              opacity: buttonOpacityAnim,
            }}>
              <TouchableOpacity 
                onPress={isConnected === "not_connected" ? onConnect : onRemoveConnection}
                disabled={isProcessing}
                style={[
                  styles.statusButton,
                  styles.connectButton,
                  {
                    backgroundColor: isConnected === "connected" 
                      ? (theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(55, 164, 200, 0.25)")
                      : isConnected === "pending"
                      ? (theme === "light" ? "rgba(255, 149, 0, 0.15)" : "rgba(255, 149, 0, 0.25)")
                      : (theme === "light" ? "rgba(55, 164, 200, 0.15)" : "rgba(55, 164, 200, 0.25)"),
                    borderColor: isConnected === "connected" 
                      ? "#37a4c8" 
                      : isConnected === "pending"
                      ? "#FF9500"
                      : "#37a4c8",
                    shadowColor: theme === "light" ? "rgba(55, 164, 200, 0.3)" : "#37a4c8",
                    shadowOpacity: theme === "light" ? 0.2 : 0.3,
                  }
                ]}
                activeOpacity={0.7}
              >
                {isProcessing ? (
                  <Animated.View style={{
                    transform: [{
                      rotate: loadingRotationAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}>
                    <MaterialIcons 
                      name="sync" 
                      size={20} 
                      color={isConnected === "connected" 
                        ? "#37a4c8" 
                        : isConnected === "pending"
                        ? "#FF9500"
                        : "#37a4c8"} 
                    />
                  </Animated.View>
                ) : (
                  <MaterialIcons 
                    name={isConnected === "connected" 
                      ? "people" 
                      : isConnected === "pending"
                      ? "hourglass-empty"
                      : "person-add"} 
                    size={20} 
                    color={isConnected === "connected" 
                      ? "#37a4c8" 
                      : isConnected === "pending"
                      ? "#FF9500"
                      : "#37a4c8"} 
                  />
                )}
                <Text style={[styles.statusButtonText, styles.connectButtonText, { 
                  color: isConnected === "connected" 
                    ? "#37a4c8" 
                    : isConnected === "pending"
                    ? "#FF9500"
                    : "#37a4c8",
                  fontSize: 16,
                  fontWeight: '700',
                  marginLeft: 8,
                }]}>
                  {isProcessing 
                    ? "Connecting..." 
                    : isConnected === "connected" 
                      ? "Connected" 
                      : isConnected === "pending"
                      ? "Pending"
                      : "Connect"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = {
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 80,
    position: 'relative',
    marginTop: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
    marginTop: 10,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#37a4c8',
    backgroundColor: 'rgba(55, 164, 200, 0.05)',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  statusIndicator: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#37a4c8",
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  nameContainer: {
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  nameText: {
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.8,
    textAlign: 'center',
    lineHeight: 40,
  },
  pronounsText: {
    fontSize: 17,
    fontWeight: "500",
    opacity: 0.7,
    letterSpacing: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ageTextUnderName: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: 'center',
    letterSpacing: 0.3,
    opacity: 0.8,
  },
  moodContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(55, 164, 200, 0.12)",
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#37a4c8",
    minWidth: 130,
    justifyContent: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  moodContainerUnderName: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(55, 164, 200, 0.15)",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#37a4c8",
    justifyContent: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  moodText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "600",
    flex: 1,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 0.2,
  },
  moodTextUnderName: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "600",
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  nameSeparator: {
    width: '60%',
    height: 2,
    borderRadius: 1,
    marginBottom: 20,
    marginTop: 4,
    alignSelf: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  separatorGradient: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    width: '100%',
    alignSelf: 'center',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 26,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    minWidth: 60,
    height: 48,
    transform: [{ scale: 1 }],
  },
  statusButtonText: {
    fontWeight: '700',
    marginLeft: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontSize: 14,
    flexShrink: 1,
  },
  connectionCountButton: {
    minWidth: 110,
    paddingHorizontal: 20,
  },
  connectionCountText: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 6,
  },
  shareButton: {
    minWidth: 100,
    paddingHorizontal: 20,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  connectButton: {
    minWidth: 120,
    paddingHorizontal: 20,
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  uploadingContainer: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 22,
    padding: 10,
    borderWidth: 2,
    borderColor: '#38a5c9',
    shadowColor: '#38a5c9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
} as any;

export default ProfileHeader;

