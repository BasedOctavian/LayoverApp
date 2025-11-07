import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  StatusBar,
  TextInput,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import useAuth from '../../hooks/auth';
import useUsers from '../../hooks/useUsers';
import useGroups from '../../hooks/useGroups';
import { Group, GROUP_CATEGORIES } from '../../types/groupTypes';
import { ThemeContext } from '../../context/ThemeContext';
import TopBar from '../../components/TopBar';
import useNotificationCount from '../../hooks/useNotificationCount';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../utils/responsive';

// Calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Calculate interest match score
const calculateInterestMatch = (userInterests: string[], groupTags: string[]): number => {
  if (!userInterests || !groupTags || userInterests.length === 0 || groupTags.length === 0) {
    return 0;
  }
  
  const userInterestsLower = userInterests.map(i => i.toLowerCase());
  const groupTagsLower = groupTags.map(t => t.toLowerCase());
  
  const matches = userInterestsLower.filter(interest => 
    groupTagsLower.some(tag => 
      tag.includes(interest) || interest.includes(tag)
    )
  ).length;
  
  return (matches / Math.max(userInterests.length, groupTags.length)) * 100;
};

interface EnrichedGroup extends Group {
  distance?: number;
  interestMatch?: number;
  organizerLocation?: { latitude: number; longitude: number };
}

