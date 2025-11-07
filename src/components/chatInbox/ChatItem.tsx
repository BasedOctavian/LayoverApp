import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { 
  doc, 
  getDoc, 
  writeBatch, 
  Timestamp, 
  collection 
} from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

import { db } from '../../../config/firebaseConfig';
import { ThemeContext } from '../../context/ThemeContext';
import UserAvatar from '../UserAvatar';
import { ChatItemProps, Partner } from './types';
import { toDate, getEventStatus } from './utils';

const ChatItem = React.memo<ChatItemProps>(({ 
  chat, 
  currentUser, 
  getUser: getPartner,
  onPress, 
  onPinPress, 
  onAccept, 
  setPendingChats, 
  setChats, 
  setFilteredChats,
  index,
  preloadedData
}) => {
  // Use preloaded partner data from chat object or preloadedData prop
  const [partner, setPartner] = useState<Partner | null>(
    chat.partnerData || preloadedData?.partner || null
  );
  const [isInitiator, setIsInitiator] = useState(preloadedData?.isInitiator || false);
  const { theme } = useContext(ThemeContext);
  const swipeableRef = useRef<Swipeable>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pinScaleAnim = useRef(new Animated.Value(1)).current;
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const acceptButtonScale = useRef(new Animated.Value(1)).current;
  const declineButtonScale = useRef(new Animated.Value(1)).current;
  const pendingPulseAnim = useRef(new Animated.Value(1)).current;
  
  // Bounce-in animation values
  const bounceOpacity = useRef(new Animated.Value(0)).current;
  const bounceTranslateY = useRef(new Animated.Value(20)).current;
  const bounceScale = useRef(new Animated.Value(0.9)).current;

  // Update partner if chat.partnerData changes
  useEffect(() => {
    if (chat.partnerData) {
      setPartner(chat.partnerData);
    }
  }, [chat.partnerData]);

  useEffect(() => {
    // Only fetch partner if not already loaded and not an event chat
    if (!partner && !chat.isEventChat && !chat.partnerData) {
      const loadPartner = async () => {
        if (chat?.participants && currentUser) {
          const partnerId = chat.participants.find(
            (id: string) => id !== currentUser.uid
          );
          if (partnerId) {
            try {
              const fetchedPartner = await getPartner(partnerId);
              setPartner(fetchedPartner);
            } catch (error) {
              console.error("Error fetching partner:", error);
            }
          }
        }
      };

      loadPartner();
    }
  }, [chat, currentUser, getPartner, partner]);

  useEffect(() => {
    // For group join requests, the user is always the initiator (they requested to join)
    if (chat.status === 'pending' && chat.isGroupChat) {
      setIsInitiator(true);
    } else if (chat.initiator !== undefined) {
      setIsInitiator(chat.initiator === currentUser.uid);
    } else if (preloadedData) {
      setIsInitiator(preloadedData.isInitiator);
    } else if (!chat.isEventChat && !chat.isGroupChat && chat.id) {
      // Fallback: only fetch if initiator is not available and it's not an event/group chat
      const checkInitiator = async () => {
        try {
          const connectionDoc = await getDoc(doc(db, 'connections', chat.id));
          if (connectionDoc.exists()) {
            const data = connectionDoc.data();
            setIsInitiator(data.initiator === currentUser.uid);
          }
        } catch (error) {
          console.error('Error checking initiator:', error);
        }
      };
      checkInitiator();
    }
  }, [chat.id, chat.initiator, chat.status, chat.isGroupChat, currentUser.uid, preloadedData, chat.isEventChat]);

  // Bounce-in animation on mount and filter changes
  useEffect(() => {
    // Reset animation values
    bounceOpacity.setValue(0);
    bounceTranslateY.setValue(20);
    bounceScale.setValue(0.9);
    
    // Stagger animation based on index (max delay of 300ms for better UX)
    const delay = Math.min(index * 50, 300);
    
    Animated.parallel([
      Animated.timing(bounceOpacity, {
        toValue: 1,
        duration: 400,
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(bounceTranslateY, {
        toValue: 0,
        delay: delay,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(bounceScale, {
        toValue: 1,
        delay: delay,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
    ]).start();
  }, [index, chat.id, bounceOpacity, bounceTranslateY, bounceScale]); // Re-animate when chat.id changes (filter change)

  // Pulsing animation for pending status indicator
  useEffect(() => {
    if (chat.status === 'pending' && !isInitiator) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pendingPulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pendingPulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      // Reset animation when not pending
      pendingPulseAnim.setValue(1);
    }
  }, [chat.status, isInitiator, pendingPulseAnim]);

  const handleAcceptPressIn = useCallback(() => {
    Animated.spring(acceptButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, []);

  const handleAcceptPressOut = useCallback(() => {
    Animated.spring(acceptButtonScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, []);

  const handleDeclinePressIn = useCallback(() => {
    Animated.spring(declineButtonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, []);

  const handleDeclinePressOut = useCallback(() => {
    Animated.spring(declineButtonScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, []);

  const handleAcceptConnection = async () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    console.log('Accept button pressed for chat:', chat.id);
    try {
      const connectionId = chat.connectionId || chat.id;
      
      if (!connectionId) {
        console.error('No connectionId found in chat:', chat);
        Alert.alert('Error', 'Invalid connection request');
        return;
      }

      // Immediately remove from pending state
      setPendingChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setFilteredChats(prevChats => prevChats.filter(c => c.id !== connectionId));

      console.log('Processing accept for connection:', connectionId);
      const connectionRef = doc(db, 'connections', connectionId);
      const connectionDoc = await getDoc(connectionRef);
      
      if (!connectionDoc.exists()) {
        console.error('Connection document not found:', connectionId);
        Alert.alert('Error', 'Connection request not found');
        return;
      }

      const connectionData = connectionDoc.data();
      console.log('Connection data:', connectionData);
      
      if (!connectionData.initiator) {
        console.error('No initiator found in connection data:', connectionData);
        Alert.alert('Error', 'Invalid connection data');
        return;
      }

      const initiatorId = connectionData.initiator;

      // Create a new chat document
      const chatRef = doc(collection(db, 'chats'));
      console.log('Creating new chat document with ID:', chatRef.id);
      
      const newChatData = {
        id: chatRef.id,
        participants: chat.participants,
        status: 'active' as const,
        connectionId: connectionId,
        createdAt: Timestamp.now(),
        lastMessageTime: Timestamp.now(),
        isPinned: false
      };

      // Start a batch write
      const batch = writeBatch(db);

      // Update connection status
      console.log('Updating connection status to active');
      batch.update(connectionRef, {
        status: 'active',
        chatId: chatRef.id
      });

      // Create the new chat document
      console.log('Creating new chat document');
      batch.set(chatRef, newChatData);

      // Get the current user's data for the notification
      const currentUserRef = doc(db, 'users', currentUser.uid);
      const currentUserDoc = await getDoc(currentUserRef);
      
      if (currentUserDoc.exists()) {
        const currentUserData = currentUserDoc.data();
        console.log('Creating notification for initiator:', initiatorId);
        
        // Get initiator's data to check notification preferences and push token
        const initiatorRef = doc(db, 'users', initiatorId);
        const initiatorDoc = await getDoc(initiatorRef);
        
        if (initiatorDoc.exists()) {
          const initiatorData = initiatorDoc.data();
          
          // Create the notification
          const notification = {
            id: Date.now().toString(),
            title: "Connection Accepted! 🎉",
            body: `${currentUserData.name} accepted your connection request`,
            data: {
              type: 'match',
              matchedUserId: currentUser.uid,
              matchedUserName: currentUserData.name
            },
            timestamp: new Date(),
            read: false
          };

          // Add notification to initiator's user document
          const notifications = initiatorData.notifications || [];
          batch.update(initiatorRef, {
            notifications: [...notifications, notification]
          });
          console.log('Notification added to initiator');

          // Send push notification if initiator has token and notifications enabled
          if (initiatorData?.expoPushToken && 
              initiatorData?.notificationPreferences?.notificationsEnabled && 
              initiatorData?.notificationPreferences?.connections) {
            
            console.log('📱 Push notification conditions met:', {
              hasToken: true,
              token: initiatorData.expoPushToken,
              notificationsEnabled: true,
              connectionsEnabled: true
            });

            try {
              const pushPayload = {
                to: initiatorData.expoPushToken,
                title: "Connection Accepted! 🎉",
                body: `${currentUserData.name} accepted your connection request`,
                sound: 'default',
                priority: 'high',
                data: {
                  type: 'match',
                  matchedUserId: currentUser.uid,
                  matchedUserName: currentUserData.name
                },
              };

              console.log('📦 Push notification payload:', pushPayload);

              const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Accept-encoding': 'gzip, deflate',
                },
                body: JSON.stringify(pushPayload),
              });

              const responseData = await response.json();
              
              if (!response.ok) {
                console.error('❌ Push notification failed:', {
                  status: response.status,
                  statusText: response.statusText,
                  data: responseData,
                  requestPayload: pushPayload
                });
              } else {
                console.log('✅ Push notification sent successfully:', {
                  responseData,
                  receiverId: initiatorId,
                  senderName: currentUserData.name
                });
              }
            } catch (error: any) {
              console.error('❌ Error sending push notification:', {
                error,
                errorMessage: error.message,
                errorStack: error.stack,
                receiverId: initiatorId,
                token: initiatorData.expoPushToken,
                senderName: currentUserData.name
              });
            }
          } else {
            console.log('ℹ️ Push notification not sent. Reason:', {
              hasToken: !!initiatorData?.expoPushToken,
              token: initiatorData?.expoPushToken,
              notificationsEnabled: initiatorData?.notificationPreferences?.notificationsEnabled,
              connectionsEnabled: initiatorData?.notificationPreferences?.connections,
              receiverId: initiatorId,
              receiverName: initiatorData.name,
              fullPreferences: initiatorData?.notificationPreferences
            });
          }
        }
      }

      // Commit all changes
      console.log('Committing batch write');
      await batch.commit();
      console.log('Batch write successful');

      // Create updated chat object with proper typing
      const updatedChat = {
        ...newChatData,
        participants: chat.participants,
        status: 'active' as const,
        connectionId: connectionId
      };

      // Call onAccept with the updated chat
      onAccept(updatedChat);

      console.log('Navigating to new chat');
      // Navigate to the new chat
      router.push("/chat/" + chatRef.id);
    } catch (error: any) {
      console.error('Error accepting connection:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      Alert.alert('Error', 'Failed to accept connection. Please try again.');
    }
  };

  const handleDeclineConnection = async () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    console.log('Decline button pressed for connection:', chat.id);
    try {
      // For pending connections, the chat.id is actually the connection document ID
      const connectionId = chat.id;
      console.log('Processing decline for connection:', connectionId);
      
      // Immediately remove from pending state
      setPendingChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      setFilteredChats(prevChats => prevChats.filter(c => c.id !== connectionId));
      
      // Get connection data before deleting
      const connectionDoc = await getDoc(doc(db, 'connections', connectionId));
      if (connectionDoc.exists()) {
        const connectionData = connectionDoc.data();
        console.log('Connection data:', connectionData);
        const initiatorId = connectionData.initiator;
        
        // Get the current user's data for the notification
        const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (currentUserDoc.exists()) {
          const currentUserData = currentUserDoc.data();
          console.log('Creating notification for initiator:', initiatorId);
          
          // Get initiator's data to check notification preferences and push token
          const initiatorRef = doc(db, 'users', initiatorId);
          const initiatorDoc = await getDoc(initiatorRef);
          
          if (initiatorDoc.exists()) {
            const initiatorData = initiatorDoc.data();
            
            // Create the notification
            const notification = {
              id: Date.now().toString(),
              title: "Connection Declined",
              body: `${currentUserData.name} declined your connection request`,
              data: {
                type: 'match',
                matchedUserId: currentUser.uid,
                matchedUserName: currentUserData.name
              },
              timestamp: new Date(),
              read: false
            };

            // Start a batch write
            const batch = writeBatch(db);

            // Add notification to initiator's user document
            const notifications = initiatorData.notifications || [];
            batch.update(initiatorRef, {
              notifications: [...notifications, notification]
            });
            console.log('Notification added to initiator');

            // Send push notification if initiator has token and notifications enabled
            if (initiatorData?.expoPushToken && 
                initiatorData?.notificationPreferences?.notificationsEnabled && 
                initiatorData?.notificationPreferences?.connections) {
              
              console.log('📱 Push notification conditions met:', {
                hasToken: true,
                token: initiatorData.expoPushToken,
                notificationsEnabled: true,
                connectionsEnabled: true
              });

              try {
                const pushPayload = {
                  to: initiatorData.expoPushToken,
                  title: "Connection Declined",
                  body: `${currentUserData.name} declined your connection request`,
                  sound: 'default',
                  priority: 'high',
                  data: {
                    type: 'match',
                    matchedUserId: currentUser.uid,
                    matchedUserName: currentUserData.name
                  },
                };

                console.log('📦 Push notification payload:', pushPayload);

                const response = await fetch('https://exp.host/--/api/v2/push/send', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                  },
                  body: JSON.stringify(pushPayload),
                });

                const responseData = await response.json();
                
                if (!response.ok) {
                  console.error('❌ Push notification failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    data: responseData,
                    requestPayload: pushPayload
                  });
                } else {
                  console.log('✅ Push notification sent successfully:', {
                    responseData,
                    receiverId: initiatorId,
                    senderName: currentUserData.name
                  });
                }
              } catch (error: any) {
                console.error('❌ Error sending push notification:', {
                  error,
                  errorMessage: error.message,
                  errorStack: error.stack,
                  receiverId: initiatorId,
                  token: initiatorData.expoPushToken,
                  senderName: currentUserData.name
                });
              }
            } else {
              console.log('ℹ️ Push notification not sent. Reason:', {
                hasToken: !!initiatorData?.expoPushToken,
                token: initiatorData?.expoPushToken,
                notificationsEnabled: initiatorData?.notificationPreferences?.notificationsEnabled,
                connectionsEnabled: initiatorData?.notificationPreferences?.connections,
                receiverId: initiatorId,
                receiverName: initiatorData.name,
                fullPreferences: initiatorData?.notificationPreferences
              });
            }

            // Remove current user from initiator's likedUsers array
            const likedUsers = initiatorData.likedUsers || [];
            const updatedLikedUsers = likedUsers.filter((id: string) => id !== currentUser.uid);
            batch.update(initiatorRef, {
              likedUsers: updatedLikedUsers
            });
            console.log('Removed user from likedUsers array');

            // Delete the connection document
            batch.delete(doc(db, 'connections', connectionId));
            console.log('Connection document marked for deletion');

            // Commit all changes
            await batch.commit();
            console.log('Batch write successful');
          }
        }
      }
    } catch (error: any) {
      console.error('Error declining connection:', error);
      Alert.alert('Error', 'Failed to decline connection. Please try again.');
    }
  };

  const handlePressIn = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.parallel([
      Animated.timing(cardScaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(cardScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePress = useCallback(() => {
    if (chat.status === 'pending') {
      // For pending group join requests, navigate to group profile
      if (chat.isGroupChat && chat.groupId) {
        router.push(`/group/${chat.groupId}`);
        return;
      }
      // For pending connections, navigate to partner profile
      const partnerId = chat.participants.find(id => id !== currentUser.uid);
      if (partnerId) {
        router.push(`/profile/${partnerId}`);
      }
    } else if (chat.isEventChat) {
      console.log('Navigating to event chat:', chat.eventId);
      router.push(`/event/eventChat/${chat.eventId}`);
    } else if (chat.isGroupChat) {
      console.log('Navigating to group chat:', chat.groupId);
      router.push(`/group/chat/${chat.groupId}`);
    } else {
      onPress();
    }
  }, [chat, currentUser.uid, onPress]);

  const handlePinPress = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Animate the pin button
    Animated.sequence([
      Animated.timing(pinScaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pinScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Call the original onPinPress
    onPinPress();
  };

  const renderRightActions = () => {
    return null;
  };

  const getMessageStatusIcon = () => {
    switch (chat.lastMessageStatus) {
      case 'read':
        return <Ionicons name="checkmark-done" size={16} color="#37a4c8" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={16} color="#64748B" />;
      case 'sent':
        return <Ionicons name="checkmark" size={16} color="#64748B" />;
      default:
        return null;
    }
  };


  // Don't render if partner data is missing for non-event and non-group chats
  if (!chat.isEventChat && !chat.isGroupChat && !partner) {
    return null;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      enabled={false}
    >
      <Animated.View
        style={[
          styles.chatCard,
          {
            backgroundColor: theme === "light" ? "#FFFFFF" : "#1a1a1a",
            borderColor: chat.status === 'pending' ? 'rgba(55, 164, 200, 0.3)' : theme === "light" ? "rgba(55, 164, 200, 0.2)" : "rgba(55, 164, 200, 0.3)",
            borderWidth: 1,
            opacity: bounceOpacity,
            transform: [
              { scale: bounceScale },
              { translateY: bounceTranslateY }
            ],
          }
        ]}
      >
        {chat.isPinned && (
          <View style={styles.pinnedBackground} />
        )}
        <TouchableOpacity
          style={[
            styles.chatCardContent,
            chat.status === 'pending' && { 
              opacity: 0.95,
              padding: 16 // Reduced padding for pending connections
            }
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.7}
        >
          <View style={styles.chatHeader}>
            <View style={styles.imageContainer}>
              {chat.isEventChat ? (
                <View style={[styles.profileImage, styles.eventImage]}>
                  <Ionicons name="calendar" size={24} color="#ffffff" />
                </View>
              ) : chat.isGroupChat ? (
                chat.groupImage ? (
                  <UserAvatar
                    user={{ profilePicture: chat.groupImage, name: chat.groupName || 'Group' }}
                    size={56}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={[styles.profileImage, styles.placeholderImage]}>
                    <MaterialIcons name="groups" size={28} color="#ffffff" />
                  </View>
                )
              ) : partner?.profilePicture ? (
                <UserAvatar
                  user={partner}
                  size={56}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.placeholderImage]}>
                  <Text style={styles.placeholderText}>
                    {partner?.name?.charAt(0)?.toUpperCase() || "?"}
                  </Text>
                </View>
              )}
              {!chat.isEventChat && !chat.isGroupChat && chat.status === 'active' && partner?.isOnline && (
                <Animated.View 
                  style={[
                    styles.onlineIndicator,
                    {
                      backgroundColor: '#10B981',
                      transform: [{ scale: scaleAnim }]
                    }
                  ]} 
                />
              )}
            </View>
            <View style={styles.chatMainInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.chatName, { color: theme === "light" ? "#0F172A" : "#e4fbfe" }]}>
                  {chat.isEventChat ? chat.eventName : chat.isGroupChat ? chat.groupName : partner?.name}
                </Text>
                {chat.status !== 'pending' && !chat.isEventChat && !chat.isGroupChat && (
                  <TouchableOpacity 
                    onPress={handlePinPress} 
                    style={[
                      styles.pinButton,
                      chat.isPinned && styles.pinButtonActive
                    ]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Animated.View 
                      style={[
                        styles.pinIcon,
                        { transform: [{ scale: pinScaleAnim }] }
                      ]}
                    >
                      <Ionicons 
                        name={chat.isPinned ? "pin" : "pin-outline"} 
                        size={24} 
                        color={chat.isPinned ? "#FFFFFF" : "#64748B"} 
                      />
                    </Animated.View>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.userDetails}>
                {chat.isEventChat ? (
                  <>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{chat.category}</Text>
                    </View>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location" size={14} color="#37a4c8" />
                      <Text style={[styles.userLocation, { color: "#37a4c8" }]}>{chat.airportCode}</Text>
                    </View>
                  </>
                ) : chat.isGroupChat ? (
                  <>
                    <View style={styles.ageBadge}>
                      <MaterialIcons name="people" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                      <Text style={styles.ageBadgeText}>
                        {chat.memberCount || chat.participants.length} {(chat.memberCount || chat.participants.length) === 1 ? 'member' : 'members'}
                      </Text>
                    </View>
                  </>
                ) : chat.status === 'pending' ? (
                  <>
                    <View style={styles.ageBadge}>
                      <Text style={styles.ageBadgeText}>{partner?.age} years</Text>
                    </View>
                    <View style={styles.locationContainer}>
                      <Ionicons name="location" size={14} color="#37a4c8" />
                      <Text style={[styles.userLocation, { color: "#37a4c8" }]}>{partner?.airportCode}</Text>
                    </View>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.chatInfo}>
              {chat.status === 'pending' ? (
              <View style={[
                styles.pendingContainer,
                { 
                  backgroundColor: theme === "light" 
                    ? 'rgba(55, 164, 200, 0.06)' 
                    : 'rgba(55, 164, 200, 0.08)',
                  borderColor: theme === "light"
                    ? 'rgba(55, 164, 200, 0.15)'
                    : 'rgba(55, 164, 200, 0.2)',
                }
              ]}>
                {isInitiator ? (
                  <View style={styles.pendingSentContainer}>
                    <View style={styles.pendingSentIconContainer}>
                      <Ionicons 
                        name={chat.isGroupChat ? "people-outline" : "time-outline"}
                        size={18} 
                        color={theme === "light" ? "#37a4c8" : "#4db8d4"} 
                      />
                    </View>
                    <Text style={[
                      styles.pendingText, 
                      { color: theme === "light" ? "#64748B" : "#94A3B8" }
                    ]}>
                      {chat.isGroupChat 
                        ? "Waiting for approval" 
                        : "Waiting for response"}
                    </Text>
                    <View style={[
                      styles.pendingStatusContainer,
                      {
                        backgroundColor: theme === "light"
                          ? 'rgba(255, 165, 0, 0.12)'
                          : 'rgba(255, 165, 0, 0.15)',
                      }
                    ]}>
                      <Animated.View 
                        style={[
                          styles.pendingStatusDot,
                          {
                            backgroundColor: '#FFA500',
                            transform: [{ scale: pendingPulseAnim }]
                          }
                        ]} 
                      />
                      <Text style={styles.pendingStatusText}>Pending</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.pendingReceivedContainer}>
                    <View style={styles.pendingHeader}>
                      <View style={styles.pendingBadge}>
                        <Ionicons 
                          name="person-add-outline" 
                          size={15} 
                          color="#37a4c8" 
                        />
                        <Text style={styles.pendingBadgeText}>New Connection Request</Text>
                      </View>
                    </View>
                    <View style={styles.pendingActionsContainer}>
                      <Animated.View style={{ transform: [{ scale: declineButtonScale }], flex: 1 }}>
                        <TouchableOpacity 
                          style={[styles.pendingActionButton, styles.pendingDeclineButton]}
                          onPress={handleDeclineConnection}
                          onPressIn={handleDeclinePressIn}
                          onPressOut={handleDeclinePressOut}
                          activeOpacity={0.85}
                        >
                          <View style={styles.pendingActionIconContainer}>
                            <MaterialIcons name="close" size={22} color="#FFF" />
                          </View>
                          <Text style={styles.pendingActionText}>Decline</Text>
                        </TouchableOpacity>
                      </Animated.View>
                      <Animated.View style={{ transform: [{ scale: acceptButtonScale }], flex: 1 }}>
                        <TouchableOpacity 
                          style={[styles.pendingActionButton, styles.pendingAcceptButton]}
                          onPress={handleAcceptConnection}
                          onPressIn={handleAcceptPressIn}
                          onPressOut={handleAcceptPressOut}
                          activeOpacity={0.85}
                        >
                          <View style={styles.pendingActionIconContainer}>
                            <MaterialIcons name="check" size={22} color="#FFF" />
                          </View>
                          <Text style={styles.pendingActionText}>Accept</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  </View>
                )}
              </View>
            ) : chat.isEventChat ? (
              <View style={[styles.messageContainer, { marginTop: 4 }]}>
                <View style={styles.eventDescriptionContainer}>
                  <Text 
                    style={[
                      styles.chatLastMessage, 
                      { 
                        color: theme === "light" ? "#64748B" : "#94A3B8",
                        fontWeight: '400',
                        fontSize: 14,
                        lineHeight: 20,
                        fontStyle: 'italic',
                        marginBottom: 8
                      }
                    ]} 
                    numberOfLines={2}
                  >
                    {chat.description}
                  </Text>
                  <View style={styles.eventStatusContainer}>
                    <Text 
                      style={[
                        styles.eventStatusText,
                        { 
                          color: (() => {
                            const status = getEventStatus(chat.startTime).status;
                            switch (status) {
                              case 'in_progress': return '#4CAF50';
                              case 'upcoming': return '#37a4c8';
                              case 'ended': return '#FF3B30';
                              default: return theme === "light" ? "#64748B" : "#94A3B8";
                            }
                          })()
                        }
                      ]}
                    >
                      {getEventStatus(chat.startTime).timeRemaining}
                    </Text>
                  </View>
                </View>
              </View>
            ) : chat.lastMessage ? (
              <View style={styles.messageContainer}>
                <Text 
                  style={[
                    styles.chatLastMessage, 
                    { 
                      color: theme === "light" ? "#64748B" : "#94A3B8",
                      fontWeight: chat.unreadCount ? '600' : '400',
                      fontSize: 15,
                      lineHeight: 20
                    }
                  ]} 
                  numberOfLines={1}
                >
                  {chat.lastMessage}
                </Text>
                <View style={styles.messageMeta}>
                  {!chat.isEventChat && !chat.isGroupChat && getMessageStatusIcon()}
                  {chat.lastMessageTime && (
                    <Text style={[styles.messageTime, { color: theme === "light" ? "#64748B" : "#94A3B8" }]}>
                      {(() => {
                        try {
                          const date = toDate(chat.lastMessageTime);
                          if (!date) {
                            console.error('Invalid date value:', chat.lastMessageTime);
                            return 'recently';
                          }
                          return formatDistanceToNow(date, { addSuffix: true });
                        } catch (error) {
                          console.error('Error formatting message time:', error, 'Raw value:', chat.lastMessageTime);
                          return 'recently';
                        }
                      })()}
                    </Text>
                  )}
                </View>
              </View>
            ) : chat.isGroupChat ? (
              <View style={styles.messageContainer}>
                <Text 
                  style={[
                    styles.chatLastMessage, 
                    { 
                      color: theme === "light" ? "#94A3B8" : "#64748B",
                      fontWeight: '400',
                      fontSize: 14,
                      lineHeight: 20,
                      fontStyle: 'italic'
                    }
                  ]} 
                  numberOfLines={1}
                >
                  No messages yet
                </Text>
              </View>
            ) : null}
          </View>

          {/* Removed interests and mood for cleaner look */}
        </TouchableOpacity>
      </Animated.View>
    </Swipeable>
  );
}, (prevProps: ChatItemProps, nextProps: ChatItemProps) => {
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
    prevProps.chat.unreadCount === nextProps.chat.unreadCount &&
    prevProps.chat.isPinned === nextProps.chat.isPinned &&
    prevProps.chat.status === nextProps.chat.status
  );
});

const styles = StyleSheet.create({
  chatCard: {
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: "#38a5c9",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  pinnedBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(55, 164, 200, 0.03)',
  },
  chatCardContent: {
    padding: 16,
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 16,
    position: 'relative',
    justifyContent: 'center',
  },
  profileImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  eventImage: {
    backgroundColor: '#37a4c8',
    justifyContent: 'center',
    alignItems: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  placeholderImage: {
    backgroundColor: "#37a4c8",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "600",
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
    flex: 1,
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: 'wrap',
  },
  categoryBadge: {
    backgroundColor: '#37a4c8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  ageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#37a4c8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 8,
  },
  userLocation: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  lastSeen: {
    fontSize: 12,
    marginLeft: 8,
  },
  pinButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  pinButtonActive: {
    backgroundColor: '#37a4c8',
  },
  pinIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInfo: {
    marginBottom: 8,
  },
  pendingContainer: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingSentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingSentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pendingReceivedContainer: {
    alignItems: 'stretch',
    paddingTop: 4,
  },
  pendingHeader: {
    marginBottom: 14,
    alignItems: 'center',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(55, 164, 200, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(55, 164, 200, 0.2)',
    shadowColor: "#37a4c8",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#37a4c8',
    letterSpacing: 0.3,
  },
  pendingText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
    fontWeight: '500',
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  pendingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pendingStatusText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pendingActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  pendingActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    minHeight: 64,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 0,
  },
  pendingAcceptButton: {
    backgroundColor: '#4CAF50',
  },
  pendingDeclineButton: {
    backgroundColor: '#FF5252',
  },
  pendingActionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pendingActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
  },
  eventDescriptionContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  eventStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  eventStatusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chatLastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  userInterestsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    alignItems: 'center',
  },
  interestTag: {
    backgroundColor: "#37a4c8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  moreInterestsBadge: {
    backgroundColor: 'rgba(55, 164, 200, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  moreInterestsText: {
    color: '#37a4c8',
    fontSize: 11,
    fontWeight: '600',
  },
  userMoodContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  moodIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  moodText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ChatItem;
