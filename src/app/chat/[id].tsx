import {
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  FlatList,
  Modal,
} from "react-native";
import React, { useEffect, useRef, useState, useCallback } from "react";
import useUsers from "../../hooks/useUsers";
import useChats from "../../hooks/useChats";
import useAuth from "../../hooks/auth";
import { router, useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db, storage } from "../../../config/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import ImageViewing from "react-native-image-viewing";
import TopBar from "../../components/TopBar";
import LoadingScreen from "../../components/LoadingScreen";
import { ThemeContext } from "../../context/ThemeContext";
import { containsFilteredContent, getFilteredContentCategory } from "../../utils/contentFilter";
import LoadingElement from "../../components/LoadingElement";
import UserAvatar from "../../components/UserAvatar";
import useNotificationCount from "../../hooks/useNotificationCount";

interface Chat {
  id: string; 
  participants: string[];
  connectionId?: string;
  connectionType?: string;
  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  lastMessage?: string;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
  lastMessageTime?: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  status?: 'pending' | 'active';
}

interface Message {
  id: string;
  text: string;
  date: {
    seconds: number;
    nanoseconds: number;
  } | Date;
  sender: string;
  receiver: string;
  status?: 'sent' | 'delivered' | 'read';
  imageUrl?: string;
}

interface Partner {
  id: string;
  name: string;
  profilePicture?: string;
  age?: number;
  airportCode?: string;
  moodStatus?: string;
  bio?: string;
}

// Cache for user profiles
const userProfileCache = new Map<string, any>();

