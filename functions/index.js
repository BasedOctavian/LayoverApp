/* eslint-disable max-len */
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

admin.initializeApp();

/**
 * Returns the current date in YYYY-MM-DD format in Eastern Time (ET).
 * @return {string} The current date in YYYY-MM-DD format in Eastern Time.
 */
function getCurrentDate() {
  const today = moment().tz("America/New_York"); // Explicitly Eastern Time
  return today.format("YYYY-MM-DD"); // ISO 8601 date format, no spaces
}

/**
 * Saves an issue to the "issues" collection in Firestore.
 * @param {Object} db - Firestore instance.
 * @param {string} errorType - Type of error.
 * @param {string} errorMessage - Description of the error.
 * @param {string|Object} details - Additional error details.
 */
async function saveIssue(db, errorType, errorMessage, details) {
  try {
    await db.collection("issues").add({
      errorType,
      errorMessage,
      details: typeof details === "object" ? JSON.stringify(details) : details,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to save issue to Firestore:", err.message);
  }
}

// List of predefined events to rotate daily, optimized for networking and making friends
const EVENT_TEMPLATES = [
  { name: "Industry Connect", description: "Meet pros from various fields to exchange insights and leads.", category: "Networking" },
  { name: "Coffee Chat", description: "Sip coffee and talk career moves, job hacks, or market shifts.", category: "Networking" },
  { name: "Startup Pitch Session", description: "Present your startup concept or refine your pitch with peers.", category: "Networking" },
  { name: "Mentor Meet", description: "Give or get guidance in a laid-back mentorship hangout.", category: "Networking" },
  { name: "Sector Talk", description: "Discuss what’s new in tech, finance, health, or other industries.", category: "Networking" },
  { name: "Rapid intros", description: "Make quick, focused connections in short one-on-one chats.", category: "Networking" },
  { name: "Creative Jam", description: "Team up to spark ideas for a new project or venture.", category: "Social" },
  { name: "Global Market Talk", description: "Explore worldwide business trends and strategies.", category: "Networking" },
  { name: "Founder Forum", description: "Swap stories and tips with other entrepreneurs.", category: "Networking" },
  { name: "Resume Review", description: "Trade resumes and share honest feedback to improve them.", category: "Networking" },
  { name: "Traveler Meetup", description: "Connect with globetrotters to share travel tips and workarounds.", category: "Networking" },
  { name: "Cultural Exchange", description: "Share your roots and learn about others’ to forge ties.", category: "Social" },
  { name: "Freelance Hangout", description: "Talk gigs, clients, and freelance survival tactics.", category: "Networking" },
  { name: "Book Club", description: "Dive into a business or growth-focused book with peers.", category: "Learning" },
  { name: "Tech Talk", description: "Unpack new tech and its impact on business.", category: "Learning" },
  { name: "Easy Connect", description: "Chill out and have real conversations with no pressure.", category: "Social" },
  { name: "Solution Session", description: "Group up to tackle a tough business problem.", category: "Networking" },
  { name: "Story Share", description: "Tell a personal or work story to bond and inspire.", category: "Social" },
  { name: "Hustle Chat", description: "Discuss side gigs and project ideas with others.", category: "Networking" },
  { name: "Leadership Talk", description: "Share leadership insights in a relaxed setting.", category: "Networking" },
];

// Scheduled function to generate daily events for all airports
exports.generateDailyAirportEvents = functions.pubsub
  .schedule("0 0 * * *") // Runs at 12:00 AM every day
  .timeZone("America/New_York") // Eastern Time (ET)
  .onRun(async (_context) => {
    const db = admin.firestore();
    const date = getCurrentDate(); // e.g., "2025-03-18"
    const airportsRef = db.collection("airports");
    const eventsRef = db.collection("events");

    try {
      // Fetch all airports
      const airportsSnapshot = await airportsRef.get();
      if (airportsSnapshot.empty) {
        await saveIssue(db, "noAirportsFound", "No airports found in the collection", {});
        console.error("No airports found in the collection.");
        return;
      }

      // Wipe existing events for the day (optional: you could filter by date instead)
      try {
        const snapshot = await eventsRef.get();
        const batchDelete = db.batch();
        snapshot.forEach((doc) => {
          batchDelete.delete(doc.ref);
        });
        await batchDelete.commit();
        console.log("Successfully wiped existing events collection.");
      } catch (err) {
        await saveIssue(db, "firestoreDeleteFailure", "Failed to wipe events collection", err.message);
        console.error("Error wiping events collection:", err.message);
        return;
      }

      // Generate events for each airport
      const batch = db.batch();
      const todayET = moment().tz("America/New_York").startOf("day");

      airportsSnapshot.forEach((airportDoc) => {
        const airportData = airportDoc.data();
        const { airportCode, lat, long, name } = airportData;

        // Randomly select 5-7 events per airport
        const shuffledEvents = EVENT_TEMPLATES.sort(() => 0.5 - Math.random());
        const selectedEvents = shuffledEvents.slice(0, Math.floor(Math.random() * 3) + 5); // 5-7 events

        selectedEvents.forEach((eventTemplate, index) => {
          const eventUID = `${airportCode}-${eventTemplate.name.replace(/\s+/g, "-")}-${date}-${index}`; // Unique ID
          const eventData = {
            airportCode: airportCode,
            attendees: [],
            category: eventTemplate.category,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            description: `${eventTemplate.description} Meet at ${name}.`,
            eventImage: null, // Could add a default image URL if desired
            eventUID: eventUID,
            latitude: lat.toString(), // Convert number to string
            longitude: long.toString(), // Convert number to string
            name: `${eventTemplate.name} at ${airportCode}`,
            organizer: null, // No organizer initially
            private: false,
            startTime: null, // No specific start time initially
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          const docRef = eventsRef.doc(eventUID);
          batch.set(docRef, eventData);
        });
      });

      // Commit all events to Firestore
      await batch.commit();
      console.log(`Successfully added events for ${date} to Firestore.`);

    } catch (err) {
      await saveIssue(db, "unexpectedError", `Unexpected error in function: ${err.message}`, err.stack);
      console.error("Unexpected error in generateDailyAirportEvents:", err.message);
    }
  });

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