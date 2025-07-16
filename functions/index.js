/* eslint-disable max-len */
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

admin.initializeApp();


/**
 * Sends a push notification to a specific user
 * @param {string} userId - The user ID to send the notification to
 * @param {string} title - The notification title
 * @param {string} body - The notification body
 * @param {Object} data - Additional data to send with the notification
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  try {
    const { userId, title, body, notificationData } = data;

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
    const batch = db.batch();
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
        }
      });
      if (deleteCount > 0) {
        await batch.commit();
        console.log(`Deleted ${deleteCount} expired pings.`);
      } else {
        console.log('No expired pings to delete.');
      }
    } catch (err) {
      console.error('Error cleaning up expired pings:', err.message);
    }
  });