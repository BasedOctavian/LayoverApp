/* eslint-disable max-len */
"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const moment = require("moment-timezone");

admin.initializeApp();

const BASE_URL = "https://api.sportradar.com/nba/trial/v8/en";

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

// Scheduled function to run every day at 12:00 AM Eastern Time
exports.getNBAGamesDaily = functions.pubsub
    .schedule("0 0 * * *") // Runs at 12:00 AM every day
    .timeZone("America/New_York") // Explicitly Eastern Time (ET)
    .onRun(async (_context) => {
      const date = getCurrentDate(); // Date in ET, e.g., "2025-03-04"
      const [year, month, day] = date.split("-");
      const API_KEY = "IVi41AreCEkfN6XI042YsBF6P5FlKquysnMeRpIc"; // Secure this in production
      const url = `${BASE_URL}/games/${year}/${month}/${day}/schedule.json?api_key=${API_KEY}`;
      const db = admin.firestore();

      try {
        let apiResponse;
        try {
          apiResponse = await axios.get(url);
        } catch (err) {
          await saveIssue(db, "apiCallFailure", `Network error: ${err.message}`, err.stack);
          console.error("API call failed:", err.message);
          return; // Exit if API call fails
        }

        if (apiResponse.status !== 200) {
          await saveIssue(db, "apiErrorResponse", `API returned status: ${apiResponse.status}`, apiResponse.data);
          console.error("Failed to fetch games from API. Status:", apiResponse.status);
          return; // Exit if API status is not 200
        }

        if (!apiResponse.data || !Array.isArray(apiResponse.data.games)) {
          await saveIssue(db, "invalidApiResponse", "API response missing games array", apiResponse.data);
          console.error("Invalid API response:", apiResponse.data);
          return; // Exit if response is invalid
        }

        const games = apiResponse.data.games;
        const sportEventsRef = db.collection("sportEvents");

        // Wipe the existing collection
        try {
          const snapshot = await sportEventsRef.get();
          const batchDelete = db.batch();
          snapshot.forEach((doc) => {
            batchDelete.delete(doc.ref);
          });
          await batchDelete.commit();
          console.log("Successfully wiped existing sportEvents collection.");
        } catch (err) {
          await saveIssue(db, "firestoreDeleteFailure", "Failed to wipe sportEvents collection", err.message);
          console.error("Error wiping sportEvents collection:", err.message);
          return; // Exit if wipe fails
        }

        // Add new games with ET-based date validation
        try {
          const batch = db.batch();
          const todayET = moment().tz("America/New_York").startOf("day"); // Start of day in ET
          games.forEach((game) => {
            const gameDateET = moment(game.scheduled).tz("America/New_York"); // Convert game time to ET
            if (gameDateET.isSame(todayET, "day")) { // Only include games for today in ET
              const eventData = {
                awayTeam: game.away.name || "test",
                eventUID: game.id || "test",
                homeTeam: game.home.name || "test",
                localTime: gameDateET.format("YYYY-MM-DD HH:mm:ss"), // Store as ET time
                venueName: game.venue.name || "test",
              };
              const docRef = sportEventsRef.doc(game.id);
              batch.set(docRef, eventData);
            }
          });
          await batch.commit();
          console.log(`Successfully added events for ${date} to Firestore in ET.`);
        } catch (err) {
          await saveIssue(db, "firestoreAddFailure", `Failed to add events for ${date} to Firestore`, err.message);
          console.error("Error adding events to Firestore:", err.message);
        }
      } catch (err) {
        // Catch any unexpected top-level errors
        await saveIssue(db, "unexpectedError", `Unexpected error in function: ${err.message}`, err.stack);
        console.error("Unexpected error in getNBAGamesDaily:", err.message);
      }
    });
