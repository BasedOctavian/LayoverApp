import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Image,
  StatusBar,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import useAuth from '../../hooks/auth';
import useGroups from '../../hooks/useGroups';
import { Group } from '../../types/groupTypes';
import { ThemeContext } from '../../context/ThemeContext';
import TopBar from '../../components/TopBar';
import useNotificationCount from '../../hooks/useNotificationCount';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../utils/responsive';

const MyGroupsScreen: React.FC = () => {
  const router = useRouter();
  const { userId, user } = useAuth();
  const { getUserGroups, loading } = useGroups();
  const { theme } = React.useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  
  // Get notification count
  const notificationCount = useNotificationCount(userId || null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    try {
      const fetchedGroups = await getUserGroups(userId);
      setGroups(fetchedGroups);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setInitialLoading(false);
    }
  }, [userId]);

  // Set initial load complete when data is ready
  useEffect(() => {
    if (!initialLoading) {
      setInitialLoadComplete(true);
    }
  }, [initialLoading]);

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
    fetchGroups();
  }, [fetchGroups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  const handleGroupPress = (groupId: string) => {
    router.push(`/group/${groupId}`);
  };

  const handleExploreGroups = () => {
    router.push('/group/explore');
  };

  // Loading screen
  if (initialLoading || !initialLoadComplete) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
        <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
          <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme === "light" ? "#f8f9fa" : "#000000" }]} edges={["bottom"]}>
      <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title=""
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
                progressBackgroundColor={theme === "light" ? "#ffffff" : "#1a1a1a"}
              />
            }
          >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View>
              <Text style={[styles.pageTitle, { color: theme === "light" ? "#1e293b" : "#f1f5f9" }]}>
                My Groups
              </Text>
              <Text style={[styles.pageSubtitle, { color: theme === "light" ? "#64748b" : "#94a3b8" }]}>
                {groups.length} {groups.length === 1 ? 'group' : 'groups'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.createButtonCompact, {
                backgroundColor: theme === "light" ? "#37a4c8" : "#37a4c8",
              }]}
              onPress={handleExploreGroups}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={moderateScale(24)} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Groups List */}
          {groups.length > 0 ? (
            <View style={styles.groupsList}>
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupCard, {
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                      shadowColor: theme === "light" ? "#000000" : "#37a4c8",
                    }]}
                    onPress={() => handleGroupPress(group.id)}
                    activeOpacity={0.75}
                  >
                    {/* Group Image */}
                    {group.groupImage ? (
                      <Image source={{ uri: group.groupImage }} style={styles.groupImage} />
                    ) : (
                      <View style={[styles.groupImagePlaceholder, {
                        backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.15)",
                      }]}>
                        <MaterialIcons name="groups" size={moderateScale(40)} color="#37a4c8" />
                      </View>
                    )}

                    {/* Group Info */}
                    <View style={styles.groupInfo}>
                      <View style={styles.groupHeader}>
                        <Text style={[styles.groupName, { color: theme === "light" ? "#1e293b" : "#f1f5f9" }]} numberOfLines={1}>
                          {group.name}
                        </Text>
                        {group.organizers.includes(userId || '') && (
                          <View style={[styles.organizerBadge, {
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.1)" : "rgba(55, 164, 200, 0.2)",
                          }]}>
                            <MaterialIcons name="verified" size={moderateScale(12)} color="#37a4c8" />
                          </View>
                        )}
                      </View>

                      <Text style={[styles.groupDescription, { color: theme === "light" ? "#64748b" : "#94a3b8" }]} numberOfLines={2}>
                        {group.description}
                      </Text>

                      <View style={styles.groupMeta}>
                        <View style={[styles.metaBadge, {
                          backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.12)",
                        }]}>
                          <MaterialIcons name="people" size={moderateScale(14)} color="#37a4c8" />
                          <Text style={[styles.metaText, { color: theme === "light" ? "#64748b" : "#94a3b8" }]}>
                            {group.memberCount}
                          </Text>
                        </View>

                        {group.visibility === 'private' && (
                          <View style={[styles.metaBadge, {
                            backgroundColor: theme === "light" ? "rgba(239, 68, 68, 0.08)" : "rgba(239, 68, 68, 0.12)",
                          }]}>
                            <MaterialIcons name="lock" size={moderateScale(14)} color={theme === "light" ? "#dc2626" : "#ef4444"} />
                          </View>
                        )}

                        {group.category && (
                          <View style={[styles.categoryBadge, {
                            backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.12)",
                          }]}>
                            <Text style={[styles.categoryText, { color: "#37a4c8" }]}>
                              {group.category}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Chevron */}
                    <MaterialIcons name="chevron-right" size={moderateScale(22)} color={theme === "light" ? "#cbd5e1" : "#475569"} />
                  </TouchableOpacity>
                ))}
              </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, {
                backgroundColor: theme === "light" ? "rgba(55, 164, 200, 0.08)" : "rgba(55, 164, 200, 0.12)",
              }]}>
                <MaterialIcons name="groups" size={moderateScale(64)} color="#37a4c8" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme === "light" ? "#1e293b" : "#f1f5f9" }]}>
                No Groups Yet
              </Text>
              <Text style={[styles.emptyDescription, { color: theme === "light" ? "#64748b" : "#94a3b8" }]}>
                You haven't joined any groups yet. Create your first group or discover existing ones!
              </Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity
                  style={[styles.emptyActionButton, styles.primaryAction, {
                    backgroundColor: "#37a4c8",
                  }]}
                  onPress={handleExploreGroups}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="explore" size={moderateScale(20)} color="#ffffff" />
                  <Text style={styles.primaryActionText}>
                    Explore Groups
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
};

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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  pageTitle: {
    fontSize: scaleFontSize(28),
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '500',
  },
  createButtonCompact: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.25,
    shadowRadius: spacing.sm,
    elevation: 6,
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
  groupInfo: {
    flex: 1,
    marginLeft: moderateScale(14),
    gap: moderateScale(7),
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  groupName: {
    fontSize: scaleFontSize(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  organizerBadge: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingVertical: scaleHeight(80),
    paddingHorizontal: moderateScale(32),
  },
  emptyIconContainer: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(28),
  },
  emptyTitle: {
    fontSize: scaleFontSize(24),
    fontWeight: '800',
    marginBottom: spacing.md,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyDescription: {
    fontSize: scaleFontSize(15),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: scaleFontSize(22),
    marginBottom: moderateScale(32),
    maxWidth: scaleWidth(280),
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    maxWidth: scaleWidth(320),
  },
  emptyActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(14),
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  primaryAction: {
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: spacing.sm,
    elevation: 4,
  },
  primaryActionText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryAction: {
    borderWidth: 1.5,
  },
  secondaryActionText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
  },
});

export default MyGroupsScreen;

