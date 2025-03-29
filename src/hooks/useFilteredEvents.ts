// useFilteredEvents.js
import { useMemo } from "react";

export function useFilteredEvents(selectedAirport, allEvents, allSportEvents) {
  const filteredRegularEvents = useMemo(() => {
    if (!selectedAirport) return [];
    return allEvents
      .filter((event) => event.airportCode === selectedAirport.airportCode)
      .map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description || "No description",
        type: "regular",
        organizer: event.organizer,
      }));
  }, [selectedAirport, allEvents]);

  const matchingSportEvents = useMemo(() => {
    if (!selectedAirport) return [];
    const airportCity = selectedAirport.location.split(",")[0].trim().toLowerCase();
    return allSportEvents
      .filter((event) => {
        const awayTeam = event.awayTeam ? event.awayTeam.toLowerCase() : "";
        const homeTeam = event.homeTeam ? event.homeTeam.toLowerCase() : "";
        return awayTeam.includes(airportCity) || homeTeam.includes(airportCity);
      })
      .map((event) => ({
        id: event.eventUID,
        name: `${event.awayTeam} vs. ${event.homeTeam}`,
        description: `Venue: ${event.venue}, Local Time: ${new Date(event.localTime).toLocaleString()}`,
        type: "sport",
        organizer: null,
      }));
  }, [selectedAirport, allSportEvents]);

  return { filteredRegularEvents, matchingSportEvents };
}