/* eslint-disable max-len */
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

admin.initializeApp();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitMap = new Map();

/**
 * Rate limiting middleware
 * @param {string} identifier - Unique identifier (e.g., userId or IP)
 * @returns {boolean} - true if request is allowed, false if rate limited
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(identifier) || [];
  
  // Remove old requests outside the time window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(identifier, recentRequests);
  
  // Cleanup old entries periodically
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, timestamps] of rateLimitMap.entries()) {
      if (timestamps.every(t => t < cutoff)) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return true;
}

/**
 * Content validation utility
 * @param {string} text - Text to validate
 * @returns {boolean} - true if content is safe, false otherwise
 */
function containsInappropriateContent(text) {
  if (!text) return false;
  
  const filteredWords = [
    'suicide', 'kill myself', 'self harm',
    'buy drugs', 'sell drugs', 'drug dealer',
    'send money', 'wire transfer', 'investment opportunity',
    'rape', 'assault', 'kill you', 'hurt you'
  ];
  
  const normalizedText = text.toLowerCase();
  return filteredWords.some(word => normalizedText.includes(word));
}

/**
 * Validate and sanitize user input
 * @param {Object} data - Data to validate
 * @returns {Object} - Validation result
 */
function validateUserInput(data) {
  const errors = [];
  
  if (data.name && containsInappropriateContent(data.name)) {
    errors.push('Name contains inappropriate content');
  }
  
  if (data.bio && containsInappropriateContent(data.bio)) {
    errors.push('Bio contains inappropriate content');
  }
  
  if (data.title && containsInappropriateContent(data.title)) {
    errors.push('Title contains inappropriate content');
  }
  
  if (data.description && containsInappropriateContent(data.description)) {
    errors.push('Description contains inappropriate content');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Parse duration string to milliseconds
 * Handles formats like "2h", "30m", "1 hour", "2 hours", "all day"
 * @param {string} duration - Duration string to parse
 * @returns {number|null} - Duration in milliseconds, or null if invalid
 */
function parseDurationToMs(duration) {
  if (!duration) return null;
  const d = duration.trim().toLowerCase();
  
  // Handle formats like "2h", "30m"
  if (d.endsWith('h')) {
    return parseFloat(d) * 60 * 60 * 1000;
  } else if (d.endsWith('m')) {
    return parseFloat(d) * 60 * 1000;
  } else if (d.includes('hour')) {
    // e.g. '1 hour', '2 hours'
    const match = d.match(/(\d+(?:\.\d+)?)/);
    if (match) return parseFloat(match[1]) * 60 * 60 * 1000;
  } else if (d.includes('all day')) {
    return 24 * 60 * 60 * 1000;
  } else if (!isNaN(Number(d))) {
    // Assume minutes if just a number
    return Number(d) * 60 * 1000;
  }
  return null;
}

/**
 * Sends a push notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - The notification title
 * @param {string} body - The notification body
 * @param {Object} data - Additional data to send with the notification
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  try {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    // Rate limiting
    if (!checkRateLimit(context.auth.uid)) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
    }
    
    const { userId, title, body, notificationData } = data;
    
    // Input validation
    if (!userId || !title || !body) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    // Get the user's push token from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || !userData.expoPushToken) {
      throw new Error('User not found or no push token available');
    }

    // Send the notification using Expo's push notification service
    const message = {
      to: userData.expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: notificationData || {},
    };

    await admin.messaging().send(message);
    return { success: true };
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Example function to send a notification to all users
 * This can be triggered by a scheduled function or HTTP request
 */
exports.sendNotificationToAllUsers = functions.https.onRequest(async (req, res) => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').get();
    const notifications = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (userData.expoPushToken) {
        notifications.push(
          admin.messaging().send({
            to: userData.expoPushToken,
            sound: 'default',
            title: 'New Update Available!',
            body: 'Check out the latest features in Layover App',
            data: { type: 'update' },
          })
        );
      }
    }

    await Promise.all(notifications);
    res.json({ success: true, message: 'Notifications sent successfully' });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Scheduled function to clean up expired pings
exports.cleanupExpiredPings = functions.pubsub
  .schedule('0 0 * * *') // 12:00 AM every day
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const pingsRef = db.collection('pings');
    const now = admin.firestore.Timestamp.now();
    let deleteCount = 0;

    // Duration mapping in milliseconds
    const durationMap = {
      '30 minutes': 30 * 60 * 1000,
      '1 hour': 60 * 60 * 1000,
      '2 hours': 2 * 60 * 60 * 1000,
      '3 hours': 3 * 60 * 60 * 1000,
      '4 hours': 4 * 60 * 60 * 1000,
      'all day': 24 * 60 * 60 * 1000,
      'All day': 24 * 60 * 60 * 1000, // handle capitalization
    };
    // Buffer for short events (not 'all day')
    const bufferMs = 6 * 60 * 60 * 1000; // 6 hours

    try {
      const snapshot = await pingsRef.get();
      
      // Use batches array to handle >500 deletions
      const batches = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt;
        let duration = (data.duration || '').toLowerCase();
        if (!createdAt || !duration) return;

        // Normalize duration string
        if (duration === 'all day') duration = 'all day';
        if (duration === 'All day') duration = 'all day';

        // Firestore Timestamp to JS Date
        const createdDate = createdAt.toDate();
        const msSinceCreated = now.toDate() - createdDate;

        // Get expiration time
        let expireMs = durationMap[duration];
        if (!expireMs) return; // skip unknown durations

        // Add buffer for all except 'all day'
        if (duration !== 'all day') {
          expireMs += bufferMs;
        }

        if (msSinceCreated > expireMs) {
          batch.delete(doc.ref);
          deleteCount++;
          operationCount++;

          // If we hit 500 operations, commit this batch and start a new one
          if (operationCount === 500) {
            batches.push(batch.commit());
            batch = db.batch();
            operationCount = 0;
          }
        }
      });

      // Commit any remaining operations
      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
        console.log(`Deleted ${deleteCount} expired pings.`);
      } else {
        console.log('No expired pings to delete.');
      }
    } catch (err) {
      console.error('Error cleaning up expired pings:', err.message);
    }
  });

