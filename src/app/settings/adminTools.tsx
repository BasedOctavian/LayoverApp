import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator, TextInput, Alert, Modal, Image, StatusBar, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../../context/ThemeContext';
import TopBar from '../../components/TopBar';
import { MaterialIcons } from '@expo/vector-icons';
import useUsers from '../../hooks/useUsers';
import useAuth from '../../hooks/auth';
import { collection, getDocs, doc, updateDoc, query, orderBy, Timestamp, deleteDoc, writeBatch, where, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebaseConfig';
import { useRouter, router } from 'expo-router';
import { PING_CATEGORIES } from '../../constants/pingCategories';
import { haversineDistance } from '../../utils/haversineDistance';
import useNotificationCount from '../../hooks/useNotificationCount';
import * as Haptics from 'expo-haptics';

interface NotificationPreferences {
  announcements: boolean;
  chats: boolean;
  connections: boolean;
  activities: boolean;
  notificationsEnabled: boolean;
}

interface User {
  id: string;
  expoPushToken?: string;
  notificationPreferences?: NotificationPreferences;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  textColor: string;
  sectionBgColor: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  isExpanded,
  onToggle,
  textColor,
  sectionBgColor,
}) => {
  const [animation] = useState(new Animated.Value(0));
  const [contentHeight, setContentHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentReady, setIsContentReady] = useState(false);

  React.useEffect(() => {
    if (isExpanded && !isContentReady) {
      setIsLoading(true);
      // Simulate content loading
      setTimeout(() => {
        setIsContentReady(true);
        setIsLoading(false);
      }, 500);
    } else if (!isExpanded) {
      setIsContentReady(false);
    }
  }, [isExpanded]);

  React.useEffect(() => {
    if (isExpanded && isContentReady) {
      Animated.spring(animation, {
        toValue: 1,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
      }).start();
    } else if (!isExpanded) {
      Animated.spring(animation, {
        toValue: 0,
        useNativeDriver: false,
        tension: 65,
        friction: 11,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
      }).start();
    }
  }, [isExpanded, isContentReady]);

  const maxHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const contentOpacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={[styles.section, { backgroundColor: sectionBgColor }]}>
      <TouchableOpacity 
        style={styles.sectionHeader} 
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: textColor }]}>{title}</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <MaterialIcons 
            name={isExpanded ? "remove" : "add"} 
            size={24} 
            color={textColor} 
          />
        )}
      </TouchableOpacity>
      <Animated.View 
        style={{ 
          maxHeight,
          overflow: 'hidden',
        }}
      >
        <Animated.View 
          style={[
            styles.sectionContent,
            {
              opacity: contentOpacity,
            }
          ]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setContentHeight(height);
          }}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const NotificationForm = ({ textColor }: { textColor: string }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState<User[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const { getUsers } = useUsers();

  const templates = [
    {
      id: 'maintenance',
      title: 'Scheduled Maintenance',
      message: 'We will be performing scheduled maintenance in the next 24 hours. The app may experience brief periods of downtime. We apologize for any inconvenience.',
      icon: 'build' as const,
      color: '#FF9500',
    },
    {
      id: 'update',
      title: 'New Feature Available',
      message: 'We\'ve just released a new feature! Check out the latest update in the app. Your feedback helps us improve Layover.',
      icon: 'update' as const,
      color: '#34C759',
    },
    {
      id: 'emergency',
      title: 'Important Service Update',
      message: 'We are currently experiencing technical difficulties. Our team is working to resolve the issue. Please check back later for updates.',
      icon: 'warning' as const,
      color: '#FF3B30',
    },
    {
      id: 'survey',
      title: 'Quick Survey',
      message: 'We value your feedback! Please take a moment to complete our quick survey. Your input helps us improve Layover for everyone.',
      icon: 'poll' as const,
      color: '#5856D6',
    },
  ];

  const applyTemplate = (template: typeof templates[0]) => {
    setTitle(template.title);
    setMessage(template.message);
    setActiveTemplate(template.id);
  };

  useEffect(() => {
    const fetchEligibleUsers = async () => {
      const allUsers = await getUsers() as User[];
      const eligible = allUsers.filter(user => 
        user.expoPushToken && 
        user.notificationPreferences?.announcements === true &&
        user.notificationPreferences?.notificationsEnabled === true
      );
      setEligibleUsers(eligible);
    };

    fetchEligibleUsers();
  }, []);

  const sendMassNotification = async () => {
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    
    if (!trimmedTitle || !trimmedMessage) return;
    
    setIsSubmitting(true);
    try {
      // Send to each eligible user
      const notifications = eligibleUsers.map(user => 
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
          },
          body: JSON.stringify({
            to: user.expoPushToken,
            title: trimmedTitle,
            body: trimmedMessage,
            sound: 'default',
            priority: 'high',
            data: { 
              type: 'announcement',
              timestamp: new Date().toISOString()
            },
          }),
        })
      );

      // Wait for all notifications to be sent
      const results = await Promise.allSettled(notifications);
      
      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      Alert.alert(
        'Notification Status',
        `Successfully sent to ${successful} users.\nFailed to send to ${failed} users.`,
        [{ text: 'OK' }]
      );

      // Reset form
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error('Error sending mass notification:', error);
      Alert.alert(
        'Error',
        'Failed to send notifications. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.formContent}>
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => setIsExpanded(!isExpanded)}
          style={[styles.eligibleUsersContainer, { borderColor: textColor }]}
        >
          <View style={styles.eligibleUsersHeader}>
            <MaterialIcons name="notifications-active" size={20} color={textColor} />
            <Text style={[styles.eligibleUsersText, { color: textColor }]}>
              {eligibleUsers.length} users will receive this announcement
            </Text>
            <MaterialIcons 
              name={isExpanded ? "expand-less" : "expand-more"} 
              size={24} 
              color={textColor} 
            />
          </View>
          {isExpanded && (
            <View style={styles.eligibleUsersDetails}>
              <Text style={[styles.eligibleUsersDetailText, { color: textColor }]}>
                These users have:
              </Text>
              <View style={styles.eligibleUsersList}>
                <View style={styles.eligibleUsersListItem}>
                  <MaterialIcons name="check-circle" size={16} color={textColor} />
                  <Text style={[styles.eligibleUsersListItemText, { color: textColor }]}>
                    Push notifications enabled
                  </Text>
                </View>
                <View style={styles.eligibleUsersListItem}>
                  <MaterialIcons name="check-circle" size={16} color={textColor} />
                  <Text style={[styles.eligibleUsersListItemText, { color: textColor }]}>
                    Announcements enabled in preferences
                  </Text>
                </View>
                <View style={styles.eligibleUsersListItem}>
                  <MaterialIcons name="check-circle" size={16} color={textColor} />
                  <Text style={[styles.eligibleUsersListItemText, { color: textColor }]}>
                    Valid push token registered
                  </Text>
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.templateSection}>
          <Text style={[styles.label, { color: textColor }]}>Quick Templates</Text>
          <View style={styles.templateGrid}>
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateButton,
                  { 
                    borderColor: activeTemplate === template.id ? template.color : textColor,
                    backgroundColor: activeTemplate === template.id 
                      ? `${template.color}15` 
                      : 'rgba(255, 255, 255, 0.05)',
                  }
                ]}
                onPress={() => applyTemplate(template)}
                activeOpacity={0.7}
              >
                <View style={[styles.templateIconContainer, { backgroundColor: `${template.color}20` }]}>
                  <MaterialIcons 
                    name={template.icon}
                    size={20} 
                    color={template.color} 
                  />
                </View>
                <Text 
                  style={[
                    styles.templateButtonText, 
                    { 
                      color: textColor,
                      fontWeight: activeTemplate === template.id ? '600' : '500',
                    }
                  ]}
                >
                  {template.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textColor }]}>Notification Title</Text>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: textColor }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter notification title"
            placeholderTextColor={`${textColor}80`}
            maxLength={50}
          />
          <Text style={[styles.characterCount, { color: textColor }]}>
            {title.length}/50
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: textColor }]}>Message</Text>
          <TextInput
            style={[styles.textArea, { color: textColor, borderColor: textColor }]}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter notification message"
            placeholderTextColor={`${textColor}80`}
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={[styles.characterCount, { color: textColor }]}>
            {message.length}/200
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!title || !message || isSubmitting || eligibleUsers.length === 0) && styles.submitButtonDisabled
          ]}
          onPress={sendMassNotification}
          disabled={!title || !message || isSubmitting || eligibleUsers.length === 0}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Send Announcement</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface SystemStatus {
  firebaseStatus: 'connected' | 'disconnected' | 'checking';
  userCount: number;
  eventCount: number;
  sportEventCount: number;
  feedbackCount: number;
  reportCount: number;
}

