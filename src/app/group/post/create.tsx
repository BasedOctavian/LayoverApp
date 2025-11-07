import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../../config/firebaseConfig';
import { ThemeContext } from '../../../context/ThemeContext';
import useAuth from '../../../hooks/auth';
import useGroups from '../../../hooks/useGroups';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../config/firebaseConfig';
import TopBar from '../../../components/TopBar';
import useNotificationCount from '../../../hooks/useNotificationCount';
import { scaleFontSize, scaleHeight, scaleWidth, moderateScale, spacing, borderRadius } from '../../../utils/responsive';

export default function CreatePost() {
  const { theme } = React.useContext(ThemeContext);
  const { user, userId } = useAuth();
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const { createPost } = useGroups();
  const notificationCount = useNotificationCount(userId || null);

  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLight = theme === 'light';

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
    
    if (!user || !groupId) return;

    setSubmitting(true);
    try {
      let imageUrl: string | undefined;
      
      if (imageUri) {
        setUploading(true);
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const filename = `post_${Date.now()}.jpg`;
        const storageRef = ref(storage, `groupPosts/${groupId}/${filename}`);
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
        setUploading(false);
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      await createPost(
        groupId as string,
        content.trim(),
        user.uid,
        userData.name || user.displayName || 'Anonymous',
        userData.profilePicture || user.photoURL || undefined,
        imageUrl
      );
      
      // Navigate back immediately - the feed will auto-refresh
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
      setUploading(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (content.trim() || imageUri) {
      Alert.alert(
        'Discard Post',
        'Are you sure you want to discard this post?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, {
      backgroundColor: isLight ? '#f8f9fa' : '#000000',
    }]} edges={['bottom']}>
      <LinearGradient 
        colors={isLight ? ['#f8f9fa', '#ffffff'] : ['#000000', '#1a1a1a']} 
        style={styles.container}
      >
        <StatusBar 
          translucent 
          backgroundColor="transparent" 
          barStyle={isLight ? 'dark-content' : 'light-content'} 
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

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Content Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, {
                color: isLight ? '#1e293b' : '#f1f5f9',
              }]}>
                What's on your mind? <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.textArea, {
                  backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                  color: isLight ? '#1e293b' : '#f1f5f9',
                  borderColor: content ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                }]}
                placeholder="Share your thoughts with the group..."
                placeholderTextColor={isLight ? '#94a3b8' : '#64748b'}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={2000}
                autoFocus
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, {
                color: isLight ? '#94a3b8' : '#64748b',
              }]}>
                {content.length} / 2000
              </Text>
            </View>

            {/* Image Preview */}
            {imageUri && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity
                  onPress={handleRemoveImage}
                  style={styles.removeImageButton}
                  disabled={uploading || submitting}
                >
                  <MaterialIcons name="close" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Image Button */}
            <TouchableOpacity
              onPress={handlePickImage}
              style={[styles.imageButton, {
                backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
                borderColor: isLight ? '#e2e8f0' : '#334155',
              }]}
              disabled={uploading || submitting}
            >
              <MaterialIcons name="image" size={22} color="#37a4c8" />
              <Text style={[styles.imageButtonText, {
                color: isLight ? '#64748b' : '#94a3b8',
              }]}>
                {imageUri ? 'Change Image' : 'Add Image'}
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, {
                backgroundColor: (content.trim() && !submitting && !uploading) ? '#37a4c8' : (isLight ? '#e2e8f0' : '#334155'),
                opacity: (content.trim() && !submitting && !uploading) ? 1 : 0.6,
              }]}
              onPress={handleSubmit}
              disabled={!content.trim() || submitting || uploading}
            >
              {submitting || uploading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Post</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: scaleHeight(40),
  },
  inputGroup: {
    marginBottom: spacing.xxl,
  },
  label: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    marginBottom: spacing.sm,
    letterSpacing: -0.2,
  },
  required: {
    color: '#ef4444',
  },
  textArea: {
    paddingHorizontal: spacing.lg,
    paddingVertical: moderateScale(14),
    borderRadius: borderRadius.md,
    fontSize: scaleFontSize(16),
    borderWidth: 1.5,
    minHeight: scaleHeight(270),
    textAlignVertical: 'top',
    lineHeight: scaleFontSize(24),
  },
  charCount: {
    fontSize: scaleFontSize(12),
    marginTop: moderateScale(6),
    textAlign: 'right',
    fontWeight: '500',
  },
  imagePreview: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
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
    height: scaleHeight(220),
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
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    marginBottom: spacing.xl,
  },
  imageButtonText: {
    fontSize: scaleFontSize(15),
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: moderateScale(14),
    marginTop: spacing.lg,
    shadowColor: '#37a4c8',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.3,
    shadowRadius: spacing.sm,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: scaleFontSize(17),
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});