// Scheduled function to clean up expired events
exports.cleanupExpiredEvents = functions.pubsub
  .schedule('0 0 * * *') // 12:00 AM every day
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const eventsRef = db.collection('events');
    const now = admin.firestore.Timestamp.now();
    let deleteCount = 0;

    try {
      // Query all events where startTime is before now
      const snapshot = await eventsRef.where('startTime', '<', now).get();
      
      if (snapshot.empty) {
        console.log('No expired events to delete.');
        return null;
      }

      // Delete in batches of 500 (Firestore batch limit)
      const batches = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const startTime = data.startTime;
        const duration = data.duration;
        
        if (!startTime) return; // Skip if no startTime
        
        // Calculate end time
        let endTime = null;
        if (duration) {
          const start = startTime.toDate();
          const durationMs = parseDurationToMs(duration);
          if (durationMs) {
            endTime = new Date(start.getTime() + durationMs);
          }
        }
        
        // If we can't calculate end time, use startTime + 4 hours as default
        if (!endTime) {
          const start = startTime.toDate();
          endTime = new Date(start.getTime() + (4 * 60 * 60 * 1000));
        }
        
        // Only delete if event has ended (with 1 hour buffer)
        const bufferMs = 60 * 60 * 1000; // 1 hour buffer
        if (now.toDate().getTime() > (endTime.getTime() + bufferMs)) {
          batch.delete(doc.ref);
          deleteCount++;
          operationCount++;

          // If we hit 500 operations, commit this batch and start a new one
          if (operationCount === 500) {
            batches.push(batch.commit());
            batch = db.batch();
            operationCount = 0;
          }
        }
      });

      // Commit any remaining operations
      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
        console.log(`Deleted ${deleteCount} expired events.`);
      } else {
        console.log('No expired events to delete.');
      }
      return null;
    } catch (err) {
      console.error('Error cleaning up expired events:', err.message);
      return null;
    }
  });

// Clean up read notifications older than 30 days
exports.cleanupOldNotifications = functions.pubsub
  .schedule('0 2 * * *') // 2:00 AM daily
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    let deleteCount = 0;

    try {
      const snapshot = await db.collection('notifications')
        .where('read', '==', true)
        .where('createdAt', '<', thirtyDaysAgo)
        .get();
      
      if (snapshot.empty) {
        console.log('No old notifications to delete.');
        return null;
      }

      // Delete in batches of 500
      const batches = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
        operationCount++;

        if (operationCount === 500) {
          batches.push(batch.commit());
          batch = db.batch();
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
        console.log(`Deleted ${deleteCount} old notifications.`);
      }
      return null;
    } catch (err) {
      console.error('Error cleaning up old notifications:', err.message);
      return null;
    }
  });

