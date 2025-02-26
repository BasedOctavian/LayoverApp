"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const BASE_URL = "https://api.sportradar.com/nba/trial/v8/en";

// Helper function to get current date in YYYY-MM-DD format
/**
 * Returns the current date in YYYY-MM-DD format.
 * @return {string} The current date in YYYY-MM-DD format.
 */
function getCurrentDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Scheduled function to run once a day
exports.getNBAGamesDaily = functions.pubsub
    .schedule("every 24 hours")
    .onRun(async (_context) => {
    // Get the current date in YYYY-MM-DD format
      const date = getCurrentDate();

      // Split the date into year, month, and day
      const [year, month, day] = date.split("-");
      const API_KEY = process.env.SPORTRADAR_API_KEY;
      const url = `${BASE_URL}/games/${year}/${month}/${day}/schedule.json` +
                `?api_key=${API_KEY}`;

      try {
        // Fetch games from the Sportradar API
        const apiResponse = await axios.get(url);
        if (apiResponse.status === 200) {
          const games = apiResponse.data.games || [];
          const db = admin.firestore();
          const batch = db.batch();
          const sportEventsRef = db.collection("sportEvents");

          // Process each game and prepare it for Firestore
          games.forEach((game) => {
            const eventData = {
              awayTeam: (game.away && game.away.name) ? game.away.name : "test",
              eventUID: game.id || "test",
              homeTeam: (game.home && game.home.name) ? game.home.name : "test",
              localTime: game.scheduled || "test",
              venueName: (game.venue && game.venue.name) ?
              game.venue.name : "test",
            };
            const docRef = sportEventsRef.doc(game.id);
            batch.set(docRef, eventData);
          });

          // Commit all events to Firestore in a single batch
          await batch.commit();

          console.log(`Successfully added ${games.length} 
            events to Firestore.`);
        } else {
          console.error("Failed to fetch games from API.");
        }
      } catch (err) {
        // Handle API or server errors
        console.error("Error fetching NBA games:", err);
      }
    });
