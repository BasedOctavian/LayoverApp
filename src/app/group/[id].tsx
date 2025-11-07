import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Animated,
  RefreshControl,
  Share,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { ThemeContext } from '../../context/ThemeContext';
import useAuth from '../../hooks/auth';
import useGroups from '../../hooks/useGroups';
import { Group, GROUP_CATEGORIES } from '../../types/groupTypes';
import PostsFeed from '../../components/group/PostsFeed';
import ProposalsFeed from '../../components/group/ProposalsFeed';
import CombinedActivityFeed from '../../components/group/CombinedActivityFeed';
import { generateGroupShareUrl } from '../../utils/externalRoutes';
import TopBar from '../../components/TopBar';
import useNotificationCount from '../../hooks/useNotificationCount';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../utils/responsive';

type TabType = 'activity' | 'info' | 'manage';
type ActivitySubTab = 'feed' | 'favorites';
type InfoSubTab = 'about' | 'members';
type ManageSubTab = 'requests' | 'settings';

export default function GroupProfile() {
  const { id } = useLocalSearchParams();
  const groupId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user, userId } = useAuth();
  const { theme } = React.useContext(ThemeContext);
  const {
    getGroup,
    getGroupMembers,
    joinGroup,
    leaveGroup,
    cancelJoinRequest,
    getJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    deleteGroup,
    inviteToGroup,
    promoteToOrganizer,
    removeMember,
    transferAdmin,
    updateGroup,
  } = useGroups();
  const notificationCount = useNotificationCount(userId);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [activeActivitySubTab, setActiveActivitySubTab] = useState<ActivitySubTab>('feed');
  const [activeInfoSubTab, setActiveInfoSubTab] = useState<InfoSubTab>('about');
  const [activeManageSubTab, setActiveManageSubTab] = useState<ManageSubTab>('settings');
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [hasRequestedToJoin, setHasRequestedToJoin] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Edit Group Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRules, setEditRules] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Privacy Settings Modal State
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyIsPrivate, setPrivacyIsPrivate] = useState(false);
  const [privacyVisibility, setPrivacyVisibility] = useState<'public' | 'private'>('public');
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const tabScale = useRef(new Animated.Value(1)).current;
  
  // Haptic feedback helper
  const triggerHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS !== 'web') {
      switch (style) {
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
  }, []);

  // Check if current user is member/organizer
  const isMember = group?.members.includes(user?.uid || '') || false;
  const isOrganizer = group?.organizers.includes(user?.uid || '') || false;
  const isCreator = group?.creatorId === user?.uid;

  // Fetch group data
  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;
    
    // Don't fetch if user is not authenticated (e.g., during logout)
    if (!user) {
      return;
    }

    try {
      const groupData = await getGroup(groupId);
      if (groupData) {
        setGroup(groupData);
        
        const membersData = await getGroupMembers(groupId);
        setMembers(membersData);
        
        // Only load join requests if user is the admin/creator
        if (user?.uid && groupData.creatorId === user.uid) {
          const requests = await getJoinRequests(groupId);
          setJoinRequests(requests);
        }
        
        // Check if current user has a pending join request
        if (user?.uid && groupData.requiresApproval && !groupData.members.includes(user.uid)) {
          const requests = await getJoinRequests(groupId);
          const userRequest = requests.find(r => r.userId === user.uid && r.status === 'pending');
          setHasRequestedToJoin(!!userRequest);
        }
      } else {
        // Only show error if user is still authenticated
        if (user) {
          Alert.alert('Error', 'Group not found');
          router.back();
        }
      }
    } catch (err) {
      console.error('Error fetching group:', err);
      // Only show error if user is still authenticated
      if (user) {
        Alert.alert('Error', 'Failed to load group');
      }
    } finally {
      setInitialLoading(false);
    }
  }, [groupId, user]);

  // Set initial load complete when data is ready
  useEffect(() => {
    if (!initialLoading && group) {
      setInitialLoadComplete(true);
    }
  }, [initialLoading, group]);

  // Trigger bounce animation when loading completes
  useEffect(() => {
    if (!initialLoading && initialLoadComplete) {
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
  }, [initialLoading, initialLoadComplete, contentBounceAnim, contentScaleAnim]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);


  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic('light');
    await fetchGroupData();
    triggerHaptic('light');
    setRefreshing(false);
  }, [fetchGroupData, triggerHaptic]);

  const handleJoinLeave = useCallback(async () => {
    if (!group || !user) return;

    setActionLoading(true);
    try {
      if (isMember) {
        const success = await leaveGroup(groupId, user.uid);
        if (success) {
          await fetchGroupData();
        }
      } else if (hasRequestedToJoin) {
        Alert.alert(
          'Cancel Request',
          'Are you sure you want to cancel your request to join this group?',
          [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                const success = await cancelJoinRequest(groupId, user.uid);
                if (success) {
                  setHasRequestedToJoin(false);
                  await fetchGroupData();
                  Alert.alert('Request Canceled', 'Your join request has been canceled.');
                }
              }
            }
          ]
        );
        setActionLoading(false);
        return;
      } else {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        const success = await joinGroup(
          groupId, 
          user.uid, 
          userData?.name || user.displayName || 'User',
          userData?.profilePicture,
          undefined
        );
        
        if (success) {
          if (group.requiresApproval) {
            setHasRequestedToJoin(true);
          }
          await fetchGroupData();
        }
      }
    } catch (err) {
      console.error('Error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }, [group, user, isMember, hasRequestedToJoin, groupId, fetchGroupData, cancelJoinRequest]);

  const handleShare = useCallback(async () => {
    if (!group || !groupId) return;
    triggerHaptic('light');
    try {
      const deepLink = generateGroupShareUrl(groupId);
      const shareMessage = `Check out ${group.name} on Wingman!\n\n${group.description}\n\nJoin here: ${deepLink}`;
      
      await Share.share({
        message: shareMessage,
        title: `Join ${group.name} on Wingman`,
        url: deepLink,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }, [group, groupId, triggerHaptic]);

  const handleBack = useCallback(() => {
    triggerHaptic('light');
    router.back();
  }, [router, triggerHaptic]);

  const handleLeaveGroup = useCallback(async () => {
    if (!group || !user) return;
    
    triggerHaptic('medium');
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave ${group.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const success = await leaveGroup(groupId, user.uid);
              if (success) {
                triggerHaptic('heavy');
                Alert.alert('Left Group', `You have left ${group.name}`);
                router.back();
              }
            } catch (err) {
              console.error('Error leaving group:', err);
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  }, [group, user, groupId, leaveGroup, triggerHaptic, router]);

  const handleInviteMember = useCallback(async () => {
    if (!inviteEmail.trim() || !user) return;
    
    setInviting(true);
    triggerHaptic('light');
    
    try {
      const success = await inviteToGroup(groupId, inviteEmail.trim(), user.uid);
      if (success) {
        triggerHaptic('heavy');
        Alert.alert('Invitation Sent', `Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setShowInviteModal(false);
      }
    } catch (err) {
      console.error('Error inviting member:', err);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, user, groupId, inviteToGroup, triggerHaptic]);

  const handleTransferAdmin = useCallback(async (memberId: string, memberName: string) => {
    if (!user || !group) return;
    
    triggerHaptic('medium');
    Alert.alert(
      '⚠️ Transfer Admin Rights',
      `Are you sure you want to transfer admin rights to ${memberName}?\n\nYou will lose all admin privileges and ${memberName} will become the new admin of this group.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer Admin',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('heavy');
              const success = await transferAdmin(groupId, memberId, user.uid);
              if (success) {
                Alert.alert(
                  'Admin Transferred', 
                  `${memberName} is now the admin of this group.`,
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        fetchGroupData();
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', 'Failed to transfer admin rights. Please try again.');
              }
            } catch (err) {
              console.error('Error transferring admin:', err);
              Alert.alert('Error', 'Failed to transfer admin rights. Please try again.');
            }
          }
        }
      ]
    );
  }, [user, group, groupId, triggerHaptic, fetchGroupData, transferAdmin]);

  const handleRemoveMember = useCallback(async (memberId: string, memberName: string) => {
    if (!user || !group) return;
    
    triggerHaptic('medium');
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('heavy');
              const success = await removeMember(groupId, memberId, user.uid);
              if (success) {
                Alert.alert('Member Removed', `${memberName} has been removed from the group.`);
                await fetchGroupData();
              } else {
                Alert.alert('Error', 'Failed to remove member. Please try again.');
              }
            } catch (err) {
              console.error('Error removing member:', err);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            }
          }
        }
      ]
    );
  }, [user, group, groupId, triggerHaptic, fetchGroupData, removeMember]);

  // Handle opening edit modal
  const handleOpenEditModal = useCallback(() => {
    if (!group) return;
    triggerHaptic('light');
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditLocation(group.location || '');
    setEditRules(group.rules || '');
    setEditCategory(group.category || '');
    setShowEditModal(true);
  }, [group, triggerHaptic]);

  // Handle saving edited group details
  const handleSaveEdit = useCallback(async () => {
    if (!group || !editName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    setSavingEdit(true);
    triggerHaptic('medium');

    try {
      // Build update object, only including fields that have values
      const updates: any = {
        name: editName.trim(),
        description: editDescription.trim() || '',
        category: editCategory || group.category,
      };

      // Only include location if it has a value
      if (editLocation.trim()) {
        updates.location = editLocation.trim();
      }

      // Only include rules if it has a value
      if (editRules.trim()) {
        updates.rules = editRules.trim();
      }

      const success = await updateGroup(groupId, updates);

      if (success) {
        triggerHaptic('heavy');
        setShowEditModal(false);
        await fetchGroupData();
        Alert.alert('Success', 'Group details updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update group details');
      }
    } catch (err) {
      console.error('Error updating group:', err);
      Alert.alert('Error', 'Failed to update group details. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  }, [group, groupId, editName, editDescription, editLocation, editRules, editCategory, updateGroup, triggerHaptic, fetchGroupData]);

  // Handle opening privacy modal
  const handleOpenPrivacyModal = useCallback(() => {
    if (!group) return;
    triggerHaptic('light');
    setPrivacyIsPrivate(group.isPrivate);
    setPrivacyVisibility(group.visibility || 'public');
    setShowPrivacyModal(true);
  }, [group, triggerHaptic]);

  // Handle saving privacy settings
  const handleSavePrivacy = useCallback(async () => {
    if (!group) return;

    setSavingPrivacy(true);
    triggerHaptic('medium');

    try {
      // Private groups always require approval (join requests, not invites)
      const finalRequiresApproval = privacyIsPrivate ? true : false;
      
      const success = await updateGroup(groupId, {
        isPrivate: privacyIsPrivate,
        requiresApproval: finalRequiresApproval,
        visibility: privacyVisibility,
      });

      if (success) {
        triggerHaptic('heavy');
        setShowPrivacyModal(false);
        await fetchGroupData();
        Alert.alert('Success', 'Privacy settings updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update privacy settings');
      }
    } catch (err) {
      console.error('Error updating privacy:', err);
      Alert.alert('Error', 'Failed to update privacy settings. Please try again.');
    } finally {
      setSavingPrivacy(false);
    }
  }, [group, groupId, privacyIsPrivate, privacyVisibility, updateGroup, triggerHaptic, fetchGroupData]);
  
  // Handle tab change with animation
  const handleTabChange = useCallback((newTab: TabType) => {
    if (newTab === activeTab) return;
    
    triggerHaptic('light');
    
    // Animate tab transition
    Animated.sequence([
      Animated.timing(tabScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(tabScale, {
        toValue: 1,
        tension: 100,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    setActiveTab(newTab);
  }, [activeTab, triggerHaptic, tabScale]);

  // Loading screen
  if (initialLoading || !initialLoadComplete || !group) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme === 'light' ? '#f8f9fa' : '#0a0a0a' }]} edges={['bottom']}>
        <LinearGradient 
          colors={theme === 'light' ? ['#f8f9fa', '#ffffff'] : ['#000000', '#1a1a1a']} 
          style={styles.flex}
        />
      </SafeAreaView>
    );
  }

  // Main tabs - simplified structure
  const tabs = [
    { key: 'activity' as TabType, label: 'Activity', icon: 'dynamic-feed' },
    { key: 'info' as TabType, label: 'Info', icon: 'info-outline' },
    ...(isMember ? [
      { key: 'manage' as TabType, label: isCreator ? 'Manage' : 'Settings', icon: isCreator ? 'admin-panel-settings' : 'settings', badge: isCreator ? joinRequests.length : undefined }
    ] : [])
  ];

  // Activity subtabs
  const activitySubTabs = [
    { key: 'feed' as ActivitySubTab, label: 'Feed', icon: 'dynamic-feed' },
    ...(isMember ? [
      { key: 'favorites' as ActivitySubTab, label: 'Favorites', icon: 'bookmark' }
    ] : [])
  ];

  // Info subtabs
  const infoSubTabs = [
    { key: 'about' as InfoSubTab, label: 'About', icon: 'info' },
    { key: 'members' as InfoSubTab, label: 'Members', icon: 'people' },
  ];

  // Manage subtabs (for admin)
  const manageSubTabs = isCreator ? [
    { key: 'requests' as ManageSubTab, label: 'Requests', icon: 'group-add', badge: joinRequests.length },
    { key: 'settings' as ManageSubTab, label: 'Settings', icon: 'settings' },
  ] : [
    { key: 'settings' as ManageSubTab, label: 'Settings', icon: 'settings' },
  ];

  const renderSubTabBar = () => {
    let subTabs: any[] = [];
    let activeSubTab: string = '';
    let onSubTabChange: (key: string) => void = () => {};

    if (activeTab === 'activity') {
      subTabs = activitySubTabs;
      activeSubTab = activeActivitySubTab;
      onSubTabChange = (key) => {
        triggerHaptic('light');
        setActiveActivitySubTab(key as ActivitySubTab);
      };
    } else if (activeTab === 'info') {
      subTabs = infoSubTabs;
      activeSubTab = activeInfoSubTab;
      onSubTabChange = (key) => {
        triggerHaptic('light');
        setActiveInfoSubTab(key as InfoSubTab);
      };
    } else if (activeTab === 'manage') {
      subTabs = manageSubTabs;
      activeSubTab = activeManageSubTab;
      onSubTabChange = (key) => {
        triggerHaptic('light');
        setActiveManageSubTab(key as ManageSubTab);
      };
    }

    // Always return a container, even if empty, for consistent sticky header indices
    return (
      <View style={[styles.subTabBar, {
        backgroundColor: theme === 'light' ? '#F8FAFC' : '#000000',
        borderBottomColor: theme === 'light' ? '#e2e8f0' : '#334155',
        height: subTabs.length === 0 ? 0 : undefined,
        overflow: subTabs.length === 0 ? 'hidden' : 'visible',
      }]}>
        {subTabs.length > 0 && (
        <View style={styles.subTabBarContent}>
          {subTabs.map((subTab) => (
            <TouchableOpacity
              key={subTab.key}
              style={[
                styles.subTabItem,
                {
                  backgroundColor: activeSubTab === subTab.key 
                    ? (theme === 'light' ? 'rgba(55, 164, 200, 0.12)' : 'rgba(55, 164, 200, 0.18)')
                    : (theme === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.03)')
                },
                activeSubTab === subTab.key && styles.subTabItemActive
              ]}
              onPress={() => onSubTabChange(subTab.key)}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={subTab.icon as any}
                size={moderateScale(18)} 
                color={activeSubTab === subTab.key ? '#37a4c8' : (theme === 'light' ? '#94a3b8' : '#64748b')} 
              />
              <Text style={[
                styles.subTabLabel,
                {
                  color: activeSubTab === subTab.key 
                    ? '#37a4c8' 
                    : theme === 'light' ? '#94a3b8' : '#64748b'
                }
              ]}>
                {subTab.label}
              </Text>
              {subTab.badge !== undefined && subTab.badge > 0 && (
                <View style={[styles.subBadge, {
                  backgroundColor: '#ef4444',
                }]}>
                  <Text style={styles.subBadgeText}>{subTab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        )}
      </View>
    );
  };

  const renderTabBar = () => (
    <View style={[styles.tabBar, {
      backgroundColor: theme === 'light' ? '#F8FAFC' : '#000000',
      borderBottomColor: theme === 'light' ? '#e2e8f0' : '#334155',
    }]}>
      <View style={styles.tabBarContent}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              activeTab === tab.key && styles.tabItemActive
            ]}
            onPress={() => handleTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={tab.icon as any}
              size={moderateScale(22)} 
              color={activeTab === tab.key ? '#37a4c8' : (theme === 'light' ? '#64748b' : '#94a3b8')} 
            />
            <Text style={[
              styles.tabLabel,
              {
                color: activeTab === tab.key 
                  ? '#37a4c8' 
                  : (theme === 'light' ? '#64748b' : '#94a3b8'),
              }
            ]}>
              {tab.label}
            </Text>
            {tab.badge !== undefined && tab.badge > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderGroupHeader = () => (
    <Animated.View style={[
      styles.groupHeader, 
      {
        backgroundColor: theme === 'light' ? '#F8FAFC' : '#000000',
        borderBottomColor: theme === 'light' ? '#e2e8f0' : '#334155',
        transform: [{ scale: headerScale }],
      }
    ]}>
      <View style={styles.groupHeaderContent}>
        {/* Group Avatar */}
        {group.groupImage ? (
          <Image source={{ uri: group.groupImage }} style={styles.groupAvatar} />
        ) : (
          <View style={[styles.groupAvatarPlaceholder, {
            backgroundColor: theme === 'light' ? '#f1f5f9' : '#1a1a1a',
          }]}>
            <MaterialIcons name="groups" size={moderateScale(32)} color="#37a4c8" />
          </View>
        )}

        {/* Group Info */}
        <View style={styles.groupHeaderInfo}>
          <Text style={[styles.groupHeaderName, {
            color: theme === 'light' ? '#0f172a' : '#f8fafc',
          }]} numberOfLines={2}>
            {group.name}
          </Text>
          <View style={styles.groupHeaderMeta}>
            <MaterialIcons name="people" size={moderateScale(16)} color={theme === 'light' ? '#64748b' : '#94a3b8'} />
            <Text style={[styles.groupHeaderMembers, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
            </Text>
            {group.isPrivate && (
              <>
                <MaterialIcons name="fiber-manual-record" size={moderateScale(6)} color={theme === 'light' ? '#cbd5e1' : '#3f3f46'} />
                <MaterialIcons name="lock" size={moderateScale(14)} color={theme === 'light' ? '#64748b' : '#94a3b8'} />
                <Text style={[styles.groupHeaderPrivate, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Private
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.groupHeaderActions}>
          {isMember && (
            <TouchableOpacity
              style={[styles.headerChatButton, { backgroundColor: '#37a4c8' }]}
              onPress={() => {
                triggerHaptic('medium');
                router.push(`/group/chat/${groupId}`);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chat-bubble" size={moderateScale(20)} color="#ffffff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.headerShareButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <MaterialIcons name="share" size={moderateScale(22)} color={theme === 'light' ? '#64748b' : '#94a3b8'} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'activity':
        switch (activeActivitySubTab) {
          case 'feed':
            return (
              <View style={styles.feedContainer}>
                <CombinedActivityFeed 
                  groupId={groupId} 
                  isOrganizer={isCreator} 
                  isMember={isMember}
                  group={group ? { requiresApproval: group.requiresApproval, name: group.name } : undefined}
                  onJoin={handleJoinLeave}
                  hasRequestedToJoin={hasRequestedToJoin}
                />
              </View>
            );
          
          case 'favorites':
            return (
              <View style={styles.feedContainer}>
                <PostsFeed 
                  groupId={groupId} 
                  isOrganizer={isCreator} 
                  isMember={isMember}
                  favoritesOnly={true}
                  currentUserId={user?.uid}
                />
              </View>
            );
          
          default:
            return null;
        }
      
      case 'info':
        switch (activeInfoSubTab) {
          case 'about':
            return (
              <View style={styles.container}>
            <View style={[styles.contentSection, {
              backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            }]}>
              {group.category && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="category" size={moderateScale(20)} color="#37a4c8" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Category
                  </Text>
                  <Text style={[styles.infoValue, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    {group.category.charAt(0).toUpperCase() + group.category.slice(1)}
                  </Text>
                </View>
              </View>
            )}

            {group.location && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="location-on" size={moderateScale(20)} color="#37a4c8" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Location
                  </Text>
                  <Text style={[styles.infoValue, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    {group.location}
                  </Text>
                </View>
              </View>
            )}

            {group.tags && group.tags.length > 0 && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="local-offer" size={moderateScale(20)} color="#37a4c8" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Interests
                  </Text>
                  <View style={styles.tagsContainer}>
                    {group.tags.map((tag, index) => (
                      <View key={index} style={[styles.tag, {
                        backgroundColor: theme === 'light' ? '#e0f2fe' : '#0c4a6e',
                      }]}>
                        <Text style={[styles.tagText, { color: '#0284c7' }]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {group.rules && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <MaterialIcons name="gavel" size={moderateScale(20)} color="#37a4c8" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Rules
                  </Text>
                  <Text style={[styles.rulesText, {
                    color: theme === 'light' ? '#475569' : '#94a3b8',
                  }]}>
                    {group.rules}
                  </Text>
                </View>
              </View>
            )}
            </View>
              </View>
            );
          
          case 'members':
            return (
          <View style={styles.container}>
            <View style={[styles.contentSection, {
              backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            }]}>
              {members.length > 0 ? (
              members.map((member, index) => {
                  const memberId = member.id || member.userId;
                  const isAdmin = memberId === group.creatorId;
                  const isOrganizer = group.organizers?.includes(memberId) && !isAdmin;
                  const isCurrentUser = memberId === user?.uid;
                  const canTransfer = isCreator && !isAdmin && !isCurrentUser;
                  const canRemove = (isCreator || isOrganizer) && !isAdmin && !isCurrentUser;
                
                return (
                  <View
                    key={memberId || index}
                    style={[styles.memberCard, {
                      backgroundColor: isAdmin 
                        ? (theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)')
                        : (theme === 'light' ? '#ffffff' : '#1a1a1a'),
                      borderColor: isAdmin
                        ? '#37a4c8'
                        : (theme === 'light' ? '#e2e8f0' : '#334155'),
                      borderWidth: isAdmin ? 2 : 1,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 2,
                    }]}
                  >
                    <TouchableOpacity
                      style={styles.memberCardContent}
                      onPress={() => router.push(`/profile/${memberId}`)}
                      activeOpacity={0.7}
                    >
                      {member.profilePicture ? (
                        <Image source={{ uri: member.profilePicture }} style={styles.memberAvatar} />
                      ) : (
                        <View style={[styles.memberAvatarPlaceholder, {
                          backgroundColor: theme === 'light' ? '#e2e8f0' : '#334155',
                        }]}>
                          <MaterialIcons name="person" size={moderateScale(24)} color="#37a4c8" />
                        </View>
                      )}
                      <View style={styles.memberInfo}>
                        <View style={styles.memberNameRow}>
                          <Text style={[styles.memberName, {
                            color: theme === 'light' ? '#0f172a' : '#f8fafc',
                            fontWeight: isAdmin ? '700' : '600',
                          }]}>
                            {member.name || 'Member'}
                          </Text>
                          {isCurrentUser && (
                            <Text style={[styles.youLabel, {
                              color: theme === 'light' ? '#64748b' : '#94a3b8',
                            }]}>
                              (You)
                            </Text>
                          )}
                        </View>
                        <View style={styles.memberBadges}>
                          {isAdmin && (
                            <View style={[styles.adminBadge, {
                              backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.15)' : 'rgba(55, 164, 200, 0.2)',
                            }]}>
                              <MaterialIcons name="shield" size={moderateScale(14)} color="#37a4c8" />
                              <Text style={[styles.adminText, { color: '#37a4c8' }]}>
                                Admin
                              </Text>
                            </View>
                          )}
                          {isOrganizer && !isAdmin && (
                            <View style={[styles.organizerBadge, {
                              backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                            }]}>
                              <MaterialIcons name="star" size={moderateScale(14)} color="#37a4c8" />
                              <Text style={[styles.organizerText, { color: '#37a4c8' }]}>
                                Organizer
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <MaterialIcons 
                        name="chevron-right" 
                        size={moderateScale(20)} 
                        color={theme === 'light' ? '#cbd5e1' : '#3f3f46'} 
                      />
                    </TouchableOpacity>
                    
                    {(canTransfer || canRemove) && (
                      <View style={[styles.memberActions, {
                        borderTopColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.1)',
                      }]}>
                        {canTransfer && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.transferButton, {
                              backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.15)' : 'rgba(55, 164, 200, 0.2)',
                            }]}
                            onPress={() => {
                              triggerHaptic('medium');
                              handleTransferAdmin(memberId, member.name || 'Member');
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="shield" size={moderateScale(16)} color="#37a4c8" />
                            <Text style={[styles.actionButtonText, { color: '#37a4c8' }]}>
                              Transfer Admin
                            </Text>
                          </TouchableOpacity>
                        )}
                        {canRemove && (
                          <TouchableOpacity
                            style={[styles.actionButton, styles.removeButton, {
                              backgroundColor: theme === 'light' ? '#fee2e2' : '#7f1d1d',
                            }]}
                            onPress={() => {
                              triggerHaptic('medium');
                              handleRemoveMember(memberId, member.name || 'Member');
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="person-remove" size={moderateScale(16)} color="#ef4444" />
                            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                              Remove
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={moderateScale(48)} color="#94a3b8" />
                <Text style={[styles.emptyStateText, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  No members yet
                </Text>
              </View>
            )}
            </View>
              </View>
            );
          
          default:
            return null;
        }
      
      case 'manage':
        switch (activeManageSubTab) {
          case 'requests':
            return (
          <View style={styles.container}>
            <View style={[styles.contentSection, {
              backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            }]}>
              {joinRequests.length > 0 ? (
              joinRequests.map((request) => (
                <View
                  key={request.id}
                  style={[styles.requestCard, {
                    backgroundColor: theme === 'light' ? '#fafafa' : '#1a1a1a',
                    borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
                  }]}
                >
                  <TouchableOpacity
                    style={styles.requestUserSection}
                    onPress={() => router.push(`/profile/${request.userId}`)}
                  >
                    {request.userProfilePicture ? (
                      <Image source={{ uri: request.userProfilePicture }} style={styles.requestAvatar} />
                    ) : (
                      <View style={[styles.requestAvatarPlaceholder, {
                        backgroundColor: theme === 'light' ? '#e2e8f0' : '#334155',
                      }]}>
                        <MaterialIcons name="person" size={moderateScale(24)} color="#37a4c8" />
                      </View>
                    )}
                    <View style={styles.requestInfo}>
                      <Text style={[styles.requestName, {
                        color: theme === 'light' ? '#0f172a' : '#f8fafc',
                      }]}>
                        {request.userName || 'User'}
                      </Text>
                      {request.message && (
                        <Text style={[styles.requestMessage, {
                          color: theme === 'light' ? '#64748b' : '#94a3b8',
                        }]}>
                          {request.message}
                        </Text>
                      )}
                      <Text style={[styles.requestDate, {
                        color: theme === 'light' ? '#94a3b8' : '#52525b',
                      }]}>
                        {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString() : 'Recently'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.requestActionBtn, { backgroundColor: '#10b981' }]}
                      onPress={async () => {
                        triggerHaptic('medium');
                        const success = await approveJoinRequest(request.id, groupId, request.userId, user?.uid);
                        if (success) {
                          triggerHaptic('heavy');
                          Alert.alert('Success', `${request.userName} has been added to the group!`);
                          await fetchGroupData();
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="check" size={moderateScale(20)} color="#ffffff" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.requestActionBtn, { backgroundColor: '#ef4444' }]}
                      onPress={() => {
                        triggerHaptic('medium');
                        Alert.alert(
                          'Reject Request',
                          `Reject ${request.userName}'s request to join?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Reject',
                              style: 'destructive',
                              onPress: async () => {
                                triggerHaptic('heavy');
                                const success = await rejectJoinRequest(request.id, groupId, request.userId);
                                if (success) {
                                  await fetchGroupData();
                                }
                              }
                            }
                          ]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="close" size={moderateScale(20)} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <MaterialIcons name="inbox" size={moderateScale(48)} color="#94a3b8" />
                <Text style={[styles.emptyStateText, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  No pending requests
                </Text>
              </View>
            )}
            </View>
              </View>
            );
          
          case 'settings':
            return (
          <View style={styles.container}>
            <View style={[styles.contentSection, {
              backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            }]}>
              {/* Admin Settings - Only visible to group creator/admin */}
              {isCreator && (
                <View style={[styles.settingsGroup, {
                  backgroundColor: theme === 'light' ? '#fafafa' : '#18181b',
                  borderColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                }]}>
                  <View style={styles.settingsGroupHeader}>
                    <View style={[styles.settingsGroupIconContainer, {
                      backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                    }]}>
                      <MaterialIcons name="admin-panel-settings" size={moderateScale(18)} color="#37a4c8" />
                    </View>
                    <Text style={[styles.settingsGroupTitle, {
                      color: theme === 'light' ? '#0f172a' : '#f8fafc',
                    }]}>
                      Admin Settings
                    </Text>
                  </View>

                  <View style={styles.settingsItemsContainer}>
                    <TouchableOpacity
                      style={[styles.settingsItem, {
                        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
                        borderBottomColor: theme === 'light' ? '#e2e8f0' : '#334155',
                      }]}
                      onPress={handleOpenEditModal}
                      activeOpacity={0.7}
                    >
                      <View style={styles.settingsItemLeft}>
                        <View style={[styles.settingsItemIconContainer, {
                          backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                        }]}>
                          <MaterialIcons name="edit" size={moderateScale(18)} color="#37a4c8" />
                        </View>
                        <View style={styles.settingsItemTextContainer}>
                          <Text style={[styles.settingsItemText, {
                            color: theme === 'light' ? '#0f172a' : '#f8fafc',
                          }]}>
                            Edit Group Details
                          </Text>
                          <Text style={[styles.settingsItemDescription, {
                            color: theme === 'light' ? '#64748b' : '#94a3b8',
                          }]}>
                            Update name, description, and rules
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons 
                        name="chevron-right" 
                        size={moderateScale(20)} 
                        color={theme === 'light' ? '#cbd5e1' : '#3f3f46'} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.settingsItem, {
                        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
                        borderBottomColor: theme === 'light' ? '#e2e8f0' : '#334155',
                      }]}
                      onPress={handleOpenPrivacyModal}
                      activeOpacity={0.7}
                    >
                      <View style={styles.settingsItemLeft}>
                        <View style={[styles.settingsItemIconContainer, {
                          backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                        }]}>
                          <MaterialIcons name="lock" size={moderateScale(18)} color="#37a4c8" />
                        </View>
                        <View style={styles.settingsItemTextContainer}>
                          <Text style={[styles.settingsItemText, {
                            color: theme === 'light' ? '#0f172a' : '#f8fafc',
                          }]}>
                            Privacy Settings
                          </Text>
                          <Text style={[styles.settingsItemDescription, {
                            color: theme === 'light' ? '#64748b' : '#94a3b8',
                          }]}>
                            {group.isPrivate ? 'Private' : 'Public'} • {group.isPrivate ? 'Approval required' : 'Open to all'}
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons 
                        name="chevron-right" 
                        size={moderateScale(20)} 
                        color={theme === 'light' ? '#cbd5e1' : '#3f3f46'} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.settingsItem, {
                        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
                      }]}
                      onPress={() => {
                        triggerHaptic('light');
                        handleTabChange('info');
                        setActiveInfoSubTab('members');
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.settingsItemLeft}>
                        <View style={[styles.settingsItemIconContainer, {
                          backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                        }]}>
                          <MaterialIcons name="people" size={moderateScale(18)} color="#37a4c8" />
                        </View>
                        <View style={styles.settingsItemTextContainer}>
                          <Text style={[styles.settingsItemText, {
                            color: theme === 'light' ? '#0f172a' : '#f8fafc',
                          }]}>
                            Manage Members
                          </Text>
                          <Text style={[styles.settingsItemDescription, {
                            color: theme === 'light' ? '#64748b' : '#94a3b8',
                          }]}>
                            View and manage group members
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons 
                        name="chevron-right" 
                        size={moderateScale(20)} 
                        color={theme === 'light' ? '#cbd5e1' : '#3f3f46'} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Member Actions (Available to all members) */}
              {isMember && !isCreator && (
                <View style={[styles.settingsGroup, styles.dangerZone, {
                  borderColor: theme === 'light' ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.3)',
                }]}>
                  <View style={styles.settingsGroupHeader}>
                    <View style={[styles.settingsGroupIconContainer, {
                      backgroundColor: theme === 'light' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.15)',
                    }]}>
                      <MaterialIcons name="exit-to-app" size={moderateScale(18)} color="#dc2626" />
                    </View>
                    <Text style={[styles.settingsGroupTitle, { color: '#dc2626' }]}>
                      Member Actions
                    </Text>
                  </View>

                  <View style={styles.settingsItemsContainer}>
                    <TouchableOpacity
                      style={[styles.settingsItem, {
                        backgroundColor: theme === 'light' ? 'rgba(220, 38, 38, 0.03)' : 'rgba(220, 38, 38, 0.05)',
                      }]}
                      onPress={handleLeaveGroup}
                      disabled={actionLoading}
                      activeOpacity={0.7}
                    >
                      <View style={styles.settingsItemLeft}>
                        <View style={[styles.settingsItemIconContainer, {
                          backgroundColor: theme === 'light' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.15)',
                        }]}>
                          <MaterialIcons name="exit-to-app" size={moderateScale(18)} color="#dc2626" />
                        </View>
                        <View style={styles.settingsItemTextContainer}>
                          <Text style={[styles.settingsItemText, { color: '#dc2626' }]}>
                            Leave Group
                          </Text>
                          <Text style={[styles.settingsItemDescription, {
                            color: theme === 'light' ? '#b91c1c' : '#f87171',
                          }]}>
                            You can rejoin later if approved
                          </Text>
                        </View>
                      </View>
                      {actionLoading ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <MaterialIcons name="chevron-right" size={moderateScale(20)} color="#dc2626" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Creator Danger Zone */}
              {isCreator && (
                <View style={[styles.settingsGroup, styles.dangerZone, {
                  borderColor: theme === 'light' ? 'rgba(220, 38, 38, 0.2)' : 'rgba(220, 38, 38, 0.3)',
                }]}>
                  <View style={styles.settingsGroupHeader}>
                    <View style={[styles.settingsGroupIconContainer, {
                      backgroundColor: theme === 'light' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.15)',
                    }]}>
                      <MaterialIcons name="warning" size={moderateScale(18)} color="#dc2626" />
                    </View>
                    <Text style={[styles.settingsGroupTitle, { color: '#dc2626' }]}>
                      Danger Zone
                    </Text>
                  </View>

                  <View style={styles.settingsItemsContainer}>
                    <TouchableOpacity
                      style={[styles.settingsItem, {
                        backgroundColor: theme === 'light' ? 'rgba(220, 38, 38, 0.03)' : 'rgba(220, 38, 38, 0.05)',
                      }]}
                      onPress={() => {
                        triggerHaptic('medium');
                        Alert.alert(
                          'Delete Group',
                          'Are you sure you want to delete this group? This action cannot be undone.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                const success = await deleteGroup(groupId);
                                if (success) {
                                  Alert.alert('Group Deleted', 'The group has been permanently deleted.');
                                  router.back();
                                }
                              },
                            },
                          ]
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.settingsItemLeft}>
                        <View style={[styles.settingsItemIconContainer, {
                          backgroundColor: theme === 'light' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(220, 38, 38, 0.15)',
                        }]}>
                          <MaterialIcons name="delete-forever" size={moderateScale(18)} color="#dc2626" />
                        </View>
                        <View style={styles.settingsItemTextContainer}>
                          <Text style={[styles.settingsItemText, { color: '#dc2626' }]}>
                            Delete Group
                          </Text>
                          <Text style={[styles.settingsItemDescription, {
                            color: theme === 'light' ? '#b91c1c' : '#f87171',
                          }]}>
                            Permanently delete this group and all its content
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons name="chevron-right" size={moderateScale(20)} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
              </View>
            );
          
          default:
            return null;
        }
      
      default:
        return null;
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme === "light" ? "#F8FAFC" : "#000000" }]}>
      <LinearGradient 
        colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} 
        style={styles.flex}
      >
        <SafeAreaView style={[styles.container, {
          backgroundColor: 'transparent',
        }]} edges={['bottom']}>
          <StatusBar 
            barStyle={theme === 'light' ? 'dark-content' : 'light-content'}
            backgroundColor="transparent"
            translucent
          />
          
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
          
          {/* Group Header - Fixed */}
          <Animated.View 
            style={[
              {
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
              }
            ]}
          >
            {renderGroupHeader()}
          </Animated.View>
          
          {/* Scrollable Content: Tabs + Content */}
          <Animated.ScrollView
            style={[
              styles.scrollContainer,
              {
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
              }
            ]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            stickyHeaderIndices={[0, 1]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#37a4c8"
                colors={['#37a4c8']}
              />
            }
          >
            {/* Tab Bar - Sticky */}
            {renderTabBar()}
            
            {/* Sub Tab Bar - Sticky */}
            {renderSubTabBar()}
            
            {/* Content */}
            <View style={styles.contentWrapper}>
              {renderContent()}
            </View>
          </Animated.ScrollView>
          
          {/* Fixed Create Button - Only show on activity feed */}
          {activeTab === 'activity' && activeActivitySubTab === 'feed' && isMember && (
            <TouchableOpacity
              style={[styles.fixedCreateButton, {
                backgroundColor: '#37a4c8',
              }]}
              onPress={() => {
                triggerHaptic('light');
                setShowCreateModal(true);
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={moderateScale(28)} color="#ffffff" />
            </TouchableOpacity>
          )}
          
          {/* Fixed Create Button - Only show on favorites */}
          {activeTab === 'activity' && activeActivitySubTab === 'favorites' && isMember && (
            <TouchableOpacity
              style={[styles.fixedCreateButton, {
                backgroundColor: '#37a4c8',
              }]}
              onPress={() => {
                triggerHaptic('light');
                router.push(`/group/post/create?groupId=${groupId}`);
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={moderateScale(28)} color="#ffffff" />
            </TouchableOpacity>
          )}
        </SafeAreaView>

        {/* Invite Member Modal */}
        <Modal
          visible={showInviteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInviteModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowInviteModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.inviteModal, {
                backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
              }]}>
              <View style={styles.inviteModalHeader}>
                <Text style={[styles.inviteModalTitle, {
                  color: theme === 'light' ? '#0f172a' : '#f8fafc',
                }]}>
                  Invite Member
                </Text>
                <TouchableOpacity
                  onPress={() => setShowInviteModal(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons 
                    name="close" 
                    size={moderateScale(24)} 
                    color={theme === 'light' ? '#64748b' : '#71717a'} 
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.inviteModalDescription, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                Enter the email address of the person you want to invite to {group?.name}
              </Text>

              <TextInput
                style={[styles.inviteInput, {
                  backgroundColor: theme === 'light' ? '#f8f9fa' : '#1a1a1a',
                  borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
                  color: theme === 'light' ? '#0f172a' : '#f8fafc',
                }]}
                placeholder="Email address"
                placeholderTextColor={theme === 'light' ? '#94a3b8' : '#52525b'}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.inviteModalActions}>
                <TouchableOpacity
                  style={[styles.inviteModalButton, styles.inviteModalButtonCancel, {
                    backgroundColor: theme === 'light' ? '#f1f5f9' : '#1a1a1a',
                  }]}
                  onPress={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.inviteModalButtonText, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inviteModalButton, styles.inviteModalButtonSend, {
                    opacity: !inviteEmail.trim() || inviting ? 0.5 : 1,
                  }]}
                  onPress={handleInviteMember}
                  disabled={!inviteEmail.trim() || inviting}
                  activeOpacity={0.7}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.inviteModalButtonTextSend}>
                      Send Invitation
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Group Details Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditModal(false)}
        >
          <View 
            style={styles.modalContainer}
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => e.stopPropagation()}
          >
            <View style={[styles.editModal, {
              backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            }]}>
              <View style={styles.editModalHeader}>
                <Text style={[styles.editModalTitle, {
                  color: theme === 'light' ? '#0f172a' : '#f8fafc',
                }]}>
                  Edit Group Details
                </Text>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons 
                    name="close" 
                    size={moderateScale(24)} 
                    color={theme === 'light' ? '#64748b' : '#71717a'} 
                  />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.editModalContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.editFormGroup}>
                  <Text style={[styles.editFormLabel, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    Group Name *
                  </Text>
                  <TextInput
                    style={[styles.editFormInput, {
                      backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                      borderColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                      color: theme === 'light' ? '#0f172a' : '#f8fafc',
                    }]}
                    placeholder="Group name"
                    placeholderTextColor={theme === 'light' ? '#94a3b8' : '#52525b'}
                    value={editName}
                    onChangeText={setEditName}
                    maxLength={100}
                  />
                </View>

                <View style={styles.editFormGroup}>
                  <Text style={[styles.editFormLabel, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    Description
                  </Text>
                  <TextInput
                    style={[styles.editFormInput, styles.editFormTextArea, {
                      backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                      borderColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                      color: theme === 'light' ? '#0f172a' : '#f8fafc',
                    }]}
                    placeholder="Describe your group..."
                    placeholderTextColor={theme === 'light' ? '#94a3b8' : '#52525b'}
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                  />
                </View>

                <View style={styles.editFormGroup}>
                  <Text style={[styles.editFormLabel, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    Category
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                  >
                    {GROUP_CATEGORIES.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: editCategory === category.id
                              ? '#37a4c8'
                              : theme === 'light' ? '#f1f5f9' : '#1a1a1a',
                            borderColor: editCategory === category.id
                              ? '#37a4c8'
                              : theme === 'light' ? '#e2e8f0' : '#334155',
                          }
                        ]}
                        onPress={() => {
                          triggerHaptic('light');
                          setEditCategory(category.id);
                        }}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons 
                          name={category.icon as any} 
                          size={moderateScale(18)} 
                          color={editCategory === category.id ? '#ffffff' : (theme === 'light' ? '#64748b' : '#94a3b8')} 
                        />
                        <Text style={[
                          styles.categoryChipText,
                          {
                            color: editCategory === category.id 
                              ? '#ffffff' 
                              : (theme === 'light' ? '#64748b' : '#94a3b8'),
                          }
                        ]}>
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.editFormGroup}>
                  <Text style={[styles.editFormLabel, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    Location
                  </Text>
                  <TextInput
                    style={[styles.editFormInput, {
                      backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                      borderColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                      color: theme === 'light' ? '#0f172a' : '#f8fafc',
                    }]}
                    placeholder="City, State or Address"
                    placeholderTextColor={theme === 'light' ? '#94a3b8' : '#52525b'}
                    value={editLocation}
                    onChangeText={setEditLocation}
                    maxLength={100}
                  />
                </View>

                <View style={styles.editFormGroup}>
                  <Text style={[styles.editFormLabel, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    Rules & Guidelines
                  </Text>
                  <TextInput
                    style={[styles.editFormInput, styles.editFormTextArea, {
                      backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                      borderColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                      color: theme === 'light' ? '#0f172a' : '#f8fafc',
                    }]}
                    placeholder="Group rules and guidelines..."
                    placeholderTextColor={theme === 'light' ? '#94a3b8' : '#52525b'}
                    value={editRules}
                    onChangeText={setEditRules}
                    multiline
                    numberOfLines={5}
                    maxLength={1000}
                  />
                </View>
              </ScrollView>

              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalButtonCancel, {
                    backgroundColor: theme === 'light' ? '#f1f5f9' : '#1a1a1a',
                  }]}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.7}
                  disabled={savingEdit}
                >
                  <Text style={[styles.editModalButtonText, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalButtonSave, {
                    opacity: !editName.trim() || savingEdit ? 0.5 : 1,
                  }]}
                  onPress={handleSaveEdit}
                  disabled={!editName.trim() || savingEdit}
                  activeOpacity={0.7}
                >
                  {savingEdit ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.editModalButtonTextSave}>
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Privacy Settings Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPrivacyModal(false)}
        >
          <View 
            style={styles.modalContainer}
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => e.stopPropagation()}
          >
            <View style={[styles.privacyModal, {
              backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            }]}>
              <View style={styles.privacyModalHeader}>
                <Text style={[styles.privacyModalTitle, {
                  color: theme === 'light' ? '#0f172a' : '#f8fafc',
                }]}>
                  Privacy Settings
                </Text>
                <TouchableOpacity
                  onPress={() => setShowPrivacyModal(false)}
                  style={styles.modalCloseButton}
                >
                  <MaterialIcons 
                    name="close" 
                    size={moderateScale(24)} 
                    color={theme === 'light' ? '#64748b' : '#71717a'} 
                  />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.privacyModalContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.privacySection}>
                  <Text style={[styles.privacySectionTitle, {
                    color: theme === 'light' ? '#0f172a' : '#f8fafc',
                  }]}>
                    Group Visibility
                  </Text>
                  <Text style={[styles.privacySectionDescription, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Control who can see and discover your group
                  </Text>

                  <TouchableOpacity
                    style={[styles.privacyOption, {
                      backgroundColor: privacyVisibility === 'public' 
                        ? (theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.18)')
                        : (theme === 'light' ? '#fafafa' : '#1a1a1a'),
                      borderColor: privacyVisibility === 'public'
                        ? '#37a4c8'
                        : (theme === 'light' ? '#e2e8f0' : '#334155'),
                    }]}
                    onPress={() => {
                      triggerHaptic('light');
                      setPrivacyVisibility('public');
                      setPrivacyIsPrivate(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.privacyOptionContent}>
                      <MaterialIcons 
                        name="public" 
                        size={moderateScale(24)} 
                        color={privacyVisibility === 'public' ? '#37a4c8' : (theme === 'light' ? '#64748b' : '#94a3b8')} 
                      />
                      <View style={styles.privacyOptionText}>
                        <Text style={[styles.privacyOptionTitle, {
                          color: theme === 'light' ? '#0f172a' : '#f8fafc',
                        }]}>
                          Public
                        </Text>
                        <Text style={[styles.privacyOptionDesc, {
                          color: theme === 'light' ? '#64748b' : '#94a3b8',
                        }]}>
                          Anyone can find and join
                        </Text>
                      </View>
                    </View>
                    {privacyVisibility === 'public' && (
                      <MaterialIcons name="check-circle" size={moderateScale(24)} color="#37a4c8" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.privacyOption, {
                      backgroundColor: privacyVisibility === 'private' 
                        ? (theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.18)')
                        : (theme === 'light' ? '#fafafa' : '#1a1a1a'),
                      borderColor: privacyVisibility === 'private'
                        ? '#37a4c8'
                        : (theme === 'light' ? '#e2e8f0' : '#334155'),
                    }]}
                    onPress={() => {
                      triggerHaptic('light');
                      setPrivacyVisibility('private');
                      setPrivacyIsPrivate(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.privacyOptionContent}>
                      <MaterialIcons 
                        name="lock" 
                        size={moderateScale(24)} 
                        color={privacyVisibility === 'private' ? '#37a4c8' : (theme === 'light' ? '#64748b' : '#71717a')} 
                      />
                      <View style={styles.privacyOptionText}>
                        <Text style={[styles.privacyOptionTitle, {
                          color: theme === 'light' ? '#0f172a' : '#f8fafc',
                        }]}>
                          Private
                        </Text>
                        <Text style={[styles.privacyOptionDesc, {
                          color: theme === 'light' ? '#64748b' : '#94a3b8',
                        }]}>
                          Members must request to join and be approved
                        </Text>
                      </View>
                    </View>
                    {privacyVisibility === 'private' && (
                      <MaterialIcons name="check-circle" size={moderateScale(24)} color="#37a4c8" />
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.privacyModalActions}>
                <TouchableOpacity
                  style={[styles.privacyModalButton, styles.privacyModalButtonCancel, {
                    backgroundColor: theme === 'light' ? '#f1f5f9' : '#1a1a1a',
                  }]}
                  onPress={() => setShowPrivacyModal(false)}
                  activeOpacity={0.7}
                  disabled={savingPrivacy}
                >
                  <Text style={[styles.privacyModalButtonText, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.privacyModalButton, styles.privacyModalButtonSave, {
                    opacity: savingPrivacy ? 0.5 : 1,
                  }]}
                  onPress={handleSavePrivacy}
                  disabled={savingPrivacy}
                  activeOpacity={0.7}
                >
                  {savingPrivacy ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.privacyModalButtonTextSave}>
                      Save Settings
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Create Type Selection Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCreateModal(false)}
          />
          <View style={[styles.typeSelectionModal, {
            backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.98)' : 'rgba(26, 26, 26, 0.98)',
          }]}>
            <View style={styles.typeSelectionHeader}>
              <View>
                <Text style={[styles.typeSelectionTitle, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  Create New
                </Text>
                <Text style={[styles.typeSelectionSubtitle, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Choose what you'd like to share
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons 
                  name="close" 
                  size={moderateScale(24)} 
                  color={theme === 'light' ? '#64748b' : '#94a3b8'} 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.typeSelectionOptions}>
              <TouchableOpacity
                style={[styles.typeOption, {
                  backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                  borderColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                }]}
                onPress={() => {
                  setShowCreateModal(false);
                  router.push(`/group/post/create?groupId=${groupId}`);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.typeOptionIcon, {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                }]}>
                  <MaterialIcons name="article" size={moderateScale(28)} color="#37a4c8" />
                </View>
                <View style={styles.typeOptionContent}>
                  <Text style={[styles.typeOptionTitle, {
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}>
                    Post
                  </Text>
                  <Text style={[styles.typeOptionDescription, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Share an update, photo, or thought
                  </Text>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  size={moderateScale(24)} 
                  color={theme === 'light' ? '#cbd5e1' : '#3f3f46'} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.typeOption, {
                  backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                  borderColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                }]}
                onPress={() => {
                  setShowCreateModal(false);
                  router.push(`/group/proposal/create?groupId=${groupId}`);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.typeOptionIcon, {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                }]}>
                  <MaterialIcons name="how-to-vote" size={moderateScale(28)} color="#37a4c8" />
                </View>
                <View style={styles.typeOptionContent}>
                  <Text style={[styles.typeOptionTitle, {
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}>
                    Proposal
                  </Text>
                  <Text style={[styles.typeOptionDescription, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Propose an event for voting
                  </Text>
                </View>
                <MaterialIcons 
                  name="chevron-right" 
                  size={moderateScale(24)} 
                  color={theme === 'light' ? '#cbd5e1' : '#3f3f46'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentWrapper: {
    flex: 1,
    minHeight: scaleHeight(400),
  },
  fixedCreateButton: {
    position: 'absolute',
    bottom: scaleHeight(52),
    right: scaleWidth(20),
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(12),
    zIndex: 1000,
  },
  
  // Group Header
  groupHeader: {
    borderBottomWidth: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
  },
  groupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(14),
  },
  groupAvatar: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
  },
  groupAvatarPlaceholder: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  groupHeaderName: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
    marginBottom: moderateScale(6),
    lineHeight: scaleFontSize(24),
  },
  groupHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  groupHeaderMembers: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
  groupHeaderPrivate: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
  groupHeaderActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerChatButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  headerShareButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(1) },
    shadowOpacity: 0.1,
    shadowRadius: moderateScale(2),
    elevation: 1,
  },
  
  // Tab Bar
  tabBar: {
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(3),
    elevation: 2,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    gap: spacing.sm,
    position: 'relative',
  },
  tabItemActive: {
    // Active styling handled by indicator
  },
  tabLabel: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabBadge: {
    backgroundColor: '#ef4444',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    minWidth: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(2),
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: scaleFontSize(10),
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.md,
    right: spacing.md,
    height: moderateScale(3),
    backgroundColor: '#37a4c8',
    borderRadius: moderateScale(4),
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(1) },
    shadowOpacity: 0.5,
    shadowRadius: moderateScale(3),
    elevation: 2,
  },
  
  // Sub Tab Bar
  subTabBar: {
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  subTabBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  subTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(9),
    borderRadius: moderateScale(20),
    gap: moderateScale(7),
  },
  subTabItemActive: {
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  subTabLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  subBadge: {
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    minWidth: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(2),
  },
  subBadgeText: {
    color: '#ffffff',
    fontSize: scaleFontSize(10),
    fontWeight: '700',
  },
  
  // Feed Container
  feedContainer: {
    flex: 1,
    minHeight: scaleHeight(300),
  },
  feedToggle: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  feedToggleInner: {
    flexDirection: 'row',
    borderRadius: moderateScale(16),
    padding: moderateScale(4),
    gap: moderateScale(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(2),
    elevation: 1,
  },
  feedToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(14),
    gap: moderateScale(6),
    transition: 'all 0.2s ease',
  },
  feedToggleBtnActive: {
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.3,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  feedToggleText: {
    fontSize: scaleFontSize(13),
    fontWeight: '700',
  },
  
  // Content Section
  contentSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: moderateScale(20),
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scaleFontSize(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: moderateScale(6),
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(16),
  },
  tagText: {
    fontSize: scaleFontSize(12),
    fontWeight: '700',
  },
  rulesText: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleFontSize(20),
    marginTop: spacing.xs,
  },
  
  // Member Card
  memberCard: {
    flexDirection: 'column',
    padding: moderateScale(14),
    borderRadius: moderateScale(16),
    marginBottom: spacing.sm,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(1) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(2),
    elevation: 1,
  },
  memberAvatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
  },
  memberAvatarPlaceholder: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
    marginBottom: spacing.xs,
  },
  memberName: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
  },
  youLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
    fontStyle: 'italic',
  },
  memberBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: moderateScale(4),
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: moderateScale(5),
    borderRadius: moderateScale(12),
    gap: moderateScale(5),
  },
  adminText: {
    fontSize: scaleFontSize(11),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // Request Card
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(14),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  requestUserSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  requestAvatar: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
  },
  requestAvatarPlaceholder: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    marginBottom: moderateScale(2),
  },
  requestMessage: {
    fontSize: scaleFontSize(13),
    lineHeight: scaleFontSize(18),
    marginBottom: spacing.xs,
  },
  requestDate: {
    fontSize: scaleFontSize(11),
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  requestActionBtn: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Settings
  settingsGroup: {
    borderRadius: moderateScale(20),
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.05,
    shadowRadius: moderateScale(4),
    elevation: 2,
  },
  settingsGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingsGroupIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsGroupTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex: 1,
  },
  settingsItemsContainer: {
    padding: moderateScale(4),
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(16),
    borderRadius: moderateScale(14),
    marginHorizontal: moderateScale(4),
    marginVertical: moderateScale(2),
    borderBottomWidth: 0,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingsItemIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsItemTextContainer: {
    flex: 1,
    gap: moderateScale(2),
  },
  settingsItemText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    lineHeight: scaleFontSize(20),
  },
  settingsItemDescription: {
    fontSize: scaleFontSize(12),
    fontWeight: '500',
    lineHeight: scaleFontSize(16),
    marginTop: moderateScale(2),
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingsItemValue: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
  },
  dangerZone: {
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scaleHeight(80),
    paddingHorizontal: moderateScale(32),
    gap: spacing.md,
  },
  emptyStateText: {
    fontSize: scaleFontSize(16),
    fontWeight: '600',
    textAlign: 'center',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: moderateScale(16),
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  joinButtonText: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
  },
  
  // Invite Member Button
  inviteMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(14),
    paddingHorizontal: spacing.xl,
    borderRadius: moderateScale(16),
    gap: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(4),
    elevation: 3,
  },
  inviteMemberButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Member Card Content
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  
  // Promote Member Button
  organizerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: moderateScale(5),
    borderRadius: moderateScale(12),
    gap: moderateScale(5),
  },
  organizerText: {
    fontSize: scaleFontSize(11),
    fontWeight: '600',
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: moderateScale(12),
    gap: spacing.xs,
    flex: 1,
  },
  actionButtonText: {
    fontSize: scaleFontSize(13),
    fontWeight: '700',
  },
  transferButton: {
    // Styles already applied via backgroundColor in component
  },
  removeButton: {
    // Styles already applied via backgroundColor in component
  },
  transferAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: moderateScale(12),
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  transferAdminButtonText: {
    fontSize: scaleFontSize(13),
    fontWeight: '700',
  },
  
  // Invite Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteModal: {
    width: '100%',
    maxWidth: scaleWidth(400),
    borderRadius: moderateScale(24),
    padding: spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: spacing.sm,
    elevation: 8,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  inviteModalTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: spacing.xs,
    borderRadius: moderateScale(20),
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteModalDescription: {
    fontSize: scaleFontSize(14),
    lineHeight: scaleFontSize(20),
    marginBottom: spacing.xl,
  },
  inviteInput: {
    borderWidth: 1,
    borderRadius: moderateScale(16),
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    fontSize: scaleFontSize(15),
    marginBottom: spacing.xl,
  },
  inviteModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inviteModalButton: {
    flex: 1,
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteModalButtonCancel: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inviteModalButtonSend: {
    backgroundColor: '#37a4c8',
  },
  inviteModalButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
  },
  inviteModalButtonTextSend: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Edit Modal
  editModal: {
    alignSelf: 'stretch',
    maxHeight: '90%',
    borderRadius: moderateScale(28),
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 0.3,
    shadowRadius: spacing.lg,
    elevation: 12,
    overflow: 'hidden',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  editModalTitle: {
    fontSize: scaleFontSize(22),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  editModalContent: {
    maxHeight: scaleHeight(400),
    paddingHorizontal: spacing.xl,
  },
  editFormGroup: {
    marginBottom: spacing.xl,
  },
  editFormLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },
  editFormInput: {
    borderWidth: 1,
    borderRadius: moderateScale(16),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: scaleFontSize(15),
    minHeight: moderateScale(48),
  },
  editFormTextArea: {
    minHeight: scaleHeight(100),
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  categoryScroll: {
    marginTop: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: spacing.sm,
    borderRadius: moderateScale(20),
    borderWidth: 1,
    marginRight: spacing.sm,
    gap: moderateScale(6),
  },
  categoryChipText: {
    fontSize: scaleFontSize(13),
    fontWeight: '600',
  },
  editModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  editModalButton: {
    flex: 1,
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalButtonCancel: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  editModalButtonSave: {
    backgroundColor: '#37a4c8',
  },
  editModalButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
  },
  editModalButtonTextSave: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Privacy Modal
  privacyModal: {
    alignSelf: 'stretch',
    maxHeight: '90%',
    borderRadius: moderateScale(28),
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: spacing.sm },
    shadowOpacity: 0.3,
    shadowRadius: spacing.lg,
    elevation: 12,
    overflow: 'hidden',
  },
  privacyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  privacyModalTitle: {
    fontSize: scaleFontSize(22),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  privacyModalContent: {
    maxHeight: scaleHeight(500),
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  privacySection: {
    marginBottom: spacing.xxl,
  },
  privacySectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: '700',
    marginBottom: moderateScale(6),
    letterSpacing: 0.2,
  },
  privacySectionDescription: {
    fontSize: scaleFontSize(13),
    marginBottom: spacing.lg,
    lineHeight: scaleFontSize(18),
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: moderateScale(18),
    borderWidth: 1,
    marginBottom: spacing.md,
    minHeight: scaleHeight(72),
  },
  privacyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  privacyOptionText: {
    flex: 1,
  },
  privacyOptionTitle: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  privacyOptionDesc: {
    fontSize: scaleFontSize(13),
    lineHeight: scaleFontSize(18),
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: moderateScale(18),
    borderWidth: 1,
    minHeight: scaleHeight(72),
  },
  privacyToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  privacyToggleText: {
    flex: 1,
  },
  toggleSwitch: {
    width: moderateScale(44),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    justifyContent: 'center',
    paddingHorizontal: moderateScale(3),
  },
  toggleSwitchThumb: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(2) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(3),
    elevation: 3,
  },
  privacyModalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  privacyModalButton: {
    flex: 1,
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyModalButtonCancel: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  privacyModalButtonSave: {
    backgroundColor: '#37a4c8',
  },
  privacyModalButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
  },
  privacyModalButtonTextSave: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    color: '#ffffff',
  },
  
  // Create Type Selection Modal
  typeSelectionModal: {
    width: '90%',
    maxWidth: scaleWidth(420),
    borderRadius: moderateScale(28),
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: moderateScale(8) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(16),
    elevation: 10,
  },
  typeSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  typeSelectionTitle: {
    fontSize: scaleFontSize(22),
    fontWeight: '700',
    marginBottom: moderateScale(4),
  },
  typeSelectionSubtitle: {
    fontSize: scaleFontSize(13),
    fontWeight: '500',
  },
  typeSelectionOptions: {
    gap: spacing.md,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: moderateScale(20),
    borderWidth: 1.5,
    gap: spacing.lg,
  },
  typeOptionIcon: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeOptionContent: {
    flex: 1,
  },
  typeOptionTitle: {
    fontSize: scaleFontSize(17),
    fontWeight: '700',
    marginBottom: moderateScale(4),
  },
  typeOptionDescription: {
    fontSize: scaleFontSize(13),
    lineHeight: scaleFontSize(18),
  },
});