// Clean up messages older than 90 days (keep recent history)
exports.cleanupOldMessages = functions.pubsub
  .schedule('0 3 * * 0') // 3:00 AM every Sunday
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const ninetyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    let totalDeleted = 0;

    try {
      // Get all chats
      const chatsSnapshot = await db.collection('chats').get();
      
      if (chatsSnapshot.empty) {
        console.log('No chats found.');
        return null;
      }

      // Process each chat's messages
      for (const chatDoc of chatsSnapshot.docs) {
        const messagesRef = chatDoc.ref.collection('messages');
        const oldMessages = await messagesRef
          .where('createdAt', '<', ninetyDaysAgo)
          .limit(500)
          .get();
        
        if (oldMessages.empty) continue;

        // Delete messages in batches
        const batches = [];
        let batch = db.batch();
        let operationCount = 0;

        oldMessages.forEach((messageDoc) => {
          batch.delete(messageDoc.ref);
          totalDeleted++;
          operationCount++;

          if (operationCount === 500) {
            batches.push(batch.commit());
            batch = db.batch();
            operationCount = 0;
          }
        });

        if (operationCount > 0) {
          batches.push(batch.commit());
        }

        if (batches.length > 0) {
          await Promise.all(batches);
        }
      }
      
      console.log(`Cleaned up ${totalDeleted} old messages.`);
      return null;
    } catch (err) {
      console.error('Error cleaning up old messages:', err.message);
      return null;
    }
  });

// Clean up group join requests older than 7 days
exports.cleanupExpiredGroupRequests = functions.pubsub
  .schedule('0 1 * * *') // 1:00 AM daily
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const sevenDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    let deleteCount = 0;

    try {
      const snapshot = await db.collection('groupJoinRequests')
        .where('status', 'in', ['pending', 'expired'])
        .where('createdAt', '<', sevenDaysAgo)
        .get();
      
      if (snapshot.empty) {
        console.log('No expired group requests to delete.');
        return null;
      }

      // Delete in batches of 500
      const batches = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
        operationCount++;

        if (operationCount === 500) {
          batches.push(batch.commit());
          batch = db.batch();
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
        console.log(`Cleaned up ${deleteCount} expired group requests.`);
      }
      return null;
    } catch (err) {
      console.error('Error cleaning up expired group requests:', err.message);
      return null;
    }
  });

// Clean up resolved reports older than 30 days
exports.cleanupOldReports = functions.pubsub
  .schedule('0 4 * * 0') // 4:00 AM every Sunday
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );
    let deleteCount = 0;

    try {
      const snapshot = await db.collection('reports')
        .where('status', 'in', ['resolved', 'reviewed', 'dismissed'])
        .where('createdAt', '<', thirtyDaysAgo)
        .get();
      
      if (snapshot.empty) {
        console.log('No old reports to delete.');
        return null;
      }

      // Delete in batches of 500
      const batches = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
        operationCount++;

        if (operationCount === 500) {
          batches.push(batch.commit());
          batch = db.batch();
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
        console.log(`Cleaned up ${deleteCount} old reports.`);
      }
      return null;
    } catch (err) {
      console.error('Error cleaning up old reports:', err.message);
      return null;
    }
  });

// Archive chats with no messages in 90 days
exports.archiveInactiveChats = functions.pubsub
  .schedule('0 5 * * 0') // 5:00 AM every Sunday
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const ninetyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    let archiveCount = 0;

    try {
      const snapshot = await db.collection('chats')
        .where('lastMessageTime', '<', ninetyDaysAgo)
        .where('status', '==', 'active')
        .get();
      
      if (snapshot.empty) {
        console.log('No inactive chats to archive.');
        return null;
      }

      // Update in batches of 500
      const batches = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        batch.update(doc.ref, { status: 'archived' });
        archiveCount++;
        operationCount++;

        if (operationCount === 500) {
          batches.push(batch.commit());
          batch = db.batch();
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
        console.log(`Archived ${archiveCount} inactive chats.`);
      }
      return null;
    } catch (err) {
      console.error('Error archiving inactive chats:', err.message);
      return null;
    }
  });