export default function ExploreGroupsScreen() {
  const router = useRouter();
  const { userId, user } = useAuth();
  const { getUser } = useUsers();
  const { getGroups } = useGroups();
  const { theme } = React.useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);

  const [groups, setGroups] = useState<EnrichedGroup[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'match' | 'distance' | 'recent'>('match');
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Animation refs
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;

  // Fetch user data and location
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return;
      
      try {
        const userData = await getUser(userId);
        setCurrentUser(userData);
        
        // Get user's current location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } else if (userData?.lastKnownCoordinates) {
          // Fallback to last known coordinates
          setUserLocation(userData.lastKnownCoordinates);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [userId]);

  // Fetch and enrich groups
  const fetchGroups = useCallback(async () => {
    try {
      // Fetch all groups (including private ones that require approval)
      const fetchedGroups = await getGroups();
      
      // Enrich groups with organizer location, distance, and interest match
      const enrichedGroups = await Promise.all(
        fetchedGroups.map(async (group) => {
          const enrichedGroup: EnrichedGroup = { ...group };
          
          // Use group's stored coordinates (organizer's location at creation)
          if (group.coordinates && userLocation) {
            enrichedGroup.distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              group.coordinates.latitude,
              group.coordinates.longitude
            );
            enrichedGroup.organizerLocation = group.coordinates;
          }
          
          // Calculate interest match
          if (currentUser?.interests) {
            enrichedGroup.interestMatch = calculateInterestMatch(
              currentUser.interests,
              group.tags || []
            );
          }
          
          return enrichedGroup;
        })
      );
      
      // Filter groups based on each group's visibility radius
      // Also filter out 'hidden' groups (show both public and private)
      const filteredByDistance = enrichedGroups.filter(group => {
        // Exclude hidden groups
        if (group.visibility === 'hidden') return false;
        // If no distance calculated, exclude the group
        if (group.distance === undefined) return false;
        // Only show groups within their specified visibility radius
        const groupRadius = group.radius || 30; // Default to 30 miles if not set
        return group.distance <= groupRadius;
      });
      
      setGroups(filteredByDistance);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  }, [userLocation, currentUser]);

  // Set initial load complete when data is ready
  useEffect(() => {
    if (currentUser && userLocation && groups.length >= 0) {
      setInitialLoadComplete(true);
    }
  }, [currentUser, userLocation, groups]);

  // Trigger bounce animation when loading completes
  useEffect(() => {
    if (initialLoadComplete) {
      Animated.parallel([
        Animated.timing(contentBounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentScaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start();
    }
  }, [initialLoadComplete, contentBounceAnim, contentScaleAnim]);

  useEffect(() => {
    if (currentUser && userLocation) {
      fetchGroups();
    }
  }, [currentUser, userLocation, fetchGroups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    let filtered = groups;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query) ||
        group.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(group => group.category === selectedCategory);
    }

    // Sort by selected criteria
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'match') {
        return (b.interestMatch || 0) - (a.interestMatch || 0);
      } else if (sortBy === 'distance') {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      } else if (sortBy === 'recent') {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }
      return 0;
    });

    return filtered;
  }, [groups, searchQuery, selectedCategory, sortBy]);

  const handleGroupPress = (groupId: string) => {
    router.push(`/group/${groupId}`);
  };

  const handleCreateGroup = () => {
    router.push('/group/create');
  };

  const handleBack = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const renderCategoryChip = (category: any) => {
    const isSelected = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryChip,
          {
            backgroundColor: isSelected
              ? theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)'
              : theme === 'light' ? '#ffffff' : '#1a1a1a',
            borderColor: isSelected ? '#37a4c8' : theme === 'light' ? '#e2e8f0' : '#334155',
          }
        ]}
        onPress={() => setSelectedCategory(isSelected ? null : category.id)}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={category.icon as any}
          size={moderateScale(18)}
          color={isSelected ? '#37a4c8' : theme === 'light' ? '#64748b' : '#94a3b8'}
        />
        <Text
          style={[
            styles.categoryChipText,
            { color: isSelected ? '#37a4c8' : theme === 'light' ? '#64748b' : '#94a3b8' }
          ]}
        >
          {category.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSortButton = (value: typeof sortBy, label: string, icon: string) => {
    const isSelected = sortBy === value;
    return (
      <TouchableOpacity
        style={[
          styles.sortButton,
          {
            backgroundColor: isSelected
              ? '#37a4c8'
              : theme === 'light' ? '#ffffff' : '#1a1a1a',
            borderColor: isSelected ? '#37a4c8' : theme === 'light' ? '#e2e8f0' : '#334155',
          }
        ]}
        onPress={() => setSortBy(value)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={icon as any}
          size={moderateScale(16)}
          color={isSelected ? '#ffffff' : theme === 'light' ? '#64748b' : '#94a3b8'}
        />
        <Text
          style={[
            styles.sortButtonText,
            { color: isSelected ? '#ffffff' : theme === 'light' ? '#64748b' : '#94a3b8' }
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGroupCard = (group: EnrichedGroup) => {
    const hasHighMatch = (group.interestMatch || 0) >= 50;
    const isNearby = group.distance !== undefined && group.distance <= 50;
    const isMember = userId ? group.members?.includes(userId) : false;
    const isOrganizer = userId ? group.organizers?.includes(userId) : false;

    return (
      <TouchableOpacity
        key={group.id}
        style={[
          styles.groupCard,
          {
            backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            shadowColor: theme === 'light' ? '#000000' : '#37a4c8',
          }
        ]}
        onPress={() => handleGroupPress(group.id)}
        activeOpacity={0.75}
      >
        {/* Group Image */}
        <View style={styles.groupImageContainer}>
          {group.groupImage ? (
            <Image source={{ uri: group.groupImage }} style={styles.groupImage} />
          ) : (
            <View
              style={[
                styles.groupImagePlaceholder,
                {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                }
              ]}
            >
              <MaterialIcons name="groups" size={moderateScale(32)} color="#37a4c8" />
            </View>
          )}

          {/* Membership Badge */}
          {isOrganizer && (
            <View style={styles.organizerBadge}>
              <MaterialIcons name="verified" size={moderateScale(12)} color="#ffffff" />
            </View>
          )}
          {!isOrganizer && isMember && (
            <View style={styles.memberBadge}>
              <MaterialIcons name="check-circle" size={moderateScale(12)} color="#ffffff" />
            </View>
          )}
        </View>

        {/* Group Info */}
        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text
              style={[styles.groupName, { color: theme === 'light' ? '#1e293b' : '#f1f5f9' }]}
              numberOfLines={1}
            >
              {group.name}
            </Text>
            {hasHighMatch && (
              <View
                style={[
                  styles.matchBadge,
                  { backgroundColor: theme === 'light' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)' }
                ]}
              >
                <Ionicons name="heart" size={moderateScale(12)} color="#22c55e" />
                <Text style={[styles.matchBadgeText, { color: '#22c55e' }]}>
                  {Math.round(group.interestMatch || 0)}%
                </Text>
              </View>
            )}
          </View>

          <Text
            style={[styles.groupDescription, { color: theme === 'light' ? '#64748b' : '#94a3b8' }]}
            numberOfLines={2}
          >
            {group.description}
          </Text>

          <View style={styles.groupMeta}>
            <View
              style={[
                styles.metaBadge,
                {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                }
              ]}
            >
              <MaterialIcons name="people" size={moderateScale(14)} color="#37a4c8" />
              <Text style={[styles.metaText, { color: theme === 'light' ? '#64748b' : '#94a3b8' }]}>
                {group.memberCount}
              </Text>
            </View>

            {group.distance !== undefined && (
              <View
                style={[
                  styles.metaBadge,
                  {
                    backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                  }
                ]}
              >
                <MaterialIcons name="location-on" size={moderateScale(14)} color="#37a4c8" />
                <Text style={[styles.metaText, { color: theme === 'light' ? '#64748b' : '#94a3b8' }]}>
                  {group.distance < 1 ? '< 1 mi' : `${Math.round(group.distance)} mi`}
                </Text>
              </View>
            )}

            {group.category && (
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                  }
                ]}
              >
                <Text style={[styles.categoryText, { color: '#37a4c8' }]}>
                  {GROUP_CATEGORIES.find(c => c.id === group.category)?.label || group.category}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <MaterialIcons
          name="chevron-right"
          size={moderateScale(22)}
          color={theme === 'light' ? '#cbd5e1' : '#475569'}
        />
      </TouchableOpacity>
    );
  };

  // Loading screen
  if (!currentUser || !userLocation || !initialLoadComplete) {
    return (
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme === 'light' ? '#f8f9fa' : '#000000' }]}
        edges={['bottom']}
      >
        <LinearGradient
          colors={theme === 'light' ? ['#f8f9fa', '#ffffff'] : ['#000000', '#1a1a1a']}
          style={styles.flex}
        >
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme === 'light' ? '#f8f9fa' : '#000000' }]}
      edges={['bottom']}
    >
      <LinearGradient
        colors={theme === 'light' ? ['#f8f9fa', '#ffffff'] : ['#000000', '#1a1a1a']}
        style={styles.flex}
      >
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        
        {/* TopBar */}
        <TopBar 
          showBackButton={true} 
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />

        <Animated.View
          style={{
            flex: 1,
            opacity: contentBounceAnim,
            transform: [
              { scale: contentScaleAnim },
              {
                translateY: contentBounceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }
            ]
          }}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#37a4c8"
                colors={["#37a4c8"]}
                progressBackgroundColor={theme === 'light' ? '#ffffff' : '#1a1a1a'}
              />
            }
          >
          {/* Create Group CTA */}
          <TouchableOpacity
            style={[
              styles.createGroupCTA,
              {
                backgroundColor: theme === 'light' ? '#37a4c8' : '#37a4c8',
              }
            ]}
            onPress={handleCreateGroup}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#37a4c8', '#2d8ba3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createGroupGradient}
            >
              <View style={styles.createGroupContent}>
                <View style={styles.createGroupIcon}>
                  <MaterialIcons name="add-circle" size={moderateScale(32)} color="#ffffff" />
                </View>
                <View style={styles.createGroupText}>
                  <Text style={styles.createGroupTitle}>Create Your Own Group</Text>
                  <Text style={styles.createGroupSubtitle}>
                    Start a community around your interests
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={moderateScale(24)} color="rgba(255, 255, 255, 0.8)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Search Bar */}
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
                borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
              }
            ]}
          >
            <Ionicons name="search" size={moderateScale(20)} color={theme === 'light' ? '#94a3b8' : '#64748b'} />
            <TextInput
              style={[styles.searchInput, { color: theme === 'light' ? '#1e293b' : '#f1f5f9' }]}
              placeholder="Search groups..."
              placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={moderateScale(20)} color={theme === 'light' ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Options */}
          <View style={styles.sortContainer}>
            <Text style={[styles.sectionLabel, { color: theme === 'light' ? '#64748b' : '#94a3b8' }]}>
              Sort by
            </Text>
            <View style={styles.sortButtons}>
              {renderSortButton('match', 'Best Match', 'heart')}
              {renderSortButton('distance', 'Nearest', 'location')}
              {renderSortButton('recent', 'Recent', 'time')}
            </View>
          </View>

          {/* Category Filter */}
          <View style={styles.categorySection}>
            <Text style={[styles.sectionLabel, { color: theme === 'light' ? '#64748b' : '#94a3b8' }]}>
              Filter by category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              {GROUP_CATEGORIES.map(renderCategoryChip)}
            </ScrollView>
          </View>

          {/* Results Summary */}
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: theme === 'light' ? '#1e293b' : '#f1f5f9' }]}>
              {filteredGroups.length} {filteredGroups.length === 1 ? 'group' : 'groups'} found
            </Text>
          </View>

          {/* Groups List */}
          {filteredGroups.length > 0 ? (
            <View style={styles.groupsList}>
              {filteredGroups.map(renderGroupCard)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconContainer,
                  {
                    backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                  }
                ]}
              >
                <MaterialIcons name="search-off" size={moderateScale(48)} color="#37a4c8" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme === 'light' ? '#1e293b' : '#f1f5f9' }]}>
                No Groups Found
              </Text>
              <Text style={[styles.emptyDescription, { color: theme === 'light' ? '#64748b' : '#94a3b8' }]}>
                Try adjusting your search or filters, or create your own group!
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionButton, { backgroundColor: '#37a4c8' }]}
                onPress={handleCreateGroup}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add-circle" size={moderateScale(20)} color="#ffffff" />
                <Text style={styles.emptyActionText}>Create Group</Text>
              </TouchableOpacity>
            </View>
          )}
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: scaleHeight(80),
  },
  createGroupCTA: {
    borderRadius: borderRadius.xl,
    marginBottom: spacing.xxl,
    overflow: 'hidden',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.25,
    shadowRadius: moderateScale(12),
    elevation: 6,
  },
  createGroupGradient: {
    padding: spacing.xl,
  },
  createGroupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  createGroupIcon: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createGroupText: {
    flex: 1,
  },
  createGroupTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  createGroupSubtitle: {
    fontSize: scaleFontSize(14),
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: scaleFontSize(16),
    fontWeight: '500',
  },
  sortContainer: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    gap: moderateScale(6),
  },
  sortButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoriesScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    gap: moderateScale(6),
  },
  categoryChipText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
  resultsHeader: {
    marginBottom: spacing.lg,
  },
  resultsCount: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  groupsList: {
    gap: moderateScale(14),
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(14),
    borderRadius: borderRadius.lg,
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(12),
    elevation: 4,
  },
  groupImageContainer: {
    position: 'relative',
  },
  groupImage: {
    width: moderateScale(72),
    height: moderateScale(72),
    borderRadius: borderRadius.lg,
  },
  groupImagePlaceholder: {
    width: moderateScale(72),
    height: moderateScale(72),
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(55, 164, 200, 0.95)',
    borderRadius: moderateScale(6),
    padding: moderateScale(2),
  },
  memberBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(34, 197, 94, 0.95)',
    borderRadius: moderateScale(6),
    padding: moderateScale(2),
  },
  groupInfo: {
    flex: 1,
    marginLeft: moderateScale(14),
    gap: moderateScale(7),
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  groupName: {
    fontSize: scaleFontSize(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  matchBadgeText: {
    fontSize: scaleFontSize(11),
    fontWeight: '700',
  },
  groupDescription: {
    fontSize: scaleFontSize(13),
    lineHeight: scaleFontSize(18),
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: moderateScale(6),
    marginTop: moderateScale(2),
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  metaText: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleHeight(60),
    paddingHorizontal: moderateScale(32),
  },
  emptyIconContainer: {
    width: moderateScale(96),
    height: moderateScale(96),
    borderRadius: moderateScale(48),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: scaleFontSize(22),
    fontWeight: '800',
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptyDescription: {
    fontSize: scaleFontSize(15),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: scaleFontSize(22),
    marginBottom: moderateScale(28),
    maxWidth: scaleWidth(280),
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: moderateScale(14),
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: spacing.sm,
    elevation: 4,
  },
  emptyActionText: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    color: '#ffffff',
  },
});

