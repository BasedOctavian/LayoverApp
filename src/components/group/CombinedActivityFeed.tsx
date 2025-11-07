import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemeContext } from '../../context/ThemeContext';
import { GroupPost, GroupEventProposal } from '../../types/groupTypes';
import useGroups from '../../hooks/useGroups';
import useAuth from '../../hooks/auth';
import PostItem from './PostItem';
import ProposalItem from './ProposalItem';

interface CombinedActivityFeedProps {
  groupId: string;
  isOrganizer: boolean;
  isMember: boolean;
  group?: {
    requiresApproval?: boolean;
    name?: string;
  };
  onJoin?: () => void;
  hasRequestedToJoin?: boolean;
}

type ActivityItem = {
  type: 'post' | 'proposal';
  id: string;
  createdAt: any;
  post?: GroupPost;
  proposal?: GroupEventProposal;
};

export default function CombinedActivityFeed({ groupId, isOrganizer, isMember, group, onJoin, hasRequestedToJoin }: CombinedActivityFeedProps) {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const router = useRouter();
  const { 
    getPosts, 
    createPost, 
    deletePost,
    getProposals, 
    createProposal, 
    deleteProposal, 
    voteOnProposal, 
    updateProposalStatus 
  } = useGroups();
  
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [proposals, setProposals] = useState<GroupEventProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // Animation refs
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const buttonOpacityAnim = useRef(new Animated.Value(1)).current;
  const successCheckAnim = useRef(new Animated.Value(0)).current;
  const successScaleAnim = useRef(new Animated.Value(0)).current;
  
  const loadData = useCallback(async () => {
    try {
      const [fetchedPosts, fetchedProposals] = await Promise.all([
        getPosts(groupId),
        getProposals(groupId)
      ]);
      setPosts(fetchedPosts);
      setProposals(fetchedProposals);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Set initial load complete when data is ready
  useEffect(() => {
    if (!loading && (posts.length > 0 || proposals.length > 0)) {
      setInitialLoadComplete(true);
    } else if (!loading) {
      // Even if no data, mark as complete after a short delay
      setTimeout(() => setInitialLoadComplete(true), 100);
    }
  }, [loading, posts, proposals]);
  
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
  }, [loading, initialLoadComplete, contentBounceAnim, contentScaleAnim]);

  // Trigger success animation when request is sent
  useEffect(() => {
    if (hasRequestedToJoin) {
      // Reset button animations first
      buttonOpacityAnim.setValue(1);
      buttonScaleAnim.setValue(1);
      
      // Then animate success
      Animated.parallel([
        Animated.spring(successCheckAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(successScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset success animations when request is canceled
      successCheckAnim.setValue(0);
      successScaleAnim.setValue(0);
      buttonOpacityAnim.setValue(1);
      buttonScaleAnim.setValue(1);
    }
  }, [hasRequestedToJoin, successCheckAnim, successScaleAnim, buttonOpacityAnim, buttonScaleAnim]);
  
  // Refresh when screen comes back into focus (after creating proposal)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!user?.uid) return;
    await deletePost(groupId, postId, user.uid);
    setPosts(posts.filter(p => p.id !== postId));
  };
  
  const handleDeleteProposal = async (proposalId: string) => {
    if (!user?.uid) return;
    await deleteProposal(groupId, proposalId, user.uid);
    setProposals(proposals.filter(p => p.id !== proposalId));
  };
  
  const handleVote = async (proposalId: string, voteType: 'yes' | 'no') => {
    if (!user) return;
    await voteOnProposal(groupId, proposalId, user.uid, voteType);
    await loadData();
  };
  
  const handleStatusChange = async (proposalId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    await updateProposalStatus(groupId, proposalId, status);
    await loadData();
  };
  
  // Combine and sort by creation date (newest first)
  const combinedItems: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [
      ...posts.map(post => ({
        type: 'post' as const,
        id: post.id,
        createdAt: post.createdAt,
        post,
      })),
      ...proposals.map(proposal => ({
        type: 'proposal' as const,
        id: proposal.id,
        createdAt: proposal.createdAt,
        proposal,
      })),
    ];
    
    // Sort by date (newest first)
    return items.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [posts, proposals]);
  
  return (
    <Animated.View 
      style={[
        styles.container,
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
      {!isMember ? (
        <View style={[styles.lockedContainer, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#000000',
        }]}>
          <MaterialIcons
            name="groups"
            size={32}
            color="#37a4c8"
          />
          <View style={styles.lockedTextContainer}>
            <Text style={[styles.lockedTitle, {
              color: theme === 'light' ? '#1e293b' : '#f1f5f9',
            }]}>
              {group?.requiresApproval ? 'Request to join' : 'Join group'}
            </Text>
            <Text style={[styles.lockedSubtitle, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              {hasRequestedToJoin 
                ? 'Your request is pending approval'
                : group?.requiresApproval 
                  ? 'This group requires approval to join'
                  : 'Join this group to view activity'}
            </Text>
          </View>
          {onJoin && !hasRequestedToJoin ? (
            <Animated.View
              style={[
                styles.lockedJoinButtonContainer,
                {
                  opacity: buttonOpacityAnim,
                  transform: [{ scale: buttonScaleAnim }],
                }
              ]}
            >
              <TouchableOpacity
                style={[styles.lockedJoinButton, {
                  backgroundColor: theme === 'light' ? '#37a4c8' : '#1a3a42',
                  borderColor: '#37a4c8',
                }]}
                onPress={async () => {
                  if (isJoining) return;
                  
                  // Haptic feedback
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  
                  setIsJoining(true);
                  
                  // Button press animation
                  Animated.parallel([
                    Animated.sequence([
                      Animated.timing(buttonScaleAnim, {
                        toValue: 0.95,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                      Animated.timing(buttonScaleAnim, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true,
                      }),
                    ]),
                    Animated.timing(buttonOpacityAnim, {
                      toValue: 0.7,
                      duration: 200,
                      useNativeDriver: true,
                    }),
                  ]).start();
                  
                  try {
                    await onJoin();
                    // Success animation will be triggered by useEffect when hasRequestedToJoin changes
                  } catch (error) {
                    // Reset on error
                    Animated.parallel([
                      Animated.timing(buttonOpacityAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                      Animated.timing(buttonScaleAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                      }),
                    ]).start();
                  } finally {
                    setIsJoining(false);
                  }
                }}
                activeOpacity={1}
                disabled={isJoining}
              >
                {isJoining ? (
                  <ActivityIndicator 
                    size="small" 
                    color={theme === 'light' ? '#ffffff' : '#37a4c8'} 
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name={group?.requiresApproval ? 'person-add' : 'check-circle'}
                      size={20}
                      color={theme === 'light' ? '#ffffff' : '#37a4c8'}
                    />
                    <Text style={[styles.lockedJoinButtonText, {
                      color: theme === 'light' ? '#ffffff' : '#37a4c8',
                    }]}>
                      {group?.requiresApproval ? 'Request to Join' : 'Join Group'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : hasRequestedToJoin ? (
            <Animated.View
              style={[
                styles.successContainer,
                {
                  opacity: successCheckAnim,
                  transform: [{ scale: successScaleAnim }],
                }
              ]}
            >
              <MaterialIcons
                name="check-circle"
                size={32}
                color="#10B981"
              />
              <Text style={[styles.successText, {
                color: theme === 'light' ? '#10B981' : '#34D399',
              }]}>
                Request sent!
              </Text>
            </Animated.View>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.listContent}>
            {combinedItems.length > 0 ? (
              combinedItems.map((item) => {
                if (item.type === 'post' && item.post) {
                  return (
                    <PostItem
                      key={`post-${item.id}`}
                      post={item.post}
                      groupId={groupId}
                      currentUserId={user?.uid || ''}
                      isOrganizer={isOrganizer}
                      onDelete={handleDeletePost}
                    />
                  );
                } else if (item.type === 'proposal' && item.proposal) {
                  return (
                    <ProposalItem
                      key={`proposal-${item.id}`}
                      proposal={item.proposal}
                      groupId={groupId}
                      currentUserId={user?.uid || ''}
                      currentUserName={user?.displayName || 'Anonymous'}
                      currentUserProfilePicture={user?.photoURL || undefined}
                      isOrganizer={isOrganizer}
                      theme={theme || 'light'}
                      onVote={handleVote}
                      onDelete={handleDeleteProposal}
                      onStatusChange={handleStatusChange}
                    />
                  );
                }
                return null;
              })
            ) : (
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                }]}>
                  <MaterialIcons
                    name="dynamic-feed"
                    size={44}
                    color="#37a4c8"
                  />
                </View>
                <Text style={[styles.emptyText, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  No activity yet
                </Text>
                <Text style={[styles.emptySubtext, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Be the first to share something with the group!
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 20,
  },
  lockedTextContainer: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 300,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  lockedJoinButtonContainer: {
    position: 'relative',
    marginTop: 8,
  },
  lockedJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
    minWidth: 160,
  },
  lockedJoinButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});

