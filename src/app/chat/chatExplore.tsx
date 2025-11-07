import { router } from "expo-router";
import {
  View,
  FlatList,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
} from "react-native";
import useAuth from "../../hooks/auth";
import React, { useEffect, useState, useRef, useMemo } from "react";
import useUsers from "../../hooks/useUsers";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeContext } from "../../context/ThemeContext";
import useNotificationCount from "../../hooks/useNotificationCount";
import * as Haptics from 'expo-haptics';
import { scaleWidth, scaleHeight, moderateScale, scaleFontSize } from "../../utils/responsive";

// Import our new components
import {
  UserCard,
  SearchBar,
  EmptyState,
  ErrorState,
  FilterSortBar,
  FilterModal,
  AppUser,
  SortOption,
  FilterOptions
} from "../../components/chatExplore";

// Interfaces are now imported from components/chatExplore/types.ts

export default function ChatExplore() {
  const { user } = useAuth();
  const { getUsers } = useUsers();
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Filtering and sorting state
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilterModal, setShowFilterModal] = useState(false);

  // States to manage chat fetching and creation
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatPartnerIds, setChatPartnerIds] = useState<string[]>([]);

  // Animation values for bounce effect
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;

  // Dynamic styles that depend on safe area insets
  const dynamicStyles = React.useMemo(() => ({
    listContent: {
      paddingBottom: scaleHeight(80) + insets.bottom,
    },
  }), [insets.bottom]);

  // Add back the handleBack function
  const handleBack = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Animate out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  };

  // Added auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is authenticated
      } else {
        router.replace("login/login");
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Set initialLoadComplete when data fetch has completed (regardless of whether we got results)
  useEffect(() => {
    // Only set initialLoadComplete after we've attempted to fetch users at least once
    // This ensures we don't show empty state prematurely
    if (!loading && !usersLoading && !chatLoading && user && hasAttemptedFetch) {
      setInitialLoadComplete(true);
    }
  }, [loading, usersLoading, chatLoading, user, hasAttemptedFetch]);

  // Trigger bounce animation when loading completes
  useEffect(() => {
    if (!loading && initialLoadComplete) {
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
  }, [loading, initialLoadComplete]);

  // Fetch existing connections to filter out users we already have connections with
  const fetchExistingConnections = async (currentUserId: string): Promise<string[]> => {
    try {
      const connectionsRef = collection(db, "connections");
      const q = query(
        connectionsRef,
        where("participants", "array-contains", currentUserId)
      );
      const querySnapshot = await getDocs(q);
      
      const connectedUserIds = new Set<string>();
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUserId);
        if (otherUserId) {
          connectedUserIds.add(otherUserId);
        }
      });
      
      console.log('Found existing connections with users:', Array.from(connectedUserIds));
      return Array.from(connectedUserIds);
    } catch (error) {
      console.error("Error fetching existing connections:", error);
      return [];
    }
  };

  // Fetch all users excluding the authenticated user
  useEffect(() => {
    const fetchUsers = async () => {
      if (user) {
        try {
          setUsersLoading(true);
          setUsersError(null);
          
          // Get existing connections first
          const connectedUserIds = await fetchExistingConnections(user.uid);
          
          // Get current user's blocked lists
          const currentUserDoc = await getDoc(doc(db, "users", user.uid));
          const currentUserData = currentUserDoc.data();
          const blockedUsers = currentUserData?.blockedUsers || [];
          const hasMeBlocked = currentUserData?.hasMeBlocked || [];

          // Get all users
          const allUsers = await getUsers() as AppUser[];
          
          // Get all users' documents to check their blocked lists
          const userDocs = await Promise.all(
            allUsers.map(u => getDoc(doc(db, "users", u.id)))
          );

          // Filter users based on blocking status, existing connections, and other criteria
          const otherUsers = allUsers.filter((u: AppUser, index: number) => {
            const userDoc = userDocs[index];
            const userData = userDoc.data();
            
            // Check if either user has blocked the other
            const isBlocked = blockedUsers.includes(u.id);
            const hasBlockedMe = hasMeBlocked.includes(u.id);
            const hasBlockedCurrentUser = userData?.blockedUsers?.includes(user.uid);
            const currentUserHasBlockedThem = userData?.hasMeBlocked?.includes(user.uid);
            
            // Check if we already have a connection with this user
            const hasExistingConnection = connectedUserIds.includes(u.id);

            return u.id !== user.uid && // Not current user
                   !isBlocked && // Not blocked by current user
                   !hasBlockedMe && // Has not blocked current user
                   !hasBlockedCurrentUser && // Has not blocked current user
                   !currentUserHasBlockedThem && // Current user has not blocked them
                   !hasExistingConnection; // No existing connection (pending or active)
          });

          // Sort users: those with profile pictures first
          const sortedUsers = otherUsers.sort((a, b) => {
            const aHasProfilePic = Boolean(a.profilePicture);
            const bHasProfilePic = Boolean(b.profilePicture);
            if (aHasProfilePic === bHasProfilePic) return 0;
            return aHasProfilePic ? -1 : 1;
          });

          setUsers(sortedUsers);
          setHasAttemptedFetch(true);
        } catch (error) {
          console.error("Error fetching users:", error);
          setUsersError("Failed to load users. Please try again.");
          setHasAttemptedFetch(true);
        } finally {
          setUsersLoading(false);
        }
      }
    };
    fetchUsers();
  }, [user]);

  // Memoize available interests for filter options
  const availableInterests = useMemo(() => {
    const interestsSet = new Set<string>();
    users.forEach((u) => {
      u.interests?.forEach((interest) => interestsSet.add(interest));
    });
    return Array.from(interestsSet).sort();
  }, [users]);

  // Apply filters to users
  const applyFilters = (userList: AppUser[]): AppUser[] => {
    let filtered = [...userList];

    // Apply age range filter
    if (filters.ageRange) {
      const { min, max } = filters.ageRange;
      filtered = filtered.filter((u) => u.age >= min && u.age <= max);
    }

    // Apply interests filter (user must have at least one selected interest)
    if (filters.interests && filters.interests.length > 0) {
      filtered = filtered.filter((u) => 
        u.interests?.some((interest) => filters.interests?.includes(interest))
      );
    }

    // Apply profile completeness filters
    if (filters.hasBio) {
      filtered = filtered.filter((u) => u.bio && u.bio.trim().length > 0);
    }

    if (filters.hasProfilePicture) {
      filtered = filtered.filter((u) => u.profilePicture);
    }

    return filtered;
  };

  // Apply sorting to users
  const applySorting = (userList: AppUser[]): AppUser[] => {
    const sorted = [...userList];
    
    switch (sortOption) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      
      case 'age-asc':
        return sorted.sort((a, b) => a.age - b.age);
      
      case 'age-desc':
        return sorted.sort((a, b) => b.age - a.age);
      
      case 'newest':
        // Maintain the order from Firestore (newest first is the default)
        return sorted;
      
      default:
        return sorted;
    }
  };

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.ageRange) count++;
    if (filters.interests && filters.interests.length > 0) count++;
    if (filters.hasBio) count++;
    if (filters.hasProfilePicture) count++;
    return count;
  }, [filters]);

  // Filter, sort, and search users
  useEffect(() => {
    let updatedFilteredUsers = users.filter((u) => !chatPartnerIds.includes(u.id));
    
    // Apply filters
    updatedFilteredUsers = applyFilters(updatedFilteredUsers);
    
    // Apply search
    if (searchQuery.trim()) {
      updatedFilteredUsers = updatedFilteredUsers.filter((u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    updatedFilteredUsers = applySorting(updatedFilteredUsers);
    
    setFilteredUsers(updatedFilteredUsers);
  }, [users, chatPartnerIds, searchQuery, sortOption, filters]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <UserCard item={item} onPress={() => {}} index={index} />
  );

  // Show loading screen during initial load - keep showing until we have data or confirmed no data
  if (loading || !initialLoadComplete || (usersLoading && users.length === 0)) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
          <View style={{ flex: 1 }} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#ffffff" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
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
                  outputRange: [scaleHeight(30), 0]
                })
              }
            ]
          }}
        >
          {/* Chat Explore Content */}
          <View style={styles.container}>
            <SearchBar
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              placeholder="Search by name..."
            />

            <FilterSortBar
              sortOption={sortOption}
              onSortChange={setSortOption}
              onFilterPress={() => setShowFilterModal(true)}
              activeFiltersCount={activeFiltersCount}
              resultCount={filteredUsers.length}
            />

            {/* Active Filters Chips */}
            {activeFiltersCount > 0 && (
              <View style={styles.activeFiltersContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activeFiltersScroll}
                >
                  {filters.ageRange && (
                    <View style={[styles.activeFilterChip, { backgroundColor: theme === 'light' ? '#e0f2f7' : '#1a3a42' }]}>
                      <Text style={[styles.activeFilterText, { color: '#37a4c8' }]}>
                        Age: {filters.ageRange.min}-{filters.ageRange.max}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => setFilters(prev => ({ ...prev, ageRange: undefined }))}
                        hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}
                      >
                        <Ionicons name="close-circle" size={moderateScale(16)} color="#37a4c8" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {filters.interests && filters.interests.map((interest) => (
                    <View key={interest} style={[styles.activeFilterChip, { backgroundColor: theme === 'light' ? '#e0f2f7' : '#1a3a42' }]}>
                      <Text style={[styles.activeFilterText, { color: '#37a4c8' }]}>
                        {interest}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => setFilters(prev => ({
                          ...prev,
                          interests: prev.interests?.filter(i => i !== interest)
                        }))}
                        hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}
                      >
                        <Ionicons name="close-circle" size={moderateScale(16)} color="#37a4c8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {filters.hasBio && (
                    <View style={[styles.activeFilterChip, { backgroundColor: theme === 'light' ? '#e0f2f7' : '#1a3a42' }]}>
                      <Text style={[styles.activeFilterText, { color: '#37a4c8' }]}>
                        Has Bio
                      </Text>
                      <TouchableOpacity 
                        onPress={() => setFilters(prev => ({ ...prev, hasBio: undefined }))}
                        hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}
                      >
                        <Ionicons name="close-circle" size={moderateScale(16)} color="#37a4c8" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {filters.hasProfilePicture && (
                    <View style={[styles.activeFilterChip, { backgroundColor: theme === 'light' ? '#e0f2f7' : '#1a3a42' }]}>
                      <Text style={[styles.activeFilterText, { color: '#37a4c8' }]}>
                        Has Photo
                      </Text>
                      <TouchableOpacity 
                        onPress={() => setFilters(prev => ({ ...prev, hasProfilePicture: undefined }))}
                        hitSlop={{ top: scaleHeight(10), bottom: scaleHeight(10), left: scaleWidth(10), right: scaleWidth(10) }}
                      >
                        <Ionicons name="close-circle" size={moderateScale(16)} color="#37a4c8" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[styles.clearAllButton, { borderColor: '#ef4444' }]}
                    onPress={() => setFilters({})}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={moderateScale(14)} color="#ef4444" />
                    <Text style={[styles.clearAllText, { color: '#ef4444' }]}>
                      Clear All
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            <FilterModal
              visible={showFilterModal}
              onClose={() => setShowFilterModal(false)}
              filters={filters}
              onApplyFilters={setFilters}
              availableInterests={availableInterests}
            />
            
            {usersError || chatError ? (
              <ErrorState message={usersError || chatError || "An error occurred"} />
            ) : (
              <FlatList
                data={filteredUsers}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={dynamicStyles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  // Only show empty state if:
                  // 1. We've attempted to fetch users at least once
                  // 2. Initial load is complete
                  // 3. Not currently loading
                  // 4. We have no filtered users
                  hasAttemptedFetch &&
                  initialLoadComplete && 
                  !usersLoading && 
                  !chatLoading && 
                  filteredUsers.length === 0 ? (
                    searchQuery || activeFiltersCount > 0 ? (
                      <EmptyState
                        icon="search"
                        title="No matches found"
                        subtitle="Try adjusting your filters or search terms"
                      />
                    ) : (
                      <EmptyState
                        icon="people"
                        title="No users available"
                        subtitle="Check back later for new connections"
                      />
                    )
                  ) : null
                }
              />
            )}
          </View>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    marginBottom: scaleHeight(-20),
  },
  container: {
    flex: 1,
    padding: moderateScale(16),
  },
  activeFiltersContainer: {
    marginBottom: scaleHeight(12),
  },
  activeFiltersScroll: {
    paddingVertical: scaleHeight(4),
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(20),
    marginRight: scaleWidth(8),
    gap: moderateScale(6),
  },
  activeFilterText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    borderRadius: moderateScale(20),
    borderWidth: moderateScale(1.5),
    gap: moderateScale(4),
  },
  clearAllText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
});
