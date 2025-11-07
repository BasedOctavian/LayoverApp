import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebaseConfig';
import { ThemeContext } from '../../../context/ThemeContext';
import useAuth from '../../../hooks/auth';
import useGroups from '../../../hooks/useGroups';
import useNotificationCount from '../../../hooks/useNotificationCount';
import TopBar from '../../../components/TopBar';
import CommentItem from '../../../components/group/CommentItem';
import { GroupPost, PostComment } from '../../../types/groupTypes';

export default function PostDetailScreen() {
  const params = useLocalSearchParams();
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupIdParam = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = React.useContext(ThemeContext);
  const { user, userId } = useAuth();
  const notificationCount = useNotificationCount(userId);
  const { togglePostLike, togglePostFavorite, addComment, getComments, deleteComment, deletePost } = useGroups();

  const [post, setPost] = useState<GroupPost | null>(null);
  const [groupId, setGroupId] = useState<string>('');
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [likesList, setLikesList] = useState<Array<{ id: string; name: string; profilePicture?: string }>>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
  const contentBounceAnim = useRef(new Animated.Value(0)).current;
  const contentScaleAnim = useRef(new Animated.Value(0.98)).current;

  const loadPostData = useCallback(async () => {
    if (!postId) return;

    try {
      const gId = groupIdParam;
      
      if (!gId) {
        Alert.alert('Error', 'Group ID not found');
        router.back();
        return;
      }

      setGroupId(gId);

      // Get the post
      const postDoc = await getDoc(doc(db, 'groups', gId, 'posts', postId));
      if (!postDoc.exists()) {
        Alert.alert('Error', 'Post not found');
        router.back();
        return;
      }

      const postData = { id: postDoc.id, ...postDoc.data() } as GroupPost;
      setPost(postData);
      setIsLiked(postData.likes.includes(userId || ''));
      setLikeCount(postData.likeCount);
      setIsFavorited(postData.favorites?.includes(userId || '') || false);

      // Check if user is organizer
      const groupDoc = await getDoc(doc(db, 'groups', gId));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        setIsOrganizer(groupData.organizers?.includes(userId || '') || false);
      }

      // Load comments
      const fetchedComments = await getComments(gId, postId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId, userId, groupIdParam]);

  useEffect(() => {
    loadPostData();
  }, [loadPostData]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard opens
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Bounce in animation when post loads
  useEffect(() => {
    if (!loading && post) {
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
  }, [loading, post, contentBounceAnim, contentScaleAnim]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPostData();
  };

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

  const handleLike = async () => {
    if (!groupId || !post) return;

    triggerHaptic('medium');
    
    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

    const success = await togglePostLike(groupId, post.id, userId || '');

    if (!success) {
      // Revert on failure
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      Alert.alert('Error', 'Failed to update like');
    }
  };

  const handleFavorite = async () => {
    if (!groupId || !post) return;

    triggerHaptic('light');
    
    const previousFavorited = isFavorited;

    // Optimistic update
    setIsFavorited(!isFavorited);

    const success = await togglePostFavorite(groupId, post.id, userId || '');

    if (!success) {
      // Revert on failure
      setIsFavorited(previousFavorited);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handleDownloadImage = async () => {
    if (!post?.imageUrl) return;
    
    try {
      setDownloadingImage(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save photos');
        setDownloadingImage(false);
        return;
      }
      
      triggerHaptic('medium');
      
      // Download the image
      const fileUri = `${FileSystem.documentDirectory}${post.id}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(post.imageUrl, fileUri);
      
      // Save to media library
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
      
      triggerHaptic('heavy');
      
      Alert.alert('Success', 'Image saved to your photos');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image');
    } finally {
      setDownloadingImage(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !groupId || !post || !user) return;

    triggerHaptic('light');
    Keyboard.dismiss();
    setSubmittingComment(true);
    
    try {
      // Fetch user data
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const commentId = await addComment(
        groupId,
        post.id,
        commentText.trim(),
        user.uid,
        userData.name || user.displayName || 'Anonymous',
        userData.profilePicture || user.photoURL || undefined
      );

      if (commentId) {
        setCommentText('');
        triggerHaptic('heavy');
        await loadPostData();
        // Scroll to bottom to show new comment
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!groupId || !post) return;

    try {
      const success = await deleteComment(groupId, post.id, commentId);
      if (success) {
        await loadPostData();
      } else {
        Alert.alert('Error', 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      Alert.alert('Error', 'Failed to delete comment');
    }
  };

  const handleDeletePost = async () => {
    if (!groupId || !post) return;

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.uid) {
              Alert.alert('Error', 'User not authenticated');
              return;
            }
            try {
              await deletePost(groupId, post.id, user.uid);
              Alert.alert('Success', 'Post deleted');
              router.back();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const handleShowLikes = async () => {
    if (!post || likeCount === 0) return;

    setShowLikesModal(true);
    setLoadingLikes(true);

    try {
      const likesData = await Promise.all(
        post.likes.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                id: userId,
                name: userData.name || 'User',
                profilePicture: userData.profilePicture,
              };
            }
            return { id: userId, name: 'User' };
          } catch (error) {
            console.error('Error fetching user data:', error);
            return { id: userId, name: 'User' };
          }
        })
      );
      setLikesList(likesData);
    } catch (error) {
      console.error('Error loading likes:', error);
      Alert.alert('Error', 'Failed to load likes');
    } finally {
      setLoadingLikes(false);
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading || !post) {
    return (
      <SafeAreaView style={[styles.container, {
        backgroundColor: theme === 'light' ? '#f8f9fa' : '#0a0a0a',
      }]} edges={[]}>
        <TopBar
          showBackButton={true}
          title=""
          onBackPress={() => router.back()}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />
      </SafeAreaView>
    );
  }

  const canDelete = post.authorId === userId || isOrganizer;

  return (
    <SafeAreaView style={[styles.container, {
      backgroundColor: theme === 'light' ? '#f8f9fa' : '#0a0a0a',
    }]} edges={[]}>
      <TopBar
        showBackButton={true}
        title=""
        onBackPress={() => {
          triggerHaptic('light');
          router.back();
        }}
        onProfilePress={() => router.push(`/profile/${user?.uid}`)}
        notificationCount={notificationCount}
        showLogo={true}
        centerLogo={true}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View style={[styles.animatedContainer, {
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
        }]}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#37a4c8"
                colors={['#37a4c8']}
              />
            }
          >
          {/* Post Card */}
          <View style={[styles.postCard, {
            backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
          }]}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <TouchableOpacity
                style={styles.authorSection}
                onPress={() => router.push(`/profile/${post.authorId}`)}
                activeOpacity={0.7}
              >
                {post.authorProfilePicture ? (
                  <Image source={{ uri: post.authorProfilePicture }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, {
                    backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
                  }]}>
                    <MaterialIcons name="person" size={24} color="#37a4c8" />
                  </View>
                )}

                <View style={styles.headerInfo}>
                  <Text style={[styles.authorName, {
                    color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  }]}>
                    {post.authorName}
                  </Text>
                  <Text style={[styles.timestamp, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    {getTimeAgo(post.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>

              {canDelete && (
                <TouchableOpacity
                  onPress={handleDeletePost}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="delete" size={20} color={theme === 'light' ? '#64748b' : '#94a3b8'} />
                </TouchableOpacity>
              )}
            </View>

            {/* Post Content */}
            <Text style={[styles.content, {
              color: theme === 'light' ? '#1e293b' : '#f1f5f9',
            }]}>
              {post.content}
            </Text>

            {/* Post Image */}
            {post.imageUrl && (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setShowImageModal(true);
                }}
                activeOpacity={0.9}
              >
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
              </TouchableOpacity>
            )}

              {/* Post Actions */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={handleLike}
                  onLongPress={() => {
                    triggerHaptic('medium');
                    handleShowLikes();
                  }}
                  style={styles.actionButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={isLiked ? 'favorite' : 'favorite-border'}
                    size={22}
                    color={isLiked ? '#ef4444' : (theme === 'light' ? '#64748b' : '#94a3b8')}
                  />
                  <TouchableOpacity onPress={() => {
                    triggerHaptic('light');
                    handleShowLikes();
                  }}>
                    <Text style={[styles.actionText, {
                      color: theme === 'light' ? '#64748b' : '#94a3b8',
                    }]}>
                      {likeCount}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    triggerHaptic('light');
                    commentInputRef.current?.focus();
                  }}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="comment"
                    size={22}
                    color={theme === 'light' ? '#64748b' : '#94a3b8'}
                  />
                  <Text style={[styles.actionText, {
                    color: theme === 'light' ? '#64748b' : '#94a3b8',
                  }]}>
                    {comments.length}
                  </Text>
                </TouchableOpacity>
                
                <View style={{ flex: 1 }} />
                
                <TouchableOpacity
                  onPress={handleFavorite}
                  style={styles.favoriteButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={isFavorited ? 'bookmark' : 'bookmark-border'}
                    size={22}
                    color={isFavorited ? '#37a4c8' : (theme === 'light' ? '#64748b' : '#94a3b8')}
                  />
                </TouchableOpacity>
              </View>
            </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={[styles.commentsTitle, {
              color: theme === 'light' ? '#1e293b' : '#f8fafc',
            }]}>
              Comments {comments.length > 0 && `(${comments.length})`}
            </Text>

            {comments.length > 0 ? (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={userId || ''}
                  isOrganizer={isOrganizer}
                  onDelete={handleDeleteComment}
                />
              ))
            ) : (
              <View style={styles.emptyComments}>
                <MaterialIcons name="mode-comment" size={40} color={theme === 'light' ? '#cbd5e1' : '#475569'} />
                <Text style={[styles.emptyCommentsText, {
                  color: theme === 'light' ? '#94a3b8' : '#71717a',
                }]}>
                  No comments yet
                </Text>
                <Text style={[styles.emptyCommentsSubtext, {
                  color: theme === 'light' ? '#cbd5e1' : '#52525b',
                }]}>
                  Be the first to share your thoughts
                </Text>
              </View>
            )}
          </View>
          </ScrollView>

          {/* Add Comment Input */}
          <View style={[styles.commentInputContainer, {
            backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
            borderTopColor: theme === 'light' ? '#e2e8f0' : '#334155',
            paddingBottom: keyboardVisible ? 6 : Math.max(12, insets.bottom), // Padding when keyboard is hidden, account for safe area
          }]}>
            <View style={styles.inputRow}>
              <TextInput
                ref={commentInputRef}
                style={[styles.commentInput, {
                  color: theme === 'light' ? '#1e293b' : '#f1f5f9',
                  backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                  borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
                }]}
                placeholder="Write a comment..."
                placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                returnKeyType="default"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
                style={[styles.submitButton, {
                  backgroundColor: (!commentText.trim() || submittingComment) ? '#cbd5e1' : '#37a4c8',
                }]}
                activeOpacity={0.7}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <MaterialIcons name="send" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Likes Modal */}
      <Modal
        visible={showLikesModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLikesModal(false)}
      >
        <BlurView intensity={80} style={styles.modalBlurOverlay} tint={theme === 'light' ? 'light' : 'dark'}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowLikesModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.likesModal, {
                backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 26, 26, 0.95)',
              }]}>
                <View style={styles.likesModalHeader}>
                  <View style={styles.likesModalTitleSection}>
                    <MaterialIcons name="favorite" size={24} color="#ef4444" />
                    <Text style={[styles.likesModalTitle, {
                      color: theme === 'light' ? '#0f172a' : '#f8fafc',
                    }]}>
                      Likes
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowLikesModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <MaterialIcons
                      name="close"
                      size={24}
                      color={theme === 'light' ? '#64748b' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.likesModalContent} showsVerticalScrollIndicator={false}>
                  {loadingLikes ? (
                    <View style={styles.likesLoadingContainer}>
                      <ActivityIndicator size="large" color="#37a4c8" />
                    </View>
                  ) : likesList.length > 0 ? (
                    likesList.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[styles.likesUserItem, {
                          backgroundColor: theme === 'light' ? '#f8f9fa' : '#18181b',
                        }]}
                        onPress={() => {
                          setShowLikesModal(false);
                          router.push(`/profile/${user.id}`);
                        }}
                        activeOpacity={0.7}
                      >
                        {user.profilePicture ? (
                          <Image source={{ uri: user.profilePicture }} style={styles.likesUserAvatar} />
                        ) : (
                          <View style={[styles.likesUserAvatarPlaceholder, {
                            backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.2)',
                          }]}>
                            <MaterialIcons name="person" size={20} color="#37a4c8" />
                          </View>
                        )}
                        <Text style={[styles.likesUserName, {
                          color: theme === 'light' ? '#0f172a' : '#f8fafc',
                        }]}>
                          {user.name}
                        </Text>
                        <MaterialIcons
                          name="chevron-right"
                          size={20}
                          color={theme === 'light' ? '#cbd5e1' : '#3f3f46'}
                        />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.likesEmptyState}>
                      <MaterialIcons name="favorite-border" size={48} color="#94a3b8" />
                      <Text style={[styles.likesEmptyText, {
                        color: theme === 'light' ? '#64748b' : '#94a3b8',
                      }]}>
                        No likes yet
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </BlurView>
      </Modal>
      
      {/* Image Modal */}
      {post?.imageUrl && (
        <Modal
          visible={showImageModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowImageModal(false)}
        >
          <BlurView intensity={90} style={styles.imageModalBlurOverlay} tint={theme === 'light' ? 'light' : 'dark'}>
            <View style={styles.imageModalContainer}>
              <View style={styles.imageModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowImageModal(false)}
                  style={styles.imageModalCloseButton}
                >
                  <MaterialIcons name="close" size={28} color="#ffffff" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={handleDownloadImage}
                  style={styles.imageModalDownloadButton}
                  disabled={downloadingImage}
                >
                  {downloadingImage ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <MaterialIcons name="download" size={26} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
              
              <Image 
                source={{ uri: post.imageUrl }} 
                style={styles.fullScreenImage} 
                resizeMode="contain"
              />
            </View>
          </BlurView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
  },
  postCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 320,
    borderRadius: 16,
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  commentsSection: {
    paddingTop: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  emptyComments: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyCommentsText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  commentInputContainer: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 6,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    fontSize: 14,
    lineHeight: 18,
  },
  submitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  // Likes Modal Styles
  modalBlurOverlay: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  likesModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    maxHeight: '70%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  likesModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  likesModalTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  likesModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  likesModalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: 400,
  },
  likesLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likesUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  likesUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  likesUserAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesUserName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  likesEmptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  likesEmptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 4,
  },
  // Image Modal Styles
  imageModalBlurOverlay: {
    flex: 1,
  },
  imageModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalHeader: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  imageModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalDownloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '80%',
  },
});

