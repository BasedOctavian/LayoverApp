import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { ThemeContext } from '../../context/ThemeContext';
import { GroupPost } from '../../types/groupTypes';
import useGroups from '../../hooks/useGroups';
import useAuth from '../../hooks/auth';
import PostItem from './PostItem';
import { useRouter } from 'expo-router';

interface PostsFeedProps {
  groupId: string;
  isOrganizer: boolean;
  isMember: boolean;
  favoritesOnly?: boolean;
  currentUserId?: string;
}

export default function PostsFeed({ groupId, isOrganizer, isMember, favoritesOnly = false, currentUserId }: PostsFeedProps) {
  const { theme } = React.useContext(ThemeContext);
  const { user } = useAuth();
  const router = useRouter();
  const { getPosts, createPost, deletePost } = useGroups();
  
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Animation refs
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;
  
  const loadPosts = useCallback(async () => {
    try {
      const fetchedPosts = await getPosts(groupId);
      // Filter for favorites if requested - show all posts favorited by ANY group member (group-encompassing)
      const filteredPosts = favoritesOnly
        ? fetchedPosts.filter(post => post.favorites && post.favorites.length > 0)
        : fetchedPosts;
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId, favoritesOnly]);
  
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);
  
  // Set initial load complete when data is ready
  useEffect(() => {
    if (!loading && posts.length > 0) {
      setInitialLoadComplete(true);
    } else if (!loading) {
      // Even if no data, mark as complete after a short delay
      setTimeout(() => setInitialLoadComplete(true), 100);
    }
  }, [loading, posts]);
  
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
  
  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };
  
  const handleCreatePost = async (content: string, imageUrl?: string) => {
    if (!user) return;
    
    try {
      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      await createPost(
        groupId,
        content,
        user.uid,
        userData.name || user.displayName || 'Anonymous',
        userData.profilePicture || user.photoURL || undefined,
        imageUrl
      );
      
      // Reload posts
      await loadPosts();
    } catch (error) {
      console.error('Error in handleCreatePost:', error);
    }
  };
  
  const handleDeletePost = async (postId: string) => {
    if (!user?.uid) return;
    await deletePost(groupId, postId, user.uid);
    // Remove from local state
    setPosts(posts.filter(p => p.id !== postId));
  };
  
  // Group posts by month/year for timeline view
  const groupedPosts = useMemo(() => {
    if (!favoritesOnly) return [];
    
    // Sort posts by date (most recent first)
    const sortedPosts = [...posts].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Group by month/year
    const groups: { [key: string]: GroupPost[] } = {};
    sortedPosts.forEach(post => {
      const date = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
      const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(post);
    });
    
    // Convert to section list format
    return Object.keys(groups).map(monthYear => ({
      title: monthYear,
      data: groups[monthYear],
    }));
  }, [posts, favoritesOnly]);
  
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
              name="groups"
              size={28}
              color="#37a4c8"
            />
            <View style={styles.restrictedTextContainer}>
              <Text style={[styles.restrictedTitle, {
                color: theme === 'light' ? '#1e293b' : '#f1f5f9',
              }]}>
                Join to view posts
              </Text>
              <Text style={[styles.restrictedSubtitle, {
                color: theme === 'light' ? '#64748b' : '#94a3b8',
              }]}>
                This group's content is only visible to members
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.listContent}>
            {favoritesOnly ? (
              /* Timeline view for favorites */
              groupedPosts.length > 0 ? (
                groupedPosts.map((section, sectionIndex) => (
                  <View key={section.title}>
                    <View style={[styles.timelineHeader, {
                      backgroundColor: theme === 'light' ? '#f8f9fa' : '#000000',
                    }]}>
                      <View style={[styles.timelineDot, {
                        backgroundColor: '#37a4c8',
                      }]} />
                      <View style={[styles.timelineLine, {
                        backgroundColor: theme === 'light' ? '#e2e8f0' : '#27272a',
                      }]} />
                      <Text style={[styles.timelineTitle, {
                        color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                      }]}>
                        {section.title}
                      </Text>
                    </View>
                    {section.data.map((post) => (
                      <PostItem
                        key={post.id}
                        post={post}
                        groupId={groupId}
                        currentUserId={user?.uid || ''}
                        isOrganizer={isOrganizer}
                        onDelete={handleDeletePost}
                      />
                    ))}
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconContainer, {
                    backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                  }]}>
                    <MaterialIcons
                      name="bookmark-border"
                      size={44}
                      color="#37a4c8"
                    />
                  </View>
                  <Text style={[styles.emptyText, {
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}>
                    No favorites yet
                  </Text>
                  <Text style={[styles.emptySubtext, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Favorite posts will appear here
                  </Text>
                </View>
              )
            ) : (
              /* Regular list view for posts */
              posts.length > 0 ? (
                posts.map((post) => (
                  <PostItem
                    key={post.id}
                    post={post}
                    groupId={groupId}
                    currentUserId={user?.uid || ''}
                    isOrganizer={isOrganizer}
                    onDelete={handleDeletePost}
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconContainer, {
                    backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.08)' : 'rgba(55, 164, 200, 0.12)',
                  }]}>
                    <MaterialIcons
                      name="post-add"
                      size={44}
                      color="#37a4c8"
                    />
                  </View>
                  <Text style={[styles.emptyText, {
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}>
                    No posts yet
                  </Text>
                  <Text style={[styles.emptySubtext, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    Be the first to share something with the group!
                  </Text>
                </View>
              )
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
  // Timeline styles for favorites
  timelineHeader: {
    position: 'relative',
    paddingLeft: 28,
    paddingVertical: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  timelineDot: {
    position: 'absolute',
    left: 0,
    top: 20,
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 32,
    bottom: -16,
    width: 1,
    zIndex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

