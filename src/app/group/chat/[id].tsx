import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
  StatusBar,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeContext } from '../../../context/ThemeContext';
import useAuth from '../../../hooks/auth';
import useChats from '../../../hooks/useChats';
import useGroups from '../../../hooks/useGroups';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../../../config/firebaseConfig';
import TopBar from '../../../components/TopBar';
import LoadingScreen from '../../../components/LoadingScreen';
import UserAvatar from '../../../components/UserAvatar';
import { containsFilteredContent } from '../../../utils/contentFilter';
import useNotificationCount from '../../../hooks/useNotificationCount';
import * as Haptics from 'expo-haptics';

interface Message {
  id: string;
  text: string;
  sender: string;
  senderName?: string;
  senderProfilePicture?: string;
  timestamp: any;
}

// Cache for user profiles
const userProfileCache = new Map<string, any>();

// Format timestamp for display
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Format date for message groups
const formatMessageDate = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
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

interface MessageItemProps {
  item: Message & { isFirstInGroup: boolean; isLastInGroup: boolean; showDate: boolean };
  isCurrentUser: boolean;
  theme: string;
  router: any;
}

const MessageItem: React.FC<MessageItemProps> = ({ item, isCurrentUser, theme, router }) => {
  const [userProfile, setUserProfile] = useState<any>(userProfileCache.get(item.sender) || null);
  const loadingProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(!userProfileCache.has(item.sender));
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Add loading progress animation with pulse
  useEffect(() => {
    if (isLoading) {
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

        const elapsedTime = Date.now() - startTime;
        if (elapsedTime < 1000) {
          await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
        }
        
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

  return (
    <Animated.View style={[
      styles.messageContainer,
      isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer,
      {
        opacity: bubbleAnim,
        transform: [{ scale: scaleAnim }]
      }
    ]}>
      {!isCurrentUser && item.isFirstInGroup && (
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
                user={userProfile || { name: item.senderName || 'User', profilePicture: item.senderProfilePicture }}
                size={32}
                style={styles.profileImage}
              />
            </Animated.View>
          )}
        </TouchableOpacity>
      )}
      
      {!isCurrentUser && !item.isFirstInGroup && (
        <View style={styles.profileImageSpacer} />
      )}

      <View style={[
        styles.messageBubble, 
        isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
        item.isFirstInGroup && !isCurrentUser ? styles.firstInGroup : null,
        item.isLastInGroup && !isCurrentUser ? styles.lastInGroup : null,
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
        {!isCurrentUser && item.isFirstInGroup && (
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
                {userProfile?.name || item.senderName || 'Anonymous'}
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
        
        <Text style={[styles.messageText, { 
          color: isCurrentUser 
            ? theme === "light" ? "#000000" : "#ffffff"
            : theme === "light" ? "#1a1a1a" : "#ffffff",
          fontWeight: isCurrentUser ? "500" : "400",
          lineHeight: 20
        }]}>
          {item.text}
        </Text>
        
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTimestamp, { 
            color: isCurrentUser 
              ? theme === "light" ? "#666666" : "#ffffff"
              : theme === "light" ? "#666666" : "#a0a0a0",
            opacity: isCurrentUser ? 0.7 : 0.8
          }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function GroupChatScreen() {
  const { id } = useLocalSearchParams();
  const groupId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { theme } = React.useContext(ThemeContext);
  const { user: authUser } = useAuth();
  const { subscribeToMessages, addMessage } = useChats();
  const { getGroup } = useGroups();
  const notificationCount = useNotificationCount(authUser?.uid || null);
  
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [messageError, setMessageError] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isInitialScrollDone = useRef(false);
  const keyboardAnimatedValue = useRef(new Animated.Value(0)).current;
  const inputContainerAnim = useRef(new Animated.Value(0)).current;

  const insets = useSafeAreaInsets();
  const globalTopBarHeight = 50 + insets.top;
  const chatHeaderHeight = 70;
  
  // Group messages by sender and time proximity
  const groupMessages = useCallback((messages: Message[]) => {
    const grouped: Array<Message & { isFirstInGroup: boolean; isLastInGroup: boolean; showDate: boolean }> = [];
    
    for (let i = 0; i < messages.length; i++) {
      const currentMessage = messages[i];
      const prevMessage = messages[i - 1];
      const nextMessage = messages[i + 1];
      
      const isFirstInGroup = !nextMessage || 
        nextMessage.sender !== currentMessage.sender ||
        shouldShowDateSeparator(currentMessage.timestamp, nextMessage.timestamp);
      
      const isLastInGroup = !prevMessage || 
        prevMessage.sender !== currentMessage.sender ||
        shouldShowDateSeparator(prevMessage.timestamp, currentMessage.timestamp);
      
      const showDate = !nextMessage || shouldShowDateSeparator(currentMessage.timestamp, nextMessage.timestamp);
      
      grouped.push({
        ...currentMessage,
        isFirstInGroup,
        isLastInGroup,
        showDate
      });
    }
    
    return grouped;
  }, []);

  const shouldShowDateSeparator = (date1?: any, date2?: any) => {
    if (!date1 || !date2) return true;
    
    const d1 = date1?.toDate ? date1.toDate() : new Date(date1);
    const d2 = date2?.toDate ? date2.toDate() : new Date(date2);
    
    return d1.toDateString() !== d2.toDateString();
  };

  // Fetch group info
  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;
      
      try {
        setIsInitialLoading(true);
        const groupData = await getGroup(groupId);
        if (groupData) {
          if (groupData.groupImage) {
            try {
              await Image.prefetch(groupData.groupImage);
            } catch (error) {
              console.warn('Error preloading group image:', error);
            }
          }
          setGroup(groupData);
        }
      } catch (error) {
        console.error('Error loading group:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);
  
  // Subscribe to messages
  useEffect(() => {
    if (!group?.chatRoomId) return;
    
    const unsubscribe = subscribeToMessages(group.chatRoomId, async (fetchedMessages: any[]) => {
      const sortedMessages = [...fetchedMessages].sort((a, b) => {
        const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
        const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
        return bTime.getTime() - aTime.getTime(); // Descending for inverted list
      });
      
      const messagesWithSenders = await Promise.all(
        sortedMessages.map(async (msg) => {
          if (!msg.senderName || !msg.senderProfilePicture) {
            try {
              const userDoc = await getDoc(doc(db, 'users', msg.sender));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                  ...msg,
                  senderName: userData.name || 'Anonymous',
                  senderProfilePicture: userData.profilePicture,
                };
              }
            } catch (error) {
              console.error('Error fetching sender info:', error);
            }
          }
          return msg;
        })
      );
      
      setMessages(messagesWithSenders);
      setTimeout(() => scrollToBottom(true), 200);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [group?.chatRoomId]);

  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToOffset({ offset: 0, animated });
    }
  };

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
        ]).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const sendPushNotification = async (receiverId: string, messageText: string, groupId: string) => {
    try {
      // Get sender's data to get their name
      const senderDoc = await getDoc(doc(db, 'users', authUser?.uid || ''));
      const senderData = senderDoc.exists() ? senderDoc.data() : null;
      const senderName = senderData?.name || senderData?.displayName || 'Someone';

      // Get group name
      const groupName = group?.name || 'Group';

      // Get receiver's data to check notification preferences and push token
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (!receiverDoc.exists()) {
        console.log('Receiver document not found:', receiverId);
        return;
      }

      const receiverData = receiverDoc.data();

      // Check if receiver has notifications enabled and has a push token
      if (receiverData?.expoPushToken && 
          receiverData?.notificationPreferences?.notificationsEnabled && 
          receiverData?.notificationPreferences?.chats) {
        
        console.log('Sending group chat push notification to:', {
          token: receiverData.expoPushToken,
          name: senderName,
          message: messageText,
          senderId: authUser?.uid
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
              title: groupName,
              body: `${senderName}: ${messageText}`,
              sound: 'default',
              priority: 'high',
              data: {
                type: 'groupChat',
                groupId: groupId,
                chatId: group?.chatRoomId,
                receiverId: receiverId,
                senderId: authUser?.uid,
                senderName: senderName
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
            console.log('Group chat push notification sent successfully:', responseData);
          }
        } catch (error) {
          console.error('Error sending push notification:', {
            error,
            receiverId: receiverId,
            token: receiverData.expoPushToken
          });
        }
      } else {
        console.log('Push notification not sent because:', {
          hasToken: !!receiverData?.expoPushToken,
          notificationsEnabled: receiverData?.notificationPreferences?.notificationsEnabled,
          chatsEnabled: receiverData?.notificationPreferences?.chats,
          receiverId: receiverId
        });
      }

      // Add notification to receiver's user document
      const notification = {
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        title: groupName,
        body: `${senderName}: ${messageText}`,
        data: {
          type: 'groupChat',
          groupId: groupId,
          chatId: group?.chatRoomId,
          receiverId: receiverId,
          senderId: authUser?.uid,
          senderName: senderName
        },
        timestamp: new Date(),
        read: false
      };

      // Add notification to receiver's notifications array
      await updateDoc(doc(db, 'users', receiverId), {
        notifications: arrayUnion(notification)
      });
    } catch (error) {
      console.error('Error in sendPushNotification:', error);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !authUser || !group?.chatRoomId) return;
    
    if (containsFilteredContent(newMessage)) {
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
    setNewMessage("");
    Keyboard.dismiss();
    
    try {
      await addMessage(group.chatRoomId, {
        text: messageText,
        sender: authUser.uid,
        senderName: authUser.displayName || 'Anonymous',
        senderProfilePicture: authUser.photoURL || null,
        timestamp: new Date(),
        content: messageText,
      });

      setTimeout(() => scrollToBottom(true), 200);
      
      // Send notifications to all group members except the sender
      if (group?.members) {
        await Promise.all(
          group.members
            .filter((memberId: string) => memberId !== authUser.uid) // Exclude sender
            .map((memberId: string) => 
              sendPushNotification(memberId, messageText, id as string)
            )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageText);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  useEffect(() => {
    return () => {
      userProfileCache.clear();
    };
  }, []);

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

  const renderMessageItem = ({ item }: { item: Message & { isFirstInGroup: boolean; isLastInGroup: boolean; showDate: boolean } }) => {
    const isCurrentUser = item.sender === authUser?.uid;
    
    return (
      <>
        {item.showDate && renderDateSeparator(item.timestamp)}
        <MessageItem 
          item={item} 
          isCurrentUser={isCurrentUser} 
          theme={theme || 'light'} 
          router={router}
        />
      </>
    );
  };

  if (isInitialLoading || !group || !authUser) {
    return (
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <LoadingScreen message="Loading chat..." />
      </LinearGradient>
    );
  }

  const isMember = group.members?.includes(authUser?.uid);
  const groupedMessages = groupMessages(messages);

  return (
    <View style={[styles.flex, { backgroundColor: theme === "light" ? "#F8FAFC" : "#000000" }]}>
      <LinearGradient colors={theme === "light" ? ["#F8FAFC", "#FFFFFF"] : ["#000000", "#1a1a1a"]} style={styles.flex}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${authUser.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />

        {/* Group Chat Header */}
        <View style={[styles.chatHeader, { 
          backgroundColor: theme === "light" ? "#ffffff" : "#1a1a1a",
          borderBottomWidth: 1,
          borderBottomColor: theme === "light" ? "#f0f0f0" : "#2a2a2a",
        }]}>
          <TouchableOpacity 
            onPress={() => router.push(`/group/${groupId}`)}
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          >
            <View style={[styles.avatarContainer, { 
              backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
            }]}>
              {group.groupImage ? (
                <Image source={{ uri: group.groupImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { 
                  backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a",
                  justifyContent: 'center',
                  alignItems: 'center'
                }]}>
                  <MaterialIcons name="groups" size={24} color="#37a4c8" />
                </View>
              )}
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={[styles.groupName, { 
                color: theme === "light" ? "#1a1a1a" : "#ffffff",
              }]}>
                {group.name}
              </Text>
              <View style={styles.infoRow}>
                <View style={[styles.infoBadge, { 
                  backgroundColor: theme === "light" ? "#f5f5f5" : "#2a2a2a"
                }]}>
                  <Ionicons name="people" size={14} color="#37a4c8" />
                  <Text style={[styles.infoText, { 
                    color: theme === "light" ? "#666666" : "#a0a0a0"
                  }]}>
                    {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {!isMember ? (
          <View style={styles.centerContainer}>
            <MaterialIcons
              name="lock"
              size={64}
              color={theme === 'light' ? '#cbd5e1' : '#475569'}
            />
            <Text style={[styles.emptyText, {
              color: theme === 'light' ? '#64748b' : '#94a3b8',
            }]}>
              Join the group to chat
            </Text>
          </View>
        ) : (
          <View style={styles.chatContainer}>
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
                      borderTopColor: theme === "light" ? "#e8e9ea" : "#2a2a2a",
                    }]}
                  > 
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
                          if (newMessage.trim() !== "" && !messageError) {
                            handleSendMessage();
                          }
                        }}
                        blurOnSubmit={false}
                        enablesReturnKeyAutomatically={true}
                        autoCorrect={true}
                        spellCheck={true}
                      />
                    </Animated.View>
                    <TouchableOpacity
                      style={[
                        styles.sendButton, 
                        (messageError || newMessage.trim() === "") && styles.sendButtonDisabled
                      ]}
                      onPress={handleSendMessage}
                      disabled={messageError || newMessage.trim() === ""}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name="send" 
                        size={22} 
                        color={(messageError || newMessage.trim() === "") ? "#999999" : "#fff"} 
                      />
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        )}
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
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
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
  groupName: {
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
  inputSafeArea: {
    backgroundColor: "transparent",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    fontSize: 15,
    marginRight: 8,
    borderWidth: 1,
    letterSpacing: 0.2,
    maxHeight: 100,
    minHeight: 44,
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
  sendButtonDisabled: {
    backgroundColor: "#cccccc",
    opacity: 0.7,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    overflow: "hidden",
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
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
  infoText: {
    fontSize: 13,
    fontWeight: "500",
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 4,
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
});
