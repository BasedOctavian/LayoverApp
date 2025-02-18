// hooks/useSportEvents.ts
import { useState, useEffect } from "react";
import axios from "axios";

export interface UseSportEventsParams {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Optional sport filter (e.g. "Soccer") */
  sport?: string;
  /** Optional league filter (e.g. "4356" or "Australian_A-League") */
  league?: string;
}

export interface Event {
  idEvent: string;
  strEvent: string;
  strSport?: string;
  strLeague?: string;
  dateEvent?: string;
  strTime?: string;
  // add any additional properties as needed
}

const BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

const useSportEvents = ({ date, sport, league }: UseSportEventsParams) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Build query parameters based on input
        const params = new URLSearchParams();
        params.append("d", date);
        if (sport) {
          params.append("s", sport);
        }
        if (league) {
          params.append("l", league);
        }
        const url = `${BASE_URL}/eventsday.php?${params.toString()}`;
        const response = await axios.get(url);
        // TheSportsDB returns { events: null } if no events are found
        const eventsData = response.data.events ? response.data.events : [];
        setEvents(eventsData);
      } catch (err: any) {
        if (err.response) {
          setError(`Error: ${err.response.status} ${err.response.statusText}`);
        } else {
          setError("An error occurred while fetching events.");
        }
        console.error("Error fetching sports events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [date, sport, league]);

  return { events, loading, error };
};

export default useSportEvents;
