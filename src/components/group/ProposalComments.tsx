import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../config/firebaseConfig';
import useGroups from '../../hooks/useGroups';
import { ProposalComment } from '../../types/groupTypes';

interface ProposalCommentsProps {
  groupId: string;
  proposalId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserProfilePicture?: string;
  theme: string;
  nested?: boolean; // If true, renders as View instead of FlatList (for use inside ScrollView)
  keyboardVisible?: boolean; // Keyboard visibility state for dynamic padding
}

export default function ProposalComments({
  groupId,
  proposalId,
  currentUserId,
  currentUserName,
  currentUserProfilePicture,
  theme,
  nested = false,
  keyboardVisible = false,
}: ProposalCommentsProps) {
  const { getProposalComments, addProposalComment } = useGroups();
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    try {
      const fetchedComments = await getProposalComments(groupId, proposalId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId, proposalId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const pickMedia = async (type: 'image' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add media');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'image' 
        ? ImagePicker.MediaTypeOptions.Images 
        : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: type === 'image',
      aspect: type === 'image' ? [4, 3] : undefined,
      quality: 0.8,
      videoMaxDuration: 60, // 60 seconds max
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'image') {
        setSelectedImage(result.assets[0].uri);
        setSelectedVideo(null);
      } else {
        setSelectedVideo(result.assets[0].uri);
        setSelectedImage(null);
      }
    }
  };

  const uploadMedia = async (uri: string, type: 'image' | 'video'): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const extension = type === 'image' ? 'jpg' : 'mp4';
    const filename = `proposal-comments/${groupId}/${proposalId}/${Date.now()}.${extension}`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() && !selectedImage && !selectedVideo) return;

    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;
      
      if (selectedImage) {
        imageUrl = await uploadMedia(selectedImage, 'image');
      }
      if (selectedVideo) {
        videoUrl = await uploadMedia(selectedVideo, 'video');
      }

      await addProposalComment(
        groupId,
        proposalId,
        newComment.trim() || (selectedImage ? '📷' : '🎥'),
        currentUserId,
        currentUserName,
        currentUserProfilePicture,
        imageUrl,
        videoUrl
      );

      setNewComment('');
      setSelectedImage(null);
      setSelectedVideo(null);
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: ProposalComment }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.authorProfilePicture || 'https://via.placeholder.com/40' }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={[styles.commentAuthor, {
          color: theme === 'light' ? '#1e293b' : '#f1f5f9',
        }]}>
          {item.authorName}
        </Text>
        {item.content && (
          <Text style={[styles.commentText, {
            color: theme === 'light' ? '#64748b' : '#94a3b8',
          }]}>
            {item.content}
          </Text>
        )}
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.commentImage}
            resizeMode="cover"
          />
        )}
        {item.videoUrl && (
          <View style={styles.videoContainer}>
            <MaterialIcons name="play-circle-filled" size={48} color="#37a4c8" />
            <Text style={[styles.videoText, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              Video attachment
            </Text>
            {/* In a real app, you'd use a video player component here */}
          </View>
        )}
        <Text style={[styles.commentTime, {
          color: theme === 'light' ? '#94a3b8' : '#64748b',
        }]}>
          {item.createdAt?.toDate?.().toLocaleString() || 'Just now'}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#37a4c8" />
      </View>
    );
  }

  return (
    <View style={[styles.container, {
      backgroundColor: theme === 'light' ? '#f8f9fa' : '#0f0f0f',
      borderTopColor: theme === 'light' ? '#e2e8f0' : '#334155',
    }]}>
      {/* Comments List */}
      {nested ? (
        // Render as View for nested ScrollView usage
        <View style={[styles.commentsList, { maxHeight: undefined }]}>
          {comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, {
                color: theme === 'light' ? '#94a3b8' : '#64748b',
              }]}>
                No comments yet. Be the first to comment!
              </Text>
            </View>
          ) : (
            comments.map((item) => (
              <View key={item.id}>
                {renderComment({ item })}
              </View>
            ))
          )}
        </View>
      ) : (
        // Render as FlatList for standalone usage
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          style={[styles.commentsList, { maxHeight: 300 }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, {
                color: theme === 'light' ? '#94a3b8' : '#64748b',
              }]}>
                No comments yet. Be the first to comment!
              </Text>
            </View>
          }
        />
      )}

      {/* Media Preview */}
      {(selectedImage || selectedVideo) && (
        <View style={styles.imagePreview}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          ) : (
            <View style={[styles.previewImage, styles.videoPreview]}>
              <MaterialIcons name="videocam" size={32} color="#37a4c8" />
            </View>
          )}
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => {
              setSelectedImage(null);
              setSelectedVideo(null);
            }}
          >
            <MaterialIcons name="close" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Add Comment */}
      <View style={[styles.inputContainer, {
        backgroundColor: theme === 'light' ? '#ffffff' : '#1a1a1a',
        borderTopColor: theme === 'light' ? '#e2e8f0' : '#334155',
        paddingBottom: keyboardVisible ? 12 : (nested ? 72 : 12), // Extra padding when keyboard is hidden for bottom nav bar (only when nested)
      }]}>
        <View style={styles.mediaButtons}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => pickMedia('image')}
            disabled={submitting}
          >
            <MaterialIcons name="add-photo-alternate" size={24} color="#37a4c8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => pickMedia('video')}
            disabled={submitting}
          >
            <MaterialIcons name="videocam" size={24} color="#37a4c8" />
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={[styles.input, {
            backgroundColor: theme === 'light' ? '#f8f9fa' : '#0f0f0f',
            color: theme === 'light' ? '#1e293b' : '#f1f5f9',
          }]}
          placeholder="Add a comment..."
          placeholderTextColor={theme === 'light' ? '#94a3b8' : '#64748b'}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, {
            backgroundColor: (newComment.trim() || selectedImage || selectedVideo) && !submitting ? '#37a4c8' : '#cbd5e1',
          }]}
          onPress={handleSubmit}
          disabled={(!newComment.trim() && !selectedImage && !selectedVideo) || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <MaterialIcons name="send" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  commentsList: {
    paddingHorizontal: 12,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  commentTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  imagePreview: {
    position: 'relative',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  mediaButton: {
    padding: 8,
  },
  videoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
  },
  videoText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  videoPreview: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