// Mark users as inactive if they haven't logged in for 90 days
exports.updateInactiveUsers = functions.pubsub
  .schedule('0 6 * * 0') // 6:00 AM every Sunday
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const ninetyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    let updateCount = 0;

    try {
      // Query users with lastLogin before 90 days ago
      // Note: This assumes users have a lastLogin field and isActive field
      const snapshot = await db.collection('users')
        .where('lastLogin', '<', ninetyDaysAgo)
        .get();
      
      if (snapshot.empty) {
        console.log('No inactive users to update.');
        return null;
      }

      // Update in batches of 500
      const batches = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only update if isActive is true or undefined (assume active by default)
        if (data.isActive !== false) {
          batch.update(doc.ref, { isActive: false });
          updateCount++;
          operationCount++;

          if (operationCount === 500) {
            batches.push(batch.commit());
            batch = db.batch();
            operationCount = 0;
          }
        }
      });

      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      if (batches.length > 0) {
        await Promise.all(batches);
        console.log(`Marked ${updateCount} users as inactive.`);
      }
      return null;
    } catch (err) {
      console.error('Error updating inactive users:', err.message);
      return null;
    }
  });

// Clean up orphaned data (group invites, expired connections, etc.)
exports.cleanupOrphanedData = functions.pubsub
  .schedule('0 7 * * 0') // 7:00 AM every Sunday
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    let totalDeleted = 0;

    try {
      // Clean up group invites older than 14 days
      const fourteenDaysAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      );
      
      const invitesSnapshot = await db.collection('groupInvites')
        .where('createdAt', '<', fourteenDaysAgo)
        .where('status', '==', 'pending')
        .get();
      
      if (!invitesSnapshot.empty) {
        const batches = [];
        let batch = db.batch();
        let operationCount = 0;

        invitesSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          totalDeleted++;
          operationCount++;

          if (operationCount === 500) {
            batches.push(batch.commit());
            batch = db.batch();
            operationCount = 0;
          }
        });

        if (operationCount > 0) {
          batches.push(batch.commit());
        }

        if (batches.length > 0) {
          await Promise.all(batches);
        }
      }

      console.log(`Cleaned up ${totalDeleted} orphaned data entries.`);
      return null;
    } catch (err) {
      console.error('Error cleaning orphaned data:', err.message);
      return null;
    }
  });

// Daily analytics aggregation for dashboard
exports.aggregateDailyStats = functions.pubsub
  .schedule('0 0 * * *') // Midnight daily
  .timeZone('America/New_York')
  .onRun(async (_context) => {
    const db = admin.firestore();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    try {
      const yesterdayStart = admin.firestore.Timestamp.fromDate(yesterday);
      const yesterdayEndTs = admin.firestore.Timestamp.fromDate(yesterdayEnd);

      // Count new users from yesterday
      const newUsersSnapshot = await db.collection('users')
        .where('createdAt', '>=', yesterdayStart)
        .where('createdAt', '<=', yesterdayEndTs)
        .get();

      // Count new events from yesterday
      const newEventsSnapshot = await db.collection('events')
        .where('createdAt', '>=', yesterdayStart)
        .where('createdAt', '<=', yesterdayEndTs)
        .get();

      // Count new pings from yesterday
      const newPingsSnapshot = await db.collection('pings')
        .where('createdAt', '>=', yesterdayStart)
        .where('createdAt', '<=', yesterdayEndTs)
        .get();

      // Count active users (users who logged in yesterday)
      const activeUsersSnapshot = await db.collection('users')
        .where('lastLogin', '>=', yesterdayStart)
        .where('lastLogin', '<=', yesterdayEndTs)
        .get();

      const stats = {
        date: admin.firestore.Timestamp.fromDate(yesterday),
        newUsers: newUsersSnapshot.size,
        newEvents: newEventsSnapshot.size,
        newPings: newPingsSnapshot.size,
        activeUsers: activeUsersSnapshot.size,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection('analytics').add(stats);
      console.log('Daily stats aggregated:', stats);
      return null;
    } catch (err) {
      console.error('Error aggregating daily stats:', err.message);
      return null;
    }
  });