import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemeContext } from '../../context/ThemeContext';
import { PostComment } from '../../types/groupTypes';

interface CommentItemProps {
  comment: PostComment;
  currentUserId: string;
  isOrganizer: boolean;
  onDelete: (commentId: string) => Promise<void>;
}

export default function CommentItem({ comment, currentUserId, isOrganizer, onDelete }: CommentItemProps) {
  const { theme } = React.useContext(ThemeContext);
  const router = useRouter();
  
  const canDelete = comment.authorId === currentUserId || isOrganizer;
  
  const handleNavigateToProfile = () => {
    router.push(`/profile/${comment.authorId}`);
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.id),
        },
      ]
    );
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
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.authorSection}
        onPress={handleNavigateToProfile}
        activeOpacity={0.7}
      >
        {comment.authorProfilePicture ? (
          <Image source={{ uri: comment.authorProfilePicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, {
            backgroundColor: theme === 'light' ? 'rgba(55, 164, 200, 0.1)' : 'rgba(55, 164, 200, 0.15)',
          }]}>
            <MaterialIcons name="person" size={18} color="#37a4c8" />
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.contentContainer}>
        <View style={styles.bubble}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleNavigateToProfile}
              activeOpacity={0.7}
            >
              <Text style={[styles.authorName, {
                color: theme === 'light' ? '#1e293b' : '#f1f5f9',
              }]}>
                {comment.authorName}
              </Text>
            </TouchableOpacity>
            
            {canDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                style={styles.deleteButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialIcons name="more-horiz" size={18} color={theme === 'light' ? '#64748b' : '#94a3b8'} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.content, {
            color: theme === 'light' ? '#334155' : '#cbd5e1',
          }]}>
            {comment.content}
          </Text>
          
          <Text style={[styles.timestamp, {
            color: theme === 'light' ? '#94a3b8' : '#64748b',
          }]}>
            {getTimeAgo(comment.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  authorSection: {
    marginRight: 10,
    marginTop: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  bubble: {
    backgroundColor: 'rgba(55, 164, 200, 0.06)',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 2,
    marginLeft: 8,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
  },
});