const SystemStatusGrid: React.FC<{ textColor: string, sectionBgColor: string }> = ({ textColor, sectionBgColor }) => {
  const [status, setStatus] = useState<SystemStatus>({
    firebaseStatus: 'checking',
    userCount: 0,
    eventCount: 0,
    sportEventCount: 0,
    feedbackCount: 0,
    reportCount: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        // Check Firebase connection by attempting to fetch a document
        const testDoc = await getDocs(collection(db, 'users'));
        setStatus(prev => ({ ...prev, firebaseStatus: 'connected' }));

        // Fetch counts for each collection
        const [users, events, sportEvents, feedback, reports] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'events')),
          getDocs(collection(db, 'sportEvents')),
          getDocs(collection(db, 'feedback')),
          getDocs(collection(db, 'reports'))
        ]);

        setStatus({
          firebaseStatus: 'connected',
          userCount: users.size,
          eventCount: events.size,
          sportEventCount: sportEvents.size,
          feedbackCount: feedback.size,
          reportCount: reports.size
        });
      } catch (error) {
        console.error('Error fetching system status:', error);
        setStatus(prev => ({ ...prev, firebaseStatus: 'disconnected' }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystemStatus();
  }, []);

  const getStatusColor = (status: 'connected' | 'disconnected' | 'checking') => {
    switch (status) {
      case 'connected': return '#34C759';
      case 'disconnected': return '#FF3B30';
      case 'checking': return '#FF9500';
    }
  };

  const statusItems = [
    {
      title: 'Firebase Status',
      value: status.firebaseStatus.charAt(0).toUpperCase() + status.firebaseStatus.slice(1),
      color: getStatusColor(status.firebaseStatus),
      icon: 'cloud-done'
    },
    {
      title: 'Total Users',
      value: status.userCount.toString(),
      color: '#007AFF',
      icon: 'people'
    },
    {
      title: 'Events',
      value: status.eventCount.toString(),
      color: '#5856D6',
      icon: 'event'
    },
    {
      title: 'Reports',
      value: status.reportCount.toString(),
      color: '#FF3B30',
      icon: 'flag'
    },
    {
      title: 'Feedback',
      value: status.feedbackCount.toString(),
      color: '#FF2D55',
      icon: 'feedback'
    }
  ];

  return (
    <View style={[styles.statusGrid, { backgroundColor: sectionBgColor }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={textColor} style={styles.statusLoading} />
      ) : (
        <>
          {statusItems.map((item, index) => (
            <View key={index} style={styles.statusItem}>
              <View style={[styles.statusIconContainer, { backgroundColor: `${item.color}15` }]}>
                <MaterialIcons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={[styles.statusTitle, { color: textColor }]}>{item.title}</Text>
              <Text style={[styles.statusValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

interface EventDetails {
  airportCode: string;
  attendees: number;
  category: string;
  createdAt: Timestamp;
  description: string;
  name: string;
  organizer: string | null;
  startTime: Timestamp | null;
}

interface Report {
  id: string;
  createdAt: Timestamp;
  lastUpdated: Timestamp;
  reportedBy: string;
  reportedByUserName: string;
  reportedUserId?: string;
  reportedUserName?: string;
  reportedUserProfile?: {
    age: string;
    bio: string;
    createdAt: Timestamp;
    goals: string[];
    interests: string[];
    languages: string[];
    name: string;
  };
  reportedEventId?: string;
  reportedEventName?: string;
  reportedEvent?: EventDetails;
  reviewDate: Timestamp | null;
  reviewNotes: string | null;
  reviewedBy: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  type: 'user_report' | 'event_report';
}

const ReportsSection: React.FC<{ textColor: string, sectionBgColor: string }> = ({ textColor, sectionBgColor }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(reportsQuery);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];

      // Clean up old resolved reports
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const cleanupPromises = reportsData
        .filter(report => {
          const reportDate = report.createdAt.toDate();
          const isOld = reportDate < oneWeekAgo;
          const isResolved = ['resolved', 'reviewed', 'dismissed'].includes(report.status);
          return isOld && isResolved;
        })
        .map(async (report) => {
          try {
            const reportRef = doc(db, 'reports', report.id);
            await deleteDoc(reportRef);
            console.log(`Deleted old report: ${report.id}`);
          } catch (error) {
            console.error(`Error deleting report ${report.id}:`, error);
          }
        });

      // Wait for all cleanup operations to complete
      await Promise.all(cleanupPromises);

      // Fetch fresh data after cleanup
      const updatedSnapshot = await getDocs(reportsQuery);
      const updatedReportsData = updatedSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];

      setReports(updatedReportsData);
    } catch (error) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReview = useCallback(async (report: Report, status: Report['status']) => {
    try {
      const reportRef = doc(db, 'reports', report.id);
      const updateData = {
        status,
        reviewNotes,
        reviewDate: Timestamp.now(),
        reviewedBy: 'admin',
        lastUpdated: Timestamp.now()
      };

      await updateDoc(reportRef, updateData);
      
      setReports(prevReports => 
        prevReports.map(r => 
          r.id === report.id 
            ? { ...r, ...updateData }
            : r
        )
      );
      
      setIsModalVisible(false);
      setReviewNotes('');
      Alert.alert('Success', 'Report status updated successfully');
    } catch (error) {
      console.error('Error updating report:', error);
      Alert.alert('Error', 'Failed to update report status');
    }
  }, [reviewNotes]);

  const handleOpenModal = useCallback((report: Report) => {
    setSelectedReport(report);
    setReviewNotes(report.reviewNotes || '');
    setIsModalVisible(true);
  }, []);

  const formatDate = (timestamp: Timestamp) => {
    return new Date(timestamp.toDate()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short'
    });
  };

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'reviewed': return '#5856D6';
      case 'resolved': return '#34C759';
      case 'dismissed': return '#FF3B30';
    }
  };

  const renderUserReportDetails = (report: Report) => {
    const profile = report.reportedUserProfile;
    if (!profile) {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Reported User</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>{report.reportedUserName || 'Unknown User'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="info" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>Profile not available</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Reported User</Text>
        <View style={styles.detailRow}>
          <MaterialIcons name="person" size={16} color={textColor} />
          <Text style={[styles.detailText, { color: textColor }]}>{profile.name}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="cake" size={16} color={textColor} />
          <Text style={[styles.detailText, { color: textColor }]}>{profile.age} years old</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="translate" size={16} color={textColor} />
          <Text style={[styles.detailText, { color: textColor }]}>{profile.languages.join(', ')}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={16} color={textColor} />
          <Text style={[styles.detailText, { color: textColor }]}>Joined {formatDate(profile.createdAt)}</Text>
        </View>
      </View>
    );
  };

  const renderEventReportDetails = (report: Report) => {
    const event = report.reportedEvent;
    if (!event) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reported Event</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="event" size={16} color="#666" />
            <Text style={styles.detailText}>{report.reportedEventName || 'Unknown Event'}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="info" size={16} color="#666" />
            <Text style={styles.detailText}>Event details not available</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reported Event</Text>
        <View style={styles.detailRow}>
          <MaterialIcons name="event" size={16} color="#666" />
          <Text style={styles.detailText}>{event.name}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="flight" size={16} color="#666" />
          <Text style={styles.detailText}>{event.airportCode}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="category" size={16} color="#666" />
          <Text style={styles.detailText}>{event.category}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="group" size={16} color="#666" />
          <Text style={styles.detailText}>{event.attendees} attendees</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="schedule" size={16} color="#666" />
          <Text style={styles.detailText}>
            {event.startTime ? formatDate(event.startTime) : 'No start time set'}
          </Text>
        </View>
      </View>
    );
  };

  const renderReportDetails = (report: Report) => {
    return (
      <ScrollView style={styles.modalContent}>
        <View style={styles.section}>
          <View style={styles.detailRow}>
            <MaterialIcons name="flag" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>
              {report.type === 'user_report' ? 'User Report' : 'Event Report'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>Reported {formatDate(report.createdAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="update" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>Last updated {formatDate(report.lastUpdated)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Reporter</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="person" size={16} color={textColor} />
            <Text style={[styles.detailText, { color: textColor }]}>{report.reportedByUserName}</Text>
          </View>
        </View>

        {report.type === 'user_report' ? renderUserReportDetails(report) : renderEventReportDetails(report)}

        {report.reviewNotes && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Review Notes</Text>
            <View style={styles.detailRow}>
              <MaterialIcons name="note" size={16} color={textColor} />
              <Text style={[styles.detailText, { color: textColor }]}>{report.reviewNotes}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={16} color={textColor} />
              <Text style={[styles.detailText, { color: textColor }]}>Reviewed by {report.reviewedBy}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={16} color={textColor} />
              <Text style={[styles.detailText, { color: textColor }]}>On {formatDate(report.reviewDate!)}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Add Review Notes</Text>
          <TextInput
            style={[styles.reviewInput, { color: textColor, borderColor: textColor }]}
            placeholder="Add review notes..."
            placeholderTextColor={`${textColor}80`}
            value={reviewNotes}
            onChangeText={setReviewNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: sectionBgColor, borderColor: textColor }]}
            onPress={() => handleReview(report, 'resolved')}
          >
            <Text style={[styles.actionButtonText, { color: textColor }]}>Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: sectionBgColor, borderColor: textColor }]}
            onPress={() => handleReview(report, 'reviewed')}
          >
            <Text style={[styles.actionButtonText, { color: textColor }]}>Mark Reviewed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: sectionBgColor, borderColor: textColor }]}
            onPress={() => handleReview(report, 'dismissed')}
          >
            <Text style={[styles.actionButtonText, { color: textColor }]}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderReportModal = () => (
    <Modal
      visible={isModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: sectionBgColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: textColor }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Report Details</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <MaterialIcons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>

          {selectedReport && renderReportDetails(selectedReport)}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.reportsSection, { backgroundColor: sectionBgColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>User Reports</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={textColor} style={styles.loadingIndicator} />
      ) : reports.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="assignment" size={48} color={textColor} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyStateText, { color: textColor }]}>No reports found</Text>
        </View>
      ) : (
        <ScrollView style={styles.reportsList}>
          {reports.map((report) => (
            <TouchableOpacity
              key={report.id}
              style={[styles.reportItem, { borderColor: getStatusColor(report.status) }]}
              onPress={() => handleOpenModal(report)}
            >
              <View style={styles.reportHeader}>
                <View style={styles.reportUserInfo}>
                  <MaterialIcons name="person" size={20} color={textColor} />
                  <Text style={[styles.reportUserName, { color: textColor }]}>
                    {report.reportedUserName || 'Unknown User'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(report.status)}15` }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(report.status) }]}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.reportDetails}>
                <Text style={[styles.reportType, { color: textColor }]}>{report.type || 'Unknown Type'}</Text>
                <Text style={[styles.reportDate, { color: textColor }]}>
                  {report.createdAt ? formatDate(report.createdAt) : 'Unknown Date'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {renderReportModal()}
    </View>
  );
};

interface Feedback {
  id: string;
  content: string;
  createdAt: Timestamp;
  status: 'pending' | 'resolved';
  userId: string;
}

const FeedbackSection: React.FC<{ textColor: string, sectionBgColor: string }> = ({ textColor, sectionBgColor }) => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    try {
      const feedbackQuery = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(feedbackQuery);
      const feedbackData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Feedback[];
      setFeedback(feedbackData);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      Alert.alert('Error', 'Failed to fetch feedback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleRemove = useCallback(async (feedbackId: string) => {
    try {
      const feedbackRef = doc(db, 'feedback', feedbackId);
      await deleteDoc(feedbackRef);
      
      setFeedback(prevFeedback => prevFeedback.filter(item => item.id !== feedbackId));
      Alert.alert('Success', 'Feedback removed successfully');
    } catch (error) {
      console.error('Error removing feedback:', error);
      Alert.alert('Error', 'Failed to remove feedback');
    }
  }, []);

  const formatDate = (timestamp: Timestamp) => {
    return new Date(timestamp.toDate()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short'
    });
  };

  return (
    <View style={[styles.feedbackSection, { backgroundColor: sectionBgColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>User Feedback</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={textColor} style={styles.loadingIndicator} />
      ) : feedback.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="feedback" size={48} color={textColor} style={{ opacity: 0.5 }} />
          <Text style={[styles.emptyStateText, { color: textColor }]}>No feedback found</Text>
        </View>
      ) : (
        <ScrollView style={styles.feedbackList}>
          {feedback.map((item) => (
            <View 
              key={item.id} 
              style={[styles.feedbackItem, { borderColor: textColor }]}
            >
              <View style={styles.feedbackContent}>
                <Text style={[styles.feedbackText, { color: textColor }]}>{item.content}</Text>
                <Text style={[styles.feedbackDate, { color: textColor }]}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.removeButton, { borderColor: textColor }]}
                onPress={() => handleRemove(item.id)}
              >
                <MaterialIcons name="delete" size={20} color={textColor} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// Add test user data interface
interface TestUser {
  name: string;
  email: string;
  age: number;
  bio: string;
  airportCode: string;
  interests: string[];
  goals: string[];
  languages: string[];
  profilePicture: string;
  currentCity: string;
  connectionIntents: string[];
  eventPreferences: {
    likesBars: boolean;
    prefersSmallGroups: boolean;
    prefersWeekendEvents: boolean;
    prefersEveningEvents: boolean;
    prefersIndoorVenues: boolean;
    prefersStructuredActivities: boolean;
    prefersSpontaneousPlans: boolean;
    prefersLocalMeetups: boolean;
    prefersTravelEvents: boolean;
    prefersQuietEnvironments: boolean;
    prefersActiveLifestyles: boolean;
    prefersIntellectualDiscussions: boolean
  };
  personalTags: string[];
  preferredMeetupRadius: number;
  availabilitySchedule: {
    monday: { start: string; end: string };
    tuesday: { start: string; end: string };
    wednesday: { start: string; end: string };
    thursday: { start: string; end: string };
    friday: { start: string; end: string };
    saturday: { start: string; end: string };
    sunday: { start: string; end: string };
  };
  availableNow: boolean;
  moodStatus: string;
  groupAffiliations: string[];
  lastKnownCoordinates: {
    latitude: number;
    longitude: number;
  };
  linkRatingScore: {
    average: number;
    count: number;
  };
  socialMedia: {
    instagram: string;
    linkedin: string;
    twitter: string;
  };
  travelHistory: Array<{
    id: string;
    name: string;
    updatedAt: Date;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    type: string;
    read: boolean;
    timestamp: Date;
    data: any;
  }>;
}

const testUsers: TestUser[] = [
  {
    name: "Sarah Johnson",
    email: "sarah.j@test.com",
    age: 28,
    bio: "Adventure seeker and coffee enthusiast. Always planning my next trip!",
    airportCode: "BUF",
    interests: ["Photography", "Hiking", "Local Cuisine"],
    goals: ["Japan", "New Zealand", "Iceland"],
    languages: ["English", "Spanish"],
    profilePicture: "https://randomuser.me/api/portraits/women/1.jpg",
    currentCity: "Hamburg, NY",
    connectionIntents: ["Outdoor Adventures", "Photography & Media", "Travel & Exploration", "Coffee & Casual Meetups", "Art & Culture"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: true,
      prefersWeekendEvents: false,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Adventure Seeker", "Coffee Addict", "Photographer", "Extroverted", "Early Bird"],
    preferredMeetupRadius: 15,
    availabilitySchedule: {
      monday: { start: "18:00", end: "23:00" },
      tuesday: { start: "18:00", end: "23:00" },
      wednesday: { start: "18:00", end: "23:00" },
      thursday: { start: "18:00", end: "23:00" },
      friday: { start: "17:00", end: "01:00" },
      saturday: { start: "10:00", end: "02:00" },
      sunday: { start: "10:00", end: "22:00" }
    },
    availableNow: true,
    moodStatus: "Looking for Company",
    groupAffiliations: ["Travel Enthusiasts"],
    lastKnownCoordinates: {
      latitude: 42.7146805,
      longitude: -78.8334241
    },
    linkRatingScore: {
      average: 4.2,
      count: 15
    },
    socialMedia: {
      instagram: "@sarah_adventures",
      linkedin: "sarah-johnson-travel",
      twitter: "@sarahj_travels"
    },
    travelHistory: [
      { id: "1", name: "Thailand", updatedAt: new Date() },
      { id: "2", name: "Italy", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Michael Chen",
    email: "michael.c@test.com",
    age: 32,
    bio: "Tech entrepreneur who loves exploring new cultures and meeting people.",
    airportCode: "BUF",
    interests: ["Technology", "Wine Tasting", "Museums"],
    goals: ["France", "Italy", "Greece"],
    languages: ["English", "Mandarin"],
    profilePicture: "https://randomuser.me/api/portraits/men/2.jpg",
    currentCity: "Buffalo, NY",
    connectionIntents: ["Technology & Innovation", "Networking & Business", "Art & Culture", "Deep Discussions", "Food & Dining"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: false,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true
    },
    personalTags: ["Entrepreneur", "Tech-Savvy", "Analytical", "Career-Focused", "Leader"],
    preferredMeetupRadius: 20,
    availabilitySchedule: {
      monday: { start: "19:00", end: "23:00" },
      tuesday: { start: "19:00", end: "23:00" },
      wednesday: { start: "19:00", end: "23:00" },
      thursday: { start: "19:00", end: "23:00" },
      friday: { start: "18:00", end: "01:00" },
      saturday: { start: "12:00", end: "02:00" },
      sunday: { start: "12:00", end: "21:00" }
    },
    availableNow: false,
    moodStatus: "Networking",
    groupAffiliations: ["Tech Entrepreneurs", "Wine Club"],
    lastKnownCoordinates: {
      latitude: 42.8864,
      longitude: -78.8784
    },
    linkRatingScore: {
      average: 4.5,
      count: 23
    },
    socialMedia: {
      instagram: "@michael_tech",
      linkedin: "michael-chen-tech",
      twitter: "@mchen_entrepreneur"
    },
    travelHistory: [
      { id: "3", name: "Japan", updatedAt: new Date() },
      { id: "4", name: "Spain", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Emma Rodriguez",
    email: "emma.r@test.com",
    age: 25,
    bio: "Travel blogger and foodie. Always looking for the next hidden gem!",
    airportCode: "BUF",
    interests: ["Food", "Beach", "Art"],
    goals: ["Thailand", "Vietnam", "Indonesia"],
    languages: ["English", "Spanish", "French"],
    profilePicture: "https://randomuser.me/api/portraits/women/3.jpg",
    currentCity: "Orchard Park, NY",
    connectionIntents: ["Food & Dining", "Travel & Exploration", "Art & Culture", "Photography & Media", "Coffee & Casual Meetups"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: false,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Foodie", "Writer", "Creative", "Extroverted", "Adventure Seeker"],
    preferredMeetupRadius: 12,
    availabilitySchedule: {
      monday: { start: "17:00", end: "22:00" },
      tuesday: { start: "17:00", end: "22:00" },
      wednesday: { start: "17:00", end: "22:00" },
      thursday: { start: "17:00", end: "22:00" },
      friday: { start: "16:00", end: "01:00" },
      saturday: { start: "10:00", end: "02:00" },
      sunday: { start: "10:00", end: "20:00" }
    },
    availableNow: true,
    moodStatus: "Food & Drinks?",
    groupAffiliations: ["Food Bloggers", "Travel Writers"],
    lastKnownCoordinates: {
      latitude: 42.7676,
      longitude: -78.7439
    },
    linkRatingScore: {
      average: 4.8,
      count: 31
    },
    socialMedia: {
      instagram: "@emma_foodie",
      linkedin: "emma-rodriguez-blog",
      twitter: "@emma_travels"
    },
    travelHistory: [
      { id: "5", name: "Mexico", updatedAt: new Date() },
      { id: "6", name: "Costa Rica", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "David Kim",
    email: "david.k@test.com",
    age: 30,
    bio: "Adventure photographer capturing moments around the world.",
    airportCode: "BUF",
    interests: ["Photography", "Hiking", "Surfing"],
    goals: ["Australia", "Fiji", "Hawaii"],
    languages: ["English", "Korean"],
    profilePicture: "https://randomuser.me/api/portraits/men/4.jpg",
    currentCity: "Williamsville, NY",
    connectionIntents: ["Photography & Media", "Outdoor Adventures", "Fitness & Wellness", "Travel & Exploration", "Art & Culture"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Photographer", "Adventure Seeker", "Gym Rat", "Introverted", "Early Bird"],
    preferredMeetupRadius: 25,
    availabilitySchedule: {
      monday: { start: "06:00", end: "22:00" },
      tuesday: { start: "06:00", end: "22:00" },
      wednesday: { start: "06:00", end: "22:00" },
      thursday: { start: "06:00", end: "22:00" },
      friday: { start: "06:00", end: "23:00" },
      saturday: { start: "05:00", end: "23:00" },
      sunday: { start: "05:00", end: "21:00" }
    },
    availableNow: true,
    moodStatus: "Available",
    groupAffiliations: ["Adventure Photographers", "Surf Club"],
    lastKnownCoordinates: {
      latitude: 42.9634,
      longitude: -78.7378
    },
    linkRatingScore: {
      average: 4.6,
      count: 28
    },
    socialMedia: {
      instagram: "@david_adventure",
      linkedin: "david-kim-photography",
      twitter: "@dkim_photos"
    },
    travelHistory: [
      { id: "7", name: "New Zealand", updatedAt: new Date() },
      { id: "8", name: "Iceland", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Sophie Anderson",
    email: "sophie.a@test.com",
    age: 27,
    bio: "Environmental scientist passionate about sustainable travel.",
    airportCode: "BUF",
    interests: ["Nature", "Camping", "Wildlife"],
    goals: ["Costa Rica", "Galapagos", "Amazon"],
    languages: ["English", "German"],
    profilePicture: "https://randomuser.me/api/portraits/women/5.jpg",
    currentCity: "East Aurora, NY",
    connectionIntents: ["Volunteering & Community", "Outdoor Adventures", "Learning & Education", "Deep Discussions", "Art & Culture"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: true
    },
    personalTags: ["Deep Thinker", "Analytical", "Minimalist", "Introverted", "Early Bird"],
    preferredMeetupRadius: 18,
    availabilitySchedule: {
      monday: { start: "17:00", end: "21:00" },
      tuesday: { start: "17:00", end: "21:00" },
      wednesday: { start: "17:00", end: "21:00" },
      thursday: { start: "17:00", end: "21:00" },
      friday: { start: "16:00", end: "22:00" },
      saturday: { start: "08:00", end: "20:00" },
      sunday: { start: "08:00", end: "18:00" }
    },
    availableNow: false,
    moodStatus: "Away",
    groupAffiliations: ["Environmental Scientists", "Nature Conservation"],
    lastKnownCoordinates: {
      latitude: 42.7678,
      longitude: -78.6134
    },
    linkRatingScore: {
      average: 4.3,
      count: 19
    },
    socialMedia: {
      instagram: "@sophie_eco",
      linkedin: "sophie-anderson-env",
      twitter: "@sophie_environment"
    },
    travelHistory: [
      { id: "9", name: "Costa Rica", updatedAt: new Date() },
      { id: "10", name: "Norway", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "James Wilson",
    email: "james.w@test.com",
    age: 35,
    bio: "Business consultant who loves exploring new cities and cultures.",
    airportCode: "BUF",
    interests: ["Architecture", "History", "Food"],
    goals: ["Spain", "Portugal", "Morocco"],
    languages: ["English", "French"],
    profilePicture: "https://randomuser.me/api/portraits/men/6.jpg",
    currentCity: "Amherst, NY",
    connectionIntents: ["Networking & Business", "Art & Culture", "Deep Discussions", "Food & Dining", "Learning & Education"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: false,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true
    },
    personalTags: ["Career-Focused", "Analytical", "Leader", "Extroverted", "Planner"],
    preferredMeetupRadius: 15,
    availabilitySchedule: {
      monday: { start: "18:00", end: "23:00" },
      tuesday: { start: "18:00", end: "23:00" },
      wednesday: { start: "18:00", end: "23:00" },
      thursday: { start: "18:00", end: "23:00" },
      friday: { start: "17:00", end: "01:00" },
      saturday: { start: "11:00", end: "02:00" },
      sunday: { start: "11:00", end: "21:00" }
    },
    availableNow: true,
    moodStatus: "Networking",
    groupAffiliations: ["Business Consultants", "Architecture Society"],
    lastKnownCoordinates: {
      latitude: 42.9784,
      longitude: -78.7997
    },
    linkRatingScore: {
      average: 4.4,
      count: 26
    },
    socialMedia: {
      instagram: "@james_business",
      linkedin: "james-wilson-consulting",
      twitter: "@jwilson_business"
    },
    travelHistory: [
      { id: "11", name: "France", updatedAt: new Date() },
      { id: "12", name: "Italy", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Olivia Martinez",
    email: "olivia.m@test.com",
    age: 24,
    bio: "Yoga instructor and wellness enthusiast. Always seeking new experiences.",
    airportCode: "BUF",
    interests: ["Yoga", "Meditation", "Healthy Food"],
    goals: ["India", "Bali", "Thailand"],
    languages: ["English", "Spanish"],
    profilePicture: "https://randomuser.me/api/portraits/women/7.jpg",
    currentCity: "Kenmore, NY",
    connectionIntents: ["Fitness & Wellness", "Learning & Education", "Deep Discussions", "Coffee & Casual Meetups", "Volunteering & Community"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: true
    },
    personalTags: ["Yoga Practitioner", "Meditation", "Vegan", "Early Bird", "Minimalist"],
    preferredMeetupRadius: 10,
    availabilitySchedule: {
      monday: { start: "06:00", end: "21:00" },
      tuesday: { start: "06:00", end: "21:00" },
      wednesday: { start: "06:00", end: "21:00" },
      thursday: { start: "06:00", end: "21:00" },
      friday: { start: "06:00", end: "22:00" },
      saturday: { start: "07:00", end: "20:00" },
      sunday: { start: "07:00", end: "19:00" }
    },
    availableNow: true,
    moodStatus: "Coffee Break",
    groupAffiliations: ["Yoga Community", "Wellness Warriors"],
    lastKnownCoordinates: {
      latitude: 42.9653,
      longitude: -78.8700
    },
    linkRatingScore: {
      average: 4.7,
      count: 22
    },
    socialMedia: {
      instagram: "@olivia_yoga",
      linkedin: "olivia-martinez-wellness",
      twitter: "@olivia_zen"
    },
    travelHistory: [
      { id: "13", name: "Bali", updatedAt: new Date() },
      { id: "14", name: "Thailand", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Alex Thompson",
    email: "alex.t@test.com",
    age: 29,
    bio: "Music producer who loves discovering local music scenes.",
    airportCode: "BUF",
    interests: ["Music", "Nightlife", "Art"],
    goals: ["Brazil", "Cuba", "Jamaica"],
    languages: ["English", "Portuguese"],
    profilePicture: "https://randomuser.me/api/portraits/men/8.jpg",
    currentCity: "North Tonawanda, NY",
    connectionIntents: ["Music & Concerts", "Bar Hopping & Nightlife", "Art & Culture", "Creative Projects", "Dancing & Social Events"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: false,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Musician", "Night Owl", "Creative", "Extroverted", "Spontaneous"],
    preferredMeetupRadius: 20,
    availabilitySchedule: {
      monday: { start: "20:00", end: "02:00" },
      tuesday: { start: "20:00", end: "02:00" },
      wednesday: { start: "20:00", end: "02:00" },
      thursday: { start: "20:00", end: "02:00" },
      friday: { start: "19:00", end: "03:00" },
      saturday: { start: "18:00", end: "03:00" },
      sunday: { start: "18:00", end: "01:00" }
    },
    availableNow: false,
    moodStatus: "Busy",
    groupAffiliations: ["Music Producers", "Art Collective"],
    lastKnownCoordinates: {
      latitude: 43.0387,
      longitude: -78.8642
    },
    linkRatingScore: {
      average: 4.1,
      count: 17
    },
    socialMedia: {
      instagram: "@alex_music",
      linkedin: "alex-thompson-producer",
      twitter: "@alex_produces"
    },
    travelHistory: [
      { id: "15", name: "Brazil", updatedAt: new Date() },
      { id: "16", name: "Mexico", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Isabella Lee",
    email: "isabella.l@test.com",
    age: 26,
    bio: "Fashion designer inspired by global styles and traditions.",
    airportCode: "BUF",
    interests: ["Fashion", "Shopping", "Art"],
    goals: ["France", "Italy", "Japan"],
    languages: ["English", "Chinese"],
    profilePicture: "https://randomuser.me/api/portraits/women/9.jpg",
    currentCity: "Lancaster, NY",
    connectionIntents: ["Art & Culture", "Creative Projects", "Fashion & Style", "Coffee & Casual Meetups", "Festivals & Events"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Artist", "Fashion-Forward", "Creative", "Extroverted", "Luxury Lover"],
    preferredMeetupRadius: 12,
    availabilitySchedule: {
      monday: { start: "17:00", end: "22:00" },
      tuesday: { start: "17:00", end: "22:00" },
      wednesday: { start: "17:00", end: "22:00" },
      thursday: { start: "17:00", end: "22:00" },
      friday: { start: "16:00", end: "01:00" },
      saturday: { start: "10:00", end: "02:00" },
      sunday: { start: "10:00", end: "20:00" }
    },
    availableNow: true,
    moodStatus: "Shopping",
    groupAffiliations: ["Fashion Designers", "Art Community"],
    lastKnownCoordinates: {
      latitude: 42.9006,
      longitude: -78.6703
    },
    linkRatingScore: {
      average: 4.6,
      count: 24
    },
    socialMedia: {
      instagram: "@isabella_fashion",
      linkedin: "isabella-lee-design",
      twitter: "@isabella_style"
    },
    travelHistory: [
      { id: "17", name: "France", updatedAt: new Date() },
      { id: "18", name: "Japan", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Ryan Cooper",
    email: "ryan.c@test.com",
    age: 31,
    bio: "Sports enthusiast and adventure seeker. Always up for a challenge!",
    airportCode: "BUF",
    interests: ["Sports", "Hiking", "Water Sports"],
    goals: ["New Zealand", "Australia", "South Africa"],
    languages: ["English"],
    profilePicture: "https://randomuser.me/api/portraits/men/10.jpg",
    currentCity: "West Seneca, NY",
    connectionIntents: ["Sports & Athletics", "Outdoor Adventures", "Fitness & Wellness", "Bar Hopping & Nightlife", "Gaming & Entertainment"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: false,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: false,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Gym Rat", "Adventure Seeker", "Extroverted", "Early Bird", "Action-Oriented"],
    preferredMeetupRadius: 25,
    availabilitySchedule: {
      monday: { start: "06:00", end: "22:00" },
      tuesday: { start: "06:00", end: "22:00" },
      wednesday: { start: "06:00", end: "22:00" },
      thursday: { start: "06:00", end: "22:00" },
      friday: { start: "06:00", end: "23:00" },
      saturday: { start: "07:00", end: "23:00" },
      sunday: { start: "07:00", end: "21:00" }
    },
    availableNow: true,
    moodStatus: "Group Activities",
    groupAffiliations: ["Sports Club", "Adventure Group"],
    lastKnownCoordinates: {
      latitude: 42.8501,
      longitude: -78.7997
    },
    linkRatingScore: {
      average: 4.4,
      count: 20
    },
    socialMedia: {
      instagram: "@ryan_sports",
      linkedin: "ryan-cooper-fitness",
      twitter: "@ryan_adventure"
    },
    travelHistory: [
      { id: "19", name: "Australia", updatedAt: new Date() },
      { id: "20", name: "New Zealand", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Maya Patel",
    email: "maya.p@test.com",
    age: 23,
    bio: "Digital nomad and tech startup founder. Living life on my own terms!",
    airportCode: "BUF",
    interests: ["Technology", "Travel", "Startups"],
    goals: ["Bali", "Thailand", "Vietnam"],
    languages: ["English", "Hindi"],
    profilePicture: "https://randomuser.me/api/portraits/women/11.jpg",
    currentCity: "Cheektowaga, NY",
    connectionIntents: ["Technology & Innovation", "Creative Projects", "Networking & Business", "Travel & Exploration", "Learning & Education"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: true,
      prefersWeekendEvents: false,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true
    },
    personalTags: ["Entrepreneur", "Tech-Savvy", "Independent", "Career-Focused", "Analytical"],
    preferredMeetupRadius: 18,
    availabilitySchedule: {
      monday: { start: "09:00", end: "23:00" },
      tuesday: { start: "09:00", end: "23:00" },
      wednesday: { start: "09:00", end: "23:00" },
      thursday: { start: "09:00", end: "23:00" },
      friday: { start: "09:00", end: "01:00" },
      saturday: { start: "10:00", end: "02:00" },
      sunday: { start: "10:00", end: "22:00" }
    },
    availableNow: true,
    moodStatus: "Work Mode",
    groupAffiliations: ["Tech Startups", "Digital Nomads"],
    lastKnownCoordinates: {
      latitude: 42.9034,
      longitude: -78.7547
    },
    linkRatingScore: {
      average: 4.8,
      count: 29
    },
    socialMedia: {
      instagram: "@maya_nomad",
      linkedin: "maya-patel-startup",
      twitter: "@maya_innovates"
    },
    travelHistory: [
      { id: "21", name: "Thailand", updatedAt: new Date() },
      { id: "22", name: "Vietnam", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Carlos Rodriguez",
    email: "carlos.r@test.com",
    age: 33,
    bio: "Chef and food culture explorer. Bringing flavors from around the world.",
    airportCode: "BUF",
    interests: ["Cooking", "Food Culture", "Wine"],
    goals: ["Spain", "Italy", "France"],
    languages: ["English", "Spanish", "Italian"],
    profilePicture: "https://randomuser.me/api/portraits/men/12.jpg",
    currentCity: "Tonawanda, NY",
    connectionIntents: ["Food & Dining", "Art & Culture", "Creative Projects", "Coffee & Casual Meetups", "Festivals & Events"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Foodie", "Creative", "Extroverted", "Luxury Lover", "Team Player"],
    preferredMeetupRadius: 15,
    availabilitySchedule: {
      monday: { start: "16:00", end: "23:00" },
      tuesday: { start: "16:00", end: "23:00" },
      wednesday: { start: "16:00", end: "23:00" },
      thursday: { start: "16:00", end: "23:00" },
      friday: { start: "15:00", end: "01:00" },
      saturday: { start: "12:00", end: "02:00" },
      sunday: { start: "12:00", end: "21:00" }
    },
    availableNow: false,
    moodStatus: "Food Tour",
    groupAffiliations: ["Chef Network", "Wine Society"],
    lastKnownCoordinates: {
      latitude: 43.0203,
      longitude: -78.8803
    },
    linkRatingScore: {
      average: 4.9,
      count: 35
    },
    socialMedia: {
      instagram: "@carlos_chef",
      linkedin: "carlos-rodriguez-culinary",
      twitter: "@carlos_cooks"
    },
    travelHistory: [
      { id: "23", name: "Spain", updatedAt: new Date() },
      { id: "24", name: "Italy", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Zoe Williams",
    email: "zoe.w@test.com",
    age: 25,
    bio: "Environmental activist and sustainable living advocate.",
    airportCode: "BUF",
    interests: ["Sustainability", "Zero Waste", "Community"],
    goals: ["Costa Rica", "Norway", "New Zealand"],
    languages: ["English", "French"],
    profilePicture: "https://randomuser.me/api/portraits/women/13.jpg",
    currentCity: "Grand Island, NY",
    connectionIntents: ["Volunteering & Community", "Learning & Education", "Deep Discussions", "Outdoor Adventures", "Art & Culture"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: true
    },
    personalTags: ["Minimalist", "Deep Thinker", "Empathetic", "Introverted", "Early Bird"],
    preferredMeetupRadius: 10,
    availabilitySchedule: {
      monday: { start: "17:00", end: "21:00" },
      tuesday: { start: "17:00", end: "21:00" },
      wednesday: { start: "17:00", end: "21:00" },
      thursday: { start: "17:00", end: "21:00" },
      friday: { start: "16:00", end: "22:00" },
      saturday: { start: "09:00", end: "18:00" },
      sunday: { start: "09:00", end: "17:00" }
    },
    availableNow: true,
    moodStatus: "Sightseeing",
    groupAffiliations: ["Environmental Activists", "Zero Waste Community"],
    lastKnownCoordinates: {
      latitude: 43.0334,
      longitude: -78.9628
    },
    linkRatingScore: {
      average: 4.5,
      count: 18
    },
    socialMedia: {
      instagram: "@zoe_eco",
      linkedin: "zoe-williams-sustainability",
      twitter: "@zoe_environment"
    },
    travelHistory: [
      { id: "25", name: "Costa Rica", updatedAt: new Date() },
      { id: "26", name: "Norway", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Marcus Johnson",
    email: "marcus.j@test.com",
    age: 28,
    bio: "Professional athlete and motivational speaker. Inspiring others to reach their potential.",
    airportCode: "BUF",
    interests: ["Fitness", "Motivation", "Leadership"],
    goals: ["Australia", "South Africa", "Brazil"],
    languages: ["English"],
    profilePicture: "https://randomuser.me/api/portraits/men/14.jpg",
    currentCity: "Depew, NY",
    connectionIntents: ["Fitness & Wellness", "Sports & Athletics", "Learning & Education", "Networking & Business", "Volunteering & Community"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: false,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: false,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: false
    },
    personalTags: ["Gym Rat", "Leader", "Extroverted", "Early Bird", "Action-Oriented"],
    preferredMeetupRadius: 20,
    availabilitySchedule: {
      monday: { start: "05:00", end: "22:00" },
      tuesday: { start: "05:00", end: "22:00" },
      wednesday: { start: "05:00", end: "22:00" },
      thursday: { start: "05:00", end: "22:00" },
      friday: { start: "05:00", end: "23:00" },
      saturday: { start: "06:00", end: "23:00" },
      sunday: { start: "06:00", end: "21:00" }
    },
    availableNow: true,
    moodStatus: "Free to Chat",
    groupAffiliations: ["Professional Athletes", "Leadership Network"],
    lastKnownCoordinates: {
      latitude: 42.9039,
      longitude: -78.6923
    },
    linkRatingScore: {
      average: 4.7,
      count: 42
    },
    socialMedia: {
      instagram: "@marcus_athlete",
      linkedin: "marcus-johnson-sports",
      twitter: "@marcus_motivates"
    },
    travelHistory: [
      { id: "27", name: "Australia", updatedAt: new Date() },
      { id: "28", name: "South Africa", updatedAt: new Date() }
    ],
    notifications: []
  },
  {
    name: "Aria Chen",
    email: "aria.c@test.com",
    age: 26,
    bio: "Classical musician and cultural ambassador. Bridging worlds through music.",
    airportCode: "BUF",
    interests: ["Classical Music", "Culture", "Education"],
    goals: ["Austria", "Germany", "Czech Republic"],
    languages: ["English", "Mandarin", "German"],
    profilePicture: "https://randomuser.me/api/portraits/women/15.jpg",
    currentCity: "Lockport, NY",
    connectionIntents: ["Music & Concerts", "Art & Culture", "Learning & Education", "Deep Discussions", "Coffee & Casual Meetups"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: true,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true
    },
    personalTags: ["Musician", "Deep Thinker", "Introverted", "Early Bird", "Analytical"],
    preferredMeetupRadius: 12,
    availabilitySchedule: {
      monday: { start: "18:00", end: "22:00" },
      tuesday: { start: "18:00", end: "22:00" },
      wednesday: { start: "18:00", end: "22:00" },
      thursday: { start: "18:00", end: "22:00" },
      friday: { start: "17:00", end: "23:00" },
      saturday: { start: "14:00", end: "22:00" },
      sunday: { start: "14:00", end: "20:00" }
    },
    availableNow: false,
    moodStatus: "Coffee Break",
    groupAffiliations: ["Classical Musicians", "Cultural Exchange"],
    lastKnownCoordinates: {
      latitude: 43.1706,
      longitude: -78.6903
    },
    linkRatingScore: {
      average: 4.6,
      count: 25
    },
    socialMedia: {
      instagram: "@aria_music",
      linkedin: "aria-chen-music",
      twitter: "@aria_classical"
    },
    travelHistory: [
      { id: "29", name: "Austria", updatedAt: new Date() },
      { id: "30", name: "Germany", updatedAt: new Date() }
    ],
    notifications: []
  }
];

const TestDataSection: React.FC<{ textColor: string, sectionBgColor: string }> = ({ textColor, sectionBgColor }) => {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [userCount, setUserCount] = useState(1);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [existingTestUsers, setExistingTestUsers] = useState<Array<{ id: string } & TestUser>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExistingTestUsers = useCallback(async () => {
    try {
      const testUsersQuery = query(
        collection(db, 'users'),
        where('testUser', '==', true)
      );
      const snapshot = await getDocs(testUsersQuery);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{ id: string } & TestUser>;
      setExistingTestUsers(users);
    } catch (error) {
      console.error('Error fetching test users:', error);
      Alert.alert('Error', 'Failed to fetch existing test users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExistingTestUsers();
  }, [fetchExistingTestUsers]);

  const deleteTestUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setExistingTestUsers(prev => prev.filter(user => user.id !== userId));
      Alert.alert('Success', 'Test user deleted successfully');
    } catch (error) {
      console.error('Error deleting test user:', error);
      Alert.alert('Error', 'Failed to delete test user');
    }
  };

  const deleteAllTestUsers = async () => {
    Alert.alert(
      'Delete All Test Users',
      'Are you sure you want to delete all test users? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              existingTestUsers.forEach(user => {
                const userRef = doc(db, 'users', user.id);
                batch.delete(userRef);
              });
              await batch.commit();
              setExistingTestUsers([]);
              Alert.alert('Success', 'All test users deleted successfully');
            } catch (error) {
              console.error('Error deleting all test users:', error);
              Alert.alert('Error', 'Failed to delete all test users');
            }
          }
        }
      ]
    );
  };

  const generateTestUsers = async () => {
    if (userCount < 1 || userCount > 15) {
      Alert.alert('Error', 'Please select between 1 and 15 users');
      return;
    }

    if (!authUser?.uid) {
      Alert.alert('Error', 'You must be logged in to generate test users');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Getting current user\'s push token...');

    try {
      // Get the current authenticated user's push token
      const currentUserDoc = await getDoc(doc(db, 'users', authUser.uid));
      if (!currentUserDoc.exists()) {
        Alert.alert('Error', 'Current user document not found');
        return;
      }

      const currentUserData = currentUserDoc.data();
      const currentUserPushToken = currentUserData.expoPushToken;

      if (!currentUserPushToken) {
        Alert.alert('Error', 'Current user does not have a push token. Please enable notifications first.');
        return;
      }

      setGenerationStatus('Cleaning up existing test users...');

      // First, delete all existing test users
      if (existingTestUsers.length > 0) {
        const deleteBatch = writeBatch(db);
        existingTestUsers.forEach(user => {
          const userRef = doc(db, 'users', user.id);
          deleteBatch.delete(userRef);
        });
        await deleteBatch.commit();
      }

      // Then generate new test users
      setGenerationStatus('Creating new test users...');
      const selectedUsers = testUsers.slice(0, userCount);
      const batch = writeBatch(db);

      for (const user of selectedUsers) {
        const userRef = doc(collection(db, 'users'));
        const now = Timestamp.now();
        const dateOfBirth = new Date();
        dateOfBirth.setFullYear(dateOfBirth.getFullYear() - user.age);

        // Generate some recent activity notifications
        const recentNotifications = [
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            title: "Welcome to Layover! 🎉",
            body: "Start exploring and connecting with travelers around you.",
            type: "welcome",
            read: false,
            timestamp: Timestamp.fromDate(new Date(Date.now() - Math.random() * 86400000)), // Random time in last 24 hours
            data: { type: "welcome" }
          }
        ];

        // Add some random recent activity
        if (Math.random() > 0.5) {
          recentNotifications.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            title: "New Event Nearby! 📅",
            body: "There's a new event happening near your airport. Check it out!",
            type: "event",
            read: false,
            timestamp: Timestamp.fromDate(new Date(Date.now() - Math.random() * 3600000)), // Random time in last hour
            data: { type: "event" }
          });
        }

        const userData = {
          ...user,
          acceptedEula: true,
          createdAt: now,
          dateOfBirth: Timestamp.fromDate(dateOfBirth),
          eulaAcceptedAt: now,
          expoPushToken: currentUserPushToken, // Use the current user's push token
          hasMeBlocked: [],
          isAnonymous: false,
          lastLogin: now,
          likedUsers: [],
          blockedUsers: [],
          dislikedUsers: [],
          notificationPreferences: {
            announcements: true,
            chats: true,
            connections: true,
            activities: true,
            notificationsEnabled: true
          },
          notifications: recentNotifications,
          testUser: true,
          updatedAt: now,
          // Add missing fields from the new structure
          reputationTags: [],
          personalTags: user.personalTags || [],
          groupAffiliations: user.groupAffiliations || [],
          linkRatingScore: user.linkRatingScore || { average: 0, count: 0 },
          socialMedia: user.socialMedia || { instagram: "", linkedin: "", twitter: "" },
          travelHistory: user.travelHistory.map(trip => ({
            ...trip,
            updatedAt: Timestamp.fromDate(trip.updatedAt)
          })),
          lastKnownCoordinates: user.lastKnownCoordinates,
          preferredMeetupRadius: user.preferredMeetupRadius || 15,
          connectionIntents: user.connectionIntents || [],
          eventPreferences: user.eventPreferences || { likesBars: true, prefersSmallGroups: true },
          availabilitySchedule: user.availabilitySchedule,
          availableNow: user.availableNow,
          moodStatus: user.moodStatus || "neutral",
          currentCity: user.currentCity || `${user.airportCode} Area`
        };

        batch.set(userRef, userData);
      }

      await batch.commit();
      setGenerationStatus(`Successfully generated ${userCount} test users with your push token!`);
      fetchExistingTestUsers(); // Refresh the list after generating new users
    } catch (error) {
      console.error('Error generating test users:', error);
      setGenerationStatus('Error generating test users. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUserPress = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  return (
    <View style={[styles.testDataSection, { backgroundColor: sectionBgColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Test Data Generation</Text>
      
      <View style={styles.testDataContent}>
        <Text style={[styles.testDataDescription, { color: textColor }]}>
          Generate test users with realistic data for development and testing purposes. All test users will use your current push token for notifications.
        </Text>

        <View style={styles.userCountContainer}>
          <Text style={[styles.label, { color: textColor }]}>Number of Users:</Text>
          <View style={styles.userCountControls}>
            <TouchableOpacity
              style={[styles.userCountButton, { borderColor: textColor }]}
              onPress={() => setUserCount(Math.max(1, userCount - 1))}
              disabled={userCount <= 1}
            >
              <MaterialIcons name="remove" size={20} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.userCount, { color: textColor }]}>{userCount}</Text>
            <TouchableOpacity
              style={[styles.userCountButton, { borderColor: textColor }]}
              onPress={() => setUserCount(Math.min(15, userCount + 1))}
              disabled={userCount >= 15}
            >
              <MaterialIcons name="add" size={20} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.generateButton,
            isGenerating && styles.generateButtonDisabled
          ]}
          onPress={generateTestUsers}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Test Users</Text>
          )}
        </TouchableOpacity>

        {generationStatus && (
          <Text style={[styles.generationStatus, { color: textColor }]}>
            {generationStatus}
          </Text>
        )}

        <View style={styles.existingUsersSection}>
          <View style={styles.existingUsersHeader}>
            <Text style={[styles.existingUsersTitle, { color: textColor }]}>
              Existing Test Users ({existingTestUsers.length})
            </Text>
          </View>
          {existingTestUsers.length > 0 && (
            <View style={styles.deleteAllContainer}>
              <TouchableOpacity
                style={[styles.deleteAllButton, { borderColor: textColor }]}
                onPress={deleteAllTestUsers}
              >
                <MaterialIcons name="delete-sweep" size={20} color={textColor} />
                <Text style={[styles.deleteAllButtonText, { color: textColor }]}>
                  Delete All
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" color={textColor} style={styles.loadingIndicator} />
          ) : existingTestUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="people" size={48} color={textColor} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyStateText, { color: textColor }]}>No test users found</Text>
            </View>
          ) : (
            <ScrollView style={styles.testUsersList}>
              {existingTestUsers.map((user) => (
                <View 
                  key={user.id} 
                  style={[styles.testUserItem, { borderColor: textColor }]}
                >
                  <TouchableOpacity
                    style={styles.testUserInfo}
                    onPress={() => handleUserPress(user.id)}
                    activeOpacity={0.7}
                  >
                    <Image 
                      source={{ uri: user.profilePicture }} 
                      style={styles.testUserAvatar}
                    />
                    <View style={styles.testUserDetails}>
                      <Text style={[styles.testUserName, { color: textColor }]}>{user.name}</Text>
                      <Text style={[styles.testUserEmail, { color: textColor }]}>{user.email}</Text>
                      <Text style={[styles.testUserAirport, { color: textColor }]}>
                        {user.airportCode}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: textColor }]}
                    onPress={() => deleteTestUser(user.id)}
                  >
                    <MaterialIcons name="delete" size={20} color={textColor} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
};

// Add test ping data interface
interface TestPing {
  title: string;
  description: string;
  location: string;
  category: string;
  template: string;
  duration: string;
  maxParticipants: string;
  pingType: string;
  visibilityRadius: string;
  connectionIntents: string[];
  eventPreferences: any;
}

const testPings: TestPing[] = [
  {
    title: "Coffee & Chat",
    description: "Looking for someone to grab coffee and have a good conversation. Perfect for networking or just making new friends!",
    location: "Local Coffee Shop",
    category: "food",
    template: "coffee",
    duration: "1 hour",
    maxParticipants: "4 people",
    pingType: "open",
    visibilityRadius: "10 miles",
    connectionIntents: ["Coffee & Casual Meetups", "Deep Discussions"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: false,
      prefersEveningEvents: false,
      prefersIndoorVenues: true,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true,
    }
  },
  {
    title: "Pickup Basketball",
    description: "Need players for a casual pickup basketball game. All skill levels welcome!",
    location: "Local Basketball Court",
    category: "sports",
    template: "basketball",
    duration: "2 hours",
    maxParticipants: "10 people",
    pingType: "open",
    visibilityRadius: "15 miles",
    connectionIntents: ["Sports & Athletics", "Fitness & Wellness"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: false,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: false,
    }
  },
  {
    title: "Dinner Plans",
    description: "Looking for dinner companions to try out a new restaurant. Great opportunity to meet new people!",
    location: "New Restaurant Downtown",
    category: "food",
    template: "dinner",
    duration: "2 hours",
    maxParticipants: "6 people",
    pingType: "open",
    visibilityRadius: "20 miles",
    connectionIntents: ["Food & Dining", "Coffee & Casual Meetups"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: false,
    }
  },
  {
    title: "Hiking Adventure",
    description: "Planning a hiking trip to explore local trails. Perfect for nature lovers and adventure seekers!",
    location: "Local Hiking Trail",
    category: "wellness",
    template: "hiking",
    duration: "4 hours",
    maxParticipants: "8 people",
    pingType: "open",
    visibilityRadius: "25 miles",
    connectionIntents: ["Outdoor Adventures", "Fitness & Wellness"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: false,
      prefersTravelEvents: true,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: false,
    }
  },
  {
    title: "Board Game Night",
    description: "Hosting a board game night. Bring your favorite games or learn new ones!",
    location: "Local Community Center",
    category: "social",
    template: "board-games",
    duration: "3 hours",
    maxParticipants: "8 people",
    pingType: "open",
    visibilityRadius: "12 miles",
    connectionIntents: ["Coffee & Casual Meetups", "Deep Discussions"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true,
    }
  },
  {
    title: "Networking Meetup",
    description: "Professional networking event for entrepreneurs and professionals. Great for building connections!",
    location: "Downtown Business Center",
    category: "business",
    template: "networking",
    duration: "2 hours",
    maxParticipants: "15 people",
    pingType: "open",
    visibilityRadius: "30 miles",
    connectionIntents: ["Networking & Business", "Technology & Innovation"],
    eventPreferences: {
      likesBars: true,
      prefersSmallGroups: false,
      prefersWeekendEvents: false,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: false,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true,
    }
  },
  {
    title: "Movie Night",
    description: "Going to see the latest blockbuster. Looking for movie buddies!",
    location: "Local Movie Theater",
    category: "entertainment",
    template: "movie",
    duration: "3 hours",
    maxParticipants: "6 people",
    pingType: "open",
    visibilityRadius: "15 miles",
    connectionIntents: ["Music & Concerts", "Gaming & Entertainment"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: true,
      prefersIndoorVenues: true,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: false,
    }
  },
  {
    title: "Yoga Session",
    description: "Group yoga session for all levels. Bring your own mat and positive energy!",
    location: "Local Park",
    category: "wellness",
    template: "yoga",
    duration: "1 hour",
    maxParticipants: "12 people",
    pingType: "open",
    visibilityRadius: "10 miles",
    connectionIntents: ["Fitness & Wellness", "Outdoor Adventures"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: false,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: true,
      prefersIntellectualDiscussions: false,
    }
  },
  {
    title: "Language Exchange",
    description: "Spanish-English language exchange. Practice speaking and make new friends!",
    location: "Local Library",
    category: "learning",
    template: "language",
    duration: "2 hours",
    maxParticipants: "6 people",
    pingType: "open",
    visibilityRadius: "18 miles",
    connectionIntents: ["Learning & Education", "Deep Discussions"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: false,
      prefersEveningEvents: false,
      prefersIndoorVenues: true,
      prefersStructuredActivities: true,
      prefersSpontaneousPlans: false,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true,
    }
  },
  {
    title: "Photography Walk",
    description: "Photography enthusiasts wanted! Let's explore the city and capture some amazing shots together.",
    location: "Downtown Area",
    category: "other",
    template: "photography",
    duration: "3 hours",
    maxParticipants: "8 people",
    pingType: "open",
    visibilityRadius: "20 miles",
    connectionIntents: ["Photography & Media", "Art & Culture"],
    eventPreferences: {
      likesBars: false,
      prefersSmallGroups: true,
      prefersWeekendEvents: true,
      prefersEveningEvents: false,
      prefersIndoorVenues: false,
      prefersStructuredActivities: false,
      prefersSpontaneousPlans: true,
      prefersLocalMeetups: true,
      prefersTravelEvents: false,
      prefersQuietEnvironments: true,
      prefersActiveLifestyles: false,
      prefersIntellectualDiscussions: true,
    }
  }
];

const TestPingSection: React.FC<{ textColor: string, sectionBgColor: string }> = ({ textColor, sectionBgColor }) => {
  const { user: authUser } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pingCount, setPingCount] = useState(5);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [existingTestPings, setExistingTestPings] = useState<Array<{ id: string } & any>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExistingTestPings = useCallback(async () => {
    try {
      const pingsQuery = query(
        collection(db, 'pings'),
        where('testPing', '==', true)
      );
      const snapshot = await getDocs(pingsQuery);
      const pings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExistingTestPings(pings);
    } catch (error) {
      console.error('Error fetching test pings:', error);
      Alert.alert('Error', 'Failed to fetch existing test pings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExistingTestPings();
  }, [fetchExistingTestPings]);

  const deleteTestPing = async (pingId: string) => {
    try {
      await deleteDoc(doc(db, 'pings', pingId));
      setExistingTestPings(prev => prev.filter(ping => ping.id !== pingId));
      Alert.alert('Success', 'Test ping deleted successfully');
    } catch (error) {
      console.error('Error deleting test ping:', error);
      Alert.alert('Error', 'Failed to delete test ping');
    }
  };

  const deleteAllTestPings = async () => {
    Alert.alert(
      'Delete All Test Pings',
      'Are you sure you want to delete all test pings? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              existingTestPings.forEach(ping => {
                const pingRef = doc(db, 'pings', ping.id);
                batch.delete(pingRef);
              });
              await batch.commit();
              setExistingTestPings([]);
              Alert.alert('Success', 'All test pings deleted successfully');
            } catch (error) {
              console.error('Error deleting all test pings:', error);
              Alert.alert('Error', 'Failed to delete all test pings');
            }
          }
        }
      ]
    );
  };

  // Function to generate random coordinates within 50 miles of user location
  const generateRandomCoordinates = (userLat: number, userLng: number): { latitude: number; longitude: number } => {
    // Convert miles to degrees (approximate)
    // 1 degree of latitude ≈ 69 miles
    // 1 degree of longitude ≈ 69 * cos(latitude) miles
    const maxRadiusMiles = 50;
    const maxRadiusLat = maxRadiusMiles / 69;
    const maxRadiusLng = maxRadiusMiles / (69 * Math.cos(userLat * Math.PI / 180));

    // Generate random angle and distance
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * maxRadiusMiles;

    // Convert to lat/lng offsets
    const latOffset = (distance * Math.cos(angle)) / 69;
    const lngOffset = (distance * Math.sin(angle)) / (69 * Math.cos(userLat * Math.PI / 180));

    return {
      latitude: userLat + latOffset,
      longitude: userLng + lngOffset
    };
  };

  const generateTestPings = async () => {
    if (pingCount < 1 || pingCount > 10) {
      Alert.alert('Error', 'Please select between 1 and 10 pings');
      return;
    }

    if (!authUser?.uid) {
      Alert.alert('Error', 'You must be logged in to generate test pings');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('Getting current user location...');

    try {
      // Get the current authenticated user's location
      const currentUserDoc = await getDoc(doc(db, 'users', authUser.uid));
      if (!currentUserDoc.exists()) {
        Alert.alert('Error', 'Current user document not found');
        return;
      }

      const currentUserData = currentUserDoc.data();
      const userLocation = currentUserData.lastKnownCoordinates;

      if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
        Alert.alert('Error', 'Current user does not have location data. Please enable location services first.');
        return;
      }

      setGenerationStatus('Cleaning up existing test pings...');

      // First, delete all existing test pings
      if (existingTestPings.length > 0) {
        const deleteBatch = writeBatch(db);
        existingTestPings.forEach(ping => {
          const pingRef = doc(db, 'pings', ping.id);
          deleteBatch.delete(pingRef);
        });
        await deleteBatch.commit();
      }

      // Then generate new test pings
      setGenerationStatus('Creating new test pings...');
      const selectedPings = testPings.slice(0, pingCount);
      const batch = writeBatch(db);

      for (const ping of selectedPings) {
        const pingRef = doc(collection(db, 'pings'));
        const now = Timestamp.now();
        
        // Generate random coordinates within 50 miles of user location
        const coordinates = generateRandomCoordinates(userLocation.latitude, userLocation.longitude);

        const pingData = {
          ...ping,
          creatorId: authUser.uid,
          creatorName: currentUserData.name || 'Test User',
          coordinates: coordinates,
          createdAt: now,
          status: 'active',
          participants: [],
          participantCount: 0,
          testPing: true,
          updatedAt: now
        };

        batch.set(pingRef, pingData);
      }

      await batch.commit();
      setGenerationStatus(`Successfully generated ${pingCount} test pings within 50 miles of your location!`);
      fetchExistingTestPings(); // Refresh the list after generating new pings
    } catch (error) {
      console.error('Error generating test pings:', error);
      setGenerationStatus('Error generating test pings. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return new Date(timestamp.toDate()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  return (
    <View style={[styles.testPingSection, { backgroundColor: sectionBgColor }]}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Test Ping Generation</Text>
      
      <View style={styles.testPingContent}>
        <Text style={[styles.testPingDescription, { color: textColor }]}>
          Generate test pings with realistic data for development and testing purposes. All pings will be created within 50 miles of your current location.
        </Text>

        <View style={styles.pingCountContainer}>
          <Text style={[styles.label, { color: textColor }]}>Number of Pings:</Text>
          <View style={styles.pingCountControls}>
            <TouchableOpacity
              style={[styles.pingCountButton, { borderColor: textColor }]}
              onPress={() => setPingCount(Math.max(1, pingCount - 1))}
              disabled={pingCount <= 1}
            >
              <MaterialIcons name="remove" size={20} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.pingCount, { color: textColor }]}>{pingCount}</Text>
            <TouchableOpacity
              style={[styles.pingCountButton, { borderColor: textColor }]}
              onPress={() => setPingCount(Math.min(10, pingCount + 1))}
              disabled={pingCount >= 10}
            >
              <MaterialIcons name="add" size={20} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.generatePingButton,
            isGenerating && styles.generatePingButtonDisabled
          ]}
          onPress={generateTestPings}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.generatePingButtonText}>Generate Test Pings</Text>
          )}
        </TouchableOpacity>

        {generationStatus && (
          <Text style={[styles.generationStatus, { color: textColor }]}>
            {generationStatus}
          </Text>
        )}

        <View style={styles.existingPingsSection}>
          <View style={styles.existingPingsHeader}>
            <Text style={[styles.existingPingsTitle, { color: textColor }]}>
              Existing Test Pings ({existingTestPings.length})
            </Text>
          </View>
          {existingTestPings.length > 0 && (
            <View style={styles.deleteAllContainer}>
              <TouchableOpacity
                style={[styles.deleteAllButton, { borderColor: textColor }]}
                onPress={deleteAllTestPings}
              >
                <MaterialIcons name="delete-sweep" size={20} color={textColor} />
                <Text style={[styles.deleteAllButtonText, { color: textColor }]}>
                  Delete All
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isLoading ? (
            <ActivityIndicator size="large" color={textColor} style={styles.loadingIndicator} />
          ) : existingTestPings.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event" size={48} color={textColor} style={{ opacity: 0.5 }} />
              <Text style={[styles.emptyStateText, { color: textColor }]}>No test pings found</Text>
            </View>
          ) : (
            <ScrollView style={styles.testPingsList}>
              {existingTestPings.map((ping) => (
                <View 
                  key={ping.id} 
                  style={[styles.testPingItem, { borderColor: textColor }]}
                >
                  <View style={styles.testPingInfo}>
                    <View style={styles.testPingDetails}>
                      <Text style={[styles.testPingTitle, { color: textColor }]}>{ping.title}</Text>
                      <Text style={[styles.testPingCategory, { color: textColor }]}>
                        {PING_CATEGORIES.find(cat => cat.id === ping.category)?.label || ping.category}
                      </Text>
                      <Text style={[styles.testPingDate, { color: textColor }]}>
                        {ping.createdAt ? formatDate(ping.createdAt) : 'Unknown Date'}
                      </Text>
                      <Text style={[styles.testPingLocation, { color: textColor }]}>
                        {ping.location}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: textColor }]}
                    onPress={() => deleteTestPing(ping.id)}
                  >
                    <MaterialIcons name="delete" size={20} color={textColor} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
};

export default function AdminTools() {
  const { theme } = React.useContext(ThemeContext);
  const router = useRouter();
  const { user } = useAuth();
  const textColor = theme === "light" ? "#0F172A" : "#e4fbfe";
  const sectionBgColor = theme === "light" ? "rgba(255, 255, 255, 0.9)" : "rgba(26, 26, 26, 0.9)";
  
  // Get notification count
  const notificationCount = useNotificationCount(user?.uid || null);
  
  // Handle back button press
  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };
  
  const [expandedSections, setExpandedSections] = useState({
    systemInfo: false,
    permissions: false,
    notifications: false,
    platform: false,
    massNotification: false,
  });

  const [expandedGroups, setExpandedGroups] = useState({
    information: false,
    notifications: false,
    needsAction: false,
    testData: false,
  });

  const [totalActionItems, setTotalActionItems] = useState(0);

  useEffect(() => {
    const fetchTotalCounts = async () => {
      try {
        const [reports, feedback] = await Promise.all([
          getDocs(collection(db, 'reports')),
          getDocs(collection(db, 'feedback'))
        ]);
        setTotalActionItems(reports.size + feedback.size);
      } catch (error) {
        console.error('Error fetching total counts:', error);
      }
    };

    fetchTotalCounts();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleGroup = (group: keyof typeof expandedGroups) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  return (
    <LinearGradient colors={theme === "light" ? ["#f8f9fa", "#ffffff"] : ["#000000", "#1a1a1a"]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <StatusBar translucent backgroundColor="transparent" barStyle={theme === "light" ? "dark-content" : "light-content"} />
        <TopBar 
          showBackButton={true}
          title=""
          onBackPress={handleBack}
          onProfilePress={() => router.push(`/profile/${user?.uid}`)}
          notificationCount={notificationCount}
          showLogo={true}
          centerLogo={true}
        />
        <ScrollView style={styles.container}>
          <Text style={[styles.header, { color: textColor }]}>
            Admin Tools
          </Text>

          <SystemStatusGrid textColor={textColor} sectionBgColor={sectionBgColor} />

          <TouchableOpacity 
            style={styles.groupHeader} 
            onPress={() => toggleGroup('needsAction')}
            activeOpacity={0.7}
          >
            <View style={styles.groupTitleContainer}>
              <Text style={[styles.sectionGroupTitle, { color: textColor }]}>Needs Action</Text>
              {totalActionItems > 0 && (
                <Text style={styles.actionCount}>{totalActionItems}</Text>
              )}
            </View>
            <MaterialIcons 
              name={expandedGroups.needsAction ? "remove" : "add"} 
              size={24} 
              color={textColor} 
            />
          </TouchableOpacity>

          {expandedGroups.needsAction && (
            <View style={[styles.actionContainer, { backgroundColor: sectionBgColor }]}>
              <View style={[styles.actionHeader, { borderBottomColor: textColor }]}>
                <MaterialIcons name="priority-high" size={24} color={textColor} />
                <View style={styles.groupTitleContainer}>
                  <Text style={[styles.actionTitle, { color: textColor }]}>Needs Action</Text>
                  {totalActionItems > 0 && (
                    <Text style={styles.actionCount}>{totalActionItems}</Text>
                  )}
                </View>
              </View>
              <View style={styles.actionContent}>
                <ReportsSection textColor={textColor} sectionBgColor={sectionBgColor} />
                <FeedbackSection textColor={textColor} sectionBgColor={sectionBgColor} />
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.groupHeader, { marginTop: 24 }]} 
            onPress={() => toggleGroup('information')}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionGroupTitle, { color: textColor }]}>Information</Text>
            <MaterialIcons 
              name={expandedGroups.information ? "remove" : "add"} 
              size={24} 
              color={textColor} 
            />
          </TouchableOpacity>

          {expandedGroups.information && (
            <>
              <CollapsibleSection
                title="System Information"
                isExpanded={expandedSections.systemInfo}
                onToggle={() => toggleSection('systemInfo')}
                textColor={textColor}
                sectionBgColor={sectionBgColor}
              >
                <View style={styles.sectionContent}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: textColor }]}>App Version:</Text>
                    <Text style={[styles.value, { color: textColor }]}>1.1.0</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: textColor }]}>Build Number:</Text>
                    <Text style={[styles.value, { color: textColor }]}>23</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: textColor }]}>Bundle ID:</Text>
                    <Text style={[styles.value, { color: textColor }]}>com.octavian.layoverapp</Text>
                  </View>
                </View>
              </CollapsibleSection>

              <CollapsibleSection
                title="Active Permissions"
                isExpanded={expandedSections.permissions}
                onToggle={() => toggleSection('permissions')}
                textColor={textColor}
                sectionBgColor={sectionBgColor}
              >
                <View style={styles.sectionContent}>
                  <View style={styles.permissionList}>
                    <Text style={[styles.permissionItem, { color: textColor }]}>• Location Services</Text>
                    <Text style={[styles.permissionItem, { color: textColor }]}>• Photo Library Access</Text>
                    <Text style={[styles.permissionItem, { color: textColor }]}>• Push Notifications</Text>
                    <Text style={[styles.permissionItem, { color: textColor }]}>• Background Processing</Text>
                  </View>
                </View>
              </CollapsibleSection>

              <CollapsibleSection
                title="Platform Configuration"
                isExpanded={expandedSections.platform}
                onToggle={() => toggleSection('platform')}
                textColor={textColor}
                sectionBgColor={sectionBgColor}
              >
                <View style={styles.sectionContent}>
                  <View style={styles.platformSection}>
                    <Text style={[styles.platformTitle, { color: textColor }]}>iOS</Text>
                    <Text style={[styles.platformInfo, { color: textColor }]}>• Tablet Support: Disabled</Text>
                    <Text style={[styles.platformInfo, { color: textColor }]}>• New Architecture: Enabled</Text>
                  </View>
                  <View style={styles.platformSection}>
                    <Text style={[styles.platformTitle, { color: textColor }]}>Android</Text>
                    <Text style={[styles.platformInfo, { color: textColor }]}>• New Architecture: Disabled</Text>
                    <Text style={[styles.platformInfo, { color: textColor }]}>• Package: com.mattryan7201.Layover</Text>
                  </View>
                </View>
              </CollapsibleSection>
            </>
          )}

          <TouchableOpacity 
            style={[styles.groupHeader, { marginTop: 24 }]} 
            onPress={() => toggleGroup('notifications')}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionGroupTitle, { color: textColor }]}>Notifications</Text>
            <MaterialIcons 
              name={expandedGroups.notifications ? "remove" : "add"} 
              size={24} 
              color={textColor} 
            />
          </TouchableOpacity>

          {expandedGroups.notifications && (
            <>
              <CollapsibleSection
                title="Notification Configuration"
                isExpanded={expandedSections.notifications}
                onToggle={() => toggleSection('notifications')}
                textColor={textColor}
                sectionBgColor={sectionBgColor}
              >
                <View style={styles.sectionContent}>
                  <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: textColor }]}>Mode:</Text>
                    <Text style={[styles.value, { color: textColor }]}>Production</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.label, { color: textColor }]}>Project ID:</Text>
                    <Text style={[styles.value, { color: textColor }]}>61cfadd9-25bb-4566-abec-1e9679ef882b</Text>
                  </View>
                </View>
              </CollapsibleSection>

              <CollapsibleSection
                title="Mass Notification"
                isExpanded={expandedSections.massNotification}
                onToggle={() => toggleSection('massNotification')}
                textColor={textColor}
                sectionBgColor={sectionBgColor}
              >
                <View style={styles.sectionContent}>             
                  <NotificationForm textColor={textColor} />
                </View>
              </CollapsibleSection>
            </>
          )}

          <TouchableOpacity 
            style={[styles.groupHeader, { marginTop: 24 }]} 
            onPress={() => toggleGroup('testData')}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionGroupTitle, { color: textColor }]}>Test Data</Text>
            <MaterialIcons 
              name={expandedGroups.testData ? "remove" : "add"} 
              size={24} 
              color={textColor} 
            />
          </TouchableOpacity>

          {expandedGroups.testData && (
            <>
              <TestDataSection textColor={textColor} sectionBgColor={sectionBgColor} />
              <TestPingSection textColor={textColor} sectionBgColor={sectionBgColor} />
            </>
          )}

          <TouchableOpacity 
            style={[styles.sandboxButton, { backgroundColor: sectionBgColor, borderColor: textColor }]}
            onPress={() => router.push('/sandbox')}
          >
            <MaterialIcons name="science" size={24} color={textColor} />
            <Text style={[styles.sandboxButtonText, { color: textColor }]}>Sandbox</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    padding: 16,
    paddingTop: 0,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  value: {
    fontSize: 16,
  },
  permissionList: {
    marginTop: 8,
  },
  permissionItem: {
    fontSize: 16,
    marginBottom: 8,
  },
  platformSection: {
    marginTop: 12,
  },
  platformTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  platformInfo: {
    fontSize: 16,
    marginBottom: 4,
    paddingLeft: 8,
  },
  eligibleUsersContainer: {
    backgroundColor: 'rgba(55, 164, 200, 0.1)',
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  eligibleUsersContent: {
    overflow: 'hidden',
  },
  eligibleUsersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  eligibleUsersText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.3,
  },
  eligibleUsersDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eligibleUsersDetailText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    opacity: 0.8,
  },
  eligibleUsersList: {
    gap: 8,
  },
  eligibleUsersListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eligibleUsersListItemText: {
    fontSize: 14,
    opacity: 0.8,
  },
  formContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  formContent: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 140,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  characterCount: {
    fontSize: 14,
    textAlign: 'right',
    marginTop: 8,
    opacity: 0.7,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#007AFF80',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  templateSection: {
    marginBottom: 24,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
    flex: 1,
    minWidth: '48%',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  templateIconContainer: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateButtonText: {
    fontSize: 15,
    flex: 1,
    letterSpacing: 0.3,
  },
  sectionGroupTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  statusGrid: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statusLoading: {
    marginTop: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIconContainer: {
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  reportsSection: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingIndicator: {
    marginTop: 16,
  },
  reportsList: {
    maxHeight: 400,
    width: '100%',
  },
  reportItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    minHeight: 80,
    width: '100%',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportUserName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportType: {
    fontSize: 14,
    opacity: 0.8,
  },
  reportDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 44,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.7,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 24,
  },
  feedbackSection: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  feedbackList: {
    maxHeight: 400,
    width: '100%',
  },
  feedbackItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    minHeight: 80,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedbackContent: {
    flex: 1,
    marginRight: 12,
    width: '100%',
  },
  feedbackText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  feedbackDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  actionContainer: {
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    gap: 12,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  actionContent: {
    padding: 16,
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCount: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  testDataSection: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testDataContent: {
    padding: 16,
  },
  testDataDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  userCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  userCountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userCountButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  userCount: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  generateButtonDisabled: {
    backgroundColor: '#007AFF80',
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  generationStatus: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 14,
  },
  existingUsersSection: {
    marginTop: 32,
  },
  existingUsersHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  existingUsersTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  deleteAllContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  deleteAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  testUsersList: {
    maxHeight: 400,
  },
  testUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  testUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  testUserAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  testUserDetails: {
    flex: 1,
  },
  testUserName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testUserEmail: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
  },
  testUserAirport: {
    fontSize: 14,
    opacity: 0.6,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 12,
  },
  sandboxButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 32,
    borderWidth: 1,
    gap: 8,
  },
  sandboxButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  testPingSection: {
    borderRadius: 12,
    marginBottom: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testPingContent: {
    padding: 16,
  },
  testPingDescription: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  pingCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  pingCountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pingCountButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  pingCount: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  generatePingButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  generatePingButtonDisabled: {
    backgroundColor: '#007AFF80',
  },
  generatePingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  existingPingsSection: {
    marginTop: 32,
  },
  existingPingsHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  existingPingsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  testPingsList: {
    maxHeight: 400,
  },
  testPingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  testPingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  testPingDetails: {
    flex: 1,
  },
  testPingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  testPingCategory: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
  },
  testPingDate: {
    fontSize: 14,
    opacity: 0.6,
  },
  testPingLocation: {
    fontSize: 14,
    opacity: 0.6,
  },
}); 