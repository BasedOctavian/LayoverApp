import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { ThemeContext } from '../../context/ThemeContext';
import { GroupEventProposal, VoteType } from '../../types/groupTypes';
import useGroups from '../../hooks/useGroups';
import useAuth from '../../hooks/auth';
import ProposalItem from './ProposalItem';

interface ProposalsFeedProps {
  groupId: string;
  isOrganizer: boolean;
  isMember: boolean;
}

export default function ProposalsFeed({ groupId, isOrganizer, isMember }: ProposalsFeedProps) {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const router = useRouter();
  const { getProposals, createProposal, deleteProposal, voteOnProposal, updateProposalStatus } = useGroups();
  
  const [proposals, setProposals] = useState<GroupEventProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Animation refs
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  
  const loadProposals = useCallback(async () => {
    try {
      const fetchedProposals = await getProposals(groupId);
      setProposals(fetchedProposals);
    } catch (error) {
      console.error('Error loading proposals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);
  
  useEffect(() => {
    loadProposals();
  }, [loadProposals]);
  
  // Set initial load complete when data is ready
  useEffect(() => {
    if (!loading && proposals.length > 0) {
      setInitialLoadComplete(true);
    } else if (!loading) {
      // Even if no data, mark as complete after a short delay
      setTimeout(() => setInitialLoadComplete(true), 100);
    }
  }, [loading, proposals]);
  
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
  
  // Refresh when screen comes back into focus (after creating proposal)
  useFocusEffect(
    useCallback(() => {
      loadProposals();
    }, [loadProposals])
  );
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadProposals();
  };
  
  const handleVote = async (proposalId: string, voteType: VoteType) => {
    if (!user) return;
    await voteOnProposal(groupId, proposalId, user.uid, voteType);
    // Reload to get updated counts
    await loadProposals();
  };
  
  const handleDeleteProposal = async (proposalId: string) => {
    if (!user?.uid) return;
    await deleteProposal(groupId, proposalId, user.uid);
    // Remove from local state
    setProposals(proposals.filter(p => p.id !== proposalId));
  };
  
  const handleStatusChange = async (proposalId: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    await updateProposalStatus(groupId, proposalId, status);
    // Reload to get updated status
    await loadProposals();
  };
  
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
        <View style={[styles.emptyContainer, {
          backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
        }]}>
          <View style={[styles.restrictedBanner, {
            backgroundColor: theme === 'light' ? '#f8f9fa' : '#0f0f0f',
            borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
          }]}>
            <MaterialIcons
              name="poll"
              size={28}
              color="#37a4c8"
            />
            <View style={styles.restrictedTextContainer}>
              <Text style={[styles.restrictedTitle, {
                color: theme === 'light' ? '#1e293b' : '#f1f5f9',
              }]}>
                Join to view proposals
              </Text>
              <Text style={[styles.restrictedSubtitle, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                Event proposals are only visible to group members
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          <FlatList
            data={proposals}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProposalItem
                proposal={item}
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
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#37a4c8"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, {
                  backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                }]}>
                  <MaterialIcons
                    name="poll"
                    size={44}
                    color="#37a4c8"
                  />
                </View>
                <Text style={[styles.emptyText, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                }]}>
                  No proposals yet
                </Text>
                <Text style={[styles.emptySubtext, {
                  color: theme === 'light' ? '#64748b' : '#94a3b8',
                }]}>
                  Be the first to propose an event!
                </Text>
              </View>
            }
          />
          
          {/* Create Proposal Button */}
          <TouchableOpacity
            style={[styles.createButton, {
              backgroundColor: '#37a4c8',
            }]}
            onPress={() => router.push(`/group/proposal/create?groupId=${groupId}`)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={28} color="#ffffff" />
          </TouchableOpacity>
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
  restrictedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 16,
    width: '100%',
  },
  restrictedTextContainer: {
    flex: 1,
  },
  restrictedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  restrictedSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
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
  createButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});