interface MessageItemProps {
  item: Message;
  isCurrentUser: boolean;
  theme: string;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

// Format timestamp for display
const formatTimestamp = (dateObj: { seconds: number; nanoseconds: number } | Date) => {
  if (!dateObj) return "";
  const date = 'seconds' in dateObj ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date for message groups
const formatMessageDate = (dateObj: { seconds: number; nanoseconds: number } | Date) => {
  if (!dateObj) return "";
  const date = 'seconds' in dateObj ? new Date(dateObj.seconds * 1000) : new Date(dateObj);
  if (isNaN(date.getTime())) return "";
  
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return date.toLocaleDateString([], { 
      weekday: 'long',
      month: 'short', 
      day: 'numeric' 
    });
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
};

const MessageItem: React.FC<MessageItemProps> = ({ item, isCurrentUser, theme, isFirstInGroup, isLastInGroup }) => {
  const [userProfile, setUserProfile] = useState<any>(userProfileCache.get(item.sender) || null);
  const router = useRouter();
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(!userProfileCache.has(item.sender));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  // Get image dimensions when imageUrl changes
  useEffect(() => {
    if (item.imageUrl) {
      setImageLoading(true);
      setImageError(false);
      Image.getSize(
        item.imageUrl,
        (width, height) => {
          const maxWidth = 250;
          const maxHeight = 300;
          const aspectRatio = width / height;
          
          let finalWidth = maxWidth;
          let finalHeight = maxWidth / aspectRatio;
          
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * aspectRatio;
          }
          
          setImageDimensions({ width: finalWidth, height: finalHeight });
        },
        (error) => {
          console.error('Error getting image size:', error);
          setImageDimensions({ width: 250, height: 200 });
        }
      );
    }
  }, [item.imageUrl]);

  // Add loading progress animation with pulse
  useEffect(() => {
    if (isLoading) {
      // Main loading line animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(loadingProgress, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
          }),
          Animated.timing(loadingProgress, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic),
          }),
        ])
      ).start();
    } else {
      loadingProgress.setValue(0);
      pulseAnim.setValue(0);
    }
  }, [isLoading]);

  // Animate message bubble on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(bubbleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!isCurrentUser && !userProfileCache.has(item.sender)) {
        setIsLoading(true);
        const startTime = Date.now();
        
        const userDoc = await getDoc(doc(db, 'users', item.sender));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          setUserProfile(profileData);
          userProfileCache.set(item.sender, profileData);
        }

        // Ensure loading state lasts at least 1 second
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
        }
        
        // Fade in the content with a slight bounce
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(fadeAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          })
        ]).start();
        
        setIsLoading(false);
      } else if (!isLoading) {
        fadeAnim.setValue(1);
      }
    };
    fetchUserProfile();
  }, [item.sender, isCurrentUser]);

  const handleImagePress = () => {
    if (item.imageUrl && !imageError) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setImageViewVisible(true);
    }
  };

  const handleSaveImage = async () => {
    if (!item.imageUrl) return;
    
    try {
      setSavingImage(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to save photos');
        setSavingImage(false);
        return;
      }
      
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      // Download the image
      const fileUri = `${FileSystem.documentDirectory}${item.id || Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(item.imageUrl, fileUri);
      
      // Save to media library
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert('Success', 'Image saved to your photos');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <Animated.View style={[
      styles.messageContainer,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      {
        opacity: bubbleAnim,
        transform: [{ scale: scaleAnim }]
      }
    ]}>
      {!isCurrentUser && isFirstInGroup && (
        <TouchableOpacity 
          onPress={() => router.push(`/profile/${item.sender}`)}
          style={styles.profileImageContainer}
        >
          {isLoading ? (
            <View style={[styles.profileImage, { backgroundColor: theme === "light" ? "#f8f9fa" : "#1a1a1a" }]}>
              <Animated.View 
                style={[
                  styles.loadingLine,
                  {
                    backgroundColor: theme === "light" ? "#37a4c8" : "#4db8d4",
                    transform: [{
                      translateX: loadingProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 100]
                      })
                    }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0.8, 0.3]
                    })
                  }
                ]}
              />
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim }}>
              <UserAvatar
                user={userProfile || { name: 'User', profilePicture: null }}
                size={32}
                style={styles.profileImage}
              />
            </Animated.View>
          )}
        </TouchableOpacity>
      )}
      
      {!isCurrentUser && !isFirstInGroup && (
        <View style={styles.profileImageSpacer} />
      )}

      <View style={[
        styles.messageBubble, 
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        isFirstInGroup && !isCurrentUser ? styles.firstInGroup : null,
        isLastInGroup && !isCurrentUser ? styles.lastInGroup : null,
        { 
          backgroundColor: isCurrentUser 
            ? theme === "light" ? "#ffffff" : "#000000"
            : theme === "light" 
              ? "#f0f0f0" 
              : "#2a2a2a",
          borderColor: isCurrentUser 
            ? theme === "light" ? "#e0e0e0" : "#000000"
            : theme === "light" 
              ? "#e0e0e0" 
              : "#3a3a3a"
        }
      ]}>
        {!isCurrentUser && isFirstInGroup && (
          <View style={styles.userNameContainer}>
            {isLoading ? (
              <View style={[styles.userNamePlaceholder, { backgroundColor: theme === "light" ? "#e6e6e6" : "#2a2a2a" }]} />
            ) : (
              <Animated.Text style={[
                styles.messageUser, 
                { 
                  color: theme === "light" ? "#1a1a1a" : "#ffffff",
                  fontWeight: "600",
                  opacity: fadeAnim
                }
              ]}>
                {userProfile?.name || userProfile?.displayName || 'Anonymous'}
              </Animated.Text>
            )}
            <Animated.View 
              style={[
                styles.loadingLine,
                {
                  backgroundColor: theme === "light" ? "#37a4c8" : "#4db8d4",
                  transform: [{
                    translateX: loadingProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 100]
                    })
                  }],
                  opacity: isLoading ? pulseAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.8, 0.3]
                  }) : 0
                }
              ]}
            />
          </View>
        )}
        
        {item.imageUrl && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={handleImagePress}
            disabled={imageError || imageLoading}
          >
            <View style={styles.imageContainer}>
              {imageLoading && !imageError && (
                <View style={[
                  styles.imageLoadingContainer, 
                  {
                    backgroundColor: theme === "light" ? "#f0f0f0" : "#1a1a1a",
                    width: imageDimensions?.width || 250,
                    height: imageDimensions?.height || 200,
                  }
                ]}>
                  <ActivityIndicator 
                    size="small" 
                    color={theme === "light" ? "#37a4c8" : "#4db8d4"} 
                  />
                </View>
              )}
              {imageError ? (
                <View style={[
                  styles.imageErrorContainer, 
                  {
                    backgroundColor: theme === "light" ? "#f0f0f0" : "#1a1a1a",
                    width: imageDimensions?.width || 250,
                    height: imageDimensions?.height || 200,
                  }
                ]}>
                  <Ionicons 
                    name="image-outline" 
                    size={32} 
                    color={theme === "light" ? "#999999" : "#666666"} 
                  />
                  <Text style={[styles.imageErrorText, {
                    color: theme === "light" ? "#999999" : "#666666",
                  }]}>
                    Failed to load image
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={[
                    styles.messageImage,
                    imageDimensions ? {
                      width: imageDimensions.width,
                      height: imageDimensions.height,
                    } : {
                      width: 250,
                      height: 200,
                    }
                  ]}
                  resizeMode="contain"
                  onLoadStart={() => {
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoad={() => {
                    setImageLoading(false);
                  }}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        )}
        {item.text && (
          <Text style={[styles.messageText, { 
            color: isCurrentUser 
              ? theme === "light" ? "#000000" : "#ffffff"
              : theme === "light" ? "#1a1a1a" : "#ffffff",
            fontWeight: isCurrentUser ? "500" : "400",
            lineHeight: 20,
            marginTop: item.imageUrl ? 8 : 0
          }]}>
            {item.text}
          </Text>
        )}
        
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTimestamp, { 
            color: isCurrentUser 
              ? theme === "light" ? "#666666" : "#ffffff"
              : theme === "light" ? "#666666" : "#a0a0a0",
            opacity: isCurrentUser ? 0.7 : 0.8
          }]}>
            {formatTimestamp(item.date)}
          </Text>
          {isCurrentUser && (
            <View style={styles.messageStatus}>
              {item.status === 'read' ? (
                <Ionicons 
                  name="checkmark-done" 
                  size={16} 
                  color={theme === "light" ? "#000000" : "#ffffff"}
                  style={{ marginLeft: 4, opacity: 0.9 }}
                />
              ) : item.status === 'delivered' ? (
                <Ionicons 
                  name="checkmark-done" 
                  size={16} 
                  color={theme === "light" ? "#000000" : "#ffffff"}
                  style={{ marginLeft: 4, opacity: 0.7 }}
                />
              ) : (
                <Ionicons 
                  name="checkmark" 
                  size={16} 
                  color={theme === "light" ? "#000000" : "#ffffff"}
                  style={{ marginLeft: 4, opacity: 0.5 }}
                />
              )}
            </View>
          )}
        </View>
      </View>
      
      {/* Image Viewer Modal */}
      {item.imageUrl && (
        <ImageViewing
          images={[{ uri: item.imageUrl }]}
          imageIndex={0}
          visible={imageViewVisible}
          onRequestClose={() => setImageViewVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
          HeaderComponent={({ imageIndex }) => (
            <View style={[styles.imageViewerHeader, {
              backgroundColor: theme === "light" ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.7)",
            }]}>
              <TouchableOpacity
                onPress={() => setImageViewVisible(false)}
                style={styles.imageViewerCloseButton}
              >
                <Ionicons 
                  name="close" 
                  size={28} 
                  color={theme === "light" ? "#000000" : "#ffffff"} 
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveImage}
                disabled={savingImage}
                style={styles.imageViewerSaveButton}
              >
                {savingImage ? (
                  <ActivityIndicator 
                    size="small" 
                    color={theme === "light" ? "#000000" : "#ffffff"} 
                  />
                ) : (
                  <Ionicons 
                    name="download-outline" 
                    size={24} 
                    color={theme === "light" ? "#000000" : "#ffffff"} 
                  />
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </Animated.View>
  );
};

export default function Chat() {
  // Get chat ID from params
  const { id } = useLocalSearchParams();
  const chatId = id as string;

  const { user: authUser } = useAuth();
  const { getUser, error: usersError } = useUsers();
  const {
    getChat,
    subscribeToChat,
    getMessages,
    subscribeToMessages,
    addMessage,
    deleteMessage,
    error: chatError,
  } = useChats();

  const [partner, setPartner] = useState<Partner | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const flatListRef = useRef<FlatList<any>>(null);
  const isInitialScrollDone = useRef(false);
  const [messageError, setMessageError] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnimatedValue = useRef(new Animated.Value(0)).current;
  const inputContainerAnim = useRef(new Animated.Value(0)).current;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const insets = useSafeAreaInsets();
  const globalTopBarHeight = 50 + insets.top;
  const chatHeaderHeight = 70;

  // Access ThemeContext
  const { theme } = React.useContext(ThemeContext);
  
  // Get notification count
  const notificationCount = useNotificationCount(authUser?.uid || null);

  // Group messages by sender and time proximity
  const groupMessages = useCallback((messages: Message[]) => {
    const grouped: Array<Message & { isFirstInGroup: boolean; isLastInGroup: boolean; showDate: boolean }> = [];
    
    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i];
      const prevMessage = messages[i - 1]; // Newer message (in inverted list)
      const nextMessage = messages[i + 1]; // Older message (in inverted list)
      
      // Check if this is the first message in a group (going backwards in time)
      const isFirstInGroup = !nextMessage || 
        nextMessage.sender !== currentMessage.sender ||
        shouldShowDateSeparator(currentMessage.date, nextMessage.date);
      
      // Check if this is the last message in a group (going backwards in time)
      const isLastInGroup = !prevMessage || 
        prevMessage.sender !== currentMessage.sender ||
        shouldShowDateSeparator(prevMessage.date, currentMessage.date);
      
      // Show date separator before this message group (above when displayed)
      // Since list is inverted, show date when transitioning to older messages
      const showDate = !nextMessage || shouldShowDateSeparator(currentMessage.date, nextMessage.date);
      
      grouped.push({
        ...currentMessage,
        isFirstInGroup,
        isLastInGroup,
        showDate
      });
    }
    
    return grouped;
  }, []);

  // Helper function to determine if we should show a date separator
  const shouldShowDateSeparator = (date1?: any, date2?: any) => {
    if (!date1 || !date2) return true;
    
    const d1 = 'seconds' in date1 ? new Date(date1.seconds * 1000) : new Date(date1);
    const d2 = 'seconds' in date2 ? new Date(date2.seconds * 1000) : new Date(date2);
    
    // Check if messages are on different days
    return d1.toDateString() !== d2.toDateString();
  };

  // Get chat document and partner details on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!chatId || !authUser) return;

      try {
        setIsInitialLoading(true);
        
        // Load chat and partner data
        const fetchedChat = await getChat(chatId);
        if (fetchedChat && 'participants' in fetchedChat) {
          const chatData = fetchedChat as Chat;
          
          const otherUserId = chatData.participants.find(
            (participant: string) => participant !== authUser.uid
          );
          
          if (otherUserId) {
            // Wait for partner data to be loaded before setting chat
            const fetchedPartner = await getUser(otherUserId);
            if (fetchedPartner) {
              // Preload partner's profile picture if available
              if (fetchedPartner.profilePicture) {
                console.log('🖼️ Preloading partner profile picture');
                try {
                  await Image.prefetch(fetchedPartner.profilePicture);
                  console.log('✅ Profile picture preloaded');
                } catch (error) {
                  console.warn('Error preloading profile picture:', error);
                  // Continue anyway - we don't want to block on image loading failures
                }
              }
              
              // Set partner first, then chat - ensures partner is always available
              setPartner(fetchedPartner as Partner);
              setChat(chatData);
            } else {
              console.error("Failed to load partner data for user:", otherUserId);
            }
          } else {
            console.error("No other user found in chat participants");
          }
        } else {
          console.error("Chat not found or invalid:", chatId);
        }
      } catch (error) {
        console.error("Error loading initial chat data:", error);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInitialData();
  }, [chatId, authUser]);

  // Subscribe to real-time updates for messages
  useEffect(() => {
    if (chatId) {
      const unsubscribeMessages = subscribeToMessages(chatId, (msgs: Message[]) => {
        // Sort messages from newest to oldest for inverted list
        const sorted = msgs.sort(
          (a: Message, b: Message) => {
            const dateA = a.date instanceof Date ? a.date.getTime() : a.date.seconds * 1000;
            const dateB = b.date instanceof Date ? b.date.getTime() : b.date.seconds * 1000;
            return dateB - dateA; // Descending order for inverted list
          }
        );
        setMessages(sorted);
        
        // Auto-scroll to bottom when new messages arrive
        setTimeout(() => scrollToBottom(true), 200);
      });
      return () => unsubscribeMessages();
    }
  }, [chatId, partner?.id]);

  // Subscribe to real-time updates for the chat document
  useEffect(() => {
    if (chatId) {
      const unsubscribeChat = subscribeToChat(chatId, (updatedChat: Chat) => {
        setChat(updatedChat);
      });
      return () => unsubscribeChat();
    }
  }, [chatId]);

  // Function to scroll to bottom
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      // Scroll to offset 0 since list is inverted
      flatListRef.current.scrollToOffset({ offset: 0, animated });
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !isInitialScrollDone.current) {
      scrollToBottom(false);
      isInitialScrollDone.current = true;
    }
  }, [messages]);

  // Smooth keyboard animations
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const duration = Platform.OS === 'ios' ? e.duration || 250 : 250;
        setKeyboardHeight(e.endCoordinates.height);
        
        Animated.parallel([
          Animated.timing(keyboardAnimatedValue, {
            toValue: 1,
            duration: duration,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(inputContainerAnim, {
            toValue: 1,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          })
        ]).start();
        
        // Scroll to bottom smoothly
        setTimeout(() => scrollToBottom(true), duration / 2);
      }
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        const duration = Platform.OS === 'ios' ? e.duration || 250 : 250;
        
        Animated.parallel([
          Animated.timing(keyboardAnimatedValue, {
            toValue: 0,
            duration: duration,
            useNativeDriver: false,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.spring(inputContainerAnim, {
            toValue: 0,
            friction: 8,
            tension: 80,
            useNativeDriver: true,
          })
        ]).start(() => {
          setKeyboardHeight(0);
        });
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

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
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `chat_images/${chatId}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSendMessage = async () => {
    if ((newMessage.trim() === "" && !selectedImage) || !authUser || !partner) return;
    
    // Check for inappropriate content in text
    if (newMessage.trim() && containsFilteredContent(newMessage)) {
      setMessageError(true);
      Alert.alert(
        "Inappropriate Content",
        `Your message contains inappropriate content. Please review and try again.`,
        [{ text: "OK" }]
      );
      return;
    }
    
    setMessageError(false);
    const messageText = newMessage.trim();
    const imageUri = selectedImage;
    
    // Clear input immediately for better UX
    setNewMessage("");
    setSelectedImage(null);
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    setUploadingImage(true);
    
    try {
      let imageUrl: string | undefined;
      
      // Upload image if selected
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
      }
      
      const messageData = {
        text: messageText || (imageUrl ? '📷' : ''),
        date: new Date(),
        sender: authUser.uid,
        receiver: partner.id,
        status: 'sent' as const,
        ...(imageUrl && { imageUrl })
      };
      
      await addMessage(chatId, messageData);

      // Update the chat document with the last message info
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: messageText || (imageUrl ? '📷 Photo' : ''),
        lastMessageStatus: 'sent',
        lastMessageTime: new Date()
      });
      
      setUploadingImage(false);

      // Scroll to bottom after message is added
      setTimeout(() => scrollToBottom(true), 200);

      // Get sender's data for the notification
      const senderDoc = await getDoc(doc(db, 'users', authUser.uid));
      const senderData = senderDoc.exists() ? senderDoc.data() : null;
      const senderName = senderData?.name || partner.name;

      // Get receiver's data to check notification preferences and push token
      const receiverDoc = await getDoc(doc(db, 'users', partner.id));
      const receiverData = receiverDoc.exists() ? receiverDoc.data() : null;

      // Check if receiver has notifications enabled and has a push token
      const hasPushToken = !!receiverData?.expoPushToken;
      const hasNotificationsEnabled = !!receiverData?.notificationPreferences?.notificationsEnabled;
      const hasChatsEnabled = !!receiverData?.notificationPreferences?.chats;

      console.log('📱 Push notification conditions:', {
        hasPushToken,
        hasNotificationsEnabled,
        hasChatsEnabled,
        receiverId: partner.id,
        token: receiverData?.expoPushToken,
        fullPreferences: receiverData?.notificationPreferences
      });

      if (hasPushToken && hasNotificationsEnabled && hasChatsEnabled) {
        console.log('✅ All conditions met, sending push notification to:', {
          token: receiverData.expoPushToken,
          name: senderName,
          message: messageText
        });

        // Send push notification
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-encoding': 'gzip, deflate',
            },
            body: JSON.stringify({
              to: receiverData.expoPushToken,
              title: `Message from ${senderName}`,
              body: messageText,
              sound: 'default',
              priority: 'high',
              data: { 
                type: 'chat',
                chatId: chatId,
                matchedUserId: authUser.uid,
                matchedUserName: senderName
              },
            }),
          });

          const responseData = await response.json();
          
          if (!response.ok) {
            console.error('Failed to send push notification:', {
              status: response.status,
              statusText: response.statusText,
              data: responseData
            });
          } else {
            console.log('Push notification sent successfully:', responseData);
          }
        } catch (error) {
          console.error('Error sending push notification:', {
            error,
            receiverId: partner.id,
            token: receiverData.expoPushToken
          });
        }
      } else {
        console.log('Push notification not sent because:', {
          hasToken: !!receiverData?.expoPushToken,
          notificationsEnabled: receiverData?.notificationPreferences?.notificationsEnabled,
          chatsEnabled: receiverData?.notificationPreferences?.chats,
          receiverId: partner.id
        });
      }

      // Add notification to receiver's user document
      const notification = {
        id: Date.now().toString(),
        title: `Message from ${senderName}`,
        body: messageText,
        data: {
          type: 'chat',
          chatId: chatId,
          matchedUserId: authUser.uid,
          matchedUserName: senderName
        },
        timestamp: new Date(),
        read: false
      };

      // Add notification to receiver's user document
      if (receiverDoc.exists()) {
        const notifications = receiverData?.notifications || [];
        await updateDoc(doc(db, 'users', partner.id), {
          notifications: [...notifications, notification]
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setUploadingImage(false);
      // Restore message if send fails
      setNewMessage(messageText);
      if (imageUri) {
        setSelectedImage(imageUri);
      }
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleLongPressMessage = (message: Message) => {
    if (!authUser || message.sender !== authUser.uid) return;
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMessage(chatId, message.id);
        },
      },
    ]);
  };

  // Add cleanup for cache when component unmounts
  useEffect(() => {
    return () => {
      userProfileCache.clear();
    };
  }, []);

  // Render date separator
  const renderDateSeparator = (date: any) => (
    <View style={styles.dateSeparatorContainer}>
      <View style={[styles.dateSeparator, { 
        backgroundColor: theme === "light" ? "#e8e9ea" : "#2a2a2a"
      }]}>
        <Text style={[styles.dateSeparatorText, { 
          color: theme === "light" ? "#666666" : "#a0a0a0"
        }]}>
          {formatMessageDate(date)}
        </Text>
      </View>
    </View>
  );

  // Render message item
  const renderMessageItem = ({ item, index }: { item: Message & { isFirstInGroup: boolean; isLastInGroup: boolean; showDate: boolean }, index: number }) => {
    const isCurrentUser = item.sender === authUser?.uid;
    
    return (
      <>
        {item.showDate && renderDateSeparator(item.date)}
        <TouchableOpacity
          onLongPress={() => handleLongPressMessage(item)}
          activeOpacity={0.9}
          style={styles.messageTouchable}
        >
          <MessageItem 
            item={item} 
            isCurrentUser={isCurrentUser} 
            theme={theme || 'light'} 
            isFirstInGroup={item.isFirstInGroup}
            isLastInGroup={item.isLastInGroup}
          />
        </TouchableOpacity>
      </>
    );
  };

  // Show loading screen until all required data is loaded
  if (isInitialLoading || !partner || !chat || !authUser) {
    return (
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  // Show error if there's an error loading data
  if (usersError || chatError) {
    return (
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Error: {usersError || chatError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.replace("/chat/chatInbox")}
          >
            <Text style={styles.retryButtonText}>Return to Inbox</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  const groupedMessages = groupMessages(messages);

  return (
    <View style={[styles.flex, { backgroundColor: theme === "light" ? "#F8FAFC" : "#000000" }]}>
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title=""
          onProfilePress={() => router.push(`/profile/${authUser.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />

        {/* Chat Header Top Bar */}
        <View style={[styles.chatHeader, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderBottomWidth: 1,
          borderBottomColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
        }]}>
          <TouchableOpacity 
            onPress={() => router.push(`/profile/${partner.id}`)}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <View style={[styles.avatarContainer, { 
              backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
            }]}>
              <View style={[styles.avatar, { 
                backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
              }]}>
                <UserAvatar
                  user={partner}
                  size={40}
                  style={styles.avatar}
                />
                <View style={styles.onlineIndicator} />
              </View>
            </View>
            <View style={styles.headerTextContainer}>
              <View style={styles.nameRow}>
                <Text style={[styles.partnerName, { 
                  color: theme === "light" ? "#1a1a1a" : "#ffffff",
                }]}>
                  {partner.name}
                </Text>
                {partner.age && (
                  <Text style={[styles.ageText, { 
                    color: theme === "light" ? "#666666" : "#a0a0a0"
                  }]}>
                    {partner.age}
                  </Text>
                )}
              </View>
              <View style={styles.infoRow}>
                {partner.airportCode && (
                  <View style={[styles.infoBadge, { 
                    backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                  }]}>
                    <Ionicons name="airplane" size={14} color="#37a4c8" />
                    <Text style={[styles.infoText, { 
                      color: theme === "light" ? "#666666" : "#a0a0a0"
                    }]}>
                      {partner.airportCode}
                    </Text>
                  </View>
                )}
                {partner.moodStatus && (
                  <View style={[styles.infoBadge, { 
                    backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                  }]}>
                    <Ionicons name="happy" size={14} color="#37a4c8" />
                    <Text style={[styles.infoText, { 
                      color: theme === "light" ? "#666666" : "#a0a0a0"
                    }]}>
                      {partner.moodStatus}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.chatContainer}>
          {/* Chat Messages */}
          <FlatList
            ref={flatListRef}
            data={groupedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={[styles.messagesContent, { 
              paddingBottom: 20,
              paddingTop: 16,
            }]}
            onContentSizeChange={() => scrollToBottom()}
            onLayout={() => scrollToBottom()}
            showsVerticalScrollIndicator={false}
            inverted
            style={styles.messagesContainer}
            removeClippedSubviews={false}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={20}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
            }}
          />

          {/* Chat Input Area */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? globalTopBarHeight + chatHeaderHeight - insets.bottom : 20}
          >
            <Animated.View
              style={{
                transform: [{
                  translateY: inputContainerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5]
                  })
                }],
                opacity: inputContainerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1]
                })
              }}
            >
              <SafeAreaView 
                edges={["bottom"]} 
                style={[styles.inputSafeArea, { 
                  backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                }]}
              >
                  <View 
                    style={[styles.inputContainer, { 
                      backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
                    }]}
                  >
                    {/* Image Preview */}
                    {selectedImage && (
                      <View style={styles.imagePreview}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => setSelectedImage(null)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <View style={styles.inputRow}>
                      <TouchableOpacity
                        style={styles.mediaButton}
                        onPress={handlePickImage}
                        disabled={uploadingImage}
                      >
                        <Ionicons 
                          name="image-outline" 
                          size={24} 
                          color={theme === "light" ? "#37a4c8" : "#4db8d4"} 
                        />
                      </TouchableOpacity>
                      
                      <Animated.View style={[styles.inputWrapper, {
                        transform: [{
                          scale: inputContainerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.01]
                          })
                        }]
                      }]}>
                        <TextInput
                          style={[styles.input, { 
                            backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                            color: theme === "light" ? "#1a1a1a" : "#ffffff",
                            borderColor: messageError ? "#ff4444" : theme === "light" ? "#e8e9ea" : "#3a3a3a"
                          }]}
                          placeholder={messageError ? "Inappropriate content detected" : "Type your message..."}
                          placeholderTextColor={messageError ? "#ff4444" : theme === "light" ? "#666666" : "#a0a0a0"}
                          value={newMessage}
                          onChangeText={(text) => {
                            setNewMessage(text);
                            if (messageError && !containsFilteredContent(text)) {
                              setMessageError(false);
                            }
                          }}
                          multiline
                          maxLength={1000}
                          keyboardAppearance={theme === "light" ? "light" : "dark"}
                          returnKeyType="send"
                          onSubmitEditing={(e) => {
                            e.preventDefault();
                            if ((newMessage.trim() !== "" || selectedImage) && !messageError) {
                              handleSendMessage();
                            }
                          }}
                          blurOnSubmit={false}
                          enablesReturnKeyAutomatically={true}
                          autoCorrect={true}
                          spellCheck={true}
                        />
                      </Animated.View>
                      
                      {uploadingImage ? (
                        <View style={styles.sendButton}>
                          <ActivityIndicator size="small" color="#fff" />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.sendButton, 
                            (messageError || (newMessage.trim() === "" && !selectedImage)) && styles.sendButtonDisabled
                          ]}
                          onPress={handleSendMessage}
                          disabled={messageError || (newMessage.trim() === "" && !selectedImage)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name="send" 
                            size={22} 
                            color={(messageError || (newMessage.trim() === "" && !selectedImage)) ? "#999999" : "#fff"} 
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
            </SafeAreaView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '75%',
    minWidth: '30%',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  currentUserBubble: {
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopLeftRadius: 18,
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  otherUserBubble: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopRightRadius: 18,
  },
  firstInGroup: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  lastInGroup: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  rightMessageText: {
    color: "#ffffff",
    fontWeight: "500",
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "right",
    opacity: 0.8,
    fontWeight: "500",
  },
  inputSafeArea: {
    backgroundColor: "transparent",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  mediaButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 2,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    fontSize: 15,
    borderWidth: 1,
    letterSpacing: 0.2,
    maxHeight: 100,
    minHeight: 44,
  },
  imageContainer: {
    marginBottom: 4,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    maxWidth: 250,
    position: 'relative',
  },
  messageImage: {
    maxWidth: 250,
    maxHeight: 300,
    borderRadius: 12,
    minWidth: 150,
    minHeight: 150,
  },
  imageLoadingContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imageErrorContainer: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageErrorText: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  imageViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  imageViewerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerSaveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: "#37a4c8",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 16,
    textAlign: "center",
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#37a4c8",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    overflow: "hidden",
  },
  placeholderAvatar: {
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  onlineStatus: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 4,
  },
  messageStatus: {
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageText: {
    fontSize: 15,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  sendButtonTextDisabled: {
    color: "#666666",
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 3,
    paddingHorizontal: 4,
  },
  currentUserContainer: {
    justifyContent: 'flex-end',
  },
  otherUserContainer: {
    justifyContent: 'flex-start',
  },
  profileImageContainer: {
    marginRight: 8,
    marginBottom: 4,
    marginLeft: 0,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  profileImageSpacer: {
    width: 40,
    height: 32,
  },
  defaultAvatar: {
    backgroundColor: '#000000',
  },
  userNameContainer: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 6,
  },
  userNamePlaceholder: {
    height: 16,
    width: '60%',
    borderRadius: 4,
  },
  loadingLine: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    right: 0,
    height: 2,
    width: '100%',
    borderRadius: 1,
  },
  messageUser: {
    fontSize: 13,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
    fontWeight: "500",
  },
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 8,
  },
  dateSeparator: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  messageTouchable: {
    flex: 1,
  },
});
