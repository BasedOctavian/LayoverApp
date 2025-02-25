// hooks/useSportEvents.ts
import { useState, useEffect } from "react";
import axios from "axios";

export interface UseSportEventsParams {
  /** Date in YYYY-MM-DD format */
  date: string;
}

export interface Event {
  // Define additional properties as needed based on the API response
  id: string;
  // For example: scheduled time, teams, etc.
}

const API_KEY = "IVi41AreCEkfN6XI042YsBF6P5FlKquysnMeRpIc";
const BASE_URL = "https://api.sportradar.com/nba/trial/v8/en";

const useSportEvents = ({ date }: UseSportEventsParams) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Parse the provided date (YYYY-MM-DD) into year, month, and day
        const [year, month, day] = date.split("-");
        const url = `${BASE_URL}/games/${year}/${month}/${day}/schedule.json?api_key=${API_KEY}`;
        console.log("Fetching events for date:", date);
        console.log("API Request URL:", url);

        const response = await axios.get(url);
        const eventsData = response.data.games || [];
        setEvents(eventsData);
      } catch (err: any) {
        if (err.response) {
          setError(`Error: ${err.response.status} ${err.response.statusText}`);
        } else {
          setError("An error occurred while fetching events.");
        }
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [date]);

  return { events, loading, error };
};

export default useSportEvents;
