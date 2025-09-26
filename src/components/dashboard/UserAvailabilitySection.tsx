import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Linking,
  StyleSheet,
} from 'react-native';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';
import UserAvailabilityTimer from './UserAvailabilityTimer';

export interface NearbyUser {
  id: string;
  name: string;
  status: string;
  isInviteCard?: boolean;
  isViewMoreCard?: boolean;
  profilePicture?: string;
  age?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  goals?: string[];
  pronouns?: string;
  lastLogin?: any;
  availabilitySchedule?: {
    [key: string]: {
      start: string;
      end: string;
    };
  };
  linkRatingScore?: {
    average: number;
    count: number;
  };
  currentCity?: string;
}

interface UserAvailabilitySectionProps {
  users: NearbyUser[];
  loading: boolean;
  onFilterPress: () => void;
}

// Helper function to format rating display
const formatRating = (ratingScore: any): string => {
  if (!ratingScore || !ratingScore.average) return 'No ratings';
  return `${ratingScore.average.toFixed(1)} (${ratingScore.count})`;
};

export default function UserAvailabilitySection({ 
  users, 
  loading, 
  onFilterPress 
}: UserAvailabilitySectionProps) {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();

  const handleUserPress = (user: NearbyUser) => {
    if (user.isInviteCard) {
      const appStoreLink = 'https://apps.apple.com/us/app/wingman-connect-on-layovers/id6743148488';
      const message = `Join me on Wingman! Connect with travelers during layovers: ${appStoreLink}`;
      Linking.openURL(`sms:&body=${encodeURIComponent(message)}`);
    } else if (user.isViewMoreCard) {
      router.push('/explore');
    } else {
      router.push(`profile/${user.id}`);
    }
  };

  const renderUserCard = (user: NearbyUser) => (
    <View style={styles.userInfo}>
      {/* Avatar and Basic Info Section */}
      <View style={styles.userSection}>
        <View style={[styles.avatar, { 
          backgroundColor: theme === "light" ? "#e6e6e6" : "#000000",
          borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
          marginBottom: 12,
        }]}>
          {user.profilePicture ? (
            <Image 
              source={{ uri: user.profilePicture }} 
              style={styles.avatarImage}
            />
          ) : (
            <FontAwesome5 name="user" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          )}
        </View>
        
        {/* Name and Age Row */}
        <View style={styles.nameAgeContainer}>
          <Text 
            style={[styles.userName, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {user.name}
          </Text>
          {user.age && (
            <Text style={[styles.userAge, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
              {user.age}
            </Text>
          )}
        </View>
        
        {/* Available Tag */}
        <View style={[styles.availableTag, { 
          backgroundColor: theme === "light" ? "#37a4c8" : "#38a5c9"
        }]}>
          <Feather name="check-circle" size={8} color="#FFFFFF" />
          <Text style={styles.availableText}>Available</Text>
        </View>
      </View>

      {/* Meta Information Section */}
      <View style={styles.userMetaContainer}>
        {/* Time Left */}
        <UserAvailabilityTimer 
          availabilitySchedule={user.availabilitySchedule} 
          theme={theme || "light"} 
        />

        {/* Rating */}
        <View style={[styles.metaItem, { 
          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"
        }]}>
          <Feather name="star" size={9} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text 
            style={[styles.metaText, { color: theme === "light" ? "#37a4c9" : "#38a5c9" }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatRating(user.linkRatingScore)}
          </Text>
        </View>

        {/* Current City */}
        {user.currentCity && (
          <View style={[styles.metaItem, { 
            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)"
          }]}>
            <Feather name="map-pin" size={9} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
            <Text 
              style={[styles.metaText, { color: theme === "light" ? "#37a4c9" : "#38a5c9" }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.currentCity}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderInviteCard = () => (
    <View style={[styles.inviteCardGradient, { 
      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a"
    }]}>
      <View style={[styles.inviteAvatar, { 
        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
      }]}>
        <FontAwesome5 name="user-plus" size={18} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
      </View>
      <Text style={[styles.inviteTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
        Invite Friends
      </Text>
      <Text style={[styles.inviteSubtitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
        Share Wingman
      </Text>
      <View style={[styles.inviteButton, { 
        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
      }]}>
        <Feather name="share-2" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
        <Text style={[styles.inviteButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
          Share
        </Text>
      </View>
    </View>
  );

  const renderViewMoreCard = () => (
    <View style={[styles.viewMoreCard, { 
      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a"
    }]}>
      <View style={[styles.viewMoreIconContainer, { 
        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(56, 165, 201, 0.08)",
        borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
      }]}>
        <Feather name="users" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
      </View>
      <Text style={[styles.viewMoreTitle, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
        View More
      </Text>
      <Text style={[styles.viewMoreSubtitle, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
        See all travelers
      </Text>
      <View style={[styles.inviteButton, { 
        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.12)" : "rgba(56, 165, 201, 0.12)"
      }]}>
        <Feather name="chevron-right" size={12} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
        <Text style={[styles.inviteButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
          Explore
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="clock" size={20} color={theme === "light" ? "#37a4c8" : "#38a5c9"} style={styles.headerIcon} />
          <Text style={[styles.sectionHeader, { color: theme === "light" ? "#000000" : "#e4fbfe" }]}>
            Available Now
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, { 
            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(56, 165, 201, 0.1)",
            borderColor: theme === "light" ? "#37a4c8" : "#38a5c9",
            marginTop: 2,
          }]}
          onPress={onFilterPress}
          activeOpacity={0.7}
        >
          <Feather name="filter" size={14} color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text style={[styles.filterButtonText, { color: theme === "light" ? "#37a4c8" : "#38a5c9" }]}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme === "light" ? "#37a4c8" : "#38a5c9"} />
          <Text style={[styles.loadingText, { color: theme === "light" ? "#000000" : "#64748B" }]}>
            Finding available travelers...
          </Text>
        </View>
      ) : users.length > 0 ? (
        <FlatList
          horizontal
          data={users}
          keyExtractor={(user: NearbyUser) => user.id}
          renderItem={({ item: user }) => (
            <TouchableOpacity
              style={[styles.userCard, { 
                backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                borderColor: theme === "light" ? "#37a4c8" : "#38a5c9"
              }]}
              activeOpacity={0.7}
              onPress={() => handleUserPress(user)}
            >
              <View style={styles.userCardGradient}>
                {user.isInviteCard ? renderInviteCard() : 
                 user.isViewMoreCard ? renderViewMoreCard() : 
                 renderUserCard(user)}
              </View>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      ) : (
        <Text style={[styles.noDataText, { color: theme === "light" ? "#000000" : "#64748B" }]}>
          No travelers available now.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 0,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 12,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: 0.3,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  userCard: {
    width: 140,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    marginRight: 10,
    elevation: 4,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#38a5c9",
    marginBottom: 12,
    overflow: 'hidden',
  },
  userCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#38a5c9",
    overflow: 'hidden',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userInfo: {
    padding: 0,
    alignItems: 'center',
    width: '100%',
  },
  userSection: {
    borderBottomWidth: 0,
    paddingBottom: 8,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  nameAgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    width: '100%',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  userAge: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  availableTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 6,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  availableText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  userMetaContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
    minHeight: 24,
    maxWidth: '100%',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: 0.1,
  },
  inviteCardGradient: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.03)',
  },
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 165, 201, 0.08)',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#38a5c9",
    overflow: 'hidden',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  inviteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: -0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  inviteSubtitle: {
    fontSize: 11,
    color: "#38a5c9",
    letterSpacing: 0.1,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 165, 201, 0.25)',
  },
  inviteButtonText: {
    fontSize: 11,
    color: "#38a5c9",
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  viewMoreCard: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(56, 165, 201, 0.02)',
  },
  viewMoreIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 165, 201, 0.08)',
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#38a5c9",
    overflow: 'hidden',
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewMoreTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e4fbfe",
    letterSpacing: -0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  viewMoreSubtitle: {
    fontSize: 11,
    color: "#38a5c9",
    letterSpacing: 0.1,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  noDataText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 24,
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
});
