import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { ThemeContext } from '../../context/ThemeContext';
import { GroupPost } from '../../types/groupTypes';
import useGroups from '../../hooks/useGroups';

interface PostItemProps {
  post: GroupPost;
  groupId: string;
  currentUserId: string;
  isOrganizer: boolean;
  onDelete: (postId: string) => Promise<void>;
}

export default function PostItem({
  post,
  groupId,
  currentUserId,
  isOrganizer,
  onDelete,
}: PostItemProps) {
  const { theme } = React.useContext(ThemeContext);
  const router = useRouter();
  const { togglePostLike, togglePostFavorite } = useGroups();
  
  const [isLiked, setIsLiked] = useState(post.likes.includes(currentUserId));
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isFavorited, setIsFavorited] = useState(post.favorites?.includes(currentUserId) || false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [likesList, setLikesList] = useState<Array<{ id: string; name: string; profilePicture?: string }>>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  
  const canDelete = post.authorId === currentUserId || isOrganizer;
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(post.id),
        },
      ]
    );
  };
  
  const handleLike = async () => {
    const previousLiked = isLiked;
    const previousCount = likeCount;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    
    const success = await togglePostLike(groupId, post.id, currentUserId);
    
    if (!success) {
      // Revert on failure
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
      Alert.alert('Error', 'Failed to update like');
    }
  };
  
  const handleFavorite = async () => {
    const previousFavorited = isFavorited;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Optimistic update
    setIsFavorited(!isFavorited);
    
    const success = await togglePostFavorite(groupId, post.id, currentUserId);
    
    if (!success) {
      // Revert on failure
      setIsFavorited(previousFavorited);
      Alert.alert('Error', 'Failed to update favorite');
    }
  };
  
  const handleDownloadImage = async () => {
    if (!post.imageUrl) return;
    
    try {
      setDownloadingImage(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save photos');
        setDownloadingImage(false);
        return;
      }
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Download the image
      const fileUri = `${FileSystem.documentDirectory}${post.id}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(post.imageUrl, fileUri);
      
      // Save to media library
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert('Success', 'Image saved to your photos');
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to download image');
    } finally {
      setDownloadingImage(false);
    }
  };
  
  const handlePostPress = () => {
    router.push(`/group/post/${post.id}?groupId=${groupId}`);
  };
  
  const handleNavigateToProfile = () => {
    router.push(`/profile/${post.authorId}`);
  };
  
  const handleShowLikes = async () => {
    if (likeCount === 0) return;
    
    setShowLikesModal(true);
    setLoadingLikes(true);
    
    try {
      // Fetch user data for each person who liked the post
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
  
  return (
    <TouchableOpacity
      style={[styles.container, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
        borderColor: theme === 'light' ? '#e2e8f0' : '#334155',
      }]}
      onPress={handlePostPress}
      activeOpacity={0.95}
    >
      {/* Post Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.authorSection}
          onPress={handleNavigateToProfile}
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
            onPress={handleDelete}
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
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
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
          onLongPress={handleShowLikes}
          style={styles.actionButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isLiked ? 'favorite' : 'favorite-border'}
            size={20}
            color={isLiked ? '#ef4444' : (theme === 'light' ? '#64748b' : '#94a3b8')}
          />
          <TouchableOpacity onPress={handleShowLikes}>
            <Text style={[styles.actionText, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
        
        <View style={styles.commentButton}>
          <MaterialIcons
            name="comment"
            size={17}
            color={theme === 'light' ? '#94a3b8' : '#71717a'}
          />
          <Text style={[styles.commentText, {
            color: theme === 'light' ? '#94a3b8' : '#71717a',
          }]}>
            {post.commentCount}
          </Text>
        </View>
        
        <View style={{ flex: 1 }} />
        
        <TouchableOpacity
          onPress={handleFavorite}
          style={styles.favoriteButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isFavorited ? 'bookmark' : 'bookmark-border'}
            size={20}
            color={isFavorited ? '#37a4c8' : (theme === 'light' ? '#64748b' : '#94a3b8')}
          />
        </TouchableOpacity>
      </View>
      
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
                backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(26, 26, 26, 0.98)',
              }]}>
                <View style={styles.likesModalHeader}>
                  <View style={styles.likesModalTitleSection}>
                    <MaterialIcons name="favorite" size={24} color="#ef4444" />
                    <Text style={[styles.likesModalTitle, {
                      color: theme === 'light' ? '#1e293b' : '#f1f5f9',
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
                          backgroundColor: theme === 'light' ? '#f8f9fa' : '#1a1a1a',
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
                          color: theme === 'light' ? '#1e293b' : '#f1f5f9',
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
      {post.imageUrl && (
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    fontSize: 12,
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 4,
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

