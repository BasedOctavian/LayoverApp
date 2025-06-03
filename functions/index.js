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
  { name: "Professional Networking", description: "Connect with professionals across industries to share insights and opportunities.", category: "Networking" },
  { name: "Coffee and Careers", description: "Grab a coffee and discuss career paths, job tips, or industry trends.", category: "Networking" },
  { name: "Startup Pitch Practice", description: "Share your startup idea or practice your pitch with a supportive group.", category: "Networking" },
  { name: "Mentorship Meetup", description: "Seek or offer mentorship advice in a casual setting.", category: "Networking" },
  { name: "Industry Roundtable", description: "Join a discussion on trends in tech, finance, healthcare, or other sectors.", category: "Networking" },
  { name: "Speed Networking", description: "Meet new contacts through quick, structured 1:1 conversations.", category: "Networking" },
  { name: "Creative Collaboration", description: "Brainstorm ideas for a creative project with others.", category: "Social" },
  { name: "Global Business Chat", description: "Discuss international markets and global business strategies.", category: "Networking" },
  { name: "Entrepreneur Exchange", description: "Share experiences and advice with fellow entrepreneurs.", category: "Networking" },
  { name: "Resume Swap", description: "Exchange and review resumes to offer constructive feedback.", category: "Networking" },
  { name: "Travel Networking", description: "Connect with frequent travelers to share tips and business travel hacks.", category: "Networking" },
  { name: "Cultural Connection", description: "Share your cultural background and learn about others to build global connections.", category: "Social" },
  { name: "Freelancer Forum", description: "Discuss freelancing tips, gigs, and client strategies.", category: "Networking" },
  { name: "Book and Business Club", description: "Discuss a business or self-improvement book with like-minded travelers.", category: "Learning" },
  { name: "Tech Trends Talk", description: "Explore emerging technologies and their business applications.", category: "Learning" },
  { name: "Mindful Networking", description: "A relaxed session to connect through meaningful conversations.", category: "Social" },
  { name: "Problem-Solving Circle", description: "Work together to brainstorm solutions to a business challenge.", category: "Networking" },
  { name: "Storytelling for Success", description: "Share a professional or personal story to inspire and connect.", category: "Social" },
  { name: "Side Hustle Swap", description: "Discuss side projects and hustle ideas with others.", category: "Networking" },
  { name: "Leadership Lounge", description: "Share leadership tips and experiences in a casual setting.", category: "Networking" },
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