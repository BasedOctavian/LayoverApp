import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../config/firebaseConfig';
import { ThemeContext } from '../../context/ThemeContext';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, imageUrl?: string) => Promise<void>;
  groupId: string;
}

export default function CreatePostModal({ visible, onClose, onSubmit, groupId }: CreatePostModalProps) {
  const { theme } = React.useContext(ThemeContext);
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to select an image');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  
  const handleRemoveImage = () => {
    setImageUri(null);
  };
  
  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write something');
      return;
    }
    
    setUploading(true);
    try {
      let imageUrl: string | undefined;
      
      if (imageUri) {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `post_${Date.now()}.jpg`;
        const storageRef = ref(storage, `groupPosts/${groupId}/${filename}`);
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      await onSubmit(content.trim(), imageUrl);
      
      setContent('');
      setImageUri(null);
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setUploading(false);
    }
  };
  
  const handleCancel = () => {
    if (content.trim() || imageUri) {
      Alert.alert(
        'Discard Post',
        'Are you sure you want to discard this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setContent('');
              setImageUri(null);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  const isLight = theme === 'light';
  
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <BlurView intensity={90} style={styles.blurOverlay} tint={isLight ? 'light' : 'dark'}>
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleCancel}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, {
                backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(26, 26, 26, 0.98)',
              }]}>
                {/* Header */}
                <View style={[styles.header, {
                  borderBottomColor: isLight ? '#e2e8f0' : '#334155',
                }]}>
                  <View style={styles.headerRow}>
                    <View style={styles.headerLeft}>
                      <View style={[styles.iconContainer, {
                        backgroundColor: isLight ? 'rgba(55, 164, 200, 0.12)' : 'rgba(55, 164, 200, 0.2)',
                      }]}>
                        <MaterialIcons name="edit" size={22} color="#37a4c8" />
                      </View>
                      <View style={styles.headerTextContainer}>
                        <Text style={[styles.headerTitle, {
                          color: isLight ? '#0f172a' : '#f8fafc',
                        }]}>
                          Create Post
                        </Text>
                        <Text style={[styles.headerSubtitle, {
                          color: isLight ? '#64748b' : '#94a3b8',
                        }]}>
                          Share with the group
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      onPress={handleCancel} 
                      disabled={uploading}
                      style={[styles.closeButton, {
                        backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                      }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons 
                        name="close" 
                        size={22} 
                        color={isLight ? '#64748b' : '#94a3b8'} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Content */}
                <ScrollView
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  nestedScrollEnabled={true}
                  scrollEventThrottle={16}
                  bounces={true}
                >
                  <TextInput
                    style={[styles.textInput, {
                      color: isLight ? '#0f172a' : '#f8fafc',
                      backgroundColor: isLight ? '#f8f9fa' : '#0f172a',
                      borderColor: content ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                    }]}
                    placeholder="What's on your mind?"
                    placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                    value={content}
                    onChangeText={setContent}
                    multiline
                    maxLength={2000}
                    autoFocus
                    scrollEnabled={false}
                    textAlignVertical="top"
                  />
                  
                  {imageUri && (
                    <View style={styles.imagePreview}>
                      <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                      <TouchableOpacity
                        onPress={handleRemoveImage}
                        style={styles.removeImageButton}
                        disabled={uploading}
                      >
                        <MaterialIcons name="close" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  <Text style={[styles.characterCount, {
                    color: isLight ? '#94a3b8' : '#64748b',
                  }]}>
                    {content.length} / 2000
                  </Text>
                </ScrollView>
                
                {/* Footer */}
                <View style={[styles.footer, {
                  borderTopColor: isLight ? '#e2e8f0' : '#334155',
                }]}>
                  <TouchableOpacity
                    onPress={handlePickImage}
                    style={[styles.imageButton, {
                      backgroundColor: isLight ? '#f8f9fa' : '#18181b',
                      borderColor: isLight ? '#e2e8f0' : '#27272a',
                    }]}
                    disabled={uploading}
                  >
                    <MaterialIcons name="image" size={22} color="#37a4c8" />
                    <Text style={[styles.imageButtonText, {
                      color: isLight ? '#64748b' : '#94a3b8',
                    }]}>
                      {imageUri ? 'Change' : 'Add Image'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!content.trim() || uploading}
                    style={[styles.submitButton, {
                      backgroundColor: (!content.trim() || uploading) ? (isLight ? '#e2e8f0' : '#334155') : '#37a4c8',
                      opacity: (!content.trim() || uploading) ? 0.6 : 1,
                    }]}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={18} color="#ffffff" />
                        <Text style={styles.submitButtonText}>Post</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 540,
  },
  modalContent: {
    borderRadius: 28,
    maxHeight: '88%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
    flexShrink: 1,
  },
  header: {
    paddingTop: 26,
    paddingHorizontal: 26,
    paddingBottom: 22,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  headerTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
    lineHeight: 26,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 20,
    flexGrow: 1,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 180,
    maxHeight: 240,
    padding: 18,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imagePreview: {
    marginTop: 16,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterCount: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 26,
    paddingTop: 22,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    minWidth: 140,
  },
  imageButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
