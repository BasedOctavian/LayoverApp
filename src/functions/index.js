'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();

const BASE_URL = 'https://api.sportradar.com/nba/trial/v8/en';

// Helper function to validate date format
function isValidDate(dateStr) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateStr);
}

exports.getNBAGames = functions.https.onRequest(async (req, res) => {
  // Destructure the date from query parameters
  const { date } = req.query;

  // Validate the date format (YYYY-MM-DD)
  if (!date || !isValidDate(date)) {
    res.status(400).json({
      error: 'Invalid date format. Please provide date in YYYY-MM-DD format.'
    });
    return;
  }

  // Split the date into year, month, and day
  const [year, month, day] = date.split('-');
  const API_KEY = process.env.SPORTRADAR_API_KEY;
  const url = `${BASE_URL}/games/${year}/${month}/${day}/schedule.json?api_key=${API_KEY}`;

  try {
    // Fetch games from the Sportradar API
    const apiResponse = await axios.get(url);
    if (apiResponse.status === 200) {
      const games = apiResponse.data.games || [];
      const db = admin.firestore();
      const batch = db.batch();
      const sportEventsRef = db.collection('sportEvents');

      // Process each game and prepare it for Firestore
      games.forEach((game) => {
        const eventData = {
          awayTeam: game.away?.name || 'test',
          eventUID: game.id || 'test',
          homeTeam: game.home?.name || 'test',
          localTime: game.scheduled || 'test',
          venueName: game.venue?.name || 'test'
        };
        const docRef = sportEventsRef.doc(game.id); // Use game ID as document ID
        batch.set(docRef, eventData);
      });

      // Commit all events to Firestore in a single batch
      await batch.commit();

      // Send success response
      res.json({
        message: 'Events added to Firestore',
        count: games.length
      });
    } else {
      res.status(500).json({
        error: 'Failed to fetch games from API.'
      });
    }
  } catch (err) {
    // Handle API or server errors
    console.error('Error fetching NBA games:', err);
    if (err.response) {
      res.status(err.response.status).json({
        error: err.response.data || `Error from API: ${err.response.statusText}`
      });
    } else {
      res.status(500).json({
        error: 'An error occurred while fetching games.'
      });
    }
  }
});
